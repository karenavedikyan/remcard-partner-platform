#!/usr/bin/env node
/**
 * R04 targeted browser + BFF acceptance (disposable admin test stack).
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
const ARTIFACT_DIR = path.join(ROOT, 'artifacts/remcard-r04');
const SHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

function loadRuntimeEnv() {
  const envPath = path.join(RUN_DIR, 'runtime.env');
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function cookieHeader(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

async function bffGet(platformOrigin, cookies, upstreamPath) {
  const res = await fetch(`${platformOrigin}/api/remcard${upstreamPath}`, {
    headers: { Cookie: cookieHeader(cookies) },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function waitForTestSession(context, platformOrigin, ms = 45_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const cookies = await context.cookies();
    const me = await bffGet(platformOrigin, cookies, '/api/auth/me');
    if (me.body?.profTestSession?.active && me.body?.user?.isProfTestUser) return me;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function main() {
  const runtimeEnv = loadRuntimeEnv();
  spawnSync('pnpm', ['exec', 'tsx', 'scripts/admin-test-012-lifecycle.ts', '--fixtures-only'], {
    cwd: NAV_ROOT,
    env: { ...process.env, ...runtimeEnv },
    encoding: 'utf8',
  });

  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const platformOrigin = meta.platformOrigin;
  mkdirSync(SHOT_DIR, { recursive: true });

  const creds = {
    login: process.env.ADMIN_TEST_LOGIN?.trim() || 'e2e-admin@remcard.test',
    password: process.env.ADMIN_TEST_PASSWORD?.trim() || 'E2E-Admin-Pass-12chars',
  };
  const runTag = `R04 ${Date.now()}`;
  const agentDisplayName = `${runTag} · Агент`;
  const steps = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());

  await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  const adminTab = page.getByRole('tab', { name: 'Вход администратора' });
  await adminTab.waitFor({ state: 'visible', timeout: 120_000 });
  if (!(await adminTab.isDisabled())) await adminTab.click();
  await page.locator('input[autocomplete="username"]').waitFor({ timeout: 60_000 });
  await page.locator('input[autocomplete="username"]').fill(creds.login);
  await page.locator('input[autocomplete="current-password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 120_000 });

  await page.locator('select').first().selectOption('agent');
  await page.locator('section').filter({ hasText: 'Создать' }).getByLabel('Имя').fill(agentDisplayName);
  await page.getByRole('button', { name: 'Создать' }).click();
  const agentCard = page.locator('li').filter({ hasText: agentDisplayName });
  await agentCard.waitFor({ timeout: 30_000 });

  const enterWait = page.waitForResponse(
    (r) => r.url().includes('/test-users/') && r.url().includes('/enter') && r.status() === 200,
    { timeout: 45_000 },
  );
  await agentCard.getByRole('button', { name: 'Открыть ЛК' }).click();
  await enterWait;
  await page.waitForLoadState('networkidle');

  const testMe = await waitForTestSession(context, platformOrigin);
  steps.push({ step: 'test_session', ok: Boolean(testMe) });
  if (!testMe) throw new Error('test_session_not_active');

  const cookies = await context.cookies();
  await finishAgentProfileInBrowser(page, platformOrigin, cookieHeader(cookies));
  steps.push({ step: 'agent_profile_finish', ok: true });
  const r04 = await bffGet(platformOrigin, cookies, '/api/pro/r04/status');
  const list = await bffGet(platformOrigin, cookies, '/api/partnership/list');
  const linkInvite = await bffGet(platformOrigin, cookies, '/api/partnership/link-invite');
  steps.push(
    { step: 'r04_status', status: r04.status, eligible: r04.body?.eligible },
    { step: 'partnership_list', status: list.status, error: list.body?.error },
    { step: 'link_invite', status: linkInvite.status, error: linkInvite.body?.error },
  );

  await page.goto(`${platformOrigin}/partners`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SHOT_DIR, 'impl-partners-1440-light.png'), fullPage: true });
  const hasR04 = (await page.locator('[data-testid="agent-r04-partners"]').count()) > 0;
  steps.push({ step: 'partners_ui_r04', found: hasR04 });

  await browser.close();

  const pass =
    list.status === 200 &&
    linkInvite.status === 200 &&
    r04.body?.eligible === true &&
    hasR04;

  const results = {
    generatedAt: new Date().toISOString(),
    platformOrigin,
    steps,
    pass,
    commands: ['node scripts/r04-browser-acceptance.mjs'],
  };
  writeFileSync(path.join(ARTIFACT_DIR, 'TEST-RESULTS.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
