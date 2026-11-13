#!/usr/bin/env node
/**
 * REMCLIENTS-V6 — real Playwright clicks + geometry for personal client rows.
 * Fails if open-button width is 0 or click cannot reach client page (jsdom fireEvent is not enough).
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BUNDLE_DIR = "/tmp/clients-parity-v6-mobile-click";
const OUT = path.join(ROOT, "artifacts/clients-parity-v6-mobile-click");

const VIEWPORTS = [
  { name: "1440x1000", width: 1440, height: 1000 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "375x812", width: 375, height: 812 },
  { name: "360x800", width: 360, height: 800 },
  { name: "320x740", width: 320, height: 740 },
];

function cssModulesPlugin() {
  return {
    name: "css-modules-as-self",
    setup(build) {
      build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
        const css = readFileSync(args.path, "utf8");
        const classes = new Set();
        for (const m of css.matchAll(/\.([A-Za-z_][\w-]*)/g)) classes.add(m[1]);
        const exports = [...classes]
          .map((c) => `  ${JSON.stringify(c)}: ${JSON.stringify(c)},`)
          .join("\n");
        return {
          contents: `
const css = ${JSON.stringify(css)};
if (typeof document !== "undefined") {
  const id = ${JSON.stringify("cm-" + path.basename(args.path))};
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id; s.textContent = css; document.head.appendChild(s);
  }
}
export default {${exports}};
`,
          loader: "js",
        };
      });
    },
  };
}

async function bundle() {
  mkdirSync(BUNDLE_DIR, { recursive: true });
  const entry = path.join(ROOT, ".v6-mobile-click-entry.tsx");
  writeFileSync(
    entry,
    `
import React from "react";
import { createRoot } from "react-dom/client";
import { ObserverPartnersListView } from "./src/components/clients/observer/ObserverPartnersListView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "./src/lib/clients-parity/fixtures/observer-demo-fixtures";

createRoot(document.getElementById("root")).render(
  React.createElement(ObserverPartnersListView, {
    appeals: OBSERVER_FIXTURE_APPEALS,
    partners: OBSERVER_FIXTURE_PARTNERS,
    dataContract: { status: "ready" },
    initialLayout: "partners",
    showHeading: true,
  }),
);
`,
  );
  try {
    await esbuild.build({
      absWorkingDir: ROOT,
      entryPoints: [entry],
      bundle: true,
      outfile: path.join(BUNDLE_DIR, "bundle.js"),
      format: "iife",
      platform: "browser",
      target: ["es2020"],
      jsx: "automatic",
      loader: { ".tsx": "tsx", ".ts": "ts" },
      plugins: [cssModulesPlugin()],
      alias: { "@": path.join(ROOT, "src") },
      nodePaths: [
        path.join(ROOT, "node_modules"),
        "/agent/repos/remcard-partner-platform/node_modules",
      ],
      define: { "process.env.NODE_ENV": '"development"' },
      logLevel: "warning",
    });
  } finally {
    try {
      rmSync(entry);
    } catch {
      /* */
    }
  }
  writeFileSync(
    path.join(BUNDLE_DIR, "index.html"),
    `<!DOCTYPE html><html lang="ru" data-theme="dark"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
:root{--ink:#f3f4f6;--muted:#b8c0ca;--line:#3a3f46;--surface:#1c1f24;--offset:#15181c;--accent:#b52a2e;--brand:#c12b2f;font-family:Manrope,system-ui,sans-serif;color-scheme:dark}
html,body{margin:0;background:var(--offset);color:var(--ink)}
#wrap{max-width:1120px;margin:0 auto;padding:12px;box-sizing:border-box}
</style></head><body><div id="wrap"><div id="root"></div></div>
<script src="./bundle.js"></script></body></html>`,
  );
}

async function backToPartnersList(page) {
  for (let i = 0; i < 4; i++) {
    if ((await page.locator('[data-testid="ca-observer-partners-list"]').count()) > 0) {
      return true;
    }
    const back = page.locator('[data-ca-action="observer:back"]');
    if ((await back.count()) === 0) break;
    await back.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(50);
  }
  return (await page.locator('[data-testid="ca-observer-partners-list"]').count()) > 0;
}

