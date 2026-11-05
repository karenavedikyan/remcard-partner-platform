import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentPartnerCollection } from "./AgentPartnerCollection";
import type { Partnership } from "@/lib/types";

const OWNER = "qa-owner";
const EMP = "employee";

function row(
  id: string,
  storeUserId: string,
  proUserId: string,
  storeName: string,
  proName: string,
): Partnership {
  return {
    id,
    status: "ACTIVE",
    storeUserId,
    proUserId,
    initiatedBy: OWNER,
    terms: [],
    storeUser: {
      id: storeUserId,
      displayName: storeName,
      organizationName: storeName,
      partnerType: storeUserId === OWNER ? "COMPANY" : "AGENT",
      city: "Москва",
    },
    proUser: {
      id: proUserId,
      displayName: proName,
      organizationName: proName,
      partnerType: proUserId === OWNER ? "COMPANY" : "AGENT",
      city: "Москва",
    },
  } as unknown as Partnership;
}

describe("AgentPartnerCollection listSubjectUserId", () => {
  it("uses org principal for row title while actor stays meId", () => {
    render(
      <AgentPartnerCollection
        partnerships={[
          row("p1", "agent-alpha", OWNER, "QA-Партнёр-Альфа", "Тестовая организация"),
        ]}
        meId={EMP}
        listSubjectUserId={OWNER}
        viewMode="list"
        busyId={null}
        onRunAction={vi.fn()}
        onUpdated={vi.fn()}
        termRequests={{}}
        onLoadTermRequests={vi.fn()}
        expandedTermPartnershipId={null}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        page={0}
        pageSize={25}
        totalCount={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        presentationVariant="active"
      />,
    );
    const table = screen.getByTestId("agent-r04-partners-table");
    const tableRow = within(table).getByTestId("agent-r04-partners-table-row");
    expect(within(tableRow).getByTestId("partner-row-name-button")).toHaveTextContent(
      "QA-Партнёр-Альфа",
    );
  });

  it("shows both counterparties when owner is on store or pro side", () => {
    render(
      <AgentPartnerCollection
        partnerships={[
          row("a", OWNER, "agent-beta", "Тестовая организация", "QA-Партнёр-Бета"),
          row("b", "agent-alpha", OWNER, "QA-Партнёр-Альфа", "Тестовая организация"),
        ]}
        meId={EMP}
        listSubjectUserId={OWNER}
        viewMode="list"
        busyId={null}
        onRunAction={vi.fn()}
        onUpdated={vi.fn()}
        termRequests={{}}
        onLoadTermRequests={vi.fn()}
        expandedTermPartnershipId={null}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        page={0}
        pageSize={25}
        totalCount={2}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        presentationVariant="active"
      />,
    );
    const titles = screen
      .getAllByTestId("partner-row-name-button")
      .map((el) => el.textContent?.trim());
    expect(titles).toContain("QA-Партнёр-Альфа");
    expect(titles).toContain("QA-Партнёр-Бета");
    expect(titles).not.toContain("Тестовая организация");
  });
});
