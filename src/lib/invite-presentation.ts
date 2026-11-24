import type { Metadata } from "next";
import type { LinkInvitePublicPreview } from "@/lib/link-invite-public";

export type PartnerTypeCode = "MASTER" | "STORE" | "COMPANY" | string | null | undefined;

export type InviteAudience = "master" | "store" | "neutral";

const SITE_NAME = "RemCard PROF";

const SPECIALIST_OG_DESCRIPTION =
  "Рекомендуйте товары своим клиентам на согласованных условиях. Скидки для клиентов, вознаграждения и история покупок в RemCard PROF.";

const STORE_INVITEE_OG_DESCRIPTION =
  "Продажи по рекомендациям специалистов на согласованных условиях. Прозрачные условия и история покупок в RemCard PROF.";

const NEUTRAL_OG_DESCRIPTION =
  "Предложение о сотрудничестве в RemCard PROF. Прозрачные условия и единая история покупок.";

const INACTIVE_METADATA: Record<
  string,
  { title: string; description: string }
> = {
  ACCEPTED: {
    title: "Приглашение уже принято",
    description: "Эта ссылка больше недоступна для новых участников.",
  },
  JOINED: {
    title: "Приглашение уже принято",
    description: "Эта ссылка больше недоступна для новых участников.",
  },
  REVOKED: {
    title: "Приглашение отозвано",
    description: "Отправитель отменил предложение. Запросите новую ссылку.",
  },
  EXPIRED: {
    title: "Срок приглашения истёк",
    description: "Попросите отправителя создать новую ссылку.",
  },
  NOT_FOUND: {
    title: "Ссылка недействительна",
    description: "Проверьте адрес или запросите новое приглашение.",
  },
  ERROR: {
    title: "Приглашение RemCard PROF",
    description: "Не удалось загрузить данные приглашения. Откройте ссылку в браузере.",
  },
};

export function resolveInviteAudience(
  inviterType: PartnerTypeCode,
  intendedType: PartnerTypeCode,
): InviteAudience {
  if (intendedType === "MASTER") return "master";
  if (intendedType === "AGENT") return "neutral";
  if (intendedType === "STORE") return "store";
  if (intendedType === "COMPANY") return "neutral";
  if (inviterType === "STORE") return "master";
  if (inviterType === "MASTER" || inviterType === "COMPANY") return "neutral";
  return "neutral";
}

export function formatInviteAudienceLabel(
  intendedType: PartnerTypeCode,
  inviterType: PartnerTypeCode,
): string | null {
  switch (intendedType) {
    case "AGENT":
      return "Для агентов";
    case "MASTER":
      return "Для специалистов";
    case "STORE":
      return "Для магазинов";
    case "COMPANY":
      return "Для компаний";
    default:
      if (inviterType === "STORE") {
        return "Для специалистов";
      }
      return null;
  }
}

export function inviterDisplayName(preview: LinkInvitePublicPreview): string {
  return preview.inviter?.displayName?.trim() || "Партнёр RemCard";
}

export function inviteOgDescription(
  inviterType: PartnerTypeCode,
  intendedType: PartnerTypeCode,
): string {
  const audience = resolveInviteAudience(inviterType, intendedType);
  if (audience === "master") return SPECIALIST_OG_DESCRIPTION;
  if (audience === "store") return STORE_INVITEE_OG_DESCRIPTION;
  return NEUTRAL_OG_DESCRIPTION;
}

export type InviteViewer = {
  partnerType?: string | null;
  partnerActivities?: string[] | null;
} | null;

/**
 * Who recommends whom after acceptance. The server decides it from the real profiles
 * (`resolvePartnershipSides`), so the page only states a direction it can be sure of.
 */
export type InviteDirection = "recipient_recommends" | "neutral";

export type InviteStep = { title: string; hint: string };

export type InviteLandingCopy = {
  direction: InviteDirection;
  agentRecipient: boolean;
  kicker: string;
  headline: string;
  senderLine: string | null;
  lead: string;
  flowTitle: string;
  flow: [string, string, string];
  termsTitle: string;
  termsColumn: string;
  percentExplainer: string;
  mutual: { title: string; text: string } | null;
  noteCaption: string;
  stepsTitle: string;
  steps: [InviteStep, InviteStep, InviteStep];
};

const INVITER_TYPE_LABEL: Record<string, string> = {
  STORE: "Магазин",
  COMPANY: "Компания",
  MASTER: "Специалист",
};

