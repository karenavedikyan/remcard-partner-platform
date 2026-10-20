#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { findFreeLoopbackPort, spawnOwnedNextStart } from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';
import { pinProductionEnvLocal } from './lib/r06-catalog-prefill-mock-run.mjs';
import { createPartnersMockState, startPartnersSharedMockBff } from './lib/r06-partners-shared-mock-bff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = '.next';
const OUT = path.join(
  ROOT,
  'artifacts/remcard-r06-specialist/specialist-partners-complete-02-2/46da5ad5c679/impl-specialist-bulk-hide-confirm-1440-light.png',
);

async function waitForHttp(url) {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('not_ready');
}

const mock = await startPartnersSharedMockBff(createPartnersMockState('specialist'));
const port = await findFreeLoopbackPort(30840);
const origin = `http://127.0.0.1:${port}`;
pinProductionEnvLocal(ROOT, origin, mock.baseUrl);
spawnOwnedNextStart({
  port,
  cwd: ROOT,
  env: {
    ...process.env,
    LOGIN_ENTRY_NEXT_DIST_DIR: DIST,
    NEXT_PUBLIC_APP_URL: origin,
    REMCARD_API_BASE_URL: mock.baseUrl,
    REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN: '1',
    NODE_ENV: 'production',
    PORT: String(port),
  },
});
await waitForHttp(`${origin}/login`);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${origin}/dev-fixtures/account-session?role=pro`, { waitUntil: 'networkidle' });
await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForSelector('[data-testid="agent-r04-partners"]');
await page.locator('[data-testid="agent-r04-partners-table-row"]').first().locator('input[type="checkbox"]').check();
await page.locator('[data-testid="agent-partner-bulk-bar"]').waitFor({ state: 'visible' });
await page.locator('[data-testid="agent-partner-bulk-bar"]').getByRole('button', { name: 'Убрать из списка' }).click();
await page
  .locator('[data-testid="partner-bulk-hide-dialog"], [data-testid="partner-list-hide-dialog"]')
  .waitFor({ state: 'visible' });
await page.screenshot({ path: OUT });
await browser.close();
await mock.close();
console.log('saved', OUT);
