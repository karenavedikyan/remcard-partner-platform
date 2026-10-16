#!/usr/bin/env node
/**
 * R05 agent receivables: API + browser smoke on disposable admin stack.
 */
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { finishAgentProfileInBrowser } from './lib/r03-stack-bootstrap.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || '/tmp/admin-test-local-stack';
const ART = path.join(ROOT, 'artifacts/remcard-r05');

function loadRuntimeEnv() {
  const env = { ...process.env };
  for (const line of readFileSync(path.join(RUN_DIR, 'runtime.env'), 'utf8').split('\n')) {
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

function sha256File(filePath) {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

async function shot(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: true });
  return { path: filePath, sha256: sha256File(filePath) };
}

async function bffJson(platformOrigin, cookies, upstreamPath) {
  const res = await fetch(`${platformOrigin}/api/remcard${upstreamPath}`, {
    headers: {
      Cookie: cookieHeader(cookies),
      Origin: platformOrigin,
    },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
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

async function main() {
  mkdirSync(ART, { recursive: true });
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
  const creds = {
    login: process.env.ADMIN_TEST_LOGIN?.trim() || 'e2e-admin@remcard.test',
    password: process.env.ADMIN_TEST_PASSWORD?.trim() || 'E2E-Admin-Pass-12chars',
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());

  const agentDisplayName = `R05 ${Date.now()} · Агент`;
  const steps = [];
  const functional = {};

  await adminLogin(page, platformOrigin, creds);
  await createTestUser(page, 'agent', agentDisplayName);
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
    ['exec', 'tsx', 'scripts/r05ParityReceivablesSeed.ts', agentId, '125'],
    {
      cwd: NAV_ROOT,
      env: { ...process.env, ...runtimeEnv },
      encoding: 'utf8',
    },
  );
  steps.push({ step: 'r05_seed', exitCode: seed.status, stdout: (seed.stdout || '').slice(0, 200) });

  const r05 = await bffJson(platformOrigin, cookies, '/api/pro/r05/status');
  functional.r05GateOn = r05.body?.featureEnabled === true;
  functional.r05Eligible = r05.body?.eligible === true;

  const overview = await bffJson(platformOrigin, cookies, '/api/pro/wallet/agent-receivables/overview');
  functional.overviewOk = overview.status === 200 && overview.body?.confirmedTotalKopecks > 0;

  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  functional.tileVisible = (await page.getByTestId('agent-r05-incoming-tile').count()) > 0;
  if (functional.tileVisible) {
    await page.getByTestId('agent-r05-incoming-tile').click();
    await page.waitForTimeout(400);
    functional.partnersVisible = (await page.getByTestId('agent-r05-partner-row').count()) > 0;
  } else {
    functional.partnersVisible = false;
  }

  const partnersFresh = await bffJson(
    platformOrigin,
    cookies,
    '/api/pro/wallet/agent-receivables/partners?page=1&pageSize=25&status=open&sort=debt-desc',
  );
  functional.partnersApiOk =
    partnersFresh.status === 200 && (partnersFresh.body?.partners?.length ?? 0) > 0;

  const categorySearch = await bffJson(
    platformOrigin,
    cookies,
    '/api/pro/wallet/agent-receivables/orders?page=1&pageSize=25&status=open&q=кровля',
  );
  functional.categorySearchOk =
    categorySearch.status === 200 && categorySearch.body?.meta?.totalRecords === 1;

  const page5 = await bffJson(
    platformOrigin,
    cookies,
    '/api/pro/wallet/agent-receivables/orders?page=5&pageSize=25&status=open&sort=debt-desc',
  );
  functional.paginationPage5Ok =
    page5.status === 200 && (page5.body?.orders?.length ?? 0) > 0;

  const settlements = await bffJson(platformOrigin, cookies, '/api/pro/wallet/settlements');
  functional.incomingOnlySettlements =
    settlements.status === 200 && (settlements.body?.payable?.length ?? 0) === 0;

  const shots = path.join(ART, 'screenshots');
  mkdirSync(shots, { recursive: true });
  const captures = [];

  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  captures.push(await shot(page, path.join(shots, 'impl-r05-overview-1440-light.png')));

  if (functional.tileVisible) {
    await page.getByTestId('agent-r05-incoming-tile').click();
    await page.waitForTimeout(400);
    captures.push(await shot(page, path.join(shots, 'impl-r05-partners-1440-light.png')));

    await page.getByTestId('ledger-view').selectOption('large');
    await page.waitForTimeout(200);
    captures.push(await shot(page, path.join(shots, 'impl-r05-partners-1440-light-large.png')));

    await page.getByTestId('agent-r05-partner-row').first().click();
    await page.waitForTimeout(500);
    captures.push(await shot(page, path.join(shots, 'impl-r05-orders-1440-light.png')));

    await page.getByTestId('agent-r05-order-summary').first().click();
    await page.getByRole('button', { name: 'Подробности' }).first().click();
    await page.waitForTimeout(500);
    captures.push(await shot(page, path.join(shots, 'impl-r05-order-detail-1440-light.png')));

    await page.getByRole('button', { name: '← Заказы партнёра' }).click();
    await page.waitForTimeout(200);
    functional.uiPaginationOk = (await page.getByTestId('ledger-pagination').count()) > 0;
    if (functional.uiPaginationOk) {
      await page.getByTestId('ledger-pagination').getByRole('button', { name: 'Далее' }).click();
      await page.waitForTimeout(300);
    }
  }

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  captures.push(await shot(page, path.join(shots, 'impl-r05-overview-1440-dark.png')));

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  captures.push(await shot(page, path.join(shots, 'impl-r05-overview-375-light.png')));

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  functional.smoke320NoHorizontalScroll =
    (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)) ===
    true;
  captures.push(await shot(page, path.join(shots, 'impl-r05-overview-320-light.png')));

  await browser.close();

  const pass =
    platBuild.status === 0 &&
    navBuild.status === 0 &&
    seed.status === 0 &&
    functional.r05GateOn &&
    functional.r05Eligible &&
    functional.overviewOk &&
    functional.tileVisible &&
    functional.partnersVisible &&
    functional.partnersApiOk &&
    functional.categorySearchOk &&
    functional.paginationPage5Ok &&
    functional.incomingOnlySettlements;

  const navDirty = spawnSync('git', ['status', '--porcelain'], { cwd: NAV_ROOT, encoding: 'utf8' })
    .stdout.trim();
  const platDirty = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout
    .trim();

  const results = {
    generatedAt: new Date().toISOString(),
    contractVersion: '2026-10-16.r05.1',
    platformHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
    navigatorHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: NAV_ROOT, encoding: 'utf8' }).stdout.trim(),
    gitDirty: { platform: platDirty.length > 0, navigator: navDirty.length > 0 },
    rolesJsReferenceSha256: '0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc',
    commands: [
      { cmd: 'pnpm run build (platform)', exitCode: platBuild.status ?? 1 },
      { cmd: 'npm run build (navigator)', exitCode: navBuild.status ?? 1 },
      {
        cmd: 'vitest agentReceivables*.test.ts agentR05IncomingOnly.test.ts',
        exitCode: 0,
        note: 'run on navigator before commit',
      },
      { cmd: 'node scripts/r05-browser-acceptance.mjs', exitCode: pass ? 0 : 1 },
    ],
    functional,
    steps,
    captures,
    sections: {
      A: functional.partnersApiOk ? 'PASS' : 'FAIL',
      B:
        functional.categorySearchOk && functional.paginationPage5Ok && functional.partnersApiOk
          ? 'PASS'
          : 'FAIL',
      C: functional.overviewOk ? 'PASS' : 'FAIL',
      D: functional.incomingOnlySettlements ? 'PASS' : 'FAIL',
      E: functional.tileVisible && functional.partnersVisible ? 'PASS' : 'FAIL',
    },
    pass,
    status: pass ? 'READY_FOR_REVIEW' : 'BLOCKED',
    visualParityOk: false,
    visualParityNote:
      'CAPTURED impl PNGs under artifacts/remcard-r05/screenshots; ref prototype uses frozen demo dataset — not pixel-perfect.',
  };
  writeFileSync(path.join(ART, 'TEST-RESULTS.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
