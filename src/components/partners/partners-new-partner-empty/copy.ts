import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";

export type PartnersNewPartnerEmptyRole = "agent" | "specialist" | "store" | "company";

export type PartnersNewPartnerEmptyStep = {
  icon: "search" | "link" | "percent";
  title: string;
  note: string;
};

export type PartnersNewPartnerEmptyCopy = {
  kicker: string;
  title: string;
  lead: string;
  steps: PartnersNewPartnerEmptyStep[];
  primaryLabel: string;
  secondaryLabel: string;
};

/** Maps supported cabinet audiences to prototype role keys (copy("partners", role)). */
export function resolvePartnersNewPartnerEmptyRole(
  audience: PartnersHubAudience | undefined,
): PartnersNewPartnerEmptyRole | null {
  switch (audience) {
    case "agent-r04":
      return "agent";
    case "specialist-r04":
      return "specialist";
    case "business-store-r04":
      return "store";
    case "business-company-r04":
      return "company";
    default:
      return null;
  }
}

function isSellerRole(role: PartnersNewPartnerEmptyRole): boolean {
  return role === "store" || role === "company";
}

export function partnersNewPartnerEmptyCopy(
  role: PartnersNewPartnerEmptyRole,
): PartnersNewPartnerEmptyCopy {
  const seller = isSellerRole(role);
  if (seller) {
    return {
      kicker: "Пока пусто",
      title: "Партнёры приведут клиентов",
      lead: "Агенты и специалисты рекомендуют вас — вы подтверждаете покупки.",
      steps: [
        {
          icon: "search",
          title: "Найдите в RemCard",
          note: "По категориям и городу",
        },
        {
          icon: "link",
          title: "Или пригласите по ссылке",
          note: "Если партнёра ещё нет в системе",
        },
        {
          icon: "percent",
          title: "Согласуйте условия",
          note: "Скидка и бонус по каждой категории",
        },
      ],
      primaryLabel: "Найти партнёра",
      secondaryLabel: "Пригласить по ссылке",
    };
  }

  return {
    kicker: "Пока пусто",
    title: "Соберите сеть партнёров",
    lead: "Чем больше партнёров — тем больше поводов для сертификата.",
    steps: [
      {
        icon: "search",
        title: "Найдите в RemCard",
        note: "Магазины и специалисты по категориям",
      },
      {
        icon: "link",
        title: "Или пригласите по ссылке",
        note: "Если партнёра ещё нет в системе",
      },
      {
        icon: "percent",
        title: "Согласуйте условия",
        note: "Скидка и бонус по каждой категории",
      },
    ],
    primaryLabel: "Найти партнёра",
    secondaryLabel: "Пригласить по ссылке",
  };
}

export const PARTNERS_NEW_PARTNER_EMPTY_FOOT =
  "Раздел заполнится сам, когда появятся первые данные.";

export const PARTNERS_NEW_PARTNER_EMPTY_HISTORY_KICKER = "Сеть партнёров";

/** Non-empty collection, zero overview groups — no false “first data” or ended-row history promise. */
export const PARTNERS_NEW_PARTNER_EMPTY_HISTORY_FOOT =
  "Архив, скрытые записи и фильтры списка — в блоке ниже.";

export const PARTNERS_NEW_PARTNER_EMPTY_HISTORY_FOOT_ARCHIVED_HIDDEN =
  "Партнёры в архиве или скрытые из списка остаются вашими партнёрами — условия по ним действуют. Откройте список ниже, чтобы посмотреть записи и управлять ими.";
