import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPartnersHub } from "./AgentPartnersHub";
import { PartnersHub } from "./PartnersHub";
import type { Partnership, ProProfileResponse } from "@/lib/types";
import { remcardFetch } from "@/lib/api-client";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/lib/agent-r04/api", () => ({
  patchPartnershipListPreference: vi.fn(),
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
    displayName: "Agent",
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

function partnership(overrides: Partial<Partnership>): Partnership {
  return {
    id: "p-base",
    status: "INVITED",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    storeUserId: "store-1",
    proUserId: "agent-me",
    terms: [],
    storeUser: {
      id: "store-1",
      displayName: "Store",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
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

const termRequestsById: Record<string, unknown[]> = {};

function mockListRoutes(
  partnerships: Partnership[] | "malformed" | "missing-field",
  listBehavior?: "ok" | "error" | "401" | "403" | "network" | "pending",
  listMessage = "Список недоступен",
) {
  vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
    if (path === "/api/partnership/list") {
      if (listBehavior === "pending") {
        return new Promise(() => {});
      }
      if (listBehavior === "401") {
        throw new (await import("@/lib/api-client")).RemcardApiError(401, "Нужна авторизация");
      }
      if (listBehavior === "403") {
        throw new (await import("@/lib/api-client")).RemcardApiError(403, "Нет доступа");
      }
      if (listBehavior === "network") {
        throw new Error("Failed to fetch");
      }
      if (listBehavior === "error") {
        throw new (await import("@/lib/api-client")).RemcardApiError(500, listMessage);
      }
      if (partnerships === "malformed") {
        return { partnerships: null };
      }
      if (partnerships === "missing-field") {
        return {};
      }
      return { partnerships };
    }
    if (typeof path === "string" && path.startsWith("/api/partnerships/") && path.endsWith("/term-change")) {
      const id = path.split("/")[3]!;
      const known = Array.isArray(partnerships) && partnerships.some((p) => p.id === id);
      if (!known) {
        throw new (await import("@/lib/api-client")).RemcardApiError(403, "Нет доступа");
      }
      return { requests: termRequestsById[id] ?? [] };
    }
    if (path === "/api/partnership/link-invite" && init?.method !== "POST") {
      return { invites: [] };
    }
    if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
      return { partners: [], nextCursor: null };
    }
    throw new Error(`unexpected ${String(path)}`);
  });
}

function renderOverviewHub(audience: PartnersHubAudience, useAgentShell = false) {
  const props = {
    meId: "agent-me",
    initialProfile: agentProfile,
    variant: "agent-r04" as const,
    agentPresentation: "overview" as const,
    partnersAudience: audience,
    onOpenPartnerHub: vi.fn(),
  };
  if (useAgentShell) {
    return render(
      <AgentPartnersHub
        meId={props.meId}
        initialProfile={props.initialProfile}
        presentationAudience={audience}
      />,
    );
  }
  return render(<PartnersHub {...props} />);
}


const termFetches = () =>
  vi
    .mocked(remcardFetch)
    .mock.calls.map((c) => String(c[0]))
    .filter((p) => p.endsWith("/term-change"));

function named(id: string, displayName: string, overrides: Partial<Partnership> = {}) {
  return partnership({
    id,
    storeUserId: `store-${id}`,
    initiatedBy: `store-${id}`,
    storeUser: {
      id: `store-${id}`,
      displayName,
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "STORE",
    },
    ...overrides,
  });
}

