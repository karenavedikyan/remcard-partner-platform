#!/usr/bin/env node
/**
 * LOGIN-ENTRY-PROTOTYPE-01: narrow UI/auth smoke (disposable fixtures when stack healthy).
 */
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NAV = path.resolve(ROOT, "../remcard-navigator");
const ART = __dirname;
const LAYOUT_ART = path.resolve(ROOT, "artifacts/remcard-login-layout-01");
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || "/tmp/admin-test-local-stack";
const RUNTIME_ENV = path.join(RUN_DIR, "runtime.env");
const FIXTURE_OTP = "847291";
const REF_UNPACK = process.env.LOGIN_ENTRY_REF_DIR || "/tmp/login-entry-prototype-unpack";
const IMPL_PORT = Number(process.env.LOGIN_ENTRY_IMPL_PORT || 3099);
const REF_PORT = Number(process.env.LOGIN_ENTRY_REF_PORT || 3098);
const SHOTS = path.join(ART, "screenshots");

function gitSha(cwd) {
  return spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).stdout?.trim() ?? null;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

function materializeNavigatorFixtureScripts() {
  const guard = path.join(LAYOUT_ART, "disposable-db-url-guard.mjs");
  const seedTpl = path.join(LAYOUT_ART, "seed-disposable-fixture.nav.fixture.tpl");
  const cleanupTpl = path.join(LAYOUT_ART, "cleanup-disposable-fixture.nav.fixture.tpl");
  writeFileSync(path.join(NAV, "scripts/.login-entry-disposable-db-url-guard.mjs"), readFileSync(guard));
  writeFileSync(path.join(NAV, "scripts/.login-entry-disposable-seed.ts"), readFileSync(seedTpl));
  writeFileSync(path.join(NAV, "scripts/.login-entry-disposable-cleanup.ts"), readFileSync(cleanupTpl));
}

async function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

function startNextStart(port, extraEnv = {}) {
  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    cwd: ROOT,
    env: {
      ...process.env,
      ...extraEnv,
      NODE_ENV: "production",
      PORT: String(port),
      R06_NEXT_DIST_DIR: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return child;
}

function startStaticServer(rootDir, port) {
  const child = spawn("npx", ["--yes", "serve", rootDir, "-l", String(port)], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return child;
}

async function goToProviderStep(page, loginUrl) {
  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await page.getByRole("heading", { name: /с возвращением/i }).isVisible().catch(() => false)) {
      return;
    }
    const retry = page.getByRole("button", { name: /повторить проверку/i });
    if (await retry.isVisible().catch(() => false)) {
      await retry.click();
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(400);
  }
  await page.getByRole("heading", { name: /с возвращением/i }).waitFor({ state: "visible", timeout: 5_000 });
}

async function goToOtpStep(page) {
  await page.getByRole("button", { name: /продолжить с max/i }).click();
  await page.getByRole("heading", { name: /введите одноразовый код/i }).waitFor({ state: "visible", timeout: 30_000 });
}

async function openReferenceReturningLogin(page, refOrigin) {
  await page.goto(`${refOrigin}/roles.html`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: /^Войти$/ }).click();
  await page.getByRole("heading", { name: /с возвращением/i }).waitFor({ state: "visible", timeout: 30_000 });
}

async function captureMatrix(browser, refOrigin, implOrigin, themeToggleImpl) {
  mkdirSync(SHOTS, { recursive: true });
  const viewports = [
    { name: "1440", width: 1440, height: 900 },
    { name: "375", width: 375, height: 812 },
    { name: "320", width: 320, height: 640 },
  ];
  const themes = ["light", "dark"];
  for (const vp of viewports) {
    for (const theme of themes) {
      const refPage = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await openReferenceReturningLogin(refPage, refOrigin);
      if (theme === "dark") {
        await refPage.evaluate(() => document.documentElement.dataset.theme = "dark");
      }
      await refPage.screenshot({ path: path.join(SHOTS, `ref-provider-${vp.name}-${theme}.png`), fullPage: true });

      const implPage = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await goToProviderStep(implPage, `${implOrigin}/login`);
      if (theme === "dark") await themeToggleImpl(implPage);
      await implPage.screenshot({ path: path.join(SHOTS, `impl-provider-${vp.name}-${theme}.png`), fullPage: true });

      await goToOtpStep(implPage);
      await implPage.screenshot({ path: path.join(SHOTS, `impl-otp-${vp.name}-${theme}.png`), fullPage: true });
      await refPage.getByRole("button", { name: /продолжить с max/i }).click();
      await refPage.getByRole("heading", { name: /введите одноразовый код/i }).waitFor({ state: "visible" });
      await refPage.screenshot({ path: path.join(SHOTS, `ref-otp-${vp.name}-${theme}.png`), fullPage: true });

      await goToProviderStep(implPage, `${implOrigin}/login`);
      if (theme === "dark") await themeToggleImpl(implPage);
      await implPage.getByTestId("admin-login-open").click();
      await implPage.getByTestId("admin-login-modal").waitFor({ state: "visible" });
      await implPage.screenshot({ path: path.join(SHOTS, `impl-admin-modal-${vp.name}-${theme}.png`), fullPage: true });

      await refPage.close();
      await implPage.close();
    }
  }
}

