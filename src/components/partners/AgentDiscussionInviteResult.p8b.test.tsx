import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  AgentDiscussionInviteResult,
  buildDiscussionInviteShareText,
} from "./AgentDiscussionInviteResult";

const css = readFileSync(path.join(__dirname, "AgentDiscussionInviteResult.module.css"), "utf8");

const snapshot = {
  recipientLabel: "Студия света",
  cooperationSubject: "Обсудим свет для клиентов",
  url: "https://app.test/invite/discussion/tok-1",
  expiresAt: "2026-12-01T00:00:00.000Z",
};

describe("AgentDiscussionInviteResult P8b", () => {
  it("builds share text from snapshot message + actual URL", () => {
    expect(buildDiscussionInviteShareText(snapshot)).toBe(
      "Обсудим свет для клиентов\n\nhttps://app.test/invite/discussion/tok-1",
    );
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("renders ready composition and opens in-dialog share panel", async () => {
    const onToggleShare = vi.fn();
    const onCopyUrl = vi.fn();
    const onCopyMessageAndUrl = vi.fn();
    const onCreateAnother = vi.fn();
    render(
      <AgentDiscussionInviteResult
        snapshot={snapshot}
        shareOpen={false}
        status=""
        onToggleShare={onToggleShare}
        onCopyUrl={onCopyUrl}
        onCopyMessageAndUrl={onCopyMessageAndUrl}
        onCreateAnother={onCreateAnother}
        formatExpiry={() => "1 декабря 2026 г."}
      />,
    );

    expect(screen.getByRole("heading", { name: /Теперь передайте приглашение/i })).toHaveFocus();
    expect(screen.getByTestId("agent-discussion-invite-ready-message")).toHaveTextContent(
      "Обсудим свет для клиентов",
    );
    expect(screen.getByTestId("discussion-invite-created-url")).toHaveValue(snapshot.url);
    expect(screen.queryByTestId("agent-discussion-invite-share-panel")).not.toBeInTheDocument();
    expect(screen.queryByText(/отправлено/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("agent-discussion-invite-share"));
    expect(onToggleShare).toHaveBeenCalled();
  });

  it("resets hub modal scrollport so ready hero is not clipped after wizard create", () => {
    const port = document.createElement("div");
    Object.defineProperty(port, "scrollHeight", { configurable: true, get: () => 2000 });
    Object.defineProperty(port, "clientHeight", { configurable: true, get: () => 400 });
    port.style.overflowY = "auto";
    port.scrollTop = 480;
    document.body.appendChild(port);

    const { unmount } = render(
      <AgentDiscussionInviteResult
        snapshot={snapshot}
        shareOpen={false}
        status=""
        onToggleShare={vi.fn()}
        onCopyUrl={vi.fn()}
        onCopyMessageAndUrl={vi.fn()}
        onCreateAnother={vi.fn()}
        formatExpiry={() => "1 декабря 2026 г."}
      />,
      { container: port },
    );

    expect(port.scrollTop).toBeLessThan(480);
    expect(screen.getByRole("heading", { name: /Теперь передайте приглашение/i })).toBeVisible();
    unmount();
    port.remove();
  });

  it("shows share textarea with actual URL when open", async () => {
    const onCopyMessageAndUrl = vi.fn();
    render(
      <AgentDiscussionInviteResult
        snapshot={snapshot}
        shareOpen
        status="Текст и ссылка скопированы"
        onToggleShare={vi.fn()}
        onCopyUrl={vi.fn()}
        onCopyMessageAndUrl={onCopyMessageAndUrl}
        onCreateAnother={vi.fn()}
        formatExpiry={() => "1 декабря 2026 г."}
      />,
    );
    expect(screen.getByTestId("agent-discussion-invite-share-text")).toHaveValue(
      buildDiscussionInviteShareText(snapshot),
    );
    expect(screen.getByTestId("agent-discussion-invite-share-status")).toHaveTextContent(
      "Текст и ссылка скопированы",
    );
    await userEvent.click(screen.getByTestId("agent-discussion-invite-copy-message"));
    expect(onCopyMessageAndUrl).toHaveBeenCalled();
  });
});
