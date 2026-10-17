#!/usr/bin/env node
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectRepoFacts,
  resolveApplicationCodeSha,
  writeJson,
} from './lib/r06-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R06_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';
const NAV_PORT = Number(process.env.R06_NAV_PORT || 3033);
const PLATFORM_PORT = Number(process.env.R06_PLATFORM_PORT || 3034);
const GATE = process.env.PROF_R06_SPECIALIST_PROFILE_ENABLED !== '0';
const DB_URL = 'postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test';
const NAV_DIST = process.env.R06_NAV_DIST_DIR || '.next-r06-local-nav';
const PLAT_DIST = process.env.R06_PLAT_DIST_DIR || '.next-r06-local-plat';
const STABLE_R06_JWT = 'prof-r06-local-stack-jwt-secret-32c!';

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

function spawnStart(cwd, port, extra, envPath) {
  const distDir = extra.R06_NEXT_DIST_DIR ? `export R06_NEXT_DIST_DIR=${JSON.stringify(extra.R06_NEXT_DIST_DIR)}; ` : '';
  const child = spawn(
    'bash',
    [
      '-lc',
      `set -a && . ${JSON.stringify(envPath)} && set +a && ${distDir}export PORT=${port} NODE_ENV=production && exec pnpm exec next start -p ${port}`,
    ],
    {
      cwd,
      env: { ...process.env, ...extra, PORT: String(port), NODE_ENV: 'production' },
      detached: true,
      stdio: 'ignore',
    },
  );
  child.unref();
}

function killPort(port) {
  try {
    execSync(`pkill -f "next dev -p ${port}" 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
  try {
    execSync(`pkill -f "next start -p ${port}" 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
  try {
    execSync(`lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
  try {
    execSync(`lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
}

async function main() {
  assertLoopback(DB_URL);
  killPort(NAV_PORT);
  killPort(PLATFORM_PORT);
  mkdirSync(RUN_DIR, { recursive: true });
  const jwtSecret = process.env.R06_STACK_JWT_SECRET?.trim() || STABLE_R06_JWT;
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

  const platformPublicUrl = `http://127.0.0.1:${PLATFORM_PORT}`;
  const stackEnv = {
    ...process.env,
    JWT_SECRET: jwtSecret,
    DATABASE_URL: DB_URL,
    DIRECT_URL: DB_URL,
    PROF_R06_SPECIALIST_PROFILE_ENABLED: GATE ? 'true' : 'false',
    R06_FIXTURE_USER_ID: 'r06-local-specialist-v1',
    NEXT_PUBLIC_APP_URL: platformPublicUrl,
    REMCARD_API_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
  };

  execSync('node scripts/r06-migration-controlled.mjs', {
    cwd: NAV_ROOT,
    env: stackEnv,
    stdio: 'inherit',
  });
  execSync('pnpm exec tsx scripts/r06-local-fixture.ts seed', {
    cwd: NAV_ROOT,
    env: stackEnv,
    stdio: 'inherit',
  });

  execSync('pnpm run build', {
    cwd: NAV_ROOT,
    env: { ...stackEnv, R06_NEXT_DIST_DIR: NAV_DIST },
    stdio: 'inherit',
  });
  execSync('pnpm run build', {
    cwd: ROOT,
    env: { ...stackEnv, R06_NEXT_DIST_DIR: PLAT_DIST },
    stdio: 'inherit',
  });

  spawnStart(
    NAV_ROOT,
    NAV_PORT,
    {
      JWT_SECRET: jwtSecret,
      DATABASE_URL: DB_URL,
      DIRECT_URL: DB_URL,
      PROF_R06_SPECIALIST_PROFILE_ENABLED: GATE ? 'true' : 'false',
      R06_NEXT_DIST_DIR: NAV_DIST,
    },
    envPath,
  );
  spawnStart(
    ROOT,
    PLATFORM_PORT,
    {
      REMCARD_API_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
      NEXT_PUBLIC_APP_URL: platformPublicUrl,
      R06_NEXT_DIST_DIR: PLAT_DIST,
    },
    envPath,
  );

  const navOk = await wait(`http://127.0.0.1:${NAV_PORT}/api/health`);
  const platOk = await wait(`http://127.0.0.1:${PLATFORM_PORT}/login`);
  if (!navOk || !platOk) {
    console.error(JSON.stringify({ error: 'stack_start_failed', navOk, platOk }));
    process.exit(1);
  }

  const expectNavigatorSha =
    process.env.R06_EXPECT_NAV_SHA || '04613f09400b54c894fa192a81b09834c8797fd5';
  const expectPlatformCodeSha =
    process.env.R06_EXPECT_PLATFORM_CODE_SHA || 'e18487ad634e9a8e33ebbb08d55eb16aa3b8d889';

  const navFacts = collectRepoFacts(NAV_ROOT, NAV_DIST);
  const platFacts = collectRepoFacts(ROOT, PLAT_DIST);
  let applicationCodeSha;
  try {
    applicationCodeSha = resolveApplicationCodeSha(ROOT, expectPlatformCodeSha);
  } catch (e) {
    console.error(JSON.stringify({ error: 'platform_pin_failed', message: e.message }));
    process.exit(1);
  }
  if (navFacts.gitHead !== expectNavigatorSha) {
    console.error(
      JSON.stringify({
        error: 'navigator_pin_mismatch',
        expected: expectNavigatorSha,
        actual: navFacts.gitHead,
      }),
    );
    process.exit(1);
  }

  const meta = {
    runId: path.basename(RUN_DIR),
    createdAt: new Date().toISOString(),
    envPath,
    gateEnabled: GATE,
    navPort: NAV_PORT,
    platformPort: PLATFORM_PORT,
    navDist: NAV_DIST,
    platDist: PLAT_DIST,
    expectedPins: {
      navigator: expectNavigatorSha,
      platformApplicationCode: expectPlatformCodeSha,
    },
    runtime: {
      navigator: navFacts,
      platform: { ...platFacts, applicationCodeSha },
    },
    /** @deprecated use runtime.* — kept for older readers */
    navigatorSha: navFacts.gitHead,
    platformSha: applicationCodeSha,
  };
  writeJson(path.join(RUN_DIR, 'meta.json'), meta);
  writeJson(path.join(RUN_DIR, 'stack-finished.json'), {
    finishedAt: new Date().toISOString(),
    navigatorBuildId: navFacts.nextBuildId,
    platformBuildId: platFacts.nextBuildId,
    platformBuiltGitHead: platFacts.gitHead,
    platformApplicationCodeSha: applicationCodeSha,
  });
  console.log(JSON.stringify({ ok: true, runDir: RUN_DIR, ...meta }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
