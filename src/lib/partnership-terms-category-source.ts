import type { User } from "@/lib/types";
import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";
import { tradeSideTermCategories } from "@/lib/partnership-rules";
import type { PartnerSideProfile } from "@/lib/partnership-rules";

export type PartnershipTermsCategoryUserSlice = Pick<
  User,
  | "partnerActivities"
  | "partnerType"
  | "role"
  | "isBlocked"
  | "storeCategories"
  | "specializations"
>;

function asPartnerSide(user: PartnershipTermsCategoryUserSlice): PartnerSideProfile {
  return {
    id: "",
    partnerType: user.partnerType,
    partnerActivities: user.partnerActivities,
    storeCategories: user.storeCategories ?? [],
    specializations: user.specializations ?? [],
  };
}

/**
 * Which participant supplies assortment categories for partnership terms.
 * Pure-agent ↔ business: business always, including legacy inverted storeUserId=agent rows.
 * Ordinary store/pro pairs: storeUser (unchanged).
 */
export function resolvePartnershipTermsCategoryUser<T extends PartnershipTermsCategoryUserSlice>(
  storeUser: T,
  proUser: T,
): T {
  if (isAgentCooperationInviter(storeUser) && !isAgentCooperationInviter(proUser)) {
    return proUser;
  }
  return storeUser;
}

/** Allowed term category ids for counter_offer / invite validation (no payload trust). */
export function partnershipAllowedTermCategories(
  storeUser: PartnershipTermsCategoryUserSlice,
  proUser: PartnershipTermsCategoryUserSlice,
): Set<string> {
  return new Set(
    tradeSideTermCategories(
      asPartnerSide(resolvePartnershipTermsCategoryUser(storeUser, proUser)),
    ),
  );
}