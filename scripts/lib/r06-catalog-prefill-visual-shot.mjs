import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PROTO_LOAD_ERROR } from './r06-login-entry-prototype-pack.mjs';

const DEV_HIDE = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog] { display: none !important; }
`;

const CROP_OVERLAY_RESTORE = '__r06CropOverlayRestore';

/** Hide fixed/sticky (and capture-only shell hints) overlapping target after layout is stable. */
async function hideOverlappingShellForCrop(page, selector) {
  return page.evaluate(
    ({ sel, storeKey }) => {
      const target = document.querySelector(sel);
      if (!target) {
        window[storeKey] = [];
        return { hiddenCount: 0 };
      }
      const targetRect = target.getBoundingClientRect();
      const shellHints = ['header', '[class*="topbar" i]', '[class*="Topbar"]', 'nav[aria-label]'];
      const hidden = [];
      const seen = new Set();
      const candidates = [...document.querySelectorAll('body *')];
      for (const hint of shellHints) {
        for (const el of document.querySelectorAll(hint)) candidates.push(el);
      }
      for (const el of candidates) {
        if (!(el instanceof HTMLElement) || seen.has(el)) continue;
        seen.add(el);
        if (target.contains(el) || el.contains(target)) continue;
        const st = getComputedStyle(el);
        if (st.position !== 'fixed' && st.position !== 'sticky') continue;
        if (st.visibility === 'hidden' || st.display === 'none') continue;
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
      return { hiddenCount: hidden.length };
    },
    { sel: selector, storeKey: CROP_OVERLAY_RESTORE },
  );
}

async function restoreOverlappingShellForCrop(page) {
  await page.evaluate((storeKey) => {
    for (const entry of window[storeKey] || []) {
      entry.el.style.visibility = entry.visibility;
    }
    delete window[storeKey];
  }, CROP_OVERLAY_RESTORE);
}

async function stabilizeFormCropTarget(page, selector) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded({ timeout: 30_000 });
  await page.waitForTimeout(120);
  await page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    window.scrollBy(0, rect.top - 4);
  }, selector);
  await page.waitForTimeout(120);
}

async function assertFormCropKickerClear(page, selector) {
  return page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) return { ok: false, reason: 'missing_target' };
    const kicker =
      target.querySelector('[data-testid="specialist-profile-progress"]') ||
      target.querySelector('.pw-kicker');
    if (!kicker) return { ok: false, reason: 'missing_kicker' };
    const kr = kicker.getBoundingClientRect();
    for (const el of document.querySelectorAll('body *')) {
      if (!(el instanceof HTMLElement)) continue;
      if (target.contains(el) || el.contains(target)) continue;
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none') continue;
      if (st.position !== 'fixed' && st.position !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const overlaps =
        r.bottom > kr.top && r.top < kr.bottom && r.right > kr.left && r.left < kr.right;
      if (overlaps) {
        return { ok: false, reason: 'kicker_still_overlapped', tag: el.tagName, className: el.className };
      }
    }
    return { ok: true, kickerTop: Math.round(kr.top) };
  }, selector);
}

/** Form crop: stabilize scroll, then hide overlapping shell, screenshot, restore (ref+impl). */
export async function screenshotFormCropClean(page, selector, cropPath) {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
  try {
    await stabilizeFormCropTarget(page, selector);
    await hideOverlappingShellForCrop(page, selector);
    const cropReady = await assertFormCropKickerClear(page, selector);
    if (!cropReady.ok) {
      throw new Error(`form_crop_not_clean:${selector}:${cropReady.reason}`);
    }
    await page.locator(selector).first().screenshot({ path: cropPath });
  } finally {
    await restoreOverlappingShellForCrop(page);
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
    afterBoth,
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
    await screenshotFormCropClean(implPage, spec.formCrop.impl, cropPath);
    implFormCrop = { path: cropFile, sha256: sha256File(cropPath) };
  }
  if (!afterBoth) await implPage.close();

  let refPath = null;
  let refSha256 = null;
  let refFormCrop = null;
  let refPage = null;
  let refCtx = null;
  if (!spec.implOnly && (prepareRef || refOnlyPrepare || assertRef)) {
    refCtx = await ctx.browser().newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
    refPage = await refCtx.newPage();
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
      await screenshotFormCropClean(refPage, spec.formCrop.ref, cropPath);
      refFormCrop = { path: cropFile, sha256: sha256File(cropPath) };
    }
    if (afterBoth && refPage) {
      await afterBoth(implPage, refPage);
    }
    if (refCtx) await refCtx.close();
  }
  if (afterBoth && implPage && !implPage.isClosed()) await implPage.close();
  else if (!afterBoth && !implPage.isClosed()) await implPage.close();

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
  if (spec.spacingCompare) capture.spacingCompare = spec.spacingCompare;
  return capture;
