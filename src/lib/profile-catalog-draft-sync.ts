import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { catalogEntityForProfile } from "@/lib/profile-catalog-state";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";

const CATALOG_KEYS: (keyof ProfileDraft)[] = [
  "description",
  "specializations",
  "storeCategories",
  "organizationName",
  "branchAddress",
  "website",
  "telegram",
  "publicEmail",
  "publicPhone",
  "catalogPublicName",
  "showFullName",
  "catalogImageUrl",
];

function pickCatalogSlice(draft: ProfileDraft): ProfileDraft {
  const full = { ...draft };
  return full;
}

function normalizeCatalog(d: ProfileDraft): ProfileDraft {
  return {
    ...d,
    description: d.description.trim(),
    organizationName: d.organizationName.trim(),
    branchAddress: d.branchAddress.trim(),
    website: d.website.trim(),
    telegram: d.telegram.trim(),
    publicEmail: d.publicEmail.trim(),
    publicPhone: d.publicPhone.trim(),
    catalogPublicName: d.catalogPublicName.trim(),
    catalogImageUrl: d.catalogImageUrl.trim(),
    specializations: [...d.specializations].sort(),
    storeCategories: [...d.storeCategories].sort(),
  };
}

export function catalogDraftFromProfile(profile: ProProfileResponse): ProfileDraft {
  return profileDraftFromProfile(profile);
}

export function isCatalogDraftDirty(saved: ProfileDraft, current: ProfileDraft): boolean {
  const a = normalizeCatalog(saved);
  const b = normalizeCatalog(current);
  for (const key of CATALOG_KEYS) {
    const av = a[key];
    const bv = b[key];
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length || av.some((v, i) => v !== bv[i])) return true;
      continue;
    }
    if (av !== bv) return true;
  }
  return false;
}

export function catalogEntityLabel(profile: ProProfileResponse): "user" | "organization" {
  return catalogEntityForProfile(profile);
}
