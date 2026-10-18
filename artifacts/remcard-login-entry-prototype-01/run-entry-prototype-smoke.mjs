#!/usr/bin/env node
/**
 * LOGIN-ENTRY-PROTOTYPE acceptance runner (fail-closed build/runtime, safe lifecycle).
 */
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  captureLoginEntryTargets,
  parseCaptureTargetSpec,
} from "./login-entry-capture.mjs";
import {
  deriveAcceptanceStatus,
  evaluateBuildVerified,
  evaluateCleanupChildResult,
  evaluateMandatoryUnitGates,
  evaluatePinnedBuildForSmoke,
  evaluateRuntimePin,
  fixtureMaxIdForTag,
  gitSha,
  LOGIN_ENTRY_PRODUCT_PIN_SHA,
  loadEnvFile,
  mergeDisposableErrors,
  resolveDisposableDatabaseEnv,
  shouldRunFixtureCleanup,
  spawnResultRecord,
  validateImportedComponentReport,
} from "./login-entry-smoke-harness.mjs";
import {
  isLoopbackPortOpen,
  parseLoopbackPortFromUrl,
  resolveLoopbackListenPort,
  spawnOwnedNextStart,
  stopOwnedServer,
} from "./login-entry-process-lifecycle.mjs";
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
const BUILD_REPORT = path.join(ART, "login-entry-build-report.json");
const COMPONENT_TEST_REPORT = path.join(ART, "login-entry-component-test-report.json");

const BASE_SHA = "7376fb291ef67b6d5f763f8b3cf9917660606bfe";

function materializeNavigatorFixtureScripts() {
  const guardSrc = readFileSync(path.join(LAYOUT_ART, "disposable-db-url-guard.mjs"));
  writeFileSync(path.join(NAV, "scripts/.login-entry-disposable-db-url-guard.mjs"), guardSrc);
  writeFileSync(path.join(NAV, "scripts/.login-layout-disposable-db-url-guard.mjs"), guardSrc);
  writeFileSync(
    path.join(NAV, "scripts/.login-entry-disposable-seed.ts"),
    readFileSync(path.join(LAYOUT_ART, "seed-disposable-fixture.nav.fixture.tpl")),
  );
  writeFileSync(
    path.join(NAV, "scripts/.login-entry-disposable-cleanup.ts"),
    readFileSync(path.join(LAYOUT_ART, "cleanup-disposable-fixture.nav.fixture.tpl")),
  );
}

async function probeRuntimeBuildId(origin, buildIdHint) {
  if (buildIdHint) {
    const manifestUrl = `${origin}/_next/static/${buildIdHint}/_buildManifest.js`;
    const manifestRes = await fetch(manifestUrl, { signal: AbortSignal.timeout(20_000), redirect: "follow" });
    if (manifestRes.ok) return buildIdHint;
  }
  const res = await fetch(`${origin}/login`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/"buildId":"([^"]+)"/);
  return match?.[1] ?? null;
}

async function waitForVerifiedRuntime(origin, buildId, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const probed = await probeRuntimeBuildId(origin, buildId);
    if (probed) return probed;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function runFixtureCleanup(tag, maxId, runtimeEnv) {
  return spawnSync(
    "pnpm",
    ["exec", "tsx", path.join(NAV, "scripts/.login-entry-disposable-cleanup.ts"), tag],
    {
      cwd: NAV,
      env: {
        ...process.env,
        ...runtimeEnv,
        NODE_ENV: "development",
        LOGIN_LAYOUT_FIXTURE_MAX_ID: maxId,
      },
      encoding: "utf8",
    },
  );
}

async function bindCanonicalPlatformPort(runtimeEnv, { requireExactPort = true } = {}) {
  const appUrl = runtimeEnv?.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return { ok: false, reason: "runtime.env missing NEXT_PUBLIC_APP_URL" };
  }
  const preferredPort = parseLoopbackPortFromUrl(appUrl);
  if (preferredPort == null) {
    return { ok: false, reason: `NEXT_PUBLIC_APP_URL is not loopback: ${appUrl}` };
  }
  const resolved = await resolveLoopbackListenPort({ preferredPort, requireExactPort });
  if (!resolved.ok) return resolved;
  if (resolved.substituted && requireExactPort) {
    return {
      ok: false,
      reason: `canonical port ${preferredPort} busy; origin ${appUrl} cannot be substituted`,
    };
  }
  return {
    ok: true,
    port: resolved.port,
    appUrl,
    substituted: Boolean(resolved.substituted),
  };
}

