import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme-contrast";

const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "wallet-empty.module.css");
const walletEmptyCss = fs.readFileSync(cssPath, "utf8");

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

describe("wallet empty CTA focus outline", () => {
  it("uses local accent-ink token for focus-visible outline", () => {
    expect(walletEmptyCss).toMatch(/--es-accent-ink:\s*var\(--primary\)/);
    expect(walletEmptyCss).toMatch(
      /\.ctaLink:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--es-accent-ink\)/,
    );
    expect(walletEmptyCss).not.toMatch(/\.ctaLink:focus-visible[^}]*var\(--es-accent\)/);
  });

  it("light theme focus ink meets 3:1 against hero surface (outline offset)", () => {
    expect(contrastRatio("#c12b2f", "#ffffff")).toBeGreaterThanOrEqual(3);
  });

  it("dark theme focus ink meets 3:1 against hero surface (outline offset)", () => {
    expect(contrastRatio("#fda4af", "#202520")).toBeGreaterThanOrEqual(3);
  });

  it("documents primary-fill focus on dark hero surface fails non-text contrast", () => {
    expect(contrastRatio("#b54844", "#202520")).toBeLessThan(3);
  });
});
