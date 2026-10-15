#!/usr/bin/env node
/**
 * R03.2-CLOSE local acceptance: admin → test-agent browser, mandatory BFF + page checks, ref via HTTP static.
 */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const USE_ADMIN = process.env.R03_ACCEPTANCE_STACK !== 'r02';
const RUN_DIR =
  process.env.R03_RUN_DIR ||
  (USE_ADMIN ? '/tmp/admin-test-local-stack' : process.env.R02_RUN_DIR || '/tmp/r02-local-stack');
const ART_DIR = path.join(ROOT, 'artifacts/remcard-r03');
const REF_ROOT =
  process.env.R03_REFERENCE_ROOT ||
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';
const REF_PORT = Number(process.env.R03_REF_STATIC_PORT || 8765);

const ADMIN_CREDS = {
  login: process.env.ADMIN_TEST_LOGIN?.trim() || 'e2e-admin@remcard.test',
  password: process.env.ADMIN_TEST_PASSWORD?.trim() || 'E2E-Admin-Pass-12chars',
};

function gitSha(cwd) {
  try {
    return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

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

function ensureAdminSchema(env) {
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

function ensureStack() {
  const metaPath = path.join(RUN_DIR, 'meta.json');
  if (existsSync(metaPath)) return;
  const script = USE_ADMIN ? 'admin-test-local-stack.mjs' : 'r02-local-stack.mjs';
  if (USE_ADMIN && !process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET required to start admin-test stack');
  }
  const res = spawnSync('node', [`scripts/${script}`], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    timeout: 300_000,
  });
  if (res.status !== 0) {
    throw new Error(`stack start failed: ${(res.stderr || res.stdout || '').slice(0, 400)}`);
  }
}

function startStaticRefServer(root, port) {
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
        const st = statSync(filePath);
        if (!st.isFile()) {
          res.writeHead(404);
          res.end();
          return;
        }
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

async function waitForTestSession(context, platformOrigin, ms = 60_000) {
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

async function assertHealthyR03Page(page, headingName) {
  const url = page.url();
  if (/\/404|not-found/i.test(url)) return { ok: false, reason: 'route_404' };
  const body = (await page.textContent('body')) ?? '';
  if (/Раздел недоступен/.test(body)) return { ok: false, reason: 'r03_gate_blocked' };
  if (/Path not allowed|Не удалось проверить доступ/i.test(body)) return { ok: false, reason: 'bff_or_gate_error' };
  try {
    await page.getByRole('heading', { name: headingName }).waitFor({ timeout: 20_000 });
    if (headingName === 'Клиенты') {
      await page.getByRole('button', { name: 'Добавить клиента' }).waitFor({ timeout: 25_000 });
    }
    if (headingName === 'Сертификаты') {
      await page.getByRole('link', { name: 'Создать сертификат' }).waitFor({ timeout: 25_000 });
    }
  } catch {
    return { ok: false, reason: `missing_r03_content_${headingName}` };
  }
  return { ok: true };
}

async function driveRefPrototype(page, baseUrl) {
  await page.goto(`${baseUrl}/roles.html`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const app = document.getElementById('app');
      const text = app?.textContent ?? '';
      return text.length > 80 && !/Загружаем прототип/i.test(text);
    },
    { timeout: 90_000 },
  );
  const appText = (await page.locator('#app').textContent()) ?? '';
  if (/Не удалось загрузить прототип/i.test(appText)) {
    return { ok: false, reason: 'ref_prototype_load_failed' };
  }
  const agentBtn = page.getByRole('button', { name: /агент/i }).first();
  if (await agentBtn.isVisible().catch(() => false)) {
    await agentBtn.click();
  }
  const continueBtn = page.getByRole('button', { name: /продолжить|в кабинет|начать/i }).first();
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
    await page.waitForTimeout(800);
  }
  const clientsNav = page.getByRole('button', { name: /^Клиенты$/ }).first();
  if (await clientsNav.isVisible().catch(() => false)) {
    await clientsNav.click();
    await page.waitForTimeout(600);
  }
  return { ok: true };
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

async function finishAgentProfileInBrowser(page, platformOrigin, cookieHeader) {
  await page.goto(`${platformOrigin}/profile?section=basics`, { waitUntil: 'networkidle' });
  await maybeAcceptConsents(page);
  const banner = page.locator('[data-testid="prof-test-mode-banner"]');
  await banner.waitFor({ timeout: 60_000 }).catch(() => {});
  const wizard = page.locator('[data-testid="agent-profile-wizard"]');
  if (await wizard.isVisible().catch(() => false)) {
    await page.getByTestId('agent-profile-input-displayName').fill('R03 Accept Agent');
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
  }).catch(() => null);
  await fetch(`${platformOrigin}/api/remcard/api/pro/agent-profile/finish`, {
    method: 'POST',
    headers: { Cookie: cookieHeader, Origin: platformOrigin, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => null);
}

async function main() {
  ensureStack();
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const env = loadRuntimeEnv(meta.envPath);
  env.PROF_R03_AGENT_CERTIFICATES_ENABLED = 'true';
  if (USE_ADMIN) ensureAdminSchema(env);
  const plat = meta.platformOrigin.replace(/\/$/, '');
  const nav = meta.navOrigin.replace(/\/$/, '');

  mkdirSync(path.join(ART_DIR, 'visual'), { recursive: true });

  const report = {
    ok: false,
    verdict: 'NO_GO',
    stack: USE_ADMIN ? 'admin-test' : 'r02-local',
    platformGitSha: gitSha(ROOT),
    navigatorGitSha: gitSha(NAV_ROOT),
    meta,
    http: {},
    browser: {},
    visuals: [],
    idempotency: {},
    failures: [],
  };

  const refServer = await startStaticRefServer(REF_ROOT, REF_PORT);
  const refBase = `http://127.0.0.1:${REF_PORT}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());

  let cookieHeader = '';
  let agentDisplayName = `R03 ${Date.now()} · Агент`;

  try {
    if (USE_ADMIN) {
      await page.goto(`${plat}/login?mode=admin`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.getByRole('tab', { name: 'Вход администратора' }).click();
      await page.locator('input[autocomplete="username"]').fill(ADMIN_CREDS.login);
      await page.locator('input[autocomplete="current-password"]').fill(ADMIN_CREDS.password);
      await page.getByRole('button', { name: 'Войти' }).click();
      await page.waitForURL(/\/admin\/test-users/, { timeout: 60_000 });
      await page.locator('select').first().selectOption('agent');
      await page.locator('section').filter({ hasText: 'Создать' }).getByLabel('Имя').fill(agentDisplayName);
      await page.getByRole('button', { name: 'Создать' }).click();
      const card = page.locator('li').filter({ hasText: agentDisplayName });
      await card.waitFor({ timeout: 30_000 });
      const enterWait = page.waitForResponse(
        (r) => r.url().includes('/test-users/') && r.url().includes('/enter') && r.status() === 200,
        { timeout: 45_000 },
      );
      await card.getByRole('button', { name: 'Открыть ЛК' }).click();
      await enterWait;
      const session = await waitForTestSession(context, plat, 60_000);
      if (!session) {
        report.failures.push('test_session_not_active');
        throw new Error('test_session_not_active');
      }
      cookieHeader = session.cookieHeader;
      report.browser.testSession = { ok: true, userId: session.me.body?.user?.id };
      await finishAgentProfileInBrowser(page, plat, cookieHeader);
    } else {
      spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', 'push-schema'], {
        cwd: NAV_ROOT,
        env: { ...env, PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true' },
        encoding: 'utf8',
      });
      spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', 'seed'], {
        cwd: NAV_ROOT,
        env: { ...env, PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true' },
        encoding: 'utf8',
      });
      const token = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', 'mint'], {
        cwd: NAV_ROOT,
        env: { ...env, PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true' },
        encoding: 'utf8',
      })
        .stdout.trim();
      await context.addCookies([{ name: 'remcard-token', value: token, url: plat }]);
      cookieHeader = `remcard-token=${token}`;
      report.browser.testSession = { ok: true, mode: 'r02_mint_fixture' };
      await finishAgentProfileInBrowser(page, plat, cookieHeader);
    }

    const bffR03 = await fetch(`${plat}/api/remcard/api/pro/r03/status`, {
      headers: { Cookie: cookieHeader, Origin: plat },
    });
    report.http.bffR03Status = bffR03.status;
    report.http.bffR03Body = await bffR03.json().catch(() => null);
    if (bffR03.status !== 200) report.failures.push(`bff_r03_status_${bffR03.status}`);
    if (report.http.bffR03Body?.eligible !== true) report.failures.push('bff_r03_not_eligible');

    const navR03 = await fetch(`${nav}/api/pro/r03/status`, {
      headers: { Cookie: cookieHeader.split(';').find((p) => p.trim().startsWith('remcard-token=')) ?? cookieHeader },
    });
    report.http.navR03Status = navR03.status;

    const meRes = await fetch(`${plat}/api/remcard/api/auth/me`, { headers: { Cookie: cookieHeader } });
    const meBody = await meRes.json();
    const userId = meBody.user?.id;
    if (!userId) report.failures.push('auth_me_missing_user');

    await page.goto(`${plat}/certificates`, { waitUntil: 'networkidle' });
    const certPage = await assertHealthyR03Page(page, 'Сертификаты');
    report.browser.certificatesPage = certPage;
    if (!certPage.ok) report.failures.push(`certificates_page_${certPage.reason}`);

    await page.goto(`${plat}/clients`, { waitUntil: 'networkidle' });
    const clientsPage = await assertHealthyR03Page(page, 'Клиенты');
    report.browser.clientsPage = clientsPage;
    if (!clientsPage.ok) report.failures.push(`clients_page_${clientsPage.reason}`);

    await page.getByRole('button', { name: 'Добавить клиента' }).click();
    await page.getByLabel(/имя/i).fill('R03 Browser Client');
    await page.getByLabel(/телефон/i).fill('89007654321');
    await page.getByLabel(/город/i).fill('Сочи');
    await page.getByRole('button', { name: 'Добавить', exact: true }).click();
    await page.waitForTimeout(800);
    const clientLink = page.getByRole('link', { name: 'R03 Browser Client' });
    await clientLink.waitFor({ timeout: 15_000 });
    report.browser.clientCreated = true;

    await clientLink.click();
    await page.getByRole('button', { name: 'Поделиться контактами' }).click();
    const preview = page.getByTestId('share-preview-text');
    await preview.waitFor({ timeout: 10_000 });
    const defaultPreview = (await preview.textContent()) ?? '';
    report.browser.shareDefaultNameOnly = defaultPreview.trim() === 'R03 Browser Client';
    if (!report.browser.shareDefaultNameOnly) report.failures.push('share_not_default_name_only');
    await page.getByRole('checkbox', { name: 'Телефон' }).check();
    const withPhone = (await preview.textContent()) ?? '';
    report.browser.shareOptInPhone = /900|765/i.test(withPhone);
    if (!report.browser.shareOptInPhone) report.failures.push('share_opt_in_phone');

    if (userId) {
      const idemKey = `accept-${Date.now()}`;
      const createBody = {
        partners: [
          {
            storeUserId: userId,
            storeName: 'Self',
            isSelfScan: true,
            categories: [
              { category: 'r03-acc', categoryLabel: 'Acc', discountPercent: 5, issuerPercent: 0 },
            ],
          },
        ],
      };
      const h = { Cookie: cookieHeader, 'content-type': 'application/json', Origin: plat, 'Idempotency-Key': idemKey };
      const c1 = await fetch(`${plat}/api/remcard/api/pro/agent-certificates`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(createBody),
      });
      const c2 = await fetch(`${plat}/api/remcard/api/pro/agent-certificates`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(createBody),
      });
      report.idempotency.bffFirst = c1.status;
      report.idempotency.bffRetry = c2.status;
      if (c2.status !== 200 && c2.status !== 201) report.failures.push(`bff_idempotency_retry_${c2.status}`);
    }

    async function shotPair(name, implPath, refSetup) {
      const viewports = [
        { tag: '1440-light', width: 1440, height: 900 },
        { tag: '375-light', width: 375, height: 812 },
      ];
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${plat}${implPath}`, { waitUntil: 'networkidle' });
        const check = await assertHealthyR03Page(
          page,
          implPath.includes('clients') ? 'Клиенты' : 'Сертификаты',
        );
        const implFile = path.join(ART_DIR, 'visual', `impl-${name}-${vp.tag}.png`);
        if (!check.ok) {
          report.failures.push(`visual_impl_${name}_${vp.tag}_${check.reason}`);
          continue;
        }
        await page.screenshot({ path: implFile, fullPage: true });
        const refPage = await context.newPage();
        await refPage.setViewportSize({ width: vp.width, height: vp.height });
        const refState = await refSetup(refPage);
        const refFile = path.join(ART_DIR, 'visual', `ref-${name}-${vp.tag}.png`);
        if (refState.ok) {
          await refPage.screenshot({ path: refFile, fullPage: true });
        } else {
          report.failures.push(`visual_ref_${name}_${vp.tag}_${refState.reason}`);
        }
        report.visuals.push({
          name: `${name}-${vp.tag}`,
          impl: implFile,
          ref: refState.ok ? refFile : null,
          implVerified: check.ok,
          refVerified: refState.ok,
        });
        await refPage.close();
      }
    }

    await shotPair('certificates-list', '/certificates', (p) => driveRefPrototype(p, refBase));
    await shotPair('clients-list', '/clients', (p) => driveRefPrototype(p, refBase));

    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(`${plat}/certificates`, { waitUntil: 'networkidle' });
    const darkCheck = await assertHealthyR03Page(page, 'Сертификаты');
    if (darkCheck.ok) {
      await page.screenshot({
        path: path.join(ART_DIR, 'visual', 'impl-certificates-375-dark.png'),
        fullPage: true,
      });
    } else {
      report.failures.push(`visual_dark_${darkCheck.reason}`);
    }

    await page.setViewportSize({ width: 320, height: 568 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`${plat}/clients`, { waitUntil: 'networkidle' });
    const overflowCheck = await assertHealthyR03Page(page, 'Клиенты');
    if (overflowCheck.ok) {
      const p320 = path.join(ART_DIR, 'visual', 'impl-clients-320-actions.png');
      await page.screenshot({ path: p320, fullPage: true });
      report.visuals.push({ name: 'clients-320-actions', impl: p320, ref: null, implVerified: true, refVerified: false });
    } else {
      report.failures.push(`visual_320_${overflowCheck.reason}`);
    }

    if (userId) {
      const clientId = await fetch(`${plat}/api/remcard/api/pro/agent-clients`, {
        headers: { Cookie: cookieHeader },
      })
        .then((r) => r.json())
        .then((b) => b.clients?.find((c) => c.displayName === 'R03 Browser Client')?.id);
      if (clientId) {
        await page.goto(`${plat}/clients/${clientId}`, { waitUntil: 'networkidle' });
        const detailOk = await page.getByRole('button', { name: 'Поделиться контактами' }).waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
        if (detailOk) {
          const implDetail = path.join(ART_DIR, 'visual', 'impl-clients-detail-375-light.png');
          await page.screenshot({ path: implDetail, fullPage: true });
          report.visuals.push({ name: 'clients-detail-375-light', impl: implDetail, ref: null, implVerified: true, refVerified: false });
        } else {
          report.failures.push('clients_detail_not_ready');
        }
      }
    }
  } catch (err) {
    report.failures.push(err instanceof Error ? err.message : String(err));
    try {
      await page.screenshot({ path: path.join(ART_DIR, 'visual', 'debug-failure.png'), fullPage: true });
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
    refServer.close();
  }

  const gateOff = spawnSync(
    'pnpm',
    ['exec', 'tsx', '-e', "process.env.PROF_R03_AGENT_CERTIFICATES_ENABLED='false'; console.log(process.env.PROF_R03_AGENT_CERTIFICATES_ENABLED)"],
    { cwd: NAV_ROOT, encoding: 'utf8' },
  );
  report.http.gateOffSmoke = { ok: gateOff.status === 0, note: 'env toggle sanity only' };

  report.ok =
    report.failures.length === 0 &&
    report.http.bffR03Status === 200 &&
    report.http.bffR03Body?.featureEnabled === true &&
    report.browser.certificatesPage?.ok === true &&
    report.browser.clientsPage?.ok === true &&
    report.browser.shareDefaultNameOnly === true &&
    report.visuals.some((v) => v.implVerified && v.refVerified);

  report.verdict = report.ok ? 'READY_FOR_PUBLICATION' : 'NO_GO';

  writeFileSync(path.join(ART_DIR, 'local-acceptance-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
