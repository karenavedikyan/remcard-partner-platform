import { describe, expect, it } from "vitest";
import { THEME_CONTRAST_PAIRS, contrastRatio } from "./theme-contrast";

describe("theme contrast tokens", () => {
  for (const [themeName, pairs] of Object.entries(THEME_CONTRAST_PAIRS)) {
    describe(themeName, () => {
      for (const [label, pair] of Object.entries(pairs)) {
        it(`${label} meets minimum contrast (${pair.minRatio}:1)`, () => {
          const ratio = contrastRatio(pair.fg, pair.bg);
          expect(ratio).toBeGreaterThanOrEqual(pair.minRatio);
        });
      }
    });
  }

  it("dark tab active avoids light-on-light regression", () => {
    const ratio = contrastRatio("#ffffff", "#f0f1ec");
    expect(ratio).toBeLessThan(2);
  });
});
