import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";

/** Working-profile website/telegram for STORE/COMPANY are stored on Organization, not User catalog. */
export function organizationWorkingCatalogEntity(profile: ProProfileResponse): boolean {
  const pt = profile.user.partnerType;
  if (pt !== "STORE" && pt !== "COMPANY") return false;
  return Boolean(profile.organization?.id);
}

export function organizationWorkingCatalogEntityForDraft(
  profile: ProProfileResponse,
  draft: Pick<ProfileDraft, "partnerType">,
): boolean {
  if (draft.partnerType !== "STORE" && draft.partnerType !== "COMPANY") return false;
  return Boolean(profile.organization?.id);
}
