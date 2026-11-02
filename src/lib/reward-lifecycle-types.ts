export type RewardAmounts = { original: number; amount: number; pending: number; confirmed: number; suspended: number; paid: number; review: number };
export type RewardLineView = Omit<RewardAmounts, "original"> & {
  originalKopecks: number;
  id: string; categoryLabel: string; days: number; kind: "GOODS" | "SERVICE";
  grossKopecks: number; returnedGrossKopecks: number; fulfilledAt: string | null;
  confirmationAt: string | null; confirmedAt: string | null; canResume: boolean;
};
export type RewardPaymentView = {
  id: string; method: "CASH" | "TRANSFER"; proposedAt: string; resolvedAt: string | null;
  status: "PROPOSED" | "RECEIVED" | "REJECTED"; allocations: { lineId: string; kopecks: number }[];
};
export type RewardResponse = {
  actorId: string;
  permissions: { recipient: boolean; payerOwner: boolean; sellerAllowed: boolean; cash: boolean; transfer: boolean; canSuspend: boolean } | null;
  reward: null | { version: 1; summary: RewardAmounts; nextConfirmationAt: string | null;
    lines: RewardLineView[]; payments: RewardPaymentView[];
    history: { at: string; action: string; lineId: string | null; kopecks: number | null; actor: string }[];
  };
};
export type RewardAction =
  | { type: "fulfill"; lineId: string; fulfilledAt: string }
  | { type: "return"; lineId: string; grossKopecks: number }
  | { type: "suspend"; lineId: string; kopecks: number }
  | { type: "resume"; lineId: string }
  | { type: "propose_payment"; method: "CASH" | "TRANSFER"; kopecks: number }
  | { type: "confirm_payment" | "reject_payment"; paymentId: string };
export type RewardAttempt = { key: string; action: RewardAction };
export function parseRubles(value: string): number {
  const clean = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) throw new Error("Введите положительную сумму, не более двух знаков после запятой");
  const result = Math.round(Number(clean) * 100);
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error("Введите положительную сумму");
  return result;
}
export const rewardActionLabels: Record<string, string> = {
  confirmed: "Вознаграждение подтверждено", fulfill: "Передача товара / принятие работ",
  return: "Возврат покупки до скидки", suspend: "Сумма приостановлена", resume: "Приостановление снято",
  propose_payment: "Заявлена отправка денег", confirm_payment: "Получение денег подтверждено",
  reject_payment: "Получение денег отклонено",
};
