import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";

/** Working-profile fields derived from the last saved server profile (not in-form edits). */
/** Catalog-tab form slice (organization effective fields, no owner User bleed). */
export function catalogFormFieldsFromProfile(profile: ProProfileResponse): ProfileDraft {
  return profileDraftFromProfile(profile);
}

export function profileDraftFromProfile(profile: ProProfileResponse): ProfileDraft {
  const u = profile.user;
  const w = profile.workingProfile;
  const catalogOnOrg = profile.catalogPublication?.catalogEntity === "organization";
  const org = profile.organization;
  return {
    displayName: u.displayName ?? "",
    catalogPublicName: catalogOnOrg
      ? (org?.name ?? "")
      : (u.catalogDisplayName ?? u.displayName ?? ""),
    catalogCity: catalogOnOrg ? "" : (u.catalogCity ?? u.city ?? ""),
    showFullName: u.showFullName ?? false,
    catalogImageUrl: catalogOnOrg ? (org?.logoUrl ?? "") : (u.photoUrl ?? ""),
    city: u.city ?? "",
    description: catalogOnOrg
      ? (profile.organization?.description ?? "")
      : (u.description ?? ""),
    partnerType: u.partnerType ?? "MASTER",
    specializations: catalogOnOrg
      ? [...(profile.organization?.specializations ?? [])]
      : [...(u.specializations ?? [])],
    storeCategories: catalogOnOrg
      ? [...(profile.organization?.storeCategories ?? [])]
      : [...(u.storeCategories ?? [])],
    organizationName: profile.organization?.name ?? "",
    branchAddress: "",
    website: catalogOnOrg ? (profile.organization?.website ?? "") : (u.website ?? ""),
    telegram: catalogOnOrg ? (org?.telegram ?? "") : (u.telegram ?? ""),
    publicEmail: catalogOnOrg ? (org?.publicEmail ?? "") : (u.publicEmail ?? ""),
    publicPhone: catalogOnOrg ? (org?.publicPhone ?? "") : (u.publicPhone ?? ""),
    productCategoryIds: [...(w?.effectiveProductCategoryIds ?? w?.productCategoryIds ?? [])],
    serviceSpecializationIds: [
      ...(w?.effectiveServiceSpecializationIds ?? w?.serviceSpecializationIds ?? []),
    ],
    navigatorStageIds: [...(w?.effectiveNavigatorStageIds ?? w?.navigatorStageIds ?? [])],
    primaryDirection: w?.primaryDirection ?? null,
    partnerSearchOptIn: w?.partnerSearchVisible ?? w?.partnerSearchOptIn ?? false,
    partnerWorkMode: w?.partnerWorkMode ?? "",
    areas: [...(w?.areas ?? u.areas ?? [])],
    partnershipContactName: w?.partnershipContactName ?? "",
    partnershipContactPhone: w?.partnershipContactPhone ?? "",
    partnershipContactEmail: w?.partnershipContactEmail ?? "",
  };
}

const DRAFT_KEYS: (keyof ProfileDraft)[] = [
  "displayName",
  "catalogCity",
  "city",
  "description",
  "partnerType",
  "specializations",
  "storeCategories",
  "organizationName",
  "branchAddress",
  "website",
  "telegram",
  "publicEmail",
  "publicPhone",
  "productCategoryIds",
  "serviceSpecializationIds",
  "navigatorStageIds",
  "primaryDirection",
  "partnerSearchOptIn",
  "partnerWorkMode",
  "areas",
  "partnershipContactName",
  "partnershipContactPhone",
  "partnershipContactEmail",
  "catalogPublicName",
  "showFullName",
  "catalogImageUrl",
];

function normalizeDraft(draft: ProfileDraft): ProfileDraft {
  return {
    ...draft,
    displayName: draft.displayName.trim(),
    city: draft.city.trim(),
    description: draft.description.trim(),
    organizationName: draft.organizationName.trim(),
    branchAddress: draft.branchAddress.trim(),
    website: draft.website.trim(),
    telegram: draft.telegram.trim(),
    publicEmail: draft.publicEmail.trim(),
    publicPhone: draft.publicPhone.trim(),
    partnershipContactName: draft.partnershipContactName.trim(),
    partnershipContactPhone: draft.partnershipContactPhone.trim(),
    partnershipContactEmail: draft.partnershipContactEmail.trim(),
    partnerWorkMode: draft.partnerWorkMode.trim(),
    specializations: [...draft.specializations].sort(),
    storeCategories: [...draft.storeCategories].sort(),
    productCategoryIds: [...draft.productCategoryIds].sort(),
    serviceSpecializationIds: [...draft.serviceSpecializationIds].sort(),
    navigatorStageIds: [...draft.navigatorStageIds].sort(),
    areas: [...draft.areas].sort(),
  };
}

function primaryEqual(
  a: ProfileDraft["primaryDirection"],
  b: ProfileDraft["primaryDirection"],
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.kind === b.kind && a.id === b.id;
}

export function profileDraftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  const left = normalizeDraft(a);
  const right = normalizeDraft(b);
  for (const key of DRAFT_KEYS) {
    if (key === "primaryDirection") {
      if (!primaryEqual(left.primaryDirection, right.primaryDirection)) return false;
      continue;
    }
    const lv = left[key];
    const rv = right[key];
    if (Array.isArray(lv) && Array.isArray(rv)) {
      if (lv.length !== rv.length || lv.some((v, i) => v !== rv[i])) return false;
      continue;
    }
    if (lv !== rv) return false;
  }
  return true;
}

export function isWorkingProfileDirty(
  saved: ProfileDraft,
  current: ProfileDraft,
): boolean {
  return !profileDraftsEqual(saved, current);
}
