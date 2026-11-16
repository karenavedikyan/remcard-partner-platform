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

type Role = "store" | "company" | "specialist" | "agent";

const ROLES: Record<
  Role,
  {
    user: Record<string, unknown>;
    context: Record<string, unknown>;
    r04: boolean;
    r06: boolean;
    audience: string;
    canEdit: boolean;
  }
> = {
  store: {
    user: { partnerType: "STORE", partnerActivities: ["STORE"] },
    context: {
      role: "ORG_OWNER",
      organization: { id: "org-1", name: "Магазин", partnerType: "STORE", ownerId: ME },
    },
    r04: false,
    r06: false,
    audience: "business-store-r04",
    canEdit: true,
  },
  company: {
    user: { partnerType: "COMPANY", partnerActivities: ["SERVICE"] },
    context: {
      role: "ORG_OWNER",
      organization: { id: "org-2", name: "Компания", partnerType: "COMPANY", ownerId: ME },
    },
    r04: false,
    r06: false,
    audience: "business-company-r04",
    canEdit: true,
  },
  specialist: {
    user: { partnerType: "MASTER", partnerActivities: ["SERVICE"] },
    context: { role: "SOLO_PARTNER" },
    r04: false,
    r06: true,
    audience: "specialist-r04",
    canEdit: true,
  },
  agent: {
    user: { partnerType: null, partnerActivities: ["AGENT"] },
    context: { role: "SOLO_PARTNER" },
    r04: true,
    r06: false,
    audience: "agent-r04",
    canEdit: false,
  },
};

const terms = (tag: string, entries: Array<[string, string, number, boolean?]>) =>
  entries.map(([category, categoryLabel, storePercent, isExcluded], index) => ({
    id: `${tag}-${index}`,
    category,
    categoryLabel,
    storePercent,
    isExcluded: Boolean(isExcluded),
  }));

function directedRow(id: string, direction: "incoming" | "outgoing", counterpartyId: string, name: string, entries: Array<[string, string, number, boolean?]>) {
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
    terms: terms(id, entries),
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

const OUTGOING_ROW = directedRow("row-out", "outgoing", "cp-out", "Компания Краски", [
  ["paint", "Краски", 7],
  ["tools", "Инструмент", 0],
  ["handles", "Ручки", 0, true],
]);
const INCOMING_ROW = directedRow("row-in", "incoming", "cp-in", "Магазин Двери", [["doors", "Двери", 10]]);

const eff = (validityDays: number, purchaseLimit: number) => ({
  validityDays,
  purchaseLimit,
  minimumPurchaseAmount: null,
  promotionsCompatible: true,
  exclusionsText: null,
  categoryRates: [],
});

const WORKSPACE = {
  general: { effective: eff(30, 2) },
  incomingProposals: [],
  counterparties: [
    { userId: "cp-out", displayName: "Компания Краски", roleLabel: "Компания", initials: "КК", status: "individual", partnershipId: "row-out", direction: "outgoing", readOnly: true, effective: eff(14, 1) },
    { userId: "cp-in", displayName: "Магазин Двери", roleLabel: "Магазин", initials: "МД", status: "general", partnershipId: "row-in", direction: "incoming", readOnly: false, effective: eff(45, 3) },
  ],
};

function arrange(role: Role, contextOk = true) {
  const cfg = ROLES[role];
  const user = { id: ME, role: "PRO", displayName: "Я", isBlocked: false, ...cfg.user };
  sessionUser.value = user;
  upstream.calls = [];
  upstream.responses = new Map<string, unknown>([
    ["/api/pro/profile", { user, organization: (cfg.context.organization as unknown) ?? null }],
    ["/api/pro/r04/status", { featureEnabled: cfg.r04, eligible: cfg.r04 }],
    ["/api/pro/r06/status", { featureEnabled: cfg.r06, eligible: cfg.r06 }],
  ]);
  if (contextOk) upstream.responses.set("/api/pro/context", cfg.context);
  vi.mocked(remcardFetch).mockReset();
  vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
    if (path.includes("/api/partnership/list")) {
      const rows = role === "agent" ? [OUTGOING_ROW] : [INCOMING_ROW, OUTGOING_ROW];
      return { partnerships: rows, listCounts: { active: rows.length, archive: 0, hidden: 0 } };
    }
    if (path.includes("certificate-policy")) return WORKSPACE;
    if (path.includes("/api/pro/profile")) return { user };
    throw new Error(`unexpected fetch ${path}`);
  });
}

function ratesOf(list: HTMLElement): string {
  return within(list)
    .getAllByTestId("partner-row-category-rate")
    .filter((row) => row.getAttribute("data-excluded") !== "true")
    .map((row) => `${row.querySelector("dt")?.textContent} ${row.querySelector("dd")?.textContent}`)
    .join(" · ");
}

async function renderPage(): Promise<void> {
  const element = (await PartnersPage({ searchParams: Promise.resolve({}) })) as ReactElement;
  render(element);
}

beforeEach(() => {
  vi.mocked(remcardFetch).mockReset();
});

