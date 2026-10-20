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
  counterpartyStoreCategories?: string[];
  counterpartySpecializations?: string[];
  counterpartyOrganizationName?: string | null;
  counterpartyOrganizationLogoUrl?: string | null;
  counterpartyOrganizationPartnerType?: string | null;
  counterpartyPhotoUrl?: string | null;
  counterpartyBadges?: string[];
  counterpartyBranches?: { address: string; city: string }[];
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
    photoUrl: ctx.counterpartyPhotoUrl ?? null,
    description: null,
    specializations: ctx.counterpartySpecializations ?? [],
    badges: ctx.counterpartyBadges ?? [],
    storeCategories: ctx.counterpartyStoreCategories ?? [],
    partnerType: ctx.counterpartyPartnerType,
    organizationName: ctx.counterpartyOrganizationName ?? null,
    organizationLogoUrl: ctx.counterpartyOrganizationLogoUrl ?? null,
    organizationPartnerType: ctx.counterpartyOrganizationPartnerType ?? null,
    branches: ctx.counterpartyBranches ?? [],
    rating: null,
    ratingCount: 0,
    partnershipStatus: null,
  };
}
