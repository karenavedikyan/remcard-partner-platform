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
  publicCatalogBranchId?: string | null;
  publicCatalogCity?: string | null;
  catalogStatus?: "DRAFT" | "APPROVED" | "PENDING";
}): ProProfileResponse {
  return {
    organization: {
      id: "org-st",
      name: "Магазин",
      catalogStatus: overrides.catalogStatus ?? "DRAFT",
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

  it("description-only save does not PATCH branch city", async () => {
    const branchPatches: unknown[] = [];
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { organization: { id: "org-st" } };
      }
      if (typeof path === "string" && path.includes("/branches/") && init?.method === "PATCH") {
        branchPatches.push(init.body);
        return { ok: true };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return storeOrgProfile({ branchCount: 1 });
      }
      throw new Error(`Unexpected ${path} ${init?.method ?? "GET"}`);
    });

    const profile = storeOrgProfile({ branchCount: 1 });
    const draft = {
      ...profileDraftFromProfile(profile),
      description: "Новое описание",
      catalogTouched: { description: true },
    };

    await persistCatalogDraftOnly(profile, draft);
    expect(branchPatches).toEqual([]);
  });

  it("PATCH branch city and pin branch when catalogCity touched and changed", async () => {
    let branchCity = "Краснодар";
    let orgPin: string | undefined;
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        orgPin = (init.body as { publicCatalogBranchId?: string }).publicCatalogBranchId;
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
    expect(orgPin).toBe("br-1");
    expect(profileDraftFromProfile(refreshed).catalogCity).toBe("Казань");
  });

  it("does not PATCH branch when catalogCity touched but unchanged", async () => {
    const branchPatches: unknown[] = [];
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { organization: { id: "org-st" } };
      }
      if (typeof path === "string" && path.includes("/branches/") && init?.method === "PATCH") {
        branchPatches.push(init.body);
        return { ok: true };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return storeOrgProfile({ branchCount: 1, publicCatalogCity: "Краснодар" });
      }
      throw new Error(`Unexpected ${path} ${init?.method ?? "GET"}`);
    });

    const profile = storeOrgProfile({ branchCount: 1, publicCatalogCity: "Краснодар" });
    const draft = {
      ...profileDraftFromProfile(profile),
      catalogCity: "Краснодар",
      catalogTouched: { catalogCity: true },
    };

    await persistCatalogDraftOnly(profile, draft);
    expect(branchPatches).toEqual([]);
  });

  it("two branches: save city on pinned branch survives authoritative GET reload", async () => {
    let pinnedId = "branch-a";
    const branchCities: Record<string, string> = {
      "branch-a": "Анапа",
      "branch-b": "Москва",
    };

    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        const body = init.body as { publicCatalogBranchId?: string };
        if (body.publicCatalogBranchId) pinnedId = body.publicCatalogBranchId;
        return { organization: { id: "org-st" } };
      }
      if (path === "/api/pro/organization/branches/branch-a" && init?.method === "PATCH") {
        branchCities["branch-a"] = (init.body as { city: string }).city;
        return { ok: true };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        const city = branchCities[pinnedId] ?? "Москва";
        return storeOrgProfile({
          branchCount: 2,
          publicCatalogBranchId: pinnedId,
          publicCatalogCity: city,
        });
      }
      throw new Error(`Unexpected ${path} ${init?.method ?? "GET"}`);
    });

    const profile = storeOrgProfile({
      branchCount: 2,
      publicCatalogBranchId: "branch-a",
      publicCatalogCity: "Анапа",
    });

    const draft = {
      ...profileDraftFromProfile(profile),
      catalogCity: "Ярославль",
      catalogTouched: { catalogCity: true },
    };

    const once = await persistCatalogDraftOnly(profile, draft);
    expect(branchCities["branch-a"]).toBe("Ярославль");
    expect(pinnedId).toBe("branch-a");

    const reloaded = await persistCatalogDraftOnly(once, profileDraftFromProfile(once));
    expect(reloaded.organization?.publicCatalogBranchId).toBe("branch-a");
    expect(reloaded.organization?.publicCatalogCity).toBe("Ярославль");
    expect(profileDraftFromProfile(reloaded).catalogCity).toBe("Ярославль");
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

    const profile = storeOrgProfile({ branchCount: 0, publicCatalogBranchId: null });
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

  it("APPROVED org: org PATCH stages catalog; branch PATCH updates live city on GET", async () => {
    let liveCity = "Краснодар";
    let orgDraftCity: string | null = null;
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        orgDraftCity = (init.body as { description?: string }).description
          ? liveCity
          : orgDraftCity;
        return { organization: { id: "org-st" } };
      }
      if (path === "/api/pro/organization/branches/br-1" && init?.method === "PATCH") {
        liveCity = (init.body as { city: string }).city;
        return { ok: true };
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return storeOrgProfile({
          branchCount: 1,
          catalogStatus: "APPROVED",
          publicCatalogCity: liveCity,
        });
      }
      throw new Error(`Unexpected ${path} ${init?.method ?? "GET"}`);
    });

    const profile = storeOrgProfile({ branchCount: 1, catalogStatus: "APPROVED" });
    const draft = {
      ...profileDraftFromProfile(profile),
      catalogCity: "Сочи",
      catalogTouched: { catalogCity: true },
    };

    const refreshed = await persistCatalogDraftOnly(profile, draft);
    expect(liveCity).toBe("Сочи");
    expect(refreshed.organization?.publicCatalogCity).toBe("Сочи");
  });

  it("branch PENDING: city PATCH surfaces API error (no silent fallback)", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { organization: { id: "org-st" } };
      }
      if (path === "/api/pro/organization/branches/br-1" && init?.method === "PATCH") {
        throw new Error("409 branch pending");
      }
      if (path === "/api/pro/profile" && init?.method === "GET") {
        return storeOrgProfile({ branchCount: 1 });
      }
      throw new Error(`Unexpected ${path} ${init?.method ?? "GET"}`);
    });

    const profile = storeOrgProfile({ branchCount: 1 });
    const draft = {
      ...profileDraftFromProfile(profile),
      catalogCity: "Новгород",
      catalogTouched: { catalogCity: true },
    };

    await expect(persistCatalogDraftOnly(profile, draft)).rejects.toThrow(/409 branch pending/);
  });
});
