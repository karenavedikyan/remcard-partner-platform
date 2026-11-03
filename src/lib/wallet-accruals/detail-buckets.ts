import type { SettlementObligation } from "@/lib/settlements-types";
import { bucketsOf, sumBucketsForSource } from "@/lib/wallet-accruals/buckets";
import { kopecksToRub } from "@/lib/wallet-accruals/amounts";
import { formatPurchaseRef, formatIsoShort } from "@/lib/wallet-accruals/format";
import { buildWalletHistoryRows, txnViewFromRow } from "@/lib/wallet-accruals/map-history";
import type {
  WalletAccrualsData,
  WalletDirection,
  WalletHistoryRow,
} from "@/lib/wallet-accruals/types";

export type WalletDetailTab =
  | "confirmed"
  | "waiting"
  | "suspended"
  | "paid"
  | "schedule";

export type WalletBucketSummary = {
  confirmedUnpaid: number;
  waiting: number;
  suspended: number;
};

export type WalletScheduleRow = {
  lineId: string;
  amount: number;
  confirmDate: string | null;
  category: string;
  partner: string;
  purchaseId: string;
  historyRow: WalletHistoryRow;
};

function openSource(data: WalletAccrualsData, direction: WalletDirection): SettlementObligation[] {
  return direction === "in" ? data.receivable : data.payable;
}

export function walletBucketSummary(
  data: WalletAccrualsData,
  direction: WalletDirection,
): WalletBucketSummary {
  const sums = sumBucketsForSource(openSource(data, direction));
  return {
    confirmedUnpaid: kopecksToRub(sums.confirmedUnpaidK),
    waiting: kopecksToRub(sums.waitingK),
    suspended: kopecksToRub(sums.suspendedK),
  };
}

function categoryTitle(row: SettlementObligation): string {
  return row.basis?.trim() || "Начисление";
}

function historyRowForBucket(
  row: SettlementObligation,
  direction: WalletDirection,
  kind: WalletHistoryRow["kind"],
  amount: number,
  sortDate: string,
  extra?: Partial<WalletHistoryRow>,
): WalletHistoryRow {
  return {
    rowKey: `${row.id}|${kind}|${amount}|${sortDate}`,
    lineId: row.id,
    direction,
    kind,
    amount,
    sortDate,
    category: categoryTitle(row),
    partner: row.counterpartyName,
    purchaseId: formatPurchaseRef(row.orderId),
    suspendedReason: row.confirmationLabel ?? null,
    source: row,
    ...extra,
  };
}

export function walletDetailTabCounts(
  data: WalletAccrualsData,
  direction: WalletDirection,
  incomingOnly: boolean,
): Record<WalletDetailTab, number> {
  const rows = buildWalletHistoryRows(data, direction, incomingOnly);
  const schedule = walletScheduleRows(data, direction);
  return {
    confirmed: rows.filter((r) => r.kind === "confirmed").length,
    waiting: rows.filter((r) => r.kind === "waiting" || r.kind === "return").length,
    suspended: rows.filter((r) => r.kind === "suspended").length,
    paid: rows.filter((r) => r.kind === (direction === "in" ? "received" : "paid-out")).length,
    schedule: schedule.length,
  };
}

export function walletDetailTabRows(
  data: WalletAccrualsData,
  direction: WalletDirection,
  tab: WalletDetailTab,
  incomingOnly: boolean,
): WalletHistoryRow[] {
  const rows = buildWalletHistoryRows(data, direction, incomingOnly);
  if (tab === "confirmed") {
    return rows.filter((r) => r.kind === "confirmed");
  }
  if (tab === "waiting") {
    return rows.filter((r) => r.kind === "waiting" || r.kind === "return");
  }
  if (tab === "suspended") {
    return rows.filter((r) => r.kind === "suspended");
  }
  if (tab === "paid") {
    return rows.filter((r) => r.kind === (direction === "in" ? "received" : "paid-out"));
  }
  return walletScheduleRows(data, direction).map((s) => s.historyRow);
}

export function walletScheduleRows(
  data: WalletAccrualsData,
  direction: WalletDirection,
): WalletScheduleRow[] {
  const source = openSource(data, direction);
  const rows: WalletScheduleRow[] = [];
  for (const row of source) {
    const b = bucketsOf(row);
    if (!b.hasWaitingRow) continue;
    const waiting = kopecksToRub(b.waitingK);
    const historyRow = historyRowForBucket(
      row,
      direction,
      "waiting",
      waiting,
      row.confirmationAt?.trim() ?? "",
    );
    rows.push({
      lineId: row.id,
      amount: waiting,
      confirmDate: row.confirmationAt ?? null,
      category: categoryTitle(row),
      partner: row.counterpartyName,
      purchaseId: formatPurchaseRef(row.orderId),
      historyRow,
    });
  }
  return rows.sort((a, b) => {
    const da = a.confirmDate ? new Date(a.confirmDate).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.confirmDate ? new Date(b.confirmDate).getTime() : Number.MAX_SAFE_INTEGER;
    return da - db;
  });
}

export function scheduleBadgeExtra(confirmDate: string | null): string {
  if (!confirmDate) return "";
  return `до ${formatIsoShort(confirmDate)}`;
}

export function txnViewFromDetailRow(row: WalletHistoryRow) {
  return txnViewFromRow(row);
}
