#!/usr/bin/env node
/**
 * R06-PROFILE-CATALOG-PREFILL-01.3 — MOCK impl + login-entry prototype ref pairs (fail-closed).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  findFreeLoopbackPort,
  spawnOwnedNextStart,
  stopOwnedServer,
} from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';
import { startCatalogPrefillMockBff, createMockBffState } from './lib/r06-catalog-prefill-mock-bff.mjs';
import {
  ensureLoginEntryPrototypeExtracted,
  startLoginEntryPrototypeStatic,
  verifyLoginEntryPrototypeTarball,
} from './lib/r06-login-entry-prototype-pack.mjs';
import {
  openRefCatalogProfile,
  prepareRefBasicsStep,
  prepareRefContactsStep,
  prepareRefReviewStep,
  prepareRefSpecializationStep,
  prepareRefSpecialistContactsControl,
  prepareRefSpecialistPatternStep,
  refCompleteWorkingProfile,
} from './lib/r06-login-entry-prototype-nav.mjs';
import {
  collectPrefillProvenance,
  pinProductionEnvLocal,
  probeRuntimeBuildId,
  runIsolatedPlatformBuild,
} from './lib/r06-catalog-prefill-mock-run.mjs';
import { captureRefImplPair, waitImplReady } from './lib/r06-catalog-prefill-visual-shot.mjs';
import { advanceCatalogSteps } from './lib/r06-playwright-catalog.mjs';
import {
  assertImplCatalogPreviewReady,
  assertRefCatalogPreviewReady,
  fillImplCatalogCard,
  fillImplCatalogContacts,
  fillRefCatalogCard,
  R06_CONTACTS_FIXTURE,
  R06_PROFILE_PATTERN_FIXTURE,
  R06_PREVIEW_FIXTURE,
  assertImplBasicsStepReady,
  assertImplContactsStepReady,
  assertImplReviewStepReady,
  assertImplSpecializationStepReady,
  assertRefBasicsStepReady,
  assertRefContactsStepReady,
  assertRefReviewStepReady,
  assertRefSpecializationStepReady,
  fillImplBasicsFixture,
  fillImplContactsFixture,
  fillImplSpecializationFixture,
  fillRefBasicsFixture,
  fillRefContactsFixture,
  fillRefSpecializationFixture,
  auditContactsScrollUnderShell,
  measureContactsComputedActions,
  measureContactsFormBox,
  measureStepComputedActions,
  measureStepFormBox,
  selectImplCatalogDirections,
  selectRefCatalogDirections,
} from './lib/r06-preview-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-catalog-prefill-smoke';
const PROTO_DIR = process.env.R06_PROTO_DIR || '/tmp/r06-login-entry-prototype';
const NAVIGATOR_PIN = '9a5bced4513f15a95790be7c85813b185beadd10';

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

const VISUAL_PROFILE_PAYLOAD = {
  displayName: 'Актуальное рабочее имя',
  city: 'Krasnodar',
  specialistKind: 'designer',
  specialistTitle: '',
  serviceSpecializationIds: ['design', 'planning'],
  navigatorStageIds: ['L1-1'],
  partnershipContactPhone: '+79001112233',
  partnershipContactEmail: '',
  partnerWorkMode: 'ON_SITE',
  productCategoryIds: [],
};

function applyMockCompletedProfile(state) {
  const payload = { ...VISUAL_PROFILE_PAYLOAD };
  state.profileFinished = true;
  state.workingDisplayName = payload.displayName;
  state.workingCity = payload.city;
  state.workingServices = [...payload.serviceSpecializationIds];
  state.workingStages = [...payload.navigatorStageIds];
  state.partnershipContactPhone = payload.partnershipContactPhone;
  state.specialistDraft = {
    contractVersion: 'r06-smoke',
    featureEnabled: true,
    step: 4,
    version: 3,
    hasDraft: false,
    profileComplete: true,
    payload,
    savedProfile: { ...payload },
  };
}

/** @param {number} uiStepIndex 0..3 (О себе … Проверка) */
function applyMockProfileWizardStep(state, uiStepIndex) {
  const payload = { ...VISUAL_PROFILE_PAYLOAD };
  state.profileFinished = false;
  state.workingDisplayName = null;
  state.workingServices = [];
  state.workingStages = [];
  state.specialistDraft = {
    contractVersion: 'r06-smoke',
    featureEnabled: true,
    step: uiStepIndex + 1,
    version: 2,
    hasDraft: true,
    profileComplete: false,
    payload,
    savedProfile: { ...payload },
  };
}

