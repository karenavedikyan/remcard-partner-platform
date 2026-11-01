import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    terms: [
      {
        id: `t-${id}`,
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 10,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: `store-${id}`,
      displayName: `Партнёр ${id}`,
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
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

describe("AgentPartnerCollection P28b active states", () => {
  it("shows active-empty copy, not invitation cards", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[]}
        totalCount={0}
        presentationVariant="active"
      />,
    );
    expect(screen.getByTestId("agent-active-empty")).toHaveTextContent(
      "Действующих партнёров пока нет",
    );
    expect(screen.queryByTestId("agent-invitation-card")).toBeNull();
    expect(screen.getByTestId("agent-active-collection")).toHaveAttribute(
      "data-presentation",
      "active",
    );
  });

  it("surfaces accepted terms preview on active cards", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[activePartnership("long-1")]}
        totalCount={1}
        presentationVariant="active"
      />,
    );
    expect(screen.getByTestId("partner-row-terms-preview")).toHaveTextContent("Двери 10%");
  });

  it("opens and closes readonly detail terms without inline workflow mutation", async () => {
    const user = userEvent.setup();
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[activePartnership("terms-ro")]}
        totalCount={1}
        presentationVariant="active"
      />,
    );
    await user.click(screen.getByTestId("partner-row-name-button"));
    expect(screen.getByTestId("partner-detail-terms-list")).toBeVisible();
    await user.click(screen.getByTestId("partner-detail-close"));
    expect(screen.queryByTestId("partner-detail-terms-list")).not.toBeInTheDocument();
  });
});
