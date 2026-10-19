#!/usr/bin/env node
/**
 * PARTNERS-SHARED-PROTOTYPE-01.1 — eligible gate fix + functional MOCK + limited ref/impl.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
  assertCleanTree,
  collectPrefillProvenance,
  pinProductionEnvLocal,
  probeRuntimeBuildId,
  runIsolatedPlatformBuild,
} from './lib/r06-catalog-prefill-mock-run.mjs';
import { gitRevParse } from './lib/r06-provenance.mjs';
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
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-partners-shared-01-1';
const PROTO_DIR = process.env.R06_PROTO_DIR || '/tmp/r06-login-entry-prototype';
const TASK = 'PARTNERS-SHARED-PROTOTYPE-01.1';

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

async function ensureTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  }, theme);
}

function limitedCaptureMatrix(audience) {
  const prefix = audience === 'agent-r04' ? 'agent' : 'specialist';
  const refRole = prefix === 'agent' ? 'agent' : 'specialist';
  if (audience === 'specialist-r04') {
    return [
      { id: 'active-list', panel: 'list', width: 1440, height: 900, theme: 'light' },
      { id: 'inv-in', panel: 'inv-in', width: 1440, height: 900, theme: 'light' },
      { id: 'inv-out', panel: 'inv-out', width: 1440, height: 900, theme: 'light' },
      { id: 'find', panel: 'find', width: 1440, height: 900, theme: 'light' },
      { id: 'link', panel: 'link', width: 1440, height: 900, theme: 'light' },
      { id: 'active-375', panel: 'list', width: 375, height: 812, theme: 'light' },
      { id: 'find-375', panel: 'find', width: 375, height: 812, theme: 'light' },
    ].map((s) => ({ ...s, audience, refRole, prefix }));
  }
  return [
    { id: 'active-list', panel: 'list', width: 1440, height: 900, theme: 'light' },
    { id: 'find', panel: 'find', width: 1440, height: 900, theme: 'light' },
  ].map((s) => ({ ...s, audience: 'agent-r04', refRole: 'agent', prefix: 'agent' }));
}

async function assertImplModal(page, panel) {
  await page.locator('[data-testid="agent-partner-hub-modal"]').waitFor({ state: 'visible', timeout: 30_000 });
  const surface = page.locator(`[data-testid="agent-r04-modal-${panel}"]`);
  await surface.waitFor({ state: 'visible', timeout: 15_000 });
  const tab = page
    .locator('[data-testid="agent-partner-hub-modal"]')
    .getByRole('tab', { name: panel === 'link' ? /Пригласить по ссылке/i : /Найти в RemCard/i });
  if ((await tab.getAttribute('aria-selected')) !== 'true') {
    throw new Error(`impl_modal_tab_not_selected:${panel}`);
  }
  if (panel === 'link') {
    await page.getByRole('heading', { name: /Пригласить по ссылке/i }).waitFor({ timeout: 10_000 });
  }
}

async function prepareImplSurface(page, origin, spec) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await ensureTheme(page, spec.theme);
  if (spec.panel === 'find' || spec.panel === 'link') {
    await page.goto(`${origin}/partners?hub=${spec.panel}`, { waitUntil: 'networkidle', timeout: 120_000 });
    await assertImplModal(page, spec.panel);
  } else {
    await page.goto(`${origin}/partners`, { waitUntil: 'networkidle', timeout: 120_000 });
    if (spec.panel === 'inv-in' || spec.panel === 'inv-out') {
      await openImplR04Panel(page, 'invitations', origin);
      await page.locator(`[data-testid="agent-invites-${spec.panel === 'inv-in' ? 'incoming' : 'outgoing'}"]`).click();
      await page.waitForTimeout(300);
    }
  }
}

async function captureImpl(page, origin, spec) {
  await prepareImplSurface(page, origin, spec);
  const outPath = path.join(spec.outDir, spec.implName);
  const modal = spec.panel === 'find' || spec.panel === 'link';
  await page.screenshot({ path: outPath, fullPage: !modal });
  return { file: spec.implName, sha256: sha256File(outPath) };
}

async function captureRef(page, refBase, spec) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  const drive = await driveRefRolePartners(page, refBase, {
    role: spec.refRole,
    viewMode: 'list',
    segment: spec.panel === 'inv-in' || spec.panel === 'inv-out' ? 'invitations' : 'active',
    dark: spec.theme === 'dark',
    hubTab: spec.panel === 'find' || spec.panel === 'link' ? spec.panel : null,
  });
  if (!drive.ok) throw new Error(`ref_drive_failed:${drive.reason ?? 'unknown'}`);
  if (spec.panel === 'inv-out') {
    await page.getByRole('button', { name: /Отправленные/i }).click();
    await page.waitForTimeout(300);
  }
  if (spec.panel === 'inv-in') {
    await page.getByRole('button', { name: /Входящие/i }).click();
    await page.waitForTimeout(300);
  }
  const refRole = await page.evaluate(() => {
    const sel = document.querySelector('[data-testid="scenario-role"]');
    return sel instanceof HTMLSelectElement ? sel.value : null;
  });
  if (refRole !== spec.refRole) throw new Error(`ref_role_mismatch:expected=${spec.refRole} got=${refRole}`);
  await applyRefParityCaptureStyles(page);
  const outPath = path.join(spec.outDir, spec.refName);
  const modal = spec.panel === 'find' || spec.panel === 'link';
  await page.screenshot({ path: outPath, fullPage: !modal });
  return { file: spec.refName, sha256: sha256File(outPath) };
}

async function runFunctional(page, origin, mock, expected) {
  const results = [];
  const push = (id, ok, detail = '') => results.push({ id, status: ok ? 'PASS' : 'FAIL', detail });

  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle', timeout: 120_000 });
  const shared = await page.locator('[data-testid="agent-r04-partners"]').count();
  if (expected.shared) {
    push('shell_shared', shared === 1, `count=${shared}`);
    if (shared === 1) {
      const aud = await page.locator('[data-testid="agent-r04-partners"]').getAttribute('data-partners-audience');
      push('shell_audience', aud === expected.audience, aud ?? 'null');
    }
  } else {
    push('shell_legacy', shared === 0, `sharedCount=${shared}`);
    if (shared === 0) {
      await page.getByRole('tab', { name: /Найти в RemCard/i }).waitFor({ timeout: 10_000 });
      push('legacy_find_tab', true);
    }
  }

  if (!expected.shared) return results;

  const searchUrls = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/partnership/search')) searchUrls.push(req.url());
  });

  await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
  await assertImplModal(page, 'find');
  await page.waitForTimeout(800);
  const roleParam = searchUrls.find((u) => u.includes('role='));
  push(
    'search_role_query',
    Boolean(roleParam?.includes(`role=${expected.searchRole}`)),
    roleParam ?? 'no_search',
  );

  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
  await page.getByText('Магазин «Юг»').waitFor({ timeout: 15_000 });
  push('active_partner_visible', true);

  await openImplR04Panel(page, 'invitations', origin);
  await page.locator('[data-testid="agent-invites-incoming"]').click();
  await page.getByText('СтройДом').waitFor({ timeout: 15_000 });
  push('incoming_from_counterparty', true);
  await page.locator('[data-testid="agent-invites-outgoing"]').click();
  await page.getByText('ООО Ремонт+').waitFor({ timeout: 15_000 });
  push('outgoing_initiated_by_me', true);

  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
  await setImplR04ViewMode(page, 'cards');
  await page.locator('[data-testid="agent-r04-partners-cards"]').waitFor({ timeout: 10_000 });
  push('view_mode_cards', true);
  await setImplR04ViewMode(page, 'list');
  await page.locator('[data-testid="agent-r04-partners-table"]').waitFor({ timeout: 10_000 });
  push('view_mode_list', true);

  await page.goto(`${origin}/partners?hub=link`, { waitUntil: 'networkidle' });
  await assertImplModal(page, 'link');
  push('deeplink_hub_link', page.url().includes('hub=link'));

  mock.state.searchFailOnce = true;
  await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const errVisible = await page.getByText(/Не удалось выполнить поиск|ошиб/i).isVisible().catch(() => false);
  push('search_error_surface', errVisible);
  const retry = page.getByRole('button', { name: /Повторить/i });
  if (await retry.isVisible().catch(() => false)) {
    await retry.click();
    await page.waitForTimeout(800);
    push('search_retry', mock.state.searchCalls >= 2, `calls=${mock.state.searchCalls}`);
  } else {
    push('search_retry', false, 'no_retry_button');
  }

  return results;
}

async function geometry320(page, origin, outDir) {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
  let metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }));
  const diag = [];
  if (metrics.overflow) {
    const p = path.join(outDir, 'diag-320-partners-page-overflow.png');
    await page.screenshot({ path: p, fullPage: false });
    diag.push(p);
  }
  await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
  metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }));
  if (metrics.overflow) {
    const p = path.join(outDir, 'diag-320-find-modal-overflow.png');
    await page.screenshot({ path: p, fullPage: false });
    diag.push(p);
  }
  return { overflowPage: metrics.overflow, diagnostics: diag };
}

async function runSession(browser, refBase, { origin, outDir, mockMode, audience, buildIdExpected, capture }) {
  const mock = await startPartnersSharedMockBff(createPartnersMockState(mockMode));
  const envPin = pinProductionEnvLocal(ROOT, origin, mock.baseUrl);
  const port = Number(new URL(origin).port);
  const serverHandle = spawnOwnedNextStart({
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

  let runtimeBuildId = null;
  const functional = [];
  const pairs = [];
  let geometry = null;
  try {
    if (!(await waitForHttp(`${origin}/login`, 120_000))) throw new Error('impl_not_ready');
    runtimeBuildId = await probeRuntimeBuildId(origin, buildIdExpected);
    if (runtimeBuildId !== buildIdExpected) {
      throw new Error(`runtime_build_id_mismatch:expected=${buildIdExpected} actual=${runtimeBuildId}`);
    }

    const page = await browser.newPage();
    if (mockMode === 'specialist_ineligible') {
      functional.push(
        ...(await runFunctional(page, origin, mock, { shared: false })),
      );
    } else if (mockMode === 'specialist') {
      functional.push(
        ...(await runFunctional(page, origin, mock, {
          shared: true,
          audience: 'specialist-r04',
          searchRole: 'pro',
        })),
      );
      geometry = await geometry320(page, origin, outDir);
    } else if (mockMode === 'agent') {
      functional.push(
        ...(await runFunctional(page, origin, mock, {
          shared: true,
          audience: 'agent-r04',
          searchRole: 'agent',
        })),
      );
    }

    if (capture) {
      const refPage = await browser.newPage();
      for (const spec of limitedCaptureMatrix(audience)) {
        const implName = `impl-${spec.prefix}-${spec.id}-${spec.width}-${spec.theme}.png`;
        const refName = `ref-${spec.prefix}-${spec.id}-${spec.width}-${spec.theme}.png`;
        const row = { ...spec, outDir, implName, refName };
        const impl = await captureImpl(page, origin, row);
        let ref = null;
        let refError = null;
        try {
          ref = await captureRef(refPage, refBase, row);
        } catch (e) {
          refError = String(e?.message || e);
        }
        pairs.push({ ...row, impl, ref, refError });
      }
      await refPage.close();
    }
    await page.close();
  } finally {
    await stopOwnedServer(serverHandle);
    envPin.restore();
    await mock.close();
  }

  return { runtimeBuildId, functional, pairs, geometry };
}

function runUnitTests() {
  const vitest = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      'src/lib/partners-hub-presentation.test.ts',
      'src/components/partners/PartnersHub.test.tsx',
      'src/lib/agent-r04/partner-filters.test.ts',
      'src/lib/agent-r04/partner-list-row.test.ts',
      'src/lib/agent-r04/partnership-action-icons.test.ts',
      'src/lib/partnership-rules.test.ts',
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  const tsxRules = spawnSync('npx', ['tsx', '--test', 'src/lib/partnership-rules.test.ts'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return {
    vitest: { exitCode: vitest.status ?? 1, stdout: vitest.stdout?.slice(-2000) },
    partnershipRulesTsx: { exitCode: tsxRules.status ?? 1, stdout: tsxRules.stdout?.slice(-1000) },
  };
}

async function main() {
  verifyLoginEntryPrototypeTarball(ROOT);
  assertCleanTree(ROOT);
  const unit = runUnitTests();
  if (unit.vitest.exitCode !== 0 || unit.partnershipRulesTsx.exitCode !== 0) {
    throw new Error('unit_tests_failed');
  }

  const provenance = collectPrefillProvenance(ROOT, DIST);
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'failed') throw new Error(`build_failed:${build.exitCode}`);

  const codeSha = gitRevParse(ROOT);
  const OUT = path.join(
    ROOT,
    'artifacts/remcard-r06-specialist/partners-shared-prototype-01-1',
    codeSha.slice(0, 12),
  );
  mkdirSync(OUT, { recursive: true });

  ensureLoginEntryPrototypeExtracted(ROOT, PROTO_DIR);
  const refStatic = await startLoginEntryPrototypeStatic(PROTO_DIR);
  const platformPort = await findFreeLoopbackPort(30720, { maxScan: 40 });
  const appOrigin = `http://127.0.0.1:${platformPort}`;

  const browser = await chromium.launch({ headless: true });

  const ineligible = await runSession(browser, refStatic.baseUrl, {
    origin: appOrigin,
    outDir: OUT,
    mockMode: 'specialist_ineligible',
    audience: 'legacy',
    buildIdExpected: build.buildId,
    capture: false,
  });

  const specialist = await runSession(browser, refStatic.baseUrl, {
    origin: appOrigin,
    outDir: OUT,
    mockMode: 'specialist',
    audience: 'specialist-r04',
    buildIdExpected: build.buildId,
    capture: true,
  });

  const agent = await runSession(browser, refStatic.baseUrl, {
    origin: appOrigin,
    outDir: OUT,
    mockMode: 'agent',
    audience: 'agent-r04',
    buildIdExpected: build.buildId,
    capture: true,
  });

  await browser.close();
  refStatic.server.close();

  const functionalFlat = [
    ...ineligible.functional.map((f) => ({ ...f, mode: 'specialist_ineligible' })),
    ...specialist.functional.map((f) => ({ ...f, mode: 'specialist' })),
    ...agent.functional.map((f) => ({ ...f, mode: 'agent' })),
  ];

  copyFileSync(
    path.join(ROOT, 'docs/r06/PARTNERS-SHARED-PROTOTYPE-01-MATRIX.md'),
    path.join(OUT, 'PARTNERS-SHARED-MATRIX.md'),
  );

  const report = {
    task: TASK,
    generatedAt: new Date().toISOString(),
    codeSha,
    sourceTreeDigest: provenance.sourceTreeDigest,
    treeDirtyBeforeBuild: false,
    build: { status: build.status, exitCode: build.exitCode, buildId: build.buildId, distDir: DIST },
    runtimeVerified: {
      specialist: specialist.runtimeBuildId,
      agent: agent.runtimeBuildId,
      ineligible: ineligible.runtimeBuildId,
      expected: build.buildId,
    },
    refProtoSha256: '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d',
    unit,
    functional: functionalFlat,
    functionalSummary: {
      pass: functionalFlat.filter((f) => f.status === 'PASS').length,
      fail: functionalFlat.filter((f) => f.status === 'FAIL').length,
    },
    preferencesContract: {
      note: 'Navigator GET/PATCH /api/pro/partnership-list-preferences requires UserRole.PRO and partnership participation',
      mockFunctional: 'NOT_RUN',
    },
    geometry320: specialist.geometry,
    pairs: [...specialist.pairs, ...agent.pairs].map((p) => ({
      id: p.id,
      audience: p.audience,
      impl: p.impl,
      ref: p.ref,
      refError: p.refError ?? null,
    })),
    visualParityNote: 'Limited 01.1 recaptures; CAPTURED ≠ pixel PASS. Prior 01 dark/card shots remain historical.',
  };

  writeFileSync(path.join(OUT, 'PARTNERS-SHARED-01-1.json'), JSON.stringify(report, null, 2));
  const failed = functionalFlat.some((f) => f.status === 'FAIL') || report.pairs.some((p) => p.refError);
  console.log(JSON.stringify({ ok: !failed, out: OUT, codeSha, buildId: build.buildId }, null, 2));
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
