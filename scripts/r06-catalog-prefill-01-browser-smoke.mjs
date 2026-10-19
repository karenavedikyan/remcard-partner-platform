#!/usr/bin/env node
/**
 * R06-PROFILE-CATALOG-PREFILL-01.3 — isolated MOCK browser smoke (no PostgreSQL).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  findFreeLoopbackPort,
  isLoopbackPortOpen,
  spawnOwnedNextStart,
  stopOwnedServer,
} from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';
import { createMockBffState, startCatalogPrefillMockBff } from './lib/r06-catalog-prefill-mock-bff.mjs';
import { R06_CONTACTS_FIXTURE } from './lib/r06-preview-fixture.mjs';
import { advanceCatalogSteps, ensureCatalogStep } from './lib/r06-playwright-catalog.mjs';
import {
  collectPrefillProvenance,
  pinProductionEnvLocal,
  probeRuntimeBuildId,
  runIsolatedPlatformBuild,
} from './lib/r06-catalog-prefill-mock-run.mjs';
import { R06_PREVIEW_FIXTURE, readImplCatalogDirections } from './lib/r06-preview-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-catalog-prefill-smoke';
const NAVIGATOR_PIN = '9a5bced4513f15a95790be7c85813b185beadd10';
process.env.R06_PLAYWRIGHT_CATALOG_AUTOFILL = '0';

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

function seedContactsSmokeMock(state) {
  const f = R06_CONTACTS_FIXTURE;
  state.profileFinished = false;
  state.specialistDraft = {
    contractVersion: 'r06-smoke',
    featureEnabled: true,
    step: 3,
    version: 1,
    hasDraft: true,
    profileComplete: false,
    payload: {
      displayName: f.displayName,
      city: f.city,
      specialistKind: 'designer',
      partnershipContactPhone: '',
      partnershipContactEmail: '',
      productCategoryIds: [],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
    },
    savedProfile: { displayName: f.displayName, city: f.city },
  };
}

async function runContactsControlBrowserSmoke() {
  const provenance = collectPrefillProvenance(ROOT, DIST);
  if (provenance.treeDirty) throw new Error(`tree_dirty:${provenance.treeDirtyFiles.join(';')}`);
  const codeSha = provenance.codeSha;
  const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist');
  mkdirSync(OUT, { recursive: true });
  const REPORT = path.join(OUT, `R06-CONTACTS-CONTROL-01-BROWSER-MOCK-${codeSha.slice(0, 12)}.json`);

  const mock = await startCatalogPrefillMockBff(seedContactsSmokeMock(createMockBffState()));
  const platformPort =
    Number(process.env.R06_CATALOG_PREFILL_PLATFORM_PORT) ||
    (await findFreeLoopbackPort(30680, { maxScan: 40 }));
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const envPin = pinProductionEnvLocal(ROOT, appOrigin, mock.baseUrl);
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  const report = {
    mode: 'MOCK_BFF',
    task: 'R06-CONTACTS-CONTROL-01',
    codeSha,
    sourceTreeDigest: provenance.sourceTreeDigest,
    treeDirty: false,
    build: { status: build.status, buildId: build.buildId, distDir: DIST },
    steps: {},
    ok: false,
    notRun: ['finishProfile', 'catalog', 'moderation', 'postgresql'],
  };
  if (build.status === 'failed' || !build.buildId) {
    report.error = 'build_failed';
    writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
    envPin.restore();
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

  let page;
  try {
    if (!(await waitForHttp(appOrigin, 120_000))) throw new Error('app_not_ready');
    report.steps.runtimeBuildId = {
      ok: (await probeRuntimeBuildId(appOrigin)) === build.buildId,
      buildId: build.buildId,
    };
    const browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(`${appOrigin}/profile?section=basics`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="specialist-profile-contacts-panel"]', { timeout: 60_000 });
    const phone = page.getByTestId('agent-profile-input-phone');
    await phone.fill(R06_CONTACTS_FIXTURE.phone);
    await phone.blur();
    await page.locator('#sp-email').fill(R06_CONTACTS_FIXTURE.email);
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await page.waitForTimeout(800);
    const getRes = await fetch(`${mock.baseUrl}/api/pro/specialist-profile/draft`);
    const body = await getRes.json();
    report.steps.savePatch = {
      ok: Boolean(body.payload?.partnershipContactPhone && body.payload?.partnershipContactEmail),
      phone: body.payload?.partnershipContactPhone,
      email: body.payload?.partnershipContactEmail,
    };
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="specialist-profile-contacts-panel"]');
    report.steps.reloadUi = {
      ok:
        (await phone.inputValue()).includes('9186360088') ||
        (await phone.inputValue()).includes('+7'),
      email: await page.locator('#sp-email').inputValue(),
    };
    report.ok =
      report.steps.runtimeBuildId.ok &&
      report.steps.savePatch.ok &&
      report.steps.reloadUi.ok &&
      report.steps.reloadUi.email === R06_CONTACTS_FIXTURE.email;
    await browser.close();
  } finally {
    envPin.restore();
    await stopOwnedServer(child);
    await mock.close();
  }
  report.evidenceSha256 = createHash('sha256').update(JSON.stringify(report)).digest('hex');
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: REPORT, ok: report.ok, evidenceSha256: report.evidenceSha256 }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

async function main() {
  if (process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01') {
    return runContactsControlBrowserSmoke();
  }
  const provenance = collectPrefillProvenance(ROOT, DIST);
  if (provenance.treeDirty) {
    throw new Error(`tree_dirty:${provenance.treeDirtyFiles.join(';')}`);
  }

  const codeSha = provenance.codeSha;
  const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist');
  mkdirSync(OUT, { recursive: true });
  const REPORT = path.join(OUT, `R06-CATALOG-PREFILL-01-BROWSER-MOCK-${codeSha.slice(0, 12)}.json`);

  const mock = await startCatalogPrefillMockBff();
  const platformPort =
    Number(process.env.R06_CATALOG_PREFILL_PLATFORM_PORT) ||
    (await findFreeLoopbackPort(30680, { maxScan: 40 }));
  if (!platformPort) throw new Error('no free platform port');
  if (await isLoopbackPortOpen(platformPort)) throw new Error(`platform port ${platformPort} busy`);

  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const envPin = pinProductionEnvLocal(ROOT, appOrigin, mock.baseUrl);
  const build = runIsolatedPlatformBuild(ROOT, DIST);

  const report = {
    mode: 'MOCK_BFF',
    task: 'R06-SPECIALIST-VISUAL-01.1',
    codeSha,
    navigatorCodeSha: NAVIGATOR_PIN,
    sourceTreeDigest: provenance.sourceTreeDigest,
    treeDirty: false,
    backendChanged: false,
    mockBff: mock.baseUrl,
    appOrigin,
    distDir: DIST,
    build: {
      status: build.status,
      ok: build.status === 'ok',
      skipped: build.status === 'skipped',
      exitCode: build.exitCode,
      buildId: build.buildId,
    },
    steps: {},
    ok: false,
    notRun: [],
  };

  if (build.status === 'failed' || !build.buildId) {
    report.error = 'build_failed';
    writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
    envPin.restore();
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
    if (!(await waitForHttp(`${appOrigin}/login`, 120_000))) throw new Error('platform_start_timeout');
    report.steps.runtimeBuildId = {
      ok: false,
      value: null,
    };
    const runtimeId = await probeRuntimeBuildId(appOrigin, build.buildId);
    report.steps.runtimeBuildId = { ok: runtimeId === build.buildId, value: runtimeId, expected: build.buildId };

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
    await page.goto(`${appOrigin}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForSelector('[data-testid="specialist-profile-wizard"]', { timeout: 60_000 });

    await page.locator('#sp-displayName').fill('Актуальное рабочее имя');
    await page.locator('#sp-city').fill('Krasnodar');
    await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
    await page.waitForSelector('#sp-kind', { timeout: 60_000 });
    await page.locator('#sp-kind').selectOption('designer');
    await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
    await page.waitForSelector('[data-testid="agent-profile-input-phone"]', { timeout: 60_000 });
    await page.locator('[data-testid="agent-profile-input-phone"]').fill('+79001112233');
    await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
    await page.getByRole('button', { name: /Сохранить профиль|Завершить профиль/i }).click();
    await page.waitForSelector('[data-testid="specialist-profile-completed-summary"]', { timeout: 60_000 });
    report.steps.finishWorkingProfile = { ok: true };

    const workingBeforeCatalog = await page.evaluate(async () => {
      const r = await fetch('/api/remcard/api/pro/profile', { credentials: 'include' });
      const b = await r.json();
      return {
        displayName: b.user?.displayName,
        services: b.workingProfile?.serviceSpecializationIds,
        stages: b.workingProfile?.navigatorStageIds,
      };
    });
    report.steps.workingProfilePreserved = {
      ok:
        workingBeforeCatalog.displayName === 'Актуальное рабочее имя' &&
        (workingBeforeCatalog.services ?? []).includes('design') &&
        (workingBeforeCatalog.services ?? []).includes('planning'),
      ...workingBeforeCatalog,
    };

    await page.getByTestId('specialist-catalog-cta').getByRole('link', { name: 'Перейти к каталогу' }).click();
    await page.waitForSelector('[data-testid="specialist-catalog-wizard"]', { timeout: 60_000 });
    report.steps.catalogUiTransition = {
      ok: page.url().includes('section=catalog'),
      method: 'specialist_catalog_cta_link',
      note: 'no page.goto to catalog; in-app Link from completed summary',
      urlAfter: page.url(),
    };

    const prefilledName = await page.locator('#sc-public-name').inputValue();
    report.steps.catalogPrefillName = {
      ok: prefilledName === 'Актуальное рабочее имя',
      value: prefilledName,
    };

    await advanceCatalogSteps(page, 1);
    const kindSelect = page.locator('#sc-specialist-kind');
    if (await kindSelect.count()) {
      await kindSelect.selectOption('other');
      await page.waitForSelector('[data-testid="specialist-preset-custom-title-blocked"]', {
        timeout: 15_000,
      });
      report.steps.catalogOtherTitleBlocked = {
        ok: (await page.locator('#sc-specialist-kind-title').count()) === 0,
      };
    } else {
      report.steps.catalogOtherTitleBlocked = { ok: false, error: 'missing_kind_select' };
    }
    const dirs = await readImplCatalogDirections(page);
    report.steps.catalogPresetPrefill = {
      ok:
        dirs &&
        R06_PREVIEW_FIXTURE.serviceLabels.every((label) => dirs.services?.includes(label)) &&
        R06_PREVIEW_FIXTURE.stageImplLabels.every((label) => dirs.stages?.includes(label)),
      ...dirs,
      expected: {
        serviceLabels: R06_PREVIEW_FIXTURE.serviceLabels,
        stageLabels: R06_PREVIEW_FIXTURE.stageImplLabels,
      },
    };
    await ensureCatalogStep(page, 0);

    await page.locator('#sc-public-name').fill('Каталог замена');
    await advanceCatalogSteps(page, 2);
    await page.locator('#sc-tg').fill('@catalog_smoke');
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await page.waitForSelector('text=Черновик публикации сохранён', { timeout: 30_000 });

    await advanceCatalogSteps(page, 1);
    const wizardRoot = page.locator('[data-testid="specialist-catalog-wizard"]');
    const adv = wizardRoot.locator('[data-testid="direction-advanced-collapse"]');
    if (await adv.count() && !(await adv.evaluate((el) => el.open))) {
      await adv.locator('summary').click();
    }
    const checked = wizardRoot.locator('input[type="checkbox"]:checked');
    for (let i = (await checked.count()) - 1; i >= 0; i -= 1) {
      await checked.nth(i).uncheck();
    }
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
        navigatorStageIds: b.user?.catalogDraft?.navigatorStageIds ?? b.user?.navigatorStageIds,
        specializations: b.user?.specializations,
      };
    });
    report.steps.stagedClearGet = {
      ok:
        afterClear.catalogDisplayName === null &&
        afterClear.catalogDisplayNameSource === 'staged_draft' &&
        afterClear.displayName === 'Актуальное рабочее имя' &&
        (afterClear.navigatorStageIds ?? []).length === 0 &&
        (afterClear.specializations ?? []).length === 0,
      ...afterClear,
    };

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#sc-public-name', { timeout: 60_000 });
    const reloadedName = await page.locator('#sc-public-name').inputValue();
    const afterReloadGet = await page.evaluate(async () => {
      const r = await fetch('/api/remcard/api/pro/profile', { credentials: 'include' });
      const b = await r.json();
      return {
        telegram: b.user?.telegram,
        navigatorStageIds: b.user?.catalogDraft?.navigatorStageIds ?? [],
        specializations: b.user?.specializations ?? [],
        catalogDisplayNameSource: b.user?.catalogDisplayNameSource,
      };
    });
    report.steps.reloadUi = {
      ok:
        reloadedName === '' &&
        afterReloadGet.telegram === '@catalog_smoke' &&
        (afterReloadGet.navigatorStageIds ?? []).length === 0 &&
        (afterReloadGet.specializations ?? []).length === 0 &&
        afterReloadGet.catalogDisplayNameSource === 'staged_draft',
      catalogPublicName: reloadedName,
      ...afterReloadGet,
    };

    const gateKeys = [
      'runtimeBuildId',
      'finishWorkingProfile',
      'workingProfilePreserved',
      'catalogUiTransition',
      'catalogPrefillName',
      'catalogOtherTitleBlocked',
      'catalogPresetPrefill',
      'stagedClearGet',
      'reloadUi',
    ];
    report.ok = gateKeys.every((k) => report.steps[k]?.ok === true);
    report.notRun = ['moderation_submit', 'production_db', 'pg_disposable', 'visual_pixel_diff'];
    await browser.close();
  } catch (e) {
    report.error = e instanceof Error ? e.message : String(e);
    try {
      writeFileSync(path.join(OUT, 'R06-CATALOG-PREFILL-01-BROWSER-DEBUG.html'), await page?.content?.());
    } catch {
      /* ignore */
    }
  } finally {
    envPin.restore();
    await stopOwnedServer(child);
    await mock.close();
  }

  report.evidenceSha256 = createHash('sha256').update(JSON.stringify(report)).digest('hex');
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: REPORT, ok: report.ok, evidenceSha256: report.evidenceSha256 }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
