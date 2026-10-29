/**
 * Exact invitation templates from reference partners-redesign.js getInvitationTemplates().
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
  /** When recipient has no published terms. */
  requestTerms: boolean;
};

function proposal(agentOneWay: boolean): string {
  return agentOneWay
    ? "Предлагаю рекомендовать ваши товары или услуги своим клиентам и помогать вам увеличивать продажи."
    : "Давайте рекомендовать товары и услуги друг друга и привлекать новых клиентов, чтобы увеличивать продажи.";
}

function friendlyProposal(agentOneWay: boolean): string {
  return agentOneWay
    ? "Хочу рекомендовать твои товары или услуги своим клиентам и помогать тебе увеличивать продажи."
    : "Давай рекомендовать друг друга и привлекать новых клиентов, чтобы увеличивать продажи.";
}

export const INVITE_MESSAGE_TEMPLATES: InviteMessageTemplate[] = [
  {
    id: "short",
    label: "Коротко",
    build: (ctx) =>
      `Здравствуйте! ${proposal(ctx.agentOneWay)} Присоединяйтесь в RemCard по ссылке: зарегистрируйтесь или войдите, чтобы обсудить условия сотрудничества.`,
  },
  {
    id: "business",
    label: "По-деловому",
    build: (ctx) =>
      `Здравствуйте! Приглашаю к сотрудничеству в RemCard. ${proposal(ctx.agentOneWay)} Перейдите по ссылке и зарегистрируйтесь или войдите в существующий аккаунт. В кабинете сможем ознакомиться с предложениями и согласовать условия сотрудничества. Само приглашение не означает принятия условий.`,
  },
  {
    id: "friendly",
    label: "По-дружески",
    build: (ctx) =>
      `Привет! ${friendlyProposal(ctx.agentOneWay)} Пройди регистрацию в RemCard по ссылке или войди, если аккаунт уже есть. Условия сотрудничества обсудим в кабинете.`,
  },
];

export function inviteTemplateById(id: InviteMessageTemplateId): InviteMessageTemplate {
  const found = INVITE_MESSAGE_TEMPLATES.find((t) => t.id === id);
  if (!found) throw new Error(`unknown_invite_template:${id}`);
  return found;
}
