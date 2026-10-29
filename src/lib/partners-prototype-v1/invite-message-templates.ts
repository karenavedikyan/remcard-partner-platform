/**
 * Message templates for partner invite wizard (prototype-v1).
 * Exact copy from reference/partners-redesign.js is blocked until navigator
 * reference worktree is available; these preserve the required three short
 * labels and mutual vs agent-one-way semantics from the task contract.
 */

export type InviteMessageTemplateId = "short" | "business" | "friendly";

export type InviteMessageTemplate = {
  id: InviteMessageTemplateId;
  label: string;
  build: (ctx: InviteMessageContext) => string;
};

export type InviteMessageContext = {
  inviterName: string;
  recipientName: string;
  /** Agent recommends recipient's goods/services only — no mutual promise. */
  agentOneWay: boolean;
  categoryLines: string[];
  /** Honest request when recipient has no published terms. */
  requestTerms: boolean;
};

function joinCategories(lines: string[]): string {
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0];
  if (lines.length === 2) return `${lines[0]} и ${lines[1]}`;
  return `${lines.slice(0, -1).join(", ")} и ${lines[lines.length - 1]}`;
}

export const INVITE_MESSAGE_TEMPLATES: InviteMessageTemplate[] = [
  {
    id: "short",
    label: "Коротко",
    build: (ctx) => {
      if (ctx.requestTerms) {
        return ctx.agentOneWay
          ? `${ctx.recipientName}, предлагаю сотрудничать в RemCard: буду рекомендовать ваши товары и услуги. Пришлите, пожалуйста, ваши условия.`
          : `${ctx.recipientName}, предлагаю взаимные рекомендации в RemCard. Пришлите, пожалуйста, ваши условия сотрудничества.`;
      }
      const cats = joinCategories(ctx.categoryLines);
      if (ctx.agentOneWay) {
        return cats
          ? `${ctx.recipientName}, буду рекомендовать ваши позиции (${cats}) через RemCard.`
          : `${ctx.recipientName}, буду рекомендовать ваши товары и услуги через RemCard.`;
      }
      return cats
        ? `${ctx.recipientName}, предлагаю взаимные рекомендации в RemCard по категориям: ${cats}.`
        : `${ctx.recipientName}, предлагаю взаимные рекомендации в RemCard.`;
    },
  },
  {
    id: "business",
    label: "По-деловому",
    build: (ctx) => {
      const who = ctx.inviterName.trim() || "Партнёр RemCard";
      if (ctx.requestTerms) {
        return ctx.agentOneWay
          ? `${ctx.recipientName}, меня зовут ${who}. Готов рекомендовать ваши товары и услуги клиентам через RemCard PROF. Опубликованных условий пока нет — пришлите, пожалуйста, проценты по категориям для обсуждения. Приглашение не означает принятие условий.`
          : `${ctx.recipientName}, меня зовут ${who}. Предлагаю взаимные рекомендации клиентов через RemCard PROF. Опубликованных условий пока нет — пришлите, пожалуйста, ваши проценты по категориям. Приглашение не означает автоматическое принятие условий.`;
      }
      const cats = joinCategories(ctx.categoryLines);
      if (ctx.agentOneWay) {
        return cats
          ? `${ctx.recipientName}, меня зовут ${who}. Предлагаю сотрудничество в RemCard PROF: я рекомендую ваши позиции (${cats}) на ваших опубликованных условиях. Приглашение не равно принятым условиям — подтверждение отдельным шагом.`
          : `${ctx.recipientName}, меня зовут ${who}. Предлагаю сотрудничество в RemCard PROF: я рекомендую ваши товары и услуги на ваших опубликованных условиях. Приглашение не равно принятым условиям.`;
      }
      return cats
        ? `${ctx.recipientName}, меня зовут ${who}. Предлагаю взаимные рекомендации в RemCard PROF по категориям: ${cats}. Условия из опубликованного профиля; принятие — отдельным шагом.`
        : `${ctx.recipientName}, меня зовут ${who}. Предлагаю взаимные рекомендации в RemCard PROF. Условия из опубликованного профиля; принятие — отдельным шагом.`;
    },
  },
  {
    id: "friendly",
    label: "По-дружески",
    build: (ctx) => {
      if (ctx.requestTerms) {
        return ctx.agentOneWay
          ? `${ctx.recipientName}, хочу рекомендовать вас в RemCard — напишите, пожалуйста, на каких условиях вам удобно.`
          : `${ctx.recipientName}, давайте обмениваться рекомендациями в RemCard? Напишите, пожалуйста, ваши условия — без выдуманных процентов с моей стороны.`;
      }
      const cats = joinCategories(ctx.categoryLines);
      if (ctx.agentOneWay) {
        return cats
          ? `${ctx.recipientName}, буду советовать ваше (${cats}) через RemCard — на ваших условиях.`
          : `${ctx.recipientName}, буду советовать ваши товары и услуги через RemCard — на ваших условиях.`;
      }
      return cats
        ? `${ctx.recipientName}, давайте рекомендовать друг друга в RemCard по ${cats}?`
        : `${ctx.recipientName}, давайте рекомендовать друг друга в RemCard?`;
    },
  },
];

export function inviteTemplateById(id: InviteMessageTemplateId): InviteMessageTemplate {
  const found = INVITE_MESSAGE_TEMPLATES.find((t) => t.id === id);
  if (!found) throw new Error(`unknown_invite_template:${id}`);
  return found;
}
