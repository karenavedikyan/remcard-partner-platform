import type { ProProfileResponse } from "@/lib/types";

/** Catalog renovation stages from GET /api/pro/profile (effective draft overlay). */
export function catalogNavigatorStageIdsFromUser(
  user: ProProfileResponse["user"],
): string[] {
  const raw = user.catalogDraft as Record<string, unknown> | null | undefined;
  const stages = raw?.navigatorStageIds;
  if (!Array.isArray(stages)) return [];
  return stages.filter((x): x is string => typeof x === "string");
}

export function catalogTouchedFromUser(
  user: ProProfileResponse["user"],
): Record<string, boolean> {
  const raw = user.catalogDraft as Record<string, unknown> | null | undefined;
  const touched = raw?.catalogTouched;
  if (!touched || typeof touched !== "object" || Array.isArray(touched)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(touched)) {
    if (v === true) out[k] = true;
  }
  return out;
}
