import { getPartnershipUiActions, type PartnershipActionKind } from "@/lib/partnership-rules";
import type { Partnership } from "@/lib/types";
import {
  partnerRowTitle,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";

/** C1 UI labels — overrides short rule labels at render sites only (rules untouched). */
export function cooperationActionLabel(kind: PartnershipActionKind | string): string | null {
  if (kind === "pause") return "Приостановить сотрудничество";
  if (kind === "resume") return "Возобновить сотрудничество";
  return null;
}

export function termChangeActionLabel(): string {
  return "Изменить условия";
}

export function isPartnershipParticipant(partnership: Partnership, meId: string): boolean {
  return partnership.storeUserId === meId || partnership.proUserId === meId;
}

export function partnershipAllowsUiAction(
  partnership: Partnership,
  meId: string,
  actionKind: PartnershipActionKind,
): boolean {
  if (!isPartnershipParticipant(partnership, meId)) return false;
  return getPartnershipUiActions(partnership, meId).some(
    (action) => action.kind === actionKind,
  );
}

export function canOpenTermChange(partnership: Partnership, meId: string): boolean {
  return isPartnershipParticipant(partnership, meId) && partnership.status === "ACTIVE";
}

export function cooperationPartnerTitle(partnership: Partnership, meId: string): string {
  return partnerRowTitle(partnership, meId);
}

export function pauseConfirmCopy(partnerName: string): { title: string; body: string } {
  return {
    title: `Приостановить сотрудничество с ${partnerName}?`,
    body: "Статус сотрудничества станет «Приостановлено». Партнёр не удаляется, условия самой связи сохраняются. Другая сторона получит уведомление. Юридический статус ранее выданных сертификатов здесь не пересчитывается.",
  };
}

export function resumeConfirmCopy(partnerName: string): { title: string; body: string } {
  return {
    title: `Возобновить сотрудничество с ${partnerName}?`,
    body: "Статус снова станет «Действует». Партнёр не удаляется, условия самой связи сохраняются. Другая сторона получит уведомление.",
  };
}

export function discardTermDraftCopy(): { title: string; body: string; keep: string; discard: string } {
  return {
    title: "Закрыть без отправки?",
    body: "Черновик изменения условий будет потерян.",
    keep: "Продолжить редактирование",
    discard: "Закрыть без отправки",
  };
}

/** Re-resolve partnership from the current list (bound context). */
export function findPartnershipById(
  list: Partnership[],
  id: string,
): Partnership | undefined {
  return list.find((item) => item.id === id);
}

export function partnerProfileName(partnership: Partnership, meId: string): string {
  void partnershipPartnerProfile(partnership, meId);
  return cooperationPartnerTitle(partnership, meId);
}