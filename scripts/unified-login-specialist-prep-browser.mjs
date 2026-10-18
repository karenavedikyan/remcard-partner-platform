#!/usr/bin/env node
/**
 * UNIFIED-LOGIN-SPECIALIST-PREP-01.1 narrow browser smoke on disposable r06-local-stack runtime.
 * No prod, no MAX/Telegram send — mock OTP + mint cookie specialist paths only.
 */
import { chromium } from 'playwright';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = path.resolve(ROOT, '../remcard-navigator');
const OUT = path.join(ROOT, 'artifacts/unified-login-specialist-prep');
const JSON_OUT = path.join(OUT, 'UNIFIED-PREP-01-BROWSER.json');

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
    /** Unified release uses full platform integration SHA for stack pin (login+R06). */
    platformStackPin: platformBuiltHead,
    specialistUiPin,
    navigator: gitRevParse(NAV),
  };
}

const RUN_DIR = process.env.UNIFIED_PREP_RUN_DIR || '/tmp/unified-login-specialist-prep-stack';
const FIXTURE_OTP = '847291';
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
    },
  });
}

function runSeed(env, tag, reseed = false) {
  materializeLoginFixtures();
  assertDisposableDatabaseUrl(env.DATABASE_URL ?? '', { label: 'DATABASE_URL' });
  const r = spawnSync('pnpm', ['exec', 'tsx', NAV_SEED], {
    cwd: NAV,
    env: withDevNodeEnv({
      ...process.env,
      ...env,
      LOGIN_LAYOUT_FIXTURE_TAG: tag,
      LOGIN_LAYOUT_FIXTURE_OTP: FIXTURE_OTP,
      LOGIN_LAYOUT_RESEED: reseed ? '1' : '0',
    }),
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`seed failed: ${r.stderr || r.stdout}`);
  return JSON.parse(r.stdout.trim());
}

function runLoginCleanup(env, tag) {
  materializeLoginFixtures();
  const r = spawnSync('pnpm', ['exec', 'tsx', NAV_CLEANUP, tag], {
    cwd: NAV,
    env: withDevNodeEnv({
      ...process.env,
      ...env,
      LOGIN_LAYOUT_FIXTURE_MAX_ID: '881001847291',
      LOGIN_LAYOUT_FIXTURE_OTP: FIXTURE_OTP,
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

function runFixture(env, action) {
  const r = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', action], {
    cwd: NAV,
    env: withDevNodeEnv({ ...process.env, ...env }),
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`${action} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
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
  const seed = runSeed(env, fixtureTag);
  const browser = await chromium.launch({ headless: true });
  const results = { viewports: {}, logout: {}, cleanup: null };
  try {
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
      if (vp.assertDesktop) {
        if ((metrics.entryLayoutWidth ?? 0) < DESKTOP_LAYOUT_GATE.entryLayoutMin) {
          throw new Error(`desktop entryLayout too narrow: ${metrics.entryLayoutWidth}`);
        }
      }
      results.viewports[vp.key] = { ok: true, metrics };
      await ctx.close();
    }

    runSeed(env, fixtureTag, true);
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page2 = await ctx2.newPage();
    await loginFlow(page2, platformOrigin, seed);
    results.relogin = { ok: true, url: page2.url() };
    await ctx2.close();
  } finally {
    await browser.close();
  }
  results.cleanup = runLoginCleanup(env, fixtureTag);
  return { ok: true, fixtureTag, seedUserId: seed.userId, ...results };
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
  runFixture(env, 'reset-e2e');
  const browser = await chromium.launch({ headless: true });
  const steps = {};
  try {
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

    runFixture(env, 'reset-e2e');
    return { ok: true, steps };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

export async function runUnifiedPrepBrowserSmoke() {
  const pins = resolvePins();
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
  const login = await runLoginSmoke(platformOrigin, env, fixtureTag);
  const specialist = await runSpecialistSmoke(env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''), env);

  return {
    status: 'PASS',
    capturedAt: new Date().toISOString(),
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
    login,
    specialist,
  };
}

async function main() {
  try {
    const payload = await runUnifiedPrepBrowserSmoke();
    writeFileSync(JSON_OUT, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, out: JSON_OUT, status: payload.status }));
    process.exit(0);
  } catch (e) {
    const fail = {
      status: 'FAIL',
      error: String(e?.message ?? e),
      capturedAt: new Date().toISOString(),
    };
    writeFileSync(JSON_OUT, `${JSON.stringify(fail, null, 2)}\n`);
    console.error(JSON.stringify(fail));
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
