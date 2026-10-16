#!/usr/bin/env node
/**
 * ACCOUNT-EXIT-01 visual + optional live dual-session checks.
 * Usage: BASE_URL=http://127.0.0.1:3000 node scripts/account-exit-browser-acceptance.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = path.join(__dirname, "../artifacts/remcard-account-exit");
const BASE_URL = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const FIXTURE = `${BASE_URL}/dev-fixtures/account-session`;

const VIEWPORTS = [
  { name: "1440-light", width: 1440, height: 900, theme: "light" },
  { name: "1440-dark", width: 1440, height: 900, theme: "dark" },
  { name: "375-light", width: 375, height: 812, theme: "light" },
  { name: "375-dark", width: 375, height: 812, theme: "dark" },
  { name: "320-light", width: 320, height: 640, theme: "light" },
  { name: "320-dark", width: 320, height: 640, theme: "dark" },
];

async function setTheme(page, theme) {
  await page.evaluate((value) => {
    document.documentElement.dataset.theme = value;
    localStorage.setItem("remcard-theme", value);
  }, theme);
}

async function captureMenu(page, label) {
  await page.getByTestId("account-menu-trigger").click();
  await page.getByTestId("account-session-menu").waitFor({ state: "visible", timeout: 10_000 });
  await page.screenshot({ path: path.join(ARTIFACTS, `${label}-menu.png`) });
  await page.getByTestId("account-menu-trigger").click();
}

async function captureDialog(page, label) {
  await page.getByTestId("account-menu-trigger").click();
  await page.getByTestId("account-logout-all").click();
  await page.getByTestId("logout-all-confirmation").waitFor({ state: "visible", timeout: 10_000 });
  await page.screenshot({ path: path.join(ARTIFACTS, `${label}-dialog.png`) });
  await page.getByTestId("logout-all-cancel").click();
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch();
  const results = { baseUrl: BASE_URL, fixture: FIXTURE, captures: [], exitCode: 0 };

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.goto(FIXTURE, { waitUntil: "networkidle", timeout: 60_000 });
      await setTheme(page, vp.theme);
      await page.waitForTimeout(200);
      if (vp.width >= 375) {
        await captureMenu(page, vp.name);
        await captureDialog(page, vp.name);
        results.captures.push(`${vp.name}-menu.png`, `${vp.name}-dialog.png`);
      } else {
        await captureMenu(page, vp.name);
        await page.screenshot({ path: path.join(ARTIFACTS, `${vp.name}-profile.png`) });
        results.captures.push(`${vp.name}-menu.png`, `${vp.name}-profile.png`);
      }
      await context.close();
    }
  } catch (error) {
    results.exitCode = 1;
    results.error = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }

  await writeFile(path.join(ARTIFACTS, "TEST-RESULTS.json"), `${JSON.stringify(results, null, 2)}\n`);
  process.exit(results.exitCode);
}

main();
