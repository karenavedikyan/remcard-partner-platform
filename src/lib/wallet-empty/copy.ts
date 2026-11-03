import type { WalletEmptyAudienceRole, WalletEmptyCopy, WalletEmptyStepCopy } from "./types";

function step(
  icon: WalletEmptyStepCopy["icon"],
  title: string,
  note: string,
): WalletEmptyStepCopy {
  return { icon, title, note };
}

const SELLER_WALLET: WalletEmptyCopy = {
  kicker: "Пока пусто",
  title: "Кошелёк: кому и сколько",
  lead: "Начисления партнёрам и ваши выплаты — в одном месте.",
  steps: [
    step("bag", "Продажа по сертификату", "Бонус начислен партнёру"),
    step("clock", "Подтверждение", "В срок по категории или вручную"),
    step("check", "Выплата", "Фиксируете перевод — долг закрыт"),
  ],
  primaryCta: "Проверить сертификат",
  cardFootLabel: "начислений пока нет",
};

const EARNER_WALLET: WalletEmptyCopy = {
  kicker: "Пока пусто",
  title: "Здесь будут ваши начисления",
  lead: "Бонус появляется после покупки клиента по вашему сертификату.",
  steps: [
    step("bag", "Клиент покупает у партнёра", "По вашему сертификату"),
    step("clock", "Партнёр подтверждает", "Начисление «в ожидании»"),
    step("wallet", "Сумма в кошельке", "После подтверждения — к получению"),
  ],
  primaryCta: "Создать сертификат",
  cardFootLabel: "к получению",
};

export function walletEmptyCopy(role: WalletEmptyAudienceRole): WalletEmptyCopy {
  if (role === "store" || role === "company") return SELLER_WALLET;
  return EARNER_WALLET;
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
