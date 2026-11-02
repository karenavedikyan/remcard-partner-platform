/**
 * PENDING until P25p lands `PartnerFindDirectoryDetailShell.tsx`.
 * Auto-skipped when the shell file is absent — never stubs the child.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import type { PartnerSearchResult } from "@/lib/types";

const SHELL_PATH = path.join(__dirname, "PartnerFindDirectoryDetailShell.tsx");
const shellDelivered = existsSync(SHELL_PATH);

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

vi.mock("@/components/partners/PartnerFindDirectoryDetailShell", () => ({
  PartnerFindDirectoryDetailShell: (props: Record<string, unknown>) => {
    shellPropsLog.push(props);
    return (
      <div data-testid="mock-find-directory-detail-shell">
        <span data-testid="mock-detail-partner-id">
          {(props.partner as PartnerSearchResult).id}
        </span>
        <button type="button" onClick={() => (props.onBack as () => void)()}>
          Назад
        </button>
        <button type="button" onClick={() => (props.onInvite as () => void)()}>
          Пригласить из карточки
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/partners/PartnerSearchResultCard", () => ({
  PartnerSearchResultCard: (props: Record<string, unknown>) => (
    <div data-testid="mock-search-card" data-partner-id={(props.partner as PartnerSearchResult).id}>
      <button type="button" onClick={() => (props.onDetail as (() => void) | undefined)?.()}>
        Подробнее
      </button>
    </div>
  ),
}));

vi.mock("@/components/partners/PartnerInviteDialog", () => ({
  PartnerInviteDialog: (props: { target: PartnerSearchResult; onClose: () => void }) => (
    <div data-testid="mock-invite-dialog" data-partner-id={props.target.id}>
      <button type="button" onClick={props.onClose}>
        cancel-invite
      </button>
    </div>
  ),
}));

vi.mock("@/components/partners/AgentPartnerDiscoveryFilters", () => ({
  AgentPartnerDiscoveryFilters: () => <div data-testid="mock-filters" />,
}));

describe.skipIf(!shellDelivered)("PartnersHub P23m RTL (requires P25p shell file)", () => {
  beforeEach(() => {
    shellPropsLog.length = 0;
  });

  it("Подробнее → shell same row; Back restores find; Invite → dialog same id", async () => {
    const { render, screen, waitFor } = await import("@testing-library/react");
    const userEvent = (await import("@testing-library/user-event")).default;
    const { PartnersHub } = await import("./PartnersHub");
    const user = userEvent.setup();
    const initialProfile = {
      user: {
        id: "agent-1",
        displayName: "Agent",
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      },
      organization: null,
    } as never;
    render(
      <PartnersHub
        meId="agent-1"
        initialProfile={initialProfile}
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
    expect(screen.getByTestId("mock-detail-partner-id")).toHaveTextContent("partner-row-1");
    expect(shellPropsLog.at(-1)?.showAgentTerms).toBe(true);
    await user.click(screen.getByRole("button", { name: "Назад" }));
    await waitFor(() =>
      expect(screen.queryByTestId("mock-find-directory-detail-shell")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Подробнее" }));
    await user.click(screen.getByRole("button", { name: "Пригласить из карточки" }));
    await waitFor(() => expect(screen.getByTestId("mock-invite-dialog")).toBeInTheDocument());
    expect(screen.getByTestId("mock-invite-dialog")).toHaveAttribute("data-partner-id", "partner-row-1");
  });
});
