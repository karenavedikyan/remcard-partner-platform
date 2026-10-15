#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';
const OUT_DIR = path.join(ROOT, 'artifacts/remcard-r02/screenshots');
const REFERENCE_ROOT =
  process.env.R02_REFERENCE_ROOT?.trim() ||
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';
const REF_PORT = Number(process.env.R02_REF_PORT || 8097);

const PAIRS = [
  { name: 'wizard-step1-1440-light', width: 1440, height: 900, theme: 'light', step: 0, crop: 'wizard' },
  { name: 'wizard-step1-375-light', width: 375, height: 812, theme: 'light', step: 0, crop: 'wizard' },
  { name: 'wizard-step1-375-dark', width: 375, height: 812, theme: 'dark', step: 0, crop: 'wizard' },
  { name: 'wizard-step1-1440-dark', width: 1440, height: 900, theme: 'dark', step: 0, crop: 'wizard' },
  { name: 'summary-375-light', width: 375, height: 812, theme: 'light', step: 3, crop: 'wizard' },
  { name: 'summary-375-dark', width: 375, height: 812, theme: 'dark', step: 3, crop: 'wizard' },
  { name: 'profile-320-smoke', width: 320, height: 700, theme: 'light', step: 2, crop: 'page', preloadContacts: true },
];

