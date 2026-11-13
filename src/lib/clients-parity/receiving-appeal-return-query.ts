/** P1: validate ?appealId= on purchase detail — no arbitrary return targets. */

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
