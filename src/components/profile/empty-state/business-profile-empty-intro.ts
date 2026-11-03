import type { ProfileDraft } from "@/lib/profile-save";
import { workingProfileCabinetReady } from "@/lib/profile-working-save";

/** Saved server snapshot has any typed working-profile field (not merely failing cabinet-ready). */
export function businessWorkingProfileHasMeaningfulSavedProgress(draft: ProfileDraft): boolean {
  if (draft.organizationName.trim().length > 0) return true;
  const rep = draft.displayName.trim();
  if (rep.length >= 2 && rep !== "Пользователь") return true;
  if (draft.city.trim().length > 0) return true;
  if (draft.description.trim().length > 0) return true;
  if (
    draft.productCategoryIds.length > 0 ||
    draft.serviceSpecializationIds.length > 0 ||
    draft.navigatorStageIds.length > 0
  ) {
    return true;
  }
  if (draft.primaryDirection) return true;
  if (draft.partnerWorkMode.trim().length > 0) return true;
  if (draft.areas.length > 0) return true;
  if (
    draft.partnershipContactName.trim() ||
    draft.partnershipContactPhone.trim() ||
    draft.partnershipContactEmail.trim()
  ) {
    return true;
  }
  if (draft.partnerSearchOptIn) return true;
  if (
    draft.website.trim() ||
    draft.telegram.trim() ||
    draft.publicEmail.trim() ||
    draft.publicPhone.trim()
  ) {
    return true;
  }
  return false;
}

export function businessProfileShowEmptyIntro(
  savedSnapshot: ProfileDraft,
  options: { forceEditing?: boolean },
): boolean {
  if (options.forceEditing) return false;
  if (workingProfileCabinetReady(savedSnapshot)) return false;
  if (businessWorkingProfileHasMeaningfulSavedProgress(savedSnapshot)) return false;
  return true;
}
