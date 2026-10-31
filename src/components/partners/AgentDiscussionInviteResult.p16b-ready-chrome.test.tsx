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

describe("AgentDiscussionInviteResult P16b ready chrome", () => {
  it("open-card is full-width ghost weight 700; no create-another", async () => {
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

    expect(screen.queryByTestId("agent-discussion-invite-create-another")).not.toBeInTheDocument();
    const openCard = screen.getByTestId("agent-discussion-invite-open-card");
    expect(openCard.className).toContain(styles.openCard);
    expect(css).toMatch(/\.openCard\s*\{[^}]*width:\s*100%/s);
    expect(css).toMatch(/\.openCard\s*\{[^}]*font-weight:\s*700/s);
    expect(css).toMatch(/\.openCard\s*\{[^}]*border:\s*1px\s+solid\s+transparent/s);
    expect(css).not.toMatch(/\.openCard\s*\{[^}]*font-weight:\s*500/s);
    expect(css).not.toMatch(/\.openCard\s*\{[^}]*justify-self:\s*start/s);

    await userEvent.click(openCard);
    expect(onOpenInviteCard).toHaveBeenCalledTimes(1);
  });

  it("pins R1 title size and message card radius", () => {
    expect(css).toMatch(/\.title\s*\{[^}]*font-size:\s*26px/s);
    expect(css).toMatch(/\.messageBlock\s*\{[^}]*border-radius:\s*12px/s);
  });
});
