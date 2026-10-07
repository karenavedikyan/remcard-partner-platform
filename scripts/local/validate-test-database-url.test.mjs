import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  exitWithValidationResult,
  validateTestDatabaseUrl,
  VALIDATION_ERRORS,
} from "./validate-test-database-url.mjs";

const TEST_PASSWORD = "SECRET_TEST_PASSWORD_XYZ789";
const VALID_IPV4 = `postgresql://remcard_test:${TEST_PASSWORD}@127.0.0.1:5432/remcard_prof_test`;
const VALID_LOCALHOST = `postgres://remcard_test:${TEST_PASSWORD}@localhost/remcard_prof_test`;
const VALID_IPV6 = `postgresql://remcard_test:${TEST_PASSWORD}@[::1]:5432/remcard_prof_test`;

const CLI_PATH = fileURLToPath(new URL("./validate-test-database-url.mjs", import.meta.url));

function runCli(envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  if (Object.prototype.hasOwnProperty.call(envOverrides, "DATABASE_URL") && envOverrides.DATABASE_URL === undefined) {
    delete env.DATABASE_URL;
  }
  return spawnSync(process.execPath, [CLI_PATH], {
    env,
    encoding: "utf8",
  });
}

function assertRejectsWithoutSecret(result, expectedCode) {
  assert.equal(result.ok, false);
  assert.equal(result.code, expectedCode);
  const exitCode = exitWithValidationResult(result);
  assert.equal(exitCode, 1);
  const message = VALIDATION_ERRORS[expectedCode] ?? "";
  assert.ok(message.length > 0);
  assert.ok(!message.includes(TEST_PASSWORD));
}

test("accepts loopback IPv4 postgres URL", () => {
  assert.deepEqual(validateTestDatabaseUrl(VALID_IPV4), { ok: true });
});

test("accepts loopback localhost postgresql URL", () => {
  assert.deepEqual(validateTestDatabaseUrl(VALID_LOCALHOST), { ok: true });
});

test("accepts loopback IPv6 postgresql URL", () => {
  assert.deepEqual(validateTestDatabaseUrl(VALID_IPV6), { ok: true });
});

test("rejects missing DATABASE_URL", () => {
  assertRejectsWithoutSecret(validateTestDatabaseUrl(undefined), "missing");
  assertRejectsWithoutSecret(validateTestDatabaseUrl(""), "missing");
  assertRejectsWithoutSecret(validateTestDatabaseUrl("   "), "missing");
});

test("rejects invalid protocol", () => {
  assertRejectsWithoutSecret(
    validateTestDatabaseUrl(`mysql://remcard_test:${TEST_PASSWORD}@127.0.0.1/remcard_prof_test`),
    "protocol",
  );
});

test("rejects external host", () => {
  assertRejectsWithoutSecret(
    validateTestDatabaseUrl(`postgresql://remcard_test:${TEST_PASSWORD}@db.example.com/remcard_prof_test`),
    "host",
  );
});

test("rejects wrong database name", () => {
  assertRejectsWithoutSecret(
    validateTestDatabaseUrl(`postgresql://remcard_test:${TEST_PASSWORD}@127.0.0.1/other_db`),
    "database",
  );
});

test("rejects extra path segments", () => {
  assertRejectsWithoutSecret(
    validateTestDatabaseUrl(
      `postgresql://remcard_test:${TEST_PASSWORD}@127.0.0.1/remcard_prof_test/extra`,
    ),
    "extra_path",
  );
});

test("rejects query parameters host, hostaddr, service", () => {
  for (const query of ["?host=evil.test", "?hostaddr=10.0.0.1", "?service=postgres"]) {
    assertRejectsWithoutSecret(
      validateTestDatabaseUrl(`postgresql://remcard_test:${TEST_PASSWORD}@127.0.0.1/remcard_prof_test${query}`),
      "query",
    );
  }
});

test("rejects fragment", () => {
  assertRejectsWithoutSecret(
    validateTestDatabaseUrl(
      `postgresql://remcard_test:${TEST_PASSWORD}@127.0.0.1/remcard_prof_test#section`,
    ),
    "fragment",
  );
});

test("CLI exits 0 for valid URL without echoing password", () => {
  const result = runCli({ DATABASE_URL: VALID_IPV4 });
  assert.equal(result.status, 0);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(TEST_PASSWORD));
});

test("CLI exits non-zero without echoing password on rejection", () => {
  const result = runCli({
    DATABASE_URL: `postgresql://remcard_test:${TEST_PASSWORD}@evil.test/remcard_prof_test`,
  });
  assert.notEqual(result.status, 0);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(TEST_PASSWORD));
  assert.match(result.stderr, /loopback/i);
});

test("CLI exits non-zero when DATABASE_URL unset", () => {
  const result = runCli({ DATABASE_URL: undefined });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /required/i);
});
