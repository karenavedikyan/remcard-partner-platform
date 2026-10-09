import { displayCategoryLabel } from "@/lib/category-display";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import type { ProProfileResponse } from "@/lib/types";
import type { ProfileDraft } from "@/lib/profile-save";
import { workingProfileComplete } from "@/lib/profile-working-save";

const PARTNER_TYPE_LABELS: Record<string, string> = {
  MASTER: "Специалист",
  COMPANY: "Компания",
  STORE: "Магазин",
};

export function partnerTypeLabel(partnerType: string | null | undefined): string {
  if (!partnerType) return "—";
  return PARTNER_TYPE_LABELS[partnerType] ?? partnerType;
}

/** Primary working entity title (not conflating user with organization). */
export function workingProfileTitle(
  profile: ProProfileResponse,
  draft: ProfileDraft,
): string {
  const partnerType = draft.partnerType ?? profile.user.partnerType ?? "MASTER";
  if (partnerType === "MASTER" || !profile.organization) {
    const name = draft.displayName.trim() || profile.user.displayName?.trim();
    return name || "—";
  }
  const orgName =
    draft.organizationName.trim() || profile.organization.name?.trim();
  return orgName || "—";
}

export function workingProfileReadyLabel(draft: ProfileDraft): {
  label: string;
  ready: boolean;
} {
  const ready = workingProfileComplete(draft);
  return ready
    ? { label: "Готов к работе", ready: true }
    : { label: "Нужно дозаполнить", ready: false };
}

export function savedDirectionLabels(
  profile: ProProfileResponse,
  draft: ProfileDraft,
): string[] {
  const partnerType = draft.partnerType ?? profile.user.partnerType ?? "MASTER";
  if (partnerType === "MASTER") {
    const ids = draft.specializations.length
      ? draft.specializations
      : profile.user.specializations;
    return ids
      .map((id) => ONBOARDING_STAGES.find((s) => s.id === id)?.title ?? id)
      .filter(Boolean);
  }
  const ids = draft.storeCategories.length
    ? draft.storeCategories
    : profile.user.storeCategories;
  return ids.map((id) => displayCategoryLabel(id, id));
}
