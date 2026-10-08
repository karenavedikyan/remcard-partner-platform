import type { ProProfileResponse } from "@/lib/types";

export type CatalogEntity = "user" | "organization";

export function catalogEntityForProfile(profile: ProProfileResponse): CatalogEntity {
  return profile.organization ? "organization" : "user";
}

export function effectiveCatalogStatus(profile: ProProfileResponse): string {
  if (profile.organization?.catalogStatus) {
    return profile.organization.catalogStatus;
  }
  return profile.user.catalogStatus;
}

export function canSubmitProfileForModeration(profile: ProProfileResponse): boolean {
  const status = effectiveCatalogStatus(profile);
  return status === "DRAFT" || status === "NEEDS_REVISION";
}

export function profileFieldsEditable(profile: ProProfileResponse): boolean {
  const status = effectiveCatalogStatus(profile);
  return status !== "PENDING";
}

export function showRevisionBanner(profile: ProProfileResponse): boolean {
  return effectiveCatalogStatus(profile) === "NEEDS_REVISION";
}
