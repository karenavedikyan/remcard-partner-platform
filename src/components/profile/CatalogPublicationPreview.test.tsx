import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogPublicationPreview } from "./CatalogPublicationPreview";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";

function baseProfile(partnerType: ProProfileResponse["user"]["partnerType"]): ProProfileResponse {
  return {
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "Shop",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType,
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
      showFullName: true,
    },
    organization: null,
    programs: [],
  };
}

function baseDraft(overrides: Partial<ProfileDraft> = {}): ProfileDraft {
  return {
    displayName: "Shop",
    catalogPublicName: "",
    showFullName: true,
    catalogImageUrl: "",
    city: "Краснодар",
    catalogCity: "",
    description: "",
    partnerType: "STORE",
    specializations: [],
    storeCategories: ["doors"],
    organizationName: "",
    branchAddress: "",
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
    partnerActivities: [],
    ...overrides,
  };
}

describe("CatalogPublicationPreview", () => {
  it("default variant renders legacy Товары line for STORE with product categories", () => {
    render(
      <CatalogPublicationPreview
        profile={baseProfile("STORE")}
        draft={baseDraft()}
      />,
    );
    expect(screen.getByText(/^Товары:/)).toBeTruthy();
    expect(screen.queryByText(/^Услуга:/)).toBeNull();
    expect(screen.queryByText(/^Этап:/)).toBeNull();
    expect(screen.queryByText(/Предпросмотр · не опубликовано/)).toBeNull();
  });

  it("specialist variant renders separate service and stage chips, not legacy Товары line", () => {
    render(
      <CatalogPublicationPreview
        profile={baseProfile("MASTER")}
        draft={baseDraft({
          partnerType: "MASTER",
          storeCategories: [],
          specializations: ["design"],
          navigatorStageIds: ["L1-1"],
        })}
        variant="specialist"
      />,
    );
    const root = screen.getByTestId("catalog-public-preview");
    expect(root.getAttribute("data-catalog-preview-variant")).toBe("specialist");
    expect(screen.getByText(/^Услуга:/)).toBeTruthy();
    expect(screen.getByText(/^Этап:/)).toBeTruthy();
    expect(screen.queryByText(/^Товары:/)).toBeNull();
  });
});
