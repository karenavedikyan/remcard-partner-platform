import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  assertAdminModalWithinViewport,
  assertProviderButtonVisual,
} from "./login-entry-visual-metrics.mjs";

const VIEWPORT_SPECS = {
  1440: { width: 1440, height: 900 },
  375: { width: 375, height: 812 },
  320: { width: 320, height: 640 },
};

export function parseCaptureTargetSpec(spec) {
  return spec
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [state, viewport, theme] = part.split(":");
      if (!state || !viewport || !theme) {
        throw new Error(`invalid capture target "${part}" (expected state:viewport:theme)`);
      }
      return { state, viewport, theme };
    });
}

export async function readResolvedTheme(page) {
  return page.evaluate(
    () =>
      document.documentElement.getAttribute("data-theme") ||
      document.documentElement.dataset.theme ||
      "light",
  );
}

export async function assertTheme(page, expected) {
  const actual = await readResolvedTheme(page);
  if (actual !== expected) {
    throw new Error(`expected data-theme=${expected}, got ${actual}`);
  }
}

export async function setImplTheme(page, theme) {
  await page.evaluate((t) => {
    window.localStorage.setItem("remcard-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  const toggle = page.getByTestId("theme-toggle");
  for (let i = 0; i < 4; i += 1) {
    const current = await readResolvedTheme(page);
    if (current === theme) break;
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(150);
    }
  }
  await assertTheme(page, theme);
}

export async function setRefTheme(page, theme) {
  const toggle = page.getByRole("button", {
    name: /включить (?:светлую|тёмную) тему|светлая тема|тёмная тема/i,
  });
  for (let i = 0; i < 4; i += 1) {
    const current = await readResolvedTheme(page);
    if (current === theme) break;
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(120);
    } else {
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        document.documentElement.setAttribute("data-theme", t);
      }, theme);
    }
  }
  await assertTheme(page, theme);
}

export async function openReferenceReturningLogin(page, refOrigin) {
  await page.goto(`${refOrigin}/roles.html`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: /^Войти$/ }).click();
  await page.getByRole("heading", { name: /с возвращением/i }).waitFor({ state: "visible", timeout: 30_000 });
}

