#!/usr/bin/env node
/**
 * PROF-I-E cross-feature browser acceptance (1440 + 390, light/dark on both).
 * Requires production builds, platform :3000 (NEXT_PUBLIC_APP_URL match), navigator :3001, shared JWT_SECRET.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PAYOUT_NOTE_SNIPPET = "вне RemCard";
const OVERFLOW_TOLERANCE_PX = 0;

const PROF = process.env.PROF_E_PLATFORM_URL ?? "http://127.0.0.1:3000";
const NAV_ROOT = process.env.PROF_E_NAVIGATOR_ROOT ?? "/tmp/prof-i-worktrees/prof-i-e-navigator";
const OUT_DIR = join(
  process.env.PROF_E_ARTIFACT_DIR ?? "/tmp/prof-i-worktrees/prof-i-e-platform/docs/screenshots/prof-i-e",
);
const REPORT_PATH =
  process.env.PROF_E_BROWSER_REPORT ??
  "/tmp/prof-i-worktrees/prof-i-e-platform/docs/prof-i-e-browser-report.json";

mkdirSync(OUT_DIR, { recursive: true });

function assertLoopbackStand() {
  const homeHtml = execSync(`curl -sf ${PROF}/`, { encoding: "utf8" });
  const cssPath = homeHtml.match(/\/_next\/static\/css\/[a-f0-9]+\.css/)?.[0];
  if (!cssPath) throw new Error("stand: homepage missing CSS asset reference");
  const cssStatus = execSync(`curl -sf -o /dev/null -w '%{http_code}' '${PROF}${cssPath}'`, {
    encoding: "utf8",
  }).trim();
  if (cssStatus !== "200") {
    throw new Error(`stand: stale Next build (css ${cssStatus}); restart single platform :3000`);
  }
  const navStatus = execSync(`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/`, {
    encoding: "utf8",
  }).trim();
  if (!["200", "401", "403"].includes(navStatus)) {
    throw new Error(`stand: navigator :3001 unreachable (${navStatus})`);
  }
  const db = execSync(
    `psql "${process.env.DATABASE_URL}" -t -A -c "SELECT current_database();"`,
    { encoding: "utf8" },
  ).trim();
  if (db !== "remcard_prof_test") throw new Error(`stand: expected remcard_prof_test, got ${db}`);
}

const rawFixtures = JSON.parse(
  execSync(`pnpm exec tsx scripts/prof-i-e-browser-fixtures.ts`, {
    cwd: NAV_ROOT,
    encoding: "utf8",
    env: { ...process.env },
  }).trim(),
);

/** Report-safe fixture ids (no invite/JWT tokens). */
const fixturesPublic = {
  tag: rawFixtures.tag,
  ownerId: rawFixtures.ownerId,
  employeeId: rawFixtures.employeeId,
  organizationId: rawFixtures.organizationId,
  branchAId: rawFixtures.branchAId,
  branchBId: rawFixtures.branchBId,
  payableBonusId: rawFixtures.payableBonusId,
  payableAmount: rawFixtures.payableAmount,
  profRecipientId: rawFixtures.profRecipientId,
  seedNotificationId: rawFixtures.seedNotificationId,
};

let inviteTokenInMemory = null;

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
  fixtures: fixturesPublic,
  scenarios: {},
  consoleErrors: [],
  unexpectedConsoleErrors: [],
  expectedDenyEvents: [],
  mutatingBffFailures: [],
  screenshots: [],
  dbChecks: {},
  exitCode: 0,
};

