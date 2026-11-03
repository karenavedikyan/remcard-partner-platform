import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import { resolveOnboardingHistoryLinkAction } from "@/lib/onboarding-step/read-only-history";
import type { WalletEmptyAudienceRole, WalletEmptyCopy, WalletEmptyStepCopy } from "./types";

export type WalletEmptyCopyOptions = {
  canLinkReadOnlyHistory?: boolean;
};

function step(
  icon: WalletEmptyStepCopy["icon"],
  title: string,
  note: string,
  action: OnboardingStepAction,
): WalletEmptyStepCopy {
  return { icon, title, note, action };
}

function sellerWalletCopy(canLinkReadOnlyHistory?: boolean): WalletEmptyCopy {
  return {
    kicker: "Пока пусто",
    title: "Кошелёк: кому и сколько",
    lead: "Начисления партнёрам и ваши выплаты — в одном месте.",
    steps: [
      step("bag", "Продажа по сертификату", "Бонус начислен партнёру", {
        kind: "link",
        href: "/scanner",
      }),
      step(
        "clock",
        "Подтверждение",
        "В срок по категории или вручную",
        resolveOnboardingHistoryLinkAction(
          "Подтверждение",
          "В срок по категории или вручную",
          canLinkReadOnlyHistory,
        ),
      ),
      step(
        "check",
        "Выплата",
        "Фиксируете перевод — долг закрыт",
        resolveOnboardingHistoryLinkAction(
          "Выплата",
          "Фиксируете перевод — долг закрыт",
          canLinkReadOnlyHistory,
        ),
      ),
    ],
    primaryCta: "Проверить сертификат",
    cardFootLabel: "начислений пока нет",
  };
}

const EARNER_WALLET_STEPS = (
  primaryHref: string,
): WalletEmptyStepCopy[] => [
  step("bag", "Клиент покупает у партнёра", "По вашему сертификату", {
    kind: "link",
    href: primaryHref,
  }),
  step("clock", "Партнёр подтверждает", "Начисление «в ожидании»", {
    kind: "none",
    noteOverride:
      "Партнёр подтверждает продажу — бонус начисляется автоматически, без вашего действия",
  }),
  step("wallet", "Сумма в кошельке", "После подтверждения — к получению", {
    kind: "none",
    noteOverride: "Сумма появится здесь после подтверждения — открыть нечего",
  }),
];

export function walletEmptyCopy(
  role: WalletEmptyAudienceRole,
  options?: WalletEmptyCopyOptions,
): WalletEmptyCopy {
  if (role === "store" || role === "company") {
    return sellerWalletCopy(options?.canLinkReadOnlyHistory);
  }
  return {
    kicker: "Пока пусто",
    title: "Здесь будут ваши начисления",
    lead: "Бонус появляется после покупки клиента по вашему сертификату.",
    steps: EARNER_WALLET_STEPS(walletEmptyPrimaryHref(role)),
    primaryCta: "Создать сертификат",
    cardFootLabel: "к получению",
  };
}

export function walletEmptyPrimaryHref(role: WalletEmptyAudienceRole): string {
  if (role === "store" || role === "company") return "/scanner";
  if (role === "agent") return "/certificates/new";
  return "/recommendations/new";
}

export function walletEmptyAudienceFromPartnerType(
  partnerType: "STORE" | "COMPANY" | null | undefined,
): WalletEmptyAudienceRole {
  if (partnerType === "STORE") return "store";
  if (partnerType === "COMPANY") return "company";
  return "specialist";
}
