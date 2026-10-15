#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';
const OUT_DIR = path.join(ROOT, 'artifacts/remcard-r02/screenshots');
const REFERENCE_ROOT =
  process.env.R02_REFERENCE_ROOT?.trim() ||
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';
const REF_PORT = Number(process.env.R02_REF_PORT || 8097);

const SYNTH = {
  displayName: 'R02 Visual Agent',
  city: 'Краснодар',
  audience: 'Знакомые и клиенты',
  channel: 'https://example.com/visual',
  contactPhone: '79001234567',
  contactEmail: 'visual.agent@example.test',
};

const ALL_PAIRS = [
  { name: 'wizard-step1-1440-light', width: 1440, height: 900, theme: 'light', scenario: 'step1', crop: 'wizard' },
  { name: 'wizard-step1-1440-dark', width: 1440, height: 900, theme: 'dark', scenario: 'step1', crop: 'wizard' },
  { name: 'wizard-step1-375-light', width: 375, height: 812, theme: 'light', scenario: 'step1', crop: 'wizard' },
  { name: 'wizard-step1-375-dark', width: 375, height: 812, theme: 'dark', scenario: 'step1', crop: 'wizard' },
  { name: 'review-375-light', width: 375, height: 812, theme: 'light', scenario: 'review', crop: 'wizard' },
  { name: 'review-375-dark', width: 375, height: 812, theme: 'dark', scenario: 'review', crop: 'wizard' },
  { name: 'completed-375-light', width: 375, height: 812, theme: 'light', scenario: 'completed', crop: 'wizard' },
  { name: 'completed-375-dark', width: 375, height: 812, theme: 'dark', scenario: 'completed', crop: 'wizard' },
  { name: 'profile-contacts-320-light', width: 320, height: 900, theme: 'light', scenario: 'contacts', crop: 'page-full' },
  { name: 'profile-contacts-320-dark', width: 320, height: 900, theme: 'dark', scenario: 'contacts', crop: 'page-full' },
  {
    name: 'profile-requisites-320-light',
    width: 320,
    height: 900,
    theme: 'light',
    scenario: 'requisites',
    crop: 'page-full',
    implOnly: true,
  },
  {
    name: 'profile-requisites-320-dark',
    width: 320,
    height: 900,
    theme: 'dark',
    scenario: 'requisites',
    crop: 'page-full',
    implOnly: true,
  },
  {
    name: 'profile-requisites-dialog-320-light',
    width: 320,
    height: 900,
    theme: 'light',
    scenario: 'requisites-dialog',
    crop: 'page-full',
    implOnly: true,
  },
];

const MOBILE_ONLY = process.env.R02_MOBILE_ONLY === '1';
const R026_CAPTURE = process.env.R02_6_CAPTURE === '1';
const PAIRS = R026_CAPTURE
  ? ALL_PAIRS.filter((p) =>
      [
        'wizard-step1-375-light',
        'profile-requisites-320-light',
        'profile-requisites-320-dark',
        'profile-requisites-dialog-320-light',
      ].includes(p.name),
    )
  : MOBILE_ONLY
    ? ALL_PAIRS.filter((p) => p.width <= 375 || p.width === 320)
    : ALL_PAIRS;

const HIDE_DEV_CHROME =
  'nextjs-portal,[data-nextjs-toast],next-route-announcer{display:none!important}';

const REF_HIDE =
  '.demo-top,.review-details,.registration,.choice-footer,.demo-toolbar,.mobile-demo-settings,.review-toolbar{display:none!important}';

const CAPTURE_MASK =
  '[data-testid="agent-product-topbar"],nav[aria-label="Мобильная навигация"]{position:absolute!important;visibility:hidden!important;pointer-events:none!important}';

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

async function setImplTheme(page, theme) {
  const wantDark = theme === 'dark';
  const toggle = page.getByTestId('theme-toggle');
  await toggle.waitFor({ timeout: 60_000 });
  for (let i = 0; i < 4; i++) {
    const dark = await page.evaluate(() => {
      const root = document.documentElement;
      const bg = getComputedStyle(document.body).backgroundColor;
      return root.getAttribute('data-theme') === 'dark' || bg === 'rgb(32, 35, 41)';
    });
    if (dark === wantDark) return;
    await toggle.click();
    await page.waitForTimeout(350);
  }
}

