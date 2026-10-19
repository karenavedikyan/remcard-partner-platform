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
  | "telegram"
  | "catalogImageUrl";

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

/** Stable key for saved working profile inputs (not in-progress wizard draft). */
export function catalogPrefillSourceKey(profile: ProProfileResponse): string {
  const w = profile.workingProfile;
  const u = profile.user;
  return JSON.stringify({
    displayName: u.displayName ?? "",
    catalogCity: u.catalogCity ?? "",
    city: u.city ?? "",
    description: u.description ?? "",
    photoUrl: u.photoUrl ?? "",
    website: u.website ?? "",
    telegram: u.telegram ?? "",
    publicPhone: u.publicPhone ?? "",
    publicEmail: u.publicEmail ?? "",
    partnershipContactPhone: w?.partnershipContactPhone ?? "",
    partnershipContactEmail: w?.partnershipContactEmail ?? "",
    services: effectiveWorkingServiceIds(w),
    stages: effectiveWorkingStageIds(w),
  });
}

/**
 * Allowlist seed from persisted working profile (GET /api/pro/profile), never login/bank fields.
 * Prototype: catalog-prefill.js profileCatalogSeed + publicPhone/publicEmail fallbacks.
 */
export function workingProfileCatalogSeed(profile: ProProfileResponse): Partial<ProfileDraft> {
  const w = profile.workingProfile;
  const u = profile.user;
  const publicName = (u.catalogDisplayName ?? u.displayName ?? "").trim();
  const city = (u.catalogCity ?? u.city ?? "").trim();
  const partnershipPhone = (w?.partnershipContactPhone ?? "").trim();
  const partnershipEmail = (w?.partnershipContactEmail ?? "").trim();
  const publicPhone = (u.publicPhone ?? "").trim() || partnershipPhone;
  const publicEmail = (u.publicEmail ?? "").trim() || partnershipEmail;
  return {
    catalogPublicName: publicName,
    catalogCity: city,
    specializations: [...effectiveWorkingServiceIds(w)],
    navigatorStageIds: [...effectiveWorkingStageIds(w)],
    description: (u.description ?? "").trim(),
    catalogImageUrl: (u.photoUrl ?? "").trim(),
    website: (u.website ?? "").trim(),
    telegram: (u.telegram ?? "").trim(),
    publicPhone,
    publicEmail,
  };
}

export function mergeCatalogPrefill(
  current: ProfileDraft,
  seed: Partial<ProfileDraft>,
  touched: CatalogTouchedMap,
): ProfileDraft {
  const next = { ...current };
  const applyText = (
    field:
      | "catalogPublicName"
      | "catalogCity"
      | "description"
      | "publicPhone"
      | "publicEmail"
      | "website"
      | "telegram"
      | "catalogImageUrl",
  ) => {
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
  applyText("catalogImageUrl");

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
