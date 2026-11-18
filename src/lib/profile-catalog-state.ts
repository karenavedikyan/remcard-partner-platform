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
  if (status === "PENDING" || status === "REJECTED") return false;
  if (status === "DRAFT" || status === "NEEDS_REVISION") return true;
  if (status === "APPROVED") {
    return Boolean(
      profile.catalogPublication?.draftPending ||
        profile.user.catalogDraftPending ||
        profile.organization?.catalogDraftPending,
    );
  }
  return false;
}

/** Working profile (PROF cabinet) — editable unless catalog publication is under review. */
export function profileBasicsEditable(_profile: ProProfileResponse): boolean {
  return true;
}

/** Public catalog draft — locked while moderation decision is pending. */
export function catalogPublicationEditable(profile: ProProfileResponse): boolean {
  const status = effectiveCatalogStatus(profile);
  return status !== "PENDING";
}

/** @deprecated use profileBasicsEditable / catalogPublicationEditable */
export function profileFieldsEditable(profile: ProProfileResponse): boolean {
  return catalogPublicationEditable(profile);
}

export function showRevisionBanner(profile: ProProfileResponse): boolean {
  return effectiveCatalogStatus(profile) === "NEEDS_REVISION";
}

/** Short catalog publication status for the specialist overview card. */
export function catalogLineStatusText(profile: ProProfileResponse): string {
  const status = effectiveCatalogStatus(profile);
  if (status === "NEEDS_REVISION") return "Нужно исправить";
  const published = profile.catalogPublication?.isLivePublic === true;
  if (status === "APPROVED") return published ? "Проверен · опубликовано" : "Проверен · не опубликовано";
  if (status === "PENDING") return "На проверке";
  if (status === "REJECTED") return "Отклонён";
  return "Не опубликовано";
}
