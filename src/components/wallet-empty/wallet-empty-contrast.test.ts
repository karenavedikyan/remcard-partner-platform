import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme-contrast";

/** Token hex aligned with globals.css :root / [data-theme=dark] and wallet-empty kicker on --surface hero. */
describe("wallet empty kicker contrast", () => {
  it("light theme kicker meets 4.5:1 on hero surface", () => {
    expect(contrastRatio("#c12b2f", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("dark theme kicker meets 4.5:1 on hero surface", () => {
    expect(contrastRatio("#fda4af", "#202520")).toBeGreaterThanOrEqual(4.5);
  });

  it("documents primary-fill is unsuitable for kicker text on dark surface", () => {
    expect(contrastRatio("#b54844", "#202520")).toBeLessThan(4.5);
  });
});
