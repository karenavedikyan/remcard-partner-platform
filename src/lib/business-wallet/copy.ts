import type { BusinessClientsPartnerType } from "@/lib/business-clients/gate";

export function businessWalletPageCopy(partnerType: BusinessClientsPartnerType) {
  const eyebrow = partnerType === "STORE" ? "Магазин" : "Компания";
  return {
    eyebrow,
    title: "Кошелёк",
    description:
      "Взаиморасчёты с партнёрами в обоих направлениях, реквизиты для выплат и фиксация уже произведённых выплат.",
    payableSummaryLabel: "К выплате партнёрам",
    payableDirectionLabel: "К выплате партнёрам",
    payableHint: "Мы должны партнёрам по подтверждённым покупкам.",
  };
}
