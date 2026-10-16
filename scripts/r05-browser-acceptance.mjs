#!/usr/bin/env node
/**
 * R05 agent receivables: API + browser smoke on disposable admin stack.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { finishAgentProfileInBrowser } from './lib/r03-stack-bootstrap.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || '/tmp/admin-test-local-stack';
const ART = path.join(ROOT, 'artifacts/remcard-r05');

function loadRuntimeEnv() {
  const env = { ...process.env };
  for (const line of readFileSync(path.join(RUN_DIR, 'runtime.env'), 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

async function bffJson(origin, cookies, upstreamPath) {
  const res = await fetch(`${origin}/api/remcard${upstreamPath}`, {
    headers: {
      Cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      Origin: origin,
    },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const runtimeEnv = loadRuntimeEnv();
  const platformOrigin = runtimeEnv.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3040';

  const platBuild = spawnSync('pnpm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8' });
  const navBuild = spawnSync('npm', ['run', 'build'], { cwd: NAV_ROOT, encoding: 'utf8' });
  spawnSync('node', ['scripts/admin-test-local-stack.mjs'], {
    cwd: ROOT,
    env: runtimeEnv,
    encoding: 'utf8',
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const functional = {};
  const steps = [];

  await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const creds = { login: process.env.PROF_ADMIN_LOGIN || 'admin', password: process.env.PROF_ADMIN_PASSWORD || 'admin' };
  await page.locator('input[autocomplete="username"]').fill(creds.login);
  await page.locator('input[autocomplete="current-password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 120_000 });

  const agentLabel = `R05 agent ${Date.now()}`;
  const createPanel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Создать' }) });
  await createPanel.getByLabel('Тип').selectOption('agent');
  await createPanel.getByLabel('Имя').fill(agentLabel);
  await createPanel.getByRole('button', { name: 'Создать' }).click();
  await page.locator('li').filter({ hasText: agentLabel }).waitFor({ timeout: 30_000 });
  await page.locator('li').filter({ hasText: agentLabel }).getByRole('button', { name: 'Открыть ЛК' }).click();
  await page.waitForLoadState('networkidle');
  await finishAgentProfileInBrowser(page, platformOrigin);

  const cookies = await context.cookies();
  const me = await bffJson(platformOrigin, cookies, '/api/auth/me');
  const agentId = me.body?.user?.id;
  steps.push({ step: 'test_session', ok: Boolean(agentId), agentId });

  const seed = spawnSync('npx', ['tsx', 'scripts/r05ParityReceivablesSeed.ts', agentId], {
    cwd: NAV_ROOT,
    env: runtimeEnv,
    encoding: 'utf8',
  });
  steps.push({ step: 'r05_seed', exitCode: seed.status });

  const r05 = await bffJson(platformOrigin, cookies, '/api/pro/r05/status');
  functional.r05GateOn = r05.body?.featureEnabled === true;
  functional.r05Eligible = r05.body?.eligible === true;

  const overview = await bffJson(platformOrigin, cookies, '/api/pro/wallet/agent-receivables/overview');
  functional.overviewOk = overview.status === 200 && overview.body?.confirmedTotalKopecks > 0;

  await page.goto(`${platformOrigin}/settlements`, { waitUntil: 'networkidle', timeout: 90_000 });
  functional.tileVisible = (await page.getByTestId('agent-r05-incoming-tile').count()) > 0;
  if (functional.tileVisible) {
    await page.getByTestId('agent-r05-incoming-tile').click();
    await page.waitForTimeout(400);
    functional.partnersVisible = (await page.getByTestId('agent-r05-partner-row').count()) > 0;
  } else {
    functional.partnersVisible = false;
  }

  const partnersFresh = await bffJson(
    platformOrigin,
    cookies,
    '/api/pro/wallet/agent-receivables/partners?page=1&pageSize=25&status=open&sort=debt-desc',
  );
  functional.partnersApiOk = partnersFresh.status === 200 && (partnersFresh.body?.partners?.length ?? 0) > 0;

  await browser.close();

  const pass =
    platBuild.status === 0 &&
    navBuild.status === 0 &&
    seed.status === 0 &&
    functional.r05GateOn &&
    functional.r05Eligible &&
    functional.overviewOk &&
    functional.tileVisible &&
    functional.partnersVisible &&
    functional.partnersApiOk;

  const results = {
    generatedAt: new Date().toISOString(),
    platformHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
    navigatorHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: NAV_ROOT, encoding: 'utf8' }).stdout.trim(),
    commands: [
      { cmd: 'pnpm run build (platform)', exitCode: platBuild.status ?? 1 },
      { cmd: 'npm run build (navigator)', exitCode: navBuild.status ?? 1 },
      { cmd: 'node scripts/r05-browser-acceptance.mjs', exitCode: pass ? 0 : 1 },
    ],
    functional,
    steps,
    pass,
    status: pass ? 'READY_FOR_REVIEW' : 'BLOCKED',
  };
  writeFileSync(path.join(ART, 'TEST-RESULTS.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
