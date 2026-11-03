import type { SettlementCompleted, SettlementObligation } from "@/lib/settlements-types";
import {
  addKopecks,
  isCancelledStatus,
  isPaidStatus,
  kopecksToRub,
} from "@/lib/wallet-accruals/amounts";
import { bucketsOf, sumBucketsForSource } from "@/lib/wallet-accruals/buckets";
import { formatPurchaseRef } from "@/lib/wallet-accruals/format";
import type {
  WalletAccrualsData,
  WalletCardTotals,
  WalletDirection,
  WalletHistoryFilter,
  WalletHistoryRow,
  WalletHistoryRowKind,
} from "@/lib/wallet-accruals/types";

function categoryTitle(row: SettlementObligation | SettlementCompleted): string {
  const basis = row.basis?.trim();
  return basis || "Начисление";
}

function rowKey(lineId: string, kind: WalletHistoryRowKind, amountKopecks: number, sortKey: string): string {
  return `${lineId}|${kind}|${amountKopecks}|${sortKey}`;
}

function purchaseId(row: SettlementObligation | SettlementCompleted): string {
  return formatPurchaseRef(row.orderId);
}

function pushRow(
  out: WalletHistoryRow[],
  row: SettlementObligation,
  direction: WalletDirection,
  kind: WalletHistoryRowKind,
  amountKopecks: number,
  sortDate: string,
  extra?: Partial<WalletHistoryRow>,
): void {
  if (amountKopecks <= 0 && kind !== "return") return;
  const amountRub = kind === "return" ? 0 : kopecksToRub(amountKopecks);
  out.push({
    rowKey: rowKey(row.id, kind, amountKopecks, sortDate || row.id),
    lineId: row.id,
    direction,
    kind,
    sortDate,
    category: categoryTitle(row),
    partner: row.counterpartyName,
    purchaseId: purchaseId(row),
    suspendedReason: kind === "suspended" && bucketsOf(row).needsReview
      ? row.confirmationLabel ?? "Требует сверки"
      : kind === "suspended"
        ? row.confirmationLabel ?? null
        : undefined,
    source: row,
    ...extra,
    amount: extra?.amount ?? amountRub,
  });
}

function obligationDeadlineIso(row: SettlementObligation): string {
  return row.confirmationAt?.trim() ?? "";
}

function expandOpenObligation(
  row: SettlementObligation,
  direction: WalletDirection,
): WalletHistoryRow[] {
  const out: WalletHistoryRow[] = [];
  const b = bucketsOf(row);

  if (b.hasWaitingRow) {
    pushRow(out, row, direction, "waiting", b.waitingK, obligationDeadlineIso(row));
  }

  if (b.hasConfirmedRow) {
    pushRow(out, row, direction, "confirmed", b.confirmedUnpaidK, obligationDeadlineIso(row));
  }

  if (b.hasSuspendedRow) {
    pushRow(
      out,
      row,
      direction,
      "suspended",
      b.suspendedK,
      obligationDeadlineIso(row),
      b.needsReview
        ? { suspendedReason: row.confirmationLabel ?? "Требует сверки" }
        : undefined,
    );
  }

  if (b.openPaidHistoryK > 0) {
    const kind: WalletHistoryRowKind = direction === "in" ? "received" : "paid-out";
    pushRow(out, row, direction, kind, b.openPaidHistoryK, row.rewardPaidAt?.trim() ?? "");
  }

  return out;
}

function rubToKopecksSafe(rub: number): number {
  return Math.max(0, Math.round(rub * 100));
}

function completedHistoryKind(
  row: SettlementCompleted,
  direction: WalletDirection,
): WalletHistoryRowKind | null {
  if (isCancelledStatus(row.status)) {
    return "return";
  }
  if (isPaidStatus(row.status) && rubToKopecksSafe(row.amount) > 0) {
    return direction === "in" ? "received" : "paid-out";
  }
  return null;
}

