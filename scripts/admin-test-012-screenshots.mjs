#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env.ADMIN_TEST_PLATFORM_URL ?? 'http://127.0.0.1:3000';
const OUT = fileURLToPath(new URL('../artifacts/remcard-admin-test-01/screenshots', import.meta.url));

async function shot(page, name, width) {
  await page.setViewportSize({ width, height: width === 320 ? 700 : 900 });
  await page.goto(`${BASE}/login?mode=admin`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (const width of [1440, 375, 320]) {
    await shot(page, 'login-admin', width);
  }
  await browser.close();
  console.log(JSON.stringify({ ok: true, out: OUT }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
