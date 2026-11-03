import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = path.join(import.meta.dirname, "PartnerDiscoveryNavigator.module.css");
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

/** Approved cabinet tokens from globals.css (native QA reference). */
const TOKENS = {
  light: { ink: "#252923", muted: "#6c706a", offset: "#f2f1ee" },
  dark: { ink: "#f0f1ec", accentLegacy: "#bb3035", soft: "#3c2928", offset: "#2b312b" },
};

describe("PartnerDiscoveryNavigator native QA rail CSS (scoped)", () => {
  it("uses ink for active path row text, not accent-on-tint (B1)", () => {
    expect(css).toMatch(/\.step\[aria-pressed="true"\]\s+\.stepText\s+b,\s*\n\.step\[aria-pressed="true"\]\s+\.stepText\s+em\s*\{[^}]*color:\s*var\(--ink\)/s);
    expect(css).toMatch(/\.navItem\[aria-pressed="true"\]\s*\{[^}]*color:\s*var\(--ink\)/s);
    expect(css).not.toMatch(/\.step\[aria-pressed="true"\]\s+\.stepText\s+b,\s*\n\.step\[aria-pressed="true"\]\s+\.stepText\s+em\s*\{[^}]*color:\s*var\(--accent/s);
  });

  it("meets WCAG contrast for dark active row text on offset rail (B1)", () => {
    expect(contrastRatio(TOKENS.dark.ink, TOKENS.dark.offset)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(TOKENS.dark.accentLegacy, TOKENS.dark.soft)).toBeLessThan(4.5);
  });

  it("uses ink on offset count badges in light theme (B2)", () => {
    expect(css).toMatch(/\.step\s+small\s*\{[^}]*color:\s*var\(--ink\)/s);
    expect(css).toMatch(/\.stepNode\s+i\s*\{[^}]*color:\s*var\(--ink\)/s);
    expect(contrastRatio(TOKENS.light.ink, TOKENS.light.offset)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(TOKENS.light.muted, TOKENS.light.offset)).toBeLessThan(4.5);
  });

  it("allows full empty-stage caption in compact rail 761–1000px (B3)", () => {
    expect(css).not.toMatch(/@media\s*\(min-width:\s*768px\)\s*and\s*\(max-width:\s*900px\)/);
    expect(css).toMatch(
      /@media\s*\(min-width:\s*761px\)\s*and\s*\(max-width:\s*1000px\)[\s\S]*\.isEmpty\s+\.step\s*\{[^}]*max-height:\s*none[^}]*height:\s*auto[^}]*min-height:\s*37px/s,
    );
    expect(css).toMatch(
      /@media\s*\(min-width:\s*761px\)\s*and\s*\(max-width:\s*1000px\)[\s\S]*\.isEmpty\s+\.stepText\s+em\s*\{[^}]*white-space:\s*normal/s,
    );
    expect(css).toMatch(/\.isEmpty\s+\.stepText\s+em\s*\{[^}]*text-overflow:\s*ellipsis/s);
  });
});
