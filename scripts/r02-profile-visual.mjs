#!/usr/bin/env node
/**
 * R02 profile wizard visual pairs (reference profile-wizard vs local impl).
 * Requires: loopback PG, navigator :3001, platform :3000, PROF_R02 enabled, Playwright.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const OUT_DIR =
  process.env.R02_ARTIFACT_DIR?.trim() ||
  path.join(new URL("..", import.meta.url).pathname, "artifacts/remcard-r02/screenshots");
const NAV_PORT = Number(process.env.R02_NAV_PORT || 3001);
const PLATFORM_PORT = Number(process.env.R02_PLATFORM_PORT || 3000);
const REFERENCE_ROOT =
  process.env.R02_REFERENCE_ROOT?.trim() ||
  "/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard";
const BASE = `http://127.0.0.1:${PLATFORM_PORT}`;
const REF_PORT = 8098;

const PAIRS = [
  { name: "1440-light", width: 1440, height: 900, theme: "light" },
  { name: "375-light", width: 375, height: 812, theme: "light" },
  { name: "375-dark", width: 375, height: 812, theme: "dark" },
  { name: "320-contacts", width: 320, height: 700, theme: "light", step: "contacts" },
];

const REF_HIDE =
  ".demo-top,.review-details,.registration,.choice-footer,.demo-toolbar,.mobile-demo-settings,.review-toolbar{display:none!important}";

async function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.ok || res.status === 404 || res.status === 307) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready: ${url}`);
}

async function ensureServer(cmd, args, cwd, probeUrl) {
  try {
    await waitForServer(probeUrl, 2500);
    return;
  } catch {
    /* start */
  }
  const child = spawn(cmd, args, {
    cwd,
    stdio: "ignore",
    detached: true,
    env: process.env,
  });
  child.unref();
  await waitForServer(probeUrl, 180_000);
}

async function ensureReferenceServer() {
  const base = `http://127.0.0.1:${REF_PORT}`;
  try {
    await waitForServer(`${base}/index.html`, 2000);
  } catch {
    const child = spawn("python3", ["-m", "http.server", String(REF_PORT)], {
      cwd: REFERENCE_ROOT,
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    await waitForServer(`${base}/index.html`);
  }
  return base;
}

async function prepareReference(page, refBase, theme, stepHint) {
  await page.goto(`${refBase}/index.html`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.addStyleTag({ content: REF_HIDE });
  await page.evaluate((step) => {
    const sel = document.querySelector('[data-testid="scenario-role"]');
    if (sel) {
      sel.value = "agent";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (step === "contacts") {
      document.querySelector('[data-testid="wizard-step-2"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  }, stepHint ?? null);
  const resolved = theme === "dark" ? "dark" : "light";
  if ((await page.getAttribute("html", "data-theme")) !== resolved) {
    await page.locator('[data-action="theme"]').click();
  }
  await page.waitForTimeout(300);
}

async function prepareImpl(page, theme, stepHint) {
  await page.goto(`${BASE}/dev/r02-agent-profile`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (theme === "dark") {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
  }
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 60_000 });
  if (stepHint === "contacts") {
    await page.locator('[data-testid="agent-profile-step-2"]').click();
  }
}

async function main() {
  if (process.env.R02_SERVERS_READY !== "1") {
    const navDir =
      process.env.R02_NAVIGATOR_DIR ||
      path.resolve(new URL("../../remcard-navigator", import.meta.url).pathname);
    await ensureServer(
      "npm",
      ["run", "dev", "--", "-p", String(NAV_PORT)],
      navDir,
      `http://127.0.0.1:${NAV_PORT}/api/health`,
    );
    const platDir = new URL("..", import.meta.url).pathname;
    await ensureServer(
      "npm",
      ["run", "dev", "--", "-H", "127.0.0.1", "-p", String(PLATFORM_PORT)],
      platDir,
      `${BASE}/dev/r02-agent-profile`,
    );
  }
  const refBase = await ensureReferenceServer();
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const pair of PAIRS) {
    for (const side of ["impl", "ref"]) {
      const name = `${side}-${pair.name}`;
      const ctx = await browser.newContext({
        viewport: { width: pair.width, height: pair.height },
        colorScheme: pair.theme,
      });
      const page = await ctx.newPage();
      const entry = { name, capture: "FAIL", verify: "FAIL" };
      try {
        if (side === "ref") {
          await prepareReference(page, refBase, pair.theme, pair.step);
        } else {
          await prepareImpl(page, pair.theme, pair.step);
        }
        const out = path.join(OUT_DIR, `${name}.png`);
        const wizard = page.locator('[data-testid="agent-profile-wizard"], .pw').first();
        await wizard.screenshot({ path: out });
        entry.capture = "CAPTURED";
        entry.verify = "PASS";
        entry.path = out;
      } catch (error) {
        entry.error = error instanceof Error ? error.message : String(error);
      }
      report.push(entry);
      await ctx.close();
    }
  }
  await browser.close();

  await writeFile(
    path.join(OUT_DIR, "visual-report.json"),
    JSON.stringify({ pairs: report, outDir: OUT_DIR }, null, 2),
  );
  const failed = report.filter((r) => r.verify !== "PASS");
  if (failed.length) {
    console.error("R02 visual failures:", failed);
    process.exit(1);
  }
  console.log("R02 visual OK", OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