function trackPage(page, label) {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    report.consoleErrors.push({ label, text });
    report.unexpectedConsoleErrors.push({ label, text });
  });
  page.on("pageerror", (err) => {
    const text = String(err);
    report.consoleErrors.push({ label, text });
    report.unexpectedConsoleErrors.push({ label, text });
  });
  page.on("response", async (resp) => {
    const req = resp.request();
    const method = req.method();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;
    const url = resp.url();
    if (!url.includes("/api/remcard/")) return;
    if (resp.status() >= 400) {
      let bodySnippet = "";
      try {
        const txt = await resp.text();
        bodySnippet = txt.slice(0, 240).replace(/remcard-token[^\s"]*/gi, "[redacted]");
      } catch {
        bodySnippet = "(unreadable)";
      }
      report.mutatingBffFailures.push({
        label,
        method,
        url,
        status: resp.status(),
        bodySnippet,
      });
    }
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
    if (!report.scenarios[key]) report.scenarios[key] = "PASS";
  } catch (e) {
    report.scenarios[key] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    report.exitCode = 1;
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate((tol) => {
    const doc = document.documentElement;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right > doc.clientWidth + tol + 0.5) {
        offenders.push({
          tag: el.tagName,
          cls: String(el.className ?? "").slice(0, 100),
          right: Math.round(r.right),
          clientWidth: doc.clientWidth,
        });
      }
    }
    offenders.sort((a, b) => b.right - a.right);
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth + tol,
      topOffender: offenders[0] ?? null,
    };
  }, OVERFLOW_TOLERANCE_PX);
  if (metrics.overflow) {
    throw new Error(
      `${label}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth} (${JSON.stringify(metrics.topOffender)})`,
    );
  }
}

async function setTheme(page, mode) {
  await page.evaluate((target) => {
    localStorage.setItem("remcard-theme", target);
    document.documentElement.setAttribute("data-theme", target);
  }, mode);
  await page.reload({ waitUntil: "networkidle", timeout: 90_000 });
  const current = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (current !== mode) throw new Error(`theme not ${mode}, got ${current}`);
}

