#!/usr/bin/env node
/**
 * Synthetic owner team removal — delete sole manager, reload roster, denied ex-employee access.
 * Platform: NEXT_PUBLIC_APP_URL === PROF_BASE_URL; REMCARD_API_BASE_URL → navigator.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3030";
const NAV_ROOT = process.env.NAV_ROOT || "/agent/repos/remcard-navigator";
const OUT = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts/prof-team-removal";
mkdirSync(OUT, { recursive: true });

const report = {
  status: "FAIL",
  exitCode: 1,
  profBase: PROF,
  scenarios: {},
  accessProof: {},
};

function navExec(script) {
  return execSync(`cd ${NAV_ROOT} && pnpm exec tsx -e ${JSON.stringify(script)}`, {
    encoding: "utf8",
    env: { ...process.env },
  }).trim();
}

function mintToken(userId, tokenVersion = 0) {
  return navExec(
    `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', ${tokenVersion}));`,
  );
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  if (overflow) throw new Error("horizontal overflow");
}

async function openTeam(page) {
  const overviewReady = page.waitForResponse(
    (r) => r.url().includes("/employees-overview") && r.status() === 200,
    { timeout: 120_000 },
  );
  await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle", timeout: 120_000 });
  await overviewReady;
  await page.getByTestId("team-section-root").waitFor({ timeout: 45_000 });
}

async function openEmployeeEditor(page, employeeUserId) {
  await page.getByTestId("team-view-people").click();
  await page.waitForFunction(
    (uid) => Boolean(document.querySelector(`[data-testid="person-${uid}"]`)),
    employeeUserId,
    { timeout: 60_000 },
  );
  await page
    .getByRole("button", { name: /Настроить доступ: Team Actions Employee/i })
    .click();
  await page.getByRole("dialog", { name: "Настроить доступ" }).waitFor({ timeout: 30_000 });
}

async function employeeContextStatus(token) {
  const res = await fetch(`${PROF}/api/remcard/api/pro/context`, {
    headers: { cookie: `remcard-token=${token}` },
  });
  let body = null;
  try {
    body = JSON.parse(await res.text());
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function runRemovalFlow(page, fixtures, label) {
  await openTeam(page);
  await openEmployeeEditor(page, fixtures.employeeId);

  let deleteSent = false;
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().includes(`/team-members/${fixtures.employeeId}`)) {
      deleteSent = true;
    }
  });

  await page.getByTestId("team-member-remove-from-team").click();
  await page.getByRole("heading", { name: "Удалить из команды" }).waitFor({ timeout: 10_000 });
  await page.getByText(/останется без управляющего/i).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Отмена" }).click();
  await page.waitForTimeout(400);
  if (deleteSent) throw new Error(`${label}: DELETE sent after cancel`);

  await page.getByTestId("team-member-remove-from-team").click();
  const delResp = page.waitForResponse(
    (r) =>
      r.url().includes(`/team-members/${fixtures.employeeId}`) &&
      r.request().method() === "DELETE" &&
      r.status() === 200,
    { timeout: 45_000 },
  );
  await page.getByTestId("team-member-remove-confirm").click();
  await delResp;
  await page.getByText(/удалён/i).waitFor({ timeout: 20_000 });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("team-section-root").waitFor();
  if (await page.getByTestId(`person-${fixtures.employeeId}`).count()) {
    throw new Error(`${label}: removed employee still visible after reload`);
  }
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: join(OUT, `removal-${label}.png`), fullPage: true });
}

try {
  const fixtures = JSON.parse(
    execSync(`cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-team-actions-browser-fixtures.ts seed`, {
      encoding: "utf8",
    }).trim(),
  );

  const ownerToken = mintToken(fixtures.ownerId, fixtures.ownerTokenVersion ?? 0);
  const employeeToken = mintToken(fixtures.employeeId, fixtures.employeeTokenVersion ?? 0);

  const browser = await chromium.launch({ headless: true });

  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
    });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF, httpOnly: true }]);
    await runRemovalFlow(page, fixtures, "390-dark");
    await ctx.close();
    report.scenarios["390-dark"] = "PASS";
  }

  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF, httpOnly: true }]);
    await openTeam(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: join(OUT, "removal-1440-light-layout.png"), fullPage: true });
    await ctx.close();
    report.scenarios["1440-light-layout"] = "PASS";
  }

  await browser.close();

  const post = await employeeContextStatus(employeeToken);
  report.accessProof = { contextGetStatus: post.status, errorCode: post.body?.errorCode ?? null };
  if (post.status !== 403) {
    throw new Error(`expected 403 for removed employee context GET, got ${post.status}`);
  }

  try {
    execSync(
      `cd ${NAV_ROOT} && set -a && . ./.env.local && set +a && pnpm exec tsx scripts/prof-team-actions-browser-fixtures.ts cleanup ${fixtures.tag}`,
      { stdio: "pipe", shell: "/bin/bash" },
    );
  } catch {
    /* best-effort */
  }

  report.status = "PASS";
  report.exitCode = 0;
} catch (e) {
  report.error = e instanceof Error ? e.message : String(e);
  report.scenarios = report.scenarios ?? {};
  if (!report.scenarios["390-dark"]) report.scenarios["390-dark"] = `FAIL: ${report.error}`;
}

writeFileSync(join(OUT, "removal-browser.json"), JSON.stringify(report, null, 2));
process.exit(report.exitCode);
