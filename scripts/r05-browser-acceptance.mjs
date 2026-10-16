#!/usr/bin/env node
/**
 * R05 agent receivables: API + browser smoke on disposable admin stack.
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { finishAgentProfileInBrowser } from './lib/r03-stack-bootstrap.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || '/tmp/admin-test-local-stack';
const ART = path.join(ROOT, 'artifacts/remcard-r05');
const REF_ROOT =
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';
const P0_STORE_USER_ID = 'm1fix-store-000000000001';

async function ensureLight(page) {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = 'light';
  });
}

async function ensureDark(page) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  });
}

async function isLightBackground(page) {
  return page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return true;
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return (r + g + b) / 3 > 128;
  });
}

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

/** Detail evidence: viewport scroll top + panel crop (avoids sticky chrome over data). */
async function shotOrderDetailEvidence(page, filePath) {
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  const detail = page.getByTestId('agent-r05-order-detail');
  await detail.waitFor({ state: 'visible', timeout: 60_000 });
  await detail.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await page.waitForTimeout(150);
  await detail.screenshot({ path: filePath });
  return { path: filePath, sha256: sha256File(filePath) };
}

const REF_PROTOTYPE_ERROR = 'Не удалось загрузить прототип';

function refContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

function startRefStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const root = path.resolve(rootDir);
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
        const rel = urlPath === '/' ? '/roles.html' : urlPath;
        const filePath = path.normalize(path.join(root, rel));
        if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, { 'Content-Type': refContentType(filePath) });
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(500);
        res.end();
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function refHasPrototypeError(page) {
  const text = await page.locator('#app').innerText().catch(() => '');
  return text.includes(REF_PROTOTYPE_ERROR);
}

async function clickRefControl(locator) {
  try {
    await locator.click({ timeout: 5000 });
  } catch {
    await locator.click({ force: true });
  }
}

async function navigateReferenceWallet(refPage, baseUrl) {
  await refPage.goto(`${baseUrl}/roles.html`, { waitUntil: 'networkidle', timeout: 120_000 });
  if (await refHasPrototypeError(refPage)) {
    return { ok: false, reason: 'prototype_load_error' };
  }
  const cabinetBtn = refPage.getByTestId('view-cabinet');
  if ((await cabinetBtn.getAttribute('aria-pressed')) !== 'true') {
    await clickRefControl(cabinetBtn);
  }
  await refPage.getByTestId('scenario-role').selectOption('agent');
  await clickRefControl(refPage.getByTestId('nav-wallet'));
  await refPage.locator('[data-testid="settlement-direction:in"]').waitFor({ timeout: 60_000 });
  await refPage.addStyleTag({
    content: '.demo-top, .review-toolbar { display: none !important; }',
  });
  if (await refHasPrototypeError(refPage)) {
    return { ok: false, reason: 'prototype_error_after_nav' };
  }
  const demo = (await refPage.locator('[data-testid="settlement-demo"]').count()) > 0;
  const tile = (await refPage.locator('[data-testid="settlement-direction:in"]').count()) > 0;
  return { ok: demo && tile, reason: demo && tile ? null : 'missing_wallet_states' };
}

async function ensureRefPrototypeTheme(refPage, theme) {
  await refPage.emulateMedia({ colorScheme: theme });
  const current =
    (await refPage.evaluate(() => document.documentElement.getAttribute('data-theme'))) || 'light';
  if (current !== theme) {
    await clickRefControl(refPage.locator('[data-action="theme"]'));
    await refPage.waitForFunction(
      (t) => document.documentElement.getAttribute('data-theme') === t,
      theme,
      { timeout: 15_000 },
    );
  }
}

