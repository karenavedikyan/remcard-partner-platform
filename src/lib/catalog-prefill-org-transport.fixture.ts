import type { ProProfileResponse } from "@/lib/types";
import { createProfTestOrgTransport, type ProfTestOrgRecord } from "@/lib/prof-test-org-transport.fixture";

export function catalogPrefillBusinessOrgProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  return {
    organization: {
      id: `org-${partnerType.toLowerCase()}`,
      name: partnerType === "STORE" ? "Магазин Синт" : "Компания Синт",
      catalogStatus: "DRAFT",
      partnerType,
      branchCount: 0,
      publicCatalogCity: "",
      storeCategories: [],
      specializations: [],
      website: "https://org-site.example",
      telegram: "@org_public",
      publicEmail: "",
      publicPhone: "",
    },
    programs: [],
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: false,
      draftPending: false,
      published: {
        description: null,
        specializations: [],
        storeCategories: [],
        catalogPublicName: null,
        catalogCity: null,
        website: null,
        telegram: null,
      },
    },
    workingProfile: {
      productCategoryIds: ["doors"],
      serviceSpecializationIds: ["mount"],
      navigatorStageIds: ["L1-7"],
      effectiveProductCategoryIds: ["doors"],
      effectiveServiceSpecializationIds: ["mount"],
      effectiveNavigatorStageIds: ["L1-7"],
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      workingProductDirectionsTouched: false,
      workingServiceDirectionsTouched: false,
      workingNavigatorStagesTouched: false,
      workingDirectionsTouched: false,
      partnerWorkMode: "ON_SITE",
      areas: [],
      partnershipContactName: "Представитель",
      partnershipContactPhone: "+79001234567",
      partnershipContactEmail: "catalog-prefill@example.com",
    },
    user: {
      id: `u-${partnerType.toLowerCase()}`,
      role: "PRO",
      partnerType,
      partnerActivities: [partnerType],
      displayName: "Представитель",
      city: "Сочи",
      catalogCity: "",
      catalogStatus: "DRAFT",
      publicId: "RC-PREFILL",
      specializations: [],
      storeCategories: [],
      website: "https://user-only.example",
      telegram: "@user_only",
      catalogDraft: { navigatorStageIds: ["L1-7"] },
    },
  } as unknown as ProProfileResponse;
}

export type OrgCatalogBackendState = {
  storeCategories: string[];
  specializations: string[];
  website: string | null;
  telegram: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  publicCatalogCity: string | null;
  catalogDraft: Record<string, unknown>;
  catalogPublished: boolean;
  catalogStatus: "DRAFT" | "APPROVED" | "PENDING";
};

function defaultOrgCatalogState(): OrgCatalogBackendState {
  return {
    storeCategories: [],
    specializations: [],
    website: null,
    telegram: null,
    publicEmail: null,
    publicPhone: null,
    publicCatalogCity: null,
    catalogDraft: {},
    catalogPublished: false,
    catalogStatus: "DRAFT",
  };
}

function buildProfileResponse(
  partnerType: "STORE" | "COMPANY",
  org: ProfTestOrgRecord,
  profileUser: ProProfileResponse,
  catalog: OrgCatalogBackendState,
): ProProfileResponse {
  const draftStages = catalog.catalogDraft.navigatorStageIds;
  const stageIds = Array.isArray(draftStages)
    ? draftStages.filter((x): x is string => typeof x === "string")
    : [];

  return {
    ...profileUser,
    organization: {
      id: org.id,
      name: org.name,
      catalogStatus: catalog.catalogStatus,
      partnerType: org.partnerType,
      branchCount: 0,
      catalogPublished: catalog.catalogPublished,
      website: catalog.website,
      telegram: catalog.telegram,
      publicEmail: catalog.publicEmail,
      publicPhone: catalog.publicPhone,
      publicCatalogCity: catalog.publicCatalogCity ?? "",
      storeCategories: [...catalog.storeCategories],
      specializations: [...catalog.specializations],
      catalogDraft: Object.keys(catalog.catalogDraft).length ? catalog.catalogDraft : null,
      publicNavigatorStageIds: stageIds,
    },
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: catalog.catalogPublished,
      draftPending: Boolean(catalog.catalogDraft.catalogDraftPending),
      published: {
        description: null,
        specializations: [],
        storeCategories: [],
        website: null,
        telegram: null,
        publicEmail: null,
        publicPhone: null,
      },
    },
    user: {
      ...profileUser.user,
      partnerType,
      partnerActivities: [partnerType],
      website: profileUser.user.website,
      telegram: profileUser.user.telegram,
    },
  };
}

