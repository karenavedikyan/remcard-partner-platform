/**
 * P23o: parent-owned find-detail focus restore + stale lifecycle cancellation.
 * Does not fork SearchCard/Shell — Hub remembers trigger + scoped card[data-partner-id] fallback.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PartnerSearchResult } from "@/lib/types";

const hubSrc = readFileSync(path.join(__dirname, "PartnersHub.tsx"), "utf8");

const partners: PartnerSearchResult[] = [
  {
    id: "partner-a",
    displayName: "Студия А",
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
    isPublic: true,
  },
  {
    id: "partner-b",
    displayName: "Студия Б",
    city: "Сочи",
    photoUrl: null,
    description: null,
    specializations: [],
    badges: [],
    storeCategories: [],
    branches: [],
    rating: null,
    ratingCount: 0,
    partnershipStatus: null,
    isPublic: true,
  },
];

const shellPropsLog: Array<Record<string, unknown>> = [];
let certFetchOrder: string[] = [];
let resolveCertA: ((v: unknown) => void) | null = null;
let certAPending: Promise<unknown> | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes("/api/partnership/search")) {
      return { partners, nextCursor: null };
    }
    if (u.includes("/certificate-program-summary")) {
      const id = decodeURIComponent(
        u.match(/\/partner\/([^/]+)\/certificate-program-summary/)?.[1] ?? "unknown",
      );
      certFetchOrder.push(id);
      if (id === "partner-a") {
        certAPending = new Promise((resolve) => {
          resolveCertA = (value: unknown) => {
            resolve(value);
          };
        });
        return certAPending;
      }
      return {
        items: [{ category: "topic-b", categoryLabel: "Категория Б", poolPercent: 7 }],
        truncated: false,
      };
    }
    if (u.includes("/api/partnership")) return { partnerships: [] };
    if (u.includes("/api/pro/me")) {
      return {
        user: {
          id: "agent-1",
          displayName: "Agent",
          partnerType: "COMPANY",
          partnerActivities: ["AGENT"],
        },
        organization: null,
      };
    }
    return {};
  }),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("@/components/partners/PartnerFindDirectoryDetailShell", async () => {
  const React = await import("react");
  const { readPartnerCertificateProgramForSearchCard } = await import(
    "./partnerSearchResultInlineTerms"
  );
  return {
    PartnerFindDirectoryDetailShell: (props: Record<string, unknown>) => {
      shellPropsLog.push(props);
      const partner = props.partner as PartnerSearchResult;
      const showAgentTerms = Boolean(props.showAgentTerms);
      const [termsLabel, setTermsLabel] = React.useState<string>("loading");
      React.useEffect(() => {
        if (!showAgentTerms) {
          setTermsLabel("hidden");
          return;
        }
        let cancelled = false;
        const id = partner.id;
        setTermsLabel("loading");
        void readPartnerCertificateProgramForSearchCard(id).then((state) => {
          if (cancelled) return;
          if (state.status === "loaded") {
            setTermsLabel(state.items[0]?.categoryLabel ?? "loaded-empty");
          } else {
            setTermsLabel(state.status);
          }
        });
        return () => {
          cancelled = true;
        };
      }, [partner.id, showAgentTerms]);
      return (
        <div
          data-testid="mock-find-directory-detail-shell"
          data-partner-id={partner.id}
          data-terms-label={termsLabel}
        >
          <button
            type="button"
            data-testid="partner-find-directory-detail-back"
            onClick={() => (props.onBack as () => void)()}
          >
            Назад
          </button>
          <button
            type="button"
            data-testid="partner-find-directory-detail-invite"
            onClick={() => (props.onInvite as () => void)()}
          >
            Invite
          </button>
          <span data-testid="mock-detail-terms">{termsLabel}</span>
        </div>
      );
    },
  };
});

vi.mock("@/components/partners/PartnerSearchResultCard", () => ({
  PartnerSearchResultCard: (props: Record<string, unknown>) => {
    const partner = props.partner as PartnerSearchResult;
    return (
      <article data-testid="agent-partner-search-result-card" data-partner-id={partner.id}>
        <button
          type="button"
          data-testid="agent-partner-search-result-detail"
          onClick={() => (props.onDetail as (() => void) | undefined)?.()}
        >
          Подробнее {partner.id}
        </button>
      </article>
    );
  },
}));

vi.mock("@/components/partners/PartnerInviteDialog", () => ({
  PartnerInviteDialog: (props: { target: PartnerSearchResult; onClose: () => void }) => (
    <div data-testid="mock-invite-dialog" data-partner-id={props.target.id}>
      <button type="button" data-testid="mock-invite-cancel" onClick={props.onClose}>
        Отмена
      </button>
    </div>
  ),
}));

vi.mock("@/components/partners/AgentPartnerDiscoveryFilters", () => ({
  AgentPartnerDiscoveryFilters: () => <div data-testid="mock-filters" />,
}));

describe("PartnersHub P23o source contract", () => {
  it("owns find-detail focus restore helpers without forking SearchCard/Shell", () => {
    expect(hubSrc).toContain("openFindDirectoryDetail");
    expect(hubSrc).toContain("closeFindDirectoryDetail");
    expect(hubSrc).toContain("scheduleFindDetailFocusRestore");
    expect(hubSrc).toContain("focusFindDetailRowTrigger");
    expect(hubSrc).toContain('data-testid="agent-partner-search-result-card"][data-partner-id=');
    expect(hubSrc).toContain("findDetailLifecycleGenRef");
    expect(hubSrc).toContain("inviteFromFindDetailPartnerIdRef");
    expect(hubSrc).not.toContain("querySelectorAll('[data-testid=\"agent-partner-search-result-detail\"]')");
  });
});

describe("PartnersHub P23o detail focus + stale lifecycle", () => {
  beforeEach(async () => {
    shellPropsLog.length = 0;
    certFetchOrder = [];
    resolveCertA = null;
    certAPending = null;
    const { resetPartnerSearchInlineTermsCache } = await import("./partnerSearchResultInlineTerms");
    resetPartnerSearchInlineTermsCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderFindHub() {
    const { render, screen, waitFor } = await import("@testing-library/react");
    const userEvent = (await import("@testing-library/user-event")).default;
    const { PartnersHub } = await import("./PartnersHub");
    const user = userEvent.setup();
    render(
      <PartnersHub
        meId="agent-1"
        initialProfile={
          {
            user: {
              id: "agent-1",
              displayName: "Agent",
              partnerType: "COMPANY",
              partnerActivities: ["AGENT"],
            },
            organization: null,
          } as never
        }
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        discussionInvitePanelKey={1}
      />,
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("agent-partner-search-result-detail").length).toBeGreaterThan(1),
    );
    return { user, screen, waitFor };
  }

  it("Back restores keyboard focus to the exact selected find-row detail trigger", async () => {
    const { user, screen, waitFor } = await renderFindHub();
    const triggerA = screen.getByRole("button", { name: "Подробнее partner-a" });
    await user.click(triggerA);
    await waitFor(() =>
      expect(screen.getByTestId("mock-find-directory-detail-shell")).toHaveAttribute(
        "data-partner-id",
        "partner-a",
      ),
    );
    await user.click(screen.getByTestId("partner-find-directory-detail-back"));
    await waitFor(() =>
      expect(screen.queryByTestId("mock-find-directory-detail-shell")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(triggerA));
  });

  it("Invite cancel restores focus to the same detail trigger", async () => {
    const { user, screen, waitFor } = await renderFindHub();
    const triggerA = screen.getByRole("button", { name: "Подробнее partner-a" });
    await user.click(triggerA);
    await waitFor(() => expect(screen.getByTestId("mock-find-directory-detail-shell")).toBeInTheDocument());
    await user.click(screen.getByTestId("partner-find-directory-detail-invite"));
    await waitFor(() => expect(screen.getByTestId("mock-invite-dialog")).toBeInTheDocument());
    await user.click(screen.getByTestId("mock-invite-cancel"));
    await waitFor(() => expect(screen.queryByTestId("mock-invite-dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(triggerA));
  });

  it("deferred A→Back→B keeps selected row B and does not paint stale A terms under B", async () => {
    const { user, screen, waitFor } = await renderFindHub();
    await user.click(screen.getByRole("button", { name: "Подробнее partner-a" }));
    await waitFor(() =>
      expect(screen.getByTestId("mock-find-directory-detail-shell")).toHaveAttribute(
        "data-partner-id",
        "partner-a",
      ),
    );
    await waitFor(() => expect(certFetchOrder).toContain("partner-a"));
    expect(typeof resolveCertA).toBe("function");
    await user.click(screen.getByTestId("partner-find-directory-detail-back"));
    await user.click(screen.getByRole("button", { name: "Подробнее partner-b" }));
    await waitFor(() =>
      expect(screen.getByTestId("mock-find-directory-detail-shell")).toHaveAttribute(
        "data-partner-id",
        "partner-b",
      ),
    );
    expect(shellPropsLog.at(-1)?.partner).toMatchObject({ id: "partner-b" });
    // Late A response must not rewrite B shell selection / terms label.
    resolveCertA?.({
      items: [{ category: "topic-a", categoryLabel: "Категория А-STALE", poolPercent: 0 }],
      truncated: false,
    });
    await waitFor(() =>
      expect(screen.getByTestId("mock-detail-terms")).toHaveTextContent("Категория Б"),
    );
    expect(screen.getByTestId("mock-find-directory-detail-shell")).toHaveAttribute(
      "data-partner-id",
      "partner-b",
    );
    expect(screen.getByTestId("mock-detail-terms")).not.toHaveTextContent("STALE");
  });

  it("accepted panel-key bump cancels detail and does not leave BODY-less restore onto unmounted shell", async () => {
    const { render, screen, waitFor, rerender } = await import("@testing-library/react");
    const userEvent = (await import("@testing-library/user-event")).default;
    const { PartnersHub } = await import("./PartnersHub");
    const user = userEvent.setup();
    const profile = {
      user: {
        id: "agent-1",
        displayName: "Agent",
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      },
      organization: null,
    } as never;
    const { rerender: rr } = render(
      <PartnersHub
        meId="agent-1"
        initialProfile={profile}
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        discussionInvitePanelKey={1}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Подробнее partner-a" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Подробнее partner-a" }));
    await waitFor(() => expect(screen.getByTestId("mock-find-directory-detail-shell")).toBeInTheDocument());
    rr(
      <PartnersHub
        meId="agent-1"
        initialProfile={profile}
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        discussionInvitePanelKey={2}
      />,
    );
    await waitFor(() =>
      expect(screen.queryByTestId("mock-find-directory-detail-shell")).not.toBeInTheDocument(),
    );
  });
});
