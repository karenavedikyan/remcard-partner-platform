#!/usr/bin/env node
/**
 * PROF-I-E cross-feature browser acceptance (1440 + 390, light/dark).
 * Requires production builds + navigator :3001 + platform :3100, shared JWT_SECRET.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PAYOUT_NOTE_SNIPPET = "вне RemCard";

const PROF = process.env.PROF_E_PLATFORM_URL ?? "http://127.0.0.1:3000";
const NAV_ROOT = process.env.PROF_E_NAVIGATOR_ROOT ?? "/tmp/prof-i-worktrees/prof-i-e-navigator";
const OUT_DIR = join(
  process.env.PROF_E_ARTIFACT_DIR ?? "/tmp/prof-i-worktrees/prof-i-e-platform/docs/screenshots/prof-i-e",
);
const REPORT_PATH =
  process.env.PROF_E_BROWSER_REPORT ??
  "/tmp/prof-i-worktrees/prof-i-e-platform/docs/prof-i-e-browser-report.json";

mkdirSync(OUT_DIR, { recursive: true });

const fixtures = JSON.parse(
  execSync(`pnpm exec tsx scripts/prof-i-e-browser-fixtures.ts`, {
    cwd: NAV_ROOT,
    encoding: "utf8",
    env: { ...process.env },
  }).trim(),
);

function mintToken(userId) {
  return execSync(
    `pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; import {prisma} from './src/lib/prisma'; prisma.user.findUnique({where:{id:'${userId}'}}).then(u=>process.stdout.write(createToken('${userId}', u?.tokenVersion??0)));"`,
    {
      cwd: NAV_ROOT,
      encoding: "utf8",
      env: { ...process.env },
    },
  ).trim();
}

function profInviteUrl(token) {
  return `${PROF}/invite/accept?token=${encodeURIComponent(token)}`;
}

function sqlScalar(sql) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required for post-payout checks");
  return execSync(`psql "${url}" -t -A -c ${JSON.stringify(sql)}`, {
    encoding: "utf8",
    env: { ...process.env },
  }).trim();
}

const report = {
  generatedAt: new Date().toISOString(),
  profBase: PROF,
  fixtures,
  scenarios: {},
  consoleErrors: [],
  screenshots: [],
  dbChecks: {},
  exitCode: 0,
};

function trackConsole(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push({ label, text: msg.text() });
    }
  });
  page.on("pageerror", (err) => {
    report.consoleErrors.push({ label, text: String(err) });
  });
}

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
}

async function setAuth(context, userId) {
  const token = mintToken(userId);
  await context.addCookies([
    {
      name: "remcard-token",
      value: token,
      url: PROF,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function runScenario(key, fn) {
  try {
    await fn();
    report.scenarios[key] = "PASS";
  } catch (e) {
    report.scenarios[key] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    report.exitCode = 1;
  }
}

async function themeFlow(page, label) {
  await page.goto(`${PROF}/`, { waitUntil: "networkidle", timeout: 90_000 });
  const toggle = page.getByTestId("theme-toggle");
  await toggle.waitFor({ timeout: 20_000 });
  const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await toggle.click();
  await page.waitForFunction(
    (prev) => document.documentElement.getAttribute("data-theme") !== prev,
    before,
    { timeout: 10_000 },
  );
  const afterToggle = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await page.reload({ waitUntil: "networkidle" });
  const afterReload = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const stored = await page.evaluate(() => localStorage.getItem("remcard-theme"));
  if (afterReload !== afterToggle) {
    throw new Error(`theme not persisted after reload (${label}): ${afterReload} vs ${afterToggle}`);
  }
  if (!stored) throw new Error(`remcard-theme missing in localStorage (${label})`);
  await shot(page, `theme-${label}-${afterReload}`);
}

async function bellFlow(page, label) {
  await page.goto(`${PROF}/`, { waitUntil: "networkidle", timeout: 90_000 });
  const bell = page.getByRole("button", { name: /Уведомления/i });
  await bell.click({ timeout: 15_000 });
  await page.getByRole("dialog", { name: /Последние уведомления/i }).waitFor({ timeout: 15_000 });
  await shot(page, `bell-open-${label}`);
  const markAll = page.getByRole("button", { name: /Отметить все прочитанными/i });
  if (await markAll.isEnabled()) {
    await markAll.click();
    await page.waitForTimeout(800);
  }
  const allLink = page.getByRole("link", { name: /Все уведомления/i });
  await allLink.click();
  await page.getByRole("heading", { name: "Уведомления" }).waitFor({ timeout: 20_000 });
  await shot(page, `notifications-page-${label}`);
}

async function ownerInviteWizard(page) {
  await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.getByTestId("team-open-invite-wizard").click();
  await page.getByLabel(/Должность в вашей организации/i).fill("Старший визуализатор");
  for (const id of ["clients", "sale", "own", "ledger", "cash", "transfer", "catalog", "terms", "team"]) {
    const box = page.getByTestId(`team-perm-${id}`);
    if (await box.isChecked().catch(() => false)) await box.uncheck();
  }
  await page.getByTestId("team-perm-scan").check();
  await page.getByTestId("team-wizard-next").click();
  await page.getByTestId(`team-invite-branch-${fixtures.branchAId}`).check();
  await page.getByTestId("team-wizard-next").click();
  await page.getByTestId("team-invite-confirm").focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="team-wizard-submit"]');
    return el instanceof HTMLButtonElement && !el.disabled;
  });
  await page.getByTestId("team-wizard-submit").click();
  await page.waitForTimeout(1500);
  const code = page.locator("code").first();
  await code.waitFor({ timeout: 30_000 });
  const inviteUrl = (await code.textContent())?.trim();
  if (!inviteUrl?.includes("/invite/accept")) throw new Error("invite url missing");
  const token = new URL(inviteUrl.startsWith("http") ? inviteUrl : `${PROF}${inviteUrl}`).searchParams.get(
    "token",
  );
  if (!token) throw new Error("invite token missing");
  fixtures.inviteToken = token;
  await shot(page, "team-invite-created");
}

async function employeeAcceptAndAccess(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  trackConsole(ctx, "employee");
  await setAuth(ctx, fixtures.employeeId);
  const page = await ctx.newPage();
  await page.goto(profInviteUrl(fixtures.inviteToken), { waitUntil: "networkidle", timeout: 90_000 });
  await page.getByRole("button", { name: /Принять приглашение/i }).click({ timeout: 30_000 });
  await page.waitForURL(/\/(profile|\?)/, { timeout: 60_000 });
  await shot(page, "employee-invite-accepted");
  await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle" });
  const inviteBtn = page.getByTestId("team-open-invite-wizard");
  if (await inviteBtn.count()) {
    throw new Error("employee still sees invite wizard control");
  }
  await page.goto(`${PROF}/scanner`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Сканер/i }).waitFor({ timeout: 20_000 });
  await page.goto(`${PROF}/settlements`, { waitUntil: "networkidle" });
  await page.getByText(/Раздел взаиморасчётов недоступен/i).waitFor({ timeout: 20_000 });
  await ctx.close();
}

async function ownerPayout(page) {
  await page.keyboard.press("Escape").catch(() => {});
  report.dbChecks.payoutRecordsBefore = sqlScalar(
    `SELECT COUNT(*)::text FROM "BonusPayoutRecord" WHERE "bonusId" = '${fixtures.payableBonusId}';`,
  );
  await page.goto(`${PROF}/settlements`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.getByRole("tab", { name: "Я должен" }).click({ timeout: 60_000 });
  await page.getByText(/777|777,00|777 ₽/).first().waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "Зафиксировать выплату" }).first().click({ timeout: 30_000 });
  await page.getByText(PAYOUT_NOTE_SNIPPET).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /Подтвердить выплату наличными/i }).click();
  await page.waitForTimeout(2000);
  await shot(page, "payout-recorded");
  report.dbChecks.payoutRecordsAfter = sqlScalar(
    `SELECT COUNT(*)::text FROM "BonusPayoutRecord" WHERE "bonusId" = '${fixtures.payableBonusId}';`,
  );
  report.dbChecks.bonusStatus = sqlScalar(
    `SELECT status::text FROM "Bonus" WHERE id = '${fixtures.payableBonusId}';`,
  );
  if (report.dbChecks.payoutRecordsAfter !== "1") {
    throw new Error(`expected 1 BonusPayoutRecord, got ${report.dbChecks.payoutRecordsAfter}`);
  }
  if (report.dbChecks.bonusStatus !== "PAID") {
    throw new Error(`expected bonus PAID, got ${report.dbChecks.bonusStatus}`);
  }
  await page.getByRole("button", { name: "Завершённые" }).click();
  await page.getByText(/777/).first().waitFor({ timeout: 20_000 });
}

async function main() {
  const browser = await chromium.launch();
  try {
    for (const vp of [
      { label: "1440-light", width: 1440, height: 900 },
      { label: "390-dark", width: 390, height: 844 },
    ]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      trackConsole(ctx, vp.label);
      await setAuth(ctx, fixtures.ownerId);
      const page = await ctx.newPage();
      if (vp.label.includes("dark")) {
        await page.goto(`${PROF}/`, { waitUntil: "networkidle" });
        await page.getByTestId("theme-toggle").click();
        await page.waitForTimeout(300);
      }
      await runScenario(`theme-${vp.label}`, () => themeFlow(page, vp.label));
      await runScenario(`bell-${vp.label}`, () => bellFlow(page, vp.label));
      if (vp.label === "390-dark") {
        await page.goto(`${PROF}/`, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > doc.clientWidth + 8;
        });
        report.scenarios["390-horizontal-overflow"] = overflow ? "FAIL: horizontal overflow" : "PASS";
        if (overflow) report.exitCode = 1;
        await shot(page, "390-overflow-check");
      }
      await ctx.close();
    }

    const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    trackConsole(ownerCtx, "owner-desktop");
    await setAuth(ownerCtx, fixtures.ownerId);
    const ownerPage = await ownerCtx.newPage();
    await runScenario("team-invite-wizard", () => ownerInviteWizard(ownerPage));
    await runScenario("employee-accept-access", () => employeeAcceptAndAccess(browser));
    const payoutPage = await ownerCtx.newPage();
    await runScenario("owner-payout-ui", () => ownerPayout(payoutPage));
    await ownerCtx.close();
  } finally {
    await browser.close();
  }

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ exitCode: report.exitCode, reportPath: REPORT_PATH }));
  process.exit(report.exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
