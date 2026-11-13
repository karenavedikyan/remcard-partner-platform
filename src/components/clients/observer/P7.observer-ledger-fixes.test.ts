import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "observer.module.css"), "utf8");
const globalsCss = readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");

function harness(theme: "light" | "dark") {
  return `<!DOCTYPE html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8"/><style>
${globalsCss}
${css}
body{margin:16px}
</style></head><body>
<section class="personalTools">
<button type="button" class="bucketBtn" data-testid="pressed" aria-pressed="true">Активные</button>
</section>
<article class="partnerCard">
<details class="disclosure" open><summary data-testid="summary"><span class="toggleLabel">Клиенты</span></summary></details>
</article>
</body></html>`;
}

function parseRgbTriplet(rgb: string): [number, number, number] | null {
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe("P7 — ledger fixes (bucket + disclosure + tint)", () => {
  it("source: bucket 12px / 4px 12px, pressed tint, summary 14px", () => {
    expect(css).toContain(".bucketBtn");
    expect(css).toMatch(/padding:\s*4px 12px[\s\S]{0,120}font-size:\s*12px/);
    expect(css).toMatch(/\.bucketBtn\[aria-pressed="true"\][\s\S]{0,200}background:\s*var\(--observer-tint\)/);
    expect(css).toMatch(/\.disclosure summary[\s\S]{0,500}min-height:\s*44px[\s\S]{0,200}font-size:\s*14px/);
    expect(css).toMatch(/--observer-accent:\s*var\(--accent,\s*var\(--accent-emphasis/);
  });

  describe("computed with production globals", () => {
    let browser: Browser;
    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    }, 60_000);
    afterAll(async () => browser?.close());

    for (const theme of ["light", "dark"] as const) {
      it(`${theme}: pressed bucket geometry matches prototype ledger targets`, async () => {
        const context = await browser.newContext({ viewport: { width: 375, height: 640 } });
        const page = await context.newPage();
        await page.setContent(harness(theme), { waitUntil: "domcontentloaded" });
        const bucket = await page.getByTestId("pressed").evaluate((el) => {
          const cs = getComputedStyle(el);
          return { fontSize: cs.fontSize, padding: cs.padding, minHeight: cs.minHeight, backgroundColor: cs.color && cs.backgroundColor, color: cs.color };
        });
        expect(bucket.fontSize).toBe("12px");
        expect(bucket.padding).toBe("4px 12px");
        expect(parseFloat(bucket.minHeight)).toBeGreaterThanOrEqual(44);
        const summary = await page.getByTestId("summary").evaluate((el) => getComputedStyle(el).fontSize);
        expect(summary).toBe("14px");
        await context.close();
      });

      it(`${theme}: dark accent text on tint stays ≥4.5:1 (not prototype low-contrast accent)`, async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(harness(theme), { waitUntil: "domcontentloaded" });
        const colors = await page.getByTestId("pressed").evaluate((el) => {
          const cs = getComputedStyle(el);
          return { color: cs.color, backgroundColor: cs.backgroundColor };
        });
        const fg = parseRgbTriplet(colors.color)!;
        const bg = parseRgbTriplet(colors.backgroundColor)!;
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
        if (theme === "dark") {
          expect(colors.color).toMatch(/rgb\(253,\s*164,\s*175\)/);
          expect(colors.color).not.toMatch(/rgb\(193,\s*43,\s*47\)/);
        }
        await context.close();
      });
    }
  });
});
