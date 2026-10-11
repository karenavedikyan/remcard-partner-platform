#!/usr/bin/env node
/**
 * Team actions + invite sharing acceptance on authenticated synthetic stack (Origin-aligned).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3000";

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

const report = {
  generatedAt: new Date().toISOString(),
  profBase: PROF,
  fixtures: { ownerId: fixtures.ownerId, branchAId: fixtures.branchAId, employeeId: fixtures.employeeId },
  scenarios: {},
  exitCode: 0,
};

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/prof-team-actions-${name}.png`, fullPage: true });
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth > el.clientWidth + 2;
  });
  if (overflow) throw new Error("horizontal overflow detected");
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

async function assertTeamCapabilities(ownerToken) {
  const res = await fetch(`${PROF}/api/remcard/api/pro/context`, {
    headers: { cookie: `remcard-token=${ownerToken}` },
  });
  if (!res.ok) {
    throw new Error(`pro/context HTTP ${res.status} — проверьте REMCARD_API_BASE_URL и JWT`);
  }
  const json = await res.json();
  if (json.teamCapabilities?.canOpenTeamSection !== true) {
    throw new Error(
      "upstream GET /api/pro/context не отдаёт teamCapabilities.canOpenTeamSection=true — перезапустите navigator с текущей ветки (fix/prof-team-actions-invite-sharing)",
    );
  }
}

async function openTeam(page) {
  await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.getByTestId("team-section-root").waitFor({ timeout: 30_000 });
}

async function main() {
  const ownerToken = mintToken(fixtures.ownerId);
  const employeeToken = mintToken(fixtures.employeeId);
  const browser = await chromium.launch({ headless: true });

  await run("create_copy_reload_1440_light", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
    await openTeam(page);
    await page.getByTestId("team-open-invite-wizard").click();
    const wizard = page.getByRole("dialog").filter({ hasText: "Пригласить" });
    await wizard.waitFor({ timeout: 20_000 });
    await page.getByLabel(/Имя сотрудника/i).fill("Кандидат Тест");
    await page.getByRole("button", { name: /^Далее$/i }).click();
    await page.getByTestId(`team-invite-branch-${fixtures.branchAId}`).check();
    await page.getByRole("button", { name: /^Далее$/i }).click();
    await page.getByTestId("team-invite-confirm").check();
    await page.getByRole("button", { name: /^Пригласить$/i }).click();
    await page.getByTestId("team-invite-share").waitFor({ timeout: 30_000 });
    await page.getByTestId("team-copy-invite-message").click();
    await page.getByText(/скопирован/i).waitFor({ timeout: 10_000 }).catch(() => {});
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("team-view-invites").click();
    await page.getByTestId("team-copy-invite-link").first().waitFor({ timeout: 20_000 });
    await assertNoHorizontalOverflow(page);
    await shot(page, "create-copy-reload-1440-light");
    await ctx.close();
  });

  await run("owner_delete_sole_manager_390_dark", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
    });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
    await openTeam(page);
    const configure = page.getByRole("button", { name: /Изменить права/i }).first();
    await configure.waitFor({ timeout: 30_000 });
    await configure.click();
    await page.getByTestId("team-member-remove-from-team").click();
    const confirm = page.getByTestId("team-member-remove-confirm");
    await page.getByRole("button", { name: "Отмена" }).click();
    await expectHidden(confirm);
    await page.getByTestId("team-member-remove-from-team").click();
    await confirm.click();
    await page.getByText(/удалён/i).waitFor({ timeout: 30_000 });
    await page.reload({ waitUntil: "networkidle" });
    await assertNoHorizontalOverflow(page);
    await shot(page, "owner-delete-390-dark");
    await ctx.close();
  });

  await run("removed_employee_context_forbidden", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await ctx.addCookies([{ name: "remcard-token", value: employeeToken, url: PROF }]);
    const res = await page.goto(`${PROF}/api/remcard/api/pro/context`, { waitUntil: "networkidle" });
    const status = res?.status() ?? 0;
    if (status !== 403) {
      throw new Error(`expected employee pro/context 403 after removal, got ${status}`);
    }
    await ctx.close();
  });

  await browser.close();
  writeFileSync(
    join(outDir, "prof-team-actions-browser-report.json"),
    JSON.stringify(report, null, 2),
  );
  process.exit(report.exitCode);
}

async function expectHidden(locator) {
  await locator.waitFor({ state: "hidden", timeout: 5000 }).catch(async () => {
    if (await locator.count()) throw new Error("confirm dialog still visible after cancel");
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
