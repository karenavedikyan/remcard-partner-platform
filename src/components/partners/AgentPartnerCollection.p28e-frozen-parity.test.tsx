import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentPartnerCollection } from "./AgentPartnerCollection";
import type { Partnership } from "@/lib/types";

function activePartnership(id: string, overrides: Partial<Partnership> = {}): Partnership {
  return {
    id,
    status: "ACTIVE",
    initiatedBy: "agent-harness",
    pendingProposedBy: null,
    note: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    storeUserId: `store-${id}`,
    proUserId: "agent-me",
    terms: [],
    storeUser: {
      id: `store-${id}`,
      displayName: `Partner ${id}`,
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "STORE",
      partnerActivities: ["STORE"],
    },
    proUser: {
      id: "agent-me",
      displayName: "Agent",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    ...overrides,
  };
}

const defaultProps = {
  meId: "agent-me",
  viewMode: "cards" as const,
  busyId: null,
  onRunAction: () => {},
  onUpdated: () => {},
  onLoadTermRequests: () => {},
  onCloseTermChange: () => {},
  onTermDirtyChange: () => {},
  termRequests: {},
  expandedTermPartnershipId: null,
  selectedIds: new Set<string>(),
  onToggleSelect: () => {},
  onToggleSelectAll: () => {},
  page: 0,
  pageSize: 10,
  totalCount: 0,
  onPageChange: () => {},
  onPageSizeChange: () => {},
};

describe("AgentPartnerCollection P28e pure agent + readonly avatar", () => {
  it("hides a broken profile image without inventing a logo and recovers on load", () => {
    const partnership = activePartnership("broken-photo");
    partnership.storeUser!.photoUrl = "https://example.invalid/photo.png";
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[partnership]}
        presentationVariant="active"
      />,
    );
    const image = screen.getByTestId("partner-row-avatar");
    fireEvent.error(image);
    expect(image).not.toBeVisible();
    fireEvent.load(image);
    expect(image).toBeVisible();
  });
  it("labels pure AGENT activities as Агент (does not rename pro user)", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[
          activePartnership("pure-agent", {
            storeUser: {
              id: "store-pure-agent",
              displayName: "Агентство «Клиентский поток»",
              city: "Краснодар",
              specializations: [],
              storeCategories: [],
              partnerType: "COMPANY",
              partnerActivities: ["AGENT"],
            },
          }),
        ]}
        totalCount={1}
        presentationVariant="active"
      />,
    );
    expect(screen.getByTestId("partner-row-type-caption")).toHaveTextContent("Агент · Краснодар");
    expect(screen.queryByText(/^Agent$/)).toBeNull();
  });

  it("renders avatar img only when photoUrl is on partnership profile props", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[
          activePartnership("no-photo"),
          activePartnership("with-photo", {
            storeUser: {
              id: "store-with-photo",
              displayName: "Магазин «Demo»",
              city: "Сочи",
              photoUrl: "https://cdn.example/avatar.png",
              specializations: [],
              storeCategories: ["light"],
              partnerType: "STORE",
              partnerActivities: ["STORE"],
            },
          }),
        ]}
        totalCount={2}
        presentationVariant="active"
      />,
    );
    expect(screen.queryAllByTestId("partner-row-avatar")).toHaveLength(1);
    expect(screen.getByTestId("partner-row-avatar")).toHaveAttribute(
      "src",
      "https://cdn.example/avatar.png",
    );
  });
});
