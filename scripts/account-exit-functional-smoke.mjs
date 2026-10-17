#!/usr/bin/env node
/**
 * ACCOUNT-EXIT-01.2: dual-session A/B (ordinary PRO JWTs) on disposable stack.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAV = path.resolve(ROOT, "../remcard-navigator");
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || "/tmp/admin-test-local-stack";
const ART = path.join(ROOT, "artifacts/remcard-account-exit");
function mintToken(env, userId, provider) {
  const r = spawnSync(
    "pnpm",
    ["exec", "tsx", "scripts/mint-pro-session-token.ts", userId, provider],
    { cwd: NAV, env: { ...process.env, ...env }, encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || "mint token failed");
  return r.stdout.trim();
}

function loadEnv() {
  const env = { ...process.env };
  for (const line of readFileSync(path.join(RUN_DIR, "runtime.env"), "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

async function fetchCsrf(platformOrigin) {
  const res = await fetch(`${platformOrigin}/api/csrf`, { method: "GET" });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/remcard-csrf=([^;]+)/);
  return match?.[1] ?? null;
}

async function bffMe(platformOrigin, cookieJar) {
  const res = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { cookie: cookieJar, Origin: platformOrigin },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, userId: body?.user?.id ?? null, hasUser: Boolean(body?.user?.id) };
}

async function bffLogout(platformOrigin, cookieJar, csrf, all = false) {
  const p = all ? "/api/auth/logout-all-sessions" : "/api/auth/logout";
  const headers = {
    cookie: cookieJar,
    Origin: platformOrigin,
    "Content-Type": "application/json",
  };
  if (csrf) {
    headers.cookie = `${cookieJar}; remcard-csrf=${csrf}`;
    headers["X-CSRF-Token"] = csrf;
  }
  const res = await fetch(`${platformOrigin}/api/remcard${p}`, {
    method: "POST",
    headers,
    body: "{}",
  });
  return { status: res.status, body: await res.text() };
}

async function directLogoutAll(backendOrigin, cookieOnly) {
  const res = await fetch(`${backendOrigin}/api/auth/logout-all-sessions`, {
    method: "POST",
    headers: { cookie: cookieOnly, "Content-Type": "application/json" },
    body: "{}",
  });
  return res.status;
}

async function adminLogin(page, platformOrigin, creds) {
  await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator('input[autocomplete="username"]').fill(creds.login);
  await page.locator('input[autocomplete="current-password"]').fill(creds.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 120_000 });
}

async function createAndEnterAgent(page, platformOrigin, name) {
  const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Создать" }) });
  await panel.getByLabel("Тип").selectOption("agent");
  await panel.getByLabel("Имя").fill(name);
  await panel.getByRole("button", { name: "Создать" }).click();
  await page.locator("li").filter({ hasText: name }).waitFor({ timeout: 30_000 });
  const card = page.locator("li").filter({ hasText: name });
  const enterWait = page.waitForResponse(
    (r) => r.url().includes("/test-users/") && r.url().includes("/enter") && r.status() === 200,
    { timeout: 45_000 },
  );
  await card.getByRole("button", { name: "Открыть ЛК" }).click();
  await enterWait;
  await page.waitForLoadState("networkidle");
}

async function ensureAgentReady(page, platformOrigin, cookieHeader) {
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/enable-activity`, {
    method: "POST",
    headers: { Cookie: cookieHeader, Origin: platformOrigin, "content-type": "application/json" },
    body: JSON.stringify({ activity: "AGENT" }),
  });
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/finish`, {
    method: "POST",
    headers: { Cookie: cookieHeader, Origin: platformOrigin, "content-type": "application/json" },
    body: JSON.stringify({}),
  });
}

function cookieJarFromToken(token) {
  return `remcard-token=${token}`;
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const env = loadEnv();
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, "meta.json"), "utf8"));
  const platformOrigin = meta.platformOrigin;
  const backendOrigin = meta.backendOrigin ?? "http://127.0.0.1:3041";
  const creds = {
    login: process.env.ADMIN_TEST_LOGIN?.trim() || "e2e-admin@remcard.test",
    password: process.env.ADMIN_TEST_PASSWORD?.trim() || "E2E-Admin-Pass-12chars",
  };

  const report = {
    task: "ACCOUNT-EXIT-01.2",
    platformOrigin,
    backendOrigin,
    migration: {},
    abSessions: { mode: "ordinary-dual-jwt" },
    csrf: {},
    delegated: { status: "NOT_RUN", note: "Prof-test enter shares one delegation; use targeted tests for delegated A/B" },
    gitCapture: {
      platform: spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout?.trim(),
      navigator: spawnSync("git", ["rev-parse", "HEAD"], { cwd: NAV, encoding: "utf8" }).stdout?.trim(),
    },
    pass: false,
    blocker: null,
  };

  const migrationSql = readFileSync(
    path.join(NAV, "prisma/migrations/20261017120000_auth_session_revocation/migration.sql"),
    "utf8",
  );
  const migrate = spawnSync(
    "pnpm",
    ["exec", "prisma", "db", "execute", "--stdin", "--schema", "prisma/schema.prisma"],
    {
      cwd: NAV,
      env: { ...process.env, ...env, DATABASE_URL: env.DATABASE_URL },
      encoding: "utf8",
      input: migrationSql,
    },
  );
  report.migration.exitCode = migrate.status ?? 1;
  report.migration.note = "Idempotent AuthSessionRevocation DDL on disposable PG";
  if (migrate.status !== 0 && !/already exists/i.test(`${migrate.stderr}${migrate.stdout}`)) {
    report.blocker = "PG AuthSessionRevocation apply failed";
    report.migration.stderr = migrate.stderr?.slice(0, 400) ?? null;
    writeFileSync(path.join(ART, "FUNCTIONAL-SMOKE.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const csrf = await fetchCsrf(platformOrigin);
  if (!csrf) {
    report.blocker = "Could not prime platform CSRF cookie";
    writeFileSync(path.join(ART, "FUNCTIONAL-SMOKE.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const setup = await browser.newContext();
  const page = await setup.newPage();
  const agentName = `AE012 ${Date.now()}`;
  await adminLogin(page, platformOrigin, creds);
  await createAndEnterAgent(page, platformOrigin, agentName);
  const setupCookies = await setup.cookies();
  const sessionCookie = setupCookies.find((c) => c.name === "remcard-token")?.value;
  if (!sessionCookie) {
    report.blocker = "No remcard-token after test-user enter";
    await browser.close();
    writeFileSync(path.join(ART, "FUNCTIONAL-SMOKE.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }
  await ensureAgentReady(page, platformOrigin, cookieJarFromToken(sessionCookie));
  let meSeed = await bffMe(platformOrigin, cookieJarFromToken(sessionCookie));
  let userId = meSeed.userId;
  if (!userId) {
    const idMatch = await page
      .locator("li")
      .filter({ hasText: agentName })
      .getAttribute("data-user-id")
      .catch(() => null);
    if (idMatch) userId = idMatch;
  }
  if (!userId || userId.startsWith("e2e-admin")) {
    const listRes = await fetch(`${platformOrigin}/api/remcard/api/pro/admin/test-users`, {
      headers: { cookie: setupCookies.map((c) => `${c.name}=${c.value}`).join("; "), Origin: platformOrigin },
    });
    const listBody = await listRes.json().catch(() => null);
    const row = (listBody?.users ?? listBody ?? []).find?.((u) => u.displayName === agentName);
    userId = row?.id ?? userId;
  }
  if (!userId) {
    report.blocker = "Could not resolve PRO user id for dual JWT smoke";
    await browser.close();
    writeFileSync(path.join(ART, "FUNCTIONAL-SMOKE.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  spawnSync("pnpm", ["exec", "tsx", "scripts/account-exit-smoke-prepare-user.ts", userId], {
    cwd: NAV,
    env: { ...process.env, ...env, DATABASE_URL: env.DATABASE_URL },
    encoding: "utf8",
  });

  const tokenA = mintToken(env, userId, "smoke-device-a");
  const tokenB = mintToken(env, userId, "smoke-device-b");
  const cookieA = cookieJarFromToken(tokenA);
  const cookieB = cookieJarFromToken(tokenB);

  report.abSessions.userId = userId;
  report.abSessions.meBefore = {
    a: await bffMe(platformOrigin, cookieA),
    b: await bffMe(platformOrigin, cookieB),
  };

  if (!report.abSessions.meBefore.a.hasUser || !report.abSessions.meBefore.b.hasUser) {
    report.blocker = "Dual JWT meBefore requires live backend with seeded user";
    await browser.close();
    writeFileSync(path.join(ART, "FUNCTIONAL-SMOKE.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.csrf.directLogoutAllWithoutCsrf = await directLogoutAll(backendOrigin, cookieA);
  report.csrf.bffLogoutAllWithoutCsrf = (await bffLogout(platformOrigin, cookieA, null, true)).status;
  report.csrf.directLogoutAllWithCsrfNoOrigin = await directLogoutAll(
    backendOrigin,
    `${cookieA}; remcard-csrf=${csrf}`,
  );

  const logoutCurrent = await bffLogout(platformOrigin, cookieA, csrf, false);
  report.abSessions.logoutCurrentStatus = logoutCurrent.status;

  report.abSessions.meAfterCurrent = {
    a: await bffMe(platformOrigin, cookieA),
    b: await bffMe(platformOrigin, cookieB),
  };

  const tokenA2 = mintToken(env, userId, "smoke-device-a-relogin");
  report.abSessions.meReloginA = await bffMe(platformOrigin, cookieJarFromToken(tokenA2));

  const logoutAll = await bffLogout(platformOrigin, cookieB, csrf, true);
  report.abSessions.logoutAllStatus = logoutAll.status;

  report.abSessions.meAfterAll = {
    a: await bffMe(platformOrigin, cookieJarFromToken(tokenA2)),
    b: await bffMe(platformOrigin, cookieB),
  };

  report.pass =
    report.csrf.directLogoutAllWithoutCsrf === 403 &&
    report.csrf.bffLogoutAllWithoutCsrf === 403 &&
    report.csrf.directLogoutAllWithCsrfNoOrigin === 403 &&
    report.abSessions.logoutCurrentStatus === 200 &&
    report.abSessions.meAfterCurrent.a.hasUser === false &&
    report.abSessions.meAfterCurrent.b.hasUser === true &&
    report.abSessions.logoutAllStatus === 200 &&
    report.abSessions.meAfterAll.a.hasUser === false &&
    report.abSessions.meAfterAll.b.hasUser === false;

  await browser.close();
  writeFileSync(path.join(ART, "FUNCTIONAL-SMOKE.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
