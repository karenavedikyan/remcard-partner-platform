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
});
