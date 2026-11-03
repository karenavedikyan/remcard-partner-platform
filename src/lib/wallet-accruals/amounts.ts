import type { SettlementObligation } from "@/lib/settlements-types";
import { bucketsOf } from "@/lib/wallet-accruals/buckets";

/** All wallet arithmetic uses integer kopecks (backend amounts are rub decimals). */
export function rubToKopecks(rub: number | null | undefined): number {
  if (rub == null || !Number.isFinite(rub)) return 0;
  return Math.round(rub * 100);
}

export function kopecksToRub(kopecks: number): number {
  return kopecks / 100;
}

export function addKopecks(values: number[]): number {
  return values.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
}

/** Confirmed unpaid portion only — never includes waiting, suspended, or paid buckets. */
export function confirmedUnpaidKopecks(row: SettlementObligation): number {
  return bucketsOf(row).confirmedUnpaidK;
}

export function waitingKopecks(row: SettlementObligation): number {
  return bucketsOf(row).waitingK;
}

export function suspendedKopecks(row: SettlementObligation): number {
  return bucketsOf(row).suspendedK;
}

export function paidOnOpenKopecks(row: SettlementObligation): number {
  return bucketsOf(row).openPaidHistoryK;
}

export function confirmedUnpaidRub(row: SettlementObligation): number {
  return kopecksToRub(confirmedUnpaidKopecks(row));
}

export function waitingRub(row: SettlementObligation): number {
  return kopecksToRub(waitingKopecks(row));
}

export function suspendedRub(row: SettlementObligation): number {
  return kopecksToRub(suspendedKopecks(row));
}

export function paidHistoryRub(row: SettlementObligation): number {
  return kopecksToRub(paidOnOpenKopecks(row));
}

export function isNeedsReview(row: SettlementObligation): boolean {
  const label = row.confirmationLabel?.toLowerCase() ?? "";
  const status = String(row.status).toUpperCase();
  return status.includes("REVIEW") || label.includes("сверк");
}

export function isCancelledStatus(status: string): boolean {
  return String(status).toUpperCase() === "CANCELLED";
}

export function isPaidStatus(status: string): boolean {
  return String(status).toUpperCase() === "PAID";
}
