import { formatMoneyRub } from "@/lib/history-format";
import { bonusStatusLabel, bonusStatusTone, type HistoryStatusTone } from "@/lib/history-labels";
import type { AccrualRow } from "@/lib/history-types";
import type { SettlementObligation } from "@/lib/settlements-types";
import { bucketsOf } from "@/lib/wallet-accruals/buckets";
import {
  isCancelledStatus,
  isPaidStatus,
  kopecksToRub,
} from "@/lib/wallet-accruals/amounts";

export type AccrualPresentation = {
  heroAmount: number;
  heroNote: string;
  statusLabel: string;
  statusTone: HistoryStatusTone;
  /** Extra settlement buckets for detail receipt (not purchase reward). */
  breakdown?: Array<{ label: string; value: string }>;
};

function hasSettlementLifecycle(row: AccrualRow): boolean {
  return (
    row.pendingAmount != null ||
    row.suspendedAmount != null ||
    row.paidAmount != null ||
    row.confirmationLabel != null ||
    row.confirmationAt != null
  );
}

function obligationFromAccrual(row: AccrualRow): SettlementObligation {
  return {
    id: row.id,
    orderId: row.orderId ?? "",
    accrualType: row.accrualType,
    counterpartyId: "",
    counterpartyName: row.counterpartyName,
    amount: row.amount,
    pendingAmount: row.pendingAmount,
    suspendedAmount: row.suspendedAmount,
    paidAmount: row.paidAmount,
    confirmationLabel: row.confirmationLabel ?? undefined,
    confirmationAt: row.confirmationAt ?? undefined,
    hasIndividualTerms: row.hasIndividualTerms,
    basis: row.promoCode ? `Сертификат ${row.promoCode}` : "",
    status: row.status,
    createdAt: row.createdAt,
  };
}

function confirmedZeroLabel(confirmedRub: number): string {
  if (confirmedRub <= 0) {
    return "Подтверждено к расчёту 0 ₽";
  }
  return `Подтверждено к расчёту: ${formatMoneyRub(confirmedRub)}`;
}

function isTerminalPaidRow(row: AccrualRow): boolean {
  return isPaidStatus(row.status) || Boolean(row.paidAt?.trim());
}

function cancelledPresentation(row: AccrualRow): AccrualPresentation {
  return {
    heroAmount: row.amount,
    heroNote:
      row.amount === 0
        ? "Начисление отменено. Подтверждённая сумма 0 ₽ (не сумма покупки)."
        : "Сумма начисления на момент отмены, не сумма покупки.",
    statusLabel: bonusStatusLabel(row.status),
    statusTone: bonusStatusTone(row.status),
  };
}

function paidPresentation(
  row: AccrualRow,
  paidHistoryRub: number,
): AccrualPresentation {
  const heroAmount = row.amount > 0 ? row.amount : paidHistoryRub;
  const breakdown =
    heroAmount > 0
      ? [{ label: "Выплачено", value: formatMoneyRub(heroAmount) }]
      : undefined;
  return {
    heroAmount,
    heroNote: "Выплаченная сумма начисления, не сумма покупки.",
    statusLabel: bonusStatusLabel(row.status),
    statusTone: bonusStatusTone(row.status),
    breakdown,
  };
}

function buildOpenBreakdown(
  row: AccrualRow,
  buckets: ReturnType<typeof bucketsOf>,
  waitingRub: number,
  confirmedRub: number,
  suspendedRub: number,
  paidHistoryRub: number,
): AccrualPresentation["breakdown"] {
  const breakdown: AccrualPresentation["breakdown"] = [];
  if (buckets.hasWaitingRow) {
    breakdown.push({ label: "Ожидает подтверждения", value: formatMoneyRub(waitingRub) });
  }
  if (buckets.hasConfirmedRow) {
    breakdown.push({ label: "Подтверждено к расчёту", value: formatMoneyRub(confirmedRub) });
  } else if (
    row.amount === 0 &&
    !buckets.needsReview &&
    !buckets.hasWaitingRow &&
    !buckets.hasSuspendedRow
  ) {
    breakdown.push({ label: "Подтверждено к расчёту", value: formatMoneyRub(0) });
  }
  if (buckets.hasSuspendedRow) {
    const reason = buckets.needsReview
      ? row.confirmationLabel?.trim() || "Требует сверки"
      : row.confirmationLabel?.trim() || "Приостановлено";
    breakdown.push({ label: reason, value: formatMoneyRub(suspendedRub) });
  }
  if (paidHistoryRub > 0) {
    breakdown.push({ label: "Уже выплачено по строке", value: formatMoneyRub(paidHistoryRub) });
  }
  return breakdown;
}

