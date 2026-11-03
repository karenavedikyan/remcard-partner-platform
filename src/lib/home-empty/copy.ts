import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import {
  ONBOARDING_PARTNER_FIRST_HINT,
  onboardingStepAccessibleName,
} from "@/lib/onboarding-step/read-only-history";

export type HomeEmptyRole = "specialist" | "store" | "company";

export type HomeEmptyIconName =
  | "sparkles"
  | "store"
  | "building"
  | "user"
  | "handshake"
  | "ticket"
  | "percent"
  | "scan"
  | "mapPin"
  | "users";

export type HomeEmptyStep = {
  icon: HomeEmptyIconName;
  title: string;
  note: string;
  action: OnboardingStepAction;
};

export type HomeEmptyCopy = {
  icon: HomeEmptyIconName;
  kicker: string;
  title: string;
  lead: string;
  steps: HomeEmptyStep[];
  primaryCta: { label: string; href: string; testId: string };
  secondaryCta?: { label: string; href: string; testId: string };
};

export function homeEmptyCopy(role: HomeEmptyRole): HomeEmptyCopy {
  switch (role) {
    case "specialist":
      return {
        icon: "sparkles",
        kicker: "Первый шаг",
        title: "Начните с профиля и партнёров",
        lead: "Клиент покупает у вашего партнёра — бонус получаете вы.",
        steps: [
          {
            icon: "user",
            title: "Профиль и направления",
            note: "Чем занимаетесь и где",
            action: { kind: "link", href: "/profile?section=basics" },
          },
          {
            icon: "handshake",
            title: "Партнёры",
            note: "Магазины и коллеги с условиями для вас",
            action: { kind: "link", href: "/partners" },
          },
          {
            icon: "ticket",
            title: "Сертификат клиенту",
            note: "Ссылка — и клиент идёт к партнёру",
            action: {
              kind: "link",
              href: "/recommendations/new",
              noteHint: ONBOARDING_PARTNER_FIRST_HINT,
              accessibleName: onboardingStepAccessibleName(
                "Сертификат клиенту",
                `Ссылка — и клиент идёт к партнёру. ${ONBOARDING_PARTNER_FIRST_HINT}`,
              ),
            },
          },
        ],
        primaryCta: {
          label: "Заполнить профиль",
          href: "/profile",
          testId: "es-nav-profile",
        },
        secondaryCta: {
          label: "Найти партнёра",
          href: "/partners",
          testId: "es-nav-partners",
        },
      };
    case "store":
      return {
        icon: "store",
        kicker: "Первый шаг",
        title: "Подготовьте магазин к первым клиентам",
        lead: "Партнёры направляют к вам клиентов с сертификатами — вы подтверждаете покупку.",
        steps: [
          {
            icon: "percent",
            title: "Профиль и условия",
            note: "Категории, скидка и бонус",
            action: { kind: "link", href: "/profile?section=basics" },
          },
          {
            icon: "handshake",
            title: "Партнёры",
            note: "Агенты и специалисты, которые рекомендуют вас",
            action: { kind: "link", href: "/partners" },
          },
          {
            icon: "scan",
            title: "Проверка на кассе",
            note: "Сканируйте сертификат при покупке",
            action: { kind: "link", href: "/scanner" },
          },
        ],
        primaryCta: {
          label: "Заполнить профиль",
          href: "/profile",
          testId: "es-nav-profile",
        },
        secondaryCta: {
          label: "Найти партнёра",
          href: "/partners",
          testId: "es-nav-partners",
        },
      };
    case "company":
      return {
        icon: "building",
        kicker: "Первый шаг",
        title: "Настройте компанию за три шага",
        lead: "Филиалы, сотрудники и партнёры — в одном кабинете.",
        steps: [
          {
            icon: "mapPin",
            title: "Профиль и филиалы",
            note: "Адреса и направления",
            action: { kind: "link", href: "/profile?section=branches" },
          },
          {
            icon: "users",
            title: "Сотрудники и права",
            note: "Каждый видит только своё",
            action: { kind: "link", href: "/profile?section=team" },
          },
          {
            icon: "handshake",
            title: "Партнёры и условия",
            note: "Кто приводит клиентов и на каких условиях",
            action: { kind: "link", href: "/partners" },
          },
        ],
        primaryCta: {
          label: "Заполнить профиль",
          href: "/profile",
          testId: "es-nav-profile",
        },
        secondaryCta: {
          label: "Пригласить сотрудника",
          href: "/profile?section=team",
          testId: "es-nav-team",
        },
      };
  }
}