function seedVisualMockState() {
  const state = createMockBffState();
  applyMockCompletedProfile(state);
  return state;
}

function seedPendingMockState(base) {
  const state = { ...base, catalogStatus: 'PENDING', isPublic: false };
  state.catalogDraft = {
    catalogDisplayName: R06_PREVIEW_FIXTURE.publicName,
    navigatorStageIds: R06_PREVIEW_FIXTURE.stageIds,
    telegram: '@pending_demo',
    catalogTouched: { catalogPublicName: true, specializations: true },
  };
  return state;
}

function applyMockContactsControl(state, openDetails) {
  const f = R06_CONTACTS_FIXTURE;
  const payload = {
    displayName: f.displayName,
    city: f.city,
    specialistKind: 'designer',
    specialistTitle: '',
    serviceSpecializationIds: ['design'],
    navigatorStageIds: ['L1-1'],
    partnershipContactPhone: f.phone,
    partnershipContactEmail: f.email,
    publicSite: openDetails ? f.website : '',
    publicTelegram: openDetails ? f.telegram : '',
    partnerWorkMode: openDetails ? f.partnerWorkModeValue : '',
    areas: openDetails ? f.areas : '',
    productCategoryIds: [],
  };
  state.profileFinished = false;
  state.workingDisplayName = f.displayName;
  state.workingCity = f.city;
  state.partnershipContactPhone = f.phone;
  state.partnershipContactEmail = f.email;
  state.specialistDraft = {
    contractVersion: 'r06-smoke',
    featureEnabled: true,
    step: 3,
    version: 2,
    hasDraft: true,
    profileComplete: false,
    payload,
    savedProfile: { ...payload },
  };
}

function applyMockProfilePatternStep(state, uiStepIndex, fixture, options = {}) {
  const payload = {
    displayName: fixture.displayName,
    city: fixture.city,
    specialistKind: uiStepIndex >= 1 ? fixture.specialistKind : '',
    specialistTitle: '',
    serviceSpecializationIds:
      uiStepIndex >= 1 ? [...fixture.serviceSpecializationIds] : [],
    navigatorStageIds: uiStepIndex >= 1 ? [...fixture.navigatorStageIds] : [],
    partnershipContactPhone: uiStepIndex >= 3 ? fixture.phone : '',
    partnershipContactEmail: uiStepIndex >= 3 ? fixture.email : '',
    productCategoryIds: [],
  };
  state.profileFinished = false;
  state.workingDisplayName = fixture.displayName;
  state.workingCity = fixture.city;
  if (uiStepIndex >= 3) {
    state.partnershipContactPhone = fixture.phone;
    state.partnershipContactEmail = fixture.email;
  }
  state.specialistDraft = {
    contractVersion: 'r06-smoke',
    featureEnabled: true,
    step: uiStepIndex + 1,
    version: 2,
    hasDraft: true,
    profileComplete: false,
    payload,
    savedProfile: { ...payload },
  };
  state._patternAdvancedOpen = options.advancedOpen ?? false;
}

