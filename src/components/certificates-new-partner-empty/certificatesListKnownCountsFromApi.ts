/** Raw list totals from a successful certificates list response (not display-normalized meta). */
export type CertificatesListKnownCounts = {
  activeCount: 0;
  archivedCount: 0;
  totalCount: 0;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Parses proof that the API returned an empty workspace with explicit zero totals.
 * Returns null when counts are missing, malformed, non-zero, or certificates is not an array.
 */
export function certificatesListKnownCountsFromApi(data: {
  certificates?: unknown;
  activeCount?: unknown;
  archivedCount?: unknown;
  totalCount?: unknown;
}): CertificatesListKnownCounts | null {
  if (!Array.isArray(data.certificates)) {
    return null;
  }
  if (data.certificates.length > 0) {
    return null;
  }
  const { activeCount, archivedCount, totalCount } = data;
  if (!isFiniteNumber(activeCount) || activeCount !== 0) {
    return null;
  }
  if (!isFiniteNumber(archivedCount) || archivedCount !== 0) {
    return null;
  }
  if (!isFiniteNumber(totalCount) || totalCount !== 0) {
    return null;
  }
  return { activeCount: 0, archivedCount: 0, totalCount: 0 };
}
