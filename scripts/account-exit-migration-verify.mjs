#!/usr/bin/env node
/**
 * TEST-ONLY disposable stack hook for ACCOUNT-EXIT functional smoke.
 *
 * Production / operator path (validated target, ledger, transaction, pinned checksum):
 *   remcard-navigator/scripts/apply-account-exit-auth-session-revocation.mjs
 *
 * Do not treat this wrapper as a production migration recommendation.
 */
import pg from '../../remcard-navigator/node_modules/pg/lib/index.js';
import {
  ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_MIGRATION,
  ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_SQL_SHA256,
  ACCOUNT_EXIT_DISPOSABLE_SMOKE_DATABASES,
  applyAccountExitAuthSessionRevocationMigration,
  assertAccountExitAuthSessionRevocationBeforeApply,
  assertAccountExitAuthSessionRevocationPreConnect,
  evaluateAuthSessionRevocationSchema,
  inspectAuthSessionRevocationSnapshot,
  loadAccountExitAuthSessionRevocationMigration,
} from '../../remcard-navigator/scripts/lib/account-exit-auth-session-revocation-controlled-apply.mjs';

export {
  ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_MIGRATION,
  ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_SQL_SHA256,
  evaluateAuthSessionRevocationSchema,
  loadAccountExitAuthSessionRevocationMigration,
};

export function migrationSqlSha256() {
  return loadAccountExitAuthSessionRevocationMigration().checksum;
}

const SMOKE_OPTIONS = {
  mode: 'local-test',
  allowedLocalDatabases: ACCOUNT_EXIT_DISPOSABLE_SMOKE_DATABASES,
};

/**
 * Read-only before + controlled apply (ledger) + second noop apply on disposable PG.
 */
export async function runAuthSessionRevocationMigrationGate(databaseUrl, cwdEnv = {}) {
  const env = {
    ...process.env,
    ...cwdEnv,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };

  let target;
  try {
    target = assertAccountExitAuthSessionRevocationPreConnect(env, SMOKE_OPTIONS);
  } catch (error) {
    return {
      scope: 'disposable_smoke_test_only',
      migrationDir: ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_MIGRATION,
      migrationSqlSha256: null,
      pinnedSha256: ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_SQL_SHA256,
      pass: false,
      blocker: error instanceof Error ? error.message : String(error),
    };
  }

  const pinnedChecksum = target.checksum;
  const client = new pg.Client({ connectionString: target.connectionString });
  await client.connect();

  const report = {
    scope: 'disposable_smoke_test_only',
    operatorScript:
      'remcard-navigator/scripts/apply-account-exit-auth-session-revocation.mjs',
    migrationDir: ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_MIGRATION,
    migrationSqlSha256: pinnedChecksum,
    pinnedSha256: ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_SQL_SHA256,
    checksumMatch: pinnedChecksum === ACCOUNT_EXIT_AUTH_SESSION_REVOCATION_SQL_SHA256,
    before: null,
    applyRuns: [],
    afterFirstApply: null,
    afterSecondApply: null,
    pass: false,
    blocker: null,
  };

  try {
    if (!report.checksumMatch) {
      report.blocker = 'migration_checksum_mismatch';
      return report;
    }

    let beforePhase;
    try {
      beforePhase = await assertAccountExitAuthSessionRevocationBeforeApply(client, env, SMOKE_OPTIONS);
      report.before = {
        phase: beforePhase.phase,
        ok: beforePhase.evaluation?.ok ?? null,
        mismatches: beforePhase.evaluation?.mismatches ?? [],
        present: beforePhase.snapshot?.present ?? false,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const snapshot = await inspectAuthSessionRevocationSnapshot(client);
      report.before = {
        phase: 'STOP',
        ok: false,
        present: snapshot.present,
        mismatches: evaluateAuthSessionRevocationSchema(snapshot).mismatches,
        error: msg,
      };
      report.blocker = msg;
      return report;
    }

    if (beforePhase.snapshot?.present && !beforePhase.evaluation?.ok) {
      report.blocker = 'partial_or_mismatch_schema_before_apply';
      return report;
    }

    const first = await applyAccountExitAuthSessionRevocationMigration(client, env, SMOKE_OPTIONS);
    report.applyRuns.push({
      pass: 1,
      code: first.code,
      exitCode: first.applyExitCode ?? 1,
      skipped: Boolean(first.skipped),
    });

    report.afterFirstApply = evaluateAuthSessionRevocationSchema(
      await inspectAuthSessionRevocationSnapshot(client),
    );

    const second = await applyAccountExitAuthSessionRevocationMigration(client, env, SMOKE_OPTIONS);
    report.applyRuns.push({
      pass: 2,
      code: second.code,
      exitCode: second.applyExitCode ?? 1,
      skipped: Boolean(second.skipped),
    });

    report.afterSecondApply = evaluateAuthSessionRevocationSchema(
      await inspectAuthSessionRevocationSnapshot(client),
    );

    report.pass =
      report.afterFirstApply.ok &&
      report.afterSecondApply.ok &&
      first.applyExitCode === 0 &&
      second.applyExitCode === 0 &&
      second.code === 'noop';

    if (!report.pass) {
      report.blocker = 'controlled_apply_or_noop_failed';
    }
  } finally {
    await client.end().catch(() => undefined);
  }

  return report;
}
