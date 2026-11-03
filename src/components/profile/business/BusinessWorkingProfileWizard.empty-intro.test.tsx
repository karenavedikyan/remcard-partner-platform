/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";
import { revealProfileWizardFromEmpty } from "@/components/profile/empty-state/profileEmptyTestHelpers";

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => null,
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({ products: [], services: [], stages: [] })),
}));

const persist = vi.fn();
vi.mock("@/lib/profile-working-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile-working-save")>();
  return {
    ...actual,
    persistWorkingProfileDraft: (...args: unknown[]) => persist(...args),
  };
});

function baseProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  return {
    organization: { id: "org1", name: "", catalogStatus: "DRAFT", partnerType, branchCount: 0 },
    programs: [],
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "",
      city: "",
      specializations: [],
      role: "PRO",
      partnerType,
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
}

describe("BusinessWorkingProfileWizard empty intro", () => {
  beforeEach(() => {
    persist.mockReset();
  });

  it("shows empty intro for brand-new saved profile", async () => {
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfile("STORE")}
        partnerType="STORE"
        basicsEditable
      />,
    );
    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("business-profile-wizard")).not.toBeInTheDocument();
  });

  it("opens wizard directly when partial progress exists on server (missing city)", async () => {
    render(
      <BusinessWorkingProfileWizard
        initialProfile={{
          ...baseProfile("COMPANY"),
          organization: {
            id: "org1",
            name: "Юг",
            catalogStatus: "DRAFT",
            partnerType: "COMPANY",
            branchCount: 0,
          },
          user: {
            ...baseProfile("COMPANY").user,
            displayName: "Иван",
            city: "",
          },
        }}
        partnerType="COMPANY"
        basicsEditable
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-profile-wizard")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("skips empty intro when cabinet-ready (summary)", async () => {
    render(
      <BusinessWorkingProfileWizard
        initialProfile={{
          ...baseProfile("COMPANY"),
          organization: {
            id: "org1",
            name: "Юг",
            catalogStatus: "DRAFT",
            partnerType: "COMPANY",
            branchCount: 0,
          },
          user: {
            ...baseProfile("COMPANY").user,
            displayName: "Иван",
            city: "Краснодар",
          },
        }}
        partnerType="COMPANY"
        basicsEditable
      />,
    );
    expect(await screen.findByTestId("business-profile-completed-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("skips empty intro when forceEditing", async () => {
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfile("STORE")}
        partnerType="STORE"
        basicsEditable
        forceEditing
      />,
    );
    expect(await screen.findByTestId("business-profile-wizard")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("CTA reveals wizard without persist POST", async () => {
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfile("STORE")}
        partnerType="STORE"
        basicsEditable
      />,
    );
    await screen.findByTestId("empty-state");
    await user.click(screen.getByTestId("profile-empty-start"));
    await screen.findByTestId("business-profile-wizard");
    expect(persist).not.toHaveBeenCalled();
  });
});
