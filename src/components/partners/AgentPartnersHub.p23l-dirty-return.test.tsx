/**
 * P23l: dirty close/tab Stay must NOT bump discussionInvitePanelKey / remount wizard;
 * accepted Discard / ready close / tab exit DO bump; find surface stays keep-mounted.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const hubPropsLog: Array<Record<string, unknown>> = [];
let lastLinkProps: Record<string, unknown> | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("./PartnersHub", () => ({
  PartnersHub: (props: Record<string, unknown>) => {
    hubPropsLog.push(props);
    if (props.agentModalSurface === "link") {
      lastLinkProps = props;
      return (
        <div data-testid="mock-modal-hub-link">
          <span data-testid="mock-invite-panel-key">{String(props.discussionInvitePanelKey)}</span>
          <button
            type="button"
            data-testid="mock-mark-dirty"
            onClick={() => (props.onDiscussionInviteDirtyChange as (v: boolean) => void)?.(true)}
          >
            dirty
          </button>
          <button
            type="button"
            data-testid="mock-clear-dirty"
            onClick={() => (props.onDiscussionInviteDirtyChange as (v: boolean) => void)?.(false)}
          >
            clean
          </button>
          <button
            type="button"
            data-testid="mock-reach-ready"
            onClick={() => {
              (props.onDiscussionInviteDirtyChange as (v: boolean) => void)?.(false);
              (props.onDiscussionInviteReadyChange as (v: boolean) => void)?.(true);
            }}
          >
            ready
          </button>
          <input data-testid="mock-draft-field" defaultValue="draft-partner" />
        </div>
      );
    }
    if (props.agentModalSurface === "find") {
      return (
        <div data-testid="mock-modal-hub-find">
          <span data-testid="mock-find-surface">find</span>
          <span data-testid="mock-invite-panel-key-find">{String(props.discussionInvitePanelKey)}</span>
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
      <button type="button" data-testid="mock-backdrop" onClick={onClose}>
        backdrop
      </button>
      <button type="button" data-testid="mock-escape" onClick={onClose}>
        escape
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

describe("AgentPartnersHub P23l dirty-return completion", () => {
  beforeEach(() => {
    hubPropsLog.length = 0;
    lastLinkProps = null;
  });

  it("Stay on dirty close keeps key, tab, and draft field; no remount bump", async () => {
    const user = userEvent.setup();
    render(<AgentPartnersHub meId="agent-1" />);

    await user.click(screen.getByRole("button", { name: "open-link" }));
    await waitFor(() => expect(screen.getByTestId("mock-modal-hub-link")).toBeInTheDocument());
    const keyBefore = Number(screen.getByTestId("mock-invite-panel-key").textContent);
    const field = screen.getByTestId("mock-draft-field") as HTMLInputElement;
    await user.clear(field);
    await user.type(field, "stay-value");
    await user.click(screen.getByTestId("mock-mark-dirty"));

    await user.click(screen.getByLabelText("Закрыть"));
    const confirm = await screen.findByTestId("partner-invite-discard-confirm");
    expect(confirm).toBeInTheDocument();
    expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-open", "true");
    expect(Number(screen.getByTestId("mock-invite-panel-key").textContent)).toBe(keyBefore);

    await user.click(within(confirm).getByTestId("partner-invite-discard-confirm-confirm"));
    await waitFor(() =>
      expect(screen.queryByTestId("partner-invite-discard-confirm")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-hub-tab", "link");
    expect(Number(screen.getByTestId("mock-invite-panel-key").textContent)).toBe(keyBefore);
    expect((screen.getByTestId("mock-draft-field") as HTMLInputElement).value).toBe("stay-value");
  });

  it("Discard on dirty close bumps key; reopen yields fresh key greater than Stay baseline", async () => {
    const user = userEvent.setup();
    render(<AgentPartnersHub meId="agent-1" />);

    await user.click(screen.getByRole("button", { name: "open-link" }));
    await user.click(screen.getByTestId("mock-mark-dirty"));
    const keyDirty = Number(screen.getByTestId("mock-invite-panel-key").textContent);

    await user.click(screen.getByLabelText("Закрыть"));
    const confirm = await screen.findByTestId("partner-invite-discard-confirm");
    await user.click(within(confirm).getByTestId("partner-invite-discard-confirm-dismiss"));

    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-open", "false"),
    );

    await user.click(screen.getByRole("button", { name: "open-link" }));
    await waitFor(() => expect(screen.getByTestId("mock-modal-hub-link")).toBeInTheDocument());
    const keyAfter = Number(screen.getByTestId("mock-invite-panel-key").textContent);
    expect(keyAfter).toBeGreaterThan(keyDirty);
    expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-ready-mode", "false");
  });

  it("dirty tab Stay does not change tab or bump key (denied navigation before guard)", async () => {
    const user = userEvent.setup();
    render(<AgentPartnersHub meId="agent-1" />);

    await user.click(screen.getByRole("button", { name: "open-link" }));
    await user.click(screen.getByTestId("mock-mark-dirty"));
    const keyBefore = Number(screen.getByTestId("mock-invite-panel-key").textContent);

    await user.click(screen.getByRole("button", { name: "Найти в RemCard" }));
    const confirm = await screen.findByTestId("partner-invite-discard-confirm");
    expect(screen.getByTestId("mock-modal-hub-link")).toBeInTheDocument();
    expect(Number(screen.getByTestId("mock-invite-panel-key").textContent)).toBe(keyBefore);

    await user.click(within(confirm).getByTestId("partner-invite-discard-confirm-confirm"));
    await waitFor(() =>
      expect(screen.queryByTestId("partner-invite-discard-confirm")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("mock-modal-hub-link")).toBeInTheDocument();
    expect(Number(screen.getByTestId("mock-invite-panel-key").textContent)).toBe(keyBefore);
  });

  it("dirty tab Discard accepts find exit and bumps key", async () => {
    const user = userEvent.setup();
    render(<AgentPartnersHub meId="agent-1" />);

    await user.click(screen.getByRole("button", { name: "open-link" }));
    await user.click(screen.getByTestId("mock-mark-dirty"));
    const keyBefore = Number(screen.getByTestId("mock-invite-panel-key").textContent);

    await user.click(screen.getByRole("button", { name: "Найти в RemCard" }));
    const confirm = await screen.findByTestId("partner-invite-discard-confirm");
    await user.click(within(confirm).getByTestId("partner-invite-discard-confirm-dismiss"));

    await waitFor(() => expect(screen.getByTestId("mock-modal-hub-find")).toBeInTheDocument());
    const keyFind = Number(screen.getByTestId("mock-invite-panel-key-find").textContent);
    expect(keyFind).toBeGreaterThan(keyBefore);
  });

  it("backdrop/Escape dirty paths Stay without bump; ready close still bumps", async () => {
    const user = userEvent.setup();
    render(<AgentPartnersHub meId="agent-1" />);

    await user.click(screen.getByRole("button", { name: "open-link" }));
    await user.click(screen.getByTestId("mock-mark-dirty"));
    const keyDirty = Number(screen.getByTestId("mock-invite-panel-key").textContent);

    await user.click(screen.getByTestId("mock-backdrop"));
    let confirm = await screen.findByTestId("partner-invite-discard-confirm");
    await user.click(within(confirm).getByTestId("partner-invite-discard-confirm-confirm"));
    expect(Number(screen.getByTestId("mock-invite-panel-key").textContent)).toBe(keyDirty);

    await user.click(screen.getByTestId("mock-escape"));
    confirm = await screen.findByTestId("partner-invite-discard-confirm");
    await user.click(within(confirm).getByTestId("partner-invite-discard-confirm-confirm"));
    expect(Number(screen.getByTestId("mock-invite-panel-key").textContent)).toBe(keyDirty);

    await user.click(screen.getByTestId("mock-reach-ready"));
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-ready-mode", "true"),
    );
    const keyReady = Number(screen.getByTestId("mock-invite-panel-key").textContent);

    await user.click(screen.getByLabelText("Закрыть"));
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-hub-modal")).toHaveAttribute("data-open", "false"),
    );
    await user.click(screen.getByRole("button", { name: "open-link" }));
    await waitFor(() => expect(screen.getByTestId("mock-modal-hub-link")).toBeInTheDocument());
    expect(Number(screen.getByTestId("mock-invite-panel-key").textContent)).toBeGreaterThan(keyReady);
    expect(lastLinkProps?.discussionInviteReady).toBe(false);
  });
});
