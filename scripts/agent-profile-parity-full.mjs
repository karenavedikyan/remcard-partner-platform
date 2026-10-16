#!/usr/bin/env node
/**
 * AGENT-PROFILE-PARITY: disposable stack + BFF flows (discard/label/detail) + Playwright captures.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { loadRuntimeEnv, ROOT, NAV_ROOT } from './lib/r03-stack-bootstrap.mjs';

const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';
const R02_TEST_DB =
  process.env.PROF_R01_TEST_DATABASE_URL?.trim() ||
  'postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test';

function r02StackEnv() {
  return {
    ...process.env,
    DATABASE_URL: R02_TEST_DB,
    DIRECT_URL: R02_TEST_DB,
  };
}
const ART = path.join(ROOT, 'artifacts/remcard-agent-profile-parity');
const SHOTS = path.join(ART, 'screenshots');

const CAPTURES = [
  { file: 'profile-overview-1440-light.png', w: 1440, h: 900, theme: 'light', section: 'overview' },
  { file: 'profile-overview-1440-dark.png', w: 1440, h: 900, theme: 'dark', section: 'overview' },
  { file: 'profile-overview-375-light.png', w: 375, h: 812, theme: 'light', section: 'overview' },
  { file: 'profile-overview-375-dark.png', w: 375, h: 812, theme: 'dark', section: 'overview' },
  { file: 'profile-basics-wizard-375-light.png', w: 375, h: 812, theme: 'light', section: 'basics' },
  { file: 'profile-bank-expanded-375-light.png', w: 375, h: 812, theme: 'light', section: 'overview', bankExpand: true },
  { file: 'profile-overview-320-light.png', w: 320, h: 700, theme: 'light', section: 'overview' },
];

async function stackHealthy(meta) {
  try {
    const res = await fetch(`${meta.platformOrigin}/api/remcard/api/pro/r03/status`, {
      headers: { Cookie: 'remcard-token=health-probe' },
    });
    const body = await res.text();
    if (res.status === 403 && body.includes('Path not allowed')) return false;
    return res.status === 401 || res.status === 200 || res.status === 403;
  } catch {
    return false;
  }
}

async function ensureR02Stack() {
  const metaPath = path.join(RUN_DIR, 'meta.json');
  let meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : null;
  if (!meta || !(await stackHealthy(meta))) {
    const start = spawnSync('node', ['scripts/r02-local-stack.mjs'], {
      cwd: ROOT,
      env: r02StackEnv(),
      encoding: 'utf8',
      timeout: 300_000,
    });
    if (start.status !== 0) {
      throw new Error(`r02 stack: ${(start.stderr || start.stdout || '').slice(0, 400)}`);
    }
    meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  }
  const accept = spawnSync('node', ['scripts/r02-local-acceptance.mjs'], {
    cwd: ROOT,
    env: r02StackEnv(),
    encoding: 'utf8',
    timeout: 300_000,
  });
  if (accept.status !== 0) {
    throw new Error(`r02 acceptance: ${(accept.stderr || accept.stdout || '').slice(0, 400)}`);
  }
  return meta;
}

function runNavFixture(env, action) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', action], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`fixture ${action}: ${(res.stderr || res.stdout || '').slice(0, 400)}`);
  }
  return (res.stdout || '').trim();
}

function plat(session) {
  return session.platformOrigin.replace(/\/$/, '');
}

function cookieHeaders(session) {
  return { Cookie: `remcard-token=${session.token}` };
}

function bffHeaders(session) {
  const p = plat(session);
  return { ...cookieHeaders(session), 'content-type': 'application/json', Origin: p };
}

async function bffJson(session, url, init = {}) {
  const res = await fetch(`${plat(session)}${url}`, { ...init, headers: { ...bffHeaders(session), ...init.headers } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function httpAcceptance(session) {
  const out = { discard: null, profileSaved: null, bank: null };
  runNavFixture(loadRuntimeEnv(session.meta.envPath), 'reset-draft');

  let draft = await bffJson(session, '/api/remcard/api/pro/agent-profile/draft');
  out.prefillStatus = draft.status;

  const v0 = draft.body?.version ?? 0;
  const e0 = draft.body?.draftEpoch ?? 0;
  const save = await bffJson(session, '/api/remcard/api/pro/agent-profile/draft', {
    method: 'PATCH',
    body: JSON.stringify({
      expectedVersion: v0,
      expectedEpoch: e0,
      mode: 'advance',
      fromStep: 1,
      step: 2,
      payload: {
        displayName: draft.body?.payload?.displayName || 'Parity Agent',
        city: draft.body?.payload?.city || 'Краснодар',
        audience: 'Друзья',
      },
    }),
  });
  out.saveDraft = save.status;

  const reload = await bffJson(session, '/api/remcard/api/pro/agent-profile/draft');
  out.reload = reload.status;

  const finish = await bffJson(session, '/api/remcard/api/pro/agent-profile/finish', {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: reload.body?.version ?? save.body?.version,
      expectedEpoch: reload.body?.draftEpoch ?? save.body?.draftEpoch ?? e0,
    }),
  });
  out.finish = finish.status;

  const afterFinish = await bffJson(session, '/api/remcard/api/pro/agent-profile/draft');
  const epochAfterFinish = afterFinish.body?.draftEpoch ?? 0;

  const draftAgain = await bffJson(session, '/api/remcard/api/pro/agent-profile/draft', {
    method: 'PATCH',
    body: JSON.stringify({
      expectedVersion: 0,
      expectedEpoch: epochAfterFinish,
      mode: 'save',
      step: 1,
      payload: { displayName: 'Parity Draft', city: 'Краснодар' },
    }),
  });
  out.openDraft = draftAgain.status;

  const withDraft = await bffJson(session, '/api/remcard/api/pro/agent-profile/draft');
  out.profileSaved = {
    profileSaved: withDraft.body?.profileSaved,
    profileComplete: withDraft.body?.profileComplete,
    hasDraft: withDraft.body?.hasDraft,
  };

  const discard = await bffJson(session, '/api/remcard/api/pro/agent-profile/draft', {
    method: 'DELETE',
    body: JSON.stringify({
      expectedEpoch: withDraft.body?.draftEpoch,
      expectedVersion: withDraft.body?.version,
    }),
  });
  out.discard = { status: discard.status, body: discard.body };

  const afterDiscard = await bffJson(session, '/api/remcard/api/pro/agent-profile/draft');
  out.afterDiscard = {
    profileComplete: afterDiscard.body?.profileComplete,
    hasDraft: afterDiscard.body?.hasDraft,
  };

  const createBank = await bffJson(session, '/api/remcard/api/pro/agent-payout-requisites', {
    method: 'POST',
    body: JSON.stringify({
      kind: 'person',
      label: 'Личный счёт',
      legalName: 'Parity Agent',
      inn: '7707083893',
      accountNumber: '40817810000000000001',
      corrAccount: '30101810000000000000',
      isPrimary: true,
    }),
  });
  const itemId = createBank.body?.item?.id;
  const list = await bffJson(session, '/api/remcard/api/pro/agent-payout-requisites');
  const detail = itemId
    ? await bffJson(session, `/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(itemId)}`)
    : null;
  out.bank = {
    create: createBank.status,
    listMasked: list.body?.items?.[0]?.accountNumber == null,
    detailLabel: detail?.body?.item?.label,
    detailAccount: detail?.body?.item?.accountNumber,
  };

  out.ok =
    out.finish === 200 &&
    out.profileSaved?.profileSaved === true &&
    out.profileSaved?.hasDraft === true &&
    out.discard?.status === 200 &&
    out.afterDiscard?.profileComplete === true &&
    out.bank?.create === 200 &&
    out.bank?.listMasked === true &&
    out.bank?.detailLabel === 'Личный счёт' &&
    Boolean(out.bank?.detailAccount);

  return out;
}

async function setTheme(page, theme) {
  const toggle = page.getByTestId('theme-toggle');
  if (!(await toggle.count())) return;
  const wantDark = theme === 'dark';
  for (let i = 0; i < 4; i++) {
    const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (dark === wantDark) return;
    await toggle.click();
    await page.waitForTimeout(200);
  }
}

async function captureScreens(session) {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const saved = [];
  try {
    for (const cap of CAPTURES) {
      const ctx = await browser.newContext({ viewport: { width: cap.w, height: cap.h } });
      await ctx.addCookies([
        {
          name: 'remcard-token',
          value: session.token,
          url: session.platformOrigin,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ]);
      const page = await ctx.newPage();
      await page.goto(`${plat(session)}/profile?section=${cap.section}`, {
        waitUntil: 'networkidle',
        timeout: 120_000,
      });
      await page.waitForSelector('[data-testid="agent-profile-scope"]', { timeout: 90_000 });
      await setTheme(page, cap.theme);
      if (cap.bankExpand) {
        const viewBtn = page.getByRole('button', { name: 'Посмотреть' }).first();
        if (await viewBtn.count()) {
          await viewBtn.click();
          await page.waitForTimeout(800);
        }
      }
      const outPath = path.join(SHOTS, cap.file);
      await page.screenshot({ path: outPath, fullPage: true });
      saved.push(cap.file);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  return saved;
}

async function browserSmoke(session) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await ctx.addCookies([
    {
      name: 'remcard-token',
      value: session.token,
      url: session.platformOrigin,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  const page = await ctx.newPage();
  await page.goto(`${plat(session)}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('[data-testid="agent-profile-scope"]', { timeout: 90_000 });
  const editBtn = page.getByRole('button', { name: 'Редактировать профиль' });
  if (await editBtn.count()) {
    await editBtn.click();
    await page.getByTestId('agent-profile-cancel-edit').click();
    await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 30_000 });
  }
  const cancelOk = (await page.locator('[data-testid="agent-profile-completed-summary"]').count()) > 0;
  await browser.close();
  return { cancelOk };
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const meta = await ensureR02Stack();
  const env = loadRuntimeEnv(meta.envPath);
  const session = JSON.parse(readFileSync(path.join(RUN_DIR, 'session.json'), 'utf8'));
  session.meta = meta;

  const http = await httpAcceptance(session);
  const ui = await browserSmoke(session);
  let screenshots = [];
  try {
    screenshots = await captureScreens(session);
  } catch (error) {
    http.captureError = error instanceof Error ? error.message : String(error);
  }

  const report = {
    ok: http.ok && ui.cancelOk && screenshots.length >= 5,
    http,
    ui,
    screenshots,
    platformOrigin: session.platformOrigin,
    capturedAt: new Date().toISOString(),
  };
  writeFileSync(path.join(ART, 'profile-parity-e2e.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, screenshots: screenshots.length }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
