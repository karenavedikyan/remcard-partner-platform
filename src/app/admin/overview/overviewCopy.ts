const RAW_PERIOD_TOKENS = new Set(["1d", "7d", "30d"]);

/** Drop API period tokens duplicated by visible period controls / subtitles. */
export function overviewPartnerRegistrationNote(
  selectedPeriodLabel: string | null | undefined,
  periodId: "1d" | "7d" | "30d",
): string {
  const raw = selectedPeriodLabel?.trim() ?? "";
  if (!raw) return "";
  if (RAW_PERIOD_TOKENS.has(raw) || raw === periodId) return "";
  return raw;
}
