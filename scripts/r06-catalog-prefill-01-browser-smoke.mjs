#!/usr/bin/env node
/**
 * R06-PROFILE-CATALOG-PREFILL-01.2 — isolated MOCK browser smoke (platform + in-memory BFF).
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  findFreeLoopbackPort,
  isLoopbackPortOpen,
  spawnOwnedNextStart,
  stopOwnedServer,
} from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';

async function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
import { startCatalogPrefillMockBff } from './lib/r06-catalog-prefill-mock-bff.mjs';
import { advanceCatalogSteps, ensureCatalogStep } from './lib/r06-playwright-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist');
const REPORT = path.join(OUT, 'R06-CATALOG-PREFILL-01-BROWSER-MOCK.json');
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-catalog-prefill-smoke';
const CODE_SHA = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();

const PROD_ENV_LOCAL = path.join(ROOT, '.env.production.local');
let prodEnvBackup = null;

function pinProductionEnv(appOrigin, mockBaseUrl) {
  try {
    prodEnvBackup = existsSync(PROD_ENV_LOCAL) ? readFileSync(PROD_ENV_LOCAL, 'utf8') : null;
  } catch {
    prodEnvBackup = null;
  }
  writeFileSync(
    PROD_ENV_LOCAL,
    `REMCARD_API_BASE_URL=${mockBaseUrl}\nNEXT_PUBLIC_APP_URL=${appOrigin}\nREMCARD_PROXY_TRUST_LOOPBACK_ORIGIN=1\n`,
  );
}

function restoreProductionEnv() {
  if (prodEnvBackup == null) {
    try {
      if (existsSync(PROD_ENV_LOCAL)) {
        unlinkSync(PROD_ENV_LOCAL);
      }
    } catch {
      /* ignore */
    }
    return;
  }
  writeFileSync(PROD_ENV_LOCAL, prodEnvBackup);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const mock = await startCatalogPrefillMockBff();
  const platformPort =
    Number(process.env.R06_CATALOG_PREFILL_PLATFORM_PORT) ||
    (await findFreeLoopbackPort(30680, { maxScan: 40 }));
  if (!platformPort) throw new Error('no free platform port');
  if (await isLoopbackPortOpen(platformPort)) throw new Error(`platform port ${platformPort} busy`);

  const appOrigin = `http://127.0.0.1:${platformPort}`;
  pinProductionEnv(appOrigin, mock.baseUrl);
  let build = { status: 0, stdout: '', stderr: '' };
  const skipBuild =
    process.env.R06_SKIP_BUILD === '1' && existsSync(path.join(ROOT, DIST, 'BUILD_ID'));
  if (!skipBuild) {
    const buildCmd = `env -u R06_NEXT_DIST_DIR LOGIN_ENTRY_NEXT_DIST_DIR=${JSON.stringify(DIST)} npm run build`;
    build = spawnSync('bash', ['-lc', buildCmd], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production' },
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024,
    });
  }
  const buildOk = build.status === 0;
  const buildIdPath = path.join(ROOT, DIST, 'BUILD_ID');
  const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, 'utf8').trim() : null;

  const report = {
    mode: 'MOCK_BFF',
    codeSha: CODE_SHA,
    navigatorCodeSha: '9a5bced4513f15a95790be7c85813b185beadd10',
    backendChanged: false,
    mockBff: mock.baseUrl,
    appOrigin,
    distDir: DIST,
    build: { ok: buildOk, exitCode: build.status, buildId },
    steps: {},
    ok: false,
  };

  if (!buildOk || !buildId) {
    report.error = 'build_failed';
    writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
    restoreProductionEnv();
    await mock.close();
    process.exit(1);
  }

  const child = spawnOwnedNextStart({
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

  let page = null;
  try {
    const up = await waitForHttp(`${appOrigin}/login`, 120_000);
    if (!up) throw new Error('platform_start_timeout');

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
    });
    await context.addCookies([
      {
        name: 'remcard-token',
        value: 'mock-smoke-token',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err?.stack ?? err?.message ?? err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${appOrigin}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 120_000 });
    report.steps.draftFetchProbe = await page.evaluate(async () => {
      const r = await fetch('/api/remcard/api/pro/specialist-profile/draft', { credentials: 'include' });
      const text = await r.text();
      return { status: r.status, text: text.slice(0, 400) };
    });
    report.steps.r06StatusProbe = await page.evaluate(async () => {
      const r = await fetch('/api/remcard/api/pro/r06/status', { credentials: 'include' });
      return { status: r.status, text: (await r.text()).slice(0, 200) };
    });
    await page.waitForTimeout(5000);
    report.steps.domProbe = await page.evaluate(() => ({
      wizard: Boolean(document.querySelector('[data-testid="specialist-profile-wizard"]')),
      loading: Boolean(document.querySelector('[data-testid="specialist-profile-loading"]')),
      completed: Boolean(document.querySelector('[data-testid="specialist-profile-completed-summary"]')),
      snippet: document.body?.innerText?.slice(0, 600) ?? '',
    }));
    report.steps.pageErrors = pageErrors;
    report.steps.consoleErrors = consoleErrors;
    if (!report.steps.domProbe.wizard) {
      report.error = `specialist_wizard_missing:${JSON.stringify({ ...report.steps.domProbe, pageErrors })}`;
      throw new Error(report.error);
    }
    await page.locator('#sp-displayName').fill('Актуальное рабочее имя');
    await page.locator('#sp-city').fill('Krasnodar');
    await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
    await page.waitForSelector('#sp-kind', { timeout: 60_000 });
    await page.locator('#sp-kind').selectOption('designer');
    await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
    await page.waitForSelector('[data-testid="agent-profile-input-phone"]', { timeout: 60_000 });
    await page.locator('[data-testid="agent-profile-input-phone"]').fill('+79001112233');
    await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
    await page.getByRole('button', { name: 'Завершить профиль' }).click();
    await page.waitForSelector('[data-testid="specialist-profile-completed-summary"]', { timeout: 60_000 });
    report.steps.finishWorkingProfile = { ok: true };

    const workingBeforeCatalog = await page.evaluate(async () => {
      const r = await fetch('/api/remcard/api/pro/profile', { credentials: 'include' });
      const b = await r.json();
      return { displayName: b.user?.displayName, services: b.workingProfile?.serviceSpecializationIds };
    });
    report.steps.workingProfilePreserved = {
      ok:
        workingBeforeCatalog.displayName === 'Актуальное рабочее имя' &&
        (workingBeforeCatalog.services ?? []).includes('design'),
    };

    await page.goto(`${appOrigin}/profile?section=catalog`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="specialist-catalog-wizard"]', { timeout: 60_000 });
    const prefilledName = await page.locator('#sc-public-name').inputValue();
    report.steps.catalogPrefillName = {
      ok: prefilledName === 'Актуальное рабочее имя',
      value: prefilledName,
    };

    await page.locator('#sc-public-name').fill('Каталог замена');
    await advanceCatalogSteps(page, 2);
    await page.locator('#sc-tg').fill('@catalog_smoke');
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await page.waitForSelector('text=Черновик публикации сохранён', { timeout: 30_000 });

    await ensureCatalogStep(page, 0);
    await page.locator('#sc-public-name').fill('');
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await page.waitForSelector('text=Черновик публикации сохранён', { timeout: 30_000 });

    const afterClear = await page.evaluate(async () => {
      const r = await fetch('/api/remcard/api/pro/profile', { credentials: 'include' });
      const b = await r.json();
      return {
        catalogDisplayName: b.user?.catalogDisplayName,
        catalogDisplayNameSource: b.user?.catalogDisplayNameSource,
        displayName: b.user?.displayName,
        telegram: b.user?.telegram,
      };
    });
    report.steps.stagedClearGet = {
      ok:
        afterClear.catalogDisplayName === null &&
        afterClear.catalogDisplayNameSource === 'staged_draft' &&
        afterClear.displayName === 'Актуальное рабочее имя',
      ...afterClear,
    };

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#sc-public-name', { timeout: 60_000 });
    const reloadedName = await page.locator('#sc-public-name').inputValue();
    await advanceCatalogSteps(page, 2);
    const reloadedTg = await page.locator('#sc-tg').inputValue();
    await advanceCatalogSteps(page, 0);
    report.steps.reloadUi = {
      ok: reloadedName === '' && reloadedTg === '@catalog_smoke',
      catalogPublicName: reloadedName,
      telegram: reloadedTg,
    };

    const gateKeys = [
      'finishWorkingProfile',
      'workingProfilePreserved',
      'catalogPrefillName',
      'stagedClearGet',
      'reloadUi',
    ];
    report.ok = gateKeys.every((k) => report.steps[k]?.ok === true);
    await browser.close();
  } catch (e) {
    report.error = e instanceof Error ? e.message : String(e);
    try {
      writeFileSync(path.join(OUT, 'R06-CATALOG-PREFILL-01-BROWSER-DEBUG.html'), await page?.content?.());
    } catch {
      /* ignore */
    }
  } finally {
    restoreProductionEnv();
    await stopOwnedServer(child);
    await mock.close();
  }

  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
