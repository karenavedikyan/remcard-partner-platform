import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import { remcardFetch } from "@/lib/api-client";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import styles from "./PartnersHub.module.css";
import { installPartnerDirectoryDomMocks } from "./test/installPartnerDirectoryDomMocks";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const taxonomyMock = {
  products: [{ kind: "product" as const, id: "doors", label: "Двери" }],
  services: [{ kind: "service" as const, id: "elec", label: "Электрика" }],
  stages: [{ kind: "stage" as const, id: "L1-8", label: "Отделка" }],
};

const fetchPartnerTaxonomyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: (...args: unknown[]) => fetchPartnerTaxonomyMock(...args),
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

const searchPartner = (id: string, overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
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
  ...overrides,
});

function mockSearchApi(
  partners: PartnerSearchResult[],
  total?: number,
  nextCursor: string | null = null,
) {
  vi.mocked(remcardFetch).mockImplementation(async (path) => {
    if (path === "/api/partnership/list") return { partnerships: [] };
    if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
      const partnerTotal = total ?? partners.length;
      return {
        partners,
        nextCursor,
        hasMore: Boolean(nextCursor),
        facets: {
          total: partnerTotal,
          baseTotal: partnerTotal,
          stageTotal: partnerTotal,
          products: { doors: partnerTotal },
          services: {},
          stages: { "L1-8": partnerTotal },
        },
      };
    }
    if (path === "/api/partnership/link-invite") return { invites: [] };
    if (path === "/api/pro/profile") return agentProfile;
    throw new Error(`unexpected fetch ${String(path)}`);
  });
}

describe("PartnersHub find showcase heading and search chrome", () => {
  let restoreDom: (() => void) | undefined;

  beforeEach(() => {
    restoreDom = installPartnerDirectoryDomMocks();
    vi.mocked(remcardFetch).mockReset();
    fetchPartnerTaxonomyMock.mockReset();
    fetchPartnerTaxonomyMock.mockResolvedValue(taxonomyMock);
  });

  afterEach(() => {
    restoreDom?.();
  });

  it("updates showcase title from taxonomy when stage is selected in navigator", async () => {
    mockSearchApi([searchPartner("p1"), searchPartner("p2", { partnershipStatus: "ACTIVE" })], 42, "more");

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        partnersAudience="agent-r04"
      />,
    );

    const title = () => screen.getByTestId("agent-partner-find-showcase-title");
    expect(title()).toHaveTextContent("Найдите своего партнёра");

    const stageButton = await screen.findByRole("button", { name: /Отделка/ });
    await userEvent.click(stageButton);
    await waitFor(() => expect(title()).toHaveTextContent("Отделка"));

    await waitFor(() => {
      expect(screen.getByTestId("agent-partner-search-count")).toHaveTextContent(/42 партнёра/);
      expect(screen.getByTestId("agent-partner-search-count")).not.toHaveTextContent(/открыт/);
    });
  });

  it("shows open clause only when the full result set is loaded", async () => {
    mockSearchApi([searchPartner("p1"), searchPartner("p2", { partnershipStatus: "ACTIVE" })], 2, null);
    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        partnersAudience="agent-r04"
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-count")).toHaveTextContent(
        /2 партнёра · 1 открыт к сотрудничеству/,
      ),
    );
  });

  it("prefers direction taxonomy label over stage and restores default on reset", async () => {
    mockSearchApi([searchPartner("p1")]);
    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        partnersAudience="agent-r04"
      />,
    );

    await screen.findByRole("button", { name: /Отделка/ });
    await userEvent.click(screen.getByRole("button", { name: /Отделка/ }));
    await userEvent.click(screen.getByRole("button", { name: /Двери/ }));

    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-find-showcase-title")).toHaveTextContent("Двери"),
    );

    await userEvent.click(screen.getByRole("button", { name: /Сбросить всё/ }));
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-find-showcase-title")).toHaveTextContent(
        "Найдите своего партнёра",
      ),
    );
  });

  it("shows total-only count while paginated and prototype search field geometry hooks", async () => {
    mockSearchApi([searchPartner("p1"), searchPartner("p2")], 99, "more");
    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        partnersAudience="agent-r04"
      />,
    );

    await waitFor(() => {
      const count = screen.getByTestId("agent-partner-search-count");
      expect(count).toHaveTextContent(/99 партнёров/);
      expect(count).not.toHaveTextContent(/открыт/);
    });

    const input = screen.getByTestId("agent-partner-find-search-input");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("placeholder", "Название, товар, услуга, этап или ID");
    expect(input.closest("label")).toHaveClass(styles.findSearchBox);
    expect(within(screen.getByTestId("agent-partner-find-showcase")).queryByText("Поиск партнёров")).toBeNull();
  });
});
