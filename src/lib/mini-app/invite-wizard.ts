import {
  AGENT_DISCUSSION_INVITE_TEMPLATES,
  type AgentDiscussionInviteTemplateKey,
} from "@/components/partners/AgentDiscussionInviteWizard";
import { RemcardApiError } from "@/lib/api-client";

export type MiniInviteKind = "discussion" | "terms";

export const INTENDED_PARTNER_OPTIONS = [
  { value: "AGENT", label: "Агент" },
  { value: "MASTER", label: "Специалист" },
  { value: "STORE", label: "Магазин" },
  { value: "COMPANY", label: "Компания" },
] as const;

export type IntendedPartnerType = (typeof INTENDED_PARTNER_OPTIONS)[number]["value"] | "";

export const TERMS_MESSAGE_TEMPLATES = [
  { id: "short", label: "Коротко" },
  { id: "business", label: "По-деловому" },
  { id: "friendly", label: "По-дружески" },
] as const;

export const DISCUSSION_MESSAGE_TEMPLATES = (
  Object.entries(AGENT_DISCUSSION_INVITE_TEMPLATES) as Array<
    [AgentDiscussionInviteTemplateKey, { label: string; text: string }]
  >
).map(([id, row]) => ({ id, label: row.label, text: row.text }));

export function termsTemplateText(kind: string, partnerName: string): string {
  const name = partnerName.trim() || "партнёр";
  if (kind === "business") {
    return `Здравствуйте, ${name}! Предлагаем сотрудничество в RemCard: рекомендовать наши товары и услуги клиентам и развивать партнёрство. Посмотрите условия по ссылке и примите приглашение, если они вам подходят.`;
  }
  if (kind === "friendly") {
    return `Привет, ${name}! Давайте помогать друг другу находить новых клиентов. Приглашаю в RemCard: по ссылке можно посмотреть условия и принять приглашение.`;
  }
  return `Здравствуйте, ${name}! Давайте рекомендовать товары и услуги друг друга и привлекать новых клиентов. Приглашаю к сотрудничеству в RemCard.`;
}

export function discussionTemplateText(templateId: AgentDiscussionInviteTemplateKey | string): string {
  const row = AGENT_DISCUSSION_INVITE_TEMPLATES[templateId as AgentDiscussionInviteTemplateKey];
  return row?.text ?? "";
}

export function templateIdForDiscussionText(text: string): AgentDiscussionInviteTemplateKey | "" {
  for (const key of Object.keys(AGENT_DISCUSSION_INVITE_TEMPLATES) as AgentDiscussionInviteTemplateKey[]) {
    if (AGENT_DISCUSSION_INVITE_TEMPLATES[key].text === text) return key;
  }
  return "";
}

export type MiniInviteCreateResult = {
  url: string;
  previewPath: string;
  expiresAt: string;
  recipientLabel: string;
  note: string;
  kind: MiniInviteKind;
  intendedType: IntendedPartnerType;
  termsSummary: Array<{ category: string; excluded: boolean; percent: number | null }>;
};

export function buildInviteShareText(snapshot: MiniInviteCreateResult): string {
  const message = snapshot.note.trim();
  const url = snapshot.url.trim();
  return message ? `${message}\n\n${url}` : url;
}

export function formatInviteExpiry(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function stepFieldErrors(input: {
  step: number;
  kind: MiniInviteKind;
  name: string;
  note: string;
  intendedType: IntendedPartnerType;
  requiresIntendedType: boolean;
  nameMax: number;
  noteMax: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.step >= 1) {
    const trimmed = input.name.trim();
    if (!trimmed) errors.name = "Укажите имя или название партнёра";
    else if (trimmed.length > input.nameMax) {
      errors.name = `Не больше ${input.nameMax} символов`;
    }
    if (input.kind === "terms" && input.requiresIntendedType && !input.intendedType) {
      errors.type = "Выберите предполагаемый тип партнёра";
    }
  }
  if (input.step >= 2) {
    const trimmed = input.note.trim();
    if (!trimmed) errors.note = "Напишите текст приглашения";
    else if (trimmed.length > input.noteMax) {
      errors.note = `Не больше ${input.noteMax} символов`;
    }
  }
  return errors;
}

export type MiniInviteDraftV1 = {
  v: 1;
  step: number;
  partnerName: string;
  intendedType: IntendedPartnerType;
  templateId: string;
  note: string;
  generalConfirmed: boolean;
  rows: Array<{ category: string; percent: string; excluded: boolean }>;
};

export function miniInviteDraftKey(platform: string, branchId: string | null, actorUserId: string): string {
  return `remcard.mini-invite.v2.${encodeURIComponent(actorUserId)}.${platform}.${branchId ?? "none"}`;
}

export function readMiniInviteDraft(key: string): MiniInviteDraftV1 | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MiniInviteDraftV1;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function writeMiniInviteDraft(key: string, draft: MiniInviteDraftV1): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // quota / private mode — best effort
  }
}

export function clearMiniInviteDraft(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function draftIsDirty(input: {
  ready: boolean;
  step: number;
  name: string;
  note: string;
  intendedType: IntendedPartnerType;
}): boolean {
  if (input.ready) return false;
  return (
    input.step > 1 ||
    Boolean(input.name.trim()) ||
    Boolean(input.note.trim()) ||
    Boolean(input.intendedType)
  );
}

/** Scoped to embedded session + platform + branch + invite flow kind (one in-flight create). */
export type MiniInviteRecoveryScope = {
  actorUserId: string;
  embeddedContext: string;
  platform: string;
  branchId: string | null;
  kind: MiniInviteKind;
};

export const MINI_INVITE_UNKNOWN_OUTCOME_HINT =
  "Не отправляйте ещё одно приглашение из мини-кабинета. Откройте полный кабинет RemCard, раздел «Партнёры», и проверьте, не создано ли приглашение уже. Если оно не создано, оформите его в полном кабинете.";

export function miniInviteRecoveryKey(scope: MiniInviteRecoveryScope): string {
  return `remcard.mini-invite.recovery.v2.${encodeURIComponent(scope.actorUserId)}.${scope.embeddedContext}.${scope.platform}.${scope.branchId ?? "none"}.${scope.kind}`;
}

export function readMiniInviteRecoveryPending(key: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Call synchronously immediately before the create POST (no idempotency). */
export function armMiniInviteRecoveryGuard(key: string): boolean {
  try {
    sessionStorage.setItem(key, "1");
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function clearMiniInviteRecoveryGuard(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function isInviteCreateUnknownOutcome(err: unknown): boolean {
  if (err instanceof RemcardApiError) {
    if (err.status === 0) return true;
    if (err.status === 408) return true;
    if (err.status >= 500) return true;
    if (err.message === "Некорректный ответ сервера") return true;
    return false;
  }
  return true;
}
