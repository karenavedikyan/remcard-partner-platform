#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
  const meta = JSON.parse(readFileSync(path.join(runDir, 'meta.json'), 'utf8'));
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
    ],
    ROOT,
    env,
  );
  const browserBff = run(['node', 'scripts/r06-browser-bff.mjs'], ROOT, {
    ...env,
    R06_RUN_DIR: runDir,
  });
  const visual = run(['node', 'scripts/r06-visual-pairs.mjs'], ROOT, {
    ...env,
    R06_RUN_DIR: runDir,
  });

  const report = {
    ok: false,
    gate: meta.gateEnabled !== false ? 'on' : 'off',
    navigatorSha: meta.navigatorSha,
    platformSha: meta.platformSha,
    referenceSha: '771cc658a415a5d05b964f29f675d32db449198b',
    steps: {
      migrationControlled: { exitCode: migration.exitCode, stdout: migration.stdout.slice(0, 500) },
      migrationNegatives: { exitCode: migrationNegatives.exitCode },
      integrationVitest: { exitCode: integration.exitCode },
      unitTsx: { exitCode: unit.exitCode },
      platformVitest: { exitCode: platformUnit.exitCode },
      browserBff: { exitCode: browserBff.exitCode },
      visualPairs: { exitCode: visual.exitCode },
    },
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
  writeFileSync(ARTIFACT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok }));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
