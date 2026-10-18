import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveAcceptanceStatus,
  fixtureMaxIdForTag,
  resolveDisposableDatabaseEnv,
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

  it("does not mark READY when smoke or cleanup fails", () => {
    assert.equal(
      deriveAcceptanceStatus({
        componentTestsOk: true,
        smokeOk: false,
        cleanupOk: true,
        buildRecorded: true,
        runtimeVerified: true,
      }),
      "NOT_VERIFIED",
    );
    assert.equal(
      deriveAcceptanceStatus({
        componentTestsOk: true,
        smokeOk: true,
        cleanupOk: false,
        buildRecorded: true,
        runtimeVerified: true,
      }),
      "NOT_VERIFIED",
    );
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
