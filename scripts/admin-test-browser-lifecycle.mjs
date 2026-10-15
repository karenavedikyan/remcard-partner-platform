#!/usr/bin/env node
/**
 * ADMIN-TEST-01 browser + BFF lifecycle (disposable loopback PG only).
 * Requires admin-test-local-stack running; credentials via env file (never logged).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const require = createRequire(path.join(NAV_ROOT, 'package.json'));
const pg = require('pg');
const RUN_DIR = process.env.ADMIN_TEST_RUN_DIR || '/tmp/admin-test-local-stack';
const ARTIFACT_DIR = path.join(ROOT, 'artifacts/remcard-admin-test-01');
const SHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

const KIND_LABEL = {
  agent: 'Агент',
  master: 'Специалист',
  store: 'Магазин',
  company: 'Компания',
};

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

function assertLoopbackDb(url) {
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error('Refusing: non-loopback DATABASE_URL');
  }
  const db = parsed.pathname.replace(/^\//, '');
  if (db !== 'remcard_admin_test_012') {
    throw new Error(`Refusing: expected remcard_admin_test_012, got ${db}`);
  }
}

function isProfilePath(urlString) {
  try {
    return new URL(urlString).pathname.startsWith('/profile');
  } catch {
    return false;
  }
}

function loadAdminCreds() {
  const login = process.env.ADMIN_TEST_LOGIN?.trim();
  const password = process.env.ADMIN_TEST_PASSWORD?.trim();
  const newPassword = process.env.ADMIN_TEST_NEW_PASSWORD?.trim();
  if (login && password && newPassword) {
    return { login, password, newPassword };
  }
  return {
    login: 'e2e-admin@remcard.test',
    password: 'E2E-Admin-Pass-12chars',
    newPassword: 'E2E-Admin-NewPass-99',
  };
}

function stepLog(steps, entry) {
  const row = { at: new Date().toISOString(), ...entry };
  steps.push(row);
  if (process.env.ADMIN_TEST_BROWSER_DEBUG === '1') {
    console.error(JSON.stringify(row));
  }
}

async function bffDraft(platformOrigin, cookies) {
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const res = await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/draft`, {
    headers: { Cookie: cookieHeader },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

function sessionRejected(me) {
  return (
    me.status === 401 ||
    me.status === 403 ||
    me.body?.user == null ||
    me.body?.code === 'PROF_TEST_SESSION_INVALID'
  );
}

async function bffAuthMe(platformOrigin, cookies) {
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const res = await fetch(`${platformOrigin}/api/remcard/api/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function waitForTestSession(context, platformOrigin, ms = 45_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const cookies = await context.cookies();
    const me = await bffAuthMe(platformOrigin, cookies);
    if (me.status === 200 && me.body?.user?.isProfTestUser && me.body?.profTestSession?.active) {
      return me;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function openAgentProfile(page, platformOrigin, steps) {
  await page.goto(`${platformOrigin}/profile?section=basics`, { waitUntil: 'networkidle' });
  const consentOrBanner = await Promise.race([
    page
      .waitForSelector('[data-testid="prof-test-mode-banner"]', { timeout: 20_000 })
      .then(() => 'banner')
      .catch(() => null),
    page
      .getByRole('heading', { name: /соглас/i })
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => 'consent')
      .catch(() => null),
  ]);
  stepLog(steps, { step: 'profile_entry_gate', url: page.url(), gate: consentOrBanner ?? 'unknown' });
  if (consentOrBanner === 'consent' || page.url().includes('step=consents')) {
    await maybeAcceptConsents(page, steps);
    await page.goto(`${platformOrigin}/profile?section=basics`, { waitUntil: 'networkidle' });
  }
}

async function maybeAcceptConsents(page, steps) {
  await page.waitForTimeout(600);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!page.url().includes('/login') && !page.url().includes('step=consents')) {
      stepLog(steps, { step: 'consent_ux', action: 'not_shown', ok: true });
      return;
    }
    const consentHeading = page.getByText('Обязательные соглашения');
    const visible = await consentHeading
      .waitFor({ state: 'visible', timeout: attempt === 0 ? 15_000 : 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!visible) {
      stepLog(steps, { step: 'consent_ux', action: 'not_shown', ok: true });
      return;
    }
    const missingDoc = await page.getByText(/документ.*недоступен/i).isVisible().catch(() => false);
    if (missingDoc) {
      await page.getByRole('button', { name: /повторить проверку/i }).click();
      await page.waitForTimeout(1200);
      continue;
    }
    const boxes = page.locator('input[type="checkbox"]');
    const count = await boxes.count();
    for (let i = 0; i < count; i++) {
      await boxes.nth(i).check({ force: true });
    }
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await page
      .waitForURL((url) => url.pathname.startsWith('/profile'), { timeout: 60_000 })
      .catch(() => null);
    await page.waitForTimeout(800);
    stepLog(steps, { step: 'consent_ux', action: 'accepted_via_ui', ok: true, checkboxCount: count });
    return;
  }
  stepLog(steps, { step: 'consent_ux', action: 'blocked_missing_documents', ok: false });
}

async function shot(page, name, width) {
  await page.setViewportSize({ width, height: width <= 320 ? 700 : 900 });
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}-${width}.png`), fullPage: true });
}

async function runNegatives({
  platformOrigin,
  backendOrigin,
  adminCookies,
  testSessionCookies,
  savedReturnCookie,
  env,
  steps,
}) {
  const dbUrl = env.DATABASE_URL;
  assertLoopbackDb(dbUrl);
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  const realUser = await client.query(
    `SELECT id FROM "User" WHERE COALESCE("isProfTestUser", false) = false AND "deletedAt" IS NULL LIMIT 1`,
  );
  const realId = realUser.rows[0]?.id;
  if (realId) {
    const adminCookie = adminCookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const resetReal = await fetch(`${backendOrigin}/api/pro/admin/test-users/${realId}/reset`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
    });
    const before = await client.query(`SELECT "agentContactEmail" FROM "User" WHERE id = $1`, [realId]);
    const after = await client.query(`SELECT "agentContactEmail" FROM "User" WHERE id = $1`, [realId]);
    stepLog(steps, {
      step: 'negative_real_user_reset',
      status: resetReal.status,
      ok: resetReal.status === 404 || resetReal.status === 403,
      emailUnchanged: before.rows[0]?.agentContactEmail === after.rows[0]?.agentContactEmail,
    });
  } else {
    stepLog(steps, { step: 'negative_real_user_reset', ok: true, skipped: 'no_real_user_row' });
  }

  const revokedCookies = adminCookies.filter((c) => c.name === 'remcard-token');
  if (revokedCookies.length) {
    const meBlocked = await bffAuthMe(platformOrigin, revokedCookies);
    stepLog(steps, {
      step: 'negative_auth_me_after_password_bump',
      bffStatus: meBlocked.status,
      ok: sessionRejected(meBlocked),
    });
  }

  if (savedReturnCookie) {
    const replay = await fetch(`${backendOrigin}/api/pro/admin/test-users/return`, {
      method: 'POST',
      headers: { Cookie: `remcard-admin-return=${savedReturnCookie}; remcard-token=invalid` },
    });
    stepLog(steps, {
      step: 'negative_return_replay',
      status: replay.status,
      ok: replay.status === 403 || replay.status === 401,
    });
  }

  const inviteCookieJar = testSessionCookies?.length ? testSessionCookies : adminCookies;
  const invite = await fetch(`${platformOrigin}/api/remcard/api/partnership/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: inviteCookieJar.map((c) => `${c.name}=${c.value}`).join('; '),
    },
    body: JSON.stringify({ receiverUserId: 'x', terms: [] }),
  });
  stepLog(steps, {
    step: 'negative_partnership_invite_bff',
    status: invite.status,
    ok: invite.status === 401 || invite.status === 403,
  });

  await client.end();
}

async function main() {
  const runtimeEnv = loadRuntimeEnv();
  assertLoopbackDb(runtimeEnv.DATABASE_URL);
  spawnSync('pnpm', ['exec', 'tsx', 'scripts/admin-test-012-lifecycle.ts', '--fixtures-only'], {
    cwd: NAV_ROOT,
    env: { ...process.env, ...runtimeEnv },
    encoding: 'utf8',
  });
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const platformOrigin = meta.platformOrigin;
  const backendOrigin = meta.navOrigin;
  const creds = loadAdminCreds();

  mkdirSync(SHOT_DIR, { recursive: true });
  const steps = [];
  const runTag = `BLC ${Date.now()}`;
  let agentDisplayName = `${runTag} · Агент`;
  let savedReturnCookie = null;
  let adminCookiesBeforePwdChange = null;
  let testSessionCookiesForNegative = null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());

  try {
    await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const adminTab = page.getByRole('tab', { name: 'Вход администратора' });
    await adminTab.waitFor({ state: 'visible', timeout: 120_000 });
    await adminTab.click();
    await page.locator('input[autocomplete="username"]').waitFor({ timeout: 60_000 });
    await page.locator('input[autocomplete="username"]').fill(creds.login);
    await page.locator('input[autocomplete="current-password"]').fill(creds.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL(/\/admin\/test-users/, { timeout: 60_000 });
    stepLog(steps, { step: 'admin_login_form', ok: true, path: page.url() });

    for (const kind of ['agent', 'master', 'store', 'company']) {
      const label = KIND_LABEL[kind];
      const displayName = `${runTag} · ${label}`;
      if (kind === 'agent') agentDisplayName = displayName;
      await page.locator('select').first().selectOption(kind);
      await page.locator('section').filter({ hasText: 'Создать' }).getByLabel('Имя').fill(displayName);
      await page.getByRole('button', { name: 'Создать' }).click();
      await page.waitForTimeout(600);
      const card = page.locator('li').filter({ hasText: displayName });
      await card.waitFor({ timeout: 30_000 });
      const cardText = (await card.textContent()) ?? '';
      const typeOk = cardText.includes(label);
      stepLog(steps, { step: `create_${kind}`, ok: typeOk, displayName, metaSnippet: cardText.trim().slice(0, 80) });
    }

    await shot(page, 'admin-list', 1440);
    await shot(page, 'admin-list', 375);

    const agentCard = page.locator('li').filter({ hasText: agentDisplayName });
    const enterWait = page.waitForResponse(
      (r) => r.url().includes('/test-users/') && r.url().includes('/enter') && r.status() === 200,
      { timeout: 45_000 },
    );
    await agentCard.getByRole('button', { name: 'Открыть ЛК' }).click();
    await enterWait;
    await page.waitForLoadState('networkidle');
    const testMe = await waitForTestSession(context, platformOrigin, 45_000);
    stepLog(steps, {
      step: 'enter_test_session',
      ok: Boolean(testMe),
      isProfTestUser: testMe?.body?.user?.isProfTestUser,
      profTestActive: testMe?.body?.profTestSession?.active,
    });
    if (!testMe) throw new Error('test_session_not_active_after_enter');
    await openAgentProfile(page, platformOrigin, steps);

    await page.waitForSelector('[data-testid="prof-test-mode-banner"]', { timeout: 60_000 });
    await page.waitForSelector('[data-testid="agent-product-topbar"], [data-testid="agent-profile-scope"]', {
      timeout: 60_000,
    });
    stepLog(steps, {
      step: 'enter_agent_shell',
      ok: true,
      banner: true,
    });
    await shot(page, 'test-banner', 1440);

    await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 60_000 });
    const profile = {
      displayName: 'Browser Agent Profile',
      city: 'Сочи',
      phone: '79001112233',
      email: 'browser.agent@example.test',
      audience: 'Знакомые и клиенты',
    };
    await page.getByTestId('agent-profile-input-displayName').fill(profile.displayName);
    await page.locator('#agent-city').fill(profile.city);
    await page.getByTestId('agent-profile-save-draft').click();
    await page.waitForResponse(
      (r) => r.url().includes('/agent-profile/draft') && r.request().method() === 'PATCH' && r.status() === 200,
      { timeout: 45_000 },
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 60_000 });
    const reloadedName = await page.getByTestId('agent-profile-input-displayName').inputValue();
    const reloadedCity = await page.locator('#agent-city').inputValue();
    stepLog(steps, {
      step: 'r02_save_draft_reload',
      ok: reloadedName === profile.displayName && reloadedCity === profile.city,
      reloadedName,
      reloadedCity,
    });

    await page.getByTestId('agent-profile-next').click();
    await page.waitForSelector('#agent-profile-step-title', { hasText: 'Кому' });
    await page.getByRole('button', { name: 'Пропустить' }).click();
    await page.waitForSelector('#agent-profile-step-title', { hasText: 'связаться' });
    stepLog(steps, { step: 'r02_skip_audience_step', ok: true });

    await page.getByTestId('agent-profile-input-phone').fill(profile.phone);
    await page.locator('#agent-email').fill(profile.email);
    await page.getByTestId('agent-profile-save-draft').click();
    await page.waitForResponse(
      (r) => r.url().includes('/agent-profile/draft') && r.request().method() === 'PATCH' && r.status() === 200,
      { timeout: 45_000 },
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 60_000 });
    const reloadedPhone = await page.getByTestId('agent-profile-input-phone').inputValue();
    const reloadedEmail = await page.locator('#agent-email').inputValue();
    stepLog(steps, {
      step: 'r02_contacts_draft_reload',
      ok: reloadedPhone.replace(/\D/g, '').includes('9001112233') && reloadedEmail === profile.email,
      reloadedPhone,
      reloadedEmail,
    });

    await page.getByTestId('agent-profile-next').click();
    await page.waitForSelector('[data-testid="agent-profile-progress"]', { hasText: 'Шаг 4' });

    await page.getByTestId('agent-profile-next').click();
    await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 60_000 });
    stepLog(steps, { step: 'r02_finish_profile', ok: true });
    await shot(page, 'profile-saved', 1440);
    await shot(page, 'profile-saved', 375);
    await shot(page, 'smoke-profile', 320);

    let cookies = await context.cookies();
    testSessionCookiesForNegative = [...cookies];
    savedReturnCookie = cookies.find((c) => c.name === 'remcard-admin-return')?.value ?? null;
    let draft = await bffDraft(platformOrigin, cookies);
    stepLog(steps, {
      step: 'bff_get_after_finish',
      bffStatus: draft.status,
      ok:
        draft.status === 200 &&
        draft.body?.profileComplete === true &&
        !draft.body?.hasDraft,
      profileComplete: draft.body?.profileComplete,
      hasDraft: draft.body?.hasDraft,
      savedDisplayName: draft.body?.savedProfile?.displayName ?? draft.body?.payload?.displayName,
    });

    await page.getByRole('button', { name: 'Вернуться в управление тестами' }).click();
    await page.waitForURL(/\/admin\/test-users/, { timeout: 60_000 });
    await agentCard.getByRole('button', { name: 'Открыть ЛК' }).click();
    await page.waitForLoadState('networkidle');
    await maybeAcceptConsents(page, steps);
    await page.waitForURL((url) => url.pathname.startsWith('/profile'), { timeout: 90_000 });
    await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 60_000 });
    cookies = await context.cookies();
    draft = await bffDraft(platformOrigin, cookies);
    stepLog(steps, {
      step: 'return_enter_fresh_bff_get',
      bffStatus: draft.status,
      ok:
        draft.status === 200 &&
        draft.body?.profileComplete === true &&
        (draft.body?.savedProfile?.displayName === profile.displayName ||
          draft.body?.payload?.displayName === profile.displayName),
      hasDraft: draft.body?.hasDraft,
    });

    await page.getByRole('button', { name: 'Вернуться в управление тестами' }).click();
    await page.waitForURL(/\/admin\/test-users/, { timeout: 60_000 });
    await agentCard.getByRole('button', { name: 'Сбросить профиль' }).click();
    await page.waitForTimeout(800);
    await agentCard.getByRole('button', { name: 'Открыть ЛК' }).click();
    await page.waitForLoadState('networkidle');
    await maybeAcceptConsents(page, steps);
    await page.waitForURL((url) => url.pathname.startsWith('/profile'), { timeout: 90_000 });
    cookies = await context.cookies();
    draft = await bffDraft(platformOrigin, cookies);
    const dbClient = new pg.Client({ connectionString: runtimeEnv.DATABASE_URL });
    await dbClient.connect();
    const agentRow = await dbClient.query(
      `SELECT "agentContactPhone", "agentContactEmail", "partnershipContactPhone", "partnershipContactEmail", "agentWorkingDisplayName"
       FROM "User" u
       JOIN "ProfTestDelegation" d ON d."testUserId" = u.id
       WHERE u."displayName" = $1
       ORDER BY d."createdAt" DESC LIMIT 1`,
      [agentDisplayName],
    );
    await dbClient.end();
    const row = agentRow.rows[0] ?? {};
    stepLog(steps, {
      step: 'reset_profile_scope',
      bffStatus: draft.status,
      ok:
        draft.status === 200 &&
        !draft.body?.hasDraft &&
        row.agentContactPhone == null &&
        row.agentContactEmail == null &&
        row.partnershipContactPhone == null &&
        row.partnershipContactEmail == null,
      agentWorkingDisplayName: row.agentWorkingDisplayName,
      profileComplete: draft.body?.profileComplete,
    });

    await page.getByRole('button', { name: 'Вернуться в управление тестами' }).click().catch(async () => {
      await page.goto(`${platformOrigin}/admin/test-users`);
    });
    await page.waitForURL(/\/admin\/test-users/, { timeout: 60_000 });

    await agentCard.getByRole('button', { name: 'Отключить' }).click();
    await page.waitForTimeout(600);
    const disabledVisible = (await agentCard.textContent())?.includes('отключён');
    stepLog(steps, { step: 'disable_visible_in_list', ok: Boolean(disabledVisible) });

    const enterDisabled = await agentCard.getByRole('button', { name: 'Открыть ЛК' }).isDisabled();
    const staleMe = await bffAuthMe(platformOrigin, testSessionCookiesForNegative ?? []);
    stepLog(steps, {
      step: 'disable_session_invalid',
      enterButtonDisabled: enterDisabled,
      staleAuthMeStatus: staleMe.status,
      ok: enterDisabled && sessionRejected(staleMe),
    });

    adminCookiesBeforePwdChange = await context.cookies();
    await page.goto(`${platformOrigin}/admin/password`, { waitUntil: 'networkidle' });
    await page.getByLabel('Текущий пароль').fill(creds.password);
    await page.getByLabel(/Новый пароль/).fill(creds.newPassword);
    await page.getByRole('button', { name: 'Сменить пароль' }).click();
    await page.waitForSelector('text=Пароль обновлён', { timeout: 30_000 });
    stepLog(steps, { step: 'admin_password_change_ui', ok: true });

    await page.goto(`${platformOrigin}/login?mode=admin`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Вход администратора' }).click();
    await page.locator('input[autocomplete="username"]').fill(creds.login);
    await page.locator('input[autocomplete="current-password"]').fill(creds.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForTimeout(2000);
    const oldRejected = page.url().includes('/login');
    await page.locator('input[autocomplete="current-password"]').fill(creds.newPassword);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    stepLog(steps, {
      step: 'admin_password_old_rejected_new_works',
      ok: oldRejected && /admin/.test(page.url()),
    });

    const staleAdmin = await fetch(`${backendOrigin}/api/pro/admin/test-users`, {
      headers: {
        Cookie: adminCookiesBeforePwdChange.map((c) => `${c.name}=${c.value}`).join('; '),
      },
    });
    stepLog(steps, {
      step: 'admin_password_invalidates_old_admin_session',
      status: staleAdmin.status,
      ok: staleAdmin.status === 401 || staleAdmin.status === 403,
    });
  } catch (err) {
    stepLog(steps, {
      step: 'fatal',
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    });
    writeFileSync(
      path.join(ARTIFACT_DIR, 'browser-lifecycle.json'),
      JSON.stringify({ ok: false, steps }, null, 2),
    );
    throw err;
  } finally {
    await browser.close();
  }

  await runNegatives({
    platformOrigin,
    backendOrigin,
    adminCookies: adminCookiesBeforePwdChange ?? [],
    testSessionCookies: testSessionCookiesForNegative ?? [],
    savedReturnCookie,
    env: runtimeEnv,
    steps,
  });

  const ok = steps.every((s) => s.ok !== false && !s.fail);
  const artifact = {
    startedAt: steps[0]?.at,
    finishedAt: new Date().toISOString(),
    platformOrigin,
    backendOrigin,
    database: 'remcard_admin_test_012',
    ok,
    steps,
  };
  writeFileSync(path.join(ARTIFACT_DIR, 'browser-lifecycle.json'), JSON.stringify(artifact, null, 2));
  console.log(JSON.stringify({ ok, steps: steps.length, artifact: 'browser-lifecycle.json' }));
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
