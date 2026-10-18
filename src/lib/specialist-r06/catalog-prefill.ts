import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { effectiveWorkingServiceIds, effectiveWorkingStageIds } from "@/lib/profile-draft-sync";

export type CatalogPrefillField =
  | "catalogPublicName"
  | "catalogCity"
  | "specializations"
  | "navigatorStageIds"
  | "description"
  | "publicPhone"
  | "publicEmail"
  | "website"
  | "telegram";

export type CatalogTouchedMap = Partial<Record<CatalogPrefillField, boolean>>;

export function parseCatalogTouched(raw: unknown): CatalogTouchedMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: CatalogTouchedMap = {};
  for (const key of Object.keys(src) as CatalogPrefillField[]) {
    if (src[key] === true) out[key] = true;
  }
  return out;
}

/** Allowlist seed from saved working profile — never login/partnership-only fields. */
export function workingProfileCatalogSeed(profile: ProProfileResponse): Partial<ProfileDraft> {
  const w = profile.workingProfile;
  const u = profile.user;
  const name = (u.displayName ?? "").trim();
  const city = (u.catalogCity ?? u.city ?? "").trim();
  return {
    catalogPublicName: name,
    catalogCity: city,
    specializations: [...effectiveWorkingServiceIds(w)],
    navigatorStageIds: [...effectiveWorkingStageIds(w)],
  };
}

export function mergeCatalogPrefill(
  current: ProfileDraft,
  seed: Partial<ProfileDraft>,
  touched: CatalogTouchedMap,
): ProfileDraft {
  const next = { ...current };
  const applyText = (field: "catalogPublicName" | "catalogCity" | "description" | "publicPhone" | "publicEmail" | "website" | "telegram") => {
    if (touched[field]) return;
    const value = seed[field];
    if (typeof value === "string" && value.trim() && !String(current[field] ?? "").trim()) {
      next[field] = value.trim();
    }
  };
  applyText("catalogPublicName");
  applyText("catalogCity");
  applyText("description");
  applyText("publicPhone");
  applyText("publicEmail");
  applyText("website");
  applyText("telegram");

  if (!touched.specializations && (current.specializations?.length ?? 0) === 0 && seed.specializations?.length) {
    next.specializations = [...seed.specializations];
  }
  if (!touched.navigatorStageIds && (current.navigatorStageIds?.length ?? 0) === 0 && seed.navigatorStageIds?.length) {
    next.navigatorStageIds = [...seed.navigatorStageIds];
  }
  return next;
}

export function markCatalogFieldTouched(
  touched: CatalogTouchedMap,
  field: CatalogPrefillField,
): CatalogTouchedMap {
  return { ...touched, [field]: true };
}
