import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import { persistCatalogDraftOnly } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, remcardFetch: vi.fn() };
});

function storeOrgProfile(overrides: {
  branchCount: number;
  publicCatalogBranchId?: string;
  publicCatalogCity?: string;
}): ProProfileResponse {
  return {
    organization: {
      id: "org-st",
      name: "Магазин",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: overrides.branchCount,
      publicCatalogBranchId: overrides.publicCatalogBranchId ?? "br-1",
      publicCatalogCity: overrides.publicCatalogCity ?? "Краснодар",
      storeCategories: [],
      specializations: [],
    },
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: false,
      draftPending: false,
    },
    programs: [],
    workingProfile: null,
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "Rep",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
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

describe("persistCatalogDraftOnly organization catalog city", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("STORE: PATCH primary branch city when branches exist", async () => {
    let branchCity = "Краснодар";
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { organization: { id: "org-st" } };
      }
      if (path === "/api/pro/organization/branches/br-1" && init?.method === "PATCH") {
        branchCity = (init.body as { city: string }).city;
        return { ok: true };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return storeOrgProfile({
          branchCount: 1,
          publicCatalogCity: branchCity,
        });
      }
      throw new Error(`Unexpected ${path} ${init?.method ?? "GET"}`);
    });

    const profile = storeOrgProfile({ branchCount: 1 });
    const draft = {
      ...profileDraftFromProfile(profile),
      catalogCity: "Казань",
      catalogTouched: { catalogCity: true },
    };

    const refreshed = await persistCatalogDraftOnly(profile, draft);
    expect(branchCity).toBe("Казань");
    expect(profileDraftFromProfile(refreshed).catalogCity).toBe("Казань");
  });

  it("COMPANY: POST first branch with city when no branches yet", async () => {
    const posted: { city?: string; address?: string } = {};
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { organization: { id: "org-co" } };
      }
      if (path === "/api/pro/organization/branches" && init?.method === "POST") {
        Object.assign(posted, init.body as { city: string; address: string });
        return { id: "br-new" };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return storeOrgProfile({
          branchCount: 1,
          publicCatalogBranchId: "br-new",
          publicCatalogCity: posted.city ?? "",
        });
      }
      throw new Error(`Unexpected ${path} ${init?.method ?? "GET"}`);
    });

    const profile = storeOrgProfile({ branchCount: 0, publicCatalogBranchId: undefined });
    profile.organization!.branchCount = 0;
    profile.organization!.publicCatalogBranchId = null;
    profile.organization!.publicCatalogCity = null;
    profile.user.partnerType = "COMPANY";
    profile.user.partnerActivities = ["COMPANY"];
    profile.organization!.partnerType = "COMPANY";

    const draft = {
      ...profileDraftFromProfile(profile),
      catalogCity: "Сочи",
      branchAddress: "ул. Морская 1",
      catalogTouched: { catalogCity: true },
    };

    await persistCatalogDraftOnly(profile, draft);
    expect(posted.city).toBe("Сочи");
    expect(posted.address).toBe("ул. Морская 1");
  });
});
