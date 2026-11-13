import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const observerCss = readFileSync(path.resolve(__dirname, "observer.module.css"), "utf8");
const globalsCss = readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");

/**
 * Mirrors production: layout.tsx registers Manrope via --font-body; full @font-face
 * is NOT_VERIFIED here without a Next build (no .next/static media on agent VM).
 */
const fontShell = `
html { --font-body: "Manrope", system-ui, sans-serif; }
body { font-family: var(--font-body); margin: 0; }
main.content { padding: 32px; max-width: 1200px; margin: auto; background: var(--bg, #fff); }
`;

function buildDetailHarness(theme: "light" | "dark", view: "client" | "partner"): string {
  const partnerBody =
    view === "partner"
      ? `<div class="section" data-testid="ca-observer-partner-page">
<button type="button" class="backBtn" data-testid="back">← Назад к партнёрам</button>
<header class="partnerPageHead"><h2 data-testid="title">Тандур</h2>
<p class="mutedSmall">Магазин · Краснодар</p>
<dl class="statsInline" data-testid="kpi"><div><dt>Направлено</dt><dd data-testid="kpi-val">12</dd></div></dl>
</header>
<div class="personalRows"><div class="personalRow personalRowGrouped" data-testid="row"><button type="button" class="personalOpen"><strong>Клиент</strong></button></div></div>
</div>`
      : `<div class="section" data-testid="ca-observer-client-page">
<button type="button" class="backBtn" data-testid="back">← Назад</button>
<h2 data-testid="title">Анна Петрова</h2>
<dl class="detailGrid" data-testid="detail-grid"><div><dt>Партнёр</dt><dd>Тандур</dd></div></dl>
</div>`;

  return `<!DOCTYPE html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8"/>
<style>${globalsCss}${observerCss}${fontShell}</style></head><body>
<main class="content">${partnerBody}</main></body></html>`;
}

describe("P7 — observer detail views source (3dc31836)", () => {
  it("backBtn matches ca-back spacing; detail grid gap 20px; statsInline KPI cascade", () => {
    expect(observerCss).toMatch(/\.backBtn\s*\{[\s\S]*margin:\s*0 0 20px/);
    expect(observerCss).toMatch(/\.detailGrid\s*\{[\s\S]*gap:\s*20px/);
    expect(observerCss).toMatch(/\.statsInline dd\s*\{[\s\S]*font-size:\s*20px/);
    expect(observerCss).toMatch(/\.section > h2[\s\S]*font-weight:\s*800/);
  });
});

describe("P7 — observer detail computed (globals + partial shell)", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 60_000);
  afterAll(async () => browser?.close());

  const cases = [
    { w: 375, h: 568, theme: "light" as const, view: "client" as const },
    { w: 375, h: 568, theme: "dark" as const, view: "partner" as const },
    { w: 1440, h: 900, theme: "light" as const, view: "partner" as const },
    { w: 1440, h: 650, theme: "dark" as const, view: "client" as const },
  ];

  for (const { w, h, theme, view } of cases) {
    it(`${w}x${h} ${theme} ${view}: back 44px, title 18px, KPI/dd or grid`, async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      await page.setContent(buildDetailHarness(theme, view), { waitUntil: "domcontentloaded" });

      const back = await page.getByTestId("back").evaluate((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          marginBottom: cs.marginBottom,
          minHeight: cs.minHeight,
          height: r.height,
          fontFamily: cs.fontFamily,
        };
      });
      expect(parseFloat(back.minHeight)).toBeGreaterThanOrEqual(44);
      expect(back.marginBottom).toBe("20px");
      expect(back.fontFamily.toLowerCase()).toContain("manrope");

      const title = await page.getByTestId("title").evaluate((el) => getComputedStyle(el).fontSize);
      expect(title).toBe("18px");

      if (view === "partner") {
        const kpi = await page.getByTestId("kpi-val").evaluate((el) => getComputedStyle(el).fontSize);
        expect(kpi).toBe("20px");
        const row = await page.getByTestId("row").evaluate((el) => ({
          sw: el.scrollWidth,
          cw: el.clientWidth,
        }));
        expect(row.sw).toBeLessThanOrEqual(row.cw + 1);
      } else {
        const gridGap = await page.getByTestId("detail-grid").evaluate((el) => getComputedStyle(el).gap);
        expect(gridGap).toBe("20px");
      }

      await ctx.close();
    });
  }
});
