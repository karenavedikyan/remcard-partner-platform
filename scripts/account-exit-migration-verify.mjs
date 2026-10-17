#!/usr/bin/env node
/**
 * Read-only schema inspection + controlled apply of pinned AuthSessionRevocation migration.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "../../remcard-navigator/node_modules/pg/lib/index.js";

const NAV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../remcard-navigator");
const MIGRATION_DIR = "20261017120000_auth_session_revocation";
const MIGRATION_SQL_PATH = path.join(NAV, "prisma/migrations", MIGRATION_DIR, "migration.sql");

const EXPECTED_COLUMNS = [
  { name: "id", dataType: "text", isNullable: "NO" },
  { name: "userId", dataType: "text", isNullable: "NO" },
  { name: "sessionKey", dataType: "text", isNullable: "NO" },
  { name: "expiresAt", dataType: "timestamp without time zone", isNullable: "NO" },
  { name: "revokedAt", dataType: "timestamp without time zone", isNullable: "NO" },
];

export function migrationSqlSha256() {
  const sql = readFileSync(MIGRATION_SQL_PATH, "utf8");
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export function readMigrationSql() {
  return readFileSync(MIGRATION_SQL_PATH, "utf8");
}

async function inspectAuthSessionRevocation(client) {
  const table = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'AuthSessionRevocation'
     ) AS exists`,
  );
  if (!table.rows[0]?.exists) {
    return { present: false, columns: [], indexes: [], foreignKeys: [] };
  }

  const columns = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'AuthSessionRevocation'
     ORDER BY ordinal_position`,
  );

  const indexes = await client.query(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'AuthSessionRevocation'
     ORDER BY indexname`,
  );

  const foreignKeys = await client.query(
    `SELECT
       tc.constraint_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       rc.delete_rule
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
     JOIN information_schema.referential_constraints rc
       ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.table_name = 'AuthSessionRevocation'
       AND tc.constraint_type = 'FOREIGN KEY'`,
  );

  return {
    present: true,
    columns: columns.rows.map((r) => ({
      name: r.column_name,
      dataType: r.data_type,
      isNullable: r.is_nullable,
    })),
    indexes: indexes.rows.map((r) => ({ name: r.indexname, def: r.indexdef })),
    foreignKeys: foreignKeys.rows.map((r) => ({
      name: r.constraint_name,
      column: r.column_name,
      foreignTable: r.foreign_table_name,
      onDelete: r.delete_rule,
    })),
  };
}

function normalizeMismatch(details) {
  return details.length ? details : null;
}

export function evaluateSchema(snapshot) {
  const mismatches = [];
  if (!snapshot.present) {
    return { ok: false, mismatches: ["table_missing"], snapshot };
  }

  for (const expected of EXPECTED_COLUMNS) {
    const col = snapshot.columns.find((c) => c.name === expected.name);
    if (!col) {
      mismatches.push(`column_missing:${expected.name}`);
      continue;
    }
    if (col.dataType !== expected.dataType) {
      mismatches.push(`column_type:${expected.name}:${col.dataType}`);
    }
    if (col.isNullable !== expected.isNullable) {
      mismatches.push(`column_nullable:${expected.name}:${col.isNullable}`);
    }
  }

  const indexNames = new Set(snapshot.indexes.map((i) => i.name));
  for (const required of [
    "AuthSessionRevocation_pkey",
    "AuthSessionRevocation_userId_sessionKey_key",
    "AuthSessionRevocation_expiresAt_idx",
  ]) {
    if (!indexNames.has(required)) mismatches.push(`index_missing:${required}`);
  }

  const userFk = snapshot.foreignKeys.find((fk) => fk.column === "userId");
  if (!userFk || userFk.foreignTable !== "User" || userFk.onDelete !== "CASCADE") {
    mismatches.push("fk_user_cascade_missing");
  }

  return { ok: mismatches.length === 0, mismatches, snapshot };
}

function applyMigrationSql(databaseUrl, cwdEnv) {
  const sql = readMigrationSql();
  return spawnSync(
    "pnpm",
    ["exec", "prisma", "db", "execute", "--stdin", "--schema", "prisma/schema.prisma"],
    {
      cwd: NAV,
      env: { ...process.env, ...cwdEnv, DATABASE_URL: databaseUrl },
      encoding: "utf8",
      input: sql,
    },
  );
}

/**
 * before (read-only) → apply if needed → after verify → second apply must not corrupt schema.
 */
export async function runAuthSessionRevocationMigrationGate(databaseUrl, cwdEnv = {}) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const report = {
    migrationSqlSha256: migrationSqlSha256(),
    migrationDir: MIGRATION_DIR,
    before: null,
    afterFirstApply: null,
    afterSecondApply: null,
    applyRuns: [],
    pass: false,
    blocker: null,
  };

  try {
    report.before = evaluateSchema(await inspectAuthSessionRevocation(client));
    if (report.before.present && !report.before.ok) {
      report.blocker = "partial_or_mismatch_schema_before_apply";
      return report;
    }

    const firstApply = applyMigrationSql(databaseUrl, cwdEnv);
    report.applyRuns.push({
      pass: 1,
      exitCode: firstApply.status ?? 1,
      stderrTail: (firstApply.stderr ?? "").slice(-400) || null,
    });

    report.afterFirstApply = evaluateSchema(await inspectAuthSessionRevocation(client));
    if (!report.afterFirstApply.ok) {
      report.blocker = "schema_incomplete_after_first_apply";
      return report;
    }

    const secondApply = applyMigrationSql(databaseUrl, cwdEnv);
    report.applyRuns.push({
      pass: 2,
      exitCode: secondApply.status ?? 1,
      stderrTail: (secondApply.stderr ?? "").slice(-400) || null,
    });

    report.afterSecondApply = evaluateSchema(await inspectAuthSessionRevocation(client));
    if (!report.afterSecondApply.ok) {
      report.blocker = "schema_changed_after_second_apply";
      return report;
    }

    const secondExit = report.applyRuns[1]?.exitCode ?? 1;
    if (secondExit !== 0 && !/already exists/i.test(secondApply.stderr ?? "")) {
      report.blocker = "second_apply_failed_without_idempotent_ddl";
      return report;
    }

    report.pass = true;
    return report;
  } finally {
    await client.end().catch(() => undefined);
  }
}
