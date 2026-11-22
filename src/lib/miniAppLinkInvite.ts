import type { PartnerSideProfile } from "@/lib/partnership-rules";

export type InviterBusinessSideDto = {
  principalUserId: string;
  partnerType: string | null;
  storeCategories: string[];
  specializations: string[];
  tradeTermCategories: string[];
};

export function partnerSideFromInviterBusinessSide(dto: InviterBusinessSideDto): PartnerSideProfile {
  const partnerType = dto.partnerType?.trim() || null;
  return {
    id: dto.principalUserId,
    partnerType,
    partnerActivities:
      partnerType === "STORE"
        ? ["STORE"]
        : partnerType === "COMPANY"
          ? ["COMPANY"]
          : partnerType
            ? [partnerType]
            : [],
    storeCategories: [...(dto.storeCategories ?? [])],
    specializations: [...(dto.specializations ?? [])],
    isStoreOwner: partnerType === "STORE",
  };
}

export const MINI_INTENDED_OPTIONS = [
  { value: "AGENT", label: "Агент" },
  { value: "MASTER", label: "Специалист" },
  { value: "STORE", label: "Магазин" },
  { value: "COMPANY", label: "Компания" },
] as const;

export type MiniIntendedType = "" | "AGENT" | "MASTER" | "STORE" | "COMPANY";

export function inviteWizardTemplate(kind: string, recipientName: string) {
  const name = recipientName.trim();
  if (kind === "business") {
    return `Здравствуйте, ${name}! Предлагаем сотрудничество в RemCard: рекомендовать наши товары и услуги клиентам и развивать партнёрство. Посмотрите условия по ссылке и примите приглашение, если они вам подходят.`;
  }
  if (kind === "friendly") {
    return `Привет, ${name}! Давайте помогать друг другу находить новых клиентов. Приглашаю в RemCard: по ссылке можно посмотреть условия и принять приглашение.`;
  }
  return `Здравствуйте, ${name}! Давайте рекомендовать товары и услуги друг друга и привлекать новых клиентов. Приглашаю к сотрудничеству в RemCard.`;
}