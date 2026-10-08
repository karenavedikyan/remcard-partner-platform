import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import type { CabinetReadiness, ConsentRequirement } from "@/lib/cabinet-readiness";
import { recordConsentRequirements } from "@/lib/auth-consent";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import { consentRequirementKey, fetchAuthMeSafe, fetchReadinessSafe } from "@/lib/auth-session";
import type { PartnerTypeOption } from "@/lib/onboarding-partner-types";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";

export type OnboardingDraft = {
  partnerType: PartnerTypeOption;
  city: string;
  /** Имя представителя (физлицо), сохраняется через /api/auth/me */
  displayName: string;
  /** Название организации для STORE/COMPANY */
  organizationName: string;
  allStages: boolean;
  selectedStages: string[];
  storeCategories: string[];
};

export type OnboardingSaveProgress = {
  offerSaved: boolean;
  displayNameSaved: boolean;
  profileSaved: boolean;
  organizationSaved: boolean;
};

export function buildOrganizationUpsertBody(
  draft: OnboardingDraft,
): Record<string, unknown> | null {
  if (draft.partnerType !== "STORE" && draft.partnerType !== "COMPANY") {
    return null;
  }
  const name = draft.organizationName.trim();
  if (name.length < 2) {
    return null;
  }
  return {
    name,
    partnerType: draft.partnerType,
    storeCategories: draft.storeCategories,
  };
}

export function organizationNameMatchesSaved(
  saved: string | null | undefined,
  draft: string,
): boolean {
  return (saved ?? "").trim() === draft.trim();
}

export type VerifyOnboardingResult =
  | { ok: true; readiness: CabinetReadiness }
  | { ok: false; kind: "unauthorized" | "network" | "server" | "incomplete"; message: string };

export function buildProfilePatchBody(draft: OnboardingDraft): Record<string, unknown> {
  const body: Record<string, unknown> = {
    city: draft.city.trim(),
    partnerType: draft.partnerType,
  };
  if (draft.partnerType === "MASTER") {
    body.specializations = draft.allStages
      ? ONBOARDING_STAGES.map((s) => s.id)
      : draft.selectedStages;
  } else {
    body.storeCategories = draft.storeCategories;
  }
  return body;
}

export function displayNameMatchesSaved(saved: string | null | undefined, draft: string): boolean {
  return (saved ?? "").trim() === draft.trim();
}

export async function saveOfferConsent(requirement: ConsentRequirement): Promise<void> {
  if (!requirement.legalDocumentId) {
    throw new RemcardApiError(503, "Документ оферты временно недоступен.", {
      error: "NO_ACTIVE_DOCUMENT",
    });
  }
  await recordConsentRequirements(
    [requirement],
    new Set([consentRequirementKey(requirement)]),
  );
}

export async function saveDisplayNameViaAuthMe(displayName: string): Promise<string> {
  const trimmed = displayName.trim();
  const result = await remcardFetch<{ user?: { displayName?: string | null } }>("/api/auth/me", {
    method: "PATCH",
    body: { displayName: trimmed },
  });
  const saved = result.user?.displayName?.trim() ?? "";
  if (saved !== trimmed) {
    throw new RemcardApiError(500, "Не удалось сохранить название.", null);
  }
  return saved;
}

export async function saveProProfile(draft: OnboardingDraft): Promise<void> {
  await remcardFetch("/api/pro/profile", {
    method: "PATCH",
    body: buildProfilePatchBody(draft),
  });
}

export async function readSavedOrganizationName(): Promise<string | null> {
  const payload = await remcardFetch<{ organization: { name: string } | null }>(
    "/api/pro/organization",
    { method: "GET" },
  );
  return payload.organization?.name?.trim() ?? null;
}

/** STORE/COMPANY: persist commercial org name separately from representative displayName. */
export async function saveOnboardingOrganization(draft: OnboardingDraft): Promise<void> {
  const body = buildOrganizationUpsertBody(draft);
  if (!body) {
    throw new RemcardApiError(400, "Укажите название организации.", null);
  }
  const targetName = String(body.name);

  const existing = await remcardFetch<{ organization: { name: string } | null }>(
    "/api/pro/organization",
    { method: "GET" },
  );

  if (existing.organization) {
    await remcardFetch("/api/pro/organization", { method: "PATCH", body });
  } else {
    try {
      await remcardFetch("/api/pro/organization", { method: "POST", body });
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 409) {
        await remcardFetch("/api/pro/organization", { method: "PATCH", body });
      } else {
        throw caught;
      }
    }
  }

  const confirmed = await readSavedOrganizationName();
  if (!organizationNameMatchesSaved(confirmed, targetName)) {
    throw new RemcardApiError(500, "Не удалось подтвердить название организации.", null);
  }
}

export async function saveProProfileOnboarding(draft: OnboardingDraft): Promise<void> {
  await saveProProfile(draft);
  if (draft.partnerType === "STORE" || draft.partnerType === "COMPANY") {
    await saveOnboardingOrganization(draft);
  }
}

export async function verifyOnboardingComplete(): Promise<VerifyOnboardingResult> {
  const meResult = await fetchAuthMeSafe();
  if (!meResult.ok) {
    if (meResult.kind === "unauthorized") {
      return { ok: false, kind: "unauthorized", message: "Сессия завершилась. Войдите снова." };
    }
    if (meResult.kind === "network") {
      return {
        ok: false,
        kind: "network",
        message: "Не удалось связаться с сервером. Повторите проверку.",
      };
    }
    return {
      ok: false,
      kind: "server",
      message: "Временная ошибка сервера. Повторите проверку.",
    };
  }

  const readinessResult = await fetchReadinessSafe();
  if (!readinessResult.ok) {
    if (readinessResult.kind === "unauthorized") {
      return { ok: false, kind: "unauthorized", message: "Сессия завершилась. Войдите снова." };
    }
    if (readinessResult.kind === "network") {
      return {
        ok: false,
        kind: "network",
        message: "Не удалось связаться с сервером. Повторите проверку.",
      };
    }
    return {
      ok: false,
      kind: "server",
      message: "Временная ошибка сервера. Повторите проверку.",
    };
  }

  const readiness = readinessResult.data;
  if (hasPendingLoginConsents(readiness)) {
    return {
      ok: false,
      kind: "incomplete",
      message: "Примите обязательные соглашения.",
    };
  }
  if (readiness.needsProfileOnboarding) {
    return {
      ok: false,
      kind: "incomplete",
      message: "Завершите оставшиеся поля профиля.",
    };
  }
  if (!readiness.canAccessCabinet) {
    return {
      ok: false,
      kind: "incomplete",
      message: "Профиль сохранён, но доступ ещё не открыт. Повторите проверку.",
    };
  }

  return { ok: true, readiness };
}

/** Read current displayName from auth/me (throws RemcardApiError on hard failure). */
export async function readSavedDisplayName(): Promise<string | null> {
  const me = await getAuthMe();
  return me.user?.displayName?.trim() ?? null;
}
