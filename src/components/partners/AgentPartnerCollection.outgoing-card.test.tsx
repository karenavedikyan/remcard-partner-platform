import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { describe, expect, it } from "vitest";
import { AgentPartnerCollection } from "./AgentPartnerCollection";
import type { Partnership } from "@/lib/types";

vi.mock("@/lib/clients-parity/fetch-observer-appeals", () => ({
  fetchObserverReferredAppeals: vi.fn(async () => ({ ok: true, appeals: [], partners: [], personalMeta: {}, overlayVersions: {} })),
}));
vi.mock("@/lib/certificate-policy/api", () => ({
  fetchCertificatePolicyWorkspace: vi.fn(async () => ({ ok: true, workspace: { counterparties: [] } })),
}));

const css = readFileSync(path.join(import.meta.dirname, "AgentActiveCollection.module.css"), "utf8");
const ME = "me";

function outgoing(id: string, status: string): Partnership {
  return {
    id, status, initiatedBy: ME, pendingProposedBy: null, note: null, createdAt: "", updatedAt: "",
    storeUserId: `partner-${id}`, proUserId: ME,
    terms: [{ id: `t-${id}`, category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false, minMargin: null }],
    storeUser: { id: `partner-${id}`, displayName: `Партнёр ${id}`, city: "Казань", specializations: [], storeCategories: ["doors"], partnerType: "STORE" },
    proUser: { id: ME, displayName: "Я", city: "Казань", specializations: [], storeCategories: [], partnerType: "COMPANY" },
    listPreference: { personalAlias: null, archivedAt: null, hiddenAt: null },
    directionInfo: {
      direction: "outgoing", issuerUserId: ME, receiverUserId: `partner-${id}`, legacyInverted: false,
      counterpartyUserId: `partner-${id}`, reversePartnershipId: null, reverseStatus: null,
    },
  } as unknown as Partnership;
}

const props = {
  meId: ME, viewMode: "cards" as const, busyId: null, onRunAction: () => {}, onUpdated: () => {},
  onLoadTermRequests: () => {}, onCloseTermChange: () => {}, onTermDirtyChange: () => {}, termRequests: {},
  expandedTermPartnershipId: null, selectedIds: new Set<string>(), onToggleSelect: () => {},
  onToggleSelectAll: () => {}, page: 0, pageSize: 10, totalCount: 2, onPageChange: () => {}, onPageSizeChange: () => {},
};

describe("outgoing active card hierarchy", () => {
  it("has a visible Выбрать header, the status in the footer and a per-partner Клиенты link", () => {
    render(<AgentPartnerCollection {...props} partnerships={[outgoing("a", "ACTIVE"), outgoing("b", "PAUSED")]} />);
    const cards = screen.getAllByTestId("agent-active-card");
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      const select = within(card).getByTestId("agent-card-select");
      expect(select).toHaveTextContent("Выбрать");
      expect(within(select).getByRole("checkbox")).toBeInTheDocument();
      const footer = within(card).getByTestId("agent-active-card-footer");
      expect(footer.contains(select)).toBe(false);
      expect(within(footer).getByTestId("partner-card-clients-link")).toHaveTextContent("Клиенты");
    }
    expect(within(cards[0]!).getByTestId("agent-active-card-footer")).toHaveTextContent(/Действует|Активн|Согласован/i);
    expect(within(cards[0]!).getByTestId("partner-card-clients-link")).toHaveAttribute(
      "href", "/clients?direction=at-partners&partnerId=partner-a",
    );
  });

  it("opens the partner sheet on its Клиенты tab from the card footer", async () => {
    render(
      <AgentPartnerCollection
        {...props}
        directionAudience="business-store-r04"
        partnerships={[outgoing("a", "ACTIVE")]}
        totalCount={1}
      />,
    );
    await userEvent.click(screen.getByTestId("partner-card-clients-link"));
    expect(await screen.findByTestId("partner-sheet-tabs")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("tab", { name: /Клиенты/ })).toHaveAttribute("aria-selected", "true"));
    expect(await screen.findByTestId("partner-sheet-clients-empty")).toBeInTheDocument();
  });

  it("does not render a Клиенты link without a direction", () => {
    const legacy = outgoing("c", "ACTIVE");
    (legacy as unknown as { directionInfo: undefined }).directionInfo = undefined;
    render(<AgentPartnerCollection {...props} partnerships={[legacy]} totalCount={1} />);
    expect(screen.queryByTestId("partner-card-clients-link")).toBeNull();
  });

  it("keeps the footer stacked and the card controls at least 44px", () => {
    expect(css).toMatch(/\.cardFooter\s*\{[^}]*flex-direction:\s*column/s);
    expect(css).toMatch(/\.cardClientsLink\s*\{[^}]*min-height:\s*44px/s);
  });
});
