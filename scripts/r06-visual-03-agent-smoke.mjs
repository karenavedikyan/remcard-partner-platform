#!/usr/bin/env node
/** Short agent regression: shared list + find (MOCK), VISUAL-03 dist. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  findFreeLoopbackPort,
  spawnOwnedNextStart,
  stopOwnedServer,
} from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';
import { pinProductionEnvLocal } from './lib/r06-catalog-prefill-mock-run.mjs';
import {
  createPartnersMockState,
  startPartnersSharedMockBff,
} from './lib/r06-partners-shared-mock-bff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-visual-03';
const OUT =
  process.env.R06_VISUAL_03_OUT ||
  path.join(ROOT, 'artifacts/remcard-r06-specialist/specialist-partners-visual-03/c0611fcfefdd');

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

async function waitForHttp(url) {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok || res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const mock = await startPartnersSharedMockBff(createPartnersMockState('agent'));
  const port = await findFreeLoopbackPort(30880);
  const origin = `http://127.0.0.1:${port}`;
  const envPin = pinProductionEnvLocal(ROOT, origin, mock.baseUrl);
  const handle = spawnOwnedNextStart({
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
  if (!(await waitForHttp(`${origin}/login`))) throw new Error('not_ready');
  const buildId = readFileSync(path.join(ROOT, DIST, 'BUILD_ID'), 'utf8').trim();
  await new Promise((r) => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/dev-fixtures/account-session?role=agent`, { waitUntil: 'networkidle' });
  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="agent-r04-partners"]', { timeout: 60_000 });
  const listPath = path.join(OUT, 'impl-agent-list-1440-light-smoke.png');
  await page.screenshot({ path: listPath, fullPage: true });
  await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="agent-partner-hub-modal"]').waitFor({ state: 'visible' });
  const findPath = path.join(OUT, 'impl-agent-find-1440-light-smoke.png');
  await page.screenshot({ path: findPath, fullPage: false });
  await browser.close();
  await stopOwnedServer(handle);
  envPin.restore();
  await mock.close();

  const smoke = {
    buildId,
    captures: [
      { file: 'impl-agent-list-1440-light-smoke.png', sha256: sha256File(listPath) },
      { file: 'impl-agent-find-1440-light-smoke.png', sha256: sha256File(findPath) },
    ],
    note: 'Shared list/find components; MOCK agent upstream; no pixel ref claim.',
  };
  writeFileSync(path.join(OUT, 'AGENT-SMOKE.json'), JSON.stringify(smoke, null, 2));
  console.log(JSON.stringify({ ok: true, smoke }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
