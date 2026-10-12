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

async function acceptLoginConsents(page) {
  const consentsTitle = page.getByRole("heading", { name: /обязательные соглашения/i });
  const visible = await consentsTitle
    .waitFor({ state: "visible", timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return false;

  const boxes = page.locator('input[type="checkbox"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i += 1) await boxes.nth(i).check();
  await page.getByRole("button", { name: /^продолжить$/i }).click();
  await page
    .waitForFunction(
      () => !document.body.textContent?.includes("Сохраняем…"),
      undefined,
      { timeout: 30_000 },
    )
    .catch(() => {});
  return true;
}

try {
  const fx = JSON.parse(
    execSync(`cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-staff-invite-smoke-fixtures.ts seed-auth-return`, {
      encoding: "utf8",
    }).trim(),
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const page = await context.newPage();

  const apiLog = [];
  page.on("response", (response) => {
    const url = response.url();
    if (!url.includes("/api/")) return;
    const u = new URL(url);
    if (!u.pathname.includes("verify-code") && !u.pathname.includes("consent") && !u.pathname.includes("cabinet-readiness")) {
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
  await page.getByRole("button", { name: /^продолжить$/i }).click();

  await page.waitForFunction(
    () => {
      const t = (document.body.textContent ?? "").toLowerCase();
      return (
        t.includes("обязательные соглашения") ||
        t.includes("принять приглашение") ||
        /\/invite\/accept\?token=/.test(window.location.href)
      );
    },
    undefined,
    { timeout: 90_000 },
  );

  const verifyEntry = apiLog.find((e) => e.path.includes("verify-code"));
  if (verifyEntry && verifyEntry.status >= 400) {
    throw new Error(`verify-code failed: ${JSON.stringify(verifyEntry)} (check NEXT_PUBLIC_APP_URL === ${PROF})`);
  }

  await acceptLoginConsents(page);

  const tokenRe = new RegExp(
    `/invite/accept\\?token=${fx.branchInviteToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
  );
  if (!tokenRe.test(page.url())) {
    await page.waitForURL(tokenRe, { timeout: 90_000 });
  }

  await page.getByRole("button", { name: /Принять приглашение/i }).click();
  await page.waitForURL(/\/profile/, { timeout: 90_000 });

  const text = await page.locator("body").innerText();
  if (/каталог|партнёрск/i.test(text) && /обязательн.*комpan/i.test(text)) {
    throw new Error("partner onboarding forced");
  }

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
