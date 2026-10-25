import type { BusinessClientsPartnerType } from "./gate";

export function businessClientsPageCopy(partnerType: BusinessClientsPartnerType) {
  const eyebrow = partnerType === "STORE" ? "Магазин" : "Компания";
  return {
    eyebrow,
    title: "Клиенты",
    description:
      "Собственные записи о клиентах вашей организации. Контакты не передаются автоматически в RemCard.",
  };
}
