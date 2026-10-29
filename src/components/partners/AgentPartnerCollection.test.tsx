import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentPartnerCollection } from "./AgentPartnerCollection";
import type { Partnership } from "@/lib/types";

vi.mock("@/components/partners/AgentPartnerWorkspaceActions", () => ({
  AgentPartnerWorkspaceActions: () => <div data-testid="workspace-actions-stub" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function basePartnership(overrides: Partial<Partnership>): Partnership {
  return {
    id: "p1",
    status: "INVITED",
    initiatedBy: "agent-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-1",
    terms: [],
    storeUser: {
      id: "store-1",
      displayName: "Shop Owner",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-1",
      displayName: "Seda Rallis",
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
  viewMode: "table" as const,
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

describe("AgentPartnerCollection row actions", () => {
  it("shows inline workflow for empty incoming agent request without eye toggle", async () => {
    const onRunAction = vi.fn();
    const partnership = basePartnership({ id: "incoming-agent" });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[partnership]}
        onRunAction={onRunAction}
      />,
    );

    const table = screen.getByTestId("agent-r04-partners-table");
    const workflow = within(table).getByTestId("partner-row-inline-workflow");
    expect(within(workflow).getByRole("button", { name: "Предложение агенту" })).toBeVisible();
    expect(within(workflow).getByRole("button", { name: "Отклонить" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Детали" })).toBeNull();

    await userEvent.click(within(workflow).getByRole("button", { name: "Предложение агенту" }));
    expect(onRunAction).toHaveBeenCalledTimes(1);
    expect(onRunAction).toHaveBeenCalledWith("incoming-agent", "counter_offer");
  });

  it("opens read-only details on name click and restores focus on close", async () => {
    const partnership = basePartnership({
      id: "p-alias",
      listPreference: { personalAlias: "Мой агент", archivedAt: null, hiddenAt: null },
      terms: [
        {
          id: "t1",
          category: "doors",
          categoryLabel: "Двери",
          storePercent: 12,
          isExcluded: false,
          minMargin: null,
        },
        {
          id: "t2",
          category: "tiles",
          categoryLabel: "Плитка",
          storePercent: 8,
          isExcluded: false,
          minMargin: null,
        },
        {
          id: "t3",
          category: "plumbing",
          categoryLabel: "Сантехника",
          storePercent: 5,
          isExcluded: false,
          minMargin: null,
        },
        {
          id: "t4",
          category: "flooring",
          categoryLabel: "Напольные покрытия",
          storePercent: 7,
          isExcluded: false,
          minMargin: null,
        },
      ],
    });
    const onRunAction = vi.fn();
    const onToggleSelect = vi.fn();

    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[partnership]}
        onRunAction={onRunAction}
        onToggleSelect={onToggleSelect}
      />,
    );

    const nameButton = screen.getAllByTestId("partner-row-name-button")[0]!;
    expect(nameButton).toHaveTextContent("Мой агент");
    await userEvent.click(nameButton);

    const dialog = screen.getByTestId("partner-partnership-detail-dialog");
    expect(within(dialog).getByText(/Seda Rallis/)).toBeInTheDocument();
    const termsList = within(dialog).getByTestId("partner-detail-terms-list");
    expect(within(termsList).getAllByRole("listitem")).toHaveLength(4);
    expect(within(dialog).queryByRole("button", { name: "Предложение агенту" })).toBeNull();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("partner-partnership-detail-dialog")).toBeNull();
    expect(nameButton).toHaveFocus();
    expect(onRunAction).not.toHaveBeenCalled();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it("renders mobile row with inline actions and clickable name", () => {
    const partnership = basePartnership({
      status: "INVITED",
      initiatedBy: "store-1",
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
    });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        meId="agent-1"
        partnerships={[partnership]}
      />,
    );

    const mobileRow = screen.getByTestId("agent-partner-mobile-row");
    expect(within(mobileRow).getByTestId("partner-row-name-button")).toBeInTheDocument();
    expect(within(mobileRow).getByRole("button", { name: "Принять" })).toBeVisible();
  });

  it("disables inline actions when row is busy", () => {
    const partnership = basePartnership({ id: "busy-row" });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[partnership]}
        busyId="busy-row"
      />,
    );

    const workflow = screen.getAllByTestId("partner-row-inline-workflow")[0]!;
    expect(within(workflow).getByRole("button", { name: "Предложение агенту" })).toBeDisabled();
  });

  it("shows card view primary workflow without expansion", () => {
    const partnership = basePartnership({ id: "card-row" });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        partnerships={[partnership]}
      />,
    );

    const card = screen.getByTestId("agent-r04-partners-cards");
    expect(within(card).getByRole("button", { name: "Предложение агенту" })).toBeVisible();
    expect(within(card).getByTestId("partner-row-name-button")).toBeInTheDocument();
  });
});