async function runProfilePatternTransferMain() {
  verifyLoginEntryPrototypeTarball(ROOT);
  const provenanceBefore = collectPrefillProvenance(ROOT, DIST);
  if (provenanceBefore.treeDirty) {
    throw new Error(`tree_dirty_before_run:${provenanceBefore.treeDirtyFiles.join(';')}`);
  }
  const codeSha = provenanceBefore.codeSha;
  const OUT = path.join(
    ROOT,
    'artifacts/remcard-r06-specialist/profile-pattern-visual',
    codeSha.slice(0, 12),
  );
  mkdirSync(OUT, { recursive: true });

  ensureLoginEntryPrototypeExtracted(ROOT, PROTO_DIR);
  const mock = await startCatalogPrefillMockBff(createMockBffState());
  const platformPort =
    Number(process.env.R06_CATALOG_PREFILL_PLATFORM_PORT) ||
    (await findFreeLoopbackPort(30680, { maxScan: 40 }));
  if (!platformPort) throw new Error('no free platform port');
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const envPin = pinProductionEnvLocal(ROOT, appOrigin, mock.baseUrl);
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'failed') throw new Error(`build_failed:exit=${build.exitCode}`);

  const refStatic = await startLoginEntryPrototypeStatic(PROTO_DIR);
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

  const implBase = appOrigin;
  const protoBase = refStatic.baseUrl;
  const meta = { codeSha, buildId: build.buildId };
  const fixture = R06_PROFILE_PATTERN_FIXTURE;
  const captures = [];
  const viewports = [
    { width: 1440, height: 900, theme: 'light' },
    { width: 375, height: 812, theme: 'light' },
    { width: 375, height: 812, theme: 'dark' },
    { width: 320, height: 568, theme: 'light' },
  ];

  const matrix = [
    {
      stateId: 'basics-filled',
      uiStep: 0,
      prepareRefStep: 0,
      advancedOpen: false,
      assertImpl: assertImplBasicsStepReady,
      assertRef: assertRefBasicsStepReady,
      fillImpl: (page) => fillImplBasicsFixture(page, fixture),
      fillRef: (page) => fillRefBasicsFixture(page, fixture),
      measure: (page) => measureStepFormBox(page, '[data-testid="specialist-profile-step-card"]'),
    },
    {
      stateId: 'specialization-closed',
      uiStep: 1,
      prepareRefStep: 1,
      advancedOpen: false,
      assertImpl: assertImplSpecializationStepReady,
      assertRef: assertRefSpecializationStepReady,
      fillImpl: (page) => fillImplSpecializationFixture(page, fixture, { advancedOpen: false }),
      fillRef: (page) => fillRefSpecializationFixture(page, fixture, { advancedOpen: false }),
      measure: (page) => measureStepComputedActions(page),
    },
    {
      stateId: 'specialization-open',
      uiStep: 1,
      prepareRefStep: 1,
      advancedOpen: true,
      assertImpl: assertImplSpecializationStepReady,
      assertRef: assertRefSpecializationStepReady,
      fillImpl: (page) => fillImplSpecializationFixture(page, fixture, { advancedOpen: true }),
      fillRef: (page) => fillRefSpecializationFixture(page, fixture, { advancedOpen: true }),
      measure: (page) => measureStepComputedActions(page),
    },
    {
      stateId: 'review-filled',
      uiStep: 3,
      prepareRefStep: 3,
      advancedOpen: false,
      assertImpl: assertImplReviewStepReady,
      assertRef: assertRefReviewStepReady,
      fillImpl: async () => {},
      fillRef: async () => {},
      measure: (page) => measureStepComputedActions(page),
    },
  ];

  try {
    if (!(await waitForHttp(`${appOrigin}/api/health`, 120_000))) throw new Error('impl_not_ready');
    const runtimeBuildId = await probeRuntimeBuildId(appOrigin, build.buildId);
    if (runtimeBuildId !== build.buildId) {
      throw new Error(`runtime_build_id_mismatch:${runtimeBuildId}:${build.buildId}`);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'remcard-token',
        value: 'mock-pattern-visual-token',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    for (const row of matrix) {
      for (const vp of viewports) {
        applyMockProfilePatternStep(mock.state, row.uiStep, fixture, {
          advancedOpen: row.advancedOpen,
        });
        const pairId = `${row.stateId}-${vp.width}-${vp.theme}`;
        const metrics = {};
        const cap = await captureRefImplPair(
          context,
          {
            pairId,
            theme: vp.theme,
            width: vp.width,
            height: vp.height,
            implUrl: `${implBase}/profile?section=basics`,
            implTestId: 'specialist-profile-wizard',
            formCrop: {
              impl: '[data-testid="specialist-profile-step-card"]',
              ref: '.pw-card',
            },
            assertImpl: async (page) => {
              await row.assertImpl(page);
              await row.fillImpl(page);
              metrics.impl = await row.measure(page);
              if (row.uiStep !== 3) {
                metrics.computedActions = await measureStepComputedActions(page);
              }
            },
            prepareRef: async (page, base) => {
              await prepareRefSpecialistPatternStep(page, base, row.prepareRefStep, fixture, {
                advancedOpen: row.advancedOpen,
              });
              await row.fillRef(page);
              metrics.ref = await measureStepFormBox(page, '.pw-card');
            },
            assertRef: row.assertRef,
          },
          OUT,
          protoBase,
          meta,
        );
        cap.fixtureState = row.stateId;
        cap.formMetrics = metrics;
        cap.formCompareNote =
          'Manual crop compare on section.card vs .pw-card — shell excluded; CAPTURED not PASS.';
        captures.push(cap);
      }
    }
    await browser.close();
  } finally {
    await stopOwnedServer(child);
    refStatic.server.close();
    await mock.close();
    envPin.restore();
  }

  const manifestPath = path.join(OUT, 'manifest.json');
  const manifest = {
    capturedAt: new Date().toISOString(),
    task: 'R06-PROFILE-PATTERN-TRANSFER-01',
    mode: 'MOCK_BFF_PROFILE_PATTERN_TRANSFER',
    codeSha,
    navigatorCodeSha: NAVIGATOR_PIN,
    sourceTreeDigest: provenanceBefore.sourceTreeDigest,
    treeDirty: false,
    prototypePackageCommit: '9bc52fb9152293e992e98dc50804a660cef10733',
    prototypeTarballSha256: '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d',
    fixture,
    build: {
      status: build.status,
      exitCode: build.exitCode,
      buildId: build.buildId,
      distDir: DIST,
    },
    runtimeBuildIdVerified: build.buildId,
    appOrigin,
    mockBff: mock.baseUrl,
    protoBase,
    captures,
    pairCount: captures.length,
    visualPass: false,
    remainders: [
      'Prototype «Отменить» (in-tab discard) has no equivalent — impl «Сбросить черновик» calls discardSpecialistProfileDraft (BLOCKED cancel semantics).',
      'Impl retains «Сохранить черновик» on all steps — prototype wizard row omits it (documented, not removed).',
      'Prototype review «Показывать профиль партнёрам» (partnerSearchOptIn) has no supported API/state in impl (BLOCKED — not implemented).',
      'Ref optional primary direction / impl tile grid spacing may differ from prototype — compare crops manually.',
      'CAPTURED pairs only — visualPass false; contract gaps listed separately from cosmetic remainders.',
    ],
    contractGaps: [
      'partnerSearchOptIn checkbox on review step — prototype only, no backend in scope.',
      '«Отменить» vs resetDraft semantics on basics/specialization/review.',
    ],
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  manifest.evidenceSha256 = createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, manifestPath, evidenceSha256: manifest.evidenceSha256 }, null, 2));
}

