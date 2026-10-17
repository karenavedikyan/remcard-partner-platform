#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';
const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist/screenshots');
const REF = '771cc658a415a5d05b964f29f675d32db449198b';

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

async function shot(page, name, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(800);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  const meta = JSON.parse(readFileSync(path.join(RUN_DIR, 'meta.json'), 'utf8'));
  const env = loadEnv(meta.envPath);
  const plat = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const seed = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r06-local-fixture.ts', 'seed'], {
    cwd: NAV_ROOT,
    env,
    encoding: 'utf8',
  });
  if (seed.status !== 0) throw new Error('seed failed');
  const token = mint(env);
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
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
  const captures = [];
  captures.push(await shot(page, 'profile-basics-wizard-1440-light.png', `${plat}/profile?section=basics`));
  captures.push(await shot(page, 'profile-catalog-wizard-1440-light.png', `${plat}/profile?section=catalog`));

  await page.setViewportSize({ width: 375, height: 812 });
  captures.push(await shot(page, 'profile-basics-wizard-375-light.png', `${plat}/profile?section=basics`));
  captures.push(await shot(page, 'profile-catalog-wizard-375-light.png', `${plat}/profile?section=catalog`));

  await page.emulateMedia({ colorScheme: 'dark' });
  captures.push(await shot(page, 'profile-catalog-wizard-375-dark.png', `${plat}/profile?section=catalog`));

  await page.setViewportSize({ width: 320, height: 568 });
  captures.push(await shot(page, 'profile-catalog-wizard-320-smoke.png', `${plat}/profile?section=catalog`));

  await browser.close();

  const manifest = {
    referenceSha: REF,
    platformSha: meta.platformSha,
    navigatorSha: meta.navigatorSha,
    captures,
  };
  writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ok: true, count: captures.length, out: OUT }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
