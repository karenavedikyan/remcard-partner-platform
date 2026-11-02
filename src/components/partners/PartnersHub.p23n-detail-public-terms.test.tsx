/**
 * P23n: Hub wires showAgentTerms from shouldShowAgentPublishedTermsForSearch —
 * true for AGENT find, false for specialist/store/company (no terms accordion fetch).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PartnerSearchResult } from "@/lib/types";

const shellPropsLog: Array<Record<string, unknown>> = [];

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(async (url: string) => {
    if (String(url).includes("/api/partnership/search")) {
      return {
        partners: [
          {
            id: "partner-row-1",
            displayName: "Студия Свет",
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
          } satisfies PartnerSearchResult,
        ],
        nextCursor: null,
      };
    }
    if (String(url).includes("/api/partnership")) return { partnerships: [] };
    if (String(url).includes("/api/pro/me")) {
      return { user: { id: "u-1", displayName: "U", partnerType: "COMPANY", partnerActivities: [] }, organization: null };
    }
    return {};
  }),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("@/components/partners/PartnerFindDirectoryDetailShell", () => ({
  PartnerFindDirectoryDetailShell: (props: Record<string, unknown>) => {
    shellPropsLog.push(props);
    return (
      <div data-testid="mock-find-directory-detail-shell">
        <button type="button" onClick={() => (props.onBack as () => void)()}>
          Назад
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/partners/PartnerSearchResultCard", () => ({
  PartnerSearchResultCard: (props: Record<string, unknown>) => (
    <div data-testid="mock-search-card">
      <button type="button" onClick={() => (props.onDetail as (() => void) | undefined)?.()}>
        Подробнее
      </button>
      <span data-testid="mock-card-show-terms">{String(Boolean(props.showPublishedTerms))}</span>
    </div>
  ),
}));

vi.mock("@/components/partners/PartnerInviteDialog", () => ({
  PartnerInviteDialog: () => null,
}));

vi.mock("@/components/partners/AgentPartnerDiscoveryFilters", () => ({
  AgentPartnerDiscoveryFilters: () => <div data-testid="mock-filters" />,
}));

async function openDetail(profile: {
  id: string;
  displayName: string;
  partnerType: string;
  partnerActivities: string[];
}) {
  const { render, screen, waitFor } = await import("@testing-library/react");
  const userEvent = (await import("@testing-library/user-event")).default;
  const { PartnersHub } = await import("./PartnersHub");
  const user = userEvent.setup();
  render(
    <PartnersHub
      meId={profile.id}
      initialProfile={{ user: profile, organization: null } as never}
      variant="agent-r04"
      agentModalSurface="find"
      forcedTab="find"
      discussionInvitePanelKey={1}
    />,
  );
  await waitFor(() => expect(screen.getByTestId("mock-search-card")).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: "Подробнее" }));
  await waitFor(() =>
    expect(screen.getByTestId("mock-find-directory-detail-shell")).toBeInTheDocument(),
  );
}

describe("PartnersHub P23n detail public terms wiring", () => {
  beforeEach(() => {
    shellPropsLog.length = 0;
  });

  it("AGENT sets showAgentTerms true on shell", async () => {
    await openDetail({
      id: "agent-1",
      displayName: "Agent",
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    });
    expect(shellPropsLog.at(-1)?.showAgentTerms).toBe(true);
  });

  it("SPECIALIST sets showAgentTerms false on shell", async () => {
    await openDetail({
      id: "spec-1",
      displayName: "Spec",
      partnerType: "MASTER",
      partnerActivities: [],
    });
    expect(shellPropsLog.at(-1)?.showAgentTerms).toBe(false);
  });
});
