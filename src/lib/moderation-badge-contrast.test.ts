/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  relativeLuminanceFromHex,
} from "./moderation-badge-contrast";
import { loadModerationBadgeSurfacesFromStylesheets } from "./moderation-badge-css-contrast";

const MIN_TEXT_RATIO = 4.5;

describe("moderation badge contrast from stylesheets", () => {
  const surfaces = loadModerationBadgeSurfacesFromStylesheets();

  it("parses org detail + queue badge rules from module CSS files", () => {
    expect(surfaces.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(surfaces.map((s) => `${s.id}:${s.theme}`));
    expect(ids.has("badgePending:light")).toBe(true);
    expect(ids.has("badgePending:dark")).toBe(true);
    expect(ids.has("queueBadgeTest:dark")).toBe(true);
  });

  it("meets WCAG AA for every explicit fg/bg pair declared in CSS", () => {
    for (const surface of surfaces) {
      const ratio = contrastRatio(surface.foreground, surface.background);
      expect(
        ratio,
        `${surface.id} (${surface.theme}) ${surface.selector} in ${surface.sourceFile}: ${ratio.toFixed(2)}:1 fg=${surface.foreground} bg=${surface.background}`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_RATIO);
    }
  });

  it("dark badgePending uses light foreground on dark background (not light-on-light)", () => {
    const darkPending = surfaces.find((s) => s.id === "badgePending" && s.theme === "dark")!;
    const lFg = relativeLuminanceFromHex(darkPending.foreground);
    const lBg = relativeLuminanceFromHex(darkPending.background);
    expect(lFg).toBeGreaterThan(lBg);
    const lightPending = surfaces.find((s) => s.id === "badgePending" && s.theme === "light")!;
    expect(relativeLuminanceFromHex(lightPending.foreground)).toBeLessThan(
      relativeLuminanceFromHex(lightPending.background),
    );
  });
});
