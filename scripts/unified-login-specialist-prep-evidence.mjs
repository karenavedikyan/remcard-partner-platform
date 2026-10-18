#!/usr/bin/env node
/** UNIFIED-LOGIN-SPECIALIST-PREP-01.2 disposable evidence (no prod). */
import { createHash } from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runUnifiedPrepBrowserSmoke } from './unified-login-specialist-prep-browser.mjs';
import {
  NAV_EVIDENCE_DIST,
  PLAT_EVIDENCE_DIST,
  assertSourceDigestUnchanged,
  gitDirty,
  gitHead,
  readBuildIdFresh,
  removeDistForCleanBuild,
  trackedSourceDigest,
  tsconfigIncludeDistDriftOk,
  assertCleanCommittedTree,
  assertSuccessfulCommand,
} from './lib/unified-prep-source-gates.mjs';

const PLAT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = path.resolve(PLAT, '../remcard-navigator');
const OUT = path.join(PLAT, 'artifacts/unified-login-specialist-prep');
const SCRATCH_JSON = path.join('/tmp', 'UNIFIED-PREP-01-EVIDENCE.scratch.json');
const JSON_OUT = path.join(OUT, 'UNIFIED-PREP-01-EVIDENCE.json');
const SHA_OUT = path.join(OUT, 'UNIFIED-PREP-01-EVIDENCE.sha256');
const PLAT_BUILD_LOG = path.join(OUT, 'UNIFIED-PREP-01-plat-build.log');
const PLAT_NPM_CI_LOG = path.join(OUT, 'UNIFIED-PREP-01-plat-npm-ci.log');
const NAV_BUILD_LOG = path.join(OUT, 'UNIFIED-PREP-01-nav-build.log');
const SCRATCH_PLAT_BUILD_LOG = path.join('/tmp', 'UNIFIED-PREP-01-plat-build.log');
const SCRATCH_PLAT_NPM_CI_LOG = path.join('/tmp', 'UNIFIED-PREP-01-plat-npm-ci.log');
const SCRATCH_NAV_BUILD_LOG = path.join('/tmp', 'UNIFIED-PREP-01-nav-build.log');
const SCRATCH_PG_OUT = path.join('/tmp', 'unified-prep-r06-release-prep-out');
const SCRATCH_BROWSER_JSON = path.join('/tmp', 'UNIFIED-PREP-01-BROWSER.json');
const SOURCE_DELTA_MANIFEST = path.join(OUT, 'UNIFIED-PREP-01-SOURCE-DELTA.json');

const LOCAL_BUILD_LEGAL = {
  PLATFORM_INN: process.env.PLATFORM_INN || '0000000000',
  PLATFORM_OGRN: process.env.PLATFORM_OGRN || '0000000000000',
  note: 'placeholder legal ids for disposable local production build only — not prod readiness',
};

