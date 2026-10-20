import { fetchRemcardUpstream } from "@/lib/remcard-server";

/** Bounded wait for SSR metadata; failures must not break /invite pages. */
export const LINK_INVITE_PUBLIC_PREVIEW_TIMEOUT_MS = 5_000;

/** Test seam only — production code always uses fetchRemcardUpstream. */
export const linkInvitePublicPreviewDeps = {
  fetchUpstream: fetchRemcardUpstream,
};

export type LinkInvitePublicTerm = {
  category: string;
  categoryLabel: string;
  storePercent: number;
  isExcluded: boolean;
};

export type LinkInvitePublicPreview = {
  status: string;
  inviter?: {
    displayName: string;
    partnerType: string | null;
    city: string | null;
  };
  intendedPartnerType?: string | null;
  terms?: LinkInvitePublicTerm[];
  note?: string | null;
  expiresAt?: string;
};

function isTermRecord(term: unknown): term is Record<string, unknown> {
  return typeof term === "object" && term !== null && !Array.isArray(term);
}

/** Non-excluded row with a category id and finite storePercent (0% is valid). */
export function isValidLinkInviteParticipatingTerm(term: unknown): term is LinkInvitePublicTerm {
  if (!isTermRecord(term)) return false;
  if (term.isExcluded === true) return false;
  const category = term.category;
  if (typeof category !== "string" || !category.trim()) return false;
  const storePercent = term.storePercent;
  if (typeof storePercent !== "number" || !Number.isFinite(storePercent)) return false;
  return true;
}

/**
 * Accept only when every participating row matches the public preview contract
 * and at least one participating row exists. Unknown non-object entries (null, strings, …)
 * fail the whole preview; explicitly excluded object rows are ignored.
 */
export function linkInvitePreviewHasAcceptableTerms(
  preview: Pick<LinkInvitePublicPreview, "terms">,
): boolean {
  if (!Array.isArray(preview.terms)) return false;
  let hasValidParticipating = false;
  for (const term of preview.terms) {
    if (!isTermRecord(term)) return false;
    if (term.isExcluded === true) continue;
    if (!isValidLinkInviteParticipatingTerm(term)) return false;
    hasValidParticipating = true;
  }
  return hasValidParticipating;
}

/** Safe rows for terms table (skips malformed entries). */
export function linkInvitePreviewParticipatingRowsForDisplay(
  terms: LinkInvitePublicPreview["terms"],
): LinkInvitePublicTerm[] {
  if (!Array.isArray(terms)) return [];
  return terms.filter(isValidLinkInviteParticipatingTerm);
}

/** Safe excluded category labels for footer copy. */
export function linkInvitePreviewExcludedLabelsForDisplay(
  terms: LinkInvitePublicPreview["terms"],
): Array<{ category: string; categoryLabel: string }> {
  if (!Array.isArray(terms)) return [];
  const out: Array<{ category: string; categoryLabel: string }> = [];
  for (const raw of terms) {
    if (!isTermRecord(raw) || raw.isExcluded !== true) continue;
    const category = typeof raw.category === "string" ? raw.category : "";
    if (!category.trim()) continue;
    const categoryLabel =
      typeof raw.categoryLabel === "string" && raw.categoryLabel.trim()
        ? raw.categoryLabel
        : category;
    out.push({ category, categoryLabel });
  }
  return out;
}

export const LINK_INVITE_TERMS_UNAVAILABLE_MESSAGE =
  "Условия предложения недоступны. Принять предложение сейчас нельзя.";

export async function fetchPublicLinkInvitePreview(
  token: string,
): Promise<LinkInvitePublicPreview | null> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { status: "NOT_FOUND" };
  }

  try {
    const result = await linkInvitePublicPreviewDeps.fetchUpstream<LinkInvitePublicPreview>(
      `/api/partnership/link-invite/public/${encodeURIComponent(trimmed)}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(LINK_INVITE_PUBLIC_PREVIEW_TIMEOUT_MS),
      },
    );

    if (!result.ok) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}