/** Mirrors the server rule for a pure agent recipient (AGENT activity without trade sides). */
function isPureAgentViewer(activities: string[] | null | undefined): boolean {
  const list = activities ?? [];
  return list.includes("AGENT") && !list.includes("STORE") && !list.includes("SERVICE");
}

function isSpecialistOrCompany(type: PartnerTypeCode): boolean {
  return type === "MASTER" || type === "COMPANY";
}

export function resolveInviteRecipient(
  intendedType: PartnerTypeCode,
  viewer: InviteViewer,
): { agentRecipient: boolean; recipientType: PartnerTypeCode } {
  const viewerKnown = Boolean(
    viewer && (viewer.partnerType || (viewer.partnerActivities ?? []).length > 0),
  );
  if (viewerKnown && viewer) {
    return {
      agentRecipient: isPureAgentViewer(viewer.partnerActivities),
      recipientType: viewer.partnerType ?? null,
    };
  }
  return {
    agentRecipient: intendedType === "AGENT",
    recipientType:
      intendedType === "MASTER" || intendedType === "STORE" || intendedType === "COMPANY"
        ? intendedType
        : null,
  };
}

export function resolveInviteDirection(
  inviterType: PartnerTypeCode,
  intendedType: PartnerTypeCode,
  viewer: InviteViewer = null,
): InviteDirection {
  const { agentRecipient, recipientType } = resolveInviteRecipient(intendedType, viewer);
  if (agentRecipient) return "recipient_recommends";
  if (inviterType === "STORE") return "recipient_recommends";
  if (isSpecialistOrCompany(inviterType) && isSpecialistOrCompany(recipientType)) {
    return "recipient_recommends";
  }
  return "neutral";
}

