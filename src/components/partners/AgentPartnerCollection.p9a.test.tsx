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

describe("AgentPartnerCollection P9a invitations presentation", () => {
  it("default variant does not mount invitations presentation root", () => {
    render(
      <AgentPartnerCollection
        {...defaultProps}
        partnerships={[basePartnership({ id: "incoming-agent" })]}
      />,
    );
    expect(screen.queryByTestId("agent-invitation-collection")).toBeNull();
    expect(screen.getByTestId("agent-r04-partners-table")).toBeVisible();
  });

  it("invitations variant mounts scoped root and shows long counterpart name + real status", () => {
    const longName =
      "ОченьдлинноеназваниемагазинаосвещенияикомплектующихбезпробеловXXXXXXXXXXXX";
    const partnership = basePartnership({
      id: "incoming-agent",
      initiatedBy: "agent-1",
      storeUserId: "store-1",
      proUserId: "agent-1",
      storeUser: {
        id: "store-1",
        displayName: longName,
        city: "Краснодарский край, станица Динская, улица Красная длинный хвост",
        specializations: [],
        storeCategories: ["doors"],
        partnerType: "STORE",
      },
    });

    render(
      <AgentPartnerCollection
        {...defaultProps}
        meId="agent-1"
        partnerships={[partnership]}
        presentationVariant="invitations"
        invitationFlowHint="incoming"
      />,
    );

    const root = screen.getByTestId("agent-invitation-collection");
    expect(root).toHaveAttribute("data-presentation", "invitations");
    expect(root).toHaveAttribute("data-invitation-flow", "incoming");
    expect(screen.getAllByText(longName).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("partner-row-status")[0]).toHaveTextContent("Приглашение");
  });

  it("invitations incoming actions keep exact partnership id", async () => {
    const onRunAction = vi.fn();
    render(
      <AgentPartnerCollection
        {...defaultProps}
        meId="store-1"
        partnerships={[basePartnership({ id: "incoming-agent", initiatedBy: "agent-1" })]}
        onRunAction={onRunAction}
        presentationVariant="invitations"
        invitationFlowHint="incoming"
      />,
    );

    const table = screen.getByTestId("agent-r04-partners-table");
    const workflow = within(table).getByTestId("partner-row-inline-workflow");
    await userEvent.click(within(workflow).getByRole("button", { name: "Предложение агенту" }));
    expect(onRunAction).toHaveBeenCalledTimes(1);
    expect(onRunAction).toHaveBeenCalledWith("incoming-agent", "counter_offer");
  });

  it("outgoing waiting state keeps cancel action with exact partnership id", async () => {
    const onRunAction = vi.fn();
    render(
      <AgentPartnerCollection
        {...defaultProps}
        meId="store-1"
        partnerships={[
          basePartnership({
            id: "outgoing-wait",
            initiatedBy: "store-1",
            storeUserId: "store-1",
            proUserId: "agent-1",
          }),
        ]}
        onRunAction={onRunAction}
        presentationVariant="invitations"
        invitationFlowHint="outgoing"
      />,
    );

    expect(screen.getByTestId("agent-invitation-collection")).toHaveAttribute(
      "data-invitation-flow",
      "outgoing",
    );
    const table = screen.getByTestId("agent-r04-partners-table");
    const workflow = within(table).getByTestId("partner-row-inline-workflow");
    expect(within(workflow).getByText(/Ожидаем итоговое предложение/i)).toBeVisible();
    await userEvent.click(within(workflow).getByRole("button", { name: "Отозвать запрос" }));
    expect(onRunAction).toHaveBeenCalledWith("outgoing-wait", "cancel");
  });

  it("cards invitations variant keeps selection and pagination callbacks unchanged", async () => {
    const onToggleSelect = vi.fn();
    const onPageChange = vi.fn();
    render(
      <AgentPartnerCollection
        {...defaultProps}
        viewMode="cards"
        totalCount={25}
        page={0}
        pageSize={10}
        partnerships={[basePartnership({ id: "card-1" })]}
        onToggleSelect={onToggleSelect}
        onPageChange={onPageChange}
        presentationVariant="invitations"
      />,
    );

    expect(screen.getByTestId("agent-invitation-card")).toBeVisible();
    await userEvent.click(screen.getByLabelText("Выбрать карточку"));
    expect(onToggleSelect).toHaveBeenCalledWith("card-1");
    await userEvent.click(screen.getByRole("button", { name: "Далее" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
