import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { saveDisplayNameViaAuthMe } from "@/lib/onboarding-save";
import { persistWorkingProfileDraft } from "@/lib/profile-working-save";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
  };
});

vi.mock("@/lib/onboarding-save", () => ({
  saveDisplayNameViaAuthMe: vi.fn(),
}));

function companyProfileWithoutOrg(): ProProfileResponse {
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
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    user: {
      id: "u-test-co",
      publicId: "RC-TEST",
      displayName: "Алексей",
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

describe("persistWorkingProfileDraft organization chain (prof-test STORE/COMPANY)", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(saveDisplayNameViaAuthMe).mockResolvedValue(undefined);
  });

  it("STORE: creates org via POST then PATCH on repeat save", async () => {
    const profile = companyProfileWithoutOrg();
    profile.user.partnerType = "STORE";
    profile.user.partnerActivities = ["STORE"];

    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "GET") {
        return { organization: null };
      }
      if (path === "/api/pro/organization" && init?.method === "POST") {
        return { id: "org-new", name: "Магазин Юг" };
      }
      if (path === "/api/pro/profile" && init?.method === "PATCH") {
        return { user: profile.user };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return {
          ...profile,
          organization: {
            id: "org-new",
            name: "Магазин Юг",
            catalogStatus: "DRAFT",
            partnerType: "STORE",
            branchCount: 0,
          },
        };
      }
      throw new RemcardApiError(500, "unexpected", null);
    });

    await persistWorkingProfileDraft(profile, {
      displayName: "Алексей",
      city: "Краснодар",
      organizationName: "Магазин Юг",
      partnerType: "STORE",
      specializations: [],
      storeCategories: ["doors"],
      productCategoryIds: ["doors"],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      primaryDirection: null,
      partnerSearchOptIn: false,
      partnerWorkMode: "",
      areas: [],
      partnershipContactName: "",
      partnershipContactPhone: "",
      partnershipContactEmail: "",
      description: "",
      website: "",
      telegram: "",
      publicEmail: "",
      publicPhone: "",
      catalogPublicName: "",
      showFullName: false,
      catalogImageUrl: "",
      branchAddress: "",
      partnerActivities: [],
    });

    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/organization", {
      method: "POST",
      body: expect.objectContaining({ name: "Магазин Юг", partnerType: "STORE" }),
    });
  });

  it("COMPANY: PATCH when org already exists", async () => {
    const profile = companyProfileWithoutOrg();
    profile.organization = {
      id: "org-co",
      name: "СтройКомпания",
      catalogStatus: "DRAFT",
      partnerType: "COMPANY",
      branchCount: 0,
    };
    profile.user.website = "https://old.example";
    profile.user.telegram = "@old";

    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "GET") {
        return { organization: profile.organization };
      }
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { organization: { ...profile.organization, name: "СтройКомпания Юг" } };
      }
      if (path === "/api/pro/profile" && init?.method === "PATCH") {
        return { user: profile.user };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return profile;
      }
      throw new RemcardApiError(500, "unexpected", null);
    });

    await persistWorkingProfileDraft(profile, {
      displayName: "Алексей",
      city: "Краснодар",
      organizationName: "СтройКомпания Юг",
      partnerType: "COMPANY",
      specializations: [],
      storeCategories: [],
      productCategoryIds: [],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      primaryDirection: null,
      partnerSearchOptIn: false,
      partnerWorkMode: "",
      areas: [],
      partnershipContactName: "",
      partnershipContactPhone: "",
      partnershipContactEmail: "",
      description: "",
      website: "https://new.example",
      telegram: "@new",
      publicEmail: "",
      publicPhone: "",
      catalogPublicName: "",
      showFullName: false,
      catalogImageUrl: "",
      branchAddress: "",
      partnerActivities: [],
    });

    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/organization", {
      method: "PATCH",
      body: expect.objectContaining({
        name: "СтройКомпания Юг",
        website: "https://new.example",
        telegram: "@new",
      }),
    });
    expect(remcardFetch).not.toHaveBeenCalledWith(
      "/api/pro/organization",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces 403 org write errors without masking as auth loss", async () => {
    const profile = companyProfileWithoutOrg();
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "GET") {
        return { organization: null };
      }
      if (path === "/api/pro/organization" && init?.method === "POST") {
        throw new RemcardApiError(403, "Поля недоступны в тестовом режиме", {
          code: "PROF_TEST_ORG_WRITE_FORBIDDEN",
        });
      }
      return {};
    });

    await expect(
      persistWorkingProfileDraft(profile, {
        displayName: "Алексей",
        city: "Краснодар",
        organizationName: "СтройКомпания",
        partnerType: "COMPANY",
        specializations: [],
        storeCategories: [],
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        partnerSearchOptIn: false,
        partnerWorkMode: "",
        areas: [],
        partnershipContactName: "",
        partnershipContactPhone: "",
        partnershipContactEmail: "",
        description: "",
        website: "",
        telegram: "",
        publicEmail: "",
        publicPhone: "",
        catalogPublicName: "",
        showFullName: false,
        catalogImageUrl: "",
        branchAddress: "",
        partnerActivities: [],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
