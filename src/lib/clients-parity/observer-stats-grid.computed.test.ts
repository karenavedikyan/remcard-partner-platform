import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  STATS_GRID_MEASURE_WIDTHS,
  expectedStatsGridColumnCount,
  parseComputedGridColumnCount,
} from "./observer-stats-grid-spec";
import { buildObserverStatsGridHarnessHtml, loadObserverModuleCss, type StatsGridTheme } from "./observer-stats-grid-harness";

const THEMES: StatsGridTheme[] = ["light", "dark"];

describe("observer partner KPI .stats grid (computed, prototype 3dc31836)", () => {
  let browser: Browser;
  const css = loadObserverModuleCss();

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.WALLET_QA_CHROME ||
        process.env.CHROME_BIN ||
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        undefined,
    });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  for (const theme of THEMES) {
    for (const innerWidth of STATS_GRID_MEASURE_WIDTHS) {
      it(`${theme} @ ${innerWidth}px → ${expectedStatsGridColumnCount(innerWidth)} columns`, async () => {
        const context = await browser.newContext({
          viewport: { width: innerWidth, height: 720 },
        });
        const page = await context.newPage();
        await page.setContent(buildObserverStatsGridHarnessHtml(css, theme), { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => {
          const link = document.querySelector('link[href*="Manrope"]');
          return link && (document as Document & { fonts?: FontFaceSet }).fonts?.status === "loaded";
        }).catch(() => undefined);

        const measuredWidth = await page.evaluate(() => window.innerWidth);
        expect(measuredWidth).toBe(innerWidth);

        const gridTemplateColumns = await page.locator('[data-testid="harness-stats"]').evaluate((el) => {
          return getComputedStyle(el).gridTemplateColumns;
        });

        const columnCount = parseComputedGridColumnCount(gridTemplateColumns);
        const expected = expectedStatsGridColumnCount(innerWidth);
        expect(columnCount).toBe(expected);
        await context.close();
      }, 30_000);
    }
  }

  it("does not declare a 768px breakpoint that forces 2 KPI columns", () => {
    const block768 = css.match(/@media\s*\(\s*max-width:\s*768px\s*\)\s*\{[\s\S]*?\}/g);
    if (!block768) {
      return;
    }
    for (const block of block768) {
      expect(block).not.toMatch(/\.partnerCard\s+\.stats[\s\S]*repeat\s*\(\s*2/);
      expect(block).not.toMatch(/(?<!\.)\.stats\s*\{[\s\S]*repeat\s*\(\s*2/);
    }
  });
});
