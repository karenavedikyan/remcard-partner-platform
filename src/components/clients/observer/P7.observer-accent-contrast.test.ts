import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const globalsCss = readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");
const observerCss = readFileSync(path.join(__dirname, "observer.module.css"), "utf8");

const MIN_CONTRAST_AA = 4.5;
const THEMES = ["light", "dark"] as const;

function buildProductionTokenHarness(theme: (typeof THEMES)[number]): string {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${globalsCss}
${observerCss}
body { margin: 16px; font-family: var(--font-body, Manrope, system-ui, sans-serif); }
</style>
</head>
<body>
  <section class="personalTools" data-testid="tools">
    <div class="personalTop">
      <div class="personalBuckets">
        <button type="button" class="bucketBtn" aria-pressed="true" data-testid="bucket-active">Активные <span>2</span></button>
        <button type="button" class="bucketBtn" aria-pressed="false">Архив <span>0</span></button>
      </div>
      <div class="personalLayout">
        <button type="button" class="bucketBtn" aria-pressed="true" data-testid="layout-pressed">По партнёрам</button>
        <button type="button" class="bucketBtn" aria-pressed="false">Списком</button>
      </div>
    </div>
    <p class="persistenceNotice" data-testid="persist-notice">BLOCKED_PERSISTENCE</p>
    <label class="personalCheck"><input type="checkbox" checked data-testid="check" /></label>
    <span class="toggleLabel" data-testid="toggle-label">Клиенты <span class="partnerArrow">→</span></span>
  </section>
</body>
</html>`;
}

function parseRgbTriplet(rgb: string): [number, number, number] | null {
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const convert = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("P7 — observer accent with production globals.css", () => {
  it("defines --observer-accent cascade (prototype --accent, else cabinet tokens)", () => {
    expect(observerCss).toMatch(
      /--observer-accent:\s*var\(--accent,\s*var\(--accent-emphasis,\s*var\(--primary,\s*#c12b2f\)\)\)/,
    );
    expect(observerCss).not.toMatch(/var\(--accent,\s*#c12b2f\)/);
    const accentUsages = observerCss.match(/var\(--observer-accent\)/g);
    expect(accentUsages?.length).toBe(8);
  });

  describe("computed WCAG contrast (Playwright + globals.css)", () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    }, 60_000);

    afterAll(async () => {
      await browser?.close();
    });

    for (const theme of THEMES) {
      it(`${theme}: pressed bucket/layout text ≥ ${MIN_CONTRAST_AA}:1 on --surface`, async () => {
        const context = await browser.newContext({ viewport: { width: 768, height: 400 } });
        const page = await context.newPage();
        await page.setContent(buildProductionTokenHarness(theme), { waitUntil: "domcontentloaded" });

        for (const testId of ["bucket-active", "layout-pressed"] as const) {
          const metrics = await page.getByTestId(testId).evaluate((el) => {
            const cs = getComputedStyle(el);
            return {
              color: cs.color,
              backgroundColor: cs.backgroundColor,
              fontSize: cs.fontSize,
            };
          });
          expect(metrics.fontSize).toBe("16px");
          const fg = parseRgbTriplet(metrics.color);
          const bg = parseRgbTriplet(metrics.backgroundColor);
          expect(fg, `fg ${metrics.color}`).not.toBeNull();
          expect(bg, `bg ${metrics.backgroundColor}`).not.toBeNull();
          const ratio = contrastRatio(fg!, bg!);
          expect(ratio, `${theme} ${testId}`).toBeGreaterThanOrEqual(MIN_CONTRAST_AA);
        }

        const toggleMetrics = await page.getByTestId("toggle-label").evaluate((el) => {
          let node: Element | null = el;
          let backdrop = getComputedStyle(document.body).backgroundColor;
          while (node) {
            const bg = getComputedStyle(node).backgroundColor;
            if (bg && !bg.includes("rgba(0, 0, 0, 0)") && bg !== "transparent") {
              backdrop = bg;
              break;
            }
            node = node.parentElement;
          }
          return { color: getComputedStyle(el).color, backdrop };
        });
        const fgT = parseRgbTriplet(toggleMetrics.color)!;
        const bgT = parseRgbTriplet(toggleMetrics.backdrop)!;
        const toggleRatio = contrastRatio(fgT, bgT);
        expect(toggleRatio, `${theme} toggle-label on page backdrop`).toBeGreaterThanOrEqual(MIN_CONTRAST_AA);

        await context.close();
      });

      it(`${theme}: active controls use resolved accent (not hardcoded #c12b2f on dark surface)`, async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(buildProductionTokenHarness(theme), { waitUntil: "domcontentloaded" });
        const color = await page.getByTestId("bucket-active").evaluate((el) => getComputedStyle(el).color);
        if (theme === "dark") {
          expect(color).toMatch(/rgb\(253,\s*164,\s*175\)/);
          expect(color).not.toMatch(/rgb\(193,\s*43,\s*47\)/);
        }
        await context.close();
      });
    }
  });
});
