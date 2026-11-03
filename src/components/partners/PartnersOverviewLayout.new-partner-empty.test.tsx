import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPartnersHub } from "./AgentPartnersHub";
import { PartnersHub } from "./PartnersHub";
import type { Partnership, ProProfileResponse } from "@/lib/types";
import { remcardFetch } from "@/lib/api-client";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";

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

function mockListRoutes(
  partnerships: Partnership[],
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
      return { partnerships };
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

describe("Partners overview onboarding gate (collectionIsEmpty)", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it.each([
    ["agent-r04", /Соберите сеть партнёров/i],
    ["specialist-r04", /Соберите сеть партнёров/i],
    ["business-store-r04", /Партнёры приведут клиентов/i],
    ["business-company-r04", /Партнёры приведут клиентов/i],
  ] as const)("shows onboarding for API-empty collection (%s)", async (audience, title) => {
    mockListRoutes([]);
    renderOverviewHub(audience);
    await waitFor(() => {
      expect(screen.getByTestId("partners-empty")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByTestId("partners-overview-tiles")).not.toBeInTheDocument();
  });

  it.each([
    ["agent-r04"],
    ["specialist-r04"],
    ["business-store-r04"],
    ["business-company-r04"],
  ] as const)(
    "AgentPartnersHub + remcardFetch: history-only collection is not onboarding (%s)",
    async (audience) => {
      mockListRoutes([
        partnership({ id: "ended-1", status: "ENDED" }),
        partnership({ id: "rej-1", status: "REJECTED" }),
      ]);
      renderOverviewHub(audience, true);
      await waitFor(() => {
        expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    },
  );

  it("history-only (ENDED+REJECTED) shows overview tiles, not onboarding", async () => {
    mockListRoutes([
      partnership({ id: "ended-1", status: "ENDED" }),
      partnership({ id: "rej-1", status: "REJECTED" }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("archived-only shows overview tiles, not onboarding", async () => {
    mockListRoutes([
      partnership({
        id: "arch-1",
        status: "ACTIVE",
        listPreference: { archivedAt: "2026-01-01T00:00:00Z", hiddenAt: null, alias: null },
      }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("hidden-only shows overview tiles, not onboarding", async () => {
    mockListRoutes([
      partnership({
        id: "hid-1",
        status: "ACTIVE",
        listPreference: { hiddenAt: "2026-01-01T00:00:00Z", archivedAt: null, alias: null },
      }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("INVITED pending shows overview (decisions), not onboarding", async () => {
    mockListRoutes([partnership({ id: "in-1", status: "INVITED", initiatedBy: "store-1" })]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("partners-tile-decide")).toHaveTextContent("1");
  });

  it("keeps tiles when list has ACTIVE row", async () => {
    mockListRoutes([partnership({ id: "p-active", status: "ACTIVE" })]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("shows loading without onboarding", () => {
    mockListRoutes([], "pending");
    renderOverviewHub("agent-r04");
    expect(screen.getByTestId("partners-overview-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("shows 500 error with retry without onboarding", async () => {
    mockListRoutes([], "error");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Повторить/i }));
    expect(remcardFetch).toHaveBeenCalledWith("/api/partnership/list");
  });

  it("shows 401 without onboarding", async () => {
    mockListRoutes([], "401");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("shows 403 without onboarding", async () => {
    mockListRoutes([], "403");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("shows network failure without onboarding", async () => {
    mockListRoutes([], "network");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    expect(screen.getByText(/Не удалось загрузить список/i)).toBeInTheDocument();
  });

  it("does not show onboarding when collection has rows but overview counts are zero", async () => {
    mockListRoutes([partnership({ id: "ended-1", status: "ENDED" })]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("partners-tile-active")).toHaveTextContent("0");
  });
});
