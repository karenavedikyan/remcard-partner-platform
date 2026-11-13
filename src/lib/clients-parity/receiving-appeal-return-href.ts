/**
 * Canonical receiving return path (Root/P4 contract). P1 mirror — do not import P4
 * receiving-appeal-navigation.ts into committed source.
 */
export function receivingAppealReturnHref(appealId: string): string {
  const params = new URLSearchParams({
    direction: "receiving",
    appealId,
  });
  return `/clients?${params.toString()}`;
}

/** Safe appeal id from purchase-detail ?appealId=…; rejects external/arbitrary return targets. */
export function parseReceivingAppealReturnId(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (/[:/?#]/.test(trimmed) || trimmed.includes("..")) return null;
  if (!/^[\w-]+$/.test(trimmed)) return null;
  if (trimmed === "batch" || trimmed === "working-stages" || trimmed === "certificate-entry") {
    return null;
  }
  return trimmed;
}
