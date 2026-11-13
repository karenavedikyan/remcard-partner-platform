#!/usr/bin/env node
/**
 * Isolated React mount of ObserverPartnersListView from impl candidate.
 * Uses test fixtures only (never production wiring). No product edits.
 * Bundles via esbuild into /tmp harness; screenshots + computed styles.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CAND =
  process.env.IMPL_CANDIDATE_SHA || "ffd4aa6130e92af5d95da21cfe5519133228a962";
const WORKTREE =
  process.env.CAND_WORKTREE || "/tmp/clients-cand-ffd4aa61";
const OUT = path.join(
  ROOT,
  "audit/clients-parity-20261113/candidate-isolated-listview",
);
const BUNDLE_DIR = "/tmp/clients-parity-isolated-mount";

const VIEWPORTS = [
  { name: "1440x1000", width: 1440, height: 1000 },
  { name: "1024x900", width: 1024, height: 900 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "375x812", width: 375, height: 812 },
  { name: "360x800", width: 360, height: 800 },
  { name: "320x740", width: 320, height: 740 },
];

const STATES = ["default", "expanded", "list-layout", "edit-notice"];

function ensureWorktree() {
  if (!existsSync(path.join(WORKTREE, "src/components/clients/observer/ObserverPartnersListView.tsx"))) {
    execFileSync(
      "git",
      ["worktree", "add", "--detach", WORKTREE, CAND],
      { cwd: ROOT, stdio: "inherit" },
    );
  }
  if (!existsSync(path.join(WORKTREE, "node_modules"))) {
    execFileSync("ln", ["-s", path.join(ROOT, "node_modules"), "node_modules"], {
      cwd: WORKTREE,
    });
  }
}

/** CSS modules plugin: export local class names as themselves. */
function cssModulesPlugin() {
  return {
    name: "css-modules-as-self",
    setup(build) {
      build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
        const css = readFileSync(args.path, "utf8");
        const classes = new Set();
        for (const m of css.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
          classes.add(m[1]);
        }
        const exports = [...classes]
          .map((c) => `  ${JSON.stringify(c)}: ${JSON.stringify(c)},`)
          .join("\n");
        const js = `
const css = ${JSON.stringify(css)};
if (typeof document !== "undefined") {
  const id = ${JSON.stringify("cm-" + path.basename(args.path))};
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }
}
export default {
${exports}
};
`;
        return { contents: js, loader: "js" };
      });
    },
  };
}

async function bundle() {
  mkdirSync(BUNDLE_DIR, { recursive: true });
  // Entry must live under worktree so node_modules resolution finds react.
  const entry = path.join(WORKTREE, ".clients-parity-isolated-entry.tsx");
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

declare global {
  interface Window {
    __mountObserver?: (opts?: { layout?: "partners" | "list" }) => void;
  }
}

window.__mountObserver = (opts) => {
  const el = document.getElementById("root");
  if (!el) throw new Error("missing #root");
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
      alias: {
        "@": path.join(WORKTREE, "src"),
      },
      nodePaths: [path.join(ROOT, "node_modules")],
      define: {
        "process.env.NODE_ENV": '"development"',
      },
      logLevel: "warning",
    });
  } finally {
    try {
      rmSync(entry);
    } catch {
      /* ignore */
    }
  }
}

