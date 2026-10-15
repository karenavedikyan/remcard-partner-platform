#!/usr/bin/env node
/**
 * R03 FINAL-3 local acceptance: integrated agent nav, honest visual pairs, E2E path.
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
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import {
  driveRefAgentSection,
  verifyImplAgentShell,
} from './lib/r03-prototype-ref.mjs';
import {
  assertDarkThemeMeasurement,
  measureCabinetThemeInPage,
} from './lib/r03-theme-assert.mjs';

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

function runtimeEnvHasPilotFlags(envPath) {
  if (!existsSync(envPath)) return false;
  const body = readFileSync(envPath, 'utf8');
  return (
    body.includes('PROF_R01_AGENT_NAV_ENABLED=true') &&
    body.includes('PROF_R03_AGENT_CERTIFICATES_ENABLED=true')
  );
}

function killPort(port) {
  try {
    execSync(`pkill -f "next dev -p ${port}" 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
}

function spawnNavDev(port, navEnv) {
  const child = spawn('bash', ['-lc', `exec pnpm exec next dev -p ${port}`], {
    cwd: NAV_ROOT,
    env: { ...process.env, ...navEnv, PORT: String(port) },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return child.pid;
}

async function waitHttp(url, ms = 120_000) {
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

async function restartNavigator(meta, navEnvOverrides) {
  const navUrl = new URL(meta.navOrigin);
  const port = Number(navUrl.port || 80);
  if (meta.navPid) {
    try {
      process.kill(-meta.navPid, 'SIGKILL');
    } catch {
      try {
        process.kill(meta.navPid, 'SIGKILL');
      } catch {
        /* ignore */
      }
    }
  }
  killPort(port);
  await new Promise((r) => setTimeout(r, 4000));
  const baseEnv = loadRuntimeEnv(meta.envPath);
  const r03Flag = navEnvOverrides.PROF_R03_AGENT_CERTIFICATES_ENABLED ?? 'true';
  const envLines = readFileSync(meta.envPath, 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('PROF_R03_AGENT_CERTIFICATES_ENABLED='));
  writeFileSync(meta.envPath, `${[...envLines, `PROF_R03_AGENT_CERTIFICATES_ENABLED=${r03Flag}`].join('\n')}\n`, {
    mode: 0o600,
  });
  const navEnv = {
    JWT_SECRET: baseEnv.JWT_SECRET,
    DATABASE_URL: baseEnv.DATABASE_URL,
    DIRECT_URL: baseEnv.DIRECT_URL,
    PROF_ADMIN_PASSWORD_LOGIN_ENABLED: '1',
    PROF_ADMIN_TEST_USERS_ENABLED: '1',
    PROF_R02_AGENT_PROFILE_ENABLED: 'true',
    PROF_R01_AGENT_NAV_ENABLED: 'true',
    PROF_R03_AGENT_CERTIFICATES_ENABLED: r03Flag,
    ...navEnvOverrides,
  };
  const navPid = spawnNavDev(port, navEnv);
  const ok = await waitHttp(`${meta.navOrigin}/api/auth/me`);
  if (!ok) throw new Error('navigator_restart_failed');
  meta.navPid = navPid;
  writeFileSync(path.join(RUN_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  return navEnv;
}

function ensureAgentPartnership(agentUserId, env) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r03AcceptancePartnerSeed.ts', agentUserId], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`partner seed: ${(res.stderr || res.stdout || '').slice(0, 400)}`);
  }
  try {
    return JSON.parse((res.stdout || '').trim().split('\n').pop() ?? '{}');
  } catch {
    return { ok: false };
  }
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
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    if (runtimeEnvHasPilotFlags(meta.envPath)) return;
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
      await page
        .getByRole('link', { name: 'Создать сертификат' })
        .or(page.getByRole('button', { name: 'Создать сертификат' }))
        .first()
        .waitFor({ timeout: 25_000 });
    }
  } catch {
    return { ok: false, reason: `missing_r03_content_${headingName}` };
  }
  return { ok: true };
}

