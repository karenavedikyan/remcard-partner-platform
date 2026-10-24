import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  relativeLuminanceFromHex,
} from "./moderation-badge-contrast";
import { MODERATION_BADGE_CONTRAST_PAIRS } from "./moderation-badge-contrast.pairs";

describe("moderation badge semantic contrast pairs", () => {
  it("meets WCAG AA for every declared light/dark pair", () => {
    for (const pair of MODERATION_BADGE_CONTRAST_PAIRS) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      expect(
        ratio,
        `${pair.id} (${pair.theme}): ${ratio.toFixed(2)}:1 fg=${pair.foreground} bg=${pair.background}`,
      ).toBeGreaterThanOrEqual(pair.minRatio);
    }
  });

  it("dark pending uses light foreground on dark background (not light-on-light)", () => {
    const darkPending = MODERATION_BADGE_CONTRAST_PAIRS.find(
      (p) => p.id === "badgePending" && p.theme === "dark",
    )!;
    const lFg = relativeLuminanceFromHex(darkPending.foreground);
    const lBg = relativeLuminanceFromHex(darkPending.background);
    expect(lFg).toBeGreaterThan(lBg);
    const lightPending = MODERATION_BADGE_CONTRAST_PAIRS.find(
      (p) => p.id === "badgePending" && p.theme === "light",
    )!;
    expect(relativeLuminanceFromHex(lightPending.foreground)).toBeLessThan(
      relativeLuminanceFromHex(lightPending.background),
    );
  });
});
