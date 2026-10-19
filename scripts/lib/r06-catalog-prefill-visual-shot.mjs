import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PROTO_LOAD_ERROR } from './r06-login-entry-prototype-pack.mjs';

const DEV_HIDE = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog] { display: none !important; }
`;

const CROP_OVERLAY_RESTORE = '__r06CropOverlayRestore';

async function withOverlappingChromeHidden(page, selector, run) {
  await page.evaluate(
    ({ sel, storeKey }) => {
      const target = document.querySelector(sel);
      if (!target) {
        window[storeKey] = [];
        return;
      }
      const targetRect = target.getBoundingClientRect();
      const hidden = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!(el instanceof HTMLElement)) continue;
        if (target.contains(el) || el.contains(target)) continue;
        const st = getComputedStyle(el);
        if (st.position !== 'fixed' && st.position !== 'sticky') continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const overlaps =
          r.bottom > targetRect.top &&
          r.top < targetRect.bottom &&
          r.right > targetRect.left &&
          r.left < targetRect.right;
        if (!overlaps) continue;
        hidden.push({ el, visibility: el.style.visibility });
        el.style.visibility = 'hidden';
      }
      window[storeKey] = hidden;
    },
    { sel: selector, storeKey: CROP_OVERLAY_RESTORE },
  );
  try {
    await run();
  } finally {
    await page.evaluate((storeKey) => {
      for (const entry of window[storeKey] || []) {
        entry.el.style.visibility = entry.visibility;
      }
      delete window[storeKey];
    }, CROP_OVERLAY_RESTORE);
  }
}

export function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

export async function applyAppTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    const root = document.documentElement;
    if (!root) return;
    root.setAttribute('data-theme', t);
    root.dataset.theme = t;
    try {
      localStorage.setItem('remcard-theme', t);
    } catch {
      /* restricted origin */
    }
  }, theme);
}

export async function waitImplReady(page, testId) {
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 120_000 });
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="specialist-profile-loading"]'),
    undefined,
    { timeout: 120_000 },
  );
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(350);
}

export function attachFailClosedDiagnostics(page, bucket) {
  page.on('pageerror', (err) => bucket.pageErrors.push(String(err?.stack ?? err?.message ?? err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.consoleErrors.push(msg.text());
  });
}

export async function assertNoPrototypeFailure(page) {
  const msg = page.locator('#load-message');
  if (!(await msg.count())) return;
  const text = await msg.textContent();
  if (text?.includes(PROTO_LOAD_ERROR)) throw new Error('ref_prototype_load_error_banner');
}

export async function assertThemeApplied(page, theme) {
  const ok = await page.evaluate((expected) => {
    const attr = document.documentElement.getAttribute('data-theme');
    const dataset = document.documentElement.dataset.theme;
    return attr === expected || dataset === expected;
  }, theme);
  if (!ok) throw new Error(`theme_not_applied:${theme}`);
}

/**
 * @param {import('playwright').BrowserContext} ctx
 * @param {object} spec
 * @param {string} outDir
 * @param {string} protoBaseUrl
 * @param {object} meta codeSha, buildId
 */
export async function captureRefImplPair(ctx, spec, outDir, protoBaseUrl, meta) {
  const {
    pairId,
    theme,
    width,
    height,
    dpr = 1,
    implUrl,
    implTestId,
    prepareImpl,
    assertImpl,
    prepareRef,
    assertRef,
    refOnlyPrepare,
  } = spec;

  const fileBase = `${pairId}-${width}-${theme}`;
  const implFile = `${fileBase}-impl.png`;
  const refFile = `${fileBase}-ref.png`;

  const implPage = await ctx.newPage();
  await implPage.setViewportSize({ width, height });
  if (dpr !== 1) await implPage.setViewportSize({ width, height });
  await implPage.addInitScript((t) => {
    const apply = () => {
      document.documentElement?.setAttribute('data-theme', t);
      try {
        localStorage.setItem('remcard-theme', t);
      } catch {
        /* ignore */
      }
    };
    if (document.documentElement) apply();
    else document.addEventListener('DOMContentLoaded', apply, { once: true });
  }, theme);
  await implPage.addStyleTag({ content: DEV_HIDE });
  const implDiag = { pageErrors: [], consoleErrors: [] };
  attachFailClosedDiagnostics(implPage, implDiag);

  await implPage.goto(implUrl, { waitUntil: 'load', timeout: 120_000 });
  await applyAppTheme(implPage, theme);
  if (implTestId) await waitImplReady(implPage, implTestId);
  if (prepareImpl) await prepareImpl(implPage);
  if (assertImpl) await assertImpl(implPage);
  await assertThemeApplied(implPage, theme);
  if (implDiag.pageErrors.length) throw new Error(`impl_page_errors:${implDiag.pageErrors.join('|')}`);
  await implPage.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    window.scrollTo(0, 0);
  });
  await implPage.waitForTimeout(200);
  const implPath = path.join(outDir, implFile);
  await implPage.screenshot({ path: implPath, fullPage: true });
  let implFormCrop = null;
  if (spec.formCrop?.impl) {
    const cropFile = `${fileBase}-form-impl.png`;
    const cropPath = path.join(outDir, cropFile);
    await withOverlappingChromeHidden(implPage, spec.formCrop.impl, async () => {
      await implPage.locator(spec.formCrop.impl).screenshot({ path: cropPath });
    });
    implFormCrop = { path: cropFile, sha256: sha256File(cropPath) };
  }
  await implPage.close();

  let refPath = null;
  let refSha256 = null;
  let refFormCrop = null;
  if (!spec.implOnly && (prepareRef || refOnlyPrepare || assertRef)) {
    const refCtx = await ctx.browser().newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
    const refPage = await refCtx.newPage();
    await refPage.addInitScript((t) => {
      const apply = () => document.documentElement?.setAttribute('data-theme', t);
      if (document.documentElement) apply();
      else document.addEventListener('DOMContentLoaded', apply, { once: true });
    }, theme);
    const refDiag = { pageErrors: [], consoleErrors: [] };
    attachFailClosedDiagnostics(refPage, refDiag);
    if (refOnlyPrepare) await refOnlyPrepare(refPage, protoBaseUrl);
    else if (prepareRef) await prepareRef(refPage, protoBaseUrl);
    await applyAppTheme(refPage, theme);
    await assertNoPrototypeFailure(refPage);
    if (assertRef) await assertRef(refPage);
    await assertThemeApplied(refPage, theme);
    if (refDiag.pageErrors.length) throw new Error(`ref_page_errors:${refDiag.pageErrors.join('|')}`);
    await refPage.evaluate(() => document.fonts?.ready);
    await refPage.waitForTimeout(400);
    await refPage.evaluate(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      window.scrollTo(0, 0);
    });
    refPath = path.join(outDir, refFile);
    await refPage.screenshot({ path: refPath, fullPage: true });
    refSha256 = sha256File(refPath);
    if (spec.formCrop?.ref) {
      const cropFile = `${fileBase}-form-ref.png`;
      const cropPath = path.join(outDir, cropFile);
      await withOverlappingChromeHidden(refPage, spec.formCrop.ref, async () => {
        await refPage.locator(spec.formCrop.ref).screenshot({ path: cropPath });
      });
      refFormCrop = { path: cropFile, sha256: sha256File(cropPath) };
    }
    await refCtx.close();
  }

  const implSha256 = sha256File(implPath);
  const capture = {
    pairId,
    viewport: { width, height, dpr },
    theme,
    impl: { path: implFile, sha256: implSha256 },
    ref: refPath ? { path: refFile, sha256: refSha256 } : null,
    codeSha: meta.codeSha,
    runtimeBuildId: meta.buildId,
    readiness: 'ok',
    visualStatus: 'captured',
  };
  if (implFormCrop) capture.implFormCrop = implFormCrop;
  if (refFormCrop) capture.refFormCrop = refFormCrop;
  if (spec.formMetrics) capture.formMetrics = spec.formMetrics;
  return capture;
}
