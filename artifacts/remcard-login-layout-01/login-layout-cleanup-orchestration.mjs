/**
 * Harness-side cleanup result evaluation (no DB). Shared with unit regression tests.
 */

const REMAINING_KEYS = ["users", "authAccounts", "consents", "botLoginCodes"];

/**
 * @param {unknown} value
 * @param {string} field
 */
function assertRemainingCountZero(value, field) {
  if (typeof value !== "number") {
    throw new Error(`cleanup remaining.${field} must be a number`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`cleanup remaining.${field} must be finite`);
  }
  if (!Number.isInteger(value)) {
    throw new Error(`cleanup remaining.${field} must be an integer`);
  }
  if (value !== 0) {
    throw new Error(`cleanup remaining.${field} must be exactly 0, got ${value}`);
  }
}

/** @param {unknown} remaining */
export function assertCleanupRemainingZero(remaining) {
  if (remaining === null || typeof remaining !== "object" || Array.isArray(remaining)) {
    throw new Error("cleanup remaining must be an object");
  }
  for (const key of REMAINING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(remaining, key)) {
      throw new Error(`cleanup remaining missing required field ${key}`);
    }
    assertRemainingCountZero(remaining[key], key);
  }
}

/**
 * @param {{ status: number | null, error?: Error | null, stdout?: string, stderr?: string }} r
 * @returns {{ mock?: boolean, tag?: string, deleted?: object, remaining?: object }}
 */
export function evaluateCleanupChildResult(r) {
  const stdout = (r.stdout ?? "").trim();
  const stderr = (r.stderr ?? "").trim();
  if (r.error) {
    throw new Error(`cleanup spawn error: ${r.error.message}`);
  }
  if (r.status !== 0) {
    throw new Error(`cleanup exit ${r.status}: ${stderr || stdout || "unknown"}`);
  }
  if (!stdout) {
    throw new Error("cleanup stdout empty (expected JSON report)");
  }
  let report;
  try {
    const lastLine = stdout.split("\n").filter(Boolean).pop();
    if (!lastLine) {
      throw new Error("empty");
    }
    report = JSON.parse(lastLine);
  } catch {
    throw new Error("cleanup did not emit JSON report on stdout");
  }
  if (report === null || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("cleanup report must be a JSON object");
  }
  assertCleanupRemainingZero(report.remaining);
  return report;
}