async function runContactsControlMain() {
  verifyLoginEntryPrototypeTarball(ROOT);
  const provenanceBefore = collectPrefillProvenance(ROOT, DIST);
  if (provenanceBefore.treeDirty) {
    throw new Error(`tree_dirty_before_run:${provenanceBefore.treeDirtyFiles.join(';')}`);
  }
  const codeSha = provenanceBefore.codeSha;
  const OUT = path.join(
    ROOT,
    'artifacts/remcard-r06-specialist/contacts-control-visual',
    codeSha.slice(0, 12),
  );
  mkdirSync(OUT, { recursive: true });

  ensureLoginEntryPrototypeExtracted(ROOT, PROTO_DIR);
  const mock = await startCatalogPrefillMockBff(createMockBffState());
  const platformPort =
    Number(process.env.R06_CATALOG_PREFILL_PLATFORM_PORT) ||
    (await findFreeLoopbackPort(30680, { maxScan: 40 }));
  if (!platformPort) throw new Error('no free platform port');
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const envPin = pinProductionEnvLocal(ROOT, appOrigin, mock.baseUrl);
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'failed') throw new Error(`build_failed:exit=${build.exitCode}`);

  const refStatic = await startLoginEntryPrototypeStatic(PROTO_DIR);
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

  const implBase = appOrigin;
  const protoBase = refStatic.baseUrl;
  const meta = { codeSha, buildId: build.buildId };
  const captures = [];
  let scrollAudit = null;
  const mobileOnly = process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01.2';
  const viewports = mobileOnly
    ? [
        { width: 375, height: 812, theme: 'light' },
        { width: 375, height: 812, theme: 'dark' },
        { width: 320, height: 568, theme: 'light' },
      ]
    : [
        { width: 1440, height: 900, theme: 'light' },
        { width: 375, height: 812, theme: 'light' },
        { width: 375, height: 812, theme: 'dark' },
        { width: 320, height: 568, theme: 'light' },
      ];

  try {
    if (!(await waitForHttp(`${appOrigin}/api/health`, 120_000))) throw new Error('impl_not_ready');
    const runtimeBuildId = await probeRuntimeBuildId(appOrigin, build.buildId);
    if (runtimeBuildId !== build.buildId) {
      throw new Error(`runtime_build_id_mismatch:${runtimeBuildId}:${build.buildId}`);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'remcard-token',
        value: 'mock-contacts-visual-token',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    for (const stateId of ['closed', 'open']) {
      const openDetails = stateId === 'open';
      for (const vp of viewports) {
        applyMockContactsControl(mock.state, openDetails);
        const pairId = `contacts-${stateId}-${vp.width}-${vp.theme}`;
        const metrics = {};
        const cap = await captureRefImplPair(
          context,
          {
            pairId,
            theme: vp.theme,
            width: vp.width,
            height: vp.height,
            implUrl: `${implBase}/profile?section=basics`,
            implTestId: 'specialist-profile-wizard',
            formCrop: {
              impl: '[data-testid="specialist-profile-step-card"]',
              ref: '.pw-card',
            },
            assertImpl: async (page) => {
              await assertImplContactsStepReady(page);
              await fillImplContactsFixture(page, R06_CONTACTS_FIXTURE, { openDetails });
              metrics.impl = await measureContactsFormBox(
                page,
                '[data-testid="specialist-profile-step-card"]',
              );
              metrics.computedActions = await measureContactsComputedActions(page);
            },
            prepareRef: async (page, base) => {
              await prepareRefSpecialistContactsControl(page, base, R06_CONTACTS_FIXTURE);
              await fillRefContactsFixture(page, R06_CONTACTS_FIXTURE, { openDetails });
              metrics.ref = await measureContactsFormBox(page, '.pw-card');
            },
            assertRef: assertRefContactsStepReady,
          },
          OUT,
          protoBase,
          meta,
        );
        cap.fixtureState = stateId;
        cap.formMetrics = metrics;
        cap.formCompareNote =
          'Manual crop compare on section.card vs .pw-card — shell excluded; CAPTURED not PASS.';
        captures.push(cap);
      }
    }
    if (!mobileOnly) {
      const scrollPage = await context.newPage();
      await scrollPage.setViewportSize({ width: 1440, height: 900 });
      applyMockContactsControl(mock.state, true);
      await scrollPage.goto(`${implBase}/profile?section=basics`, { waitUntil: 'load' });
      await waitImplReady(scrollPage, 'specialist-profile-wizard');
      await assertImplContactsStepReady(scrollPage);
      await fillImplContactsFixture(scrollPage, R06_CONTACTS_FIXTURE, { openDetails: true });
      scrollAudit = await auditContactsScrollUnderShell(scrollPage);
      await scrollPage.close();
    }
    await browser.close();
  } finally {
    await stopOwnedServer(child);
    refStatic.server.close();
    await mock.close();
    envPin.restore();
  }

  const manifestPath = path.join(OUT, 'manifest.json');
  const manifest = {
    capturedAt: new Date().toISOString(),
    task: process.env.R06_TASK_ID || 'R06-CONTACTS-CONTROL-01.1',
    mode: mobileOnly ? 'MOCK_BFF_CONTACTS_CONTROL_MOBILE_RECAPTURE' : 'MOCK_BFF_CONTACTS_CONTROL',
    codeSha,
    navigatorCodeSha: NAVIGATOR_PIN,
    sourceTreeDigest: provenanceBefore.sourceTreeDigest,
    treeDirty: false,
    prototypePackageCommit: '9bc52fb9152293e992e98dc50804a660cef10733',
    prototypeTarballSha256: '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d',
    fixture: R06_CONTACTS_FIXTURE,
    build: {
      status: build.status,
      exitCode: build.exitCode,
      buildId: build.buildId,
      distDir: DIST,
    },
    runtimeBuildIdVerified: build.buildId,
    appOrigin,
    mockBff: mock.baseUrl,
    protoBase,
    captures,
    scrollAuditUnderShell: scrollAudit,
    desktopEvidenceReuse: mobileOnly
      ? {
          notRerun: true,
          priorTask: 'R06-CONTACTS-CONTROL-01.1',
          priorCodeSha: '561242b5cf5d0c8db448e617678e541ac30f8715',
          priorPath:
            'artifacts/remcard-r06-specialist/contacts-control-visual/561242b5cf5d',
          pairs: ['contacts-closed-1440-light', 'contacts-open-1440-light'],
        }
      : null,
    visualPass: false,
    remainders: [
      'Prototype «Отменить» (discard in-tab edits) has no equivalent — impl uses «Сбросить черновик» only on non-contacts steps; contacts step omits reset (BLOCKED cancel semantics).',
      'Impl retains «Сохранить черновик» on contacts — not in prototype row (documented, not removed).',
      'Ref «Другое контактное лицо» field absent in specialist R06 draft payload (BLOCKED).',
      'Form-crop: stabilize scroll, hide overlapping fixed/sticky shell at capture only (ref+impl); full-page keeps shell.',
      'CAPTURED pairs only — compare form crops manually; shell/nav differences excluded.',
    ],
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  manifest.evidenceSha256 = createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, manifestPath, evidenceSha256: manifest.evidenceSha256 }, null, 2));
}

