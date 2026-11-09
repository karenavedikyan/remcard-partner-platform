import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme-contrast";

const cardCss = readFileSync(
  path.join(__dirname, "PartnerClientCertificateCard.module.css"),
  "utf8",
);
const wrapCss = readFileSync(path.join(__dirname, "recommendations.module.css"), "utf8");
const globalsCss = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

const WORST_GRADIENT = "#bf403c";
const PILL_BG = "#26100e"; /* rgb(38 14 16 / 72%) composited ≈ dark cap over gradient */

function block(css: string, className: string, pseudo = ""): string {
  const escaped = pseudo.replace(":", "\\:");
  const re = new RegExp(`\\.${className}${escaped}\\s*\\{[^}]+\\}`, "s");
  return css.match(re)?.[0] ?? "";
}

function parseThemeTokens(theme: "light" | "dark"): Record<string, string> {
  const selector =
    theme === "light" ? /:root\s*\{([^}]+)\}/s : /\[data-theme="dark"\]\s*\{([^}]+)\}/s;
  const inner = globalsCss.match(selector)?.[1] ?? "";
  const tokens: Record<string, string> = {};
  for (const match of inner.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

function resolveCssColor(value: string, tokens: Record<string, string>, depth = 0): string {
  if (depth > 6 || !value) return value;
  const trimmed = value.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("rgb")) return trimmed;
  const varMatch = trimmed.match(/var\(--([\w-]+)\)/);
  if (!varMatch) return trimmed;
  const next = tokens[varMatch[1]];
  if (!next) return trimmed;
  return resolveCssColor(next, tokens, depth + 1);
}

function blendOver(bg: string, fg: string, alpha: number): string {
  const hexToRgb = (hex: string) => {
    const n = Number.parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const [br, bgc, bb] = hexToRgb(bg.length === 7 ? bg : "#bf403c");
  const [fr, fgC, fb] = hexToRgb(fg.length === 7 ? fg : "#ffffff");
  const r = Math.round(fr * alpha + br * (1 - alpha));
  const g = Math.round(fgC * alpha + bgc * (1 - alpha));
  const b = Math.round(fb * alpha + bb * (1 - alpha));
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

describe("PartnerClientCertificateCard — client v2 card CSS", () => {
  it("uses production red gradient, 22px radius, client type scale", () => {
    const rule = block(cardCss, "card");
    expect(rule).toMatch(/border-radius:\s*22px/);
    expect(rule).toMatch(/#bf403c/);
    expect(block(cardCss, "pctValue")).toMatch(/font-size:\s*2\.6rem/);
    expect(block(cardCss, "codeValue")).toMatch(/font-size:\s*1\.35rem/);
  });

  it("meets >=4.5 contrast for small on-card labels on worst gradient stop", () => {
    assertMinContrast("subtitle on gradient", "#ffffff", WORST_GRADIENT);
    assertMinContrast("status on gradient", "#ffffff", WORST_GRADIENT);
    assertMinContrast("term on gradient", "#ffffff", WORST_GRADIENT);
    const pillSurface = blendOver(WORST_GRADIENT, PILL_BG, 0.72);
    assertMinContrast("title pill on composited cap", "#ffffff", pillSurface);
  });

  it("keeps QR tile code/stamp on white at >=4.5", () => {
    assertMinContrast("code value", "#1b1f1a", "#ffffff");
    assertMinContrast("code label", "#5c635c", "#ffffff");
    assertMinContrast("stamp", "#1b1f1a", "#ffffff");
  });

  it("dims only QR box when inactive, not whole tile", () => {
    expect(cardCss).toMatch(/\.qrBoxInactive img/);
    expect(cardCss).not.toMatch(/\.qrTileInactive/);
  });
});

describe("CertificateResultView partner chrome (theme-aware management)", () => {
  it.each(["light", "dark"] as const)(
    "management label meets contrast on offset surface in %s theme",
    (theme) => {
      const tokens = parseThemeTokens(theme);
      const muted = resolveCssColor("var(--muted)", tokens);
      const surface = resolveCssColor("var(--surface)", tokens);
      assertMinContrast(`management label ${theme}`, muted, surface);
      const ink = resolveCssColor("var(--ink)", tokens);
      assertMinContrast(`management value ${theme}`, ink, surface);
    },
  );

  it("public link control keeps focus outline and 44px target", () => {
    expect(block(wrapCss, "specialistCertPublicLink", ":focus-visible")).toMatch(/outline/);
    expect(block(wrapCss, "specialistCertPublicLink")).toMatch(/min-height:\s*44px/);
  });

  it.each(["light", "dark"] as const)(
    "disabled action buttons meet 4.5 contrast on surface in %s theme",
    (theme) => {
      const disabledRule =
        wrapCss.match(/\.specialistCertActionRow :global\(button:disabled\)\s*\{[^}]+\}/s)?.[0] ?? "";
      expect(disabledRule).toMatch(/opacity:\s*1/);
      expect(disabledRule).toMatch(/background:\s*var\(--surface\)/);
      expect(disabledRule).toMatch(/color:\s*var\(--muted\)/);
      const tokens = parseThemeTokens(theme);
      const muted = resolveCssColor("var(--muted)", tokens);
      const surface = resolveCssColor("var(--surface)", tokens);
      assertMinContrast(`disabled action ${theme}`, muted, surface);
    },
  );

  it("details summary keeps 44px touch target and >=3:1 focus ring", () => {
    const summaryRule = block(wrapCss, "specialistCertDetails summary");
    expect(summaryRule).toMatch(/min-height:\s*44px/);
    expect(summaryRule).toMatch(/box-sizing:\s*border-box/);
    expect(summaryRule).not.toMatch(/display:\s*flex/);
    expect(block(wrapCss, "specialistCertDetails summary", ":focus-visible")).toMatch(
      /outline:\s*3px solid var\(--primary\)/,
    );
    for (const theme of ["light", "dark"] as const) {
      const tokens = parseThemeTokens(theme);
      const primary = resolveCssColor("var(--primary)", tokens);
      const bg = resolveCssColor("var(--offset)", tokens);
      assertMinContrast(`details summary focus ${theme}`, primary, bg, 3);
    }
  });
});

function assertMinContrast(label: string, fg: string, bg: string, min = 4.5): void {
  const ratio = contrastRatio(fg, bg);
  expect(ratio, `${label} (${fg} on ${bg}) = ${ratio}`).toBeGreaterThanOrEqual(min);
}
