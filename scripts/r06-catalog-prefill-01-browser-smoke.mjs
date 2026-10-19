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
import { R06_CONTACTS_FIXTURE, R06_PROFILE_PATTERN_FIXTURE } from './lib/r06-preview-fixture.mjs';
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
  const payload = {
    displayName: f.displayName,
    city: f.city,
    specialistKind: 'designer',
    specialistTitle: '',
    serviceSpecializationIds: ['design'],
    navigatorStageIds: ['L1-1'],
    partnershipContactPhone: '',
    partnershipContactEmail: '',
    productCategoryIds: [],
  };
  state.profileFinished = false;
  state.workingDisplayName = f.displayName;
  state.workingCity = f.city;
  state.specialistDraft = {
    contractVersion: 'r06-smoke',
    featureEnabled: true,
    step: 3,
    version: 1,
    hasDraft: true,
    profileComplete: false,
    payload,
    savedProfile: {
      ...payload,
      partnershipContactPhone: '',
      partnershipContactEmail: '',
    },
  };
}

const EXPECT_CONTACT_PHONE = '+79186360088';

/** Mirrors canonicalizeRuContactPhone for smoke UI display compare (no new dependency). */
function normalizeUiPhoneDisplayForCompare(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  const compact = text.replace(/\s/g, '');
  if (compact.startsWith('+') && !compact.startsWith('+7')) return '';
  let digits = text.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10 && !compact.startsWith('+')) digits = `7${digits}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  return '';
}

function assertContactsPhoneNormalizeSelfCheck() {
  if (normalizeUiPhoneDisplayForCompare('+7 (918) 636-00-88') !== EXPECT_CONTACT_PHONE) {
    throw new Error('phone_normalize_selfcheck_formatted');
  }
  if (normalizeUiPhoneDisplayForCompare('') !== '') {
    throw new Error('phone_normalize_selfcheck_empty');
  }
  if (normalizeUiPhoneDisplayForCompare('+7 (999) 111-22-33') === EXPECT_CONTACT_PHONE) {
    throw new Error('phone_normalize_selfcheck_wrong_number');
  }
}

function seedProfilePatternSmokeMock(state) {
  const f = R06_PROFILE_PATTERN_FIXTURE;
  const payload = {
    displayName: 'Старое Имя Черновик',
    city: 'Старый Город',
    specialistKind: '',
    specialistTitle: '',
    serviceSpecializationIds: [],
    navigatorStageIds: [],
    partnershipContactPhone: '',
    partnershipContactEmail: '',
    productCategoryIds: [],
  };
  state.profileFinished = false;
  state.workingDisplayName = payload.displayName;
  state.workingCity = payload.city;
  state.specialistDraft = {
    contractVersion: 'r06-smoke',
    featureEnabled: true,
    step: 1,
    version: 1,
    hasDraft: true,
    profileComplete: false,
    payload,
    savedProfile: { ...payload },
  };
}

function setsEqual(a, b) {
  const sa = [...new Set(a ?? [])].sort();
  const sb = [...new Set(b ?? [])].sort();
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

async function runProfilePatternBrowserSmoke(taskLabel = 'R06-PROFILE-PATTERN-TRANSFER-01') {
  const provenance = collectPrefillProvenance(ROOT, DIST);
  if (provenance.treeDirty) throw new Error(`tree_dirty:${provenance.treeDirtyFiles.join(';')}`);
  const codeSha = provenance.codeSha;
  const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist');
  mkdirSync(OUT, { recursive: true });
  const REPORT = path.join(OUT, `${taskLabel}-BROWSER-MOCK-${codeSha.slice(0, 12)}.json`);
  const f = R06_PROFILE_PATTERN_FIXTURE;

  const mock = await startCatalogPrefillMockBff(seedProfilePatternSmokeMock(createMockBffState()));
  const platformPort =
    Number(process.env.R06_CATALOG_PREFILL_PLATFORM_PORT) ||
    (await findFreeLoopbackPort(30680, { maxScan: 40 }));
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const envPin = pinProductionEnvLocal(ROOT, appOrigin, mock.baseUrl);
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  const expectedBuildId = process.env.R06_EXPECT_BUILD_ID?.trim();
  if (expectedBuildId && build.buildId && build.buildId !== expectedBuildId) {
    throw new Error(`build_id_mismatch:expected=${expectedBuildId}:got=${build.buildId}`);
  }
  const report = {
    mode: 'MOCK_BFF',
    task: taskLabel,
    codeSha,
    sourceTreeDigest: provenance.sourceTreeDigest,
    treeDirty: false,
    build: {
      status: build.status,
      buildId: build.buildId,
      distDir: DIST,
      reusedDist: build.status === 'skipped',
    },
    steps: {},
    ok: false,
    notRun: ['finishProfile', 'catalog', 'moderation', 'postgresql', 'wideRegression'],
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

  try {
    if (!(await waitForHttp(`${appOrigin}/login`, 120_000))) throw new Error('app_not_ready');
    report.steps.runtimeBuildId = {
      ok: (await probeRuntimeBuildId(appOrigin, build.buildId)) === build.buildId,
      buildId: build.buildId,
    };
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'remcard-token',
        value: 'mock-pattern-smoke-token',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    const page = await context.newPage();
    await page.goto(`${appOrigin}/profile?section=basics`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="specialist-profile-wizard"]', { timeout: 60_000 });
    await page.waitForSelector('[data-testid="specialist-profile-basics-panel"]', { timeout: 60_000 });

    await page.locator('#sp-displayName').fill(f.displayName);
    await page.locator('#sp-city').fill(f.city);
    const basicsPatchWait = page.waitForResponse(
      (res) =>
        res.url().includes('/api/pro/specialist-profile/draft') &&
        res.request().method() === 'PATCH' &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await basicsPatchWait;
    const getBasics = await fetch(`${mock.baseUrl}/api/pro/specialist-profile/draft`);
    const basicsBody = await getBasics.json();
    report.steps.basicsSaveGet = {
      ok:
        basicsBody.payload?.displayName === f.displayName &&
        basicsBody.payload?.city === f.city,
      expected: { displayName: f.displayName, city: f.city },
      actual: {
        displayName: basicsBody.payload?.displayName ?? null,
        city: basicsBody.payload?.city ?? null,
      },
    };
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="specialist-profile-basics-panel"]', { timeout: 60_000 });
    report.steps.basicsReloadUi = {
      ok:
        (await page.locator('#sp-displayName').inputValue()) === f.displayName &&
        (await page.locator('#sp-city').inputValue()) === f.city,
      expected: { displayName: f.displayName, city: f.city },
      actual: {
        displayName: await page.locator('#sp-displayName').inputValue(),
        city: await page.locator('#sp-city').inputValue(),
      },
    };

    const advanceSpecWait = page.waitForResponse(
      (res) =>
        res.url().includes('/api/pro/specialist-profile/draft') &&
        res.request().method() === 'PATCH' &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 30_000 },
    );
    await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((form) => form.requestSubmit());
    await advanceSpecWait;
    await page.waitForSelector('[data-testid="specialist-profile-specialization-panel"]', {
      timeout: 60_000,
    });
    await page.locator('[data-specialist-kind]').selectOption(f.specialistKind);
    await page.waitForFunction(
      () => {
        const w = document.querySelector('[data-testid="specialist-profile-specialization-panel"]');
        if (!w) return false;
        const fieldsets = [...w.querySelectorAll('fieldset')];
        const services = fieldsets.find((fs) =>
          (fs.querySelector('legend')?.textContent || '').includes('Работы и услуги'),
        );
        return services && services.querySelectorAll('input[type="checkbox"]').length >= 2;
      },
      undefined,
      { timeout: 60_000 },
    );
    const servicesGroup = page
      .locator('[data-testid="specialist-profile-specialization-panel"]')
      .getByRole('group', { name: 'Работы и услуги' });
    for (const label of f.serviceLabels) {
      const cb = servicesGroup.getByRole('checkbox', { name: label, exact: true });
      if (!(await cb.isChecked())) await cb.check();
    }
    const adv = page.getByTestId('direction-advanced-collapse');
    if (await adv.count()) {
      if (!(await adv.evaluate((el) => el.open))) await adv.locator('summary').click();
    }
    const stagesGroup = page
      .locator('[data-testid="specialist-profile-specialization-panel"]')
      .getByRole('group', { name: /На каких этапах/i });
    for (const label of f.stageImplLabels) {
      const cb = stagesGroup.getByRole('checkbox', { name: label, exact: true });
      if (!(await cb.isChecked())) await cb.check();
    }
    report.steps.specializationDesignerUi = {
      ok: (await page.locator('[data-specialist-kind]').inputValue()) === f.specialistKind,
      expectedKind: f.specialistKind,
      actualKind: await page.locator('[data-specialist-kind]').inputValue(),
    };

    await page.locator('[data-specialist-kind]').selectOption('other');
    await page.locator('#sp-kind-title').fill(f.customSpecialistTitle);
    const specSaveWait = page.waitForResponse(
      (res) =>
        res.url().includes('/api/pro/specialist-profile/draft') &&
        res.request().method() === 'PATCH' &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    await specSaveWait;
    const getSpec = await fetch(`${mock.baseUrl}/api/pro/specialist-profile/draft`);
    const specBody = await getSpec.json();
    report.steps.specializationCustomSaveGet = {
      ok:
        specBody.payload?.specialistKind === 'other' &&
        specBody.payload?.specialistTitle === f.customSpecialistTitle &&
        setsEqual(specBody.payload?.serviceSpecializationIds, f.serviceSpecializationIds) &&
        setsEqual(specBody.payload?.navigatorStageIds, f.navigatorStageIds),
      expected: {
        kind: 'other',
        title: f.customSpecialistTitle,
        serviceSpecializationIds: f.serviceSpecializationIds,
        navigatorStageIds: f.navigatorStageIds,
      },
      actual: {
        kind: specBody.payload?.specialistKind ?? null,
        title: specBody.payload?.specialistTitle ?? null,
        serviceSpecializationIds: specBody.payload?.serviceSpecializationIds ?? [],
        navigatorStageIds: specBody.payload?.navigatorStageIds ?? [],
      },
    };
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="specialist-profile-specialization-panel"]', {
      timeout: 60_000,
    });
    report.steps.specializationReloadUi = {
      ok:
        (await page.locator('[data-specialist-kind]').inputValue()) === 'other' &&
        (await page.locator('#sp-kind-title').inputValue()) === f.customSpecialistTitle,
      expected: { kind: 'other', title: f.customSpecialistTitle },
      actual: {
        kind: await page.locator('[data-specialist-kind]').inputValue(),
        title: await page.locator('#sp-kind-title').inputValue(),
      },
    };

    const advanceContactsWait = page.waitForResponse(
      (res) =>
        res.url().includes('/api/pro/specialist-profile/draft') &&
        res.request().method() === 'PATCH' &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 30_000 },
    );
    await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((form) => form.requestSubmit());
    await advanceContactsWait;
    await page.waitForSelector('[data-testid="specialist-profile-contacts-panel"]', { timeout: 60_000 });
    await page.getByRole('button', { name: 'Пропустить' }).click();
    await page.waitForResponse(
      (res) =>
        res.url().includes('/api/pro/specialist-profile/draft') &&
        res.request().method() === 'PATCH' &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 30_000 },
    );
    await page.waitForSelector('[data-testid="specialist-profile-review-panel"]', { timeout: 60_000 });
    const reviewText = await page.locator('[data-testid="specialist-profile-review-panel"]').innerText();
    report.steps.reviewSummary = {
      ok:
        reviewText.includes(f.displayName) &&
        reviewText.includes(f.city) &&
        reviewText.includes(f.customSpecialistTitle),
      expectedFragments: [f.displayName, f.city, f.customSpecialistTitle],
      actualSample: reviewText.slice(0, 500),
    };
    report.steps.finishClicked = { ok: true, skipped: true };

    report.ok =
      report.steps.runtimeBuildId.ok &&
      report.steps.basicsSaveGet.ok &&
      report.steps.basicsReloadUi.ok &&
      report.steps.specializationDesignerUi.ok &&
      report.steps.specializationCustomSaveGet.ok &&
      report.steps.specializationReloadUi.ok &&
      report.steps.reviewSummary.ok;
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

async function runContactsControlBrowserSmoke() {
  assertContactsPhoneNormalizeSelfCheck();
  const provenance = collectPrefillProvenance(ROOT, DIST);
  if (provenance.treeDirty) throw new Error(`tree_dirty:${provenance.treeDirtyFiles.join(';')}`);
  const codeSha = provenance.codeSha;
  const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist');
  mkdirSync(OUT, { recursive: true });
  const contactsTask =
    process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01.2'
      ? 'R06-CONTACTS-CONTROL-01.2'
      : 'R06-CONTACTS-CONTROL-01.1';
  const REPORT = path.join(OUT, `${contactsTask}-BROWSER-MOCK-${codeSha.slice(0, 12)}.json`);

  const mock = await startCatalogPrefillMockBff(seedContactsSmokeMock(createMockBffState()));
  const platformPort =
    Number(process.env.R06_CATALOG_PREFILL_PLATFORM_PORT) ||
    (await findFreeLoopbackPort(30680, { maxScan: 40 }));
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const envPin = pinProductionEnvLocal(ROOT, appOrigin, mock.baseUrl);
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  const report = {
    mode: 'MOCK_BFF',
    task: contactsTask,
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
    if (!(await waitForHttp(`${appOrigin}/login`, 120_000))) throw new Error('app_not_ready');
    report.steps.runtimeBuildId = {
      ok: (await probeRuntimeBuildId(appOrigin, build.buildId)) === build.buildId,
      buildId: build.buildId,
    };
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
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
    await page.goto(`${appOrigin}/profile?section=basics`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="specialist-profile-wizard"]', { timeout: 60_000 });
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="specialist-profile-loading"]'),
      undefined,
      { timeout: 60_000 },
    );
    if (!(await page.locator('[data-testid="specialist-profile-contacts-panel"]').count())) {
      await page.locator('#sp-displayName').fill(R06_CONTACTS_FIXTURE.displayName);
      await page.locator('#sp-city').fill(R06_CONTACTS_FIXTURE.city);
      await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
      await page.waitForSelector('[data-specialist-kind]', { timeout: 30_000 });
      await page.locator('[data-specialist-kind]').selectOption('designer');
      await page.locator('[data-testid="specialist-profile-wizard"] form').evaluate((f) => f.requestSubmit());
    }
    await page.waitForSelector('[data-testid="specialist-profile-contacts-panel"]', { timeout: 60_000 });
    const phone = page.getByTestId('agent-profile-input-phone');
    const emailInput = page.locator('#sp-email');
    const initialGet = await fetch(`${mock.baseUrl}/api/pro/specialist-profile/draft`);
    const initialBody = await initialGet.json();
    const isEmptyContact = (v) => v == null || String(v).trim() === '';
    report.steps.initialGet = {
      ok:
        isEmptyContact(initialBody.payload?.partnershipContactPhone) &&
        isEmptyContact(initialBody.payload?.partnershipContactEmail),
      expected: { phone: '', email: '' },
      actual: {
        phone: initialBody.payload?.partnershipContactPhone ?? null,
        email: initialBody.payload?.partnershipContactEmail ?? null,
      },
    };
    await phone.fill(R06_CONTACTS_FIXTURE.phone);
    await phone.blur();
    await emailInput.fill(R06_CONTACTS_FIXTURE.email);
    const patchWait = page.waitForResponse(
      (res) =>
        res.url().includes('/api/pro/specialist-profile/draft') &&
        res.request().method() === 'PATCH' &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
    const patchRes = await patchWait;
    let patchPayload = null;
    try {
      const raw = patchRes.request().postData();
      patchPayload = raw ? JSON.parse(raw) : null;
    } catch {
      patchPayload = null;
    }
    report.steps.patchRequest = {
      ok: Boolean(patchPayload?.payload),
      expected: {
        phone: EXPECT_CONTACT_PHONE,
        email: R06_CONTACTS_FIXTURE.email,
      },
      actual: {
        phone: patchPayload?.payload?.partnershipContactPhone ?? null,
        email: patchPayload?.payload?.partnershipContactEmail ?? null,
      },
    };
    report.steps.patchRequest.ok =
      report.steps.patchRequest.actual.phone === EXPECT_CONTACT_PHONE &&
      report.steps.patchRequest.actual.email === R06_CONTACTS_FIXTURE.email;

    const getRes = await fetch(`${mock.baseUrl}/api/pro/specialist-profile/draft`);
    const body = await getRes.json();
    report.steps.getAfterPatch = {
      ok:
        body.payload?.partnershipContactPhone === EXPECT_CONTACT_PHONE &&
        body.payload?.partnershipContactEmail === R06_CONTACTS_FIXTURE.email,
      expected: {
        phone: EXPECT_CONTACT_PHONE,
        email: R06_CONTACTS_FIXTURE.email,
      },
      actual: {
        phone: body.payload?.partnershipContactPhone ?? null,
        email: body.payload?.partnershipContactEmail ?? null,
      },
    };
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="specialist-profile-wizard"]', { timeout: 60_000 });
    if (!(await page.locator('[data-testid="specialist-profile-contacts-panel"]').count())) {
      await page.getByRole('button', { name: /Связь и работа/i }).click();
    }
    await page.waitForSelector('[data-testid="specialist-profile-contacts-panel"]', { timeout: 60_000 });
    const uiEmail = await emailInput.inputValue();
    const uiPhoneRaw = await phone.inputValue();
    const uiPhoneNormalized = normalizeUiPhoneDisplayForCompare(uiPhoneRaw);
    const getAfterReload = await fetch(`${mock.baseUrl}/api/pro/specialist-profile/draft`);
    const reloadBody = await getAfterReload.json();
    const uiPhoneExactOk = uiPhoneNormalized === EXPECT_CONTACT_PHONE;
    report.steps.phoneNormalizeSelfCheck = { ok: true };
    report.steps.reloadUi = {
      ok:
        reloadBody.payload?.partnershipContactPhone === EXPECT_CONTACT_PHONE &&
        reloadBody.payload?.partnershipContactEmail === R06_CONTACTS_FIXTURE.email &&
        uiEmail === R06_CONTACTS_FIXTURE.email &&
        uiPhoneExactOk,
      expected: {
        phone: EXPECT_CONTACT_PHONE,
        email: R06_CONTACTS_FIXTURE.email,
        uiPhoneNormalized: EXPECT_CONTACT_PHONE,
      },
      actual: {
        getPhone: reloadBody.payload?.partnershipContactPhone ?? null,
        getEmail: reloadBody.payload?.partnershipContactEmail ?? null,
        uiEmail,
        uiPhoneRaw,
        uiPhoneNormalized,
        uiPhoneExactOk,
      },
    };
    report.ok =
      report.steps.runtimeBuildId.ok &&
      report.steps.initialGet.ok &&
      report.steps.patchRequest.ok &&
      report.steps.getAfterPatch.ok &&
      report.steps.reloadUi.ok;
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
  if (
    process.env.R06_TASK_ID === 'R06-PROFILE-PATTERN-TRANSFER-01' ||
    process.env.R06_TASK_ID === 'R06-PROFILE-VISUAL-REMAINDERS-01' ||
    process.env.R06_TASK_ID === 'R06-PROFILE-LAYOUT-REGRESSION-01' ||
    process.env.R06_TASK_ID === 'R06-PROFILE-PROTOTYPE-FINISH-01' ||
    process.env.R06_TASK_ID === 'R06-PROFILE-PROTOTYPE-FINISH-01.1'
  ) {
    const taskLabel =
      process.env.R06_TASK_ID === 'R06-PROFILE-VISUAL-REMAINDERS-01'
        ? 'R06-PROFILE-VISUAL-REMAINDERS-01'
        : process.env.R06_TASK_ID === 'R06-PROFILE-LAYOUT-REGRESSION-01'
          ? 'R06-PROFILE-LAYOUT-REGRESSION-01'
          : process.env.R06_TASK_ID === 'R06-PROFILE-PROTOTYPE-FINISH-01.1'
            ? 'R06-PROFILE-PROTOTYPE-FINISH-01.1'
            : process.env.R06_TASK_ID === 'R06-PROFILE-PROTOTYPE-FINISH-01'
              ? 'R06-PROFILE-PROTOTYPE-FINISH-01'
              : 'R06-PROFILE-PATTERN-TRANSFER-01';
    return runProfilePatternBrowserSmoke(taskLabel);
  }
  if (
    process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01' ||
    process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01.1' ||
    process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01.2'
  ) {
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