function sha256Bytes(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function runRecorded(cmd, args, cwd, env = process.env) {
  const res = spawnSync(cmd, args, { cwd, env: { ...env }, encoding: 'utf8' });
  const spawnError = res.error ? String(res.error.message || res.error) : null;
  return {
    command: [cmd, ...args].join(' '),
    status: res.status,
    signal: res.signal,
    spawnError,
    exitCode: spawnError ? null : res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

function writeLog(filePath, text) {
  writeFileSync(filePath, text);
  const bytes = readFileSync(filePath);
  return { path: filePath, sha256: sha256Bytes(bytes), bytes: bytes.length };
}

function assertCleanCommittedHeads() {
  return { platform: assertCleanCommittedTree(PLAT), navigator: assertCleanCommittedTree(NAV) };
}

function countNodeTest(out) {
  const pass = out.match(/# pass (\d+)/)?.[1];
  const fail = out.match(/# fail (\d+)/)?.[1];
  const skip = out.match(/# skip (\d+)/)?.[1];
  return {
    pass: pass ? Number(pass) : null,
    fail: fail ? Number(fail) : null,
    skip: skip ? Number(skip) : null,
  };
}

function copyScratchDirToArtifacts(scratchDir, artifactDir) {
  if (!existsSync(scratchDir)) return { copied: [] };
  mkdirSync(artifactDir, { recursive: true });
  const copied = [];
  for (const name of readdirSync(scratchDir)) {
    copyFileSync(path.join(scratchDir, name), path.join(artifactDir, name));
    copied.push(name);
  }
  return { copied, artifactDir };
}

function writeEvidence(payload) {
  writeFileSync(SCRATCH_JSON, JSON.stringify(payload, null, 2) + '\n');
  const bytes = readFileSync(SCRATCH_JSON);
  const digest = sha256Bytes(bytes);
  mkdirSync(OUT, { recursive: true });
  copyFileSync(SCRATCH_JSON, JSON_OUT);
  writeFileSync(SHA_OUT, `${digest}  UNIFIED-PREP-01-EVIDENCE.json\n`);
  return { digest, byteLength: bytes.length };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const builtCodeSha = assertCleanCommittedHeads();
  const sourceAtStart = {
    platform: trackedSourceDigest(PLAT),
    navigator: trackedSourceDigest(NAV),
  };
  const treeAtStart = { platform: gitDirty(PLAT), navigator: gitDirty(NAV) };

  removeDistForCleanBuild(PLAT, PLAT_EVIDENCE_DIST);
  const npmCi = runRecorded('npm', ['ci', '--include=dev'], PLAT);
  writeLog(SCRATCH_PLAT_NPM_CI_LOG, `${npmCi.stdout}\n${npmCi.stderr}`);
  assertSuccessfulCommand(npmCi, 'npm ci');

  const platBuildStarted = Date.now();
  const platBuild = runRecorded('npm', ['run', 'build'], PLAT, {
    ...process.env,
    ...LOCAL_BUILD_LEGAL,
    R06_NEXT_DIST_DIR: PLAT_EVIDENCE_DIST,
  });
  const platBuildLog = writeLog(SCRATCH_PLAT_BUILD_LOG, `${platBuild.stdout}\n${platBuild.stderr}`);
  assertSuccessfulCommand(platBuild, 'platform build');
  const platBuildId = readBuildIdFresh(PLAT, PLAT_EVIDENCE_DIST, platBuildStarted);

  removeDistForCleanBuild(NAV, NAV_EVIDENCE_DIST);
  const navBuildStarted = Date.now();
  const navBuild = runRecorded('pnpm', ['run', 'build'], NAV, {
    ...process.env,
    ...LOCAL_BUILD_LEGAL,
    R06_NEXT_DIST_DIR: NAV_EVIDENCE_DIST,
  });
  const navBuildLog = writeLog(SCRATCH_NAV_BUILD_LOG, `${navBuild.stdout}\n${navBuild.stderr}`);
  assertSuccessfulCommand(navBuild, 'navigator build');
  const navBuildId = readBuildIdFresh(NAV, NAV_EVIDENCE_DIST, navBuildStarted);

  const sourceAfterBuild = {
    platform: trackedSourceDigest(PLAT),
    navigator: trackedSourceDigest(NAV),
  };
  const sourceDeltaAfterBuild = {
    platform: assertSourceDigestUnchanged(
      PLAT,
      'platform',
      sourceAtStart.platform,
      sourceAfterBuild.platform,
      [],
      (f) => (f === 'tsconfig.json' ? tsconfigIncludeDistDriftOk(PLAT, PLAT_EVIDENCE_DIST) : { ok: false }),
    ),
    navigator: assertSourceDigestUnchanged(
      NAV,
      'navigator',
      sourceAtStart.navigator,
      sourceAfterBuild.navigator,
      [],
      (f) => (f === 'tsconfig.json' ? tsconfigIncludeDistDriftOk(NAV, NAV_EVIDENCE_DIST) : { ok: false }),
    ),
  };

  const gateUnit = runRecorded(
    process.execPath,
    [
      '--test',
      'scripts/lib/__tests__/unified-prep-evidence-gates.test.mjs',
      'scripts/lib/__tests__/unified-prep-cleanup.test.mjs',
      'scripts/lib/__tests__/unified-prep-cleanup-template.test.mjs',
    ],
    PLAT,
  );

  const loginComponents = runRecorded(
    'npm',
    ['run', 'test:component', '--', 'src/components/auth/LoginExperience.test.tsx', 'src/components/auth/AuthFlow.test.tsx'],
    PLAT,
    { ...process.env, NODE_ENV: 'test' },
  );
  const loginCompOut = `${loginComponents.stdout}\n${loginComponents.stderr}`;
  const loginPass = loginCompOut.match(/Tests\s+(\d+) passed/);

  const guardUnit = runRecorded(
    process.execPath,
    [
      '--test',
      'artifacts/remcard-login-layout-01/disposable-db-url-guard.test.mjs',
      'artifacts/remcard-login-layout-01/login-layout-cleanup-orchestration.test.mjs',
    ],
    PLAT,
  );
  const guardCounts = countNodeTest(`${guardUnit.stdout}\n${guardUnit.stderr}`);

  const platformR06Unit = runRecorded(
    'pnpm',
    ['exec', 'vitest', 'run', 'src/lib/taxonomy-proposal-api.wire.test.ts', 'src/lib/remcard-proxy-r06-tail.test.ts'],
    PLAT,
  );

  const dbUrl =
    process.env.DATABASE_URL || 'postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test';
  const pgEnv = { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl };
  const pgEvidence = runRecorded(process.execPath, ['scripts/r06-release-prep-evidence.mjs'], NAV, {
    ...pgEnv,
    R06_RELEASE_PREP_OUT_DIR: SCRATCH_PG_OUT,
  });

  const navUnit = runRecorded(
    process.execPath,
    [
      '--test',
      'scripts/lib/__tests__/prof-r06-release-operator-target.test.mjs',
      'scripts/lib/__tests__/prof-r06-schema-prefix-preflight.test.mjs',
      'scripts/lib/__tests__/prof-r06-partial-schema.test.mjs',
      'scripts/lib/__tests__/spawn-run-record.test.mjs',
      'scripts/lib/__tests__/unified-prep-specialist-state.test.mjs',
    ],
    NAV,
  );

  const authRereg = runRecorded(
    'pnpm',
    ['exec', 'vitest', 'run', 'src/lib/__tests__/messengerAuthIdentity.test.ts'],
    NAV,
    pgEnv,
  );
  const maxEntry = runRecorded(
    'pnpm',
    ['exec', 'vitest', 'run', 'src/lib/__tests__/maxProfLoginSiteUrl.test.ts'],
    NAV,
    pgEnv,
  );

  let browserPayload = { status: 'NOT_RUN', error: 'not started' };
  try {
    process.env.UNIFIED_PREP_BROWSER_JSON = SCRATCH_BROWSER_JSON;
    browserPayload = await runUnifiedPrepBrowserSmoke();
  } catch (e) {
    browserPayload = { status: 'FAIL', error: String(e?.message ?? e) };
  }

  const sourceAfterAll = {
    platform: trackedSourceDigest(PLAT),
    navigator: trackedSourceDigest(NAV),
  };
  const sourceDeltaFinal = {
    platform: assertSourceDigestUnchanged(
      PLAT,
      'platform',
      sourceAtStart.platform,
      sourceAfterAll.platform,
      ['scripts/\\.login-layout-.*'],
      (f) => (f === 'tsconfig.json' ? tsconfigIncludeDistDriftOk(PLAT, PLAT_EVIDENCE_DIST) : { ok: false }),
    ),
    navigator: assertSourceDigestUnchanged(
      NAV,
      'navigator',
      sourceAtStart.navigator,
      sourceAfterAll.navigator,
      ['scripts/\\.login-layout-.*'],
      (f) => (f === 'tsconfig.json' ? tsconfigIncludeDistDriftOk(NAV, NAV_EVIDENCE_DIST) : { ok: false }),
    ),
  };
  writeFileSync(
    SOURCE_DELTA_MANIFEST,
    `${JSON.stringify({ sourceAtStart, sourceAfterBuild, sourceAfterAll, sourceDeltaAfterBuild, sourceDeltaFinal }, null, 2)}\n`,
  );

  if (builtCodeSha.platform !== gitHead(PLAT) || builtCodeSha.navigator !== gitHead(NAV)) {
    throw new Error('code HEAD changed during evidence run');
  }

  const payload = {
    task: 'UNIFIED-LOGIN-SPECIALIST-PREP-01.2',
    capturedAt: new Date().toISOString(),
    provenance: {
      builtCodeSha,
      evidenceRunnerGitHead: gitHead(PLAT),
      treeAtEvidenceStart: treeAtStart,
      sourceAtStart,
      sourceDeltaManifest: SOURCE_DELTA_MANIFEST,
      note: 'Production build uses isolated dist dirs; browser uses separate MOCK development runtime stack',
    },
    productionBuild: {
      platform: {
        command: 'npm ci --include=dev && npm run build',
        distDir: PLAT_EVIDENCE_DIST,
        npmCiExitCode: npmCi.exitCode,
        buildExitCode: platBuild.exitCode,
        BUILD_ID: platBuildId.id,
        buildIdMtimeMs: platBuildId.mtimeMs,
        sourceSha: builtCodeSha.platform,
        npmCiLog: PLAT_NPM_CI_LOG,
        buildLog: platBuildLog,
        legalEnvNote: LOCAL_BUILD_LEGAL.note,
      },
      navigator: {
        command: 'pnpm run build',
        distDir: NAV_EVIDENCE_DIST,
        exitCode: navBuild.exitCode,
        BUILD_ID: navBuildId.id,
        buildIdMtimeMs: navBuildId.mtimeMs,
        sourceSha: builtCodeSha.navigator,
        buildLog: navBuildLog,
        legalEnvNote: LOCAL_BUILD_LEGAL.note,
      },
    },
    tests: {
      gateUnit,
      loginAuthComponents: {
        command: loginComponents.command,
        exitCode: loginComponents.exitCode,
        passed: loginPass ? Number(loginPass[1]) : null,
        skipped: 0,
      },
      loginGuardUnit: { ...guardUnit, counts: guardCounts },
      platformR06Unit,
      navigatorR06Unit: navUnit,
      authReregistration: authRereg,
      maxEntry,
      disposableLoginBrowser: browserPayload,
    },
    pg: {
      exitCode: pgEvidence.exitCode,
      stdout: pgEvidence.stdout.trim().slice(0, 8000),
      stderr: pgEvidence.stderr.trim().slice(0, 2000),
    },
    gate: 'PROF_R06_SPECIALIST_PROFILE_ENABLED defaults OFF (global)',
  };

  const finalizedLogs = {
    platNpmCi: writeLog(PLAT_NPM_CI_LOG, readFileSync(SCRATCH_PLAT_NPM_CI_LOG, 'utf8')),
    platBuild: writeLog(PLAT_BUILD_LOG, readFileSync(SCRATCH_PLAT_BUILD_LOG, 'utf8')),
    navBuild: writeLog(NAV_BUILD_LOG, readFileSync(SCRATCH_NAV_BUILD_LOG, 'utf8')),
  };
  payload.provenance.buildLogFinalization = finalizedLogs;

  const pgArtifactDir = path.join(PLAT, 'artifacts/remcard-r06-specialist');
  payload.provenance.pgArtifactFinalization = copyScratchDirToArtifacts(SCRATCH_PG_OUT, pgArtifactDir);
  if (existsSync(SCRATCH_BROWSER_JSON)) {
    mkdirSync(OUT, { recursive: true });
    copyFileSync(SCRATCH_BROWSER_JSON, path.join(OUT, 'UNIFIED-PREP-01-BROWSER.json'));
    payload.provenance.browserJsonFinalized = path.join(OUT, 'UNIFIED-PREP-01-BROWSER.json');
  }

  const checksum = writeEvidence(payload);

  const browserOk = browserPayload.status === 'PASS';
  const ok = Boolean(
    npmCi.exitCode === 0 &&
      platBuild.exitCode === 0 &&
      navBuild.exitCode === 0 &&
      platBuildId.id &&
      navBuildId.id &&
      gateUnit.exitCode === 0 &&
      loginComponents.exitCode === 0 &&
      guardUnit.exitCode === 0 &&
      platformR06Unit.exitCode === 0 &&
      navUnit.exitCode === 0 &&
      pgEvidence.exitCode === 0 &&
      authRereg.exitCode === 0 &&
      maxEntry.exitCode === 0 &&
      browserOk,
  );

  console.log(
    JSON.stringify({
      ok,
      jsonOut: JSON_OUT,
      sha256: checksum.digest,
      bytes: checksum.byteLength,
      builtCodeSha,
      browserStatus: browserPayload.status,
    }),
  );
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
