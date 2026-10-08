import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { saveDisplayNameViaAuthMe } from "@/lib/onboarding-save";
import type { ProProfileResponse } from "@/lib/types";

export type ProfileDraft = {
  displayName: string;
  city: string;
  description: string;
  partnerType: string;
  specializations: string[];
  storeCategories: string[];
  organizationName: string;
  branchAddress: string;
  website: string;
  telegram: string;
  publicEmail: string;
  publicPhone: string;
};

export function validateProfileDraft(
  draft: ProfileDraft,
  profile: ProProfileResponse,
): string | null {
  const name = draft.displayName.trim();
  if (name.length < 2 || name === "Пользователь") {
    return "Укажите имя представителя (минимум 2 символа, не «Пользователь»).";
  }
  if (!draft.city.trim()) return "Укажите город.";
  if (draft.partnerType === "MASTER" && draft.specializations.length === 0) {
    return "Выберите хотя бы одну специализацию.";
  }
  if (draft.partnerType === "STORE" || draft.partnerType === "COMPANY") {
    if (draft.storeCategories.length === 0) {
      return "Выберите категории товаров.";
    }
    if (draft.organizationName.trim().length < 2) {
      return "Укажите название организации (минимум 2 символа).";
    }
    const needsBranch =
      !profile.organization || (profile.organization.branchCount ?? 0) === 0;
    if (needsBranch && draft.branchAddress.trim().length < 3) {
      return "Укажите адрес первого филиала (минимум 3 символа) для модерации организации.";
    }
  }
  return null;
}

type OrgSummary = NonNullable<ProProfileResponse["organization"]>;

type RawOrganization = OrgSummary & { branches?: unknown[] };

function toOrgSummary(org: RawOrganization): OrgSummary {
  return {
    id: org.id,
    name: org.name,
    catalogStatus: org.catalogStatus,
    partnerType: org.partnerType,
    branchCount:
      org.branchCount ??
      (Array.isArray(org.branches) ? org.branches.filter(Boolean).length : 0),
  };
}

async function fetchOwnerOrganization(): Promise<OrgSummary | null> {
  const payload = await remcardFetch<{ organization: RawOrganization | null }>(
    "/api/pro/organization",
    { method: "GET" },
  );
  if (!payload.organization) return null;
  return toOrgSummary(payload.organization);
}

async function syncStoreOrganization(
  profile: ProProfileResponse,
  draft: ProfileDraft,
): Promise<OrgSummary | null> {
  if (draft.partnerType !== "STORE" && draft.partnerType !== "COMPANY") {
    return profile.organization;
  }

  const orgName = draft.organizationName.trim();
  const orgBody = {
    name: orgName,
    partnerType: draft.partnerType,
    storeCategories: draft.storeCategories,
  };

  let organization = profile.organization;

  if (!organization) {
    try {
      const created = await remcardFetch<{ id: string; name: string }>(
        "/api/pro/organization",
        { method: "POST", body: orgBody },
      );
      organization = {
        id: created.id,
        name: created.name,
        catalogStatus: "DRAFT",
        partnerType: draft.partnerType,
        branchCount: 0,
      };
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 409) {
        const existing = await fetchOwnerOrganization();
        if (!existing) {
          throw new RemcardApiError(
            409,
            "Организация уже существует, но недоступна владельцу. Обратитесь в поддержку.",
            null,
          );
        }
        organization = existing;
      } else {
        throw caught;
      }
    }
  }

  await remcardFetch("/api/pro/organization", {
    method: "PATCH",
    body: orgBody,
  });

  const currentOrg = (await fetchOwnerOrganization()) ?? organization;
  const branchCount = currentOrg?.branchCount ?? 0;
  if (branchCount === 0) {
    await remcardFetch("/api/pro/organization/branches", {
      method: "POST",
      body: {
        city: draft.city.trim(),
        address: draft.branchAddress.trim(),
        storeCategories: draft.storeCategories,
      },
    });
  }

  return (await fetchOwnerOrganization()) ?? currentOrg;
}

export async function persistProfileDraft(
  profile: ProProfileResponse,
  draft: ProfileDraft,
): Promise<ProProfileResponse> {
  const validationError = validateProfileDraft(draft, profile);
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
      description: draft.description.trim() || null,
      partnerType: draft.partnerType,
      specializations: draft.partnerType === "MASTER" ? draft.specializations : undefined,
      storeCategories:
        draft.partnerType === "STORE" || draft.partnerType === "COMPANY"
          ? draft.storeCategories
          : undefined,
      website: draft.website.trim() || null,
      telegram: draft.telegram.trim() || null,
      publicEmail: draft.publicEmail.trim() || null,
      publicPhone: draft.publicPhone.trim() || null,
    },
  });

  const organization = await syncStoreOrganization(profile, draft);

  const refreshed = await remcardFetch<ProProfileResponse>("/api/pro/profile", { method: "GET" });
  return {
    ...refreshed,
    user: { ...refreshed.user, displayName: trimmedName },
    organization: organization ?? refreshed.organization,
  };
}

export async function submitProfileForModerationReview(
  profile: ProProfileResponse,
  draft: ProfileDraft,
): Promise<ProProfileResponse> {
  const saved = await persistProfileDraft(profile, draft);
  const payload = await remcardFetch<{ user: ProProfileResponse["user"] }>("/api/pro/profile", {
    method: "PATCH",
    body: { action: "submitForModeration" },
  });
  const refreshed = await remcardFetch<ProProfileResponse>("/api/pro/profile", { method: "GET" });
  return {
    ...refreshed,
    user: payload.user,
    organization: saved.organization ?? refreshed.organization,
  };
}
