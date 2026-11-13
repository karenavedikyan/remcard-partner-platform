import type { ObserverReferredAppeal } from "./types";
import { CLIENTS_APPEAL_SYSTEM_STAGE } from "./types";

const STAGE_LABELS: Record<string, string> = {
  [CLIENTS_APPEAL_SYSTEM_STAGE.NEW]: "Новое обращение",
  [CLIENTS_APPEAL_SYSTEM_STAGE.PAID]: "Оплачено",
  [CLIENTS_APPEAL_SYSTEM_STAGE.SHIPPED]: "Отгружено",
  [CLIENTS_APPEAL_SYSTEM_STAGE.RETURN]: "Возврат",
  [CLIENTS_APPEAL_SYSTEM_STAGE.REFUSED]: "Отказ",
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
      timeZone: "Europe/Moscow",
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
