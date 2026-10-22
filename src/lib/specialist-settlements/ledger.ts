import type {
  SettlementCompleted,
  SettlementObligation,
  SettlementPartnerGroup,
} from "@/lib/settlements-types";
import { sumObligationAmounts } from "@/lib/settlements-mappers";
import {
  instantInMskCalendarRange,
  validateMskPeriod,
} from "@/lib/specialist-settlements/mskCalendar";

export type SettlementExportScope = "open" | "partnerHistory" | "reconciliation";

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

export function validateLedgerPeriod(from: string, to: string): string | null {
  return validateMskPeriod(from, to);
}

function parseDay(iso: string): number {
  return new Date(iso).getTime();
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

function sortObligations(
  rows: SettlementObligation[],
  sort: SettlementLedgerFilters["sort"],
): SettlementObligation[] {
  return [...rows].sort((a, b) => {
    if (sort === "amount-desc") return b.amount - a.amount;
    if (sort === "amount-asc") return a.amount - b.amount;
    if (sort === "date-asc") return parseDay(a.createdAt) - parseDay(b.createdAt);
    return parseDay(b.createdAt) - parseDay(a.createdAt);
  });
}

export function filterOpenObligations(
  rows: SettlementObligation[],
  filters: SettlementLedgerFilters,
): SettlementObligation[] {
  let out = rows.filter((row) => matchesQuery(row, filters.q));
  if (filters.status === "open") {
    out = out.filter((row) => row.status !== "PAID" && row.status !== "CANCELLED");
  }
  out = out.filter((row) =>
    instantInMskCalendarRange(row.createdAt, filters.from, filters.to),
  );
  return sortObligations(out, filters.sort);
}

export type CompletedPeriodFilterResult = {
  inPeriod: SettlementCompleted[];
  excludedUnknownPaidAt: number;
};

export function specialistCompletedRowCaption(row: SettlementCompleted): string {
  const directionLabel = row.direction === "receivable" ? "Мне должны" : "Я должен";
  return `Зафиксированная выплата · ${directionLabel}`;
}

function sortCompletedRows(
  rows: SettlementCompleted[],
  sort: SettlementLedgerFilters["sort"],
): SettlementCompleted[] {
  return [...rows].sort((a, b) => {
    const aAt = parseDay(a.paidAt!);
    const bAt = parseDay(b.paidAt!);
    if (sort === "amount-desc") return b.amount - a.amount;
    if (sort === "amount-asc") return a.amount - b.amount;
    if (sort === "date-asc") return aAt - bAt;
    return bAt - aAt;
  });
}

/** Period filter uses paidAt only; legacy PAID without paidAt is excluded from period totals. */
export function filterCompletedForPeriod(
  rows: SettlementCompleted[],
  direction: SettlementDirection | "both",
  filters: Pick<SettlementLedgerFilters, "q" | "from" | "to">,
): CompletedPeriodFilterResult {
  let unknownPaidAt = 0;
  const inPeriod: SettlementCompleted[] = [];
  for (const row of rows) {
    if (direction !== "both" && row.direction !== direction) continue;
    if (!matchesQuery(row, filters.q)) continue;
    if (!row.paidAt) {
      unknownPaidAt += 1;
      continue;
    }
    if (instantInMskCalendarRange(row.paidAt, filters.from, filters.to)) {
      inPeriod.push(row);
    }
  }
  return { inPeriod, excludedUnknownPaidAt: unknownPaidAt };
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const maxPage = Math.max(1, Math.ceil(rows.length / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), maxPage);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function pageCount(rows: unknown[], pageSize: number): number {
  return Math.max(1, Math.ceil(rows.length / pageSize) || 1);
}

export function clampPage(page: number, rows: unknown[], pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(rows, pageSize));
}

function groupObligationsByCounterparty(
  rows: SettlementObligation[],
): SettlementPartnerGroup[] {
  const groups = new Map<string, SettlementPartnerGroup>();
  for (const row of rows) {
    const existing = groups.get(row.counterpartyId);
    if (existing) {
      existing.items.push(row);
      existing.totalAmount += row.amount;
      if (row.counterpartyName.trim()) {
        existing.counterpartyName = row.counterpartyName;
      }
      continue;
    }
    groups.set(row.counterpartyId, {
      counterpartyId: row.counterpartyId,
      counterpartyName: row.counterpartyName,
      totalAmount: row.amount,
      items: [row],
    });
  }
  return [...groups.values()];
}

function sortPartnerGroups(
  groups: SettlementPartnerGroup[],
  sort: SettlementLedgerFilters["sort"],
): SettlementPartnerGroup[] {
  return [...groups].sort((a, b) => {
    if (sort === "amount-desc") return b.totalAmount - a.totalAmount;
    if (sort === "amount-asc") return a.totalAmount - b.totalAmount;
    const latest = (g: SettlementPartnerGroup) =>
      Math.max(...g.items.map((i) => parseDay(i.createdAt)));
    if (sort === "date-asc") return latest(a) - latest(b);
    return latest(b) - latest(a);
  });
}

function completedOnlyPartnerGroups(
  completed: SettlementCompleted[],
  direction: SettlementDirection,
  filters: SettlementLedgerFilters,
): SettlementPartnerGroup[] {
  const { inPeriod } = filterCompletedForPeriod(
    completed.filter((row) => row.direction === direction),
    direction,
    filters,
  );
  const groups = new Map<string, SettlementPartnerGroup>();
  for (const row of inPeriod) {
    if (groups.has(row.counterpartyId)) continue;
    groups.set(row.counterpartyId, {
      counterpartyId: row.counterpartyId,
      counterpartyName: row.counterpartyName,
      totalAmount: 0,
      items: [],
      completedOnly: true,
    });
  }
  return [...groups.values()];
}

export function partnerGroupsForDirection(
  receivable: SettlementObligation[],
  payable: SettlementObligation[],
  completed: SettlementCompleted[],
  direction: SettlementDirection,
  filters: SettlementLedgerFilters,
): SettlementPartnerGroup[] {
  const source = direction === "receivable" ? receivable : payable;
  const filtered = filterOpenObligations(source, filters);
  let groups = sortPartnerGroups(groupObligationsByCounterparty(filtered), filters.sort);
  if (filters.status === "all") {
    const openIds = new Set(groups.map((group) => group.counterpartyId));
    const extras = completedOnlyPartnerGroups(completed, direction, filters).filter(
      (group) => !openIds.has(group.counterpartyId),
    );
    groups = sortPartnerGroups([...groups, ...extras], filters.sort);
  }
  return groups;
}

export function resolveExportScope(screen: string): SettlementExportScope {
  if (screen === "reconciliation") return "reconciliation";
  if (screen === "partnerHistory") return "partnerHistory";
  return "open";
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
  counterpartyId?: string | null,
): SettlementExportRow[] {
  const source = direction === "receivable" ? receivable : payable;
  let rows = filterOpenObligations(source, filters);
  if (counterpartyId) {
    rows = rows.filter((row) => row.counterpartyId === counterpartyId);
  }
  return rows.map((row) => ({
    direction: direction === "receivable" ? "Мне должны" : "Я должен",
    counterparty: row.counterpartyName,
    orderId: row.orderId,
    amount: row.amount,
    status: row.status,
    createdAt: row.createdAt,
    basis: row.basis,
  }));
}

export function partnerCompletedHistory(
  completed: SettlementCompleted[],
  direction: SettlementDirection,
  counterpartyId: string,
  filters: SettlementLedgerFilters,
): CompletedPeriodFilterResult {
  const scoped = completed.filter(
    (row) => row.direction === direction && row.counterpartyId === counterpartyId,
  );
  const filtered = filterCompletedForPeriod(scoped, direction, filters);
  return {
    ...filtered,
    inPeriod: sortCompletedRows(filtered.inPeriod, filters.sort),
  };
}

export function reconciliationSummary(
  completed: SettlementCompleted[],
  filters: Pick<SettlementLedgerFilters, "q" | "from" | "to" | "sort">,
): {
  receivableTotal: number;
  payableTotal: number;
  rows: SettlementCompleted[];
  excludedUnknownPaidAt: number;
  gaps: string[];
} {
  const { inPeriod, excludedUnknownPaidAt } = filterCompletedForPeriod(completed, "both", filters);
  const sorted = sortCompletedRows(inPeriod, filters.sort);
  const receivableTotal = sumObligationAmounts(
    sorted.filter((r) => r.direction === "receivable"),
  );
  const payableTotal = sumObligationAmounts(
    sorted.filter((r) => r.direction === "payable"),
  );
  const gaps = [
    "Нет журнала частичных выплат и подтверждений получателя — сводка только по завершённым order-linked записям.",
    "Исторические реквизиты и юр. стороны на дату события не восстанавливаются автоматически.",
  ];
  if (excludedUnknownPaidAt > 0) {
    gaps.push(
      `${excludedUnknownPaidAt} legacy-записей PAID без даты выплаты (paidAt) не включены в периодную сводку.`,
    );
  }
  return {
    receivableTotal,
    payableTotal,
    rows: sorted,
    excludedUnknownPaidAt,
    gaps,
  };
}
