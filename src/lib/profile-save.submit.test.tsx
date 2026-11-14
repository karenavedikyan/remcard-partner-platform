import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProProfileResponse } from "@/lib/types";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, message: string, body: unknown = null) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

vi.mock("@/lib/onboarding-save", () => ({
  saveDisplayNameViaAuthMe: vi.fn().mockResolvedValue("Rep"),
}));

import { persistProfileDraft, submitProfileForModerationReview, validateProfileDraft, type ProfileDraft } from "./profile-save";

const profile: ProProfileResponse = {
  organization: {
    id: "o1",
    name: "Shop",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 0,
  },
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Rep",
    city: "Москва",
    specializations: [],
    role: "PRO",
    partnerType: "STORE",
    description: null,
    catalogStatus: "DRAFT",
    isPublic: false,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: ["doors"],
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

const draft: ProfileDraft = {
  displayName: "Rep",
  city: "Москва",
  catalogCity: "",
  partnerActivities: ["STORE"],
  description: "",
  partnerType: "STORE",
  specializations: [],
  storeCategories: ["doors"],
  organizationName: "Shop",
  branchAddress: "ул. Тестовая 1",
  website: "",
  telegram: "",
  publicEmail: "",
  publicPhone: "",
  catalogPublicName: "Rep",
  showFullName: false,
  catalogImageUrl: "",
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
};

function mockHappyPath() {
  remcardFetch.mockImplementation(
    async (path: string, opts?: { method?: string; body?: Record<string, unknown> }) => {
      if (path === "/api/pro/profile" && opts?.method === "PATCH" && !opts.body?.action) {
        return { user: profile.user };
      }
      if (path === "/api/pro/organization/submit-for-moderation" && opts?.method === "POST") {
        return { ok: true };
      }
      if (path === "/api/pro/organization" && opts?.method === "GET") {
        return {
          organization: {
            id: "o1",
            name: "Shop",
            catalogStatus: "DRAFT",
            partnerType: "STORE",
            branches: [],
          },
        };
      }
      if (path === "/api/pro/organization" && opts?.method === "PATCH") {
        return { organization: profile.organization };
      }
      if (path === "/api/pro/organization/branches" && opts?.method === "POST") {
        return { branch: { id: "b1" } };
      }
      if (path === "/api/pro/profile" && opts?.method === "GET") {
        return {
          ...profile,
          organization: { ...profile.organization!, catalogStatus: "PENDING" },
        };
      }
      return {};
    },
  );
}

describe("submitProfileForModerationReview", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
  });

  for (const partnerType of ["STORE", "COMPANY"] as const) {
    it(`${partnerType}: zero branches and empty address submit without branch writes`, async () => {
      mockHappyPath();
      const branchless = { ...profile, user: { ...profile.user, partnerType },
        organization: { ...profile.organization!, partnerType } };
      const branchlessDraft = { ...draft, partnerType, branchAddress: "" };
      const result = await submitProfileForModerationReview(branchless, branchlessDraft);
      expect(result.submitAccepted).toBe(true);
      expect(remcardFetch.mock.calls.some(([path]) => String(path).includes("/branches"))).toBe(false);
      expect(remcardFetch).toHaveBeenCalledWith("/api/pro/organization/submit-for-moderation",
        expect.objectContaining({ method: "POST" }));
    });

    it(`${partnerType}: legacy save accepts no branch and never creates an empty one`, async () => {
      mockHappyPath();
      const branchlessDraft = { ...draft, partnerType, branchAddress: "" };
      expect(validateProfileDraft(branchlessDraft, profile)).toBeNull();
      await persistProfileDraft(profile, branchlessDraft);
      expect(remcardFetch.mock.calls.some(([path]) => String(path).includes("/branches"))).toBe(false);
    });
  }

  it("returns fresh GET profile with PENDING organization after submit", async () => {
    mockHappyPath();
    const result = await submitProfileForModerationReview(profile, draft);
    expect(result.submitAccepted).toBe(true);
    expect(result.profile?.organization?.catalogStatus).toBe("PENDING");
    expect(result.refreshFailed).toBeUndefined();
  });

  it("reports submit accepted when refresh GET fails", async () => {
    let profileGetCount = 0;
    remcardFetch.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === "/api/pro/organization" && opts?.method === "PATCH") {
        return { organization: profile.organization };
      }
      if (path === "/api/pro/organization" && opts?.method === "GET") {
        return { organization: { ...profile.organization!, branches: [] } };
      }
      if (path === "/api/pro/organization/submit-for-moderation" && opts?.method === "POST") {
        return { ok: true };
      }
      if (path === "/api/pro/profile" && opts?.method === "GET") {
        profileGetCount += 1;
        if (profileGetCount >= 2) {
          throw new Error("network");
        }
        return { ...profile, organization: profile.organization };
      }
      return {};
    });

    const result = await submitProfileForModerationReview(profile, draft);
    expect(result.submitAccepted).toBe(true);
    expect(result.refreshFailed).toBe(true);
    expect(result.profile).toBeNull();
  });

  it("throws when submit POST fails", async () => {
    remcardFetch.mockImplementation(async (path: string, opts?: { method?: string; body?: Record<string, unknown> }) => {
      if (path === "/api/pro/profile" && opts?.method === "PATCH" && !opts.body?.action) {
        return { user: profile.user };
      }
      if (path === "/api/pro/organization/submit-for-moderation" && opts?.method === "POST") {
        throw new Error("submit failed");
      }
      if (path === "/api/pro/organization" && opts?.method === "PATCH") {
        return { organization: profile.organization };
      }
      if (path === "/api/pro/organization" && opts?.method === "GET") {
        return { organization: { ...profile.organization!, branches: [] } };
      }
      return {};
    });
    await expect(submitProfileForModerationReview(profile, draft)).rejects.toThrow("submit failed");
  });
});
