import { describe, expect, it, vi, beforeEach } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import { persistWorkingProfileDraft } from "@/lib/profile-working-save";
import type { ProProfileResponse } from "@/lib/types";
import { buildWorkingProfilePatchBody } from "@/lib/working-profile-patch";

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

function storeOrgProfile(overrides: {
  website?: string | null;
  telegram?: string | null;
}): ProProfileResponse {
  return {
    organization: {
      id: "org-1",
      name: "Оптовик",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: 1,
      website: overrides.website ?? null,
      telegram: overrides.telegram ?? null,
      storeCategories: [],
    },
    catalogPublication: { catalogEntity: "organization" as const, isLivePublic: false },
    programs: [],
    workingProfile: {
      productCategoryIds: ["doors"],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      effectiveProductCategoryIds: ["doors"],
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
      id: "u1",
      publicId: "RC1",
      displayName: "Иван",
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
      website: "https://user-should-not-win.example",
      telegram: "@user",
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

function baseDraft(profile: ProProfileResponse) {
  return profileDraftFromProfile(profile);
}

describe("organization website/telegram working save", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("routes website and telegram to organization PATCH, not profile PATCH", async () => {
    const initial = storeOrgProfile({ website: null, telegram: null });
    let orgWebsite: string | null = null;
    let orgTelegram: string | null = null;

    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "GET") {
        return { organization: initial.organization };
      }
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        const body = init.body as { website?: string | null; telegram?: string | null };
        if (body.website !== undefined) orgWebsite = body.website;
        if (body.telegram !== undefined) orgTelegram = body.telegram;
        return { ok: true };
      }
      if (path === "/api/pro/profile" && init?.method === "PATCH") {
        const body = init.body as Record<string, unknown>;
        expect(body.website).toBeUndefined();
        expect(body.telegram).toBeUndefined();
        return { user: initial.user };
      }
      if (path === "/api/pro/profile" && (!init?.method || init.method === "GET")) {
        return {
          ...initial,
          organization: {
            ...initial.organization!,
            website: orgWebsite,
            telegram: orgTelegram,
          },
        };
      }
      throw new Error(`Unexpected ${init?.method ?? "GET"} ${path}`);
    });

    const draft = {
      ...baseDraft(initial),
      website: "https://shop.example",
      telegram: "@shop",
    };
    const refreshed = await persistWorkingProfileDraft(initial, draft);
    expect(orgWebsite).toBe("https://shop.example");
    expect(orgTelegram).toBe("@shop");
    const hydrated = profileDraftFromProfile(refreshed);
    expect(hydrated.website).toBe("https://shop.example");
    expect(hydrated.telegram).toBe("@shop");
  });

  it("supports explicit clearing on organization entity", async () => {
    const initial = storeOrgProfile({ website: "https://old.example", telegram: "@old" });
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/pro/organization" && init?.method === "GET") {
        return { organization: initial.organization };
      }
      if (path === "/api/pro/organization" && init?.method === "PATCH") {
        return { ok: true };
      }
      if (path === "/api/pro/profile" && init?.method === "PATCH") {
        return { user: initial.user };
      }
      if (path === "/api/pro/profile") {
        return {
          ...initial,
          organization: { ...initial.organization!, website: null, telegram: null },
        };
      }
      throw new Error(`Unexpected call ${path}`);
    });

    const draft = { ...baseDraft(initial), website: "", telegram: "" };
    const refreshed = await persistWorkingProfileDraft(initial, draft);
    expect(profileDraftFromProfile(refreshed).website).toBe("");
    expect(profileDraftFromProfile(refreshed).telegram).toBe("");
  });

  it("buildWorkingProfilePatchBody omits org-owned website fields", () => {
    const profile = storeOrgProfile({ website: null, telegram: null });
    const body = buildWorkingProfilePatchBody(profile, {
      ...baseDraft(profile),
      website: "https://new.example",
      telegram: "@new",
    });
    expect(body.website).toBeUndefined();
    expect(body.telegram).toBeUndefined();
  });
});
