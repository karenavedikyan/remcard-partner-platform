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

import { submitProfileForModerationReview, type ProfileDraft } from "./profile-save";

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

describe("submitProfileForModerationReview", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
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
            catalogPublication: { catalogEntity: "organization", isLivePublic: false, draftPending: false, published: {} },
            organization: { ...profile.organization!, catalogStatus: "PENDING" },
          };
        }
        return {};
      },
    );
  });

  it("returns fresh GET profile with PENDING organization after submit", async () => {
    const result = await submitProfileForModerationReview(profile, draft);
    expect(result.organization?.catalogStatus).toBe("PENDING");
    const getCalls = remcardFetch.mock.calls.filter(
      ([path, opts]) => path === "/api/pro/profile" && opts?.method === "GET",
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(1);
  });
});
