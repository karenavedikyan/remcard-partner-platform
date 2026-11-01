/** @vitest-environment jsdom */
/**
 * P23b SEARCH-FILTERS-13 wrapper ownership (additive).
 * Hub find modal: keyword → one refine disclosure → single modal-full mount.
 * Does not assert DiscoveryFilters internals (P22c / filter owner).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const hubTsx = path.join(__dirname, "PartnersHub.tsx");
const hubCss = path.join(__dirname, "PartnersHub.module.css");

describe("PartnersHub P23b SEARCH-FILTERS-13 find refine slot", () => {
  it("find showcase mounts one modal-full refine; no dual modal-primary/modal-more in showcase", () => {
    const src = fs.readFileSync(hubTsx, "utf8");
    const start = src.indexOf("const agentFindShowcase");
    const end = src.indexOf("if (isModalSurface)", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const showcase = src.slice(start, end);
    expect(showcase).toContain('layout="modal-full"');
    expect(showcase).toContain('data-testid="agent-partner-find-refine"');
    expect(showcase).toContain("Город и тип партнёра");
    expect(showcase.match(/AgentPartnerDiscoveryFilters/g)?.length).toBe(1);
    expect(showcase).not.toContain('layout="modal-primary"');
    expect(showcase).not.toContain('layout="modal-more"');
  });

  it("CSS provides findShell / findToolbarRow / findRefine without touching card width knobs", () => {
    const css = fs.readFileSync(hubCss, "utf8");
    expect(css).toMatch(/\.findShell\s*\{/);
    expect(css).toMatch(/\.findToolbarRow\s*\{/);
    expect(css).toMatch(/\.findRefine\s*\{/);
    expect(css).toMatch(/\.findRefineBody\s*\{/);
    // P23a/b card geometry stays on showcase grid + modalResultsFind — no compensatory padding
    expect(css).toMatch(/\.findShowcase\s*\{[^}]*236px/s);
    expect(css).not.toMatch(/\.findRefineBody\s*\{[^}]*padding:\s*0\s*;/s);
  });
});
