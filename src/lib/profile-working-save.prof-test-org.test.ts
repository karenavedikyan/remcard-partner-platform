import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { saveDisplayNameViaAuthMe } from "@/lib/onboarding-save";
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

vi.mock("@/lib/onboarding-save", () => ({
  saveDisplayNameViaAuthMe: vi.fn(),
}));

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
    vi.mocked(saveDisplayNameViaAuthMe).mockResolvedValue(undefined);
  });

  it("STORE: POST create then PATCH update using refreshed profile between saves", async () => {
    const transport = createProfTestOrgTransport("STORE");
    let profile = baseProfTestProfile("STORE");
    vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);

    const first = await persistWorkingProfileDraft(profile, draftBase("STORE"));
    expect(transport.getOrg()?.name).toBe("Магазин Юг");
    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/organization", {
      method: "POST",
      body: expect.objectContaining({ name: "Магазин Юг", partnerType: "STORE" }),
    });

    profile = first;
    const second = await persistWorkingProfileDraft(
      profile,
      draftBase("STORE", {
        organizationName: "Магазин Юг 2",
        website: "https://shop-south.example",
        telegram: "@shop_south",
      }),
    );

    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/organization", {
      method: "PATCH",
      body: expect.objectContaining({
        name: "Магазин Юг 2",
        website: "https://shop-south.example",
        telegram: "@shop_south",
      }),
    });
    expect(transport.getOrg()?.name).toBe("Магазин Юг 2");
    expect(second.organization?.name).toBe("Магазин Юг 2");
    expect(
      remcardFetch.mock.calls.filter(
        (c) => c[0] === "/api/pro/organization" && c[1]?.method === "POST",
      ),
    ).toHaveLength(1);
  });

  it("COMPANY: two saves, clear website/telegram, GET state stays empty", async () => {
    const transport = createProfTestOrgTransport("COMPANY");
    let profile = baseProfTestProfile("COMPANY");
    vi.mocked(remcardFetch).mockImplementation(transport.handleRemcardFetch);

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
    expect(transport.getOrg()?.telegram).toBeNull();
    await expect(remcardFetch("/api/pro/organization", { method: "GET" })).resolves.toMatchObject({
      organization: expect.objectContaining({ website: null, telegram: null }),
    });
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
