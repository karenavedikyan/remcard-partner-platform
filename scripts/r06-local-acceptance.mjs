#!/usr/bin/env node
/**
 * R06 API acceptance (requires running local stack + R06_FIXTURE env).
 * Gate-on: PROF_R06_SPECIALIST_PROFILE_ENABLED=1 on navigator.
 */
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

function runFixture(env, action) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', action], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`fixture ${action}: ${(res.stderr || res.stdout || '').slice(0, 500)}`);
  }
  return (res.stdout || '').trim();
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function main() {
  const runDir = process.env.R06_RUN_DIR;
  if (!runDir) {
    const report = {
      ok: false,
      skipped: true,
      reason: 'R06_RUN_DIR not set — start local prof stack first (see r02-local-stack pattern)',
    };
    mkdirSync(path.dirname(ARTIFACT), { recursive: true });
    writeFileSync(ARTIFACT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    process.exit(0);
  }
  const meta = JSON.parse(readFileSync(path.join(runDir, 'meta.json'), 'utf8'));
  const env = loadEnv(meta.envPath);
  env.PROF_R06_SPECIALIST_PROFILE_ENABLED = meta.gateEnabled === false ? '0' : '1';

  runFixture(env, 'push-schema');
  runFixture(env, 'seed');
  const token = runFixture(env, 'mint');
  const cookie = `remcard-token=${token}`;
  const nav = env.REMCARD_API_BASE_URL.replace(/\/$/, '');
  const plat = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  const report = { ok: false, gate: env.PROF_R06_SPECIALIST_PROFILE_ENABLED, steps: {} };
  report.steps.status = await fetchJson(`${plat}/api/remcard/api/pro/r06/status`, {
    headers: { Cookie: cookie },
  });
  report.steps.draftGet = await fetchJson(`${plat}/api/remcard/api/pro/specialist-profile/draft`, {
    headers: { Cookie: cookie },
  });
  report.steps.draftPatch = await fetchJson(`${plat}/api/remcard/api/pro/specialist-profile/draft`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'content-type': 'application/json', 'x-remcard-csrf': '1' },
    body: JSON.stringify({
      expectedVersion: report.steps.draftGet.body?.version ?? 0,
      step: 1,
      payload: { displayName: 'R06 Test Specialist', city: 'Krasnodar' },
    }),
  });

  const gateOn = env.PROF_R06_SPECIALIST_PROFILE_ENABLED === '1';
  report.ok =
    report.steps.status.status === 200 &&
    report.steps.status.body?.featureEnabled === gateOn &&
    report.steps.status.body?.eligible === gateOn &&
    report.steps.draftGet.status === (gateOn ? 200 : 403) &&
    (gateOn ? report.steps.draftPatch.status === 200 : true);

  mkdirSync(path.dirname(ARTIFACT), { recursive: true });
  writeFileSync(ARTIFACT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
