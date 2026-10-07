/**
 * Validate DATABASE_URL for local M4-B browser scripts.
 * Exit 0 if allowed; exit 1 with a generic message (no URL/credentials echoed).
 */

import { pathToFileURL } from "node:url";

const ALLOWED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const REQUIRED_DATABASE = "remcard_prof_test";

/** @param {string} hostname */
function normalizeLoopbackHostname(hostname) {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

/** @typedef {{ ok: true } | { ok: false, code: string }} ValidationResult */

/** @type {Record<string, string>} */
export const VALIDATION_ERRORS = {
  missing: "DATABASE_URL is required (loopback remcard_prof_test only).",
  invalid_url: "DATABASE_URL is not a valid URL.",
  protocol: "DATABASE_URL protocol must be postgres or postgresql.",
  host: "DATABASE_URL host must be loopback (127.0.0.1, localhost, or ::1).",
  database: "DATABASE_URL database must be remcard_prof_test.",
  extra_path: "DATABASE_URL must not contain extra path segments.",
  query: "DATABASE_URL must not contain query parameters.",
  fragment: "DATABASE_URL must not contain a fragment.",
};

/**
 * @param {string | null | undefined} raw
 * @returns {ValidationResult}
 */
export function validateTestDatabaseUrl(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { ok: false, code: "missing" };
  }

  /** @type {URL} */
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, code: "invalid_url" };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, code: "protocol" };
  }

  if (!ALLOWED_HOSTS.has(normalizeLoopbackHostname(parsed.hostname))) {
    return { ok: false, code: "host" };
  }

  if (parsed.search.length > 0) {
    return { ok: false, code: "query" };
  }

  if (parsed.hash.length > 0) {
    return { ok: false, code: "fragment" };
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] !== REQUIRED_DATABASE) {
    return { ok: false, code: "database" };
  }
  if (segments.length > 1) {
    return { ok: false, code: "extra_path" };
  }

  return { ok: true };
}

/**
 * @param {ValidationResult} result
 * @returns {number}
 */
export function exitWithValidationResult(result) {
  if (result.ok) {
    return 0;
  }
  const message = VALIDATION_ERRORS[result.code] ?? "DATABASE_URL rejected.";
  console.error(message);
  return 1;
}

function runCli() {
  const code = exitWithValidationResult(validateTestDatabaseUrl(process.env.DATABASE_URL));
  process.exit(code);
}

const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli();
}
