import type { ProProfileResponse } from "@/lib/types";

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

/** Stateful in-memory transport for prof-test org save integration tests. */
export function createProfTestOrgTransport(partnerType: "STORE" | "COMPANY") {
  const ownerId = `u-${partnerType.toLowerCase()}-prof-test`;
  let org: ProfTestOrgRecord | null = null;
  let profile = baseProfTestProfile(partnerType);

  function syncProfileFromOrg() {
    if (!org) {
      profile = { ...profile, organization: null };
      profile.user.website = null;
      profile.user.telegram = null;
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
      syncProfileFromOrg();
      return { user: profile.user };
    }
    if (path === "/api/pro/profile" && init?.method === "GET") {
      syncProfileFromOrg();
      return profile;
    }
    throw new Error(`unexpected fetch ${path} ${init?.method ?? "GET"}`);
  }

  return {
    ownerId,
    getOrg: () => org,
    getProfile: () => profile,
    setProfile: (next: ProProfileResponse) => {
      profile = next;
    },
    handleRemcardFetch,
    syncProfileFromOrg,
  };
}
