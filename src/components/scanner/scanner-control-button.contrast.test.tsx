import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme-contrast";

const buttonCss = readFileSync(
  path.join(__dirname, "scanner-control-button.module.css"),
  "utf8",
);
const scannerCss = readFileSync(path.join(__dirname, "scanner.module.css"), "utf8");
const globalsCss = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

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

describe("Scanner disabled controls (no shared Button opacity bleed)", () => {
  it("uses opacity 1 on scanner control buttons when disabled", () => {
    expect(buttonCss).toMatch(/button\.controlButton:disabled[\s\S]*?opacity:\s*1/);
    expect(buttonCss).toMatch(/background:\s*var\(--offset\)/);
    expect(buttonCss).toMatch(/color:\s*var\(--ink\)/);
  });

  it.each(["light", "dark"] as const)(
    "disabled scanner button ink on offset meets >=4.5 in %s theme",
    (theme) => {
      const tokens = parseThemeTokens(theme);
      const ratio = contrastRatio(tokens.ink, tokens.offset);
      expect(ratio, `ink on offset (${theme})`).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("reward fieldset disabled keeps opacity 1 and styles controls", () => {
    expect(scannerCss).toMatch(/\.rewardTerms:disabled\s*\{[^}]*opacity:\s*1/);
    expect(scannerCss).not.toMatch(/opacity:\s*0\.65/);
  });
});
