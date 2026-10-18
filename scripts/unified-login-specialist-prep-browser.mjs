#!/usr/bin/env node
/**
 * UNIFIED-LOGIN-SPECIALIST-PREP-01.2 narrow browser smoke on disposable r06-local-stack runtime.
 * MOCK/local allowlist only — no real OTP/Telegram send.
 */
import { chromium } from 'playwright';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeRunStack, loadRunMeta, gitRevParse, resolveApplicationCodeSha } from './lib/r06-provenance.mjs';
import {
  advanceCatalogSteps,
  fillCatalogStepRequirements,
} from './lib/r06-playwright-catalog.mjs';
import {
  assertDisposableDatabaseUrl,
} from '../artifacts/remcard-login-layout-01/disposable-db-url-guard.mjs';
import { evaluateCleanupChildResult } from '../artifacts/remcard-login-layout-01/login-layout-cleanup-orchestration.mjs';
import { withRequiredCleanup } from './lib/unified-prep-cleanup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = path.resolve(ROOT, '../remcard-navigator');
const OUT = path.join(ROOT, 'artifacts/unified-login-specialist-prep');
function resolveBrowserJsonOut() {
  return (
    process.env.UNIFIED_PREP_BROWSER_JSON?.trim() ||
    path.join(OUT, 'UNIFIED-PREP-01-BROWSER.json')
  );
}

const APPLICATION_CODE_PIN = '11f512e44406d243261f7bfdd7c1d5d90f6494d9';

function resolvePins() {
  const platformBuiltHead = gitRevParse(ROOT);
  let specialistUiPin = APPLICATION_CODE_PIN;
  try {
    specialistUiPin = resolveApplicationCodeSha(ROOT, APPLICATION_CODE_PIN);
  } catch {
    specialistUiPin = APPLICATION_CODE_PIN;
  }
  return {
    platformBuiltHead,
    platformStackPin: platformBuiltHead,
    specialistUiPin,
    navigator: gitRevParse(NAV),
  };
}

const RUN_DIR = process.env.UNIFIED_PREP_RUN_DIR || '/tmp/unified-login-specialist-prep-stack';
const DEFAULT_FIXTURE_OTP = '847291';
const LOGIN_ART = path.join(ROOT, 'artifacts/remcard-login-layout-01');
const NAV_SEED = path.join(NAV, 'scripts/.login-layout-01-disposable-seed.ts');
const NAV_CLEANUP = path.join(NAV, 'scripts/.login-layout-01-disposable-cleanup.ts');
const NAV_GUARD = path.join(NAV, 'scripts/.login-layout-disposable-db-url-guard.mjs');

const DESKTOP_LAYOUT_GATE = { entryLayoutMin: 1000, storyMin: 450, formMin: 350 };

function materializeLoginFixtures() {
  writeFileSync(NAV_GUARD, readFileSync(path.join(LOGIN_ART, 'disposable-db-url-guard.mjs')));
  writeFileSync(NAV_SEED, readFileSync(path.join(LOGIN_ART, 'seed-disposable-fixture.nav.fixture.tpl')));
  writeFileSync(NAV_CLEANUP, readFileSync(path.join(LOGIN_ART, 'cleanup-disposable-fixture.nav.fixture.tpl')));
}

function loadEnvFile(envPath) {
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function withDevNodeEnv(env) {
  return { ...env, NODE_ENV: 'development' };
}

function cleanupHarnessSideEffects() {
  for (const p of [NAV_SEED, NAV_CLEANUP, NAV_GUARD]) {
    try {
      if (existsSync(p)) rmSync(p);
    } catch {
      /* ignore */
    }
  }
}

function bootstrapStack(pins) {
  mkdirSync(OUT, { recursive: true });
  execSync('node scripts/r06-local-stack.mjs', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      R06_RUN_DIR: RUN_DIR,
      R06_EXPECT_NAV_SHA: pins.navigator,
      R06_EXPECT_PLATFORM_CODE_SHA: pins.platformStackPin,
      PROF_R06_SPECIALIST_PROFILE_ENABLED: '1',
      R06_NAV_NODE_ENV: 'development',
      R06_PLAT_NODE_ENV: 'development',
    },
  });
}

