import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";

/** Working-profile fields derived from the last saved server profile (not in-form edits). */
export function profileDraftFromProfile(profile: ProProfileResponse): ProfileDraft {
  const u = profile.user;
  const catalogOnOrg = profile.catalogPublication?.catalogEntity === "organization";
  return {
    displayName: u.displayName ?? "",
    city: u.city ?? "",
    description:
      catalogOnOrg && profile.organization?.description != null
        ? profile.organization.description
        : (u.description ?? ""),
    partnerType: u.partnerType ?? "MASTER",
    specializations: [...(u.specializations ?? [])],
    storeCategories:
      catalogOnOrg && profile.organization?.storeCategories
        ? [...profile.organization.storeCategories]
        : [...(u.storeCategories ?? [])],
    organizationName: profile.organization?.name ?? "",
    branchAddress: "",
    website:
      catalogOnOrg && profile.organization?.website != null
        ? (profile.organization.website ?? "")
        : (u.website ?? ""),
    telegram: u.telegram ?? "",
    publicEmail: u.publicEmail ?? "",
    publicPhone: u.publicPhone ?? "",
  };
}

const DRAFT_KEYS: (keyof ProfileDraft)[] = [
  "displayName",
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
    specializations: [...draft.specializations].sort(),
    storeCategories: [...draft.storeCategories].sort(),
  };
}

export function profileDraftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  const left = normalizeDraft(a);
  const right = normalizeDraft(b);
  for (const key of DRAFT_KEYS) {
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
