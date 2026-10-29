import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";
import {
  profileUserToPartnerSide,
  resolveInviteTradeSideCategories,
  searchResultToPartnerSide,
  tradeSideTermCategories,
} from "@/lib/partnership-rules";
import { categoryLabel } from "@/lib/partnership-labels";
import type {
  PartnerCertProgramItem,
  PartnerCertProgramState,
} from "@/lib/partner-certificate-program";
import type { PartnerPublishedTerm, PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import type { InviteWizardCategory } from "./invite-wizard-state";

export type PublishedTermsLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; items: PartnerPublishedTerm[] }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "unavailable"; message: string };

export type PublishedInviteTermsPlan = {
  agentOneWay: boolean;
  /** Mutual recommendations by default for store/company/specialist. */
  mutualDefault: boolean;
  requestTerms: boolean;
  categories: InviteWizardCategory[];
  blockedReason?: string;
  /** poolPercent disclaimer for UI */
  poolPercentDisclaimer: string;
};

export const POOL_PERCENT_DISCLAIMER =
  "Общий процент: скидка клиенту + бонус агенту. Не гарантированный доход.";

/**
 * Map certificate-program items (poolPercent) into published term rows.
 * poolPercent is the general pool — not a guaranteed bonus and not an arbitrary storePercent invent.
 */
export function certProgramItemsToPublishedTerms(
  items: PartnerCertProgramItem[],
): PartnerPublishedTerm[] {
  return items.map((item) => ({
    category: item.category,
    categoryLabel: item.categoryLabel,
    poolPercent: item.poolPercent,
    storePercent: item.poolPercent,
  }));
}

export function publishedTermsFromCertState(
  state: PartnerCertProgramState,
): PublishedTermsLoadState {
  if (state.status === "loading") return { status: "loading" };
  if (state.status === "error") return { status: "error", message: state.message };
  if (state.status === "empty") return { status: "empty" };
  return {
    status: "loaded",
    items: certProgramItemsToPublishedTerms(state.items),
  };
}

export function publishedTermsFromSearchResult(
  target: PartnerSearchResult,
): PartnerPublishedTerm[] | null {
  if (!Array.isArray(target.publishedTerms)) return null;
  return target.publishedTerms.filter(
    (row) =>
      row &&
      !row.isExcluded &&
      typeof row.category === "string" &&
      typeof row.poolPercent === "number",
  );
}

/**
 * Build invite term plan from real published categories/percents only.
 * Prefer search DTO publishedTerms; callers should merge certificate-program when DTO empty/loading.
 */
export function planPublishedInviteTerms(
  meProfile: ProProfileResponse,
  target: PartnerSearchResult,
  publishedOverride?: PartnerPublishedTerm[] | null,
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
      poolPercentDisclaimer: POOL_PERCENT_DISCLAIMER,
    };
  }

  const published =
    publishedOverride ?? publishedTermsFromSearchResult(target) ?? [];
  const publishedByCategory = new Map(
    published.map((row) => [row.category, row] as const),
  );

  const categoryIds = resolved.categories.length
    ? resolved.categories
    : published.length
      ? published.map((p) => p.category)
      : tradeSideTermCategories(targetSide);

  if (categoryIds.length === 0 && published.length === 0) {
    return {
      agentOneWay,
      mutualDefault,
      requestTerms: true,
      categories: [],
      poolPercentDisclaimer: POOL_PERCENT_DISCLAIMER,
    };
  }

  const ids = categoryIds.length ? categoryIds : published.map((p) => p.category);

  const categories: InviteWizardCategory[] = ids.map((id) => {
    const row = publishedByCategory.get(id);
    const percent =
      row != null
        ? typeof row.storePercent === "number"
          ? row.storePercent
          : row.poolPercent
        : null;
    return {
      category: id,
      categoryLabel: row?.categoryLabel?.trim() || categoryLabel(id),
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
    poolPercentDisclaimer: POOL_PERCENT_DISCLAIMER,
  };
}
