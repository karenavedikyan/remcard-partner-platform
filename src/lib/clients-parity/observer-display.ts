import { resolveClientAppealStageDisplayLabel } from "./client-appeal-display";
import type { ObserverReferredAppeal } from "./types";

export function observerAppealStatusLabel(appeal: ObserverReferredAppeal): string {
  if (appeal.stageLabel?.trim()) return appeal.stageLabel.trim();
  return resolveClientAppealStageDisplayLabel({ stageKey: String(appeal.stageId) });
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
