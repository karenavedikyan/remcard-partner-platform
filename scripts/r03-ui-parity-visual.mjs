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
import { PARITY_MATCH } from './lib/r03-parity-fixture.mjs';
import {
  assertImplMatchedCertificate,
  assertImplMatchedClient,
  assertRefMatchedCertificate,
  assertRefMatchedClient,
  measureMobileListFooterRow,
  measureCertCardShellClip,
  parityCertCardLocator,
  parityClientDesktopRowLocator,
  parityClientMobileRowLocator,
} from './lib/r03-parity-match.mjs';

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
  { section: 'certificates', viewMode: 'cards', theme: 'light', width: 320, height: 812, kind: 'cards320' },
  { section: 'clients', viewMode: 'cards', theme: 'light', width: 320, height: 812, kind: 'cards320' },
];

const CORRECTIVE_MATRIX = [
  ...MAIN_MATRIX.filter((r) => r.width === 375),
  ...MAIN_MATRIX.filter((r) => r.section === 'clients' && r.viewMode === 'list' && r.width === 1440),
  ...SMOKE_MATRIX,
];

const MATCHED_PAIR_ROWS = [
  {
    section: 'certificates',
    viewMode: 'cards',
    theme: 'light',
    width: 1440,
    height: 900,
    kind: 'matched',
    refSearchQuery: PARITY_MATCH.certSearch,
  },
  {
    section: 'certificates',
    viewMode: 'cards',
    theme: 'dark',
    width: 1440,
    height: 900,
    kind: 'matched',
    refSearchQuery: PARITY_MATCH.certSearch,
  },
  {
    section: 'certificates',
    viewMode: 'cards',
    theme: 'light',
    width: 375,
    height: 812,
    kind: 'matched',
    refSearchQuery: PARITY_MATCH.certSearch,
  },
  {
    section: 'certificates',
    viewMode: 'cards',
    theme: 'dark',
    width: 375,
    height: 812,
    kind: 'matched',
    refSearchQuery: PARITY_MATCH.certSearch,
  },
  {
    section: 'clients',
    viewMode: 'list',
    theme: 'light',
    width: 1440,
    height: 900,
    kind: 'matched',
    searchQuery: PARITY_MATCH.clientSearch,
  },
  {
    section: 'clients',
    viewMode: 'list',
    theme: 'dark',
    width: 1440,
    height: 900,
    kind: 'matched',
    searchQuery: PARITY_MATCH.clientSearch,
  },
  {
    section: 'clients',
    viewMode: 'list',
    theme: 'light',
    width: 375,
    height: 812,
    kind: 'matched',
    searchQuery: PARITY_MATCH.clientSearch,
  },
  {
    section: 'clients',
    viewMode: 'list',
    theme: 'dark',
    width: 375,
    height: 812,
    kind: 'matched',
    searchQuery: PARITY_MATCH.clientSearch,
  },
];

const DELTA_MATRIX = [
  ...MAIN_MATRIX.filter((r) => r.width === 375),
  ...SMOKE_MATRIX.filter((r) => r.kind === 'cards320'),
  ...MATCHED_PAIR_ROWS.filter((r) => r.width === 375),
];

const VIEWPORT_MATRIX = [
  { section: 'certificates', viewMode: 'cards', theme: 'light', width: 375, height: 812, scroll: 'top', kind: 'viewport' },
  {
    section: 'certificates',
    viewMode: 'cards',
    theme: 'light',
    width: 375,
    height: 812,
    scroll: 'toolbar',
    kind: 'viewport',
  },
  { section: 'clients', viewMode: 'list', theme: 'light', width: 375, height: 812, scroll: 'top', kind: 'viewport' },
  {
    section: 'clients',
    viewMode: 'list',
    theme: 'light',
    width: 375,
    height: 812,
    scroll: 'toolbar',
    kind: 'viewport',
  },
  { section: 'certificates', viewMode: 'cards', theme: 'light', width: 320, height: 812, scroll: 'top', kind: 'viewport' },
  {
    section: 'certificates',
    viewMode: 'cards',
    theme: 'light',
    width: 320,
    height: 812,
    scroll: 'toolbar',
    kind: 'viewport',
  },
  { section: 'clients', viewMode: 'list', theme: 'light', width: 320, height: 812, scroll: 'top', kind: 'viewport' },
  {
    section: 'clients',
    viewMode: 'list',
    theme: 'light',
    width: 320,
    height: 812,
    scroll: 'toolbar',
    kind: 'viewport',
  },
];

