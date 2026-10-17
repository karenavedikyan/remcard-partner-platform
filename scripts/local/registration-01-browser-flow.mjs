#!/usr/bin/env node
/**
 * Browser flow checks with mocked upstream (not live MAX/Telegram).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "artifacts/remcard-registration-01");
const BASE = process.env.REGISTRATION_VISUAL_BASE ?? "http://127.0.0.1:3000";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const page = await browser.newPage();
  const results = [];

  await page.route("**/api/remcard/api/pro/admin/auth/capabilities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ adminPasswordLogin: false, adminTestUsers: false }),
    });
  });

  await page.route("**/api/remcard/api/pro/registration/capabilities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contractVersion: "2026-10-17.registration-01",
        welcomeEnabled: true,
        agentRegistrationPathEnabled: true,
        legacyLoginPathEnabled: true,
      }),
    });
  });

  let authUser = "user-A";
  const readyReadiness = {
    nextStep: "ready",
    missingConsents: [],
    needsProfileOnboarding: false,
    canAccessCabinet: true,
    isEmployee: false,
    isAdmin: false,
  };

  await page.route("**/api/remcard/api/auth/me**", async (route) => {
    if (!authUser) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: null }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: authUser,
          displayName: "Test",
          role: authUser === "ready-pro" ? "PRO" : "CLIENT",
          isBlocked: false,
        },
      }),
    });
  });

  await page.route("**/api/remcard/api/account/cabinet-readiness**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(readyReadiness),
    });
  });

  let consentPosts = 0;
  await page.route("**/api/remcard/api/account/consent**", async (route) => {
    consentPosts += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  let finishBlocked = false;
  let finishPostCount = 0;
  await page.route("**/api/remcard/api/pro/registration/agent/finish**", async (route) => {
    finishPostCount += 1;
    if (finishBlocked) {
      await route.fulfill({ status: 403, body: JSON.stringify({ code: "DRAFT_OWNER_MISMATCH" }) });
      return;
    }
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true, code: "completed" }) });
  });

  const joinReturn = `/join?phase=finish&invite=INVITE-QA&returnTo=${encodeURIComponent("/invite/INVITE-QA")}`;
  authUser = "ready-pro";
  await page.goto(
    `${BASE}/login?registration=agent&returnTo=${encodeURIComponent(joinReturn)}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(
    () => window.location.pathname === "/invite/INVITE-QA",
    { timeout: 20_000 },
  );
  results.push({
    name: "ready_user_invite_after_auth",
    pass: page.url().includes("/invite/INVITE-QA"),
  });

  authUser = "user-A";
  await page.goto(`${BASE}/join`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    sessionStorage.setItem(
      "remcard.registration.draft.v1:agent",
      JSON.stringify({
        kind: "agent",
        fields: { displayName: "Проверка 01.2", city: "Краснодар" },
        updatedAt: Date.now(),
      }),
    );
    sessionStorage.setItem("remcard.registration.owner.v1", "user-A");
    sessionStorage.setItem(
      "remcard.registration.wizard.v1",
      JSON.stringify({ step: "auth", kind: "agent", updatedAt: Date.now() }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const stepAfterReload = await page.evaluate(() =>
    sessionStorage.getItem("remcard.registration.wizard.v1"),
  );
  results.push({
    name: "reload_restores_auth_step",
    pass: stepAfterReload?.includes('"step":"auth"') ?? false,
  });
  await page.waitForSelector('[data-testid="registration-entry-auth-providers"]', { timeout: 15_000 });
  results.push({
    name: "auth_shows_provider_step",
    pass: (await page.locator("#reg-auth-title").count()) > 0,
  });
  await page.getByRole("button", { name: /Продолжить с MAX/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-auth-code"]', { timeout: 10_000 });
  results.push({
    name: "auth_provider_to_code_step",
    pass: (await page.locator("#reg-code-title").count()) > 0,
  });

  authUser = null;
  let verifyCodeStatus = 401;
  let verifySuccessCalls = 0;
  await page.route("**/api/remcard/api/auth/verify-code**", async (route) => {
    if (verifyCodeStatus === 200) {
      authUser = "user-otp";
      verifySuccessCalls += 1;
    }
    await route.fulfill({
      status: verifyCodeStatus,
      contentType: "application/json",
      body: JSON.stringify(
        verifyCodeStatus === 401 ? { error: "invalid_code" } : verifyCodeStatus >= 500 ? { error: "server" } : { ok: true },
      ),
    });
  });

  await page.locator('input[inputmode="numeric"]').first().fill("000000");
  await page.locator('[data-testid="registration-entry-auth-code"] button[type="submit"]').click();
  await page.waitForTimeout(600);
  const invalidMsg = await page.locator('[data-testid="registration-entry-auth-code"]').innerText();
  results.push({
    name: "auth_otp_invalid_code_shows_error",
    pass: /неверный|просрочен/i.test(invalidMsg),
  });

  verifyCodeStatus = 500;
  await page.locator('input[inputmode="numeric"]').first().fill("111111");
  await page.locator('[data-testid="registration-entry-auth-code"] button[type="submit"]').click();
  await page.waitForTimeout(600);
  const serverMsg = await page.locator('[data-testid="registration-entry-auth-code"]').innerText();
  results.push({
    name: "auth_otp_server_fail_shows_error",
    pass: /ошибка сервера|временн|не удалось/i.test(serverMsg),
  });

  await page.getByRole("button", { name: /Другой способ входа/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-auth-providers"]', { timeout: 10_000 });
  results.push({
    name: "auth_code_back_to_providers",
    pass: (await page.locator("#reg-auth-title").count()) > 0,
  });

  verifyCodeStatus = 200;
  authUser = null;
  readyReadiness.nextStep = "consents";
  readyReadiness.missingConsents = [
    {
      kind: "TERMS",
      legalDocumentId: "terms-1",
      version: "1",
      url: "/legal/terms",
      status: "missing",
    },
    {
      kind: "PERSONAL_DATA",
      legalDocumentId: "pd-1",
      version: "1",
      url: "/legal/pd",
      status: "missing",
    },
  ];
  readyReadiness.canAccessCabinet = false;
  await page.goto(`${BASE}/join`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    sessionStorage.removeItem("remcard.registration.owner.v1");
    sessionStorage.setItem(
      "remcard.registration.wizard.v1",
      JSON.stringify({ step: "auth", kind: "agent", updatedAt: Date.now() }),
    );
    sessionStorage.setItem(
      "remcard.registration.draft.v1:agent",
      JSON.stringify({
        kind: "agent",
        fields: { displayName: "Проверка OTP", city: "Краснодар" },
        updatedAt: Date.now(),
      }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="registration-entry-auth-providers"]', { timeout: 15_000 });
  await page.getByRole("button", { name: /Продолжить с MAX/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-auth-code"]', { timeout: 10_000 });

  await page.locator('input[inputmode="numeric"]').first().fill("222222");
  await page.locator('[data-testid="registration-entry-auth-code"] button[type="submit"]').click();
  await page.waitForSelector('[data-testid="registration-auth-consents"]', { timeout: 20_000 });
  results.push({
    name: "auth_otp_success_verify_fixture",
    pass: verifySuccessCalls >= 1,
  });
  results.push({
    name: "auth_flow_shows_consents_after_verify",
    pass: (await page.locator('[data-testid="registration-auth-consents"]').count()) > 0,
  });

  const consentSection = page.locator('[data-testid="registration-auth-consents"]');
  const continueBtn = consentSection.getByRole("button", { name: /^Продолжить$/ });
  results.push({
    name: "auth_consents_negative_submit_without_checks",
    pass: !(await continueBtn.isEnabled()),
  });

  const boxes = consentSection.getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  readyReadiness.nextStep = "ready";
  readyReadiness.missingConsents = [];
  readyReadiness.canAccessCabinet = true;
  await consentSection.getByRole("button", { name: /^Продолжить$/ }).click();
  await page.waitForURL(/phase=finish/, { timeout: 20_000 });
  results.push({
    name: "auth_consents_individual_checkboxes_and_submit",
    pass: consentPosts >= 2,
  });
  results.push({
    name: "auth_consents_fresh_readiness_routes_to_finish",
    pass: page.url().includes("phase=finish"),
  });

  authUser = null;
  verifyCodeStatus = 200;
  readyReadiness.nextStep = "ready";
  readyReadiness.missingConsents = [];
  readyReadiness.canAccessCabinet = true;
  finishPostCount = 0;
  await page.goto(`${BASE}/join`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    sessionStorage.setItem("remcard.registration.owner.v1", "user-A");
    sessionStorage.setItem(
      "remcard.registration.draft.v1:agent",
      JSON.stringify({
        kind: "agent",
        fields: { displayName: "Draft-A", city: "City-A" },
        updatedAt: Date.now(),
      }),
    );
    sessionStorage.setItem(
      "remcard.registration.wizard.v1",
      JSON.stringify({ step: "auth", kind: "agent", updatedAt: Date.now() }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="registration-entry-auth-providers"]', { timeout: 15_000 });
  await page.getByRole("button", { name: /Продолжить с MAX/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-auth-code"]', { timeout: 10_000 });
  await page.locator('input[inputmode="numeric"]').first().fill("444444");
  await page.locator('[data-testid="registration-entry-auth-code"] button[type="submit"]').click();
  await page.waitForTimeout(800);
  const mismatchBody = await page.locator("body").innerText();
  const ownerAfterOtp = await page.evaluate(() =>
    sessionStorage.getItem("remcard.registration.owner.v1"),
  );
  const draftAfterMismatch = await page.evaluate(() =>
    sessionStorage.getItem("remcard.registration.draft.v1:agent"),
  );
  results.push({
    name: "auth_otp_owner_mismatch_clears_draft",
    pass:
      /другим аккаунтом/i.test(mismatchBody) &&
      ownerAfterOtp === null &&
      (draftAfterMismatch === null || !draftAfterMismatch.includes("Draft-A")),
  });
  results.push({
    name: "auth_otp_owner_mismatch_no_finish_post",
    pass: finishPostCount === 0,
  });
  results.push({
    name: "auth_otp_owner_mismatch_no_consents",
    pass: (await page.locator('[data-testid="registration-auth-consents"]').count()) === 0,
  });

  authUser = "user-otp";
  readyReadiness.nextStep = "consents";
  readyReadiness.missingConsents = [
    {
      kind: "TERMS",
      legalDocumentId: "terms-1",
      version: "1",
      url: "/legal/terms",
      status: "missing",
    },
  ];
  readyReadiness.canAccessCabinet = false;
  await page.evaluate(() => {
    sessionStorage.setItem("remcard.registration.owner.v1", "user-otp");
    sessionStorage.setItem(
      "remcard.registration.draft.v1:agent",
      JSON.stringify({
        kind: "agent",
        fields: { displayName: "Проверка OTP", city: "Краснодар" },
        updatedAt: Date.now(),
      }),
    );
    sessionStorage.setItem(
      "remcard.registration.wizard.v1",
      JSON.stringify({ step: "finish", kind: "agent", updatedAt: Date.now() }),
    );
  });
  await page.goto(`${BASE}/join?phase=finish`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="registration-auth-consents"]', { timeout: 20_000 });
  const finishBlockedText = await page.locator("body").innerText();
  results.push({
    name: "auth_negative_finish_before_consents",
    pass: /обязательные соглашения/i.test(finishBlockedText),
  });

  authUser = "user-B";
  readyReadiness.nextStep = "ready";
  readyReadiness.missingConsents = [];
  readyReadiness.canAccessCabinet = true;
  finishBlocked = true;
  await page.evaluate(() => {
    sessionStorage.setItem(
      "remcard.registration.wizard.v1",
      JSON.stringify({ step: "finish", kind: "agent", updatedAt: Date.now() }),
    );
    sessionStorage.setItem("remcard.registration.owner.v1", "user-A");
    sessionStorage.setItem(
      "remcard.registration.draft.v1:agent",
      JSON.stringify({
        kind: "agent",
        fields: { displayName: "Mismatch QA", city: "Москва" },
        updatedAt: Date.now(),
      }),
    );
  });
  await page.goto(`${BASE}/join?phase=finish`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const bodyText = await page.locator("body").innerText();
  results.push({
    name: "owner_mismatch_blocks_finish",
    pass: /друг|очищ|заново/i.test(bodyText),
  });

  await page.goto(
    `${BASE}/join?role=employee&invite=INVITE-QA&returnTo=${encodeURIComponent("/invite/INVITE-QA")}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.evaluate(() => {
    sessionStorage.removeItem("remcard.registration.wizard.v1");
    sessionStorage.removeItem("remcard.registration.draft.v1:agent");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="registration-types-grid"]', { timeout: 15_000 });
  await page.locator('label:has(input[value="employee"])').click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.waitForURL(/legacy=1/);
  const loginHref = await page.locator('a[class*="primaryLink"]').first().getAttribute("href");
  results.push({
    name: "employee_invite_preserved",
    pass: loginHref?.includes("invite") ?? false,
  });

  await browser.close();
  const report = { capturedAt: new Date().toISOString(), results };
  await writeFile(path.join(OUT, "browser-flow-report.json"), JSON.stringify(report, null, 2));
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.error(report);
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
