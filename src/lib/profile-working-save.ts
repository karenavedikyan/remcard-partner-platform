import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { saveDisplayNameViaAuthMe } from "@/lib/onboarding-save";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { buildWorkingProfilePatchBody, type WorkingSaveOptions } from "@/lib/working-profile-patch";

export function validateWorkingProfileDraft(draft: ProfileDraft): string | null {
  const name = draft.displayName.trim();
  if (name.length < 2 || name === "Пользователь") {
    return "Укажите имя представителя (минимум 2 символа, не «Пользователь»).";
  }
  if (!draft.city.trim()) return "Укажите город.";
  if (!draft.partnerType) return "Выберите тип партнёра.";
  if (
    (draft.partnerType === "STORE" || draft.partnerType === "COMPANY") &&
    draft.organizationName.trim().length < 2
  ) {
    return "Укажите название организации (минимум 2 символа).";
  }
  const hasDirections =
    draft.productCategoryIds.length > 0 || draft.serviceSpecializationIds.length > 0;
  if (draft.partnerSearchOptIn && !hasDirections) {
    return "Для видимости в поиске укажите хотя бы одну категорию товаров или услуг.";
  }
  if (draft.primaryDirection) {
    const inProducts =
      draft.primaryDirection.kind === "product" &&
      draft.productCategoryIds.includes(draft.primaryDirection.id);
    const inServices =
      draft.primaryDirection.kind === "service" &&
      draft.serviceSpecializationIds.includes(draft.primaryDirection.id);
    if (!inProducts && !inServices) {
      return "Основное направление должно быть среди выбранных товаров или услуг.";
    }
  }
  const hasContactPhone = draft.partnershipContactPhone.trim().length > 0;
  const hasContactEmail = draft.partnershipContactEmail.trim().length > 0;
  if ((hasContactPhone || hasContactEmail) && !draft.partnershipContactName.trim()) {
    return "Укажите контактное лицо для сотрудничества.";
  }
  return null;
}

/** Cabinet minimum without requiring search directions. */
export function workingProfileCabinetReady(draft: ProfileDraft): boolean {
  const name = draft.displayName.trim();
  if (name.length < 2 || name === "Пользователь") return false;
  if (!draft.city.trim()) return false;
  if (!draft.partnerType) return false;
  if (
    (draft.partnerType === "STORE" || draft.partnerType === "COMPANY") &&
    draft.organizationName.trim().length < 2
  ) {
    return false;
  }
  return true;
}

export function workingProfileComplete(draft: ProfileDraft): boolean {
  return workingProfileCabinetReady(draft);
}

export function workingProfileMissingFields(draft: ProfileDraft): string[] {
  const issues: string[] = [];
  const name = draft.displayName.trim();
  if (name.length < 2 || name === "Пользователь") {
    issues.push("Укажите имя представителя (минимум 2 символа, не «Пользователь»).");
  }
  if (!draft.city.trim()) issues.push("Укажите город.");
  if (!draft.partnerType) issues.push("Выберите тип партнёра.");
  if (
    (draft.partnerType === "STORE" || draft.partnerType === "COMPANY") &&
    draft.organizationName.trim().length < 2
  ) {
    issues.push("Укажите название организации (минимум 2 символа).");
  }
  return issues;
}

async function persistOrganizationName(
  draft: ProfileDraft,
  profile: ProProfileResponse,
): Promise<void> {
  const orgName = draft.organizationName.trim();
  const savedOrg = profile.organization?.name?.trim() ?? "";
  if (orgName === savedOrg) return;
  const orgBody = { name: orgName, partnerType: draft.partnerType };
  const existing = await remcardFetch<{ organization: { id: string } | null }>(
    "/api/pro/organization",
    { method: "GET" },
  );
  if (existing.organization) {
    await remcardFetch("/api/pro/organization", { method: "PATCH", body: orgBody });
  } else {
    try {
      await remcardFetch("/api/pro/organization", { method: "POST", body: orgBody });
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 409) {
        await remcardFetch("/api/pro/organization", { method: "PATCH", body: orgBody });
      } else {
        throw caught;
      }
    }
  }
}

export async function persistWorkingProfileDraft(
  profile: ProProfileResponse,
  draft: ProfileDraft,
  options: WorkingSaveOptions = {},
): Promise<ProProfileResponse> {
  const validationError = validateWorkingProfileDraft(draft);
  if (validationError) {
    throw new RemcardApiError(400, validationError, null);
  }

  const trimmedName = draft.displayName.trim();
  if (trimmedName !== (profile.user.displayName ?? "").trim()) {
    await saveDisplayNameViaAuthMe(trimmedName);
  }

  const needsOrg = draft.partnerType === "STORE" || draft.partnerType === "COMPANY";
  const orgBeforeProfile =
    needsOrg && Boolean(options.partnerSearchTouched && draft.partnerSearchOptIn);
  if (orgBeforeProfile) {
    await persistOrganizationName(draft, profile);
  }

  const patchBody = buildWorkingProfilePatchBody(profile, draft, options);

  if (Object.keys(patchBody).length > 0) {
    await remcardFetch<{ user: ProProfileResponse["user"] }>("/api/pro/profile", {
      method: "PATCH",
      body: patchBody,
    });
  }

  if (needsOrg && !orgBeforeProfile) {
    await persistOrganizationName(draft, profile);
  }

  const refreshed = await remcardFetch<ProProfileResponse>("/api/pro/profile", { method: "GET" });
  return {
    ...refreshed,
    user: { ...refreshed.user, displayName: trimmedName },
  };
}
