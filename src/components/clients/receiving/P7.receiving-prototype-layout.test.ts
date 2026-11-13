import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const cssPath = path.resolve(__dirname, "receiving.module.css");
const observerCssPath = path.resolve(__dirname, "../observer/observer.module.css");

function loadReceivingCss(): string {
  return readFileSync(cssPath, "utf8");
}

/** Playwright harness: inline raw .module.css with :global() flattened (no Vite pipeline). */
function cssForHarness(moduleCss: string): string {
  return moduleCss.replace(/:global\(([^)]+)\)/g, "$1");
}

function buildDirectionHarness(moduleCss: string, theme: "light" | "dark"): string {
  const css = cssForHarness(moduleCss);
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin: 0; font-family: Manrope, system-ui, sans-serif; padding: 16px; }
  ${css}
</style>
</head>
<body>
  <div data-testid="clients-direction-workspace">
    <div class="ca-tabs wallet-direction__tabs ca-preview-directions" role="tablist" data-testid="ca-clients-directions">
      <button type="button" class="wallet-direction__tab is-active" role="tab" aria-selected="true">Клиенты у меня</button>
      <button type="button" class="wallet-direction__tab" role="tab" aria-selected="false">Мои клиенты у партнёров</button>
    </div>
    <section class="blocked" data-testid="ca-receiving-appeals-blocked">
      <h2>Клиенты у меня</h2>
      <p>BLK-RECEIVING-APPEALS</p>
    </section>
  </div>
</body>
</html>`;
}

describe("P7 — receiving.module.css prototype 3dc31836 source tokens", () => {
  const css = loadReceivingCss();
  const observerCss = readFileSync(observerCssPath, "utf8");

  it("maps --receiving-accent on blocked shell (production accent cascade)", () => {
    expect(css).toMatch(/\.blocked[\s\S]*--receiving-accent:\s*var\(--accent/);
  });

  it("direction tablist matches prototype gap/border/margin (ca-tabs.wallet-direction__tabs)", () => {
    expect(css).toMatch(
      /ca-preview-directions[\s\S]*gap:\s*24px[\s\S]*border-bottom:\s*1px solid[\s\S]*margin:\s*0 0 20px/,
    );
  });

  it("direction tabs keep 44px touch target", () => {
    expect(css).toMatch(/wallet-direction__tab[\s\S]*min-height:\s*44px/);
  });

  it("blocked panel matches observer.module.css blocked metrics", () => {
    const blockedMetrics = observerCss.match(/\.blocked\s*\{([^}]+)\}/)?.[1] ?? "";
    expect(blockedMetrics).toContain("padding: 16px 20px");
    expect(blockedMetrics).toContain("border-radius: 16px");
    expect(css).toMatch(/\.blocked\s*\{[\s\S]*padding:\s*16px 20px[\s\S]*border-radius:\s*16px/);
  });

  it("receivingNotice follows ca-personal-notice padding and radius", () => {
    expect(css).toMatch(/\.receivingNotice\s*\{[\s\S]*padding:\s*12px 16px[\s\S]*border-radius:\s*10px/);
  });

  it("kpiStrip uses 4-column desktop grid like ca-kpi-strip", () => {
    expect(css).toMatch(/\.kpiStrip\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  });
});

describe("P7 — receiving direction harness (Playwright)", () => {
  let browser: Browser;
  const css = loadReceivingCss();

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  it("tablist margin-bottom 20px when receiving CSS loaded", async () => {
    const page = await browser.newPage();
    await page.setContent(buildDirectionHarness(css, "light"));
    const tablist = page.locator('[data-testid="ca-clients-directions"]');
    const marginBottom = await tablist.evaluate((el) => getComputedStyle(el).marginBottom);
    expect(marginBottom).toBe("20px");
    await page.close();
  });

  it("active tab min-height 44px", async () => {
    const page = await browser.newPage();
    await page.setContent(buildDirectionHarness(css, "light"));
    const active = page.locator(".wallet-direction__tab.is-active");
    const minHeight = await active.evaluate((el) => getComputedStyle(el).minHeight);
    expect(minHeight).toBe("44px");
    await page.close();
  });
});
