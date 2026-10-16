#!/usr/bin/env node
/**
 * AGENT-PROFILE-PARITY: fresh loopback stack, BFF checks, browser flows, ref+impl PNG pairs.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import {
  bootstrapAgentProfileParityStack,
  loadParityRuntimeEnv,
  PARITY_RUN_DIR,
} from './lib/agent-profile-parity-stack.mjs';
import { setCabinetTheme, setReferenceTheme } from './lib/agent-profile-parity-theme.mjs';
import { PARITY_SYNTH } from './lib/agent-profile-parity-synth.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const ART = path.join(ROOT, 'artifacts/remcard-agent-profile-parity');
const SHOTS = path.join(ART, 'screenshots');
const REFERENCE_ROOT =
  process.env.R02_REFERENCE_ROOT?.trim() ||
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';
const REF_PORT = Number(process.env.AGENT_PROFILE_REF_PORT || 8098);

const REF_HIDE =
  '.demo-top,.review-details,.registration,.choice-footer,.demo-toolbar,.mobile-demo-settings,.review-toolbar{display:none!important}';

const CAPTURES = [
  { stem: 'overview-1440-light', w: 1440, h: 900, theme: 'light', state: 'overview-complete' },
  { stem: 'overview-1440-dark', w: 1440, h: 900, theme: 'dark', state: 'overview-complete' },
  { stem: 'overview-375-light', w: 375, h: 812, theme: 'light', state: 'overview-complete' },
  { stem: 'overview-375-dark', w: 375, h: 812, theme: 'dark', state: 'overview-complete' },
  { stem: 'overview-320-light', w: 320, h: 700, theme: 'light', state: 'overview-complete' },
  { stem: 'wizard-step1-375-light', w: 375, h: 812, theme: 'light', state: 'wizard-step1' },
  { stem: 'bank-collapsed-375-light', w: 375, h: 812, theme: 'light', state: 'bank-collapsed' },
  { stem: 'bank-expanded-375-light', w: 375, h: 812, theme: 'light', state: 'bank-expanded' },
  { stem: 'bank-form-375-light', w: 375, h: 812, theme: 'light', state: 'bank-form' },
];

function plat(session) {
  return session.platformOrigin.replace(/\/$/, '');
}

function bffHeaders(session) {
  const p = plat(session);
  return {
    Cookie: `remcard-token=${session.token}`,
    'content-type': 'application/json',
    Origin: p,
  };
}

async function bffJson(session, urlPath, init = {}) {
  const res = await fetch(`${plat(session)}/api/remcard${urlPath}`, {
    ...init,
    headers: { ...bffHeaders(session), ...init.headers },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
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

async function seedSyntheticProfile(session, env) {
  runNavFixture(env, 'reset-draft');
  let draft = await bffJson(session, '/api/pro/agent-profile/draft');
  const v0 = draft.body?.version ?? 0;
  const e0 = draft.body?.draftEpoch ?? 0;
  const payload = {
    displayName: PARITY_SYNTH.displayName,
    city: PARITY_SYNTH.city,
    audience: PARITY_SYNTH.audience,
    channel: PARITY_SYNTH.channel,
    contactPhone: PARITY_SYNTH.contactPhone,
    contactEmail: PARITY_SYNTH.contactEmail,
  };
  for (const [fromStep, step] of [
    [1, 2],
    [2, 3],
    [3, 4],
  ]) {
    const res = await bffJson(session, '/api/pro/agent-profile/draft', {
      method: 'PATCH',
      body: JSON.stringify({
        expectedVersion: draft.body?.version ?? v0,
        expectedEpoch: draft.body?.draftEpoch ?? e0,
        mode: 'advance',
        fromStep,
        step,
        payload,
      }),
    });
    if (res.status !== 200) throw new Error(`draft_advance_${fromStep}_${res.status}`);
    draft = res;
  }
  const finish = await bffJson(session, '/api/pro/agent-profile/finish', {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: draft.body.version,
      expectedEpoch: draft.body.draftEpoch,
    }),
  });
  if (finish.status !== 200) throw new Error(`finish_${finish.status}`);

  const bank = await bffJson(session, '/api/pro/agent-payout-requisites', {
    method: 'POST',
    body: JSON.stringify({ ...PARITY_SYNTH.bank, isPrimary: true }),
  });
  if (bank.status !== 200) throw new Error(`bank_seed_${bank.status}`);
}

async function dedupeBankRecords(session) {
  const list = await bffJson(session, '/api/pro/agent-payout-requisites');
  const items = list.body?.items ?? [];
  for (const extra of items.slice(1)) {
    await bffJson(session, `/api/pro/agent-payout-requisites/${encodeURIComponent(extra.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'archive' }),
    });
  }
  const after = await bffJson(session, '/api/pro/agent-payout-requisites');
  return after.body?.items?.length ?? 0;
}

async function assertSingleBankRecord(session) {
  const list = await bffJson(session, '/api/pro/agent-payout-requisites');
  const items = list.body?.items ?? [];
  if (items.length !== 1) {
    throw new Error(`bank_record_count_${items.length}_expected_1`);
  }
  return items[0];
}

async function httpAcceptance(session, env) {
  const out = {};
  let draft = await bffJson(session, '/api/pro/agent-profile/draft');
  const save = await bffJson(session, '/api/pro/agent-profile/draft', {
    method: 'PATCH',
    body: JSON.stringify({
      expectedVersion: draft.body?.version ?? 0,
      expectedEpoch: draft.body?.draftEpoch ?? 0,
      mode: 'save',
      step: 1,
      payload: { displayName: 'Draft Agent', city: PARITY_SYNTH.city },
    }),
  });
  out.saveDraft = save.status;
  draft = await bffJson(session, '/api/pro/agent-profile/draft');
  out.profileSaved = draft.body?.profileSaved;
  out.hasDraft = draft.body?.hasDraft;

  const discard = await bffJson(session, '/api/pro/agent-profile/draft', {
    method: 'DELETE',
    body: JSON.stringify({
      expectedEpoch: draft.body?.draftEpoch,
      expectedVersion: draft.body?.version,
    }),
  });
  out.discard = discard.status;
  const after = await bffJson(session, '/api/pro/agent-profile/draft');
  out.afterDiscardComplete = after.body?.profileComplete;
  out.afterDiscardHasDraft = after.body?.hasDraft;

  const list = await bffJson(session, '/api/pro/agent-payout-requisites');
  const id = list.body?.items?.[0]?.id;
  const detail = id
    ? await bffJson(session, `/api/pro/agent-payout-requisites/${encodeURIComponent(id)}`)
    : null;
  out.bankListCount = list.body?.items?.length ?? 0;
  out.listMasked = list.body?.items?.[0]?.accountNumber == null;
  out.detailLabel = detail?.body?.item?.label;
  out.detailAccount = detail?.body?.item?.accountNumber;

  out.ok =
    out.saveDraft === 200 &&
    out.discard === 200 &&
    out.bankListCount >= 1 &&
    out.listMasked === true &&
    out.detailLabel === PARITY_SYNTH.bank.label &&
    Boolean(out.detailAccount);
  return out;
}

async function walkReferenceProfileComplete(page) {
  await page.locator('[data-testid="pw-input-name"]').fill(PARITY_SYNTH.displayName);
  await page.locator('[data-testid="pw-input-city"]').fill(PARITY_SYNTH.city);
  await page.locator('[data-testid="pw-next"]').click();
  await page.locator('[data-testid="pw-input-audience"]').fill(PARITY_SYNTH.audience);
  await page.locator('[data-testid="pw-input-channel"]').fill(PARITY_SYNTH.channel);
  await page.locator('[data-testid="pw-next"]').click();
  await page.locator('[data-testid="pw-input-contactPhone"]').fill('+79001234567');
  await page.locator('[data-testid="pw-input-contactEmail"]').fill(PARITY_SYNTH.contactEmail);
  await page.locator('[data-testid="pw-next"]').click();
  await page.locator('[data-testid="pw-next"]').click();
  await page.waitForSelector('[data-testid="pw-summary"]', { timeout: 30_000 });
}

async function fillReferenceBankForm(page) {
  const b = PARITY_SYNTH.bank;
  await page.locator('[data-testid="bank-label"]').fill(b.label);
  await page.locator('[data-testid="bank-recipient"]').fill(b.legalName);
  await page.locator('[data-testid="bank-bank"]').fill(b.bankName);
  await page.locator('[data-testid="bank-bik"]').fill(b.bik);
  await page.locator('[data-testid="bank-account"]').fill(b.accountNumber);
  await page.locator('[data-testid="bank-correspondent"]').fill(b.corrAccount);
  await page.locator('[data-testid="bank-inn"]').fill('770708389301');
}

async function seedReferenceBankRecord(page) {
  const add = page.locator('[data-testid="cab-bank-add"]').first();
  await add.scrollIntoViewIfNeeded();
  await add.click({ timeout: 30_000 });
  await page.waitForSelector('[data-bank-form]', { timeout: 15_000 });
  await fillReferenceBankForm(page);
  await page.locator('[data-testid="bank-save"]').click();
  await page.waitForSelector('.cab-bank-card, [data-testid^="cab-bank-expand"]', {
    timeout: 30_000,
  });
}

async function measureCaptureLayout(page) {
  return page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top) };
    };
    return {
      summary: pick('[data-testid="agent-profile-completed-summary"], [data-testid="pw-summary"]'),
      facts: pick('.pw-facts, [class*="summaryFacts"]'),
      bankPanel: pick('[data-testid="bank-panel"]'),
      bankCards: document.querySelectorAll('.cab-bank-card, [class*="bankCard"]').length,
      bankForm: pick('[data-bank-form], [data-testid="agent-requisites-form"]'),
    };
  });
}

async function ensureReferenceServer() {
  const base = `http://127.0.0.1:${REF_PORT}`;
  try {
    const res = await fetch(`${base}/roles.html`);
    if (res.ok) return base;
  } catch {
    /* start */
  }
  const child = spawn('python3', ['-m', 'http.server', String(REF_PORT)], {
    cwd: REFERENCE_ROOT,
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${base}/roles.html`);
      if (res.ok) return base;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('reference_server_unreachable');
}

async function openReferenceAgent(refBase, page) {
  await page.goto(`${refBase}/roles.html`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.topbar', { timeout: 60_000 });
  await page.evaluate(() => {
    document.querySelector('[data-testid="view-cabinet"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const sel = document.querySelector('[data-testid="scenario-role"]');
    if (sel) {
      sel.value = 'agent';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.querySelector('[data-testid="nav-profile"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForSelector('[data-testid="bank-panel"], .pw-layout, .pw', { timeout: 60_000 });
  await page.addStyleTag({ content: REF_HIDE });
}

async function prepareReferenceState(page, refBase, theme, state) {
  await openReferenceAgent(refBase, page);
  await setReferenceTheme(page, theme);
  if (state === 'wizard-step1') {
    await walkReferenceProfileComplete(page);
    await page.getByRole('button', { name: 'Редактировать профиль' }).click();
    await page.waitForSelector('[data-testid="pw-input-name"]', { timeout: 30_000 });
    return;
  }
  if (state.startsWith('overview') || state.startsWith('bank')) {
    await walkReferenceProfileComplete(page);
  }
  if (
    state.startsWith('overview') ||
    state === 'bank-collapsed' ||
    state === 'bank-expanded' ||
    state === 'bank-form'
  ) {
    await seedReferenceBankRecord(page);
  }
  if (state === 'bank-form') {
    await page.locator('[data-testid="cab-bank-add"]').last().click({ timeout: 30_000 });
    await page.waitForSelector('[data-bank-form]', { timeout: 15_000 });
  } else if (state === 'bank-expanded') {
    const expand = page.locator('[data-testid^="cab-bank-expand"]').first();
    await expand.scrollIntoViewIfNeeded();
    await expand.click({ timeout: 15_000 });
    await page.waitForSelector('.pw-facts dt', { timeout: 15_000 });
  }
}

async function prepareImplState(page, session, theme, state) {
  const base = plat(session);
  if (state === 'wizard-step1') {
    await page.goto(`${base}/profile?section=overview`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 90_000 });
    await setCabinetTheme(page, theme);
    await page.getByRole('button', { name: 'Редактировать профиль' }).click();
    await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 30_000 });
    return;
  }
  await page.goto(`${base}/profile?section=overview`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 90_000 });
  await setCabinetTheme(page, theme);
  if (['overview-complete', 'bank-collapsed', 'bank-expanded'].includes(state)) {
    const bankCount = await page.locator('[data-testid="bank-panel"] li').count();
    if (bankCount !== 1) {
      throw new Error(`impl_bank_card_count_${bankCount}`);
    }
  }
  if (state === 'bank-form') {
    const add = page.getByRole('button', { name: /Добавить.*реквизит/i });
    await add.scrollIntoViewIfNeeded();
    await add.click();
    await page.waitForSelector('[data-testid="agent-requisites-form"]', { timeout: 30_000 });
  } else if (state === 'bank-expanded') {
    const view = page.getByRole('button', { name: 'Посмотреть' }).first();
    await view.click();
    await page.waitForSelector('dt:has-text("Счёт")', { timeout: 30_000 });
  }
}

async function capturePairs(session, refBase) {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const saved = [];
  try {
    for (const cap of CAPTURES) {
      for (const side of ['impl', 'ref']) {
        const ctx = await browser.newContext({ viewport: { width: cap.w, height: cap.h } });
        const page = await ctx.newPage();
        if (side === 'impl') {
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
          await prepareImplState(page, session, cap.theme, cap.state);
        } else {
          await prepareReferenceState(page, refBase, cap.theme, cap.state);
        }
        await page.evaluate(() => {
          document.activeElement?.blur?.();
        });
        await page.waitForTimeout(200);
        const layout = await measureCaptureLayout(page);
        const file = `${side}-${cap.stem}.png`;
        await page.screenshot({ path: path.join(SHOTS, file), fullPage: true });
        const entry = {
          file,
          sha256: createHash('sha256').update(readFileSync(path.join(SHOTS, file))).digest('hex'),
          layout,
        };
        if (cap.state === 'bank-form' && cap.w === 375) {
          await page.evaluate(() => window.scrollTo(0, 0));
          const topFile = `${side}-${cap.stem}-viewport-top.png`;
          await page.screenshot({ path: path.join(SHOTS, topFile), fullPage: false });
          entry.viewportTop = {
            file: topFile,
            sha256: createHash('sha256').update(readFileSync(path.join(SHOTS, topFile))).digest('hex'),
          };
          const footer = page.locator('[data-testid="bank-save"], [data-testid="bank-save"]').last();
          await footer.scrollIntoViewIfNeeded();
          const footFile = `${side}-${cap.stem}-form-footer.png`;
          await page.screenshot({ path: path.join(SHOTS, footFile), fullPage: false });
          entry.formFooter = {
            file: footFile,
            sha256: createHash('sha256').update(readFileSync(path.join(SHOTS, footFile))).digest('hex'),
          };
        }
        saved.push(entry);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  return saved;
}

async function runBrowserAcceptance(session) {
  const base = plat(session);
  const pre = await bffJson(session, '/api/pro/agent-profile/draft');
  if (!pre.body?.profileSaved) {
    throw new Error(`precondition_profile_not_saved status=${pre.status}`);
  }
  const browser = await chromium.launch({ headless: true });
  const steps = {};
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

  // Overview → edit → cancel → summary
  await page.goto(`${base}/profile?section=overview`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 90_000 });
  await page.getByRole('button', { name: 'Редактировать профиль' }).click();
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 30_000 });
  await page.getByTestId('agent-profile-cancel-edit').click();
  await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 60_000 });
  steps.overviewEditCancel = true;

  // Basics (edit mode) → cancel → overview summary
  await page.goto(`${base}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 90_000 });
  await page.getByTestId('agent-profile-cancel-edit').click();
  await page.waitForLoadState('networkidle');
  await page.goto(`${base}/profile`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 90_000 });
  const basicsSection = await page.evaluate(() => new URLSearchParams(location.search).get('section'));
  steps.basicsDirectCancel = basicsSection === 'overview' || basicsSection === null;

  // Local dirty on overview: reject confirm
  await page.goto(`${base}/profile?section=overview`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Редактировать профиль' }).click();
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 30_000 });
  page.once('dialog', (d) => d.dismiss());
  await page.getByTestId('agent-profile-input-displayName').fill('Локальная правка');
  await page.getByTestId('agent-profile-cancel-edit').click();
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 10_000 });
  steps.dirtyCancelRejected = true;

  // Local dirty: accept confirm → summary
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('agent-profile-cancel-edit').click();
  await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 90_000 });
  steps.dirtyCancelAccepted = true;

  // Saved draft → reload → cancel discard
  let draft = await bffJson(session, '/api/pro/agent-profile/draft');
  const draftSave = await bffJson(session, '/api/pro/agent-profile/draft', {
    method: 'PATCH',
    body: JSON.stringify({
      expectedVersion: draft.body?.version ?? 0,
      expectedEpoch: draft.body?.draftEpoch ?? 0,
      mode: 'save',
      step: 1,
      payload: { displayName: 'Draft After Saved', city: PARITY_SYNTH.city },
    }),
  });
  if (draftSave.status !== 200) {
    throw new Error(`draft_save_for_reload_${draftSave.status}`);
  }
  await page.goto(`${base}/profile?section=basics`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 60_000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="agent-profile-input-displayName"]', { timeout: 60_000 });
  const reloaded = await page.getByTestId('agent-profile-input-displayName').inputValue();
  steps.draftReloadValue = reloaded;
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('agent-profile-cancel-edit').click();
  await page.waitForURL(
    (url) => url.pathname === '/profile' && (url.searchParams.get('section') === 'overview' || !url.searchParams.get('section')),
    { timeout: 60_000 },
  );
  await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 90_000 });
  draft = await bffJson(session, '/api/pro/agent-profile/draft');
  steps.afterCancelHasDraft = draft.body?.hasDraft;
  steps.afterCancelSavedName = draft.body?.savedProfile?.displayName ?? draft.body?.payload?.displayName;

  await browser.close();

  steps.ok =
    steps.overviewEditCancel &&
    steps.basicsDirectCancel &&
    steps.dirtyCancelRejected &&
    steps.dirtyCancelAccepted &&
    steps.afterCancelHasDraft === false &&
    steps.afterCancelSavedName === PARITY_SYNTH.displayName &&
    reloaded === 'Draft After Saved';
  return steps;
}

