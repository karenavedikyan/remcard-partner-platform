#!/usr/bin/env node
/**
 * Playwright UI/BFF chain for R06 specialist (no direct route imports).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';

function assertRunDir() {
  try {
    readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8');
  } catch {
    throw new Error(
      `Missing ${path.join(RUN_DIR, 'meta.json')} — set R06_RUN_DIR and run scripts/r06-local-stack.mjs`,
    );
  }
}
const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist/browser-bff.json');

function loadEnv(envPath) {
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function runFixture(env, action) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', action], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error(`${action} failed: ${res.stderr || res.stdout}`);
  return res.stdout;
}

function mint(env) {
  return runFixture(env, 'mint').trim();
}

async function loginContext(context, env) {
  const token = mint(env);
  await context.addCookies([
    {
      name: 'remcard-token',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  return token;
}

async function waitWizardReady(page, testId) {
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 120_000 });
  await page.waitForFunction(() => {
    const loading = document.querySelector('[data-testid="specialist-profile-loading"]');
    return !loading;
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(400);
}

async function main() {
  assertRunDir();
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const env = loadEnv(meta.envPath);
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  runFixture(env, 'reset-e2e');

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await loginContext(context, env);
  const page = await context.newPage();

  const report = { ok: false, steps: {}, csrf: null, gateOff: null };

  await page.goto(`${base}/profile?section=basics`, { waitUntil: 'networkidle' });
  await waitWizardReady(page, 'specialist-profile-wizard');

  await page.locator('#sp-displayName').fill('R06 BFF Spec');
  await page.locator('#sp-city').fill('Krasnodar');
  await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) =>
    f.requestSubmit(),
  );
  await page.waitForSelector('#sp-kind', { timeout: 120_000 });
  await page.locator('#sp-kind').selectOption('designer');
  await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) =>
    f.requestSubmit(),
  );
  await page.waitForSelector('#sp-workmode', { timeout: 120_000 });
  await page.locator('[data-testid="agent-profile-input-phone"]').fill('+79001112233');
  await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) =>
    f.requestSubmit(),
  );
  await page.getByRole('button', { name: 'Завершить профиль' }).click();
  await page.waitForSelector('[data-testid="specialist-profile-completed-summary"]');
  report.steps.finish = { ok: true };

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="specialist-profile-completed-summary"]');
  report.steps.reloadAfterFinish = { ok: true };

  await page.getByRole('button', { name: 'Редактировать профиль' }).click();
  await waitWizardReady(page, 'specialist-profile-wizard');
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await page.waitForSelector('text=Черновик сохранён', { timeout: 30_000 });
  report.steps.editSaveAfterFinish = { ok: true };

  await page.reload({ waitUntil: 'networkidle' });
  await waitWizardReady(page, 'specialist-profile-wizard');
  report.steps.reloadAfterEditSave = { ok: true };

  await page.goto(`${base}/profile?section=catalog`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="specialist-catalog-wizard"]', { timeout: 120_000 });
  await page.evaluate(() => document.fonts?.ready);
  report.steps.catalogWizard = { ok: true };

  const submitStatus = await page.evaluate(async () => {
    const res = await fetch('/api/remcard/api/pro/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catalogDisplayName: 'R06 BFF Catalog',
        catalogCity: 'Krasnodar',
        specializations: ['design'],
        catalogNavigatorStageIds: ['L1-1'],
        catalogTouched: {
          specializations: true,
          navigatorStageIds: true,
          catalogDisplayName: true,
          catalogCity: true,
          publicPhone: true,
        },
        publicPhone: '+79001112233',
      }),
    });
    if (!res.ok) return { patch: res.status };
    const res2 = await fetch('/api/remcard/api/pro/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitForModeration' }),
    });
    return { patch: res.status, submit: res2.status };
  });
  report.steps.catalogSubmitPending = { ok: submitStatus.submit === 200, ...submitStatus };

  const pendingGet = await page.evaluate(async () => {
    const res = await fetch('/api/remcard/api/pro/profile', { credentials: 'include' });
    const body = await res.json();
    return { status: res.status, catalogStatus: body?.user?.catalogStatus ?? body?.catalogStatus };
  });
  report.steps.pendingFreshGet = {
    ok: pendingGet.catalogStatus === 'PENDING',
    catalogStatus: pendingGet.catalogStatus,
  };

  const csrfRes = await page.request.post(`${base}/api/remcard/api/auth/logout-all-sessions`, {
    headers: { 'Content-Type': 'application/json', cookie: `remcard-token=${await mint(env)}` },
    data: {},
  });
  report.csrf = { status: csrfRes.status(), ok: csrfRes.status() === 403 };

  const gateRes = await page.request.get(`${env.REMCARD_API_BASE_URL}/api/pro/r06/status`, {
    headers: { cookie: `remcard-token=${await mint(env)}` },
  });
  report.gateOff = { skipped: true, note: 'gate checked in integration; stack gate on' };
  if (gateRes.ok()) {
    const body = await gateRes.json();
    report.gateOff = { featureEnabled: body.featureEnabled, eligible: body.eligible };
  }

  await browser.close();
  report.ok =
    report.steps.finish?.ok &&
    report.steps.editSaveAfterFinish?.ok &&
    report.steps.catalogWizard?.ok &&
    report.steps.pendingFreshGet?.ok &&
    report.csrf?.ok === true;

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, out: OUT }));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