const REF_HIDE =
  '.demo-top,.review-details,.registration,.choice-footer,.demo-toolbar,.mobile-demo-settings,.review-toolbar{display:none!important}';

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
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${base}/roles.html`);
      if (res.ok) return base;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('reference_server_unreachable');
}

async function readTheme(page) {
  return page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
}

async function prepareReference(page, refBase, theme, step) {
  await page.goto(`${refBase}/roles.html`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.topbar', { timeout: 60_000 });
  await page.evaluate(() => {
    const cabinet = document.querySelector('[data-testid="view-cabinet"]');
    if (cabinet && cabinet.getAttribute('aria-pressed') !== 'true') {
      cabinet.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    const sel = document.querySelector('[data-testid="scenario-role"]');
    if (sel) {
      sel.value = 'agent';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.querySelector('[data-testid="nav-profile"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const basics = document.querySelector('[data-profile-action="tab"][data-profile-id="basics"]');
    basics?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForSelector('.pw-layout, .pw', { timeout: 60_000 });
  await page.addStyleTag({ content: REF_HIDE });
  const resolved = theme === 'dark' ? 'dark' : 'light';
  if ((await readTheme(page)) !== resolved) {
    await page.locator('button[data-action="theme"]').click();
    await page.waitForTimeout(300);
  }
  if (step > 0) {
    await page.evaluate((s) => {
      const btn = document.querySelector(`[data-testid="pw-step-${s}"]`) ||
        document.querySelectorAll('.pw-steps button')[s];
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, step);
  }
}

async function prepareImpl(page, baseUrl, theme, step, opts = {}) {
  await page.goto(`${baseUrl}/profile?section=basics`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  if (theme === 'dark') {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  }
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 60_000 });
  if (opts.preloadedStep != null) {
    await page.waitForSelector('#agent-profile-step-title', { timeout: 60_000 });
    return;
  }
  if (step > 0) {
    const btn = page.locator(`[data-testid="agent-profile-step-${step}"]`);
    await btn.waitFor({ state: 'visible', timeout: 60_000 });
    const enabled = await btn.isEnabled();
    if (enabled) await btn.click();
  }
}

async function verifyState(page, side, theme, step) {
  const data = await page.evaluate(() => {
    const wizard = document.querySelector('[data-testid="agent-profile-wizard"], .pw-layout, .pw');
    const roleSelect = document.querySelector('[data-testid="scenario-role"]');
    const kickerEl = document.querySelector('.pw-kicker, [class*="kicker"]');
    const journeyKicker = document.querySelector('.pw-journey .pw-kicker, .pw-journey > .pw-kicker');
    const roleAgent =
      roleSelect?.value === 'agent' ||
      Boolean(journeyKicker?.textContent?.includes('Агент')) ||
      Boolean(kickerEl?.textContent?.includes('Агент')) ||
      document.body.innerText.includes('Агент');
    const steps = ['О себе', 'Аудитория', 'Контакты', 'Проверка'].filter((s) =>
      document.body.innerText.includes(s),
    );
    const root = wizard || document.documentElement;
    const overflow = root.scrollWidth > root.clientWidth + 4;
    return { hasWizard: Boolean(wizard), roleAgent, steps, overflow };
  });
  const themeActual = await readTheme(page);
  const expectedTheme = theme === 'dark' ? 'dark' : 'light';
  const verify = {
    roleAgent: data.roleAgent,
    themeOk: themeActual === expectedTheme,
    stepLabelsOk: data.steps.length >= 3,
    overflowOk: !data.overflow,
    hasWizard: data.hasWizard,
  };
  verify.pass =
    verify.roleAgent && verify.themeOk && verify.stepLabelsOk && verify.hasWizard && verify.overflowOk;
  if (side === 'ref' && step === 0) {
    verify.pass = verify.pass && data.steps.includes('О себе');
  }
  return verify;
}

async function bffHeaders(session, plat) {
  return {
    Cookie: `remcard-token=${session.token}`,
    'content-type': 'application/json',
    Origin: plat,
  };
}

async function resetDraftStep1(session) {
  const plat = session.platformOrigin.replace(/\/$/, '');
  const draft = await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    headers: { Cookie: `remcard-token=${session.token}` },
  });
  const body = await draft.json();
  await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    method: 'PATCH',
    headers: await bffHeaders(session, plat),
    body: JSON.stringify({
      expectedVersion: body.version ?? 0,
      expectedEpoch: body.draftEpoch ?? 0,
      mode: 'save',
      step: 1,
      payload: {
        displayName: body.payload?.displayName || 'Local Agent Owner',
        city: body.payload?.city || 'Krasnodar',
      },
    }),
  });
}

async function advanceDraftToReview(session) {
  const plat = session.platformOrigin.replace(/\/$/, '');
  const draft = await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    headers: { Cookie: `remcard-token=${session.token}` },
  });
  const body = await draft.json();
  await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    method: 'PATCH',
    headers: await bffHeaders(session, plat),
    body: JSON.stringify({
      expectedVersion: body.version ?? 0,
      expectedEpoch: body.draftEpoch ?? 0,
      mode: 'save',
      step: 4,
      payload: {
        displayName: body.payload?.displayName || 'Local Agent Owner',
        city: body.payload?.city || 'Krasnodar',
        ...(body.payload ?? {}),
      },
    }),
  });
}

async function preloadContactsStep(session) {
  const plat = session.platformOrigin.replace(/\/$/, '');
  const draft = await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    headers: { Cookie: `remcard-token=${session.token}` },
  });
  const body = await draft.json();
  await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    method: 'PATCH',
    headers: await bffHeaders(session, plat),
    body: JSON.stringify({
      expectedVersion: body.version ?? 0,
      expectedEpoch: body.draftEpoch ?? 0,
      mode: 'save',
      step: 3,
      payload: body.payload ?? {},
    }),
  });
}

async function main() {
  const session = JSON.parse(readFileSync(path.join(RUN_DIR, 'session.json'), 'utf8'));
  const baseUrl = session.platformOrigin;
  await resetDraftStep1(session);
  mkdirSync(OUT_DIR, { recursive: true });
  const refBase = await ensureReferenceServer();
  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const pair of PAIRS) {
    if (pair.preloadContacts) {
      await preloadContactsStep(session);
    } else if (pair.step === 3) {
      await advanceDraftToReview(session);
    } else if (pair.step === 0) {
      await resetDraftStep1(session);
    }
    for (const side of ['impl', 'ref']) {
      const name = `${side}-${pair.name}`;
      const entry = { name, capture: 'FAIL', verify: 'FAIL' };
      const ctx = await browser.newContext({
        viewport: { width: pair.width, height: pair.height },
        colorScheme: pair.theme,
      });
      if (side === 'impl') {
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
      }
      const page = await ctx.newPage();
      try {
        if (side === 'ref') {
          await prepareReference(page, refBase, pair.theme, pair.step ?? 0);
        } else {
          await prepareImpl(page, baseUrl, pair.theme, pair.step ?? 0, {
            preloadedStep: pair.preloadContacts ? 2 : undefined,
          });
        }
        const verification = await verifyState(page, side, pair.theme, pair.step ?? 0);
        entry.verifyDetails = verification;
        const out = path.join(OUT_DIR, `${name}.png`);
        if (pair.crop === 'page') {
          await page.screenshot({ path: out, fullPage: true });
        } else {
          const loc = page.locator('[data-testid="agent-profile-wizard"], .pw-layout, .pw').first();
          await loc.screenshot({ path: out });
        }
        entry.capture = 'CAPTURED';
        entry.verify = verification.pass ? 'PASS' : 'FAIL';
        entry.path = out;
      } catch (error) {
        entry.error = error instanceof Error ? error.message : String(error);
      }
      report.push(entry);
      await ctx.close();
    }
  }
  await browser.close();
  writeFileSync(path.join(OUT_DIR, 'visual-report.json'), JSON.stringify({ pairs: report }, null, 2));
  const failed = report.filter((r) => r.verify !== 'PASS' || r.capture !== 'CAPTURED');
  if (failed.length) {
    console.error(JSON.stringify({ error: 'visual_verify_failed', failed: failed.map((f) => f.name) }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, outDir: OUT_DIR, pairs: report.length }));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
