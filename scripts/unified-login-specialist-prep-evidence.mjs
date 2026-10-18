#!/usr/bin/env node
/** UNIFIED-LOGIN-SPECIALIST-PREP-01.1 disposable evidence (no prod). */
import { createHash } from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runUnifiedPrepBrowserSmoke } from './unified-login-specialist-prep-browser.mjs';

const PLAT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = path.resolve(PLAT, '../remcard-navigator');
const OUT = path.join(PLAT, 'artifacts/unified-login-specialist-prep');
const JSON_OUT = path.join(OUT, 'UNIFIED-PREP-01-EVIDENCE.json');
const SHA_OUT = path.join(OUT, 'UNIFIED-PREP-01-EVIDENCE.sha256');
const PLAT_BUILD_LOG = path.join(OUT, 'UNIFIED-PREP-01-plat-build.log');
const PLAT_NPM_CI_LOG = path.join(OUT, 'UNIFIED-PREP-01-plat-npm-ci.log');
const NAV_BUILD_LOG = path.join(OUT, 'UNIFIED-PREP-01-nav-build.log');

const LOCAL_BUILD_LEGAL = {
  PLATFORM_INN: process.env.PLATFORM_INN || '0000000000',
  PLATFORM_OGRN: process.env.PLATFORM_OGRN || '0000000000000',
  note: 'placeholder legal ids for disposable local production build only — not prod readiness',
};

function gitHead(cwd) {
  return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
}

function gitDirty(cwd) {
  const out = execSync('git status --porcelain', { cwd, encoding: 'utf8' }).trim();
  return { dirty: Boolean(out), files: out ? out.split('\n') : [] };
}

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
  const platDirty = gitDirty(PLAT);
  const navDirty = gitDirty(NAV);
  if (platDirty.dirty || navDirty.dirty) {
    throw new Error(
      `refusing evidence: dirty tree platform=${platDirty.dirty} navigator=${navDirty.dirty}`,
    );
  }
  return { platform: gitHead(PLAT), navigator: gitHead(NAV) };
}

function assertHeadUnchanged(builtCodeSha) {
  const now = { platform: gitHead(PLAT), navigator: gitHead(NAV) };
  if (now.platform !== builtCodeSha.platform || now.navigator !== builtCodeSha.navigator) {
    throw new Error(`code HEAD changed during evidence run: start ${JSON.stringify(builtCodeSha)} now ${JSON.stringify(now)}`);
  }
}

