#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R06_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';
const NAV_PORT = Number(process.env.R06_NAV_PORT || 3033);
const PLATFORM_PORT = Number(process.env.R06_PLATFORM_PORT || 3034);
const GATE = process.env.PROF_R06_SPECIALIST_PROFILE_ENABLED !== '0';
const DB_URL = 'postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test';

function assertLoopback(url) {
  const u = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1'].includes(u.hostname)) {
    throw new Error('refusing non-loopback DATABASE_URL');
  }
}

async function wait(url, ms = 180000) {
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

function spawnDev(cwd, port, extra) {
  const child = spawn(
    'bash',
    ['-lc', `exec pnpm exec next dev -p ${port}`],
    {
      cwd,
      env: { ...process.env, ...extra, PORT: String(port) },
      detached: true,
      stdio: 'ignore',
    },
  );
  child.unref();
}

async function main() {
  assertLoopback(DB_URL);
  mkdirSync(RUN_DIR, { recursive: true });
  const jwtSecret = randomBytes(32).toString('base64url');
  const envPath = path.join(RUN_DIR, 'runtime.env');
  const navEnvLocal = path.join(NAV_ROOT, '.env.local');
  const platEnvLocal = path.join(ROOT, '.env.local');
  const sharedLocal = `JWT_SECRET=${jwtSecret}\nDATABASE_URL=${DB_URL}\nDIRECT_URL=${DB_URL}\nPROF_R06_SPECIALIST_PROFILE_ENABLED=${GATE ? 'true' : 'false'}\n`;
  writeFileSync(navEnvLocal, sharedLocal, { mode: 0o600 });
  writeFileSync(
    platEnvLocal,
    `REMCARD_API_BASE_URL=http://127.0.0.1:${NAV_PORT}\nNEXT_PUBLIC_APP_URL=http://127.0.0.1:${PLATFORM_PORT}\n`,
    { mode: 0o600 },
  );

  writeFileSync(
    envPath,
    [
      `JWT_SECRET=${jwtSecret}`,
      `DATABASE_URL=${DB_URL}`,
      `DIRECT_URL=${DB_URL}`,
      `PROF_R06_SPECIALIST_PROFILE_ENABLED=${GATE ? 'true' : 'false'}`,
      `REMCARD_API_BASE_URL=http://127.0.0.1:${NAV_PORT}`,
      `NEXT_PUBLIC_APP_URL=http://127.0.0.1:${PLATFORM_PORT}`,
      `R06_FIXTURE_USER_ID=r06-local-specialist-v1`,
    ].join('\n') + '\n',
    { mode: 0o600 },
  );
  chmodSync(envPath, 0o600);

  const stackEnv = {
    ...process.env,
    JWT_SECRET: jwtSecret,
    DATABASE_URL: DB_URL,
    DIRECT_URL: DB_URL,
    PROF_R06_SPECIALIST_PROFILE_ENABLED: GATE ? 'true' : 'false',
    R06_FIXTURE_USER_ID: 'r06-local-specialist-v1',
  };
  execSync('pnpm exec tsx scripts/r06-local-fixture.ts push-schema', {
    cwd: NAV_ROOT,
    env: stackEnv,
    stdio: 'inherit',
  });
  execSync('pnpm exec tsx scripts/r06-local-fixture.ts seed', {
    cwd: NAV_ROOT,
    env: stackEnv,
    stdio: 'inherit',
  });

  spawnDev(NAV_ROOT, NAV_PORT, {
    JWT_SECRET: jwtSecret,
    DATABASE_URL: DB_URL,
    DIRECT_URL: DB_URL,
    PROF_R06_SPECIALIST_PROFILE_ENABLED: GATE ? 'true' : 'false',
  });
  spawnDev(ROOT, PLATFORM_PORT, {
    REMCARD_API_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PLATFORM_PORT}`,
  });

  const navOk = await wait(`http://127.0.0.1:${NAV_PORT}/api/health`);
  const platOk = await wait(`http://127.0.0.1:${PLATFORM_PORT}/login`);
  if (!navOk || !platOk) {
    console.error(JSON.stringify({ error: 'stack_start_failed', navOk, platOk }));
    process.exit(1);
  }

  const meta = {
    envPath,
    gateEnabled: GATE,
    navPort: NAV_PORT,
    platformPort: PLATFORM_PORT,
    navigatorSha: execSync('git rev-parse HEAD', { cwd: NAV_ROOT, encoding: 'utf8' }).trim(),
    platformSha: execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(),
  };
  writeFileSync(path.join(RUN_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify({ ok: true, runDir: RUN_DIR, ...meta }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
