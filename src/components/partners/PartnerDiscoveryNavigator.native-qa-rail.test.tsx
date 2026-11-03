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

function compositeHex(fg: string, bg: string, fgAlpha: number): string {
  const [fr, fgG, fb] = hexToRgb(fg);
  const [br, bgG, bb] = hexToRgb(bg);
  const mix = (f: number, b: number) => Math.round(f * fgAlpha + b * (1 - fgAlpha));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(fr, br))}${toHex(mix(fgG, bgG))}${toHex(mix(fb, bb))}`;
}

/** Approved cabinet tokens from globals.css (native QA reference). */
const TOKENS = {
  light: { ink: "#252923", muted: "#6c706a", offset: "#f2f1ee", surface: "#ffffff", primary: "#c12b2f" },
  dark: {
    ink: "#f0f1ec",
    accentLegacy: "#bb3035",
    soft: "#3c2928",
    offset: "#2b312b",
    surface: "#202520",
    railMid: "#353b34",
    primary: "#fda4af",
  },
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

  it("raises quest head 12px copy contrast (A2)", () => {
    expect(css).toMatch(/\.questEyebrow\s*\{[^}]*opacity:\s*1/s);
    expect(css).toMatch(/\.questHead\s+small\s*\{[^}]*opacity:\s*1/s);
    expect(css).toMatch(/#bf403c/);
    expect(css).toMatch(/#a64744/);
    const lightCaptionOnEnd = contrastRatio("#fff5f3", "#bf403c");
    const darkCaptionOnEnd = contrastRatio("#fff5f3", "#a64744");
    expect(lightCaptionOnEnd).toBeGreaterThanOrEqual(4.5);
    expect(darkCaptionOnEnd).toBeGreaterThanOrEqual(4.5);
  });

  it("uses dark overlay on selected direction chip count (A1)", () => {
    expect(css).toMatch(
      /\.skillGrid\s+\.navItem\[aria-pressed="true"\]\s+small\s*\{[^}]*background:\s*rgb\(0\s+0\s+0\s+\/\s*18%\)[^}]*color:\s*var\(--onaccent,\s*#fff\)/s,
    );
    const badgeOnAccent = contrastRatio("#ffffff", "#962628");
    expect(badgeOnAccent).toBeGreaterThanOrEqual(4.5);
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

  it("routes focus rings through primary fallback for dark contrast (F3a)", () => {
    expect(css).toMatch(
      /\.navigator button:focus-visible,\s*\n\.navigator summary:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent,\s*var\(--primary,\s*#bb3035\)\)/s,
    );
    expect(css).not.toMatch(/focus-visible[\s\S]{0,120}outline:[^;]*var\(--accent,\s*#bb3035\)/);
    expect(contrastRatio(TOKENS.dark.primary, TOKENS.dark.surface)).toBeGreaterThanOrEqual(8);
    expect(contrastRatio(TOKENS.dark.primary, TOKENS.dark.railMid)).toBeGreaterThanOrEqual(5);
    expect(contrastRatio(TOKENS.dark.primary, TOKENS.dark.soft)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(TOKENS.light.primary, TOKENS.light.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(TOKENS.light.primary, TOKENS.light.offset)).toBeGreaterThanOrEqual(3);
  });

  it("raises empty path placeholder count contrast without changing role (F3b)", () => {
    expect(css).toMatch(/\.isEmpty\s+small\s*\{[^}]*opacity:\s*0\.8/s);
    const lightCount = compositeHex(TOKENS.light.ink, TOKENS.light.surface, 0.8);
    const darkCount = compositeHex(TOKENS.dark.ink, TOKENS.dark.surface, 0.8);
    expect(contrastRatio(lightCount, TOKENS.light.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkCount, TOKENS.dark.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
