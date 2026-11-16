import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const upstream = vi.hoisted(() => ({ calls: [] as string[], responses: new Map<string, unknown>() }));
const sessionUser = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "sid=synthetic" }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/session", () => ({ requireProPageUser: async () => sessionUser.value }));
vi.mock("@/components/layout/CabinetShell", () => ({
  CabinetShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/auth/SessionGate", () => ({ SessionGate: () => <div data-testid="session-gate" /> }));
vi.mock("@/lib/remcard-server", () => ({
  fetchRemcardUpstream: async (path: string) => {
    upstream.calls.push(path);
    if (!upstream.responses.has(path)) return { ok: false, status: 404 };
    return { ok: true, status: 200, data: upstream.responses.get(path) };
  },
}));
vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

import { remcardFetch } from "@/lib/api-client";
import PartnersPage from "./page";

const ME = "me-1";

const STORE_USER = { partnerType: "STORE", partnerActivities: ["STORE"] };
const STORE_CONTEXT = {
  role: "ORG_OWNER",
  organization: { id: "org-1", name: "Магазин", partnerType: "STORE", ownerId: ME },
};

type Terms = { rate: number; days: number; purchases: number };

function directedRow(id: string, direction: "incoming" | "outgoing", counterpartyId: string, name: string, category: [string, string, number]) {
  const incoming = direction === "incoming";
  const partner = { id: counterpartyId, displayName: name, organizationName: name, partnerType: "COMPANY", city: "Казань" };
  const me = { id: ME, displayName: "Я", organizationName: "Я", partnerType: "STORE", city: "Москва" };
  return {
    id,
    status: "ACTIVE",
    initiatedBy: ME,
    note: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    storeUserId: incoming ? ME : counterpartyId,
    proUserId: incoming ? counterpartyId : ME,
    terms: [{ id: `${id}-t`, category: category[0], categoryLabel: category[1], storePercent: category[2], isExcluded: false }],
    storeUser: incoming ? me : partner,
    proUser: incoming ? partner : me,
    directionInfo: {
      direction,
      issuerUserId: incoming ? counterpartyId : ME,
      receiverUserId: incoming ? ME : counterpartyId,
      legacyInverted: false,
      counterpartyUserId: counterpartyId,
      reversePartnershipId: null,
      reverseStatus: null,
    },
  };
}

const eff = (t: Terms, key: string, label: string) => ({
  validityDays: t.days,
  purchaseLimit: t.purchases,
  minimumPurchaseAmount: null,
  promotionsCompatible: true,
  exclusionsText: null,
  categoryRates: [{ category: key, categoryLabel: label, poolPercent: t.rate }],
});

type World = {
  outgoing: Terms;
  incoming: Terms;
  proposalPending: boolean;
  listFailures: number;
  listCalls: number;
  patches: Array<Record<string, unknown>>;
};

const PROPOSED: Terms = { rate: 8, days: 21, purchases: 2 };

let world: World;

function workspace() {
  const general = { rate: 15, days: 30, purchases: 2 };
  return {
    general: { scope: "general", version: 1, categoryRatesRevision: "doors:15", effective: eff(general, "doors", "Двери") },
    incomingProposals: world.proposalPending
      ? [
          {
            id: "prop-1",
            version: 1,
            proposerUserId: "cp-out",
            receiverUserId: ME,
            createdAt: "2026-02-01T00:00:00.000Z",
            proposed: eff(PROPOSED, "paint", "Краски"),
            effective: eff({ rate: 7, days: 14, purchases: 1 }, "paint", "Краски"),
          },
        ]
      : [],
    counterparties: [
      { userId: "cp-out", displayName: "Компания Краски", roleLabel: "Компания", initials: "КК", status: "individual", partnershipId: "row-out", direction: "outgoing", readOnly: true, effective: eff(world.outgoing, "paint", "Краски") },
      { userId: "cp-in", displayName: "Магазин Двери", roleLabel: "Магазин", initials: "МД", status: "general", partnershipId: "row-in", direction: "incoming", readOnly: false, effective: eff(world.incoming, "doors", "Двери"), individualVersion: null, categoryRatesRevision: "doors:10" },
    ],
  };
}

function arrange() {
  const user = { id: ME, role: "PRO", displayName: "Я", isBlocked: false, ...STORE_USER };
  sessionUser.value = user;
  upstream.calls = [];
  upstream.responses = new Map<string, unknown>([
    ["/api/pro/profile", { user, organization: STORE_CONTEXT.organization }],
    ["/api/pro/r04/status", { featureEnabled: false, eligible: false }],
    ["/api/pro/r06/status", { featureEnabled: false, eligible: false }],
    ["/api/pro/context", STORE_CONTEXT],
  ]);
  world = {
    outgoing: { rate: 7, days: 14, purchases: 1 },
    incoming: { rate: 10, days: 45, purchases: 3 },
    proposalPending: true,
    listFailures: 0,
    listCalls: 0,
    patches: [],
  };
  vi.mocked(remcardFetch).mockReset();
  vi.mocked(remcardFetch).mockImplementation(async (path: string, init?: { method?: string; body?: unknown }) => {
    if (path.includes("/api/partnership/list")) {
      world.listCalls += 1;
      if (world.listFailures > 0) {
        world.listFailures -= 1;
        throw new Error("network");
      }
      const rows = [
        directedRow("row-in", "incoming", "cp-in", "Магазин Двери", ["doors", "Двери", world.incoming.rate]),
        directedRow("row-out", "outgoing", "cp-out", "Компания Краски", ["paint", "Краски", world.outgoing.rate]),
      ];
      return { partnerships: rows, listCounts: { active: rows.length, archive: 0, hidden: 0 } };
    }
    if (path.includes("certificate-policy")) {
      if (init?.method === "PATCH") {
        const body = init.body as Record<string, unknown>;
        world.patches.push(body);
        if (body.action === "approve_proposal") {
          world.outgoing = { ...PROPOSED };
          world.proposalPending = false;
        }
        if (body.action === "reject_proposal") world.proposalPending = false;
      }
      return workspace();
    }
    if (path.includes("/api/pro/profile")) return { user };
    throw new Error(`unexpected fetch ${path}`);
  });
}

async function renderPage(): Promise<void> {
  const element = (await PartnersPage({ searchParams: Promise.resolve({}) })) as ReactElement;
  render(element);
}

function ratesOf(list: HTMLElement): string {
  return within(list)
    .getAllByTestId("partner-row-category-rate")
    .filter((row) => row.getAttribute("data-excluded") !== "true")
    .map((row) => `${row.querySelector("dt")?.textContent} ${row.querySelector("dd")?.textContent}`)
    .join(" · ");
}

async function outgoingBlock() {
  const preview = (await screen.findAllByTestId("partner-row-terms-preview"))[0]!;
  return preview.closest('[data-testid="partner-row-terms-block"]') as HTMLElement;
}

async function openIncomingProposals() {
  await userEvent.click(await screen.findByTestId("cp-open-settings"));
  await userEvent.click(await screen.findByTestId("cp-tab-incoming"));
}

beforeEach(() => {
  vi.mocked(remcardFetch).mockReset();
});

describe("partners list refreshes visible terms after policy consent", () => {
  it("shows the agreed terms immediately after approval, keeping the outgoing tab and the opposite direction", async () => {
    arrange();
    await renderPage();
    await screen.findByTestId("agent-r04-partners");
    await userEvent.click(await screen.findByTestId("partner-direction-tab-outgoing"));
    let block = await outgoingBlock();
    expect(ratesOf(within(block).getByTestId("partner-row-terms-preview"))).toBe("Краски 7%");
    await waitFor(() => expect(within(block).getByTestId("partner-row-restrictions").textContent).toContain("14 дней · 1 покупка"));
    const listCallsBeforeDialog = world.listCalls;

    await openIncomingProposals();
    expect(await screen.findByTestId("cp-incoming-prop-1")).toBeTruthy();
    expect(world.listCalls).toBe(listCallsBeforeDialog);
    block = await outgoingBlock();
    expect(ratesOf(within(block).getByTestId("partner-row-terms-preview"))).toBe("Краски 7%");

    await userEvent.click(screen.getByTestId("cp-approve-prop-1"));
    await waitFor(() => expect(screen.getByTestId("cp-status").textContent).toContain("Согласовано"));
    await userEvent.click(screen.getByTestId("term-change-close"));

    await waitFor(async () => {
      const fresh = await outgoingBlock();
      expect(ratesOf(within(fresh).getByTestId("partner-row-terms-preview"))).toBe("Краски 8%");
      expect(within(fresh).getByTestId("partner-row-restrictions").textContent).toContain("21 день · 2 покупки");
    });
    expect(world.patches.map((p) => p.action)).toEqual(["approve_proposal"]);
    expect(screen.getByTestId("partner-direction-tab-outgoing").getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByTestId("partners-terms-refresh-failed")).toBeNull();

    await userEvent.click(screen.getByTestId("partner-direction-tab-incoming"));
    const incomingBlock = (await screen.findAllByTestId("partner-row-terms-preview"))[0]!;
    expect(incomingBlock.textContent).toBe("Двери 10%");
    expect(world.incoming).toEqual({ rate: 10, days: 45, purchases: 3 });
  });

  it("neither a pending proposal nor a rejection changes or reloads the visible terms", async () => {
    arrange();
    await renderPage();
    await screen.findByTestId("agent-r04-partners");
    await userEvent.click(await screen.findByTestId("partner-direction-tab-outgoing"));
    await outgoingBlock();
    const baseline = world.listCalls;

    await openIncomingProposals();
    await userEvent.click(await screen.findByTestId("cp-reject-prop-1"));
    await waitFor(() => expect(screen.getByTestId("cp-status").textContent).toContain("Отклонено"));
    await userEvent.click(screen.getByTestId("term-change-close"));

    const block = await outgoingBlock();
    expect(ratesOf(within(block).getByTestId("partner-row-terms-preview"))).toBe("Краски 7%");
    await waitFor(() => expect(within(block).getByTestId("partner-row-restrictions").textContent).toContain("14 дней · 1 покупка"));
    expect(world.listCalls).toBe(baseline);
    expect(world.outgoing).toEqual({ rate: 7, days: 14, purchases: 1 });
  });

  it("keeps the current list when the refresh fails and applies the new terms on retry", async () => {
    arrange();
    await renderPage();
    await screen.findByTestId("agent-r04-partners");
    await userEvent.click(await screen.findByTestId("partner-direction-tab-outgoing"));
    await outgoingBlock();

    await openIncomingProposals();
    world.listFailures = 1;
    await userEvent.click(await screen.findByTestId("cp-approve-prop-1"));
    await waitFor(() => expect(screen.getByTestId("cp-status").textContent).toContain("Согласовано"));
    await userEvent.click(screen.getByTestId("term-change-close"));

    const notice = await screen.findByTestId("partners-terms-refresh-failed");
    expect(notice.getAttribute("role")).toBe("status");
    const stale = await outgoingBlock();
    expect(ratesOf(within(stale).getByTestId("partner-row-terms-preview"))).toBe("Краски 7%");
    expect(screen.getByTestId("partner-direction-tab-outgoing").getAttribute("aria-selected")).toBe("true");

    await userEvent.click(screen.getByTestId("partners-terms-refresh-retry"));
    await waitFor(async () => {
      const fresh = await outgoingBlock();
      expect(ratesOf(within(fresh).getByTestId("partner-row-terms-preview"))).toBe("Краски 8%");
    });
    expect(screen.queryByTestId("partners-terms-refresh-failed")).toBeNull();
  });
});