describe("notification deep link /partners?terms=<partnershipId>", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    for (const k of Object.keys(termRequestsById)) delete termRequestsById[k];
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
  });

  it("pending term-change request: opens that partnership's request panel with the decision actions", async () => {
    termRequestsById["act-1"] = [
      {
        id: "req-1",
        status: "PENDING",
        requestedBy: "store-act-1",
        changes: [{ category: "doors", newPercent: 12 }],
        rejectionReason: null,
        expiresAt: "2099-01-01T00:00:00Z",
        createdAt: "2026-11-16T00:00:00Z",
      },
    ];
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=act-1"));
    mockListRoutes([
      named("act-0", "Другой партнёр", { status: "ACTIVE" }),
      named("act-1", "Фабрика Соляник", { status: "ACTIVE" }),
    ]);
    render(<PartnersHub meId="agent-me" initialProfile={agentProfile} variant="agent-r04" agentPresentation="overview" partnersAudience={"agent-r04" as PartnersHubAudience} onOpenPartnerHub={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("partner-term-change-panel")).toBeInTheDocument());
    expect(screen.getByTestId("term-change-partner-name")).toHaveTextContent("Фабрика Соляник");
    expect(await screen.findByTestId("term-change-approve-req-1")).toBeInTheDocument();
    expect(termFetches()).toEqual(["/api/partnerships/act-1/term-change"]);
  });

  it("incoming invitation beyond the first page: the record is paged into view", async () => {
    const many = Array.from({ length: 27 }, (_, i) => named(`inv-${i}`, `Партнёр ${String(i).padStart(2, "0")}`));
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=inv-26"));
    mockListRoutes(many);
    render(<PartnersHub meId="agent-me" initialProfile={agentProfile} variant="agent-r04" agentPresentation="overview" partnersAudience={"agent-r04" as PartnersHubAudience} onOpenPartnerHub={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText("Партнёр 26").length).toBeGreaterThan(0));
    expect(screen.queryByText("Партнёр 00")).not.toBeInTheDocument();
  });

  it("unknown / foreign id: no foreign data is shown, no panel opens and the list stays usable", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=someone-elses"));
    mockListRoutes([named("mine-1", "Мой партнёр", { status: "ACTIVE" })]);
    render(<PartnersHub meId="agent-me" initialProfile={agentProfile} variant="agent-r04" agentPresentation="overview" partnersAudience={"agent-r04" as PartnersHubAudience} onOpenPartnerHub={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText("Мой партнёр").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.queryByTestId("partners-overview-tiles")).toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 30));
    expect(termFetches()).toEqual([]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partner-term-change-panel")).not.toBeInTheDocument();
  });

  const renderHub = () =>
    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        partnersAudience={"agent-r04" as PartnersHubAudience}
        onOpenPartnerHub={vi.fn()}
      />,
    );

  it("incoming invitation: the invitation itself opens (with the sender comment), not a term-change editor", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=inv-1"));
    mockListRoutes([
      named("inv-0", "Первый", { note: "Чужой комментарий" }),
      named("inv-1", "Фабрика Соляник", { note: "Условия обсудим лично" }),
    ]);
    renderHub();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Фабрика Соляник");
    expect(dialog).toHaveTextContent("Условия обсудим лично");
    expect(dialog).not.toHaveTextContent("Чужой комментарий");
    expect(screen.queryByTestId("partner-term-change-panel")).not.toBeInTheDocument();
    expect(termFetches()).toEqual([]);
  });

  it("closing the opened invitation does not reopen it", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=inv-1"));
    mockListRoutes([named("inv-1", "Фабрика Соляник", { note: "Условия обсудим лично" })]);
    renderHub();
    const dialog = await screen.findByRole("dialog");
    const close = within(dialog).getAllByRole("button").find((b) => /закрыть/i.test(b.textContent ?? b.getAttribute("aria-label") ?? ""));
    expect(close).toBeTruthy();
    await userEvent.click(close!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("counter-offer in negotiation (PENDING) opens its own record", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=pend-1"));
    mockListRoutes([named("pend-1", "Встречные условия", { status: "PENDING", pendingProposedBy: "store-pend-1" })]);
    renderHub();
    expect(await screen.findByRole("dialog")).toHaveTextContent("Встречные условия");
    expect(screen.queryByTestId("partner-term-change-panel")).not.toBeInTheDocument();
  });

  it("terminal record (ended): opens that very record read-only with its status, no actions and no editor", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=end-1"));
    mockListRoutes([
      named("end-1", "Завершённый партнёр", { status: "ENDED", note: "Комментарий завершённой" }),
      named("live-1", "Действующий партнёр", { status: "ACTIVE" }),
    ]);
    renderHub();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Завершённый партнёр");
    expect(dialog).toHaveTextContent("Завершено");
    expect(dialog).toHaveTextContent("Комментарий завершённой");
    expect(dialog).not.toHaveTextContent("Действующий партнёр");
    expect(within(dialog).queryByTestId("partner-detail-actions")).not.toBeInTheDocument();
    for (const label of [/принять/i, /отклонить/i, /предложение агенту/i, /приостановить/i, /изменить условия/i, /предложить/i, /возобновить/i]) {
      expect(within(dialog).queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.queryByTestId("partner-term-change-panel")).not.toBeInTheDocument();
    expect(termFetches()).toEqual([]);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("terminal record is not added to the active list or the counters", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=end-1"));
    mockListRoutes([
      named("end-1", "Завершённый партнёр", { status: "ENDED" }),
      named("live-1", "Действующий партнёр", { status: "ACTIVE" }),
    ]);
    renderHub();
    const dialog = await screen.findByRole("dialog");
    const behind = within(document.body).queryAllByText("Завершённый партнёр").filter((el) => !dialog.contains(el));
    expect(behind).toHaveLength(0);
    expect(screen.getAllByText("Действующий партнёр").length).toBeGreaterThan(0);
  });

  it("closing the read-only terminal dialog does not reopen it", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=end-1"));
    mockListRoutes([named("end-1", "Завершённый партнёр", { status: "ENDED" })]);
    renderHub();
    const dialog = await screen.findByRole("dialog");
    const close = within(dialog).getAllByRole("button").find((b) => /закрыть/i.test(b.textContent ?? b.getAttribute("aria-label") ?? ""));
    await userEvent.click(close!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("archived incoming invitation (not rendered by any collection) opens read-only, without accept/decline", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=arch-1"));
    mockListRoutes([
      named("arch-1", "Архивный партнёр", {
        note: "Старый комментарий",
        listPreference: { personalAlias: null, archivedAt: "2026-10-05T00:00:00Z", hiddenAt: null },
      }),
    ]);
    renderHub();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Архивный партнёр");
    expect(dialog).toHaveTextContent("Старый комментарий");
    expect(within(dialog).queryByTestId("partner-detail-actions")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /принять|отклонить/i })).not.toBeInTheDocument();
  });

  it("live incoming invitation keeps its decision actions in the opened dialog", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=inv-1"));
    mockListRoutes([named("inv-1", "Фабрика Соляник", { note: "Условия обсудим лично" })]);
    renderHub();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByTestId("partner-detail-actions")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /предложение агенту/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /отклонить/i })).toBeInTheDocument();
  });

  it("outgoing invitation I sent opens as waiting, with no accept/decline for me", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=out-1"));
    mockListRoutes([named("out-1", "Мой адресат", { initiatedBy: "agent-me", note: "Моё приглашение" })]);
    renderHub();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Мой адресат");
    expect(within(dialog).queryByRole("button", { name: /^принять/i })).not.toBeInTheDocument();
  });
});
