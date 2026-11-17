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

/** Subtitle of the receiving clients list: the store wording is only for a store, everyone else gets the neutral one. */
export const CLIENTS_RECEIVING_LIST_SUBTITLE = "Покупатели вашего магазина и история их обращений.";
export const CLIENTS_RECEIVING_LIST_SUBTITLE_NEUTRAL = "Ваши клиенты и история их обращений.";
export const CLIENTS_AT_PARTNERS_LIST_SUBTITLE =
  "Направленные клиенты и этапы их обращений у принимающих партнёров.";

export function clientsListPageCopy(input: {
  mode: "agent" | "specialist" | "business";
  partnerType?: BusinessClientsPartnerType;
  direction: "incoming" | "at-partners";
}): { eyebrow: string; title: string; description: string } {
  if (input.mode === "agent") {
    return { eyebrow: "Агент", title: "Мои клиенты у партнёров", description: CLIENTS_AT_PARTNERS_LIST_SUBTITLE };
  }
  const eyebrow =
    input.mode === "specialist" ? "Специалист" : input.partnerType === "STORE" ? "Магазин" : "Компания";
  if (input.direction === "at-partners") {
    return { eyebrow, title: "Мои клиенты у партнёров", description: CLIENTS_AT_PARTNERS_LIST_SUBTITLE };
  }
  const isStore = input.mode === "business" && input.partnerType === "STORE";
  return {
    eyebrow,
    title: "Клиенты",
    description: isStore ? CLIENTS_RECEIVING_LIST_SUBTITLE : CLIENTS_RECEIVING_LIST_SUBTITLE_NEUTRAL,
  };
}
