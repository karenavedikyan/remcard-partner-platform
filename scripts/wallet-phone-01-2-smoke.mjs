#!/usr/bin/env node
/**
 * WALLET-PHONE-01.2: hydration mobile captures + BFF Excel download + phone Enter/save/reload.
 * Requires running disposable stack: ADMIN_TEST_RUN_DIR=/tmp/admin-test-local-stack
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || '/tmp/admin-test-local-stack';
const ART = path.join(ROOT, 'artifacts/remcard-wallet-phone');
const VIS = path.join(ART, 'visual-01-2');
const requireNav = createRequire(path.join(NAV_ROOT, 'package.json'));
const ExcelJS = requireNav('exceljs');

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

async function bffJson(platformOrigin, cookies, upstreamPath) {
  const res = await fetch(`${platformOrigin}/api/remcard${upstreamPath}`, {
    headers: { Cookie: cookieHeader(cookies), Origin: platformOrigin },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function adminLogin(page, platformOrigin, creds) {
  await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('input[autocomplete="username"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.locator('input[autocomplete="username"]').fill(creds.login);
  await page.locator('input[autocomplete="current-password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 120_000 });
}

async function createTestUser(page, displayName) {
  const createPanel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Создать' }) });
  await createPanel.getByLabel('Тип').selectOption('agent');
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

async function maybeAcceptConsents(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!page.url().includes('step=consents')) return;
    const boxes = page.locator('input[type="checkbox"]');
    const count = await boxes.count();
    for (let i = 0; i < count; i++) {
      const box = boxes.nth(i);
      if (!(await box.isChecked())) await box.check();
    }
    const submit = page.getByRole('button', { name: /принять|продолжить|сохранить/i }).first();
    if (await submit.isVisible().catch(() => false)) await submit.click();
    await page.waitForTimeout(800);
  }
}

async function ensureAgentProfileFinished(page, platformOrigin, cookieHeader, displayName) {
  await page.goto(`${platformOrigin}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 90_000 });
  await maybeAcceptConsents(page);
  const wizard = page.locator('[data-testid=agent-profile-wizard]');
  if (await wizard.isVisible().catch(() => false)) {
    await page.getByTestId('agent-profile-input-displayName').fill(displayName);
    await page.locator('#agent-city').fill('Краснодар');
    await page.getByTestId('agent-profile-save-draft').click();
    await page.waitForResponse(
      (r) => r.url().includes('/agent-profile/draft') && r.request().method() === 'PATCH' && r.status() === 200,
      { timeout: 45_000 },
    );
    for (let i = 0; i < 4; i++) {
      const next = page.getByTestId('agent-profile-next');
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(400);
    }
  }
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/enable-activity`, {
    method: 'POST',
    headers: { Cookie: cookieHeader, Origin: platformOrigin, 'content-type': 'application/json' },
    body: JSON.stringify({ activity: 'AGENT' }),
  });
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/finish`, {
    method: 'POST',
    headers: { Cookie: cookieHeader, Origin: platformOrigin, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
}

async function waitForTestSession(context, platformOrigin) {
  const start = Date.now();
  while (Date.now() - start < 45_000) {
    const cookies = await context.cookies();
    const me = await bffJson(platformOrigin, cookies, '/api/auth/me');
    if (me.body?.profTestSession?.active && me.body?.user?.isProfTestUser) return me;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function cellPlain(value) {
  if (value == null) return '';
  if (typeof value === 'object' && 'richText' in value) {
    return value.richText.map((part) => part.text).join('');
  }
  if (typeof value === 'object' && 'text' in value) return String(value.text);
  return String(value);
}

async function readXlsxStats(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const orders = wb.getWorksheet('Заказы');
  const info = wb.getWorksheet('Описание');
  const rowCount = Math.max(0, (orders?.rowCount ?? 1) - 1);
  let filterCount = null;
  for (const row of info?.getRows() ?? []) {
    const key = cellPlain(row.getCell(1).value);
    if (key.includes('Количество записей')) {
      filterCount = Number(cellPlain(row.getCell(2).value).replace(/\D/g, '')) || null;
    }
  }
  return { rowCount, filterCount, sheetNames: wb.worksheets.map((s) => s.name) };
}

async function gridColumnCount(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="agent-r05-partners"]');
    const grid = shell?.querySelector('[class*="ledgerGrid"]');
    if (!grid) return 0;
    return getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length;
  });
}

async function capturePartnersLayout(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: true });
  return { path: filePath, sha256: sha256(readFileSync(filePath)) };
}

async function main() {
  mkdirSync(VIS, { recursive: true });
  const runtimeEnv = loadRuntimeEnv();
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const platformOrigin = meta.platformOrigin;
  const creds = {
    login: process.env.ADMIN_TEST_LOGIN?.trim() || 'e2e-admin@remcard.test',
    password: process.env.ADMIN_TEST_PASSWORD?.trim() || 'E2E-Admin-Pass-12chars',
  };

  const report = {
    task: 'WALLET-PHONE-01.2',
    platformOrigin,
    runtimeSha256: sha256(readFileSync(path.join(RUN_DIR, 'runtime.env'))),
    git: {
      platform: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim(),
      navigator: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: NAV_ROOT, encoding: 'utf8' }).stdout?.trim(),
    },
    hydration: {},
    bffExport: {},
    phonePersistence: {},
    captures: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());

  await adminLogin(page, platformOrigin, creds);
  const agentName = `WP012 ${Date.now()}`;
  await createTestUser(page, agentName);
  await enterTestUser(page, agentName);
  const session = await waitForTestSession(context, platformOrigin);
  if (!session?.body?.user?.id) throw new Error('test_session_missing');
  const agentId = session.body.user.id;
  let cookies = await context.cookies();
  await ensureAgentProfileFinished(page, platformOrigin, cookieHeader(cookies), agentName);
  cookies = await context.cookies();

  spawnSync('pnpm', ['exec', 'tsx', 'scripts/r05ParityReceivablesSeed.ts', agentId, '30'], {
    cwd: NAV_ROOT,
    env: { ...process.env, ...runtimeEnv },
    encoding: 'utf8',
  });

  const ordersMetaApi = await bffJson(
    platformOrigin,
    cookies,
    '/api/pro/wallet/agent-receivables/orders?page=1&pageSize=1&status=open&sort=debt-desc',
  );
  report.bffExport.apiTotalRecords = ordersMetaApi.body?.meta?.totalRecords ?? 0;

  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.getByTestId('agent-r05-incoming-tile').click();

  // Hydration: list default on first paint after reload with stored large
  await page.evaluate(() => {
    localStorage.setItem('agent-r05-receivables-prefs', JSON.stringify({ view: 'large', pageSize: 25 }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('agent-r05-incoming-tile').click();
  await page.waitForTimeout(300);
  report.hydration.afterReload = await page.evaluate(() => ({
    selected: document.querySelector('[data-testid=ledger-view]')?.value,
    effective: document.querySelector('[data-ledger-view]')?.getAttribute('data-ledger-view'),
    partnerFlexDirection: getComputedStyle(
      document.querySelector('[data-testid=agent-r05-partner-row]') ?? document.body,
    ).flexDirection,
  }));

  for (const [tag, width] of [
    ['375-list', 375],
    ['375-large', 375],
    ['320-list', 320],
    ['320-large', 320],
  ]) {
    const vp = { width, height: 800 };
    await page.setViewportSize(vp);
    const view = tag.endsWith('large') ? 'large' : 'list';
    await page.evaluate((v) => {
      localStorage.setItem('agent-r05-receivables-prefs', JSON.stringify({ view: v, pageSize: 25 }));
    }, view);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByTestId('agent-r05-incoming-tile').click();
    await page.waitForSelector('[data-testid=ledger-view]');
    await page.waitForFunction(
      (expected) =>
        document.querySelector('[data-ledger-view]')?.getAttribute('data-ledger-view') === expected &&
        document.querySelector('[data-testid=ledger-view]')?.value === expected,
      view,
      { timeout: 10_000 },
    );
    report.captures.push(await capturePartnersLayout(page, path.join(VIS, `impl-partners-${tag}.png`)));
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    localStorage.setItem('agent-r05-receivables-prefs', JSON.stringify({ view: 'small', pageSize: 25 }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('agent-r05-incoming-tile').click();
  await page.waitForFunction(
    () => document.querySelector('[data-ledger-view]')?.getAttribute('data-ledger-view') === 'small',
  );
  report.hydration.desktopSmallColumns = await gridColumnCount(page);
  await page.getByTestId('ledger-view').selectOption('medium');
  await page.waitForFunction(
    () => document.querySelector('[data-ledger-view]')?.getAttribute('data-ledger-view') === 'medium',
  );
  report.hydration.desktopMediumColumns = await gridColumnCount(page);

  await page.getByRole('button', { name: /Все взаиморасчёты/ }).click();
  await page.getByTestId('ledger-export-xlsx').waitFor({ state: 'visible' });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    page.getByTestId('ledger-export-xlsx').click(),
  ]);
  const dlPath = path.join(ART, 'smoke-export-01-2.xlsx');
  await download.saveAs(dlPath);
  const xlsxBuf = readFileSync(dlPath);
  report.bffExport.suggestedFilename = download.suggestedFilename();
  report.bffExport.bytes = xlsxBuf.length;
  try {
    report.bffExport.stats = await readXlsxStats(xlsxBuf);
    report.bffExport.pass =
      report.bffExport.stats.rowCount > 25 &&
      (report.bffExport.stats.filterCount == null ||
        report.bffExport.stats.rowCount === report.bffExport.stats.filterCount);
  } catch (error) {
    report.bffExport.pass = false;
    report.bffExport.readError = error instanceof Error ? error.message : String(error);
  }

  report.bffExport.apiRowCountMatchesExport =
    report.bffExport.apiTotalRecords > 0
      ? report.bffExport.stats?.rowCount === report.bffExport.apiTotalRecords
      : report.bffExport.stats?.rowCount > 25;

  await page.goto(`${platformOrigin}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 90_000 });
  await maybeAcceptConsents(page);
  if (await page.getByTestId('agent-profile-completed-summary').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Редактировать профиль' }).click();
  }
  await page.waitForSelector('[data-testid=agent-profile-wizard]', { timeout: 60_000 });
  for (let i = 0; i < 4; i++) {
    if (await page.getByText(/связаться/i).isVisible().catch(() => false)) break;
    await page.getByTestId('agent-profile-next').click();
    await page.waitForTimeout(300);
  }
  const phone = '9186360099';
  const input = page.getByTestId('agent-profile-input-phone');
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid=agent-profile-input-phone]');
      return el instanceof HTMLInputElement && !el.disabled;
    },
    { timeout: 60_000 },
  );
  await input.click();
  await input.fill(phone);
  await input.press('Enter');
  const draftWait = page.waitForResponse(
    (r) => r.url().includes('/agent-profile/draft') && r.request().method() === 'PATCH' && r.status() === 200,
  );
  await page.getByTestId('agent-profile-save-draft').click();
  await draftWait;
  await page.reload({ waitUntil: 'networkidle' });
  cookies = await context.cookies();
  const draftGet = await bffJson(platformOrigin, cookies, '/api/pro/agent-profile/draft');
  report.phonePersistence.canonical = draftGet.body?.payload?.contactPhone ?? null;
  report.phonePersistence.pass = report.phonePersistence.canonical === '+79186360099';

  report.hydration.pass =
    report.hydration.afterReload.selected === 'large' &&
    report.hydration.afterReload.effective === 'large' &&
    report.hydration.desktopSmallColumns !== report.hydration.desktopMediumColumns;

  report.pass = report.hydration.pass && report.bffExport.pass && report.phonePersistence.pass;

  writeFileSync(path.join(ART, 'SMOKE-01-2.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Note: stack must be rebuilt (`npm run build` + `node scripts/admin-test-local-stack.mjs`) before smoke.
