#!/usr/bin/env node
/**
 * Auth synthetic stack smoke: HEAD_OFFICE staff, branch switch + reload, scope unchanged.
 * 390 dark / 1440 light, no horizontal overflow on scope block.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3030";
const NAV_ROOT = process.env.NAV_ROOT || "/agent/repos/remcard-navigator";
const OUT = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts/prof-staff-access-scope";

mkdirSync(OUT, { recursive: true });

const report = { status: "FAIL", exitCode: 1, checks: {} };

function mintToken(userId) {
  return execSync(
    `cd ${NAV_ROOT} && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8" },
  ).trim();
}

function assertNoOverflow(page, testId) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return { ok: false, reason: "missing" };
    return { ok: el.scrollWidth <= el.clientWidth + 2 };
  }, testId);
}

async function runScenario(browser, name, viewport, colorScheme, fx) {
  const token = mintToken(fx.staffUserId);
  const context = await browser.newContext({ viewport, colorScheme });
  await context.addCookies([
    { name: "remcard-token", value: token, url: PROF, httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await context.newPage();


  await page.goto(`${PROF}/profile`, { waitUntil: "networkidle", timeout: 120_000 });
  const headline = page.getByTestId("staff-access-scope-headline");
  await headline.waitFor({ timeout: 90_000 });
  const headlineBefore = (await headline.innerText()).trim();
  if (!/Головной офис и 6 филиалов/.test(headlineBefore)) {
    throw new Error(`${name}: bad headline before switch: ${headlineBefore}`);
  }

  await page.getByText(/Список филиалов \(6\)/).click();
  const listBefore = await page.getByTestId("staff-access-scope-branches").locator("li").count();
  if (listBefore !== 6) throw new Error(`${name}: expected 6 branches, got ${listBefore}`);

  const workingBefore = (await page.getByTestId("staff-working-branch").innerText()).trim();
  const select = page.getByTestId("pro-branch-context-select");
  await select.scrollIntoViewIfNeeded();
  await select.waitFor({ timeout: 60_000 });
  const targetBranchId = fx.branchIds[1];
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/pro/context") &&
        res.request().method() === "PATCH" &&
        res.status() === 200,
      { timeout: 60_000 },
    ),
    page.waitForEvent("load", { timeout: 120_000 }),
    select.selectOption(targetBranchId),
  ]);
  await page.getByTestId("staff-working-branch").waitFor({ timeout: 60_000 });

  await headline.waitFor({ timeout: 90_000 });
  const headlineAfter = (await headline.innerText()).trim();
  if (headlineAfter !== headlineBefore) {
    throw new Error(`${name}: scope headline changed: ${headlineBefore} -> ${headlineAfter}`);
  }

  const listAfter = await page.getByTestId("staff-access-scope-branches").locator("li").count();
  if (listAfter !== 6) throw new Error(`${name}: branch list count changed`);

  const workingAfter = (await page.getByTestId("staff-working-branch").innerText()).trim();
  if (workingAfter === workingBefore) {
    throw new Error(`${name}: working branch unchanged after switch (${workingBefore})`);
  }
  if (!/^F2 — ул\. 2$/.test(workingAfter)) {
    throw new Error(`${name}: unexpected working branch after switch: ${workingAfter}`);
  }

  const overflowHeadline = await assertNoOverflow(page, "staff-access-scope-headline");
  if (!overflowHeadline.ok) throw new Error(`${name}: headline overflow`);
  await page.getByText(/Список филиалов \(6\)/).click();
  const overflowList = await assertNoOverflow(page, "staff-access-scope-branches");
  if (!overflowList.ok) throw new Error(`${name}: branch list overflow`);

  await page.screenshot({ path: path.join(OUT, `scope-auth-${name}.png`), fullPage: true });
  await context.close();
}

try {
  const fx = JSON.parse(
    execSync(`cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-staff-access-scope-smoke-fixtures.ts sc-${Date.now()}`, {
      encoding: "utf8",
    }).trim(),
  );

  const browser = await chromium.launch({ headless: true });
  await runScenario(browser, "390-dark", { width: 390, height: 844 }, "dark", fx);
  await runScenario(browser, "1440-light", { width: 1440, height: 900 }, "light", fx);
  await browser.close();

  try {
    execSync(
      `cd ${NAV_ROOT} && set -a && . ./.env.local && set +a && pnpm exec tsx scripts/prof-staff-invite-smoke-fixtures.ts cleanup ${fx.tag}`,
      { stdio: "pipe", shell: "/bin/bash" },
    );
  } catch {
    /* best-effort synthetic cleanup */
  }

  report.status = "PASS";
  report.exitCode = 0;
  report.checks = { authStack: true, patchContext: true, scopeStable: true, branchSwitch: true };
} catch (e) {
  report.error = e instanceof Error ? e.message : String(e);
}

writeFileSync(path.join(OUT, "scope-browser.json"), JSON.stringify(report, null, 2));
process.exit(report.exitCode);
