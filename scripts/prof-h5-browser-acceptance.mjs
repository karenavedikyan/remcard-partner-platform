#!/usr/bin/env node
/**
 * PROF-H5 browser acceptance (1440 + 390): owner invite → employee accept → branch switch → revoke.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3000";
const NAV = process.env.NAV_BASE_URL || "http://127.0.0.1:3001";
const NAV_BASIC = Buffer.from("localtest:localtest").toString("base64");

const fixtures = JSON.parse(
  execSync("cd /agent/repos/remcard-navigator && pnpm exec tsx scripts/prof-h5-browser-fixtures.ts", {
    encoding: "utf8",
  }).trim(),
);

function mintToken(userId) {
  return execSync(
    `cd /agent/repos/remcard-navigator && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8" },
  ).trim();
}

const report = {
  generatedAt: new Date().toISOString(),
  fixtures,
  viewports: { desktop: "1440x900", mobile: "390x844" },
  scenarios: {},
  screenshots: [],
  exitCode: 0,
};

async function shot(page, name) {
  const path = `${outDir}/prof-h5-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ownerToken = mintToken(fixtures.ownerId);
  const employeeToken = mintToken(fixtures.employeeId);

  await runScenario("owner_create_invite_1440", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await ctx.addCookies([
      { name: "remcard-token", value: ownerToken, url: PROF },
    ]);
    await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const checkboxes = page.locator('fieldset legend:has-text("Филиалы") ~ label input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
    }
    const submit = page.locator("form").filter({ hasText: "Тип приглашения" }).getByRole("button", { name: /Пригласить/i });
    await submit.click();
    await page.waitForTimeout(2500);
    const code = page.locator("code");
    await code.waitFor({ timeout: 15000 });
    const inviteUrl = (await code.textContent())?.trim();
    if (!inviteUrl?.includes("/invite/accept")) throw new Error("invite url missing");
    report.inviteUrl = inviteUrl;
    await shot(page, "owner-invite-1440");
    await ctx.close();
  });

  await runScenario("employee_accept_and_switch", async () => {
    if (!report.inviteUrl) throw new Error("no invite url");
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: employeeToken, url: PROF }]);
    await page.goto(report.inviteUrl, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Принять приглашение/i }).click();
    await page.waitForURL(/\/profile/, { timeout: 20000 });
    await shot(page, "employee-accepted-390");
    const branchSelect = page.locator('select').filter({ hasText: /Рабочий филиал|H5-/ });
    if (await branchSelect.count()) {
      await branchSelect.first().selectOption({ index: 1 });
      await page.waitForTimeout(2000);
      await shot(page, "employee-branch-b-390");
    }
    await ctx.close();
  });

  await runScenario("owner_revoke_access", async () => {
    execSync(
      `curl -s -X DELETE -H "Cookie: remcard-token=${ownerToken}" -H "Authorization: Basic ${NAV_BASIC}" "${NAV}/api/pro/organization/team-members/${fixtures.employeeId}?organizationId=${fixtures.organizationId}"`,
      { encoding: "utf8" },
    );
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: employeeToken, url: PROF }]);
    await page.goto(`${PROF}/profile`, { waitUntil: "networkidle" });
    await shot(page, "employee-after-revoke-390");
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
