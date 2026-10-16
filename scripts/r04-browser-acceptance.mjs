#!/usr/bin/env node
/**
 * R04 browser + BFF acceptance (disposable admin test stack).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { finishAgentProfileInBrowser } from './lib/r03-stack-bootstrap.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || '/tmp/admin-test-local-stack';
const ARTIFACT_DIR = path.join(ROOT, 'artifacts/remcard-r04');
const SHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');
/** Partial run snapshot for failure reporting */
let lastResultsSnapshot = null;

function loadRuntimeEnv() {
  const envPath = path.join(RUN_DIR, 'runtime.env');
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function cookieHeader(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

async function bffJson(platformOrigin, cookies, upstreamPath, init = {}) {
  const res = await fetch(`${platformOrigin}/api/remcard${upstreamPath}`, {
    ...init,
    headers: {
      Cookie: cookieHeader(cookies),
      Origin: platformOrigin,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function waitForTestSession(context, platformOrigin, ms = 45_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const cookies = await context.cookies();
    const me = await bffJson(platformOrigin, cookies, '/api/auth/me');
    if (me.body?.profTestSession?.active && me.body?.user?.isProfTestUser) return me;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function adminLogin(page, platformOrigin, creds) {
  await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('[data-testid="admin-login-pending"]').waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => null);
  const usernameInput = page.locator('input[autocomplete="username"]');
  await usernameInput.waitFor({ state: 'visible', timeout: 120_000 });
  await usernameInput.fill(creds.login);
  await page.locator('input[autocomplete="current-password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 120_000 });
  await page.getByRole('heading', { name: 'Тестовые пользователи' }).waitFor({ timeout: 30_000 });
}

async function createTestUser(page, kind, displayName) {
  const createPanel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Создать' }) });
  await createPanel.getByLabel('Тип').selectOption(kind);
  await createPanel.getByLabel('Имя').fill(displayName);
  await createPanel.getByRole('button', { name: 'Создать' }).click();
  await page.locator('li').filter({ hasText: displayName }).waitFor({ timeout: 30_000 });
}

async function enterTestUser(page, displayName) {
  const card = page.locator('li').filter({ hasText: displayName });
  const enterWait = page.waitForResponse(
    (r) => r.url().includes('/test-users/') && r.url().includes('/enter') && r.status() === 200,
    { timeout: 45_000 },
  );
  await card.getByRole('button', { name: 'Открыть ЛК' }).click();
  await enterWait;
  await page.waitForLoadState('networkidle');
}

async function shot(page, name, width, colorScheme = 'light') {
  await page.setViewportSize({ width, height: colorScheme === 'dark' ? 900 : 812 });
  if (colorScheme === 'dark') {
    await page.emulateMedia({ colorScheme: 'dark' });
  } else {
    await page.emulateMedia({ colorScheme: 'light' });
  }
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(SHOT_DIR, `impl-${name}-${width}-${colorScheme}.png`),
    fullPage: true,
  });
}

async function main() {
  const platBuild = spawnSync('pnpm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8' });
  const navBuild = spawnSync('npm', ['run', 'build'], { cwd: NAV_ROOT, encoding: 'utf8' });
  spawnSync('node', ['scripts/admin-test-local-stack.mjs'], { cwd: ROOT, encoding: 'utf8' });
  const runtimeEnv = loadRuntimeEnv();
  spawnSync('pnpm', ['exec', 'tsx', 'scripts/admin-test-012-lifecycle.ts', '--fixtures-only'], {
    cwd: NAV_ROOT,
    env: { ...process.env, ...runtimeEnv },
    encoding: 'utf8',
  });

  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const platformOrigin = meta.platformOrigin;
  const navOrigin = meta.navOrigin;
  mkdirSync(SHOT_DIR, { recursive: true });

  const creds = {
    login: process.env.ADMIN_TEST_LOGIN?.trim() || 'e2e-admin@remcard.test',
    password: process.env.ADMIN_TEST_PASSWORD?.trim() || 'E2E-Admin-Pass-12chars',
  };
  const runTag = `R04 ${Date.now()}`;
  const agentDisplayName = `${runTag} · Агент`;
  const storeDisplayName = `${runTag} · Магазин`;
  const steps = [];
  const functional = { testPublicLinkHidesTerms: false, linkInviteCreate: false };
  const captured = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());

  await adminLogin(page, platformOrigin, creds);
  await createTestUser(page, 'agent', agentDisplayName);
  await createTestUser(page, 'store', storeDisplayName);
  await enterTestUser(page, agentDisplayName);

  const testMe = await waitForTestSession(context, platformOrigin);
  if (!testMe?.body?.user?.id) throw new Error('test_session_not_active');
  const agentId = testMe.body.user.id;
  steps.push({ step: 'test_session', ok: true, agentId });

  let cookies = await context.cookies();
  await finishAgentProfileInBrowser(page, platformOrigin, cookieHeader(cookies));
  cookies = await context.cookies();

  const seed = spawnSync(
    'pnpm',
    ['exec', 'tsx', 'scripts/r04ParityPartnerSeed.ts', agentId],
    { cwd: NAV_ROOT, env: { ...process.env, ...runtimeEnv }, encoding: 'utf8' },
  );
  const seedPayload = JSON.parse((seed.stdout || '').trim().split('\n').pop() || '{}');
  steps.push({ step: 'partner_seed', exitCode: seed.status, stdout: (seed.stdout || '').slice(0, 200) });

  const list1 = await bffJson(platformOrigin, cookies, '/api/partnership/list');
  functional.listAfterSeed = list1.status === 200 && (list1.body?.partnerships?.length ?? 0) > 0;

  const partnershipId =
    seedPayload.archiveTargetId ||
    list1.body?.partnerships?.find(
      (p) => p.status === 'ACTIVE' && p.storeUser?.displayName === 'Дом материалов',
    )?.id;
  if (partnershipId) {
    const prefAlias = await bffJson(
      platformOrigin,
      cookies,
      `/api/pro/partnership-list-preferences/${partnershipId}`,
      { method: 'PATCH', body: JSON.stringify({ personalAlias: 'Мой алиас R04' }) },
    );
    const prefArchive = await bffJson(
      platformOrigin,
      cookies,
      `/api/pro/partnership-list-preferences/${partnershipId}`,
      { method: 'PATCH', body: JSON.stringify({ archived: true }) },
    );
    const list2 = await bffJson(platformOrigin, cookies, '/api/partnership/list');
    const archivedRow = list2.body?.partnerships?.find((p) => p.id === partnershipId);
    functional.aliasArchivePersist =
      prefAlias.status === 200 &&
      prefArchive.status === 200 &&
      archivedRow?.listPreference?.archivedAt != null;
    steps.push({
      step: 'preference_patch',
      aliasStatus: prefAlias.status,
      archiveStatus: prefArchive.status,
    });
  }

  await page.goto(`${platformOrigin}/partners`, { waitUntil: 'networkidle' });
  functional.listToolbarVisible =
    (await page.locator('[data-testid="agent-r04-list-toolbar"]').count()) > 0;
  functional.discoveryFiltersVisible =
    (await page.locator('[data-testid="agent-partner-discovery-filters"]').count()) > 0;

  await page.locator('[data-testid="agent-r04-view-toggle"]').getByRole('button', { name: 'Карточки' }).click();
  await page.waitForTimeout(350);
  functional.cardsViewActive =
    (await page.locator('[data-testid="agent-r04-partners-cards"]').count()) > 0 ||
    (await page
      .locator('[data-testid="agent-r04-view-toggle"] button[aria-pressed="true"]')
      .filter({ hasText: 'Карточки' })
      .count()) > 0;
  await page.locator('[data-testid="agent-r04-view-toggle"]').getByRole('button', { name: 'Список' }).click();

  await page.locator('[data-testid="agent-r04-list-search"]').fill('zzzz-no-match');
  await page.waitForTimeout(300);
  functional.filterZeroShowsToolbar =
    (await page.locator('[data-testid="agent-r04-list-toolbar"]').count()) > 0 &&
    (await page.getByText('Записей не найдено').count()) > 0;
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await page.waitForTimeout(400);
  functional.filterResetRestoresList =
    (await page.getByText('Записей не найдено').count()) === 0 &&
    (await page.locator('[data-testid="agent-r04-list-toolbar"]').count()) > 0;

  await page.locator('[data-testid="agent-r04-view-toggle"]').getByRole('button', { name: 'Список' }).click().catch(() => null);

  if (partnershipId && functional.aliasArchivePersist) {
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-testid="list-archive-view"]').selectOption('archive');
    await page.waitForTimeout(500);
    functional.archiveViewShowsRow =
      (await page.getByText('Мой алиас R04').count()) > 0;
    await bffJson(
      platformOrigin,
      cookies,
      `/api/pro/partnership-list-preferences/${partnershipId}`,
      { method: 'PATCH', body: JSON.stringify({ archived: false }) },
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-testid="list-archive-view"]').selectOption('active');
    await page.waitForTimeout(400);
    functional.aliasVisibleAfterReload =
      (await page.getByText('Мой алиас R04').count()) > 0;
  } else {
    functional.archiveViewShowsRow = false;
    functional.aliasVisibleAfterReload = false;
  }

  await shot(page, 'partners-list', 1440, 'light');
  captured.push('impl-partners-list-1440-light.png');
  await page.locator('[data-testid="agent-r04-view-toggle"]').getByRole('button', { name: 'Карточки' }).click();
  await shot(page, 'partners-cards', 1440, 'light');
  captured.push('impl-partners-cards-1440-light.png');
  await page.locator('[data-testid="agent-r04-view-toggle"]').getByRole('button', { name: 'Список' }).click();
  await page.getByRole('button', { name: /Найти или пригласить партнёра/i }).click();
  await page.locator('[data-testid="agent-partner-hub-modal"]').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForTimeout(800);
  await shot(page, 'partners-find', 1440, 'light');
  captured.push('impl-partners-find-1440-light.png');
  await page.goto(`${platformOrigin}/partners`, { waitUntil: 'networkidle' });
  const invitationsTab = page.locator('[data-testid="agent-r04-partners"]').getByRole('tab', { name: 'Приглашения' });
  functional.invitationsSegmentVisible = (await invitationsTab.count()) > 0;
  if (functional.invitationsSegmentVisible) {
    await invitationsTab.click();
    await page.waitForTimeout(400);
    await shot(page, 'partners-invitations', 1440, 'light');
    captured.push('impl-partners-invitations-1440-light.png');
  }
  await shot(page, 'partners-list', 375, 'light');
  captured.push('impl-partners-list-375-light.png');
  await page.emulateMedia({ colorScheme: 'dark' });
  await shot(page, 'partners-list', 1440, 'dark');
  captured.push('impl-partners-list-1440-dark.png');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${platformOrigin}/partners`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOT_DIR, 'impl-partners-320-light.png'), fullPage: true });
  captured.push('impl-partners-320-light.png');

  const linkCreate = await bffJson(platformOrigin, cookies, '/api/partnership/link-invite', {
    method: 'POST',
    body: JSON.stringify({
      intendedPartnerType: 'STORE',
      terms: [{ category: 'doors', storePercent: 10, isExcluded: false }],
      note: 'test note',
    }),
  });
  functional.linkInviteCreate = linkCreate.status === 200 && Boolean(linkCreate.body?.token);
  steps.push({ step: 'link_invite_create', status: linkCreate.status, error: linkCreate.body?.error });
  if (linkCreate.body?.token) {
    const anonPreview = await fetch(
      `${navOrigin}/api/partnership/link-invite/public/${encodeURIComponent(linkCreate.body.token)}`,
    ).then((r) => r.json());
    functional.testPublicLinkHidesTerms =
      anonPreview.status === 'PENDING' && !anonPreview.terms && anonPreview.note == null;
  }

  const listFresh = await bffJson(platformOrigin, cookies, '/api/partnership/list');
  const pendingIncoming = (listFresh.body?.partnerships ?? []).find(
    (p) =>
      (p.status === 'PENDING' || p.status === 'INVITED') &&
      (p.storeUser?.displayName === 'Свет и электрика' ||
        (p.initiatedBy && p.initiatedBy !== agentId)),
  );
  if (pendingIncoming?.id) {
    const acceptIncoming = await bffJson(
      platformOrigin,
      cookies,
      `/api/partnership/${pendingIncoming.id}`,
      { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) },
    );
    functional.incomingInviteAccept = acceptIncoming.status === 200;
    const listAfterAccept = await bffJson(platformOrigin, cookies, '/api/partnership/list');
    const acceptedRow = (listAfterAccept.body?.partnerships ?? []).find(
      (p) => p.id === pendingIncoming.id,
    );
    functional.incomingBecomesActive =
      listAfterAccept.status === 200 && acceptedRow?.status === 'ACTIVE';
    const acceptedPartnerName =
      acceptedRow?.storeUser?.displayName?.trim() ||
      pendingIncoming.storeUser?.displayName?.trim() ||
      'Свет и электрика';
    const acceptedStoreUserId = acceptedRow?.storeUser?.id ?? pendingIncoming.storeUser?.id ?? null;
    const availPartners = await bffJson(
      platformOrigin,
      cookies,
      '/api/store/certificate/available-partners',
    );
    functional.r03AcceptedPartnerInAvailableApi =
      availPartners.status === 200 &&
      (availPartners.body?.partners ?? []).some(
        (p) =>
          p.storeUserId === acceptedStoreUserId ||
          (p.storeName && String(p.storeName).includes(acceptedPartnerName)),
      );
    await page.goto(`${platformOrigin}/certificates/new`, { waitUntil: 'networkidle', timeout: 90_000 });
    functional.r03CreatePartnerFieldVisible =
      (await page.getByRole('heading', { name: 'Партнёры' }).count()) > 0;
    functional.r03AcceptedPartnerOnCreateForm =
      functional.r03CreatePartnerFieldVisible &&
      functional.incomingBecomesActive &&
      (await page.locator('label').filter({ hasText: acceptedPartnerName }).count()) > 0;
  } else {
    functional.incomingInviteAccept = false;
    functional.incomingBecomesActive = false;
    functional.r03CreatePartnerFieldVisible = false;
    functional.r03AcceptedPartnerInAvailableApi = false;
    functional.r03AcceptedPartnerOnCreateForm = false;
  }

  await browser.close();

  const migrateBefore = spawnSync('node', ['scripts/prof-r04-migrate.mjs', '--phase=before'], {
    cwd: NAV_ROOT,
    env: { ...process.env, ...runtimeEnv },
    encoding: 'utf8',
  });
  const migrateApply = spawnSync('node', ['scripts/prof-r04-migrate.mjs', '--phase=apply', '--apply'], {
    cwd: NAV_ROOT,
    env: { ...process.env, ...runtimeEnv },
    encoding: 'utf8',
  });
  const migrateAfter = spawnSync('node', ['scripts/prof-r04-migrate.mjs', '--phase=after'], {
    cwd: NAV_ROOT,
    env: { ...process.env, ...runtimeEnv },
    encoding: 'utf8',
  });
  steps.push(
    { step: 'migrate_before', exitCode: migrateBefore.status },
    { step: 'migrate_apply', exitCode: migrateApply.status },
    { step: 'migrate_after', exitCode: migrateAfter.status },
  );
  functional.migrateOk =
    migrateApply.status === 0 && migrateBefore.status === 0 && migrateAfter.status === 0;

  const r04Status = await bffJson(platformOrigin, cookies, '/api/pro/r04/status');
  functional.r04GateOn = r04Status.status === 200 && r04Status.body?.featureEnabled === true;
  functional.r04Eligible = r04Status.status === 200 && r04Status.body?.eligible === true;

  const pass =
    functional.listAfterSeed &&
    functional.listToolbarVisible &&
    functional.discoveryFiltersVisible &&
    functional.cardsViewActive &&
    functional.filterZeroShowsToolbar &&
    functional.filterResetRestoresList &&
    functional.aliasArchivePersist &&
    functional.archiveViewShowsRow &&
    functional.aliasVisibleAfterReload &&
    functional.linkInviteCreate &&
    functional.testPublicLinkHidesTerms &&
    functional.incomingInviteAccept &&
    functional.incomingBecomesActive &&
    functional.r03CreatePartnerFieldVisible &&
    functional.r03AcceptedPartnerInAvailableApi &&
    functional.r03AcceptedPartnerOnCreateForm &&
    functional.migrateOk &&
    functional.r04GateOn &&
    functional.r04Eligible;

  const results = {
    generatedAt: new Date().toISOString(),
    platformHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
    navigatorHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: NAV_ROOT, encoding: 'utf8' }).stdout.trim(),
    platformOrigin,
    commands: [
      { cmd: 'pnpm run build (platform)', exitCode: platBuild.status ?? 1 },
      { cmd: 'npm run build (navigator)', exitCode: navBuild.status ?? 1 },
      { cmd: 'node scripts/r04-browser-acceptance.mjs', exitCode: pass ? 0 : 1 },
      { cmd: 'node scripts/prof-r04-migrate.mjs --phase=before', exitCode: migrateBefore.status },
      { cmd: 'node scripts/prof-r04-migrate.mjs --phase=apply --apply', exitCode: migrateApply.status },
      { cmd: 'node scripts/prof-r04-migrate.mjs --phase=after', exitCode: migrateAfter.status },
    ],
    functional,
    captured,
    geometry: { note: 'Run node scripts/r04-ui-parity-visual.mjs for bounds + ref pairs' },
    visualReview: { status: 'run_r04-ui-parity-visual', implCaptures: captured.length },
    steps,
    pass,
  };
  lastResultsSnapshot = results;
  writeFileSync(path.join(ARTIFACT_DIR, 'TEST-RESULTS.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  if (lastResultsSnapshot) {
    lastResultsSnapshot.error = String(e);
    writeFileSync(path.join(ARTIFACT_DIR, 'TEST-RESULTS.json'), JSON.stringify(lastResultsSnapshot, null, 2));
  }
  process.exit(1);
});
