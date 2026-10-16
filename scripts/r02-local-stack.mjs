#!/usr/bin/env node
/**
 * Isolated R02 local stack (loopback only). Writes JWT secret to /tmp file — never logs it.
 */
import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync, spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';
const NAV_PORT = Number(process.env.R02_NAV_PORT || 3031);
const PLATFORM_PORT = Number(process.env.R02_PLATFORM_PORT || 3032);
const GATE_ENABLED = process.env.PROF_R02_AGENT_PROFILE_ENABLED !== '0';
const R03_GATE_ENABLED = process.env.PROF_R03_AGENT_CERTIFICATES_ENABLED !== '0';

const DB_URL =
  process.env.DATABASE_URL?.trim() ||
  'postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test';

function assertLoopbackDb(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Refusing stack: invalid DATABASE_URL');
  }
  const host = parsed.hostname;
  const db = parsed.pathname.replace(/^\//, '');
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error('Refusing stack: non-loopback DATABASE_URL');
  }
  if (!['remcard_r01_test', 'remcard_prof_test'].includes(db)) {
    throw new Error('Refusing stack: unexpected database name');
  }
}

function killPort(port) {
  try {
    execSync(`pkill -f "next dev -p ${port}" 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    const pids = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGKILL');
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

async function portFree(port, ms = 15_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const pids = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, {
        encoding: 'utf8',
      }).trim();
      if (!pids) return true;
    } catch {
      return true;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function wait(url, ms = 180_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

function spawnDev(cwd, port, extraEnv) {
  const env = {
    ...process.env,
    ...extraEnv,
    PORT: String(port),
  };
  const shellCmd = `exec pnpm exec next dev -p ${port}`;
  const child = spawn('bash', ['-lc', shellCmd], {
    cwd,
    env,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return child.pid;
}

async function main() {
  assertLoopbackDb(DB_URL);
  mkdirSync(RUN_DIR, { recursive: true });
  killPort(NAV_PORT);
  killPort(PLATFORM_PORT);
  if (!(await portFree(NAV_PORT)) || !(await portFree(PLATFORM_PORT))) {
    console.error(JSON.stringify({ error: 'ports_still_in_use', NAV_PORT, PLATFORM_PORT }));
    process.exit(1);
  }

  const jwtSecret = randomBytes(32).toString('base64url');
  const envPath = path.join(RUN_DIR, 'runtime.env');
  const envBody = [
    `JWT_SECRET=${jwtSecret}`,
    `DATABASE_URL=${DB_URL}`,
    `DIRECT_URL=${DB_URL}`,
    `PROF_R02_AGENT_PROFILE_ENABLED=${GATE_ENABLED ? 'true' : 'false'}`,
    `PROF_R03_AGENT_CERTIFICATES_ENABLED=${R03_GATE_ENABLED ? 'true' : 'false'}`,
    `R02_NAV_PORT=${NAV_PORT}`,
    `R02_PLATFORM_PORT=${PLATFORM_PORT}`,
    `REMCARD_API_BASE_URL=http://127.0.0.1:${NAV_PORT}`,
    `NEXT_PUBLIC_APP_URL=http://127.0.0.1:${PLATFORM_PORT}`,
    `R02_FIXTURE_USER_ID=r02-local-pro-agent-v1`,
  ].join('\n');
  writeFileSync(envPath, `${envBody}\n`, { mode: 0o600 });
  chmodSync(envPath, 0o600);

  const navPid = spawnDev(NAV_ROOT, NAV_PORT, {
    JWT_SECRET: jwtSecret,
    DATABASE_URL: DB_URL,
    DIRECT_URL: DB_URL,
    PROF_R02_AGENT_PROFILE_ENABLED: GATE_ENABLED ? 'true' : 'false',
    PROF_R03_AGENT_CERTIFICATES_ENABLED: R03_GATE_ENABLED ? 'true' : 'false',
    NEXT_PUBLIC_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
  });
  const platPid = spawnDev(ROOT, PLATFORM_PORT, {
    REMCARD_API_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PLATFORM_PORT}`,
  });

  const navOk = await wait(`http://127.0.0.1:${NAV_PORT}/api/health`);
  const platOk = await wait(`http://127.0.0.1:${PLATFORM_PORT}/login`);
  if (!navOk || !platOk) {
    console.error(JSON.stringify({ error: 'stack_start_failed', navOk, platOk }));
    process.exit(1);
  }

  const probeEnv = {
    ...process.env,
    JWT_SECRET: jwtSecret,
    DATABASE_URL: DB_URL,
    DIRECT_URL: DB_URL,
    R02_FIXTURE_USER_ID: 'r02-local-pro-agent-v1',
  };
  const schemaProbe = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', 'push-schema'], {
    cwd: NAV_ROOT,
    env: probeEnv,
    encoding: 'utf8',
  });
  if (schemaProbe.status !== 0) {
    console.error(JSON.stringify({ error: 'schema_probe_failed' }));
    process.exit(1);
  }
  const seedProbe = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', 'seed'], {
    cwd: NAV_ROOT,
    env: probeEnv,
    encoding: 'utf8',
  });
  if (seedProbe.status !== 0) {
    console.error(JSON.stringify({ error: 'seed_probe_failed' }));
    process.exit(1);
  }
  const mintProbe = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', 'mint'], {
    cwd: NAV_ROOT,
    env: probeEnv,
    encoding: 'utf8',
  });
  if (mintProbe.status !== 0) {
    console.error(JSON.stringify({ error: 'mint_probe_failed' }));
    process.exit(1);
  }
  const probeToken = (mintProbe.stdout || '').trim();
  let meBody = {};
  let meStatus = 0;
  for (let i = 0; i < 45; i++) {
    const meProbe = await fetch(`http://127.0.0.1:${NAV_PORT}/api/auth/me`, {
      headers: { Cookie: `remcard-token=${probeToken}` },
    });
    meStatus = meProbe.status;
    meBody = await meProbe.json().catch(() => ({}));
    if (meProbe.status === 200 && meBody.user?.id) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (meStatus !== 200 || !meBody.user?.id) {
    console.error(
      JSON.stringify({ error: 'jwt_align_failed', status: meStatus, hasUser: Boolean(meBody.user) }),
    );
    process.exit(1);
  }

  const platformOrigin = `http://127.0.0.1:${PLATFORM_PORT}`;
  let platformGitSha = 'unknown';
  let navigatorGitSha = 'unknown';
  try {
    platformGitSha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    navigatorGitSha = execSync('git rev-parse HEAD', { cwd: NAV_ROOT, encoding: 'utf8' }).trim();
  } catch {
    /* ignore */
  }

  let bffProbeStatus = 0;
  let bffProbeBody = '';
  for (let i = 0; i < 45; i++) {
    const bffProbe = await fetch(`${platformOrigin}/api/remcard/api/pro/r03/status`, {
      headers: { Cookie: `remcard-token=${probeToken}` },
    });
    bffProbeStatus = bffProbe.status;
    bffProbeBody = await bffProbe.text();
    if (bffProbeStatus !== 403 || !bffProbeBody.includes('Path not allowed')) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (bffProbeStatus === 403 && bffProbeBody.includes('Path not allowed')) {
    killPort(PLATFORM_PORT);
    await portFree(PLATFORM_PORT, 20_000);
    console.error(
      JSON.stringify({
        error: 'bff_r03_path_not_allowed',
        platformGitSha,
        navigatorGitSha,
        platformPort: PLATFORM_PORT,
        hint: 'Platform BFF still rejecting /pro/r03/status after warm-up — re-run stack',
      }),
    );
    process.exit(1);
  }

  writeFileSync(
    path.join(RUN_DIR, 'meta.json'),
    JSON.stringify(
      {
        navOrigin: `http://127.0.0.1:${NAV_PORT}`,
        platformOrigin,
        envPath,
        navPid,
        platPid,
        gateEnabled: GATE_ENABLED,
        r03GateEnabled: R03_GATE_ENABLED,
        platformGitSha,
        navigatorGitSha,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    path.join(RUN_DIR, 'session.json'),
    JSON.stringify({ token: probeToken, platformOrigin }, null, 2),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      ok: true,
      navOrigin: `http://127.0.0.1:${NAV_PORT}`,
      platformOrigin: `http://127.0.0.1:${PLATFORM_PORT}`,
      envPath,
      gateEnabled: GATE_ENABLED,
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
