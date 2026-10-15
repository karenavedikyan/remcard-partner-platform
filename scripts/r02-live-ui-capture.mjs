#!/usr/bin/env node
/**
 * Targeted R02-LIVE-UI capture: step1 @ 375/320 light+dark + desktop 1440 regression.
 * Requires local platform + auth cookie (e.g. /tmp/r02-local-stack/session.json or ADMIN_TEST stack).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts/remcard-r02-live-ui/screenshots');
const PLATFORM = process.env.R02_PLATFORM_URL ?? 'http://127.0.0.1:3000';
const SESSION_PATH = process.env.R02_SESSION_JSON ?? '/tmp/r02-local-stack/session.json';

function loadSession() {
  try {
    const raw = readFileSync(SESSION_PATH, 'utf8');
    const j = JSON.parse(raw);
    if (j.token) return j;
    if (j.platformOrigin && j.token) return j;
  } catch {
    return null;
  }
  return null;
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('remcard-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

async function fillStep1(page) {
  await page.waitForSelector('[data-testid="agent-profile-wizard"]', { timeout: 90_000 });
  await page.getByTestId('agent-profile-input-displayName').fill('Live UI Agent');
  await page.locator('#agent-city').fill('Краснодар');
}

async function metrics(page) {
  return page.evaluate(() => {
    const card = document.querySelector('[data-testid="agent-profile-wizard"] section');
    const draft = document.querySelector('[data-testid="agent-profile-save-draft"]');
    const next = document.querySelector('[data-testid="agent-profile-next"]');
    const cardBox = card?.getBoundingClientRect();
    const draftBox = draft?.getBoundingClientRect();
    const nextBox = next?.getBoundingClientRect();
    const sameRow =
      draftBox && nextBox ? Math.abs(draftBox.top - nextBox.top) < 8 && draftBox.bottom > nextBox.top : null;
    return {
      contentWidth: cardBox ? Math.round(cardBox.width) : null,
      overflowDoc: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      footerSameRow: sameRow,
      draftTop: draftBox ? Math.round(draftBox.top) : null,
      nextTop: nextBox ? Math.round(nextBox.top) : null,
    };
  });
}

async function main() {
  const session = loadSession();
  if (!session?.token) {
    writeFileSync(
      path.join(ROOT, 'artifacts/remcard-r02-live-ui/capture-status.json'),
      JSON.stringify({ ok: false, reason: 'NOT_VERIFIED', detail: 'no_session_json' }, null, 2),
    );
    console.log(JSON.stringify({ ok: false, NOT_VERIFIED: true }));
    process.exit(0);
  }

  mkdirSync(OUT, { recursive: true });
  const origin = session.platformOrigin?.replace(/\/$/, '') ?? PLATFORM;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: 'remcard-token',
      value: session.token,
      url: origin,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  const page = await context.newPage();
  const report = { shots: [], metrics: {} };

  const pairs = [
    { name: 'step1-375-light', w: 375, h: 812, theme: 'light' },
    { name: 'step1-375-dark', w: 375, h: 812, theme: 'dark' },
    { name: 'step1-320-light', w: 320, h: 700, theme: 'light' },
    { name: 'step1-320-dark', w: 320, h: 700, theme: 'dark' },
    { name: 'desktop-1440-light', w: 1440, h: 900, theme: 'light' },
  ];

  for (const p of pairs) {
    await page.setViewportSize({ width: p.w, height: p.h });
    await page.goto(`${origin}/profile?section=basics`, { waitUntil: 'networkidle', timeout: 120_000 });
    await setTheme(page, p.theme);
    await page.reload({ waitUntil: 'networkidle' });
    if (p.w <= 375) await fillStep1(page);
    await page.waitForTimeout(400);
    const m = await metrics(page);
    report.metrics[p.name] = m;
    const file = `${p.name}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: p.w >= 1440 });
    report.shots.push(file);
  }

  await browser.close();
  writeFileSync(
    path.join(ROOT, 'artifacts/remcard-r02-live-ui/capture-status.json'),
    JSON.stringify({ ok: true, origin, report }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, report }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
