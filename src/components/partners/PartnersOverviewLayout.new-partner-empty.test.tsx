import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPartnersHub } from "./AgentPartnersHub";
import { PartnersHub } from "./PartnersHub";
import type { Partnership, ProProfileResponse } from "@/lib/types";
import { remcardFetch } from "@/lib/api-client";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";

import { PARTNERS_NEW_PARTNER_EMPTY_FOOT, PARTNERS_NEW_PARTNER_EMPTY_HISTORY_KICKER } from "./partners-new-partner-empty/copy";
import { patchPartnershipListPreference } from "@/lib/agent-r04/api";

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

describe("Partners overview greeting (current empty)", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(patchPartnershipListPreference).mockReset();
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
  });

  it.each([
    ["agent-r04", /Соберите сеть партнёров/i],
    ["specialist-r04", /Соберите сеть партнёров/i],
    ["business-store-r04", /Партнёры приведут клиентов/i],
    ["business-company-r04", /Партнёры приведут клиентов/i],
  ] as const)("true API empty shows hero only (%s)", async (audience, title) => {
    mockListRoutes([]);
    renderOverviewHub(audience);
    await waitFor(() => {
      expect(screen.getByTestId("partners-empty")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByTestId("partners-empty")).toHaveAttribute(
      "data-partners-empty-variant",
      "true-empty",
    );
    expect(screen.getByText(PARTNERS_NEW_PARTNER_EMPTY_FOOT)).toBeInTheDocument();
    expect(screen.queryByTestId("partners-overview-tiles")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partners-overview-legacy-disclosure")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-r04-list-toolbar")).not.toBeInTheDocument();
  });

  it.each([
    ["agent-r04"],
    ["specialist-r04"],
    ["business-store-r04"],
    ["business-company-r04"],
  ] as const)(
    "history-only shows greeting and disclosure before legacy controls (%s)",
    async (audience) => {
      mockListRoutes([
        partnership({ id: "ended-1", status: "ENDED" }),
        partnership({ id: "rej-1", status: "REJECTED" }),
      ]);
      renderOverviewHub(audience, true);
      await waitFor(() => {
        expect(screen.getByTestId("partners-empty")).toBeInTheDocument();
      });
      expect(screen.getByTestId("partners-empty")).toHaveAttribute(
        "data-partners-empty-variant",
        "history",
      );
      expect(screen.queryByText(PARTNERS_NEW_PARTNER_EMPTY_FOOT)).not.toBeInTheDocument();
      expect(screen.getByText(PARTNERS_NEW_PARTNER_EMPTY_HISTORY_KICKER)).toBeInTheDocument();
      expect(screen.queryByText("Пока пусто")).not.toBeInTheDocument();
      expect(screen.getByTestId("partners-overview-legacy-disclosure")).toBeInTheDocument();
      expect(screen.queryByTestId("partners-overview-tiles")).not.toBeInTheDocument();
      await userEvent.click(screen.getByText(/Открыть список и архив/i));
      await waitFor(() => {
        expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
      });
      expect(screen.getByTestId("agent-r04-list-toolbar")).toBeInTheDocument();
    },
  );

  it("archived-only: disclosure exposes archive toolbar without auto-showing tiles", async () => {
    mockListRoutes([
      partnership({
        id: "arch-1",
        status: "ACTIVE",
        listPreference: { archivedAt: "2026-01-01T00:00:00Z", hiddenAt: null, alias: null },
      }),
    ]);
    renderOverviewHub("business-company-r04");
    await waitFor(() => expect(screen.getByTestId("partners-empty")).toBeInTheDocument());
    expect(screen.getByTestId("partners-empty")).toHaveAttribute(
      "data-partners-empty-variant",
      "history",
    );
    expect(
      screen.getByText(/Партнёры в архиве или скрытые из списка остаются вашими партнёрами/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("partners-overview-tiles")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText(/Открыть список и архив/i));
    expect(await screen.findByTestId("partners-overview-tiles")).toBeInTheDocument();
  });

  it("archived ACTIVE remains reachable in archive view with status not ended", async () => {
    mockListRoutes([
      partnership({
        id: "arch-1",
        status: "ACTIVE",
        storeUser: {
          id: "store-1",
          displayName: "Архивный магазин",
          city: "Краснодар",
          specializations: [],
          storeCategories: [],
          partnerType: "STORE",
        },
        listPreference: { archivedAt: "2026-01-01T00:00:00Z", hiddenAt: null, alias: null },
      }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => expect(screen.getByTestId("partners-empty")).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Открыть список и архив/i));
    await screen.findByTestId("agent-r04-list-toolbar");
    await userEvent.selectOptions(screen.getByTestId("list-archive-view"), "archive");
    await waitFor(() => {
      expect(screen.queryByText("В архиве пока нет записей")).not.toBeInTheDocument();
    });
    const detailButtons = screen.getAllByRole("button", { name: /Подробнее о партнёре/i });
    expect(
      detailButtons.some((btn) => btn.getAttribute("data-partnership-id") === "arch-1"),
    ).toBe(true);
  });

  it("keeps disclosure open after archive view change", async () => {
    mockListRoutes([
      partnership({
        id: "arch-1",
        status: "ACTIVE",
        listPreference: { archivedAt: "2026-01-01T00:00:00Z", hiddenAt: null, alias: null },
      }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => expect(screen.getByTestId("partners-empty")).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Открыть список и архив/i));
    await screen.findByTestId("agent-r04-list-toolbar");
    const archiveToggle = screen.getByTestId("list-archive-view");
    await userEvent.selectOptions(archiveToggle, "archive");
    expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    const trigger = screen.getByTestId("partners-overview-legacy-disclosure");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toBeDisabled();
  });

  it("hidden-only shows history greeting and opens list via disclosure", async () => {
    mockListRoutes([
      partnership({
        id: "hid-1",
        status: "ACTIVE",
        listPreference: { hiddenAt: "2026-01-01T00:00:00Z", archivedAt: null, alias: null },
      }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-empty")).toHaveAttribute(
        "data-partners-empty-variant",
        "history",
      );
    });
    expect(screen.queryByTestId("partners-overview-tiles")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText(/Открыть список и архив/i));
    expect(await screen.findByTestId("partners-overview-tiles")).toBeInTheDocument();
    expect(screen.getByTestId("agent-r04-list-toolbar")).toBeInTheDocument();
  });

  it("keeps tiles when list has ACTIVE row", async () => {
    mockListRoutes([partnership({ id: "p-active", status: "ACTIVE" })]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("partners-overview-legacy-stable")).toBeInTheDocument();
  });

  it("shows 500 error with retry without greeting", async () => {
    mockListRoutes([], "error");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Повторить/i }));
    expect(remcardFetch).toHaveBeenCalledWith("/api/partnership/list");
  });

  it("shows 403 without greeting", async () => {
    mockListRoutes([], "403");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("shows network failure without greeting", async () => {
    mockListRoutes([], "network");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    expect(screen.getByText(/Не удалось загрузить список/i)).toBeInTheDocument();
  });

  it("INVITED pending keeps full legacy overview without greeting", async () => {
    mockListRoutes([partnership({ id: "in-1", status: "INVITED", initiatedBy: "store-1" })]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("partners-tile-decide")).toHaveTextContent("1");
  });

  it("malformed list payload shows error, not greeting", async () => {
    mockListRoutes("malformed");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("missing partnerships field shows error, not greeting", async () => {
    mockListRoutes("missing-field");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("shows loading without greeting", () => {
    mockListRoutes([], "pending");
    renderOverviewHub("agent-r04");
    expect(screen.getByTestId("partners-overview-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("shows 401 without greeting", async () => {
    mockListRoutes([], "401");
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("bulk archive of last active partner keeps outcome banner instead of greeting", async () => {
    let rows: Partnership[] = [
      partnership({
        id: "only-active",
        status: "ACTIVE",
        storeUser: {
          id: "store-1",
          displayName: "Единственный партнёр",
          city: "Краснодар",
          specializations: [],
          storeCategories: [],
          partnerType: "STORE",
        },
      }),
    ];
    vi.mocked(patchPartnershipListPreference).mockImplementation(async () => {
      rows = [
        partnership({
          id: "only-active",
          status: "ACTIVE",
          listPreference: { archivedAt: "2026-02-01T00:00:00Z", hiddenAt: null, alias: null },
          storeUser: {
            id: "store-1",
            displayName: "Единственный партнёр",
            city: "Краснодар",
            specializations: [],
            storeCategories: [],
            partnerType: "STORE",
          },
        }),
      ];
    });
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/partnership/list") {
        return { partnerships: rows };
      }
      if (path === "/api/partnership/link-invite" && init?.method !== "POST") {
        return { invites: [] };
      }
      if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
        return { partners: [], nextCursor: null };
      }
      throw new Error(`unexpected ${String(path)}`);
    });
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-tile-active")).toHaveTextContent("1");
    });
    const selectAll = screen
      .getByTestId("agent-r04-select-page-row")
      .querySelector('input[type="checkbox"]');
    expect(selectAll).toBeTruthy();
    await userEvent.click(selectAll!);
    await userEvent.click(screen.getByRole("button", { name: "В архив" }));
    await waitFor(() => {
      expect(screen.getByTestId("agent-partner-bulk-outcome")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("partners-overview-legacy-stable")).toBeInTheDocument();
    expect(screen.getByTestId("agent-r04-list-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Закрыть итог/i })).toBeInTheDocument();
  });

  it("terms= deep link pins disclosure trigger without close desync", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("terms=arch-1"));
    mockListRoutes([
      partnership({
        id: "arch-1",
        status: "ACTIVE",
        listPreference: { archivedAt: "2026-01-01T00:00:00Z", hiddenAt: null, alias: null },
      }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-legacy-stable")).toBeInTheDocument();
    });
    const trigger = screen.getByTestId("partners-overview-legacy-disclosure");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("disclosure opens legacy panel with Enter and Space when not pinned", async () => {
    mockListRoutes([
      partnership({ id: "ended-1", status: "ENDED" }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => expect(screen.getByTestId("partners-empty")).toBeInTheDocument());
    const trigger = screen.getByTestId("partners-overview-legacy-disclosure");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toBeDisabled();
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();
    await userEvent.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("pinned archive view keeps disclosure expanded and disabled", async () => {
    mockListRoutes([
      partnership({
        id: "arch-1",
        status: "ACTIVE",
        listPreference: { archivedAt: "2026-01-01T00:00:00Z", hiddenAt: null, alias: null },
      }),
    ]);
    renderOverviewHub("agent-r04");
    await waitFor(() => expect(screen.getByTestId("partners-empty")).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Открыть список и архив/i));
    await screen.findByTestId("agent-r04-list-toolbar");
    await userEvent.selectOptions(screen.getByTestId("list-archive-view"), "archive");
    const trigger = screen.getByTestId("partners-overview-legacy-disclosure");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
