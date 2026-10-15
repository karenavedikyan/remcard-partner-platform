#!/usr/bin/env node
/**
 * R03 UI parity: authenticated impl captures, reference pairs, computed checks, overlays.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { driveRefAgentSection, verifyImplAgentShell } from './lib/r03-prototype-ref.mjs';
import {
  bootstrapAdminAgentSession,
  ensurePageTheme,
  openImplSection,
  seedUiParityFixtures,
  setImplViewMode,
  startStaticRefServer,
  ROOT,
} from './lib/r03-stack-bootstrap.mjs';

const ART = path.join(ROOT, 'artifacts/remcard-r03-ui-parity');
const SHOTS = path.join(ART, 'screenshots');
const REF_ROOT =
  process.env.R03_REFERENCE_ROOT ||
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';
const REF_PORT = Number(process.env.R03_REF_STATIC_PORT || 8765);

const MAIN_MATRIX = [];
for (const section of ['certificates', 'clients']) {
  for (const viewMode of ['list', 'cards']) {
    for (const theme of ['light', 'dark']) {
      for (const [width, height] of [
        [1440, 900],
        [375, 812],
      ]) {
        MAIN_MATRIX.push({ section, viewMode, theme, width, height, kind: 'main' });
      }
    }
  }
}

const SMOKE_MATRIX = [
  { section: 'certificates', viewMode: 'list', theme: 'light', width: 320, height: 812, kind: 'smoke320' },
  { section: 'clients', viewMode: 'list', theme: 'light', width: 320, height: 812, kind: 'smoke320' },
];

function gitSha(cwd) {
  try {
    return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function slug(row) {
  return `${row.section}-${row.viewMode}-${row.theme}-${row.width}x${row.height}${row.kind === 'smoke320' ? '-smoke320' : ''}`;
}

function writeOverlayDiff(refPath, implPath, outPath) {
  const ref = PNG.sync.read(readFileSync(refPath));
  const impl = PNG.sync.read(readFileSync(implPath));
  const w = Math.min(ref.width, impl.width);
  const h = Math.min(ref.height, impl.height);
  const refCrop = new PNG({ width: w, height: h });
  const implCrop = new PNG({ width: w, height: h });
  PNG.bitblt(ref, refCrop, 0, 0, w, h, 0, 0);
  PNG.bitblt(impl, implCrop, 0, 0, w, h, 0, 0);
  const diff = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(refCrop.data, implCrop.data, diff.data, w, h, { threshold: 0.12 });
  writeFileSync(outPath, PNG.sync.write(diff));
  return { width: w, height: h, mismatchedPixels: mismatched, ratio: mismatched / (w * h) };
}

async function measureImplComputed(page, section, viewMode) {
  return page.evaluate(({ section, viewMode }) => {
    const nav = document.querySelector(`[data-testid="nav-${section}"] svg`);
    const navBox = nav?.getBoundingClientRect();
    const cardsGrid = document.querySelector('[data-testid="agent-cert-card-shell"]')?.parentElement;
    const gridStyle = cardsGrid ? getComputedStyle(cardsGrid) : null;
    const activeView = document.querySelector('[data-testid="agent-r03-view-toggle"] button[aria-pressed="true"]');
    const toolbar = document.querySelector('[data-testid="agent-r03-collection-toolbar"]');
    const pagination = document.querySelector('[data-testid="agent-r03-pagination"]');
    const terms = document.querySelector('[data-testid="agent-cert-terms"]');
    const linkMore = document.querySelector('[data-testid="agent-cert-card"] .certCardMore, [data-testid="agent-cert-card"] a[class*="certCardMore"]');
    const moreColor = linkMore ? getComputedStyle(linkMore).color : null;
    return {
      navIconWidth: navBox?.width ?? null,
      navIconHeight: navBox?.height ?? null,
      cardsGridColumns: gridStyle?.gridTemplateColumns ?? null,
      activeViewLabel: activeView?.textContent?.trim() ?? null,
      toolbarVisible: Boolean(toolbar),
      paginationRect: pagination?.getBoundingClientRect() ?? null,
      termsPresent: Boolean(terms),
      moreLinkColor: moreColor,
      section,
      viewMode,
    };
  }, { section, viewMode });
}

async function captureImpl(context, plat, cookieHeader, row) {
  const page = await context.newPage();
  await page.setViewportSize({ width: row.width, height: row.height });
  await page.goto(plat, { waitUntil: 'domcontentloaded' });
  await openImplSection(page, plat, row.section);
  await ensurePageTheme(page, row.theme);
  await setImplViewMode(page, row.viewMode);

  const shell = await verifyImplAgentShell(page, row.section, row.viewMode);
  if (!shell.ok) throw new Error(`impl_shell:${shell.reason}`);

  const r03 = await fetch(`${plat}/api/remcard/api/pro/r03/status`, {
    headers: { Cookie: cookieHeader, Origin: plat },
  }).catch(() => null);
  if (r03 && r03.status !== 200) throw new Error(`r03_status_${r03.status}`);

  await page.locator('[data-testid="agent-r03-found-count"]').waitFor({ timeout: 30_000 });

  const computed = await measureImplComputed(page, row.section, row.viewMode);
  if (computed.activeViewLabel !== (row.viewMode === 'list' ? 'Список' : 'Карточки')) {
    throw new Error(`view_mode_not_active:${computed.activeViewLabel}`);
  }

  const fullPath = path.join(SHOTS, `${slug(row)}-impl-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });

  const regions = {};
  const pagination = page.locator('[data-testid="agent-r03-pagination"]');
  if (await pagination.isVisible().catch(() => false)) {
    regions.pagination = path.join(SHOTS, `${slug(row)}-impl-pagination.png`);
    await pagination.screenshot({ path: regions.pagination });
  }
  if (row.viewMode === 'cards' && row.section === 'certificates') {
    const card = page.locator('[data-testid="agent-cert-card"]').first();
    if (await card.isVisible().catch(() => false)) {
      regions.certCard = path.join(SHOTS, `${slug(row)}-impl-cert-card.png`);
      await card.screenshot({ path: regions.certCard });
    }
  }

  await page.close();
  return { fullPath, computed, regions };
}

async function captureRef(context, refBase, row) {
  const page = await context.newPage();
  await page.setViewportSize({ width: row.width, height: row.height });
  const driven = await driveRefAgentSection(page, refBase, {
    section: row.section,
    viewMode: row.viewMode,
    dark: row.theme === 'dark',
  });
  if (!driven.ok) throw new Error(`ref_drive:${driven.reason}`);
  if (row.theme === 'dark') {
    const theme = await page.evaluate(() => ({
      dataTheme: document.documentElement.getAttribute('data-theme'),
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
    }));
    if (theme.dataTheme !== 'dark' && theme.colorScheme !== 'dark') {
      throw new Error('ref_theme_not_dark');
    }
  }
  const fullPath = path.join(SHOTS, `${slug(row)}-ref-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  await page.close();
  return { fullPath };
}

async function runBrowserSmoke(context, plat) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const steps = [];
  try {
    await openImplSection(page, plat, 'certificates');
    await setImplViewMode(page, 'cards');
    steps.push('certificates_cards');
    await setImplViewMode(page, 'list');
    steps.push('certificates_list');
    await page.locator('[data-testid="agent-r03-search"]').fill('Parity');
    await page.waitForResponse(
      (r) => r.url().includes('/agent-certificates') && r.status() === 200,
      { timeout: 20_000 },
    );
    steps.push('certificates_search');
    await page.locator('[data-testid="agent-r03-filters-panel"]').click();
    steps.push('filters_open');
    const cb = page.locator('[data-testid="agent-r03-collection-toolbar"] input[type="checkbox"]').first();
    if (await cb.isVisible().catch(() => false)) {
      await cb.check();
      steps.push('selection');
    }
    await openImplSection(page, plat, 'clients');
    await page.getByRole('button', { name: 'Добавить клиента' }).click();
    await page.getByLabel(/имя/i).fill('Parity Smoke Client');
    await page.getByRole('button', { name: 'Добавить', exact: true }).click();
    await page.getByRole('link', { name: 'Parity Smoke Client' }).waitFor({ timeout: 20_000 });
    steps.push('client_create_open');
    await page.reload({ waitUntil: 'networkidle' });
    steps.push('reload');
  } finally {
    await page.close();
  }
  return steps;
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const failures = [];
  const captures = [];
  const platformSha = gitSha(ROOT);
  const navigatorSha = gitSha(path.resolve(ROOT, '../remcard-navigator'));

  const refServer = await startStaticRefServer(REF_ROOT, REF_PORT);
  const refBase = `http://127.0.0.1:${REF_PORT}`;
  const browser = await chromium.launch({ headless: true });

  let smokeSteps = [];
  try {
    const boot = await bootstrapAdminAgentSession(browser);
    const { plat, context, storagePath, cookieHeader, userId } = boot;
    await seedUiParityFixtures(plat, cookieHeader, userId);

    const authed = await browser.newContext({ storageState: storagePath });
    smokeSteps = await runBrowserSmoke(authed, plat);
    await authed.close();

    for (const row of [...MAIN_MATRIX, ...SMOKE_MATRIX]) {
      const id = slug(row);
      try {
        const authCtx = await browser.newContext({ storageState: storagePath });
        const impl = await captureImpl(authCtx, plat, boot.cookieHeader, row);
        const refCtx = await browser.newContext();
        const ref = await captureRef(refCtx, refBase, row);
        await authCtx.close();
        await refCtx.close();

        const diffPath = path.join(SHOTS, `${id}-diff.png`);
        const diffStats = writeOverlayDiff(ref.fullPath, impl.fullPath, diffPath);

        captures.push({
          id,
          ...row,
          status: 'CAPTURED',
          implFull: impl.fullPath,
          refFull: ref.fullPath,
          diff: diffPath,
          diffStats,
          computed: impl.computed,
          regions: impl.regions,
        });
      } catch (err) {
        failures.push(`${id}:${err.message || err}`);
        captures.push({ id, ...row, status: 'FAILED', error: String(err) });
      }
    }
  } finally {
    await browser.close();
    refServer.close();
  }

  const ok = failures.length === 0 && captures.every((c) => c.status === 'CAPTURED');
  const capturesJson = {
    capturedAt: new Date().toISOString(),
    platformSha,
    navigatorSha,
    ok,
    failures,
    captures,
    smokeSteps,
  };
  writeFileSync(path.join(SHOTS, 'captures.json'), JSON.stringify(capturesJson, null, 2));
  writeFileSync(
    path.join(ART, 'TEST-RESULTS.json'),
    JSON.stringify(
      {
        platformSha,
        navigatorSha,
        build: { command: 'npm run build', status: 'see_ci_or_local' },
        vitest: ['certificateOffers.test.ts', 'formatDiscountPercent.test.ts', 'sections.test.ts'],
        visualRunner: { script: 'scripts/r03-ui-parity-visual.mjs', ok, failures, captureCount: captures.length },
        browserSmoke: smokeSteps,
      },
      null,
      2,
    ),
  );

  console.log(JSON.stringify({ ok, failures, art: ART, captures: captures.length }, null, 2));
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
