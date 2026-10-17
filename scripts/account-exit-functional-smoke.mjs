#!/usr/bin/env node
/**
 * ACCOUNT-EXIT-01: dual-session A/B + CSRF negative on disposable local stack.
 * Requires: npm run build (both repos), admin-test-local-stack, migration applied on PG.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAV = path.resolve(ROOT, "../remcard-navigator");
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || "/tmp/admin-test-local-stack";
const ART = path.join(ROOT, "artifacts/remcard-account-exit");
const requireNav = createRequire(path.join(NAV, "package.json"));

function loadEnv() {
  const env = { ...process.env };
  for (const line of readFileSync(path.join(RUN_DIR, "runtime.env"), "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

async function bffMe(platformOrigin, cookie) {
  const res = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { cookie, Origin: platformOrigin },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function bffLogout(platformOrigin, cookie, csrf, all = false) {
  const p = all ? "/api/auth/logout-all-sessions" : "/api/auth/logout";
  const res = await fetch(`${platformOrigin}/api/remcard${p}`, {
    method: "POST",
    headers: {
      cookie: csrf ? `${cookie}; remcard-csrf=${csrf}` : cookie,
      Origin: platformOrigin,
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    body: "{}",
  });
  return { status: res.status, body: await res.text() };
}

async function directLogout(backendOrigin, cookie, csrf, all = false) {
  const p = all ? "/api/auth/logout-all-sessions" : "/api/auth/logout";
  const res = await fetch(`${backendOrigin}${p}`, {
    method: "POST",
    headers: {
      cookie: csrf ? `${cookie}; remcard-csrf=${csrf}` : cookie,
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    body: "{}",
  });
  return res.status;
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const env = loadEnv();
  process.env.JWT_SECRET = env.JWT_SECRET;
  const { createToken } = requireNav("./src/lib/jwt.ts");
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, "meta.json"), "utf8"));
  const platformOrigin = meta.platformOrigin;
  const backendOrigin = meta.backendOrigin ?? env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3041";

  const userId = "account-exit-smoke-user";
  const tokenA = createToken(userId, 0, { provider: "device-a" });
  const tokenB = createToken(userId, 0, { provider: "device-b" });
  const cookieA = `remcard-token=${tokenA}`;
  const cookieB = `remcard-token=${tokenB}`;

  const report = {
    task: "ACCOUNT-EXIT-01.1",
    platformOrigin,
    backendOrigin,
    abSessions: {},
    csrf: {},
    gitCapture: {
      platform: spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout?.trim(),
      navigator: spawnSync("git", ["rev-parse", "HEAD"], { cwd: NAV, encoding: "utf8" }).stdout?.trim(),
      dirtyPlatform: spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).stdout?.trim() || null,
      dirtyNavigator: spawnSync("git", ["status", "--porcelain"], { cwd: NAV, encoding: "utf8" }).stdout?.trim() || null,
    },
    pass: false,
  };

  const csrfRes = await fetch(`${platformOrigin}/api/csrf`, { credentials: "include" });
  const csrfSet = csrfRes.headers.get("set-cookie") ?? "";
  const csrf = csrfSet.match(/remcard-csrf=([^;]+)/)?.[1] ?? "smoke-csrf";

  report.csrf.directLogoutAllWithoutCsrf = await directLogout(backendOrigin, cookieA, null, true);
  report.csrf.bffLogoutAllWithoutCsrf = (
    await bffLogout(platformOrigin, cookieA, null, true)
  ).status;

  const meBeforeA = await bffMe(platformOrigin, cookieA);
  const meBeforeB = await bffMe(platformOrigin, cookieB);
  report.abSessions.meBefore = { a: Boolean(meBeforeA.body?.user), b: Boolean(meBeforeB.body?.user) };

  const logoutCurrent = await bffLogout(platformOrigin, cookieA, csrf, false);
  report.abSessions.logoutCurrentStatus = logoutCurrent.status;

  const meAfterA = await bffMe(platformOrigin, cookieA);
  const meAfterB = await bffMe(platformOrigin, cookieB);
  report.abSessions.meAfterCurrent = {
    a: Boolean(meAfterA.body?.user),
    b: Boolean(meAfterB.body?.user),
  };

  const tokenA2 = createToken(userId, 0, { provider: "device-a-relogin" });
  const cookieA2 = `remcard-token=${tokenA2}`;
  report.abSessions.meReloginA = Boolean((await bffMe(platformOrigin, cookieA2)).body?.user);

  const logoutAllCancel = await bffLogout(platformOrigin, `${cookieA2}; remcard-csrf=${csrf}`, csrf, true);
  report.abSessions.logoutAllStatus = logoutAllCancel.status;

  const meAfterAllA = await bffMe(platformOrigin, cookieA2);
  const meAfterAllB = await bffMe(platformOrigin, cookieB);
  report.abSessions.meAfterAll = {
    a: Boolean(meAfterAllA.body?.user),
    b: Boolean(meAfterAllB.body?.user),
  };

  report.pass =
    report.csrf.directLogoutAllWithoutCsrf === 403 &&
    report.abSessions.logoutCurrentStatus === 200 &&
    report.abSessions.meAfterCurrent.a === false &&
    report.abSessions.meAfterCurrent.b === true &&
    report.abSessions.logoutAllStatus === 200 &&
    report.abSessions.meAfterAll.a === false &&
    report.abSessions.meAfterAll.b === false;

  writeFileSync(path.join(ART, "FUNCTIONAL-SMOKE.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
