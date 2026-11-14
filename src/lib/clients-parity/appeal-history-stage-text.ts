import {
  CLIENTS_APPEAL_CUSTOM_STAGE_FALLBACK,
  CLIENTS_APPEAL_SYSTEM_STAGE_LABELS,
  resolveClientAppealStageDisplayLabel,
} from "./client-appeal-display";

function stageTokenLabel(token: string): string {
  const key = token.trim();
  if (!key) return token;
  if (CLIENTS_APPEAL_SYSTEM_STAGE_LABELS[key]) {
    return CLIENTS_APPEAL_SYSTEM_STAGE_LABELS[key]!;
  }
  if (/^ws_/i.test(key) || /^ws_draft_/i.test(key)) {
    return CLIENTS_APPEAL_CUSTOM_STAGE_FALLBACK;
  }
  return resolveClientAppealStageDisplayLabel({ stageKey: key });
}

/** Map exact known `Статус: sys_*` / `Этап изменён: sys_*` server lines — no free-text reinterpretation. */
export function formatAppealHistoryTimelineText(text: string): string {
  const original = String(text ?? "");
  const trimmed = original.trim();
  if (!trimmed) return original;

  const status = trimmed.match(/^статус:\s*([^\s(·]+)/iu);
  if (status) {
    return trimmed.replace(
      /^статус:\s*([^\s(·]+)/iu,
      `Статус: ${stageTokenLabel(status[1]!)}`,
    );
  }

  const stageChanged = trimmed.match(/^этап изменён:\s*([^\s(·]+)/iu);
  if (stageChanged) {
    const suffix = trimmed.slice(stageChanged[0]!.length);
    return `Этап изменён: ${stageTokenLabel(stageChanged[1]!)}${suffix}`;
  }

  return original;
}