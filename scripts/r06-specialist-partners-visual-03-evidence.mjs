#!/usr/bin/env node
/**
 * SPECIALIST-PARTNERS-VISUAL-03 — ref/impl pairs (MOCK), specialist list/find.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  findFreeLoopbackPort,
  spawnOwnedNextStart,
} from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';
import {
  ensureLoginEntryPrototypeExtracted,
  startLoginEntryPrototypeStatic,
} from './lib/r06-login-entry-prototype-pack.mjs';
import {
  pinProductionEnvLocal,
  probeRuntimeBuildId,
  runIsolatedPlatformBuild,
} from './lib/r06-catalog-prefill-mock-run.mjs';
import { driveRefRolePartners } from './lib/r04-prototype-ref.mjs';
import { applyRefParityCaptureStyles } from './lib/r03-prototype-ref.mjs';
import {
  createPartnersMockState,
  startPartnersSharedMockBff,
} from './lib/r06-partners-shared-mock-bff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-visual-03';
const PROTO_DIR = process.env.R06_PROTO_DIR || '/tmp/r06-login-entry-prototype';
const REF_PIN = path.join(
  ROOT,
  'artifacts/remcard-r06-specialist/partners-shared-prototype-01-1/7818ba6ebd68',
);

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

async function loginImpl(page, origin) {
  await page.goto(`${origin}/dev-fixtures/account-session?role=pro`, { waitUntil: 'networkidle' });
  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="agent-r04-partners"]', { timeout: 60_000 });
}

async function captureImpl(page, origin, spec, outDir) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  if (spec.theme === 'dark') {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  } else {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  }
  await loginImpl(page, origin);
  if (spec.panel === 'find') {
    await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="agent-partner-hub-modal"]').waitFor({ state: 'visible' });
    if (spec.openRefine) {
      await page.locator('summary:has-text("Уточнить")').click();
      await page.waitForTimeout(300);
    }
    if (spec.runSearch) {
      await page
        .getByTestId('agent-r04-modal-find')
        .getByRole('button', { name: 'Найти', exact: true })
        .click();
      await page.waitForTimeout(600);
    }
  } else if (spec.panel === 'cards') {
    await page.locator('[data-testid="agent-r04-view-toggle"] button').nth(1).click();
    await page.waitForTimeout(400);
  }
  const file = spec.implName;
  await page.screenshot({
    path: path.join(outDir, file),
    fullPage: !(spec.panel === 'find'),
  });
  return { file, sha256: sha256File(path.join(outDir, file)) };
}

async function captureRef(page, refBase, spec, outDir) {
  if (spec.skipRef) return null;
  await page.setViewportSize({ width: spec.width, height: spec.height });
  const drive = await driveRefRolePartners(page, refBase, {
    role: 'specialist',
    viewMode: spec.panel === 'cards' ? 'cards' : 'list',
    segment: 'active',
    dark: spec.theme === 'dark',
    openFind: spec.panel === 'find',
  });
  if (!drive.ok) return { error: drive.reason ?? 'ref_drive_failed' };
  if (spec.panel === 'find' && spec.openRefine) {
    await page.locator('summary:has-text("Уточнить")').click().catch(() => null);
    await page.waitForTimeout(300);
  }
  await applyRefParityCaptureStyles(page);
  const file = spec.refName;
  await page.screenshot({
    path: path.join(outDir, file),
    fullPage: !(spec.panel === 'find'),
  });
  return { file, sha256: sha256File(path.join(outDir, file)) };
}

const SPECS = [
  { id: 'list-1440-light', panel: 'list', width: 1440, height: 900, theme: 'light' },
  { id: 'cards-1440-light', panel: 'cards', width: 1440, height: 900, theme: 'light' },
  { id: 'find-1440-light', panel: 'find', width: 1440, height: 900, theme: 'light', runSearch: true },
  {
    id: 'find-refine-1440-light',
    panel: 'find',
    width: 1440,
    height: 900,
    theme: 'light',
    openRefine: true,
  },
  { id: 'list-375-light', panel: 'list', width: 375, height: 812, theme: 'light' },
  { id: 'find-375-light', panel: 'find', width: 375, height: 812, theme: 'light' },
  { id: 'find-375-dark', panel: 'find', width: 375, height: 812, theme: 'dark' },
  { id: 'list-320-smoke', panel: 'list', width: 320, height: 700, theme: 'light', skipRef: true },
  { id: 'find-320-smoke', panel: 'find', width: 320, height: 700, theme: 'light', skipRef: true },
];

async function main() {
  const codeSha = readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').includes('ref:')
    ? readFileSync(
        path.join(ROOT, '.git', readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').trim().slice(5)),
        'utf8',
      ).trim()
    : 'unknown';

  const OUT = path.join(
    ROOT,
    'artifacts/remcard-r06-specialist/specialist-partners-visual-03',
    codeSha.slice(0, 12),
  );
  mkdirSync(OUT, { recursive: true });

  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'failed') throw new Error(`build_failed:${build.exitCode}`);

  ensureLoginEntryPrototypeExtracted(ROOT, PROTO_DIR);
  const refStatic = await startLoginEntryPrototypeStatic(PROTO_DIR);

  const mock = await startPartnersSharedMockBff(createPartnersMockState('specialist'));
  const port = await findFreeLoopbackPort(30860);
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
  if (!(await waitForHttp(`${origin}/login`))) throw new Error('impl_not_ready');
  const buildId = await probeRuntimeBuildId(origin, build.buildId);

  const browser = await chromium.launch({ headless: true });
  const implPage = await browser.newPage();
  const refPage = await browser.newPage();
  const pairs = [];

  for (const spec of SPECS) {
    const implName = `impl-specialist-${spec.id}.png`;
    const refName = `ref-specialist-${spec.id}.png`;
    if (!spec.skipRef) {
      const pinned = path.join(REF_PIN, `ref-specialist-${spec.id.replace('find-refine', 'find').replace('-320-smoke', 'active-list-1440-light')}.png`);
      if (spec.id === 'list-1440-light' && existsSync(path.join(REF_PIN, 'ref-specialist-active-list-1440-light.png'))) {
        copyFileSync(path.join(REF_PIN, 'ref-specialist-active-list-1440-light.png'), path.join(OUT, refName));
      } else if (spec.id === 'find-1440-light' && existsSync(path.join(REF_PIN, 'ref-specialist-find-1440-light.png'))) {
        copyFileSync(path.join(REF_PIN, 'ref-specialist-find-1440-light.png'), path.join(OUT, refName));
      } else if (spec.id === 'find-refine-1440-light') {
        await captureRef(refPage, refStatic.baseUrl, { ...spec, refName }, OUT);
      } else if (spec.id === 'cards-1440-light' && existsSync(path.join(REF_PIN, 'ref-specialist-active-cards-1440-light.png'))) {
        copyFileSync(path.join(REF_PIN, 'ref-specialist-active-cards-1440-light.png'), path.join(OUT, refName));
      } else {
        await captureRef(refPage, refStatic.baseUrl, { ...spec, refName }, OUT);
      }
    }
    const impl = await captureImpl(implPage, origin, { ...spec, implName }, OUT);
    pairs.push({ id: spec.id, impl, ref: spec.skipRef ? null : refName });
  }

  await browser.close();
  refStatic.server.close();
  await mock.close();

  const report = {
    task: 'SPECIALIST-PARTNERS-VISUAL-03',
    codeSha,
    buildId,
    distDir: DIST,
    pairs,
    note: 'Ref pinned from 7818ba6ebd68 where available; impl from MOCK specialist shell.',
  };
  writeFileSync(path.join(OUT, 'REPORT.json'), JSON.stringify(report, null, 2));
  writeFileSync(
    path.join(OUT, 'REPORT.md'),
    `# VISUAL-03\n\nFrontend \`${codeSha}\`, BUILD_ID \`${buildId}\`.\n`,
  );
  console.log(JSON.stringify({ ok: true, out: OUT, buildId }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