async function measureOpenGeometry(page) {
  return page.evaluate(() => {
    const partnerPage = document.querySelector('[data-testid="ca-observer-partner-page"]');
    const row = partnerPage?.querySelector('[data-testid="ca-observer-client-row"]');
    const openBtn = row?.querySelector('[data-ca-action^="observer:client:"]');
    const rowCs = row ? getComputedStyle(row) : null;
    const openRect = openBtn?.getBoundingClientRect();
    return {
      partnerPageWidth: partnerPage?.getBoundingClientRect().width ?? null,
      rowWidth: row?.getBoundingClientRect().width ?? null,
      rowGrid: rowCs?.gridTemplateColumns ?? null,
      openWidth: openRect?.width ?? 0,
      openHeight: openRect?.height ?? 0,
      openX: openRect?.x ?? null,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await bundle();
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.WALLET_QA_CHROME || process.env.CHROME_BIN || "/usr/bin/google-chrome-stable",
  });
  const results = [];
  const failures = [];

  try {
    for (const theme of ["dark", "light"]) {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          hasTouch: vp.width <= 768,
        });
        const page = await context.newPage();
        const client = await context.newCDPSession(page);
        await client.send("Emulation.setDeviceMetricsOverride", {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.width <= 768,
        });
        await page.goto(`file://${path.join(BUNDLE_DIR, "index.html")}`, {
          waitUntil: "networkidle",
        });
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        });

        // KPI cols on list (V5 cascade still required)
        const card = page.locator('[data-testid="ca-observer-partner-card"]').first();
        await card.waitFor({ state: "visible" });
        const kpiCols = await card.locator(".stats").evaluate((el) => {
          const g = getComputedStyle(el).gridTemplateColumns;
          return g.trim().split(/\s+/).filter(Boolean).length;
        });
        const expectedKpi = vp.width <= 360 ? 2 : 4;

        // Partner open — prefer «Салон Бета» if present
        const beta = page.getByRole("button", { name: /Открыть партнёра:.*Бета/i });
        if ((await beta.count()) > 0) await beta.click();
        else await page.locator('button[aria-label^="Открыть партнёра"]').first().click();
        await page.locator('[data-testid="ca-observer-partner-page"]').waitFor({ state: "visible" });

        const geom = await measureOpenGeometry(page);
        const openVisible = geom.openWidth >= 8 && geom.openHeight >= 8;
        const shotPartner = `v6-${theme}-${vp.name}-partner-row.png`;
        await page.screenshot({ path: path.join(OUT, shotPartner), fullPage: false });

        let clientNavOk = false;
        let backOk = false;
        let clickError = null;
        if (openVisible) {
          try {
            await page
              .locator('[data-testid="ca-observer-partner-page"] [data-ca-action^="observer:client:"]')
              .first()
              .click({ timeout: 5000 });
            await page.locator('[data-testid="ca-observer-client-page"]').waitFor({
              state: "visible",
              timeout: 5000,
            });
            clientNavOk = true;
            await page.locator('[data-ca-action="observer:back"]').click();
            await page.locator('[data-testid="ca-observer-partner-page"]').waitFor({
              state: "visible",
              timeout: 5000,
            });
            backOk = true;
          } catch (e) {
            clickError = String(e);
          }
        } else {
          clickError = `open button geometry too small: ${geom.openWidth}x${geom.openHeight}; grid=${geom.rowGrid}`;
        }

        // Expanded group (disclosure) on list — return to partners list first
        if (!(await backToPartnersList(page))) {
          throw new Error(`cannot return to partners list after partner-page flow @ ${vp.name}`);
        }
        await page.locator("details summary").first().click();
        await page.waitForTimeout(40);
        const expandedOpen = page
          .locator('[data-testid="ca-observer-partner-card"][open] [data-ca-action^="observer:client:"], details[open] [data-ca-action^="observer:client:"]')
          .first();
        let expandedGeom = null;
        let expandedClickOk = false;
        if ((await page.locator("details[open] [data-testid='ca-observer-client-row']").count()) > 0) {
          expandedGeom = await page.locator("details[open] [data-ca-action^='observer:client:']").first().evaluate((el) => {
            const r = el.getBoundingClientRect();
            const row = el.closest('[data-testid="ca-observer-client-row"]');
            return {
              openWidth: r.width,
              openHeight: r.height,
              rowGrid: row ? getComputedStyle(row).gridTemplateColumns : null,
            };
          });
          if (expandedGeom.openWidth >= 8) {
            try {
              await page.locator("details[open] [data-ca-action^='observer:client:']").first().click({
                timeout: 5000,
              });
              await page.locator('[data-testid="ca-observer-client-page"]').waitFor({
                state: "visible",
                timeout: 5000,
              });
              expandedClickOk = await backToPartnersList(page);
            } catch {
              expandedClickOk = false;
            }
          }
        }

        // Flat list layout
        if (!(await backToPartnersList(page))) {
          throw new Error(`cannot return to partners list before flat layout @ ${vp.name}`);
        }
        const listLayoutBtn = page.locator('[data-observer-action="layout:list"]');
        await listLayoutBtn.scrollIntoViewIfNeeded();
        await listLayoutBtn.click({ timeout: 5000 });
        await page.waitForTimeout(40);
        const flatOpen = page.locator('[data-testid="ca-observer-client-row"] [data-ca-action^="observer:client:"]').first();
        const flatGeom = await flatOpen.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const row = el.closest('[data-testid="ca-observer-client-row"]');
          return {
            openWidth: r.width,
            openHeight: r.height,
            rowGrid: row ? getComputedStyle(row).gridTemplateColumns : null,
          };
        });
        let flatClickOk = false;
        if (flatGeom.openWidth >= 8) {
          try {
            await flatOpen.click({ timeout: 5000 });
            await page.locator('[data-testid="ca-observer-client-page"]').waitFor({
              state: "visible",
              timeout: 5000,
            });
            flatClickOk = await backToPartnersList(page);
          } catch {
            flatClickOk = false;
          }
        }

        // Desktop-only edit/cancel/save on 1440
        let editCancelOk = null;
        let saveDisabled = null;
        if (vp.width >= 1440 && theme === "dark") {
          await backToPartnersList(page);
          await page.locator('[data-observer-action="layout:list"]').click().catch(() => {});
          await page.getByRole("button", { name: "Изменить" }).first().click();
          const form = page.locator("[data-observer-personal-edit]");
          await form.waitFor({ state: "visible" });
          saveDisabled = await form.locator('[data-observer-action="save"]').isDisabled();
          await form.locator('input[name="alias"]').fill("V6-DRAFT");
          await form.locator('[data-observer-action="cancel"]').click();
          editCancelOk = (await form.count()) === 0;
        }

        const row = {
          theme,
          viewport: vp.name,
          kpiCols,
          expectedKpi,
          kpiOk: kpiCols === expectedKpi,
          partnerPage: {
            geom,
            openVisible,
            clientNavOk,
            backOk,
            clickError,
            screenshot: shotPartner,
          },
          expandedGroup: { geom: expandedGeom, clickOk: expandedClickOk },
          flatList: { geom: flatGeom, clickOk: flatClickOk },
          editCancelOk,
          saveDisabled,
        };
        const ok =
          row.kpiOk &&
          openVisible &&
          clientNavOk &&
          backOk &&
          (expandedGeom ? expandedGeom.openWidth >= 8 && expandedClickOk : true) &&
          flatGeom.openWidth >= 8 &&
          flatClickOk &&
          (editCancelOk === null || (editCancelOk && saveDisabled));
        row.ok = ok;
        results.push(row);
        if (!ok) failures.push(row);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const report = {
    task: "REMCLIENTS-V6-REAL-MOBILE-BLOCKER",
    prototypeSha: "3dc31836cd18d9209c20097f18b906dd276f7af6",
    method: "Playwright real click + getBoundingClientRect/getComputedStyle (not fireEvent)",
    note: "document.scrollWidth alone is not a pass; open button must have nonzero geometry",
    results,
    failures: failures.length,
    pass: failures.length === 0,
  };
  writeFileSync(path.join(OUT, "v6-mobile-click-report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        pass: report.pass,
        failures: failures.length,
        sample: results
          .filter((r) => r.theme === "dark" && ["375x812", "320x740", "1440x1000"].includes(r.viewport))
          .map((r) => ({
            vp: r.viewport,
            openW: r.partnerPage.geom.openWidth,
            grid: r.partnerPage.geom.rowGrid,
            clientNav: r.partnerPage.clientNavOk,
            kpi: r.kpiCols,
            ok: r.ok,
            err: r.partnerPage.clickError,
          })),
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
