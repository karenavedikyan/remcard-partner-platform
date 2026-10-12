#!/usr/bin/env node
/**
 * Synthetic PROF partners access smoke: org staff sees counterparty cards, deep-link terms, list error retry.
 * Viewports: 390 dark, 1440 light. Requires platform on PROF_BASE_URL and remcard_prof_test fixtures.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3030";
const NAV_ROOT = process.env.NAV_ROOT || "/agent/repos/remcard-navigator";
const OUT = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts/prof-staff-partnership-access";

mkdirSync(OUT, { recursive: true });

const report = { status: "FAIL", exitCode: 1, checks: {}, fixture: null };

function mintToken(userId) {
  return execSync(
    `cd ${NAV_ROOT} && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8" },
  ).trim();
}

function seedFixtures() {
  const tag = `browser-pa-${Date.now()}`;
  const raw = execSync(
    `cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-staff-partnership-access-fixtures.ts ${tag}`,
    { encoding: "utf8" },
  ).trim();
  return JSON.parse(raw.split("\n").pop());
}

async function runScenario(browser, name, viewport, colorScheme, fx) {
  const token = mintToken(fx.staffReadUserId);
  const context = await browser.newContext({ viewport, colorScheme });
  await context.addCookies([
    { name: "remcard-token", value: token, url: PROF, httpOnly: true, sameSite: "Lax" },
    { name: "remcard-pro-branch", value: fx.branchIds[0], url: PROF, sameSite: "Lax" },
  ]);
  const page = await context.newPage();

  let listFailOnce = true;
  await page.route("**/api/partnership/list**", async (route) => {
    if (listFailOnce) {
      listFailOnce = false;
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Нет доступа к партнёрствам организации" }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(`${PROF}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("heading", { name: /Мои партнёры/i }).waitFor({ timeout: 90_000 });
  await page.getByText("Нет доступа к партнёрствам организации").waitFor({ timeout: 60_000 });
  const emptyHidden = (await page.getByText("Партнёров пока нет").count()) === 0;
  await page.getByRole("button", { name: /Повторить/i }).click();
  await page.getByText(fx.counterProDisplayName).waitFor({ timeout: 90_000 });
  const orgNameHidden = (await page.getByText("Org Store Owner").count()) === 0;

  await page.goto(`${PROF}/partners?terms=${fx.orgPartnershipId}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByRole("heading", { name: "Предложенные изменения условий" }).waitFor({
    timeout: 90_000,
  });

  await page.screenshot({
    path: path.join(OUT, `${name}-partners.png`),
    fullPage: true,
  });

  await context.close();
  return { emptyHidden, orgNameHidden, deepLink: true };
}

async function main() {
  const fx = seedFixtures();
  report.fixture = fx;
  const browser = await chromium.launch({ headless: true });

  try {
    report.checks.mobile390Dark = await runScenario(browser, "390-dark", { width: 390, height: 844 }, "dark", fx);
    report.checks.desktop1440Light = await runScenario(
      browser,
      "1440-light",
      { width: 1440, height: 900 },
      "light",
      fx,
    );
    report.status = "PASS";
    report.exitCode = 0;
  } catch (err) {
    report.error = String(err?.stack || err);
    report.exitCode = 1;
  } finally {
    await browser.close();
  }

  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.exitCode);
}

main();
