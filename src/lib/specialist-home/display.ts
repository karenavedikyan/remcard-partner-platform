/**
 * Presentation-only helpers for specialist home stat values.
 * Does not alter formatMoneyRub or API semantics.
 */

/** Split a formatted ruble string into wrap-safe groups (thousands / currency). */
export function formattedMoneyWrapGroups(formatted: string): string[] | null {
  const trimmed = formatted.trim();
  if (!trimmed.endsWith("₽")) {
    return null;
  }
  const body = trimmed.slice(0, -1).trim();
  if (!body) {
    return null;
  }
  const parts = body.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  return [...parts, "₽"];
}
