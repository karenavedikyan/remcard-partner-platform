/**
 * PROF-C browser acceptance (scenario A): new CLIENT → consents → MASTER profile → cabinet → reload.
 *
 * Prerequisites: local stack (partner :3000, navigator :3001), DB reset via run-m4c-browser-master.sh
 * Uses verify-code with one-time BotLoginCode (NOT real Telegram/MAX bot delivery).
 *
 * Run: node scripts/local/m4c-browser-master-onboarding.mjs [--mobile]
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.M4C_PARTNER_URL ?? "http://127.0.0.1:3000";
const LOGIN_CODE = process.env.M4C_LOGIN_CODE;
if (!LOGIN_CODE || !/^\d{6}$/.test(LOGIN_CODE)) {
  console.error("M4C_LOGIN_CODE (6 digits) must be set by run-m4c-browser-master.sh");
  process.exit(1);
}
const EXPECTED_USER_ID = "m1fix-client-000000000001";
const ARTIFACTS = process.env.M4C_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4c-browser-master";
const MOBILE = process.argv.includes("--mobile");
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const evidence = {
  scenario: "A: CLIENT → consents → MASTER → PRO cabinet → reload",
  viewport: MOBILE ? "390x844" : "1440x900",
  userId: EXPECTED_USER_ID,
  httpStatuses: [],
  urlChain: [],
  finalUrl: null,
  reloadOk: false,
  usedCodeRejected: false,
  pass: false,
  notes: ["Real Telegram/MAX bot E2E NOT VERIFIED — codes minted in test DB only."],
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
  if (!visible) return;

  const boxes = page.locator('input[type="checkbox"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i += 1) {
    await boxes.nth(i).check();
  }
  await page.getByRole("button", { name: /^продолжить$/i }).click();
  await page
    .waitForFunction(
      () => !document.body.textContent?.includes("Сохраняем…"),
      undefined,
      { timeout: 20000 },
    )
    .catch(() => {});
}

async function fillMasterOnboarding(page) {
  await page.getByText(/регистрация партнёра/i).waitFor({ timeout: 15000 });
  await page
    .waitForFunction(
      () => !document.body.textContent?.includes("Проверяем…"),
      undefined,
      { timeout: 15000 },
    )
    .catch(() => {});

  await page.locator('input[type="radio"][value="MASTER"]').check();
  await page.getByLabel(/город работы/i).fill("Краснодар");

  const firstStage = page.locator('input[type="checkbox"]').nth(1);
  await firstStage.check();

  const offer = page.locator("label").filter({ hasText: /публичную оферту/i }).locator('input[type="checkbox"]');
  if (await offer.count()) {
    await offer.first().check();
  }
}

async function runScenario() {
  await mkdir(ARTIFACTS, { recursive: true });
  await mkdir(path.join(ARTIFACTS, "screenshots"), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
  const page = await context.newPage();
  page.on("response", trackResponse);

  const shot = async (name) => {
    const file = path.join(ARTIFACTS, "screenshots", `${MOBILE ? "mobile" : "desktop"}_${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  };

  try {
    await page.goto("/login");
    trackUrl(page);
    await enterCode(page, LOGIN_CODE);
    await acceptLoginConsents(page);

    await page.waitForFunction(
      () =>
        window.location.pathname.includes("/onboarding") ||
        document.body.textContent?.includes("Регистрация партнёра"),
      undefined,
      { timeout: 30000 },
    );
    if (!page.url().includes("/onboarding")) {
      await page.goto("/onboarding");
    }
    trackUrl(page);
    await page.getByText(/регистрация партнёра/i).waitFor();
    await shot("01_onboarding_master");

    await fillMasterOnboarding(page);
    await page.getByRole("button", { name: /^продолжить$/i }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 45000 });
    trackUrl(page);
    evidence.finalUrl = page.url();

    await page.getByText(/что сделать дальше/i).waitFor({ timeout: 15000 });
    await page.getByText(/активные партнёрства/i).waitFor();
    await shot("02_empty_cabinet");

    const meResp = await page.request.get(`${BASE}/api/remcard/api/auth/me`);
    const meJson = await meResp.json();
    if (meJson?.user?.id !== EXPECTED_USER_ID) {
      throw new Error(`userId mismatch: ${meJson?.user?.id}`);
    }
    if (meJson?.user?.role !== "PRO") {
      throw new Error(`Expected PRO role after onboarding, got ${meJson?.user?.role}`);
    }

    await page.reload();
    await page.getByText(/что сделать дальше/i).waitFor({ timeout: 15000 });
    evidence.reloadOk = page.url().includes("127.0.0.1:3000") && !page.url().includes("/login");
    await shot("03_cabinet_after_reload");

    await context.clearCookies();
    await page.goto("/login");
    await enterCode(page, LOGIN_CODE);
    await page.getByText(/неверный|просрочен/i).waitFor({ timeout: 10000 });
    evidence.usedCodeRejected = true;

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
