/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpecialistCatalogSection } from "./SpecialistCatalogSection";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("./SpecialistCatalogWizard", () => ({
  SpecialistCatalogWizard: () => <div data-testid="specialist-catalog-wizard" />,
}));

vi.mock("../CatalogPublicationPreview", () => ({
  CatalogPublicationPreview: () => <div data-testid="catalog-public-preview" />,
}));

const baseProfile = {
  user: {
    id: "u1",
    catalogStatus: "DRAFT",
  },
} as ProProfileResponse;

const baseProps = {
  profile: baseProfile,
  draft: {},
  catalogEditable: true,
  catalogTouched: {},
  onCatalogTouchedChange: () => {},
  onProfileUpdated: () => {},
  catalogPublicName: "",
  onCatalogPublicNameChange: () => {},
  catalogCity: "",
  onCatalogCityChange: () => {},
  showFullName: false,
  onShowFullNameChange: () => {},
  catalogImageUrl: "",
  onCatalogImageUrlChange: () => {},
  description: "",
  onDescriptionChange: () => {},
  specializations: [],
  onSpecializationsChange: () => {},
  catalogStageIds: [],
  onCatalogStageIdsChange: () => {},
  website: "",
  onWebsiteChange: () => {},
  telegram: "",
  onTelegramChange: () => {},
  publicEmail: "",
  onPublicEmailChange: () => {},
  publicPhone: "",
  onPublicPhoneChange: () => {},
  onPullWorkingDirections: () => {},
  workingServiceIds: [],
  workingStageIds: [],
};

describe("SpecialistCatalogSection", () => {
  it("shows dedicated pending screen when catalog status is PENDING", () => {
    render(
      <SpecialistCatalogSection
        {...baseProps}
        profile={
          {
            ...baseProfile,
            user: { ...baseProfile.user, catalogStatus: "PENDING" },
          } as ProProfileResponse
        }
      />,
    );
    expect(screen.getByTestId("specialist-catalog-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("specialist-catalog-wizard")).not.toBeInTheDocument();
  });
});
