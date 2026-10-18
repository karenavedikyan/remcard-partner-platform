#!/usr/bin/env node
/** Catalog wizard — 375 light/dark + 320 light impl/ref (TAIL-01.3 provenance-safe). */
import { createHash } from 'node:crypto';
import { execSync, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { gitRevParse, loadRunMeta, probeRunStack, writeJson } from './lib/r06-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';
const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist/screenshots');
const REF_SHA = process.env.R06_REFERENCE_SHA ?? '771cc658a415a5d05b964f29f675d32db449198b';
const PROTO_DIR = process.env.R06_PROTO_DIR ?? '/tmp/r06-prototype-ref';
const PROTO_PORT = Number(process.env.R06_PROTO_PORT ?? '3199');
const PROTO_BASE = `http://127.0.0.1:${PROTO_PORT}`;
const LAYOUT_CODE_SHA =
  process.env.R06_LAYOUT_CODE_SHA ?? '11f512e44406d243261f7bfdd7c1d5d90f6494d9';

const SPECS = [
  { width: 375, height: 812, theme: 'light' },
  { width: 375, height: 812, theme: 'dark' },
  { width: 320, height: 568, theme: 'light' },
];

function sha256File(filePath) {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

function loadEnv(envPath) {
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function mint(env) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', 'mint'], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error('mint failed');
  return (res.stdout || '').trim();
}

async function preparePrototype() {
  mkdirSync(PROTO_DIR, { recursive: true });
  execSync(
    `git -C "${NAV_ROOT}" archive ${REF_SHA} docs/reference/registration-20261017 | tar -x -C "${PROTO_DIR}"`,
    { stdio: 'pipe' },
  );
  return path.join(PROTO_DIR, 'docs/reference/registration-20261017');
}

async function startProto(root) {
  const proc = spawn('python3', ['-m', 'http.server', String(PROTO_PORT)], {
    cwd: root,
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${PROTO_BASE}/`);
      if (res.ok) return proc;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('prototype_server_timeout');
}

async function applyAppTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('remcard-theme', t);
    } catch {
      /* ignore */
    }
  }, theme);
}

function parseRgbLuminance(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

async function assertCatalogTheme(page, theme) {
  await page.waitForFunction(
    (expected) => document.documentElement.getAttribute('data-theme') === expected,
    theme,
    { timeout: 15_000 },
  );
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const bcs = getComputedStyle(body);
    const wizard = document.querySelector('[data-testid="specialist-catalog-wizard"]');
    const wcs = wizard ? getComputedStyle(wizard) : bcs;
    return {
      datasetTheme: root.getAttribute('data-theme'),
      bodyBackground: bcs.backgroundColor,
      bodyColor: bcs.color,
      wizardBackground: wcs.backgroundColor,
    };
  });
  const lum = parseRgbLuminance(metrics.bodyBackground);
  if (theme === 'dark' && lum !== null && lum > 0.45) {
    throw new Error(`theme_assert_dark_failed:luminance=${lum}:${metrics.bodyBackground}`);
  }
  if (theme === 'light' && lum !== null && lum < 0.55) {
    throw new Error(`theme_assert_light_failed:luminance=${lum}:${metrics.bodyBackground}`);
  }
  return metrics;
}

async function bootRefCabinetSpecialist(page) {
  await page.goto(`${PROTO_BASE}/roles.html`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Загружаем прототип'),
    undefined,
    { timeout: 60_000 },
  );
  await page.evaluate(() => {
    document.querySelector('[data-action="view:cabinet"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const sel = document.querySelector('[data-control="role"], [data-testid="scenario-role"]');
    if (sel instanceof HTMLSelectElement) {
      sel.value = 'specialist';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.evaluate(() => {
    document.querySelector('[data-action="nav:profile"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });
  await page.waitForSelector('.production-profile, [data-profile-form="working"]', {
    timeout: 60_000,
  });
}

async function openRefCatalogProfile(page) {
  await bootRefCabinetSpecialist(page);
  const catalogTab = page
    .locator('[data-profile-action="tab"], [role="tab"]')
    .filter({ hasText: /Каталог/i })
    .first();
  if (await catalogTab.count()) await catalogTab.click();
  await page.waitForSelector('[data-profile-step="catalog"]', { timeout: 60_000 });
}

async function shotImpl(browser, { width, height, theme, implBase, token }) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
  });
  await context.addCookies([
    {
      name: 'remcard-token',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const page = await context.newPage();
  await page.addInitScript((t) => {
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem('remcard-theme', t);
    } catch {
      /* ignore */
    }
  }, theme);
  await page.goto(`${implBase}/profile?section=catalog`, { waitUntil: 'load', timeout: 120_000 });
  await page.waitForSelector('[data-testid="specialist-catalog-wizard"]', { timeout: 120_000 });
  await applyAppTheme(page, theme);
  await page.waitForTimeout(400);
  const themeMetrics = await assertCatalogTheme(page, theme);
  const viewport = page.viewportSize();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const name = 'profile-catalog-wizard';
  const implPath = path.join(OUT, `${name}-impl-${width}-${theme}.png`);
  await page.screenshot({ path: implPath, fullPage: true });
  await context.close();
  return { implPath, themeMetrics, viewport };
}

async function shotRef(browser, { width, height, theme }) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.addInitScript((t) => {
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem('remcard-theme', t);
    } catch {
      /* ignore */
    }
  }, theme);
  await applyAppTheme(page, theme);
  await openRefCatalogProfile(page);
  await applyAppTheme(page, theme);
  await page.waitForTimeout(400);
  const refThemeMetrics = await assertCatalogTheme(page, theme).catch(async (e) => {
    const soft = await page.evaluate(() => ({
      datasetTheme: document.documentElement.getAttribute('data-theme'),
      bodyBackground: getComputedStyle(document.body).backgroundColor,
    }));
    if (soft.datasetTheme !== theme) throw e;
    return soft;
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  const name = 'profile-catalog-wizard';
  const refPath = path.join(OUT, `${name}-ref-${width}-${theme}.png`);
  await page.screenshot({ path: refPath, fullPage: true });
  await context.close();
  return { refPath, themeMetrics: refThemeMetrics };
}

async function main() {
  const expectNavigatorSha =
    process.env.R06_EXPECT_NAV_SHA || gitRevParse(NAV_ROOT);
  const expectPlatformCodeSha = process.env.R06_EXPECT_PLATFORM_CODE_SHA || LAYOUT_CODE_SHA;
  const { report: probeReport } = await probeRunStack({
    runDir: RUN_DIR,
    navRoot: NAV_ROOT,
    platRoot: ROOT,
    expectNavigatorSha,
    expectPlatformCodeSha,
  });

  const meta = loadRunMeta(RUN_DIR);
  const env = loadEnv(meta.envPath);
  const implBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', 'reset-e2e'], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });

  const refRoot = await preparePrototype();
  const protoProc = await startProto(refRoot);
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const token = mint(env);
  const captures = [];
  for (const spec of SPECS) {
    const impl = await shotImpl(browser, { ...spec, implBase, token });
    const ref = await shotRef(browser, spec);
    const implStat = statSync(impl.implPath);
    const refStat = statSync(ref.refPath);
    captures.push({
      name: 'profile-catalog-wizard',
      width: spec.width,
      height: spec.height,
      theme: spec.theme,
      implPath: impl.implPath,
      refPath: ref.refPath,
      implSha256: sha256File(impl.implPath),
      refSha256: sha256File(ref.refPath),
      implBytes: implStat.size,
      refBytes: refStat.size,
      themeMetrics: impl.themeMetrics,
      viewport: impl.viewport,
    });
  }
  await browser.close();
  protoProc.kill('SIGTERM');

  const runnerHead = gitRevParse(ROOT);
  const manifestPath = path.join(OUT, 'manifest-tail-01.3-catalog.json');
  writeJson(manifestPath, {
    task: 'R06-SPECIALIST-TAIL-01.3',
    referenceSha: REF_SHA,
    capturedAt: new Date().toISOString(),
    runDir: RUN_DIR,
    probeReportPath: path.join(RUN_DIR, 'probe-report.json'),
    provenance: {
      platformApplicationCodeSha: probeReport.runtime.platformApplicationCodeSha,
      platformBuiltGitHead: probeReport.runtime.platformBuiltGitHead,
      navigatorGitHead: probeReport.runtime.navigatorGitHead,
      platformBuildId: probeReport.runtime.platformBuildId,
      navigatorBuildId: probeReport.runtime.navigatorBuildId,
      runnerEvidenceGitHead: runnerHead,
      layoutCodeShaExpected: LAYOUT_CODE_SHA,
    },
    captures,
  });
  console.log(JSON.stringify({ ok: true, manifestPath, count: captures.length, captures: captures.map((c) => ({ theme: c.theme, width: c.width, implSha256: c.implSha256 })) }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
