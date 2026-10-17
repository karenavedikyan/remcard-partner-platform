#!/usr/bin/env node
/**
 * REGISTRATION-01 visual smoke (mock capabilities upstream via env in dev — run against local stack).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "artifacts/remcard-registration-01/screenshots");
const BASE = process.env.REGISTRATION_VISUAL_BASE ?? "http://127.0.0.1:3000";

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "welcome-1440-light.png");
  await page.emulateMedia({ colorScheme: "dark" });
  await shot(page, "welcome-1440-dark.png");
  await page.setViewportSize({ width: 375, height: 812 });
  await shot(page, "welcome-375-dark.png");
  await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await shot(page, "join-types-375-dark.png");
  await browser.close();
  await writeFile(
    path.join(ROOT, "artifacts/remcard-registration-01/visual-capture.json"),
    JSON.stringify({ base: BASE, files: ["welcome-1440-light.png", "welcome-1440-dark.png", "welcome-375-dark.png", "join-types-375-dark.png"] }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
