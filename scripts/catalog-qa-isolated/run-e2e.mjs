import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const backend = process.env.E2E_BACKEND_BASE ?? 'http://127.0.0.1:3401';
const partnerId = process.env.E2E_PARTNER_ID;
const navRoot = process.env.CATALOG_QA_NAVIGATOR_ROOT ?? path.join(process.cwd(), '../remcard-navigator');
const sessionFile = path.join(navRoot, '.catalog-qa-isolated/playwright-session.json');
const artDir =
  process.env.E2E_ARTIFACT_DIR ??
  path.join(process.cwd(), 'artifacts/test-catalog-isolated-acceptance');

if (!partnerId) {
  console.error('E2E_PARTNER_ID required');
  process.exit(1);
}

fs.mkdirSync(artDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const session = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile, 'utf8')) : null;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  if (session?.cookies?.staffModeration) {
    await page.context().addCookies([
      {
        name: 'remcard-token',
        value: session.cookies.staffModeration,
        url: backend,
      },
    ]);
    await page.goto(`${backend}/admin/moderation`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artDir, 'admin-moderation-1440.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artDir, 'admin-moderation-390.png'), fullPage: true });
    await page.context().clearCookies();
  }

  const url = `${backend}/partner/${partnerId}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="public-test-partner-badge"]', { timeout: 30_000 });
  await page.screenshot({ path: path.join(artDir, 'partner-public-1440.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(artDir, 'partner-public-390.png'), fullPage: true });

  const catalogRes = await page.goto(
    `${backend}/api/catalog?city=${encodeURIComponent('Краснодар')}`,
    { waitUntil: 'commit' },
  );
  if (!catalogRes?.ok()) throw new Error(`catalog HTTP ${catalogRes?.status()}`);
  console.log('[e2e] OK screenshots', artDir);
} finally {
  await browser.close();
}