const TAIL_MATRIX = [
  ...SMOKE_MATRIX,
  ...MATCHED_PAIR_ROWS,
  ...VIEWPORT_MATRIX.filter((r) => r.width === 320),
];

const CERT_CARD_CLIP_MATRIX = [
  ...MATCHED_PAIR_ROWS.filter((r) => r.section === 'certificates' && r.viewMode === 'cards'),
  SMOKE_MATRIX.find((r) => r.section === 'certificates' && r.kind === 'cards320'),
  VIEWPORT_MATRIX.find(
    (r) => r.section === 'certificates' && r.viewMode === 'cards' && r.width === 320 && r.scroll === 'top',
  ),
].filter(Boolean);

function captureMatrix() {
  if (process.env.R03_PARITY_CERT_CLIP_CAPTURE === '1') {
    return CERT_CARD_CLIP_MATRIX;
  }
  if (process.env.R03_PARITY_TAIL_CAPTURE === '1') {
    return TAIL_MATRIX;
  }
  if (process.env.R03_DELTA_CAPTURE === '1') {
    return [...DELTA_MATRIX, ...VIEWPORT_MATRIX];
  }
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

function gitDirty(cwd) {
  try {
    const out = execSync('git status --porcelain', { cwd, encoding: 'utf8' }).trim();
    return out.length > 0;
  } catch {
    return null;
  }
}

function preservedStepsFromExistingResults() {
  try {
    const existing = JSON.parse(
      readFileSync(path.join(ART, 'TEST-RESULTS.json'), 'utf8'),
    );
    return (existing.steps ?? []).filter(
      (step) =>
        typeof step?.cmd === 'string' &&
        (step.cmd.includes('npm run build') || step.cmd.includes('next build')),
    );
  } catch {
    return [];
  }
}

function runTailVerificationSteps() {
  const steps = [...preservedStepsFromExistingResults()];
  const vitestCmd =
    'npx vitest run src/lib/agent-r03/certificatePurchaseStatus.test.ts src/lib/agent-r03/clientListRow.test.ts src/lib/agent-r03/certificateOffers.test.ts src/lib/agent-r03/formatDiscountPercent.test.ts src/components/agent-r03/RecordRowActions.test.tsx src/lib/profile-sections.test.ts';
  try {
    const out = execSync(vitestCmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const testsPassed = Number((out.match(/Tests\s+(\d+) passed/) ?? [])[1] ?? 0);
    const testFiles = Number((out.match(/Test Files\s+(\d+) passed/) ?? [])[1] ?? 0);
    steps.push({ cmd: vitestCmd, exitCode: 0, testFiles, testsPassed });
  } catch (err) {
    steps.push({
      cmd: vitestCmd,
      exitCode: err.status ?? 1,
      stderr: String(err.stderr ?? err.stdout ?? '').slice(0, 400),
    });
  }
  return steps;
}

function slug(row) {
  const kindSuffix =
    row.kind === 'main'
      ? ''
      : row.kind === 'smoke320'
        ? '-smoke320'
        : row.kind === 'cards320'
          ? '-cards320'
          : row.kind === 'matched'
            ? '-matched'
            : row.kind === 'viewport'
              ? `-viewport-${row.scroll}`
              : `-${row.kind}`;
  return `${row.section}-${row.viewMode}-${row.theme}-${row.width}x${row.height}${kindSuffix}`;
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

async function captureRegion(page, locator, outPath, opts = {}) {
  if (!(await locator.isVisible().catch(() => false))) return null;
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  if (opts.avoidStickyTopbar) {
    const topbarHeight = await page.evaluate(
      () => document.querySelector('[data-testid="agent-product-topbar"]')?.getBoundingClientRect().height ?? 72,
    );
    await locator.evaluate((el, offset) => {
      const rect = el.getBoundingClientRect();
      const y = rect.top + window.scrollY - offset - 8;
      window.scrollTo(0, Math.max(0, y));
    }, topbarHeight);
    await page.waitForTimeout(150);
  } else {
    await page.evaluate(() => {
      const y = window.scrollY;
      window.scrollTo(0, y);
    });
  }
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

    const searchInput = document.querySelector('[data-testid="agent-r03-search"]');
    const showSelect = document.querySelector('[data-testid="agent-r03-show-filter"]');
    const viewToggle = document.querySelector('[data-testid="agent-r03-view-toggle"]');
    const searchBox = searchInput?.getBoundingClientRect();
    const showBox = showSelect?.getBoundingClientRect();
    const viewBox = viewToggle?.getBoundingClientRect();
    const filtersPanel = document.querySelector('[data-testid="agent-r03-filters-panel"]');
    const filtersBox = filtersPanel?.getBoundingClientRect();

    let toolbarRowOk = true;
    if (isMobile && searchBox && showBox && viewBox) {
      const searchOwnRow = searchBox.bottom <= showBox.top + 4;
      const showViewSameRow = Math.abs(showBox.top - viewBox.top) <= 6;
      const filtersBelow =
        !filtersBox || filtersBox.top >= Math.max(showBox.bottom, viewBox.bottom) - 2;
      toolbarRowOk = searchOwnRow && showViewSameRow && filtersBelow;
    }

    const bottomNav = document.querySelector('nav[aria-label="Мобильная навигация"]');
    const bottomNavBox = bottomNav?.getBoundingClientRect();
    const vh = window.innerHeight;
    const bottomNavPinned =
      bottomNavBox != null && Math.abs(bottomNavBox.bottom - vh) <= 4 && bottomNavBox.top < vh;

    const searchAccessible =
      searchBox != null &&
      searchBox.top >= 0 &&
      searchBox.bottom <= vh &&
      searchBox.width > 40;

    return {
      navIconWidth: navBox?.width ?? null,
      navIconHeight: navBox?.height ?? null,
      cardsGridColumns: gridCols,
      cardsGridTrackCount: gridTrackCount,
      cardsColumnOk,
      activeViewLabel: activeView?.textContent?.trim() ?? null,
      toolbarVisible: Boolean(toolbar),
      toolbarRowOk,
      bottomNavPinned,
      searchAccessible,
      scrollY: window.scrollY,
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
  if (row.width <= 680 && row.kind !== 'viewport' && computed.toolbarRowOk === false) {
    throw new Error('mobile_toolbar_layout');
  }
  if (row.kind === 'viewport') {
    if (!computed.bottomNavPinned) throw new Error('bottom_nav_not_pinned');
    if (row.scroll === 'toolbar' && !computed.searchAccessible) {
      throw new Error('search_not_accessible_after_scroll');
    }
  }
}

async function applyImplSearch(page, query) {
  const search = page.locator('[data-testid="agent-r03-search"]');
  await search.fill(query);
  await page.waitForResponse(
    (r) =>
      (r.url().includes('/agent-certificates') || r.url().includes('/agent-clients')) &&
      r.request().method() === 'GET' &&
      r.status() === 200,
    { timeout: 25_000 },
  ).catch(() => null);
  await page.waitForTimeout(200);
}

async function scrollForViewportCapture(page, scrollMode) {
  if (scrollMode === 'top') {
    await page.evaluate(() => window.scrollTo(0, 0));
  } else if (scrollMode === 'toolbar') {
    await page.locator('[data-testid="agent-r03-collection-toolbar"]').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const toolbar = document.querySelector('[data-testid="agent-r03-collection-toolbar"]');
      if (toolbar instanceof HTMLElement) {
        const y = toolbar.getBoundingClientRect().top + window.scrollY - 8;
        window.scrollTo(0, Math.max(0, y));
      }
    });
  }
  await page.waitForTimeout(250);
}

async function clearAgentR03ViewPrefs(page, origin) {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('remcard.agent-r03.view.')) localStorage.removeItem(key);
    }
  });
}

