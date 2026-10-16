#!/usr/bin/env node
/**
 * AGENT-PROFILE-PARITY RC: build + unit tests + optional visual (r02-profile-visual).
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const ART = path.join(ROOT, 'artifacts/remcard-agent-profile-parity');

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

mkdirSync(ART, { recursive: true });
const platformSha = gitSha(ROOT);
const navigatorSha = gitSha(NAV);

const steps = [];
steps.push(run(['npm', 'run', 'build'], ROOT));
steps.push(
  run(
    ['npx', 'vitest', 'run', 'src/lib/profile-sections.test.ts', 'src/components/profile/agent/AgentProfileWizard.regression.test.tsx'],
    ROOT,
  ),
);

let visual = { skipped: true, reason: 'set AGENT_PROFILE_VISUAL=1 to run r02-profile-visual' };
if (process.env.AGENT_PROFILE_VISUAL === '1') {
  const v = run(['node', 'scripts/r02-profile-visual.mjs'], ROOT);
  visual = { exitCode: v.exitCode, cmd: v.cmd };
}

const ok = steps.every((s) => s.exitCode === 0) && (visual.skipped || visual.exitCode === 0);

writeFileSync(
  path.join(ART, 'TEST-RESULTS.json'),
  JSON.stringify(
    {
      platformSha,
      navigatorSha,
      ok,
      verifiedAt: new Date().toISOString(),
      steps,
      visual,
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({ ok, platformSha, art: ART }, null, 2));
process.exit(ok ? 0 : 1);
