#!/usr/bin/env node
/**
 * R06 catalog-prefill visual pairs (MOCK BFF + prototype ref static server).
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import {
  findFreeLoopbackPort,
  spawnOwnedNextStart,
  stopOwnedServer,
} from '../artifacts/remcard-login-entry-prototype-01/login-entry-process-lifecycle.mjs';
import { startCatalogPrefillMockBff, createMockBffState } from './lib/r06-catalog-prefill-mock-bff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist/catalog-prefill-visual');
const PROTO_DIR = process.env.R06_PROTO_DIR || '/tmp/r06-prototype-ref';
const PROTO_TGZ = path.join(ROOT, 'docs/reference/login-entry-20261018/prototype.tar.gz');
const DIST = process.env.LOGIN_ENTRY_NEXT_DIST_DIR || '.next-r06-catalog-prefill-smoke';
const PROD_ENV = path.join(ROOT, '.env.production.local');
const CODE_SHA = (spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout || '').trim();
const PROTO_SHA256 = '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d';

async function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function ensurePrototypeExtracted() {
  if (!existsSync(path.join(PROTO_DIR, 'profile-wizard.js'))) {
    mkdirSync(PROTO_DIR, { recursive: true });
    const src = existsSync(PROTO_TGZ)
      ? PROTO_TGZ
      : null;
    if (!src) {
      spawnSync('git', ['show', '9bc52fb9152293e992e98dc50804a660cef10733:docs/reference/login-entry-20261018/prototype.tar.gz'], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'inherit'],
      });
    }
    spawnSync('tar', ['-xzf', existsSync(PROTO_TGZ) ? PROTO_TGZ : '-'], {
      cwd: PROTO_DIR,
      stdio: 'inherit',
    });
  }
}

function startStatic(rootDir) {
  return new Promise((resolve, reject) => {
    const root = path.resolve(rootDir);
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
      const filePath = path.normalize(path.join(root, urlPath === '/' ? '/roles.html' : urlPath));
      if (!filePath.startsWith(root) || !existsSync(filePath)) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200);
      createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

async function shot(page, name) {
  const filePath = path.join(OUT, name);
  await page.screenshot({ path: filePath, fullPage: true });
  return { file: name, sha256: sha256File(filePath) };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  ensurePrototypeExtracted();
  const state = createMockBffState();
  state.profileFinished = true;
  state.workingDisplayName = 'Актуальное рабочее имя';
  state.workingServices = ['design', 'planning'];
  state.workingStages = ['L1-1'];
  const mock = await startCatalogPrefillMockBff(state);
  const platformPort = await findFreeLoopbackPort(30690);
  const appOrigin = `http://127.0.0.1:${platformPort}`;
  const backup = existsSync(PROD_ENV) ? readFileSync(PROD_ENV, 'utf8') : null;
  writeFileSync(
    PROD_ENV,
    `REMCARD_API_BASE_URL=${mock.baseUrl}\nNEXT_PUBLIC_APP_URL=${appOrigin}\nREMCARD_PROXY_TRUST_LOOPBACK_ORIGIN=1\n`,
  );
  if (!existsSync(path.join(ROOT, DIST, 'BUILD_ID'))) {
    spawnSync('bash', ['-lc', `env -u R06_NEXT_DIST_DIR LOGIN_ENTRY_NEXT_DIST_DIR=${DIST} npm run build`], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit',
    });
  }
  const refStatic = await startStatic(PROTO_DIR);
  const child = spawnOwnedNextStart({
    port: platformPort,
    cwd: ROOT,
    env: {
      ...process.env,
      LOGIN_ENTRY_NEXT_DIST_DIR: DIST,
      NEXT_PUBLIC_APP_URL: appOrigin,
      REMCARD_API_BASE_URL: mock.baseUrl,
      REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN: '1',
      NODE_ENV: 'production',
      PORT: String(platformPort),
    },
  });
  const captures = [];
  try {
    if (!(await waitForHttp(`${appOrigin}/login`))) throw new Error('platform_start_timeout');
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    await context.addCookies([
      { name: 'remcard-token', value: 'mock-visual', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' },
    ]);
    const page = await context.newPage();
    await page.goto(`${appOrigin}/profile?section=catalog`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForSelector('[data-testid="specialist-catalog-wizard"]', { timeout: 60_000 });
    captures.push(await shot(page, 'impl-catalog-prefill-1440-light.png'));

    await page.setViewportSize({ width: 375, height: 812 });
    captures.push(await shot(page, 'impl-catalog-prefill-375-light.png'));
    await page.emulateMedia({ colorScheme: 'dark' });
    captures.push(await shot(page, 'impl-catalog-prefill-375-dark.png'));
    await page.setViewportSize({ width: 320, height: 568 });
    await page.emulateMedia({ colorScheme: 'light' });
    captures.push(await shot(page, 'impl-catalog-prefill-320-light.png'));

    const refPage = await browser.newPage();
    await refPage.setViewportSize({ width: 1440, height: 900 });
    await refPage.goto(`${refStatic.baseUrl}/roles.html`, { waitUntil: 'networkidle', timeout: 120_000 });
    await refPage.getByTestId('view-cabinet').click().catch(() => {});
    await refPage.getByTestId('scenario-role').selectOption('specialist').catch(() => {});
    await refPage.getByTestId('nav-profile').click().catch(() => {});
    captures.push(await shot(refPage, 'ref-catalog-context-1440-light.png'));
    await browser.close();
  } finally {
    await stopOwnedServer(child);
    refStatic.server.close();
    await mock.close();
    if (backup == null) try { unlinkSync(PROD_ENV); } catch {} else writeFileSync(PROD_ENV, backup);
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    mode: 'MOCK_BFF_VISUAL',
    codeSha: CODE_SHA,
    navigatorCodeSha: '9a5bced4513f15a95790be7c85813b185beadd10',
    prototypePackageCommit: '9bc52fb9152293e992e98dc50804a660cef10733',
    prototypeTarballSha256: PROTO_SHA256,
    appOrigin,
    mockBff: mock.baseUrl,
    distDir: DIST,
    captures,
    visualPass: false,
    remainders: [
      'Ref navigation uses prototype roles.html shell; specialist catalog step parity reviewed manually against profile-wizard.js / catalog-wizard.js — not pixel-locked CAPTURED.',
      'Supervisor preset: no prod service id for «Приёмка и технический надзор» (owner mapping pending).',
    ],
  };
  writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