/** Names are never declined: a noun carries the case, the name stays as the sender wrote it. */
function quotedName(name: string): string {
  return /[«»"„“”]/.test(name) ? name : `«${name}»`;
}

function inviterPhrases(name: string, inviterType: PartnerTypeCode) {
  if (inviterType === "STORE") {
    return { accusative: `магазин ${quotedName(name)}`, genitive: `магазина ${quotedName(name)}` };
  }
  if (inviterType === "COMPANY") {
    return { accusative: `компанию ${quotedName(name)}`, genitive: `компании ${quotedName(name)}` };
  }
  return { accusative: "партнёра", genitive: "партнёра" };
}

export function buildInviteLandingCopy(
  preview: LinkInvitePublicPreview,
  viewer: InviteViewer = null,
): InviteLandingCopy {
  const name = inviterDisplayName(preview);
  const inviterType = preview.inviter?.partnerType ?? null;
  const intendedType = preview.intendedPartnerType ?? null;
  const { agentRecipient } = resolveInviteRecipient(intendedType, viewer);
  const direction = resolveInviteDirection(inviterType, intendedType, viewer);
  const phrases = inviterPhrases(name, inviterType);
  const city = preview.inviter?.city?.trim() || "";
  const senderLine =
    [INVITER_TYPE_LABEL[inviterType ?? ""], city].filter(Boolean).join(" · ") || null;

  const base = {
    direction,
    agentRecipient,
    kicker: "Личное приглашение",
    headline: `${name} приглашает вас в партнёры`,
    senderLine,
    flowTitle: "Как это работает",
    termsColumn: "Общий процент",
    noteCaption: `Сообщение от ${phrases.genitive}`,
    stepsTitle: "Как стать партнёром",
  };
  const firstSteps: [InviteStep, InviteStep] = [
    { title: "Войдите или зарегистрируйтесь", hint: "Вернётесь на эту страницу." },
    { title: "Примите условия", hint: "Одна кнопка — и вы партнёры." },
  ];

  if (direction === "neutral") {
    return {
      ...base,
      lead: "Рекомендуйте клиентов друг другу: клиент получает скидку, а тот, кто его привёл, — вознаграждение с покупки.",
      flow: [
        "Партнёр выдаёт клиенту сертификат на скидку",
        "Клиент покупает со скидкой",
        "Тот, кто привёл клиента, получает вознаграждение",
      ],
      termsTitle: "Условия предложения",
      percentExplainer:
        "Общий процент — это скидка клиенту и вознаграждение за рекомендацию вместе.",
      mutual: null,
      steps: [
        ...firstSteps,
        { title: "Откройте раздел «Партнёры»", hint: "Там условия и следующие шаги." },
      ],
    };
  }

  return {
    ...base,
    lead: `Рекомендуйте ${phrases.accusative} своим клиентам и получайте вознаграждение с их покупок.`,
    flow: [
      "Выдаёте клиенту сертификат на скидку",
      `Клиент покупает у ${phrases.genitive}`,
      "Вы получаете вознаграждение",
    ],
    termsTitle: `Условия ${phrases.genitive}`,
    percentExplainer: "Общий процент — это скидка клиенту и ваше вознаграждение вместе.",
    mutual: agentRecipient
      ? null
      : {
          title: "Можно в обе стороны",
          text: `${name} тоже сможет приводить клиентов вам. Предложите свой процент на ваши товары и услуги — и рекомендации станут взаимными.`,
        },
    steps: [
      ...firstSteps,
      agentRecipient
        ? { title: "Выдайте первый сертификат", hint: "Вознаграждение увидите в кошельке." }
        : {
            title: "Предложите свои условия",
            hint: `Тогда ${name} сможет рекомендовать и вас. По желанию — в разделе «Партнёры».`,
          },
    ],
  };
}

export const INVITE_GUEST_FINE_PRINT =
  "Регистрация — ещё не согласие. Условия вы принимаете отдельно.";

export const INVITE_ACCEPT_FINE_PRINT = "Условия зафиксированы в этом приглашении.";

export type DiscussionInviteCopy = {
  fromAgent: boolean;
  kicker: string;
  headline: string;
  senderLine: string | null;
  lead: string;
  flowTitle: string;
  flow: [string, string, string];
  stepsTitle: string;
  steps: [InviteStep, InviteStep, InviteStep];
  finePrint: string;
  joinedTitle: string;
  joinedLead: string;
};

/**
 * Discussion links carry no percents. Only an agent sender has a fixed mechanic
 * (the agent recommends, the recipient sells); other senders get neutral wording.
 */
export function buildDiscussionInviteCopy(input: {
  inviter?: { displayName?: string | null; partnerType?: string | null; city?: string | null; isAgent?: boolean };
}): DiscussionInviteCopy {
  const name = input.inviter?.displayName?.trim() || "Партнёр RemCard";
  const fromAgent = input.inviter?.isAgent === true;
  const city = input.inviter?.city?.trim() || "";
  const typeLabel = fromAgent ? "Агент" : INVITER_TYPE_LABEL[input.inviter?.partnerType ?? ""];
  const senderLine = [typeLabel, city].filter(Boolean).join(" · ") || null;
  const firstStep: InviteStep = {
    title: "Войдите или зарегистрируйтесь",
    hint: "Вернётесь на эту страницу.",
  };
  const joinStep: InviteStep = {
    title: "Присоединитесь к обсуждению",
    hint: "Это ещё не согласие на условия.",
  };

  if (fromAgent) {
    return {
      fromAgent,
      kicker: "Личное приглашение",
      headline: `${name} хочет приводить вам клиентов`,
      senderLine,
      lead: "Агент рекомендует ваши товары и услуги клиентам. Вы платите процент только с покупок, которые состоялись.",
      flowTitle: "Как это работает",
      flow: [
        `${name} выдаёт клиенту сертификат`,
        "Клиент покупает у вас со скидкой",
        "Вы платите процент с покупки",
      ],
      stepsTitle: "Как стать партнёром",
      steps: [
        firstStep,
        joinStep,
        { title: "Согласуйте процент", hint: `Предложите свой — и ${name} начнёт приводить клиентов.` },
      ],
      finePrint: "Процент пока не согласован: его предлагаете вы.",
      joinedTitle: "Вы в обсуждении",
      joinedLead: `Осталось согласовать процент — и ${name} начнёт приводить клиентов.`,
    };
  }

  return {
    fromAgent,
    kicker: "Личное приглашение",
    headline: `${name} приглашает обсудить сотрудничество`,
    senderLine,
    lead: "Рекомендуйте клиентов друг другу: клиент получает скидку, а тот, кто его привёл, — вознаграждение с покупки.",
    flowTitle: "Как это работает",
    flow: [
      "Партнёр выдаёт клиенту сертификат на скидку",
      "Клиент покупает со скидкой",
      "Тот, кто привёл клиента, получает вознаграждение",
    ],
    stepsTitle: "Как стать партнёром",
    steps: [
      firstStep,
      joinStep,
      { title: "Согласуйте условия", hint: "Проценты обсуждаются отдельно, в разделе «Партнёры»." },
    ],
    finePrint: "Проценты пока не согласованы: присоединение ни к чему не обязывает.",
    joinedTitle: "Вы в обсуждении",
    joinedLead: "Осталось согласовать условия — после этого сотрудничество начнётся.",
  };
}

/** Advisory registration choice; never changes an existing account's role. */
export function inviteRegistrationHref(intendedType: PartnerTypeCode, returnTo: string): string {
  const roles: Record<string, string> = {
    AGENT: "agent", MASTER: "specialist", STORE: "store", COMPANY: "company",
  };
  const role = roles[intendedType ?? ""];
  if (!role) return `/login?returnTo=${encodeURIComponent(returnTo)}`;
  return `/join?${new URLSearchParams({ role, returnTo }).toString()}`;
}

export function buildInviteShareMessageBody(options: {
  inviterName: string;
  inviterType?: PartnerTypeCode;
  intendedType?: PartnerTypeCode;
}): string {
  const name = options.inviterName.trim() || "нами";
  const audience = resolveInviteAudience(
    options.inviterType ?? null,
    options.intendedType ?? null,
  );

  let text = `Приглашаем вас к сотрудничеству с ${name} в RemCard PROF. По ссылке — предложение и условия. Посмотрите их и, если вам подходит, присоединяйтесь.`;

  if (audience === "master") {
    text += `\n\nКлиенты получают скидку по вашей рекомендации, вы — вознаграждение на согласованных условиях.`;
  } else if (audience === "store") {
    text += `\n\nПокупки по рекомендациям специалистов — на согласованных условиях, с прозрачной историей в кабинете.`;
  }

  return text;
}

export function buildInviteShareMessage(options: {
  inviterName: string;
  url: string;
  inviterType?: PartnerTypeCode;
  intendedType?: PartnerTypeCode;
}): string {
  const url = options.url.trim();
  return `${buildInviteShareMessageBody(options)}\n\n${url}`;
}

export function buildInviteLinkMetadata(input: {
  preview: Pick<LinkInvitePublicPreview, "status" | "inviter" | "intendedPartnerType"> | null;
  pageUrl: string;
  ogImageUrl: string;
  kind?: "terms" | "discussion";
}): Metadata {
  const { pageUrl, ogImageUrl } = input;
  const preview = input.preview;

  const origin = new URL(pageUrl).origin;
  const base: Metadata = {
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    metadataBase: new URL(origin),
  };

  if (!preview) {
    const inactive = INACTIVE_METADATA.ERROR;
    return {
      ...base,
      title: `${inactive.title} · ${SITE_NAME}`,
      description: inactive.description,
      openGraph: buildOpenGraph({
        title: inactive.title,
        description: inactive.description,
        pageUrl,
        ogImageUrl,
      }),
      twitter: buildTwitter({ title: inactive.title, description: inactive.description, ogImageUrl }),
    };
  }

  if (preview.status !== "PENDING") {
    const inactive = INACTIVE_METADATA[preview.status] ?? INACTIVE_METADATA.NOT_FOUND;
    return {
      ...base,
      title: `${inactive.title} · ${SITE_NAME}`,
      description: inactive.description,
      openGraph: buildOpenGraph({
        title: inactive.title,
        description: inactive.description,
        pageUrl,
        ogImageUrl,
      }),
      twitter: buildTwitter({ title: inactive.title, description: inactive.description, ogImageUrl }),
    };
  }

  const name = inviterDisplayName(preview);
  const title = `${name} приглашает вас к сотрудничеству`;
  const description = input.kind === "discussion" ? NEUTRAL_OG_DESCRIPTION : inviteOgDescription(
    preview.inviter?.partnerType ?? null,
    preview.intendedPartnerType ?? null,
  );

  return {
    ...base,
    title: `${title} · ${SITE_NAME}`,
    description,
    openGraph: buildOpenGraph({ title, description, pageUrl, ogImageUrl }),
    twitter: buildTwitter({ title, description, ogImageUrl }),
  };
}

function buildOpenGraph(input: {
  title: string;
  description: string;
  pageUrl: string;
  ogImageUrl: string;
}): NonNullable<Metadata["openGraph"]> {
  return {
    title: input.title,
    description: input.description,
    url: input.pageUrl,
    siteName: SITE_NAME,
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: input.ogImageUrl,
        width: 1200,
        height: 630,
        alt: "RemCard PROF — приглашение к сотрудничеству",
      },
    ],
  };
}

function buildTwitter(input: {
  title: string;
  description: string;
  ogImageUrl: string;
}): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
    images: [input.ogImageUrl],
  };
}

export function inviteOpenGraphImageUrl(appOrigin: string): string {
  const base = appOrigin.replace(/\/+$/, "");
  return `${base}/invite/opengraph-image`;
}
