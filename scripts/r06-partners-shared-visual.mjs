#!/usr/bin/env node
/**
 * PARTNERS-SHARED-PROTOTYPE-01 — specialist/agent ref/impl captures (MOCK upstream).
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  findFreeLoopbackPort,
  spawnOwnedNextStart,
  stopOwnedServer,
} from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';
import {
  ensureLoginEntryPrototypeExtracted,
  startLoginEntryPrototypeStatic,
  verifyLoginEntryPrototypeTarball,
} from './lib/r06-login-entry-prototype-pack.mjs';
import {
  collectPrefillProvenance,
  pinProductionEnvLocal,
  probeRuntimeBuildId,
  runIsolatedPlatformBuild,
} from './lib/r06-catalog-prefill-mock-run.mjs';
import {
  driveRefRolePartners,
  openImplR04Panel,
  setImplR04ViewMode,
} from './lib/r04-prototype-ref.mjs';
import { applyRefParityCaptureStyles } from './lib/r03-prototype-ref.mjs';
import {
  createPartnersMockState,
  startPartnersSharedMockBff,
} from './lib/r06-partners-shared-mock-bff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-partners-shared';
const PROTO_DIR = process.env.R06_PROTO_DIR || '/tmp/r06-login-entry-prototype';

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

async function ensureTheme(page, theme) {
  if (theme === 'dark') {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  } else {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  }
}

async function captureImpl(page, origin, spec) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.keyboard.press('Escape').catch(() => null);
  await ensureTheme(page, spec.theme);
  await page.waitForSelector('[data-testid="agent-r04-partners"]', { timeout: 45_000 });

  if (spec.panel === 'find' || spec.panel === 'link') {
    const hub = spec.panel === 'link' ? 'link' : 'find';
    await page.goto(`${origin}/partners?hub=${hub}`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="agent-partner-hub-modal"]').waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(400);
  } else if (spec.panel === 'inv-in') {
    await openImplR04Panel(page, 'invitations', origin);
    await page.locator('[data-testid="agent-invites-incoming"]').click();
    await page.waitForTimeout(300);
  } else if (spec.panel === 'inv-out') {
    await openImplR04Panel(page, 'invitations', origin);
    await page.locator('[data-testid="agent-invites-outgoing"]').click();
    await page.waitForTimeout(300);
  } else if (spec.viewMode === 'cards') {
    await setImplR04ViewMode(page, 'cards');
    await page.waitForTimeout(300);
  }

  const outPath = path.join(spec.outDir, spec.implName);
  const modal = spec.panel === 'find' || spec.panel === 'link' || spec.smoke;
  await page.screenshot({ path: outPath, fullPage: !modal });
  return { file: spec.implName, sha256: sha256File(outPath) };
}

async function captureRef(page, refBase, spec) {
  if (spec.skipRef) return null;
  await page.setViewportSize({ width: spec.width, height: spec.height });
  const drive = await driveRefRolePartners(page, refBase, {
    role: spec.refRole ?? 'specialist',
    viewMode: spec.viewMode ?? 'list',
    segment: spec.panel === 'inv-in' || spec.panel === 'inv-out' ? 'invitations' : 'active',
    dark: spec.theme === 'dark',
    openFind: spec.panel === 'find' || spec.panel === 'link',
  });
  if (!drive.ok) throw new Error(`ref_drive_failed:${drive.reason ?? 'unknown'}`);
  if (spec.panel === 'link') {
    await page.getByRole('button', { name: /Пригласить по ссылке/i }).click().catch(() => null);
    await page.waitForTimeout(400);
  }
  if (spec.panel === 'inv-out') {
    await page.getByRole('button', { name: /Отправленные/i }).click().catch(() => null);
    await page.waitForTimeout(300);
  }
  if (spec.viewMode === 'cards') {
    const cardsBtn = page.locator('[data-coll-action="view-cards"]').first();
    if (await cardsBtn.isVisible().catch(() => false)) {
      await cardsBtn.click();
      await page.waitForTimeout(300);
    }
  }
  await applyRefParityCaptureStyles(page);
  const outPath = path.join(spec.outDir, spec.refName);
  const modal = spec.panel === 'find' || spec.panel === 'link' || spec.smoke;
  await page.screenshot({ path: outPath, fullPage: !modal });
  return { file: spec.refName, sha256: sha256File(outPath) };
}

function audienceSpecs(audience) {
  const prefix = audience === 'agent-r04' ? 'agent' : 'specialist';
  const refRole = audience === 'agent-r04' ? 'agent' : 'specialist';
  if (audience === 'specialist-r04') {
    return [
      { id: 'active-list', panel: 'list', viewMode: 'list', width: 1440, height: 900, theme: 'light' },
      { id: 'active-cards', panel: 'list', viewMode: 'cards', width: 1440, height: 900, theme: 'light' },
      { id: 'inv-in', panel: 'inv-in', width: 1440, height: 900, theme: 'light' },
      { id: 'inv-out', panel: 'inv-out', width: 1440, height: 900, theme: 'light' },
      { id: 'find', panel: 'find', width: 1440, height: 900, theme: 'light' },
      { id: 'link', panel: 'link', width: 1440, height: 900, theme: 'light' },
      { id: 'active-375-light', panel: 'list', width: 375, height: 812, theme: 'light' },
      { id: 'find-375-light', panel: 'find', width: 375, height: 812, theme: 'light' },
      { id: 'active-375-dark', panel: 'list', width: 375, height: 812, theme: 'dark' },
      { id: 'find-375-dark', panel: 'find', width: 375, height: 812, theme: 'dark' },
      {
        id: 'active-320-smoke',
        panel: 'list',
        width: 320,
        height: 700,
        theme: 'light',
        smoke: true,
        skipRef: true,
      },
    ].map((s) => ({ ...s, audience, refRole, prefix }));
  }
  return [
    { id: 'active-list', panel: 'list', viewMode: 'list', width: 1440, height: 900, theme: 'light' },
    { id: 'find-1440', panel: 'find', width: 1440, height: 900, theme: 'light' },
    { id: 'active-375', panel: 'list', width: 375, height: 812, theme: 'light' },
    { id: 'find-375', panel: 'find', width: 375, height: 812, theme: 'light' },
  ].map((s) => ({ ...s, audience, refRole, prefix }));
}

async function runWithMock(browser, refBase, { origin, outDir, mockMode, audience }) {
  const mock = await startPartnersSharedMockBff(createPartnersMockState(mockMode));
  const envPin = pinProductionEnvLocal(ROOT, origin, mock.baseUrl);
  const port = Number(new URL(origin).port);
  const child = spawnOwnedNextStart({
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
  await probeRuntimeBuildId(origin, null);

  const implPage = await browser.newPage();
  const refPage = await browser.newPage();
  const pairs = [];
  for (const spec of audienceSpecs(audience)) {
    const implName = `impl-${spec.prefix}-${spec.id}-${spec.width}-${spec.theme}.png`;
    const refName = `ref-${spec.prefix}-${spec.id}-${spec.width}-${spec.theme}.png`;
    const row = { ...spec, outDir, implName, refName };
    const impl = await captureImpl(implPage, origin, row);
    let ref = null;
    let refError = null;
    try {
      ref = await captureRef(refPage, refBase, row);
    } catch (e) {
      refError = String(e?.message || e);
    }
    pairs.push({ ...row, impl, ref, refError });
  }
  await implPage.close();
  await refPage.close();
  await stopOwnedServer(child);
  envPin.restore();
  await mock.close();
  return pairs;
}

async function main() {
  verifyLoginEntryPrototypeTarball(ROOT);
  const provenance = collectPrefillProvenance(ROOT, DIST);
  const codeSha = provenance.codeSha;
  const OUT = path.join(
    ROOT,
    'artifacts/remcard-r06-specialist/partners-shared-prototype-01',
    codeSha.slice(0, 12),
  );
  mkdirSync(OUT, { recursive: true });

  ensureLoginEntryPrototypeExtracted(ROOT, PROTO_DIR);
  const refStatic = await startLoginEntryPrototypeStatic(PROTO_DIR);

  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'failed') throw new Error(`build_failed:${build.exitCode}`);

  const platformPort = await findFreeLoopbackPort(30710, { maxScan: 40 });
  const appOrigin = `http://127.0.0.1:${platformPort}`;

  const browser = await chromium.launch({ headless: true });
  const specialistPairs = await runWithMock(browser, refStatic.baseUrl, {
    origin: appOrigin,
    outDir: OUT,
    mockMode: 'specialist',
    audience: 'specialist-r04',
  });
  const agentPairs = await runWithMock(browser, refStatic.baseUrl, {
    origin: appOrigin,
    outDir: OUT,
    mockMode: 'agent',
    audience: 'agent-r04',
  });
  await browser.close();
  refStatic.server.close();

  const runtimeBuildId = await probeRuntimeBuildId(appOrigin, build.buildId).catch(() => build.buildId);

  const matrixSrc = path.join(ROOT, 'docs/r06/PARTNERS-SHARED-PROTOTYPE-01-MATRIX.md');
  copyFileSync(matrixSrc, path.join(OUT, 'PARTNERS-SHARED-MATRIX.md'));

  const report = {
    task: 'PARTNERS-SHARED-PROTOTYPE-01',
    generatedAt: new Date().toISOString(),
    codeSha,
    sourceTreeDigest: provenance.sourceTreeDigest,
    treeDirty: provenance.treeDirty,
    buildId: runtimeBuildId,
    distDir: DIST,
    refProtoSha256: '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d',
    pairs: [...specialistPairs, ...agentPairs].map((p) => ({
      id: p.id,
      audience: p.audience,
      impl: p.impl,
      ref: p.ref,
      refError: p.refError,
    })),
    functional: {
      specialistShell: 'CAPTURED',
      agentRegression: 'CAPTURED',
      loadingEmptyErrorStates: 'NOT_RUN',
      storeCompanySharedShell: 'BLOCKED',
      listPreferenceLiveContract: 'NOT_RUN',
    },
    visualParityNote:
      'CAPTURED only; not a pixel PASS claim. Specialist verified vs ref role=specialist; agent vs ref role=agent.',
  };

  writeFileSync(path.join(OUT, 'PARTNERS-SHARED-VISUAL.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, out: OUT, codeSha, buildId: runtimeBuildId }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
