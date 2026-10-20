import type { PartnerSearchResult } from "@/lib/types";

export type DiscussionInviteContextDto = {
  id: string;
  recipientLabel: string;
  cooperationSubject: string;
  status: string;
  role: "author" | "participant";
  counterpartyUserId: string;
  counterpartyDisplayName: string;
  counterpartyCity: string | null;
  counterpartyPartnerType: string | null;
  canProposeTerms: boolean;
};

export function discussionContextToInviteTarget(
  ctx: DiscussionInviteContextDto,
): PartnerSearchResult | null {
  if (!ctx.canProposeTerms || !ctx.counterpartyUserId) return null;
  return {
    id: ctx.counterpartyUserId,
    displayName: ctx.counterpartyDisplayName,
    city: ctx.counterpartyCity,
    photoUrl: null,
    description: null,
    specializations: [],
    badges: [],
    storeCategories: [],
    partnerType: ctx.counterpartyPartnerType,
    organizationName: null,
    organizationLogoUrl: null,
    branches: [],
    rating: null,
    ratingCount: 0,
    partnershipStatus: null,
  };
}
