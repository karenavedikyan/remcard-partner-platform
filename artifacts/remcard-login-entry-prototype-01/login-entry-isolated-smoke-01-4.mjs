#!/usr/bin/env node
/**
 * LOGIN-ENTRY-PROTOTYPE-01.4 — one isolated disposable browser smoke (own run dir / ports / dist).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  evaluateCleanupChildResult,
  evaluateMandatoryUnitGates,
  evaluatePinnedBuildForSmoke,
  evaluateRuntimePin,
  gitSha,
  isRunnerOnlyFollowup,
  LOGIN_ENTRY_PRODUCT_PIN_SHA,
  mergeDisposableErrors,
  spawnResultRecord,
} from "./login-entry-smoke-harness.mjs";
import { assertDisposableDatabaseUrl } from "../remcard-login-layout-01/disposable-db-url-guard.mjs";
import {
  findFreeLoopbackPort,
  isLoopbackPortOpen,
  parseLoopbackPortFromUrl,
  spawnOwnedNextStart,
  stopOwnedServer,
} from "./login-entry-process-lifecycle.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NAV = path.resolve(ROOT, "../remcard-navigator");
const ART = __dirname;
const SOURCE_RUNTIME_ENV = process.env.LOGIN_ENTRY_SOURCE_RUNTIME_ENV || "/tmp/admin-test-local-stack/runtime.env";
const PROTECTED_FOREIGN_PORT = 3040;
const PREFERRED_PLATFORM_BASE = 30550;
const BUILD_LOG = path.join(ART, "login-entry-build.log");
const BUILD_REPORT = path.join(ART, "login-entry-build-report.json");
const EVIDENCE = path.join(ART, "login-entry-prototype-01-evidence.json");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return null;
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

async function waitForHttp(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function preflightReadonly({ runDir, sourceEnv, backendPort, platformPort, runnerSha }) {
  const blockers = [];
  const notes = {};

  notes.foreignPort3040 = (await isLoopbackPortOpen(PROTECTED_FOREIGN_PORT))
    ? "in_use_untouched"
    : "free_untouched";

  if (!(await isLoopbackPortOpen(backendPort))) {
    blockers.push(`backend loopback port ${backendPort} not listening (reuse rejected)`);
  } else {
    try {
      const health = await fetch(`http://127.0.0.1:${backendPort}/api/health`, {
        signal: AbortSignal.timeout(8_000),
      });
      notes.backendHealthStatus = health.status;
      if (!health.ok) blockers.push(`backend health HTTP ${health.status}`);
    } catch (error) {
      blockers.push(`backend health unreachable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (await isLoopbackPortOpen(platformPort)) {
    blockers.push(`chosen platform port ${platformPort} already in use`);
  }

  const dbUrl = sourceEnv.DATABASE_URL;
  if (!dbUrl) {
    blockers.push("source runtime.env missing DATABASE_URL");
  } else {
    try {
      const guard = assertDisposableDatabaseUrl(dbUrl, { label: "DATABASE_URL" });
      notes.disposableDbSummary = guard.safeSummary;
    } catch (error) {
      blockers.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (runnerSha !== LOGIN_ENTRY_PRODUCT_PIN_SHA && !isRunnerOnlyFollowup(LOGIN_ENTRY_PRODUCT_PIN_SHA, runnerSha, ROOT)) {
    blockers.push("product tree differs from UI pin 5cb765b beyond login-entry artifacts");
  }

  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    path.join(runDir, "preflight.json"),
    `${JSON.stringify({ ok: blockers.length === 0, blockers, notes, runDir, platformPort, backendPort }, null, 2)}\n`,
  );

  return { ok: blockers.length === 0, blockers, notes };
}

function runIsolatedProductionBuild({ distDir, appOrigin, backendOrigin, productPinSha }) {
  const cmd =
    "env -u R06_NEXT_DIST_DIR LOGIN_ENTRY_NEXT_DIST_DIR=${LOGIN_ENTRY_NEXT_DIST_DIR} NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} REMCARD_API_BASE_URL=${REMCARD_API_BASE_URL} npm run build";
  const r = spawnSync(
    "bash",
    ["-lc", cmd],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: "production",
        LOGIN_ENTRY_NEXT_DIST_DIR: distDir,
        NEXT_PUBLIC_APP_URL: appOrigin,
        REMCARD_API_BASE_URL: backendOrigin,
      },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  writeFileSync(BUILD_LOG, `${r.stdout ?? ""}\n${r.stderr ?? ""}`);
  const buildIdPath = path.join(ROOT, distDir, "BUILD_ID");
  const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : null;
  return {
    command: cmd,
    sourceSha: productPinSha,
    builtCheckoutSha: gitSha(ROOT),
    BUILD_ID: buildId,
    distDir,
    nextPublicAppUrl: appOrigin,
    remcardApiBaseUrl: backendOrigin,
    ...spawnResultRecord(r),
  };
}

export async function runIsolatedSmoke014() {
  const runId = process.env.LOGIN_ENTRY_RUN_ID || `login-entry-01-4-${Date.now()}`;
  const runDir = process.env.LOGIN_ENTRY_RUN_DIR || path.join("/tmp", runId);
  const runnerSha = gitSha(ROOT);
  const navigatorSha = existsSync(NAV) ? gitSha(NAV) : null;
  const productPinSha = LOGIN_ENTRY_PRODUCT_PIN_SHA;

  const sourceEnv = loadEnvFile(SOURCE_RUNTIME_ENV);
  if (!sourceEnv) {
    console.error(JSON.stringify({ status: "NOT_VERIFIED", stage: "preflight", reason: "source runtime.env missing" }));
    return 1;
  }

  const backendPort =
    parseLoopbackPortFromUrl(sourceEnv.REMCARD_API_BASE_URL || "") ??
    Number(sourceEnv.ADMIN_TEST_BACKEND_PORT || 3041);
  let platformPort = Number(process.env.LOGIN_ENTRY_PLATFORM_PORT || 0);
  if (!platformPort) {
    platformPort = (await findFreeLoopbackPort(PREFERRED_PLATFORM_BASE, { maxScan: 32 })) ?? 0;
  }
  if (!platformPort) {
    console.error(JSON.stringify({ status: "NOT_VERIFIED", stage: "preflight", reason: "no free platform port" }));
    return 1;
  }

  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const backendOrigin = `http://127.0.0.1:${backendPort}`;
  const distDirRelative =
    process.env.LOGIN_ENTRY_NEXT_DIST_DIR ||
    `.next-login-entry-${String(Date.now()).slice(-8)}`;

  const preflight = await preflightReadonly({
    runDir,
    sourceEnv,
    backendPort,
    platformPort,
    runnerSha,
  });

  let owned = null;
  let disposableResult = { status: "NOT_STARTED", reason: "preflight blocked" };
  let cleanupReport = null;
  let smokeError = null;
  let build = null;
  let runtimePin = null;
  let browserAttemptCount = 0;
  let exitCode = 1;

  const runtimeEnv = {
    ...sourceEnv,
    DATABASE_URL: sourceEnv.DATABASE_URL,
    DIRECT_URL: sourceEnv.DIRECT_URL ?? sourceEnv.DATABASE_URL,
    JWT_SECRET: sourceEnv.JWT_SECRET,
    REMCARD_API_BASE_URL: backendOrigin,
    NEXT_PUBLIC_APP_URL: appOrigin,
  };

  try {
    if (!preflight.ok) {
      smokeError = preflight.blockers.join("; ");
      disposableResult = { status: "NOT_STARTED", stage: "preflight", reason: smokeError };
      return 1;
    }

    build = runIsolatedProductionBuild({
      distDir: distDirRelative,
      appOrigin,
      backendOrigin,
      productPinSha,
    });
    writeFileSync(BUILD_REPORT, `${JSON.stringify({ ...build, recordedAt: new Date().toISOString() }, null, 2)}\n`);

    const buildPin = evaluatePinnedBuildForSmoke(build, { productPinSha, runnerSha, cwd: ROOT });
    if (!buildPin.ok || build.exitCode !== 0 || !build.BUILD_ID) {
      smokeError = buildPin.reason ?? `build failed exit ${build.exitCode}`;
      disposableResult = { status: "NOT_STARTED", stage: "build", reason: smokeError };
      return 1;
    }

    const spawnEnv = {
      ...process.env,
      ...runtimeEnv,
      LOGIN_ENTRY_NEXT_DIST_DIR: distDirRelative,
      NODE_ENV: "production",
      PORT: String(platformPort),
    };
    owned = spawnOwnedNextStart({ port: platformPort, cwd: ROOT, env: spawnEnv });
    if (!(await waitForHttp(`${appOrigin}/login`))) {
      smokeError = "platform /login timeout";
      disposableResult = { status: "NOT_STARTED", stage: "runtime", reason: smokeError };
      return 1;
    }

    const probedBuildId = await probeRuntimeBuildId(appOrigin, build.BUILD_ID);
    runtimePin = evaluateRuntimePin({
      mode: "spawned-next-start",
      runnerSha: productPinSha,
      build,
      probedBuildId,
      origin: appOrigin,
    });
    if (!runtimePin.verified) {
      smokeError = runtimePin.reason ?? "runtime BUILD_ID probe failed";
      disposableResult = { status: "NOT_STARTED", stage: "runtime_probe", reason: smokeError };
      return 1;
    }

    const authComponents = spawnSync(
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
    const harnessUnit = spawnSync(
      "node",
      [
        "--test",
        path.join(ART, "login-entry-smoke-harness.test.mjs"),
        path.join(ART, "login-entry-process-lifecycle.test.mjs"),
      ],
      { cwd: ROOT, encoding: "utf8" },
    );
    const unitGates = evaluateMandatoryUnitGates({
      authComponents,
      harnessUnit,
    });
    if (!unitGates.componentTestsOk) {
      smokeError = "harness unit gate failed before browser smoke";
      disposableResult = { status: "NOT_STARTED", stage: "harness", reason: smokeError };
      return 1;
    }

    browserAttemptCount = 1;
    const { runDisposableChain } = await import("./run-entry-prototype-smoke.mjs");
    try {
      disposableResult = { status: "PASS", ...(await runDisposableChain(appOrigin, runtimeEnv)) };
      cleanupReport = disposableResult.cleanup ?? null;
      exitCode = 0;
    } catch (error) {
      smokeError = error instanceof Error ? error.message : String(error);
      disposableResult = { status: "FAIL", stage: "disposable_chain", error: smokeError, browserAttemptCount: 1 };
      exitCode = 1;
    }
  } catch (unexpected) {
    smokeError = smokeError ?? (unexpected instanceof Error ? unexpected.message : String(unexpected));
    disposableResult = {
      status: disposableResult.status === "NOT_STARTED" ? "NOT_STARTED" : disposableResult.status,
      stage: disposableResult.stage ?? "runner",
      reason: smokeError,
      browserAttemptCount,
    };
    exitCode = 1;
  } finally {
    if (owned) await stopOwnedServer(owned);
    const foreign3040Still = await isLoopbackPortOpen(PROTECTED_FOREIGN_PORT);
    let evidenceStatus = "NOT_VERIFIED";
    if (
      exitCode === 0 &&
      disposableResult.status === "PASS" &&
      cleanupReport?.remaining &&
      Object.values(cleanupReport.remaining).every((v) => v === 0) &&
      runtimePin?.verified
    ) {
      evidenceStatus = "SMOKE_CHAIN_PASS_NOT_GO";
    }

    const evidence = {
      status: evidenceStatus,
      task: "LOGIN-ENTRY-PROTOTYPE-01.4",
      runId,
      runDir,
      codeSha: productPinSha,
      productPinSha,
      runnerSha,
      builtCheckoutSha: build?.builtCheckoutSha ?? runnerSha,
      artifactTipSha: runnerSha,
      navigatorSha,
      protectedForeignPort3040: foreign3040Still ? "still_in_use_untouched" : "unchanged_check",
      preflight: preflight.ok ? { ok: true, notes: preflight.notes } : { ok: false, blockers: preflight.blockers },
      productionBuild: build
        ? {
            ...build,
            verified: Boolean(build.exitCode === 0 && build.BUILD_ID),
            logFile: path.relative(ROOT, BUILD_LOG),
            pinMode: "isolated-01-4-single-build",
          }
        : null,
      runtimePin,
      disposableLogin: {
        ...disposableResult,
        browserAttemptCount,
        cleanup: cleanupReport ?? disposableResult.cleanup ?? null,
      },
      smokeError,
      attemptCount: { browser: browserAttemptCount, build: 1 },
      notPublished: true,
      notMerged: true,
      noGoUntilIndependentReview: true,
    };
    if (
      exitCode === 0 &&
      disposableResult.status === "PASS" &&
      cleanupReport?.remaining &&
      Object.values(cleanupReport.remaining).every((v) => v === 0) &&
      runtimePin?.verified
    ) {
      evidence.status = "SMOKE_CHAIN_PASS_NOT_GO";
    }
    writeFileSync(EVIDENCE, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify(evidence, null, 2));
  }

  return exitCode;
}
