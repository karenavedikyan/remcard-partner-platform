#!/usr/bin/env node
/**
 * Disposable ADMIN-TEST-01 stack (loopback PG remcard_admin_test_012 only).
 * Writes runtime env to /tmp/admin-test-local-stack/runtime.env — never logs secrets.
 */
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { execSync, spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.ADMIN_TEST_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || '/tmp/admin-test-local-stack';
const NAV_PORT = Number(process.env.ADMIN_TEST_BACKEND_PORT || 3010);
const PLATFORM_PORT = Number(process.env.ADMIN_TEST_PLATFORM_PORT || 3000);
const TEST_DB = 'remcard_admin_test_012';

function adminTestDbUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${TEST_DB}`;
  return parsed.toString();
}

function assertLoopbackAdminDb(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Refusing stack: invalid DATABASE_URL');
  }
  const host = parsed.hostname;
  const db = parsed.pathname.replace(/^\//, '');
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`Refusing stack: non-loopback host ${host}`);
  }
  if (db !== TEST_DB) {
    throw new Error(`Refusing stack: expected database ${TEST_DB}, got ${db}`);
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
  const env = { ...process.env, ...extraEnv, PORT: String(port) };
  const child = spawn('bash', ['-lc', `exec pnpm exec next dev -p ${port}`], {
    cwd,
    env,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return child.pid;
}

async function main() {
  const baseDb = process.env.DATABASE_URL?.trim();
  if (!baseDb) throw new Error('DATABASE_URL required');
  const dbUrl = adminTestDbUrl(baseDb);
  assertLoopbackAdminDb(dbUrl);

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) throw new Error('JWT_SECRET required for local admin stack');

  mkdirSync(RUN_DIR, { recursive: true });
  killPort(NAV_PORT);
  killPort(PLATFORM_PORT);
  if (!(await portFree(NAV_PORT)) || !(await portFree(PLATFORM_PORT))) {
    console.error(JSON.stringify({ error: 'ports_still_in_use', NAV_PORT, PLATFORM_PORT }));
    process.exit(1);
  }

  const envPath = path.join(RUN_DIR, 'runtime.env');
  const envBody = [
    `JWT_SECRET=${jwtSecret}`,
    `DATABASE_URL=${dbUrl}`,
    `DIRECT_URL=${dbUrl}`,
    `PROF_ADMIN_PASSWORD_LOGIN_ENABLED=1`,
    `PROF_ADMIN_TEST_USERS_ENABLED=1`,
    `PROF_R02_AGENT_PROFILE_ENABLED=true`,
    `PROF_R01_AGENT_NAV_ENABLED=true`,
    `PROF_R03_AGENT_CERTIFICATES_ENABLED=true`,
    `PROF_R04_AGENT_PARTNERS_ENABLED=true`,
    `PROF_R05_AGENT_RECEIVABLES_ENABLED=true`,
    `ADMIN_TEST_BACKEND_PORT=${NAV_PORT}`,
    `ADMIN_TEST_PLATFORM_PORT=${PLATFORM_PORT}`,
    `REMCARD_API_BASE_URL=http://127.0.0.1:${NAV_PORT}`,
    `NEXT_PUBLIC_APP_URL=http://127.0.0.1:${PLATFORM_PORT}`,
  ].join('\n');
  writeFileSync(envPath, `${envBody}\n`, { mode: 0o600 });
  chmodSync(envPath, 0o600);

  const navEnv = {
    JWT_SECRET: jwtSecret,
    DATABASE_URL: dbUrl,
    DIRECT_URL: dbUrl,
    PROF_ADMIN_PASSWORD_LOGIN_ENABLED: '1',
    PROF_ADMIN_TEST_USERS_ENABLED: '1',
    PROF_R02_AGENT_PROFILE_ENABLED: 'true',
    PROF_R01_AGENT_NAV_ENABLED: 'true',
    PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true',
    PROF_R04_AGENT_PARTNERS_ENABLED: 'true',
    PROF_R05_AGENT_RECEIVABLES_ENABLED: 'true',
  };
  const navPid = spawnDev(NAV_ROOT, NAV_PORT, navEnv);
  const platPid = spawnDev(ROOT, PLATFORM_PORT, {
    REMCARD_API_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PLATFORM_PORT}`,
  });

  const navOk = await wait(`http://127.0.0.1:${NAV_PORT}/api/auth/me`);
  const platOk = await wait(`http://127.0.0.1:${PLATFORM_PORT}/login`, 300_000);
  if (!navOk || !platOk) {
    console.error(JSON.stringify({ error: 'stack_start_failed', navOk, platOk }));
    process.exit(1);
  }

  const probeEnv = { ...process.env, ...navEnv };
  const legal = spawnSync('pnpm', ['run', 'seed:legal'], {
    cwd: NAV_ROOT,
    env: probeEnv,
    encoding: 'utf8',
  });
  if (legal.status !== 0) {
    console.error(JSON.stringify({ error: 'seed_legal_failed' }));
    process.exit(1);
  }

  const fixtures = spawnSync('pnpm', ['exec', 'tsx', 'scripts/admin-test-012-lifecycle.ts', '--fixtures-only'], {
    cwd: NAV_ROOT,
    env: probeEnv,
    encoding: 'utf8',
  });
  if (fixtures.status !== 0) {
    console.error(JSON.stringify({ error: 'fixtures_failed', detail: (fixtures.stderr || fixtures.stdout || '').slice(0, 300) }));
    process.exit(1);
  }

  const schemaPush = spawnSync(
    'pnpm',
    ['exec', 'prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'],
    {
      cwd: NAV_ROOT,
      env: { ...probeEnv, PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true' },
      encoding: 'utf8',
    },
  );
  if (schemaPush.status !== 0) {
    console.error(JSON.stringify({ error: 'schema_push_failed', detail: (schemaPush.stderr || '').slice(0, 300) }));
    process.exit(1);
  }

  writeFileSync(
    path.join(RUN_DIR, 'meta.json'),
    JSON.stringify(
      {
        navOrigin: `http://127.0.0.1:${NAV_PORT}`,
        platformOrigin: `http://127.0.0.1:${PLATFORM_PORT}`,
        envPath,
        navPid,
        platPid,
        database: TEST_DB,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      ok: true,
      navOrigin: `http://127.0.0.1:${NAV_PORT}`,
      platformOrigin: `http://127.0.0.1:${PLATFORM_PORT}`,
      envPath,
      database: TEST_DB,
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
