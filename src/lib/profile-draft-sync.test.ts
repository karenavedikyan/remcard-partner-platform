import { describe, expect, it } from "vitest";
import { isWorkingProfileDirty, profileDraftFromProfile, profileDraftsEqual } from "./profile-draft-sync";
import type { ProProfileResponse } from "@/lib/types";

const baseProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Иван",
    city: "Москва",
    specializations: ["L1-0"],
    role: "PRO",
    partnerType: "MASTER",
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

describe("profile-draft-sync", () => {
  it("detects dirty display name", () => {
    const saved = profileDraftFromProfile(baseProfile);
    const dirty = { ...saved, displayName: "Несохраненное имя" };
    expect(isWorkingProfileDirty(saved, dirty)).toBe(true);
  });

  it("treats equal drafts as clean", () => {
    const saved = profileDraftFromProfile(baseProfile);
    expect(profileDraftsEqual(saved, { ...saved })).toBe(true);
  });

  it("uses organization catalog directions, not owner user arrays", () => {
    const profile: ProProfileResponse = {
      ...baseProfile,
      catalogPublication: {
        catalogEntity: "organization",
        isLivePublic: false,
        draftPending: false,
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
        ...baseProfile.user,
        partnerType: "STORE",
        specializations: ["electrician"],
        storeCategories: ["plumbing"],
        description: "Owner personal",
        telegram: "https://t.me/owner",
      },
      organization: {
        id: "org-1",
        name: "Shop",
        catalogStatus: "DRAFT",
        partnerType: "STORE",
        branchCount: 1,
        description: "Org desc",
        website: "https://shop.ru",
        storeCategories: ["doors"],
        specializations: ["tiles"],
        telegram: "@shop",
        publicEmail: "shop@test.ru",
        publicPhone: "+79001112233",
      },
    };
    const draft = profileDraftFromProfile(profile);
    expect(draft.specializations).toEqual(["tiles"]);
    expect(draft.storeCategories).toEqual(["doors"]);
    expect(draft.description).toBe("Org desc");
    expect(draft.telegram).toBe("@shop");
    expect(draft.specializations).not.toContain("electrician");
  });

  it("keeps empty organization specialization list without owner fallback", () => {
    const profile: ProProfileResponse = {
      ...baseProfile,
      catalogPublication: {
        catalogEntity: "organization",
        isLivePublic: false,
        draftPending: false,
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
        ...baseProfile.user,
        partnerType: "COMPANY",
        specializations: ["electrician"],
      },
      organization: {
        id: "org-2",
        name: "Co",
        catalogStatus: "DRAFT",
        partnerType: "COMPANY",
        branchCount: 0,
        specializations: [],
        storeCategories: ["doors"],
      },
    };
    const draft = profileDraftFromProfile(profile);
    expect(draft.specializations).toEqual([]);
    expect(draft.storeCategories).toEqual(["doors"]);
  });
});
