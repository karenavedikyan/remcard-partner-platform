import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPartnerHubModal } from "./AgentPartnerHubModal";
import { PartnersHub } from "./PartnersHub";
import { remcardFetch } from "@/lib/api-client";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const fetchPartnerTaxonomyIntroMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: (...args: unknown[]) => fetchPartnerTaxonomyIntroMock(...args),
}));

vi.mock("@/components/partners/PartnerGeneralTermsDetails", () => ({
  PartnerGeneralTermsDetails: () => null,
}));

vi.mock("@/components/partners/PartnerInviteDialog", () => ({
  PartnerInviteDialog: () => null,
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

const searchPartner = (id: string): PartnerSearchResult => ({
  id,
  displayName: `Partner ${id}`,
  city: "Краснодар",
  photoUrl: null,
  description: null,
  specializations: [],
  badges: [],
  storeCategories: [],
  branches: [],
  rating: null,
  ratingCount: 0,
  partnershipStatus: null,
  partnerType: "STORE",
  partnerTypeLabel: "Магазин",
  workingProductLabels: ["Двери"],
});

describe("PartnersHub find intro + AgentPartnerHubModal (real child tree)", () => {
  beforeEach(() => {
    fetchPartnerTaxonomyIntroMock.mockResolvedValue({ products: [], services: [], stages: [] });
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/partnership/list") return { partnerships: [] };
      if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
        return {
          partners: [searchPartner("p-1")],
          nextCursor: null,
          hasMore: false,
          facets: { total: 1, baseTotal: 1, stageTotal: 1, products: {}, services: {}, stages: {} },
        };
      }
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      throw new Error(`unexpected fetch ${String(path)}`);
    });
  });

  it("renders one intro back inside showcase intro row; modal has no duplicate back", async () => {
    const onChooseMethod = vi.fn();
    render(
      <AgentPartnerHubModal
        open
        tab="find"
        titleFind="Найти"
        titleLink="Ссылка"
        prototypeMode
        onChooseMethod={onChooseMethod}
        onTabChange={() => {}}
        onClose={() => {}}
      >
        <PartnersHub
          meId="agent-me"
          initialProfile={agentProfile}
          variant="agent-r04"
          agentModalSurface="find"
          forcedTab="find"
          partnersAudience="agent-r04"
          onChooseMethod={onChooseMethod}
        />
      </AgentPartnerHubModal>,
    );

    const showcase = screen.getByTestId("agent-partner-find-showcase");
    const introRow = within(showcase).getByTestId("agent-partner-find-intro-row");
    expect(introRow.contains(screen.getByTestId("agent-partner-find-intro-back"))).toBe(true);
    expect(screen.getAllByRole("button", { name: /Другой способ приглашения/i })).toHaveLength(1);

    await userEvent.click(screen.getByTestId("agent-partner-find-intro-back"));
    expect(onChooseMethod).toHaveBeenCalledTimes(1);
  });
});
