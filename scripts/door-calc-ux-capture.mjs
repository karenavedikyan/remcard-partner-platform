#!/usr/bin/env node
/**
 * Скриншоты калькулятора дверей для artifacts/calculator-ux-reference/out (демо-harness, не прод).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const harnessDir = path.join(repoRoot, 'scripts/door-calc-ux-harness');
const outDir = path.join(repoRoot, 'artifacts/calculator-ux-reference/out');
const baseUrl = 'http://127.0.0.1:5198';

const VIEWPORTS = [
  { w: 1386, h: 719, tag: '1386x719' },
  { w: 390, h: 844, tag: '390x844' },
];

const THEMES = ['light', 'dark'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(400);
  }
  throw new Error(`Harness server did not start at ${url}`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await createServer({
    configFile: path.join(harnessDir, 'vite.config.ts'),
    root: harnessDir,
  });
  await server.listen(5198, '127.0.0.1');
  await waitForServer(baseUrl);

  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of THEMES) {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
        await page.goto(`${baseUrl}/?view=wizard`);
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.getByRole('button', { name: /Далее: размеры/i }).click();
        await page.waitForSelector('.door-wizard .stagebox', { timeout: 15_000 });
        await sleep(400);
        const wizardPath = path.join(outDir, `wizard-step2-${vp.tag}-${theme}.png`);
        await page.screenshot({ path: wizardPath, fullPage: false });
        await page.close();

        const offerPage = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
        await offerPage.goto(`${baseUrl}/?view=offer`);
        await offerPage.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await offerPage.waitForSelector('.door-offer .page', { timeout: 15_000 });
        await sleep(400);
        const offerPath = path.join(outDir, `offer-${vp.tag}-${theme}.png`);
        await offerPage.screenshot({ path: offerPath, fullPage: false });
        await offerPage.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  console.log('Screenshots saved to', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});