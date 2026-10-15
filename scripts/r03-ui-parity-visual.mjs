#!/usr/bin/env node
/**
 * R03 UI parity captures: paired ref/impl screenshots for agent certificates & clients.
 * Reuses r03-local-acceptance stack helpers when R03_ACCEPTANCE_STACK=admin (default).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { driveRefAgentSection } from './lib/r03-prototype-ref.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'artifacts/remcard-r03-ui-parity');
const REF_ROOT =
  process.env.R03_REFERENCE_ROOT ||
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';
const REF_PORT = Number(process.env.R03_REF_STATIC_PORT || 8765);
const IMPL_ORIGIN = process.env.R03_UI_IMPL_ORIGIN || 'http://127.0.0.1:3000';

const MATRIX = [
  { section: 'certificates', viewMode: 'list', theme: 'light', width: 1440, height: 900 },
  { section: 'certificates', viewMode: 'cards', theme: 'light', width: 1440, height: 900 },
  { section: 'clients', viewMode: 'list', theme: 'light', width: 1440, height: 900 },
  { section: 'clients', viewMode: 'cards', theme: 'light', width: 1440, height: 900 },
  { section: 'certificates', viewMode: 'list', theme: 'dark', width: 1440, height: 900 },
  { section: 'clients', viewMode: 'list', theme: 'dark', width: 1440, height: 900 },
  { section: 'certificates', viewMode: 'list', theme: 'light', width: 375, height: 812 },
  { section: 'clients', viewMode: 'list', theme: 'light', width: 375, height: 812 },
];

async function startRefStatic() {
  const { createServer } = await import('node:http');
  const { createReadStream, statSync } = await import('node:fs');
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'roles.html';
      const file = path.join(REF_ROOT, rel);
      try {
        statSync(file);
        res.writeHead(200);
        createReadStream(file).pipe(res);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(REF_PORT, () => resolve(server));
  });
}

function slug(row) {
  return `${row.section}-${row.viewMode}-${row.theme}-${row.width}x${row.height}`;
}

async function captureImpl(page, row) {
  const pathSuffix = row.section === 'certificates' ? '/certificates' : '/clients';
  await page.goto(`${IMPL_ORIGIN}${pathSuffix}`, { waitUntil: 'networkidle', timeout: 120_000 });
  if (row.theme === 'dark') {
    await page.locator('[data-testid="theme-toggle"], button[aria-label*="тем"]').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  const toggle = page.locator('[data-testid="agent-r03-view-toggle"] button');
  const label = row.viewMode === 'list' ? 'Список' : 'Карточки';
  await toggle.filter({ hasText: label }).click();
  await page.waitForTimeout(300);
  return page.screenshot({ fullPage: true });
}

async function captureRef(page, row) {
  const base = `http://127.0.0.1:${REF_PORT}`;
  const driven = await driveRefAgentSection(page, base, {
    section: row.section,
    viewMode: row.viewMode,
    dark: row.theme === 'dark',
  });
  if (!driven.ok) throw new Error(`ref_drive_failed:${driven.reason}`);
  return page.screenshot({ fullPage: true });
}

async function main() {
  mkdirSync(path.join(ART, 'screenshots'), { recursive: true });
  const refServer = await startRefStatic();
  const browser = await chromium.launch();
  const captures = [];

  try {
    for (const row of MATRIX) {
      const id = slug(row);
      const refPage = await browser.newPage({ viewport: { width: row.width, height: row.height } });
      const implPage = await browser.newPage({ viewport: { width: row.width, height: row.height } });
      try {
        const refPng = await captureRef(refPage, row);
        const implPng = await captureImpl(implPage, row);
        const refPath = path.join(ART, 'screenshots', `${id}-ref.png`);
        const implPath = path.join(ART, 'screenshots', `${id}-impl.png`);
        writeFileSync(refPath, refPng);
        writeFileSync(implPath, implPng);
        captures.push({ id, ...row, refPath, implPath, status: 'CAPTURED' });
      } catch (err) {
        captures.push({ id, ...row, status: 'FAILED', error: String(err) });
      } finally {
        await refPage.close();
        await implPage.close();
      }
    }
  } finally {
    await browser.close();
    refServer.close();
  }

  writeFileSync(
    path.join(ART, 'screenshots', 'captures.json'),
    JSON.stringify({ capturedAt: new Date().toISOString(), implOrigin: IMPL_ORIGIN, captures }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, art: ART, captured: captures.filter((c) => c.status === 'CAPTURED').length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
