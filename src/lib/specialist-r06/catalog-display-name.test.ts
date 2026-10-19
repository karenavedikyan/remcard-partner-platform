import { describe, expect, it } from "vitest";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import { catalogPublicNameFromGetUser } from "./catalog-display-name";
import type { ProProfileUser } from "@/lib/types";

function user(overrides: Partial<ProProfileUser> = {}): ProProfileUser {
  return {
    id: "u1",
    publicId: "RC-1",
    displayName: "Актуальное рабочее имя",
    city: "Krasnodar",
    catalogDisplayName: "Старое регистрационное имя",
    catalogDisplayNameSource: "working_profile",
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
    ...overrides,
  };
}

describe("catalogPublicNameFromGetUser", () => {
  it("uses working displayName when source is working_profile", () => {
    expect(catalogPublicNameFromGetUser(user())).toBe("Актуальное рабочее имя");
  });

  it("uses live catalog column when source is live_public", () => {
    expect(
      catalogPublicNameFromGetUser(
        user({ catalogDisplayNameSource: "live_public", catalogDisplayName: "Карточка A" }),
      ),
    ).toBe("Карточка A");
  });

  it("uses staged draft value when source is staged_draft", () => {
    expect(
      catalogPublicNameFromGetUser(
        user({ catalogDisplayNameSource: "staged_draft", catalogDisplayName: "Карточка B" }),
      ),
    ).toBe("Карточка B");
  });

  it("preserves intentional staged null/empty without falling back to working name", () => {
    const base = {
      displayName: "Актуальное рабочее имя",
      catalogDisplayNameSource: "staged_draft" as const,
    };
    expect(catalogPublicNameFromGetUser(user({ ...base, catalogDisplayName: null }))).toBe("");
    expect(catalogPublicNameFromGetUser(user({ ...base, catalogDisplayName: "" }))).toBe("");
    expect(catalogPublicNameFromGetUser(user({ ...base, catalogDisplayName: "  " }))).toBe("");
  });

  it("GET-shaped fixture → draft hydration keeps cleared public name", () => {
    const getUser: ProProfileUser = user({
      displayName: "Актуальное рабочее имя",
      catalogDisplayName: null,
      catalogDisplayNameSource: "staged_draft",
      catalogDraftPending: true,
      catalogDraft: { catalogDisplayName: null, catalogTouched: { catalogPublicName: true } },
    });
    const draft = profileDraftFromProfile({
      organization: null,
      programs: [],
      user: getUser,
      workingProfile: {
        productCategoryIds: [],
        serviceSpecializationIds: ["design"],
        navigatorStageIds: ["L1-1"],
        effectiveProductCategoryIds: [],
        effectiveServiceSpecializationIds: ["design"],
        effectiveNavigatorStageIds: ["L1-1"],
        primaryDirection: null,
        partnerSearchVisible: false,
        partnerSearchOptIn: false,
        partnerSearchOptInExplicit: false,
        workingDirectionsTouched: false,
        partnerWorkMode: "ON_SITE",
        areas: [],
        partnershipContactName: null,
        partnershipContactPhone: "+79001112233",
        partnershipContactEmail: null,
      },
    });
    expect(draft.catalogPublicName).toBe("");
    expect(draft.displayName).toBe("Актуальное рабочее имя");
  });
});
