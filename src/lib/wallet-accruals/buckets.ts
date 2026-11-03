import type { SettlementObligation } from "@/lib/settlements-types";

function rubToKopecksLocal(rub: number | null | undefined): number {
  if (rub == null || !Number.isFinite(rub)) return 0;
  return Math.round(rub * 100);
}

function rowNeedsReview(row: SettlementObligation): boolean {
  const label = row.confirmationLabel?.toLowerCase() ?? "";
  const status = String(row.status).toUpperCase();
  return status.includes("REVIEW") || label.includes("сверк");
}

/** Canonical open-obligation buckets — single classifier for card, tabs, counts, and history rows. */
export type ObligationBuckets = {
  confirmedUnpaidK: number;
  waitingK: number;
  suspendedK: number;
  /** Partial payments on open row; zero under review when paidAmount duplicates overpayment in suspendedAmount. */
  openPaidHistoryK: number;
  needsReview: boolean;
  hasConfirmedRow: boolean;
  hasWaitingRow: boolean;
  hasSuspendedRow: boolean;
};

export function bucketsOf(row: SettlementObligation): ObligationBuckets {
  const needsReview = rowNeedsReview(row);
  const waitingK = Math.max(0, rubToKopecksLocal(row.pendingAmount));
  const suspendedK = Math.max(0, rubToKopecksLocal(row.suspendedAmount));
  const confirmedUnpaidK = needsReview ? 0 : Math.max(0, rubToKopecksLocal(row.amount));

  let openPaidHistoryK = Math.max(0, rubToKopecksLocal(row.paidAmount));
  if (needsReview) {
    openPaidHistoryK = 0;
  }

  return {
    confirmedUnpaidK,
    waitingK,
    suspendedK,
    openPaidHistoryK,
    needsReview,
    hasConfirmedRow: confirmedUnpaidK > 0,
    hasWaitingRow: waitingK > 0,
    hasSuspendedRow: suspendedK > 0,
  };
}

export function sumBucketsForSource(rows: SettlementObligation[]): {
  confirmedUnpaidK: number;
  waitingK: number;
  suspendedK: number;
} {
  let confirmedUnpaidK = 0;
  let waitingK = 0;
  let suspendedK = 0;
  for (const row of rows) {
    const b = bucketsOf(row);
    confirmedUnpaidK += b.confirmedUnpaidK;
    waitingK += b.waitingK;
    suspendedK += b.suspendedK;
  }
  return { confirmedUnpaidK, waitingK, suspendedK };
}
