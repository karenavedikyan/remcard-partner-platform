import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCleanupRemainingZero,
  evaluateCleanupChildResult,
} from "./login-layout-cleanup-orchestration.mjs";

const VALID_REMAINING = {
  users: 0,
  authAccounts: 0,
  consents: 0,
  botLoginCodes: 0,
};

function okStdout(remaining = VALID_REMAINING) {
  return `${JSON.stringify({ mock: true, tag: "ll01-unit", remaining })}\n`;
}

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

  it("rejects empty stdout", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 0,
          stdout: "",
          stderr: "",
        }),
      /stdout empty/,
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

  it("rejects empty JSON object without remaining", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 0,
          stdout: "{}\n",
          stderr: "",
        }),
      /remaining must be an object|missing required field/,
    );
  });

  it("rejects empty remaining object (missing required fields)", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 0,
          stdout: okStdout({}),
          stderr: "",
        }),
      /missing required field/,
    );
  });

  it("rejects null remaining", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 0,
          stdout: `${JSON.stringify({ mock: true, remaining: null })}\n`,
          stderr: "",
        }),
      /remaining must be an object/,
    );
  });

  it("rejects string counter values", () => {
    assert.throws(
      () => assertCleanupRemainingZero({ ...VALID_REMAINING, users: "0" }),
      /users must be a number/,
    );
  });

  it("rejects negative counters", () => {
    assert.throws(
      () => assertCleanupRemainingZero({ ...VALID_REMAINING, consents: -1 }),
      /consents must be exactly 0/,
    );
  });

  it("rejects fractional counters", () => {
    assert.throws(
      () => assertCleanupRemainingZero({ ...VALID_REMAINING, botLoginCodes: 0.5 }),
      /botLoginCodes must be an integer/,
    );
  });

  it("rejects nonzero counters", () => {
    assert.throws(
      () =>
        evaluateCleanupChildResult({
          status: 0,
          stdout: okStdout({ ...VALID_REMAINING, users: 2 }),
          stderr: "",
        }),
      /users must be exactly 0/,
    );
  });

  it("rejects mutual compensation -1/+1 (each field checked, not summed)", () => {
    assert.throws(
      () =>
        assertCleanupRemainingZero({
          users: -1,
          authAccounts: 1,
          consents: 0,
          botLoginCodes: 0,
        }),
      /users must be exactly 0|authAccounts must be exactly 0/,
    );
  });

  it("accepts valid zero-remaining report with all four fields", () => {
    const report = evaluateCleanupChildResult({
      status: 0,
      stdout: okStdout(),
      stderr: "",
    });
    assert.deepEqual(report.remaining, VALID_REMAINING);
  });
});