async function setRefTheme(page, theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  if ((await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light')) !== resolved) {
    await page.locator('button[data-action="theme"]').click();
    await page.waitForTimeout(300);
  }
}

async function openReferenceAgentProfile(page, refBase) {
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
    document
      .querySelector('[data-profile-action="tab"][data-profile-id="basics"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForSelector('.pw-layout, .pw', { timeout: 60_000 });
  await page.addStyleTag({ content: REF_HIDE });
}

async function fillReferenceBasics(page) {
  await page.locator('[data-testid="pw-input-name"]').fill(SYNTH.displayName);
  await page.locator('[data-testid="pw-input-city"]').fill(SYNTH.city);
}

async function referenceAdvance(page) {
  await page.locator('[data-testid="pw-next"]').click();
  await page.waitForTimeout(200);
}

async function prepareReference(page, refBase, theme, scenario) {
  await openReferenceAgentProfile(page, refBase);
  await setRefTheme(page, theme);
  await fillReferenceBasics(page);
  if (scenario === 'step1') {
    return;
  }
  await referenceAdvance(page);
  if (scenario === 'contacts') {
    await page.locator('[data-testid="pw-skip"]').click();
    await page.waitForSelector('[data-testid="pw-progress"]', { hasText: 'Шаг 3' });
    return;
  }
  if (scenario === 'review' || scenario === 'completed') {
    await page.locator('[data-testid="pw-input-audience"]').fill(SYNTH.audience);
    await referenceAdvance(page);
    await page.locator('[data-testid="pw-skip"]').click();
    await page.waitForSelector('[data-testid="pw-progress"]', { timeout: 30_000 });
  }
  if (scenario === 'completed') {
    await page.locator('[data-testid="pw-next"]').click();
    await page.waitForSelector('[data-testid="pw-summary"]', { timeout: 30_000 });
  }
}

async function prepareImpl(page, baseUrl, theme, scenario) {
  await page.goto(`${baseUrl}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 90_000 });
  await setImplTheme(page, theme);
  if (scenario === 'completed') {
    await page.waitForSelector('[data-testid="agent-profile-completed-summary"]', { timeout: 60_000 });
    return;
  }
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 60_000 });
  if (scenario === 'review') {
    await page.waitForSelector('[data-testid="agent-profile-progress"]', { hasText: 'Шаг 4 из 4' });
    return;
  }
  if (scenario === 'step1') {
    await page.getByTestId('agent-profile-input-displayName').fill(SYNTH.displayName);
    await page.locator('#agent-city').fill(SYNTH.city);
    return;
  }
  if (scenario === 'contacts') {
    await walkImplWizardToContacts(page);
    return;
  }
  if (scenario === 'requisites' || scenario === 'requisites-dialog') {
    return;
  }
  await walkImplWizardToReview(page);
}

async function openRequisitesCreateDialog(page) {
  await waitRequisitesReady(page);
  const addBtn = page.getByRole('button', { name: 'Добавить реквизиты' });
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 30_000 });
  await page.locator('#req-acc').fill('40817810000000000999');
}

async function polishStep1Capture(page) {
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    document.querySelectorAll('input, textarea, button').forEach((el) => {
      if (el === document.activeElement) el.blur();
    });
  });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(250);
}

async function waitRequisitesReady(page) {
  await page.locator('[data-testid="agent-profile-scope"]').getByRole('tab', { name: 'Реквизиты' }).click();
  const panel = page.locator('[data-testid="agent-requisites-panel"]');
  await panel.waitFor({ timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const panel = document.querySelector('[data-testid="agent-requisites-panel"]');
      if (!panel) return false;
      const loading = panel.textContent?.includes('Загрузка');
      if (loading) return false;
      return (
        panel.querySelector('button') != null ||
        panel.textContent?.includes('40817') ||
        panel.textContent?.toLowerCase().includes('реквизит')
      );
    },
    { timeout: 60_000 },
  );
}

async function walkImplWizardToReview(page) {
  await page.getByTestId('agent-profile-input-displayName').fill(SYNTH.displayName);
  await page.locator('#agent-city').fill(SYNTH.city);
  await page.getByTestId('agent-profile-next').click();
  await page.waitForSelector('#agent-profile-step-title', { hasText: 'Кому вы рекомендуете?' });
  await page.locator('#agent-audience').fill(SYNTH.audience);
  await page.getByTestId('agent-profile-next').click();
  await page.waitForSelector('#agent-profile-step-title', { hasText: 'Как с вами связаться?' });
  await page.getByRole('button', { name: 'Пропустить' }).click();
  await page.waitForSelector('[data-testid="agent-profile-progress"]', { hasText: 'Шаг 4 из 4' });
}

async function waitDraftPatch(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes('/agent-profile/draft') && r.request().method() === 'PATCH' && r.status() === 200,
      { timeout: 45_000 },
    )
    .catch(() => null);
}

async function walkImplWizardToContacts(page) {
  await page.getByTestId('agent-profile-input-displayName').fill(SYNTH.displayName);
  await page.locator('#agent-city').fill(SYNTH.city);
  await Promise.all([waitDraftPatch(page), page.getByTestId('agent-profile-next').click()]);
  await page.waitForSelector('#agent-profile-step-title', { hasText: 'Кому' });
  await page.locator('#agent-audience').fill(SYNTH.audience);
  await Promise.all([waitDraftPatch(page), page.getByTestId('agent-profile-next').click()]);
  await page.waitForSelector('[data-testid="agent-profile-progress"]', { hasText: 'Шаг 3' });
  await page.waitForSelector('#agent-profile-step-title', { hasText: 'связаться' });
}

async function readThemeMetrics(page, side) {
  return page.evaluate((refSide) => {
    const root =
      document.querySelector('[data-testid="agent-profile-wizard"]') ||
      document.querySelector('[data-testid="agent-profile-completed-summary"]') ||
      document.querySelector('.pw-layout, .pw');
    const card = root?.querySelector('section') || root;
    const cs = card ? getComputedStyle(card) : getComputedStyle(document.documentElement);
    const bg = cs.backgroundColor;
    const text = cs.color;
    const attr = document.documentElement.getAttribute('data-theme') || 'light';
    const darkByBg =
      bg === 'rgb(32, 35, 41)' || bg === 'rgb(41, 46, 54)' || attr === 'dark';
    return { bg, text, attr, darkByBg, refSide };
  }, side);
}

async function measureAgentTokens(page) {
  return page.evaluate(() => {
    const scope = document.querySelector('[data-testid="agent-profile-scope"]');
    if (!scope) return { scopeVars: null, tabVars: null, tabsDistinct: false, listItemBorder: false };
    const tablist = scope.querySelector('[role="tablist"]');
    const activeTab = scope.querySelector('[role="tab"][aria-selected="true"]');
    const inactiveTab = scope.querySelector('[role="tab"][aria-selected="false"]');
    const readVars = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        pw2: cs.getPropertyValue('--pw-2').trim(),
        pwBg: cs.getPropertyValue('--pw-bg').trim(),
        pwLine: cs.getPropertyValue('--pw-line').trim(),
      };
    };
    const readBox = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const gap = tablist ? parseFloat(getComputedStyle(tablist).gap) || 0 : 0;
      return {
        gap,
        paddingTop: parseFloat(cs.paddingTop) || 0,
        paddingLeft: parseFloat(cs.paddingLeft) || 0,
        borderTopWidth: parseFloat(cs.borderTopWidth) || 0,
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderColor,
      };
    };
    const listItem = document.querySelector('[data-testid="agent-requisites-panel"] ul > li');
    return {
      scopeVars: readVars(scope),
      tabVars: readVars(activeTab || tablist?.querySelector('button')),
      tabActive: readBox(activeTab),
      tabInactive: readBox(inactiveTab),
      tabsDistinct:
        activeTab && inactiveTab
          ? getComputedStyle(activeTab).backgroundColor !== getComputedStyle(inactiveTab).backgroundColor ||
            getComputedStyle(activeTab).borderColor !== getComputedStyle(inactiveTab).borderColor
          : false,
      listItemBorder: listItem ? parseFloat(getComputedStyle(listItem).borderTopWidth) > 0 : false,
    };
  });
}

async function measureStepOverlap(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="agent-profile-steps"]');
    if (!root) return { overlap: false, clipped: false, stepBtn: null };
    const btns = [...root.querySelectorAll('button')];
    const rects = btns.map((b) => b.getBoundingClientRect());
    let overlap = false;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const hit =
          a.right > b.left + 0.5 &&
          a.left < b.right - 0.5 &&
          a.bottom > b.top + 0.5 &&
          a.top < b.bottom - 0.5;
        if (hit) overlap = true;
      }
    }
    const clipped = rects.some((r) => r.right > window.innerWidth + 1 || r.left < -1);
    const first = btns[0];
    const stepBtn = first
      ? {
          display: getComputedStyle(first).display,
          flexDirection: getComputedStyle(first).flexDirection,
        }
      : null;
    return { overlap, clipped, stepBtn, count: btns.length };
  });
}

async function verifyPair(page, side, theme, scenario, width) {
  const metrics = await page.evaluate(({ scenario: sc, viewportWidth }) => {
    const wizard = document.querySelector('[data-testid="agent-profile-wizard"]');
    const completed = document.querySelector('[data-testid="agent-profile-completed-summary"]');
    const refSummary = document.querySelector('[data-testid="pw-summary"]');
    const root = wizard || completed || document.querySelector('.pw-layout, .pw');
    const requisites = document.querySelector('[data-testid="agent-requisites-panel"]');
    const roleEl =
      root?.querySelector('[data-testid="agent-profile-role-kicker"]') ||
      root?.querySelector('.pw-summary-header .pw-kicker') ||
      root?.querySelector('.pw-journey > .pw-kicker');
    let roleAgent = roleEl?.textContent?.trim() === 'Агент';
    if (sc === 'contacts' && requisites) {
      roleAgent = requisites.textContent?.toLowerCase().includes('реквизит') ?? roleAgent;
    }
    const progress = document.querySelector('[data-testid="agent-profile-progress"]')?.textContent?.trim() || '';
    const refProgress = document.querySelector('[data-testid="pw-progress"]')?.textContent?.trim() || '';
    const stepTitle = document.querySelector('#agent-profile-step-title')?.textContent?.trim() || '';
    const heading =
      stepTitle ||
      document.querySelector('.pw-card-top .pw-kicker')?.textContent?.trim() ||
      '';
    const overflowDoc = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    const stepsList =
      root?.querySelector('[data-testid="agent-profile-steps"]') || root?.querySelector('.pw-steps');
    const stepsDisplay = stepsList ? getComputedStyle(stepsList).display : '';
    const journeyIntro =
      root?.querySelector('[data-testid="agent-profile-journey"] > p') ||
      root?.querySelector('.pw-journey > p');
    const introDisplay = journeyIntro ? getComputedStyle(journeyIntro).display : 'none';
    const box = root?.getBoundingClientRect();
    return {
      roleAgent,
      progress,
      refProgress,
      heading,
      overflowDoc,
      stepsDisplay,
      introDisplay,
      wizardWidth: box?.width ?? 0,
      hasWizard: Boolean(
        wizard || root?.querySelector('.pw-layout') || root?.querySelector('.pw-card'),
      ),
      hasCompleted: Boolean(completed || refSummary),
      hasRequisites: Boolean(requisites),
      scenario: sc,
      viewportWidth,
      stepTitle,
    };
  }, { scenario, viewportWidth: width });

  const themeMetrics = await readThemeMetrics(page, side);
  const wantDark = theme === 'dark';
  const themeOk = wantDark ? themeMetrics.darkByBg : !themeMetrics.darkByBg;

  let stateOk = false;
  let mobileSteps = null;
  if (scenario === 'step1' && width <= 400 && side === 'impl') {
    mobileSteps = await measureStepOverlap(page);
  }

  if (scenario === 'step1') {
    const prog = metrics.progress || metrics.refProgress;
    stateOk = metrics.hasWizard && /Шаг 1/.test(prog);
    if (width <= 400 && side === 'impl') {
      stateOk =
        stateOk &&
        metrics.stepsDisplay === 'flex' &&
        metrics.introDisplay === 'none' &&
        mobileSteps?.stepBtn?.display === 'flex' &&
        mobileSteps?.stepBtn?.flexDirection === 'column' &&
        !mobileSteps?.overlap &&
        !mobileSteps?.clipped &&
        mobileSteps?.count === 4;
    } else if (width <= 400) {
      stateOk =
        stateOk && metrics.stepsDisplay === 'flex' && metrics.introDisplay === 'none';
    }
  } else if (scenario === 'review') {
    const prog = metrics.progress || metrics.refProgress;
    stateOk = !metrics.hasCompleted && /Шаг 4/.test(prog);
  } else if (scenario === 'completed') {
    stateOk = metrics.hasCompleted && !metrics.hasWizard;
  } else if (scenario === 'contacts') {
    stateOk =
      side === 'impl'
        ? metrics.hasWizard &&
          (metrics.stepTitle.includes('связаться') ||
            metrics.progress === 'Шаг 3 из 4' ||
            /Шаг 3/.test(metrics.progress))
        : metrics.hasWizard &&
          (metrics.stepTitle.includes('связаться') ||
            metrics.progress === 'Шаг 3 из 4' ||
            /Шаг 3/.test(metrics.refProgress));
  } else if (scenario === 'requisites' || scenario === 'requisites-dialog') {
    const panelText =
      (await page.locator('[data-testid="agent-requisites-panel"]').textContent().catch(() => '')) || '';
    const loading = panelText.includes('Загрузка');
    const hasControls =
      /40817|7707083893|R02 Visual|Visual Agent|\*\*\*\*/i.test(panelText) ||
      (await page.getByRole('button', { name: /Добавить|Изменить|Основн/i }).count()) > 0;
    stateOk = side === 'impl' && metrics.hasRequisites && !loading && hasControls;
    if (scenario === 'requisites-dialog') {
      stateOk = stateOk && (await page.locator('[role="dialog"]').count()) > 0;
    }
    if (side === 'impl') {
      metrics.roleAgent = panelText.toLowerCase().includes('реквизит') && stateOk;
      const tokens = await measureAgentTokens(page);
      const varsOk =
        Boolean(tokens.scopeVars?.pw2) &&
        Boolean(tokens.scopeVars?.pwBg) &&
        Boolean(tokens.tabVars?.pw2 || tokens.tabVars?.pwLine) &&
        (tokens.tabActive?.gap >= 8 || tokens.tabActive?.paddingLeft >= 8) &&
        tokens.tabActive?.borderTopWidth >= 1 &&
        tokens.tabsDistinct &&
        (scenario === 'requisites-dialog' || tokens.listItemBorder);
      metrics.tokenScope = { ...tokens, varsOk };
      stateOk = stateOk && varsOk;
      const addBtn = page
        .locator('[data-testid="agent-requisites-panel"]')
        .getByRole('button', { name: 'Добавить реквизиты' });
      await addBtn.scrollIntoViewIfNeeded().catch(() => null);
      const addVisible = await addBtn.isVisible().catch(() => false);
      metrics.addButtonScrollVisible = addVisible;
      if (scenario === 'requisites' && !addVisible) {
        stateOk = false;
      }
    }
  }

  const verify = {
    roleAgent: metrics.roleAgent,
    themeOk,
    stateOk,
    overflowOk: !metrics.overflowDoc,
    metrics: {
      wizardWidth: Math.round(metrics.wizardWidth),
      stepsDisplay: metrics.stepsDisplay,
      introDisplay: metrics.introDisplay,
      progress: metrics.progress || metrics.refProgress,
      themeBg: themeMetrics.bg,
      themeText: themeMetrics.text,
      mobileSteps,
      tokenScope: metrics.tokenScope ?? null,
      addButtonScrollVisible: metrics.addButtonScrollVisible ?? null,
    },
  };
  verify.pass = verify.roleAgent && verify.themeOk && verify.stateOk && verify.overflowOk;
  if (width >= 1200 && scenario === 'step1') {
    verify.pass = verify.pass && metrics.wizardWidth >= 980;
  }
  return verify;
}

async function capture(page, pair, side, out) {
  if (pair.crop === 'page-full') {
    await page.screenshot({ path: out, fullPage: true });
    return;
  }
  if (side === 'impl') {
    await page.addStyleTag({ content: CAPTURE_MASK, id: 'r02-visual-mask' });
  }
  const loc = page
    .locator(
      '[data-testid="agent-profile-wizard"], [data-testid="agent-profile-completed-summary"], .pw-layout, .pw, [data-testid="pw-summary"]',
    )
    .first();
  await loc.screenshot({ path: out });
  if (side === 'impl') {
    await page.evaluate(() => document.getElementById('r02-visual-mask')?.remove());
  }
}

function loadEnv() {
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const env = { ...process.env };
  for (const line of readFileSync(meta.envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return { meta, env };
}

function resetFixture(env) {
  spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', 'reset-draft'], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
}

async function seedReviewViaBff(session) {
  const plat = session.platformOrigin.replace(/\/$/, '');
  const h = {
    Cookie: `remcard-token=${session.token}`,
    'content-type': 'application/json',
    Origin: plat,
  };
  let draft = await (await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, { headers: { Cookie: h.Cookie } })).json();
  const patch = async (body) => {
    const res = await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, { method: 'PATCH', headers: h, body: JSON.stringify(body) });
    draft = await res.json();
    return res.status;
  };
  await patch({
    expectedVersion: draft.version ?? 0,
    expectedEpoch: draft.draftEpoch ?? 0,
    mode: 'advance',
    fromStep: 1,
    step: 2,
    payload: { displayName: SYNTH.displayName, city: SYNTH.city },
  });
  await patch({
    expectedVersion: draft.version ?? 0,
    expectedEpoch: draft.draftEpoch ?? 0,
    mode: 'advance',
    fromStep: 2,
    step: 3,
    payload: { displayName: SYNTH.displayName, city: SYNTH.city, audience: SYNTH.audience },
  });
  await patch({
    expectedVersion: draft.version ?? 0,
    expectedEpoch: draft.draftEpoch ?? 0,
    mode: 'save',
    step: 4,
    payload: { displayName: SYNTH.displayName, city: SYNTH.city, audience: SYNTH.audience },
  });
}

async function seedRequisitesViaBff(session) {
  const plat = session.platformOrigin.replace(/\/$/, '');
  const h = {
    Cookie: `remcard-token=${session.token}`,
    'content-type': 'application/json',
    Origin: plat,
  };
  const res = await fetch(`${plat}/api/remcard/api/pro/agent-payout-requisites`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      kind: 'person',
      legalName: 'R02 Visual Agent',
      inn: '7707083893',
      accountNumber: '40817810000000000001',
      corrAccount: '30101810000000000000',
      isPrimary: true,
    }),
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`seed_requisites_failed_${res.status}`);
  }
}

async function seedCompletedViaBff(session) {
  await seedReviewViaBff(session);
  const plat = session.platformOrigin.replace(/\/$/, '');
  const h = {
    Cookie: `remcard-token=${session.token}`,
    'content-type': 'application/json',
    Origin: plat,
  };
  const draft = await (await fetch(`${plat}/api/remcard/api/pro/agent-profile/draft`, { headers: { Cookie: h.Cookie } })).json();
  await fetch(`${plat}/api/remcard/api/pro/agent-profile/finish`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ expectedVersion: draft.version ?? 0, expectedEpoch: draft.draftEpoch ?? 0 }),
  });
}

async function main() {
  const session = JSON.parse(readFileSync(path.join(RUN_DIR, 'session.json'), 'utf8'));
  const { env } = loadEnv();
  mkdirSync(OUT_DIR, { recursive: true });
  const refBase = await ensureReferenceServer();
  const browser = await chromium.launch({ headless: true });
  const report = {
    pairs: [],
    widthTolerance: { desktopMinWizard: 980 },
    mobileOnly: MOBILE_ONLY,
    r026Capture: R026_CAPTURE,
    desktopCarryOver: MOBILE_ONLY || R026_CAPTURE
      ? ['wizard-step1-1440-light', 'wizard-step1-1440-dark']
      : undefined,
    notLiteralParity: [
      'desktop wizard width ~28px vs reference',
      'completed status badge radius 6px vs ref pill',
      'demo wallet banner not ported',
    ],
  };

  for (const pair of PAIRS) {
    resetFixture(env);
    if (pair.scenario === 'review') {
      await seedReviewViaBff(session);
    } else if (pair.scenario === 'completed') {
      await seedCompletedViaBff(session);
    } else if (pair.scenario === 'requisites' || pair.scenario === 'requisites-dialog') {
      await seedRequisitesViaBff(session);
    }

    for (const side of pair.implOnly ? ['impl'] : ['impl', 'ref']) {
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
            url: session.platformOrigin,
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
          },
        ]);
      }
      const page = await ctx.newPage();
      try {
        if (side === 'ref') {
          await prepareReference(page, refBase, pair.theme, pair.scenario);
        } else {
          await prepareImpl(page, session.platformOrigin, pair.theme, pair.scenario);
        }
        if (side === 'impl') {
          await page.addStyleTag({ content: HIDE_DEV_CHROME, id: 'r02-hide-dev' });
        }
        if ((pair.scenario === 'requisites' || pair.scenario === 'requisites-dialog') && side === 'impl') {
          if (pair.scenario === 'requisites-dialog') {
            await openRequisitesCreateDialog(page);
          } else {
            await waitRequisitesReady(page);
          }
        }
        if (pair.scenario === 'step1' && side === 'impl') {
          await polishStep1Capture(page);
        }
        const verification = await verifyPair(page, side, pair.theme, pair.scenario, pair.width);
        entry.verifyDetails = verification;
        const out = path.join(OUT_DIR, `${name}.png`);
        await capture(page, pair, side, out);
        entry.capture = 'CAPTURED';
        entry.verify = verification.pass ? 'PASS' : 'FAIL';
        entry.path = out;
        if (pair.scenario === 'requisites' && side === 'impl') {
          const loadingVisible = await page
            .locator('[data-testid="agent-requisites-panel"]')
            .getByText('Загрузка')
            .isVisible()
            .catch(() => false);
          entry.verifyDetails.metrics.requisitesReady = !loadingVisible;
          if (loadingVisible) {
            entry.verify = 'FAIL';
            entry.verifyDetails.pass = false;
          }
        }
      } catch (error) {
        entry.error = error instanceof Error ? error.message : String(error);
      }
      report.pairs.push(entry);
      await ctx.close();
    }

    if (pair.scenario === 'step1' && pair.width === 1440) {
      const impl = report.pairs.find((p) => p.name === `impl-${pair.name}`);
      const ref = report.pairs.find((p) => p.name === `ref-${pair.name}`);
      if (impl?.verifyDetails?.metrics?.wizardWidth && ref?.verifyDetails?.metrics?.wizardWidth) {
        const delta = Math.abs(impl.verifyDetails.metrics.wizardWidth - ref.verifyDetails.metrics.wizardWidth);
        report.widthTolerance[`${pair.name}_delta`] = delta;
        if (delta > 120) {
          impl.verify = 'FAIL';
          ref.verify = 'FAIL';
          impl.verifyDetails.pass = false;
          ref.verifyDetails.pass = false;
          impl.verifyDetails.widthDelta = delta;
        }
      }
    }
  }

  await browser.close();
  writeFileSync(path.join(OUT_DIR, 'visual-report.json'), JSON.stringify(report, null, 2));
  const failed = report.pairs.filter((r) => r.verify !== 'PASS' || r.capture !== 'CAPTURED');
  if (failed.length) {
    console.error(JSON.stringify({ error: 'visual_verify_failed', failed: failed.map((f) => f.name) }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, outDir: OUT_DIR, pairs: report.pairs.length }));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