function readBuildId(cwd, distDir = '.next') {
  const p = path.join(cwd, distDir, 'BUILD_ID');
  if (!existsSync(p)) return null;
  const id = readFileSync(p, 'utf8').trim();
  return id || null;
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

function writeEvidence(payload) {
  writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2) + '\n');
  const bytes = readFileSync(JSON_OUT);
  const digest = sha256Bytes(bytes);
  writeFileSync(SHA_OUT, `${digest}  UNIFIED-PREP-01-EVIDENCE.json\n`);
  return { digest, byteLength: bytes.length };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const builtCodeSha = assertCleanCommittedHeads();
  const treeAtStart = { platform: gitDirty(PLAT), navigator: gitDirty(NAV) };

  if (existsSync(path.join(PLAT, '.next'))) {
    rmSync(path.join(PLAT, '.next'), { recursive: true, force: true });
  }

  const npmCi = runRecorded('npm', ['ci', '--include=dev'], PLAT);
  writeLog(PLAT_NPM_CI_LOG, `${npmCi.stdout}\n${npmCi.stderr}`);
  if (npmCi.exitCode !== 0) {
    throw new Error(`npm ci failed exit ${npmCi.exitCode}`);
  }

  const platBuild = runRecorded('npm', ['run', 'build'], PLAT, {
    ...process.env,
    ...LOCAL_BUILD_LEGAL,
  });
  const platBuildLog = writeLog(
    PLAT_BUILD_LOG,
    `${platBuild.stdout}\n${platBuild.stderr}`,
  );
  if (platBuild.exitCode !== 0) {
    throw new Error(`platform build failed exit ${platBuild.exitCode}`);
  }
  try {
    execSync('git restore next-env.d.ts', { cwd: PLAT, stdio: 'ignore' });
  } catch {
    /* optional */
  }
  const platBuildId = readBuildId(PLAT);
  if (!platBuildId) {
    throw new Error('platform BUILD_ID missing or empty after build');
  }

  const navBuild = runRecorded('pnpm', ['run', 'build'], NAV, {
    ...process.env,
    ...LOCAL_BUILD_LEGAL,
  });
  const navBuildLog = writeLog(NAV_BUILD_LOG, `${navBuild.stdout}\n${navBuild.stderr}`);
  if (navBuild.exitCode !== 0) {
    throw new Error(`navigator build failed exit ${navBuild.exitCode}`);
  }
  const navBuildId = readBuildId(NAV);
  if (!navBuildId) {
    throw new Error('navigator BUILD_ID missing or empty after build');
  }

  assertHeadUnchanged(builtCodeSha);

  const loginComponents = runRecorded(
    'npm',
    [
      'run',
      'test:component',
      '--',
      'src/components/auth/LoginExperience.test.tsx',
      'src/components/auth/AuthFlow.test.tsx',
    ],
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
    [
      'exec',
      'vitest',
      'run',
      'src/lib/taxonomy-proposal-api.wire.test.ts',
      'src/lib/remcard-proxy-r06-tail.test.ts',
    ],
    PLAT,
  );

  const dbUrl =
    process.env.DATABASE_URL || 'postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test';
  const pgEnv = { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl };
  const pgEvidence = runRecorded(process.execPath, ['scripts/r06-release-prep-evidence.mjs'], NAV, pgEnv);

  const navUnit = runRecorded(
    process.execPath,
    [
      '--test',
      'scripts/lib/__tests__/prof-r06-release-operator-target.test.mjs',
      'scripts/lib/__tests__/prof-r06-schema-prefix-preflight.test.mjs',
      'scripts/lib/__tests__/prof-r06-partial-schema.test.mjs',
      'scripts/lib/__tests__/spawn-run-record.test.mjs',
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
    browserPayload = await runUnifiedPrepBrowserSmoke();
  } catch (e) {
    browserPayload = { status: 'FAIL', error: String(e?.message ?? e) };
  }

  assertHeadUnchanged(builtCodeSha);
  const evidenceRunnerHead = gitHead(PLAT);

  const payload = {
    task: 'UNIFIED-LOGIN-SPECIALIST-PREP-01.1',
    capturedAt: new Date().toISOString(),
    provenance: {
      builtCodeSha,
      evidenceRunnerGitHead: evidenceRunnerHead,
      treeAtEvidenceStart: treeAtStart,
      note: 'builtCodeSha must match EXPECT_PLATFORM_HEAD/EXPECT_NAV_HEAD; evidenceRunnerGitHead is platform HEAD after run (evidence-only commit follows separately)',
    },
    productionBuild: {
      platform: {
        command: 'npm ci --include=dev && npm run build',
        npmCiExitCode: npmCi.exitCode,
        buildExitCode: platBuild.exitCode,
        BUILD_ID: platBuildId,
        sourceSha: builtCodeSha.platform,
        npmCiLog: PLAT_NPM_CI_LOG,
        buildLog: platBuildLog,
        legalEnvNote: LOCAL_BUILD_LEGAL.note,
      },
      navigator: {
        command: 'pnpm run build',
        exitCode: navBuild.exitCode,
        BUILD_ID: navBuildId,
        sourceSha: builtCodeSha.navigator,
        buildLog: navBuildLog,
        legalEnvNote: LOCAL_BUILD_LEGAL.note,
      },
    },
    tests: {
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
      stdout: pgEvidence.stdout.trim().slice(0, 4000),
      stderr: pgEvidence.stderr.trim().slice(0, 2000),
    },
    gate: 'PROF_R06_SPECIALIST_PROFILE_ENABLED defaults OFF (global)',
  };

  const checksum = writeEvidence(payload);

  const browserOk = browserPayload.status === 'PASS';
  const ok =
    npmCi.exitCode === 0 &&
    platBuild.exitCode === 0 &&
    navBuild.exitCode === 0 &&
    platBuildId &&
    navBuildId &&
    loginComponents.exitCode === 0 &&
    guardUnit.exitCode === 0 &&
    platformR06Unit.exitCode === 0 &&
    navUnit.exitCode === 0 &&
    pgEvidence.exitCode === 0 &&
    authRereg.exitCode === 0 &&
    maxEntry.exitCode === 0 &&
    browserOk;

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
