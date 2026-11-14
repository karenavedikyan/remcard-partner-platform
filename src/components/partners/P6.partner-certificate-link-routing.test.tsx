import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PartnerPartnershipDetailDialog } from "./PartnerPartnershipDetailDialog";
import type { Partnership } from "@/lib/types";

function basePartnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "p1",
    status: "ACTIVE",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: "",
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-1",
    terms: [],
    storeUser: {
      id: "store-1",
      displayName: "Store",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-1",
      displayName: "Обойкин",
      city: "Краснодар",
      specializations: ["painting"],
      workingServiceSpecializationIds: ["painting"],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    listPreference: null,
    ...overrides,
  };
}

describe("P6.partner certificate link routing", () => {
  it("business compact cooperation dialog links to recommendations workflow", () => {
    render(
      <PartnerPartnershipDetailDialog
        partnership={basePartnership()}
        meId="store-1"
        open
        onClose={vi.fn()}
        onOpenTermChange={vi.fn()}
        compactCooperation
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Создать сертификат" })).toHaveAttribute(
      "href",
      "/recommendations",
    );
  });
});