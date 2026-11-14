/** Trusted Russian labels for system pipeline stages (K8 `sys_*`). */
export const CLIENTS_APPEAL_SYSTEM_STAGE_LABELS: Record<string, string> = {
  sys_new: "Новое обращение",
  sys_paid: "Оплачено",
  sys_shipped: "Отгружено",
  sys_return: "Возврат",
  sys_refused: "Отказ",
  /** Legacy short keys (observer fixtures / transition). */
  new: "Новое обращение",
  paid: "Оплачено",
  shipped: "Отгружено",
  return: "Возврат",
  refused: "Отказ",
};

/** When server omits `stageLabel` and key is opaque — never show raw `ws_*` ids. */
export const CLIENTS_APPEAL_CUSTOM_STAGE_FALLBACK = "Свой этап";

export const CLIENTS_REFERRER_DISPLAY_FALLBACK = "—";

export function trimTrustedClientsDisplayString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Reject user ids / draft ids masquerading as human referrer names. */
export function isOpaqueInternalIdLike(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  if (/^ws_draft_/i.test(t)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return true;
  if (/^\d{10,}$/.test(t)) return true;
  return false;
}

function shouldHideStageKeyAsLabel(stageKey: string): boolean {
  const key = stageKey.trim();
  if (!key) return true;
  if (CLIENTS_APPEAL_SYSTEM_STAGE_LABELS[key]) return false;
  if (/^ws_/i.test(key)) return true;
  if (isOpaqueInternalIdLike(key)) return true;
  return false;
}

/**
 * Display label for appeal stage — keeps `stageKey` elsewhere for logic/filters.
 * K1/K2 optional wire: `appeal.stageLabel` (receiving RECEIVING scope).
 */
export function resolveClientAppealStageDisplayLabel(input: {
  stageKey: string;
  trustedStageLabel?: string | null;
  workingStages?: { id: string; label: string }[];
}): string {
  const trusted = trimTrustedClientsDisplayString(input.trustedStageLabel);
  if (trusted) return trusted;
  const key = input.stageKey.trim() || "sys_new";
  const system = CLIENTS_APPEAL_SYSTEM_STAGE_LABELS[key];
  if (system) return system;
  const custom = input.workingStages?.find((s) => s.id === key);
  const customLabel = trimTrustedClientsDisplayString(custom?.label);
  if (customLabel) return customLabel;
  if (shouldHideStageKeyAsLabel(key)) return CLIENTS_APPEAL_CUSTOM_STAGE_FALLBACK;
  return key;
}

/**
 * K1/K2 optional wire: `appeal.referrerDisplayName` (certificate-entry projection / detail GET).
 * Never substitute receiving partner name or raw `referrerProUserId`.
 */
export function resolveReferrerDisplayLabel(input: {
  trustedReferrerDisplayName?: unknown;
}): string {
  const trusted = trimTrustedClientsDisplayString(input.trustedReferrerDisplayName);
  if (trusted && !isOpaqueInternalIdLike(trusted)) return trusted;
  return CLIENTS_REFERRER_DISPLAY_FALLBACK;
}