async function readRefSettlementTheme(refPage) {
  return refPage.evaluate(() => {
    const dataTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const demo = document.querySelector('[data-testid="settlement-demo"]');
    const bg = demo ? getComputedStyle(demo).backgroundColor : '';
    const color = demo ? getComputedStyle(demo).color : '';
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const lum = m ? (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3 : 128;
    return { dataTheme, settlementBg: bg, settlementColor: color, settlementBgDark: lum < 128 };
  });
}

async function captureReferenceDrill375(refPage, shots, tag, theme) {
  await ensureRefPrototypeTheme(refPage, theme);
  const probe = await readRefSettlementTheme(refPage);
  const out = { captures: [], probe };
  await refPage.locator('[data-testid="settlement-direction:in"]').waitFor({ timeout: 30_000 });
  await refPage.locator('[data-testid="settlement-direction:in"]').click();
  await ensureRefPrototypeTheme(refPage, theme);
  await refPage.locator('.settlement-partner-compact').first().waitFor({ timeout: 30_000 });
  out.captures.push(await shot(refPage, path.join(shots, `ref-r05-partners-${tag}.png`)));
  await refPage.locator('.settlement-partner-compact').first().click();
  await ensureRefPrototypeTheme(refPage, theme);
  await refPage.locator('[data-testid^="settlement-record-"]').first().waitFor({ timeout: 30_000 });
  out.captures.push(await shot(refPage, path.join(shots, `ref-r05-orders-${tag}.png`)));
  const recordDetails = refPage.locator('.settlement-compact-record > details').first();
  await recordDetails.locator(':scope > summary').click();
  const orderBtn = recordDetails.locator('[data-testid^="settlement-order:"]').first();
  await orderBtn.waitFor({ state: 'visible', timeout: 30_000 });
  await orderBtn.click();
  await ensureRefPrototypeTheme(refPage, theme);
  await refPage.locator('[data-testid="settlement-reference"]').waitFor({ timeout: 30_000 });
  out.captures.push(await shot(refPage, path.join(shots, `ref-r05-order-detail-${tag}.png`)));
  out.probeAfter = await readRefSettlementTheme(refPage);
  return out;
}

async function verifyOrderDetailLayout(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="agent-r05-order-detail"]');
    if (!root) return { ok: false, reason: 'missing_detail_root' };
    const vw = window.innerWidth;
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const inViewport = (r) =>
      r && r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= vw + 1;
    const sum = box(root.querySelector('[data-testid="agent-r05-order-detail-sum"]'));
    const values = [...root.querySelectorAll('[data-testid="agent-r05-order-breakdown"] dd')].map(
      (el) => box(el),
    );
    const shell = box(root);
    const inShell = (r) =>
      r &&
      shell &&
      r.width > 0 &&
      r.height > 0 &&
      r.left >= shell.left - 1 &&
      r.right <= shell.right + 1;
    const pageWide = document.documentElement.scrollWidth > window.innerWidth + 2;
    const valuesOk = values.length >= 4 && values.every(inShell);
    return {
      ok: inShell(sum) && valuesOk && inViewport(shell) && !pageWide,
      viewportWidth: vw,
      pageWide,
      sum,
      values,
      shellRight: shell?.right ?? null,
    };
  });
}

async function captureImplDrill375(page, shots, tag, themeFn, platformOrigin, bulkPartnerLabel) {
  await themeFn(page);
  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.getByTestId('agent-r05-incoming-tile').click();
  await page.waitForTimeout(250);
  const out = [];
  out.push(await shot(page, path.join(shots, `impl-r05-partners-375-${tag}.png`)));
  await openPartnerOrders(page, bulkPartnerLabel);
  await page.getByTestId('agent-r05-order-card').first().waitFor({ timeout: 60_000 });
  out.push(await shot(page, path.join(shots, `impl-r05-orders-375-${tag}.png`)));
  const rich = pickRichOrderCard(page);
  const card =
    (await rich.count()) > 0 ? rich.first() : page.getByTestId('agent-r05-order-card').first();
  await waitForImplOrderDetail(page, card);
  out.push(await shotOrderDetailEvidence(page, path.join(shots, `impl-r05-order-detail-375-${tag}.png`)));
  return out;
}

