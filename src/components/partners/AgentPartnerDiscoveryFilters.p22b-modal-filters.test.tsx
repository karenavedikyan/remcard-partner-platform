import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "AgentPartnerDiscoveryFilters.module.css"), "utf8");
const P22B = "/* === P22b: modal-primary control height vs frozen directory-filters (50px) === */";

describe("AgentPartnerDiscoveryFilters P22b primary + more vs frozen directory-filters", () => {
  it("sets modal-primary and more controls to 50px height (no 46px PASS gap)", () => {
    const block = css.slice(css.indexOf(P22B));
    expect(block).toMatch(
      /\.modalPrimary\s*>\s*\.primaryRow\s*>\s*\.field\s*>\s*select\s*\{[^}]*min-height:\s*50px;[^}]*height:\s*50px/s,
    );
    expect(block).toMatch(/\.modalMore\s*>\s*\.moreFilters\s*>\s*\.moreGrid\s*>\s*\.field\s*>\s*select[^}]*min-height:\s*50px/s);
    expect(block).not.toMatch(/P22b[\s\S]*min-height:\s*46px/s);
  });

  it("exposes taxonomy error testid for native retry proof", () => {
    const tsx = readFileSync(path.join(__dirname, "AgentPartnerDiscoveryFilters.tsx"), "utf8");
    expect(tsx).toContain('data-testid="agent-partner-discovery-taxonomy-error"');
  });
});

/** Native harness gate: primary select rect height must match frozen within 1px. */
export function primarySelectHeightMatchesFrozenR1(implRectH: number, refRectH: number) {
  if (Math.abs(implRectH - refRectH) > 1) return { ok: false as const, reason: "height_mismatch" };
  if (Math.abs(implRectH - 50) > 1) return { ok: false as const, reason: "not_50px_band" };
  return { ok: true as const };
}
