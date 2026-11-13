#!/usr/bin/env node
/**
 * Auditor-only V6 replay at EXACT impl 78e48521.
 * Real Playwright clicks + child bounds (not document scrollWidth alone).
 * Uses candidate worktree harness; writes under audit/ only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const AUDITOR_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CAND = process.env.CAND_WORKTREE || "/tmp/clients-cand-78e48521";
const HARNESS = path.join(CAND, "scripts/clients-parity-20261113/observer-list-harness");
const OUT = path.join(AUDITOR_ROOT, "audit/clients-parity-20261113/v6-pin-78e48521");
const IMPL = "78e4852194a0b9d307ee92743ae754dd18d5a9ba";
const WIDTHS = [320, 360, 375, 768];
const THEMES = ["light", "dark"];
const MIN_W = 48;
const MIN_H = 44;

async function backToList(page) {
  for (let i = 0; i < 4; i++) {
    if ((await page.getByTestId("ca-observer-partners-list").count()) > 0) return true;
    const back = page.locator('[data-ca-action="observer:back"]');
    if ((await back.count()) === 0) break;
    await back.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(40);
  }
  return (await page.getByTestId("ca-observer-partners-list").count()) > 0;
}

async function measureOpen(page, scope) {
  const row = scope.getByTestId("ca-observer-client-row").first();
  const openBtn = row.locator('[data-ca-action^="observer:client:"]').first();
  const box = await openBtn.boundingBox();
  const grid = await row.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  return {
    grid,
    open: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
    geometryPass: Boolean(
      box && box.width >= MIN_W && box.height >= MIN_H && !/^24px\s+0px/.test(grid),
    ),
  };
}

async function kpiCols(page) {
  // Vite CSS modules hash `.stats` — find the KPI <dl> under the first partner card.
  return page.locator('[data-testid="ca-observer-partner-card"]').first().evaluate((card) => {
    const dl = card.querySelector("dl");
    if (!dl) return 0;
    return getComputedStyle(dl).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({
    configFile: path.join(HARNESS, "vite.config.ts"),
    root: HARNESS,
    server: { port: 5381, host: "127.0.0.1", strictPort: false },
  });
  await server.listen();
  const baseUrl = server.resolvedUrls?.local[0] ?? "http://127.0.0.1:5381";

  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.WALLET_QA_CHROME || process.env.CHROME_BIN || "/usr/bin/google-chrome-stable",
  });

  const samples = [];
  const failures = [];
  const resizeKpi = [];

  try {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const context = await browser.newContext({
          viewport: { width, height: 812 },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await page.goto(`${baseUrl}/?theme=${theme}`, { waitUntil: "networkidle" });
        await page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        });
        await page.getByTestId("ca-observer-partner-card").first().waitFor({ state: "visible" });

        const expectedKpi = width <= 360 ? 2 : 4;
        const listKpi = await kpiCols(page);

        // Partner page → client → back
        await page.getByLabel(/Открыть партнёра:.*Бета/).click();
        await page.getByTestId("ca-observer-partner-page").waitFor({ state: "visible" });
        const partnerScope = page.getByTestId("ca-observer-partner-page");
        const partnerGeom = await measureOpen(page, partnerScope);
        let partnerNav = false;
        let partnerBack = false;
        if (partnerGeom.geometryPass) {
          await partnerScope.locator('[data-ca-action^="observer:client:"]').first().click({
            timeout: 5000,
          });
          await page.getByTestId("ca-observer-client-page").waitFor({ state: "visible", timeout: 5000 });
          partnerNav = true;
          await page.locator('[data-ca-action="observer:back"]').click();
          await page.getByTestId("ca-observer-partner-page").waitFor({ state: "visible", timeout: 5000 });
          partnerBack = true;
        }
        const shot = `pin78-${theme}-${width}-partner.png`;
        await page.screenshot({ path: path.join(OUT, shot), fullPage: false });

        // Expanded group → client → back
        if (!(await backToList(page))) throw new Error(`back to list failed after partner @${theme}/${width}`);
        await page.locator("details summary").first().click();
        await page.waitForTimeout(50);
        const expScope = page.locator("details[open]");
        const expandedGeom = await measureOpen(page, expScope);
        let expandedNav = false;
        if (expandedGeom.geometryPass) {
          await expScope.locator('[data-ca-action^="observer:client:"]').first().click({ timeout: 5000 });
          await page.getByTestId("ca-observer-client-page").waitFor({ state: "visible", timeout: 5000 });
          expandedNav = await backToList(page);
        }

        // Flat list → client → back
        if (!(await backToList(page))) throw new Error(`back to list before flat @${theme}/${width}`);
        await page.locator('[data-observer-action="layout:list"]').click();
        await page.waitForTimeout(40);
        const flatScope = page.getByTestId("ca-observer-partners-list");
        const flatGeom = await measureOpen(page, flatScope);
        let flatNav = false;
        if (flatGeom.geometryPass) {
          await flatScope.locator('[data-ca-action^="observer:client:"]').first().click({ timeout: 5000 });
          await page.getByTestId("ca-observer-client-page").waitFor({ state: "visible", timeout: 5000 });
          flatNav = await backToList(page);
        }

        // Edit/cancel + disabled save (flat)
        if (!(await backToList(page))) throw new Error(`back before edit @${theme}/${width}`);
        await page.locator('[data-observer-action="layout:list"]').click().catch(() => {});
        await page.getByRole("button", { name: "Изменить" }).first().click();
        const form = page.locator("[data-observer-personal-edit]");
        await form.waitFor({ state: "visible" });
        const saveDisabled = await form.locator('[data-observer-action="save"]').isDisabled();
        await form.locator('input[name="alias"]').fill(`draft-${theme}-${width}`);
        await form.locator('[data-observer-action="cancel"]').click();
        const editCancelOk = (await form.count()) === 0;

        const scroll = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        const sample = {
          theme,
          width,
          listKpi,
          expectedKpi,
          kpiOk: listKpi === expectedKpi,
          partnerPage: { ...partnerGeom, nav: partnerNav, back: partnerBack, shot },
          expanded: { ...expandedGeom, nav: expandedNav },
          flat: { ...flatGeom, nav: flatNav },
          editCancelOk,
          saveDisabled,
          scroll,
          note: "scrollWidth alone is not a pass criterion",
        };
        sample.ok =
          sample.kpiOk &&
          partnerGeom.geometryPass &&
          partnerNav &&
          partnerBack &&
          expandedGeom.geometryPass &&
          expandedNav &&
          flatGeom.geometryPass &&
          flatNav &&
          editCancelOk &&
          saveDisabled === true;
        samples.push(sample);
        if (!sample.ok) failures.push(sample);
        await context.close();
      }
    }

    // LIVE resize KPI both themes
    for (const theme of THEMES) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/?theme=${theme}`, { waitUntil: "networkidle" });
      const seq = [1440, 1024, 768, 375, 360, 320, 1440];
      const cols = [];
      for (const w of seq) {
        await page.setViewportSize({ width: w, height: w === 1440 ? 1000 : 812 });
        await page.waitForTimeout(30);
        const c = await kpiCols(page);
        const exp = w <= 360 ? 2 : 4;
        cols.push({ width: w, cols: c, expected: exp, ok: c === exp });
      }
      const pass = cols.every((x) => x.ok);
      resizeKpi.push({ theme, cols, pass });
      if (!pass) failures.push({ kind: "resizeKpi", theme, cols });
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const report = {
    task: "REMCLIENTS-V6-COMPUTER-RESULTS",
    implCandidateSha: IMPL,
    productFixSha: "5063368aea4a4219df354b0fcad7a0eaf9846ac8",
    prototypeSha: "3dc31836cd18d9209c20097f18b906dd276f7af6",
    method: "Vite fixture harness + Playwright real clicks + boundingBox/getComputedStyle",
    acceptsOnly: "isolated mobile-row + KPI cascade regressions",
    samples,
    resizeKpi,
    failures: failures.length,
    pass: failures.length === 0 && samples.length === 8,
  };
  writeFileSync(path.join(OUT, "v6-78e48521-real-click-report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        pass: report.pass,
        failures: failures.length,
        samples: samples.length,
        dark375: samples.find((s) => s.theme === "dark" && s.width === 375)?.partnerPage?.open,
        resizePass: resizeKpi.every((r) => r.pass),
      },
      null,
      2,
    ),
  );
  if (!report.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