function mapCompletedRow(row: SettlementCompleted, direction: WalletDirection): WalletHistoryRow | null {
  const kind = completedHistoryKind(row, direction);
  if (!kind) return null;
  const amountKopecks = kind === "return" ? 0 : rubToKopecksSafe(row.amount);
  const sortDate = kind === "return" ? "" : row.paidAt ?? row.rewardPaidAt ?? "";
  return {
    rowKey: rowKey(row.id, kind, amountKopecks, sortDate || row.id),
    lineId: row.id,
    direction,
    kind,
    amount: kind === "return" ? 0 : kopecksToRub(amountKopecks),
    sortDate,
    category: categoryTitle(row),
    partner: row.counterpartyName,
    purchaseId: purchaseId(row),
    source: row,
  };
}

export function buildWalletHistoryRows(
  data: WalletAccrualsData,
  direction: WalletDirection,
  incomingOnly: boolean,
): WalletHistoryRow[] {
  const rows: WalletHistoryRow[] = [];
  const openSource = direction === "in" ? data.receivable : data.payable;
  for (const row of openSource) {
    rows.push(...expandOpenObligation(row, direction));
  }
  for (const row of data.completed) {
    const rowDirection: WalletDirection = row.direction === "receivable" ? "in" : "out";
    if (incomingOnly && rowDirection === "out") continue;
    if (rowDirection !== direction) continue;
    const mapped = mapCompletedRow(row, direction);
    if (mapped) rows.push(mapped);
  }
  return rows.sort((a, b) => {
    const ta = a.sortDate ? Date.parse(a.sortDate) : 0;
    const tb = b.sortDate ? Date.parse(b.sortDate) : 0;
    if (tb !== ta) return tb - ta;
    return b.rowKey.localeCompare(a.rowKey);
  });
}

export function filterWalletHistoryRows(
  rows: WalletHistoryRow[],
  filter: WalletHistoryFilter,
  direction: WalletDirection,
): WalletHistoryRow[] {
  if (filter === "all") return rows;
  if (filter === "waiting") {
    return rows.filter((r) => r.kind === "waiting" || r.kind === "return");
  }
  if (filter === "received") {
    return rows.filter((r) => r.kind === "received");
  }
  if (filter === "paid") {
    return rows.filter((r) => r.kind === "paid-out");
  }
  return rows;
}

export function sumHistoryRowAmountsKopecks(rows: WalletHistoryRow[]): number {
  return addKopecks(
    rows
      .filter((row) => row.kind !== "return")
      .map((row) => rubToKopecksSafe(row.amount)),
  );
}

export function sumHistoryRowAmounts(rows: WalletHistoryRow[]): number {
  return kopecksToRub(sumHistoryRowAmountsKopecks(rows));
}

export function walletCardTotals(
  data: WalletAccrualsData,
  direction: WalletDirection,
): WalletCardTotals {
  const sums = sumBucketsForSource(direction === "in" ? data.receivable : data.payable);
  return {
    confirmedUnpaid: kopecksToRub(sums.confirmedUnpaidK),
    waiting: kopecksToRub(sums.waitingK),
  };
}

export function historyTotalLabel(filter: WalletHistoryFilter): string {
  if (filter === "all") return "Сумма операций";
  if (filter === "waiting") return "В ожидании";
  if (filter === "received") return "Получено";
  if (filter === "paid") return "Выплачено";
  return "Всего";
}

export function historyFiltersForDirection(
  direction: WalletDirection,
): { id: WalletHistoryFilter; label: string }[] {
  if (direction === "in") {
    return [
      { id: "all", label: "Все" },
      { id: "waiting", label: "Ожидает" },
      { id: "received", label: "Получено" },
    ];
  }
  return [
    { id: "all", label: "Все" },
    { id: "waiting", label: "Ожидает" },
    { id: "paid", label: "Выплачено" },
  ];
}

export function txnViewFromRow(row: WalletHistoryRow): import("@/lib/wallet-accruals/types").WalletTxnView {
  return {
    lineId: row.lineId,
    rowKind: row.kind,
    amount: row.amount,
    sortDate: row.sortDate,
    paidAt:
      row.kind === "received" || row.kind === "paid-out"
        ? row.sortDate || undefined
        : undefined,
  };
}

export function findObligationById(
  data: WalletAccrualsData,
  lineId: string,
): SettlementObligation | SettlementCompleted | undefined {
  return (
    data.receivable.find((r) => r.id === lineId) ??
    data.payable.find((r) => r.id === lineId) ??
    data.completed.find((r) => r.id === lineId)
  );
}
