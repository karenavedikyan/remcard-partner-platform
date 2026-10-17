#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { advanceCatalogSteps, advanceRefCatalogSteps } from './lib/r06-playwright-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';
const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist/screenshots');
const REF_SHA = process.env.R06_REFERENCE_SHA ?? '771cc658a415a5d05b964f29f675d32db449198b';
const REF_GIT_SHA =
  process.env.R06_REFERENCE_GIT_SHA ?? '771cc658a415a5d05b964f29f675d32db449198b';
const PROTO_DIR = process.env.R06_PROTO_DIR ?? '/tmp/r06-prototype-ref';
const PROTO_PORT = Number(process.env.R06_PROTO_PORT ?? '3199');
const PROTO_BASE = `http://127.0.0.1:${PROTO_PORT}`;
const CODE_SHA = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();

const PREVIEW_FIXTURE = {
  publicName: 'R06 Visual Catalog',
  city: 'Krasnodar',
  phone: '+79001112233',
};

const DEV_HIDE = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog] { display: none !important; }
`;

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

function mint(env) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', 'mint'], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error('mint failed');
  return (res.stdout || '').trim();
}

async function preparePrototype() {
  mkdirSync(PROTO_DIR, { recursive: true });
  execSync(
    `git -C "${NAV_ROOT}" archive ${REF_GIT_SHA} docs/reference/registration-20261017 | tar -x -C "${PROTO_DIR}"`,
    { stdio: 'pipe' },
  );
  return path.join(PROTO_DIR, 'docs/reference/registration-20261017');
}

async function startProto(root) {
  const proc = spawn('python3', ['-m', 'http.server', String(PROTO_PORT)], {
    cwd: root,
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${PROTO_BASE}/roles.html`);
      if (res.ok) return proc;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill();
  throw new Error('prototype server failed');
}

async function applyAppTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('remcard-theme', t);
    } catch {
      /* file:// or restricted origin */
    }
  }, theme);
}

async function waitImplProfile(page, testId) {
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 120_000 });
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="specialist-profile-loading"]'),
  );
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(themeStabilizeMs(page));
}

function themeStabilizeMs(page) {
  return 350;
}

async function assertCatalogChrome(page) {
  const root = page.locator('[data-testid="specialist-catalog-wizard"]');
  await root.waitFor({ state: 'visible', timeout: 30_000 });
  const input = root.locator('#sc-public-name');
  await input.waitFor({ state: 'visible' });
  const inputStyle = await input.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { borderTopWidth: cs.borderTopWidth, paddingLeft: cs.paddingLeft, minHeight: cs.minHeight };
  });
  if (parseFloat(inputStyle.borderTopWidth) < 1) throw new Error('catalog_input_border_missing');
  if (parseFloat(inputStyle.paddingLeft) < 4) throw new Error('catalog_input_padding_missing');
  if (parseFloat(inputStyle.minHeight) < 40) throw new Error('catalog_input_min_height');
  const nextBtn = root.getByRole('button', { name: /Далее|Предпросмотр/i }).first();
  const btnStyle = await nextBtn.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      minHeight: cs.minHeight,
      visibility: cs.visibility,
      display: cs.display,
    };
  });
  if (btnStyle.visibility === 'hidden' || btnStyle.display === 'none') {
    throw new Error('catalog_primary_hidden');
  }
  if (parseFloat(btnStyle.minHeight) < 40) throw new Error('catalog_primary_min_height');
  if (btnStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || btnStyle.backgroundColor === 'transparent') {
    throw new Error('catalog_primary_background_missing');
  }
}

async function assertSpecializationLayout(page) {
  const geom = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="specialist-profile-wizard"]');
    const card = root?.querySelector('section');
    const layout = root?.querySelector('aside')?.parentElement;
    if (!card || !layout) return null;
    const cr = card.getBoundingClientRect();
    const lr = layout.getBoundingClientRect();
    return { cardWidth: cr.width, layoutWidth: lr.width, gap: cr.x - lr.x };
  });
  if (!geom || geom.cardWidth < 520) {
    throw new Error(`specialization_card_narrow:${geom?.cardWidth ?? 0}`);
  }
}

