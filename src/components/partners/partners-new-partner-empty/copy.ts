import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import {
  ONBOARDING_PARTNER_FIRST_HINT,
  onboardingStepAccessibleName,
} from "@/lib/onboarding-step/read-only-history";

export type PartnersNewPartnerEmptyRole = "agent" | "specialist" | "store" | "company";

export type PartnersNewPartnerEmptyStep = {
  icon: "search" | "link" | "percent";
  title: string;
  note: string;
  action: OnboardingStepAction;
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

const PARTNER_TERMS_STEP_ACTION: OnboardingStepAction = {
  kind: "button",
  handler: "openFind",
  noteHint: ONBOARDING_PARTNER_FIRST_HINT,
  accessibleName: onboardingStepAccessibleName(
    "Согласуйте условия",
    `Скидка и бонус по каждой категории. ${ONBOARDING_PARTNER_FIRST_HINT}`,
  ),
};

const PARTNER_ONBOARDING_STEPS: PartnersNewPartnerEmptyStep[] = [
  {
    icon: "search",
    title: "Найдите в RemCard",
    note: "По категориям и городу",
    action: { kind: "button", handler: "openFind" },
  },
  {
    icon: "link",
    title: "Или пригласите по ссылке",
    note: "Если партнёра ещё нет в системе",
    action: { kind: "button", handler: "openLink" },
  },
  {
    icon: "percent",
    title: "Согласуйте условия",
    note: "Скидка и бонус по каждой категории",
    action: PARTNER_TERMS_STEP_ACTION,
  },
];

const PARTNER_ONBOARDING_STEPS_ISSUER: PartnersNewPartnerEmptyStep[] = [
  {
    icon: "search",
    title: "Найдите в RemCard",
    note: "Магазины и специалисты по категориям",
    action: { kind: "button", handler: "openFind" },
  },
  {
    icon: "link",
    title: "Или пригласите по ссылке",
    note: "Если партнёра ещё нет в системе",
    action: { kind: "button", handler: "openLink" },
  },
  {
    icon: "percent",
    title: "Согласуйте условия",
    note: "Скидка и бонус по каждой категории",
    action: PARTNER_TERMS_STEP_ACTION,
  },
];

export function partnersNewPartnerEmptyCopy(
  role: PartnersNewPartnerEmptyRole,
): PartnersNewPartnerEmptyCopy {
  const seller = isSellerRole(role);
  if (seller) {
    return {
      kicker: "Пока пусто",
      title: "Партнёры приведут клиентов",
      lead: "Агенты и специалисты рекомендуют вас — вы подтверждаете покупки.",
      steps: PARTNER_ONBOARDING_STEPS,
      primaryLabel: "Найти партнёра",
      secondaryLabel: "Пригласить по ссылке",
    };
  }

  return {
    kicker: "Пока пусто",
    title: "Соберите сеть партнёров",
    lead: "Чем больше партнёров — тем больше поводов для сертификата.",
    steps: PARTNER_ONBOARDING_STEPS_ISSUER,
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
