#!/usr/bin/env node
/**
 * Playwright UI/BFF chain for R06 specialist (no direct route imports for user actions).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';
const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist/browser-bff.json');

function assertRunDir() {
  try {
    readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8');
  } catch {
    throw new Error(
      `Missing ${path.join(RUN_DIR, 'meta.json')} — set R06_RUN_DIR and run scripts/r06-local-stack.mjs`,
    );
  }
}

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
  await page.waitForTimeout(300);
}

async function getProfileSnapshot(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/remcard/api/pro/profile', { credentials: 'include' });
    const body = await r.json();
    return { status: r.status, user: body?.user ?? body };
  });
}

async function getWorkingDraft(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/remcard/api/pro/specialist-profile/draft', { credentials: 'include' });
    const body = await r.json();
    return { status: r.status, payload: body?.payload, version: body?.version };
  });
}

async function advanceCatalogSteps(page, toStep) {
  for (let i = 0; i < toStep; i++) {
    const miss = await page.locator('[data-testid="specialist-catalog-wizard"]').getAttribute('data-catalog-step');
    if (Number(miss) >= toStep) break;
    await page.getByRole('button', { name: /Далее|Предпросмотр/i }).click();
    await page.waitForFunction(
      (target) =>
        Number(document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep) >=
        target,
      toStep,
      { timeout: 30_000 },
    );
  }
}

async function fillCatalogBasics(page) {
  await page.locator('#sc-public-name').fill('R06 BFF Catalog');
  await page.locator('#sc-city').fill('Krasnodar');
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

  const report = { ok: false, steps: {}, originNegative: null, gateOff: null, negatives: {} };

  await page.goto(`${base}/profile?section=basics`, { waitUntil: 'load' });
  await waitWizardReady(page, 'specialist-profile-wizard');

  await page.locator('#sp-displayName').fill('R06 BFF Spec');
  await page.locator('#sp-city').fill('Krasnodar');
  await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
  await page.waitForSelector('#sp-kind', { timeout: 120_000 });
  await page.locator('#sp-kind').selectOption('designer');
  await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
  await page.waitForSelector('#sp-workmode', { timeout: 120_000 });
  await page.locator('[data-testid="agent-profile-input-phone"]').fill('+79001112233');
  await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
  await page.getByRole('button', { name: 'Завершить профиль' }).click();
  await page.waitForSelector('[data-testid="specialist-profile-completed-summary"]');
  report.steps.finish = { ok: true };

  await page.getByRole('button', { name: 'Редактировать профиль' }).click();
  await waitWizardReady(page, 'specialist-profile-wizard');
  await page.locator('#sp-displayName').fill('R06 BFF Spec Edited');
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await page.waitForSelector('text=Черновик сохранён', { timeout: 30_000 });
  report.steps.editSaveAfterFinishNoReload = { ok: true };

  const workingAfterEdit = await getWorkingDraft(page);
  report.steps.workingProfileFreshGet = {
    ok:
      workingAfterEdit.status === 200 &&
      workingAfterEdit.payload?.displayName === 'R06 BFF Spec Edited',
    displayName: workingAfterEdit.payload?.displayName,
  };

  await page.goto(`${base}/profile?section=catalog`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="specialist-catalog-wizard"]', { timeout: 120_000 });
  await fillCatalogBasics(page);
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep === '1',
  );
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep === '2',
  );
  await page.locator('#sc-tg').fill('@bff_clear_me');
  await page.locator('[data-testid="agent-profile-input-phone"]').fill('+79001112233');
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await page.waitForSelector('text=Черновик публикации сохранён', { timeout: 30_000 });
  await page.locator('#sc-tg').fill('');
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await page.waitForSelector('text=Черновик публикации сохранён', { timeout: 30_000 });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-testid="specialist-catalog-wizard"]');
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  const tgAfterReload = await page.locator('#sc-tg').inputValue();
  report.steps.catalogClearOptionalReload = { ok: tgAfterReload === '', telegram: tgAfterReload };

  await page.goto(`${base}/profile?section=catalog`, { waitUntil: 'load' });
  await fillCatalogBasics(page);
  await advanceCatalogSteps(page, 4);
  await page.waitForSelector('text=Можно отправить заявку', { timeout: 30_000 });
  const preSubmit = await getProfileSnapshot(page);
  report.steps.previewBeforeSubmit = {
    ok: preSubmit.user?.catalogStatus !== 'PENDING',
    catalogStatus: preSubmit.user?.catalogStatus,
  };

  await page.getByRole('button', { name: /Отправить на публикацию|Отправить повторно/i }).click();
  await page.waitForSelector('text=Заявка на проверке', { timeout: 60_000 });
  const pendingGet = await getProfileSnapshot(page);
  report.steps.pendingFreshGet = {
    ok: pendingGet.user?.catalogStatus === 'PENDING',
    catalogStatus: pendingGet.user?.catalogStatus,
  };

  const reentry = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await loginContext(reentry, env);
  const page2 = await reentry.newPage();
  await page2.goto(`${base}/profile?section=catalog`, { waitUntil: 'load' });
  await page2.waitForSelector('[data-testid="specialist-catalog-wizard"][data-catalog-status="PENDING"]', {
    timeout: 60_000,
  });
  report.steps.reentryPending = { ok: true };
  await page2.getByRole('button', { name: /Отправить на публикацию|Отправить повторно/i }).click().catch(() => {});
  await page2.waitForTimeout(500);
  const stillPending = await getProfileSnapshot(page2);
  report.steps.resubmitNoDuplicate = {
    ok: stillPending.user?.catalogStatus === 'PENDING',
  };
  await reentry.close();

  const token = mint(env);
  const originBad = await page.request.patch(`${base}/api/remcard/api/pro/specialist-profile/draft`, {
    headers: {
      cookie: `remcard-token=${token}`,
      origin: 'http://evil.example',
      'content-type': 'application/json',
    },
    data: { expectedVersion: 0, payload: {}, mode: 'save' },
  });
  report.originNegative = { status: originBad.status(), ok: originBad.status() === 403 };

  const csrfRes = await page.request.post(`${base}/api/remcard/api/auth/logout-all-sessions`, {
    headers: { 'Content-Type': 'application/json', cookie: `remcard-token=${token}` },
    data: {},
  });
  report.csrf = { status: csrfRes.status(), ok: csrfRes.status() === 403 };

  const gateOffProbe = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      'src/lib/__tests__/profR06SpecialistRoute.integration.test.ts',
      '-t',
      'gate',
    ],
    { cwd: NAV_ROOT, env, encoding: 'utf8' },
  );
  report.gateOff = {
    ok: gateOffProbe.status === 0,
    exitCode: gateOffProbe.status,
    note: 'gate OFF covered by navigator integration test (featureEnabled:false)',
  };

  const migNeg = spawnSync('node', ['scripts/r06-migration-negatives.mjs'], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  report.negatives = {
    migration: { exitCode: migNeg.status, ok: migNeg.status === 0, stdout: (migNeg.stdout || '').slice(0, 400) },
  };

  await browser.close();

  report.ok =
    report.steps.finish?.ok &&
    report.steps.editSaveAfterFinishNoReload?.ok &&
    report.steps.workingProfileFreshGet?.ok &&
    report.steps.catalogClearOptionalReload?.ok &&
    report.steps.pendingFreshGet?.ok &&
    report.steps.reentryPending?.ok &&
    report.originNegative?.ok &&
    report.csrf?.ok &&
    report.gateOff?.ok &&
    report.negatives?.migration?.ok;

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, out: OUT }));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
