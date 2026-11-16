import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import type { Partnership } from "@/lib/types";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));
import { remcardFetch } from "@/lib/api-client";

const ME = "me";

function row(
  id: string,
  counterparty: string,
  direction: "incoming" | "outgoing",
  extra: Partial<{ reverseStatus: string | null }> = {},
): Partnership {
  const incoming = direction === "incoming";
  return {
    id, status: "ACTIVE", initiatedBy: ME, note: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    storeUserId: incoming ? ME : counterparty, proUserId: incoming ? counterparty : ME,
    terms: [{ id: `${id}-t`, category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
    storeUser: { id: incoming ? ME : counterparty, displayName: incoming ? "Мы" : `Партнёр ${counterparty}`, organizationName: incoming ? "Мы" : `Партнёр ${counterparty}`, partnerType: "COMPANY", city: "Москва" },
    proUser: { id: incoming ? counterparty : ME, displayName: incoming ? `Партнёр ${counterparty}` : "Мы", organizationName: incoming ? `Партнёр ${counterparty}` : "Мы", partnerType: "COMPANY", city: "Москва" },
    directionInfo: {
      direction, issuerUserId: incoming ? counterparty : ME, receiverUserId: incoming ? ME : counterparty,
      legacyInverted: false, counterpartyUserId: counterparty, reversePartnershipId: null,
      reverseStatus: extra.reverseStatus ?? null,
    },
  } as unknown as Partnership;
}

function mockList(rows: Partnership[]) {
  vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
    if (path.includes("/api/partnership/list")) {
      return { partnerships: rows, listCounts: { active: rows.length, archive: 0, hidden: 0 } };
    }
    if (path.includes("certificate-policy")) throw new Error("policy not needed");
    if (path.includes("/api/pro/profile")) return { user: { id: ME, displayName: "Я", partnerType: "COMPANY" } };
    throw new Error(`unexpected fetch ${path}`);
  });
}

function mount(audience: "business-company-r04" | "specialist-r04" | "agent-r04") {
  return render(
    <PartnersHub
      meId={ME}
      initialProfile={{ user: { id: ME, displayName: "Я", partnerType: "COMPANY" } } as never}
      variant="agent-r04"
      agentPresentation="overview"
      partnersAudience={audience}
    />,
  );
}

beforeEach(() => {
  vi.mocked(remcardFetch).mockReset();
});

describe("PartnersHub direction tabs", () => {
  it("splits rows by direction, counts rows per tab and shows a direction badge on each row", async () => {
    mockList([row("in-1", "A", "incoming"), row("in-2", "B", "incoming"), row("out-1", "A", "outgoing")]);
    mount("business-company-r04");
    const tabs = await screen.findByTestId("partner-direction-tabs");
    expect(within(tabs).getByTestId("partner-direction-tab-incoming")).toHaveTextContent("Нас рекомендуют");
    expect(within(tabs).getByTestId("partner-direction-tab-incoming")).toHaveTextContent("2");
    expect(within(tabs).getByTestId("partner-direction-tab-outgoing")).toHaveTextContent("Мы рекомендуем");
    expect(within(tabs).getByTestId("partner-direction-tab-outgoing")).toHaveTextContent("1");
    await waitFor(() => expect(screen.getAllByTestId("partner-row-direction").length).toBeGreaterThan(0));
    const incomingBadges = screen.getAllByTestId("partner-row-direction");
    expect(incomingBadges.every((badge) => badge.getAttribute("data-direction-glyph") === "↓")).toBe(true);
    await userEvent.click(screen.getByTestId("partner-direction-tab-outgoing"));
    await waitFor(() => {
      const badges = screen.getAllByTestId("partner-row-direction");
      expect(badges.every((badge) => badge.getAttribute("data-direction-glyph") === "↑")).toBe(true);
    });
  });

  it("uses the specialist wording", async () => {
    mockList([row("in-1", "A", "incoming")]);
    mount("specialist-r04");
    const tabs = await screen.findByTestId("partner-direction-tabs");
    expect(within(tabs).getByTestId("partner-direction-tab-incoming")).toHaveTextContent("Меня рекомендуют");
    expect(within(tabs).getByTestId("partner-direction-tab-outgoing")).toHaveTextContent("Я рекомендую");
  });

  it("shows no direction tabs for an agent", async () => {
    mockList([row("out-1", "A", "outgoing")]);
    mount("agent-r04");
    await screen.findByTestId("agent-active-collection");
    expect(screen.queryByTestId("partner-direction-tabs")).toBeNull();
  });
  it("sends the displayed version with accept so a stale click cannot accept a changed offer", async () => {
    const invited = { ...row("in-1", "A", "incoming"), status: "INVITED", initiatedBy: "A", updatedAt: "2026-02-03T04:05:06.789Z" } as Partnership;
    const calls: Array<{ path: string; init?: { method?: string; body?: unknown } }> = [];
    vi.mocked(remcardFetch).mockImplementation(async (path: string, init?: { method?: string; body?: unknown }) => {
      calls.push({ path, init });
      if (path.includes("/api/partnership/list")) return { partnerships: [invited], listCounts: { active: 1, archive: 0, hidden: 0 } };
      if (path === "/api/partnership/in-1" && init?.method === "PATCH") return { ok: true };
      if (path.includes("certificate-policy")) throw new Error("policy not needed");
      if (path.includes("/api/pro/profile")) return { user: { id: ME, displayName: "Я", partnerType: "COMPANY" } };
      throw new Error(`unexpected fetch ${path}`);
    });
    mount("business-company-r04");
    const accept = (await screen.findAllByTestId("partner-action-accept"))[0]!;
    await userEvent.click(accept);
    await waitFor(() => expect(calls.some((c) => c.init?.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.init?.method === "PATCH")!;
    expect(patch.init?.body).toEqual({ action: "accept", expectedUpdatedAt: "2026-02-03T04:05:06.789Z" });
  });
});
