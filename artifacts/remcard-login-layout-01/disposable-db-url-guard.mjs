/**
 * Fail-closed parsed DATABASE_URL guard for LOGIN-LAYOUT disposable harness (MOCK fixtures only).
 * Never log password or full DSN.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_DISPOSABLE_DATABASE = "remcard_admin_test_012";

const ALLOWED_SCHEMES = new Set(["postgresql", "postgres"]);

/** Non-address query keys permitted on disposable loopback URLs (allowlist, fail-closed). */
const ALLOWED_QUERY_PARAMS = new Set(["sslmode", "application_name"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveNavigatorRoot(moduleDir) {
  const viaScriptsParent = path.resolve(moduleDir, "..");
  if (existsSync(path.join(viaScriptsParent, "prisma/schema.prisma"))) {
    return viaScriptsParent;
  }
  const viaArtifact = path.resolve(moduleDir, "../../../remcard-navigator");
  if (existsSync(path.join(viaArtifact, "prisma/schema.prisma"))) {
    return viaArtifact;
  }
  throw new Error("navigator root not found for disposable DB guard");
}

const NAV_ROOT = resolveNavigatorRoot(__dirname);
const require = createRequire(path.join(NAV_ROOT, "package.json"));
const pg = require("pg");

/** @param {string} hostname */
export function normalizeLoopbackHost(hostname) {
  if (!hostname || typeof hostname !== "string") return "";
  let h = hostname.trim().toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  if (h === "::1" || h === "0:0:0:0:0:0:0:1") return "::1";
  return h;
}

function isLoopbackHost(hostname) {
  const h = normalizeLoopbackHost(hostname);
  return h === "127.0.0.1" || h === "localhost" || h === "::1";
}

/** @param {URL} parsed @param {string} label */
function assertQueryParamsAllowlisted(parsed, label) {
  const keys = [...parsed.searchParams.keys()];
  for (const rawKey of keys) {
    let normKey;
    try {
      normKey = decodeURIComponent(rawKey.trim()).toLowerCase();
    } catch {
      throw new Error(`${label}: malformed query parameter name`);
    }
    if (!ALLOWED_QUERY_PARAMS.has(normKey)) {
      throw new Error(`${label}: disallowed query parameter`);
    }
    for (const rawVal of parsed.searchParams.getAll(rawKey)) {
      try {
        decodeURIComponent(rawVal);
      } catch {
        throw new Error(`${label}: malformed query parameter value`);
      }
    }
  }
}

/**
 * Effective connection target as resolved by node-pg (no TCP connect).
 * @param {string} connectionString
 */
export function resolvePgConnectionParameters(connectionString) {
  const client = new pg.Client({ connectionString });
  const cp = client.connectionParameters;
  return {
    host: cp.host ?? "",
    port: cp.port ?? null,
    database: cp.database ?? "",
  };
}

/**
 * @param {string} raw
 * @param {{ label?: string }} [opts]
 * @returns {{ database: string, host: string, scheme: string, safeSummary: string, pgHost: string }}
 */
export function parseDisposableDatabaseUrl(raw, opts = {}) {
  const label = opts.label ?? "DATABASE_URL";
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label}: missing or empty`);
  }
  const trimmed = raw.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${label}: malformed URL`);
  }
  const scheme = parsed.protocol.replace(/:$/, "").toLowerCase();
  if (!ALLOWED_SCHEMES.has(scheme)) {
    throw new Error(`${label}: unsupported scheme (postgresql/postgres only)`);
  }
  const host = normalizeLoopbackHost(parsed.hostname);
  if (!isLoopbackHost(host)) {
    throw new Error(`${label}: non-loopback host rejected`);
  }
  const pathSegment = parsed.pathname.replace(/^\/+/, "");
  const database = decodeURIComponent(pathSegment.split("/").filter(Boolean)[0] ?? "");
  if (!database || pathSegment.includes("/")) {
    throw new Error(`${label}: database pathname must be exactly ${ALLOWED_DISPOSABLE_DATABASE}`);
  }
  if (database !== ALLOWED_DISPOSABLE_DATABASE) {
    throw new Error(`${label}: database must be ${ALLOWED_DISPOSABLE_DATABASE}`);
  }

  assertQueryParamsAllowlisted(parsed, label);

  if (parsed.username && decodeURIComponent(parsed.username) === ALLOWED_DISPOSABLE_DATABASE) {
    throw new Error(`${label}: database name must not appear as username`);
  }
  if (parsed.password && decodeURIComponent(parsed.password) === ALLOWED_DISPOSABLE_DATABASE) {
    throw new Error(`${label}: database name must not appear as password`);
  }

  let pgParams;
  try {
    pgParams = resolvePgConnectionParameters(trimmed);
  } catch {
    throw new Error(`${label}: pg connection string parse failed`);
  }
  if (!isLoopbackHost(pgParams.host)) {
    throw new Error(`${label}: pg effective host is non-loopback`);
  }
  if (pgParams.database !== ALLOWED_DISPOSABLE_DATABASE) {
    throw new Error(`${label}: pg effective database must be ${ALLOWED_DISPOSABLE_DATABASE}`);
  }

  return {
    database,
    host,
    scheme,
    pgHost: normalizeLoopbackHost(pgParams.host),
    safeSummary: `${scheme}://${host}/${database}`,
  };
}

/** @param {string} raw @param {{ label?: string }} [opts] */
export function assertDisposableDatabaseUrl(raw, opts = {}) {
  return parseDisposableDatabaseUrl(raw, opts);
}
