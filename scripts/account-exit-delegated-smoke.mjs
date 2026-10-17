#!/usr/bin/env node
/**
 * ACCOUNT-EXIT-01.3: delegated prof-test A/B via independent browser contexts + /enter.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { waitForTestSession } from "./lib/r03-stack-bootstrap.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAV = path.resolve(ROOT, "../remcard-navigator");
const ART = path.join(ROOT, "artifacts/remcard-account-exit");
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || "/tmp/admin-test-local-stack";

function loadEnv() {
  const env = { ...process.env };
  for (const line of readFileSync(path.join(RUN_DIR, "runtime.env"), "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

function delegationIdFromJwt(token) {
  const part = token.split(".")[1];
  if (!part) return null;
  const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const payload = JSON.parse(json);
  return payload?.profTest?.delegationId ?? null;
}

function cookieHeaderFromContext(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
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
  return {
    status: res.status,
    hasUser: Boolean(body?.user?.id),
    isProfTestUser: Boolean(body?.user?.isProfTestUser),
    profTestActive: Boolean(body?.profTestSession?.active),
  };
}

async function adminLogin(page, platformOrigin, creds) {
  await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator('input[autocomplete="username"]').fill(creds.login);
  await page.locator('input[autocomplete="current-password"]').fill(creds.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 120_000 });
}

async function createAgent(page, name) {
  const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Создать" }) });
  await panel.getByLabel("Тип").selectOption("agent");
  await panel.getByLabel("Имя").fill(name);
  await panel.getByRole("button", { name: "Создать" }).click();
  await page.locator("li").filter({ hasText: name }).waitFor({ timeout: 30_000 });
  return page.locator("li").filter({ hasText: name });
}

async function enterAgentCard(page, platformOrigin, card) {
  const enterWait = page.waitForResponse(
    (r) => r.url().includes("/test-users/") && r.url().includes("/enter") && r.status() === 200,
    { timeout: 45_000 },
  );
  await card.getByRole("button", { name: "Открыть ЛК" }).click();
  await enterWait;
  await page.waitForLoadState("networkidle");
}

async function prepareDelegatedCabinet(page, platformOrigin, context) {
  const session = await waitForTestSession(context, platformOrigin, 60_000);
  if (!session) throw new Error("test_session_not_active_after_enter");
  await page.goto(`${platformOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/enable-activity`, {
    method: "POST",
    headers: {
      Cookie: session.cookieHeader,
      Origin: platformOrigin,
      "content-type": "application/json",
    },
    body: JSON.stringify({ activity: "AGENT" }),
  });
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/finish`, {
    method: "POST",
    headers: {
      Cookie: session.cookieHeader,
      Origin: platformOrigin,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });
  await page.goto(`${platformOrigin}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("account-menu-trigger").waitFor({ state: "visible", timeout: 60_000 });
}

async function primeCsrfOnPage(page) {
  await page.evaluate(async () => {
    await fetch("/api/csrf", { credentials: "include" });
  });
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const env = loadEnv();
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, "meta.json"), "utf8"));
  const platformOrigin = meta.platformOrigin;
  const creds = {
    login: process.env.ADMIN_TEST_LOGIN?.trim() || "e2e-admin@remcard.test",
    password: process.env.ADMIN_TEST_PASSWORD?.trim() || "E2E-Admin-Pass-12chars",
  };

  const report = {
    task: "ACCOUNT-EXIT-01.3-delegated",
    platformOrigin,
    testUserId: null,
    delegationIds: { a: null, b: null, distinct: false },
    steps: {},
    pass: false,
    blocker: null,
  };
  smokeReport = report;

  const browser = await chromium.launch({ headless: true });
  const setup = await browser.newContext();
  const setupPage = await setup.newPage();
  const agentName = `AE013del ${Date.now()}`;
  await adminLogin(setupPage, platformOrigin, creds);
  const card = await createAgent(setupPage, agentName);
  let userId = await card.getAttribute("data-user-id");
  if (!userId) {
    const setupCookies = await setup.cookies();
    const adminJar = cookieHeaderFromContext(setupCookies);
    const listRes = await fetch(`${platformOrigin}/api/remcard/api/pro/admin/test-users`, {
      headers: { cookie: adminJar, Origin: platformOrigin },
    });
    const listBody = await listRes.json().catch(() => null);
    const row = (listBody?.users ?? listBody?.items ?? []).find?.((u) => u.displayName === agentName);
    userId = row?.id ?? null;
  }
  report.testUserId = userId;
  if (!userId) {
    report.blocker = "missing_test_user_id";
    await browser.close();
    writeFileSync(path.join(ART, "DELEGATED-SMOKE.json"), JSON.stringify(report, null, 2));
    process.exit(1);
  }
  spawnSync("pnpm", ["exec", "tsx", "scripts/account-exit-seed-test-user-consents.ts", userId], {
    cwd: NAV,
    env: { ...process.env, ...env, DATABASE_URL: env.DATABASE_URL },
    encoding: "utf8",
  });
  await setup.close();

  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await adminLogin(pageA, platformOrigin, creds);
  await pageA.locator("li").filter({ hasText: agentName }).waitFor({ timeout: 30_000 });
  await enterAgentCard(pageA, platformOrigin, pageA.locator("li").filter({ hasText: agentName }));
  await prepareDelegatedCabinet(pageA, platformOrigin, ctxA);
  const cookiesA = await ctxA.cookies();
  const tokenA = cookiesA.find((c) => c.name === "remcard-token")?.value;
  const delA = tokenA ? delegationIdFromJwt(tokenA) : null;
  report.delegationIds.a = delA;

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await adminLogin(pageB, platformOrigin, creds);
  await pageB.locator("li").filter({ hasText: agentName }).waitFor({ timeout: 30_000 });
  await enterAgentCard(pageB, platformOrigin, pageB.locator("li").filter({ hasText: agentName }));
  await prepareDelegatedCabinet(pageB, platformOrigin, ctxB);
  const cookiesB = await ctxB.cookies();
  const tokenB = cookiesB.find((c) => c.name === "remcard-token")?.value;
  const delB = tokenB ? delegationIdFromJwt(tokenB) : null;
  report.delegationIds.b = delB;
  report.delegationIds.distinct = Boolean(delA && delB && delA !== delB);

  const jarA = cookieHeaderFromContext(cookiesA.filter((c) => c.name === "remcard-token" || c.name === "remcard-csrf"));
  const jarB = cookieHeaderFromContext(cookiesB.filter((c) => c.name === "remcard-token" || c.name === "remcard-csrf"));

  report.steps.meBefore = { a: await bffMe(platformOrigin, jarA), b: await bffMe(platformOrigin, jarB) };

  await primeCsrfOnPage(pageA);
  await pageA.getByTestId("account-menu-trigger").click();
  await pageA.getByTestId("account-logout").click();
  await pageA.waitForURL(/\/account\/signed-out/, { timeout: 60_000 });

  report.steps.meAfterLogoutCurrentA = { a: await bffMe(platformOrigin, jarA), b: await bffMe(platformOrigin, jarB) };

  await adminLogin(pageA, platformOrigin, creds);
  await pageA.locator("li").filter({ hasText: agentName }).waitFor({ timeout: 30_000 });
  await enterAgentCard(pageA, platformOrigin, pageA.locator("li").filter({ hasText: agentName }));
  await prepareDelegatedCabinet(pageA, platformOrigin, ctxA);
  const cookiesA2b = await ctxA.cookies();
  const jarA2live = cookieHeaderFromContext(
    cookiesA2b.filter((c) => c.name === "remcard-token" || c.name === "remcard-csrf"),
  );
  report.steps.meAfterReenterA = {
    a: await bffMe(platformOrigin, jarA2live),
    b: await bffMe(platformOrigin, jarB),
  };

  await primeCsrfOnPage(pageA);
  await pageA.getByTestId("account-menu-trigger").waitFor({ state: "visible", timeout: 60_000 });
  let logoutAllPosted = false;
  pageA.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("logout-all-sessions")) logoutAllPosted = true;
  });
  await pageA.getByTestId("account-menu-trigger").click();
  await pageA.getByTestId("account-session-menu").waitFor({ state: "visible", timeout: 15_000 });
  await pageA.getByTestId("account-logout-all").click();
  await pageA.getByTestId("logout-all-cancel").click();
  report.steps.cancelAllUi = {
    logoutAllPosted,
    me: { a: await bffMe(platformOrigin, jarA2live), b: await bffMe(platformOrigin, jarB) },
  };

  await pageA.getByTestId("account-menu-trigger").click();
  await pageA.getByTestId("account-session-menu").waitFor({ state: "visible", timeout: 15_000 });
  await pageA.getByTestId("account-logout-all").click();
  await pageA.getByTestId("logout-all-confirm").click();
  await pageA.waitForURL(/\/account\/signed-out\?scope=all/, { timeout: 60_000 });
  report.steps.meAfterConfirmAll = {
    a: await bffMe(platformOrigin, jarA2live),
    b: await bffMe(platformOrigin, jarB),
  };

  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminLogin(adminPage, platformOrigin, creds);
  const adminCookies = await adminCtx.cookies();
  const adminJar = cookieHeaderFromContext(adminCookies.filter((c) => c.name === "remcard-token"));
  report.steps.adminMeAfterAll = await bffMe(platformOrigin, adminJar);

  const otherName = `AE013other ${Date.now()}`;
  await createAgent(adminPage, otherName);
  const otherCard = adminPage.locator("li").filter({ hasText: otherName });
  let otherUserId = await otherCard.getAttribute("data-user-id");
  if (!otherUserId) {
    const listRes = await fetch(`${platformOrigin}/api/remcard/api/pro/admin/test-users`, {
      headers: { cookie: adminJar, Origin: platformOrigin },
    });
    const listBody = await listRes.json().catch(() => null);
    otherUserId = (listBody?.users ?? listBody?.items ?? []).find?.((u) => u.displayName === otherName)?.id ?? null;
  }
  if (otherUserId) {
    spawnSync("pnpm", ["exec", "tsx", "scripts/account-exit-seed-test-user-consents.ts", otherUserId], {
      cwd: NAV,
      env: { ...process.env, ...env, DATABASE_URL: env.DATABASE_URL },
      encoding: "utf8",
    });
  }
  await enterAgentCard(adminPage, platformOrigin, otherCard);
  const otherCookies = await adminCtx.cookies();
  const otherJar = cookieHeaderFromContext(
    otherCookies.filter((c) => c.name === "remcard-token" || c.name === "remcard-csrf"),
  );
  report.steps.otherUserMe = await bffMe(platformOrigin, otherJar);

  report.pass =
    report.delegationIds.distinct &&
    report.steps.meBefore.a.hasUser &&
    report.steps.meBefore.b.hasUser &&
    report.steps.meAfterLogoutCurrentA.a.hasUser === false &&
    report.steps.meAfterLogoutCurrentA.b.hasUser === true &&
    report.steps.meAfterReenterA.a.hasUser &&
    report.steps.meAfterReenterA.b.hasUser &&
    report.steps.cancelAllUi.logoutAllPosted === false &&
    report.steps.cancelAllUi.me.a.hasUser &&
    report.steps.cancelAllUi.me.b.hasUser &&
    report.steps.meAfterConfirmAll.a.hasUser === false &&
    report.steps.meAfterConfirmAll.b.hasUser === false &&
    report.steps.adminMeAfterAll.hasUser === true &&
    report.steps.otherUserMe.hasUser === true;

  await browser.close();
  writeFileSync(path.join(ART, "DELEGATED-SMOKE.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

let smokeReport = null;
main().catch((err) => {
  console.error(err);
  const payload = smokeReport ?? { task: "ACCOUNT-EXIT-01.3-delegated", steps: {} };
  payload.pass = false;
  payload.blocker = err instanceof Error ? err.message : String(err);
  writeFileSync(path.join(ART, "DELEGATED-SMOKE.json"), JSON.stringify(payload, null, 2));
  process.exit(1);
});
