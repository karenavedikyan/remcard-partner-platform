import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const cssPath = path.resolve(__dirname, "observer.module.css");

function loadCss(): string {
  return readFileSync(cssPath, "utf8");
}

function buildGroupedRowHarness(css: string, innerWidth: number, theme: "light" | "dark"): string {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin: 0; font-family: Manrope, system-ui, sans-serif; width: ${innerWidth}px; }
  ${css}
</style>
</head>
<body>
  <article class="partnerCard">
    <div class="compactTop" data-testid="compact-top">
      <div class="partnerGroupHead"></div>
      <dl class="stats"></dl>
    </div>
    <div class="clientColumns"></div>
    <div class="personalRow personalRowGrouped" data-testid="grouped-row">
      <label class="personalCheck"></label>
      <button type="button" class="personalOpen"><strong>Клиент</strong></button>
      <div class="personalStatus"><span class="cellLabel">Статус</span><span class="statusPill">В работе</span></div>
      <div class="clientUpdated"><span class="cellLabel">Обновлено</span><time>01.01</time></div>
      <button type="button" class="ghostBtn">Изменить для себя</button>
    </div>
    <div id="expanded" class="expandedClients" data-testid="expanded"></div>
  </article>
</body>
</html>`;
}

describe("P7 — observer.module.css prototype 3dc31836 layout tokens", () => {
  const css = loadCss();

  it("compactTop uses 340px min stats track (prototype .ca-observer-compact-top)", () => {
    expect(css).toMatch(
      /\.compactTop\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(340px,\s*1fr\)/,
    );
  });

  it("cellLabel hidden on desktop grouped rows", () => {
    expect(css).toMatch(/\.cellLabel\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/max-width:\s*1100px[\s\S]*\.personalRowGrouped\s+\.cellLabel[\s\S]*display:\s*block/);
  });

  it("expandedClients gap/padding match prototype 16px", () => {
    expect(css).toMatch(/\.expandedClients\s*\{[\s\S]*gap:\s*16px[\s\S]*padding-top:\s*16px/);
  });

  it("grouped client rows container uses gap 0", () => {
    expect(css).toMatch(/\.personalRows\s*\{[\s\S]*gap:\s*0/);
  });

  it("preserves V7 KPI and row breakpoints (760/360/1100, no max768 areas)", () => {
    expect(css).toMatch(/max-width:\s*360px[\s\S]*\.partnerCard\s+\.stats[\s\S]*repeat\(2/);
    expect(css).not.toMatch(/max-width:\s*768px[\s\S]*\.personalRowGrouped[\s\S]*grid-template-areas/);
    expect(css).not.toMatch(/grid-area:\s*status/);
  });
});

describe("P7 — observer layout computed (Playwright)", () => {
  let browser: Browser;
  const css = loadCss();

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  const widths = [1440, 1024, 768, 375, 320] as const;
  const themes: Array<"light" | "dark"> = ["light", "dark"];

  for (const theme of themes) {
    for (const w of widths) {
      it(`${theme} @ ${w}px — cellLabel visibility matches prototype`, async () => {
        const context = await browser.newContext({ viewport: { width: w, height: 900 } });
        const page = await context.newPage();
        await page.setContent(buildGroupedRowHarness(css, w, theme), {
          waitUntil: "domcontentloaded",
        });
        const labelDisplay = await page.locator(".personalRowGrouped .cellLabel").first().evaluate((el) => {
          return getComputedStyle(el).display;
        });
        if (w > 1100) {
          expect(labelDisplay).toBe("none");
        } else {
          expect(labelDisplay).toBe("block");
        }
        await context.close();
      });
    }
  }

  it("light @ 1024px — compactTop stats column width ≥ 340px", async () => {
    const context = await browser.newContext({ viewport: { width: 1024, height: 720 } });
    const page = await context.newPage();
    await page.setContent(buildGroupedRowHarness(css, 1024, "light"), {
      waitUntil: "domcontentloaded",
    });
    const secondTrackPx = await page.getByTestId("compact-top").evaluate((el) => {
      const cols = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/);
      return parseFloat(cols[1] ?? "0");
    });
    expect(secondTrackPx).toBeGreaterThanOrEqual(340);
    await context.close();
  });

  it("light @ 1440px — expandedClients gap 16px", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 400 } });
    const page = await context.newPage();
    await page.setContent(buildGroupedRowHarness(css, 1440, "light"), {
      waitUntil: "domcontentloaded",
    });
    const gap = await page.getByTestId("expanded").evaluate((el) => getComputedStyle(el).gap);
    const padTop = await page.getByTestId("expanded").evaluate((el) => getComputedStyle(el).paddingTop);
    expect(gap).toBe("16px");
    expect(padTop).toBe("16px");
    await context.close();
  });
});
