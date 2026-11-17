import { resolvePartnerKindUi, PARTNER_KIND_UI_LABELS } from "@/lib/partner-kind-ui";
import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import type { ProProfileResponse } from "@/lib/types";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { BusinessProfilePartnerType } from "@/lib/business-profile/eligibility";
import { isOrganizationStaffEmployee, staffAccessScopeLabel } from "@/lib/profile-staff-cabinet";
import { workingProfileCabinetReady } from "@/lib/profile-working-save";

const PARTNER_TYPE_LABELS: Record<string, string> = {
  MASTER: "Специалист",
  COMPANY: "Компания",
  STORE: "Магазин",
};

/** Trusted org workplace overview (server dispatch), not inferred from personal /pro/profile. */
export function isTrustedOrgWorkplaceOverview(
  orgStaffWorkplacePartnerType: BusinessProfilePartnerType | null | undefined,
): boolean {
  return orgStaffWorkplacePartnerType === "STORE" || orgStaffWorkplacePartnerType === "COMPANY";
}

export function trustedWorkplaceOverviewTitle(
  proContext: ProContextSnapshot | null,
): string {
  return proContext?.organization?.name?.trim() || "—";
}

export function partnerTypeLabel(partnerType: string | null | undefined): string {
  if (!partnerType) return "Сотрудник";
  return PARTNER_TYPE_LABELS[partnerType] ?? partnerType;
}

export function principalPartnerKindLabel(
  profile: Pick<ProProfileResponse, "user">,
): string {
  const kind = resolvePartnerKindUi({
    partnerType: profile.user.partnerType,
    partnerActivities: profile.user.partnerActivities,
  });
  if (kind) return PARTNER_KIND_UI_LABELS[kind];
  return partnerTypeLabel(profile.user.partnerType);
}

export function overviewRoleLabel(
  profile: ProProfileResponse,
  proContext: ProContextSnapshot | null,
  orgStaffWorkplacePartnerType?: BusinessProfilePartnerType | null,
): string {
  if (isTrustedOrgWorkplaceOverview(orgStaffWorkplacePartnerType)) {
    return staffAccessScopeLabel(proContext) ?? "Сотрудник организации";
  }
  if (isOrganizationStaffEmployee(profile, proContext)) {
    return staffAccessScopeLabel(proContext) ?? "Сотрудник организации";
  }
  return principalPartnerKindLabel(profile);
}

/** Primary working entity title from saved profile only. */
export function savedWorkingProfileTitle(
  profile: ProProfileResponse,
  proContext: ProContextSnapshot | null = null,
  orgStaffWorkplacePartnerType?: BusinessProfilePartnerType | null,
): string {
  if (isTrustedOrgWorkplaceOverview(orgStaffWorkplacePartnerType)) {
    return trustedWorkplaceOverviewTitle(proContext);
  }
  if (isOrganizationStaffEmployee(profile, proContext)) {
    return proContext?.organization?.name?.trim() || "—";
  }
  const kind = resolvePartnerKindUi({
    partnerType: profile.user.partnerType,
    partnerActivities: profile.user.partnerActivities,
  });
  if (!kind || kind === "agent" || kind === "specialist" || !profile.organization) {
    const name = profile.user.displayName?.trim();
    return name || "—";
  }
  const orgName = profile.organization.name?.trim();
  return orgName || "—";
}

export function savedWorkingProfileReadyLabel(
  profile: ProProfileResponse,
  proContext: ProContextSnapshot | null = null,
  orgStaffWorkplacePartnerType?: BusinessProfilePartnerType | null,
): {
  label: string;
  ready: boolean;
} {
  if (
    isTrustedOrgWorkplaceOverview(orgStaffWorkplacePartnerType) ||
    isOrganizationStaffEmployee(profile, proContext)
  ) {
    return { label: "Доступ по приглашению", ready: true };
  }
  const saved = profileDraftFromProfile(profile);
  const ready = workingProfileCabinetReady(saved) && hasEnoughDirectionsForType(profile);
  return ready
    ? { label: "Готов к работе", ready: true }
    : { label: "Заполните профиль", ready: false };
}

/** Every type except a pure agent needs at least one saved direction to count as ready. */
function hasEnoughDirectionsForType(profile: ProProfileResponse): boolean {
  const kind = resolvePartnerKindUi({
    partnerType: profile.user.partnerType,
    partnerActivities: profile.user.partnerActivities,
  });
  if (kind === "agent") return true;
  return savedDirectionLabels(profile).length > 0;
}

/**
 * Whether the working profile is filled in enough to show the secondary account blocks
 * (partner type, certificate terms, sign-out) in full. While it is not, they are folded into one
 * «Другие настройки» line so they do not compete with the wizard.
 */
export function isWorkingProfileFilled(
  profile: ProProfileResponse,
  proContext: ProContextSnapshot | null = null,
): boolean {
  const kind = resolvePartnerKindUi({
    partnerType: profile.user.partnerType,
    partnerActivities: profile.user.partnerActivities,
  });
  if (kind === "agent" && !isOrganizationStaffEmployee(profile, proContext)) {
    const name = profile.user.displayName?.trim() ?? "";
    return name.length >= 2 && name !== "Пользователь" && Boolean(profile.user.city?.trim());
  }
  return savedWorkingProfileReadyLabel(profile, proContext).ready;
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