async function themeFlow(page, label, mode) {
  await page.goto(`${PROF}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await setTheme(page, mode);
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
  await page.getByText("Загружаем…").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  await shot(page, `bell-open-${label}`);

  const markAll = page.getByRole("button", { name: /Отметить все прочитанными/i });
  await page.waitForFunction(
    () => {
      const buttons = [...document.querySelectorAll("button")];
      return buttons.some(
        (b) => (b.textContent ?? "").includes("Отметить все прочитанными") && !b.disabled,
      );
    },
    { timeout: 15_000 },
  );
  if (!(await markAll.isEnabled())) {
    throw new Error("mark-all-read disabled (snapshotAt missing?)");
  }
  const markPromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/remcard/api/pro/notifications") &&
      r.request().method() === "PATCH" &&
      r.status() === 200,
    { timeout: 30_000 },
  );
  await markAll.click();
  await markPromise;
  await page.waitForFunction(
    () => {
      const bellBtn = [...document.querySelectorAll("button")].find((b) =>
        (b.getAttribute("aria-label") ?? "").startsWith("Уведомления"),
      );
      return bellBtn && !/непрочитано/i.test(bellBtn.getAttribute("aria-label") ?? "");
    },
    { timeout: 15_000 },
  );

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
  await page.getByTestId(`team-invite-branch-${fixturesPublic.branchAId}`).check();
  await page.getByTestId("team-wizard-next").click();

  const confirm = page.getByRole("checkbox", {
    name: /Я проверил должность, подразделения и права/i,
  });
  await confirm.check();
  if (!(await confirm.isChecked())) {
    throw new Error("confirm checkbox not checked after check()");
  }
  const submit = page.getByTestId("team-wizard-submit");
  if (await submit.isDisabled()) {
    throw new Error("submit still disabled after confirmed checkbox");
  }

  await assertNoHorizontalOverflow(page, "wizard-step-3-390");

  const inviteRespPromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/remcard/api/pro/invites") &&
      r.request().method() === "POST" &&
      r.status() === 200,
    { timeout: 60_000 },
  );
  await submit.click();
  const inviteResp = await inviteRespPromise;
  const inviteJson = await inviteResp.json();
  const inviteUrl = inviteJson?.invite?.url;
  if (!inviteUrl?.includes("/invite/accept")) throw new Error("invite url missing in POST response");
  const token = new URL(inviteUrl.startsWith("http") ? inviteUrl : `${PROF}${inviteUrl}`).searchParams.get(
    "token",
  );
  if (!token) throw new Error("invite token missing from UI response");
  inviteTokenInMemory = token;

  await page.getByTestId("team-wizard-submit").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  await codeOrLinkVisible(page);
  await shot(page, "team-invite-created");
}

async function codeOrLinkVisible(page) {
  const code = page.locator("code").first();
  await code.waitFor({ timeout: 30_000 });
  const text = (await code.textContent())?.trim();
  if (!text?.includes("/invite/accept")) throw new Error("invite link not shown in team section");
}

async function employeeAcceptAndAccess(browser) {
  if (!inviteTokenInMemory) {
    report.scenarios["employee-accept-access"] = "BLOCKED_BY_INVITE";
    return;
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setAuth(ctx, fixturesPublic.employeeId);
  const page = await ctx.newPage();
  await page.goto(profInviteUrl(inviteTokenInMemory), { waitUntil: "networkidle", timeout: 90_000 });
  const acceptPromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/remcard/api/invite/accept") &&
      r.request().method() === "POST" &&
      r.status() === 200,
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: /Принять приглашение/i }).click({ timeout: 30_000 });
  await acceptPromise;
  await page.waitForURL(/\/(profile|\?)/, { timeout: 60_000 });
  await shot(page, "employee-invite-accepted");
  await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle" });
  const inviteBtn = page.getByTestId("team-open-invite-wizard");
  if (await inviteBtn.count()) {
    throw new Error("employee still sees invite wizard control");
  }
  await page.goto(`${PROF}/scanner`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Сканер/i }).waitFor({ timeout: 20_000 });
  const settlementsDeny = page.waitForResponse(
    (r) =>
      r.url().includes("/api/remcard/api/pro/wallet/settlements") &&
      r.request().method() === "GET" &&
      r.status() === 403,
    { timeout: 30_000 },
  );
  await page.goto(`${PROF}/settlements`, { waitUntil: "networkidle" });
  await settlementsDeny;
  await page.getByText(/Раздел взаиморасчётов недоступен/i).waitFor({ timeout: 20_000 });
  report.expectedDenyEvents.push({
    scenario: "employee-settlements-deny",
    note: "GET wallet/settlements 403 + UI blocked message",
  });
  await ctx.close();
}

async function pollPayoutDb(bonusId, profRecipientId) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const count = sqlScalar(
      `SELECT COUNT(*)::text FROM "BonusPayoutRecord" WHERE "bonusId" = '${bonusId}';`,
    );
    const status = sqlScalar(`SELECT status::text FROM "Bonus" WHERE id = '${bonusId}';`);
    const inbox = sqlScalar(
      `SELECT COUNT(*)::text FROM "ClientNotification" WHERE "userId" = '${profRecipientId}' AND "dedupeKey" LIKE 'prof:payout:%';`,
    );
    if (count === "1" && status === "PAID" && inbox === "1") {
      return { count, status, inbox };
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return {
    count: sqlScalar(`SELECT COUNT(*)::text FROM "BonusPayoutRecord" WHERE "bonusId" = '${bonusId}';`),
    status: sqlScalar(`SELECT status::text FROM "Bonus" WHERE id = '${bonusId}';`),
    inbox: sqlScalar(
      `SELECT COUNT(*)::text FROM "ClientNotification" WHERE "userId" = '${profRecipientId}' AND "dedupeKey" LIKE 'prof:payout:%';`,
    ),
  };
}

async function ownerPayout(page) {
  const bonusId = fixturesPublic.payableBonusId;
  report.dbChecks.payoutRecordsBefore = sqlScalar(
    `SELECT COUNT(*)::text FROM "BonusPayoutRecord" WHERE "bonusId" = '${bonusId}';`,
  );
  await page.goto(`${PROF}/settlements`, { waitUntil: "networkidle", timeout: 90_000 });
  await assertNoHorizontalOverflow(page, "settlements-390");
  await page.getByRole("tab", { name: "Я должен" }).click({ timeout: 60_000 });
  const payoutBtn = page.getByTestId(`settlements-record-payout-${bonusId}`);
  await payoutBtn.waitFor({ timeout: 30_000 });
  await payoutBtn.click();
  await page.getByText(PAYOUT_NOTE_SNIPPET).waitFor({ timeout: 15_000 });
  const payPromise = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/remcard/api/bonus/${bonusId}/pay`) &&
      r.request().method() === "POST" &&
      r.status() === 200,
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: /Подтвердить выплату наличными/i }).click();
  const payResp = await payPromise;
  const payJson = await payResp.json();
  report.dbChecks.payoutApiReplay = payJson?.replay ?? null;
  report.dbChecks.payoutRecordId = payJson?.payoutRecordId ?? null;

  await page.getByRole("heading", { name: "Зафиксировать выплату" }).waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await shot(page, "payout-recorded");

  const db = await pollPayoutDb(bonusId, fixturesPublic.profRecipientId);
  report.dbChecks.payoutRecordsAfter = db.count;
  report.dbChecks.bonusStatus = db.status;
  report.dbChecks.payoutInboxRows = db.inbox;

  if (db.count !== "1") throw new Error(`expected 1 BonusPayoutRecord, got ${db.count}`);
  if (db.status !== "PAID") throw new Error(`expected bonus PAID, got ${db.status}`);
  if (db.inbox !== "1") throw new Error(`expected 1 inbox notification, got ${db.inbox}`);

  const payableLeft = sqlScalar(
    `SELECT COUNT(*)::text FROM "Bonus" WHERE id = '${bonusId}' AND status = 'CONFIRMED';`,
  );
  report.dbChecks.bonusStillConfirmed = payableLeft;
  if (payableLeft !== "0") throw new Error("bonus still CONFIRMED after payout");

  await page.getByRole("tab", { name: "Завершённые" }).click();
  await page.getByText(/777/).first().waitFor({ timeout: 20_000 });
}