/** Stateful transport: working profile + org catalog PATCH/GET for ProfileEditor integration. */
export function createCatalogPrefillOrgTransport(partnerType: "STORE" | "COMPANY") {
  const base = createProfTestOrgTransport(partnerType);
  let catalog = defaultOrgCatalogState();

  async function handleRemcardFetch(path: string, init?: { method?: string; body?: unknown }) {
    if (path === "/api/pro/moderation-notes") return { notes: [] };
    if (path === "/api/pro/organization/branches" && init?.method === "POST") {
      const body = init.body as { city?: string; address?: string };
      if (body.city) catalog.publicCatalogCity = String(body.city);
      return { branch: { id: "br-1" } };
    }
    if (path === "/api/pro/organization" && init?.method === "PATCH") {
      const body = (init.body ?? {}) as Record<string, unknown>;
      if (body.storeCategories !== undefined) {
        catalog.storeCategories = [...(body.storeCategories as string[])];
      }
      if (body.specializations !== undefined) {
        catalog.specializations = [...(body.specializations as string[])];
      }
      if (body.website !== undefined) catalog.website = (body.website as string | null) ?? null;
      if (body.telegram !== undefined) catalog.telegram = (body.telegram as string | null) ?? null;
      if (body.publicEmail !== undefined) {
        catalog.publicEmail = (body.publicEmail as string | null) ?? null;
      }
      if (body.publicPhone !== undefined) {
        catalog.publicPhone = (body.publicPhone as string | null) ?? null;
      }
      if (body.navigatorStageIds !== undefined) {
        catalog.catalogDraft = {
          ...catalog.catalogDraft,
          navigatorStageIds: [...(body.navigatorStageIds as string[])],
        };
      }
      const touched = body.catalogTouched as Record<string, boolean> | undefined;
      if (touched && Object.keys(touched).length > 0) {
        const prev = (catalog.catalogDraft.catalogTouched ?? {}) as Record<string, boolean>;
        catalog.catalogDraft = {
          ...catalog.catalogDraft,
          catalogTouched: { ...prev, ...touched },
        };
      }
      return base.handleRemcardFetch(path, init);
    }
    if (path === "/api/pro/profile" && init?.method === "GET") {
      const org = base.getOrg();
      const profileUser = base.getProfile();
      if (!org) return structuredClone(profileUser);
      return buildProfileResponse(partnerType, org, profileUser, catalog);
    }
    return base.handleRemcardFetch(path, init);
  }

  async function freshProfileGet(): Promise<ProProfileResponse> {
    return handleRemcardFetch("/api/pro/profile", { method: "GET" }) as Promise<ProProfileResponse>;
  }

  async function seedOrgWithWorkingDefaults(name: string, workingCity: string) {
    const profile = structuredClone(catalogPrefillBusinessOrgProfile(partnerType));
    profile.user.city = workingCity;
    profile.organization!.name = name;
    await base.handleRemcardFetch("/api/pro/organization", {
      method: "POST",
      body: {
        name,
        partnerType,
        website: profile.organization!.website,
        telegram: profile.organization!.telegram,
      },
    });
    base.setProfile(profile);
    catalog = {
      ...defaultOrgCatalogState(),
      website: profile.organization!.website ?? null,
      telegram: profile.organization!.telegram ?? null,
    };
  }

  return {
    ...base,
    getCatalogState: () => structuredClone(catalog),
    setCatalogState: (next: OrgCatalogBackendState) => {
      catalog = next;
    },
    handleRemcardFetch,
    freshProfileGet,
    seedOrgWithWorkingDefaults,
  };
}