function runSeed(env, tag, reseed = false) {
  materializeLoginFixtures();
  assertDisposableDatabaseUrl(env.DATABASE_URL ?? '', { label: 'DATABASE_URL' });
  const maxId = env.LOGIN_LAYOUT_FIXTURE_MAX_ID;
  if (!maxId) throw new Error('seed: LOGIN_LAYOUT_FIXTURE_MAX_ID required');
  const r = spawnSync('pnpm', ['exec', 'tsx', NAV_SEED], {
    cwd: NAV,
    env: withDevNodeEnv({
      ...process.env,
      ...env,
      LOGIN_LAYOUT_FIXTURE_TAG: tag,
      LOGIN_LAYOUT_FIXTURE_OTP: env.LOGIN_LAYOUT_FIXTURE_OTP ?? DEFAULT_FIXTURE_OTP,
      LOGIN_LAYOUT_RESEED: reseed ? '1' : '0',
    }),
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`seed failed: ${r.stderr || r.stdout}`);
  const seed = JSON.parse(r.stdout.trim());
  if (String(seed.maxId) !== String(maxId)) {
    throw new Error(`seed maxId mismatch: seed ${seed.maxId} env ${maxId}`);
  }
  return seed;
}

function runLoginCleanup(env, tag, maxId, { injectFail = false } = {}) {
  materializeLoginFixtures();
  if (!maxId) throw new Error('cleanup: maxId required');
  const r = spawnSync('pnpm', ['exec', 'tsx', NAV_CLEANUP, tag], {
    cwd: NAV,
    env: withDevNodeEnv({
      ...process.env,
      ...env,
      LOGIN_LAYOUT_FIXTURE_MAX_ID: String(maxId),
      LOGIN_LAYOUT_FIXTURE_OTP: env.LOGIN_LAYOUT_FIXTURE_OTP ?? DEFAULT_FIXTURE_OTP,
      LOGIN_LAYOUT_CLEANUP_INJECT_FAIL: injectFail ? '1' : '0',
    }),
    encoding: 'utf8',
  });
  return evaluateCleanupChildResult({
    status: r.status,
    error: r.error ?? null,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  });
}

function assertCleanupZero(report, label) {
  const r = report.remaining ?? report;
  for (const key of ['users', 'authAccounts', 'consents', 'botLoginCodes']) {
    const v = r[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v !== 0) {
      throw new Error(`${label}: cleanup.remaining.${key}=${v} (expected 0)`);
    }
  }
}

function runSpecialistShared(cmd, env, stdinPayload = null) {
  const args = ['exec', 'tsx', 'scripts/unified-prep-specialist-shared-restore.ts', cmd];
  const r = spawnSync('pnpm', args, {
    cwd: NAV,
    env: withDevNodeEnv({ ...process.env, ...env }),
    encoding: 'utf8',
    input: stdinPayload ?? undefined,
  });
  if (r.status !== 0) throw new Error(`specialist ${cmd} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

function runFixture(env, action) {
  const r = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', action], {
    cwd: NAV,
    env: withDevNodeEnv({ ...process.env, ...env }),
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`${action} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

async function runCleanupInjectProbes(env) {
  const controlTag = `unified-prep-control-${Date.now()}`;
  const controlMaxId = `881${String(Date.now()).slice(-8)}1`;
  const controlOtp = String(100000 + ((Date.now() + 1) % 900000)).padStart(6, '0');
  const controlEnv = {
    ...env,
    LOGIN_LAYOUT_FIXTURE_MAX_ID: controlMaxId,
    LOGIN_LAYOUT_FIXTURE_OTP: controlOtp,
  };
  const probeTag = `unified-prep-inject-${Date.now()}`;
  const probeMaxId = `881${String(Date.now()).slice(-8)}2`;
  const probeOtp = String(100000 + ((Date.now() + 2) % 900000)).padStart(6, '0');
  const probeEnv = {
    ...env,
    LOGIN_LAYOUT_FIXTURE_MAX_ID: probeMaxId,
    LOGIN_LAYOUT_FIXTURE_OTP: probeOtp,
  };
  return withRequiredCleanup(async () => {
  runSeed(controlEnv, controlTag);
  runSeed(probeEnv, probeTag);
  let injectRejected = false;
  try {
    runLoginCleanup(probeEnv, probeTag, probeMaxId, { injectFail: true });
  } catch {
    injectRejected = true;
  }
  if (!injectRejected) {
    throw new Error('inject-fail cleanup must not pass evaluateCleanupChildResult');
  }

  const probeAfterInject = runLoginCleanup(probeEnv, probeTag, probeMaxId);
  assertCleanupZero(probeAfterInject, 'injectProbeTag');

  const controlCleanup = runLoginCleanup(controlEnv, controlTag, controlMaxId);
  assertCleanupZero(controlCleanup, 'controlTag');
  for (const [key, count] of Object.entries({ users: 1, authAccounts: 1, consents: 2, botLoginCodes: 1 })) {
    if (controlCleanup.deleted[key] !== count) throw new Error(`control fixture changed:${key}`);
  }

  return {
    ok: true,
    injectRejected,
    probeTag,
    probeMaxId,
    controlTag,
    controlMaxId,
    probeCleanup: probeAfterInject,
    controlCleanup,
  };
  }, async () => {
    const errors = [];
    for (const [fixtureEnv, tag, maxId] of [[probeEnv, probeTag, probeMaxId], [controlEnv, controlTag, controlMaxId]]) {
      try { assertCleanupZero(runLoginCleanup(fixtureEnv, tag, maxId), tag); }
      catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, 'cleanup probe finalization failed');
  });
}

async function fetchAuthMe(platformOrigin, cookieHeader) {
  const res = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { cookie: cookieHeader, Origin: platformOrigin },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, hasUser: Boolean(body?.user?.id), userId: body?.user?.id ?? null };
}

async function measureLoginLayout(page) {
  return page.evaluate(() => ({
    innerWidth: window.innerWidth,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    entryLayoutWidth: document.querySelector('[class*="entryLayout"]')?.getBoundingClientRect().width ?? null,
    entryStoryWidth: document.querySelector('[class*="entryStory"]')?.getBoundingClientRect().width ?? null,
    entryFormWidth: document.querySelector('[class*="entryForm"]')?.getBoundingClientRect().width ?? null,
  }));
}

function assertWidth(viewport, metrics) {
  if (metrics.innerWidth !== viewport) {
    throw new Error(`innerWidth ${metrics.innerWidth} !== requested ${viewport}`);
  }
}

async function waitForLoginOtpStep(page) {
  const otp = page.getByRole('textbox', { name: /код из сообщения/i });
  await otp.waitFor({ state: 'visible', timeout: 90_000 });
}

async function loginFlow(page, platformOrigin, seed) {
  await page.goto(`${platformOrigin}/login?returnTo=/scanner`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForLoginOtpStep(page);
  await page.getByRole('textbox', { name: /код из сообщения/i }).fill(seed.otp);
  await page.getByRole('button', { name: /продолжить/i }).click();
  await page.waitForURL((url) => url.pathname === '/scanner', { timeout: 120_000 });
  await page.getByRole('heading', { name: /^Сканер$/ }).waitFor({ state: 'visible', timeout: 60_000 });
}

async function runLoginSmoke(platformOrigin, env, fixtureTag) {
  const maxId = process.env.LOGIN_LAYOUT_FIXTURE_MAX_ID || `881${String(Date.now()).slice(-8)}`;
  const fixtureOtp =
    process.env.LOGIN_LAYOUT_FIXTURE_OTP ||
    String(100000 + (Date.now() % 900000)).padStart(6, '0');
  const seedEnv = {
    ...env,
    LOGIN_LAYOUT_FIXTURE_MAX_ID: maxId,
    LOGIN_LAYOUT_FIXTURE_OTP: fixtureOtp,
  };

  let seed;
  let browser;
  let primaryError = null;
  let cleanupReport = null;
  let cleanupError = null;
  const results = { viewports: {}, logout: {} };

  try {
    seed = runSeed(seedEnv, fixtureTag);
    browser = await chromium.launch({ headless: true });

    for (const vp of [
      { w: 1440, h: 900, key: 'desktop1440', assertDesktop: true },
      { w: 375, h: 812, key: 'mobile375', assertDesktop: false },
      { w: 320, h: 640, key: 'mobile320', assertDesktop: false },
    ]) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await ctx.newPage();
      if (vp.key === 'desktop1440') {
        await loginFlow(page, platformOrigin, seed);
        const cookies = await ctx.cookies();
        const jar = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
        const me = await fetchAuthMe(platformOrigin, jar);
        if (!me.hasUser) throw new Error('auth/me missing user after login');
        results.authMeAfterLogin = me;

        await page.getByTestId('account-menu-trigger').click();
        await page.getByTestId('account-logout').click();
        await page.waitForURL(/\/account\/signed-out/, { timeout: 60_000 });
        const jarOut = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
        const meOut = await fetchAuthMe(platformOrigin, jarOut);
        if (meOut.hasUser) throw new Error('auth/me still has user after logout');
        results.logout.authMeAfterLogout = meOut;

        await page.goto(`${platformOrigin}/scanner`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        const scannerVisible = await page.getByRole('heading', { name: /^Сканер$/ }).isVisible().catch(() => false);
        if (scannerVisible) throw new Error('scanner accessible after logout');
        results.logout.scannerBlocked = true;

        await page.goto(`${platformOrigin}/account/signed-out?scope=current`, { waitUntil: 'domcontentloaded' });
        await page.getByTestId('signed-out').waitFor({ state: 'visible' });
        await page.getByTestId('account-sign-in').click();
        await page.waitForURL((url) => url.pathname === '/login', { timeout: 30_000 });
        results.logout.returnToLogin = page.url();
      }

      await page.goto(`${platformOrigin}/login?returnTo=/scanner`, { waitUntil: 'domcontentloaded' });
      await waitForLoginOtpStep(page);
      const metrics = await measureLoginLayout(page);
      assertWidth(vp.w, metrics);
      if (vp.assertDesktop && (metrics.entryLayoutWidth ?? 0) < DESKTOP_LAYOUT_GATE.entryLayoutMin) {
        throw new Error(`desktop entryLayout too narrow: ${metrics.entryLayoutWidth}`);
      }
      results.viewports[vp.key] = { ok: true, metrics };
      await ctx.close();
    }

    runSeed(seedEnv, fixtureTag, true);
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page2 = await ctx2.newPage();
    await loginFlow(page2, platformOrigin, seed);
    results.relogin = { ok: true, url: page2.url() };
    await ctx2.close();
  } catch (e) {
    primaryError = e;
  } finally {
    if (browser) await browser.close().catch(() => {});
    try {
      cleanupReport = runLoginCleanup(seedEnv, fixtureTag, maxId);
      assertCleanupZero(cleanupReport, 'loginSmoke');
    } catch (e) {
      cleanupError = e;
    }
  }

  if (cleanupError) {
    const msg = `${String(primaryError?.message ?? primaryError ?? 'ok')} | cleanup: ${String(cleanupError.message ?? cleanupError)}`;
    throw new Error(primaryError ? msg : `cleanup failed: ${cleanupError.message ?? cleanupError}`);
  }
  if (primaryError) throw primaryError;

  return {
    ok: true,
    fixtureTag,
    fixtureMaxId: maxId,
    seedMaxId: seed.maxId,
    seedUserId: seed.userId,
    cleanup: cleanupReport,
    ...results,
  };
}

async function mintCookie(context, env) {
  const token = runFixture(env, 'mint');
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
}

async function runSpecialistSmoke(base, env) {
  const snapshotJson = runSpecialistShared('capture', env);
  let browser;
  const steps = {};
  let sharedFixtureRestore, sharedFixtureVerify;
  const result = await withRequiredCleanup(async () => {
    runFixture(env, 'reset-e2e');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await mintCookie(context, env);
    const page = await context.newPage();

    await page.goto(`${base}/profile?section=basics`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="specialist-profile-wizard"]', { timeout: 120_000 });
    await page.waitForFunction(() => !document.querySelector('[data-testid="specialist-profile-loading"]'));

    await page.locator('#sp-displayName').fill('Unified Prep Spec');
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
    steps.finish = { ok: true };

    await page.getByRole('button', { name: 'Редактировать профиль' }).click();
    await page.waitForSelector('[data-testid="specialist-profile-wizard"]');
    await page.locator('#sp-displayName').fill('Unified Prep Edited');
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await page.waitForSelector('text=Черновик сохранён', { timeout: 30_000 });
    steps.editSaveNoReload = { ok: true };

    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await mintCookie(ctxB, env);
    const pageB = await ctxB.newPage();
    await pageB.goto(`${base}/profile?section=basics`, { waitUntil: 'load' });
    await pageB.waitForSelector('[data-testid="specialist-profile-wizard"]', { timeout: 120_000 });
    await pageB.locator('#sp-displayName').fill('Server wins');
    await pageB.getByRole('button', { name: 'Сохранить черновик' }).click();
    await pageB.waitForSelector('text=Черновик сохранён', { timeout: 30_000 });
    await ctxB.close();

    await page.locator('#sp-displayName').fill('Local stale edit');
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await page.waitForSelector('[data-testid="specialist-profile-version-conflict"]', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Оставить мои правки' }).click();
    steps.conflict409ExplicitChoice = { ok: true };

    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await page.waitForSelector('text=Черновик сохранён', { timeout: 30_000 });

    await page.goto(`${base}/profile?section=catalog`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="specialist-catalog-wizard"]', { timeout: 120_000 });
    await page.locator('#sc-public-name').fill('Unified Catalog');
    await page.locator('#sc-city').fill('Krasnodar');
    await fillCatalogStepRequirements(page, 0);
    await page.getByRole('button', { name: 'Далее' }).click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep === '1',
    );
    await fillCatalogStepRequirements(page, 1);
    await page.getByRole('button', { name: 'Далее' }).click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep === '2',
    );
    await page.locator('#sc-tg').fill('@unified_prep');
    await page.locator('[data-testid="agent-profile-input-phone"]').fill('+79001112233');
    await advanceCatalogSteps(page, 4);
    await page.waitForSelector('text=Можно отправить заявку', { timeout: 30_000 });
    await page.getByRole('button', { name: /Отправить на публикацию|Отправить повторно/i }).click();
    await page.waitForSelector('[data-testid="specialist-catalog-pending"]', { timeout: 60_000 });
    steps.catalogSubmitPending = { ok: true };

    const ctxRe = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await mintCookie(ctxRe, env);
    const pageRe = await ctxRe.newPage();
    await pageRe.goto(`${base}/profile?section=catalog`, { waitUntil: 'load' });
    await pageRe.waitForSelector('[data-testid="specialist-catalog-pending"]', { timeout: 60_000 });
    steps.catalogReentryPending = { ok: true };
    await ctxRe.close();
    await browser.close();

    return { ok: true, steps };
  }, async () => {
    if (browser) await browser.close().catch(() => {});
    sharedFixtureRestore = JSON.parse(runSpecialistShared('restore', env, snapshotJson));
    sharedFixtureVerify = JSON.parse(runSpecialistShared('verify', env, snapshotJson));
    if (sharedFixtureRestore.ok !== true || sharedFixtureVerify.ok !== true) {
      throw new Error('specialist snapshot restore/verify failed');
    }
  });
  return { ...result, sharedFixtureRestore, sharedFixtureVerify };
}

export async function runUnifiedPrepBrowserSmoke() {
  const pins = resolvePins();
  try {
    bootstrapStack(pins);
    const { report: probeReport } = await probeRunStack({
      runDir: RUN_DIR,
      navRoot: NAV,
      platRoot: ROOT,
      expectNavigatorSha: pins.navigator,
      expectPlatformCodeSha: pins.platformStackPin,
    });
    const meta = loadRunMeta(RUN_DIR);
    const env = loadEnvFile(meta.envPath);
    const platformOrigin = `http://127.0.0.1:${meta.platformPort}`;

    const fixtureTag = `unified-prep-${Date.now()}`;
    const cleanupProbes = await runCleanupInjectProbes(env);
    const login = await runLoginSmoke(platformOrigin, env, fixtureTag);
    const specialist = await runSpecialistSmoke(env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''), env);

    return {
      status: 'PASS',
      capturedAt: new Date().toISOString(),
      runtimeNote:
        'Disposable stack uses production dist + NODE_ENV=development for MOCK auth only; not production auth verification',
      pins,
      runtime: {
        runDir: RUN_DIR,
        meta,
        probeReport,
        platformOrigin,
        navigatorBuildId: meta.runtime.navigator.nextBuildId,
        platformBuildId: meta.runtime.platform.nextBuildId,
        platformBuiltHead: meta.runtime.platform.gitHead,
        navigatorHead: meta.runtime.navigator.gitHead,
      },
      cleanupProbes,
      login,
      specialist,
    };
  } finally {
    cleanupHarnessSideEffects();
  }
}

async function main() {
  const payload = await runUnifiedPrepBrowserSmoke();
  const jsonOut = resolveBrowserJsonOut();
  writeFileSync(jsonOut, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, out: jsonOut, status: payload.status }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      const fail = {
        status: 'FAIL',
        error: String(e?.message ?? e),
        capturedAt: new Date().toISOString(),
      };
      try {
        writeFileSync(resolveBrowserJsonOut(), `${JSON.stringify(fail, null, 2)}\n`);
      } catch {
        /* ignore */
      }
      console.error(JSON.stringify(fail));
      process.exit(1);
    });
}
