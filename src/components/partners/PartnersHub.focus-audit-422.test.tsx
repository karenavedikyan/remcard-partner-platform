/**
 * Audit 42245025: behavioral focus tests (B1–B3) on PartnersHub find modal.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import { remcardFetch } from "@/lib/api-client";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import { installPartnerDirectoryDomMocks } from "./test/installPartnerDirectoryDomMocks";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const fetchPartnerTaxonomyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: (...args: unknown[]) => fetchPartnerTaxonomyMock(...args),
}));

vi.mock("@/components/partners/AgentPartnerDiscoveryFilters", () => ({
  AgentPartnerDiscoveryFilters: () => <div data-testid="mock-filters" />,
}));

vi.mock("@/components/partners/PartnerFindDirectoryDetailShell", () => ({
  PartnerFindDirectoryDetailShell: (props: {
    partner: PartnerSearchResult;
    onBack: () => void;
    onInvite: () => void;
  }) => (
    <div data-testid="mock-find-directory-detail-shell" data-partner-id={props.partner.id}>
      <button type="button" data-testid="partner-find-directory-detail-back" onClick={props.onBack}>
        Назад
      </button>
      <button type="button" data-testid="partner-find-directory-detail-invite" onClick={props.onInvite}>
        Сотрудничать
      </button>
    </div>
  ),
}));

vi.mock("@/components/partners/PartnerSearchResultCard", () => ({
  PartnerSearchResultCard: (props: {
    partner: PartnerSearchResult;
    onDetail?: () => void;
    onInvite?: () => void;
    inviteDisabled?: boolean;
  }) => (
    <article data-testid="agent-partner-search-result-card" data-partner-id={props.partner.id}>
      <button
        type="button"
        data-testid="agent-partner-search-result-detail"
        onClick={() => props.onDetail?.()}
      >
        Подробнее {props.partner.id}
      </button>
      <button
        type="button"
        data-testid="agent-partner-search-result-invite"
        disabled={props.inviteDisabled}
        onClick={() => props.onInvite?.()}
      >
        Сотрудничать
      </button>
    </article>
  ),
}));

vi.mock("@/components/partners/PartnerInviteDialog", () => ({
  PartnerInviteDialog: (props: { target: PartnerSearchResult; onClose: () => void }) => (
    <div data-testid="mock-invite-dialog" role="dialog">
      <button type="button" onClick={props.onClose}>
        Отмена
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

const agentProfile = {
  organization: null,
  programs: [],
  user: {
    id: "agent-me",
    displayName: "Agent",
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
    specializations: [],
    role: "PRO",
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: [],
    areas: [],
  },
} as unknown as ProProfileResponse;

const partner = (id: string): PartnerSearchResult => ({
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
});

function flushFocusFrames() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function renderFindHub(extra?: { wrapHidden?: boolean }) {
  const ui = (
    <PartnersHub
      meId="agent-me"
      initialProfile={agentProfile}
      variant="agent-r04"
      agentModalSurface="find"
      forcedTab="find"
      partnersAudience="agent-r04"
    />
  );
  if (extra?.wrapHidden) {
    return render(<div data-testid="chooser-wrap">{ui}</div>);
  }
  return render(ui);
}

describe("PartnersHub focus audit behavior (42245025)", () => {
  let restoreDom: (() => void) | undefined;

  beforeEach(() => {
    restoreDom = installPartnerDirectoryDomMocks();
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/partnership/list") return { partnerships: [] };
      if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
        return {
          partners: [partner("p1")],
          nextCursor: null,
          facets: {
            total: 1,
            baseTotal: 1,
            stageTotal: 1,
            products: {},
            services: {},
            stages: {},
          },
        };
      }
      if (path === "/api/pro/profile") return agentProfile;
      return {};
    });
    fetchPartnerTaxonomyMock.mockResolvedValue({
      products: [],
      services: [],
      stages: [],
    });
  });

  afterEach(() => {
    restoreDom?.();
    vi.clearAllMocks();
  });

  it("B1 chooser unwrap: focuses find entry when BODY, not when input already focused", async () => {
    const wrap = document.createElement("div");
    wrap.hidden = true;
    document.body.appendChild(wrap);
    const { unmount } = render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        partnersAudience="agent-r04"
      />,
      { container: wrap },
    );
    await waitFor(() => expect(screen.getByTestId("agent-partner-find-showcase")).toBeInTheDocument());
    const input = screen.getByTestId("agent-partner-find-search-input");
    input.focus();
    wrap.hidden = false;
    await flushFocusFrames();
    expect(document.activeElement).toBe(input);
    unmount();
    wrap.remove();
  });

  it("B1 detail Back: restores Подробнее trigger, not showcase title", async () => {
    const user = userEvent.setup();
    renderFindHub();
    await waitFor(() => expect(screen.getByTestId("agent-partner-search-result-detail")).toBeInTheDocument());
    const trigger = screen.getByRole("button", { name: "Подробнее p1" });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByTestId("mock-find-directory-detail-shell")).toBeInTheDocument());
    await user.click(screen.getByTestId("partner-find-directory-detail-back"));
    await waitFor(() => expect(screen.queryByTestId("mock-find-directory-detail-shell")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(document.activeElement).not.toHaveAttribute("data-testid", "agent-partner-find-showcase-title");
  });

  it("B2 search error retry restores focus after successful retry", async () => {
    const user = userEvent.setup();
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/partnership/list") return { partnerships: [] };
      if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
        throw new (await import("@/lib/api-client")).RemcardApiError(500, "Сервер недоступен");
      }
      if (path === "/api/pro/profile") return agentProfile;
      throw new Error(`unexpected ${String(path)}`);
    });
    renderFindHub();
    const input = await screen.findByTestId("agent-partner-find-search-input");
    await user.click(input);
    await user.type(input, "retry");
    await waitFor(() => {
      expect(screen.getByTestId("agent-partner-search-error")).toHaveTextContent("Сервер недоступен");
    });
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/partnership/list") return { partnerships: [] };
      if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
        return {
          partners: [partner("p1")],
          nextCursor: null,
          facets: { total: 1, baseTotal: 1, stageTotal: 1, products: {}, services: {}, stages: {} },
        };
      }
      if (path === "/api/pro/profile") return agentProfile;
      return {};
    });
    await user.click(
      within(screen.getByTestId("agent-partner-search-error")).getByRole("button", { name: "Повторить" }),
    );
    await waitFor(() => expect(screen.queryByTestId("agent-partner-search-error")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("B3 invite cancel restores Сотрудничать trigger on the card", async () => {
    const user = userEvent.setup();
    renderFindHub();
    await waitFor(() => expect(screen.getByTestId("agent-partner-search-result-invite")).toBeInTheDocument());
    const inviteBtn = screen.getByTestId("agent-partner-search-result-invite");
    inviteBtn.focus();
    await user.click(inviteBtn);
    await waitFor(() => expect(screen.getByTestId("mock-invite-dialog")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(screen.queryByTestId("mock-invite-dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(inviteBtn));
  });
});
