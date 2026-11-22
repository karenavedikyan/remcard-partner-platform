#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE = process.env.MINI_APP_CAPTURE_BASE ?? "http://127.0.0.1:3000";
const OUT = process.env.MINI_APP_CAPTURE_OUT ?? path.join(process.cwd(), "artifacts/mini-app-pilot-20261122/screenshots");

const FIXTURES = [
  "agent-telegram",
  "agent-max",
  "specialist-telegram",
  "specialist-max",
  "store-telegram",
  "store-max",
  "company-telegram",
  "company-max",
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 12"],
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  for (const key of FIXTURES) {
    await page.goto(`${BASE}/dev/mini-app-fixture?fixture=${key}`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="mini-app-home"]');
    await page.screenshot({ path: path.join(OUT, `${key}-home.png`), fullPage: true });
  }
  await browser.close();
  console.log(`Saved ${FIXTURES.length} screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});