async function waitForImplOrderDetail(page, cardLocator) {
  const card = cardLocator ?? page.getByTestId('agent-r05-order-card').first();
  await card.waitFor({ state: 'visible', timeout: 60_000 });
  const details = card.locator('details');
  const summary = card.locator('summary');
  if ((await details.getAttribute('open')) == null) {
    await summary.click();
  }
  const detailBtn = card.getByRole('button', { name: 'Подробности' });
  await detailBtn.waitFor({ state: 'visible', timeout: 30_000 });
  const detailResponse = page
    .waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        /\/agent-receivables\/orders\/[^/?]+/.test(r.url()) &&
        r.status() === 200,
      { timeout: 90_000 },
    )
    .catch(() => null);
  await detailBtn.click();
  await detailResponse;
  const error = page.getByTestId('agent-r05-order-detail-error');
  if (await error.isVisible().catch(() => false)) {
    const msg = await error.innerText().catch(() => 'order_detail_error');
    throw new Error(msg);
  }
  const detail = page.getByTestId('agent-r05-order-detail');
  await detail.waitFor({ timeout: 90_000 });
  await page.getByTestId('agent-r05-order-detail-heading').waitFor({ state: 'visible', timeout: 30_000 });
  await detail.getByTestId('agent-r05-order-lines-table').waitFor({ timeout: 30_000 });
  await detail.getByTestId('agent-r05-order-history').locator('li').first().waitFor({ timeout: 30_000 });
  const lineRows = await detail.locator('[data-testid="agent-r05-order-lines-table"] tbody tr').count();
  if (lineRows < 1) {
    throw new Error('order_detail_missing_category_lines');
  }
  return page.getByTestId('agent-r05-order-detail-heading').innerText();
}

function pickRichOrderCard(page) {
  const rich = page.getByTestId('agent-r05-order-card').filter({ hasText: /кров/i });
  return rich;
}

async function openPartnerOrders(page, preferredName) {
  const rows = page.getByTestId('agent-r05-partner-row');
  if (preferredName) {
    const named = rows.filter({ hasText: preferredName });
    if ((await named.count()) > 0) {
      await named.first().click();
      return;
    }
  }
  await rows.first().click();
}

async function readPartnerGridColumns(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="ledger-partners"]');
    if (!grid) return null;
    return getComputedStyle(grid).gridTemplateColumns;
  });
}

