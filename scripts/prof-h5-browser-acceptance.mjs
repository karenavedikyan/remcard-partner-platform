#!/usr/bin/env node
/**
 * PROF-H5 browser acceptance (1440 + 390): owner invite → employee accept → branch switch → revoke.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outDir = "/opt/cursor/artifacts/screenshots";
const traceDir = "/opt/cursor/artifacts/traces";
mkdirSync(outDir, { recursive: true });
mkdirSync(traceDir, { recursive: true });

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3000";
const NAV = process.env.NAV_BASE_URL || "http://127.0.0.1:3001";

const fixtures = JSON.parse(
  execSync("cd /agent/repos/remcard-navigator && pnpm exec tsx scripts/prof-h5-browser-fixtures.ts", {
    encoding: "utf8",
    env: { ...process.env },
  }).trim(),
);

function mintToken(userId) {
  return execSync(
    `cd /agent/repos/remcard-navigator && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8", env: { ...process.env } },
  ).trim();
}

function localInvitePath(inviteUrl) {
  const u = new URL(inviteUrl);
  if (!u.pathname.includes("/invite/accept")) {
    throw new Error(`unexpected invite path: ${u.pathname}`);
  }
  const token = u.searchParams.get("token");
  if (!token) throw new Error("invite token missing in url");
  return `${PROF}${u.pathname}?token=${encodeURIComponent(token)}`;
}

const report = {
  generatedAt: new Date().toISOString(),
  profBase: PROF,
  navBase: NAV,
  fixtures,
  viewports: { desktop: "1440x900", mobile: "390x844" },
  scenarios: {},
  diagnostics: {},
  screenshots: [],
  exitCode: 0,
};

async function shot(page, name) {
  const path = `${outDir}/prof-h5-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
}

async function captureFailure(page, key, err) {
  report.diagnostics[key] = {
    url: page.url(),
    error: err instanceof Error ? err.message : String(err),
  };
  try {
    const readiness = await page.evaluate(async () => {
      const paths = [
        "/api/remcard/api/account/cabinet-readiness",
        "/api/remcard/api/pro/context",
        "/api/remcard/api/pro/organization/employees-overview",
      ];
      const out = {};
      for (const p of paths) {
        try {
          const r = await fetch(p, { credentials: "include" });
          out[p] = { status: r.status, body: await r.text().catch(() => "") };
        } catch (e) {
          out[p] = { error: String(e) };
        }
      }
      return out;
    });
    report.diagnostics[key].api = readiness;
  } catch {
    /* ignore */
  }
  await shot(page, `fail-${key}`);
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

async function ownerCreatesInvite(page, viewportLabel) {
  await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle", timeout: 60000 });
  const form = page.locator("form").filter({ hasText: "Тип приглашения" });
  await form.waitFor({ timeout: 20000 });

  const branchA = page.getByTestId(`team-invite-branch-${fixtures.branchAId}`);
  const branchB = page.getByTestId(`team-invite-branch-${fixtures.branchBId}`);
  await branchA.waitFor({ timeout: 15000 });
  await branchB.waitFor({ timeout: 15000 });
  await branchA.check();
  await branchB.check();

  const submit = form.getByRole("button", { name: /Пригласить/i });
  const disabled = await submit.isDisabled();
  report.diagnostics[`submit-${viewportLabel}`] = { disabled, url: page.url() };
  if (disabled) throw new Error("submit button disabled — check branch selection / form validation");

  await submit.click();
  const code = page.locator("form code, code").first();
  await code.waitFor({ timeout: 20000 });
  const inviteUrl = (await code.textContent())?.trim();
  if (!inviteUrl?.includes("/invite/accept")) throw new Error(`invite url missing: ${inviteUrl ?? "empty"}`);
  report.inviteUrl = inviteUrl;
  report.localInvitePath = localInvitePath(inviteUrl);
  await shot(page, `owner-invite-${viewportLabel}`);
  return report.localInvitePath;
}