async function main() {
  if (process.env.R06_TASK_ID === 'R06-PROFILE-PATTERN-TRANSFER-01') {
    return runProfilePatternTransferMain();
  }
  if (
    process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01' ||
    process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01.1' ||
    process.env.R06_TASK_ID === 'R06-CONTACTS-CONTROL-01.2'
  ) {
    return runContactsControlMain();
  }
  verifyLoginEntryPrototypeTarball(ROOT);
  const provenanceBefore = collectPrefillProvenance(ROOT, DIST);
  if (provenanceBefore.treeDirty) {
    throw new Error(`tree_dirty_before_run:${provenanceBefore.treeDirtyFiles.join(';')}`);
  }

  const codeSha = provenanceBefore.codeSha;
  const OUT = path.join(
    ROOT,
    'artifacts/remcard-r06-specialist/catalog-prefill-visual',
    codeSha.slice(0, 12),
  );
  mkdirSync(OUT, { recursive: true });

  ensureLoginEntryPrototypeExtracted(ROOT, PROTO_DIR);
  const mock = await startCatalogPrefillMockBff(seedVisualMockState());
  const platformPort =
    Number(process.env.R06_CATALOG_PREFILL_PLATFORM_PORT) ||
    (await findFreeLoopbackPort(30680, { maxScan: 40 }));
  if (!platformPort) throw new Error('no free platform port');
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const envPin = pinProductionEnvLocal(ROOT, appOrigin, mock.baseUrl);
  const build = runIsolatedPlatformBuild(ROOT, DIST);
  if (build.status === 'failed') {
    throw new Error(`build_failed:exit=${build.exitCode}`);
  }
  const refStatic = await startLoginEntryPrototypeStatic(PROTO_DIR);

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

  const captures = [];
  try {
    if (!(await waitForHttp(`${appOrigin}/login`))) throw new Error('platform_start_timeout');
    const runtimeBuildId = await probeRuntimeBuildId(appOrigin, build.buildId);
    if (runtimeBuildId !== build.buildId) {
      throw new Error(`runtime_build_id_mismatch:dist=${build.buildId} runtime=${runtimeBuildId}`);
    }

    const browser = await chromium.launch();
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'remcard-token',
        value: 'mock-visual-token',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    const meta = { codeSha, buildId: build.buildId };
    const implBase = appOrigin;
    const protoBase = refStatic.baseUrl;

    const assertCatalogStep = (n) => async (page) => {
      await page.waitForFunction(
        (target) =>
          document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep ===
          String(target),
        n,
        { timeout: 60_000 },
      );
    };

    async function prepareCatalogPreview(page) {
      await fillImplCatalogCard(page, R06_PREVIEW_FIXTURE);
      await advanceCatalogSteps(page, 1);
      await selectImplCatalogDirections(page, R06_PREVIEW_FIXTURE);
      await advanceCatalogSteps(page, 2);
      await fillImplCatalogContacts(page, R06_PREVIEW_FIXTURE);
      await advanceCatalogSteps(page, 4);
      await assertImplCatalogPreviewReady(page, R06_PREVIEW_FIXTURE);
    }

    async function prepareRefCatalogDirectionsPanel(page, base) {
      await openRefCatalogProfile(page, base);
      await page.waitForSelector('[data-catalog-form]');
      await fillRefCatalogCard(page, R06_PREVIEW_FIXTURE);
      await page.locator('[data-cw-move="next"]').click();
      await page.waitForSelector('[data-catalog-panel="directions"]:not([hidden])', { timeout: 60_000 });
    }

    async function prepareRefCatalogContactsPanel(page, base) {
      await prepareRefCatalogDirectionsPanel(page, base);
      await selectRefCatalogDirections(page, R06_PREVIEW_FIXTURE);
      await page.locator('[data-cw-move="next"]').click();
      await page.waitForSelector('[data-catalog-panel="contacts"]:not([hidden])', { timeout: 60_000 });
    }

    async function prepareRefCatalogPresentationPanel(page, base) {
      await prepareRefCatalogContactsPanel(page, base);
      await page.locator('[name="publicPhone"]').fill(R06_PREVIEW_FIXTURE.phone);
      await page.locator('[data-cw-move="next"]').click();
      await page.waitForSelector('[data-catalog-panel="presentation"]:not([hidden])', {
        timeout: 60_000,
      });
    }

    async function prepareRefCatalogPreview(page, base) {
      await openRefCatalogProfile(page, base);
      await page.waitForSelector('[data-catalog-form]');
      await fillRefCatalogCard(page, R06_PREVIEW_FIXTURE);
      await page.locator('[data-cw-move="next"]').click();
      await page.waitForSelector('[data-catalog-panel="directions"]:not([hidden])');
      await selectRefCatalogDirections(page, R06_PREVIEW_FIXTURE);
      await page.locator('[data-cw-move="next"]').click();
      await page.waitForSelector('[data-catalog-panel="contacts"]:not([hidden])');
      await page.locator('[name="publicPhone"]').fill(R06_PREVIEW_FIXTURE.phone);
      await page.locator('[data-cw-move="next"]').click();
      await page.locator('[data-cw-move="next"]').click();
      await page.waitForSelector('[data-catalog-panel="review"]:not([hidden])');
    }

    const matrix = [
      {
        pairId: 'profile-completed-summary',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=basics`,
        implTestId: 'specialist-profile-completed-summary',
        prepareRef: refCompleteWorkingProfile,
        assertRef: async (p) => {
          await p.waitForSelector('[data-testid="pw-summary"]');
        },
      },
      {
        pairId: 'profile-basics-step',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=basics`,
        implTestId: 'specialist-profile-wizard',
        mockProfileStep: 0,
        prepareRef: prepareRefBasicsStep,
        assertRef: async (p) => {
          await p.waitForSelector('[name="name"]');
        },
      },
      {
        pairId: 'profile-specialization-step',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=basics`,
        implTestId: 'specialist-profile-wizard',
        mockProfileStep: 1,
        prepareRef: prepareRefSpecializationStep,
        assertRef: async (p) => {
          await p.waitForSelector('[data-specialist-kind]');
        },
      },
      {
        pairId: 'profile-contacts-step',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=basics`,
        implTestId: 'specialist-profile-wizard',
        mockProfileStep: 2,
        prepareRef: prepareRefContactsStep,
      },
      {
        pairId: 'profile-review-step',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=basics`,
        implTestId: 'specialist-profile-wizard',
        mockProfileStep: 3,
        prepareRef: prepareRefReviewStep,
      },
      {
        pairId: 'profile-catalog-cta',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=basics`,
        implTestId: 'specialist-profile-completed-summary',
        assertImpl: async (p) => {
          await p.getByTestId('specialist-catalog-cta').waitFor({ state: 'visible' });
        },
        prepareRef: refCompleteWorkingProfile,
      },
      {
        pairId: 'catalog-step-0-prefill',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        assertImpl: assertCatalogStep(0),
        prepareRef: openRefCatalogProfile,
        assertRef: async (p) => {
          await p.waitForSelector('[data-catalog-panel="card"]:not([hidden])');
        },
      },
      {
        pairId: 'catalog-step-1-directions',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        prepareImpl: async (p) => {
          await advanceCatalogSteps(p, 1);
        },
        assertImpl: assertCatalogStep(1),
        prepareRef: prepareRefCatalogDirectionsPanel,
      },
      {
        pairId: 'catalog-step-2-contacts',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        prepareImpl: async (p) => {
          await advanceCatalogSteps(p, 2);
        },
        assertImpl: assertCatalogStep(2),
        prepareRef: prepareRefCatalogContactsPanel,
      },
      {
        pairId: 'catalog-step-3-presentation',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        prepareImpl: async (p) => {
          await advanceCatalogSteps(p, 3);
        },
        assertImpl: assertCatalogStep(3),
        prepareRef: prepareRefCatalogPresentationPanel,
      },
      {
        pairId: 'catalog-step-4-preview',
        theme: 'light',
        width: 1440,
        height: 900,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        prepareImpl: prepareCatalogPreview,
        prepareRef: prepareRefCatalogPreview,
        assertRef: async (p) => assertRefCatalogPreviewReady(p, R06_PREVIEW_FIXTURE),
      },
      {
        pairId: 'catalog-step-0-prefill-375-light',
        theme: 'light',
        width: 375,
        height: 812,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        prepareRef: openRefCatalogProfile,
      },
      {
        pairId: 'catalog-step-0-prefill-375-dark',
        theme: 'dark',
        width: 375,
        height: 812,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        prepareRef: openRefCatalogProfile,
      },
      {
        pairId: 'catalog-overflow-320',
        theme: 'light',
        width: 320,
        height: 568,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        prepareRef: openRefCatalogProfile,
      },
      {
        pairId: 'catalog-step-1-directions-320',
        theme: 'light',
        width: 320,
        height: 568,
        implUrl: `${implBase}/profile?section=catalog`,
        implTestId: 'specialist-catalog-wizard',
        prepareImpl: async (p) => {
          await advanceCatalogSteps(p, 1);
        },
        assertImpl: assertCatalogStep(1),
        prepareRef: prepareRefCatalogDirectionsPanel,
      },
      {
        pairId: 'profile-contacts-step-320',
        theme: 'light',
        width: 320,
        height: 568,
        implUrl: `${implBase}/profile?section=basics`,
        implTestId: 'specialist-profile-wizard',
        mockProfileStep: 2,
        prepareRef: prepareRefContactsStep,
      },
    ];

    for (const spec of matrix) {
      if (spec.mockProfileStep != null) {
        applyMockProfileWizardStep(mock.state, spec.mockProfileStep);
      } else {
        applyMockCompletedProfile(mock.state);
      }
      captures.push(await captureRefImplPair(context, spec, OUT, protoBase, meta));
    }

    mock.state.catalogStatus = 'PENDING';
    mock.state.catalogDraft = seedPendingMockState(mock.state).catalogDraft;
    const pendingPage = await context.newPage();
    await pendingPage.goto(`${implBase}/profile?section=catalog`, { waitUntil: 'load' });
    await waitImplReady(pendingPage, 'specialist-catalog-pending');
    await pendingPage.close();

    captures.push(
      await captureRefImplPair(
        context,
        {
          pairId: 'catalog-pending-mock',
          theme: 'light',
          width: 1440,
          height: 900,
          implUrl: `${implBase}/profile?section=catalog`,
          implTestId: 'specialist-catalog-pending',
          prepareRef: async (page, base) => {
            await prepareRefCatalogPreview(page, base);
            await page.locator('[data-catalog-action="send"]').click();
            await page.waitForSelector('#catalog-pending-title', { timeout: 30_000 });
          },
          assertRef: async (p) => {
            await p.locator('#catalog-pending-title').getByText(/отправлен/i).waitFor();
          },
        },
        OUT,
        protoBase,
        meta,
      ),
    );

    await browser.close();
  } finally {
    await stopOwnedServer(child);
    refStatic.server.close();
    await mock.close();
    envPin.restore();
  }

  const manifestPath = path.join(OUT, 'manifest.json');
  const manifest = {
    capturedAt: new Date().toISOString(),
    task: 'R06-SPECIALIST-VISUAL-01.1',
    mode: 'MOCK_BFF_VISUAL',
    codeSha,
    navigatorCodeSha: NAVIGATOR_PIN,
    sourceTreeDigest: provenanceBefore.sourceTreeDigest,
    treeDirty: false,
    prototypePackageCommit: '9bc52fb9152293e992e98dc50804a660cef10733',
    prototypeTarballSha256: '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d',
    build: {
      status: build.status,
      exitCode: build.exitCode,
      buildId: build.buildId,
      distDir: DIST,
    },
    runtimeBuildIdVerified: build.buildId,
    appOrigin,
    mockBff: mock.baseUrl,
    protoBase: refStatic.baseUrl,
    captures,
    visualPass: false,
    remainders: [
      'CAPTURED pairs only — pixel diff not automated; review PNGs for structural DOM shell differences (production-profile ref vs Next profile impl).',
      'Supervisor preset: serviceIds [] / stages L1-0+L1-11 until taxonomy owner maps «Приёмка и технический надзор».',
      'Ref prototype uses production-profile shell; impl uses Next profile nav — structural parity, not identical DOM.',
      'Catalog specialistTitle for «Свой вариант»: BLOCKED (no catalog draft field); UI shows notice, not fake input.',
      'Review-step «Показывать профиль партнёрам»: BLOCKED in specialist R06 draft payload (no partnerSearchOptIn).',
      'Catalog «Нет сайта/Telegram/email/телефона» toggles: BLOCKED — only explicit empty string via clear/save.',
    ],
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  manifest.evidenceSha256 = createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, manifestPath, evidenceSha256: manifest.evidenceSha256 }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
