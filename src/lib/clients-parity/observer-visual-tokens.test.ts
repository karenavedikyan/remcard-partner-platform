import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * C42/C44: numeric token spot-check vs prototype client-appeals.css (no screenshot PASS).
 */
describe("observer visual tokens (numeric, C42/C44 partial)", () => {
  const css = readFileSync(
    path.resolve(__dirname, "../../components/clients/observer/observer.module.css"),
    "utf8",
  );

  it("uses 12px partner category and 20px KPI values", () => {
    expect(css).toMatch(/font-size:\s*12px/);
    expect(css).toMatch(/font-size:\s*20px/);
  });

  it("uses 44px control min-height", () => {
    expect(css).toMatch(/min-height:\s*44px/);
  });

  it("uses 16px section radius", () => {
    expect(css).toMatch(/border-radius:\s*16px/);
  });

  it("KPI cascade breakpoints are 760px (four cols) and 360px (two cols), not 768→2", () => {
    expect(css).toMatch(/max-width:\s*760px[\s\S]*\.partnerCard\s+\.stats[\s\S]*repeat\(4/);
    expect(css).toMatch(/max-width:\s*360px[\s\S]*\.partnerCard\s+\.stats[\s\S]*repeat\(2/);
    expect(css).not.toMatch(/max-width:\s*375px[\s\S]*\.stats/);
    expect(css).not.toMatch(/max-width:\s*768px[\s\S]*repeat\(2,\s*minmax/);
  });

  it("uses prototype max1100 grouped + max760 flat personal rows (no obsolete max768 areas)", () => {
    expect(css).toMatch(
      /max-width:\s*1100px[\s\S]*\.personalRowGrouped[\s\S]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
    expect(css).toMatch(/max-width:\s*760px[\s\S]*\.personalRow:not\(\.personalRowGrouped\)/);
    expect(css).not.toMatch(
      /max-width:\s*768px[\s\S]*\.personalRowGrouped[\s\S]*grid-template-areas/,
    );
    expect(css).not.toMatch(/\.personalRowGrouped\s*>\s*\.personalStatus\s*\{[\s\S]*grid-area:\s*status/);
  });
});
