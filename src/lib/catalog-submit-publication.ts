import {
  canSubmitProfileForModeration,
  catalogPublicationEditable,
  effectiveCatalogStatus,
} from "@/lib/profile-catalog-state";
import type { SubmitProfileModerationResult } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";

/** Server accepted submit but profile GET has not confirmed PENDING yet. */
export function profileWithOptimisticPendingCatalog(profile: ProProfileResponse): ProProfileResponse {
  if (profile.organization) {
    return {
      ...profile,
      organization: { ...profile.organization, catalogStatus: "PENDING" },
    };
  }
  return {
    ...profile,
    user: { ...profile.user, catalogStatus: "PENDING" },
  };
}

export type CatalogSubmitOutcome = {
  submitAcceptedPendingSync: boolean;
  successMessage: string | null;
  errorMessage: string | null;
  profile: ProProfileResponse | null;
};

export function catalogSubmitPublicationAllowed(
  profile: ProProfileResponse,
  submitAcceptedPendingSync: boolean,
): boolean {
  if (submitAcceptedPendingSync) return false;
  return canSubmitProfileForModeration(profile);
}

export function catalogPublicationFieldsEditable(
  profile: ProProfileResponse,
  submitAcceptedPendingSync: boolean,
): boolean {
  if (submitAcceptedPendingSync) return false;
  return catalogPublicationEditable(profile);
}

export async function processCatalogSubmitResult(params: {
  result: SubmitProfileModerationResult;
  profileBeforeSubmit: ProProfileResponse;
  successMessage: string;
  refreshProfile: () => Promise<ProProfileResponse>;
}): Promise<CatalogSubmitOutcome> {
  const { result, profileBeforeSubmit, successMessage, refreshProfile } = params;

  if (result.profile) {
    return {
      submitAcceptedPendingSync: false,
      successMessage,
      errorMessage: null,
      profile: result.profile,
    };
  }

  if (!result.refreshFailed) {
    return {
      submitAcceptedPendingSync: false,
      successMessage: null,
      errorMessage: null,
      profile: null,
    };
  }

  try {
    const recovered = await refreshProfile();
    if (effectiveCatalogStatus(recovered) === "PENDING") {
      return {
        submitAcceptedPendingSync: false,
        successMessage,
        errorMessage: null,
        profile: recovered,
      };
    }
  } catch {
    /* fall through to optimistic lock */
  }

  return {
    submitAcceptedPendingSync: true,
    successMessage,
    errorMessage:
      "Не удалось обновить статус на экране. Нажмите «Обновить статус» или перезагрузите страницу.",
    profile: profileWithOptimisticPendingCatalog(profileBeforeSubmit),
  };
}

export async function recoverCatalogSubmitStatus(
  refreshProfile: () => Promise<ProProfileResponse>,
): Promise<{ profile: ProProfileResponse; pendingSyncCleared: boolean }> {
  const profile = await refreshProfile();
  return {
    profile,
    pendingSyncCleared: effectiveCatalogStatus(profile) === "PENDING",
  };
}
