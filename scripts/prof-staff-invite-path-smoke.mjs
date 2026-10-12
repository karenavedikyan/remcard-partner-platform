#!/usr/bin/env node
/**
 * Synthetic staff-invite path smoke (PROF 3030 + NAV 3031, remcard_prof_test).
 */
import { chromium } from "playwright";
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3030";
const NAV = process.env.NAV_BASE_URL || "http://127.0.0.1:3031";
const NAV_ROOT = process.env.NAV_ROOT || "/agent/repos/remcard-navigator";
const OUT = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts/prof-staff-invite-path-smoke";

mkdirSync(OUT, { recursive: true });

function loadNavEnv() {
  try {
    const raw = readFileSync(path.join(NAV_ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    }
  } catch {
    /* optional */
  }
}
loadNavEnv();

const report = {
  navigatorSha: execSync(`git -C ${NAV_ROOT} rev-parse HEAD`, { encoding: "utf8" }).trim(),
  platformSha: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  scenarios: {},
  notVerified: [],
  exitCode: 0,
};

async function run(name, fn) {
  try {
    report.scenarios[name] = { status: "PASS", detail: await fn() };
  } catch (e) {
    report.scenarios[name] = {
      status: "FAIL",
      error: e instanceof Error ? e.message : String(e),
    };
    report.exitCode = 1;
  }
}

function mint(userId, tokenVersion = 0) {
  return execFileSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "-e",
      `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', ${tokenVersion}));`,
    ],
    { cwd: NAV_ROOT, encoding: "utf8" },
  ).trim();
}

function curlJson(url, cookie) {
  const args = ["-s", "-w", "\n__HTTP__%{http_code}"];
  if (cookie) args.push("-H", `Cookie: remcard-token=${cookie}`);
  args.push("-H", `Origin: ${PROF}`, url);
  const out = execFileSync("curl", args, { encoding: "utf8" });
  const m = out.match(/\n__HTTP__(\d+)\s*$/);
  const body = out.replace(/\n__HTTP__\d+\s*$/, "");
  return { http: m?.[1] ?? "?", body: JSON.parse(body || "{}") };
}

function navCurlHeaders(token) {
  const args = ["-sI"];
  const user = process.env.STAGING_AUTH_USER;
  const pass = process.env.STAGING_AUTH_PASSWORD;
  if (user && pass) args.push("-u", `${user}:${pass}`);
  args.push(`${NAV}/invite/accept?token=${encodeURIComponent(token)}`);
  return execFileSync("curl", args, { encoding: "utf8" });
}

let fixtures = null;

