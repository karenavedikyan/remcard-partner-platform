import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme-contrast";

const modalCss = readFileSync(
  path.join(__dirname, "purchase-review-modal.module.css"),
  "utf8",
);
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

function assertMinContrast(label: string, fg: string, bg: string, min = 4.5) {
  expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(min);
}

describe("PurchaseReviewModal scoped contrast on review offset panel", () => {
  it("uses ink (not muted) for due label and rollup terms", () => {
    expect(modalCss).toMatch(/\.reviewDueLabel\s*\{[^}]*color:\s*var\(--ink\)/);
    expect(modalCss).toMatch(/\.rollupRow dt\s*\{[^}]*color:\s*var\(--ink\)/);
    expect(modalCss).not.toMatch(/\.reviewDueLabel\s*\{[^}]*var\(--muted\)/);
    expect(modalCss).not.toMatch(/\.rollupRow dt\s*\{[^}]*var\(--muted\)/);
  });

  it.each(["light", "dark"] as const)(
    "rollup/due label text meets >=4.5 on offset in %s theme",
    (theme) => {
      const tokens = parseThemeTokens(theme);
      const ink = tokens.ink;
      const offset = tokens.offset;
      assertMinContrast(`review labels on offset (${theme})`, ink, offset);
    },
  );
});
