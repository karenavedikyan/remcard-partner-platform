import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { saveDisplayNameViaAuthMe } from "@/lib/onboarding-save";
import type { ProProfileResponse } from "@/lib/types";
import type { ProfileDraft } from "@/lib/profile-save";

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
  return null;
}

export function workingProfileComplete(draft: ProfileDraft): boolean {
  return validateWorkingProfileDraft(draft) === null;
}

export function workingProfileMissingFields(draft: ProfileDraft): string[] {
  const err = validateWorkingProfileDraft(draft);
  return err ? [err] : [];
}

export async function persistWorkingProfileDraft(
  profile: ProProfileResponse,
  draft: ProfileDraft,
): Promise<ProProfileResponse> {
  const validationError = validateWorkingProfileDraft(draft);
  if (validationError) {
    throw new RemcardApiError(400, validationError, null);
  }

  const trimmedName = draft.displayName.trim();
  if (trimmedName !== (profile.user.displayName ?? "").trim()) {
    await saveDisplayNameViaAuthMe(trimmedName);
  }

  await remcardFetch<{ user: ProProfileResponse["user"] }>("/api/pro/profile", {
    method: "PATCH",
    body: {
      city: draft.city.trim(),
      partnerType: draft.partnerType,
      description: draft.description.trim() || null,
      website: draft.website.trim() || null,
      telegram: draft.telegram.trim() || null,
      publicEmail: draft.publicEmail.trim() || null,
      publicPhone: draft.publicPhone.trim() || null,
    },
  });

  if (draft.partnerType === "STORE" || draft.partnerType === "COMPANY") {
    const orgName = draft.organizationName.trim();
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

  const refreshed = await remcardFetch<ProProfileResponse>("/api/pro/profile", { method: "GET" });
  return {
    ...refreshed,
    user: { ...refreshed.user, displayName: trimmedName },
  };
}
