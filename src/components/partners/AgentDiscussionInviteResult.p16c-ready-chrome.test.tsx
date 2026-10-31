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

describe("AgentDiscussionInviteResult P16c ready chrome", () => {
  it("pins R1 ready primary / eyebrow / disclosure / open-card line-box tokens", () => {
    expect(css).toMatch(/--ready-accent:\s*#bb3035/);
    expect(css).toMatch(/--ready-accent:\s*#f49391/);
    expect(css).toMatch(/--ready-onaccent:\s*#271b1a/);
    expect(css).toMatch(/--ready-muted:\s*#61645f/);
    expect(css).toMatch(/--ready-muted:\s*#b5b9b2/);
    expect(css).toMatch(/\.eyebrow\s*\{[^}]*font-weight:\s*800/s);
    expect(css).toMatch(/\.eyebrow\s*\{[^}]*letter-spacing:\s*0\.1em/s);
    expect(css).toMatch(/\.eyebrow\s*\{[^}]*font-size:\s*10px/s);
    expect(css).toMatch(/\.after summary\s*\{[^}]*font-weight:\s*700/s);
    expect(css).toMatch(/\.after summary\s*\{[^}]*font-size:\s*12px/s);
    expect(css).toMatch(/\.after summary\s*\{[^}]*display:\s*list-item/s);
    expect(css).toMatch(/list-style:\s*disclosure-closed/);
    expect(css).toMatch(/\.openCard\s*\{[^}]*line-height:\s*1\.6/s);
    expect(css).toMatch(/\.openCard\s*\{[^}]*font-size:\s*14px/s);
    expect(css).not.toMatch(/\.after summary\s*\{[^}]*display:\s*flex/s);
  });

  it("renders SVG check icon and native disclosure without create-another", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AgentDiscussionInviteResult
        snapshot={snapshot}
        shareOpen={false}
        status=""
        {...handlers}
      />,
    );

    const icon = container.querySelector(`.${styles.icon}`);
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.querySelector("svg")).toBeTruthy();
    expect(icon?.textContent?.includes("✓")).toBe(false);

    const details = container.querySelector(`.${styles.after}`) as HTMLDetailsElement;
    expect(details).toBeTruthy();
    const summary = details.querySelector("summary");
    expect(summary?.textContent).toMatch(/Что будет после передачи/i);
    expect(details.open).toBe(false);
    await user.click(summary!);
    expect(details.open).toBe(true);

    expect(screen.queryByTestId("agent-discussion-invite-create-another")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-discussion-invite-share").className).toContain(
      styles.sharePrimary,
    );
  });
});
