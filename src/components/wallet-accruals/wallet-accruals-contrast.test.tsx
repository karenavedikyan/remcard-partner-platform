import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = path.join(__dirname, "wallet-accruals.global.css");
const css = readFileSync(cssPath, "utf8");

const PAGE_LIGHT = [0xf6, 0xf5, 0xf3] as const;
/** Measured worst-case light composite behind teal chips (Chromium audit). */
const WORST_TEAL_CHIP_LIGHT = [200, 210, 206] as const;
const PAGE_DARK = [0x12, 0x14, 0x16] as const;

const MIN_RATIO = 4.8;

function parseHexColor(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function parseRgba(input: string): { rgb: [number, number, number]; alpha: number } {
  const m = input.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) throw new Error(`Cannot parse color: ${input}`);
  return {
    rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
    alpha: m[4] === undefined ? 1 : Number(m[4]),
  };
}

function compositeFg(
  fg: [number, number, number],
  alpha: number,
  bg: readonly [number, number, number],
): [number, number, number] {
  return fg.map((c, i) => Math.round(alpha * c + (1 - alpha) * bg[i])) as [number, number, number];
}

function relativeLuminance([r, g, b]: readonly [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(
  foreground: readonly [number, number, number],
  background: readonly [number, number, number],
): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractRuleBlock(selector: string): string {
  const needle = `\n${selector} {`;
  const idx = css.indexOf(needle);
  if (idx < 0) throw new Error(`Missing selector ${selector}`);
  const start = css.indexOf("{", idx);
  const end = css.indexOf("}", start);
  return css.slice(start + 1, end);
}

function extractDeclaration(block: string, prop: string): string {
  const re = new RegExp(`(?:^|[\\s{])${prop}\\s*:\\s*([^;]+);`, "m");
  const m = block.match(re);
  if (!m) throw new Error(`Missing ${prop} in block: ${block}`);
  return m[1].trim();
}

function resolveCssColor(value: string, tokens: Record<string, string>): [number, number, number] {
  if (value.startsWith("#")) return parseHexColor(value);
  if (value.startsWith("rgba") || value.startsWith("rgb")) {
    const { rgb } = parseRgba(value);
    return rgb;
  }
  const varMatch = value.match(/var\(\s*(--[\w-]+)/);
  if (varMatch) {
    const resolved = tokens[varMatch[1]] ?? tokens[`${varMatch[1]}, #4a5058`];
    if (!resolved) throw new Error(`Unresolved ${value}`);
    return resolveCssColor(resolved.split(")")[0].replace(/var\([^,]+,\s*/, "").trim(), tokens);
  }
  throw new Error(`Unsupported color ${value}`);
}

const walletTokens: Record<string, string> = {
  "--wallet-accrual-ink-muted-strong": "#4a5058",
  "--wallet-accrual-ink-muted": "#b8c0ca",
};

describe("wallet-accruals.global.css WCAG contrast (E6)", () => {
  it("teal quick labels meet >=4.8 on worst measured light composite and dark theme", () => {
    const lightBlock = extractRuleBlock(".wallet-accruals-quick__btn--teal");
    const darkBlock = extractRuleBlock("[data-theme=dark] .wallet-accruals-quick__btn--teal");

    const lightText = resolveCssColor(extractDeclaration(lightBlock, "color"), walletTokens);
    const lightBg = parseRgba(extractDeclaration(lightBlock, "background"));
    const lightComposite = compositeFg(lightBg.rgb, lightBg.alpha, PAGE_LIGHT);

    expect(contrastRatio(lightText, lightComposite)).toBeGreaterThanOrEqual(MIN_RATIO);
    expect(contrastRatio(lightText, WORST_TEAL_CHIP_LIGHT)).toBeGreaterThanOrEqual(MIN_RATIO);

    const darkText = resolveCssColor(extractDeclaration(darkBlock, "color"), walletTokens);
    const darkBg = parseRgba(extractDeclaration(darkBlock, "background"));
    const darkComposite = compositeFg(darkBg.rgb, darkBg.alpha, PAGE_DARK);
    expect(contrastRatio(darkText, darkComposite)).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it("accent quick labels meet >=4.8 in light and dark", () => {
    const lightBlock = extractRuleBlock(".wallet-accruals-quick__btn--accent");
    const darkBlock = extractRuleBlock("[data-theme=dark] .wallet-accruals-quick__btn--accent");

    const lightText = resolveCssColor(extractDeclaration(lightBlock, "color"), walletTokens);
    const lightBg = parseRgba(extractDeclaration(lightBlock, "background"));
    const lightComposite = compositeFg(lightBg.rgb, lightBg.alpha, PAGE_LIGHT);
    expect(contrastRatio(lightText, lightComposite)).toBeGreaterThanOrEqual(MIN_RATIO);

    const darkText = resolveCssColor(extractDeclaration(darkBlock, "color"), walletTokens);
    const darkBg = parseRgba(extractDeclaration(darkBlock, "background"));
    const darkComposite = compositeFg(darkBg.rgb, darkBg.alpha, PAGE_DARK);
    expect(contrastRatio(darkText, darkComposite)).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it("coverage note uses scoped ink strong on light page (not global pw-muted)", () => {
    const block = extractRuleBlock(".pw .wallet-accruals .wallet-accruals-coverage");
    const color = extractDeclaration(block, "color");
    expect(color).toContain("--wallet-accrual-ink-muted-strong");
    const text = resolveCssColor(color, walletTokens);
    expect(contrastRatio(text, PAGE_LIGHT)).toBeGreaterThanOrEqual(MIN_RATIO);

    const darkBlock = extractRuleBlock("[data-theme=dark] .pw .wallet-accruals .wallet-accruals-coverage");
    const darkText = resolveCssColor(extractDeclaration(darkBlock, "color"), walletTokens);
    const darkComposite = compositeFg(darkText, 1, PAGE_DARK);
    expect(contrastRatio(darkText, PAGE_DARK)).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it("documents before/after ratios for audited failing pairs (regression guard)", () => {
    const beforeTeal = parseHexColor("#0f5c52");
    const beforeCoverage = parseHexColor("#6c706a");
    const afterTeal = parseHexColor("#0a4a41");
    const afterCoverage = parseHexColor("#4a5058");
    expect(contrastRatio(beforeCoverage, PAGE_LIGHT)).toBeLessThan(MIN_RATIO);
    expect(contrastRatio(afterCoverage, PAGE_LIGHT)).toBeGreaterThanOrEqual(MIN_RATIO);
    expect(contrastRatio(afterTeal, WORST_TEAL_CHIP_LIGHT)).toBeGreaterThan(
      contrastRatio(beforeTeal, WORST_TEAL_CHIP_LIGHT),
    );
    expect(contrastRatio(afterTeal, WORST_TEAL_CHIP_LIGHT)).toBeGreaterThanOrEqual(MIN_RATIO);
  });
});
