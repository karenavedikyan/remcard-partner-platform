#!/usr/bin/env node
/** Catalog wizard only — 375 light/dark + 320 light impl/ref for TAIL-01.2 */
import { execSync, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
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

const SPECS = [
  { width: 375, height: 812, theme: 'light' },
  { width: 375, height: 812, theme: 'dark' },
  { width: 320, height: 568, theme: 'light' },
];

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

async function shotPair(ctx, { width, height, theme, implBase }) {
  const name = 'profile-catalog-wizard';
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height });
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
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const implPath = path.join(OUT, `${name}-impl-${width}-${theme}.png`);
  await page.screenshot({ path: implPath, fullPage: true });

  const refCtx = await ctx.browser().newContext({ viewport: { width, height } });
  const refPage = await refCtx.newPage();
  await refPage.addInitScript((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await openRefCatalogProfile(refPage);
  await refPage.waitForTimeout(300);
  await refPage.evaluate(() => window.scrollTo(0, 0));
  const refPath = path.join(OUT, `${name}-ref-${width}-${theme}.png`);
  await refPage.screenshot({ path: refPath, fullPage: true });
  await refCtx.close();
  await page.close();
  return { name, width, theme, implPath, refPath };
}

async function main() {
  const expectNavigatorSha =
    process.env.R06_EXPECT_NAV_SHA || gitRevParse(NAV_ROOT);
  const expectPlatformCodeSha =
    process.env.R06_EXPECT_PLATFORM_CODE_SHA || gitRevParse(ROOT);
  await probeRunStack({
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
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: 'remcard-token',
      value: mint(env),
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  const captures = [];
  for (const spec of SPECS) {
    captures.push(await shotPair(context, { ...spec, implBase }));
  }
  await browser.close();
  protoProc.kill('SIGTERM');

  const manifestPath = path.join(OUT, 'manifest-tail-01.2-catalog.json');
  writeJson(manifestPath, {
    referenceSha: REF_SHA,
    platformCodeSha: meta.runtime.platform.applicationCodeSha,
    platformBuiltGitHead: meta.runtime.platform.gitHead,
    navigatorGitHead: meta.runtime.navigator.gitHead,
    runDir: RUN_DIR,
    captures,
    capturedAt: new Date().toISOString(),
  });
  console.log(JSON.stringify({ ok: true, manifestPath, count: captures.length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
