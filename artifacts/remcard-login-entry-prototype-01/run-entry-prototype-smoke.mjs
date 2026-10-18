#!/usr/bin/env node
/**
 * LOGIN-ENTRY-PROTOTYPE-01.1 acceptance runner (fail-closed).
 */
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureLoginEntryPairs } from "./login-entry-capture.mjs";
import {
  deriveAcceptanceStatus,
  evaluateCleanupChildResult,
  fixtureMaxIdForTag,
  gitSha,
  loadEnvFile,
  resolveDisposableDatabaseEnv,
  spawnResultRecord,
} from "./login-entry-smoke-harness.mjs";
import { goToOtpStep, goToProviderStep } from "./login-entry-capture.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NAV = path.resolve(ROOT, "../remcard-navigator");
const ART = __dirname;
const LAYOUT_ART = path.resolve(ROOT, "artifacts/remcard-login-layout-01");
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || "/tmp/admin-test-local-stack";
const RUNTIME_ENV = path.join(RUN_DIR, "runtime.env");
const FIXTURE_OTP = "847291";
const REF_UNPACK = process.env.LOGIN_ENTRY_REF_DIR || "/tmp/login-entry-prototype-unpack";
const SHOTS = path.join(ART, "screenshots");
const BUILD_LOG = path.join(ART, "login-entry-build.log");

const BASE_SHA = "7376fb291ef67b6d5f763f8b3cf9917660606bfe";

function materializeNavigatorFixtureScripts() {
  writeFileSync(
    path.join(NAV, "scripts/.login-entry-disposable-db-url-guard.mjs"),
    readFileSync(path.join(LAYOUT_ART, "disposable-db-url-guard.mjs")),
  );
  writeFileSync(
    path.join(NAV, "scripts/.login-entry-disposable-seed.ts"),
    readFileSync(path.join(LAYOUT_ART, "seed-disposable-fixture.nav.fixture.tpl")),
  );
  writeFileSync(
    path.join(NAV, "scripts/.login-entry-disposable-cleanup.ts"),
    readFileSync(path.join(LAYOUT_ART, "cleanup-disposable-fixture.nav.fixture.tpl")),
  );
}