function html() {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="light">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
:root {
  --ink:#1d1d1f; --muted:#5a6068; --line:#d7d2cc; --surface:#fff; --offset:#f6f5f3;
  --soft:#fbfaf8; --brand:#b52a2e; --accent:#b52a2e; --bg:#f8fafc;
  font-family: Manrope, system-ui, sans-serif;
}
[data-theme=dark] {
  --ink:#f3f4f6; --muted:#b8c0ca; --line:#3a3f46; --surface:#1c1f24; --offset:#15181c;
  --soft:#12151a; --bg:#12151a; color-scheme: dark;
}
body { margin:0; background:var(--offset); color:var(--ink); }
#wrap { max-width:1120px; margin:0 auto; padding:20px; }
</style>
</head>
<body>
<div id="wrap"><div id="root"></div></div>
<script src="./bundle.js"></script>
</body>
</html>`;
}

function parseGridCols(value) {
  if (!value) return 0;
  return value.trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  ensureWorktree();
  const errors = [];
  try {
    await bundle();
  } catch (e) {
    const msg = String(e);
    writeFileSync(
      path.join(OUT, "environment-blocker.json"),
      JSON.stringify(
        {
          ok: false,
          blocker: "ESBUILD_BUNDLE_FAILED",
          error: msg,
          command:
            "IMPL_CANDIDATE_SHA=ffd4aa61 CAND_WORKTREE=/tmp/clients-cand-ffd4aa61 node scripts/clients-parity-20261113/mount-observer-listview-isolated.mjs",
        },
        null,
        2,
      ),
    );
    console.error(msg);
    process.exit(1);
  }

  writeFileSync(path.join(BUNDLE_DIR, "index.html"), html());
  writeFileSync(path.join(OUT, "index.html"), html());
  // copy bundle next to out html for archival reference
  writeFileSync(
    path.join(OUT, "bundle.js"),
    readFileSync(path.join(BUNDLE_DIR, "bundle.js")),
  );

  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.WALLET_QA_CHROME || process.env.CHROME_BIN || undefined,
  });

  const measurements = [];
  const interactions = [];

  try {
    for (const theme of ["light", "dark"]) {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
        });
        await page.goto(`file://${path.join(BUNDLE_DIR, "index.html")}`, {
          waitUntil: "networkidle",
        });
        await page.evaluate((t) => {
          document.documentElement.setAttribute("data-theme", t);
        }, theme);
        await page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        });

        const card = page.locator('[data-testid="ca-observer-partner-card"]').first();
        await card.waitFor({ state: "visible", timeout: 10000 });
        const box = await card.boundingBox();
        const styles = await card.evaluate((el) => {
          const cs = getComputedStyle(el);
          const stats = el.querySelector(".stats");
          const statsCs = stats ? getComputedStyle(stats) : null;
          const strong = el.querySelector(".partnerCardHead strong");
          const scs = strong ? getComputedStyle(strong) : null;
          return {
            card: {
              width: cs.width,
              height: cs.height,
              padding: cs.padding,
              borderRadius: cs.borderRadius,
            },
            title: scs
              ? { fontSize: scs.fontSize, fontWeight: scs.fontWeight, lineHeight: scs.lineHeight }
              : null,
            statsGrid: statsCs?.gridTemplateColumns ?? null,
          };
        });

        const shot = `listview-${theme}-${vp.name}-default.png`;
        await page.screenshot({ path: path.join(OUT, shot), fullPage: true });
        measurements.push({
          theme,
          viewport: vp,
          state: "default",
          screenshot: shot,
          cardBoundingBox: box,
          computed: {
            ...styles,
            statsColCount: parseGridCols(styles.statsGrid),
          },
        });

        // expanded
        const details = card.locator("details").first();
        await details.locator("summary").click();
        await page.waitForTimeout(100);
        const shotExp = `listview-${theme}-${vp.name}-expanded.png`;
        await page.screenshot({ path: path.join(OUT, shotExp), fullPage: true });
        interactions.push({
          theme,
          viewport: vp.name,
          state: "expanded",
          screenshot: shotExp,
          open: await details.evaluate((d) => d.open),
        });

        // edit notice (expand already open — click Изменить для себя)
        const editBtn = page.getByRole("button", { name: /Изменить для себя/ }).first();
        if (await editBtn.count()) {
          await editBtn.click();
          await page.waitForTimeout(50);
          const notice = page.locator('[role="status"]');
          const noticeText = (await notice.count())
            ? await notice.first().innerText()
            : null;
          const shotEdit = `listview-${theme}-${vp.name}-edit-notice.png`;
          await page.screenshot({
            path: path.join(OUT, shotEdit),
            fullPage: true,
          });
          interactions.push({
            theme,
            viewport: vp.name,
            state: "edit-notice",
            screenshot: shotEdit,
            noticeText,
            hasPersonalEditForm: (await page.locator("form").count()) > 0,
            partnerOpenHasOnClick: await page.evaluate(() => {
              const b = document.querySelector('button[aria-label^="Открыть партнёра"]');
              return Boolean(b && typeof b.onclick === "function" && b.onclick !== null);
            }),
          });
        }

        // list layout remount
        await page.evaluate(() => window.__mountObserver?.({ layout: "list" }));
        await page.waitForTimeout(50);
        const rows = await page.locator('[data-testid="ca-observer-client-row"]').count();
        const shotList = `listview-${theme}-${vp.name}-list-layout.png`;
        await page.screenshot({ path: path.join(OUT, shotList), fullPage: true });
        interactions.push({
          theme,
          viewport: vp.name,
          state: "list-layout",
          screenshot: shotList,
          clientRows: rows,
        });

        await page.close();
      }
    }
  } catch (e) {
    errors.push(String(e));
  } finally {
    await browser.close();
  }

  // Static source checks on candidate
  const cardSrc = readFileSync(
    path.join(WORKTREE, "src/components/clients/observer/ObserverPartnerCard.tsx"),
    "utf8",
  );
  const listSrc = readFileSync(
    path.join(WORKTREE, "src/components/clients/observer/ObserverPartnersListView.tsx"),
    "utf8",
  );
  let fixtureImportsProd = null;
  try {
    fixtureImportsProd = execFileSync(
      "rg",
      [
        "-n",
        "observer-demo-fixtures|OBSERVER_FIXTURE",
        path.join(WORKTREE, "src"),
        "--glob",
        "!**/*.test.*",
        "--glob",
        "!**/fixtures/**",
      ],
      { encoding: "utf8" },
    ).trim();
  } catch {
    fixtureImportsProd = null;
  }

  const report = {
    implCandidateSha: CAND,
    intermediateSha: "87c5ef621ba3405c81a529bdb5feec04bdc7e2b2",
    mountMethod:
      "esbuild IIFE bundle of ObserverPartnersListView + CSS modules + test fixtures only",
    fixtureSource: "src/lib/clients-parity/fixtures/observer-demo-fixtures.ts",
    fixtureLeakIntoNonTestSrc: fixtureImportsProd || null,
    partnerOpenBtnHasOnClickHandlerInSource: /partnerOpenBtn[\s\S]*?onClick=/.test(
      cardSrc,
    ),
    editOpensFormInSource: /<form[\s\S]*alias|personal-edit-form|onCancel/.test(
      listSrc,
    ),
    editSetsBlockedNoticeOnly: listSrc.includes("BLOCKED_PERSISTENCE"),
    measurements,
    interactions,
    errors,
    ok: errors.length === 0 && measurements.length === VIEWPORTS.length * 2,
    statesCovered: STATES,
  };
  writeFileSync(path.join(OUT, "isolated-mount-report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        shots: measurements.length,
        interactions: interactions.length,
        partnerOpenOnClick: report.partnerOpenBtnHasOnClickHandlerInSource,
        editForm: report.editOpensFormInSource,
        fixtureLeak: report.fixtureLeakIntoNonTestSrc,
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
