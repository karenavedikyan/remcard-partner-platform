import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerDiscussionInvitePanel } from "./PartnerDiscussionInvitePanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const remcardFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class RemcardApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RemcardApiError";
    }
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://app.test",
}));

const hubSource = readFileSync(path.join(__dirname, "PartnersHub.tsx"), "utf8");
const panelSource = readFileSync(path.join(__dirname, "PartnerDiscussionInvitePanel.tsx"), "utf8");

describe("PartnerDiscussionInvitePanel P7/P8a wiring", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    remcardFetch.mockImplementation(async (url: string, init?: { method?: string; body?: unknown }) => {
      if (String(url) === "/api/partnership/discussion-invite" && (!init || init.method === "GET" || !init.method)) {
        return { invites: [] };
      }
      if (String(url) === "/api/partnership/discussion-invite" && init?.method === "POST") {
        return {
          token: "tok-1",
          expiresAt: "2026-12-01T00:00:00.000Z",
          previewPath: "/invite/discussion/tok-1",
        };
      }
      return {};
    });
  });

  it("defaults to flat form and enables wizard only via additive prop", async () => {
    expect(panelSource).toContain("presentationWizard = false");
    expect(hubSource).toMatch(
      /PartnerDiscussionInvitePanel\s+showSectionTitle=\{false\}\s+presentationWizard/,
    );
    // Specialist/non-agent callsite stays without presentationWizard
    expect(hubSource).toMatch(
      /linkInviteMode === "discussion"[\s\S]*?<PartnerDiscussionInvitePanel showSectionTitle=\{false\} \/>/,
    );

    const { unmount } = render(<PartnerDiscussionInvitePanel showSectionTitle={false} />);
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    expect(screen.queryByTestId("agent-discussion-invite-wizard")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Имя или название партнёра/i)).toBeInTheDocument();
    unmount();

    remcardFetch.mockClear();
    render(<PartnerDiscussionInvitePanel showSectionTitle={false} presentationWizard />);
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toBeInTheDocument();
  });

  it("posts the same discussion-invite payload once from review create", async () => {
    render(<PartnerDiscussionInvitePanel showSectionTitle={false} presentationWizard />);
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());

    await userEvent.type(screen.getByTestId("agent-discussion-invite-recipient"), "  Студия света  ");
    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    await userEvent.type(
      screen.getByTestId("agent-discussion-invite-subject"),
      "  Обсудим свет для клиентов  ",
    );
    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    await userEvent.click(screen.getByTestId("agent-discussion-invite-create"));

    await waitFor(() => {
      const post = remcardFetch.mock.calls.find(
        (call) => call[1] && (call[1] as { method?: string }).method === "POST",
      );
      expect(post).toBeTruthy();
      expect(post![1]).toEqual({
        method: "POST",
        body: {
          recipientLabel: "Студия света",
          cooperationSubject: "Обсудим свет для клиентов",
        },
      });
    });

    const posts = remcardFetch.mock.calls.filter(
      (call) => call[1] && (call[1] as { method?: string }).method === "POST",
    );
    expect(posts).toHaveLength(1);

    await waitFor(() => {
      expect(screen.getByTestId("agent-discussion-invite-ready")).toBeInTheDocument();
      expect(screen.queryByTestId("agent-discussion-invite-wizard")).not.toBeInTheDocument();
    });
    // Raw URL lives inside share panel (R1 ready composition — not in primary success flow).
    expect(screen.queryByTestId("discussion-invite-created-url")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("agent-discussion-invite-share"));
    expect(screen.getByTestId("discussion-invite-created-url")).toHaveValue(
      "https://app.test/invite/discussion/tok-1",
    );
  });

  it("does not POST on Next/Back navigation", async () => {
    render(<PartnerDiscussionInvitePanel showSectionTitle={false} presentationWizard />);
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    remcardFetch.mockClear();

    await userEvent.type(screen.getByTestId("agent-discussion-invite-recipient"), "А");
    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    await userEvent.type(screen.getByTestId("agent-discussion-invite-subject"), "Б");
    await userEvent.click(screen.getByTestId("agent-discussion-invite-back"));
    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));

    expect(
      remcardFetch.mock.calls.some(
        (call) => call[1] && (call[1] as { method?: string }).method === "POST",
      ),
    ).toBe(false);
  });
});
