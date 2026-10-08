import type { Partnership, TermChangeRequest } from "@/lib/types";

export function partnershipCounterparty(
  partnership: Partnership,
  meId: string,
): { id: string; displayName: string } {
  const isStoreSide = partnership.storeUserId === meId;
  const partner = isStoreSide ? partnership.proUser : partnership.storeUser;
  const displayName =
    partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
  return { id: partner.id, displayName };
}

export type TermChangePendingCopy = {
  heading: string;
  hint: string;
  canRespond: boolean;
};

export function describePendingTermChange(
  request: TermChangeRequest,
  partnership: Partnership,
  meId: string,
): TermChangePendingCopy {
  const counterparty = partnershipCounterparty(partnership, meId);
  if (request.requestedBy === meId) {
    return {
      heading: "Вы предложили изменение условий",
      hint: `Ожидаем решения ${counterparty.displayName}.`,
      canRespond: false,
    };
  }
  return {
    heading: `${counterparty.displayName} предлагает изменить условия`,
    hint: "Проверьте предложенные проценты и ответьте.",
    canRespond: true,
  };
}
