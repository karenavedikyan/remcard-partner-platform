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
  resolvePgConnectionParameters,
} from "./disposable-db-url-guard.mjs";

const OK = `postgresql://remcard_r01:secret@127.0.0.1:5432/${ALLOWED_DISPOSABLE_DATABASE}`;
const RUNTIME_ENV = "/tmp/admin-test-local-stack/runtime.env";
const INJECT_FAIL_MARKER = "cleanup: injected failure (LOGIN_LAYOUT_CLEANUP_INJECT_FAIL)";

describe("disposable-db-url-guard", () => {
  it("accepts loopback postgres with exact database pathname", () => {
    const p = parseDisposableDatabaseUrl(OK);
    assert.equal(p.database, ALLOWED_DISPOSABLE_DATABASE);
    assert.equal(p.host, "127.0.0.1");
    assert.equal(p.pgHost, "127.0.0.1");
    assert.match(p.safeSummary, /^postgresql:\/\/127\.0\.0\.1\//);
    assert.doesNotMatch(p.safeSummary, /secret/);
  });

  it("accepts postgres scheme and [::1] host", () => {
    const p = parseDisposableDatabaseUrl(
      `postgres://u:p@[::1]:5432/${ALLOWED_DISPOSABLE_DATABASE}`,
    );
    assert.equal(p.host, "::1");
    assert.equal(p.pgHost, "::1");
  });

  it("accepts allowlisted sslmode on loopback URL", () => {
    const url = `${OK}?sslmode=disable`;
    assert.doesNotThrow(() => parseDisposableDatabaseUrl(url));
    const pg = resolvePgConnectionParameters(url);
    assert.equal(normalizePgHost(pg.host), "127.0.0.1");
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

  it("rejects pg query host override with loopback authority", () => {
    const bypass = `postgresql://review:placeholder@127.0.0.1/${ALLOWED_DISPOSABLE_DATABASE}?host=203.0.113.9`;
    assert.throws(() => parseDisposableDatabaseUrl(bypass), /disallowed query parameter/);
    const pg = resolvePgConnectionParameters(bypass);
    assert.equal(pg.host, "203.0.113.9");
  });

  it("rejects percent-encoded host query override", () => {
    const bypass = `postgresql://u:p@127.0.0.1/${ALLOWED_DISPOSABLE_DATABASE}?${encodeURIComponent("host")}=203.0.113.9`;
    assert.throws(() => parseDisposableDatabaseUrl(bypass), /disallowed query parameter/);
  });

  it("rejects duplicate query override alongside allowlisted param", () => {
    const bypass = `postgresql://u:p@127.0.0.1/${ALLOWED_DISPOSABLE_DATABASE}?sslmode=disable&host=203.0.113.9`;
    assert.throws(() => parseDisposableDatabaseUrl(bypass), /disallowed query parameter/);
  });

  it("rejects database override via query dbname", () => {
    const bypass = `postgresql://u:p@127.0.0.1/${ALLOWED_DISPOSABLE_DATABASE}?dbname=other_db`;
    assert.throws(() => parseDisposableDatabaseUrl(bypass), /disallowed query parameter/);
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

function normalizePgHost(host) {
  if (!host) return "";
  let h = String(host).toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  return h;
}

describe("login-layout cleanup inject-fail (disposable PG)", () => {
  it("real inject-fail exits non-zero with harness marker", { skip: !existsSync(RUNTIME_ENV) && "no disposable runtime.env" }, () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const nav = path.resolve(dir, "../../../remcard-navigator");
    const template = path.join(dir, "cleanup-disposable-fixture.nav.fixture.tpl");
    const dest = path.join(nav, "scripts/.login-layout-01-disposable-cleanup.ts");
    const guardSrc = path.join(dir, "disposable-db-url-guard.mjs");
    const guardDest = path.join(nav, "scripts/.login-layout-disposable-db-url-guard.mjs");
    writeFileSync(dest, readFileSync(template));
    writeFileSync(guardDest, readFileSync(guardSrc));
    const env = { ...process.env, NODE_ENV: "development", LOGIN_LAYOUT_CLEANUP_INJECT_FAIL: "1" };
    for (const line of readFileSync(RUNTIME_ENV, "utf8").split("\n")) {
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
    const errOut = `${r.stderr || ""}${r.stdout || ""}`;
    assert.match(errOut, new RegExp(INJECT_FAIL_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
