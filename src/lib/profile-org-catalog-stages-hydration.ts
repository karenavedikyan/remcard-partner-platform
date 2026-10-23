import type { ProProfileResponse } from "@/lib/types";

/** Org public catalog stages from GET /api/pro/profile (catalogDraft overlay). */
export function orgCatalogNavigatorStageIdsFromProfile(
  profile: ProProfileResponse,
): string[] {
  const raw = profile.organization?.publicNavigatorStageIds;
  if (!Array.isArray(raw)) {
    const draft = profile.organization?.catalogDraft;
    if (draft && typeof draft === "object" && !Array.isArray(draft)) {
      const stages = (draft as { navigatorStageIds?: unknown }).navigatorStageIds;
      if (Array.isArray(stages)) {
        return stages.filter((x): x is string => typeof x === "string");
      }
    }
    return [];
  }
  return raw.filter((x): x is string => typeof x === "string");
}
