import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import {
  effectiveWorkingProductIds,
  effectiveWorkingServiceIds,
  effectiveWorkingStageIds,
} from "@/lib/profile-draft-sync";
import { catalogPublicNameFromGetUser } from "@/lib/specialist-r06/catalog-display-name";
import { catalogTouchedFromProfile } from "@/lib/profile-catalog-touched";

export type CatalogPrefillField =
  | "catalogPublicName"
  | "catalogCity"
  | "specializations"
  | "storeCategories"
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
  const org = profile.organization;
  return JSON.stringify({
    catalogDisplayName: u.catalogDisplayName ?? "",
    catalogDisplayNameSource: u.catalogDisplayNameSource ?? "live_public",
    catalogDraftPending: u.catalogDraftPending ?? false,
    catalogTouched: catalogTouchedFromProfile(profile),
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
    products: effectiveWorkingProductIds(w),
    stages: effectiveWorkingStageIds(w),
    organizationName: org?.name ?? "",
    organizationWebsite: org?.website ?? "",
    organizationTelegram: org?.telegram ?? "",
    organizationStoreCategories: org?.storeCategories ?? [],
  });
}

/**
 * Allowlist seed from persisted working profile (GET /api/pro/profile), never login/bank fields.
 * Prototype: catalog-prefill.js profileCatalogSeed + publicPhone/publicEmail fallbacks.
 */
export function workingProfileCatalogSeed(profile: ProProfileResponse): Partial<ProfileDraft> {
  const w = profile.workingProfile;
  const u = profile.user;
  const publicName = catalogPublicNameFromGetUser(u);
  const org = profile.organization;
  const orgName = org?.name?.trim();
  const catalogPublicName = orgName || publicName;
  const catalogOnOrg = Boolean(org && (u.partnerType === "STORE" || u.partnerType === "COMPANY"));
  const city = (u.catalogCity ?? u.city ?? "").trim();
  const partnershipPhone = (w?.partnershipContactPhone ?? "").trim();
  const partnershipEmail = (w?.partnershipContactEmail ?? "").trim();
  const publicPhone = (u.publicPhone ?? "").trim() || partnershipPhone;
  const publicEmail = (u.publicEmail ?? "").trim() || partnershipEmail;
  return {
    catalogPublicName,
    catalogCity: city,
    storeCategories: [...effectiveWorkingProductIds(w)],
    specializations: [...effectiveWorkingServiceIds(w)],
    navigatorStageIds: [...effectiveWorkingStageIds(w)],
    description: (u.description ?? "").trim(),
    catalogImageUrl: (u.photoUrl ?? "").trim(),
    website: (catalogOnOrg ? (org?.website ?? "") : (u.website ?? "")).trim(),
    telegram: (catalogOnOrg ? (org?.telegram ?? "") : (u.telegram ?? "")).trim(),
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

  if (
    !touched.specializations &&
    (current.specializations?.length ?? 0) === 0 &&
    seed.specializations?.length
  ) {
    next.specializations = [...seed.specializations];
  }
  if (
    !touched.storeCategories &&
    (current.storeCategories?.length ?? 0) === 0 &&
    seed.storeCategories?.length
  ) {
    next.storeCategories = [...seed.storeCategories];
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
