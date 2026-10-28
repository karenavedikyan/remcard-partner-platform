#!/usr/bin/env node
/**
 * Partners dense mobile capture — isolated harness only (127.0.0.1:5199).
 * Browser: Playwright bundled Chromium (playwright package).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "artifacts/admin-partners-mobile-dense/screenshots");
const metricsPath = path.join(repoRoot, "artifacts/admin-partners-mobile-dense/metrics.json");
const baseUrl = "http://127.0.0.1:5199";

const VIEWPORTS = [
  { w: 375, h: 812, tag: "375" },
  { w: 430, h: 932, tag: "430" },
  { w: 320, h: 568, tag: "320" },
  { w: 1440, h: 900, tag: "1440" },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await createServer({
    configFile: path.join(repoRoot, "scripts/admin-mobile-visual-harness/vite.config.ts"),
  });
  await server.listen(5199, "127.0.0.1");
  const browser = await chromium.launch();
  const metrics = { capturedAt: new Date().toISOString(), browser: "playwright-chromium", scenes: [] };

  try {
    for (const theme of ["light", "dark"]) {
      for (const vp of VIEWPORTS) {
        if (vp.tag === "1440" && theme === "dark") continue;
        const page = await browser.newPage();
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await page.addInitScript(
          (t, useCards) => {
            localStorage.setItem("remcard-theme", t);
            localStorage.setItem("prof-admin-partners-registry-view", useCards ? "cards" : "table");
          },
          theme,
          vp.w <= 720,
        );
        const hash =
          vp.w <= 720
            ? "#/partners?registration=active"
            : "#/partners";
        await page.goto(`${baseUrl}${hash}`, { waitUntil: "domcontentloaded" });
        const list = page.getByRole("list", { name: "Реестр партнёров" });
        const table = page.getByRole("table", { name: "Реестр партнёров" });
        if (vp.w <= 720) {
          await list.waitFor({ state: "visible", timeout: 30000 });
        } else {
          await page.getByRole("heading", { name: /Партнёры \(реестр\)/ }).waitFor({ timeout: 30000 });
          await page.getByText("Синтетический партнёр", { exact: false }).first().waitFor({ timeout: 30000 });
        }
        await page.waitForTimeout(400);

        const rowMetrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const list = document.querySelector('ul[aria-label="Реестр партнёров"]');
          const rowEls = list
            ? [...list.querySelectorAll(":scope > li")]
            : [...document.querySelectorAll('table[aria-label="Реестр партнёров"] tbody tr')].filter((tr) =>
                tr.querySelector('input[type="checkbox"]'),
              );
          const vh = window.innerHeight;
          const visibleRows = rowEls.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.top >= 0 && r.bottom <= vh && r.height > 0;
          });
          const first = rowEls[0]?.getBoundingClientRect();
          return {
            pageOverflow: doc.scrollWidth > doc.clientWidth + 1,
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            denseList: list?.tagName === "UL",
            rowCount: rowEls.length,
            fullyVisibleRows: visibleRows.length,
            firstRowTop: first ? Math.round(first.top * 10) / 10 : null,
            firstRowHeight: first ? Math.round(first.height * 10) / 10 : null,
            statusSample: rowEls[0]?.querySelector("[aria-label^=\"Каталог:\"]")?.getAttribute("aria-label") ?? null,
          };
        });

        const file = `partners-${vp.tag}-${theme}-viewport.png`;
        await page.screenshot({ path: path.join(outDir, file) });
        metrics.scenes.push({ file, theme, viewport: vp.tag, ...rowMetrics });
        await page.close();
      }
    }

    const interactPage = await browser.newPage();
    const checks = [];
    try {
      await interactPage.setViewportSize({ width: 375, height: 812 });
      await interactPage.addInitScript(() => {
        localStorage.setItem("remcard-theme", "light");
        localStorage.setItem("prof-admin-partners-registry-view", "cards");
      });
      await interactPage.goto(`${baseUrl}#/partners`, { waitUntil: "domcontentloaded" });
      await interactPage.getByRole("list", { name: "Реестр партнёров" }).waitFor();
      await interactPage.locator('ul[aria-label="Реестр партнёров"] input[type="checkbox"]').nth(1).click();
      checks.push({
        step: "checkbox-no-expand",
        expanded: await interactPage.locator('ul[aria-label="Реестр партнёров"] li[data-expanded="true"]').count(),
      });
      await interactPage.getByRole("button", { name: /Строительно-монтажное/i }).click();
      checks.push({
        step: "expand-long-name",
        details: await interactPage.locator('ul[aria-label="Реестр партнёров"] li[data-expanded="true"]').count(),
      });
      await interactPage.locator('ul[aria-label="Реестр партнёров"] > li').nth(2).getByRole("button").click();
      checks.push({ step: "switch-expand", openRegions: await interactPage.getByRole("region").count() });
      const page1Rows = await interactPage.locator('ul[aria-label="Реестр партнёров"] > li').count();
      const page1First = await interactPage
        .locator('ul[aria-label="Реестр партнёров"] > li')
        .first()
        .innerText();
      const nextPage = interactPage.getByRole("button", { name: "Следующая страница" });
      const nextEnabled = await nextPage.isEnabled();
      if (nextEnabled) {
        await nextPage.click();
        await interactPage.waitForTimeout(600);
      }
      const page2Rows = await interactPage.locator('ul[aria-label="Реестр партнёров"] > li').count();
      const page2First = nextEnabled
        ? await interactPage.locator('ul[aria-label="Реестр партнёров"] > li').first().innerText()
        : null;
      checks.push({
        step: "pagination-page2",
        page1Rows,
        page2Rows,
        nextEnabled,
        firstRowChanged: nextEnabled ? page1First !== page2First : null,
        harnessNote: "Harness-only: fetchPartnerRegistry cursor off:N; production API not exercised",
      });
      await interactPage.getByRole("button", { name: "Фильтры" }).click();
      await interactPage.getByLabel("Регистрация").selectOption("demo");
      checks.push({ step: "filters", ok: true });
      await interactPage.screenshot({
        path: path.join(outDir, "partners-375-interactions-viewport.png"),
      });
    } catch (e) {
      checks.push({ step: "interact-error", message: String(e) });
    }
    metrics.interactions = checks;
    await interactPage.close();

    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    console.log(JSON.stringify(metrics, null, 2));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