async function fetchCabinetPrefs(platformOrigin, cookieHeader) {
  const res = await fetch(`${platformOrigin}/api/remcard/api/pro/cabinet-ui-preferences`, {
    headers: { Cookie: cookieHeader },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function setImplViewMode(page, viewMode) {
  const toggle = page.locator('[data-testid="agent-r03-view-toggle"]');
  await toggle.getByRole('button', { name: viewMode === 'list' ? 'Список' : 'Карточки' }).click();
  await page.waitForTimeout(300);
}

async function openSectionViaNav(page, plat, sectionKey) {
  const href = sectionKey === 'certificates' ? '/certificates' : '/clients';
  const headingName = sectionKey === 'certificates' ? 'Сертификаты' : 'Клиенты';
  const desktop = page.locator(`[data-testid="nav-${sectionKey}"]`).first();
  const mobile = page.locator(`[data-testid="nav-mobile-${sectionKey}"]`).first();
  const more = page.locator('[data-testid="mobile-nav-more"]');
  if (await desktop.isVisible().catch(() => false)) {
    await desktop.click();
  } else if (await mobile.isVisible().catch(() => false)) {
    await mobile.click();
  } else if (await more.isVisible().catch(() => false)) {
    await more.click();
    await page.getByRole('link', { name: headingName }).click();
  } else {
    await page.goto(`${plat}${href}`, { waitUntil: 'networkidle' });
    return;
  }
  await page.waitForURL((url) => url.pathname === href || url.pathname.startsWith(`${href}/`), {
    timeout: 45_000,
  }).catch(() => page.goto(`${plat}${href}`, { waitUntil: 'networkidle' }));
  await page.waitForLoadState('networkidle');
}

async function measurePageTheme(page) {
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

async function ensurePageDark(page) {
  const toggle = page.locator('[data-testid="theme-toggle"], [data-action="theme"]').first();
  let last = await measurePageTheme(page);
  for (let i = 0; i < 6; i++) {
    if (last.verdict.ok) return last;
    if (!(await toggle.isVisible().catch(() => false))) break;
    await toggle.click();
    await page.waitForTimeout(450);
    last = await measurePageTheme(page);
  }
  return last;
}

async function captureMatchedPair(context, report, opts) {
  const { name, plat, implPath, section, viewMode, viewport, refBase, scrollList, dark } = opts;
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${plat}${implPath}`, { waitUntil: 'networkidle' });
  let implThemeEvidence = null;
  if (dark) {
    const implTheme = await ensurePageDark(page);
    implThemeEvidence = implTheme.raw;
    if (!implTheme.verdict.ok) {
      report.failures.push(`visual_impl_${name}_theme_not_dark`);
      report.themeChecks = report.themeChecks ?? {};
      report.themeChecks[`impl-${name}`] = implTheme;
      await page.close();
      return;
    }
  }
  await setImplViewMode(page, viewMode);
  const implCheck = await verifyImplAgentShell(page, section, viewMode);
  if (!implCheck.ok) {
    report.failures.push(`visual_impl_${name}_${implCheck.reason}`);
    await page.close();
    return;
  }
  if (dark) {
    const implRecheck = await measurePageTheme(page);
    implThemeEvidence = implRecheck.raw;
    if (!implRecheck.verdict.ok) {
      report.failures.push(`visual_impl_${name}_theme_not_dark_after_view`);
      report.themeChecks = report.themeChecks ?? {};
      report.themeChecks[`impl-${name}-final`] = implRecheck;
      await page.close();
      return;
    }
  }
  const implFile = path.join(ART_DIR, 'visual', `impl-${name}.png`);
  await page.screenshot({ path: implFile, fullPage: true });

  const refPage = await context.newPage();
  await refPage.setViewportSize({ width: 1440, height: 900 });
  const refState = await driveRefAgentSection(refPage, refBase, {
    section,
    viewMode,
    scrollList: scrollList ?? false,
    dark: dark ?? false,
  });
  const refFile = path.join(ART_DIR, 'visual', `ref-${name}.png`);
  let refVerified = refState.ok;
  let refThemeEvidence = null;
  if (refState.ok) {
    if (viewport.width !== 1440 || viewport.height !== 900) {
      await refPage.setViewportSize(viewport);
      await refPage.waitForTimeout(500);
      if (scrollList && viewMode === 'list') {
        await refPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await refPage.waitForTimeout(300);
      }
    }
    if (dark) {
      const refTheme = await measurePageTheme(refPage);
      refThemeEvidence = refTheme.raw;
      report.themeChecks = report.themeChecks ?? {};
      report.themeChecks[`ref-${name}`] = refTheme;
      if (!refTheme.verdict.ok) {
        refVerified = false;
        report.failures.push(`visual_ref_${name}_theme_not_dark`);
      }
    }
    if (refVerified) await refPage.screenshot({ path: refFile, fullPage: true });
  } else {
    report.failures.push(`visual_ref_${name}_${refState.reason}`);
  }
  report.visualPairs.push({
    name,
    impl: implFile,
    ref: refVerified ? refFile : null,
    implVerified: true,
    refVerified,
    viewport: `${viewport.width}x${viewport.height}`,
    section,
    viewMode,
    theme: dark ? 'dark' : 'light',
    themeEvidence: dark ? { impl: implThemeEvidence, ref: refThemeEvidence } : undefined,
  });
  await page.close();
  await refPage.close();
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

function writeVisualReport(report) {
  const verifiedPairs = report.visualPairs.filter((p) => p.implVerified && p.refVerified);
  const lines = [
    '# R03 visual pairs (FINAL-4)',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Platform SHA: ${report.platformGitSha}`,
    '',
    `Matched pairs (both verified): **${verifiedPairs.length}**`,
    `Single screenshots: **${report.singles.length}**`,
    '',
    '## Pairs',
    '',
  ];
  for (const p of report.visualPairs) {
    lines.push(
      `- **${p.name}** (${p.viewport}, ${p.section}, ${p.viewMode}, ${p.theme ?? 'light'}): impl=${p.implVerified ? 'ok' : 'fail'}, ref=${p.refVerified ? 'ok' : 'fail'}`,
    );
  }
  lines.push('', '## Singles', '');
  for (const s of report.singles) {
    lines.push(`- ${s.name}: \`${s.path}\``);
  }
  if (report.failures.length) {
    lines.push('', '## Failures', '');
    for (const f of report.failures.filter((x) => x.startsWith('visual_'))) {
      lines.push(`- ${f}`);
    }
  }
  writeFileSync(path.join(ART_DIR, 'visual-report.md'), `${lines.join('\n')}\n`);
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
    visualPairs: [],
    singles: [],
    steps: {},
    flags: {},
    idempotency: {},
    failures: [],
  };

  const refServer = await startStaticRefServer(REF_ROOT, REF_PORT);
  const refBase = `http://127.0.0.1:${REF_PORT}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let nextPromptValue = null;
  page.on('dialog', async (d) => {
    if (d.type() === 'prompt' && nextPromptValue != null) {
      await d.accept(nextPromptValue);
      nextPromptValue = null;
    } else {
      await d.accept();
    }
  });

  let cookieHeader = '';
  let agentDisplayName = `R03 ${Date.now()} · Агент`;
  let agentCard = null;

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
      agentCard = page.locator('li').filter({ hasText: agentDisplayName });
      await agentCard.waitFor({ timeout: 30_000 });
      const enterWait = page.waitForResponse(
        (r) => r.url().includes('/test-users/') && r.url().includes('/enter') && r.status() === 200,
        { timeout: 45_000 },
      );
      await agentCard.getByRole('button', { name: 'Открыть ЛК' }).click();
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

    if (process.env.R03_ONLY_DARK_PAIR === '1') {
      await openSectionViaNav(page, plat, 'certificates');
      await captureMatchedPair(context, report, {
        name: 'certificates-list-375-dark',
        plat,
        implPath: '/certificates',
        section: 'certificates',
        viewMode: 'list',
        viewport: { width: 375, height: 812 },
        refBase,
        scrollList: true,
        dark: true,
      });
      const darkPair = report.visualPairs.find((p) => p.name === 'certificates-list-375-dark');
      report.scope = 'dark-pair-only';
      report.ok =
        report.failures.length === 0 && darkPair?.implVerified === true && darkPair?.refVerified === true;
      report.verdict = report.ok ? 'READY_FOR_REVIEW' : 'NO_GO';
      writeFileSync(path.join(ART_DIR, 'local-acceptance-report.json'), JSON.stringify(report, null, 2));
      writeVisualReport(report);
      await browser.close();
      refServer.close();
      console.log(JSON.stringify({ verdict: report.verdict, failures: report.failures, darkPair }, null, 2));
      process.exit(report.ok ? 0 : 1);
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
    if (userId) {
      report.steps.partnershipSeed = ensureAgentPartnership(userId, env);
      if (!report.steps.partnershipSeed?.ok) report.failures.push('partnership_seed_failed');
    }

    const prefs = await fetchCabinetPrefs(plat, cookieHeader);
    report.flags.cabinetPrefs = prefs.body;
    report.flags.pilotActive = prefs.body?.pilotActive === true;
    report.flags.permittedKeys = prefs.body?.permittedKeys ?? null;
    report.flags.mobileNavKeys = prefs.body?.mobileNavKeys ?? null;
    if (!prefs.body?.pilotActive) report.failures.push('pilot_nav_not_active');
    if (!prefs.body?.permittedKeys?.includes('certificates')) {
      report.failures.push('nav_missing_certificates_key');
    }
    if (!prefs.body?.permittedKeys?.includes('clients')) {
      report.failures.push('nav_missing_clients_key');
    }

    await openSectionViaNav(page, plat, 'certificates');
    const certPage = await assertHealthyR03Page(page, 'Сертификаты');
    report.browser.certificatesViaNav = certPage.ok;
    if (!certPage.ok) report.failures.push(`certificates_page_${certPage.reason}`);

    await openSectionViaNav(page, plat, 'clients');
    const clientsPage = await assertHealthyR03Page(page, 'Клиенты');
    report.browser.clientsViaNav = clientsPage.ok;
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

    const clientId = await fetch(`${plat}/api/remcard/api/pro/agent-clients`, {
      headers: { Cookie: cookieHeader },
    })
      .then((r) => r.json())
      .then((b) => b.clients?.find((c) => c.displayName === 'R03 Browser Client')?.id);
    if (!clientId) report.failures.push('client_id_missing');

    await page.getByRole('button', { name: 'Редактировать' }).click();
    await page.getByLabel(/имя/i).fill('R03 Browser Client Renamed');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await page.waitForTimeout(800);
    const phoneAfterRename = await fetch(`${plat}/api/remcard/api/pro/agent-clients/${clientId}`, {
      headers: { Cookie: cookieHeader },
    })
      .then((r) => r.json())
      .then((b) => b.client?.phone ?? b.phone);
    report.steps.clientRenameOnly = /900|765/i.test(String(phoneAfterRename ?? ''));
    if (!report.steps.clientRenameOnly) report.failures.push('client_rename_lost_phone');

    await openSectionViaNav(page, plat, 'certificates');
    const partnersResponse = page.waitForResponse(
      (r) => r.url().includes('available-partners') && r.request().method() === 'GET',
      { timeout: 90_000 },
    );
    await page.goto(`${plat}/certificates/new${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`, {
      waitUntil: 'networkidle',
    });
    const partnersJson = await (await partnersResponse).json().catch(() => ({}));
    report.steps.availablePartnersCount = Array.isArray(partnersJson.partners) ? partnersJson.partners.length : -1;
    report.steps.issuerReady = partnersJson.certificateRecommendationIssuerReady;
    if (!partnersJson.partners?.length) report.failures.push('available_partners_empty');

    const partnerBox = page.locator('section').filter({ hasText: 'Партнёры' }).locator('input[type="checkbox"]:not(:disabled)').first();
    await partnerBox.waitFor({ timeout: 30_000 });
    await partnerBox.check();
    await page.getByRole('button', { name: 'Создать сертификат' }).click();
    await page.waitForSelector('[data-testid="certificate-result-view"], .certificateResult', { timeout: 120_000 }).catch(() => {});
    await page.waitForTimeout(800);
    const certList = await fetch(`${plat}/api/remcard/api/pro/agent-certificates`, {
      headers: { Cookie: cookieHeader },
    }).then((r) => r.json());
    const newestCert = certList.certificates?.[0];
    report.steps.certificateCreatedViaForm = Boolean(newestCert?.id);
    if (!newestCert?.id) {
      report.failures.push('certificate_create_no_row');
      throw new Error('certificate_create_no_row');
    }
    await page.goto(`${plat}/certificates/${newestCert.id}`, { waitUntil: 'networkidle' });

    const testPublicBanner = page.getByText(/тестового автора|не публикуется|тестовый сертификат/i);
    report.steps.testOwnerPublicRestricted = await testPublicBanner.isVisible().catch(() => false);
    if (!report.steps.testOwnerPublicRestricted) report.failures.push('test_owner_public_banner_missing');

    const privateAlias = 'R03 private alias';
    nextPromptValue = privateAlias;
    await page.getByRole('button', { name: 'Переименовать для себя' }).click();
    await page.waitForTimeout(600);
    const aliasVisible = await page.getByText(privateAlias).isVisible().catch(() => false);
    report.steps.certificatePrivateRename = aliasVisible;
    if (!aliasVisible) report.failures.push('certificate_private_rename_failed');

    const certMeta = await fetch(`${plat}/api/remcard/api/pro/agent-certificates/${newestCert.id}`, {
      headers: { Cookie: cookieHeader },
    }).then((r) => r.json());
    const linkedName = certMeta.certificate?.agentClient?.displayName ?? '';
    report.steps.certificateLinkedClient = /Renamed/i.test(linkedName);
    if (!report.steps.certificateLinkedClient) report.failures.push('certificate_client_link_missing');

    await page.reload({ waitUntil: 'networkidle' });
    const aliasAfterReload = await page.getByText(privateAlias).isVisible().catch(() => false);
    report.steps.reloadPersistAlias = aliasAfterReload;
    if (!aliasAfterReload) report.failures.push('reload_lost_alias');

    const savedCertUrl = page.url();

    if (userId) {
      const freshCookies = await context.cookies();
      cookieHeader = freshCookies.map((c) => `${c.name}=${c.value}`).join('; ');
      const idemKey = `accept-${Date.now()}`;
      const createBody = {
        partners: [
          {
            storeUserId: userId,
            storeName: 'Self',
            isSelfScan: true,
            categories: [
              { category: 'r03-idem', categoryLabel: 'Idem', discountPercent: 5, issuerPercent: 0 },
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
      const j1 = await c1.json().catch(() => ({}));
      const j2 = await c2.json().catch(() => ({}));
      report.idempotency.bffFirst = c1.status;
      report.idempotency.bffRetry = c2.status;
      report.idempotency.firstId = j1.id ?? j1.certificate?.id ?? null;
      report.idempotency.retryId = j2.id ?? j2.certificate?.id ?? null;
      report.idempotency.sameId =
        Boolean(report.idempotency.firstId) &&
        report.idempotency.firstId === report.idempotency.retryId;
      if (!report.idempotency.sameId) report.failures.push('bff_idempotency_not_same_id');
    }

    await openSectionViaNav(page, plat, 'certificates');
    await setImplViewMode(page, 'list');
    const certListForBatch = await fetch(`${plat}/api/remcard/api/pro/agent-certificates?limit=25`, {
      headers: { Cookie: cookieHeader },
    }).then((r) => r.json());
    const batchIds = (certListForBatch.certificates ?? []).slice(0, 2).map((c) => c.id);
    report.steps.batchTargetIds = batchIds;
    if (batchIds.length < 2) {
      report.failures.push('batch_need_two_rows');
    } else {
      const desktopChecks = page.locator('tbody input[type="checkbox"]');
      const mobileChecks = page.locator('[data-testid="agent-cert-mobile-row"] input[type="checkbox"]');
      const cardChecks = page.locator('[data-testid="agent-cert-card"] input[type="checkbox"]');
      let rowChecks = desktopChecks;
      if (await mobileChecks.first().isVisible().catch(() => false)) rowChecks = mobileChecks;
      else if (await cardChecks.first().isVisible().catch(() => false)) rowChecks = cardChecks;
      await rowChecks.nth(0).check();
      await rowChecks.nth(1).check();
      await page.locator('[class*="batchBar"]').getByRole('button', { name: 'В архив', exact: true }).click();
      await page.waitForTimeout(1200);
      const afterArchive = await fetch(
        `${plat}/api/remcard/api/pro/agent-certificates?archived=true&limit=50`,
        { headers: { Cookie: cookieHeader } },
      ).then((r) => r.json());
      const archivedIds = new Set((afterArchive.certificates ?? []).map((c) => c.id));
      report.steps.batchArchive = batchIds.every((id) => archivedIds.has(id));
      if (!report.steps.batchArchive) report.failures.push('batch_archive_ids_mismatch');
      await page.locator('[data-testid="agent-r03-show-filter"]').selectOption('archived');
      await page.waitForTimeout(1200);
      await rowChecks.nth(0).check();
      await rowChecks.nth(1).check();
      await page.locator('[class*="batchBar"]').getByRole('button', { name: 'Восстановить', exact: true }).click();
      await page.waitForTimeout(1200);
      const afterRestore = await fetch(`${plat}/api/remcard/api/pro/agent-certificates?limit=50`, {
        headers: { Cookie: cookieHeader },
      }).then((r) => r.json());
      const activeIds = new Set((afterRestore.certificates ?? []).map((c) => c.id));
      report.steps.batchRestore = batchIds.every((id) => activeIds.has(id));
      if (!report.steps.batchRestore) report.failures.push('batch_restore_ids_mismatch');
    }

    if (USE_ADMIN && agentCard) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole('button', { name: 'Вернуться в управление тестами' }).click();
      await page.waitForURL(/\/admin\/test-users/, { timeout: 60_000 });
      await agentCard.getByRole('button', { name: 'Открыть ЛК' }).click();
      await page.waitForLoadState('networkidle');
      await maybeAcceptConsents(page);
      await finishAgentProfileInBrowser(page, plat, cookieHeader).catch(() => {});
      await page.setViewportSize({ width: 1440, height: 900 });
      await openSectionViaNav(page, plat, 'certificates');
      const reenterCert = await assertHealthyR03Page(page, 'Сертификаты');
      await openSectionViaNav(page, plat, 'clients');
      const reenterClients = await assertHealthyR03Page(page, 'Клиенты');
      await openSectionViaNav(page, plat, 'certificates');
      await page.getByRole('link', { name: privateAlias }).first().click({ timeout: 15_000 }).catch(() => {});
      if (!(await page.getByText(privateAlias).isVisible().catch(() => false))) {
        await page.goto(savedCertUrl, { waitUntil: 'networkidle' });
      }
      const aliasAfterReenter = await page.getByText(privateAlias).isVisible().catch(() => false);
      const navOk = reenterCert.ok && reenterClients.ok;
      report.steps.returnReenter = {
        navOk,
        aliasVisible: aliasAfterReenter,
        certificates: reenterCert,
        clients: reenterClients,
      };
      if (!navOk) report.failures.push('return_reenter_nav_failed');
      if (!aliasAfterReenter) report.failures.push('return_reenter_alias_missing');
    }

    const pairJobs = [
      { name: 'certificates-list-1440-light', path: '/certificates', section: 'certificates', viewMode: 'list', viewport: { width: 1440, height: 900 }, scrollList: false },
      { name: 'certificates-cards-1440-light', path: '/certificates', section: 'certificates', viewMode: 'cards', viewport: { width: 1440, height: 900 }, scrollList: false },
      { name: 'certificates-list-375-light', path: '/certificates', section: 'certificates', viewMode: 'list', viewport: { width: 375, height: 812 }, scrollList: true },
      { name: 'certificates-cards-375-light', path: '/certificates', section: 'certificates', viewMode: 'cards', viewport: { width: 375, height: 812 }, scrollList: false },
      { name: 'clients-list-1440-light', path: '/clients', section: 'clients', viewMode: 'list', viewport: { width: 1440, height: 900 }, scrollList: false },
      { name: 'clients-list-375-light', path: '/clients', section: 'clients', viewMode: 'list', viewport: { width: 375, height: 812 }, scrollList: false },
      { name: 'clients-cards-375-light', path: '/clients', section: 'clients', viewMode: 'cards', viewport: { width: 375, height: 812 }, scrollList: false },
    ];
    for (const job of pairJobs) {
      await captureMatchedPair(context, report, {
        name: job.name,
        plat,
        implPath: job.path,
        section: job.section,
        viewMode: job.viewMode,
        viewport: job.viewport,
        refBase,
        scrollList: job.scrollList,
      });
    }

    await captureMatchedPair(context, report, {
      name: 'certificates-list-375-dark',
      plat,
      implPath: '/certificates',
      section: 'certificates',
      viewMode: 'list',
      viewport: { width: 375, height: 812 },
      refBase,
      scrollList: true,
      dark: true,
    });

    const smokePage = await context.newPage();
    await smokePage.setViewportSize({ width: 320, height: 568 });
    await smokePage.goto(`${plat}/clients`, { waitUntil: 'networkidle' });
    await setImplViewMode(smokePage, 'list');
    const overflowCheck = await verifyImplAgentShell(smokePage, 'clients', 'list');
    const geom320 = await smokePage.evaluate(async () => {
      const doc = document.documentElement;
      const horizontalOverflow = doc.scrollWidth > doc.clientWidth + 2;
      const rows = [...document.querySelectorAll('[data-testid="agent-client-mobile-row"]')];
      const nav = document.querySelector('[data-testid="mobile-nav-more"]');
      const navRect = nav?.getBoundingClientRect();
      const navTop = navRect ? navRect.top : window.innerHeight;
      let actionsAboveNav = rows.length > 0;
      for (const row of rows) {
        row.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => requestAnimationFrame(r));
        const actions = row.querySelector('[class*="rowActions"]');
        const buttons = actions ? [...actions.querySelectorAll('button')] : [];
        if (buttons.length < 4) {
          actionsAboveNav = false;
          break;
        }
        for (const btn of buttons) {
          const rect = btn.getBoundingClientRect();
          if (rect.width < 40 || rect.height < 40 || rect.bottom > navTop - 4) {
            actionsAboveNav = false;
            break;
          }
        }
        if (!actionsAboveNav) break;
      }
      return { horizontalOverflow, rowCount: rows.length, actionsAboveNav };
    });
    report.steps.smoke320 = { shellOk: overflowCheck.ok, ...geom320 };
    if (!overflowCheck.ok) report.failures.push(`visual_320_${overflowCheck.reason}`);
    if (geom320.horizontalOverflow) report.failures.push('visual_320_horizontal_overflow');
    if (geom320.rowCount > 0 && !geom320.actionsAboveNav) {
      report.failures.push('visual_320_actions_not_tappable');
    }
    if (overflowCheck.ok && !geom320.horizontalOverflow) {
      const p320 = path.join(ART_DIR, 'visual', 'impl-clients-320-actions-smoke.png');
      await smokePage.screenshot({ path: p320, fullPage: true });
      report.singles.push({ name: 'clients-320-actions-smoke', path: p320 });
    }
    await smokePage.close();

    const liveCookies = await context.cookies();
    cookieHeader = liveCookies.map((c) => `${c.name}=${c.value}`).join('; ');
    await restartNavigator(meta, { PROF_R03_AGENT_CERTIFICATES_ENABLED: 'false' });
    await new Promise((r) => setTimeout(r, 2000));
    const gateOffBff = await fetch(`${plat}/api/remcard/api/pro/r03/status`, {
      headers: { Cookie: cookieHeader, Origin: plat },
    });
    const gateOffBody = await gateOffBff.json().catch(() => null);
    report.http.gateOffBffStatus = gateOffBff.status;
    report.http.gateOffFeatureEnabled = gateOffBody?.featureEnabled;
    if (gateOffBody?.featureEnabled !== false) report.failures.push('gate_off_feature_still_true');
    await page.goto(`${plat}/certificates`, { waitUntil: 'networkidle' });
    const blocked = /Раздел недоступен/.test((await page.textContent('body')) ?? '');
    report.steps.gateOffUiBlocked = blocked;
    if (!blocked) report.failures.push('gate_off_ui_not_blocked');
    await page.goto(`${plat}/recommendations`, { waitUntil: 'networkidle' });
    const legacyBody = (await page.textContent('body')) ?? '';
    report.steps.gateOffLegacyHome =
      !/Раздел недоступен/.test(legacyBody) &&
      (/Рекоменда/i.test(legacyBody) || (await page.getByRole('heading', { name: /Рекоменда/i }).isVisible().catch(() => false)));
    if (!report.steps.gateOffLegacyHome) report.failures.push('gate_off_legacy_recommendations_invalid');
    await restartNavigator(meta, { PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true' });
    await new Promise((r) => setTimeout(r, 2000));
    const gateOnBff = await fetch(`${plat}/api/remcard/api/pro/r03/status`, {
      headers: { Cookie: cookieHeader, Origin: plat },
    });
    const gateOnBody = await gateOnBff.json().catch(() => null);
    report.steps.gateOffRestored = gateOnBody?.featureEnabled === true;
    if (!report.steps.gateOffRestored) report.failures.push('gate_off_restore_failed');
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

  const verifiedPairCount = report.visualPairs.filter((p) => p.implVerified && p.refVerified).length;
  report.visualPairCount = verifiedPairCount;

  const darkPairOk = report.visualPairs.some(
    (p) => p.theme === 'dark' && p.implVerified && p.refVerified,
  );
  const returnNavOk = report.steps.returnReenter?.navOk !== false;
  const batchOk = report.steps.batchArchive === true && report.steps.batchRestore === true;
  const idemOk = report.idempotency.sameId !== false;
  const smoke320Ok =
    report.steps.smoke320?.horizontalOverflow !== true &&
    (report.steps.smoke320?.rowCount === 0 || report.steps.smoke320?.actionsAboveNav === true);

  report.ok =
    report.failures.length === 0 &&
    report.http.bffR03Status === 200 &&
    report.http.bffR03Body?.featureEnabled === true &&
    report.browser.certificatesViaNav === true &&
    report.browser.clientsViaNav === true &&
    report.browser.shareDefaultNameOnly === true &&
    report.steps.certificateCreatedViaForm === true &&
    report.steps.gateOffUiBlocked === true &&
    report.steps.gateOffLegacyHome === true &&
    report.steps.gateOffRestored === true &&
    batchOk &&
    idemOk &&
    returnNavOk &&
    darkPairOk &&
    smoke320Ok &&
    verifiedPairCount >= 6;

  report.verdict = report.ok ? 'READY_FOR_REVIEW' : 'NO_GO';

  writeFileSync(path.join(ART_DIR, 'local-acceptance-report.json'), JSON.stringify(report, null, 2));
  writeVisualReport(report);
  console.log(JSON.stringify({ verdict: report.verdict, failures: report.failures, visualPairCount: verifiedPairCount }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
