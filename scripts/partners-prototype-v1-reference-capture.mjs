/**
 * Capture exact reference partners UI from local prototype server.
 * PROVENANCE: reference/prototype-20261029 @ 4ba2f9e — NOT PROF live.
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(
  __dirname,
  "../artifacts/partners-prototype-v1/screenshots-reference",
);
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.REF_BASE || "http://127.0.0.1:8765/partner/index.html";

async function clickFirst(page, selectors) {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) continue;
    try {
      await el.click({ timeout: 2500 });
      await page.waitForTimeout(500);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function openAgentPartners(page) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await clickFirst(page, [
    'button:has-text("Сценарии прототипа")',
    'summary:has-text("Сценарии прототипа")',
    'a:has-text("Сценарии прототипа")',
  ]);
  await clickFirst(page, [
    'button:has-text("Агент")',
    '[data-action*="agent"]',
    'button:has-text("Кабинет агента")',
  ]);
  await clickFirst(page, [
    'button:has-text("Партнёры")',
    '[data-action*="partner"]',
    'a:has-text("Партнёры")',
  ]);
  await clickFirst(page, [
    'button:has-text("Найти партнёра")',
    'button:has-text("Найти в RemCard")',
    '[data-action*="directory"]',
    'button:has-text("Найти")',
  ]);
  await page.waitForTimeout(800);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  for (const theme of ["light", "dark"]) {
    for (const [w, h, label] of [
      [1440, 1000, "1440"],
      [375, 812, "375"],
    ]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await openAgentPartners(page);
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
        document.body?.setAttribute("data-theme", t);
      }, theme);
      await page.waitForTimeout(300);
      const file = path.join(outDir, `reference-partners-${label}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log("wrote", file, "url=", page.url());
      // If navigator present, also crop-ish full page is enough
      const hasNav = (await page.locator(".pr-navigator, .pr-path, [aria-label*='Навигатор']").count()) > 0;
      console.log("hasNavigator=", hasNav);
      await page.close();
    }
  }
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