/** Read-only presentation aligned with wallet settlement bucket semantics. */
export function presentAccrualRow(row: AccrualRow): AccrualPresentation {
  if (isCancelledStatus(row.status)) {
    return cancelledPresentation(row);
  }
  if (isTerminalPaidRow(row)) {
    return paidPresentation(row, 0);
  }

  if (!hasSettlementLifecycle(row)) {
    const zero = row.amount === 0;
    return {
      heroAmount: row.amount,
      heroNote: zero
        ? "Подтверждённая сумма начисления 0 ₽ (не сумма покупки)."
        : "Сохранённая сумма начисления, не сумма покупки.",
      statusLabel: zero ? confirmedZeroLabel(0) : bonusStatusLabel(row.status),
      statusTone: bonusStatusTone(row.status),
    };
  }

  const obligation = obligationFromAccrual(row);
  const buckets = bucketsOf(obligation);
  const waitingRub = kopecksToRub(buckets.waitingK);
  const confirmedRub = kopecksToRub(buckets.confirmedUnpaidK);
  const suspendedRub = kopecksToRub(buckets.suspendedK);
  const paidHistoryRub = kopecksToRub(buckets.openPaidHistoryK);
  const breakdown = buildOpenBreakdown(
    row,
    buckets,
    waitingRub,
    confirmedRub,
    suspendedRub,
    paidHistoryRub,
  );

  if (buckets.hasWaitingRow && !buckets.needsReview) {
    const noteParts = [
      "Ожидает подтверждения. В заголовке — сумма ожидания; ниже — подтверждённая часть по серверу.",
    ];
    if (confirmedRub > 0) {
      noteParts.push(`Подтверждено к расчёту: ${formatMoneyRub(confirmedRub)}.`);
    } else if (row.amount === 0 || confirmedRub === 0) {
      noteParts.push(confirmedZeroLabel(0));
    }
    return {
      heroAmount: waitingRub,
      heroNote: noteParts.join(" "),
      statusLabel: "Ожидает подтверждения",
      statusTone: "pending",
      breakdown,
    };
  }

  if (buckets.needsReview) {
    const label = row.confirmationLabel?.trim() || "Требует сверки";
    const hero = suspendedRub > 0 ? suspendedRub : waitingRub > 0 ? waitingRub : row.amount;
    return {
      heroAmount: hero,
      heroNote: `${label}. Суммы по этапам расчёта, не сумма покупки.`,
      statusLabel: label,
      statusTone: "pending",
      breakdown,
    };
  }

  if (buckets.hasSuspendedRow) {
    const label = row.confirmationLabel?.trim() || "Приостановлено";
    return {
      heroAmount: suspendedRub,
      heroNote: "Приостановленная сумма начисления, не сумма покупки.",
      statusLabel: label,
      statusTone: "declined",
      breakdown,
    };
  }

  if (buckets.hasConfirmedRow) {
    return {
      heroAmount: confirmedRub,
      heroNote: "Подтверждённая сумма к расчёту, не сумма покупки.",
      statusLabel: bonusStatusLabel(row.status),
      statusTone: bonusStatusTone(row.status),
      breakdown,
    };
  }

  if (paidHistoryRub > 0) {
    return paidPresentation(row, paidHistoryRub);
  }

  const confirmedZero = row.amount === 0 && !buckets.hasWaitingRow;
  return {
    heroAmount: row.amount,
    heroNote: confirmedZero
      ? "Подтверждённая сумма начисления 0 ₽ (не сумма покупки)."
      : "Сохранённая сумма начисления, не сумма покупки.",
    statusLabel: confirmedZero ? confirmedZeroLabel(0) : bonusStatusLabel(row.status),
    statusTone: bonusStatusTone(row.status),
    breakdown: breakdown.length ? breakdown : undefined,
  };
}

export function accrualRowHasPendingConfirmation(row: AccrualRow): boolean {
  if (!hasSettlementLifecycle(row)) return false;
  return bucketsOf(obligationFromAccrual(row)).hasWaitingRow;
}
