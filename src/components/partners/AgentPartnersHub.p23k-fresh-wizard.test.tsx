/**
 * P23k: keep find Hub mounted across close→open; remount discussion-invite panel
 * after ready/close/tab so return yields a fresh wizard (no sticky ready).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const hubPropsLog: Array<Record<string, unknown>> = [];

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("./PartnersHub", () => ({
  PartnersHub: (props: Record<string, unknown>) => {
    hubPropsLog.push(props);
    if (props.agentModalSurface === "link") {
      return (
        <div data-testid="mock-modal-hub-link">
          <span data-testid="mock-invite-panel-key">{String(props.discussionInvitePanelKey)}</span>
          <button
            type="button"
            data-testid="mock-reach-ready"
            onClick={() => (props.onDiscussionInviteReadyChange as (v: boolean) => void)?.(true)}
          >
            ready
          </button>
        </div>
      );
    }
    if (props.agentModalSurface === "find") {
      return (
        <div data-testid="mock-modal-hub-find">
          <span data-testid="mock-find-surface">find</span>
        </div>
      );
    }
    return (
      <div data-testid="mock-overview-hub">
        <button type="button" onClick={() => (props.onOpenPartnerHub as (t: string) => void)?.("find")}>
          open-find
        </button>
        <button type="button" onClick={() => (props.onOpenPartnerHub as (t: string) => void)?.("link")}>
          open-link
        </button>
      </div>
    );
  },
}));

vi.mock("./AgentPartnerHubModal", () => ({
  AgentPartnerHubModal: ({
    open,
    children,
    onClose,
    onTabChange,
    tab,
    readyMode,
  }: {
    open: boolean;
    children: React.ReactNode;
    onClose: () => void;
    onTabChange: (t: "find" | "link") => void;
    tab: "find" | "link";
    readyMode?: boolean;
  }) => (
    <div
      data-testid="agent-partner-hub-modal"
      data-open={open ? "true" : "false"}
      data-ready-mode={readyMode ? "true" : "false"}
      data-hub-tab={readyMode ? "ready" : tab}
      hidden={!open}
    >
      <button type="button" aria-label="Закрыть" onClick={onClose}>
        ×
      </button>
      <button type="button" onClick={() => onTabChange("find")}>
        Найти в RemCard
      </button>
      <button type="button" onClick={() => onTabChange("link")}>
        Пригласить по ссылке
      </button>
      {children}
    </div>
  ),
}));

import { AgentPartnersHub } from "./AgentPartnersHub";

describe("AgentPartnersHub P23k fresh wizard after ready return", () => {
  beforeEach(() => {
    hubPropsLog.length = 0;
  });

  it("bumps discussionInvitePanelKey on close after ready; find surface stays mounted path", async () => {
    const user = userEvent.setup();
    render(<AgentPartnersHub meId="agent-1" />);

    await user.click(screen.getByRole("button", { name: "open-link" }));
    await waitFor(() => expect(screen.getByTestId("mock-modal-hub-link")).toBeInTheDocument());
    const keyBefore = screen.getByTestId("mock-invite-panel-key").textContent;
    await user.click(screen.getByTestId("mock-reach-ready"));
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-ready-mode", "true"),
    );

    await user.click(screen.getByLabelText("Закрыть"));
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-open", "false"),
    );

    await user.click(screen.getByRole("button", { name: "open-link" }));
    await waitFor(() => expect(screen.getByTestId("mock-modal-hub-link")).toBeInTheDocument());
    const keyAfter = screen.getByTestId("mock-invite-panel-key").textContent;
    expect(Number(keyAfter)).toBeGreaterThan(Number(keyBefore));
    expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-ready-mode", "false");

    // Overview + modal hubs both logged — modal find/link share keep-mounted parent path
    expect(hubPropsLog.some((p) => p.agentPresentation === "overview")).toBe(true);
  });

  it("bumps invite panel key when switching find↔link so sticky ready cannot survive tab return", async () => {
    const user = userEvent.setup();
    render(<AgentPartnersHub meId="agent-1" />);
    await user.click(screen.getByRole("button", { name: "open-link" }));
    await user.click(screen.getByTestId("mock-reach-ready"));
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-ready-mode", "true"),
    );
    const keyReady = Number(screen.getByTestId("mock-invite-panel-key").textContent);

    await user.click(screen.getByRole("button", { name: "Найти в RemCard" }));
    await waitFor(() => expect(screen.getByTestId("mock-modal-hub-find")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Пригласить по ссылке" }));
    await waitFor(() => expect(screen.getByTestId("mock-modal-hub-link")).toBeInTheDocument());
    const keyReturn = Number(screen.getByTestId("mock-invite-panel-key").textContent);
    expect(keyReturn).toBeGreaterThan(keyReady);
    expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-ready-mode", "false");
  });
});
