/**
 * Harness-side cleanup result evaluation (no DB). Shared with unit regression tests.
 */

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
  let report;
  try {
    report = JSON.parse(stdout.split("\n").filter(Boolean).pop() ?? "{}");
  } catch {
    throw new Error("cleanup did not emit JSON report on stdout");
  }
  const rem = report.remaining ?? {};
  const leftover =
    (rem.users ?? 0) + (rem.authAccounts ?? 0) + (rem.consents ?? 0) + (rem.botLoginCodes ?? 0);
  if (leftover > 0) {
    throw new Error(`cleanup remaining fixture rows: ${JSON.stringify(rem)}`);
  }
  return report;
}