async function main() {
  assertLoopbackStand();

  const viewports = [
    { label: "1440", width: 1440, height: 900 },
    { label: "390", width: 390, height: 844 },
  ];
  const themes = [
    { suffix: "light", initial: "light" },
    { suffix: "dark", initial: "dark" },
  ];

  const browser = await chromium.launch();
  try {
    for (const vp of viewports) {
      for (const th of themes) {
        const scenarioKey = `theme-${vp.label}-${th.suffix}`;
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        await setAuth(ctx, fixturesPublic.ownerId);
        const page = await ctx.newPage();
        trackPage(page, `${vp.label}-${th.suffix}`);
        await runScenario(scenarioKey, async () => themeFlow(page, `${vp.label}-${th.suffix}`, th.initial));
        await runScenario(`bell-${vp.label}-${th.suffix}`, () => bellFlow(page, `${vp.label}-${th.suffix}`));
        if (vp.label === "390") {
          await page.goto(`${PROF}/`, { waitUntil: "networkidle" });
          await runScenario(`390-horizontal-overflow-home-${th.suffix}`, () =>
            assertNoHorizontalOverflow(page, `home-390-${th.suffix}`),
          );
          await shot(page, `390-overflow-home-${th.suffix}`);
        }
        await ctx.close();
      }
    }

    const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    trackPage(await ownerCtx.newPage(), "owner-init");
    await setAuth(ownerCtx, fixturesPublic.ownerId);
    const payoutPage = await ownerCtx.newPage();
    trackPage(payoutPage, "owner-payout");
    await runScenario("owner-payout-ui", () => ownerPayout(payoutPage));
    await payoutPage.close();

    const ownerPage = await ownerCtx.newPage();
    trackPage(ownerPage, "owner-wizard");
    await runScenario("team-invite-wizard", () => ownerInviteWizard(ownerPage));

    await runScenario("employee-accept-access", () => employeeAcceptAndAccess(browser));

    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await setAuth(mobileCtx, fixturesPublic.ownerId);
    const mobilePage = await mobileCtx.newPage();
    trackPage(mobilePage, "390-wizard-shell");
    await mobilePage.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle" });
    await runScenario("390-horizontal-overflow-team", () =>
      assertNoHorizontalOverflow(mobilePage, "team-390"),
    );
    await mobileCtx.close();

    await ownerCtx.close();
  } finally {
    await browser.close();
  }

  if (report.unexpectedConsoleErrors.length > 0) {
    report.exitCode = 1;
    report.scenarios["console-unexpected"] = `FAIL: ${report.unexpectedConsoleErrors.length} unexpected console errors`;
  }

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ exitCode: report.exitCode, reportPath: REPORT_PATH }));
  process.exit(report.exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
