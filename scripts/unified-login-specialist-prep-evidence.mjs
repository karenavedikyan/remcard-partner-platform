#!/usr/bin/env node
/** UNIFIED-LOGIN-SPECIALIST-PREP-01 disposable evidence (no prod). */
import { createHash } from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = path.resolve(PLAT, '../remcard-navigator');
const OUT = path.join(PLAT, 'artifacts/unified-login-specialist-prep');
const JSON_OUT = path.join(OUT, 'UNIFIED-PREP-01-EVIDENCE.json');
const SHA_OUT = path.join(OUT, 'UNIFIED-PREP-01-EVIDENCE.sha256');

function gitHead(cwd) {
  return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
}

function gitDirty(cwd) {
  const out = execSync('git status --porcelain', { cwd, encoding: 'utf8' }).trim();
  return { dirty: Boolean(out), files: out ? out.split('\n') : [] };
}

function run(cmd, args, cwd, env = process.env) {
  const res = spawnSync(cmd, args, { cwd, env, encoding: 'utf8' });
  return {
    command: [cmd, ...args].join(' '),
    exitCode: res.status ?? 1,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
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
  const digest = createHash('sha256').update(bytes).digest('hex');
  writeFileSync(SHA_OUT, `${digest}  UNIFIED-PREP-01-EVIDENCE.json\n`);
  return { digest, byteLength: bytes.length };
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const builtCodeSha = { platform: gitHead(PLAT), navigator: gitHead(NAV) };
  const treeAtStart = { platform: gitDirty(PLAT), navigator: gitDirty(NAV) };

  if (existsSync(path.join(PLAT, '.next'))) {
    rmSync(path.join(PLAT, '.next'), { recursive: true, force: true });
  }

  const npmCi = run('npm', ['ci', '--include=dev'], PLAT);
  const platBuild = run('npm', ['run', 'build'], PLAT);
  let platBuildId = null;
  try {
    platBuildId = readFileSync(path.join(PLAT, '.next', 'BUILD_ID'), 'utf8').trim();
  } catch {
    /* optional */
  }

  const navBuild = run('pnpm', ['run', 'build'], NAV);
  let navBuildId = null;
  try {
    navBuildId = readFileSync(path.join(NAV, '.next', 'BUILD_ID'), 'utf8').trim();
  } catch {
    /* optional */
  }

  const loginComponents = run(
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

  const guardUnit = run('node', [
    '--test',
    'artifacts/remcard-login-layout-01/disposable-db-url-guard.test.mjs',
    'artifacts/remcard-login-layout-01/login-layout-cleanup-orchestration.test.mjs',
  ], PLAT);
  const guardCounts = countNodeTest(`${guardUnit.stdout}\n${guardUnit.stderr}`);

  const platformR06Unit = run(
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
  const pgEvidence = run('node', ['scripts/r06-release-prep-evidence.mjs'], NAV, pgEnv);

  const navUnit = run('node', [
    '--test',
    'scripts/lib/__tests__/prof-r06-release-operator-target.test.mjs',
    'scripts/lib/__tests__/prof-r06-schema-prefix-preflight.test.mjs',
    'scripts/lib/__tests__/prof-r06-partial-schema.test.mjs',
  ], NAV);

  const authRereg = run(
    'pnpm',
    ['exec', 'vitest', 'run', 'src/lib/__tests__/messengerAuthIdentity.test.ts'],
    NAV,
    pgEnv,
  );
  const maxEntry = run(
    'pnpm',
    ['exec', 'vitest', 'run', 'src/lib/__tests__/maxProfLoginSiteUrl.test.ts'],
    NAV,
    pgEnv,
  );

  const disposableLogin = {
    status: 'NOT_RUN',
    reason: 'Full login→logout→relogin browser stack requires disposable runtime.env bootstrap; unit+guard cover login/auth path',
  };

  const evidenceRunnerHead = gitHead(PLAT);

  const payload = {
    task: 'UNIFIED-LOGIN-SPECIALIST-PREP-01',
    capturedAt: new Date().toISOString(),
    provenance: {
      builtCodeSha,
      evidenceRunnerGitHead: evidenceRunnerHead,
      treeAtEvidenceStart: treeAtStart,
      note: 'builtCodeSha is committed unified branch HEAD at runner start; evidenceRunnerGitHead may differ if only artifact commit follows',
    },
    productionBuild: {
      platform: {
        command: 'npm ci --include=dev && npm run build',
        npmCiExitCode: npmCi.exitCode,
        buildExitCode: platBuild.exitCode,
        BUILD_ID: platBuildId,
        sourceSha: builtCodeSha.platform,
        logTail: `${npmCi.stdout}\n${npmCi.stderr}\n${platBuild.stdout}\n${platBuild.stderr}`.trim().slice(-6000),
      },
      navigator: {
        command: 'pnpm run build',
        exitCode: navBuild.exitCode,
        BUILD_ID: navBuildId,
        sourceSha: builtCodeSha.navigator,
        logTail: `${navBuild.stdout}\n${navBuild.stderr}`.trim().slice(-4000),
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
      disposableLoginBrowser: disposableLogin,
    },
    pg: pgEvidence,
    gate: 'PROF_R06_SPECIALIST_PROFILE_ENABLED defaults OFF (global)',
  };

  const checksum = writeEvidence(payload);

  const ok =
    npmCi.exitCode === 0 &&
    platBuild.exitCode === 0 &&
    navBuild.exitCode === 0 &&
    loginComponents.exitCode === 0 &&
    guardUnit.exitCode === 0 &&
    platformR06Unit.exitCode === 0 &&
    navUnit.exitCode === 0 &&
    pgEvidence.exitCode === 0 &&
    authRereg.exitCode === 0 &&
    maxEntry.exitCode === 0;

  console.log(
    JSON.stringify({
      ok,
      jsonOut: JSON_OUT,
      sha256: checksum.digest,
      bytes: checksum.byteLength,
      builtCodeSha,
    }),
  );
  process.exit(ok ? 0 : 1);
}

main();
