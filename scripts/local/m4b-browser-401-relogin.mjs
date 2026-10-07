/**
 * M4-B browser acceptance: 401 on onboarding → «Войти снова» → verify-code re-login → /scanner.
 *
 * Prerequisites: local stack (partner :3000, navigator :3001), DB reset via
 * scripts/local/run-m4b-browser-401.sh
 *
 * Run: node scripts/local/m4b-browser-401-relogin.mjs [--mobile]
 */

import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.M4B_PARTNER_URL ?? "http://127.0.0.1:3000";
const INITIAL_CODE = process.env.M4B_INITIAL_CODE;
const RELOGIN_CODE = process.env.M4B_RELOGIN_CODE;
if (!INITIAL_CODE || !RELOGIN_CODE || !/^\d{6}$/.test(INITIAL_CODE) || !/^\d{6}$/.test(RELOGIN_CODE)) {
  console.error("M4B_INITIAL_CODE and M4B_RELOGIN_CODE (6 digits) must be set by run-m4b-browser-401.sh");
  process.exit(1);
}
const EXPECTED_USER_ID = "m1fix-client-000000000001";
const ARTIFACTS = process.env.M4B_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4b-browser-401";
const MOBILE = process.argv.includes("--mobile");

const evidence = {
  scenario: "401 → Войти снова → re-login → /scanner",
  viewport: MOBILE ? "mobile" : "desktop",
  userId: EXPECTED_USER_ID,
  httpStatuses: [],
  urlChain: [],
  reloginHref: null,
  finalUrl: null,
  reloadOk: false,
  usedCodeRejected: false,
  redirectLoop: false,
  pass: false,
  notes: [],
};

function trackUrl(page) {
  evidence.urlChain.push(page.url());
}

function trackResponse(response) {
  const url = response.url();
  if (!url.includes("/api/remcard/")) return;
  evidence.httpStatuses.push({
    method: response.request().method(),
    path: new URL(url).pathname.replace(/^\/api\/remcard/, ""),
    status: response.status(),
  });
}

async function enterCode(page, code) {
  const input = page.getByRole("textbox", { name: /шестизначный код/i });
  await input.waitFor({ timeout: 15000 });
  await input.fill(code);
  await page.getByRole("button", { name: /^продолжить$/i }).click();
}

async function acceptLoginConsents(page) {
  const consentsTitle = page.getByRole("heading", { name: /обязательные соглашения/i });
  const visible = await consentsTitle
    .waitFor({ state: "visible", timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    return;
  }
  const boxes = page.locator('input[type="checkbox"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i += 1) {
    await boxes.nth(i).check();
  }
  await page.getByRole("button", { name: /^продолжить$/i }).click();
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Сохраняем…"),
    undefined,
    { timeout: 20000 },
  ).catch(() => {});
}

async function fillStoreOnboarding(page) {
  await page.getByText(/регистрация партнёра/i).waitFor({ timeout: 15000 });
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Проверяем…"),
    undefined,
    { timeout: 15000 },
  ).catch(() => {});
  await page.locator('input[type="radio"][value="STORE"]').check();
  await page.getByLabel(/город работы/i).fill("Москва");
  await page.getByLabel(/название магазина/i).fill("M4B Browser Store");
  await page.locator('input[type="checkbox"]').first().check();
  const offer = page.locator('label').filter({ hasText: /публичную оферту/i }).locator('input[type="checkbox"]');
  if (await offer.count()) {
    await offer.first().check();
  }
}

async function completeOnboardingIfNeeded(page) {
  if (!page.url().includes("/onboarding")) return;
  await fillStoreOnboarding(page);
  await page.getByRole("button", { name: /^продолжить$/i }).click();
  await page.waitForURL(/\/scanner/, { timeout: 45000 });
}

