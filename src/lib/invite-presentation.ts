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

export type InviteHeroContent = {
  headline: string;
  lead: string;
  bullets: string[];
  audienceLabel: string | null;
};

export function buildInviteHeroContent(preview: LinkInvitePublicPreview): InviteHeroContent {
  const name = inviterDisplayName(preview);
  const inviterType = preview.inviter?.partnerType ?? null;
  const intendedType = preview.intendedPartnerType ?? null;
  const audience = resolveInviteAudience(inviterType, intendedType);
  const audienceLabel = formatInviteAudienceLabel(intendedType, inviterType);

  const headline = `Сотрудничайте с ${name} через RemCard PROF`;

  if (audience === "master") {
    return {
      headline,
      audienceLabel,
      lead:
        "Помогайте клиентам выбирать товары для ремонта и получайте вознаграждение за покупки по вашим рекомендациям. Условия сотрудничества и начисления будут доступны в личном кабинете.",
      bullets: [
        "Для клиента — скидка по вашей рекомендации",
        "Для вас — вознаграждение на согласованных условиях",
        "Для обеих сторон — история покупок и взаиморасчёты",
      ],
    };
  }

  if (audience === "store") {
    return {
      headline,
      audienceLabel,
      lead:
        "Принимайте покупки по рекомендациям специалистов на условиях, зафиксированных в этом предложении. Скидки для клиентов и расчёты — в RemCard PROF.",
      bullets: [
        "Для клиента — скидка по рекомендации специалиста",
        "Для магазина — продажи на согласованных условиях",
        "Для обеих сторон — история покупок и взаиморасчёты",
      ],
    };
  }

  return {
    headline,
    audienceLabel,
    lead:
      "Предложение о партнёрстве в RemCard PROF. Условия зафиксированы отправителем и будут доступны в личном кабинете после регистрации.",
    bullets: [
      "Прозрачные условия по категориям",
      "Единая история покупок и расчётов",
      "Подтверждение сотрудничества — отдельным шагом после проверки профиля",
    ],
  };
}

export const INVITE_PERCENT_EXPLAINER =
  "Общий процент распределяется между скидкой клиенту и вознаграждением рекомендателю. Это не размер вашей выплаты целиком.";

export const INVITE_GUEST_DISCLAIMER =
  "Регистрация не означает принятие условий. После входа заполните обязательные данные профиля и явно подтвердите сотрудничество на этой странице.";

export const INVITE_MODERATION_NOTE =
  "Завершите обязательные данные профиля в кабинете (имя, город, тип партнёра). Публикация в каталоге для принятия частного приглашения не требуется.";

export function buildInviteShareMessage(options: {
  inviterName: string;
  url: string;
  inviterType?: PartnerTypeCode;
  intendedType?: PartnerTypeCode;
}): string {
  const name = options.inviterName.trim() || "нами";
  const url = options.url.trim();
  const audience = resolveInviteAudience(
    options.inviterType ?? null,
    options.intendedType ?? null,
  );

  let text = `Приглашаем вас к сотрудничеству с ${name} в RemCard PROF. По ссылке — предложение и условия. Посмотрите их и, если вам подходит, присоединяйтесь: ${url}`;

  if (audience === "master") {
    text += `\n\nКлиенты получают скидку по вашей рекомендации, вы — вознаграждение на согласованных условиях.`;
  } else if (audience === "store") {
    text += `\n\nПокупки по рекомендациям специалистов — на согласованных условиях, с прозрачной историей в кабинете.`;
  }

  return text;
}

export function buildInviteLinkMetadata(input: {
  preview: LinkInvitePublicPreview | null;
  pageUrl: string;
  ogImageUrl: string;
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
      twitter: buildTwitter({ title: inactive.title, description: inactive.description }),
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
      twitter: buildTwitter({ title: inactive.title, description: inactive.description }),
    };
  }

  const name = inviterDisplayName(preview);
  const title = `${name} приглашает вас к сотрудничеству`;
  const description = inviteOgDescription(
    preview.inviter?.partnerType ?? null,
    preview.intendedPartnerType ?? null,
  );

  return {
    ...base,
    title: `${title} · ${SITE_NAME}`,
    description,
    openGraph: buildOpenGraph({ title, description, pageUrl, ogImageUrl }),
    twitter: buildTwitter({ title, description }),
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
}): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
  };
}

export function inviteOpenGraphImageUrl(appOrigin: string): string {
  const base = appOrigin.replace(/\/+$/, "");
  return `${base}/invite/opengraph-image`;
}
