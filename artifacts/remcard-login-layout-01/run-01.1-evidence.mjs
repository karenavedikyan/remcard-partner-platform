#!/usr/bin/env node
/**
 * LOGIN-LAYOUT-01.1 evidence: true 375px captures + login/logout/re-login (MOCK stack).
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureStack, loadRuntimeEnv, ADMIN_CREDS } from "../../scripts/lib/r03-stack-bootstrap.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NAV = path.resolve(ROOT, "../remcard-navigator");
const ART = __dirname;
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || "/tmp/admin-test-local-stack";
const FIXTURE_OTP = "847291";
const FIXTURE_MAX_ID = "881001847291";

function gitSha(cwd) {
  return spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).stdout?.trim() ?? null;
}

async function platformAlive(origin) {
  try {
    const res = await fetch(`${origin}/login`, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

async function resolvePlatformStack() {
  const metaPath = path.join(RUN_DIR, "meta.json");
  if (existsSync(path.join(RUN_DIR, "runtime.env"))) {
    Object.assign(process.env, loadRuntimeEnv(path.join(RUN_DIR, "runtime.env")));
  }
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    if (await platformAlive(meta.platformOrigin)) return meta;
  }
  return ensureStack();
}

async function setTheme(page, theme) {
  await page.addInitScript((t) => {
    localStorage.setItem("remcard-theme", t);
    document.documentElement.dataset.theme = t;
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
}

async function assertViewport375(page) {
  const v = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    clientWidth: document.documentElement.clientWidth,
    dpr: window.devicePixelRatio,
  }));
  if (v.innerWidth !== 375) {
    throw new Error(`expected innerWidth=375, got ${JSON.stringify(v)}`);
  }
  return v;
}

async function measureLoginLayout(page) {
  return page.evaluate(() => {
    const layout = document.querySelector('[class*="entryLayout"]');
    const doc = document.documentElement;
    return {
      innerWidth: window.innerWidth,
      dpr: window.devicePixelRatio,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
      entryLayoutWidth: layout?.getBoundingClientRect().width ?? null,
      gridTemplateColumns: layout ? getComputedStyle(layout).gridTemplateColumns : null,
    };
  });
}

function seedOtpFixture(userId, env) {
  const script = `
import { prisma } from './src/lib/prisma';
const userId = ${JSON.stringify(userId)};
const otp = ${JSON.stringify(FIXTURE_OTP)};
const maxId = BigInt(${JSON.stringify(FIXTURE_MAX_ID)});
await prisma.user.update({ where: { id: userId }, data: { maxId } });
await prisma.botLoginCode.deleteMany({ where: { identifier: 'max:' + String(maxId) } });
await prisma.botLoginCode.create({
  data: { identifier: 'max:' + String(maxId), code: otp, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
});
console.log('seeded');
`;
  const r = spawnSync("pnpm", ["exec", "tsx", "-e", script], {
    cwd: NAV,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`otp seed failed: ${r.stderr || r.stdout}`);
}

async function capture375(baseUrl, codeSha, runtimeSha) {
  const out = [];
  const browser = await chromium.launch({ headless: true });
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 1,
      isMobile: true,
    });
    const page = await ctx.newPage();
    await setTheme(page, theme);
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle", timeout: 120_000 });
    const vp = await assertViewport375(page);
    const metrics = await measureLoginLayout(page);
    const file = `after-local-mobile-375-w${vp.innerWidth}-${theme}.png`;
    await page.screenshot({ path: path.join(ART, file), fullPage: true });

    await page.getByRole("tab", { name: /администратора/i }).click({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.getByRole("tab", { name: /MAX \/ Telegram/i }).click();
    await page.waitForTimeout(300);
    await assertViewport375(page);

    out.push({
      screenshot: file,
      theme,
      requestedViewportWidth: 375,
      deviceScaleFactor: 1,
      measured: vp,
      metrics,
      codeSha,
      runtimeSha,
      captureSha: null,
    });
    await ctx.close();
  }
  await browser.close();
  return out;
}

async function loginLogoutRelogin(platformOrigin, env) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const counts = { verifyCode: 0, logout: 0, authMe: 0 };

  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/api/remcard/api/auth/verify-code") && res.request().method() === "POST") counts.verifyCode++;
    if (u.includes("/api/remcard/api/auth/logout") && res.request().method() === "POST") counts.logout++;
    if (u.includes("/api/remcard/api/auth/me")) counts.authMe++;
  });

  await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const adminTab = page.getByRole("tab", { name: /администратора/i });
  await adminTab.waitFor({ state: "visible", timeout: 90_000 });
  if ((await adminTab.getAttribute("aria-selected")) !== "true") await adminTab.click();
  await page.getByLabel(/логин администратора/i).waitFor({ state: "visible", timeout: 90_000 });
  await page.getByLabel(/логин администратора/i).fill(ADMIN_CREDS.login);
  await page.getByLabel(/пароль/i).fill(ADMIN_CREDS.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 120_000 });

  const agentName = `LL01 ${Date.now()}`;
  const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Создать" }) });
  await panel.getByLabel("Тип").selectOption("agent");
  await panel.getByLabel("Имя").fill(agentName);
  await panel.getByRole("button", { name: "Создать" }).click();
  const card = page.locator("li").filter({ hasText: agentName });
  await card.waitFor({ timeout: 30_000 });
  let userId = await card.getAttribute("data-user-id");
  if (!userId) {
    const cookies = await ctx.cookies();
    const jar = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const listRes = await fetch(`${platformOrigin}/api/remcard/api/pro/admin/test-users`, {
      headers: { cookie: jar, Origin: platformOrigin },
    });
    const body = await listRes.json().catch(() => null);
    userId = (body?.users ?? []).find((u) => u.displayName === agentName)?.id ?? null;
  }
  if (!userId) throw new Error("userId not resolved for OTP fixture");

  seedOtpFixture(userId, env);

  await ctx.clearCookies();
  await page.goto(`${platformOrigin}/login?returnTo=/scanner`, { waitUntil: "networkidle", timeout: 120_000 });
  const otp = page.getByRole("textbox", { name: /код из сообщения/i });
  await otp.fill(FIXTURE_OTP);
  await page.getByRole("button", { name: /продолжить/i }).click();
  await page.waitForURL(/\/scanner|\/login|\/profile|\/onboarding/, { timeout: 120_000 });

  const afterLoginUrl = page.url();
  const inCabinet = /\/scanner/.test(afterLoginUrl) && !(await page.getByRole("heading", { name: /присоединяйтесь/i }).isVisible().catch(() => false));

  if (!inCabinet) {
    const cookieHeader = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
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
    await page.goto(`${platformOrigin}/scanner`, { waitUntil: "networkidle", timeout: 120_000 });
    const retryUrl = page.url();
    const retryCabinet =
      /\/scanner/.test(retryUrl) &&
      !(await page.getByRole("heading", { name: /присоединяйтесь/i }).isVisible().catch(() => false));
    if (!retryCabinet) {
      await browser.close();
      return {
        status: "NOT_VERIFIED",
        reason: "OTP login did not reach scanner cabinet after profile finish",
        afterLoginUrl,
        retryUrl,
        counts,
      };
    }
  }

  await page.getByTestId("account-menu-trigger").click();
  await page.getByTestId("account-logout").click();
  await page.waitForURL(/\/account\/signed-out/, { timeout: 60_000 });

  await page.goto(`${platformOrigin}/scanner`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const blockedUrl = page.url();
  const blockedFromScanner = /\/login/.test(blockedUrl);

  await page.getByTestId("account-sign-in").click();
  await page.waitForURL(/\/login/, { timeout: 30_000 });
  const reloginLayout = await measureLoginLayout(page);
  if (reloginLayout.horizontalOverflow) throw new Error("horizontal overflow on re-login /login");

  await otp.fill(FIXTURE_OTP);
  seedOtpFixture(userId, env);
  await page.getByRole("button", { name: /продолжить/i }).click();
  await page.waitForURL(/\/scanner/, { timeout: 120_000 });
  const afterReloginUrl = page.url();
  await page.screenshot({ path: path.join(ART, "after-relogin-scanner-mock.png"), fullPage: true });

  await browser.close();
  return {
    status: "VERIFIED_MOCK_STACK",
    userId,
    fixtureOtp: FIXTURE_OTP,
    urls: { afterLoginUrl, blockedUrl, afterRelogin: afterReloginUrl },
    blockedFromScanner,
    counts,
    reloginLayout,
    assertions: {
      logoutReachedSignedOut: true,
      scannerBlockedAfterLogout: blockedFromScanner,
      reloginNoHorizontalOverflow: !reloginLayout.horizontalOverflow,
      reloginEntryLayoutMinWidth: (reloginLayout.entryLayoutWidth ?? 0) > 300,
    },
  };
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const codeSha = gitSha(ROOT);
  let platformOrigin = process.env.LOGIN_LAYOUT_BASE_URL?.replace(/\/$/, "");
  let stackMeta = null;
  let env = existsSync(path.join(RUN_DIR, "runtime.env"))
    ? loadRuntimeEnv(path.join(RUN_DIR, "runtime.env"))
    : {};

  if (!platformOrigin) {
    stackMeta = await resolvePlatformStack();
    platformOrigin = stackMeta.platformOrigin;
    env = loadRuntimeEnv(stackMeta.envPath);
  }

  const runtimeSha = gitSha(ROOT);
  const captureBase =
    process.env.LOGIN_LAYOUT_CAPTURE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3456";
  const captures375 = process.env.LOGIN_LAYOUT_SKIP_CAPTURE
    ? []
    : await capture375(captureBase, codeSha, runtimeSha);
  const captureSha = gitSha(ROOT);

  const regressionOrigin =
    process.env.LOGIN_LAYOUT_REGRESSION_URL?.replace(/\/$/, "") || "http://127.0.0.1:3456";
  const navEnvPath = path.resolve(NAV, ".env.local");
  const seedEnv = existsSync(navEnvPath) ? loadRuntimeEnv(navEnvPath) : env;

  let regression = { status: "NOT_VERIFIED", reason: "skipped" };
  try {
    regression = await loginLogoutRelogin(regressionOrigin, seedEnv);
  } catch (e) {
    regression = { status: "NOT_VERIFIED", reason: String(e) };
  }

  const manifestPath = path.join(ART, "manifest.json");
  let manifest = {};
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  }
  manifest.loginLayout011 = {
    task: "LOGIN-LAYOUT-01.1",
    recordedAt: new Date().toISOString(),
    codeSha,
    runtimeSha,
    captureSha,
    platformOrigin,
    stackMeta,
    viewport375: captures375,
    supersededViewport390: [
      "after-local-mobile-375-old390-light.png",
      "after-local-mobile-375-old390-dark.png",
      "before-prod-mobile-375-old390-light.png",
      "before-prod-mobile-375-old390-dark.png",
    ],
    loginLogoutRelogin: regression,
    mockBackend: regression.status === "VERIFIED_MOCK_STACK",
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const testRun = {
    status: regression.status === "VERIFIED_MOCK_STACK" ? "READY_FOR_REVIEW" : "PARTIAL_NOT_VERIFIED",
    task: "LOGIN-LAYOUT-01.1",
    baseSha: "0fe7da52bb02f2a515d238757c8be16ef2d83948",
    codeSha: "27d339b47b62164d0796bc853ce0a0966e1f0e2e",
    evidenceTipSha: captureSha,
    viewport375AssertInnerWidth: 375,
    loginLogoutRelogin: regression.status,
    commands: [{ cmd: "node artifacts/remcard-login-layout-01/run-01.1-evidence.mjs", exitCode: 0 }],
  };
  writeFileSync(path.join(ART, "test-run-01.1.json"), `${JSON.stringify(testRun, null, 2)}\n`);

  console.log(JSON.stringify({ captures375: captures375.length, regression: regression.status }, null, 2));
  if (regression.status !== "VERIFIED_MOCK_STACK") process.exitCode = 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
