import type {
  SettlementCompleted,
  SettlementObligation,
  SettlementPartnerGroup,
} from "@/lib/settlements-types";
import { groupObligationsByCounterparty, sumObligationAmounts } from "@/lib/settlements-mappers";

export type SettlementDirection = "receivable" | "payable";

export type SettlementLedgerFilters = {
  q: string;
  status: "all" | "open";
  from: string;
  to: string;
  sort: "amount-desc" | "amount-asc" | "date-desc" | "date-asc";
};

export type SettlementViewMode = "rows" | "compact" | "cards";

export function defaultLedgerFilters(): SettlementLedgerFilters {
  return { q: "", status: "open", from: "", to: "", sort: "date-desc" };
}

function parseDay(iso: string): number {
  return new Date(iso).getTime();
}

function inDateRange(iso: string, from: string, to: string): boolean {
  const t = parseDay(iso);
  if (from) {
    const start = new Date(`${from}T00:00:00`).getTime();
    if (t < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999`).getTime();
    if (t > end) return false;
  }
  return true;
}

function matchesQuery(row: SettlementObligation, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return (
    row.counterpartyName.toLowerCase().includes(needle) ||
    row.orderId.toLowerCase().includes(needle) ||
    row.basis.toLowerCase().includes(needle) ||
    row.id.toLowerCase().includes(needle)
  );
}

export function filterOpenObligations(
  rows: SettlementObligation[],
  filters: SettlementLedgerFilters,
): SettlementObligation[] {
  let out = rows.filter((row) => matchesQuery(row, filters.q));
  if (filters.status === "open") {
    out = out.filter((row) => row.status !== "PAID" && row.status !== "CANCELLED");
  }
  out = out.filter((row) => inDateRange(row.createdAt, filters.from, filters.to));
  out.sort((a, b) => {
    if (filters.sort === "amount-desc") return b.amount - a.amount;
    if (filters.sort === "amount-asc") return a.amount - b.amount;
    if (filters.sort === "date-asc") return parseDay(a.createdAt) - parseDay(b.createdAt);
    return parseDay(b.createdAt) - parseDay(a.createdAt);
  });
  return out;
}

export function filterCompletedRows(
  rows: SettlementCompleted[],
  direction: SettlementDirection | "both",
  filters: Pick<SettlementLedgerFilters, "q" | "from" | "to">,
): SettlementCompleted[] {
  let out = rows.filter((row) => {
    if (direction !== "both" && row.direction !== direction) return false;
    return matchesQuery(row, filters.q);
  });
  out = out.filter((row) => {
    const when = row.paidAt ?? row.createdAt;
    return inDateRange(when, filters.from, filters.to);
  });
  return out;
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function partnerGroupsForDirection(
  receivable: SettlementObligation[],
  payable: SettlementObligation[],
  direction: SettlementDirection,
  filters: SettlementLedgerFilters,
): SettlementPartnerGroup[] {
  const source = direction === "receivable" ? receivable : payable;
  return groupObligationsByCounterparty(filterOpenObligations(source, filters));
}

export function directionTotal(
  receivable: SettlementObligation[],
  payable: SettlementObligation[],
  direction: SettlementDirection,
): number {
  const source = direction === "receivable" ? receivable : payable;
  return sumObligationAmounts(
    filterOpenObligations(source, { ...defaultLedgerFilters(), status: "open" }),
  );
}

export type SettlementExportRow = {
  direction: string;
  counterparty: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: string;
  basis: string;
};

export function buildExportRows(
  receivable: SettlementObligation[],
  payable: SettlementObligation[],
  direction: SettlementDirection,
  filters: SettlementLedgerFilters,
): SettlementExportRow[] {
  const source = direction === "receivable" ? receivable : payable;
  return filterOpenObligations(source, filters).map((row) => ({
    direction: direction === "receivable" ? "Мне должны" : "Я должен",
    counterparty: row.counterpartyName,
    orderId: row.orderId,
    amount: row.amount,
    status: row.status,
    createdAt: row.createdAt,
    basis: row.basis,
  }));
}

export function reconciliationSummary(
  completed: SettlementCompleted[],
  from: string,
  to: string,
): {
  receivableTotal: number;
  payableTotal: number;
  gaps: string[];
} {
  const filtered = filterCompletedRows(completed, "both", { q: "", from, to });
  const receivableTotal = sumObligationAmounts(
    filtered.filter((r) => r.direction === "receivable"),
  );
  const payableTotal = sumObligationAmounts(
    filtered.filter((r) => r.direction === "payable"),
  );
  const gaps = [
    "Нет журнала частичных выплат и подтверждений получателя — сводка только по завершённым order-linked записям.",
    "Исторические реквизиты и юр. стороны на дату события не восстанавливаются автоматически.",
  ];
  return { receivableTotal, payableTotal, gaps };
}
