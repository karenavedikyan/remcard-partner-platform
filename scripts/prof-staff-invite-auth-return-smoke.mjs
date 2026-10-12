#!/usr/bin/env node
/**
 * Guest invite → login UI (synthetic BotLoginCode, external Telegram mocked) → consents → accept.
 * Boundary: only BotLoginCode row substitutes bot delivery; verify-code + AuthFlow + accept are real.
 *
 * Requires PROF with NEXT_PUBLIC_APP_URL matching PROF_BASE_URL (Origin check on BFF mutating routes).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3030";
const NAV_ROOT = process.env.NAV_ROOT || "/agent/repos/remcard-navigator";
const OUT = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts/prof-staff-invite-auth-return";

mkdirSync(OUT, { recursive: true });

const report = { status: "FAIL", detail: {}, exitCode: 1 };

function assertStep(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const fx = JSON.parse(
    execSync(`cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-staff-invite-smoke-fixtures.ts seed-auth-return`, {
      encoding: "utf8",
    }).trim(),
  );
  assertStep(fx.inviteeConsentCount === 0, "fixture must seed invitee without consents");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const page = await context.newPage();

  const apiLog = [];
  page.on("response", (response) => {
    const url = response.url();
    if (!url.includes("/api/")) return;
    const u = new URL(url);
    if (
      !u.pathname.includes("verify-code") &&
      !u.pathname.includes("consent") &&
      !u.pathname.includes("cabinet-readiness")
    ) {
      return;
    }
    apiLog.push({ method: response.request().method(), path: u.pathname, status: response.status() });
  });

  const inviteUrl = `${PROF}/invite/accept?token=${encodeURIComponent(fx.branchInviteToken)}`;
  await page.goto(inviteUrl, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("heading", { name: /Приглашение в команду/i }).waitFor({ timeout: 60_000 });
  await page.getByRole("link", { name: /Войти или зарегистрироваться/i }).click();
  await page.waitForURL(/\/login\?.*returnTo=/, { timeout: 60_000 });

  await page.getByRole("textbox", { name: /код из сообщения/i }).fill(fx.loginCode);
  const verifyWait = page.waitForResponse(
    (r) => r.url().includes("verify-code") && r.request().method() === "POST",
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: /^продолжить$/i }).click();
  const verifyRes = await verifyWait;
  assertStep(verifyRes.status() === 200, `verify-code must be 200, got ${verifyRes.status()}`);

  await page.getByRole("heading", { name: /обязательные соглашения/i }).waitFor({ timeout: 60_000 });

  const consentPostWait = page.waitForResponse(
    (r) => r.url().includes("/account/consent") && r.request().method() === "POST",
    { timeout: 60_000 },
  );
  const boxes = page.locator('input[type="checkbox"]');
  const n = await boxes.count();
  assertStep(n >= 2, `expected consent checkboxes, got ${n}`);
  for (let i = 0; i < n; i += 1) await boxes.nth(i).check();
  await page.getByRole("button", { name: /^продолжить$/i }).click();
  const firstConsent = await consentPostWait;
  assertStep(firstConsent.status() === 200, `consent save must be 200, got ${firstConsent.status()}`);

  await page.waitForResponse(
    (r) =>
      r.url().includes("/account/consent") &&
      r.request().method() === "POST" &&
      r.status() === 200,
    { timeout: 60_000 },
  );

  const tokenRe = new RegExp(
    `/invite/accept\\?token=${fx.branchInviteToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
  );
  await page.waitForURL(tokenRe, { timeout: 90_000 });

  await page.getByRole("button", { name: /Принять приглашение/i }).click();
  await page.waitForURL(/\/profile/, { timeout: 90_000 });

  const text = await page.locator("body").innerText();
  if (/каталог|партнёрск/i.test(text) && /обязательн.*комpan/i.test(text)) {
    throw new Error("partner onboarding forced");
  }

  const verifyEntry = apiLog.find((e) => e.path.includes("verify-code") && e.method === "POST");
  const consentPosts = apiLog.filter((e) => e.path.includes("consent") && e.method === "POST");
  assertStep(verifyEntry?.status === 200, "apiLog: verify-code 200");
  assertStep(consentPosts.length >= 2 && consentPosts.every((e) => e.status === 200), "apiLog: consent POSTs 200");

  const finalUrl = page.url();
  await page.screenshot({ path: path.join(OUT, "auth-return-390-dark.png"), fullPage: true });
  await browser.close();

  execSync(`cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-staff-invite-smoke-fixtures.ts cleanup ${fx.tag}`, {
    stdio: "pipe",
  });

  report.status = "PASS";
  report.detail = {
    finalUrl,
    apiLog,
    mockBoundary: "BotLoginCode DB seed only (no Telegram API; no pre-set session cookie)",
  };
  report.exitCode = 0;
} catch (e) {
  report.error = e instanceof Error ? e.message : String(e);
  report.exitCode = 1;
}

writeFileSync(path.join(OUT, "auth-return-smoke.json"), JSON.stringify(report, null, 2));
process.exit(report.exitCode);
