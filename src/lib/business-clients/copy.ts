import type { BusinessClientsPartnerType } from "./gate";

export function businessClientsPageCopy(partnerType: BusinessClientsPartnerType) {
  const eyebrow = partnerType === "STORE" ? "Магазин" : "Компания";
  return {
    eyebrow,
    title: "Клиенты",
    description:
      "Собственные записи о клиентах вашей организации. Контакты хранятся в RemCard и не отправляются партнёрам автоматически.",
  };
}
