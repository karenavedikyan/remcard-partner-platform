/** @vitest-environment jsdom */
/**
 * P23c invitation withdraw dedup — snapshot-scoped (not partnership.id alone).
 * Closes Computer-found P24b settled-Set regression (id blocked through INVITED/PENDING).
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import type { Partnership, ProProfileResponse } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [],
    services: [],
    stages: [],
  }),
}));

vi.mock("@/components/partners/AgentPartnerWorkspaceActions", () => ({
  AgentPartnerWorkspaceActions: () => <div data-testid="workspace-actions-stub" />,
}));

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

const agentProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "agent-me",
    publicId: "RC-AGENT",
    displayName: "Agent User",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
    description: null,
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: [],
    areas: [],
    website: null,
    telegram: null,
    whatsapp: null,
    instagram: null,
    vk: null,
    max: null,
    yandex: null,
    publicEmail: null,
    publicPhone: null,
    showFullName: false,
  },
};

function baseRow(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "pair-1",
    status: "INVITED",
    initiatedBy: "agent-me",
    pendingProposedBy: null,
    note: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    storeUserId: "store-1",
    proUserId: "agent-me",
    terms: [],
    storeUser: {
      id: "store-1",
      displayName: "Магазин",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-me",
      displayName: "Agent User",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    ...overrides,
  };
}

function patchCalls(): Array<{ path: string; body: unknown }> {
  return vi
    .mocked(remcardFetch)
    .mock.calls.filter(([, init]) => init?.method === "PATCH")
    .map(([path, init]) => ({
      path: String(path),
      body: init?.body,
    }));
}

const hubProps = {
  meId: "agent-me",
  initialProfile: agentProfile,
  variant: "agent-r04" as const,
  agentPresentation: "overview" as const,
  partnersAudience: "agent-r04" as const,
};

describe("PartnersHub P23c withdraw snapshot dedup", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("dismiss cancel confirm sends zero PATCH", async () => {
    const row = baseRow();
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/partnership/list") return { partnerships: [row] };
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      if (path === `/api/partnership/${row.id}` && init?.method === "PATCH") {
        return { partnership: { ...row, status: "CANCELLED" } };
      }
      throw new Error(`unexpected ${String(path)}`);
    });
    render(<PartnersHub {...hubProps} />);
    await waitFor(() => expect(screen.getByTestId("partners-zone-waiting")).toBeVisible());
    await userEvent.click(
      within(screen.getByTestId("partners-zone-waiting")).getAllByTestId("partner-action-cancel")[0]!,
    );
    await screen.findByTestId("partner-cancel-confirm");
    await userEvent.click(screen.getByTestId("partner-cancel-confirm-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("partner-cancel-confirm")).toBeNull());
    expect(patchCalls()).toHaveLength(0);
  });

  it("confirm cancel: 1 PATCH; double-confirm stays at 1; terminal has no further cancel", async () => {
    let listRow = baseRow();
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/partnership/list") return { partnerships: [listRow] };
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      if (path === `/api/partnership/${listRow.id}` && init?.method === "PATCH") {
        listRow = { ...listRow, status: "CANCELLED", updatedAt: "2026-10-01T10:05:00.000Z" };
        return { partnership: listRow };
      }
      throw new Error(`unexpected ${String(path)}`);
    });
    render(<PartnersHub {...hubProps} />);
    await waitFor(() => expect(screen.getByTestId("partners-zone-waiting")).toBeVisible());
    await userEvent.click(
      within(screen.getByTestId("partners-zone-waiting")).getAllByTestId("partner-action-cancel")[0]!,
    );
    const confirm = await screen.findByTestId("partner-cancel-confirm-confirm");
    await userEvent.click(confirm);
    await userEvent.click(confirm);
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(patchCalls()[0]?.body).toEqual({ action: "cancel" });
    await waitFor(() => expect(screen.queryByTestId("partner-cancel-confirm")).toBeNull());
    expect(screen.queryAllByTestId("partner-action-cancel")).toHaveLength(0);
  });

  it("PATCH failure unlocks retry; success then settles that snapshot only", async () => {
    const row = baseRow();
    let patchAttempts = 0;
    let listRow = row;
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/partnership/list") return { partnerships: [listRow] };
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      if (path === `/api/partnership/${row.id}` && init?.method === "PATCH") {
        patchAttempts += 1;
        if (patchAttempts === 1) {
          throw new RemcardApiError(500, "Сервер недоступен");
        }
        listRow = { ...row, status: "CANCELLED", updatedAt: "2026-10-01T10:05:00.000Z" };
        return { partnership: listRow };
      }
      throw new Error(`unexpected ${String(path)}`);
    });
    render(<PartnersHub {...hubProps} />);
    await waitFor(() => expect(screen.getByTestId("partners-zone-waiting")).toBeVisible());
    await userEvent.click(
      within(screen.getByTestId("partners-zone-waiting")).getAllByTestId("partner-action-cancel")[0]!,
    );
    await screen.findByTestId("partner-cancel-confirm");
    await userEvent.click(screen.getByTestId("partner-cancel-confirm-confirm"));
    await screen.findByTestId("partner-cancel-confirm-error");
    expect(patchAttempts).toBe(1);
    await userEvent.click(screen.getByTestId("partner-cancel-confirm-confirm"));
    await waitFor(() => expect(patchAttempts).toBe(2));
    expect(patchCalls()).toHaveLength(2);
  });

  it("withdraw_counter 1 → INVITED refresh → new PENDING/new updatedAt allows another withdraw_counter 1; double-confirm 0 additional", async () => {
    const t0 = "2026-10-01T10:00:00.000Z";
    const t1 = "2026-10-01T11:00:00.000Z";
    const t2 = "2026-10-01T12:00:00.000Z";
    let listRow = baseRow({
      status: "PENDING",
      pendingProposedBy: "agent-me",
      updatedAt: t0,
      initiatedBy: "store-1",
    });
    let withdrawCount = 0;
    /** After first withdraw_counter PATCH, next list fetch serves a new partner proposal. */
    let serveNewProposalOnNextList = false;

    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/partnership/list") {
        if (serveNewProposalOnNextList) {
          serveNewProposalOnNextList = false;
          listRow = {
            ...listRow,
            status: "PENDING",
            pendingProposedBy: "agent-me",
            updatedAt: t2,
            initiatedBy: "store-1",
          };
        }
        return { partnerships: [listRow] };
      }
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      if (path === `/api/partnership/${listRow.id}` && init?.method === "PATCH") {
        const body = init.body as { action?: string };
        if (body?.action !== "withdraw_counter") {
          throw new Error(`unexpected action ${JSON.stringify(body)}`);
        }
        withdrawCount += 1;
        // Backend: PENDING → INVITED (not terminal) with new updatedAt.
        listRow = {
          ...listRow,
          status: "INVITED",
          pendingProposedBy: null,
          updatedAt: withdrawCount === 1 ? t1 : "2026-10-01T13:00:00.000Z",
          initiatedBy: "store-1",
        };
        if (withdrawCount === 1) {
          // Partner sends a new counter before/at next list refresh after this PATCH.
          serveNewProposalOnNextList = true;
        }
        return { partnership: listRow };
      }
      throw new Error(`unexpected ${String(path)}`);
    });

    render(<PartnersHub {...hubProps} />);
    await waitFor(() => expect(screen.getByTestId("partners-zone-waiting")).toBeVisible());

    await userEvent.click(
      within(screen.getByTestId("partners-zone-waiting")).getAllByTestId(
        "partner-action-withdraw_counter",
      )[0]!,
    );
    await screen.findByTestId("partner-withdraw_counter-confirm");
    await userEvent.click(screen.getByTestId("partner-withdraw_counter-confirm-confirm"));
    await waitFor(() => expect(patchCalls()).toHaveLength(1));

    // loadList after PATCH serves new PENDING@t2 — new legal withdraw_counter
    await waitFor(() => {
      expect(
        within(screen.getByTestId("partners-zone-waiting")).queryAllByTestId(
          "partner-action-withdraw_counter",
        ).length,
      ).toBeGreaterThan(0);
    });

    await userEvent.click(
      within(screen.getByTestId("partners-zone-waiting")).getAllByTestId(
        "partner-action-withdraw_counter",
      )[0]!,
    );
    const confirm2 = await screen.findByTestId("partner-withdraw_counter-confirm-confirm");
    await userEvent.click(confirm2);
    await userEvent.click(confirm2);
    await waitFor(() => expect(patchCalls()).toHaveLength(2));
    expect(patchCalls().every((c) => c.body && (c.body as { action: string }).action === "withdraw_counter")).toBe(
      true,
    );
    expect(withdrawCount).toBe(2);
  });
});
