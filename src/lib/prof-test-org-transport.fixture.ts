import type { ProProfileResponse, WorkingProfileDto } from "@/lib/types";

export type ProfTestOrgRecord = {
  id: string;
  name: string;
  partnerType: "STORE" | "COMPANY";
  website: string | null;
  telegram: string | null;
  catalogStatus: "DRAFT";
  catalogPublished: false;
  ownerId: string;
};

export function baseProfTestProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  return {
    organization: null,
    programs: [],
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      effectiveProductCategoryIds: [],
      effectiveServiceSpecializationIds: [],
      effectiveNavigatorStageIds: [],
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      workingDirectionsTouched: false,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    user: {
      id: `u-${partnerType.toLowerCase()}-prof-test`,
      publicId: partnerType === "STORE" ? "RC-TEST-STORE" : "RC-TEST-COMPANY",
      displayName: "Алексей",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType,
      partnerActivities: [partnerType],
      description: null,
      catalogStatus: "DRAFT",
      isPublic: false,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      storeCategories: [],
      areas: [],
      website: null,
      telegram: null,
      whatsapp: null,
      instagram: null,
      vk: null,
      max: null,
      yandex: null,
      publicEmail: null,
      publicPhone: null,
      showFullName: false,
    },
  };
}

function ensureWorkingProfile(profile: ProProfileResponse): WorkingProfileDto {
  if (!profile.workingProfile) {
    profile.workingProfile = baseProfTestProfile("STORE").workingProfile!;
  }
  return profile.workingProfile;
}

function applyWorkingProfilePatch(profile: ProProfileResponse, body: Record<string, unknown>) {
  const wp = ensureWorkingProfile(profile);
  if (body.city !== undefined) profile.user.city = String(body.city);
  if (body.partnerWorkMode !== undefined) {
    wp.partnerWorkMode = body.partnerWorkMode === null ? null : String(body.partnerWorkMode);
  }
  if (Array.isArray(body.productCategoryIds)) {
    wp.productCategoryIds = body.productCategoryIds.map(String);
    wp.effectiveProductCategoryIds = [...wp.productCategoryIds];
  }
  if (Array.isArray(body.serviceSpecializationIds)) {
    wp.serviceSpecializationIds = body.serviceSpecializationIds.map(String);
    wp.effectiveServiceSpecializationIds = [...wp.serviceSpecializationIds];
  }
  if (Array.isArray(body.navigatorStageIds)) {
    wp.navigatorStageIds = body.navigatorStageIds.map(String);
    wp.effectiveNavigatorStageIds = [...wp.navigatorStageIds];
  }
  if (body.primaryDirection !== undefined) {
    wp.primaryDirection = body.primaryDirection as WorkingProfileDto["primaryDirection"];
  }
  if (Array.isArray(body.areas)) {
    wp.areas = body.areas.map(String);
    profile.user.areas = [...wp.areas];
  }
  if (body.partnershipContactName !== undefined) {
    wp.partnershipContactName =
      body.partnershipContactName === null ? null : String(body.partnershipContactName);
  }
  if (body.partnershipContactPhone !== undefined) {
    wp.partnershipContactPhone =
      body.partnershipContactPhone === null ? null : String(body.partnershipContactPhone);
  }
  if (body.partnershipContactEmail !== undefined) {
    wp.partnershipContactEmail =
      body.partnershipContactEmail === null ? null : String(body.partnershipContactEmail);
  }
  if (body.website !== undefined && !profile.organization) {
    profile.user.website = body.website === null ? null : String(body.website);
  }
  if (body.telegram !== undefined && !profile.organization) {
    profile.user.telegram = body.telegram === null ? null : String(body.telegram);
  }
}

/** Stateful in-memory transport for prof-test org save integration tests. */
export function createProfTestOrgTransport(partnerType: "STORE" | "COMPANY") {
  const ownerId = `u-${partnerType.toLowerCase()}-prof-test`;
  let org: ProfTestOrgRecord | null = null;
  let profile = baseProfTestProfile(partnerType);

  function syncProfileFromOrg() {
    if (!org) {
      profile = { ...profile, organization: null };
      return;
    }
    profile = {
      ...profile,
      organization: {
        id: org.id,
        name: org.name,
        catalogStatus: org.catalogStatus,
        partnerType: org.partnerType,
        branchCount: 0,
        catalogPublished: org.catalogPublished,
        website: org.website,
        telegram: org.telegram,
      },
      user: {
        ...profile.user,
        website: org.website,
        telegram: org.telegram,
      },
    };
  }

  async function handleRemcardFetch(path: string, init?: { method?: string; body?: unknown }) {
    if (path === "/api/auth/me" && init?.method === "PATCH") {
      const body = init.body as { displayName?: string };
      if (body.displayName !== undefined) {
        profile.user.displayName = body.displayName.trim();
      }
      return { user: { displayName: profile.user.displayName } };
    }
    if (path === "/api/pro/organization" && init?.method === "GET") {
      syncProfileFromOrg();
      return {
        organization: org
          ? {
              id: org.id,
              name: org.name,
              partnerType: org.partnerType,
              catalogStatus: org.catalogStatus,
              catalogPublished: org.catalogPublished,
              website: org.website,
              telegram: org.telegram,
              ownerId: org.ownerId,
            }
          : null,
      };
    }
    if (path === "/api/pro/organization" && init?.method === "POST") {
      const body = init.body as Record<string, unknown>;
      org = {
        id: `org-${partnerType.toLowerCase()}-1`,
        name: String(body.name),
        partnerType,
        website: (body.website as string | null | undefined) ?? null,
        telegram: (body.telegram as string | null | undefined) ?? null,
        catalogStatus: "DRAFT",
        catalogPublished: false,
        ownerId,
      };
      syncProfileFromOrg();
      return { id: org.id, name: org.name };
    }
    if (path === "/api/pro/organization" && init?.method === "PATCH") {
      const body = init.body as Record<string, unknown>;
      if (!org) throw new Error("PATCH without org");
      if (body.name !== undefined) org.name = String(body.name);
      if (body.website !== undefined) org.website = (body.website as string | null) ?? null;
      if (body.telegram !== undefined) org.telegram = (body.telegram as string | null) ?? null;
      syncProfileFromOrg();
      return { organization: profile.organization };
    }
    if (path === "/api/pro/profile" && init?.method === "PATCH") {
      applyWorkingProfilePatch(profile, (init.body ?? {}) as Record<string, unknown>);
      syncProfileFromOrg();
      return { user: profile.user };
    }
    if (path === "/api/pro/profile" && init?.method === "GET") {
      syncProfileFromOrg();
      return structuredClone(profile);
    }
    throw new Error(`unexpected fetch ${path} ${init?.method ?? "GET"}`);
  }

  async function freshProfileGet() {
    return handleRemcardFetch("/api/pro/profile", { method: "GET" }) as Promise<ProProfileResponse>;
  }

  return {
    ownerId,
    getOrg: () => org,
    getProfile: () => structuredClone(profile),
    setProfile: (next: ProProfileResponse) => {
      profile = next;
    },
    handleRemcardFetch,
    freshProfileGet,
    syncProfileFromOrg,
  };
}
