import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme-contrast";

const css = readFileSync(path.join(__dirname, "recommendations.module.css"), "utf8");
const globalsCss = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const RC_CERT_MARKER = "/* === rc-cert: shared certificate result card (prototype parity) === */";

function block(className: string, pseudo = ""): string {
  const escaped = pseudo.replace(":", "\\:");
  const re = new RegExp(`\\.${className}${escaped}\\s*\\{[^}]+\\}`, "s");
  return css.match(re)?.[0] ?? "";
}

function prop(rule: string, name: string): string | null {
  const m = rule.match(new RegExp(`${name}:\\s*([^;]+);`));
  return m?.[1].trim() ?? null;
}

function fontSizesIn(blockText: string): number[] {
  const sizes: number[] = [];
  for (const match of blockText.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
    sizes.push(Number(match[1]));
  }
  return sizes;
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
  if (depth > 6 || !value) {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("rgb")) {
    return trimmed;
  }
  const varMatch = trimmed.match(/var\(--([\w-]+)\)/);
  if (!varMatch) {
    return trimmed;
  }
  const next = tokens[varMatch[1]];
  if (!next) {
    return trimmed;
  }
  return resolveCssColor(next, tokens, depth + 1);
}

function assertMinContrast(
  label: string,
  fg: string,
  bg: string,
  min = 4.5,
): void {
  expect(contrastRatio(fg, bg), `${label} (${fg} on ${bg})`).toBeGreaterThanOrEqual(min);
}

describe("CertificateResultView rc-cert CSS contract", () => {
  const appendix = css.slice(css.indexOf(RC_CERT_MARKER));

  it("matches prototype geometry for wrap and card shell", () => {
    expect(block("specialistCertWrap")).toMatch(/max-width:\s*520px/);
    expect(block("specialistCertCard")).toMatch(/border-radius:\s*20px/);
    expect(block("specialistCertCard")).toMatch(/padding:\s*24px/);
    expect(block("specialistCertCard")).toMatch(/gap:\s*14px/);
    expect(block("specialistCertCard")).toMatch(
      /background:\s*linear-gradient\(160deg,\s*#151922,\s*#0a0d12\)/,
    );
  });

  it("keeps QR tile, code styling, and overflow-wrap", () => {
    expect(block("specialistCertQr")).toMatch(/padding:\s*8px/);
    expect(block("specialistCertQr")).toMatch(/border-radius:\s*14px/);
    expect(block("specialistCertQr")).toMatch(/background:\s*#fff/);
    expect(block("specialistCertCode")).toMatch(/color:\s*#ff7379/);
    expect(block("specialistCertCode")).toMatch(/font-size:\s*24px/);
    expect(block("specialistCertCode")).toMatch(/letter-spacing:\s*2px/);
    expect(block("specialistCertCode")).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it("uses ≥12px type and 44px targets inside card controls", () => {
    const cardRules = [
      "specialistCertBrand",
      "specialistCertBadge",
      "specialistCertTitle",
      "specialistCertPartner",
      "specialistCertOffers",
      "specialistCertCode",
      "specialistCopyCodeBtn",
      "specialistCertManagementLabel",
    ];
    for (const name of cardRules) {
      for (const size of fontSizesIn(block(name))) {
        expect(size, `${name} font-size ${size}px`).toBeGreaterThanOrEqual(12);
      }
    }
    expect(block("specialistCopyCodeBtn")).toMatch(/min-height:\s*44px/);
    expect(block("specialistCertPublicLink")).toMatch(/min-height:\s*44px/);
    expect(parseFloat(prop(block("specialistCertPublicLink"), "font-size") ?? "0")).toBeGreaterThanOrEqual(
      12,
    );
    expect(appendix).toMatch(/\.specialistCertActionRow :global\(button\)[^}]*min-height:\s*44px/s);
  });

  it("meets 4.5:1 contrast for text on the dark card surface", () => {
    const darkSurface = "#0a0d12";
    assertMinContrast("card white", "#ffffff", darkSurface);
    assertMinContrast("card muted", "#c8cdd3", darkSurface);
    assertMinContrast("card code", "#ff7379", darkSurface);
  });

  it("uses theme primary on public link (not hardcoded accent hex)", () => {
    const link = block("specialistCertPublicLink");
    expect(link).toMatch(/color:\s*var\(--primary\)/);
    expect(link).not.toMatch(/#bb3035/i);
    expect(block("specialistCertPublicLink", ":focus-visible")).toMatch(
      /outline:\s*3px solid var\(--primary\)/,
    );
  });

  it.each(["light", "dark"] as const)(
    "meets contrast on surface-themed CertificateResultView chrome in %s theme",
    (theme) => {
      const tokens = parseThemeTokens(theme);
      const bg = resolveCssColor("var(--bg)", tokens);
      const primary = resolveCssColor("var(--primary)", tokens);
      const ink = resolveCssColor("var(--ink)", tokens);
      const green = resolveCssColor("var(--green)", tokens);
      const greenSoft = resolveCssColor("var(--green-soft)", tokens);
      const muted = resolveCssColor("var(--muted)", tokens);
      const soft = resolveCssColor("var(--soft)", tokens);

      const linkRule = block("specialistCertPublicLink");
      const linkColor = resolveCssColor(prop(linkRule, "color") ?? "", tokens);
      const linkBg = resolveCssColor(prop(linkRule, "background") ?? "", tokens);
      assertMinContrast(`${theme} public link`, linkColor, linkBg);

      const focusRule = block("specialistCertPublicLink", ":focus-visible");
      const outlineVal = prop(focusRule, "outline") ?? "";
      const focusRing = resolveCssColor(outlineVal.replace(/^3px\s+solid\s+/i, ""), tokens);
      expect(contrastRatio(focusRing, linkBg), `${theme} public link focus ring`).toBeGreaterThanOrEqual(3);

      const detailsColor = resolveCssColor(prop(block("specialistCertDetails"), "color") ?? "", tokens);
      assertMinContrast(`${theme} details text`, detailsColor, bg);

      const bannerColor = resolveCssColor(prop(block("successBanner"), "color") ?? "", tokens);
      const bannerBg = resolveCssColor(prop(block("successBanner"), "background") ?? "", tokens);
      assertMinContrast(`${theme} success banner`, bannerColor, bannerBg);

      const noticeColor = resolveCssColor(prop(block("notice"), "color") ?? "", tokens);
      const noticeBg = resolveCssColor(prop(block("notice"), "background") ?? "", tokens);
      assertMinContrast(`${theme} notice`, noticeColor, noticeBg);

      const copyOkColor = resolveCssColor(prop(block("copyOk"), "color") ?? "", tokens);
      assertMinContrast(`${theme} copyOk`, copyOkColor, bg);

      const errorColor = resolveCssColor(prop(block("errorText"), "color") ?? "", tokens);
      assertMinContrast(`${theme} errorText`, errorColor, bg);
    },
  );
});
