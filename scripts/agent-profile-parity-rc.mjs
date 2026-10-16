#!/usr/bin/env node
/**
 * AGENT-PROFILE-PARITY RC: build + unit tests + full stack E2E/visual when JWT_SECRET present.
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const ART = path.join(ROOT, 'artifacts/remcard-agent-profile-parity');
const SHOTS = path.join(ART, 'screenshots');

function run(cmd, cwd = ROOT) {
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd, encoding: 'utf8', shell: false });
  return {
    cmd: cmd.join(' '),
    exitCode: res.status ?? 1,
    stdout: (res.stdout || '').slice(-4000),
    stderr: (res.stderr || '').slice(-2000),
  };
}

function gitSha(cwd) {
  try {
    return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const PINNED_LABEL_MIGRATION_CHECKSUM =
  '2ff7aba98b6836df57cd1121f97539d608b2123e1d0aefa2b0650497e98d5cf6';

mkdirSync(SHOTS, { recursive: true });
const platformSha = gitSha(ROOT);
const navigatorSha = gitSha(NAV);

const steps = [];
steps.push(run(['npm', 'run', 'build'], ROOT));
steps.push(
  run(
    [
      'npx',
      'vitest',
      'run',
      'src/lib/profile-sections.test.ts',
      'src/lib/remcard-proxy-r02.test.ts',
      'src/lib/agent-profile/format-requisites-copy.test.ts',
      'src/components/profile/agent/AgentProfileWizard.regression.test.tsx',
      'src/components/profile/agent/AgentPayoutRequisitesPanel.test.tsx',
    ],
    ROOT,
  ),
);

let e2e = { skipped: true, reason: 'JWT_SECRET missing' };
if (process.env.JWT_SECRET?.trim()) {
  e2e = run(['node', 'scripts/agent-profile-parity-full.mjs'], ROOT);
  e2e.skipped = false;
}

const pngs = existsSync(SHOTS)
  ? readdirSync(SHOTS).filter((f) => f.endsWith('.png'))
  : [];

const ok =
  steps.every((s) => s.exitCode === 0) &&
  (e2e.skipped || e2e.exitCode === 0) &&
  (e2e.skipped || pngs.length >= 5);

writeFileSync(
  path.join(ART, 'TEST-RESULTS.json'),
  JSON.stringify(
    {
      platformSha,
      navigatorSha,
      labelMigrationChecksum: PINNED_LABEL_MIGRATION_CHECKSUM,
      ok,
      verifiedAt: new Date().toISOString(),
      steps,
      e2e: e2e.skipped ? e2e : { exitCode: e2e.exitCode, cmd: e2e.cmd },
      screenshots: pngs,
      visual: { skipped: e2e.skipped, pngCount: pngs.length },
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({ ok, platformSha, navigatorSha, pngCount: pngs.length, art: ART }, null, 2));
process.exit(ok ? 0 : 1);
