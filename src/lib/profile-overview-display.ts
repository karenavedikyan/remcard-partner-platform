import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import type { ProProfileResponse } from "@/lib/types";
import { workingProfileCabinetReady } from "@/lib/profile-working-save";

const PARTNER_TYPE_LABELS: Record<string, string> = {
  MASTER: "Специалист",
  COMPANY: "Компания",
  STORE: "Магазин",
};

export function partnerTypeLabel(partnerType: string | null | undefined): string {
  if (!partnerType) return "—";
  return PARTNER_TYPE_LABELS[partnerType] ?? partnerType;
}

/** Primary working entity title from saved profile only. */
export function savedWorkingProfileTitle(profile: ProProfileResponse): string {
  const partnerType = profile.user.partnerType ?? "MASTER";
  if (partnerType === "MASTER" || !profile.organization) {
    const name = profile.user.displayName?.trim();
    return name || "—";
  }
  const orgName = profile.organization.name?.trim();
  return orgName || "—";
}

export function savedWorkingProfileReadyLabel(profile: ProProfileResponse): {
  label: string;
  ready: boolean;
} {
  const saved = profileDraftFromProfile(profile);
  const ready = workingProfileCabinetReady(saved);
  return ready
    ? { label: "Готов к работе", ready: true }
    : { label: "Нужно дозаполнить", ready: false };
}

export function savedDirectionLabels(profile: ProProfileResponse): string[] {
  const w = profile.workingProfile;
  if (w) {
    const products = (w.effectiveProductCategoryIds ?? []).map(
      (id) => `Товар: ${displayCategoryLabel(id, id)}`,
    );
    const services = (w.effectiveServiceSpecializationIds ?? []).map(
      (id) => `Услуга: ${masterDirectionLabel(id)}`,
    );
    return [...products, ...services];
  }
  const partnerType = profile.user.partnerType ?? "MASTER";
  const catalogOnOrg = profile.catalogPublication?.catalogEntity === "organization";
  if (partnerType === "MASTER") {
    return (profile.user.specializations ?? []).map((id) => masterDirectionLabel(id));
  }
  const ids =
    catalogOnOrg && profile.organization?.storeCategories?.length
      ? profile.organization.storeCategories
      : profile.user.storeCategories;
  return (ids ?? []).map((id) => displayCategoryLabel(id, id));
}

export function savedPartnerSearchVisibleLabel(profile: ProProfileResponse): string {
  const visible = profile.workingProfile?.partnerSearchVisible;
  if (visible === true) return "Виден партнёрам";
  if (visible === false) return "Скрыт из поиска партнёров";
  return "—";
}

export function savedRepresentativeName(profile: ProProfileResponse): string {
  return profile.user.displayName?.trim() || "—";
}

export function savedCity(profile: ProProfileResponse): string {
  return profile.user.city?.trim() || "—";
}
