import {
  AGENT_DISCUSSION_INVITE_TEMPLATES,
  type AgentDiscussionInviteTemplateKey,
} from "@/components/partners/AgentDiscussionInviteWizard";

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