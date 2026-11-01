/** @vitest-environment jsdom */
/**
 * P23a find-tab hub-wide shell presentation (additive).
 * Asserts find uses hub-wide classes; link/ready keep prior shells.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { AgentPartnerHubModal } from "./AgentPartnerHubModal";
import styles from "./AgentPartnerHubModal.module.css";

const cssPath = path.join(__dirname, "AgentPartnerHubModal.module.css");

describe("AgentPartnerHubModal P23a find hub-wide shell", () => {
  it("applies find-wide shell classes only on find tab", () => {
    const { rerender } = render(
      <AgentPartnerHubModal
        open
        tab="find"
        titleFind="Найти партнёра"
        titleLink="Пригласить"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      >
        <div>find-body</div>
      </AgentPartnerHubModal>,
    );
    const dialog = screen.getByTestId("agent-partner-hub-modal");
    expect(dialog).toHaveAttribute("data-hub-tab", "find");
    expect(dialog.className).toContain(styles.sheetFind);
    expect(dialog.parentElement?.className).toContain(styles.backdropFind);

    rerender(
      <AgentPartnerHubModal
        open
        tab="link"
        titleFind="Найти партнёра"
        titleLink="Пригласить"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      >
        <div>link-body</div>
      </AgentPartnerHubModal>,
    );
    const linkDialog = screen.getByTestId("agent-partner-hub-modal");
    expect(linkDialog).toHaveAttribute("data-hub-tab", "link");
    expect(linkDialog.className).not.toContain(styles.sheetFind);
    expect(linkDialog.className).not.toContain(styles.sheetReady);
  });

  it("does not apply find-wide when readyMode", () => {
    render(
      <AgentPartnerHubModal
        open
        tab="find"
        readyMode
        titleFind="Найти партнёра"
        titleLink="Пригласить"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      >
        <div>ready</div>
      </AgentPartnerHubModal>,
    );
    const dialog = screen.getByTestId("agent-partner-hub-modal");
    expect(dialog).toHaveAttribute("data-ready-mode", "true");
    expect(dialog).toHaveAttribute("data-hub-tab", "ready");
    expect(dialog.className).toContain(styles.sheetReady);
    expect(dialog.className).not.toContain(styles.sheetFind);
  });

  it("CSS encodes hub-wide width and mobile inset tokens", () => {
    const css = fs.readFileSync(cssPath, "utf8");
    expect(css).toMatch(/\.sheetFind\s*\{[^}]*min\(1240px/s);
    expect(css).toMatch(/\.backdropFind\s*\{[^}]*padding:\s*19px/s);
  });
});
