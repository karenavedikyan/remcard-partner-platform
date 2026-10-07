/**
 * Validate DATABASE_URL for local M4-B browser scripts.
 * Exit 0 if loopback host and database remcard_prof_test; exit 1 otherwise.
 * Does not print the URL or credentials.
 */

const raw = process.env.DATABASE_URL?.trim();
if (!raw) {
  console.error("DATABASE_URL is required (loopback remcard_prof_test only).");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(raw);
} catch {
  console.error("DATABASE_URL is not a valid URL.");
  process.exit(1);
}

const host = parsed.hostname;
const dbName = parsed.pathname.replace(/^\//, "").split("/")[0] ?? "";
const allowedHosts = new Set(["127.0.0.1", "localhost", "::1"]);

if (!allowedHosts.has(host)) {
  console.error(`DATABASE_URL host must be loopback, got: ${host}`);
  process.exit(1);
}

if (dbName !== "remcard_prof_test") {
  console.error(`DATABASE_URL database must be remcard_prof_test, got: ${dbName}`);
  process.exit(1);
}

process.exit(0);
