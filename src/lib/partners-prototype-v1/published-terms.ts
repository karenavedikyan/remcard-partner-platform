import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";
import {
  profileUserToPartnerSide,
  resolveInviteTradeSideCategories,
  searchResultToPartnerSide,
  tradeSideTermCategories,
} from "@/lib/partnership-rules";
import { categoryLabel } from "@/lib/partnership-labels";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import type { InviteWizardCategory } from "./invite-wizard-state";

export type PublishedInviteTermsPlan = {
  agentOneWay: boolean;
  /** Mutual recommendations by default for store/company/specialist. */
  mutualDefault: boolean;
  requestTerms: boolean;
  categories: InviteWizardCategory[];
  blockedReason?: string;
};

/**
 * Build invite term plan from real published categories only.
 * Never invent percents/bonus. No published terms → honest requestTerms.
 */
export function planPublishedInviteTerms(
  meProfile: ProProfileResponse,
  target: PartnerSearchResult,
): PublishedInviteTermsPlan {
  const inviter = profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const targetSide = searchResultToPartnerSide(target);
  const agentOneWay = isAgentCooperationInviter(inviter);
  const mutualDefault = !agentOneWay;

  const resolved = resolveInviteTradeSideCategories(inviter, targetSide);
  if (resolved.blockedReason) {
    return {
      agentOneWay,
      mutualDefault,
      requestTerms: true,
      categories: [],
      blockedReason: resolved.blockedReason,
    };
  }

  const categoryIds = resolved.categories.length
    ? resolved.categories
    : tradeSideTermCategories(targetSide);

  if (categoryIds.length === 0) {
    return {
      agentOneWay,
      mutualDefault,
      requestTerms: true,
      categories: [],
    };
  }

  // Percents: only when target exposes them on search card terms-like fields.
  // PartnerSearchResult currently has categories but not published percents —
  // treat as requestTerms for numeric rates while still listing real categories.
  const publishedPercents = extractPublishedPercents(target);

  const categories: InviteWizardCategory[] = categoryIds.map((id) => {
    const percent = publishedPercents[id];
    return {
      category: id,
      categoryLabel: categoryLabel(id),
      storePercent: typeof percent === "number" ? percent : null,
      selected: true,
    };
  });

  const anyPercent = categories.some((c) => c.storePercent != null);

  return {
    agentOneWay,
    mutualDefault,
    requestTerms: !anyPercent,
    categories,
  };
}

/** Optional extension fields if search DTO ever includes published terms. */
function extractPublishedPercents(target: PartnerSearchResult): Record<string, number> {
  const raw = (target as PartnerSearchResult & {
    publishedTerms?: Array<{ category: string; storePercent: number; isExcluded?: boolean }>;
    generalTerms?: Array<{ category: string; storePercent: number; isExcluded?: boolean }>;
  }).publishedTerms ??
    (target as PartnerSearchResult & {
      generalTerms?: Array<{ category: string; storePercent: number; isExcluded?: boolean }>;
    }).generalTerms;
  if (!Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const row of raw) {
    if (!row || row.isExcluded) continue;
    if (typeof row.category === "string" && typeof row.storePercent === "number") {
      out[row.category] = row.storePercent;
    }
  }
  return out;
}

export const PUBLISHED_PERCENTS_GAP =
  "PartnerSearchResult does not expose published per-category percents. Wizard lists real category IDs from trade-side resolution and marks requestTerms until search/profile DTO includes publishedTerms.";
