import { mkdirSync } from "node:fs";
import path from "node:path";

export async function readResolvedTheme(page) {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme") || "light");
}

export async function assertTheme(page, expected) {
  const actual = await readResolvedTheme(page);
  if (actual !== expected) {
    throw new Error(`expected data-theme=${expected}, got ${actual}`);
  }
}

export async function setImplTheme(page, theme) {
  const toggle = page.getByTestId("theme-toggle");
  for (let i = 0; i < 4; i += 1) {
    const current = await readResolvedTheme(page);
    if (current === theme) return;
    if (!(await toggle.isVisible().catch(() => false))) {
      await page.emulateMedia({ colorScheme: theme });
      await assertTheme(page, theme);
      return;
    }
    await toggle.click();
    await page.waitForTimeout(150);
  }
  await assertTheme(page, theme);
}

export async function setRefTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
  await assertTheme(page, theme);
}

export async function openReferenceReturningLogin(page, refOrigin) {
  await page.goto(`${refOrigin}/roles.html`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: /^Войти$/ }).click();
  await page.getByRole("heading", { name: /с возвращением/i }).waitFor({ state: "visible", timeout: 30_000 });
}

export async function openReferenceAdminModal(page) {
  await page.getByTestId("admin-login-open").click();
  await page.locator("dialog[open], .dialog[open], [role='dialog']").first().waitFor({ state: "visible", timeout: 15_000 });
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
      pairs.push({ state: "provider", viewport: vp.name, theme, ref: refProviderPath, impl: implProviderPath });

      const refOtp = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await openReferenceReturningLogin(refOtp, refOrigin);
      await setRefTheme(refOtp, theme);
      await refOtp.getByRole("button", { name: /продолжить с max/i }).click();
      await refOtp.getByRole("heading", { name: /введите одноразовый код/i }).waitFor({ state: "visible" });
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
      pairs.push({ state: "otp", viewport: vp.name, theme, ref: refOtpPath, impl: implOtpPath });

      const refAdmin = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await openReferenceReturningLogin(refAdmin, refOrigin);
      await setRefTheme(refAdmin, theme);
      await openReferenceAdminModal(refAdmin);
      await assertTheme(refAdmin, theme);
      const refAdminPath = path.join(shotsDir, `ref-admin-modal-${vp.name}-${theme}.png`);
      await refAdmin.screenshot({ path: refAdminPath, fullPage: true });

      const implAdmin = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await goToProviderStep(implAdmin, `${implOrigin}/login`);
      await setImplTheme(implAdmin, theme);
      await implAdmin.getByTestId("admin-login-open").click();
      await implAdmin.getByTestId("admin-login-modal").waitFor({ state: "visible" });
      await assertTheme(implAdmin, theme);
      const implAdminPath = path.join(shotsDir, `impl-admin-modal-${vp.name}-${theme}.png`);
      await implAdmin.screenshot({ path: implAdminPath, fullPage: true });
      pairs.push({ state: "admin-modal", viewport: vp.name, theme, ref: refAdminPath, impl: implAdminPath });

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
    pairs: pairs.map((p) => ({
      state: p.state,
      viewport: p.viewport,
      theme: p.theme,
      ref: path.basename(p.ref),
      impl: path.basename(p.impl),
    })),
    note: "CAPTURED != visual PASS; themes asserted via html[data-theme] before each screenshot.",
  };
}
