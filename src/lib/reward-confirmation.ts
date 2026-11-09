export type RewardConfirmation = { days: number; kind: "GOODS" | "SERVICE"; fulfilledAt: string | null };
export type RewardConfirmationDraft = { days: string; kind: "GOODS" | "SERVICE"; handedOver: boolean };
export const defaultRewardDraft: RewardConfirmationDraft = { days: "14", kind: "GOODS", handedOver: false };
export function rewardDraftToTerms(draft: RewardConfirmationDraft): RewardConfirmation {
  if (!/^\d+$/.test(draft.days) || !Number.isSafeInteger(Number(draft.days)) || Number(draft.days) > 36500)
    throw new Error("Срок подтверждения: целое число от 0 до 36500 дней");
  return { days: Number(draft.days), kind: draft.kind,
    fulfilledAt: draft.handedOver ? "ON_OPERATION" : null };
}
export function rewardTermsToDraft(terms?: RewardConfirmation): RewardConfirmationDraft {
  return terms ? { days: String(terms.days), kind: terms.kind, handedOver: terms.fulfilledAt !== null }
    : { ...defaultRewardDraft };
}
function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** Human-readable day count for reward summaries (12px+ UI copy). */
export function formatDaysRu(daysInput: string): string {
  if (!/^\d+$/.test(daysInput.trim())) {
    return "Проверьте срок";
  }
  const n = Number(daysInput);
  if (!Number.isSafeInteger(n)) {
    return "Проверьте срок";
  }
  return `${n} ${pluralRu(n, "день", "дня", "дней")}`;
}

export function rewardDateHint(draft: RewardConfirmationDraft, now = new Date()) {
  if (!draft.handedOver) return draft.kind === "SERVICE"
    ? "Дата будет определена после принятия работ" : "Дата будет определена после передачи товара";
  try {
    const { days } = rewardDraftToTerms(draft);
    if (!days) return "Без ожидания после проведения операции";
    const m = new Date(now.getTime() + 3 * 3600_000);
    const at = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() + days + 1) - 3 * 3600_000);
    return `Подтверждение с ${at.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}, 00:00 МСК`;
  } catch { return "Укажите целое неотрицательное число дней"; }
}
