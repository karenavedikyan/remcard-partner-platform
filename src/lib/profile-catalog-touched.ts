import { catalogEntityForProfile } from "@/lib/profile-catalog-state";
import {
  parseCatalogTouched,
  type CatalogTouchedMap,
} from "@/lib/specialist-r06/catalog-prefill";
import type { ProProfileResponse } from "@/lib/types";
import { catalogTouchedFromUser } from "@/lib/profile-catalog-stages-hydration";

/** After approve, org.catalogDraft is cleared — lock prefill so live columns are not overwritten by working profile. */
function publishedOrgCatalogTouchedLocks(): CatalogTouchedMap {
  return {
    catalogPublicName: true,
    catalogCity: true,
    description: true,
    website: true,
    telegram: true,
    publicPhone: true,
    publicEmail: true,
    catalogImageUrl: true,
    storeCategories: true,
    specializations: true,
    navigatorStageIds: true,
  };
}

/** Catalog UI touched flags: organization.catalogDraft for org entity, else user.catalogDraft. */
export function catalogTouchedFromProfile(profile: ProProfileResponse): Record<string, boolean> {
  if (catalogEntityForProfile(profile) === "organization") {
    const org = profile.organization;
    const raw = org?.catalogDraft;
    let fromDraft: CatalogTouchedMap = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const touched = (raw as Record<string, unknown>).catalogTouched;
      fromDraft = parseCatalogTouched(touched);
    }
    if (org?.catalogPublished) {
      return { ...publishedOrgCatalogTouchedLocks(), ...fromDraft };
    }
    return fromDraft;
  }
  return catalogTouchedFromUser(profile.user);
}
