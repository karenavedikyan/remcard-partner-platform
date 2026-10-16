/**
 * Isolated loopback stack for agent-profile-parity evidence (always fresh JWT + ports).
 */
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync, spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
export const PARITY_RUN_DIR =
  process.env.AGENT_PROFILE_PARITY_RUN_DIR || '/tmp/agent-profile-parity-stack';
export const PARITY_NAV_PORT = Number(process.env.AGENT_PROFILE_PARITY_NAV_PORT || 3043);
export const PARITY_PLATFORM_PORT = Number(process.env.AGENT_PROFILE_PARITY_PLATFORM_PORT || 3044);

const TEST_DB =
  process.env.PROF_R01_TEST_DATABASE_URL?.trim() ||
  'postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test';

function assertLoopbackDb(url) {
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error('Refusing parity stack: non-loopback DATABASE_URL');
  }
  const db = parsed.pathname.replace(/^\//, '');
  if (!['remcard_r01_test', 'remcard_prof_test'].includes(db)) {
    throw new Error(`Refusing parity stack: database ${db} not in disposable allowlist`);
  }
}

function killPort(port) {
  try {
    execSync(`pkill -f "next (dev|start) -p ${port}" 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
}

async function portFree(port, ms = 20_000) {
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

async function waitHttp(url, ms = 180_000) {
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

function gitSha(cwd) {
  try {
    return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function spawnStart(cwd, port, extraEnv) {
  const child = spawn(
    'bash',
    ['-lc', `exec pnpm exec next start -p ${port} -H 127.0.0.1`],
    {
      cwd,
      env: { ...process.env, ...extraEnv, PORT: String(port) },
      detached: true,
      stdio: 'ignore',
    },
  );
  child.unref();
  return child.pid;
}

export function loadParityRuntimeEnv() {
  const envPath = path.join(PARITY_RUN_DIR, 'runtime.env');
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return { env, envPath };
}

function runNavFixture(env, action) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', action], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`fixture ${action}: ${(res.stderr || res.stdout || '').slice(0, 500)}`);
  }
  return (res.stdout || '').trim();
}

export async function assertParityAuth({ platformOrigin, navOrigin, token }) {
  const cookie = `remcard-token=${token}`;
  const navMe = await fetch(`${navOrigin}/api/auth/me`, { headers: { Cookie: cookie } });
  const navBody = await navMe.json().catch(() => null);
  const bffMe = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { Cookie: cookie },
  });
  const bffBody = await bffMe.json().catch(() => null);
  const userId = navBody?.user?.id ?? null;
  const ok =
    navMe.status === 200 &&
    bffMe.status === 200 &&
    userId &&
    bffBody?.user?.id === userId;
  return {
    ok,
    navStatus: navMe.status,
    bffStatus: bffMe.status,
    userId,
    bffUserId: bffBody?.user?.id ?? null,
    navHasUser: Boolean(navBody?.user?.id),
    bffHasUser: Boolean(bffBody?.user?.id),
  };
}

/**
 * Always recreates stack: new JWT, runtime.env, next start on both apps.
 */
export async function bootstrapAgentProfileParityStack() {
  assertLoopbackDb(TEST_DB);
  mkdirSync(PARITY_RUN_DIR, { recursive: true });

  if (process.env.AGENT_PROFILE_PARITY_REUSE_STACK === '1') {
    const sessionPath = path.join(PARITY_RUN_DIR, 'session.json');
    const metaPath = path.join(PARITY_RUN_DIR, 'meta.json');
    if (existsSync(sessionPath) && existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      const session = JSON.parse(readFileSync(sessionPath, 'utf8'));
      const navOk = await waitHttp(`${meta.navOrigin}/api/health`, 5_000);
      const platOk = await waitHttp(`${meta.platformOrigin}/login`, 5_000);
      if (
        navOk &&
        platOk &&
        meta.platformGitSha === gitSha(ROOT) &&
        meta.navigatorGitSha === gitSha(NAV_ROOT)
      ) {
        const auth = await assertParityAuth({
          platformOrigin: meta.platformOrigin,
          navOrigin: meta.navOrigin,
          token: session.token,
        });
        if (auth.ok) {
          return {
            meta,
            token: session.token,
            platformOrigin: meta.platformOrigin,
            navOrigin: meta.navOrigin,
            userId: auth.userId,
          };
        }
      }
    }
  }

  killPort(PARITY_NAV_PORT);
  killPort(PARITY_PLATFORM_PORT);
  if (!(await portFree(PARITY_NAV_PORT)) || !(await portFree(PARITY_PLATFORM_PORT))) {
    throw new Error('parity_stack_ports_in_use');
  }

  const jwtSecret = randomBytes(32).toString('base64url');
  const envPath = path.join(PARITY_RUN_DIR, 'runtime.env');
  const envBody = [
    `JWT_SECRET=${jwtSecret}`,
    `DATABASE_URL=${TEST_DB}`,
    `DIRECT_URL=${TEST_DB}`,
    `PROF_R02_AGENT_PROFILE_ENABLED=true`,
    `PROF_R03_AGENT_CERTIFICATES_ENABLED=true`,
    `PROF_R01_AGENT_NAV_ENABLED=true`,
    `REMCARD_API_BASE_URL=http://127.0.0.1:${PARITY_NAV_PORT}`,
    `NEXT_PUBLIC_APP_URL=http://127.0.0.1:${PARITY_PLATFORM_PORT}`,
    `R02_FIXTURE_USER_ID=r02-local-pro-agent-v1`,
  ].join('\n');
  writeFileSync(envPath, `${envBody}\n`, { mode: 0o600 });
  chmodSync(envPath, 0o600);

  const navOrigin = `http://127.0.0.1:${PARITY_NAV_PORT}`;
  const platformOrigin = `http://127.0.0.1:${PARITY_PLATFORM_PORT}`;

  const navEnv = {
    JWT_SECRET: jwtSecret,
    DATABASE_URL: TEST_DB,
    DIRECT_URL: TEST_DB,
    PROF_R02_AGENT_PROFILE_ENABLED: 'true',
    PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true',
    NEXT_PUBLIC_BASE_URL: navOrigin,
  };
  const platEnv = {
    REMCARD_API_BASE_URL: navOrigin,
    NEXT_PUBLIC_APP_URL: platformOrigin,
  };

  const buildNav = spawnSync('pnpm', ['run', 'build'], { cwd: NAV_ROOT, encoding: 'utf8' });
  if (buildNav.status !== 0) {
    throw new Error(`navigator build failed: ${(buildNav.stderr || '').slice(0, 300)}`);
  }
  const buildPlat = spawnSync('npm', ['run', 'build'], {
    cwd: ROOT,
    env: { ...process.env, NEXT_PUBLIC_APP_URL: platformOrigin },
    encoding: 'utf8',
  });
  if (buildPlat.status !== 0) {
    throw new Error(`platform build failed: ${(buildPlat.stderr || '').slice(0, 300)}`);
  }

  spawnStart(NAV_ROOT, PARITY_NAV_PORT, navEnv);
  spawnStart(ROOT, PARITY_PLATFORM_PORT, platEnv);

  const navOk = await waitHttp(`${navOrigin}/api/health`);
  const platOk = await waitHttp(`${platformOrigin}/login`);
  if (!navOk || !platOk) {
    throw new Error(`parity_stack_http_unready nav=${navOk} plat=${platOk}`);
  }

  const childEnv = loadParityRuntimeEnv().env;
  runNavFixture(childEnv, 'push-schema');
  runNavFixture(childEnv, 'seed');
  const token = runNavFixture(childEnv, 'mint');

  const auth = await assertParityAuth({ platformOrigin, navOrigin, token });
  if (!auth.ok) {
    throw new Error(
      `parity_auth_failed nav=${auth.navStatus} bff=${auth.bffStatus} navUser=${auth.navHasUser} bffUser=${auth.bffHasUser}`,
    );
  }

  const meta = {
    navOrigin,
    platformOrigin,
    envPath,
    navPort: PARITY_NAV_PORT,
    platformPort: PARITY_PLATFORM_PORT,
    platformGitSha: gitSha(ROOT),
    navigatorGitSha: gitSha(NAV_ROOT),
  };
  writeFileSync(path.join(PARITY_RUN_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  writeFileSync(
    path.join(PARITY_RUN_DIR, 'session.json'),
    JSON.stringify({ token, platformOrigin, navOrigin, userId: auth.userId }, null, 2),
    { mode: 0o600 },
  );

  return { meta, token, platformOrigin, navOrigin, userId: auth.userId };
}
