import type { CertificatePolicyCategoryRate, CertificatePolicyTerms } from "./types";

/** Full IEEE-754 string — must match navigator JSON canonicalization (no toFixed rounding). */
export function formatPoolPercentForFingerprint(poolPercent: number): string {
  if (!Number.isFinite(poolPercent)) return "NaN";
  return String(poolPercent);
}

/** Client-side preview fingerprint only; server `categoryRatesRevision` is authoritative for OCC. */
export function certificatePolicyCategoryRatesFingerprint(
  rates: CertificatePolicyCategoryRate[],
): string {
  const sorted = [...rates].sort((a, b) => a.category.localeCompare(b.category));
  const payload = sorted
    .map((r) => `${r.category}:${formatPoolPercentForFingerprint(r.poolPercent)}`)
    .join("|");
  return payload;
}

export function certificatePolicyGeneralOcc(input: {
  version: number;
  categoryRatesRevision?: string | null;
}): { expectedVersion: number; categoryRatesRevision: string | null } {
  return {
    expectedVersion: input.version,
    categoryRatesRevision: input.categoryRatesRevision ?? null,
  };
}

export function certificatePolicyIndividualOcc(input: {
  generalVersion: number;
  individualVersion: number;
  /** General pool revision (general doc OCC). */
  categoryRatesRevision?: string | null;
  /** Per-counterparty canonical pool revision from workspace counterparty row. */
  counterpartyCategoryRatesRevision?: string | null;
}): {
  expectedVersion: number;
  expectedIndividualVersion: number;
  categoryRatesRevision: string | null;
  counterpartyCategoryRatesRevision: string | null;
} {
  return {
    expectedVersion: input.generalVersion,
    expectedIndividualVersion: input.individualVersion,
    categoryRatesRevision: input.categoryRatesRevision ?? null,
    counterpartyCategoryRatesRevision: input.counterpartyCategoryRatesRevision ?? null,
  };
}

export function certificatePolicyProposalOcc(input: {
  proposalId: string;
  proposalVersion: number;
}): { proposalId: string; expectedProposalVersion: number } {
  return {
    proposalId: input.proposalId,
    expectedProposalVersion: input.proposalVersion,
  };
}

export function buildPatchBodyFingerprint(terms: CertificatePolicyTerms): string {
  return `${terms.validityDays}:${terms.purchaseLimit}:${certificatePolicyCategoryRatesFingerprint(
    terms.categoryRates,
  )}`;
}