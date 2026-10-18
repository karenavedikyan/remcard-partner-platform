/**
 * Fail-closed parsed DATABASE_URL guard for LOGIN-LAYOUT disposable harness (MOCK fixtures only).
 * Never log password or full DSN.
 */

export const ALLOWED_DISPOSABLE_DATABASE = "remcard_admin_test_012";

const ALLOWED_SCHEMES = new Set(["postgresql", "postgres"]);

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

/**
 * @param {string} raw
 * @param {{ label?: string }} [opts]
 * @returns {{ database: string, host: string, scheme: string, safeSummary: string }}
 */
export function parseDisposableDatabaseUrl(raw, opts = {}) {
  const label = opts.label ?? "DATABASE_URL";
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label}: missing or empty`);
  }
  let parsed;
  try {
    parsed = new URL(raw.trim());
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
  for (const [key, value] of parsed.searchParams.entries()) {
    const k = key.toLowerCase();
    if (k === "database" || k === "dbname" || k === "schema") {
      const decoded = decodeURIComponent(value);
      if (decoded === ALLOWED_DISPOSABLE_DATABASE && database !== ALLOWED_DISPOSABLE_DATABASE) {
        throw new Error(`${label}: query cannot override pathname database`);
      }
      if (k !== "schema" && decoded !== ALLOWED_DISPOSABLE_DATABASE) {
        throw new Error(`${label}: disallowed database in query parameter`);
      }
    }
  }
  if (parsed.username && decodeURIComponent(parsed.username) === ALLOWED_DISPOSABLE_DATABASE) {
    throw new Error(`${label}: database name must not appear as username`);
  }
  if (parsed.password && decodeURIComponent(parsed.password) === ALLOWED_DISPOSABLE_DATABASE) {
    throw new Error(`${label}: database name must not appear as password`);
  }
  return {
    database,
    host,
    scheme,
    safeSummary: `${scheme}://${host}/${database}`,
  };
}

/** @param {string} raw @param {{ label?: string }} [opts] */
export function assertDisposableDatabaseUrl(raw, opts = {}) {
  return parseDisposableDatabaseUrl(raw, opts);
}
