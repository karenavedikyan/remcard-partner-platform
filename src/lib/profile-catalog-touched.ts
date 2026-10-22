import { catalogEntityForProfile } from "@/lib/profile-catalog-state";
import { parseCatalogTouched } from "@/lib/specialist-r06/catalog-prefill";
import type { ProProfileResponse } from "@/lib/types";
import { catalogTouchedFromUser } from "@/lib/profile-catalog-stages-hydration";

/** Catalog UI touched flags: organization.catalogDraft for org entity, else user.catalogDraft. */
export function catalogTouchedFromProfile(profile: ProProfileResponse): Record<string, boolean> {
  if (catalogEntityForProfile(profile) === "organization") {
    const raw = profile.organization?.catalogDraft;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const touched = (raw as Record<string, unknown>).catalogTouched;
    return parseCatalogTouched(touched);
  }
  return catalogTouchedFromUser(profile.user);
}
