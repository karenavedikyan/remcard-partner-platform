import { describe, expect, it } from "vitest";
import {
  formatAreasForTextField,
  normalizeAreasList,
  parseAreasFromText,
  resolveWorkingAreasForDraft,
} from "./profile-working-areas";
import { isWorkingProfileDirty, profileDraftFromProfile } from "./profile-draft-sync";
import type { ProProfileResponse } from "./types";

const PRODUCTION_LEGACY_AREAS = ["Краснодар, Анапа, Новороссийск"];

describe("profile-working-areas", () => {
  it("splits legacy production comma-separated row into tokens", () => {
    expect(normalizeAreasList(PRODUCTION_LEGACY_AREAS)).toEqual([
      "Краснодар",
      "Анапа",
      "Новороссийск",
    ]);
  });

  it("treats comma, newline, and semicolon as equivalent separators in text", () => {
    const canonical = ["Краснодар", "Анапа", "Новороссийск"];
    expect(parseAreasFromText("Краснодар, Анапа, Новороссийск")).toEqual(canonical);
    expect(parseAreasFromText("Краснодар\nАнапа\nНовороссийск")).toEqual(canonical);
    expect(parseAreasFromText("Краснодар; Анапа; Новороссийск")).toEqual(canonical);
    expect(normalizeAreasList(parseAreasFromText("Краснодар; Анапа\nНовороссийск"))).toEqual(
      canonical,
    );
  });

  it("formats textarea from legacy server array like the profile form", () => {
    expect(formatAreasForTextField(PRODUCTION_LEGACY_AREAS)).toBe(
      "Краснодар\nАнапа\nНовороссийск",
    );
  });

  it("matches baseline draft to parsed textarea for legacy GET", () => {
    const baseProfile: ProProfileResponse = {
      organization: null,
      programs: [],
      workingProfile: {
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        effectiveProductCategoryIds: [],
        effectiveServiceSpecializationIds: [],
        partnerSearchVisible: false,
        partnerSearchOptIn: false,
        partnerSearchOptInExplicit: false,
        workingProductDirectionsTouched: false,
        workingServiceDirectionsTouched: false,
        workingNavigatorStagesTouched: false,
        partnerWorkMode: null,
        areas: PRODUCTION_LEGACY_AREAS,
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
    const saved = profileDraftFromProfile(baseProfile);
    const current = {
      ...saved,
      areas: parseAreasFromText(formatAreasForTextField(PRODUCTION_LEGACY_AREAS)),
    };
    expect(isWorkingProfileDirty(saved, current)).toBe(false);
  });

  it("resolveWorkingAreasForDraft prefers working row when present (including empty)", () => {
    expect(resolveWorkingAreasForDraft({ areas: [] }, ["User-only"])).toEqual([]);
    expect(resolveWorkingAreasForDraft(undefined, ["User-only"])).toEqual(["User-only"]);
  });
});
