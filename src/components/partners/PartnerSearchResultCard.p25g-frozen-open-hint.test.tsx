import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");

describe("PartnerSearchResultCard P25g frozen showcase open-hint band", () => {
  it("matches accessibility-bound open-hint band (12px/700/16px-equivalent + 2×6 padding)", () => {
    expect(css).toMatch(/\.modalResultOpenHint\s*\{[^}]*padding:\s*2px\s+6px/s);
    expect(css).toMatch(/\.modalResultOpenHint\s*\{[^}]*font-size:\s*12px/s);
    expect(css).toMatch(/\.modalResultOpenHint\s*\{[^}]*font-weight:\s*700/s);
    expect(css).toMatch(/\.modalResultOpenHint\s*\{[^}]*line-height:\s*1\.3333333/s);
  });

  it("aligns empty directions copy shell with frozen pr-card-description", () => {
    expect(css).toMatch(/\.modalResultDirectionsEmpty\s*\{[^}]*font-size:\s*0\.875rem/s);
    expect(css).toMatch(/\.modalResultDirectionsEmpty\s*\{[^}]*font-weight:\s*600/s);
    expect(css).toMatch(/\.modalResultStages\s*\{[^}]*min-height:\s*18px/s);
  });
});
