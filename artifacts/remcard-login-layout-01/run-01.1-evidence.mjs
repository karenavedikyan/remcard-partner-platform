#!/usr/bin/env node
/**
 * LOGIN-LAYOUT-01.2: disposable MOCK OTP regression + optional 375 capture (skip by default).
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureStack, loadRuntimeEnv } from "../../scripts/lib/r03-stack-bootstrap.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NAV = path.resolve(ROOT, "../remcard-navigator");
const ART = __dirname;
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || "/tmp/admin-test-local-stack";
const RUNTIME_ENV = path.join(RUN_DIR, "runtime.env");
const REQUIRED_DB = "remcard_admin_test_012";
const FIXTURE_OTP = "847291";
const SEED_TEMPLATE = path.join(ART, "seed-disposable-fixture.nav.ts");
const CLEANUP_TEMPLATE = path.join(ART, "cleanup-disposable-fixture.nav.ts");
const NAV_SEED_SCRIPT = path.join(NAV, "scripts/.login-layout-01-disposable-seed.ts");
const NAV_CLEANUP_SCRIPT = path.join(NAV, "scripts/.login-layout-01-disposable-cleanup.ts");

function materializeNavigatorFixtureScripts() {
  writeFileSync(NAV_SEED_SCRIPT, readFileSync(SEED_TEMPLATE));
  writeFileSync(NAV_CLEANUP_SCRIPT, readFileSync(CLEANUP_TEMPLATE));
}

const DESKTOP_LAYOUT_GATE = {
  entryLayoutMin: 1000,
  storyMin: 450,
  formMin: 350,
};

function gitSha(cwd) {
  return spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).stdout?.trim() ?? null;
}

function requireDisposableEnv() {
  if (!existsSync(RUNTIME_ENV)) {
    throw new Error(`Missing disposable runtime env: ${RUNTIME_ENV}`);
  }
  const env = loadRuntimeEnv(RUNTIME_ENV);
  const url = env.DATABASE_URL ?? "";
  if (!url.includes(REQUIRED_DB)) {
    throw new Error(`Refusing: DATABASE_URL must include ${REQUIRED_DB}`);
  }
  if (!env.JWT_SECRET?.trim()) {
    throw new Error("Refusing: JWT_SECRET missing in disposable runtime.env");
  }
  return env;
}

function withDevNodeEnv(env) {
  return { ...env, NODE_ENV: "development" };
}

async function platformAlive(origin) {
  try {
    const res = await fetch(`${origin}/login`, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

async function assertStackAuthHealthy(platformOrigin, navOrigin) {
  const navMe = await fetch(`${navOrigin}/api/auth/me`, { signal: AbortSignal.timeout(15_000) });
  if (navMe.status >= 500) {
    throw new Error(
      `navigator auth/me HTTP ${navMe.status} (set NODE_ENV=development for next dev; production NODE_ENV breaks middleware)`,
    );
  }
  const bffMe = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { Origin: platformOrigin },
    signal: AbortSignal.timeout(15_000),
  });
  if (bffMe.status >= 500) {
    throw new Error(`platform BFF auth/me HTTP ${bffMe.status}`);
  }
  const ct = bffMe.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error("platform BFF auth/me did not return JSON (backend unreachable?)");
  }
}

async function resolveStackPlatform(env) {
  const devEnv = withDevNodeEnv(env);
  Object.assign(process.env, devEnv);
  const metaPath = path.join(RUN_DIR, "meta.json");
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    if (await platformAlive(meta.platformOrigin)) return meta;
  }
  return ensureStack();
}

async function waitForLoginOtpStep(page) {
  const otp = page.getByRole("textbox", { name: /код из сообщения/i });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await otp.isVisible().catch(() => false)) return;
    const retry = page.getByRole("button", { name: /повторить проверку/i });
    if (await retry.isVisible().catch(() => false)) {
      await retry.click();
      await page.waitForTimeout(1200);
      continue;
    }
    await page.waitForTimeout(400);
  }
  await otp.waitFor({ state: "visible", timeout: 5_000 });
}

function runSeedScript(env, tag, reseed = false) {
  materializeNavigatorFixtureScripts();
  const r = spawnSync(
    "pnpm",
    ["exec", "tsx", NAV_SEED_SCRIPT],
    {
      cwd: NAV,
      env: withDevNodeEnv({
        ...process.env,
        ...env,
        LOGIN_LAYOUT_FIXTURE_TAG: tag,
        LOGIN_LAYOUT_FIXTURE_OTP: FIXTURE_OTP,
        LOGIN_LAYOUT_RESEED: reseed ? "1" : "0",
      }),
      encoding: "utf8",
    },
  );
  if (r.status !== 0) throw new Error(`seed failed: ${r.stderr || r.stdout}`);
  return JSON.parse(r.stdout.trim());
}

function runSeed(env, tag) {
  return runSeedScript(env, tag, false);
}

function runCleanup(env, tag) {
  materializeNavigatorFixtureScripts();
  spawnSync("pnpm", ["exec", "tsx", NAV_CLEANUP_SCRIPT, tag], {
    cwd: NAV,
    env: withDevNodeEnv({ ...process.env, ...env, LOGIN_LAYOUT_FIXTURE_MAX_ID: "881001847291" }),
    encoding: "utf8",
  });
}

function reseedOtp(env, tag) {
  runSeedScript(env, tag, true);
}

async function measureLoginLayoutDesktop(page) {
  return page.evaluate(() => {
    const layout = document.querySelector('[class*="entryLayout"]');
    const story = document.querySelector('[class*="entryStory"]');
    const form = document.querySelector('[class*="entryForm"]');
    const doc = document.documentElement;
    const rect = (el) => (el ? el.getBoundingClientRect().width : null);
    return {
      innerWidth: window.innerWidth,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
      entryLayoutWidth: rect(layout),
      entryStoryWidth: rect(story),
      entryFormWidth: rect(form),
      gridTemplateColumns: layout ? getComputedStyle(layout).gridTemplateColumns : null,
    };
  });
}

function assertDesktopLayoutGate(metrics) {
  const { entryLayoutMin, storyMin, formMin } = DESKTOP_LAYOUT_GATE;
  if (metrics.entryLayoutWidth == null) throw new Error("entryLayout missing on /login desktop");
  if (metrics.entryLayoutWidth < entryLayoutMin) {
    throw new Error(`entryLayoutWidth ${metrics.entryLayoutWidth} < ${entryLayoutMin}`);
  }
  if ((metrics.entryStoryWidth ?? 0) < storyMin) {
    throw new Error(`entryStoryWidth ${metrics.entryStoryWidth} < ${storyMin}`);
  }
  if ((metrics.entryFormWidth ?? 0) < formMin) {
    throw new Error(`entryFormWidth ${metrics.entryFormWidth} < ${formMin}`);
  }
}

async function fetchAuthMe(platformOrigin, cookieHeader) {
  const res = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { cookie: cookieHeader, Origin: platformOrigin },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, hasUser: Boolean(body?.user?.id), userId: body?.user?.id ?? null };
}

async function waitForVerifyCodeResponse(page, expectStatus = 200) {
  const res = await page.waitForResponse(
    (r) => r.url().includes("/api/remcard/api/auth/verify-code") && r.request().method() === "POST",
    { timeout: 90_000 },
  );
  if (res.status() !== expectStatus) {
    throw new Error(`verify-code HTTP ${res.status()} expected ${expectStatus}`);
  }
  return res;
}

async function waitForCabinetScanner(page, platformOrigin) {
  await page.waitForURL((url) => url.pathname === "/scanner", { timeout: 120_000 });
  await page.getByRole("heading", { name: /^Сканер$/ }).waitFor({ state: "visible", timeout: 60_000 });
  const loginHeading = page.getByRole("heading", { name: /присоединяйтесь к remcard prof/i });
  if (await loginHeading.isVisible().catch(() => false)) {
    throw new Error("scanner URL but login form visible (session gate)");
  }
  const cookies = await page.context().cookies();
  const jar = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const me = await fetchAuthMe(platformOrigin, jar);
  if (!me.hasUser) throw new Error("auth/me has no user after cabinet navigation");
  return { url: page.url(), authMe: me };
}

async function loginLogoutRelogin(platformOrigin, env, fixtureTag) {
  const seed = runSeed(env, fixtureTag);
  let browser;
  let ctx;
  const counts = { verifyCode: 0, logout: 0, authMe: 0 };
  const statuses = { verifyCode: [], logout: [], authMeAfterLogout: null };
  const urls = {};

  try {
    browser = await chromium.launch({ headless: true });
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    page.on("response", (res) => {
      const u = res.url();
      if (u.includes("/api/remcard/api/auth/verify-code") && res.request().method() === "POST") {
        counts.verifyCode++;
        statuses.verifyCode.push(res.status());
      }
      if (u.includes("/api/remcard/api/auth/logout") && res.request().method() === "POST") {
        counts.logout++;
        statuses.logout.push(res.status());
      }
      if (u.includes("/api/remcard/api/auth/me") && res.request().method() === "GET") {
        counts.authMe++;
      }
    });

    await page.goto(`${platformOrigin}/login?returnTo=/scanner`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    urls.initialLogin = page.url();

    await waitForLoginOtpStep(page);
    const otp = page.getByRole("textbox", { name: /код из сообщения/i });
    await otp.fill(seed.otp);
    const verifyWait = waitForVerifyCodeResponse(page, 200);
    await page.getByRole("button", { name: /продолжить/i }).click();
    await verifyWait;
    const cabinet1 = await waitForCabinetScanner(page, platformOrigin);
    urls.afterFirstLogin = cabinet1.url;

    await page.getByTestId("account-menu-trigger").click();
    await page.getByTestId("account-logout").click();
    const logoutWait = page.waitForResponse(
      (r) => r.url().includes("/api/remcard/api/auth/logout") && r.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page.waitForURL(/\/account\/signed-out/, { timeout: 60_000 });
    const logoutRes = await logoutWait;
    if (logoutRes.status() < 200 || logoutRes.status() >= 300) {
      throw new Error(`logout HTTP ${logoutRes.status()}`);
    }
    urls.afterLogout = page.url();

    const cookiesAfterLogout = await ctx.cookies();
    const jarOut = cookiesAfterLogout.map((c) => `${c.name}=${c.value}`).join("; ");
    statuses.authMeAfterLogout = await fetchAuthMe(platformOrigin, jarOut);
    if (statuses.authMeAfterLogout.hasUser) {
      throw new Error("auth/me still has user after logout");
    }

    await page.goto(`${platformOrigin}/scanner`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    urls.scannerAfterLogout = page.url();
    const cookiesOnScannerProbe = await ctx.cookies();
    const jarProbe = cookiesOnScannerProbe.map((c) => `${c.name}=${c.value}`).join("; ");
    const meOnScannerProbe = await fetchAuthMe(platformOrigin, jarProbe);
    if (meOnScannerProbe.hasUser) {
      throw new Error("auth/me still has user when probing /scanner after logout");
    }
    const scannerHeadingAfterLogout = await page
      .getByRole("heading", { name: /^Сканер$/ })
      .isVisible()
      .catch(() => false);
    const loginFormAfterScannerProbe = await page
      .getByRole("heading", { name: /присоединяйтесь к remcard prof/i })
      .isVisible()
      .catch(() => false);
    urls.scannerBlockedAfterLogout = {
      url: page.url(),
      scannerHeadingVisible: scannerHeadingAfterLogout,
      loginFormVisible: loginFormAfterScannerProbe,
      authMeHasUser: meOnScannerProbe.hasUser,
    };
    if (scannerHeadingAfterLogout) {
      throw new Error(`cabinet /scanner still usable after logout (Сканер visible at ${page.url()})`);
    }
    if (await page.getByTestId("account-sign-in").isVisible().catch(() => false)) {
      throw new Error("account-sign-in on /login — must use signed-out page for return path");
    }

    await page.goto(`${platformOrigin}/account/signed-out?scope=current`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByTestId("signed-out").waitFor({ state: "visible", timeout: 30_000 });
    await page.getByTestId("account-sign-in").click();
    await page.waitForURL((url) => url.pathname === "/login", { timeout: 30_000 });
    urls.returnedToLogin = page.url();
    await waitForLoginOtpStep(page);

    const layoutMetrics = await measureLoginLayoutDesktop(page);
    assertDesktopLayoutGate(layoutMetrics);

    await page.goto(`${platformOrigin}/login?returnTo=/scanner`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    urls.loginBeforeSecondOtp = page.url();
    await waitForLoginOtpStep(page);
    reseedOtp(env, fixtureTag);
    await waitForLoginOtpStep(page);
    const otp2 = page.getByRole("textbox", { name: /код из сообщения/i });
    await otp2.fill(seed.otp);
    const verify2 = waitForVerifyCodeResponse(page, 200);
    await page.getByRole("button", { name: /продолжить/i }).click();
    await verify2;
    const cabinet2 = await waitForCabinetScanner(page, platformOrigin);
    urls.afterSecondLogin = cabinet2.url;

    if (counts.verifyCode !== 2) throw new Error(`verifyCode count ${counts.verifyCode} !== 2`);
    if (counts.logout !== 1) throw new Error(`logout count ${counts.logout} !== 1`);

    return {
      status: "VERIFIED_MOCK_DISPOSABLE",
      mock: true,
      fixtureTag,
      userId: seed.userId,
      counts,
      statuses,
      urls,
      desktopLayoutAfterRelogin: layoutMetrics,
      desktopLayoutGate: DESKTOP_LAYOUT_GATE,
    };
  } finally {
    if (ctx) await ctx.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    runCleanup(env, fixtureTag);
  }
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const codeSha = "27d339b47b62164d0796bc853ce0a0966e1f0e2e";
  const runtimeSha = gitSha(ROOT);
  const env = withDevNodeEnv(requireDisposableEnv());
  Object.assign(process.env, env);
  const stackMeta = await resolveStackPlatform(env);
  await assertStackAuthHealthy(stackMeta.platformOrigin, stackMeta.navOrigin);
  const platformOrigin = stackMeta.platformOrigin;

  const fixtureTag = `ll01-${Date.now()}`;
  let regression;
  let exitCode = 0;
  try {
    regression = await loginLogoutRelogin(platformOrigin, env, fixtureTag);
  } catch (e) {
    regression = {
      status: "FAIL",
      mock: true,
      reason: String(e?.message ?? e),
      fixtureTag,
    };
    exitCode = 1;
  }

  const evidenceTipSha = gitSha(ROOT);
  const manifestPath = path.join(ART, "manifest.json");
  let manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  manifest.loginLayout012 = {
    task: "LOGIN-LAYOUT-01.2",
    recordedAt: new Date().toISOString(),
    codeSha,
    runtimeSha,
    evidenceTipSha,
    platformOrigin,
    stackMeta: { platformOrigin: stackMeta.platformOrigin, navOrigin: stackMeta.navOrigin, database: REQUIRED_DB },
    disposableDb: REQUIRED_DB,
    mockAuth: true,
    loginLogoutRelogin: regression,
    desktopLayoutGate: DESKTOP_LAYOUT_GATE,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const testRun = {
    status: regression.status === "VERIFIED_MOCK_DISPOSABLE" ? "READY_FOR_REVIEW" : "FAIL",
    task: "LOGIN-LAYOUT-01.2",
    baseSha: "0fe7da52bb02f2a515d238757c8be16ef2d83948",
    codeSha,
    evidenceTipSha,
    command: "NODE_ENV=development node artifacts/remcard-login-layout-01/run-01.1-evidence.mjs",
    exitCode,
    loginLogoutRelogin: regression.status,
    counts: regression.counts ?? null,
    urls: regression.urls ?? null,
    desktopLayout: regression.desktopLayoutAfterRelogin ?? null,
  };
  writeFileSync(path.join(ART, "test-run-01.2.json"), `${JSON.stringify(testRun, null, 2)}\n`);

  console.log(JSON.stringify({ regression: regression.status, exitCode }, null, 2));
  process.exitCode = exitCode;
  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
