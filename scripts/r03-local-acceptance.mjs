#!/usr/bin/env node
/**
 * R03 local acceptance: BFF HTTP (clients, idempotency) + Playwright visuals.
 * Prerequisite: node scripts/r02-local-stack.mjs (with R03 gates in meta env).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R02_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';
const ART_DIR = path.join(ROOT, 'artifacts/remcard-r03');
const REF_ROOT =
  process.env.R03_REFERENCE_ROOT ||
  '/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard';

function loadRuntimeEnv(envPath) {
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function runNavFixture(env, action) {
  const res = spawnSync('pnpm', ['exec', 'tsx', 'scripts/r02-local-fixture.ts', action], {
    cwd: NAV_ROOT,
    env: { ...env, PROF_R03_AGENT_CERTIFICATES_ENABLED: 'true' },
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`fixture ${action}: ${(res.stderr || res.stdout || '').slice(0, 500)}`);
  }
  return (res.stdout || '').trim();
}

function bffHeaders(session, extra = {}) {
  const origin = session.platformOrigin.replace(/\/$/, '');
  return {
    Cookie: `remcard-token=${session.token}`,
    'content-type': 'application/json',
    Origin: origin,
    ...extra,
  };
}

async function main() {
  const sessionPath = path.join(RUN_DIR, 'session.json');
  const metaPath = path.join(RUN_DIR, 'meta.json');
  if (!existsSync(sessionPath) || !existsSync(metaPath)) {
    throw new Error('Missing local stack: run node scripts/r02-local-stack.mjs first');
  }
  const session = JSON.parse(readFileSync(sessionPath, 'utf8'));
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const env = loadRuntimeEnv(meta.envPath);
  env.PROF_R03_AGENT_CERTIFICATES_ENABLED = 'true';
  mkdirSync(ART_DIR, { recursive: true });
  mkdirSync(path.join(ART_DIR, 'visual'), { recursive: true });

  runNavFixture(env, 'push-schema');
  runNavFixture(env, 'seed');
  const token = runNavFixture(env, 'mint');
  session.token = token;
  const plat = session.platformOrigin.replace(/\/$/, '');
  const nav = meta.navOrigin.replace(/\/$/, '');
  const meRes = await fetch(`${plat}/api/remcard/api/auth/me`, {
    headers: bffHeaders(session),
  });
  const meBody = await meRes.json();
  const userId = meBody.user?.id;
  if (!userId) throw new Error('auth/me missing user id');

  const report = {
    ok: false,
    platformOrigin: plat,
    http: {},
    visuals: [],
    idempotency: {},
  };

  const navHeaders = { Cookie: `remcard-token=${token}`, 'content-type': 'application/json' };

  const r03Status = await fetch(`${nav}/api/pro/r03/status`, { headers: navHeaders });
  report.http.r03Status = r03Status.status;
  report.http.r03Body = await r03Status.json().catch(() => null);

  const bffR03 = await fetch(`${plat}/api/remcard/api/pro/r03/status`, {
    headers: bffHeaders(session),
  });
  report.http.bffR03Status = bffR03.status;

  await fetch(`${nav}/api/pro/agent-profile/finish`, {
    method: 'POST',
    headers: navHeaders,
    body: JSON.stringify({}),
  });

  const clientCreate = await fetch(`${nav}/api/pro/agent-clients`, {
    method: 'POST',
    headers: navHeaders,
    body: JSON.stringify({
      displayName: 'R03 E2E Client',
      phone: '89001234567',
      city: 'Krasnodar',
      note: 'internal note',
    }),
  });
  const clientBody = await clientCreate.json();
  report.http.clientCreate = clientCreate.status;
  const clientId = clientBody.client?.id;

  const rename = await fetch(`${nav}/api/pro/agent-clients/${clientId}`, {
    method: 'PATCH',
    headers: navHeaders,
    body: JSON.stringify({ displayName: 'R03 E2E Renamed' }),
  });
  report.http.renameOnly = rename.status;
  const detail = await fetch(`${nav}/api/pro/agent-clients/${clientId}`, {
    headers: navHeaders,
  });
  const detailBody = await detail.json();
  report.http.phonePreserved = detailBody.client?.phone != null;

  const idemKey = `e2e-${Date.now()}`;
  const createBody = {
    partners: [
      {
        storeUserId: userId,
        storeName: 'Self',
        isSelfScan: true,
        categories: [
          { category: 'r03-e2e', categoryLabel: 'E2E', discountPercent: 5, issuerPercent: 0 },
        ],
      },
    ],
  };
  const c1 = await fetch(`${nav}/api/pro/agent-certificates`, {
    method: 'POST',
    headers: { ...navHeaders, 'idempotency-key': idemKey },
    body: JSON.stringify(createBody),
  });
  const c2 = await fetch(`${nav}/api/pro/agent-certificates`, {
    method: 'POST',
    headers: { ...navHeaders, 'idempotency-key': idemKey },
    body: JSON.stringify(createBody),
  });
  report.idempotency.first = c1.status;
  report.idempotency.retry = c2.status;
  report.idempotency.sameStatus = c2.status === 200 || c2.status === c1.status;

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  await ctx.addCookies([
    {
      name: 'remcard-token',
      value: token,
      url: plat,
    },
  ]);

  async function shot(name, url, viewport) {
    const page = await ctx.newPage();
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: 'networkidle' });
    const out = path.join(ART_DIR, 'visual', `${name}.png`);
    await page.screenshot({ path: out, fullPage: true });
    report.visuals.push({ name, path: out, viewport });
    await page.close();
  }

  await shot('impl-certificates-1440-light', `${plat}/certificates`, { width: 1440, height: 900 });
  await shot('impl-clients-1440-light', `${plat}/clients`, { width: 1440, height: 900 });
  await shot('impl-certificates-375-light', `${plat}/certificates`, { width: 375, height: 812 });
  await shot('impl-clients-375-light', `${plat}/clients`, { width: 375, height: 812 });

  const refPage = await ctx.newPage();
  await refPage.setViewportSize({ width: 1440, height: 900 });
  const refUrl = `file://${path.join(REF_ROOT, 'roles.html')}`;
  await refPage.goto(refUrl, { waitUntil: 'domcontentloaded' });
  const refOut = path.join(ART_DIR, 'visual', 'ref-roles-1440-light.png');
  await refPage.screenshot({ path: refOut, fullPage: true });
  report.visuals.push({ name: 'ref-roles-1440-light', path: refOut, viewport: { width: 1440, height: 900 } });
  await refPage.close();

  await browser.close();

  const certCountAfter = await fetch(`${nav}/api/pro/agent-certificates`, {
    headers: navHeaders,
  }).then((r) => r.json());
  report.idempotency.listCount = certCountAfter.certificates?.length ?? null;

  report.ok =
    report.http.r03Status === 200 &&
    report.http.clientCreate === 201 &&
    report.http.renameOnly === 200 &&
    report.http.phonePreserved &&
    report.idempotency.retry === 200 &&
    report.idempotency.listCount === 1;

  writeFileSync(path.join(ART_DIR, 'local-acceptance-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