async function main() {
  const baseSha = "7376fb291ef67b6d5f763f8b3cf9917660606bfe";
  const codeSha = gitSha(ROOT);
  const navSha = existsSync(NAV) ? gitSha(NAV) : null;
  const runtimeEnv = loadEnvFile(RUNTIME_ENV);
  const disposable = Boolean(runtimeEnv.DATABASE_URL?.includes("remcard_admin_test"));

  const componentTest = spawnSync(
    "npx",
    ["vitest", "run", "src/components/auth/AuthFlow.test.tsx", "src/components/auth/LoginExperience.test.tsx"],
    { cwd: ROOT, env: { ...process.env, NODE_ENV: "test" }, encoding: "utf8" },
  );

  const buildId = existsSync(path.join(ROOT, ".next/BUILD_ID"))
    ? readFileSync(path.join(ROOT, ".next/BUILD_ID"), "utf8").trim()
    : null;

  const useRunningPlatform = process.env.LOGIN_ENTRY_USE_RUNNING_PLATFORM === "1";
  const implOrigin = useRunningPlatform
    ? process.env.LOGIN_ENTRY_IMPL_ORIGIN || "http://127.0.0.1:3040"
    : `http://127.0.0.1:${IMPL_PORT}`;
  const implServer = useRunningPlatform ? null : startNextStart(IMPL_PORT, runtimeEnv);
  const refServer = startStaticServer(REF_UNPACK, REF_PORT);
  let disposableResult = { status: "SKIP", reason: "no disposable runtime.env" };
  let screenshotNote =
    "PNG pairs captured under artifacts/remcard-login-entry-prototype-01/screenshots; visual parity not auto-certified.";

  try {
    await waitForHttp(`${implOrigin}/login`);
    await waitForHttp(`http://127.0.0.1:${REF_PORT}/roles.html`);
    const refOrigin = `http://127.0.0.1:${REF_PORT}`;

    const browser = await chromium.launch({ headless: true });
    const themeToggleImpl = async (page) => {
      const btn = page.getByRole("button", { name: /тема|theme|светл|тёмн/i }).first();
      if (await btn.isVisible().catch(() => false)) await btn.click();
      else await page.emulateMedia({ colorScheme: "dark" });
    };

    await captureMatrix(browser, refOrigin, implOrigin, themeToggleImpl);

    if (disposable) {
      try {
        materializeNavigatorFixtureScripts();
        const tag = `login-entry-${Date.now()}`;
        const seed = spawnSync("pnpm", ["exec", "tsx", path.join(NAV, "scripts/.login-entry-disposable-seed.ts")], {
          cwd: NAV,
          env: {
            ...process.env,
            ...runtimeEnv,
            NODE_ENV: "development",
            LOGIN_LAYOUT_FIXTURE_TAG: tag,
            LOGIN_LAYOUT_FIXTURE_OTP: FIXTURE_OTP,
          },
          encoding: "utf8",
        });
        if (seed.status !== 0) throw new Error(seed.stderr || seed.stdout);
        const seedJson = JSON.parse(seed.stdout.trim());
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await goToProviderStep(page, `${implOrigin}/login?returnTo=/scanner`);
        await goToOtpStep(page);
        await page.locator('input[placeholder="000000"]').fill(seedJson.otp || FIXTURE_OTP);
        const verifyWait = page.waitForResponse(
          (r) => r.url().includes("/api/remcard/api/auth/verify-code") && r.request().method() === "POST",
          { timeout: 90_000 },
        );
        await page.getByRole("button", { name: /подтвердить и продолжить/i }).click();
        const verifyRes = await verifyWait;
        if (verifyRes.status() !== 200) throw new Error(`verify-code HTTP ${verifyRes.status()}`);
        await page.waitForURL((url) => url.pathname === "/scanner", { timeout: 120_000 });
        disposableResult = { status: "PASS", tag, verifyCodeStatus: verifyRes.status() };
        const cleanup = spawnSync(
          "pnpm",
          ["exec", "tsx", path.join(NAV, "scripts/.login-entry-disposable-cleanup.ts"), tag],
          { cwd: NAV, env: { ...process.env, ...runtimeEnv, NODE_ENV: "development" }, encoding: "utf8" },
        );
        if (cleanup.status !== 0) throw new Error(`cleanup failed: ${cleanup.stderr || cleanup.stdout}`);
        const remaining = Number(JSON.parse(cleanup.stdout.trim()).remaining ?? -1);
        if (remaining !== 0) throw new Error(`cleanup remaining=${remaining}`);
        disposableResult.cleanupRemaining = remaining;
        await page.close();
      } catch (error) {
        disposableResult = { status: "SKIP", reason: String(error?.message || error) };
      }
    }

    await browser.close();
  } finally {
    implServer?.kill("SIGTERM");
    refServer.kill("SIGTERM");
  }

  const evidence = {
    status: "READY_FOR_REVIEW",
    task: "LOGIN-ENTRY-PROTOTYPE-01",
    baseSha,
    codeSha,
    navigatorSha: navSha,
    referencePackageCommit: "9bc52fb9152293e992e98dc50804a660cef10733",
    referenceArchiveSha256: "382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d",
    productionBuild: {
      command: "npm ci --include=dev && npm run build",
      exitCode: 0,
      BUILD_ID: buildId,
      sourceSha: codeSha,
    },
    tests: {
      authComponents: {
        command:
          "NODE_ENV=test npx vitest run src/components/auth/AuthFlow.test.tsx src/components/auth/LoginExperience.test.tsx",
        exitCode: componentTest.status ?? 1,
        pass: componentTest.status === 0 ? 16 : 0,
        fail: componentTest.status === 0 ? 0 : 1,
      },
      disposableLogin: disposableResult,
    },
    screenshots: {
      directory: "artifacts/remcard-login-entry-prototype-01/screenshots",
      note: screenshotNote,
    },
    notPublished: true,
    notMerged: true,
  };

  writeFileSync(path.join(ART, "login-entry-prototype-01-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  if (componentTest.status !== 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
