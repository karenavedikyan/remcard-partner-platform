import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CounterpartyProfile } from "./CounterpartyProfile";
import type { Partnership } from "@/lib/types";

const enrichedPartnership: Partnership = {
  id: "p-mock",
  status: "ACTIVE",
  initiatedBy: "store-1",
  pendingProposedBy: null,
  note: null,
  createdAt: "2025-01-10T00:00:00.000Z",
  updatedAt: "",
  storeUserId: "store-1",
  proUserId: "spec-1",
  terms: [],
  storeUser: {
    id: "store-internal-only",
    displayName: "Точка",
    city: "Казань",
    specializations: [],
    storeCategories: ["doors"],
    partnerType: "STORE",
    organizationName: "ООО Точка",
  },
  proUser: {
    id: "spec-internal-only",
    displayName: "Специалист",
    city: "Казань",
    specializations: ["painting"],
    workingServiceSpecializationIds: ["painting"],
    storeCategories: [],
    partnerType: null,
    partnerActivities: ["MASTER"],
    publicId: "RC-MOCK-0420",
    description: "Текст о партнёре",
    areas: ["Казань"],
    partnershipContact: {
      name: "Куратор",
      phone: "+7 900 000-00-00",
      email: null,
    },
  },
  listPreference: null,
};

describe("CounterpartyProfile", () => {
  it("renders enriched list contract fields without internal id", () => {
    render(<CounterpartyProfile partnership={enrichedPartnership} listPrincipalId="store-1" />);
    expect(screen.getByTestId("counterparty-profile-public-id")).toHaveValue("RC-MOCK-0420");
    expect(screen.getByText("Текст о партнёре")).toBeInTheDocument();
    expect(screen.getByText(/Покраска/i)).toBeInTheDocument();
    expect(screen.getByText(/Куратор/)).toBeInTheDocument();
    expect(screen.queryByText("store-internal-only")).toBeNull();
    expect(screen.queryByText("spec-internal-only")).toBeNull();
  });

  it("shows ID недоступен when publicId is absent from contract", () => {
    const noPublicId: Partnership = {
      ...enrichedPartnership,
      proUser: {
        ...enrichedPartnership.proUser,
        publicId: undefined,
      },
    };
    render(<CounterpartyProfile partnership={noPublicId} listPrincipalId="store-1" />);
    expect(screen.getByTestId("counterparty-profile-public-id")).toHaveValue("ID недоступен");
    expect(screen.getByTestId("counterparty-profile-copy-id")).toBeDisabled();
  });
});
