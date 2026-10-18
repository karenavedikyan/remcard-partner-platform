/**
 * Fail-closed helpers for LOGIN-ENTRY-PROTOTYPE smoke (no fake PASS).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertDisposableDatabaseUrl } from "../remcard-login-layout-01/disposable-db-url-guard.mjs";
import { evaluateCleanupChildResult } from "../remcard-login-layout-01/login-layout-cleanup-orchestration.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

export { assertDisposableDatabaseUrl, evaluateCleanupChildResult };

export function gitSha(cwd = ROOT) {
  return spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).stdout?.trim() ?? null;
}

export function loadEnvFile(filePath) {
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

/** Deterministic unique MAX id per fixture tag (no shared default). */
export function fixtureMaxIdForTag(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (Math.imul(31, hash) + tag.charCodeAt(i)) >>> 0;
  }
  const suffix = hash % 900_000_000;
  return String(881_000_000_000n + BigInt(suffix));
}

export function resolveDisposableDatabaseEnv(runtimeEnv) {
  if (!runtimeEnv?.DATABASE_URL) {
    return { ok: false, reason: "runtime.env missing or DATABASE_URL empty" };
  }
  try {
    const guard = assertDisposableDatabaseUrl(runtimeEnv.DATABASE_URL, { label: "DATABASE_URL" });
    return { ok: true, guardSummary: guard.safeSummary };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * @param {{ status: number | null, signal?: NodeJS.Signals | null, error?: Error | null, stdout?: string, stderr?: string }} r
 */
export function spawnResultRecord(r) {
  return {
    exitCode: r.status,
    signal: r.signal ?? null,
    spawnError: r.error?.message ?? null,
    stdoutBytes: (r.stdout ?? "").length,
    stderrBytes: (r.stderr ?? "").length,
  };
}

export function deriveAcceptanceStatus({
  componentTestsOk,
  smokeOk,
  cleanupOk,
  buildRecorded,
  runtimeVerified,
}) {
  if (!componentTestsOk) return "NOT_VERIFIED";
  if (!buildRecorded) return "NOT_VERIFIED";
  if (!runtimeVerified) return "NOT_VERIFIED";
  if (!smokeOk || !cleanupOk) return "NOT_VERIFIED";
  return "READY_FOR_REVIEW";
}
