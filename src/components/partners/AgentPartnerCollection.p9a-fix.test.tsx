import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentPartnerCollection } from "./AgentPartnerCollection";
import type { Partnership } from "@/lib/types";

const inviteCss = readFileSync(
  join(__dirname, "AgentInvitationCollection.module.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

vi.mock("@/components/partners/AgentPartnerWorkspaceActions", () => ({
  AgentPartnerWorkspaceActions: () => <div data-testid="workspace-actions-stub" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function basePartnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "incoming-1",
    status: "INVITED",
    initiatedBy: "agent-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-1",
    terms: [
      {
        id: "t1",
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 10,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: "store-1",
      displayName: "Свет и электрика",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-1",
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

const noop = () => {};

const defaultProps = {
  meId: "store-1",
  viewMode: "list" as const,
  busyId: null,
  onRunAction: vi.fn(),
  onUpdated: noop,
  termRequests: {},
  onLoadTermRequests: vi.fn(),
  expandedTermPartnershipId: null,
  selectedIds: new Set<string>(),
  onToggleSelect: noop,
  onToggleSelectAll: noop,
  page: 0,
  pageSize: 10,
  totalCount: 1,
  onPageChange: noop,
  onPageSizeChange: noop,
};

describe("AgentInvitationCollection P9a-fix CSS contracts", () => {
  it("does not set unconditional display on .mobileStack", () => {
    const withoutMedia = inviteCss.replace(/@media[^{]+\{[\s\S]*?\n\}/g, "");
    const stackMatch = withoutMedia.match(/\.mobileStack\s*\{([^}]*)\}/);
    expect(stackMatch).toBeTruthy();
    expect(stackMatch![1]).not.toMatch(/display\s*:/);
  });

  it("hides mobile on desktop and desktop on mobile; name buttons require 44×44", () => {
    expect(inviteCss).toMatch(
      /@media\s*\(\s*min-width:\s*681px\s*\)[\s\S]*data-partner-surface=["']mobile["'][\s\S]*display\s*:\s*none/,
    );
    expect(inviteCss).toMatch(
      /@media\s*\(\s*max-width:\s*680px\s*\)[\s\S]*data-partner-surface=["']desktop["'][\s\S]*display\s*:\s*none/,
    );
    expect(inviteCss).toMatch(/partner-row-name-button[\s\S]*min-height\s*:\s*44px/);
    expect(inviteCss).toMatch(/partner-row-name-button[\s\S]*min-width\s*:\s*44px/);
  });
});

describe("AgentPartnerCollection P9a-fix surfaces + name hit wiring", () => {
  it("list invitations mounts distinct mobile and desktop surfaces with partnership id preserved", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[basePartnership({ id: "row-a" })]}
        presentationVariant="invitations"
        invitationFlowHint="incoming"
      />,
    );

    const root = screen.getByTestId("agent-invitation-collection");
    expect(root.querySelector('[data-partner-surface="mobile"]')).not.toBeNull();
    expect(root.querySelector('[data-partner-surface="desktop"]')).not.toBeNull();
    expect(root.querySelector('[data-partner-surface="cards"]')).toBeNull();

    const names = screen.getAllByTestId("partner-row-name-button");
    expect(names.length).toBeGreaterThanOrEqual(1);
    for (const btn of names) {
      expect(btn).toHaveAttribute("data-partnership-id", "row-a");
    }
  });

  it("name button still opens detail for the exact partnership id", async () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[basePartnership({ id: "detail-id" })]}
        presentationVariant="invitations"
      />,
    );

    const table = screen.getByTestId("agent-r04-partners-table");
    await userEvent.click(within(table).getByTestId("partner-row-name-button"));
    expect(await screen.findByRole("dialog")).toBeVisible();
    // Close without mutation
    await userEvent.keyboard("{Escape}");
  });

  it("cards invitations variant exposes cards surface only (no list mobile/desktop pair)", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={[basePartnership({ id: "card-a" })]}
        presentationVariant="invitations"
      />,
    );

    const root = screen.getByTestId("agent-invitation-collection");
    expect(root.querySelector('[data-partner-surface="cards"]')).not.toBeNull();
    expect(root.querySelector('[data-partner-surface="mobile"]')).toBeNull();
    expect(root.querySelector('[data-partner-surface="desktop"]')).toBeNull();
  });

  it("default variant still has no invitations root (isolation)", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[basePartnership()]}
      />,
    );
    expect(screen.queryByTestId("agent-invitation-collection")).toBeNull();
  });
});
