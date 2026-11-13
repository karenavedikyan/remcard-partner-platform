import type { ObserverReferredAppeal } from "./types";

const STAGE_LABELS: Record<string, string> = {
  sys_new: "Новое обращение",
  sys_paid: "Оплачено",
  sys_shipped: "Отгружено",
  sys_return: "Возврат",
  sys_refused: "Отказ",
  new: "Новое обращение",
  paid: "Оплачено",
  shipped: "Отгружено",
  return: "Возврат",
  refused: "Отказ",
};

export function observerAppealStatusLabel(appeal: ObserverReferredAppeal): string {
  return STAGE_LABELS[appeal.stageId] ?? appeal.stageId;
}

export function formatObserverDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function displayClientName(
  appeal: ObserverReferredAppeal,
  alias?: string | null,
): string {
  return alias?.trim() || appeal.clientName;
}