async function runLabelMigrationEvidence() {
  if (process.env.PROF_R02_RUN_PG !== '1') {
    return { skipped: true, reason: 'PROF_R02_RUN_PG not set' };
  }
  const res = spawnSync(
    'node',
    ['--test', 'scripts/lib/__tests__/prof-r02-requisites-label-controlled-apply.integration.test.mjs'],
    { cwd: NAV_ROOT, env: { ...process.env, PROF_R02_RUN_PG: '1' }, encoding: 'utf8' },
  );
  return { exitCode: res.status ?? 1, stdout: (res.stdout || '').slice(-2000) };
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const stack = await bootstrapAgentProfileParityStack();
  const session = JSON.parse(readFileSync(path.join(PARITY_RUN_DIR, 'session.json'), 'utf8'));
  session.meta = stack.meta;

  const { env } = loadParityRuntimeEnv();
  await seedSyntheticProfile(session, env);

  const http = await httpAcceptance(session, env);
  const ui = await runBrowserAcceptance(session);
  const bankCount = await dedupeBankRecords(session);
  await assertSingleBankRecord(session);
  const refBase = await ensureReferenceServer();
  const screenshots = await capturePairs(session, refBase);
  const migration = await runLabelMigrationEvidence();
  if (process.env.PROF_R02_RUN_PG === '1' && migration.exitCode != null) {
    migration.ran = true;
  }

  const captureOk = screenshots.length >= CAPTURES.length * 2;
  const expandedSha = screenshots.find((s) => s.file === 'ref-bank-expanded-375-light.png')?.sha256;
  const formSha = screenshots.find((s) => s.file === 'ref-bank-form-375-light.png')?.sha256;
  const report = {
    ok: http.ok && ui.ok && captureOk,
    functionalOk: http.ok && ui.ok,
    captureOk,
    visualParityOk: false,
    bankStateParity: {
      dedupedCount: bankCount,
      refExpandedVsFormDistinct: Boolean(expandedSha && formSha && expandedSha !== formSha),
    },
    stack: {
      platformGitSha: stack.meta.platformGitSha,
      navigatorGitSha: stack.meta.navigatorGitSha,
      platformOrigin: stack.platformOrigin,
      navOrigin: stack.navOrigin,
      userId: stack.userId,
    },
    http,
    ui,
    screenshots,
    migration,
    capturedAt: new Date().toISOString(),
  };
  writeFileSync(path.join(ART, 'profile-parity-e2e.json'), JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, png: screenshots.length }, null, 2));
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  writeFileSync(
    path.join(ART, 'profile-parity-e2e.json'),
    JSON.stringify({ ok: false, error: msg, capturedAt: new Date().toISOString() }, null, 2),
  );
  console.error(msg);
  process.exit(1);
});
