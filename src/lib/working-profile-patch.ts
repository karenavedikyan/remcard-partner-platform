import type { ProfileDraft } from "@/lib/profile-save";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import type { ProProfileResponse } from "@/lib/types";

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function primaryEqual(
  a: ProfileDraft["primaryDirection"],
  b: ProfileDraft["primaryDirection"],
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.kind === b.kind && a.id === b.id;
}

export type WorkingSaveOptions = {
  /** User explicitly changed partner search visibility checkbox this session. */
  partnerSearchTouched?: boolean;
};

export function buildWorkingProfilePatchBody(
  profile: ProProfileResponse,
  draft: ProfileDraft,
  options: WorkingSaveOptions = {},
): Record<string, unknown> {
  const saved = profileDraftFromProfile(profile);
  const body: Record<string, unknown> = {};

  if (draft.city.trim() !== saved.city.trim()) {
    body.city = draft.city.trim();
  }
  if (draft.partnerType !== saved.partnerType) {
    body.partnerType = draft.partnerType;
  }

  if (!arraysEqual(draft.productCategoryIds, saved.productCategoryIds)) {
    body.productCategoryIds = draft.productCategoryIds;
  }
  if (!arraysEqual(draft.serviceSpecializationIds, saved.serviceSpecializationIds)) {
    body.serviceSpecializationIds = draft.serviceSpecializationIds;
  }
  if (!arraysEqual(draft.navigatorStageIds, saved.navigatorStageIds)) {
    body.navigatorStageIds = draft.navigatorStageIds;
  }
  if (!primaryEqual(draft.primaryDirection, saved.primaryDirection)) {
    body.primaryDirection = draft.primaryDirection;
  }

  if (options.partnerSearchTouched && draft.partnerSearchOptIn !== saved.partnerSearchOptIn) {
    body.partnerSearchOptIn = draft.partnerSearchOptIn;
  }

  if (!arraysEqual(draft.areas, saved.areas)) {
    body.areas = draft.areas;
  }

  const workMode = draft.partnerWorkMode.trim();
  const savedMode = saved.partnerWorkMode.trim();
  if (workMode !== savedMode) {
    body.partnerWorkMode = workMode || null;
  }

  if (draft.partnershipContactName.trim() !== saved.partnershipContactName.trim()) {
    body.partnershipContactName = draft.partnershipContactName.trim() || null;
  }
  if (draft.partnershipContactPhone.trim() !== saved.partnershipContactPhone.trim()) {
    body.partnershipContactPhone = draft.partnershipContactPhone.trim() || null;
  }
  if (draft.partnershipContactEmail.trim() !== saved.partnershipContactEmail.trim()) {
    body.partnershipContactEmail = draft.partnershipContactEmail.trim() || null;
  }

  return body;
}
