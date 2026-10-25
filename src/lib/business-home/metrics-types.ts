export type BusinessHomeMetricSlice =
  | { state: "loading" }
  | { state: "ok"; value: number }
  | { state: "empty" }
  | { state: "error"; message: string }
  | { state: "unavailable"; message: string }
  | { state: "needs_branch"; message: string }
  | { state: "invalid_branch"; message: string };

export type BusinessHomeMetricsResponse = {
  partnerType: "STORE" | "COMPANY";
  activeBranchLabel: string | null;
  selectedBranchId?: string | null;
  metrics: {
    primary: Exclude<BusinessHomeMetricSlice, { state: "loading" }>;
    secondary: Exclude<BusinessHomeMetricSlice, { state: "loading" }>;
    tertiary: Exclude<BusinessHomeMetricSlice, { state: "loading" }>;
  };
};

export const initialBusinessHomeMetricSlices: [
  BusinessHomeMetricSlice,
  BusinessHomeMetricSlice,
  BusinessHomeMetricSlice,
] = [{ state: "loading" }, { state: "loading" }, { state: "loading" }];

export function metricCountLabel(slice: BusinessHomeMetricSlice): string {
  if (slice.state === "loading") return "…";
  if (slice.state === "error" || slice.state === "unavailable") return "—";
  if (slice.state === "needs_branch" || slice.state === "invalid_branch") return "—";
  if (slice.state === "empty") return "0";
  return String(slice.value);
}

export function metricHintForStorePrimary(
  slice: BusinessHomeMetricSlice,
  activeBranchLabel: string | null,
): string {
  if (slice.state === "needs_branch" || slice.state === "invalid_branch") return slice.message;
  return activeBranchLabel?.trim() ? activeBranchLabel : "Текущий филиал";
}

export function partnersCountFromSlice(slice: BusinessHomeMetricSlice): number | null {
  if (slice.state === "ok") return slice.value;
  if (slice.state === "empty") return 0;
  return null;
}

/** Store tertiary: actor-attributed orders today (MSK), not a full operations journal. */
export function metricHintForStoreTertiary(slice: BusinessHomeMetricSlice): string {
  if (slice.state === "unavailable") return slice.message;
  if (slice.state === "error") return slice.message;
  return "Заказы, где вы указаны продавцом (сегодня, МСК)";
}
