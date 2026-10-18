import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  ALLOWED_DISPOSABLE_DATABASE,
  assertDisposableDatabaseUrl,
  parseDisposableDatabaseUrl,
} from "./disposable-db-url-guard.mjs";

const OK = `postgresql://remcard_r01:secret@127.0.0.1:5432/${ALLOWED_DISPOSABLE_DATABASE}`;

describe("disposable-db-url-guard", () => {
  it("accepts loopback postgres with exact database pathname", () => {
    const p = parseDisposableDatabaseUrl(OK);
    assert.equal(p.database, ALLOWED_DISPOSABLE_DATABASE);
    assert.equal(p.host, "127.0.0.1");
    assert.match(p.safeSummary, /^postgresql:\/\/127\.0\.0\.1\//);
    assert.doesNotMatch(p.safeSummary, /secret/);
  });

  it("accepts postgres scheme and [::1] host", () => {
    const p = parseDisposableDatabaseUrl(
      `postgres://u:p@[::1]:5432/${ALLOWED_DISPOSABLE_DATABASE}`,
    );
    assert.equal(p.host, "::1");
  });

  it("rejects wrong database in pathname (password contains allowed name)", () => {
    assert.throws(
      () =>
        parseDisposableDatabaseUrl(
          `postgresql://review:${ALLOWED_DISPOSABLE_DATABASE}@127.0.0.1/not_the_allowed_database`,
        ),
      /database must be remcard_admin_test_012/,
    );
  });

  it("rejects remote host even with correct database name", () => {
    assert.throws(
      () => parseDisposableDatabaseUrl(`postgresql://u:p@203.0.113.9:5432/${ALLOWED_DISPOSABLE_DATABASE}`),
      /non-loopback host/,
    );
  });

  it("rejects malformed URL", () => {
    assert.throws(() => parseDisposableDatabaseUrl("not-a-url"), /malformed URL/);
  });

  it("rejects mysql scheme", () => {
    assert.throws(
      () => parseDisposableDatabaseUrl(`mysql://127.0.0.1/${ALLOWED_DISPOSABLE_DATABASE}`),
      /unsupported scheme/,
    );
  });

  it("rejects database name only in password without pathname match", () => {
    assert.throws(
      () => parseDisposableDatabaseUrl(`postgresql://u:${ALLOWED_DISPOSABLE_DATABASE}@127.0.0.1/wrong_db`),
      /database must be/,
    );
  });

  it("rejects database name as username bypass", () => {
    assert.throws(
      () =>
        parseDisposableDatabaseUrl(
          `postgresql://${ALLOWED_DISPOSABLE_DATABASE}:x@127.0.0.1/${ALLOWED_DISPOSABLE_DATABASE}`,
        ),
      /must not appear as username/,
    );
  });

  it("assertDisposableDatabaseUrl matches parse", () => {
    assert.doesNotThrow(() => assertDisposableDatabaseUrl(OK));
  });
});

describe("login-layout cleanup inject-fail probe", () => {
  it("intentional cleanup inject-fail exits non-zero", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const nav = path.resolve(dir, "../../../remcard-navigator");
    const template = path.join(dir, "cleanup-disposable-fixture.nav.ts");
    const dest = path.join(nav, "scripts/.login-layout-01-disposable-cleanup.ts");
    const guardSrc = path.join(dir, "disposable-db-url-guard.mjs");
    const guardDest = path.join(nav, "scripts/.login-layout-disposable-db-url-guard.mjs");
    writeFileSync(dest, readFileSync(template));
    writeFileSync(guardDest, readFileSync(guardSrc));
    const runtimeEnv = "/tmp/admin-test-local-stack/runtime.env";
    if (!existsSync(runtimeEnv)) {
      return;
    }
    const env = { ...process.env, NODE_ENV: "development", LOGIN_LAYOUT_CLEANUP_INJECT_FAIL: "1" };
    for (const line of readFileSync(runtimeEnv, "utf8").split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1);
    }
    const r = spawnSync("pnpm", ["exec", "tsx", dest, "ll01-inject-fail-test"], {
      cwd: nav,
      env,
      encoding: "utf8",
    });
    assert.notEqual(r.status, 0, `expected inject-fail cleanup exit != 0, got ${r.status}`);
  });
});
