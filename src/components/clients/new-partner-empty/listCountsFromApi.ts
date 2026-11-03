/** Coerce list totals only when API sent finite numbers (never treat missing as zero). */
export function listCountsFromApi(data: {
  activeCount?: unknown;
  archivedCount?: unknown;
}): { active: number; archived: number } | null {
  if (typeof data.activeCount !== "number" || !Number.isFinite(data.activeCount)) {
    return null;
  }
  if (typeof data.archivedCount !== "number" || !Number.isFinite(data.archivedCount)) {
    return null;
  }
  return { active: data.activeCount, archived: data.archivedCount };
}
