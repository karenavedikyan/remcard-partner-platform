import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentPartnerHubModal } from "./AgentPartnerHubModal";
import styles from "./AgentPartnerHubModal.module.css";

const css = readFileSync(
  path.join(process.cwd(), "src/components/partners/AgentPartnerHubModal.module.css"),
  "utf8",
);

describe("AgentPartnerHubModal P16b readyMode shell", () => {
  it("applies ready shell classes only when readyMode", () => {
    const { rerender } = render(
      <AgentPartnerHubModal
        open
        tab="link"
        titleFind="Найти"
        titleLink="Пригласить"
        readyMode={false}
        onTabChange={() => {}}
        onClose={() => {}}
      >
        <span>body</span>
      </AgentPartnerHubModal>,
    );
    const modal = screen.getByTestId("agent-partner-hub-modal");
    expect(modal.className).toContain(styles.sheet);
    expect(modal.className).not.toContain(styles.sheetReady);
    expect(modal).toHaveAttribute("data-ready-mode", "false");

    rerender(
      <AgentPartnerHubModal
        open
        tab="link"
        titleFind="Найти"
        titleLink="Пригласить"
        readyMode
        titleReady="Приглашение создано"
        onTabChange={() => {}}
        onClose={() => {}}
      >
        <span>ready</span>
      </AgentPartnerHubModal>,
    );
    const ready = screen.getByTestId("agent-partner-hub-modal");
    expect(ready.className).toContain(styles.sheetReady);
    expect(ready).toHaveAttribute("data-ready-mode", "true");
    expect(screen.getByRole("heading", { name: "Приглашение создано" })).toBeInTheDocument();
    expect(screen.queryByTestId("agent-partner-hub-modal-tabs")).not.toBeInTheDocument();
  });

  it("CSS pins measured ready dialog geometry contract", () => {
    expect(css).toMatch(/\.backdropReady\s*\{[^}]*padding:\s*19px/s);
    expect(css).toMatch(/\.sheetReady\s*\{[^}]*width:\s*min\(620px,\s*100%\)/s);
    expect(css).toMatch(/\.sheetReady \.body :global\(section\[class\*="panel"\]\)/);
    expect(css).not.toMatch(/\.sheetReady\s*\{[^}]*width:\s*min\(600px/s);
  });
});