async function main() {
  const ownerToken = mintToken(fixtures.ownerId);
  const employeeToken = mintToken(fixtures.employeeId);
  const browser = await chromium.launch({ headless: true });

  let employeeContext = null;
  let employeePage = null;

  await runScenario("owner_create_invite_1440", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.tracing.start({ screenshots: true, snapshots: true });
    const page = await ctx.newPage();
    page.on("dialog", (d) => d.accept());
    await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
    try {
      await ownerCreatesInvite(page, "1440");
    } catch (e) {
      await captureFailure(page, "owner_create_invite_1440", e);
      const tracePath = join(traceDir, "owner-create-invite-1440.zip");
      await ctx.tracing.stop({ path: tracePath });
      report.diagnostics.owner_create_invite_1440 = {
        ...report.diagnostics.owner_create_invite_1440,
        trace: tracePath,
      };
      throw e;
    }
    await ctx.tracing.stop({ path: join(traceDir, "owner-create-invite-1440.zip") });
    await ctx.close();
  });

  await runScenario("employee_accept_and_switch_390", async () => {
    if (!report.localInvitePath) throw new Error("no local invite path");
    employeeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    employeePage = await employeeContext.newPage();
    employeePage.on("dialog", (d) => d.accept());
    await employeeContext.addCookies([{ name: "remcard-token", value: employeeToken, url: PROF }]);
    await employeePage.goto(report.localInvitePath, { waitUntil: "networkidle", timeout: 60000 });
    const acceptBtn = employeePage.getByRole("button", { name: /Принять приглашение/i });
    await acceptBtn.waitFor({ timeout: 20000 });
    await acceptBtn.click();
    await employeePage.waitForURL(/\/profile/, { timeout: 30000 });
    await shot(employeePage, "employee-accepted-390");

    const branchSelect = employeePage.getByTestId("pro-branch-context-select");
    await branchSelect.waitFor({ timeout: 20000 });
    await branchSelect.selectOption(fixtures.branchBId);
    await employeePage.waitForLoadState("networkidle");
    await employeePage.reload({ waitUntil: "networkidle" });
    const persisted = await branchSelect.inputValue();
    if (persisted !== fixtures.branchBId) {
      throw new Error(`branch context not persisted after reload: ${persisted}`);
    }
    await shot(employeePage, "employee-branch-b-persisted-390");
  });

  await runScenario("owner_revoke_via_ui", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on("dialog", (d) => d.accept());
    await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
    await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle" });
    const configure = page.getByRole("button", { name: /Настроить доступ/i }).first();
    await configure.waitFor({ timeout: 20000 });
    await configure.click();
    const revoke = page.getByTestId("team-member-revoke-org");
    await revoke.waitFor({ timeout: 15000 });
    await revoke.click();
    await page.waitForTimeout(2000);
    await shot(page, "owner-revoked-ui-1440");
    await ctx.close();
  });

  await runScenario("employee_stale_session_rejected", async () => {
    if (!employeePage) throw new Error("employee page not open");
    const ctxRes = await employeePage.evaluate(async () => {
      const r = await fetch("/api/remcard/api/pro/context", { credentials: "include" });
      return { status: r.status, body: await r.text() };
    });
    report.diagnostics.staleContextGet = ctxRes;
    const write = await employeePage.evaluate(async (branchId) => {
      const r = await fetch("/api/remcard/api/pro/context", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      });
      return { status: r.status, body: await r.text() };
    }, fixtures.branchAId);
    report.diagnostics.staleContextPatch = write;
    if (ctxRes.status !== 403 || write.status !== 403) {
      throw new Error(
        `expected 403 on context after revoke, got GET ${ctxRes.status} PATCH ${write.status}`,
      );
    }
    let ctxBody;
    try {
      ctxBody = JSON.parse(ctxRes.body);
    } catch {
      throw new Error("context GET after revoke did not return JSON");
    }
    if (ctxBody.errorCode !== "CABINET_NOT_READY" && !String(ctxBody.error || "").includes("403")) {
      throw new Error(`unexpected context denial after revoke: ${ctxRes.body.slice(0, 200)}`);
    }
    await shot(employeePage, "employee-stale-session-390");
    if (employeeContext) await employeeContext.close();
  });

  await runScenario("owner_create_invite_390_overflow", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on("dialog", (d) => d.accept());
    await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
    await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    if (overflow.scrollWidth > overflow.clientWidth + 8) {
      throw new Error(`horizontal overflow: ${overflow.scrollWidth} > ${overflow.clientWidth}`);
    }
    await shot(page, "team-mobile-layout-390");
    await ctx.close();
  });

  await browser.close();
  writeFileSync("/opt/cursor/artifacts/prof-h5-browser-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
