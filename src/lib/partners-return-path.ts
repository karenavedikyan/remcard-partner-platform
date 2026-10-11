const PARTNERS_BASE = "/partners";

/** Preserve partnership deep-link query for login returnTo (PartnersHub reads `terms`). */
export function partnersPageReturnPath(
  searchParams: { terms?: string; partnershipId?: string } | null | undefined,
): string {
  const terms = searchParams?.terms?.trim() || searchParams?.partnershipId?.trim();
  if (!terms) return PARTNERS_BASE;
  return `${PARTNERS_BASE}?terms=${encodeURIComponent(terms)}`;
}
