#!/usr/bin/env node
import { chromium } from "playwright";
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3020";
const NAV = process.env.NAV_BASE_URL || "http://127.0.0.1:3021";
const outDir = "/opt/cursor/artifacts/screenshots";
const NAV_ROOT = "/opt/cursor/worktrees/remcard-navigator-feat-prof-recommendation-readiness";
const PROF_ROOT = "/opt/cursor/worktrees/remcard-partner-platform-feat-prof-recommendation-readiness";

function navTsx(code) {
  return execFileSync("pnpm", ["exec", "tsx", "-e", code], { cwd: NAV_ROOT, encoding: "utf8" }).trim();
}
mkdirSync(outDir, { recursive: true });

const report = {
  scenarios: {},
  exitCode: 0,
  profBase: PROF,
  navBase: NAV,
  navigatorSha: null,
  platformSha: null,
};

function sh(repo, cmd) {
  return execSync(`cd ${repo} && ${cmd}`, { encoding: "utf8" }).trim();
}

report.navigatorSha = sh(NAV_ROOT, "git rev-parse HEAD");
report.platformSha = sh(PROF_ROOT, "git rev-parse HEAD");

function mint(userId, tokenVersion) {
  return navTsx(
    `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', ${tokenVersion}));`,
  );
}

function assertCertInPg(certId) {
  const out = navTsx(
    `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {prisma} from './src/lib/prisma'; prisma.certificate.count({where:{id:'${certId}'}}).then(c=>{process.stdout.write(String(c));}).finally(()=>prisma.$disconnect());`,
  );
  if (out !== "1") throw new Error(`certificate row missing in PG: ${certId} (count=${out})`);
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

async function fillPartnerAndTerms(page) {
  await page.getByRole("checkbox").first().check();
  await page.getByTestId("recommendation-validity-preset").selectOption("6");
  const discountInput = page.locator('input[type="number"]').first();
  await discountInput.fill("7");
}

async function waitCreateFormReady(page) {
  await page.goto(`${PROF}/recommendations/new`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const readiness = page.getByTestId("recommendation-issuer-readiness");
  const validity = page.getByTestId("recommendation-validity-preset");
  await Promise.race([
    readiness.waitFor({ state: "visible", timeout: 60000 }),
    validity.waitFor({ state: "visible", timeout: 60000 }),
  ]);
  const onLanding = await page.getByRole("heading", { name: /Ваши рекомендации могут приносить доход/i }).count();
  if (onLanding > 0) {
    throw new Error("unauthenticated landing — check JWT_SECRET / stack .env.local");
  }
}

async function agentPath(page, token) {
  await waitCreateFormReady(page);
  await fillPartnerAndTerms(page);
  await page.getByTestId("recommendation-issuer-readiness").waitFor({ timeout: 30000 });
  await page.getByRole("link", { name: "Указать агента в профиле" }).click();
  await page.waitForURL(/\/profile\?/, { timeout: 30000 });
  const nameFocus = page.locator('[data-profile-focus="displayName"] input');
  await nameFocus.waitFor({ timeout: 10000 });
  await page.getByTestId("profile-agent-activity").check();
  const profilePatch = page.waitForResponse(
    (r) => r.url().includes("/api/pro/profile") && r.request().method() === "PATCH",
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Сохранить основные данные" }).click();
  const patchRes = await profilePatch;
  if (patchRes.status() !== 200) {
    const errText = await page.locator('[role="alert"]').first().textContent().catch(() => "");
    throw new Error(`profile PATCH ${patchRes.status()} ${errText}`);
  }
  await page.getByRole("link", { name: /Вернуться к рекомендации/i }).click();
  await page.waitForURL(/\/recommendations\/new/, { timeout: 30000 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("recommendation-validity-preset").waitFor();
  const validity = await page.getByTestId("recommendation-validity-preset").inputValue();
  if (validity !== "6") throw new Error(`validity not restored: ${validity}`);
  const discountVal = await page.locator('input[type="number"]').first().inputValue();
  if (discountVal !== "7") throw new Error(`discount not restored: ${discountVal}`);
  const postPromise = page.waitForResponse(
    (r) => r.url().includes("/api/store/certificate") && r.request().method() === "POST",
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Создать рекомендацию" }).click();
  const postRes = await postPromise;
  if (postRes.status() !== 201) throw new Error(`POST status ${postRes.status()}`);
  const body = await postRes.json();
  if (!body.id) throw new Error("POST body missing certificate id");
  await page.getByTestId("recommendation-create-success").waitFor({ timeout: 30000 });
  assertCertInPg(body.id);
  report.agentCertificateId = body.id;
}

async function specializationPath(page) {
  await waitCreateFormReady(page);
  await fillPartnerAndTerms(page);
  await page.getByTestId("recommendation-issuer-readiness").waitFor({ timeout: 30000 });
  await page.getByRole("link", { name: "Выбрать специализацию" }).click();
  await page.waitForURL(/\/profile\?.*focus=directions/, { timeout: 30000 });
  const dirSection = page.locator('[data-profile-focus="directions"]');
  await dirSection.waitFor({ timeout: 30000 });
  const dirCheckbox = dirSection.getByRole("checkbox").first();
  await dirCheckbox.waitFor({ timeout: 60000 });
  await dirCheckbox.check();
  const profilePatch = page.waitForResponse(
    (r) => r.url().includes("/api/pro/profile") && r.request().method() === "PATCH",
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Сохранить основные данные" }).click();
  const patchRes = await profilePatch;
  if (patchRes.status() !== 200) {
    const errText = await page.locator('[role="alert"]').first().textContent().catch(() => "");
    throw new Error(`profile PATCH ${patchRes.status()} ${errText}`);
  }
  await page.getByRole("link", { name: /Вернуться к рекомендации/i }).click();
  await page.waitForURL(/\/recommendations\/new/, { timeout: 30000 });
  const postPromise = page.waitForResponse(
    (r) => r.url().includes("/api/store/certificate") && r.request().method() === "POST",
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Создать рекомендацию" }).click();
  const postRes = await postPromise;
  if (postRes.status() !== 201) throw new Error(`spec POST status ${postRes.status()}`);
  const body = await postRes.json();
  if (!body.id) throw new Error("spec POST missing id");
  await page.getByTestId("recommendation-create-success").waitFor({ timeout: 30000 });
  assertCertInPg(body.id);
  report.specCertificateId = body.id;
}

let fixtures = null;

try {
  fixtures = JSON.parse(
    execSync(
      `cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-recommendation-browser-fixtures.ts seed`,
      { encoding: "utf8" },
    ).trim(),
  );
  const browser = await chromium.launch({ headless: true });

  await run("agent_path_1440_light_with_draft_restore", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      extraHTTPHeaders: { Origin: PROF },
    });
    const page = await ctx.newPage();
    const token = mint(fixtures.issuerId, fixtures.issuerTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    await agentPath(page, token);
    await page.screenshot({ path: `${outDir}/prof-recommendation-agent-happy-1440-light.png`, fullPage: true });
    await ctx.close();
  });

  await run("specialization_path_390_dark", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      extraHTTPHeaders: { Origin: PROF },
    });
    const page = await ctx.newPage();
    const token = mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    await specializationPath(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    if (overflow) throw new Error("horizontal overflow");
    await page.screenshot({ path: `${outDir}/prof-recommendation-spec-390-dark.png`, fullPage: true });
    await ctx.close();
  });

  await browser.close();
} finally {
  if (fixtures?.tag) {
    execSync(
      `cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-recommendation-browser-fixtures.ts cleanup ${fixtures.tag}`,
      { stdio: "inherit" },
    );
  }
  writeFileSync(`${outDir}/prof-recommendation-browser-report.json`, JSON.stringify(report, null, 2));
}

process.exit(report.exitCode);
