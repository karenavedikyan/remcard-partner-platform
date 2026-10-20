#!/usr/bin/env node
/**
 * SPECIALIST-CLIENTS-IMPLEMENT-01.2 — specialist clients ref/impl + mock linked scenario.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
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
  assertCleanTree,
  collectPrefillProvenance,
  pinProductionEnvLocal,
  probeRuntimeBuildId,
  runIsolatedPlatformBuild,
} from './lib/r06-catalog-prefill-mock-run.mjs';
import { gitRevParse } from './lib/r06-provenance.mjs';
import { applyRefParityCaptureStyles, driveRefSpecialistClients } from './lib/r03-prototype-ref.mjs';
import {
  createPartnersMockState,
  startPartnersSharedMockBff,
} from './lib/r06-partners-shared-mock-bff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTO_DIR = process.env.R06_PROTO_DIR || '/tmp/r06-login-entry-prototype';
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-specialist-clients-implement-01-2';
const ARTIFACT_ROOT = 'artifacts/remcard-r06-specialist/specialist-clients-implement-01-2';

const CLIENTS_MATRIX = [
  { id: 'list-1440-light', panel: 'list', width: 1440, height: 900, theme: 'light', viewMode: 'list' },
  { id: 'list-375-dark', panel: 'list', width: 375, height: 812, theme: 'dark', viewMode: 'list' },
  { id: 'detail-1440-light', panel: 'detail', width: 1440, height: 900, theme: 'light', viewMode: 'list' },
  { id: 'detail-375-light', panel: 'detail', width: 375, height: 812, theme: 'light', viewMode: 'list' },
  { id: 'form-create-1440-light', panel: 'form-create', width: 1440, height: 900, theme: 'light', viewMode: 'list' },
  { id: 'form-edit-empty-375-light', panel: 'form-edit-empty', width: 375, height: 812, theme: 'light', viewMode: 'list' },
];

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

async function prepareImpl(page, origin, spec) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await page.emulateMedia({ colorScheme: spec.theme === 'dark' ? 'dark' : 'light' });
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  }, spec.theme);

  if (spec.panel === 'list') {
    await page.goto(`${origin}/clients`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Клиенты' }).waitFor({ timeout: 30_000 });
  } else if (spec.panel === 'detail') {
    await page.goto(`${origin}/clients/mock-spec-client-1`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Анна Клиентова' }).waitFor({ timeout: 30_000 });
  } else if (spec.panel === 'form-create') {
    await page.goto(`${origin}/clients`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Добавить клиента' }).click();
    await page.locator('[data-testid="agent-client-form-dialog"]').waitFor({ timeout: 15_000 });
    const open = await page.locator('details summary').filter({ hasText: /Контакты и заметка/i }).count();
    if (open > 0) {
      const detailsOpen = await page.locator('details[open]').filter({ hasText: /Контакты и заметка/i }).count();
      if (detailsOpen > 0) throw new Error('create_form_optional_should_be_closed');
    }
  } else if (spec.panel === 'form-edit-empty') {
    await page.goto(`${origin}/clients/mock-spec-client-empty`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Изменить заметку' }).click();
    await page.locator('[data-testid="agent-client-form-dialog"]').waitFor({ timeout: 15_000 });
    const detailsOpen = await page.locator('details[open]').filter({ hasText: /Контакты и заметка/i }).count();
    if (detailsOpen < 1) throw new Error('edit_form_optional_should_be_open');
  }
}

async function captureRef(refPage, refBase, spec, outPath) {
  await driveRefSpecialistClients(refPage, refBase, {
    viewMode: spec.viewMode,
    panel: spec.panel,
    theme: spec.theme,
    width: spec.width,
    height: spec.height,
  });
  await refPage.screenshot({ path: outPath, fullPage: false });
}

async function runMockLinkedScenario(mockBase) {
  const create = await fetch(`${mockBase}/api/pro/agent-clients`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      displayName: 'Scenario Client',
      need: 'Task A',
      note: 'Note A',
      city: 'Krasnodar',
    }),
  });
  if (create.status !== 201) throw new Error(`mock_client_create_${create.status}`);
  const { client } = await create.json();
  const patch = await fetch(`${mockBase}/api/pro/agent-clients/${client.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ need: 'Task B', note: null }),
  });
  if (patch.status !== 200) throw new Error(`mock_client_patch_${patch.status}`);
  const cert = await fetch(`${mockBase}/api/store/certificate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agentClientId: client.id,
      partners: [{ storeUserId: 'x', storeName: 'X', isSelfScan: false, categories: [] }],
    }),
  });
  if (cert.status !== 201) throw new Error(`mock_cert_create_${cert.status}`);
  const certBody = await cert.json();
  const detail = await fetch(`${mockBase}/api/pro/agent-clients/${client.id}`);
  const detailBody = await detail.json();
  const linked = detailBody.certificates?.some((c) => c.id === certBody.id);
  if (!linked) throw new Error('mock_cert_not_in_detail_get');
  return {
    clientId: client.id,
    certificateId: certBody.id,
    need: detailBody.client.need,
    note: detailBody.client.note,
    boundary: 'stateful_mock_bff_not_db',
  };
}

async function main() {
  verifyLoginEntryPrototypeTarball(ROOT);
  assertCleanTree(ROOT);

  const provenance = collectPrefillProvenance(ROOT, DIST);
  if (process.env.R06_FORCE_BUILD === '1') {
    const { rmSync } = await import('node:fs');
    rmSync(path.join(ROOT, DIST), { recursive: true, force: true });
  }
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'failed') throw new Error(`build_failed:${build.exitCode}`);

  const codeSha = gitRevParse(ROOT);
  const OUT = path.join(ROOT, ARTIFACT_ROOT, codeSha.slice(0, 12));
  mkdirSync(OUT, { recursive: true });

  const mock = await startPartnersSharedMockBff(createPartnersMockState('specialist'));
  const linked = await runMockLinkedScenario(mock.baseUrl);

  const platformPort = await findFreeLoopbackPort(30740, { maxScan: 40 });
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const envPin = pinProductionEnvLocal(ROOT, appOrigin, mock.baseUrl);
  const serverHandle = spawnOwnedNextStart({
    port: platformPort,
    cwd: ROOT,
    env: {
      ...process.env,
      LOGIN_ENTRY_NEXT_DIST_DIR: DIST,
      NEXT_PUBLIC_APP_URL: appOrigin,
      REMCARD_API_BASE_URL: mock.baseUrl,
      REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN: '1',
      NODE_ENV: 'production',
      PORT: String(platformPort),
    },
  });

  ensureLoginEntryPrototypeExtracted(ROOT, PROTO_DIR);
  const refStatic = await startLoginEntryPrototypeStatic(PROTO_DIR);
  const browser = await chromium.launch({ headless: true });
  const pairs = [];

  try {
    if (!(await waitForHttp(`${appOrigin}/login`))) throw new Error('impl_not_ready');
    const runtimeBuildId = await probeRuntimeBuildId(appOrigin, build.buildId);
    if (runtimeBuildId !== build.buildId) throw new Error('runtime_build_id_mismatch');

    const implPage = await browser.newPage();
    const refPage = await browser.newPage();

    for (const spec of CLIENTS_MATRIX) {
      const implName = `impl-specialist-clients-${spec.id}.png`;
      const refName = `ref-specialist-clients-${spec.id}.png`;
      const implPath = path.join(OUT, implName);
      const refPath = path.join(OUT, refName);
      await prepareImpl(implPage, appOrigin, spec);
      await implPage.screenshot({ path: implPath, fullPage: false });
      let refError = null;
      try {
        await captureRef(refPage, refStatic.baseUrl, spec, refPath);
      } catch (e) {
        refError = String(e?.message || e);
      }
      pairs.push({
        id: spec.id,
        panel: spec.panel,
        width: spec.width,
        height: spec.height,
        theme: spec.theme,
        impl: implPath,
        ref: refError ? null : refPath,
        refError,
      });
    }

    await implPage.close();
    await refPage.close();
  } finally {
    await browser.close();
    refStatic.server.close();
    await stopOwnedServer(serverHandle);
    envPin.restore();
    await mock.close();
  }

  const report = {
    task: 'SPECIALIST-CLIENTS-IMPLEMENT-01.2',
    generatedAt: new Date().toISOString(),
    codeSha,
    build: { status: build.status, buildId: build.buildId, distDir: DIST },
    refProtoSha256: '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d',
    linkedScenario: linked,
    pairs,
    note: 'Mock BFF linked scenario; backend PG integration test is separate (ownerClientsSpecialistCertificateLink.integration.test.ts).',
  };
  writeFileSync(path.join(OUT, 'SPECIALIST-CLIENTS-IMPLEMENT-01-2.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, out: OUT, pairs: pairs.length, linked }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
