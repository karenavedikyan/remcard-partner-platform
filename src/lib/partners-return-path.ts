const PARTNERS_BASE = "/partners";

/** Preserve supported partners deep links through login. */
export function partnersPageReturnPath(
  searchParams: { terms?: string; partnershipId?: string; invites?: string } | null | undefined,
): string {
  const terms = typeof searchParams?.terms === "string" ? searchParams.terms.trim() : "";
  const legacy = typeof searchParams?.partnershipId === "string" ? searchParams.partnershipId.trim() : "";
  if (terms || legacy) return `${PARTNERS_BASE}?terms=${encodeURIComponent(terms || legacy)}`;
  return searchParams?.invites === "1" ? `${PARTNERS_BASE}?invites=1` : PARTNERS_BASE;
}
