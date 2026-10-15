import { describe, expect, it } from "vitest";
import {
  assertDarkThemeMeasurement,
  isEffectivelyTransparent,
  parseCssRgb,
} from "../../scripts/lib/r03-theme-assert.mjs";

describe("r03 theme assert (acceptance regression)", () => {
  it("light + transparent root must not pass dark", () => {
    const verdict = assertDarkThemeMeasurement({
      dataTheme: "light",
      colorScheme: "light",
      surfaceLuma: 246,
      surfaceBg: "rgb(246, 246, 246)",
    });
    expect(verdict.ok).toBe(false);
    expect(isEffectivelyTransparent("rgba(0, 0, 0, 0)")).toBe(true);
    expect(parseCssRgb("rgba(0, 0, 0, 0)").a).toBe(0);
  });

  it("explicit dark with dark surface passes", () => {
    expect(
      assertDarkThemeMeasurement({
        dataTheme: "dark",
        colorScheme: "dark",
        surfaceLuma: 24,
        surfaceBg: "rgb(24, 26, 25)",
      }).ok,
    ).toBe(true);
  });
});
