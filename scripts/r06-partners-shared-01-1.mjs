#!/usr/bin/env node
/**
 * PARTNERS-SHARED-PROTOTYPE-01.1 — eligible gate fix + functional MOCK + limited ref/impl.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
import { runClientsVisualCaptures } from './lib/r06-specialist-clients-visual.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R06_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const PROTO_DIR = process.env.R06_PROTO_DIR || '/tmp/r06-login-entry-prototype';
const CLIENTS_IMPLEMENT_01_4 = process.env.R06_CLIENTS_IMPLEMENT_01_4 === '1';
const CLIENTS_IMPLEMENT_01_3 = process.env.R06_CLIENTS_IMPLEMENT_01_3 === '1';
const CLIENTS_IMPLEMENT = CLIENTS_IMPLEMENT_01_4 || CLIENTS_IMPLEMENT_01_3;
const IMPLEMENT_01_1 = process.env.R06_IMPLEMENT_01_1 === '1';
const IMPLEMENT_01 = process.env.R06_IMPLEMENT_01 === '1' || IMPLEMENT_01_1;
const TASK = CLIENTS_IMPLEMENT_01_4
  ? 'SPECIALIST-CLIENTS-IMPLEMENT-01.4'
  : CLIENTS_IMPLEMENT_01_3
    ? 'SPECIALIST-CLIENTS-IMPLEMENT-01.3'
    : IMPLEMENT_01_1
  ? 'SPECIALIST-PARTNERS-IMPLEMENT-01.1'
  : IMPLEMENT_01
    ? 'SPECIALIST-PARTNERS-IMPLEMENT-01'
    : 'PARTNERS-SHARED-PROTOTYPE-01.1';
const ARTIFACT_ROOT = CLIENTS_IMPLEMENT_01_4
  ? 'artifacts/remcard-r06-specialist/specialist-clients-implement-01-4'
  : CLIENTS_IMPLEMENT_01_3
    ? 'artifacts/remcard-r06-specialist/specialist-clients-implement-01-3'
    : IMPLEMENT_01_1
    ? 'artifacts/remcard-r06-specialist/specialist-partners-implement-01-1'
    : IMPLEMENT_01
      ? 'artifacts/remcard-r06-specialist/specialist-partners-implement-01'
      : 'artifacts/remcard-r06-specialist/partners-shared-prototype-01-1';
const DIST =
  process.env.LOGIN_ENTRY_NEXT_DIST_DIR ||
  (CLIENTS_IMPLEMENT_01_4
    ? '.next-r06-specialist-clients-implement-01-4'
    : CLIENTS_IMPLEMENT_01_3
      ? '.next-r06-specialist-clients-implement-01-3'
      : IMPLEMENT_01_1
      ? '.next-r06-specialist-partners-implement-01-1'
      : IMPLEMENT_01
        ? '.next-r06-specialist-partners-implement-01'
        : '.next-r06-partners-shared-01-1');
const PUBLIC_ARTIFACT_ROOT = CLIENTS_IMPLEMENT_01_4
  ? '/opt/cursor/artifacts/specialist-clients-implement-01-4'
  : '/opt/cursor/artifacts/specialist-clients-implement-01-3';

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function loadNavigatorEnv() {
  const env = { ...process.env };
  const envPath = path.join(NAV_ROOT, '.env.local');
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx);
    env[key] = line.slice(idx + 1);
  }
  return env;
}

function runNavigatorClientsCertLink() {
  const navEnv = loadNavigatorEnv();
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', 'clients-cert-link'], {
    cwd: NAV_ROOT,
    env: navEnv,
    encoding: 'utf8',
  });
  const stdout = (res.stdout || '').trim();
  let parsed = null;
  try {
    parsed = JSON.parse(stdout.split('\n').filter(Boolean).at(-1) ?? '{}');
  } catch {
    parsed = { ok: false, error: 'parse_failed', raw: stdout.slice(-500) };
  }
  return {
    exitCode: res.status ?? 1,
    stderr: (res.stderr || '').slice(-800),
    result: parsed,
    navigatorSha: gitRevParse(NAV_ROOT),
  };
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
    boundary: 'stateful_mock_bff_not_navigator_handlers',
  };
}

function copyClientsArtifactsToPublic(outDir, codeSha, manifestName, manifest) {
  const pubDir = path.join(PUBLIC_ARTIFACT_ROOT, codeSha.slice(0, 12));
  mkdirSync(pubDir, { recursive: true });
  const copiedPairs = [];
  for (const p of manifest.pairs || []) {
    const row = { id: p.id, impl: null, ref: null, implSha256: null, refSha256: null };
    if (p.impl && existsSync(p.impl)) {
      const name = path.basename(p.impl);
      const dest = path.join(pubDir, name);
      copyFileSync(p.impl, dest);
      row.impl = dest;
      row.implSha256 = sha256File(dest);
    }
    if (p.ref && existsSync(p.ref)) {
      const name = path.basename(p.ref);
      const dest = path.join(pubDir, name);
      copyFileSync(p.ref, dest);
      row.ref = dest;
      row.refSha256 = sha256File(dest);
    }
    copiedPairs.push(row);
  }
  const pubManifest = { ...manifest, publicArtifactDir: pubDir, copiedPairs };
  writeFileSync(path.join(pubDir, manifestName), JSON.stringify(pubManifest, null, 2));
  writeFileSync(path.join(outDir, 'PUBLIC-ARTIFACT-DIR.txt'), pubDir);
  return pubDir;
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
    const shots = [
      { id: 'active-list', panel: 'list', width: 1440, height: 900, theme: 'light' },
      { id: 'inv-in', panel: 'inv-in', width: 1440, height: 900, theme: 'light' },
      { id: 'inv-out', panel: 'inv-out', width: 1440, height: 900, theme: 'light' },
      { id: 'find', panel: 'find', width: 1440, height: 900, theme: 'light' },
      { id: 'link', panel: 'link', width: 1440, height: 900, theme: 'light' },
      { id: 'active-375', panel: 'list', width: 375, height: 812, theme: 'light' },
      { id: 'find-375', panel: 'find', width: 375, height: 812, theme: 'light' },
    ];
    if (IMPLEMENT_01_1) {
      shots.push(
        { id: 'link-375', panel: 'link', width: 375, height: 812, theme: 'light' },
        { id: 'active-375-dark', panel: 'list', width: 375, height: 812, theme: 'dark' },
      );
    }
    return shots.map((s) => ({ ...s, audience, refRole, prefix }));
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
    await page
      .locator('[data-testid="agent-partner-hub-modal"] h2')
      .filter({ hasText: /Пригласить партнёра/i })
      .waitFor({ timeout: 10_000 });
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
  if (spec.panel === 'find') {
    await page.locator('#role-dialog[open]').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('[data-testid="directory-specialization"]').waitFor({ state: 'visible', timeout: 10_000 });
    const linkPressed = await page
      .locator('#role-dialog [data-action="external-partner"]')
      .first()
      .getAttribute('aria-pressed');
    if (linkPressed === 'true') throw new Error('ref_find_polluted_by_link_tab');
  }
  if (spec.panel === 'link') {
    await page.locator('#role-dialog[open]').waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByText(/ещё нет на платформе|Знакомого ещё нет/i).first().waitFor({ timeout: 10_000 });
    const findPressed = await page
      .locator('#role-dialog [data-action="partner-hub"]')
      .first()
      .getAttribute('aria-pressed');
    if (findPressed === 'true') throw new Error('ref_link_polluted_by_find_tab');
  }
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
  const onSearch = (req) => {
    if (req.url().includes('/api/partnership/search')) searchUrls.push(req.url());
  };
  page.on('request', onSearch);

  searchUrls.length = 0;
  await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
  await assertImplModal(page, 'find');
  await page.waitForTimeout(1200);
  page.off('request', onSearch);
  const roleParam = searchUrls.filter((u) => u.includes('role=')).at(-1);
  push(
    'search_role_query',
    Boolean(roleParam?.includes(`role=${expected.searchRole}`)),
    roleParam ?? 'no_search',
  );

  await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
  await page
    .locator('[data-testid="agent-r04-partners-table-row"]')
    .filter({ hasText: 'Магазин «Юг»' })
    .first()
    .waitFor({ timeout: 15_000 });
  push('active_partner_visible', true);

  await openImplR04Panel(page, 'invitations', origin);
  await page.locator('[data-testid="agent-invites-incoming"]').click();
  await page
    .locator('[data-testid="agent-r04-partners-table-row"]')
    .filter({ hasText: 'СтройДом' })
    .first()
    .waitFor({ timeout: 15_000 });
  push('incoming_from_counterparty', true);
  await page.locator('[data-testid="agent-invites-outgoing"]').click();
  await page
    .locator('[data-testid="agent-r04-partners-table-row"]')
    .filter({ hasText: 'ООО Ремонт+' })
    .first()
    .waitFor({ timeout: 15_000 });
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

  if (IMPLEMENT_01) {
    await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
    await assertImplModal(page, 'find');
    mock.state.searchFailOnce = true;
    await page
      .locator('[data-testid="agent-r04-modal-find"]')
      .getByRole('button', { name: /^Найти$/ })
      .click();
    const retryBtn = page
      .locator('[data-testid="agent-r04-modal-find"]')
      .getByRole('button', { name: 'Повторить' });
    await retryBtn.waitFor({ timeout: 20_000 });
    push('search_error_surface', true, 'retry-visible');
    mock.state.searchFailOnce = false;
    await retryBtn.click();
    await page.getByText('Партнёр из поиска').waitFor({ timeout: 20_000 });
    push('search_retry_recovery', true, 'result-visible');

    await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
    const title = (await page.locator('[data-testid="agent-partner-hub-modal"] h2').innerText()).trim();
    push('modal_title_find', title === 'Найти партнёра', title);

    await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Переименовать для себя' }).first().click();
    await page.locator('[data-testid="partner-personal-alias-dialog"]').waitFor({ state: 'visible' });
    let aliasDetail = '';
    try {
      await page.locator('[data-testid="partner-personal-alias-dialog"] input').fill('Мой юг');
      const patchWait = page.waitForResponse(
        (r) =>
          r.url().includes('partnership-list-preferences') &&
          r.request().method() === 'PATCH' &&
          r.status() < 500,
        { timeout: 20_000 },
      );
      await page
        .locator('[data-testid="partner-personal-alias-dialog"]')
        .getByRole('button', { name: 'Сохранить' })
        .click();
      const patchRes = await patchWait;
      aliasDetail = `patch=${patchRes.status()}`;
      await page.locator('[data-testid="partner-personal-alias-dialog"]').waitFor({
        state: 'hidden',
        timeout: 10_000,
      });
    } catch (e) {
      const errInDialog = await page
        .locator('[data-testid="partner-personal-alias-dialog"] [role=alert]')
        .textContent()
        .catch(() => '');
      aliasDetail = `${aliasDetail} ${errInDialog || String(e?.message || e)}`.trim();
      await page.keyboard.press('Escape').catch(() => null);
    }
    await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
    const aliasOk = await page
      .locator('[data-testid="agent-r04-partners-table-row"]')
      .filter({ hasText: 'Мой юг' })
      .count();
    push('alias_persist_reload', aliasOk > 0, aliasDetail || `rows=${aliasOk}`);

    if (IMPLEMENT_01_1 && expected.searchRole === 'pro') {
      mock.state.preferencePatchFailIds.add('ps-mock-active-1');
      await page.goto(`${origin}/partners`, { waitUntil: 'networkidle' });
      const rowCb = page
        .locator('[data-testid="agent-r04-partners-table-row"]')
        .first()
        .locator('input[type=checkbox]');
      await rowCb.check();
      await page.locator('[data-testid="agent-partner-bulk-bar"]').getByRole('button', { name: 'В архив' }).click();
      await page.locator('[data-testid="agent-partner-bulk-outcome"]').waitFor({ timeout: 15_000 });
      const outcomeText = await page.locator('[data-testid="agent-partner-bulk-outcome"]').innerText();
      push('bulk_outcome_visible', /Не удалось|Частично|Готово/i.test(outcomeText), outcomeText.slice(0, 80));
      mock.state.preferencePatchFailIds.delete('ps-mock-active-1');
      const retryBtn = page.getByRole('button', { name: /Повторить для неуспешных/i });
      if (await retryBtn.isVisible().catch(() => false)) {
        await retryBtn.click();
        await page.waitForTimeout(800);
        const afterRetry = await page.locator('[data-testid="agent-partner-bulk-outcome"]').innerText();
        push('bulk_retry_success', /Готово/i.test(afterRetry), afterRetry.slice(0, 80));
      } else {
        push('bulk_retry_success', false, 'no-retry-button');
      }

      await page.goto(`${origin}/partners?hub=link`, { waitUntil: 'networkidle' });
      await assertImplModal(page, 'link');
      await page
        .locator('[data-testid="agent-partner-hub-modal"] [data-testid="agent-r04-modal-link"] select')
        .first()
        .selectOption('STORE');
      const generalCb = page.getByRole('checkbox', { name: /Подтверждаю общие условия/i });
      if (await generalCb.isVisible().catch(() => false)) await generalCb.check();
      await page.getByRole('button', { name: 'Создать ссылку' }).click();
      await page.locator('[data-testid="link-invite-created"]').waitFor({ timeout: 25_000 });
      const linkVal = await page.locator('[data-testid="link-invite-created"] input').inputValue();
      push('link_invite_create', linkVal.includes('/invite/link/'), linkVal.slice(0, 60));
    }
  } else {
    mock.state.searchFailOnce = true;
    const callsBefore = mock.state.searchCalls;
    await page.goto(`${origin}/partners?hub=find`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    push(
      'search_error_surface',
      mock.state.searchCalls > callsBefore,
      `calls=${mock.state.searchCalls}`,
    );
    mock.state.searchFailOnce = false;
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    push(
      'search_retry_recovery',
      mock.state.searchCalls > callsBefore + 1,
      `calls=${mock.state.searchCalls}`,
    );
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
  const vitestFiles = [
    'src/lib/partners-hub-presentation.test.ts',
    'src/lib/partners-shared-ui-copy.test.ts',
    'src/components/partners/PartnersHub.test.tsx',
    'src/lib/agent-r04/partner-filters.test.ts',
    'src/lib/agent-r04/partner-list-row.test.ts',
    'src/lib/agent-r04/partnership-action-icons.test.ts',
    'src/lib/partnership-rules.test.ts',
  ];
  if (CLIENTS_IMPLEMENT) {
    vitestFiles.push('src/lib/agent-r03/clientListRow.test.ts');
  }
  const vitest = spawnSync('pnpm', ['exec', 'vitest', 'run', ...vitestFiles], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const tsxRules = spawnSync('npx', ['tsx', '--test', 'src/lib/partnership-rules.test.ts'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return {
    vitest: { exitCode: vitest.status ?? 1, stdout: vitest.stdout?.slice(-2000) },
    partnershipRulesTsx: { exitCode: tsxRules.status ?? 1, stdout: tsxRules.stdout?.slice(-1000) },
  };
}

async function runClientsImplement013Main() {
  verifyLoginEntryPrototypeTarball(ROOT);
  assertCleanTree(ROOT);
  const unit = runUnitTests();
  if (unit.vitest.exitCode !== 0 || unit.partnershipRulesTsx.exitCode !== 0) {
    throw new Error('unit_tests_failed');
  }

  const backendCertLink = runNavigatorClientsCertLink();

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
  let mockLinked = null;
  try {
    mockLinked = await runMockLinkedScenario(mock.baseUrl);
  } catch (e) {
    mockLinked = { ok: false, error: String(e?.message || e), boundary: 'stateful_mock_bff_not_navigator_handlers' };
  }

  const platformPort = await findFreeLoopbackPort(30750, { maxScan: 40 });
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
  let pairs = [];
  let runtimeBuildId = null;

  try {
    if (!(await waitForHttp(`${appOrigin}/login`))) throw new Error('impl_not_ready');
    runtimeBuildId = await probeRuntimeBuildId(appOrigin, build.buildId);
    if (runtimeBuildId !== build.buildId) throw new Error('runtime_build_id_mismatch');
    pairs = await runClientsVisualCaptures({
      browser,
      refBase: refStatic.baseUrl,
      appOrigin,
      outDir: OUT,
      mockState: mock.state,
    });
  } finally {
    await browser.close();
    refStatic.server.close();
    await stopOwnedServer(serverHandle);
    envPin.restore();
    await mock.close();
  }

  const pairsReport = pairs.map((p) => ({
    id: p.id,
    panel: p.panel,
    audience: p.audience,
    persona: p.persona ?? p.audience,
    width: p.width,
    height: p.height,
    theme: p.theme,
    impl: p.impl,
    ref: p.ref,
    implError: p.implError ?? null,
    refError: p.refError ?? null,
    implSha256: p.implSha256 ?? null,
    refSha256: p.refSha256 ?? null,
    emptyVerified: p.emptyVerified ?? null,
  }));

  const refFailures = pairsReport.filter((p) => p.refError || p.implError);
  const report = {
    task: TASK,
    generatedAt: new Date().toISOString(),
    codeSha,
    navigatorCodeSha: backendCertLink.navigatorSha,
    sourceTreeDigest: provenance.sourceTreeDigest,
    treeDirtyBeforeBuild: false,
    build: { status: build.status, exitCode: build.exitCode, buildId: build.buildId, distDir: DIST },
    runtimeVerified: { expected: build.buildId, actual: runtimeBuildId },
    refProtoSha256: '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d',
    unit,
    backendCertLinkScenario: backendCertLink,
    mockLinkedScenario: mockLinked,
    pairs: pairsReport,
    refFailureCount: refFailures.length,
    note: 'Backend cert link uses real Navigator route handlers + prof_r01_route_test_db; mock BFF chain is UI-only boundary.',
  };

  const manifestName = CLIENTS_IMPLEMENT_01_4
    ? 'SPECIALIST-CLIENTS-IMPLEMENT-01-4.json'
    : 'SPECIALIST-CLIENTS-IMPLEMENT-01-3.json';
  writeFileSync(path.join(OUT, manifestName), JSON.stringify(report, null, 2));
  const publicDir = copyClientsArtifactsToPublic(OUT, codeSha, manifestName, report);

  const ok =
    backendCertLink.exitCode === 0 &&
    backendCertLink.result?.ok === true &&
    refFailures.length === 0 &&
    build.status !== 'failed';

  console.log(
    JSON.stringify(
      {
        ok,
        out: OUT,
        publicArtifactDir: publicDir,
        codeSha,
        navigatorSha: backendCertLink.navigatorSha,
        buildId: build.buildId,
        refFailures: refFailures.map((p) => p.id),
        backendOk: backendCertLink.result?.ok ?? false,
      },
      null,
      2,
    ),
  );
  if (!ok) process.exit(1);
}

async function main() {
  if (CLIENTS_IMPLEMENT) {
    await runClientsImplement013Main();
    return;
  }
  verifyLoginEntryPrototypeTarball(ROOT);
  assertCleanTree(ROOT);
  const unit = runUnitTests();
  if (unit.vitest.exitCode !== 0 || unit.partnershipRulesTsx.exitCode !== 0) {
    throw new Error('unit_tests_failed');
  }

  const platformPort = await findFreeLoopbackPort(30720, { maxScan: 40 });
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  process.env.NEXT_PUBLIC_APP_URL = appOrigin;

  const provenance = collectPrefillProvenance(ROOT, DIST);
  if (process.env.R06_FORCE_BUILD === '1') {
    const { rmSync } = await import('node:fs');
    rmSync(path.join(ROOT, DIST), { recursive: true, force: true });
  }
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'skipped') {
    const allowSkip = (IMPLEMENT_01 || IMPLEMENT_01_1) && process.env.R06_ALLOW_BUILD_SKIP === '1';
    if (!allowSkip) throw new Error('build_skipped: set R06_FORCE_BUILD=1 for evidence run');
  }
  if (build.status === 'failed') throw new Error(`build_failed:${build.exitCode}`);

  const codeSha = gitRevParse(ROOT);
  const OUT = path.join(ROOT, ARTIFACT_ROOT, codeSha.slice(0, 12));
  mkdirSync(OUT, { recursive: true });

  ensureLoginEntryPrototypeExtracted(ROOT, PROTO_DIR);
  const refStatic = await startLoginEntryPrototypeStatic(PROTO_DIR);

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

  const manifestName = IMPLEMENT_01_1
    ? 'SPECIALIST-PARTNERS-IMPLEMENT-01-1.json'
    : IMPLEMENT_01
      ? 'SPECIALIST-PARTNERS-IMPLEMENT-01.json'
      : 'PARTNERS-SHARED-01-1.json';
  writeFileSync(path.join(OUT, manifestName), JSON.stringify(report, null, 2));
  const failed =
    functionalFlat.some((f) => f.status === 'FAIL') ||
    report.pairs.some((p) => p.refError && p.id === 'find');
  console.log(JSON.stringify({ ok: !failed, out: OUT, codeSha, buildId: build.buildId }, null, 2));
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
