export type PartnerOverviewCounts = {
  active: number;
  decisions: number;
  outgoing: number;
};

export type PartnersEmptyPresentation = {
  collectionIsEmpty: boolean;
  greetingVariant: "true-empty" | "history";
  hasArchivedOrHiddenActive: boolean;
};

export function isOverviewCurrentEmpty(counts: PartnerOverviewCounts): boolean {
  return counts.active === 0 && counts.decisions === 0 && counts.outgoing === 0;
}

export function shouldShowApprovedPartnersGreeting(input: {
  loading: boolean;
  error: string;
  listReady: boolean;
  counts: PartnerOverviewCounts;
}): boolean {
  return (
    input.listReady &&
    !input.loading &&
    !input.error &&
    isOverviewCurrentEmpty(input.counts)
  );
}

/** Keep legacy overview chrome visible — do not bounce to greeting-only. */
export function shouldPinOverviewLegacyChrome(input: {
  bulkOutcomePresent: boolean;
  selectedPartnerCount: number;
  listArchiveView: "active" | "archive" | "hidden";
  listFiltersEngaged: boolean;
  termsDeepLinkId: string | null;
  termsDeepLinkResolving: boolean;
  lifecycleConfirmOpen: boolean;
  termEditingActive: boolean;
}): boolean {
  if (input.bulkOutcomePresent) return true;
  if (input.selectedPartnerCount > 0) return true;
  if (input.listArchiveView !== "active") return true;
  if (input.listFiltersEngaged) return true;
  if (input.termsDeepLinkId) return true;
  if (input.termsDeepLinkResolving) return true;
  if (input.lifecycleConfirmOpen) return true;
  if (input.termEditingActive) return true;
  return false;
}

export function resolvePartnersEmptyPresentation(input: {
  partnerships: Array<{
    status: string;
    listPreference?: { archivedAt?: string | null; hiddenAt?: string | null } | null;
  }>;
  isActiveSegment: (status: string) => boolean;
}): PartnersEmptyPresentation {
  const { partnerships, isActiveSegment } = input;
  if (partnerships.length === 0) {
    return {
      collectionIsEmpty: true,
      greetingVariant: "true-empty",
      hasArchivedOrHiddenActive: false,
    };
  }
  const hasArchivedOrHiddenActive = partnerships.some(
    (p) =>
      isActiveSegment(p.status) &&
      Boolean(p.listPreference?.archivedAt || p.listPreference?.hiddenAt),
  );
  return {
    collectionIsEmpty: false,
    greetingVariant: "history",
    hasArchivedOrHiddenActive,
  };
}

export const OVERVIEW_LEGACY_DISCLOSURE_PANEL_ID = "partners-overview-legacy-panel";

/** Validates list payload shape without treating a missing field as proven empty. */
export function parsePartnershipListPayload(data: unknown):
  | { ok: true; partnerships: unknown[] }
  | { ok: false } {
  if (data === null || typeof data !== "object") return { ok: false };
  const partnerships = (data as { partnerships?: unknown }).partnerships;
  if (!Array.isArray(partnerships)) return { ok: false };
  return { ok: true, partnerships };
}
