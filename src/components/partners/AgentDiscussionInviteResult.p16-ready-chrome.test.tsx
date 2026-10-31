import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentDiscussionInviteResult } from "./AgentDiscussionInviteResult";
import styles from "./AgentDiscussionInviteResult.module.css";

const css = readFileSync(
  path.join(process.cwd(), "src/components/partners/AgentDiscussionInviteResult.module.css"),
  "utf8",
);

const snapshot = {
  recipientLabel: "Студия света",
  cooperationSubject: "Обсудим свет для клиентов",
  url: "https://app.test/invite/discussion/tok-1",
  expiresAt: "2026-12-01T00:00:00.000Z",
};

const handlers = {
  onToggleShare: vi.fn(),
  onCopyUrl: vi.fn(),
  onCopyMessageAndUrl: vi.fn(),
  onOpenInviteCard: vi.fn(),
  formatExpiry: () => "1 декабря 2026 г.",
};

describe("AgentDiscussionInviteResult P16 ready chrome (GAP prio1/prio2)", () => {
  it("ready surface: open-card is ghost/text, no create-another", async () => {
    const onOpenInviteCard = vi.fn();
    render(
      <AgentDiscussionInviteResult
        snapshot={snapshot}
        shareOpen={false}
        status=""
        {...handlers}
        onOpenInviteCard={onOpenInviteCard}
      />,
    );

    expect(screen.getByTestId("agent-discussion-invite-ready")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-discussion-invite-create-another")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Создать ещё/i })).not.toBeInTheDocument();

    const openCard = screen.getByTestId("agent-discussion-invite-open-card");
    expect(openCard.className).toMatch(/text/);
    expect(openCard.className).toContain(styles.openCard);
    expect(openCard.className).not.toMatch(/secondary/);
    expect(css).toMatch(/\.openCard/);
    expect(css).toMatch(/padding-inline:\s*0/);
    expect(css).not.toMatch(
      /agent-discussion-invite-open-card"\]\s*\{\s*width:\s*100%/,
    );

    await userEvent.click(openCard);
    expect(onOpenInviteCard).toHaveBeenCalledTimes(1);
  });

  it("optional onCreateAnother does not resurrect create-another on ready", () => {
    render(
      <AgentDiscussionInviteResult
        snapshot={snapshot}
        shareOpen={false}
        status=""
        {...handlers}
        onCreateAnother={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("agent-discussion-invite-create-another")).not.toBeInTheDocument();
  });
});