async function captureImpl(context, plat, cookieHeader, row, parity) {
  const page = await context.newPage();
  await page.setViewportSize({ width: row.width, height: row.height });
  if (row.kind === 'matched') {
    await clearAgentR03ViewPrefs(page, plat);
  }
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
  if (row.kind === 'matched' && row.section === 'certificates') {
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="agent-r03-found-count"]');
      const text = el?.textContent ?? '';
      const n = Number(text.replace(/[^\d]/g, ''));
      return Number.isFinite(n) && n > 0;
    }, { timeout: 45_000 });
  }
  if (row.searchQuery) {
    await applyImplSearch(page, row.implSearchQuery ?? row.searchQuery);
  }
  if (row.kind === 'matched' && row.section === 'certificates' && row.viewMode === 'cards') {
    await page.locator('[data-testid="agent-r03-cards-grid"]').waitFor({ state: 'visible', timeout: 45_000 });
    const parityCard = parity?.certId
      ? page.locator(`[data-parity-cert-id="${parity.certId}"]`)
      : page.locator('[data-testid="agent-cert-card-shell"]').filter({ hasText: PARITY_MATCH.certAlias }).first();
    await parityCard.waitFor({ state: 'visible', timeout: 45_000 });
  }
  if (row.kind === 'matched' && row.section === 'certificates') {
    await assertImplMatchedCertificate(page, parity);
  }
  if (row.kind === 'cards320' && row.section === 'certificates') {
    await applyImplSearch(page, PARITY_MATCH.certSearch);
    await page.locator('[data-testid="agent-r03-cards-grid"]').waitFor({ state: 'visible', timeout: 45_000 });
    await assertImplMatchedCertificate(page, parity);
  }
  let certCardShellClip = null;
  if (row.section === 'certificates' && row.viewMode === 'cards' && row.kind !== 'viewport') {
    certCardShellClip = await measureCertCardShellClip(page, parity?.certId);
    if (!certCardShellClip.ok) {
      throw new Error(`cert_card_shell_clip:${JSON.stringify(certCardShellClip)}`);
    }
  }
  if (row.kind === 'viewport' && row.section === 'certificates' && row.viewMode === 'cards') {
    await applyImplSearch(page, PARITY_MATCH.certSearch);
    await page.locator('[data-testid="agent-r03-cards-grid"]').waitFor({ state: 'visible', timeout: 45_000 });
    certCardShellClip = await measureCertCardShellClip(page, parity?.certId);
    if (!certCardShellClip.ok) {
      throw new Error(`cert_card_shell_clip:${JSON.stringify(certCardShellClip)}`);
    }
  }
  if (row.kind === 'matched' && row.section === 'clients') {
    await assertImplMatchedClient(page, parity, row.viewMode, row.width);
    if (row.width <= 680) {
      const footer = await measureMobileListFooterRow(page, 'agent-client-mobile-row');
      if (!footer.ok) throw new Error(`mobile_client_footer:${JSON.stringify(footer)}`);
    }
  }
  if (
    row.kind === 'matched' &&
    row.section === 'certificates' &&
    row.viewMode === 'list' &&
    row.width <= 680
  ) {
    const footer = await measureMobileListFooterRow(page, 'agent-cert-mobile-row');
    if (!footer.ok) throw new Error(`mobile_cert_footer:${JSON.stringify(footer)}`);
  }
  await applyImplCaptureStyles(page);
  await stabilizePageForCapture(page);

  if (row.kind === 'viewport') {
    await scrollForViewportCapture(page, row.scroll);
  }

  const computed = await measureImplComputed(page, row.section, row.viewMode);
  if (certCardShellClip) computed.certCardShellClip = certCardShellClip;
  assertComputedGeometry(computed, row);

  const id = slug(row);
  let fullPath = null;
  if (row.kind === 'viewport') {
    fullPath = path.join(SHOTS, `${id}-impl-viewport.png`);
    await page.screenshot({ path: fullPath, fullPage: false });
    await page.close();
    return { fullPath, computed, regions: {} };
  }

  fullPath = path.join(SHOTS, `${id}-impl-full.png`);
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
    const certLocator =
      row.kind === 'matched' || row.kind === 'cards320'
        ? parityCertCardLocator(page, parity?.certId)
        : page.locator('[data-testid="agent-cert-card-shell"]').first();
    regions.certCard = await captureRegion(
      page,
      certLocator,
      path.join(SHOTS, `${id}-impl-cert-card.png`),
      { avoidStickyTopbar: row.width >= 900 },
    );
  }
  if (row.section === 'clients' && row.viewMode === 'list') {
    const clientLocator =
      row.kind === 'matched'
        ? row.width <= 680
          ? parityClientMobileRowLocator(page, parity?.clientId)
          : parityClientDesktopRowLocator(page, parity?.clientId)
        : row.width <= 680
          ? page.locator('[data-testid="agent-client-mobile-row"]').first()
          : page.locator('[data-testid="agent-r03-capture-body"] tbody tr').first();
    regions.clientRow = await captureRegion(
      page,
      clientLocator,
      path.join(SHOTS, `${id}-impl-client-row.png`),
      { avoidStickyTopbar: row.width >= 900 },
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
    searchQuery: row.refSearchQuery ?? row.searchQuery,
  });
  if (!driven.ok) throw new Error(`ref_drive:${driven.reason}`);
  if (row.kind === 'matched' && row.section === 'certificates') {
    await assertRefMatchedCertificate(page);
  }
  if (row.kind === 'matched' && row.section === 'clients') {
    await assertRefMatchedClient(page);
  }
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
    const refCertLoc =
      row.kind === 'matched'
        ? page
            .locator('.collection-card-shell, .link-card.remcard-certificate')
            .filter({ hasText: PARITY_MATCH.certAlias })
            .first()
        : page.locator('.collection-card-shell, .link-card.remcard-certificate').first();
    regions.certCard = await captureRegion(page, refCertLoc, path.join(SHOTS, `${id}-ref-cert-card.png`), {
      avoidStickyTopbar: row.kind === 'matched' && row.width >= 900,
    });
  }
  if (row.section === 'clients' && row.viewMode === 'list') {
    const refClientLoc =
      row.kind === 'matched'
        ? page.locator('.collection-table tbody tr').filter({ hasText: PARITY_MATCH.client.displayName }).first()
        : page.locator('.collection-table tbody tr').first();
    regions.clientRow = await captureRegion(page, refClientLoc, path.join(SHOTS, `${id}-ref-client-row.png`), {
      avoidStickyTopbar: row.kind === 'matched' && row.width >= 900,
    });
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
  let verificationSteps = null;
  let parityFixture = null;
  try {
    const boot = await bootstrapAdminAgentSession(browser);
    const { plat, context, storagePath, cookieHeader, userId, partnership, env } = boot;
    const seed = await seedUiParityFixtures(plat, cookieHeader, userId, { partnership, env });
    parityFixture = seed.parity;

    const rowsToCapture = captureMatrix();
    const mergeCarry =
      process.env.R03_CORRECTIVE_CAPTURE === '1' ||
      process.env.R03_DELTA_CAPTURE === '1' ||
      process.env.R03_PARITY_CERT_CLIP_CAPTURE === '1';
    const capturesPath = path.join(SHOTS, 'captures.json');
    let carriedCaptures = [];
    let prevRun = null;
    if (mergeCarry && existsSync(capturesPath)) {
      prevRun = JSON.parse(readFileSync(capturesPath, 'utf8'));
      const replaceIds = new Set(rowsToCapture.map((r) => slug(r)));
      carriedCaptures = (prevRun.captures ?? [])
        .filter((c) => !replaceIds.has(c.id))
        .map((c) => ({
          ...c,
          carryOverFrom: c.carryOverFrom ?? {
            platformSha: c.platformSha ?? prevRun.platformSha,
            capturedAt: c.capturedAt ?? prevRun.capturedAt,
          },
        }));
    }

    const capturedAt = new Date().toISOString();

    for (const row of rowsToCapture) {
      const id = slug(row);
      try {
        const authCtx = await browser.newContext({ storageState: storagePath });
        const impl = await captureImpl(authCtx, plat, boot.cookieHeader, row, parityFixture);
        await authCtx.close();

        if (row.kind === 'viewport') {
          captures.push({
            id,
            ...row,
            status: 'CAPTURED',
            platformSha,
            capturedAt,
            carryOverFrom: null,
            implFull: impl.fullPath,
            computed: impl.computed,
            regions: { impl: impl.regions },
          });
          continue;
        }

        const refCtx = await browser.newContext();
        const ref = await captureRef(refCtx, refBase, row);
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
          platformSha,
          capturedAt,
          carryOverFrom: null,
          implFull: impl.fullPath,
          refFull: ref.fullPath,
          diff: diffPath,
          diffStats,
          computed: impl.computed,
          dataParity:
            row.kind === 'matched'
              ? {
                  note: 'Asserted fixture row (search + field checks) before crop',
                  verified: 'ASSERTED',
                  parityFixture,
                }
              : undefined,
          regions: { impl: impl.regions, ref: ref.regions, diffs: regionDiffs },
        });
      } catch (err) {
        failures.push(`${id}:${err.message || err}`);
        captures.push({
          id,
          ...row,
          status: 'FAILED',
          platformSha,
          capturedAt,
          error: String(err),
        });
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

  if (
    process.env.R03_PARITY_TAIL_CAPTURE === '1' ||
    process.env.R03_PARITY_CERT_CLIP_CAPTURE === '1'
  ) {
    verificationSteps = runTailVerificationSteps();
  }

  const ok = failures.length === 0 && captures.every((c) => c.status === 'CAPTURED');
  const capturedAt = new Date().toISOString();
  const capturesJson = {
    capturedAt,
    platformGitSha: platformSha,
    navigatorGitSha: navigatorSha,
    platformWorkingTreeDirty: gitDirty(ROOT),
    note:
      'platformGitSha is repo HEAD at capture time; local dev stack may serve a working tree without rebuild.',
    ok,
    failures,
    captures,
    smokeSteps,
    verificationSteps,
  };
  writeFileSync(path.join(SHOTS, 'captures.json'), JSON.stringify(capturesJson, null, 2));
  writeFileSync(
    path.join(ART, 'TEST-RESULTS.json'),
    JSON.stringify(
      {
        platformSha: platformSha,
        navigatorSha,
        verifiedAt: capturedAt,
        ok,
        steps: [
          ...(verificationSteps ?? []),
          {
            cmd:
              process.env.R03_PARITY_CERT_CLIP_CAPTURE === '1'
                ? 'R03_PARITY_CERT_CLIP_CAPTURE=1 node scripts/r03-ui-parity-visual.mjs'
                : process.env.R03_PARITY_TAIL_CAPTURE === '1'
                  ? 'R03_PARITY_TAIL_CAPTURE=1 node scripts/r03-ui-parity-visual.mjs'
                  : 'node scripts/r03-ui-parity-visual.mjs',
            exitCode: ok ? 0 : 1,
            captureCount: captures.length,
            failures,
          },
        ],
        visualRunner: {
          script: 'scripts/r03-ui-parity-visual.mjs',
          env:
            process.env.R03_PARITY_CERT_CLIP_CAPTURE === '1'
              ? 'R03_PARITY_CERT_CLIP_CAPTURE=1'
              : process.env.R03_PARITY_TAIL_CAPTURE === '1'
                ? 'R03_PARITY_TAIL_CAPTURE=1'
                : undefined,
          ok,
          failures,
          captureCount: captures.length,
          platformWorkingTreeDirty: gitDirty(ROOT),
        },
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