async function shotPair(ctx, spec) {
  const {
    name,
    implUrl,
    refUrl,
    theme,
    width,
    height,
    implTestId,
    refReadySelector,
    prepareBeforeWait,
    prepareImpl,
    prepareRef,
  } = spec;
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height });
  await page.addInitScript((t) => {
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem('remcard-theme', t);
    } catch {
      /* ignore */
    }
  }, theme);
  await page.addStyleTag({ content: DEV_HIDE });

  await page.goto(implUrl, { waitUntil: 'load', timeout: 120_000 });
  await applyAppTheme(page, theme);
  if (prepareBeforeWait) await prepareBeforeWait(page);
  if (implTestId) await waitImplProfile(page, implTestId);
  if (prepareImpl) await prepareImpl(page);
  if (spec.assertImpl) await spec.assertImpl(page);
  if (implTestId === 'specialist-catalog-wizard') {
    const step = await page
      .locator('[data-testid="specialist-catalog-wizard"]')
      .getAttribute('data-catalog-step');
    if (step === '0') await assertCatalogChrome(page);
  }
  if (spec.assertLayout) await spec.assertLayout(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const implPath = path.join(OUT, `${name}-impl-${width}-${theme}.png`);
  await page.screenshot({ path: implPath, fullPage: true });

  let refPath = null;
  if (refUrl) {
    const refCtx = await ctx.browser().newContext({ viewport: { width, height } });
    const refPage = await refCtx.newPage();
    await refPage.addInitScript((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await openRefSpecialistProfile(refPage);
    await applyAppTheme(refPage, theme);
    if (prepareRef) await prepareRef(refPage);
    else if (refReadySelector) {
      await refPage.waitForSelector(refReadySelector, { timeout: 60_000 });
    }
    if (spec.assertRef) await spec.assertRef(refPage);
    await refPage.evaluate(() => document.fonts?.ready);
    await refPage.waitForTimeout(400);
    await refPage.evaluate(() => window.scrollTo(0, 0));
    refPath = path.join(OUT, `${name}-ref-${width}-${theme}.png`);
    await refPage.screenshot({ path: refPath, fullPage: true });
    await refCtx.close();
  }

  await page.close();
  return { name, implPath, refPath, theme, width };
}

async function openRefCatalogProfile(page) {
  await bootRefCabinetSpecialist(page);
  const catalogTab = page
    .locator('[data-profile-action="tab"], [role="tab"]')
    .filter({ hasText: /Каталог/i })
    .first();
  if (await catalogTab.count()) await catalogTab.click();
  await page.waitForSelector('[data-profile-step="catalog"]', { timeout: 60_000 });
}

async function prepareCatalogPreviewStep(page) {
  await page.locator('#sc-public-name').fill(PREVIEW_FIXTURE.publicName);
  await page.locator('#sc-city').fill(PREVIEW_FIXTURE.city);
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await page.getByText(/Черновик публикации сохранён/i).waitFor({ timeout: 30_000 });
  await advanceCatalogSteps(page, 4);
  await page.getByText(/Можно отправить заявку/i).waitFor({ timeout: 30_000 });
}

async function refCompleteWorkingProfile(page) {
  await bootRefCabinetSpecialist(page);
  if (await page.locator('[data-testid="pw-summary"]').count()) return;
  await page.locator('[name="name"]').fill('R06 Visual Spec');
  await page.locator('[name="city"]').fill('Krasnodar');
  await page.getByTestId('pw-next').click();
  await page.locator('[data-specialist-kind]').selectOption('designer');
  await page.getByTestId('pw-next').click();
  await page.getByRole('button', { name: 'Пропустить' }).click();
  await page.getByTestId('pw-next').click();
  await page.waitForSelector('[data-testid="pw-summary"]');
}

async function prepareRefSpecializationStep(page) {
  await refCompleteWorkingProfile(page);
  await page.locator('[data-pw-action="edit"]').click();
  await page.waitForSelector('.pw-steps');
  await page.locator('[data-testid="pw-step-1"]').click();
  await page.waitForSelector('[data-specialist-kind]', { state: 'visible' });
}

async function refFillCatalogDirections(page) {
  const kind = page.locator('[data-catalog-panel="directions"] [data-specialist-kind]');
  if (await kind.count()) await kind.selectOption('designer');
  const opts = page.locator('[data-catalog-panel="directions"] .direction-option input[type="checkbox"]');
  const n = await opts.count();
  let picked = 0;
  for (let i = 0; i < n && picked < 4; i += 1) {
    try {
      const box = opts.nth(i);
      if (!(await box.isChecked())) await box.check({ force: true, timeout: 5000 });
      picked += 1;
    } catch {
      /* prototype checkbox groups differ by index */
    }
  }
}

async function prepareRefCatalogPreview(page) {
  await openRefCatalogProfile(page);
  await page.waitForSelector('[data-catalog-form]');
  await page.locator('[name="publicName"]').fill(PREVIEW_FIXTURE.publicName);
  await page.locator('[name="city"]').fill(PREVIEW_FIXTURE.city);
  await page.locator('[data-cw-move="next"]').click();
  await page.waitForSelector('[data-catalog-panel="directions"]:not([hidden])');
  await refFillCatalogDirections(page);
  await page.locator('[data-cw-move="next"]').click();
  await page.waitForSelector('[data-catalog-panel="contacts"]:not([hidden])');
  await page.locator('[name="publicPhone"]').fill(PREVIEW_FIXTURE.phone);
  await page.locator('[data-cw-move="next"]').click();
  await page.locator('[data-cw-move="next"]').click();
  await page.waitForSelector('[data-catalog-panel="review"]:not([hidden])');
}

async function prepareRefCatalogPending(page) {
  await openRefCatalogProfile(page);
  await page.waitForSelector('[data-catalog-form]');
  await page.locator('[name="publicName"]').fill(PREVIEW_FIXTURE.publicName);
  await page.locator('[name="city"]').fill(PREVIEW_FIXTURE.city);
  await page.locator('[data-cw-move="next"]').click();
  await page.waitForSelector('[data-catalog-panel="directions"]:not([hidden])');
  await refFillCatalogDirections(page);
  await page.locator('[data-cw-move="next"]').click();
  await page.waitForSelector('[data-catalog-panel="contacts"]:not([hidden])');
  await page.locator('[name="publicPhone"]').fill('+79001112233');
  await page.locator('[data-cw-move="next"]').click();
  await page.locator('[data-cw-move="next"]').click();
  await page.waitForSelector('[data-catalog-panel="review"]:not([hidden])');
  await page.locator('[data-catalog-action="send"]').click();
  await page.waitForSelector('#catalog-pending-title', { timeout: 30_000 });
}

async function bootRefCabinetSpecialist(page) {
  await page.goto(`${PROTO_BASE}/roles.html`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Загружаем прототип'),
    undefined,
    { timeout: 60_000 },
  );
  await page.evaluate(() => {
    document.querySelector('[data-action="view:cabinet"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const sel = document.querySelector('[data-control="role"], [data-testid="scenario-role"]');
    if (sel instanceof HTMLSelectElement) {
      sel.value = 'specialist';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.evaluate(() => {
    document.querySelector('[data-action="nav:profile"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });
  await page.waitForSelector('.production-profile, [data-profile-form="working"]', {
    timeout: 60_000,
  });
}

async function openRefSpecialistProfile(page) {
  await bootRefCabinetSpecialist(page);
}

async function openRefBasicsTab(page) {
  await bootRefCabinetSpecialist(page);
  await page.evaluate(() => {
    document.querySelector('[data-profile-id="basics"]')?.click();
  });
  await page.waitForSelector('.production-profile-main .pw, .production-profile-main form', {
    timeout: 30_000,
  }).catch(() => {});
}

async function main() {
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const env = loadEnv(meta.envPath);
  const implBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  mkdirSync(OUT, { recursive: true });

  spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', 'reset-e2e'], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });

  const protoRoot = await preparePrototype();
  const protoProc = await startProto(protoRoot);

  const browser = await chromium.launch();
  const token = mint(env);
  const context = await browser.newContext();
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

  const prep = await context.newPage();
  await prep.goto(`${implBase}/profile?section=basics`, { waitUntil: 'load' });
  await waitImplProfile(prep, 'specialist-profile-wizard');
  await prep.locator('#sp-displayName').fill('R06 Visual Spec');
  await prep.locator('#sp-city').fill('Krasnodar');
  await prep.getByRole('button', { name: 'Далее' }).click();
  await prep.locator('#sp-kind').selectOption('designer');
  await prep.getByRole('button', { name: 'Далее' }).click();
  await prep.getByRole('button', { name: 'Пропустить' }).click();
  await prep.getByRole('button', { name: 'Завершить профиль' }).click();
  await prep.waitForSelector('[data-testid="specialist-profile-completed-summary"]');
  await prep.close();

  const assertCompleted = async (p) => {
    await p.waitForSelector('[data-testid="specialist-profile-completed-summary"]');
    const txt = await p.locator('[data-testid="specialist-profile-completed-summary"]').innerText();
    if (!txt.includes('Заполнено')) throw new Error('expected completed summary');
  };
  const assertSpecStep = async (p) => {
    await p.waitForSelector('#sp-kind');
  };
  const assertCatalogStep = (n) => async (p) => {
    await p.waitForFunction(
      (target) =>
        document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep ===
        String(target),
      n,
    );
  };
  const assertCatalogPreview = async (p) => {
    await p.waitForFunction(
      () => document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep === '4',
    );
    await p.getByText(/Можно отправить заявку/i).waitFor({ timeout: 30_000 });
    const readiness = await p.locator('[data-testid="specialist-catalog-wizard"]').innerText();
    if (/Заполните:/i.test(readiness)) throw new Error('impl_preview_missing_fields');
    const previewCard = await p.locator('[data-testid="catalog-public-preview"]').innerText().catch(() => '');
    const blob = `${readiness}\n${previewCard}`;
    if (!blob.includes(PREVIEW_FIXTURE.city)) throw new Error('impl_preview_city_mismatch');
  };
  const assertCatalogPending = async (p) => {
    await p.waitForSelector('[data-testid="specialist-catalog-pending"]', { timeout: 60_000 });
    await p.locator('#catalog-pending-title').waitFor({ timeout: 30_000 });
    await p.getByText(/ещё не опубликована/i).waitFor({ timeout: 30_000 });
  };
  const assertRefCompleted = async (p) => {
    await p.waitForSelector('[data-testid="pw-summary"]');
    const txt = await p.locator('[data-testid="pw-summary"] .pw-status').innerText();
    if (!txt.includes('Заполнено')) throw new Error('ref expected completed summary');
  };
  const assertRefSpecialization = async (p) => {
    await p.waitForSelector('[data-specialist-kind]', { state: 'visible' });
    await p.waitForSelector('[data-testid="pw-step-1"][aria-current="step"]');
  };
  const assertRefCatalogStep0 = async (p) => {
    await p.waitForSelector('[data-catalog-form]');
    await p.waitForFunction(() => {
      const panel = document.querySelector('[data-catalog-panel="card"]');
      return panel && !panel.hidden;
    });
  };
  const assertRefCatalogPreview = async (p) => {
    await p.waitForFunction(() => {
      const panel = document.querySelector('[data-catalog-panel="review"]');
      return panel && !panel.hidden;
    });
    await p.getByText('Предпросмотр карточки').waitFor({ timeout: 30_000 });
    const cardText = await p.locator('[data-catalog-panel="review"]').innerText();
    if (!cardText.includes(PREVIEW_FIXTURE.city)) throw new Error('ref_preview_city_mismatch');
  };
  const assertRefCatalogPending = async (p) => {
    await p.waitForSelector('#catalog-pending-title', { timeout: 30_000 });
    await p.locator('#catalog-pending-title').getByText(/отправлен/i).waitFor({ timeout: 30_000 });
    await p.getByText(/ещё не опубликована/i).waitFor({ timeout: 30_000 });
  };

  const refProfileUrl = `${PROTO_BASE}/roles.html`;
  const captures = [];

  captures.push(
    await shotPair(context, {
      name: 'profile-completed-summary',
      implUrl: `${implBase}/profile?section=basics`,
      refUrl: refProfileUrl,
      implTestId: 'specialist-profile-completed-summary',
      assertImpl: assertCompleted,
      prepareRef: refCompleteWorkingProfile,
      assertRef: assertRefCompleted,
      theme: 'light',
      width: 1440,
      height: 900,
    }),
  );

  async function prepareSpecializationBeforeWait(page) {
    await page.getByRole('button', { name: 'Редактировать профиль' }).click();
    await waitImplProfile(page, 'specialist-profile-wizard');
  }

  async function prepareSpecializationStep(page) {
    await page.getByRole('button', { name: 'Далее' }).click();
    await page.waitForSelector('#sp-kind', { state: 'visible' });
  }

  captures.push(
    await shotPair(context, {
      name: 'profile-specialization-step',
      implUrl: `${implBase}/profile?section=basics`,
      refUrl: refProfileUrl,
      prepareBeforeWait: prepareSpecializationBeforeWait,
      implTestId: 'specialist-profile-wizard',
      prepareImpl: prepareSpecializationStep,
      assertImpl: assertSpecStep,
      assertLayout: assertSpecializationLayout,
      prepareRef: prepareRefSpecializationStep,
      assertRef: assertRefSpecialization,
      theme: 'light',
      width: 1440,
      height: 900,
    }),
  );

  captures.push(
    await shotPair(context, {
      name: 'profile-catalog-wizard',
      implUrl: `${implBase}/profile?section=catalog`,
      refUrl: refProfileUrl,
      implTestId: 'specialist-catalog-wizard',
      assertImpl: assertCatalogStep(0),
      prepareRef: openRefCatalogProfile,
      assertRef: assertRefCatalogStep0,
      theme: 'light',
      width: 1440,
      height: 900,
    }),
  );

  captures.push(
    await shotPair(context, {
      name: 'profile-catalog-wizard',
      implUrl: `${implBase}/profile?section=catalog`,
      refUrl: refProfileUrl,
      implTestId: 'specialist-catalog-wizard',
      prepareRef: openRefCatalogProfile,
      refReadySelector: '[data-profile-step="catalog"]',
      theme: 'light',
      width: 375,
      height: 812,
    }),
  );

  captures.push(
    await shotPair(context, {
      name: 'profile-catalog-wizard',
      implUrl: `${implBase}/profile?section=catalog`,
      refUrl: refProfileUrl,
      implTestId: 'specialist-catalog-wizard',
      prepareRef: openRefCatalogProfile,
      refReadySelector: '[data-profile-step="catalog"]',
      theme: 'dark',
      width: 375,
      height: 812,
    }),
  );

  captures.push(
    await shotPair(context, {
      name: 'profile-catalog-preview',
      implUrl: `${implBase}/profile?section=catalog`,
      refUrl: refProfileUrl,
      implTestId: 'specialist-catalog-wizard',
      prepareImpl: prepareCatalogPreviewStep,
      assertImpl: assertCatalogPreview,
      prepareRef: prepareRefCatalogPreview,
      assertRef: assertRefCatalogPreview,
      theme: 'light',
      width: 375,
      height: 812,
    }),
  );

  const pendingPrep = await context.newPage();
  await pendingPrep.goto(`${implBase}/profile?section=catalog`, { waitUntil: 'load' });
  await waitImplProfile(pendingPrep, 'specialist-catalog-wizard');
  await prepareCatalogPreviewStep(pendingPrep);
  await pendingPrep.getByRole('button', { name: /Отправить на публикацию|Отправить повторно/i }).click();
  await pendingPrep.waitForSelector('[data-testid="specialist-catalog-pending"]', { timeout: 60_000 });
  await pendingPrep.close();

  captures.push(
    await shotPair(context, {
      name: 'profile-catalog-pending',
      implUrl: `${implBase}/profile?section=catalog`,
      refUrl: refProfileUrl,
      implTestId: 'specialist-catalog-pending',
      assertImpl: assertCatalogPending,
      prepareRef: prepareRefCatalogPending,
      assertRef: assertRefCatalogPending,
      theme: 'light',
      width: 1440,
      height: 900,
    }),
  );

  captures.push(
    await shotPair(context, {
      name: 'profile-catalog-wizard-smoke',
      implUrl: `${implBase}/profile?section=catalog`,
      refUrl: null,
      implTestId: 'specialist-catalog-wizard',
      theme: 'light',
      width: 320,
      height: 568,
    }),
  );

  await browser.close();
  protoProc.kill();

  const CAPTURE_SHA = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  const matchedPairs = captures.filter((c) => c.refPath);
  const implOnlySmoke = captures.filter((c) => !c.refPath);
  const manifest = {
    referenceSha: REF_SHA,
    referenceGitSha: REF_GIT_SHA,
    codeSha: CODE_SHA,
    captureSha: CAPTURE_SHA,
    navigatorSha: meta.navigatorSha,
    platformSha: meta.platformSha,
    runDir: RUN_DIR,
    matchedPairCount: matchedPairs.length,
    implOnlySmokeCount: implOnlySmoke.length,
    pairs: captures,
    note: '7 matched impl/ref pairs + 1 impl-only smoke; pixel parity not auto-scored (CAPTURED ≠ PASS)',
  };
  writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(
    JSON.stringify({
      ok: true,
      matchedPairCount: matchedPairs.length,
      implOnlySmokeCount: implOnlySmoke.length,
      out: OUT,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
