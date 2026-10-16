/**
 * Shared disposable admin/R03 local stack bootstrap for visual parity runs.
 */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { execSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  assertDarkThemeMeasurement,
  measureCabinetThemeInPage,
} from './r03-theme-assert.mjs';
import { PARITY_CERT_ALIASES, PARITY_CLIENTS, PARITY_MATCH } from './r03-parity-fixture.mjs';
import { PARITY_AGENT_DISPLAY_NAME } from './r03-parity-agent.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
export const RUN_DIR =
  process.env.R03_RUN_DIR || process.env.ADMIN_TEST_RUN_DIR || '/tmp/admin-test-local-stack';

export const ADMIN_CREDS = {
  login: process.env.ADMIN_TEST_LOGIN?.trim() || 'e2e-admin@remcard.test',
  password: process.env.ADMIN_TEST_PASSWORD?.trim() || 'E2E-Admin-Pass-12chars',
};

export function loadRuntimeEnv(envPath) {
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function runtimeEnvHasPilotFlags(envPath) {
  if (!existsSync(envPath)) return false;
  const body = readFileSync(envPath, 'utf8');
  return (
    body.includes('PROF_R01_AGENT_NAV_ENABLED=true') &&
    body.includes('PROF_R03_AGENT_CERTIFICATES_ENABLED=true')
  );
}

export function ensureAdminSchema(env) {
  const res = spawnSync(
    'pnpm',
    ['exec', 'prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'],
    {
      cwd: NAV_ROOT,
      env: { ...env, PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true' },
      encoding: 'utf8',
    },
  );
  if (res.status !== 0) {
    throw new Error(`admin schema push: ${(res.stderr || '').slice(0, 300)}`);
  }
}

export function ensureStack() {
  const metaPath = path.join(RUN_DIR, 'meta.json');
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    if (runtimeEnvHasPilotFlags(meta.envPath)) return meta;
    try {
      const platPort = new URL(meta.platformOrigin).port;
      const navPort = new URL(meta.navOrigin).port;
      if (platPort) process.env.ADMIN_TEST_PLATFORM_PORT = platPort;
      if (navPort) process.env.ADMIN_TEST_BACKEND_PORT = navPort;
      unlinkSync(metaPath);
    } catch {
      /* ignore */
    }
  }
  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET required to start admin-test stack');
  }
  const res = spawnSync('node', ['scripts/admin-test-local-stack.mjs'], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    timeout: 300_000,
  });
  if (res.status !== 0) {
    throw new Error(`stack start failed: ${(res.stderr || res.stdout || '').slice(0, 400)}`);
  }
  return JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
}

