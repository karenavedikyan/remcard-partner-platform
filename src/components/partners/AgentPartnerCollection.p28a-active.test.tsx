import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AgentPartnerCollection,
  resolveActivePartnerPresentation,
} from "./AgentPartnerCollection";
import type { Partnership } from "@/lib/types";

const css = readFileSync(
  path.join(import.meta.dirname, "AgentActiveCollection.module.css"),
  "utf8",
);

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
  totalCount: 1,
  onPageChange: () => {},
  onPageSizeChange: () => {},
};

describe("resolveActivePartnerPresentation", () => {
  it("activates for explicit active variant", () => {
    expect(resolveActivePartnerPresentation("active", [])).toBe(true);
  });

  it("auto-detects when all rows are active segment", () => {
    const rows = [activePartnership("a1"), activePartnership("a2", { status: "PAUSED" })];
    expect(resolveActivePartnerPresentation("default", rows)).toBe(true);
  });

  it("does not treat invitations as active", () => {
    const rows = [activePartnership("a1")];
    expect(resolveActivePartnerPresentation("invitations", rows)).toBe(false);
  });
});

describe("AgentPartnerCollection P28a active presentation", () => {
  it("uses frozen R1 two-column active card grid", () => {
    expect(css).toMatch(/\.cardGrid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
    expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*grid-template-columns:\s*1fr/s);
  });

  it("renders agent-active-collection and cards for active-only default variant", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[
          activePartnership("act-1"),
          activePartnership("act-2", {
            status: "PAUSED",
            storeUser: {
              id: "store-act-2",
              displayName: "Компания Юг",
              city: "Ростов",
              specializations: [],
              storeCategories: ["doors"],
              partnerType: "COMPANY",
            },
          }),
        ]}
        totalCount={2}
      />,
    );
    expect(screen.getByTestId("agent-active-collection")).toHaveAttribute(
      "data-presentation",
      "active",
    );
    expect(screen.getAllByTestId("agent-active-card")).toHaveLength(2);
    expect(screen.queryByTestId("agent-invitation-card")).toBeNull();
    const workflow = within(screen.getAllByTestId("agent-active-card")[0]!).getByTestId(
      "partner-row-inline-workflow",
    );
    expect(within(workflow).getByTestId("partner-action-pause")).toBeVisible();
  });
});
