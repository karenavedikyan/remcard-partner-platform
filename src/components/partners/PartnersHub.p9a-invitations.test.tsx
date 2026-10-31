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

describe("PartnersHub P9a invitations wiring", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("overview decide/waiting use invitations presentation; active stays default", async () => {
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

    const decideZone = screen.getByTestId("partners-zone-decide");
    expect(within(decideZone).getByTestId("agent-invitation-collection")).toHaveAttribute(
      "data-invitation-flow",
      "incoming",
    );

    const waiting = screen.getByTestId("partners-zone-waiting");
    if (!(waiting as HTMLDetailsElement).open) {
      await userEvent.click(waiting.querySelector("summary")!);
    }
    await waitFor(() => {
      expect(
        within(waiting).getByTestId("agent-invitation-collection"),
      ).toHaveAttribute("data-invitation-flow", "outgoing");
    });

    const activeZone = screen.getByTestId("partners-zone-active");
    expect(within(activeZone).queryByTestId("agent-invitation-collection")).toBeNull();
  });

  it("agentSegment invitations incoming filters by initiatedBy and wires presentation", async () => {
    const incoming = partnership({ id: "in-1", initiatedBy: "store-1" });
    const outgoing = partnership({ id: "out-1", initiatedBy: "agent-me", terms: [] });

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
        agentPresentation="tabs"
        agentSegment="invitations"
        agentInvitationFlow="incoming"
        partnersAudience="agent-r04"
        forcedTab="list"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("agent-invitations-lead")).toBeVisible();
    });
    expect(screen.getByTestId("agent-invitation-collection")).toHaveAttribute(
      "data-invitation-flow",
      "incoming",
    );
    const names = screen.getAllByText("Свет и электрика");
    expect(names.length).toBeGreaterThan(0);
    expect(names[0]).toBeVisible();
    expect(screen.queryByText(/Ожидаем итоговое предложение/i)).toBeNull();
  });

  it("agentSegment invitations outgoing empty keeps honest copy without fake counts", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/partnership/list") {
        return {
          partnerships: [partnership({ id: "in-only", initiatedBy: "store-1" })],
        };
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
        agentPresentation="tabs"
        agentSegment="invitations"
        agentInvitationFlow="outgoing"
        partnersAudience="agent-r04"
        forcedTab="list"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Отправленных приглашений пока нет")).toBeVisible();
    });
    expect(
      screen.getByText(/которые вы отправили и которые ждут ответа/i),
    ).toBeVisible();
    expect(screen.queryByTestId("agent-invitation-collection")).toBeNull();
  });
});
