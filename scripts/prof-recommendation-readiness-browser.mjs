#!/usr/bin/env node
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3020";
const NAV = process.env.NAV_BASE_URL || "http://127.0.0.1:3021";
const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const report = { scenarios: {}, exitCode: 0, profBase: PROF, navBase: NAV };

function mint(userId, tokenVersion) {
  return execSync(
    `cd /opt/cursor/worktrees/remcard-navigator-feat-prof-recommendation-readiness && pnpm exec tsx -e ${JSON.stringify(
      `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', ${tokenVersion}));`,
    )}`,
    { encoding: "utf8" },
  ).trim();
}

async function run(name, fn) {
  try {
    await fn();
    report.scenarios[name] = "PASS";
  } catch (e) {
    report.scenarios[name] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    report.exitCode = 1;
  }
}

let fixtures = null;

try {
  fixtures = JSON.parse(
    execSync(
      "cd /opt/cursor/worktrees/remcard-navigator-feat-prof-recommendation-readiness && pnpm exec tsx scripts/prof-recommendation-browser-fixtures.ts seed",
      { encoding: "utf8" },
    ).trim(),
  );
  const token = mint(fixtures.issuerId, fixtures.issuerTokenVersion);
  const browser = await chromium.launch({ headless: true });

  await run("readiness_block_then_agent_path_1440_light", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    await page.goto(`${PROF}/recommendations/new`, { waitUntil: "networkidle", timeout: 120000 });
    await page.getByTestId("recommendation-issuer-readiness").waitFor({ timeout: 30000 });
    await page.getByRole("link", { name: "Выбрать в профиле" }).first().click();
    await page.waitForURL(/\/profile\?/, { timeout: 30000 });
    await page.getByTestId("profile-agent-activity").check();
    await page.getByRole("button", { name: "Сохранить основные данные" }).click();
    await page.getByText("Данные сохранены").waitFor({ timeout: 30000 });
    await page.getByRole("link", { name: /Вернуться к предыдущему разделу/i }).click();
    await page.waitForURL(/\/recommendations\/new/, { timeout: 30000 });
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Создать рекомендацию" }).click();
    await page.getByText(/документ|рекомендац/i).first().waitFor({ timeout: 45000 });
    await page.screenshot({ path: `${outDir}/prof-recommendation-agent-happy-1440-light.png`, fullPage: true });
    await ctx.close();
  });

  await run("layout_390_dark_no_overflow", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    await page.goto(`${PROF}/recommendations/new`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (overflow) throw new Error("horizontal overflow");
    await page.screenshot({ path: `${outDir}/prof-recommendation-390-dark.png`, fullPage: true });
    await ctx.close();
  });

  await browser.close();
} finally {
  if (fixtures?.tag) {
    execSync(
      `cd /opt/cursor/worktrees/remcard-navigator-feat-prof-recommendation-readiness && pnpm exec tsx scripts/prof-recommendation-browser-fixtures.ts cleanup ${fixtures.tag}`,
      { stdio: "inherit" },
    );
  }
  writeFileSync(`${outDir}/prof-recommendation-browser-report.json`, JSON.stringify(report, null, 2));
}

process.exit(report.exitCode);
