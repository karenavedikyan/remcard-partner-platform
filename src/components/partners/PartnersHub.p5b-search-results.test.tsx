import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import { remcardFetch } from "@/lib/api-client";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "elec", label: "Электрика" }],
    stages: [{ kind: "stage", id: "L1-8", label: "Отделка" }],
  }),
}));

vi.mock("@/components/partners/PartnerGeneralTermsDetails", () => ({
  PartnerGeneralTermsDetails: ({ partnerUserId }: { partnerUserId: string }) => (
    <div data-testid="agent-published-terms">{partnerUserId}</div>
  ),
}));

vi.mock("@/components/partners/PartnerInviteDialog", () => ({
  PartnerInviteDialog: ({
    target,
    onClose,
  }: {
    target: PartnerSearchResult;
    onClose: () => void;
  }) => (
    <div data-testid="partner-invite-dialog" data-invite-target={target.id}>
      <button type="button" onClick={onClose}>
        Закрыть приглашение
      </button>
    </div>
  ),
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
    specializations: ["doors"],
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

function mockApis(partners: PartnerSearchResult[], nextCursor: string | null = null) {
  vi.mocked(remcardFetch).mockImplementation(async (path) => {
    if (path === "/api/partnership/list") return { partnerships: [] };
    if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
      return { partners, nextCursor, hasMore: Boolean(nextCursor) };
    }
    if (path === "/api/partnership/link-invite") return { invites: [] };
    if (path === "/api/pro/profile") return agentProfile;
    throw new Error(`unexpected fetch ${String(path)}`);
  });
}

describe("PartnersHub P5b modal search results", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps PartnersHub.module.css modalResult* presentation hooks without !important", () => {
    const css = readFileSync(path.join(__dirname, "PartnersHub.module.css"), "utf8");
    expect(css).toContain(".modalResultsLead");
    expect(css).toContain(".modalResultsState");
    expect(css).toContain(".modalResultsError");
    expect(css).toContain(".modalResults {");
    expect(css).not.toMatch(/\.modalResults[\s\S]*!important/);
  });

  it("lays out multi-card results as a column flex list (no collapsing grid tracks)", () => {
    const css = readFileSync(path.join(__dirname, "PartnersHub.module.css"), "utf8");
    expect(css).toMatch(
      /\.modalResults\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    );
    expect(css).not.toMatch(/\.modalResults\s*\{[^}]*display:\s*grid;/s);
    expect(css).not.toMatch(/\.modalResults\s*\{[^}]*align-content:\s*start;/s);

    const cardCss = readFileSync(
      path.join(__dirname, "PartnerSearchResultCard.module.css"),
      "utf8",
    );
    expect(cardCss).toMatch(/\.modalResultCard\s*\{[^}]*flex:\s*0\s+0\s+auto;/s);
    expect(cardCss).not.toContain("align-self: start");
    expect(cardCss).not.toContain("min-height: min-content");
  });

  it("renders every loaded result (no silent 12-cap), honest count, and opens invite", async () => {
    const partners = Array.from({ length: 14 }, (_, i) => searchPartner(`id-${i + 1}`));
    mockApis(partners, "cursor-more");

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentModalSurface="find"
        partnersAudience="agent-r04"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Найти" }));

    await waitFor(() => {
      expect(screen.getByTestId("agent-partner-search-count")).toHaveTextContent("Показано: 14+");
    });

    const results = screen.getByTestId("agent-partner-search-results");
    expect(within(results).getAllByTestId("agent-partner-search-result-card")).toHaveLength(14);

    await userEvent.click(
      within(results).getAllByRole("button", { name: "Пригласить" })[0]!,
    );
    expect(screen.getByTestId("partner-invite-dialog")).toHaveAttribute(
      "data-invite-target",
      "id-1",
    );
  });

  it("styles empty and error/retry inside the results system", async () => {
    mockApis([]);
    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentModalSurface="find"
        partnersAudience="agent-r04"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Найти" }));
    await waitFor(() => {
      expect(screen.getByTestId("agent-partner-search-empty")).toBeInTheDocument();
    });

    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/partnership/list") return { partnerships: [] };
      if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
        throw new (await import("@/lib/api-client")).RemcardApiError(500, "Сервер недоступен");
      }
      if (path === "/api/partnership/link-invite") return { invites: [] };
      if (path === "/api/pro/profile") return agentProfile;
      throw new Error(`unexpected fetch ${String(path)}`);
    });

    await userEvent.click(screen.getByRole("button", { name: "Найти" }));
    await waitFor(() => {
      expect(screen.getByTestId("agent-partner-search-error")).toHaveTextContent("Сервер недоступен");
    });
    const errorBlock = screen.getByTestId("agent-partner-search-error");
    expect(within(errorBlock).getByRole("button", { name: "Повторить" })).toBeEnabled();
  });
});