export function startStaticRefServer(root, port) {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  return new Promise((resolve, reject) => {
    const srv = createServer((req, res) => {
      try {
        const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'roles.html';
        const filePath = path.join(root, rel);
        if (!filePath.startsWith(root)) {
          res.writeHead(403);
          res.end();
          return;
        }
        statSync(filePath);
        res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

async function bffAuthMe(platformOrigin, cookieHeader) {
  const res = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

export async function waitForTestSession(context, platformOrigin, ms = 60_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const me = await bffAuthMe(platformOrigin, cookieHeader);
    if (me.status === 200 && me.body?.user?.isProfTestUser && me.body?.profTestSession?.active) {
      return { cookieHeader, me };
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function maybeAcceptConsents(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!page.url().includes('step=consents')) return;
    const boxes = page.locator('input[type="checkbox"]');
    const count = await boxes.count();
    for (let i = 0; i < count; i++) {
      const box = boxes.nth(i);
      if (!(await box.isChecked())) await box.check();
    }
    const submit = page.getByRole('button', { name: /принять|продолжить|сохранить/i }).first();
    if (await submit.isVisible().catch(() => false)) await submit.click();
    await page.waitForTimeout(800);
  }
}

export async function finishAgentProfileInBrowser(page, platformOrigin, cookieHeader) {
  await page.goto(`${platformOrigin}/profile?section=basics`, { waitUntil: 'networkidle' });
  await maybeAcceptConsents(page);
  const wizard = page.locator('[data-testid="agent-profile-wizard"]');
  if (await wizard.isVisible().catch(() => false)) {
    await page.getByTestId('agent-profile-input-displayName').fill(PARITY_AGENT_DISPLAY_NAME);
    await page.locator('#agent-city').fill('Краснодар');
    await page.getByTestId('agent-profile-save-draft').click();
    await page.waitForResponse(
      (r) => r.url().includes('/agent-profile/draft') && r.request().method() === 'PATCH' && r.status() === 200,
      { timeout: 45_000 },
    );
    for (let i = 0; i < 4; i++) {
      const next = page.getByTestId('agent-profile-next');
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(400);
    }
    await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 60_000 });
  }
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/enable-activity`, {
    method: 'POST',
    headers: { Cookie: cookieHeader, Origin: platformOrigin, 'content-type': 'application/json' },
    body: JSON.stringify({ activity: 'AGENT' }),
  });
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/finish`, {
    method: 'POST',
    headers: { Cookie: cookieHeader, Origin: platformOrigin, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export function ensureAgentPartnership(agentUserId, env) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r04ParityPartnerSeed.ts', agentUserId], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`partner seed: ${(res.stderr || res.stdout || '').slice(0, 400)}`);
  }
  return JSON.parse((res.stdout || '').trim().split('\n').pop() ?? '{}');
}

export function markParityCertificateUsage(certId, agentUserId, env) {
  const res = spawnSync(
    'pnpm',
    ['exec', 'tsx', 'scripts/r03ParityMarkUsage.ts', certId, agentUserId],
    {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`parity usage mark: ${(res.stderr || res.stdout || '').slice(0, 400)}`);
  }
  return JSON.parse((res.stdout || '').trim().split('\n').pop() ?? '{}');
}

export async function bootstrapAdminAgentSession(browser, opts = {}) {
  const meta = ensureStack();
  const env = loadRuntimeEnv(meta.envPath);
  env.PROF_R03_AGENT_CERTIFICATES_ENABLED = 'true';
  ensureAdminSchema(env);

  const plat = meta.platformOrigin.replace(/\/$/, '');
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${plat}/login?mode=admin`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('[data-testid="admin-login-pending"]').waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => null);
  const usernameInput = page.locator('input[autocomplete="username"]');
  await usernameInput.waitFor({ state: 'visible', timeout: 120_000 });
  await usernameInput.fill(ADMIN_CREDS.login);
  await page.locator('input[autocomplete="current-password"]').fill(ADMIN_CREDS.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/admin\/test-users/, { timeout: 60_000 });
  await page.getByRole('heading', { name: 'Тестовые пользователи' }).waitFor({ timeout: 30_000 });

  const agentLabel = opts.agentLabel || `${PARITY_AGENT_DISPLAY_NAME} ${Date.now()}`;
  const createPanel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Создать' }) });
  await createPanel.getByLabel('Тип').selectOption('agent');
  await createPanel.getByLabel('Имя').fill(agentLabel);
  await createPanel.getByRole('button', { name: 'Создать' }).click();
  await page.waitForTimeout(800);
  const agentCard = page.locator('li').filter({ hasText: agentLabel });
  await agentCard.waitFor({ timeout: 30_000 });
  const enterWait = page.waitForResponse(
    (r) => r.url().includes('/test-users/') && r.url().includes('/enter') && r.status() === 200,
    { timeout: 45_000 },
  );
  await agentCard.getByRole('button', { name: 'Открыть ЛК' }).click();
  await enterWait;

  const session = await waitForTestSession(context, plat, 60_000);
  if (!session) throw new Error('test_session_not_active');

  await finishAgentProfileInBrowser(page, plat, session.cookieHeader);
  const userId = session.me.body?.user?.id;
  if (!userId) throw new Error('auth_me_missing_user');

  const partnership = ensureAgentPartnership(userId, { ...env, PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true' });

  const storagePath = path.join(RUN_DIR, 'ui-parity-storage-state.json');
  await context.storageState({ path: storagePath });

  return {
    meta,
    plat,
    env,
    context,
    page,
    cookieHeader: session.cookieHeader,
    userId,
    storagePath,
    agentLabel,
    partnership,
  };
}

export async function measurePageTheme(page) {
  const raw = await page.evaluate(measureCabinetThemeInPage);
  const verdict = assertDarkThemeMeasurement({
    dataTheme: raw.dataTheme,
    colorScheme: raw.colorScheme,
    surfaceLuma: raw.surfaceLuma,
    surfaceBg: raw.surfaceBg,
    ...raw,
  });
  return { raw, verdict };
}

export async function ensurePageTheme(page, theme) {
  const wantDark = theme === 'dark';
  const toggle = page.locator('[data-testid="theme-toggle"], [data-action="theme"]').first();
  let last = await measurePageTheme(page);
  for (let i = 0; i < 8; i++) {
    const isDark = last.verdict.ok && (last.raw.dataTheme === 'dark' || last.raw.colorScheme === 'dark');
    if (wantDark === isDark) return last;
    if (!(await toggle.isVisible().catch(() => false))) break;
    await toggle.click();
    await page.waitForTimeout(450);
    last = await measurePageTheme(page);
  }
  if (wantDark && !last.verdict.ok) throw new Error(`theme_not_dark:${last.verdict.reason}`);
  if (!wantDark && last.verdict.ok && last.raw.dataTheme === 'dark') {
    throw new Error('theme_stuck_dark');
  }
  return last;
}

export async function setImplViewMode(page, viewMode) {
  const label = viewMode === 'list' ? 'Список' : 'Карточки';
  const btn = page.locator('[data-testid="agent-r03-view-toggle"]').getByRole('button', { name: label });
  await btn.waitFor({ state: 'visible', timeout: 20_000 });
  await btn.click();
  await page.locator('[data-testid="agent-r03-view-toggle"] button[aria-pressed="true"]').filter({ hasText: label }).waitFor({
    timeout: 10_000,
  });
}

export async function openImplSection(page, plat, section) {
  const href = section === 'certificates' ? '/certificates' : '/clients';
  const heading = section === 'certificates' ? 'Сертификаты' : 'Клиенты';
  const listResponse = page.waitForResponse(
    (r) =>
      r.url().includes(section === 'certificates' ? '/agent-certificates' : '/agent-clients') &&
      r.request().method() === 'GET' &&
      r.status() === 200,
    { timeout: 60_000 },
  );
  await page.goto(`${plat}${href}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: heading }).waitFor({ timeout: 45_000 });
  await page.locator('[data-testid="agent-r03-collection-toolbar"]').waitFor({ timeout: 45_000 });
  await listResponse.catch(() => null);
  await page.waitForLoadState('networkidle').catch(() => null);
}

export async function seedUiParityFixtures(plat, cookieHeader, userId, opts = {}) {
  const partnership = opts.partnership ?? {};
  const stackEnv = opts.env ?? process.env;
  const headers = { Cookie: cookieHeader, 'content-type': 'application/json', Origin: plat };
  const storeUserId = partnership.storeUserId || userId;
  const clients = [];
  for (let i = 0; i < PARITY_CLIENTS.length; i++) {
    const row = PARITY_CLIENTS[i];
    const res = await fetch(`${plat}/api/remcard/api/pro/agent-clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        displayName: row.displayName,
        city: row.city,
        note: row.note,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`seed_client_${i}:${body.error || res.status}`);
    clients.push(body.client);
  }

  const certBodies = [
    {
      partners: [
        {
          storeUserId,
          storeName: 'Дом материалов',
          isSelfScan: storeUserId === userId,
          categories: [
            { category: 'floor', categoryLabel: 'Напольные покрытия', discountPercent: 10, issuerPercent: 0 },
            { category: 'doors', categoryLabel: 'Двери', discountPercent: 5, issuerPercent: 0 },
          ],
        },
      ],
      userAlias: PARITY_CERT_ALIASES[0],
      agentClientId: clients[0]?.id,
    },
    {
      partners: [
        {
          storeUserId: userId,
          storeName: 'Self',
          isSelfScan: true,
          categories: [{ category: 'plumb', categoryLabel: 'Сантехника', discountPercent: 5.5, issuerPercent: 0 }],
        },
      ],
      userAlias: PARITY_CERT_ALIASES[1],
    },
    {
      partners: [
        {
          storeUserId: userId,
          storeName: 'Self',
          isSelfScan: true,
          categories: [{ category: 'misc', categoryLabel: 'Общее', discountPercent: 5, issuerPercent: 0 }],
        },
      ],
      userAlias: PARITY_CERT_ALIASES[2],
    },
  ];

  const certs = [];
  for (let i = 0; i < certBodies.length; i++) {
    const res = await fetch(`${plat}/api/remcard/api/pro/agent-certificates`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': `ui-parity-seed-${Date.now()}-${i}` },
      body: JSON.stringify(certBodies[i]),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`seed_cert_${i}:${body.error || res.status}`);
    certs.push(body.certificate ?? body);
  }

  const parityCertId = certs[0]?.id;
  const parityClientId = clients[0]?.id;
  if (parityCertId) {
    const aliasRes = await fetch(`${plat}/api/remcard/api/pro/agent-certificates/${parityCertId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ userAlias: PARITY_CERT_ALIASES[0] }),
    });
    if (!aliasRes.ok) {
      const aliasBody = await aliasRes.json().catch(() => ({}));
      throw new Error(`parity_cert_alias_patch:${aliasBody.error ?? aliasRes.status}`);
    }
    markParityCertificateUsage(parityCertId, userId, stackEnv);
  }

  const listRes = await fetch(`${plat}/api/remcard/api/pro/agent-certificates`, {
    headers: { Cookie: cookieHeader, Origin: plat },
  });
  const listBody = await listRes.json();
  const parityListed = (listBody.certificates ?? []).some((c) => c.id === parityCertId);
  if (!parityListed) {
    throw new Error(`parity_cert_missing_after_seed:${listBody.error ?? listRes.status}`);
  }

  return {
    clients,
    certs,
    parity: {
      certId: parityCertId,
      clientId: parityClientId,
      certAlias: PARITY_MATCH.certAlias,
      agentDisplayName: PARITY_AGENT_DISPLAY_NAME,
    },
  };
}
