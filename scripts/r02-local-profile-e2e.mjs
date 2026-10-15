#!/usr/bin/env node
/**
 * R02 local profile acceptance: BFF HTTP wizard + requisites, then Playwright on /profile.
 * Requires /tmp/r02-local-stack/session.json from r02-local-acceptance.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';

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

function runNavFixture(env, action) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', action], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`fixture ${action} failed: ${(res.stderr || res.stdout || '').slice(0, 400)}`);
  }
  return (res.stdout || '').trim();
}

function plat(session) {
  return session.platformOrigin.replace(/\/$/, '');
}

function cookieHeaders(session) {
  return { Cookie: `remcard-token=${session.token}` };
}

function bffPatchHeaders(session) {
  const p = plat(session);
  return { ...cookieHeaders(session), 'content-type': 'application/json', Origin: p };
}

function pickDraft(body) {
  if (!body || typeof body !== 'object') return null;
  return {
    version: body.version ?? null,
    draftEpoch: body.draftEpoch ?? null,
    step: body.step ?? null,
    hasDraft: body.hasDraft ?? null,
    profileComplete: body.profileComplete ?? null,
    payload: {
      displayName: body.payload?.displayName ?? body.savedProfile?.displayName ?? null,
      city: body.payload?.city ?? body.savedProfile?.city ?? null,
    },
  };
}

async function readFetchStep(res) {
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: pickDraft(body) ?? body };
}

async function wizardHttpFlow(session) {
  const p = plat(session);
  const steps = {};
  const prefillRes = await fetch(`${p}/api/remcard/api/pro/agent-profile/draft`, {
    headers: cookieHeaders(session),
  });
  const preBody = await prefillRes.json().catch(() => null);
  steps.prefill = { status: prefillRes.status, ok: prefillRes.ok, body: pickDraft(preBody) };
  steps.prefillOk =
    steps.prefill.status === 200 &&
    Boolean(preBody?.payload?.displayName || preBody?.savedProfile?.displayName);

  const v0 = preBody?.version ?? 0;
  const e0 = preBody?.draftEpoch ?? 0;
  const saveDraftRes = await fetch(`${p}/api/remcard/api/pro/agent-profile/draft`, {
    method: 'PATCH',
    headers: bffPatchHeaders(session),
    body: JSON.stringify({
      expectedVersion: v0,
      expectedEpoch: e0,
      mode: 'save',
      step: 1,
      payload: {
        displayName: preBody?.payload?.displayName || 'Local Agent Owner',
        city: preBody?.payload?.city || 'Krasnodar',
      },
    }),
  });
  const saved = await saveDraftRes.json().catch(() => null);
  steps.saveDraft = { status: saveDraftRes.status, ok: saveDraftRes.ok, body: pickDraft(saved) };

  const reloadRes = await fetch(`${p}/api/remcard/api/pro/agent-profile/draft`, {
    headers: cookieHeaders(session),
  });
  const reloaded = await reloadRes.json().catch(() => null);
  steps.reload = { status: reloadRes.status, ok: reloadRes.ok, body: pickDraft(reloaded) };
  steps.reloadOk = steps.reload.status === 200 && (reloaded?.version ?? 0) > v0;

  const skipRes = await fetch(`${p}/api/remcard/api/pro/agent-profile/draft`, {
    method: 'PATCH',
    headers: bffPatchHeaders(session),
    body: JSON.stringify({
      expectedVersion: saved?.version ?? reloaded?.version ?? 0,
      expectedEpoch: saved?.draftEpoch ?? reloaded?.draftEpoch ?? e0,
      mode: 'save',
      step: 4,
      payload: saved?.payload ?? reloaded?.payload ?? {},
    }),
  });
  const afterSkip = await skipRes.json().catch(() => null);
  steps.skipContacts = { status: skipRes.status, ok: skipRes.ok, body: pickDraft(afterSkip) };

  const finishRes = await fetch(`${p}/api/remcard/api/pro/agent-profile/finish`, {
    method: 'POST',
    headers: bffPatchHeaders(session),
    body: JSON.stringify({
      expectedVersion: afterSkip?.version ?? 0,
      expectedEpoch: afterSkip?.draftEpoch ?? e0,
    }),
  });
  steps.finish = { status: finishRes.status, ok: finishRes.ok };

  const afterFinishRes = await fetch(`${p}/api/remcard/api/pro/agent-profile/draft`, {
    headers: cookieHeaders(session),
  });
  const finishBody = await afterFinishRes.json().catch(() => null);
  steps.afterFinish = { status: afterFinishRes.status, ok: afterFinishRes.ok, body: pickDraft(finishBody) };
  steps.finishOk =
    steps.finish.status === 200 &&
    steps.afterFinish.status === 200 &&
    finishBody?.profileComplete === true &&
    finishBody?.hasDraft === false;

  return steps;
}

async function requisitesHttpFlow(session) {
  const p = plat(session);
  const out = {};
  out.create = await fetch(`${p}/api/remcard/api/pro/agent-payout-requisites`, {
    method: 'POST',
    headers: bffPatchHeaders(session),
    body: JSON.stringify({
      kind: 'person',
      legalName: 'R02 Local Agent',
      inn: '7707083893',
      accountNumber: '40817810000000000001',
      corrAccount: '30101810000000000000',
      isPrimary: true,
    }),
  });
  const created = await out.create.json();
  const id = created.item?.id;
  out.revise = await fetch(`${p}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: bffPatchHeaders(session),
    body: JSON.stringify({
      action: 'revise',
      kind: 'person',
      legalName: 'R02 Local Agent Rev',
      inn: '7707083893',
      accountNumber: '40817810000000000002',
      corrAccount: '30101810000000000000',
    }),
  });
  const revised = await out.revise.json();
  const newId = revised.item?.id || revised.replacedId;
  out.setPrimary = await fetch(
    `${p}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(newId || id)}`,
    {
      method: 'PATCH',
      headers: bffPatchHeaders(session),
      body: JSON.stringify({ action: 'setPrimary' }),
    },
  );
  out.apply = await fetch(
    `${p}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(newId || id)}`,
    {
      method: 'PATCH',
      headers: bffPatchHeaders(session),
      body: JSON.stringify({ action: 'applyForNextPayout' }),
    },
  );
  out.archive = await fetch(
    `${p}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(newId || id)}`,
    {
      method: 'PATCH',
      headers: bffPatchHeaders(session),
      body: JSON.stringify({ action: 'archive' }),
    },
  );
  out.statuses = {
    create: out.create.status,
    revise: out.revise.status,
    setPrimary: out.setPrimary.status,
    apply: out.apply.status,
    archive: out.archive.status,
  };
  out.ok = Object.values(out.statuses).every((s) => s === 200);
  return out;
}

async function playwrightProfileSmoke(session) {
  const baseUrl = session.platformOrigin;
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await ctx.addCookies([
    {
      name: 'remcard-token',
      value: session.token,
      url: baseUrl,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.getByRole('heading', { name: 'Профиль агента' }).waitFor({ timeout: 60_000 });
  await page.waitForSelector(
    '[data-testid="agent-profile-wizard"], [data-testid="agent-profile-completed-summary"]',
    { timeout: 60_000 },
  );
  const shell = page.locator(
    '[data-testid="agent-profile-wizard"], [data-testid="agent-profile-completed-summary"]',
  );
  const wizardText = (await shell.count()) ? await shell.first().innerText() : '';
  const roleOk =
    wizardText.includes('Агент') ||
    wizardText.includes('Профиль без лишнего') ||
    wizardText.includes('Заполнено');

  await page.getByRole('tab', { name: 'Реквизиты' }).click();
  await page.waitForSelector('[data-testid="agent-requisites-panel"]', { timeout: 30_000 });

  const ctx2 = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await ctx2.addCookies([
    {
      name: 'remcard-token',
      value: session.token,
      url: baseUrl,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  const page2 = await ctx2.newPage();
  await page2.goto(`${baseUrl}/profile?section=basics`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page2.waitForSelector(
    '[data-testid="agent-profile-wizard"], [data-testid="agent-profile-completed-summary"], [data-testid="agent-requisites-panel"]',
    { timeout: 60_000 },
  );
  const reloadOk =
    (await page2.locator('[data-testid="agent-profile-wizard"], [data-testid="agent-profile-completed-summary"]').count()) >
    0;

  await browser.close();
  return { roleOk, reloadOk };
}

async function main() {
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const session = JSON.parse(readFileSync(path.join(RUN_DIR, 'session.json'), 'utf8'));
  const env = loadRuntimeEnv(meta.envPath);
  runNavFixture(env, 'reset-draft');
  const token = runNavFixture(env, 'mint');
  session.token = token.trim();

  const report = { ok: false, wizard: null, requisites: null, ui: null };
  report.wizard = await wizardHttpFlow(session);
  const wizardOk =
    report.wizard.prefillOk &&
    report.wizard.saveDraft?.status === 200 &&
    report.wizard.reloadOk &&
    report.wizard.skipContacts?.status === 200 &&
    report.wizard.finishOk;

  report.requisites = await requisitesHttpFlow(session);
  report.ui = await playwrightProfileSmoke(session);

  report.ok =
    wizardOk &&
    report.requisites.ok &&
    report.ui.roleOk &&
    report.ui.reloadOk;

  const outPath = path.join(ROOT, 'artifacts/remcard-r02/profile-e2e-evidence.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  writeFileSync(path.join(RUN_DIR, 'session.json'), JSON.stringify(session, null, 2), { mode: 0o600 });

  if (!report.ok) {
    console.error(JSON.stringify({ error: 'profile_e2e_failed', report }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, artifact: outPath }));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