try {
  fixtures = JSON.parse(
    execSync(`cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-staff-invite-smoke-fixtures.ts seed`, {
      encoding: "utf8",
    }).trim(),
  );

  await run("invite_url_uses_prof_host", async () => {
    const token = mint(fixtures.ownerId);
    const { http, body } = curlJson(
      `${PROF}/api/remcard/api/pro/invites?status=PENDING&limit=5`,
      token,
    );
    if (http !== "200") throw new Error(`invites HTTP ${http}`);
    const url = body.invites?.[0]?.url;
    if (!url || !url.startsWith(PROF)) throw new Error(`invite url not PROF: ${url}`);
    return { http, urlPrefix: url.slice(0, 40) };
  });

  await run("legacy_main_site_redirect_to_prof", async () => {
    const headers = navCurlHeaders(fixtures.acceptFlowToken);
    const loc = headers.match(/location:\s*(.+)/i)?.[1]?.trim();
    if (!loc || !loc.includes("/invite/accept")) throw new Error(`no redirect location: ${headers}`);
    if (!loc.includes(encodeURIComponent(fixtures.acceptFlowToken)) && !loc.includes(fixtures.acceptFlowToken)) {
      throw new Error("token not preserved in redirect");
    }
    if (!loc.startsWith("http://127.0.0.1:3030") && !loc.startsWith(PROF)) {
      throw new Error(`redirect not PROF: ${loc}`);
    }
    return { location: loc };
  });

  await run("client_manager_team_and_invites_api", async () => {
    const token = mint(fixtures.managerClientId);
    const overview = curlJson(`${PROF}/api/remcard/api/pro/organization/employees-overview`, token);
    if (overview.http !== "200") throw new Error(`overview HTTP ${overview.http}`);
    const invites = curlJson(`${PROF}/api/remcard/api/pro/invites?status=PENDING&limit=50`, token);
    if (invites.http !== "200") throw new Error(`invites HTTP ${invites.http} (PRO-only 403?)`);
    return {
      overviewHttp: overview.http,
      invitesHttp: invites.http,
      branches: overview.body.branches?.length,
    };
  });

  await run("client_viewer_invites_forbidden", async () => {
    const token = mint(fixtures.viewerClientId);
    const invites = curlJson(`${PROF}/api/remcard/api/pro/invites?status=PENDING&limit=50`, token);
    if (invites.http !== "403") throw new Error(`expected 403, got ${invites.http}`);
    return { http: invites.http };
  });

  await run("owner_pro_regression_overview", async () => {
    const token = mint(fixtures.ownerId);
    const overview = curlJson(`${PROF}/api/remcard/api/pro/organization/employees-overview`, token);
    if (overview.http !== "200") throw new Error(`owner overview HTTP ${overview.http}`);
    return { http: overview.http, myRole: overview.body.myRole };
  });

  const browser = await chromium.launch({ headless: true });

  await run("browser_invite_accept_staff_flow", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
    await ctx.addCookies([{ name: "remcard-token", value: mint(fixtures.inviteeUserId), url: PROF }]);
    const page = await ctx.newPage();
    await page.goto(`${PROF}/invite/accept?token=${encodeURIComponent(fixtures.acceptFlowToken)}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByRole("button", { name: /Принять приглашение/i }).waitFor({ timeout: 60_000 });
    const bodyText = await page.locator("body").innerText();
    if (/Специалист|MASTER|каталог/i.test(bodyText) && !/не партнёрство/i.test(bodyText)) {
      throw new Error("invite screen looks like partner onboarding");
    }
    await page.getByRole("button", { name: /Принять приглашение/i }).click();
    await page.waitForURL(/\/(profile|\?)/, { timeout: 60_000 });
    await page.screenshot({ path: path.join(OUT, "invite-accept-390-dark.png"), fullPage: true });
    await ctx.close();
    return { url: page.url() };
  });

  await run("browser_profile_team_visible_390_dark", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
    await ctx.addCookies([{ name: "remcard-token", value: mint(fixtures.managerClientId), url: PROF }]);
    const page = await ctx.newPage();
    await page.goto(`${PROF}/profile?section=team`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("team-section-root").waitFor({ timeout: 60_000 });
    await page.screenshot({ path: path.join(OUT, "team-client-manager-390-dark.png"), fullPage: true });
    await ctx.close();
  });

  await run("browser_profile_overview_staff_1440_light", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    await ctx.addCookies([{ name: "remcard-token", value: mint(fixtures.managerClientId), url: PROF }]);
    const page = await ctx.newPage();
    await page.goto(`${PROF}/profile?section=overview`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByText(/ОПТОВИК Synthetic|Synthetic|рабоч/i).first().waitFor({ timeout: 60_000 });
    const text = await page.locator("body").innerText();
    if (text.includes("Специалист") && !text.includes("Сотрудник")) {
      throw new Error("overview shows Специалист for staff CLIENT");
    }
    await page.screenshot({ path: path.join(OUT, "overview-staff-1440-light.png"), fullPage: true });
    await ctx.close();
  });

  await run("browser_owner_pro_overview_1440", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    await ctx.addCookies([{ name: "remcard-token", value: mint(fixtures.ownerId), url: PROF }]);
    const page = await ctx.newPage();
    await page.goto(`${PROF}/profile?section=overview`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByText(/рабоч/i).first().waitFor({ timeout: 60_000 });
    await page.screenshot({ path: path.join(OUT, "overview-owner-pro-1440.png"), fullPage: true });
    await ctx.close();
  });

  await browser.close();

  execSync(`cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-staff-invite-smoke-fixtures.ts cleanup ${fixtures.tag}`, {
    stdio: "pipe",
  });
} catch (e) {
  report.scenarios.bootstrap = { status: "FAIL", error: String(e) };
  report.exitCode = 1;
  report.notVerified.push("scenarios after bootstrap failure");
  if (fixtures?.tag) {
    try {
      execSync(
        `cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-staff-invite-smoke-fixtures.ts cleanup ${fixtures.tag}`,
        { stdio: "pipe" },
      );
    } catch {
      /* ignore */
    }
  }
}

writeFileSync(path.join(OUT, "prof-staff-invite-path-smoke.json"), JSON.stringify(report, null, 2));
process.exit(report.exitCode);
