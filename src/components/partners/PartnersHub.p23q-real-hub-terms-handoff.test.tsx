/**
 * P23q: real Hub wires P25t onPublicSummaryStateChange → identity-bound snapshot on FindDetail.
 * Non-AGENT parent gate; A→Back→B stale guard; teardown clears ownership.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import type { PartnerSearchResult } from "@/lib/types";

const shellPropsLog: Array<Record<string, unknown>> = [];
const cardPropsLog: Array<Record<string, unknown>> = [];

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const partnersFixture: PartnerSearchResult[] = [
  {
    id: "partner-a",
    displayName: "Студия A",
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
    displayName: "Студия B",
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

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(async (url: string) => {
    if (String(url).includes("/api/partnership/search")) {
      return { partners: partnersFixture, nextCursor: null };
    }
    if (String(url).includes("/api/partnership")) return { partnerships: [] };
    if (String(url).includes("/api/pro/me")) {
      return {
        user: { id: "u-1", displayName: "U", partnerType: "COMPANY", partnerActivities: [] },
        organization: null,
      };
    }
    return {};
  }),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("@/components/partners/PartnerFindDirectoryDetailShell", () => ({
  PartnerFindDirectoryDetailShell: (props: Record<string, unknown>) => {
    shellPropsLog.push({ ...props });
    return (
      <div
        data-testid="mock-find-directory-detail-shell"
        data-partner-id={(props.partner as PartnerSearchResult | undefined)?.id}
      >
        <button type="button" onClick={() => (props.onBack as () => void)()}>
          Назад
        </button>
        <span data-testid="mock-shell-show-terms">{String(Boolean(props.showAgentTerms))}</span>
        <span data-testid="mock-shell-snapshot-status">
          {props.agentTermsSnapshot
            ? (props.agentTermsSnapshot as PartnerCertProgramState).status
            : "none"}
        </span>
      </div>
    );
  },
}));

vi.mock("@/components/partners/PartnerSearchResultCard", () => ({
  PartnerSearchResultCard: (props: Record<string, unknown>) => {
    cardPropsLog.push(props);
    const partner = props.partner as PartnerSearchResult;
    return (
      <div data-testid="mock-search-card" data-partner-id={partner.id}>
        <button
          type="button"
          data-testid="agent-partner-search-result-detail"
          onClick={() => (props.onDetail as (() => void) | undefined)?.()}
        >
          Подробнее {partner.id}
        </button>
        <button
          type="button"
          data-testid={`mock-emit-summary-${partner.id}`}
          onClick={() =>
            (props.onPublicSummaryStateChange as
              | ((id: string, state: PartnerCertProgramState) => void)
              | undefined)?.(partner.id, {
              status: "loaded",
              items: [
                {
                  category: partner.id === "partner-a" ? "light" : "tile",
                  categoryLabel: partner.id === "partner-a" ? "Свет A" : "Плитка B",
                  poolPercent: partner.id === "partner-a" ? 10 : 20,
                },
              ],
              truncated: false,
            })
          }
        >
          emit-{partner.id}
        </button>
        <span data-testid={`mock-card-callback-${partner.id}`}>
          {props.onPublicSummaryStateChange ? "wired" : "absent"}
        </span>
      </div>
    );
  },
}));

vi.mock("@/components/partners/PartnerInviteDialog", () => ({
  PartnerInviteDialog: () => null,
}));

vi.mock("@/components/partners/AgentPartnerDiscoveryFilters", () => ({
  AgentPartnerDiscoveryFilters: () => <div data-testid="mock-filters" />,
}));

async function renderFindHub(profile: {
  id: string;
  displayName: string;
  partnerType: string;
  partnerActivities: string[];
}) {
  const { render, screen, waitFor } = await import("@testing-library/react");
  const { PartnersHub } = await import("./PartnersHub");
  const view = render(
    <PartnersHub
      meId={profile.id}
      initialProfile={{ user: profile, organization: null } as never}
      variant="agent-r04"
      agentModalSurface="find"
      forcedTab="find"
      discussionInvitePanelKey={1}
    />,
  );
  await waitFor(() => expect(screen.getAllByTestId("mock-search-card").length).toBe(2));
  return view;
}

const agentProfile = {
  id: "agent-1",
  displayName: "Agent",
  partnerType: "COMPANY",
  partnerActivities: ["AGENT"],
};

const specialistProfile = {
  id: "spec-1",
  displayName: "Spec",
  partnerType: "COMPANY",
  partnerActivities: ["SPECIALIST"],
};

describe("PartnersHub P23q real Hub public-summary handoff", () => {
  beforeEach(() => {
    shellPropsLog.length = 0;
    cardPropsLog.length = 0;
    vi.resetModules();
  });

  it("AGENT wires card callback and hands loaded snapshot into detail without Demo gate bypass", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const { screen, waitFor } = await import("@testing-library/react");
    const user = userEvent.setup();
    await renderFindHub(agentProfile);

    expect(screen.getByTestId("mock-card-callback-partner-a").textContent).toBe("wired");
    await user.click(screen.getByTestId("mock-emit-summary-partner-a"));
    await user.click(screen.getByRole("button", { name: "Подробнее partner-a" }));
    await waitFor(() =>
      expect(screen.getByTestId("mock-find-directory-detail-shell")).toBeInTheDocument(),
    );
    const last = shellPropsLog.at(-1);
    expect(last?.showAgentTerms).toBe(true);
    expect((last?.agentTermsSnapshot as PartnerCertProgramState | undefined)?.status).toBe(
      "loaded",
    );
    expect(
      ((last?.agentTermsSnapshot as PartnerCertProgramState).status === "loaded" &&
        (last?.agentTermsSnapshot as Extract<PartnerCertProgramState, { status: "loaded" }>).items[0]
          ?.poolPercent) ||
        null,
    ).toBe(10);
  });

  it("non-AGENT does not wire summary callback and keeps showAgentTerms false", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const { screen, waitFor } = await import("@testing-library/react");
    const user = userEvent.setup();
    await renderFindHub(specialistProfile);

    expect(screen.getByTestId("mock-card-callback-partner-a").textContent).toBe("absent");
    await user.click(screen.getByRole("button", { name: "Подробнее partner-a" }));
    await waitFor(() =>
      expect(screen.getByTestId("mock-find-directory-detail-shell")).toBeInTheDocument(),
    );
    expect(shellPropsLog.at(-1)?.showAgentTerms).toBe(false);
    expect(shellPropsLog.at(-1)?.agentTermsSnapshot).toBeUndefined();
  });

  it("A→Back→B: late A summary never becomes B detail snapshot", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const { screen, waitFor } = await import("@testing-library/react");
    const user = userEvent.setup();
    await renderFindHub(agentProfile);

    await user.click(screen.getByRole("button", { name: "Подробнее partner-a" }));
    await waitFor(() =>
      expect(screen.getByTestId("mock-find-directory-detail-shell")).toHaveAttribute(
        "data-partner-id",
        "partner-a",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Назад" }));
    await waitFor(() =>
      expect(screen.queryByTestId("mock-find-directory-detail-shell")).not.toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("mock-emit-summary-partner-b"));
    await user.click(screen.getByRole("button", { name: "Подробнее partner-b" }));
    await waitFor(() =>
      expect(screen.getByTestId("mock-find-directory-detail-shell")).toHaveAttribute(
        "data-partner-id",
        "partner-b",
      ),
    );

    // Late A emission while B is selected must not rewrite B's snapshot identity.
    await user.click(screen.getByTestId("mock-emit-summary-partner-a"));
    await waitFor(() => {
      const last = shellPropsLog.at(-1);
      expect((last?.partner as PartnerSearchResult).id).toBe("partner-b");
      const snap = last?.agentTermsSnapshot as PartnerCertProgramState | undefined;
      expect(snap?.status).toBe("loaded");
      if (snap?.status === "loaded") {
        expect(snap.items[0]?.category).toBe("tile");
        expect(snap.items[0]?.poolPercent).toBe(20);
      }
    });
  });

  it("surface teardown (discussionInvitePanelKey) clears handoff ownership", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const { screen, waitFor, rerender } = await import("@testing-library/react");
    const { PartnersHub } = await import("./PartnersHub");
    const user = userEvent.setup();

    const { rerender: rr } = await renderFindHub(agentProfile);
    await user.click(screen.getByTestId("mock-emit-summary-partner-a"));
    await user.click(screen.getByRole("button", { name: "Подробнее partner-a" }));
    await waitFor(() =>
      expect(screen.getByTestId("mock-shell-snapshot-status").textContent).toBe("loaded"),
    );

    rr(
      <PartnersHub
        meId={agentProfile.id}
        initialProfile={{ user: agentProfile, organization: null } as never}
        variant="agent-r04"
        agentModalSurface="find"
        forcedTab="find"
        discussionInvitePanelKey={2}
      />,
    );
    await waitFor(() =>
      expect(screen.queryByTestId("mock-find-directory-detail-shell")).not.toBeInTheDocument(),
    );

    // Re-open detail without re-emitting — ownership map was cleared, so no snapshot.
    await user.click(screen.getByRole("button", { name: "Подробнее partner-a" }));
    await waitFor(() =>
      expect(screen.getByTestId("mock-find-directory-detail-shell")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("mock-shell-snapshot-status").textContent).toBe("none");
    void rerender;
  });
});
