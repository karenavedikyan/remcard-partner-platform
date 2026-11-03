import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = path.join(import.meta.dirname, "PartnersHub.module.css");
const css = readFileSync(cssPath, "utf8");

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(hexToRgb(fg));
  const l2 = relativeLuminance(hexToRgb(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const TOKENS = {
  light: { surface: "#ffffff", offset: "#f2f1ee", primary: "#c12b2f" },
  dark: { surface: "#202520", railMid: "#353b34", soft: "#3c2928", primary: "#fda4af" },
};

describe("PartnersHub find intro focus ring CSS (scoped)", () => {
  it("routes findIntroBack focus-visible outline through primary fallback (F3a)", () => {
    expect(css).toMatch(
      /\.findIntroBack:hover,\s*\n\.findIntroBack:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent,\s*var\(--primary,\s*#bb3035\)\)/s,
    );
    expect(css).toMatch(
      /\.findIntroBack:hover,\s*\n\.findIntroBack:focus-visible\s*\{[^}]*outline-offset:\s*2px/s,
    );
    expect(css).not.toMatch(/\.findIntroBack:focus-visible[\s\S]{0,120}outline:[^;]*var\(--accent,\s*#bb3035\)/);
    expect(contrastRatio(TOKENS.dark.primary, TOKENS.dark.surface)).toBeGreaterThanOrEqual(8);
    expect(contrastRatio(TOKENS.dark.primary, TOKENS.dark.railMid)).toBeGreaterThanOrEqual(5);
    expect(contrastRatio(TOKENS.light.primary, TOKENS.light.surface)).toBeGreaterThanOrEqual(3);
  });
});
