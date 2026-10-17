#!/usr/bin/env node
/**
 * ACCOUNT-EXIT visual captures + mobile menu bounds + live signed-out screenshot.
 * Usage: BASE_URL=http://127.0.0.1:3040 LIVE_SIGNED_OUT=1 node scripts/account-exit-browser-acceptance.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { waitForTestSession } from "./lib/r03-stack-bootstrap.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTIFACTS = path.join(ROOT, "artifacts/remcard-account-exit");
const BASE_URL = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const FIXTURE = `${BASE_URL}/dev-fixtures/account-session`;
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || "/tmp/admin-test-local-stack";
const NAV_ROOT = path.resolve(ROOT, "../remcard-navigator");
const LIVE_SIGNED_OUT = process.env.LIVE_SIGNED_OUT === "1";

const MENU_VIEWPORTS = [
  { name: "375-light", width: 375, height: 812, theme: "light" },
  { name: "375-dark", width: 375, height: 812, theme: "dark" },
  { name: "320-light", width: 320, height: 640, theme: "light" },
  { name: "320-dark", width: 320, height: 640, theme: "dark" },
];

async function gitHead(cwd) {
  return spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).stdout?.trim() ?? null;
}

async function setTheme(page, theme) {
  await page.evaluate((value) => {
    document.documentElement.dataset.theme = value;
    localStorage.setItem("remcard-theme", value);
  }, theme);
}

async function measureMenuAndPage(page) {
  return page.evaluate(() => {
    const menu = document.querySelector('[data-testid="account-session-menu"]');
    const menuRect = menu?.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      menu: menuRect
        ? { left: menuRect.left, right: menuRect.right, top: menuRect.top, bottom: menuRect.bottom }
        : null,
    };
  });
}

function menuBoundsOk(bounds) {
  if (!bounds?.menu) return false;
  const { left, right } = bounds.menu;
  return (
    left >= 0 &&
    right <= bounds.innerWidth + 0.5 &&
    bounds.scrollWidth <= bounds.clientWidth + 0.5
  );
}

async function captureMenu(page, label) {
  await page.getByTestId("account-menu-trigger").click();
  await page.getByTestId("account-session-menu").waitFor({ state: "visible", timeout: 10_000 });
  const bounds = await measureMenuAndPage(page);
  await page.screenshot({ path: path.join(ARTIFACTS, `${label}-menu.png`) });
  await page.getByTestId("account-menu-trigger").click();
  return bounds;
}

async function captureLiveSignedOut320(browser, platformOrigin) {
  let runtimeEnv = {};
  try {
    const raw = await readFile(path.join(RUN_DIR, "runtime.env"), "utf8");
    for (const line of raw.split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i > 0) runtimeEnv[line.slice(0, i)] = line.slice(i + 1);
    }
  } catch {
    return { skipped: true, reason: "no_runtime_env" };
  }

  const creds = {
    login: process.env.ADMIN_TEST_LOGIN?.trim() || "e2e-admin@remcard.test",
    password: process.env.ADMIN_TEST_PASSWORD?.trim() || "E2E-Admin-Pass-12chars",
  };

  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const page = await ctx.newPage();
  await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator('input[autocomplete="username"]').fill(creds.login);
  await page.locator('input[autocomplete="current-password"]').fill(creds.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 120_000 });

  const agentName = `AE013so ${Date.now()}`;
  const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Создать" }) });
  await panel.getByLabel("Тип").selectOption("agent");
  await panel.getByLabel("Имя").fill(agentName);
  await panel.getByRole("button", { name: "Создать" }).click();
  const card = page.locator("li").filter({ hasText: agentName });
  await card.waitFor({ timeout: 30_000 });
  let userId = await card.getAttribute("data-user-id");
  if (!userId) {
    const adminJar = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
    const listRes = await fetch(`${platformOrigin}/api/remcard/api/pro/admin/test-users`, {
      headers: { cookie: adminJar, Origin: platformOrigin },
    });
    const listBody = await listRes.json().catch(() => null);
    const row = (listBody?.users ?? listBody?.items ?? []).find?.((u) => u.displayName === agentName);
    userId = row?.id ?? null;
  }
  if (userId) {
    let runtimeEnv = {};
    try {
      for (const line of readFileSync(path.join(RUN_DIR, "runtime.env"), "utf8").split("\n")) {
        if (!line || line.startsWith("#")) continue;
        const i = line.indexOf("=");
        if (i > 0) runtimeEnv[line.slice(0, i)] = line.slice(i + 1);
      }
    } catch {
      runtimeEnv = {};
    }
    spawnSync("pnpm", ["exec", "tsx", "scripts/account-exit-seed-test-user-consents.ts", userId], {
      cwd: NAV_ROOT,
      env: { ...process.env, ...runtimeEnv, DATABASE_URL: runtimeEnv.DATABASE_URL },
      encoding: "utf8",
    });
  }
  const enterWait = page.waitForResponse(
    (r) => r.url().includes("/enter") && r.status() === 200,
    { timeout: 45_000 },
  );
  await page.locator("li").filter({ hasText: agentName }).getByRole("button", { name: "Открыть ЛК" }).click();
  await enterWait;
  await page.waitForLoadState("networkidle");
  const session = await waitForTestSession(ctx, platformOrigin, 60_000);
  if (!session) return { skipped: true, reason: "test_session_not_active" };
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
  await page.evaluate(async () => {
    await fetch("/api/csrf", { credentials: "include" });
  });
  await setTheme(page, "light");
  await page.getByTestId("account-menu-trigger").click();
  await page.getByTestId("account-logout").click();
  await page.waitForURL(/\/account\/signed-out/, { timeout: 60_000 });
  await page.getByTestId("signed-out").waitFor({ state: "visible", timeout: 30_000 });
  const finalUrl = page.url();
  const shotPath = path.join(ARTIFACTS, "320-light-signed-out.png");
  await page.screenshot({ path: shotPath, fullPage: true });
  await ctx.close();
  return { skipped: false, capture: "320-light-signed-out.png", url: finalUrl };
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch();
  const results = {
    task: "ACCOUNT-EXIT-01.3-visual",
    baseUrl: BASE_URL,
    fixture: FIXTURE,
    codeUnderTest: {
      platform: await gitHead(ROOT),
      navigator: await gitHead(path.resolve(ROOT, "../remcard-navigator")),
    },
    captures: [],
    menuBounds: {},
    signedOutLive: null,
    exitCode: 0,
  };

  try {
    for (const vp of MENU_VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.goto(FIXTURE, { waitUntil: "networkidle", timeout: 60_000 });
      await setTheme(page, vp.theme);
      await page.waitForTimeout(200);
      const bounds = await captureMenu(page, vp.name);
      results.menuBounds[vp.name] = { bounds, ok: menuBoundsOk(bounds) };
      results.captures.push(`${vp.name}-menu.png`);
      if (!results.menuBounds[vp.name].ok) results.exitCode = 1;
      await context.close();
    }

    if (LIVE_SIGNED_OUT) {
      results.signedOutLive = await captureLiveSignedOut320(browser, BASE_URL);
      if (results.signedOutLive.capture) results.captures.push(results.signedOutLive.capture);
      if (results.signedOutLive.skipped) results.exitCode = 1;
    }
  } catch (error) {
    results.exitCode = 1;
    results.error = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }

  await writeFile(path.join(ARTIFACTS, "VISUAL-CAPTURE.json"), `${JSON.stringify(results, null, 2)}\n`);
  process.exit(results.exitCode);
}

main();
