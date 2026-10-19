import { describe, expect, it } from "vitest";
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
});