export async function openReferenceAdminModal(page) {
  const openControl = page.getByTestId("admin-login-open").or(page.locator('[data-entry="admin-login"]'));
  if (await openControl.first().isVisible().catch(() => false)) {
    await openControl.first().click();
  } else {
    // Static roles.html shell often omits hydrated admin footer; open the same dialog markup directly.
    await page.evaluate(() => {
      const dialog = document.getElementById("role-dialog");
      if (!dialog) throw new Error("role-dialog missing in reference shell");
      dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">Вход администратора</h2></div><div class="dialog-body">
        <form id="entry-admin-form" class="stack" data-testid="admin-login-form">
          <p class="muted">Служебный вход. Для партнёров используйте MAX или Telegram.</p>
          <label class="field" for="entry-admin-login">Логин<input id="entry-admin-login" name="login" autocomplete="off" autocapitalize="none" spellcheck="false" required data-testid="admin-login-input"></label>
          <label class="field" for="entry-admin-password">Пароль<input id="entry-admin-password" name="password" type="password" autocomplete="off" required data-testid="admin-password-input"></label>
          <p class="small">Это макет. Не вводите настоящий пароль: вход в рабочую систему здесь не выполняется.</p>
          <p id="entry-admin-status" class="small" role="status" aria-live="polite"></p>
          <button type="submit" class="btn primary" data-testid="admin-login-submit">Войти</button>
        </form></div>`;
      if (typeof dialog.showModal === "function") dialog.showModal();
    });
  }
  await page.locator("#role-dialog[open], dialog[open]").first().waitFor({ state: "visible", timeout: 15_000 });
}

export async function goToProviderStep(page, loginUrl) {
  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await page.getByRole("heading", { name: /с возвращением/i }).isVisible().catch(() => false)) {
      return;
    }
    const retry = page.getByRole("button", { name: /повторить проверку/i });
    if (await retry.isVisible().catch(() => false)) {
      await retry.click();
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(400);
  }
  throw new Error("provider step not reached");
}

export async function goToOtpStep(page) {
  await page.getByRole("button", { name: /продолжить с max/i }).click();
  await page.getByRole("heading", { name: /введите одноразовый код/i }).waitFor({ state: "visible", timeout: 30_000 });
}

/**
 * Paired ref/impl captures. Each state uses a fresh page and explicit theme assert.
 */
export async function captureLoginEntryPairs({ browser, refOrigin, implOrigin, shotsDir }) {
  mkdirSync(shotsDir, { recursive: true });
  const viewports = [
    { name: "1440", width: 1440, height: 900 },
    { name: "375", width: 375, height: 812 },
    { name: "320", width: 320, height: 640 },
  ];
  const themes = ["light", "dark"];
  const pairs = [];

  for (const vp of viewports) {
    for (const theme of themes) {
      const refProvider = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await openReferenceReturningLogin(refProvider, refOrigin);
      await setRefTheme(refProvider, theme);
      await assertTheme(refProvider, theme);
      const refProviderPath = path.join(shotsDir, `ref-provider-${vp.name}-${theme}.png`);
      await refProvider.screenshot({ path: refProviderPath, fullPage: true });

      const implProvider = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await goToProviderStep(implProvider, `${implOrigin}/login`);
      await setImplTheme(implProvider, theme);
      await assertTheme(implProvider, theme);
      const implProviderPath = path.join(shotsDir, `impl-provider-${vp.name}-${theme}.png`);
      await implProvider.screenshot({ path: implProviderPath, fullPage: true });
      pairs.push({
        state: "provider",
        viewport: vp.name,
        theme,
        ref: path.basename(refProviderPath),
        impl: path.basename(implProviderPath),
      });

      const refOtp = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await openReferenceReturningLogin(refOtp, refOrigin);
      await setRefTheme(refOtp, theme);
      await refOtp.getByRole("button", { name: /продолжить с max/i }).click();
      await refOtp.getByRole("heading", { name: /введите одноразовый код/i }).waitFor({ state: "visible" });
      await setRefTheme(refOtp, theme);
      await assertTheme(refOtp, theme);
      const refOtpPath = path.join(shotsDir, `ref-otp-${vp.name}-${theme}.png`);
      await refOtp.screenshot({ path: refOtpPath, fullPage: true });

      const implOtp = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await goToProviderStep(implOtp, `${implOrigin}/login`);
      await setImplTheme(implOtp, theme);
      await goToOtpStep(implOtp);
      await assertTheme(implOtp, theme);
      const implOtpPath = path.join(shotsDir, `impl-otp-${vp.name}-${theme}.png`);
      await implOtp.screenshot({ path: implOtpPath, fullPage: true });
      pairs.push({
        state: "otp",
        viewport: vp.name,
        theme,
        ref: path.basename(refOtpPath),
        impl: path.basename(implOtpPath),
      });

      const refAdmin = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      let refAdminPath = null;
      let refAdminException = null;
      try {
        await openReferenceReturningLogin(refAdmin, refOrigin);
        await setRefTheme(refAdmin, theme);
        await openReferenceAdminModal(refAdmin);
        await setRefTheme(refAdmin, theme);
        await assertTheme(refAdmin, theme);
        refAdminPath = path.join(shotsDir, `ref-admin-modal-${vp.name}-${theme}.png`);
        await refAdmin.screenshot({ path: refAdminPath, fullPage: true });
      } catch (error) {
        refAdminException = error instanceof Error ? error.message : String(error);
      }

      const implAdmin = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await goToProviderStep(implAdmin, `${implOrigin}/login?mode=admin`);
      await setImplTheme(implAdmin, theme);
      await implAdmin.getByTestId("admin-login-modal").waitFor({ state: "visible", timeout: 30_000 });
      await assertTheme(implAdmin, theme);
      const implAdminPath = path.join(shotsDir, `impl-admin-modal-${vp.name}-${theme}.png`);
      await implAdmin.screenshot({ path: implAdminPath, fullPage: true });
      pairs.push({
        state: "admin-modal",
        viewport: vp.name,
        theme,
        ref: refAdminPath ? path.basename(refAdminPath) : null,
        impl: path.basename(implAdminPath),
        refException: refAdminException,
      });

      await refProvider.close();
      await implProvider.close();
      await refOtp.close();
      await implOtp.close();
      await refAdmin.close();
      await implAdmin.close();
    }
  }

  return {
    pairCount: pairs.length,
    pairs,
    fileCount: pairs.length * 2,
    refAdminNote:
      "When static roles.html omits hydrated admin footer, ref admin-modal uses #role-dialog markup from registration-entry.js (same copy as prototype).",
    note: "CAPTURED != visual PASS; themes asserted via html[data-theme] before each screenshot.",
  };
}

/**
 * Targeted recapture (01.2): asserts computed contrast/layout on impl before PNG write.
 */
export async function captureLoginEntryTargets({
  browser,
  refOrigin,
  implOrigin,
  shotsDir,
  targets,
}) {
  mkdirSync(shotsDir, { recursive: true });
  const pairs = [];
  const visualMetrics = [];

  for (const target of targets) {
    const vp = VIEWPORT_SPECS[target.viewport];
    if (!vp) throw new Error(`unknown viewport ${target.viewport}`);
    const { state, theme } = target;

    if (state === "provider") {
      const refPage = await browser.newPage({ viewport: vp });
      await openReferenceReturningLogin(refPage, refOrigin);
      await setRefTheme(refPage, theme);
      await setRefTheme(refPage, theme);
      await assertTheme(refPage, theme);
      const refPath = path.join(shotsDir, `ref-provider-${target.viewport}-${theme}.png`);
      await refPage.screenshot({ path: refPath, fullPage: true });

      const implPage = await browser.newPage({ viewport: vp });
      await goToProviderStep(implPage, `${implOrigin}/login`);
      await setImplTheme(implPage, theme);
      await assertTheme(implPage, theme);
      visualMetrics.push(await assertProviderButtonVisual(implPage, { theme, provider: "max" }));
      visualMetrics.push(await assertProviderButtonVisual(implPage, { theme, provider: "telegram" }));
      const implPath = path.join(shotsDir, `impl-provider-${target.viewport}-${theme}.png`);
      await implPage.screenshot({ path: implPath, fullPage: true });
      pairs.push({
        state,
        viewport: target.viewport,
        theme,
        ref: path.basename(refPath),
        impl: path.basename(implPath),
      });
      await refPage.close();
      await implPage.close();
      continue;
    }

    if (state === "admin-modal") {
      const refPage = await browser.newPage({ viewport: vp });
      let refName = null;
      let refException = null;
      try {
        await openReferenceReturningLogin(refPage, refOrigin);
        await setRefTheme(refPage, theme);
        await openReferenceAdminModal(refPage);
        await setRefTheme(refPage, theme);
        await assertTheme(refPage, theme);
        const refPath = path.join(shotsDir, `ref-admin-modal-${target.viewport}-${theme}.png`);
        await refPage.screenshot({ path: refPath, fullPage: true });
        refName = path.basename(refPath);
      } catch (error) {
        refException = error instanceof Error ? error.message : String(error);
      }

      const implPage = await browser.newPage({ viewport: vp });
      await goToProviderStep(implPage, `${implOrigin}/login?mode=admin`);
      await setImplTheme(implPage, theme);
      await implPage.getByTestId("admin-login-modal").waitFor({ state: "visible", timeout: 30_000 });
      await assertTheme(implPage, theme);
      visualMetrics.push(await assertAdminModalWithinViewport(implPage));
      const implPath = path.join(shotsDir, `impl-admin-modal-${target.viewport}-${theme}.png`);
      await implPage.screenshot({ path: implPath, fullPage: true });
      pairs.push({
        state,
        viewport: target.viewport,
        theme,
        ref: refName,
        impl: path.basename(implPath),
        refException,
      });
      await refPage.close();
      await implPage.close();
      continue;
    }

    throw new Error(`unsupported capture state ${state}`);
  }

  return {
    pairCount: pairs.length,
    pairs,
    visualMetrics,
    note: "CAPTURED != visual PASS; impl shots gated on computed contrast/layout metrics.",
  };
}