function startNextStart(port, extraEnv = {}) {
  return spawn("npx", ["next", "start", "-p", String(port)], {
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

function runBuild(codeSha) {
  const cmd = "env -u R06_NEXT_DIST_DIR npm run build";
  const r = spawnSync("bash", ["-lc", cmd], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production" },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  writeFileSync(BUILD_LOG, `${r.stdout ?? ""}\n${r.stderr ?? ""}`);
  const buildIdPath = path.join(ROOT, ".next/BUILD_ID");
  const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : null;
  return {
    command: cmd,
    sourceSha: codeSha,
    BUILD_ID: buildId,
    ...spawnResultRecord(r),
  };
}

async function fetchAuthMe(platformOrigin, cookieHeader) {
  const res = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { cookie: cookieHeader, Origin: platformOrigin },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, hasUser: Boolean(body?.user?.id) };
}

function reseedFixture(tag, runtimeEnv, maxId) {
  const seed = spawnSync("pnpm", ["exec", "tsx", path.join(NAV, "scripts/.login-entry-disposable-seed.ts")], {
    cwd: NAV,
    env: {
      ...process.env,
      ...runtimeEnv,
      NODE_ENV: "development",
      LOGIN_LAYOUT_FIXTURE_TAG: tag,
      LOGIN_LAYOUT_FIXTURE_OTP: FIXTURE_OTP,
      LOGIN_LAYOUT_FIXTURE_MAX_ID: maxId,
      LOGIN_LAYOUT_RESEED: "1",
    },
    encoding: "utf8",
  });
  if (seed.status !== 0 || seed.error) {
    throw new Error(`reseed failed: ${seed.error?.message ?? seed.stderr ?? seed.stdout}`);
  }
  return JSON.parse(seed.stdout.trim());
}

async function runDisposableChain(platformOrigin, runtimeEnv) {
  materializeNavigatorFixtureScripts();
  const tag = `login-entry-${Date.now()}`;
  const maxId = fixtureMaxIdForTag(tag);
  let seedJson = null;
  let browser;
  let page;
  let failError = null;
  let passPayload = null;
  let ranSeed = false;

  const seedEnv = {
    ...process.env,
    ...runtimeEnv,
    NODE_ENV: "development",
    LOGIN_LAYOUT_FIXTURE_TAG: tag,
    LOGIN_LAYOUT_FIXTURE_OTP: FIXTURE_OTP,
    LOGIN_LAYOUT_FIXTURE_MAX_ID: maxId,
  };

  try {
    const seed = spawnSync("pnpm", ["exec", "tsx", path.join(NAV, "scripts/.login-entry-disposable-seed.ts")], {
      cwd: NAV,
      env: seedEnv,
      encoding: "utf8",
    });
    if (seed.status !== 0 || seed.error) {
      throw new Error(`seed failed: ${seed.error?.message ?? seed.stderr ?? seed.stdout}`);
    }
    seedJson = JSON.parse(seed.stdout.trim());
    ranSeed = true;

    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    await goToProviderStep(page, `${platformOrigin}/login?returnTo=/scanner`);
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
    await page.getByRole("heading", { name: /^Сканер$/ }).waitFor({ state: "visible", timeout: 60_000 });

    await page.getByTestId("account-menu-trigger").click();
    await page.getByTestId("account-logout").click();
    await page.waitForURL(/\/account\/signed-out/, { timeout: 60_000 });
    const cookiesAfterLogout = await page.context().cookies();
    const jarOut = cookiesAfterLogout.map((c) => `${c.name}=${c.value}`).join("; ");
    const meOut = await fetchAuthMe(platformOrigin, jarOut);
    if (meOut.hasUser) throw new Error("auth/me still has user after logout");

    await page.goto(`${platformOrigin}/scanner`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const meScanner = await fetchAuthMe(
      platformOrigin,
      (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; "),
    );
    if (meScanner.hasUser) throw new Error("auth/me has user on /scanner after logout");
    if (await page.getByRole("heading", { name: /^Сканер$/ }).isVisible().catch(() => false)) {
      throw new Error("scanner still accessible after logout");
    }

    await page.goto(`${platformOrigin}/account/signed-out?scope=current`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("signed-out").waitFor({ state: "visible", timeout: 30_000 });
    await page.getByTestId("account-sign-in").click();
    await page.waitForURL((url) => url.pathname === "/login", { timeout: 30_000 });
    seedJson = reseedFixture(tag, runtimeEnv, maxId);
    await goToProviderStep(page, page.url());
    await goToOtpStep(page);
    await page.locator('input[placeholder="000000"]').fill(seedJson.otp || FIXTURE_OTP);
    const verify2 = page.waitForResponse(
      (r) => r.url().includes("/api/remcard/api/auth/verify-code") && r.request().method() === "POST",
      { timeout: 90_000 },
    );
    await page.getByRole("button", { name: /подтвердить и продолжить/i }).click();
    const v2 = await verify2;
    if (v2.status() !== 200) throw new Error(`relogin verify-code HTTP ${v2.status()}`);
    await page.waitForURL((url) => url.pathname === "/scanner", { timeout: 120_000 });

    passPayload = { tag, maxId, verifyCodeStatus: verifyRes.status(), reloginVerifyStatus: v2.status() };
  } catch (error) {
    failError = error instanceof Error ? error : new Error(String(error));
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});

    if (!ranSeed) {
      if (failError) throw failError;
      return passPayload;
    }
    const cleanup = spawnSync(
      "pnpm",
      ["exec", "tsx", path.join(NAV, "scripts/.login-entry-disposable-cleanup.ts"), tag],
      { cwd: NAV, env: { ...process.env, ...runtimeEnv, NODE_ENV: "development" }, encoding: "utf8" },
    );
    let cleanupReport;
    try {
      cleanupReport = evaluateCleanupChildResult({
        status: cleanup.status,
        error: cleanup.error ?? null,
        stdout: cleanup.stdout ?? "",
        stderr: cleanup.stderr ?? "",
      });
    } catch (cleanupError) {
      if (failError) throw failError;
      throw cleanupError;
    }
    if (failError) throw failError;
    return { ...passPayload, cleanup: cleanupReport };
  }
}

async function main() {
  const runnerSha = gitSha(ROOT);
  const navigatorSha = existsSync(NAV) ? gitSha(NAV) : null;
  const runtimeEnv = loadEnvFile(RUNTIME_ENV) ?? {};
  const disposableResolved = existsSync(RUNTIME_ENV)
    ? resolveDisposableDatabaseEnv(runtimeEnv)
    : { ok: false, reason: "runtime.env missing" };

  const componentTest = spawnSync(
    "npx",
    [
      "vitest",
      "run",
      "src/components/auth/AuthFlow.test.tsx",
      "src/components/auth/LoginExperience.test.tsx",
      "src/components/auth/AdminLoginModal.test.tsx",
    ],
    { cwd: ROOT, env: { ...process.env, NODE_ENV: "test" }, encoding: "utf8" },
  );

  const harnessUnit = spawnSync("node", ["--test", path.join(ART, "login-entry-smoke-harness.test.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
  });

  let build =
    process.env.LOGIN_ENTRY_SKIP_BUILD === "1"
      ? { skipped: true, reason: "LOGIN_ENTRY_SKIP_BUILD=1" }
      : runBuild(runnerSha);
  const buildIdPath = path.join(ROOT, ".next/BUILD_ID");
  if (build.skipped && existsSync(buildIdPath)) {
    build = {
      skipped: true,
      imported: true,
      reason: `${build.reason}; imported existing .next`,
      command: "import .next/BUILD_ID (no npm run build in this runner invocation)",
      sourceSha: runnerSha,
      BUILD_ID: readFileSync(buildIdPath, "utf8").trim(),
      exitCode: 0,
      signal: null,
      spawnError: null,
    };
  }

  const useRunning = process.env.LOGIN_ENTRY_USE_RUNNING_PLATFORM === "1";
  const spawnedPort = Number(process.env.LOGIN_ENTRY_IMPL_PORT || 3099);
  let implOrigin = useRunning
    ? process.env.LOGIN_ENTRY_IMPL_ORIGIN || "http://127.0.0.1:3040"
    : `http://127.0.0.1:${spawnedPort}`;

  let runtimePin = null;
  let captureResult = null;
  let disposableResult = { status: "NOT_VERIFIED", reason: disposableResolved.ok ? "not run" : disposableResolved.reason };
  let smokeError = null;

  const buildRecorded = Boolean(build.BUILD_ID && Number(build.exitCode) === 0);

  let refServer = null;
  let implServer = null;
  try {
    if (useRunning) {
      const pinSha = process.env.LOGIN_ENTRY_RUNTIME_CODE_SHA?.trim() || null;
      const pinBuild = process.env.LOGIN_ENTRY_RUNTIME_BUILD_ID?.trim() || null;
      if (!pinSha || !pinBuild) {
        runtimePin = {
          mode: "running-server",
          origin: implOrigin,
          verified: false,
          reason: "missing LOGIN_ENTRY_RUNTIME_CODE_SHA or LOGIN_ENTRY_RUNTIME_BUILD_ID",
        };
      } else {
        runtimePin = { mode: "running-server", origin: implOrigin, codeSha: pinSha, BUILD_ID: pinBuild, verified: true };
      }
    } else if (buildRecorded) {
      implServer = startNextStart(spawnedPort, runtimeEnv ?? {});
      runtimePin = {
        mode: "spawned-next-start",
        origin: implOrigin,
        codeSha: runnerSha,
        BUILD_ID: build.BUILD_ID,
        verified: true,
      };
    } else {
      runtimePin = { mode: "none", verified: false, reason: "production build not recorded" };
    }

    if (runtimePin?.verified) {
      await waitForHttp(`${implOrigin}/login`);
    }

    refServer = spawn("npx", ["--yes", "serve", REF_UNPACK, "-l", "3098"], { stdio: "ignore" });
    await waitForHttp("http://127.0.0.1:3098/roles.html");
    const refOrigin = "http://127.0.0.1:3098";

    if (process.env.LOGIN_ENTRY_SKIP_CAPTURE !== "1" && runtimePin?.verified !== false) {
      const browser = await chromium.launch({ headless: true });
      captureResult = await captureLoginEntryPairs({
        browser,
        refOrigin,
        implOrigin,
        shotsDir: SHOTS,
      });
      await browser.close();
    }

    if (disposableResolved.ok && runtimePin?.verified !== false) {
      disposableResult = { status: "PASS", ...(await runDisposableChain(implOrigin, runtimeEnv)) };
    } else if (!disposableResolved.ok) {
      disposableResult = { status: "NOT_VERIFIED", reason: disposableResolved.reason };
    }
  } catch (error) {
    smokeError = error instanceof Error ? error.message : String(error);
    if (disposableResolved.ok) {
      disposableResult = { status: "FAIL", error: smokeError };
    }
  } finally {
    implServer?.kill("SIGTERM");
    refServer?.kill("SIGTERM");
  }

  const componentTestsOk = componentTest.status === 0 && harnessUnit.status === 0;
  const runtimeVerified = Boolean(runtimePin?.verified);
  const smokeOk = !smokeError && disposableResult.status === "PASS";
  const cleanupOk = disposableResult.cleanup?.remaining
    ? Object.values(disposableResult.cleanup.remaining).every((v) => v === 0)
    : smokeOk;

  const evidence = {
    status: deriveAcceptanceStatus({
      componentTestsOk,
      smokeOk,
      cleanupOk,
      buildRecorded,
      runtimeVerified,
    }),
    task: "LOGIN-ENTRY-PROTOTYPE-01.1",
    baseSha: BASE_SHA,
    codeSha: runnerSha,
    runnerSha,
    artifactTipSha: runnerSha,
    navigatorSha,
    referencePackageCommit: "9bc52fb9152293e992e98dc50804a660cef10733",
    referenceArchiveSha256: "382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d",
    productionBuild: build.skipped ? build : { ...build, logFile: path.relative(ROOT, BUILD_LOG) },
    runtimePin,
    tests: {
      authComponents: {
        command:
          "NODE_ENV=test npx vitest run src/components/auth/AuthFlow.test.tsx src/components/auth/LoginExperience.test.tsx src/components/auth/AdminLoginModal.test.tsx",
        ...spawnResultRecord(componentTest),
      },
      harnessUnit: {
        command: `node --test ${path.relative(ROOT, path.join(ART, "login-entry-smoke-harness.test.mjs"))}`,
        ...spawnResultRecord(harnessUnit),
      },
      disposableLogin: disposableResult,
      smokeError,
    },
    screenshots: captureResult ?? {
      status: process.env.LOGIN_ENTRY_SKIP_CAPTURE === "1" ? "skipped" : "not captured",
    },
    notPublished: true,
    notMerged: true,
  };

  writeFileSync(path.join(ART, "login-entry-prototype-01-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));

  const exitFail =
    !componentTestsOk ||
    (build.skipped ? false : build.exitCode !== 0) ||
    disposableResult.status === "FAIL";
  if (exitFail) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
