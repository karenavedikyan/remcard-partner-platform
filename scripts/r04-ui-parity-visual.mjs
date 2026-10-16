#!/usr/bin/env node
/**
 * R04 partners UI: impl/ref captures + geometry bounds for acceptance matrix.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  bootstrapAdminAgentSession,
  ensurePageTheme,
  startStaticRefServer,
  ROOT,
} from './lib/r03-stack-bootstrap.mjs';
import { driveRefAgentPartners, openImplR04Panel, setImplR04ViewMode } from './lib/r04-prototype-ref.mjs';

const ART = path.join(ROOT, 'artifacts/remcard-r04');
const SHOTS = path.join(ART, 'screenshots');
const REF_ROOT =
  process.env.R04_REFERENCE_ROOT ||
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';
const REF_PORT = Number(process.env.R04_REF_STATIC_PORT || 8774);

const MATRIX = [
  { id: 'P1', panel: 'list', viewMode: 'list', width: 1440, height: 900, theme: 'light' },
  { id: 'P2', panel: 'list', viewMode: 'cards', width: 1440, height: 900, theme: 'light' },
  { id: 'P3', panel: 'find', viewMode: 'list', width: 1440, height: 900, theme: 'light' },
  { id: 'P4', panel: 'invitations', viewMode: 'list', width: 1440, height: 900, theme: 'light' },
  { id: 'P5', panel: 'list', viewMode: 'list', width: 375, height: 812, theme: 'light' },
  { id: 'P6', panel: 'find', viewMode: 'list', width: 375, height: 812, theme: 'light' },
  { id: 'P7', panel: 'list', viewMode: 'list', width: 1440, height: 900, theme: 'dark' },
  { id: 'P8', panel: 'list', viewMode: 'cards', width: 1440, height: 900, theme: 'dark' },
  { id: 'P9', panel: 'list', viewMode: 'list', width: 320, height: 700, theme: 'light', smoke: true },
];

async function measureGeometry(page) {
  return page.evaluate(() => {
    const toolbar = document.querySelector('[data-testid="agent-r04-list-toolbar"]');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const vw = window.innerWidth;
    const clipOk = (r) => r && r.x >= -1 && r.y >= -1 && r.x + r.w <= vw + 1;
    const listTable = document.querySelector('[data-testid="agent-r04-partners-list"] table');
    const cardGrid = document.querySelector('[data-testid="agent-r04-partners-cards"]');
    const modal = document.querySelector('[data-testid="agent-partner-hub-modal"]');
    return {
      toolbar: rect(toolbar),
      listRoot: rect(document.querySelector('[data-testid="agent-r04-partners-list"], [data-testid="agent-r04-partners-cards"]')),
      listTable: rect(listTable),
      cardGrid: rect(cardGrid),
      modal: rect(modal),
      toolbarClipped: toolbar ? !clipOk(rect(toolbar)) : null,
      viewportW: vw,
    };
  });
}

async function captureImpl(page, plat, row) {
  await page.setViewportSize({ width: row.width, height: row.height });
  await page.goto(`${plat}/partners`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.keyboard.press('Escape').catch(() => null);
  await page.waitForTimeout(200);
  await ensurePageTheme(page, row.theme);
  if (row.panel === 'find') {
    await openImplR04Panel(page, 'find', plat);
  } else if (row.panel === 'invitations') {
    await openImplR04Panel(page, 'invitations', plat);
    await page.locator('[data-testid="agent-invites-incoming"]').click().catch(() => null);
    await page.waitForTimeout(300);
  }
  if (row.panel === 'list' && row.viewMode === 'cards') {
    await setImplR04ViewMode(page, 'cards');
  }
  await page.waitForTimeout(400);
  const name = `impl-r04-${row.id}-${row.width}-${row.theme}.png`;
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: !row.smoke });
  const geometry = await measureGeometry(page);
  return { impl: name, geometry };
}

async function captureRef(page, refBase, row) {
  if (row.smoke) return { ref: null, refDrive: { ok: true, skipped: 'smoke' } };
  await page.setViewportSize({ width: row.width, height: row.height });
  const drive = await driveRefAgentPartners(page, refBase, {
    viewMode: row.viewMode,
    segment: row.panel === 'invitations' ? 'invitations' : 'active',
    dark: row.theme === 'dark',
    openFind: row.panel === 'find',
  });
  if (!drive.ok) return { ref: null, refDrive: drive };
  const name = `ref-r04-${row.id}-${row.width}-${row.theme}.png`;
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
  return { ref: name, refDrive: drive };
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const refSrv = await startStaticRefServer(REF_ROOT, REF_PORT);
  const refBase = `http://127.0.0.1:${REF_PORT}`;

  const browser = await chromium.launch({ headless: true });
  const session = await bootstrapAdminAgentSession(browser, {
    agentLabel: `R04 parity ${Date.now()}`,
  });
  session.env.PROF_R04_AGENT_PARTNERS_ENABLED = 'true';

  const refPage = await browser.newPage();
  const rows = [];
  for (const row of MATRIX) {
    const impl = await captureImpl(session.page, session.plat, row);
    const ref = await captureRef(refPage, refBase, row);
    rows.push({ ...row, ...impl, ...ref });
  }

  const extra = [];
  for (const spec of [
    { name: 'impl-r04-inv-incoming-1440-light.png', tab: 'invitations', sub: 'incoming' },
    { name: 'impl-r04-inv-outgoing-1440-light.png', tab: 'invitations', sub: 'outgoing' },
    { name: 'impl-r04-modal-320-light.png', tab: 'find', width: 320, height: 700 },
  ]) {
    await session.page.setViewportSize({
      width: spec.width ?? 1440,
      height: spec.height ?? 900,
    });
    await session.page.goto(`${session.plat}/partners`, { waitUntil: 'networkidle', timeout: 90_000 });
    if (spec.tab === 'invitations') {
      await openImplR04Panel(session.page, 'invitations', session.plat);
      await session.page.locator(`[data-testid="agent-invites-${spec.sub}"]`).click();
      await session.page.waitForTimeout(400);
    } else {
      await openImplR04Panel(session.page, 'find', session.plat);
    }
    await session.page.screenshot({ path: path.join(SHOTS, spec.name), fullPage: !spec.width });
    extra.push(spec.name);
  }

  await session.context.close();
  await refPage.close();
  await browser.close();
  refSrv.close();

  const pairs = rows.filter((r) => r.impl && r.ref).length;
  const report = {
    generatedAt: new Date().toISOString(),
    platformHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
    pairs,
    matrixRows: rows.length,
    extraCaptures: extra,
    rows,
    visualParityOk: false,
    visualReviewNote:
      'Automated pairs/geometry only; composition vs ref requires human review — not 1:1 PASS.',
    pass: pairs >= 8 && rows.every((r) => !r.geometry?.toolbarClipped),
  };
  writeFileSync(path.join(ART, 'PARITY-VISUAL.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
