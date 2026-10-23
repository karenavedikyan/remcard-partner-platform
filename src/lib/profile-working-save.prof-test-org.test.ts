import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { persistWorkingProfileDraft } from "@/lib/profile-working-save";
import {
  baseProfTestProfile,
  createProfTestOrgTransport,
} from "@/lib/prof-test-org-transport.fixture";
import type { ProfileDraft } from "@/lib/profile-save";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
  };
});

function draftBase(partnerType: "STORE" | "COMPANY", overrides: Partial<ProfileDraft> = {}): ProfileDraft {
  return {
    displayName: "Алексей",
    city: "Краснодар",
    organizationName: partnerType === "STORE" ? "Магазин Юг" : "СтройКомпания",
    partnerType,
    specializations: [],
    storeCategories: partnerType === "STORE" ? ["doors"] : [],
    productCategoryIds: partnerType === "STORE" ? ["doors"] : [],
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
    ...overrides,
  };
}

describe("persistWorkingProfileDraft organization chain (prof-test STORE/COMPANY)", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("STORE: POST create then PATCH; auth/me + profile PATCH persist rep/city/contacts", async () => {
    const transport = createProfTestOrgTransport("STORE");
    vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);

    let profile = baseProfTestProfile("STORE");
    profile = await persistWorkingProfileDraft(
      profile,
      draftBase("STORE", { displayName: "Иван Петров", city: "Сочи" }),
    );
    expect(profile.user.displayName).toBe("Иван Петров");
    expect(profile.user.city).toBe("Сочи");
    expect(remcardFetch).toHaveBeenCalledWith("/api/auth/me", {
      method: "PATCH",
      body: { displayName: "Иван Петров" },
    });

    profile = await persistWorkingProfileDraft(
      profile,
      draftBase("STORE", {
        displayName: "Иван Петров",
        city: "Сочи",
        organizationName: "Магазин Юг 2",
        website: "https://shop-south.example",
        telegram: "@shop_south",
        productCategoryIds: ["doors", "plumbing"],
        partnershipContactName: "Мария",
        partnershipContactEmail: "m@example.com",
        areas: ["Краснодар", "Сочи"],
        partnerWorkMode: "BOTH",
      }),
    );

    expect(transport.getOrg()?.name).toBe("Магазин Юг 2");
    expect(profile.workingProfile?.partnershipContactName).toBe("Мария");
    expect(profile.workingProfile?.productCategoryIds).toEqual(["doors", "plumbing"]);
    expect(profile.workingProfile?.areas).toEqual(["Краснодар", "Сочи"]);
  });

  it("COMPANY: clear website/telegram via org PATCH; fresh GET empty", async () => {
    const transport = createProfTestOrgTransport("COMPANY");
    vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);

    let profile = baseProfTestProfile("COMPANY");
    profile = await persistWorkingProfileDraft(
      profile,
      draftBase("COMPANY", {
        website: "https://co.example",
        telegram: "@co",
      }),
    );
    profile = await persistWorkingProfileDraft(
      profile,
      draftBase("COMPANY", { website: "", telegram: "" }),
    );

    expect(transport.getOrg()?.website).toBeNull();
    const fresh = await transport.freshProfileGet();
    expect(fresh.organization?.telegram).toBeNull();
    expect(fresh.organization?.website).toBeNull();
  });

  it("surfaces 403 org write errors without masking as auth loss", async () => {
    const profile = baseProfTestProfile("COMPANY");
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

    await expect(persistWorkingProfileDraft(profile, draftBase("COMPANY"))).rejects.toMatchObject({
      status: 403,
    });
  });
});
