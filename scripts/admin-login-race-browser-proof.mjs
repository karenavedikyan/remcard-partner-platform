#!/usr/bin/env node
/**
 * Browser proof: admin login intent does not mount partner AuthFlow while capabilities load.
 * Run against local platform (e.g. http://127.0.0.1:3040).
 */
import { chromium } from "playwright";

const base = process.env.PLATFORM_ORIGIN?.replace(/\/$/, "") || "http://127.0.0.1:3040";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.route("**/api/remcard/api/pro/admin/auth/capabilities**", async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ adminPasswordLogin: true, adminTestUsers: true }),
    });
  });

  let authMeCount = 0;
  await page.route("**/api/remcard/api/auth/me**", async (route) => {
    authMeCount += 1;
    await route.continue();
  });

  await page.goto(`${base}/login?mode=admin&returnTo=%2Fadmin%2Ftest-users`, {
    waitUntil: "domcontentloaded",
  });

  const pending = page.getByTestId("admin-login-pending");
  await pending.waitFor({ timeout: 10_000 });

  await page.waitForTimeout(300);
  if (authMeCount > 0) {
    console.error(JSON.stringify({ ok: false, reason: "auth_me_called_during_admin_pending", authMeCount }));
    process.exit(1);
  }

  await page.getByLabel("Логин администратора").waitFor({ timeout: 10_000 });
  console.log(JSON.stringify({ ok: true, authMeCountDuringPending: authMeCount }));
  await browser.close();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
