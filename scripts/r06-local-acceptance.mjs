#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  countVitestPassed,
  gitRevParse,
  loadRunMeta,
  probeRunStack,
  writeJson,
} from './lib/r06-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R06_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const ARTIFACT = path.join(ROOT, 'artifacts/remcard-r06-specialist/TEST-RESULTS.json');

function loadEnv(envPath) {
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function run(cmd, cwd, env) {
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd, env, encoding: 'utf8' });
  return { exitCode: res.status ?? 1, stdout: res.stdout || '', stderr: res.stderr || '' };
}

async function main() {
  const runDir = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';
  if (!readFileSync(path.join(runDir, 'meta.json'), 'utf8')) {
    throw new Error('missing meta.json — run scripts/r06-local-stack.mjs first');
  }
  const expectNavigatorSha =
    process.env.R06_EXPECT_NAV_SHA || '04613f09400b54c894fa192a81b09834c8797fd5';
  const expectPlatformCodeSha =
    process.env.R06_EXPECT_PLATFORM_CODE_SHA || 'e18487ad634e9a8e33ebbb08d55eb16aa3b8d889';
  const { report: probeReport } = await probeRunStack({
    runDir,
    navRoot: NAV_ROOT,
    platRoot: ROOT,
    expectNavigatorSha,
    expectPlatformCodeSha,
  });
  const meta = loadRunMeta(runDir);
  const env = loadEnv(meta.envPath);
  env.JWT_SECRET = env.JWT_SECRET || 'prof-r01-route-test-secret-min-32-chars!!';

  const migration = run(['node', 'scripts/r06-migration-controlled.mjs'], NAV_ROOT, env);
  const migrationNegatives = run(['node', 'scripts/r06-migration-negatives.mjs'], NAV_ROOT, env);
  const integration = run(
    ['pnpm', 'exec', 'vitest', 'run', 'src/lib/__tests__/profR06SpecialistRoute.integration.test.ts'],
    NAV_ROOT,
    env,
  );
  const unit = run(
    [
      'pnpm',
      'exec',
      'tsx',
      '--test',
      'src/lib/__tests__/profR06Config.test.ts',
      'src/lib/__tests__/specialistR06CatalogSubmit.test.ts',
      'src/lib/__tests__/specialistProfileDraft.test.ts',
      'scripts/lib/__tests__/prof-r06-migration-negative-runner.test.mjs',
    ],
    NAV_ROOT,
    env,
  );
  const platformUnit = run(
    [
      'pnpm',
      'exec',
      'vitest',
      'run',
      'src/components/profile/specialist/SpecialistWorkingProfileWizard.version.test.tsx',
      'src/lib/profile-save.submit.test.tsx',
      'src/components/profile/specialist/SpecialistCatalogSection.test.tsx',
    ],
    ROOT,
    { ...env, NODE_ENV: 'test' },
  );
  const browserBff = run(['node', 'scripts/r06-browser-bff.mjs'], ROOT, {
    ...env,
    R06_RUN_DIR: runDir,
  });
  const visual = run(['node', 'scripts/r06-visual-pairs.mjs'], ROOT, {
    ...env,
    R06_RUN_DIR: runDir,
  });

  const runnerPlatformHead = gitRevParse(ROOT);
  const runtimeNav = meta.runtime.navigator.gitHead;
  const runtimePlatCode = meta.runtime.platform.applicationCodeSha;
  const runtimePlatBuilt = meta.runtime.platform.gitHead;

  const report = {
    ok: false,
    gate: meta.gateEnabled !== false ? 'on' : 'off',
    referenceSha: '771cc658a415a5d05b964f29f675d32db449198b',
    runDir,
    probeReportPath: path.join(runDir, 'probe-report.json'),
    runtime: {
      navigator: {
        gitHead: runtimeNav,
        nextBuildId: meta.runtime.navigator.nextBuildId,
        gitDirty: meta.runtime.navigator.gitDirty,
        port: meta.navPort,
      },
      platform: {
        applicationCodeSha: runtimePlatCode,
        builtGitHead: runtimePlatBuilt,
        nextBuildId: meta.runtime.platform.nextBuildId,
        gitDirty: meta.runtime.platform.gitDirty,
        port: meta.platformPort,
      },
    },
    runner: {
      acceptanceInvokedPlatformGitHead: runnerPlatformHead,
      docsTipOnly: runnerPlatformHead !== runtimePlatCode,
    },
    probe: probeReport,
    priorFullAcceptanceTipSha: 'afea396c2d68817301756eaa521b9c8ea832c605',
    legacyPreviewRuntimeSha: 'c89cea48766c0c8149122075da4251be7eeb4969',
    /** @deprecated — use runtime.* */
    navigatorSha: runtimeNav,
    platformSha: runtimePlatCode,
    steps: {
      migrationControlled: { exitCode: migration.exitCode, stdout: migration.stdout.slice(0, 500) },
      migrationNegatives: { exitCode: migrationNegatives.exitCode },
      integrationVitest: {
        exitCode: integration.exitCode,
        testsPassed: countVitestPassed(integration.stdout),
      },
      unitTsx: { exitCode: unit.exitCode, testsPassed: countVitestPassed(unit.stdout) },
      platformVitest: {
        exitCode: platformUnit.exitCode,
        testsPassed: countVitestPassed(platformUnit.stdout),
      },
      browserBff: { exitCode: browserBff.exitCode },
      visualPairs: { exitCode: visual.exitCode },
    },
    carryOver: {
      note: 'Full PG migration negative suite last pinned at navigator 04613f09; not re-attributed to new docs SHAs',
      backendEvidenceSha: runtimeNav,
    },
    openScope: ['taxonomy auto-add — not implemented'],
    visualExceptionsNot1to1: [
      'specialization search styling vs ref',
      'footer submit alignment / full-width mobile',
      'catalog CTA primary vs ref secondary',
    ],
  };

  report.ok =
    migration.exitCode === 0 &&
    migrationNegatives.exitCode === 0 &&
    integration.exitCode === 0 &&
    unit.exitCode === 0 &&
    platformUnit.exitCode === 0 &&
    browserBff.exitCode === 0 &&
    visual.exitCode === 0;

  mkdirSync(path.dirname(ARTIFACT), { recursive: true });
  writeJson(ARTIFACT, report);
  writeJson(path.join(runDir, 'acceptance-finished.json'), {
    finishedAt: new Date().toISOString(),
    ok: report.ok,
    testResultsPath: ARTIFACT,
  });
  console.log(JSON.stringify({ ok: report.ok }));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
