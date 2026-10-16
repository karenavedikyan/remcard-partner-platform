#!/usr/bin/env node
/**
 * R03 UI parity: authenticated impl captures, reference pairs, computed checks, overlays.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const CORRECTIVE_MATRIX = [
  ...MAIN_MATRIX.filter((r) => r.width === 375),
  ...MAIN_MATRIX.filter((r) => r.section === 'clients' && r.viewMode === 'list' && r.width === 1440),
  ...SMOKE_MATRIX,
];

function captureMatrix() {
  if (process.env.R03_CORRECTIVE_CAPTURE === '1') return CORRECTIVE_MATRIX;
  return [...MAIN_MATRIX, ...SMOKE_MATRIX];
}

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

async function applyImplCaptureStyles(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-nextjs-toast],
      #webpack-dev-server-client-overlay,
      [data-nextjs-dialog-overlay] { display: none !important; }
    `,
  });
}

async function stabilizePageForCapture(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => Math.abs(window.scrollY) < 2, undefined, { timeout: 5000 }).catch(() => null);
  await page.waitForLoadState('networkidle').catch(() => null);
}

async function captureRegion(page, locator, outPath) {
  if (!(await locator.isVisible().catch(() => false))) return null;
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const y = window.scrollY;
    window.scrollTo(0, y);
  });
  await locator.screenshot({ path: outPath });
  return outPath;
}

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function measureImplComputed(page, section, viewMode) {
  return page.evaluate(({ section, viewMode }) => {
    function rectsOverlap(a, b) {
      if (!a || !b) return false;
      return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    }

    const nav = document.querySelector(`[data-testid="nav-${section}"] svg`);
    const navBox = nav?.getBoundingClientRect();
    const cardsGrid = document.querySelector('[data-testid="agent-r03-cards-grid"]');
    const gridStyle = cardsGrid ? getComputedStyle(cardsGrid) : null;
    const activeView = document.querySelector('[data-testid="agent-r03-view-toggle"] button[aria-pressed="true"]');
    const toolbar = document.querySelector('[data-testid="agent-r03-collection-toolbar"]');
    const pagination = document.querySelector('[data-testid="agent-r03-pagination"]');
    const terms = document.querySelector('[data-testid="agent-cert-terms"]');
    const linkMore = document.querySelector('[data-testid="agent-cert-more"]');
    const moreColor = linkMore ? getComputedStyle(linkMore).color : null;
    const vw = window.innerWidth;
    const isMobile = vw <= 680;
    const gridCols = gridStyle?.gridTemplateColumns?.trim() ?? null;
    const gridTrackCount = gridCols ? gridCols.split(' ').filter(Boolean).length : 0;

    let statusActionOverlap = false;
    let actionClip = false;
    const clientRow = document.querySelector('[data-testid="agent-r03-capture-body"] tbody tr');
    if (clientRow && vw >= 681) {
      const pill = clientRow.querySelector('[class*="purchasePill"]');
      const pillBox = pill?.getBoundingClientRect();
      const actionBtns = clientRow.querySelectorAll('[class*="certificateListAction"]');
      for (const btn of actionBtns) {
        const box = btn.getBoundingClientRect();
        if (rectsOverlap(pillBox, box)) statusActionOverlap = true;
        const rowBox = clientRow.getBoundingClientRect();
        if (box.right > rowBox.right + 1 || box.left < rowBox.left - 1) actionClip = true;
      }
    }

    const cardsColumnOk =
      viewMode !== 'cards'
        ? true
        : isMobile
          ? gridTrackCount === 1
          : gridTrackCount === 2;

    return {
      navIconWidth: navBox?.width ?? null,
      navIconHeight: navBox?.height ?? null,
      cardsGridColumns: gridCols,
      cardsGridTrackCount: gridTrackCount,
      cardsColumnOk,
      activeViewLabel: activeView?.textContent?.trim() ?? null,
      toolbarVisible: Boolean(toolbar),
      paginationRect: pagination?.getBoundingClientRect() ?? null,
      termsPresent: Boolean(terms),
      moreLinkColor: moreColor,
      statusActionOverlap,
      actionClip,
      section,
      viewMode,
      viewportWidth: vw,
    };
  }, { section, viewMode });
}

function assertComputedGeometry(computed, row) {
  if (computed.activeViewLabel !== (row.viewMode === 'list' ? 'Список' : 'Карточки')) {
    throw new Error(`view_mode_not_active:${computed.activeViewLabel}`);
  }
  if (row.viewMode === 'cards' && !computed.cardsColumnOk) {
    throw new Error(`cards_grid_columns:${computed.cardsGridColumns}`);
  }
  if (row.section === 'clients' && row.viewMode === 'list' && row.width >= 681) {
    if (computed.statusActionOverlap) throw new Error('client_status_action_overlap');
    if (computed.actionClip) throw new Error('client_action_clip');
  }
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
  await applyImplCaptureStyles(page);
  await stabilizePageForCapture(page);

  const computed = await measureImplComputed(page, row.section, row.viewMode);
  assertComputedGeometry(computed, row);

  const id = slug(row);
  const fullPath = path.join(SHOTS, `${id}-impl-full.png`);
  await stabilizePageForCapture(page);
  await page.screenshot({ path: fullPath, fullPage: true });

  const regions = {};
  regions.content = await captureRegion(
    page,
    page.locator('[data-testid="agent-r03-capture-body"]'),
    path.join(SHOTS, `${id}-impl-content.png`),
  );
  regions.toolbar = await captureRegion(
    page,
    page.locator('[data-testid="agent-r03-collection-toolbar"]'),
    path.join(SHOTS, `${id}-impl-toolbar.png`),
  );
  regions.pagination = await captureRegion(
    page,
    page.locator('[data-testid="agent-r03-pagination"]'),
    path.join(SHOTS, `${id}-impl-pagination.png`),
  );
  if (row.viewMode === 'cards' && row.section === 'certificates') {
    regions.certCard = await captureRegion(
      page,
      page.locator('[data-testid="agent-cert-card-shell"]').first(),
      path.join(SHOTS, `${id}-impl-cert-card.png`),
    );
  }
  if (row.section === 'clients' && row.viewMode === 'list') {
    regions.clientRow = await captureRegion(
      page,
      page.locator('[data-testid="agent-r03-capture-body"] tbody tr').first(),
      path.join(SHOTS, `${id}-impl-client-row.png`),
    );
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
  await stabilizePageForCapture(page);
  const id = slug(row);
  const fullPath = path.join(SHOTS, `${id}-ref-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });

  const regions = {};
  regions.content = await captureRegion(
    page,
    page.locator('.collection-tools').first().locator('xpath=..'),
    path.join(SHOTS, `${id}-ref-content.png`),
  );
  regions.toolbar = await captureRegion(
    page,
    page.locator('.collection-tools').first(),
    path.join(SHOTS, `${id}-ref-toolbar.png`),
  );
  regions.pagination = await captureRegion(
    page,
    page.locator('.collection-footer').first(),
    path.join(SHOTS, `${id}-ref-pagination.png`),
  );
  if (row.viewMode === 'cards' && row.section === 'certificates') {
    regions.certCard = await captureRegion(
      page,
      page.locator('.collection-card-shell, .link-card.remcard-certificate').first(),
      path.join(SHOTS, `${id}-ref-cert-card.png`),
    );
  }
  if (row.section === 'clients' && row.viewMode === 'list') {
    regions.clientRow = await captureRegion(
      page,
      page.locator('.collection-table tbody tr').first(),
      path.join(SHOTS, `${id}-ref-client-row.png`),
    );
  }

  await page.close();
  return { fullPath, regions };
}

async function runBrowserSmoke(context, plat) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const steps = [];
  try {
    await openImplSection(page, plat, 'certificates');
    await setImplViewMode(page, 'cards');
    steps.push('certificates_cards');
    const terms = page.locator('[data-testid="agent-cert-terms"]').first();
    if (await terms.isVisible().catch(() => false)) {
      await terms.locator('summary').click();
      await page.waitForTimeout(200);
      steps.push('cert_terms_open');
    }
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
    await setImplViewMode(page, 'list');
    await page.getByRole('button', { name: 'Добавить клиента' }).click();
    await page.getByLabel(/имя/i).fill('Parity Smoke Client');
    await page.getByRole('button', { name: 'Добавить', exact: true }).click();
    await page.getByRole('link', { name: 'Parity Smoke Client' }).waitFor({ timeout: 20_000 });
    steps.push('client_create_open');
    const smokeRow = page.locator('tr').filter({ hasText: 'Parity Smoke Client' }).first();
    await smokeRow.getByLabel('Редактировать').click();
    await page.getByLabel(/имя/i).fill('Parity Smoke Renamed');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await page.getByRole('link', { name: 'Parity Smoke Renamed' }).waitFor({ timeout: 20_000 });
    steps.push('client_rename');
    const archiveBtn = page
      .locator('tr')
      .filter({ hasText: 'Parity Smoke Renamed' })
      .first()
      .getByRole('button', { name: 'В архив' });
    if (await archiveBtn.isVisible().catch(() => false)) {
      await archiveBtn.click();
      steps.push('client_archive');
      await page.getByLabel(/показывать/i).selectOption('archived');
      await page.waitForResponse(
        (r) => r.url().includes('/agent-clients') && r.status() === 200,
        { timeout: 20_000 },
      );
      const restoreBtn = page.getByRole('button', { name: 'Восстановить' }).first();
      if (await restoreBtn.isVisible().catch(() => false)) {
        await restoreBtn.click();
        steps.push('client_restore');
      }
    }
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

    const rowsToCapture = captureMatrix();
    const corrective = process.env.R03_CORRECTIVE_CAPTURE === '1';
    const capturesPath = path.join(SHOTS, 'captures.json');
    let carriedCaptures = [];
    if (corrective && existsSync(capturesPath)) {
      const prev = JSON.parse(readFileSync(capturesPath, 'utf8'));
      const replaceIds = new Set(rowsToCapture.map((r) => slug(r)));
      carriedCaptures = (prev.captures ?? []).filter((c) => !replaceIds.has(c.id));
    }

    for (const row of rowsToCapture) {
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
        const regionDiffs = {};
        for (const key of ['content', 'toolbar', 'pagination', 'certCard', 'clientRow']) {
          const implPath = impl.regions?.[key];
          const refPath = ref.regions?.[key];
          if (implPath && refPath) {
            const regionDiffPath = path.join(SHOTS, `${id}-diff-${key}.png`);
            regionDiffs[key] = {
              impl: implPath,
              ref: refPath,
              diff: regionDiffPath,
              stats: writeOverlayDiff(refPath, implPath, regionDiffPath),
            };
          }
        }

        captures.push({
          id,
          ...row,
          status: 'CAPTURED',
          implFull: impl.fullPath,
          refFull: ref.fullPath,
          diff: diffPath,
          diffStats,
          computed: impl.computed,
          regions: { impl: impl.regions, ref: ref.regions, diffs: regionDiffs },
        });
      } catch (err) {
        failures.push(`${id}:${err.message || err}`);
        captures.push({ id, ...row, status: 'FAILED', error: String(err) });
      }
    }

    captures.unshift(...carriedCaptures);

    const authed = await browser.newContext({ storageState: storagePath });
    smokeSteps = await runBrowserSmoke(authed, plat);
    await authed.close();
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
        vitest: [
          'certificateOffers.test.ts',
          'formatDiscountPercent.test.ts',
          'clientListRow.test.ts',
          'sections.test.ts',
        ],
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
