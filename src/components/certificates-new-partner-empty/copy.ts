import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import {
  ONBOARDING_PARTNER_FIRST_HINT,
  onboardingStepAccessibleName,
  resolveOnboardingHistoryLinkAction,
} from "@/lib/onboarding-step/read-only-history";

export type CertificatesEmptyCopyOptions = {
  canLinkReadOnlyHistory?: boolean;
};

export type CertificatesNewPartnerRole = "agent" | "specialist" | "store" | "company";

export type CertificatesEmptyStep = {
  icon: string;
  title: string;
  note: string;
  action: OnboardingStepAction;
};

export type CertificatesEmptyCopy = {
  icon: string;
  kicker: string;
  title: string;
  lead: string;
  steps: CertificatesEmptyStep[];
  primary: { label: string; action: CertificatesEmptyAction };
  secondary?: { label: string; action: CertificatesEmptyAction };
};

export type CertificatesEmptyAction =
  | { kind: "create" }
  | { kind: "scan" }
  | { kind: "partners" }
  | { kind: "profile" };

const AGENT_HOME: CertificatesEmptyCopy = {
  icon: "ticket",
  kicker: "Первый шаг",
  title: "Первый сертификат — за минуту",
  lead: "Рекомендуйте партнёра клиенту и получайте бонус с его покупок.",
  steps: [
    {
      icon: "user",
      title: "Заполните профиль",
      note: "Имя и контакты видят партнёры",
      action: { kind: "link", href: "/profile?section=basics" },
    },
    {
      icon: "handshake",
      title: "Найдите партнёров",
      note: "Магазины и специалисты вашего города",
      action: { kind: "link", href: "/partners" },
    },
    {
      icon: "ticket",
      title: "Создайте сертификат",
      note: "Отправьте клиенту ссылку",
      action: {
        kind: "button",
        handler: "onCreateCertificate",
        noteHint: ONBOARDING_PARTNER_FIRST_HINT,
        accessibleName: onboardingStepAccessibleName(
          "Создайте сертификат",
          `Отправьте клиенту ссылку. ${ONBOARDING_PARTNER_FIRST_HINT}`,
        ),
      },
    },
  ],
  primary: { label: "Создать сертификат", action: { kind: "create" } },
  secondary: { label: "Найти партнёра", action: { kind: "partners" } },
};

const RECOMMENDATIONS_ISSUER: CertificatesEmptyCopy = {
  icon: "ticket",
  kicker: "Пока пусто",
  title: "Сертификат — ваша рекомендация",
  lead: "Партнёр, клиент и условия в одной ссылке. Бонус — вам.",
  steps: [
    {
      icon: "handshake",
      title: "Выберите партнёра",
      note: "С согласованными условиями",
      action: {
        kind: "link",
        href: "/partners",
        noteHint: ONBOARDING_PARTNER_FIRST_HINT,
        accessibleName: onboardingStepAccessibleName(
          "Выберите партнёра",
          `С согласованными условиями. ${ONBOARDING_PARTNER_FIRST_HINT}`,
        ),
      },
    },
    {
      icon: "user",
      title: "Укажите клиента",
      note: "Имя и телефон",
      action: {
        kind: "button",
        handler: "onCreateCertificate",
        noteHint: "В мастере создания, после партнёра",
        accessibleName: onboardingStepAccessibleName(
          "Укажите клиента",
          "Имя и телефон. В мастере создания, после партнёра",
        ),
      },
    },
    {
      icon: "share",
      title: "Отправьте ссылку",
      note: "Клиент покажет её при покупке",
      action: {
        kind: "button",
        handler: "onCreateCertificate",
        noteHint: "Ссылка появится в мастере создания",
        accessibleName: onboardingStepAccessibleName(
          "Отправьте ссылку",
          "Клиент покажет её при покупке. Ссылка появится в мастере создания",
        ),
      },
    },
  ],
  primary: { label: "Создать сертификат", action: { kind: "create" } },
};

function recommendationsSellerCopy(
  canLinkReadOnlyHistory?: boolean,
): CertificatesEmptyCopy {
  return {
    icon: "ticket",
    kicker: "Пока пусто",
    title: "Сертификаты ваших клиентов",
    lead: "Те, с которыми клиенты пришли к вам, и те, что выдали вы.",
    steps: [
      {
        icon: "scan",
        title: "Клиент пришёл с сертификатом",
        note: "Проверьте до продажи",
        action: { kind: "link", href: "/scanner" },
      },
      {
        icon: "check",
        title: "Продажа подтверждена",
        note: "Бонус начислен партнёру",
        action: resolveOnboardingHistoryLinkAction(
          "Продажа подтверждена",
          "Бонус начислен партнёру",
          canLinkReadOnlyHistory,
        ),
      },
      {
        icon: "ticket",
        title: "Рекомендуйте сами",
        note: "Выдавайте сертификаты на других партнёров",
        action: {
          kind: "button",
          handler: "onCreateCertificate",
          noteHint: ONBOARDING_PARTNER_FIRST_HINT,
          accessibleName: onboardingStepAccessibleName(
            "Рекомендуйте сами",
            `Выдавайте сертификаты на других партнёров. ${ONBOARDING_PARTNER_FIRST_HINT}`,
          ),
        },
      },
    ],
    primary: { label: "Проверить сертификат", action: { kind: "scan" } },
    secondary: { label: "Создать сертификат", action: { kind: "create" } },
  };
}

export function certificatesNewPartnerEmptyCopy(
  role: CertificatesNewPartnerRole,
  options?: CertificatesEmptyCopyOptions,
): CertificatesEmptyCopy {
  switch (role) {
    case "agent":
      return AGENT_HOME;
    case "specialist":
      return RECOMMENDATIONS_ISSUER;
    case "store":
    case "company":
      return recommendationsSellerCopy(options?.canLinkReadOnlyHistory);
    default:
      return RECOMMENDATIONS_ISSUER;
  }
}
