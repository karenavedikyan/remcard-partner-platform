import type { ProProfileResponse } from "@/lib/types";

/** Org public catalog stages for owner editor (draft key wins over live). */
export function orgCatalogNavigatorStageIdsFromProfile(
  profile: ProProfileResponse,
): string[] {
  const draft = profile.organization?.catalogDraft;
  if (draft && typeof draft === "object" && !Array.isArray(draft)) {
    if (Object.prototype.hasOwnProperty.call(draft, "navigatorStageIds")) {
      const stages = (draft as { navigatorStageIds?: unknown }).navigatorStageIds;
      if (Array.isArray(stages)) {
        return stages.filter((x): x is string => typeof x === "string");
      }
      return [];
    }
  }
  const raw = profile.organization?.publicNavigatorStageIds;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export function orgCatalogNavigatorStageIdsLiveFromProfile(
  profile: ProProfileResponse,
): string[] {
  const live = profile.organization?.catalogNavigatorStageIdsLive;
  if (Array.isArray(live)) {
    return live.filter((x): x is string => typeof x === "string");
  }
  return [];
}
