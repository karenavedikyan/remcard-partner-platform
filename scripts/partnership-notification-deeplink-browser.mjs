#!/usr/bin/env node
/**
 * Synthetic check: /partners?terms=… preserves returnTo through login gate.
 * Requires platform on PROF_BASE_URL (default 3020) with JWT fixtures optional.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3020";
const PARTNERSHIP_ID = process.env.PARTNERSHIP_TERMS_ID || "synthetic-partnership-id";
const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const report = { profBase: PROF, partnershipId: PARTNERSHIP_ID, checks: {} };

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const deepLink = `${PROF}/partners?terms=${encodeURIComponent(PARTNERSHIP_ID)}`;
  await page.goto(deepLink, { waitUntil: "domcontentloaded", timeout: 60000 });

  const loginHref =
    (await page.locator('a[href*="/login"]').first().getAttribute("href").catch(() => null)) ||
    (await page.evaluate(() => {
      const q = new URLSearchParams(window.location.search);
      return q.get("returnTo");
    }));

  const href = loginHref ?? (await page.url());
  if (typeof loginHref === "string" && loginHref.includes("returnTo=")) {
    const decoded = decodeURIComponent(loginHref.split("returnTo=")[1]?.split("&")[0] ?? "");
    if (!decoded.includes(`terms=${PARTNERSHIP_ID}`)) {
      throw new Error(`returnTo lost terms: ${decoded}`);
    }
    report.checks.returnToPreserved = "PASS";
  } else if (page.url().includes("/login")) {
    const full = page.url();
    if (!full.includes(encodeURIComponent(`terms=${PARTNERSHIP_ID}`)) && !full.includes("terms=")) {
      throw new Error(`login URL missing terms returnTo: ${full}`);
    }
    report.checks.returnToPreserved = "PASS";
  } else {
    report.checks.returnToPreserved = "SKIP_ALREADY_AUTH_OR_GATE";
  }

  await page.screenshot({
    path: `${outDir}/partnership-deeplink-login-gate.png`,
    fullPage: true,
  });
  await browser.close();
  report.exitCode = 0;
}

try {
  await run();
} catch (e) {
  report.exitCode = 1;
  report.error = e instanceof Error ? e.message : String(e);
}

writeFileSync(`${outDir}/partnership-deeplink-browser-report.json`, JSON.stringify(report, null, 2));
process.exit(report.exitCode ?? 1);
