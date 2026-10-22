import { describe, expect, it, vi, beforeEach } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { catalogTouchedFromProfile } from "@/lib/profile-catalog-touched";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import { persistCatalogDraftOnly } from "@/lib/profile-save";
import {
  markCatalogFieldTouched,
  mergeCatalogPrefill,
  workingProfileCatalogSeed,
} from "@/lib/specialist-r06/catalog-prefill";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, remcardFetch: vi.fn() };
});

/** In-memory org state mirroring navigator PATCH + GET profile contract. */
type OrgBackendState = {
  storeCategories: string[];
  catalogDraft: Record<string, unknown>;
};

function companyOrgProfile(
  org: Partial<ProProfileResponse["organization"]> & { storeCategories: string[] },
  workingProducts: string[],
): ProProfileResponse {
  return {
    organization: {
      id: "org-co",
      name: "Компания",
      catalogStatus: "DRAFT",
      partnerType: "COMPANY",
      branchCount: 1,
      ...org,
    },
    catalogPublication: { catalogEntity: "organization", isLivePublic: false, draftPending: false },
    programs: [],
    workingProfile: {
      productCategoryIds: workingProducts,
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      effectiveProductCategoryIds: workingProducts,
      effectiveServiceSpecializationIds: [],
      effectiveNavigatorStageIds: [],
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    user: {
      id: "u-co",
      publicId: "RC-CO",
      displayName: "Директор",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "COMPANY",
      partnerActivities: ["COMPANY"],
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

function wireOrgCatalogBackend(state: OrgBackendState) {
  vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
    if (path === "/api/pro/organization" && init?.method === "PATCH") {
      const body = (init.body ?? {}) as Record<string, unknown>;
      if (body.storeCategories !== undefined) {
        state.storeCategories = [...(body.storeCategories as string[])];
      }
      const touched = body.catalogTouched as Record<string, boolean> | undefined;
      if (touched && Object.keys(touched).length > 0) {
        const prev = (state.catalogDraft.catalogTouched ?? {}) as Record<string, boolean>;
        state.catalogDraft = {
          ...state.catalogDraft,
          catalogTouched: { ...prev, ...touched },
        };
      }
      return { organization: { id: "org-co" } };
    }
    if (path === "/api/pro/profile" && init?.method === "GET") {
      const profile = companyOrgProfile(
        {
          storeCategories: state.storeCategories,
          catalogDraft: state.catalogDraft,
        },
        ["doors"],
      );
      return profile;
    }
    throw new Error(`Unexpected remcardFetch ${String(path)} ${init?.method ?? "GET"}`);
  });
}

describe("organization catalog clear round-trip", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("persist + GET keeps empty storeCategories when user cleared public products", async () => {
    const state: OrgBackendState = {
      storeCategories: ["doors"],
      catalogDraft: {},
    };
    wireOrgCatalogBackend(state);

    const profile = companyOrgProfile({ storeCategories: ["doors"] }, ["doors"]);
    let touched = catalogTouchedFromProfile(profile);
    touched = markCatalogFieldTouched(touched, "storeCategories");

    const draft = {
      ...profileDraftFromProfile(profile),
      storeCategories: [] as string[],
      catalogTouched: touched,
    };

    const refreshed = await persistCatalogDraftOnly(profile, draft);
    expect(state.storeCategories).toEqual([]);
    expect(state.catalogDraft).toEqual({ catalogTouched: { storeCategories: true } });

    const hydratedDraft = profileDraftFromProfile(refreshed);
    expect(hydratedDraft.storeCategories).toEqual([]);

    const seed = workingProfileCatalogSeed(refreshed);
    expect(seed.storeCategories).toEqual(["doors"]);

    const merged = mergeCatalogPrefill(
      hydratedDraft,
      seed,
      catalogTouchedFromProfile(refreshed),
    );
    expect(merged.storeCategories).toEqual([]);
  });

  it("first open still pre-fills working products when catalog was never edited", () => {
    const profile = companyOrgProfile({ storeCategories: [] }, ["doors", "flooring"]);
    const touched = catalogTouchedFromProfile(profile);
    expect(touched).toEqual({});

    const current = profileDraftFromProfile(profile);
    expect(current.storeCategories).toEqual([]);

    const merged = mergeCatalogPrefill(
      current,
      workingProfileCatalogSeed(profile),
      touched,
    );
    expect(merged.storeCategories).toEqual(["doors", "flooring"]);
  });

  it("post-approve GET keeps empty public products despite working profile prefill seed", () => {
    const profile = companyOrgProfile(
      {
        storeCategories: [],
        catalogPublished: true,
        catalogStatus: "APPROVED",
        catalogDraft: null,
        specializations: ["plumbing"],
      },
      ["doors"],
    );
    profile.workingProfile!.serviceSpecializationIds = [];
    profile.workingProfile!.effectiveServiceSpecializationIds = [];

    const hydrated = profileDraftFromProfile(profile);
    expect(hydrated.storeCategories).toEqual([]);

    const merged = mergeCatalogPrefill(
      hydrated,
      workingProfileCatalogSeed(profile),
      catalogTouchedFromProfile(profile),
    );
    expect(merged.storeCategories).toEqual([]);
    expect(merged.specializations).toEqual(["plumbing"]);
  });

  it("explicit clear is not overwritten when working products change after save", async () => {
    const state: OrgBackendState = {
      storeCategories: [],
      catalogDraft: { catalogTouched: { storeCategories: true } },
    };
    wireOrgCatalogBackend(state);

    const profile = companyOrgProfile(
      { storeCategories: [], catalogDraft: state.catalogDraft },
      ["doors", "plumbing"],
    );

    const merged = mergeCatalogPrefill(
      profileDraftFromProfile(profile),
      workingProfileCatalogSeed(profile),
      catalogTouchedFromProfile(profile),
    );
    expect(merged.storeCategories).toEqual([]);
  });
});
