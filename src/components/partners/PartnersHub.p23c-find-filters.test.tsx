/** @vitest-environment jsdom */
/**
 * P23c: keyword → exactly one refine (P22c modal-full owns details).
 * No outer hub findRefine wrapper.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const hubTsx = path.join(__dirname, "PartnersHub.tsx");
const hubCss = path.join(__dirname, "PartnersHub.module.css");

describe("PartnersHub P23c integrated find filters slot", () => {
  it("find showcase mounts one modal-full without hub outer details wrapper", () => {
    const src = fs.readFileSync(hubTsx, "utf8");
    const start = src.indexOf("const agentFindShowcase");
    const end = src.indexOf("if (isModalSurface)", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const showcase = src.slice(start, end);
    expect(showcase).toContain('layout="modal-full"');
    expect(showcase).toContain('data-testid="agent-partner-find-filter-slot"');
    expect(showcase.match(/AgentPartnerDiscoveryFilters/g)?.length).toBe(1);
    expect(showcase).not.toContain('layout="modal-primary"');
    expect(showcase).not.toContain('layout="modal-more"');
    expect(showcase).not.toContain('data-testid="agent-partner-find-refine"');
    expect(showcase).not.toMatch(/<details[^>]*findRefine/);
  });

  it("CSS keeps findShell/toolbar/filter-slot without card width compensation", () => {
    const css = fs.readFileSync(hubCss, "utf8");
    expect(css).toMatch(/\.findShell\s*\{/);
    expect(css).toMatch(/\.findToolbarRow\s*\{/);
    expect(css).toMatch(/\.findFilterSlot\s*\{/);
    expect(css).toMatch(/\.findShowcase\s*\{[^}]*236px/s);
  });
});
