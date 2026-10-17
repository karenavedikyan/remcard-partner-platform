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

  let finishBlocked = false;
  await page.route("**/api/remcard/api/pro/registration/agent/finish**", async (route) => {
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

  authUser = "user-B";
  finishBlocked = true;
  await page.goto(`${BASE}/join?phase=finish`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const bodyText = await page.locator("body").innerText();
  results.push({
    name: "owner_mismatch_blocks_finish",
    pass: /друг|очищ|заново/i.test(bodyText),
  });

  await page.unroute("**/*");
  await page.goto(
    `${BASE}/join?role=employee&invite=INVITE-QA&returnTo=${encodeURIComponent("/invite/INVITE-QA")}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.getByRole("radio", { name: /Сотрудник/i }).check();
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