function gridHasColumnCount(columnsValue, count) {
  if (!columnsValue) return false;
  const parts = columnsValue.split(/\s+/).filter(Boolean);
  return parts.length === count;
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
  const nodeCheck = spawnSync('node', ['--check', 'scripts/r05-browser-acceptance.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (nodeCheck.status !== 0) {
    console.error(nodeCheck.stderr || nodeCheck.stdout);
    process.exit(1);
  }
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

  const p0Seed = spawnSync(
    'pnpm',
    ['exec', 'tsx', 'scripts/r05P0TwoCertAggregateSeed.ts', agentId],
    { cwd: NAV_ROOT, env: { ...process.env, ...runtimeEnv }, encoding: 'utf8' },
  );
  steps.push({ step: 'r05_p0_two_cert_seed', exitCode: p0Seed.status });

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

  const vitest = spawnSync(
    'npm',
    [
      'run',
      'test',
      '--',
      '--run',
      'src/lib/__tests__/agentReceivables.readmodel.test.ts',
      'src/lib/__tests__/agentReceivables.test.ts',
      'src/lib/__tests__/agentR05IncomingOnly.test.ts',
    ],
    { cwd: NAV_ROOT, encoding: 'utf8' },
  );

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

  const storeCards = (partnersFresh.body?.partners ?? []).filter(
    (p) => p.partnerId === P0_STORE_USER_ID,
  );
  functional.p0SingleM1Card = storeCards.length === 1;
  const storeCard = storeCards[0];
  const storeGroupKey = storeCard?.groupKey ?? '';
  const storeOrders = storeGroupKey
    ? await bffJson(
        platformOrigin,
        cookies,
        `/api/pro/wallet/agent-receivables/orders?page=1&pageSize=100&status=open&groupKey=${encodeURIComponent(storeGroupKey)}`,
      )
    : { status: 0, body: null };
  functional.p0DrilldownSumOk =
    storeOrders.status === 200 &&
    storeOrders.body?.meta?.selectionTotalKopecks === storeCard?.confirmedDebtKopecks &&
    (storeOrders.body?.meta?.totalRecords ?? 0) >= 2;
  functional.p0IncludesTwoCertMinimum =
    (storeCard?.confirmedDebtKopecks ?? 0) >= 30_000;

  const dueAsc = await bffJson(
    platformOrigin,
    cookies,
    '/api/pro/wallet/agent-receivables/partners?page=1&pageSize=25&status=open&sort=due-asc',
  );
  if ((dueAsc.body?.partners?.length ?? 0) >= 2) {
    const a = dueAsc.body.partners[0]?.earliestPurchaseAt ?? '';
    const b = dueAsc.body.partners[1]?.earliestPurchaseAt ?? '';
    functional.partnerDueAscOk = a <= b;
  } else {
    functional.partnerDueAscOk = dueAsc.status === 200;
  }

  const partnerId = partnersFresh.body?.partners?.[0]?.partnerId ?? '';
  const bulkPartner = [...(partnersFresh.body?.partners ?? [])].sort(
    (a, b) => (b.referenceOrderCount ?? 0) - (a.referenceOrderCount ?? 0),
  )[0];
  const bulkGroupKey = bulkPartner?.groupKey ?? '';
  const categorySearch = await bffJson(
    platformOrigin,
    cookies,
    `/api/pro/wallet/agent-receivables/orders?page=1&pageSize=25&status=open&groupKey=${encodeURIComponent(bulkGroupKey)}&q=${encodeURIComponent('кровля')}`,
  );
  functional.categorySearchOk =
    categorySearch.status === 200 && (categorySearch.body?.meta?.totalRecords ?? 0) >= 1;

  const pageCountEstimate = Math.ceil((bulkPartner?.referenceOrderCount ?? 0) / 25);
  const targetPage = Math.min(5, Math.max(1, pageCountEstimate));
  const pageFar = await bffJson(
    platformOrigin,
    cookies,
    `/api/pro/wallet/agent-receivables/orders?page=${targetPage}&pageSize=25&status=open&sort=debt-desc&groupKey=${encodeURIComponent(bulkGroupKey)}`,
  );
  functional.paginationPage5Ok =
    pageFar.status === 200 &&
    (pageFar.body?.meta?.pageCount ?? 0) >= 4 &&
    (pageFar.body?.orders?.length ?? 0) > 0;

  const settlements = await bffJson(platformOrigin, cookies, '/api/pro/wallet/settlements');
  functional.incomingOnlySettlements =
    settlements.status === 200 &&
    (settlements.body?.payable?.length ?? 0) === 0 &&
    String(settlements.body?.coverageNote ?? '').includes('R05');
  functional.settlementsStatus = settlements.status;
  functional.settlementsPayableCount = settlements.body?.payable?.length ?? null;

  const bulkPartnerLabel = bulkPartner?.displayName ?? '';

  const shots = path.join(ART, 'screenshots');
  mkdirSync(shots, { recursive: true });
  const captures = [];
  functional.orderDetail1440Loaded = false;
  functional.orderDetail375Loaded = false;
  functional.gridSmallDesktopOk = false;
  functional.gridMediumDesktopOk = false;
  functional.requisites375LightTokensOk = false;
  functional.requisites375DarkTokensOk = false;
  functional.detail375NoHorizontalScroll = false;
  functional.refRolesLoaded = false;
  functional.refPrototypeLoadError = true;
  functional.detail375LayoutOk = false;
  functional.detail375DarkLayoutOk = false;
  functional.detail320LayoutOk = false;
  functional.detail320DarkLayoutOk = false;
  functional.ref375DarkDistinctFromLight = false;

  await ensureLight(page);
  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  functional.overview1440LightThemeOk = await isLightBackground(page);
  captures.push(await shot(page, path.join(shots, 'impl-r05-overview-1440-light.png')));

  if (functional.tileVisible) {
    await page.getByTestId('agent-r05-incoming-tile').click();
    await page.waitForTimeout(400);
    captures.push(await shot(page, path.join(shots, 'impl-r05-partners-1440-light.png')));

    await page.getByTestId('ledger-view').selectOption('small');
    await page.waitForTimeout(250);
    const gridSmall = await readPartnerGridColumns(page);
    functional.gridSmallDesktopColumns = gridSmall;
    functional.gridSmallDesktopOk = gridHasColumnCount(gridSmall, 3);
    captures.push(await shot(page, path.join(shots, 'impl-r05-partners-1440-light-small.png')));
    await page.getByTestId('ledger-view').selectOption('medium');
    await page.waitForTimeout(250);
    const gridMedium = await readPartnerGridColumns(page);
    functional.gridMediumDesktopColumns = gridMedium;
    functional.gridMediumDesktopOk = gridHasColumnCount(gridMedium, 2);
    captures.push(await shot(page, path.join(shots, 'impl-r05-partners-1440-light-medium.png')));

    await page.getByTestId('ledger-view').selectOption('large');
    await page.waitForTimeout(200);
    captures.push(await shot(page, path.join(shots, 'impl-r05-partners-1440-light-large.png')));

    await openPartnerOrders(page, bulkPartnerLabel);
    await page.getByTestId('agent-r05-order-card').first().waitFor({ timeout: 60_000 });
    captures.push(await shot(page, path.join(shots, 'impl-r05-orders-1440-light.png')));

    const rich1440 = pickRichOrderCard(page);
    const card1440 =
      (await rich1440.count()) > 0 ? rich1440.first() : page.getByTestId('agent-r05-order-card').first();
    functional.orderDetail1440OrderNumber = await waitForImplOrderDetail(page, card1440);
    functional.orderDetail1440Loaded = functional.orderDetail1440OrderNumber.length > 0;
    captures.push(await shot(page, path.join(shots, 'impl-r05-order-detail-1440-light.png')));

    await page.getByRole('button', { name: '← Заказы партнёра' }).click();
    await page.waitForTimeout(200);
    functional.uiPaginationOk = (await page.getByTestId('ledger-pagination').count()) > 0;
    if (functional.uiPaginationOk) {
      await page.getByTestId('ledger-pagination').getByRole('button', { name: 'Далее' }).click();
      await page.waitForTimeout(300);
    }
  } else {
    functional.uiPaginationOk = false;
  }

  await ensureDark(page);
  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  captures.push(await shot(page, path.join(shots, 'impl-r05-overview-1440-dark.png')));

  await ensureLight(page);
  await page.setViewportSize({ width: 375, height: 812 });
  if (functional.tileVisible) {
    await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
    captures.push(await shot(page, path.join(shots, 'impl-r05-overview-375-light.png')));
    functional.overview375LightThemeOk = await isLightBackground(page);
    captures.push(
      ...(await captureImplDrill375(page, shots, 'light', ensureLight, platformOrigin, bulkPartnerLabel)),
    );
    functional.orderDetail375OrderNumber = await page
      .getByTestId('agent-r05-order-detail-heading')
      .innerText()
      .catch(() => '');
    functional.orderDetail375Loaded = functional.orderDetail375OrderNumber.length > 0;
    functional.detail375Layout = await verifyOrderDetailLayout(page);
    functional.detail375LayoutOk = functional.detail375Layout.ok === true;
    functional.detail375NoHorizontalScroll = functional.detail375Layout.pageWide !== true;

    captures.push(
      ...(await captureImplDrill375(page, shots, 'dark', ensureDark, platformOrigin, bulkPartnerLabel)),
    );
    functional.detail375DarkLayout = await verifyOrderDetailLayout(page);
    functional.detail375DarkLayoutOk = functional.detail375DarkLayout.ok === true;
  } else {
    functional.orderDetail375Loaded = false;
    functional.detail375NoHorizontalScroll = false;
    functional.detail375LayoutOk = false;
    functional.detail375DarkLayoutOk = false;
  }

  if (functional.tileVisible) {
    await ensureLight(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
    await page.getByTestId('agent-r05-incoming-tile').click();
    await openPartnerOrders(page, bulkPartnerLabel);
    await page.getByTestId('agent-r05-order-card').first().waitFor({ timeout: 60_000 });
    const rich320 = pickRichOrderCard(page);
    const card320 =
      (await rich320.count()) > 0 ? rich320.first() : page.getByTestId('agent-r05-order-card').first();
    await waitForImplOrderDetail(page, card320);
    functional.detail320Layout = await verifyOrderDetailLayout(page);
    functional.detail320LayoutOk = functional.detail320Layout.ok === true;
    functional.smoke320NoHorizontalScroll = functional.detail320Layout.pageWide !== true;
    functional.overview320LightThemeOk = await isLightBackground(page);
    captures.push(await shotOrderDetailEvidence(page, path.join(shots, 'impl-r05-order-detail-320-light.png')));

    await ensureDark(page);
    await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
    await page.getByTestId('agent-r05-incoming-tile').click();
    await openPartnerOrders(page, bulkPartnerLabel);
    await page.getByTestId('agent-r05-order-card').first().waitFor({ timeout: 60_000 });
    const rich320d = pickRichOrderCard(page);
    const card320d =
      (await rich320d.count()) > 0 ? rich320d.first() : page.getByTestId('agent-r05-order-card').first();
    await waitForImplOrderDetail(page, card320d);
    functional.detail320DarkLayout = await verifyOrderDetailLayout(page);
    functional.detail320DarkLayoutOk = functional.detail320DarkLayout.ok === true;
    captures.push(await shotOrderDetailEvidence(page, path.join(shots, 'impl-r05-order-detail-320-dark.png')));
  } else {
    await ensureLight(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
    functional.smoke320NoHorizontalScroll =
      (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)) ===
      true;
    functional.overview320LightThemeOk = await isLightBackground(page);
    captures.push(await shot(page, path.join(shots, 'impl-r05-overview-320-light.png')));
  }

  await ensureLight(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.getByTestId('agent-r05-tab-requisites').click();
  await page.getByTestId('bank-panel').waitFor({ timeout: 60_000 });
  functional.requisites375LightTokens = await page.evaluate(() => {
    const scope = document.querySelector('[data-testid="agent-r05-requisites-scope"]');
    if (!scope) return { ok: false, reason: 'missing_agent_scope' };
    const style = getComputedStyle(scope);
    const bg = style.getPropertyValue('--pw-bg').trim();
    const line = style.getPropertyValue('--pw-line').trim();
    const soft = style.getPropertyValue('--pw-2').trim();
    return {
      ok: bg.length > 0 && line.length > 0 && soft.length > 0,
      '--pw-bg': bg,
      '--pw-line': line,
      '--pw-2': soft,
    };
  });
  functional.requisites375LightTokensOk = functional.requisites375LightTokens.ok === true;
  captures.push(await shot(page, path.join(shots, 'impl-r05-requisites-375-light.png')));

  await ensureDark(page);
  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.getByTestId('agent-r05-tab-requisites').click();
  await page.getByTestId('bank-panel').waitFor({ timeout: 60_000 });
  functional.requisites375DarkTokens = await page.evaluate(() => {
    const scope = document.querySelector('[data-testid="agent-r05-requisites-scope"]');
    if (!scope) return { ok: false };
    const style = getComputedStyle(scope);
    const bg = style.getPropertyValue('--pw-bg').trim();
    return { ok: bg.length > 0, '--pw-bg': bg };
  });
  functional.requisites375DarkTokensOk = functional.requisites375DarkTokens.ok === true;
  captures.push(await shot(page, path.join(shots, 'impl-r05-requisites-375-dark.png')));

  const rolesJsPath = path.join(REF_ROOT, 'roles.js');
  functional.rolesJsSha256Ok =
    sha256File(rolesJsPath) === '0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc';

  const { server: refServer, baseUrl: refBaseUrl } = await startRefStaticServer(REF_ROOT);
  try {
    const refProbePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const navProbe = await navigateReferenceWallet(refProbePage, refBaseUrl);
    functional.refRolesLoaded = navProbe.ok;
    functional.refPrototypeLoadError = !navProbe.ok;
    functional.refNavReason = navProbe.reason;
    await refProbePage.close();

    const refPage375Light = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const nav375Light = await navigateReferenceWallet(refPage375Light, refBaseUrl);
    functional.ref375Loaded = nav375Light.ok;
    let refPartners375LightSha = '';
    let refPartners375DarkSha = '';
    if (nav375Light.ok) {
      await refPage375Light.setViewportSize({ width: 375, height: 812 });
      const lightPack = await captureReferenceDrill375(refPage375Light, shots, '375-light', 'light');
      functional.ref375LightThemeProbe = lightPack.probe;
      functional.ref375LightThemeOk =
        lightPack.probe.dataTheme === 'light' && lightPack.probe.settlementBgDark === false;
      captures.push(...lightPack.captures);
      refPartners375LightSha = sha256File(
        path.join(shots, 'ref-r05-partners-375-light.png'),
      );
    }
    await refPage375Light.close();

    const refPage375Dark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const nav375Dark = await navigateReferenceWallet(refPage375Dark, refBaseUrl);
    functional.ref375DarkLoaded = nav375Dark.ok;
    if (nav375Dark.ok) {
      await refPage375Dark.setViewportSize({ width: 375, height: 812 });
      const darkPack = await captureReferenceDrill375(refPage375Dark, shots, '375-dark', 'dark');
      functional.ref375DarkThemeProbe = darkPack.probeAfter ?? darkPack.probe;
      functional.ref375DarkThemeOk =
        functional.ref375DarkThemeProbe?.dataTheme === 'dark' &&
        functional.ref375DarkThemeProbe?.settlementBgDark === true;
      captures.push(...darkPack.captures);
      refPartners375DarkSha = sha256File(path.join(shots, 'ref-r05-partners-375-dark.png'));
    }
    await refPage375Dark.close();

    functional.ref375DarkDistinctFromLight =
      refPartners375LightSha.length > 0 &&
      refPartners375DarkSha.length > 0 &&
      refPartners375LightSha !== refPartners375DarkSha;
    functional.ref375DarkSha = {
      partnersLight: refPartners375LightSha,
      partnersDark: refPartners375DarkSha,
    };
  } finally {
    refServer.close();
  }

  await browser.close();

  functional.visualReferenceGateOk =
    functional.refRolesLoaded === true &&
    functional.rolesJsSha256Ok === true &&
    functional.refPrototypeLoadError !== true &&
    functional.orderDetail1440Loaded === true &&
    functional.orderDetail375Loaded === true &&
    functional.ref375DarkDistinctFromLight === true &&
    functional.ref375DarkThemeOk === true &&
    functional.ref375LightThemeOk === true;

  const pass =
    platBuild.status === 0 &&
    navBuild.status === 0 &&
    p0Seed.status === 0 &&
    seed.status === 0 &&
    vitest.status === 0 &&
    functional.r05GateOn &&
    functional.r05Eligible &&
    functional.overviewOk &&
    functional.tileVisible &&
    functional.partnersVisible &&
    functional.partnersApiOk &&
    functional.p0SingleM1Card &&
    functional.p0DrilldownSumOk &&
    functional.p0IncludesTwoCertMinimum &&
    functional.partnerDueAscOk &&
    functional.categorySearchOk &&
    functional.paginationPage5Ok &&
    functional.incomingOnlySettlements &&
    functional.uiPaginationOk &&
    functional.smoke320NoHorizontalScroll &&
    functional.overview1440LightThemeOk &&
    functional.overview375LightThemeOk &&
    functional.overview320LightThemeOk &&
    functional.visualReferenceGateOk &&
    functional.gridSmallDesktopOk &&
    functional.gridMediumDesktopOk &&
    functional.requisites375LightTokensOk &&
    functional.requisites375DarkTokensOk &&
    functional.detail375NoHorizontalScroll &&
    functional.detail375LayoutOk &&
    functional.detail375DarkLayoutOk &&
    functional.detail320LayoutOk &&
    functional.detail320DarkLayoutOk;

  const navDirty = spawnSync('git', ['status', '--porcelain'], { cwd: NAV_ROOT, encoding: 'utf8' })
    .stdout.trim();
  const platDirty = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout
    .trim();

  const results = {
    generatedAt: new Date().toISOString(),
    contractVersion: '2026-10-16.r05.4',
    platformHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
    navigatorHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: NAV_ROOT, encoding: 'utf8' }).stdout.trim(),
    gitDirty: { platform: platDirty.length > 0, navigator: navDirty.length > 0 },
    rolesJsReferenceSha256: '0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc',
    commands: [
      { cmd: 'node --check scripts/r05-browser-acceptance.mjs', exitCode: nodeCheck.status ?? 1 },
      { cmd: 'pnpm run build (platform)', exitCode: platBuild.status ?? 1 },
      { cmd: 'npm run build (navigator)', exitCode: navBuild.status ?? 1 },
      {
        cmd: 'npm run test -- --run agentReceivables*.test.ts (navigator)',
        exitCode: vitest.status ?? 1,
      },
      { cmd: 'node scripts/r05-browser-acceptance.mjs', exitCode: pass ? 0 : 1 },
    ],
    functional,
    steps,
    captures,
    sections: {
      '1_partner_aggregate':
        functional.p0SingleM1Card &&
        functional.p0DrilldownSumOk &&
        functional.p0IncludesTwoCertMinimum
          ? 'PASS'
          : 'FAIL',
      '2_partner_sort': functional.partnerDueAscOk ? 'PASS' : 'FAIL',
      '3_visual_reference':
        functional.visualReferenceGateOk &&
        functional.gridSmallDesktopOk &&
        functional.gridMediumDesktopOk &&
        functional.requisites375LightTokensOk &&
        functional.requisites375DarkTokensOk
          ? 'PASS'
          : 'FAIL',
      '4_evidence':
        functional.overview320LightThemeOk &&
        functional.overview375LightThemeOk &&
        functional.smoke320NoHorizontalScroll &&
        functional.uiPaginationOk &&
        functional.orderDetail375Loaded &&
        functional.detail375NoHorizontalScroll &&
        functional.detail375LayoutOk &&
        functional.detail375DarkLayoutOk &&
        functional.detail320LayoutOk &&
        functional.detail320DarkLayoutOk
          ? 'PASS'
          : 'FAIL',
    },
    pass,
    status: pass ? 'READY_FOR_REVIEW' : 'BLOCKED',
    visualParityOk: false,
    visualParityNote:
      'CAPTURED impl/ref drill PNGs (375 partners/orders/detail light+dark) with theme probes; not pixel-perfect.',
  };
  writeFileSync(path.join(ART, 'TEST-RESULTS.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
