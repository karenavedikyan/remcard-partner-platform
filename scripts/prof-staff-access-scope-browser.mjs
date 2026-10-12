#!/usr/bin/env node
/**
 * Synthetic browser smoke: staff access scope UI (390 dark + 1440 light).
 * Uses /profile/staff-access-scope-fixture (synthetic data only).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3040";
const SMOKE_PORT = process.env.PROF_SMOKE_PORT || "3040";
const PLATFORM_ROOT = process.env.PLATFORM_ROOT || "/agent/repos/remcard-partner-platform";
const FIXTURE_PATH = "/profile/staff-access-scope-fixture";
const OUT = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts/prof-staff-access-scope";

mkdirSync(OUT, { recursive: true });

const report = { status: "FAIL", exitCode: 1, checks: {} };


async function runViewport(browser, name, viewport, colorScheme) {
  const context = await browser.newContext({ viewport, colorScheme });
  const page = await context.newPage();
  await page.goto(`${PROF}${FIXTURE_PATH}`, { waitUntil: "networkidle", timeout: 120_000 });
  const headline = page.getByTestId("staff-access-scope-headline");
  await headline.waitFor({ timeout: 60_000 });
  const headlineText = await headline.innerText();
  if (!/Головной офис и 6 филиалов/.test(headlineText)) {
    throw new Error(`${name}: unexpected headline ${headlineText}`);
  }
  await page.getByText(/Список филиалов \(6\)/).click();
  await page
    .getByTestId("staff-access-scope-branches")
    .getByText("ОПТОВИК — ул. 40 лет Победы, 168")
    .waitFor({ timeout: 15_000 });
  const overflow = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="staff-access-scope-branches"]');
    if (!el) return { ok: false, reason: "missing details" };
    return { ok: el.scrollWidth <= el.clientWidth + 2, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  if (!overflow.ok) throw new Error(`${name}: horizontal overflow ${JSON.stringify(overflow)}`);
  await page.screenshot({ path: path.join(OUT, `scope-${name}.png`), fullPage: true });
  await context.close();
}

try {
  const browser = await chromium.launch({ headless: true });
  await runViewport(browser, "390-dark", { width: 390, height: 844 }, "dark");
  await runViewport(browser, "1440-light", { width: 1440, height: 900 }, "light");
  await browser.close();
  report.status = "PASS";
  report.exitCode = 0;
  report.checks = { headline: true, expand: true, overflow: true, fixtureRoute: FIXTURE_PATH };
} catch (e) {
  report.error = e instanceof Error ? e.message : String(e);
}

writeFileSync(path.join(OUT, "scope-browser.json"), JSON.stringify(report, null, 2));
process.exit(report.exitCode);
