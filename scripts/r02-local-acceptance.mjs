#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';
const ARTIFACT_GATE_ON = path.join(ROOT, 'artifacts/remcard-r02/local-auth-evidence-gate-on.json');
const ARTIFACT_GATE_OFF = path.join(ROOT, 'artifacts/remcard-r02/local-auth-evidence-gate-off.json');

function loadRuntimeEnv(envPath) {
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function runNavFixture(env, action) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', action], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`fixture ${action} failed: ${(res.stderr || res.stdout || '').slice(0, 400)}`);
  }
  return (res.stdout || '').trim();
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function authChain(env, token) {
  const cookie = `remcard-token=${token}`;
  const nav = env.REMCARD_API_BASE_URL.replace(/\/$/, '');
  const plat = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const steps = {};
  steps.backendMe = await fetchJson(`${nav}/api/auth/me`, { headers: { Cookie: cookie } });
  steps.bffMe = await fetchJson(`${plat}/api/remcard/api/auth/me`, { headers: { Cookie: cookie } });
  steps.bffStatus = await fetchJson(`${plat}/api/remcard/api/pro/agent-profile/status`, {
    headers: { Cookie: cookie },
  });
  steps.bffDraft = await fetchJson(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    headers: { Cookie: cookie },
  });
  return steps;
}

async function csrfNegative(env, token) {
  const plat = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const res = await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    method: 'PATCH',
    headers: {
      Cookie: `remcard-token=${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      expectedVersion: 0,
      expectedEpoch: 0,
      mode: 'save',
      payload: {},
    }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main() {
  const metaPath = path.join(RUN_DIR, 'meta.json');
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const env = loadRuntimeEnv(meta.envPath);
  const gateOn = meta.gateEnabled !== false;
  const artifact = gateOn ? ARTIFACT_GATE_ON : ARTIFACT_GATE_OFF;
  mkdirSync(path.dirname(artifact), { recursive: true });

  runNavFixture(env, 'push-schema');
  runNavFixture(env, 'seed');
  const token = runNavFixture(env, 'mint');
  const report = { ok: false, gate: gateOn ? 'on' : 'off', steps: {} };
  report.steps.auth = await authChain(env, token);
  report.steps.csrf = await csrfNegative(env, token);
  const authOk =
    report.steps.auth.backendMe.status === 200 &&
    report.steps.auth.backendMe.body?.user?.id &&
    report.steps.auth.bffMe.status === 200 &&
    report.steps.auth.bffMe.body?.user?.id &&
    report.steps.auth.bffStatus.status === 200 &&
    (gateOn
      ? report.steps.auth.bffDraft.status === 200 &&
        report.steps.auth.bffStatus.body?.featureEnabled === true &&
        report.steps.auth.bffStatus.body?.eligible === true
      : report.steps.auth.bffStatus.body?.featureEnabled === false &&
        report.steps.auth.bffDraft.status === 403);

  if (!authOk) {
    report.failure = 'auth_chain';
    writeFileSync(artifact, JSON.stringify(report, null, 2));
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  if (report.steps.csrf.status !== 403) {
    report.failure = 'csrf_expected_403';
    writeFileSync(artifact, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.ok = true;
  report.platformOrigin = meta.platformOrigin;
  report.navOrigin = meta.navOrigin;
  report.tokenIssuedFor = env.R02_FIXTURE_USER_ID;
  writeFileSync(artifact, JSON.stringify(report, null, 2));
  writeFileSync(path.join(RUN_DIR, 'session.json'), JSON.stringify({ token, platformOrigin: meta.platformOrigin }, null, 2), {
    mode: 0o600,
  });

  if (process.env.R02_SKIP_PROFILE_E2E !== '1') {
    const e2e = spawnSync('node', ['scripts/r02-local-profile-e2e.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    report.profileE2e = { exitCode: e2e.status ?? 1 };
    if (e2e.status !== 0) {
      report.failure = 'profile_e2e';
      writeFileSync(artifact, JSON.stringify(report, null, 2));
      console.error((e2e.stderr || e2e.stdout || '').slice(0, 800));
      process.exit(1);
    }
    report.profileE2e.artifact = 'artifacts/remcard-r02/profile-e2e-evidence.json';
  }

  writeFileSync(artifact, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, artifact, gate: gateOn ? 'on' : 'off' }));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
