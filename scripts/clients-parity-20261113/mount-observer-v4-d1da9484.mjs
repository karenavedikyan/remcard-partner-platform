#!/usr/bin/env node
/**
 * V4 isolated mount for impl 4c2e4cdf — fresh artifacts only.
 * Records innerWidth/clientWidth AND PNG pixel dimensions per viewport.
 * Does not reuse ffd4aa61 screenshots.
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CAND = process.env.IMPL_CANDIDATE_SHA || "d1da948491293c1a8ba77d4854191347708b4379";
const WORKTREE = process.env.CAND_WORKTREE || "/tmp/clients-cand-d1da9484";
const OUT = path.join(ROOT, "audit/clients-parity-20261113/v4-isolated-mount-d1da9484");
const BUNDLE_DIR = "/tmp/clients-parity-v4-mount";
const PROTO = "3dc31836cd18d9209c20097f18b906dd276f7af6";

const VIEWPORTS = [
  { name: "1440x1000", width: 1440, height: 1000 },
  { name: "1024x900", width: 1024, height: 900 },
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
  const entry = path.join(WORKTREE, ".v4-isolated-entry.tsx");
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

window.__mountObserver = (opts) => {
  const el = document.getElementById("root");
  const root = createRoot(el);
  root.render(
    React.createElement(ObserverPartnersListView, {
      appeals: OBSERVER_FIXTURE_APPEALS,
      partners: OBSERVER_FIXTURE_PARTNERS,
      dataContract: { status: "ready" },
      initialLayout: opts?.layout ?? "partners",
      showHeading: true,
    }),
  );
};
window.__mountObserver();
`,
  );
  try {
    await esbuild.build({
      absWorkingDir: WORKTREE,
      entryPoints: [entry],
      bundle: true,
      outfile: path.join(BUNDLE_DIR, "bundle.js"),
      format: "iife",
      platform: "browser",
      target: ["es2020"],
      jsx: "automatic",
      loader: { ".tsx": "tsx", ".ts": "ts" },
      plugins: [cssModulesPlugin()],
      alias: { "@": path.join(WORKTREE, "src") },
      nodePaths: [path.join(ROOT, "node_modules")],
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
    `<!DOCTYPE html><html lang="ru" data-theme="light"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
:root{--ink:#1d1d1f;--muted:#5a6068;--line:#d7d2cc;--surface:#fff;--offset:#f6f5f3;--accent:#b52a2e;--bg:#f8fafc;font-family:Manrope,system-ui,sans-serif}
[data-theme=dark]{--ink:#f3f4f6;--muted:#b8c0ca;--line:#3a3f46;--surface:#1c1f24;--offset:#15181c;--bg:#12151a;color-scheme:dark}
html,body{margin:0;background:var(--offset);color:var(--ink)}
#wrap{max-width:1120px;margin:0 auto;padding:20px;box-sizing:border-box}
</style></head><body><div id="wrap"><div id="root"></div></div>
<script src="./bundle.js"></script></body></html>`,
  );
}

function pngSize(file) {
  const buf = readFileSync(file);
  // PNG IHDR: bytes 16-23 big-endian width/height after 8-byte signature + 8-byte chunk header
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`not a PNG: ${file}`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function parseCols(grid) {
  return grid ? grid.trim().split(/\s+/).filter(Boolean).length : 0;
}

async function main() {
  if (!existsSync(path.join(WORKTREE, "src/components/clients/observer/ObserverPartnersListView.tsx"))) {
    throw new Error(`worktree missing at ${WORKTREE}`);
  }
  mkdirSync(OUT, { recursive: true });
  await bundle();

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.WALLET_QA_CHROME || process.env.CHROME_BIN || undefined,
  });

  const rows = [];
  const interactions = [];
  const errors = [];
  const dimensionFailures = [];

  try {
    for (const theme of ["light", "dark"]) {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          hasTouch: vp.width <= 768,
        });
        const page = await context.newPage();
        await page.goto(`file://${path.join(BUNDLE_DIR, "index.html")}`, {
          waitUntil: "networkidle",
        });
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        });

        // Force exact metrics via CDP (Playwright viewport can still drift with scrollbars)
        const client = await context.newCDPSession(page);
        await client.send("Emulation.setDeviceMetricsOverride", {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.width <= 768,
        });
        await page.waitForTimeout(50);

        const dims = await page.evaluate(() => ({
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
          devicePixelRatio: window.devicePixelRatio,
          fontFamily: getComputedStyle(document.body).fontFamily,
        }));

        const card = page.locator('[data-testid="ca-observer-partner-card"]').first();
        await card.waitFor({ state: "visible", timeout: 10000 });
        const computed = await card.evaluate((el) => {
          const cs = getComputedStyle(el);
          const stats = el.querySelector(".stats");
          const strong = el.querySelector(".partnerCardHead strong");
          const scs = strong ? getComputedStyle(strong) : null;
          const statsCs = stats ? getComputedStyle(stats) : null;
          return {
            cardHeight: cs.height,
            cardPadding: cs.padding,
            borderRadius: cs.borderRadius,
            titleFontSize: scs?.fontSize ?? null,
            titleFontWeight: scs?.fontWeight ?? null,
            titleFontFamily: scs?.fontFamily ?? null,
            statsGrid: statsCs?.gridTemplateColumns ?? null,
            kpiFontSize: stats
              ? getComputedStyle(stats.querySelector("dd")).fontSize
              : null,
          };
        });
        computed.statsColCount = parseCols(computed.statsGrid);

        const shotName = `v4-${theme}-${vp.name}-default.png`;
        const shotPath = path.join(OUT, shotName);
        // viewport screenshot (not fullPage) so PNG matches viewport width/height intent
        await page.screenshot({ path: shotPath, fullPage: false });
        const png = pngSize(shotPath);

        const widthOk = dims.innerWidth === vp.width && png.width === vp.width;
        const heightOk = dims.innerHeight === vp.height && png.height === vp.height;
        if (!widthOk || !heightOk) {
          dimensionFailures.push({
            theme,
            viewport: vp.name,
            expected: { w: vp.width, h: vp.height },
            inner: { w: dims.innerWidth, h: dims.innerHeight },
            client: { w: dims.clientWidth, h: dims.clientHeight },
            png,
          });
        }

        rows.push({
          theme,
          viewport: vp,
          dims,
          png,
          dimensionMatch: widthOk && heightOk,
          computed,
          screenshot: shotName,
          prototypeSha: PROTO,
        });

        // partner open → detail (exposes motionStat bug)
        await page.locator('button[aria-label^="Открыть партнёра"]').first().click();
        await page.waitForTimeout(80);
        const partnerPage = page.locator('[data-testid="ca-observer-partner-page"]');
        const onPartner = (await partnerPage.count()) > 0;
        const motionStatNodes = await page.locator("motionstat, motionStat").count();
        const dtCount = await partnerPage.locator("dt").count();
        const ddCount = await partnerPage.locator("dd").count();
        const detailShot = `v4-${theme}-${vp.name}-partner-detail.png`;
        await page.screenshot({ path: path.join(OUT, detailShot), fullPage: false });
        interactions.push({
          theme,
          viewport: vp.name,
          action: "partner-open",
          onPartnerPage: onPartner,
          motionStatIntrinsicCount: motionStatNodes,
          dtCount,
          ddCount,
          labelsRendered: dtCount > 0,
          screenshot: detailShot,
        });

        // back
        await page.locator('[data-ca-action="observer:back"]').click();
        await page.waitForTimeout(50);
        const backOk = (await page.locator('[data-testid="ca-observer-partner-card"]').count()) > 0;

        // edit form cancel + disabled save
        await page.locator("details summary").first().click();
        await page.waitForTimeout(40);
        const editBtn = page.getByRole("button", { name: /Изменить для себя/ }).first();
        if (await editBtn.count()) {
          await editBtn.click();
          await page.waitForTimeout(40);
          const form = page.locator("[data-observer-personal-edit]");
          const save = form.locator('[data-observer-action="save"]');
          const cancel = form.locator('[data-observer-action="cancel"]');
          const saveDisabled = await save.isDisabled();
          await form.locator('input[name="alias"]').fill("QA-ALIAS");
          await cancel.click();
          await page.waitForTimeout(40);
          const formGone = (await form.count()) === 0;
          const editShot = `v4-${theme}-${vp.name}-edit-cancel.png`;
          await page.screenshot({ path: path.join(OUT, editShot), fullPage: false });
          interactions.push({
            theme,
            viewport: vp.name,
            action: "edit-cancel",
            saveDisabled,
            formGoneAfterCancel: formGone,
            fakeSavePossible: !saveDisabled,
            screenshot: editShot,
            backOk,
          });
        }

        await context.close();
      }
    }
  } catch (e) {
    errors.push(String(e));
  } finally {
    await browser.close();
  }

  // Source static facts for this SHA
  const detailSrc = readFileSync(
    path.join(WORKTREE, "src/components/clients/observer/ObserverPartnerDetailView.tsx"),
    "utf8",
  );
  const workspaceSrc = readFileSync(
    path.join(WORKTREE, "src/components/clients/ClientsListWorkspace.tsx"),
    "utf8",
  );

  const report = {
    task: "REMCLIENTS-V4-QA-COMPUTER",
    implCandidateSha: CAND,
    prototypeSha: PROTO,
    priorAuditArtifactsNotUsed: [
      "candidate-isolated-listview/",
      "candidate-mount/",
    ],
    viewportVerification: {
      method: "Playwright viewport + CDP Emulation.setDeviceMetricsOverride + viewport screenshot (fullPage:false) + PNG header parse",
      expectedViewports: VIEWPORTS,
      dimensionFailures,
      allDimensionMatch: dimensionFailures.length === 0,
    },
    sourceFindings: {
      motionStatLowercaseJsx: /<motionStat\b/.test(detailSrc),
      motionStatComponentDefined: /function motionStat\(/.test(detailSrc),
      voidCanLinkOnboardingHistory: /void canLinkOnboardingHistory/.test(workspaceSrc),
      forwardsCanLinkToGate:
        /<OwnerClientsGate canLinkOnboardingHistory=\{canLinkOnboardingHistory\}/.test(
          workspaceSrc,
        ),
    },
    measurements: rows,
    interactions,
    errors,
    ok: errors.length === 0 && rows.length === VIEWPORTS.length * 2,
  };
  writeFileSync(path.join(OUT, "v4-mount-report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        shots: rows.length,
        dimensionFailures: dimensionFailures.length,
        allDimensionMatch: report.viewportVerification.allDimensionMatch,
        motionStatBug: report.sourceFindings.motionStatLowercaseJsx,
        voidCanLink: report.sourceFindings.voidCanLinkOnboardingHistory,
        sample: rows.slice(0, 3).map((r) => ({
          vp: r.viewport.name,
          inner: r.dims.innerWidth,
          pngW: r.png.width,
          cols: r.computed.statsColCount,
          match: r.dimensionMatch,
        })),
        errors,
      },
      null,
      2,
    ),
  );
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
