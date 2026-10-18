import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveAcceptanceStatus,
  evaluateBuildVerified,
  evaluateHarnessUnitRecord,
  evaluateMandatoryUnitGates,
  evaluatePinnedBuildForSmoke,
  evaluateRuntimePin,
  fixtureMaxIdForTag,
  isFullGitSha,
  LOGIN_ENTRY_PRODUCT_PIN_SHA,
  mergeDisposableErrors,
  resolveDisposableDatabaseEnv,
  shouldRunFixtureCleanup,
} from "./login-entry-smoke-harness.mjs";
import { evaluateCleanupChildResult } from "../remcard-login-layout-01/login-layout-cleanup-orchestration.mjs";

describe("login-entry smoke harness", () => {
  it("derives unique maxId per tag", () => {
    const a = fixtureMaxIdForTag("login-entry-a");
    const b = fixtureMaxIdForTag("login-entry-b");
    assert.notEqual(a, b);
    assert.match(a, /^881\d{9}$/);
  });

  it("rejects non-loopback DATABASE_URL", () => {
    const r = resolveDisposableDatabaseEnv({ DATABASE_URL: "postgresql://u:p@example.com/db" });
    assert.equal(r.ok, false);
  });

  it("requires full git SHA for runtime/build verification", () => {
    assert.equal(isFullGitSha("98f0526"), false);
    assert.equal(isFullGitSha("98f052665ac68221990aa08af1b093b63f445967"), true);
  });

  it("rejects imported BUILD_ID as buildVerified", () => {
    const r = evaluateBuildVerified({
      imported: true,
      skipped: true,
      BUILD_ID: "stale",
      exitCode: null,
      sourceSha: "98f052665ac68221990aa08af1b093b63f445967",
    });
    assert.equal(r.ok, false);
  });

  it("rejects failed build for buildVerified", () => {
    const r = evaluateBuildVerified({
      command: "npm run build",
      BUILD_ID: "abc",
      exitCode: 1,
      sourceSha: "98f052665ac68221990aa08af1b093b63f445967",
    });
    assert.equal(r.ok, false);
  });

  it("does not mark READY without verified build/runtime", () => {
    assert.equal(
      deriveAcceptanceStatus({
        componentTestsOk: true,
        smokeOk: true,
        cleanupOk: true,
        buildVerified: false,
        runtimeVerified: true,
      }),
      "NOT_VERIFIED",
    );
    assert.equal(
      deriveAcceptanceStatus({
        componentTestsOk: true,
        smokeOk: true,
        cleanupOk: true,
        buildVerified: true,
        runtimeVerified: false,
      }),
      "NOT_VERIFIED",
    );
  });

  it("rejects runtime pin when probed BUILD_ID mismatches", () => {
    const build = {
      command: "npm run build",
      BUILD_ID: "fresh-id",
      exitCode: 0,
      sourceSha: "98f052665ac68221990aa08af1b093b63f445967",
    };
    const pin = evaluateRuntimePin({
      mode: "spawned-next-start",
      runnerSha: "98f052665ac68221990aa08af1b093b63f445967",
      build,
      probedBuildId: "stale-id",
      origin: "http://127.0.0.1:3099",
    });
    assert.equal(pin.verified, false);
  });

  it("accepts runtime pin when BUILD_ID matches probed value", () => {
    const build = {
      command: "npm run build",
      BUILD_ID: "fresh-id",
      exitCode: 0,
      sourceSha: "98f052665ac68221990aa08af1b093b63f445967",
    };
    const pin = evaluateRuntimePin({
      mode: "spawned-next-start",
      runnerSha: "98f052665ac68221990aa08af1b093b63f445967",
      build,
      probedBuildId: "fresh-id",
      origin: "http://127.0.0.1:3099",
    });
    assert.equal(pin.verified, true);
  });

  it("runs fixture cleanup after seed attempt even before UI chain", () => {
    assert.equal(
      shouldRunFixtureCleanup({ preflightOk: true, fixtureTag: "t1", seedAttempted: true }),
      true,
    );
    assert.equal(
      shouldRunFixtureCleanup({ preflightOk: true, fixtureTag: "t1", seedAttempted: false }),
      false,
    );
  });

  it("merges primary and cleanup failures", () => {
    const merged = mergeDisposableErrors(new Error("seed stdout not JSON"), new Error("cleanup exit 2"));
    assert.match(merged.message, /seed stdout not JSON/);
    assert.match(merged.message, /cleanup:/);
  });

  it("treats skipped harness as NOT_RUN and blocks READY", () => {
    const harness = evaluateHarnessUnitRecord({ skipped: true, reason: "LOGIN_ENTRY_SKIP_HARNESS=1" });
    assert.equal(harness.status, "NOT_RUN");
    assert.equal(harness.ok, false);
    const gates = evaluateMandatoryUnitGates({
      authComponents: { status: 0 },
      harnessUnit: { skipped: true, reason: "LOGIN_ENTRY_SKIP_HARNESS=1" },
    });
    assert.equal(gates.componentTestsOk, false);
    assert.equal(
      deriveAcceptanceStatus({
        componentTestsOk: gates.componentTestsOk,
        smokeOk: true,
        cleanupOk: true,
        buildVerified: true,
        runtimeVerified: true,
      }),
      "NOT_VERIFIED",
    );
  });

  it("accepts pinned build report for product SHA with runner-only artifact delta", () => {
    const build = {
      command: "env -u R06_NEXT_DIST_DIR npm run build",
      sourceSha: LOGIN_ENTRY_PRODUCT_PIN_SHA,
      BUILD_ID: "3s5GChbiF3dko8oGKSYlA",
      exitCode: 0,
    };
    const r = evaluatePinnedBuildForSmoke(build, {
      productPinSha: LOGIN_ENTRY_PRODUCT_PIN_SHA,
      runnerSha: LOGIN_ENTRY_PRODUCT_PIN_SHA,
    });
    assert.equal(r.ok, true);
  });

  it("rejects cleanup remaining object coercion", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 0,
          stdout: `${JSON.stringify({ remaining: { users: 0, authAccounts: 0, consents: 0, botLoginCodes: 1 } })}\n`,
        }),
      /botLoginCodes must be exactly 0/,
    );
  });
});
