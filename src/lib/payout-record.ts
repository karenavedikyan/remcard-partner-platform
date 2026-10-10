import { remcardFetch } from "./api-client";

export type PayoutMethod = "CASH" | "TRANSFER";

export type SettlementPayoutActions = {
  canRecordCash: boolean;
  canRecordTransfer: boolean;
};

export type RecordPayoutInput = {
  bonusId: string;
  payoutMethod: PayoutMethod;
  payoutNote?: string;
  idempotencyKey: string;
};

export type RecordPayoutResponse = {
  bonus: { id: string; status: string; paidAt?: string | null; payoutMethod?: string | null };
  payoutRecordId: string;
  replay: boolean;
};

export function payoutConfirmLabel(method: PayoutMethod): string {
  return method === "CASH"
    ? "Подтвердить выплату наличными"
    : "Подтвердить выполненный перевод";
}

export const PAYOUT_EXTERNAL_FACT_NOTE =
  "Деньги передаются или перечисляются вне RemCard. Здесь вы фиксируете факт уже выполненной выплаты.";

export async function fetchBonusPayoutActions(
  bonusId: string,
  accrualType: "bonus" | "agentBonus",
): Promise<SettlementPayoutActions> {
  const q = accrualType === "agentBonus" ? "?type=agentBonus" : "";
  const data = await remcardFetch<{ payoutActions: SettlementPayoutActions }>(
    `/api/bonus/${encodeURIComponent(bonusId)}/payout-actions${q}`,
  );
  return data.payoutActions;
}

export async function recordBonusPayoutFact(input: RecordPayoutInput): Promise<RecordPayoutResponse> {
  return remcardFetch<RecordPayoutResponse>(`/api/bonus/${encodeURIComponent(input.bonusId)}/pay`, {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      payoutMethod: input.payoutMethod,
      payoutNote: input.payoutNote?.trim() || undefined,
    },
  });
}

export function newPayoutIdempotencyKey(bonusId: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `prof-i-d.${bonusId}.${crypto.randomUUID()}`;
  }
  return `prof-i-d.${bonusId}.${Date.now()}`;
}
