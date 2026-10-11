export type InviteShareContext = {
  inviteeFullName?: string | null;
  /** Only when known reliably (never inferred from ФИО). */
  inviteeGivenName?: string | null;
  inviterDisplayName?: string | null;
  organizationName?: string | null;
  url: string;
  scope?: string | null;
};

/** Greeting — uses given name only when explicitly provided; never splits full name. */
export function inviteeGreetingLine(givenName?: string | null): string {
  const trimmed = givenName?.trim();
  if (!trimmed) return "Здравствуйте!";
  return `${trimmed}, здравствуйте!`;
}

function inviterLine(ctx: InviteShareContext): string {
  const name = ctx.inviterDisplayName?.trim();
  if (name) return `${name} приглашает вас`;
  if (ctx.organizationName?.trim()) {
    return `Команда ${ctx.organizationName.trim()} приглашает вас`;
  }
  return "Вас приглашают";
}

function teamTargetLine(ctx: InviteShareContext): string {
  const org = ctx.organizationName?.trim();
  if (ctx.scope === "SOLO_PARTNER") {
    return "в команду партнёра в RemCard.";
  }
  if (org) {
    return `в команду ${org} в RemCard.`;
  }
  return "в команду в RemCard.";
}

export function buildInviteShareMessage(ctx: InviteShareContext): string {
  const greeting = inviteeGreetingLine(ctx.inviteeGivenName);
  const inviter = inviterLine(ctx);
  const target = teamTargetLine(ctx);
  return `${greeting}

${inviter} ${target}

Примите приглашение, чтобы получить доступ к рабочему кабинету сотрудника:
${ctx.url}`;
}