async function runScenario() {
  await mkdir(ARTIFACTS, { recursive: true });
  await mkdir(path.join(ARTIFACTS, "screenshots"), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const contextOptions = MOBILE
    ? { ...devices["iPhone 13"], baseURL: BASE }
    : { viewport: { width: 1280, height: 800 }, baseURL: BASE };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.on("response", trackResponse);

  const shot = async (name) => {
    const file = path.join(ARTIFACTS, "screenshots", `${MOBILE ? "mobile" : "desktop"}_${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  };

  try {
    // 1. Initial login
    await page.goto("/login?returnTo=%2Fscanner");
    trackUrl(page);
    await enterCode(page, INITIAL_CODE);
    await acceptLoginConsents(page);
    await page.waitForFunction(
      () => window.location.pathname.includes("/onboarding") || document.body.textContent?.includes("Регистрация партнёра"),
      undefined,
      { timeout: 30000 },
    );
    if (!page.url().includes("/onboarding")) {
      await page.goto("/onboarding?returnTo=%2Fscanner");
    }
    trackUrl(page);
    await page.getByText(/регистрация партнёра/i).waitFor();
    await shot("01_onboarding_loaded");

    // 2. Clear HttpOnly session cookie (document.cookie cannot remove it)
    await context.clearCookies();
    evidence.notes.push("Session cookie cleared via Playwright context.clearCookies()");

    await fillStoreOnboarding(page);

    const status401Promise = page.waitForResponse(
      (r) => r.url().includes("/api/remcard/") && r.status() === 401,
      { timeout: 15000 },
    );
    await page.getByRole("button", { name: /^продолжить$/i }).click();
    const resp401 = await status401Promise;
    evidence.notes.push(`Captured HTTP 401 on ${new URL(resp401.url()).pathname}`);

    await page.getByText(/сессия завершилась/i).waitFor({ timeout: 10000 });
    const reloginLink = page.getByRole("link", { name: /войти снова/i });
    evidence.reloginHref = await reloginLink.getAttribute("href");
    await shot("02_session_lost_link");

    if (evidence.reloginHref !== "/login?reason=session&returnTo=%2Fscanner") {
      throw new Error(`Unexpected relogin href: ${evidence.reloginHref}`);
    }

    // 3. Re-login via verify-code (new one-time code from DB)
    await reloginLink.click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    trackUrl(page);
    if (page.url().includes("/onboarding")) {
      evidence.redirectLoop = true;
      throw new Error("Redirect loop: login URL contains /onboarding");
    }

    await enterCode(page, RELOGIN_CODE);
    await acceptLoginConsents(page);
    await page.waitForFunction(
      () =>
        window.location.pathname.includes("/scanner") ||
        window.location.pathname.includes("/onboarding") ||
        document.body.textContent?.includes("Регистрация партнёра"),
      undefined,
      { timeout: 30000 },
    );
    await completeOnboardingIfNeeded(page);
    await page.waitForURL(/\/scanner/, { timeout: 30000 });
    trackUrl(page);
    evidence.finalUrl = page.url();

    const meResp = await page.request.get(`${BASE}/api/remcard/api/auth/me`);
    const meJson = await meResp.json();
    if (meJson?.user?.id !== EXPECTED_USER_ID) {
      throw new Error(`userId mismatch: ${meJson?.user?.id}`);
    }
    await shot("03_scanner_final");

    // 4. Reload preserves session and page
    await page.reload();
    await page.waitForURL(/\/scanner/, { timeout: 10000 });
    evidence.reloadOk = page.url().includes("/scanner");
    await shot("04_scanner_after_reload");

    // 5. Consumed initial code must not work again
    await context.clearCookies();
    await page.goto("/login");
    await enterCode(page, INITIAL_CODE);
    await page.getByText(/неверный|просрочен/i).waitFor({ timeout: 10000 });
    evidence.usedCodeRejected = true;
    await shot("05_used_code_rejected");

    evidence.pass = true;
  } finally {
    await browser.close();
    const reportPath = path.join(ARTIFACTS, `report_${MOBILE ? "mobile" : "desktop"}.json`);
    await writeFile(reportPath, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
  }

  if (!evidence.pass) {
    process.exit(1);
  }
}

runScenario().catch((err) => {
  evidence.notes.push(String(err?.message ?? err));
  console.error(err);
  process.exit(1);
});