describe("/partners page wires the trusted pro context into the shared hub", () => {
  it.each(["store", "company", "specialist"] as const)(
    "%s owner gets the general policy entry with summary and the editor",
    async (role) => {
      arrange(role);
      await renderPage();
      const shell = await screen.findByTestId("agent-r04-partners");
      expect(shell.getAttribute("data-partners-audience")).toBe(ROLES[role].audience);
      expect(await screen.findByTestId("cp-profile-entry")).toBeTruthy();
      expect(screen.getByTestId("cp-open-settings").textContent).toBe("Настроить");
      await waitFor(() => expect(screen.getByTestId("cp-entry-summary").textContent).toContain("30"));
    },
  );

  it.each(["store", "company", "specialist"] as const)(
    "%s: the outgoing list shows recipient rates with secondary validity and purchases, and the detail agrees with receiver-only terms",
    async (role) => {
      arrange(role);
      await renderPage();
      await screen.findByTestId("agent-r04-partners");
      await userEvent.click(await screen.findByTestId("partner-direction-tab-outgoing"));
      const preview = (await screen.findAllByTestId("partner-row-terms-preview"))[0]!;
      expect(ratesOf(preview)).toBe("Краски 7% · Инструмент 0%");
      const block = preview.closest('[data-testid="partner-row-terms-block"]') as HTMLElement;
      await waitFor(() => expect(within(block).getByTestId("partner-row-restrictions").textContent).toContain("14 дней · 1 покупка"));
      const excluded = within(block).getByTestId("partner-row-excluded-category");
      expect(excluded.textContent).toBe("Не участвует");
      expect(excluded.closest("[data-testid=partner-row-category-rate]")?.querySelector("dt")?.textContent).toBe("Ручки");

      const detailTrigger = screen.getAllByRole("button", { name: /Компания Краски/ })[0]!;
      await userEvent.click(detailTrigger);
      const dialog = await screen.findByTestId("partner-partnership-detail-dialog");
      expect(within(dialog).getByTestId("partner-detail-receiver-terms")).toBeTruthy();
      await waitFor(() => expect(within(dialog).getByTestId("partner-detail-restrictions-line").textContent).toContain("14 дней"));
      const action = within(dialog).getByTestId("partner-detail-term-change");
      expect(action.textContent).toBe("Посмотреть условия");
    },
  );

  it("the active tile counts only the selected direction, not the union of both", async () => {
    arrange("company");
    const rows = [
      directedRow("in-1", "incoming", "cp-a", "Магазин А", [["doors", "Двери", 10]]),
      directedRow("in-2", "incoming", "cp-b", "Магазин Б", [["doors", "Двери", 10]]),
      directedRow("in-3", "incoming", "cp-c", "Магазин В", [["doors", "Двери", 10]]),
      directedRow("out-1", "outgoing", "cp-a", "Магазин А", [["paint", "Краски", 7]]),
    ];
    const base = vi.mocked(remcardFetch).getMockImplementation()!;
    vi.mocked(remcardFetch).mockImplementation(async (path: string, init?: unknown) => {
      if (String(path).includes("/api/partnership/list")) {
        return { partnerships: rows, listCounts: { active: rows.length, archive: 0, hidden: 0 } };
      }
      return base(path, init as never);
    });
    await renderPage();
    await screen.findByTestId("agent-r04-partners");
    await waitFor(() => expect(screen.getByTestId("partners-tile-active").textContent).toContain("3"));
    expect(screen.getByTestId("partners-tile-active").textContent).not.toContain("4");
    await userEvent.click(await screen.findByTestId("partner-direction-tab-outgoing"));
    await waitFor(() => expect(screen.getByTestId("partners-tile-active").textContent).toContain("1"));
    expect(screen.getByTestId("partners-tile-active").textContent).not.toContain("3");
  });

  it("an incoming row keeps the editable terms action", async () => {
    arrange("company");
    await renderPage();
    await screen.findByTestId("agent-r04-partners");
    const buttons = await screen.findAllByTestId("partner-term-change-row-in");
    expect(buttons[0]!.textContent).toBe("Изменить условия");
  });

  it("agent: outgoing-only wording and no own receiving settings", async () => {
    arrange("agent");
    await renderPage();
    await screen.findByTestId("agent-r04-partners");
    expect(screen.queryByTestId("partner-direction-tabs")).toBeNull();
    const overview = await screen.findByTestId("partners-overview");
    expect(overview.textContent).toContain("Партнёры, которым вы рекомендуете клиентов");
    expect(overview.textContent).not.toContain("кто рекомендует вас");
    expect(overview.textContent).not.toContain("обмениваетесь клиентами");
  });

  it("agent gets no own receiving settings and no summary of own terms", async () => {
    arrange("agent");
    await renderPage();
    const shell = await screen.findByTestId("agent-r04-partners");
    expect(shell.getAttribute("data-partners-audience")).toBe("agent-r04");
    expect(await screen.findByTestId("cp-profile-entry")).toBeTruthy();
    expect(screen.getByTestId("cp-open-settings").textContent).toBe("Посмотреть");
    expect(screen.queryByTestId("cp-entry-summary")).toBeNull();
    expect(
      vi.mocked(remcardFetch).mock.calls.some(([, init]) => (init as { method?: string } | undefined)?.method === "PATCH"),
    ).toBe(false);
    const block = (await screen.findAllByTestId("partner-row-terms-block"))[0]!;
    await waitFor(() => expect(within(block).getByTestId("partner-row-restrictions").textContent).toContain("14 дней · 1 покупка"));
  });

  it("without a trusted context no policy entry is shown (owner is not inferred from the profile organization)", async () => {
    arrange("store", false);
    await renderPage();
    await waitFor(() =>
      expect(
        vi.mocked(remcardFetch).mock.calls.some(([path]) => String(path).includes("/api/partnership/list")),
      ).toBe(true),
    );
    expect(screen.queryByTestId("cp-profile-entry")).toBeNull();
  });

  it("an organization employee context never gets the entry", async () => {
    arrange("store");
    upstream.responses.set("/api/pro/context", {
      role: "ORG_EMPLOYEE",
      organization: { id: "org-1", name: "Магазин", partnerType: "STORE", ownerId: "someone-else" },
    });
    await renderPage();
    await waitFor(() => expect(upstream.calls).toContain("/api/pro/context"));
    expect(screen.queryByTestId("cp-profile-entry")).toBeNull();
  });
});
