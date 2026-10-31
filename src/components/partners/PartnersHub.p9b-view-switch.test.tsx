import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import { remcardFetch } from "@/lib/api-client";
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

function partnership(overrides: Partial<Partnership>): Partnership {
  return {
    id: "p-base",
    status: "INVITED",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-me",
    terms: [
      {
        id: "t1",
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 10,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: "store-1",
      displayName: "Свет и электрика",
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

describe("PartnersHub P9b invitation view switches", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("defaults both invitation zones to list; switches are independent of each other and active", async () => {
    const incoming = partnership({ id: "incoming-1", initiatedBy: "store-1" });
    const outgoing = partnership({
      id: "outgoing-1",
      initiatedBy: "agent-me",
      terms: [],
    });
    const active = partnership({
      id: "active-1",
      status: "ACTIVE",
      initiatedBy: "agent-me",
    });

    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/partnership/list") {
        return { partnerships: [incoming, outgoing, active] };
      }
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      throw new Error(`unexpected ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        partnersAudience="agent-r04"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("partners-overview-tiles")).toBeVisible();
    });

    const decide = screen.getByTestId("partners-zone-decide");
    expect(within(decide).getByTestId("agent-invitation-view-switch-incoming-list")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(decide).getByTestId("agent-invitation-collection")).toBeVisible();
    expect(within(decide).queryByTestId("agent-invitation-card")).toBeNull();

    const waiting = screen.getByTestId("partners-zone-waiting");
    if (!(waiting as HTMLDetailsElement).open) {
      await userEvent.click(waiting.querySelector("summary")!);
    }
    await waitFor(() => {
      expect(within(waiting).getByTestId("agent-invitation-view-switch-outgoing")).toBeVisible();
    });
    expect(
      within(waiting).getByTestId("agent-invitation-view-switch-outgoing-list"),
    ).toHaveAttribute("aria-pressed", "true");

    // Switch incoming → cards; outgoing stays list
    await userEvent.click(within(decide).getByTestId("agent-invitation-view-switch-incoming-cards"));
    await waitFor(() => {
      expect(within(decide).getByTestId("agent-invitation-card")).toBeVisible();
    });
    expect(
      within(waiting).getByTestId("agent-invitation-view-switch-outgoing-list"),
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(waiting).queryByTestId("agent-invitation-card")).toBeNull();

    // Switch outgoing → cards; incoming stays cards
    await userEvent.click(
      within(waiting).getByTestId("agent-invitation-view-switch-outgoing-cards"),
    );
    await waitFor(() => {
      expect(within(waiting).getByTestId("agent-invitation-card")).toBeVisible();
    });
    expect(within(decide).getByTestId("agent-invitation-card")).toBeVisible();

    // Active toolbar still defaults to list (independent)
    const activeZone = screen.getByTestId("partners-zone-active");
    const activeToggle = within(activeZone).queryByTestId("agent-r04-view-toggle");
    if (activeToggle) {
      expect(within(activeToggle).getByLabelText("Список")).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("keeps selection across list→cards without remounting collection identity", async () => {
    const incoming = partnership({ id: "incoming-1", initiatedBy: "store-1" });
    const outgoing = partnership({
      id: "outgoing-1",
      initiatedBy: "agent-me",
      terms: [],
    });

    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/partnership/list") {
        return { partnerships: [incoming, outgoing] };
      }
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      throw new Error(`unexpected ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        partnersAudience="agent-r04"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("partners-zone-decide")).toBeVisible();
    });

    const decide = screen.getByTestId("partners-zone-decide");
    const collection = within(decide).getByTestId("agent-invitation-collection");
    const checkbox = within(collection).getAllByLabelText("Выбрать партнёра")[0];
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    await userEvent.click(within(decide).getByTestId("agent-invitation-view-switch-incoming-cards"));
    await waitFor(() => {
      expect(within(decide).getByTestId("agent-invitation-card")).toBeVisible();
    });
    // Same collection root still present; selection preserved on card checkbox
    expect(within(decide).getByTestId("agent-invitation-collection")).toBe(collection);
    const cardSelect = within(decide).getByLabelText("Выбрать карточку");
    expect(cardSelect).toBeChecked();
  });

  it("does not POST on view mode toggle", async () => {
    const incoming = partnership({ id: "incoming-1", initiatedBy: "store-1" });
    const outgoing = partnership({
      id: "outgoing-1",
      initiatedBy: "agent-me",
      terms: [],
    });

    const posts: string[] = [];
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      const method = String((init as { method?: string } | undefined)?.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") posts.push(`${method} ${String(path)}`);
      if (path === "/api/partnership/list") return { partnerships: [incoming, outgoing] };
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      throw new Error(`unexpected ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        partnersAudience="agent-r04"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("agent-invitation-view-switch-incoming")).toBeVisible();
    });
    posts.length = 0;
    await userEvent.click(screen.getByTestId("agent-invitation-view-switch-incoming-cards"));
    await userEvent.click(screen.getByTestId("agent-invitation-view-switch-incoming-list"));
    expect(posts).toEqual([]);
  });
});
