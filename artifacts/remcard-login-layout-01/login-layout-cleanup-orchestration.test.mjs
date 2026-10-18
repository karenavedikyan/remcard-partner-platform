import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateCleanupChildResult } from "./login-layout-cleanup-orchestration.mjs";

describe("login-layout cleanup orchestration (no DB)", () => {
  it("rejects non-zero child exit", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 3,
          stderr: "cleanup: injected failure (LOGIN_LAYOUT_CLEANUP_INJECT_FAIL)",
          stdout: "",
        }),
      /cleanup exit 3/,
    );
  });

  it("rejects spawn error", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: null,
          error: new Error("ENOENT"),
          stdout: "",
          stderr: "",
        }),
      /cleanup spawn error/,
    );
  });

  it("rejects malformed JSON stdout", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 0,
          stdout: "not-json",
          stderr: "",
        }),
      /did not emit JSON report/,
    );
  });

  it("rejects remaining fixture rows", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 0,
          stdout: JSON.stringify({
            mock: true,
            remaining: { users: 1, authAccounts: 0, consents: 0, botLoginCodes: 0 },
          }),
          stderr: "",
        }),
      /remaining fixture rows/,
    );
  });

  it("accepts valid zero-remaining report", () => {
    const report = evaluateCleanupChildResult({
      status: 0,
      stdout: `${JSON.stringify({
        mock: true,
        tag: "ll01-unit",
        deleted: { users: 1, authAccounts: 1, consents: 2, botLoginCodes: 1 },
        remaining: { users: 0, authAccounts: 0, consents: 0, botLoginCodes: 0 },
      })}\n`,
      stderr: "",
    });
    assert.equal(report.remaining.users, 0);
  });
});