async function startOwnedNextOnCanonicalPort(runtimeEnv, { expectedBuildId = null } = {}) {
  const appUrl = runtimeEnv?.NEXT_PUBLIC_APP_URL?.trim();
  const preferredPort = appUrl ? parseLoopbackPortFromUrl(appUrl) : null;
  if (preferredPort != null && (await isLoopbackPortOpen(preferredPort))) {
    if (expectedBuildId) {
      const probed = await probeRuntimeBuildId(appUrl, expectedBuildId);
      if (probed === expectedBuildId) {
        return {
          ok: true,
          handle: null,
          origin: appUrl,
          port: preferredPort,
          reusedExistingListener: true,
        };
      }
    }
    return {
      ok: false,
      reason: `loopback port ${preferredPort} already in use (foreign listener left intact)`,
      handle: null,
      origin: null,
      stage: "bind",
    };
  }

  const binding = await bindCanonicalPlatformPort(runtimeEnv, { requireExactPort: true });
  if (!binding.ok) {
    return { ok: false, reason: binding.reason, handle: null, origin: null, stage: "bind" };
  }
  const spawnEnv = {
    ...process.env,
    ...runtimeEnv,
    NEXT_PUBLIC_APP_URL: binding.appUrl,
    PORT: String(binding.port),
  };
  const handle = spawnOwnedNextStart({ port: binding.port, cwd: ROOT, env: spawnEnv });
  if (handle.child?.spawnError) {
    return { ok: false, reason: handle.child.spawnError.message, handle: null, origin: null };
  }
  return { ok: true, handle, origin: binding.appUrl, port: binding.port };
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
  let seedAttempted = false;
  let cleanupReport = null;
  let cleanupError = null;

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
    seedAttempted = true;
    if (seed.status !== 0 || seed.error) {
      throw new Error(`seed failed: ${seed.error?.message ?? seed.stderr ?? seed.stdout}`);
    }
    try {
      seedJson = JSON.parse(seed.stdout.trim());
    } catch (parseError) {
      throw new Error(
        `seed stdout not JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
    }

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
    await goToProviderStep(page, `${platformOrigin}/login?returnTo=/scanner`);
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

    if (
      shouldRunFixtureCleanup({
        preflightOk: true,
        fixtureTag: tag,
        seedAttempted,
      })
    ) {
      const cleanup = runFixtureCleanup(tag, maxId, runtimeEnv);
      try {
        cleanupReport = evaluateCleanupChildResult({
          status: cleanup.status,
          error: cleanup.error ?? null,
          stdout: cleanup.stdout ?? "",
          stderr: cleanup.stderr ?? "",
        });
      } catch (error) {
        cleanupError = error instanceof Error ? error : new Error(String(error));
      }
    }

    const merged = mergeDisposableErrors(failError, cleanupError);
    if (merged) throw merged;
    return { ...passPayload, cleanup: cleanupReport };
  }
}

/** Narrow regression: seed attempt + malformed stdout still runs tagged cleanup (requires disposable stack). */
async function runPartialSeedStdoutFailureCleanup(runtimeEnv) {
  materializeNavigatorFixtureScripts();
  const tag = `login-entry-partial-${Date.now()}`;
  const maxId = fixtureMaxIdForTag(tag);
  let seedAttempted = false;
  let cleanupReport = null;
  let failError = null;
  let cleanupError = null;
  try {
    const seed = spawnSync("pnpm", ["exec", "tsx", path.join(NAV, "scripts/.login-entry-disposable-seed.ts")], {
      cwd: NAV,
      env: {
        ...process.env,
        ...runtimeEnv,
        NODE_ENV: "development",
        LOGIN_LAYOUT_FIXTURE_TAG: tag,
        LOGIN_LAYOUT_FIXTURE_OTP: FIXTURE_OTP,
        LOGIN_LAYOUT_FIXTURE_MAX_ID: maxId,
      },
      encoding: "utf8",
    });
    seedAttempted = true;
    if (seed.status !== 0) throw new Error(`partial-seed expected success, got ${seed.status}`);
    throw new Error("partial-seed inject: refuse valid JSON (simulated malformed stdout handling)");
  } catch (error) {
    failError = error instanceof Error ? error : new Error(String(error));
  } finally {
    if (shouldRunFixtureCleanup({ preflightOk: true, fixtureTag: tag, seedAttempted })) {
      const cleanup = runFixtureCleanup(tag, maxId, runtimeEnv);
      try {
        cleanupReport = evaluateCleanupChildResult({
          status: cleanup.status,
          error: cleanup.error ?? null,
          stdout: cleanup.stdout ?? "",
          stderr: cleanup.stderr ?? "",
        });
      } catch (error) {
        cleanupError = error instanceof Error ? error : new Error(String(error));
      }
    }
    if (cleanupError) throw cleanupError;
  }
  if (
    !cleanupReport?.remaining ||
    Object.values(cleanupReport.remaining).some((v) => v !== 0)
  ) {
    throw mergeDisposableErrors(failError, new Error("partial-seed cleanup remaining not 4×0"));
  }
  return {
    tag,
    maxId,
    cleanup: cleanupReport,
    partialSeedRegression: true,
    simulatedPrimaryError: failError?.message ?? null,
  };
}

function loadJsonReport(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

async function main() {
  delete process.env.R06_NEXT_DIST_DIR;
  const finalSmoke = process.argv.includes("--final-smoke-01-3");
  if (finalSmoke) {
    process.env.LOGIN_ENTRY_SKIP_CAPTURE = "1";
    process.env.LOGIN_ENTRY_SKIP_DISPOSABLE = "0";
    process.env.LOGIN_ENTRY_SKIP_HARNESS = "0";
    delete process.env.LOGIN_ENTRY_SKIP_COMPONENT_TESTS;
    process.env.LOGIN_ENTRY_ACCEPTANCE_ONLY = "1";
  }

  const runnerSha = gitSha(ROOT);
  const navigatorSha = existsSync(NAV) ? gitSha(NAV) : null;
  const runtimeEnv = loadEnvFile(RUNTIME_ENV) ?? {};
  const disposableResolved = existsSync(RUNTIME_ENV)
    ? resolveDisposableDatabaseEnv(runtimeEnv)
    : { ok: false, reason: "runtime.env missing" };

  if (process.argv.includes("--build-only")) {
    const buildOnly = runBuild(runnerSha);
    writeFileSync(
      BUILD_REPORT,
      `${JSON.stringify({ ...buildOnly, recordedAt: new Date().toISOString() }, null, 2)}\n`,
    );
    process.exit(buildOnly.exitCode === 0 ? 0 : 1);
  }

  if (process.argv.includes("--partial-seed-only")) {
    if (!disposableResolved.ok) {
      console.error(JSON.stringify({ status: "NOT_VERIFIED", reason: disposableResolved.reason }));
      process.exit(1);
    }
    try {
      const partial = await runPartialSeedStdoutFailureCleanup(runtimeEnv);
      console.log(JSON.stringify({ status: "PASS", ...partial }, null, 2));
      process.exit(0);
    } catch (error) {
      console.error(
        JSON.stringify(
          { status: "FAIL", error: error instanceof Error ? error.message : String(error) },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  }

  if (process.argv.includes("--disposable-chain-only")) {
    if (!disposableResolved.ok) {
      console.error(JSON.stringify({ status: "NOT_VERIFIED", reason: disposableResolved.reason }));
      process.exit(1);
    }
    let exitCode = 1;
    let owned = null;
    let chainOrigin = null;
    try {
      const started = await startOwnedNextOnCanonicalPort(runtimeEnv);
      if (!started.ok) {
        console.error(JSON.stringify({ status: "NOT_VERIFIED", stage: "bind", reason: started.reason }));
        exitCode = 1;
      } else {
        owned = started.handle;
        chainOrigin = started.origin;
        await waitForHttp(`${chainOrigin}/login`);
        const chainResult = await runDisposableChain(chainOrigin, runtimeEnv);
        console.log(JSON.stringify({ status: "PASS", origin: chainOrigin, ...chainResult }, null, 2));
        exitCode = 0;
      }
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            status: "FAIL",
            origin: chainOrigin,
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      );
      exitCode = 1;
    } finally {
      if (owned) await stopOwnedServer(owned);
      process.exit(exitCode);
    }
  }

  const productPinSha = LOGIN_ENTRY_PRODUCT_PIN_SHA;
  const acceptancePinned =
    process.env.LOGIN_ENTRY_ACCEPTANCE_ONLY === "1" || process.argv.includes("--final-smoke-01-3");

  let componentTest;
  if (process.env.LOGIN_ENTRY_SKIP_COMPONENT_TESTS === "1") {
    const prior = loadJsonReport(COMPONENT_TEST_REPORT);
    const importCheck = validateImportedComponentReport(prior, productPinSha, runnerSha, ROOT);
    componentTest = importCheck.ok
      ? { status: 0, ...prior, imported: true, importValid: true }
      : {
          status: 1,
          imported: true,
          importValid: false,
          importReason: importCheck.reason,
          exitCode: prior?.exitCode ?? null,
        };
  } else {
    componentTest = spawnSync(
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
    writeFileSync(
      COMPONENT_TEST_REPORT,
      `${JSON.stringify({ ...spawnResultRecord(componentTest), recordedAt: new Date().toISOString(), sourceSha: runnerSha }, null, 2)}\n`,
    );
  }

  const harnessUnit =
    process.env.LOGIN_ENTRY_SKIP_HARNESS === "1"
      ? {
          status: null,
          skipped: true,
          reason: "LOGIN_ENTRY_SKIP_HARNESS=1",
          stdout: "",
          stderr: "",
        }
      : spawnSync(
          "node",
          [
            "--test",
            path.join(ART, "login-entry-smoke-harness.test.mjs"),
            path.join(ART, "login-entry-process-lifecycle.test.mjs"),
          ],
          { cwd: ROOT, encoding: "utf8" },
        );

  let build;
  if (acceptancePinned) {
    build = loadJsonReport(BUILD_REPORT);
    if (!build) {
      throw new Error("login-entry-build-report.json missing for pinned acceptance");
    }
    build = { ...build, acceptanceOnly: true, imported: true };
  } else {
    build = runBuild(runnerSha);
    writeFileSync(
      BUILD_REPORT,
      `${JSON.stringify({ ...build, recordedAt: new Date().toISOString() }, null, 2)}\n`,
    );
  }

  const buildVerifiedResult = acceptancePinned
    ? evaluatePinnedBuildForSmoke(build, { productPinSha, runnerSha, cwd: ROOT })
    : evaluateBuildVerified(build);

  let implOrigin = null;
  let ownedImpl = null;

  let runtimePin = null;
  let captureResult = null;
  let disposableResult = { status: "NOT_VERIFIED", reason: disposableResolved.ok ? "not run" : disposableResolved.reason };
  let partialSeedResult = { status: "NOT_VERIFIED", reason: "not run" };
  let smokeError = null;
  let disposableStage = "not_started";

  let refServer = null;
  let probedBuildId = null;
  try {
    if (buildVerifiedResult.ok) {
      const started = await startOwnedNextOnCanonicalPort(runtimeEnv, { expectedBuildId: build.BUILD_ID });
      if (!started.ok) {
        runtimePin = {
          verified: false,
          mode: "spawned-next-start",
          reason: started.reason,
          stage: started.stage ?? "bind",
        };
        smokeError = started.reason;
      } else {
        ownedImpl = started.handle;
        implOrigin = started.origin;
        await waitForHttp(`${implOrigin}/login`);
        probedBuildId = await waitForVerifiedRuntime(implOrigin, build.BUILD_ID);
        runtimePin = evaluateRuntimePin({
          mode: started.reusedExistingListener ? "existing-canonical-listener" : "spawned-next-start",
          runnerSha: productPinSha,
          build,
          probedBuildId,
          origin: implOrigin,
        });
        if (started.reusedExistingListener) {
          runtimePin.reusedExistingListener = true;
        }
      }
      if (!runtimePin.verified) {
        runtimePin = {
          ...runtimePin,
          probedBuildId,
          expectedBuildId: build.BUILD_ID,
          origin: implOrigin,
        };
      }
    } else {
      runtimePin = {
        mode: "none",
        verified: false,
        reason: buildVerifiedResult.reason,
        probedBuildId: null,
      };
    }

    let refOrigin = null;
    if (process.env.LOGIN_ENTRY_SKIP_CAPTURE !== "1" && runtimePin?.verified) {
      refServer = spawn("npx", ["--yes", "serve", REF_UNPACK, "-l", "3098"], { stdio: "ignore" });
      await waitForHttp("http://127.0.0.1:3098/roles.html");
      refOrigin = "http://127.0.0.1:3098";
    }

    if (process.env.LOGIN_ENTRY_SKIP_CAPTURE !== "1" && runtimePin?.verified && refOrigin) {
      const defaultTargets =
        "provider:375:dark,provider:320:dark,provider:375:light,provider:320:light,admin-modal:320:dark,admin-modal:320:light,admin-modal:375:light";
      const targetSpec = process.env.LOGIN_ENTRY_CAPTURE_TARGETS?.trim() || defaultTargets;
      const targets = parseCaptureTargetSpec(targetSpec);
      const browser = await chromium.launch({ headless: true });
      try {
        captureResult = await captureLoginEntryTargets({
          browser,
          refOrigin,
          implOrigin,
          shotsDir: SHOTS,
          targets,
        });
        captureResult.targetSpec = targetSpec;
      } catch (captureError) {
        smokeError = captureError instanceof Error ? captureError.message : String(captureError);
        captureResult = { status: "FAIL", error: smokeError };
      } finally {
        await browser.close();
      }
    }

    if (
      process.env.LOGIN_ENTRY_SKIP_DISPOSABLE !== "1" &&
      disposableResolved.ok &&
      runtimePin?.verified
    ) {
      try {
        disposableStage = "disposable_chain";
        disposableResult = { status: "PASS", ...(await runDisposableChain(implOrigin, runtimeEnv)) };
      } catch (error) {
        disposableResult = {
          status: "FAIL",
          stage: disposableStage,
          error: error instanceof Error ? error.message : String(error),
        };
        smokeError = disposableResult.error;
      }
      if (process.env.LOGIN_ENTRY_PARTIAL_SEED_REGRESSION === "1") {
        try {
          partialSeedResult = {
            status: "PASS",
            ...(await runPartialSeedStdoutFailureCleanup(runtimeEnv)),
          };
        } catch (error) {
          partialSeedResult = {
            status: "FAIL",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    } else if (!disposableResolved.ok) {
      disposableResult = { status: "NOT_VERIFIED", reason: disposableResolved.reason };
      partialSeedResult = { status: "NOT_VERIFIED", reason: disposableResolved.reason };
    } else if (
      process.env.LOGIN_ENTRY_SKIP_DISPOSABLE === "1" &&
      process.env.LOGIN_ENTRY_PARTIAL_SEED_REGRESSION === "1"
    ) {
      disposableResult = {
        status: "NOT_VERIFIED",
        reason: "skipped (LOGIN_ENTRY_SKIP_DISPOSABLE=1); full chain not re-run in this invocation",
      };
      try {
        partialSeedResult = {
          status: "PASS",
          ...(await runPartialSeedStdoutFailureCleanup(runtimeEnv)),
        };
      } catch (error) {
        partialSeedResult = {
          status: "FAIL",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  } catch (error) {
    smokeError = error instanceof Error ? error.message : String(error);
    if (disposableResult.status === "NOT_VERIFIED" && disposableResult.reason === "not run") {
      disposableResult = { status: "NOT_VERIFIED", reason: `smoke aborted: ${smokeError}` };
    }
  } finally {
    if (ownedImpl) await stopOwnedServer(ownedImpl);
    refServer?.kill("SIGTERM");
  }

  const unitGates = evaluateMandatoryUnitGates({
    authComponents: componentTest,
    harnessUnit,
  });
  const componentTestsOk = unitGates.componentTestsOk;
  const runtimeVerified = Boolean(runtimePin?.verified);
  const buildVerified = buildVerifiedResult.ok;
  const captureOk =
    process.env.LOGIN_ENTRY_SKIP_CAPTURE === "1" ||
    (captureResult?.pairCount > 0 && !captureResult?.error);
  const disposableOk = disposableResult.status === "PASS";
  const smokeOk = finalSmoke ? disposableOk : disposableOk && captureOk;
  const cleanupOk = disposableResult.cleanup?.remaining
    ? Object.values(disposableResult.cleanup.remaining).every((v) => v === 0)
    : disposableOk;

  const evidence = {
    status: deriveAcceptanceStatus({
      componentTestsOk,
      smokeOk,
      cleanupOk,
      buildVerified,
      runtimeVerified,
      disposableRequired: true,
    }),
    task: finalSmoke ? "LOGIN-ENTRY-PROTOTYPE-01.3" : "LOGIN-ENTRY-PROTOTYPE-01.2",
    baseSha: BASE_SHA,
    codeSha: productPinSha,
    runnerSha,
    artifactTipSha: runnerSha,
    productPinSha,
    navigatorSha,
    referencePackageCommit: "9bc52fb9152293e992e98dc50804a660cef10733",
    referenceArchiveSha256: "382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d",
    productionBuild: {
      ...(build.skipped ? build : { ...build, logFile: path.relative(ROOT, BUILD_LOG) }),
      verified: buildVerified,
      verifyReason: buildVerified ? null : buildVerifiedResult.reason,
      pinMode: buildVerifiedResult.mode ?? null,
    },
    runtimePin,
    tests: {
      authComponents: {
        command:
          "NODE_ENV=test npx vitest run src/components/auth/AuthFlow.test.tsx src/components/auth/LoginExperience.test.tsx src/components/auth/AdminLoginModal.test.tsx",
        ...spawnResultRecord(componentTest),
        evaluation: unitGates.auth,
      },
      harnessUnit: {
        command: `node --test ${path.relative(ROOT, path.join(ART, "login-entry-smoke-harness.test.mjs"))} ${path.relative(ROOT, path.join(ART, "login-entry-process-lifecycle.test.mjs"))}`,
        ...spawnResultRecord(harnessUnit),
        evaluation: unitGates.harness,
      },
      disposableLogin: { ...disposableResult, stage: disposableResult.stage ?? disposableStage },
      partialSeedCleanup: partialSeedResult,
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
    !buildVerified ||
    !runtimeVerified ||
    disposableResult.status === "FAIL" ||
    (finalSmoke && disposableResult.status !== "PASS") ||
    partialSeedResult.status === "FAIL";
  if (exitFail) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
