/** @vitest-environment jsdom */
/**
 * P23b find-modal scroll ownership (additive).
 * Sheet is the sole scrollport (frozen dialog.hub-wide); body stays visible.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { AgentPartnerHubModal } from "./AgentPartnerHubModal";
import styles from "./AgentPartnerHubModal.module.css";

const cssPath = path.join(__dirname, "AgentPartnerHubModal.module.css");
const hubCssPath = path.join(__dirname, "PartnersHub.module.css");

describe("AgentPartnerHubModal P23b scroll ownership", () => {
  it("find sheet uses overflow auto; ready/link keep prior shells", () => {
    render(
      <AgentPartnerHubModal
        open
        tab="find"
        titleFind="Найти партнёра"
        titleLink="Пригласить"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      >
        <div>body</div>
      </AgentPartnerHubModal>,
    );
    expect(screen.getByTestId("agent-partner-hub-modal").className).toContain(styles.sheetFind);
  });

  it("CSS: sheetFind overflow auto; body visible; no nested results max-height scroll", () => {
    const css = fs.readFileSync(cssPath, "utf8");
    const hub = fs.readFileSync(hubCssPath, "utf8");
    expect(css).toMatch(/\.sheetFind\s*\{[^}]*overflow:\s*auto/s);
    expect(css).toMatch(/\.sheetFind\s+\.body\s*\{[^}]*overflow:\s*visible/s);
    expect(css).not.toMatch(/\.sheetFind\s*\{[^}]*overflow:\s*hidden/s);
    expect(hub).toMatch(/\.modalResultsFind\s*\{[^}]*overflow:\s*visible/s);
    expect(hub).toMatch(/\.modalResultsFind\s*\{[^}]*max-height:\s*none/s);
  });
});
