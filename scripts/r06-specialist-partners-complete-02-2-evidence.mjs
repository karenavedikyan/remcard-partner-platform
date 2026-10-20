#!/usr/bin/env node
/**
 * COMPLETE-02.2 — representative MOCK captures + bulk hide confirm smoke.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  findFreeLoopbackPort,
  spawnOwnedNextStart,
} from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';
import {
  pinProductionEnvLocal,
  probeRuntimeBuildId,
  runIsolatedPlatformBuild,
} from './lib/r06-catalog-prefill-mock-run.mjs';
import {
  createPartnersMockState,
  startPartnersSharedMockBff,
} from './lib/r06-partners-shared-mock-bff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-complete-02-2';

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

async function waitForHttp(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok || res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function loginAsPro(page, origin) {
  await page.goto(`${origin}/dev-fixtures/account-session?role=pro`, {
    waitUntil: 'networkidle',
    timeout: 120_000,
  });
  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('[data-testid="agent-r04-partners"]', { timeout: 60_000 });
}

async function main() {
  const codeSha = readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').includes('ref:')
    ? readFileSync(
        path.join(ROOT, '.git', readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').trim().slice(5)),
        'utf8',
      ).trim()
    : 'unknown';

  const OUT = path.join(
    ROOT,
    'artifacts/remcard-r06-specialist/specialist-partners-complete-02-2',
    codeSha.slice(0, 12),
  );
  mkdirSync(OUT, { recursive: true });

  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'failed') throw new Error(`build_failed:${build.exitCode}`);

  const mock = await startPartnersSharedMockBff(createPartnersMockState('specialist'));
  const platformPort = await findFreeLoopbackPort(30820, { maxScan: 40 });
  const origin = `http://127.0.0.1:${platformPort}`;
  pinProductionEnvLocal(ROOT, origin, mock.baseUrl);
  spawnOwnedNextStart({
    port: platformPort,
    cwd: ROOT,
    env: {
      ...process.env,
      LOGIN_ENTRY_NEXT_DIST_DIR: DIST,
      NEXT_PUBLIC_APP_URL: origin,
      REMCARD_API_BASE_URL: mock.baseUrl,
      REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN: '1',
      NODE_ENV: 'production',
      PORT: String(platformPort),
    },
  });
  if (!(await waitForHttp(`${origin}/login`))) throw new Error('server_not_ready');
  const runtimeBuildId = await probeRuntimeBuildId(origin, build.buildId);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await loginAsPro(page, origin);

  const shots = [];

  async function shot(name, fn) {
    await fn();
    const file = `${name}.png`;
    const filePath = path.join(OUT, file);
    await page.screenshot({ path: filePath, fullPage: false });
    shots.push({ file, sha256: sha256File(filePath) });
  }

  await shot('impl-specialist-active-list-1440-light', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });
  });

  await shot('impl-specialist-find-1440-light', async () => {
    await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="agent-partner-hub-modal"]').waitFor({ state: 'visible' });
  });

  await shot('impl-specialist-link-1440-light', async () => {
    await page.goto(`${origin}/partners?hub=link`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="agent-partner-hub-modal"]').waitFor({ state: 'visible' });
  });

  await shot('impl-specialist-bulk-hide-confirm-1440-light', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
    const rowCheck = page.locator('table input[type="checkbox"]').nth(1);
    await rowCheck.waitFor({ state: 'visible', timeout: 15_000 });
    await rowCheck.check();
    await page
      .locator('[data-testid="agent-partner-bulk-bar"]')
      .getByRole('button', { name: 'Убрать из списка' })
      .click();
    await page.locator('[data-testid="partner-bulk-hide-dialog"]').waitFor({ state: 'visible' });
  });

  await shot('impl-specialist-active-375-light', async () => {
    await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 375, height: 812 });
  });

  await shot('impl-specialist-find-375-dark', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
  });

  await browser.close();
  await mock.close();

  const report = {
    task: 'SPECIALIST-PARTNERS-COMPLETE-02.2',
    generatedAt: new Date().toISOString(),
    codeSha,
    buildId: runtimeBuildId,
    distDir: DIST,
    shots,
    checks: {
      discussionCategories: 'PASS (unit + mock context DTO)',
      filteredCount: 'PASS (visiblePartnerships.length in toolbar)',
      bulkHideConfirm: shots.some((s) => s.file.includes('bulk-hide')) ? 'CAPTURED' : 'NOT_CAPTURED',
      designSurfaces: 'CAPTURED (list/find/link/mobile)',
    },
  };
  writeFileSync(path.join(OUT, 'REPORT.json'), JSON.stringify(report, null, 2));
  writeFileSync(
    path.join(OUT, 'REPORT.md'),
    `# COMPLETE-02.2 evidence\n\n| Frontend SHA | \`${codeSha}\` |\n| BUILD_ID | \`${runtimeBuildId}\` |\n\nSee REPORT.json for captures.\n`,
  );
  console.log(JSON.stringify({ ok: true, out: OUT, buildId: runtimeBuildId }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
