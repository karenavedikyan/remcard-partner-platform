/**
 * Real browser clicks: STORE / COMPANY / SPECIALIST catalog submit → admin approve → public/hide/allow.
 * Requires production builds on 127.0.0.1:3400 (PROF) and :3401 (backend), ui-harness-state.json from navigator seed.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fillImplCatalogCard,
  fillImplCatalogContacts,
  R06_PREVIEW_FIXTURE,
  selectImplCatalogDirections,
} from '../lib/r06-preview-fixture.mjs';
import { advanceCatalogSteps } from '../lib/r06-playwright-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const navRoot = process.env.CATALOG_QA_NAVIGATOR_ROOT ?? path.join(__dirname, '../../../remcard-navigator');
const stateFile = path.join(navRoot, '.catalog-qa-isolated/ui-harness-state.json');
const frontend = process.env.CATALOG_QA_FRONTEND_URL ?? 'http://127.0.0.1:3400';
const backend = process.env.CATALOG_QA_BACKEND_URL ?? 'http://127.0.0.1:3401';
const artDir =
  process.env.E2E_ARTIFACT_DIR ??
  path.join(process.cwd(), 'artifacts/test-catalog-isolated-acceptance/ui-harness');

if (!fs.existsSync(stateFile)) {
  console.error('Missing ui-harness-state.json — run remcard-navigator/scripts/catalog-qa-isolated/seed-ui-harness.sh');
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
fs.mkdirSync(artDir, { recursive: true });

async function apiFetch(url, { token, method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { cookie: `remcard-token=${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function setPublicShow(adminToken, userId, allowed) {
  const res = await apiFetch(`${backend}/api/pro/admin/test-users/${userId}`, {
    token: adminToken,
    method: 'PATCH',
    body: { action: 'setPublicCatalogShow', allowed },
  });
  if (!res.ok) throw new Error(`setPublicCatalogShow ${res.status}`);
}

async function expectPendingHeading(page) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Заявка отправлена' }).waitFor({ timeout: 60_000 });
}

async function profContext(page, token) {
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: 'remcard-token', value: token, url: frontend },
  ]);
}

async function completeSpecialistWizard(page) {
  await page.goto(`${frontend}/profile?section=catalog`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="specialist-catalog-wizard"]').waitFor({ timeout: 60_000 });
  for (let step = 0; step <= 4; step += 1) {
    await advanceCatalogSteps(page, step);
    if (step === 0) await fillImplCatalogCard(page, R06_PREVIEW_FIXTURE);
    if (step === 1) await selectImplCatalogDirections(page, R06_PREVIEW_FIXTURE);
    if (step === 2) await fillImplCatalogContacts(page, R06_PREVIEW_FIXTURE);
  }
  await page.getByTestId('catalog-submit-publication').click();
}

async function completeOrgWizard(page) {
  await page.goto(`${frontend}/profile?section=catalog`, { waitUntil: 'networkidle' });
  const root = page.locator('[data-testid="organization-catalog-wizard"]');
  await root.waitFor({ timeout: 60_000 });
  for (let step = 0; step < 4; step += 1) {
    if (step === 0) {
      await root.locator('#oc-public-name').fill(`QA Org ${state.suffix}`);
      await root.locator('#oc-city').fill('Краснодар');
      const branchAddr = root.locator('#catalog-branch-address');
      if (await branchAddr.count()) await branchAddr.fill('ул. QA 1');
    }
    if (step === 1) {
      await root.locator('#catalog-products input[type="checkbox"]').first().check();
      const stages = root.locator('[data-direction-group="stages"]');
      if (await stages.count()) {
        const open = await stages.evaluate((el) => el.open);
        if (!open) await stages.locator('summary').click();
        await stages.locator('input[type="checkbox"]').first().check();
      }
    }
    if (step === 2) {
      const phone = page.locator('[data-testid="agent-profile-input-phone"]').first();
      if (await phone.count()) await phone.fill(R06_PREVIEW_FIXTURE.phone);
    }
    const nextLabel = step === 3 ? 'Предпросмотр' : 'Далее';
    await root.getByRole('button', { name: nextLabel }).click();
  }
  await page.getByTestId('catalog-submit-publication').click();
}

async function runOrgRole(page, kind) {
  const role = state.roles[kind];
  const label = kind.toUpperCase();
  await profContext(page, role.delegationToken);
  await completeOrgWizard(page);
  await expectPendingHeading(page);
  await page.screenshot({ path: path.join(artDir, `${kind}-pending-1440.png`), fullPage: true });

  let approve = await apiFetch(
    `${backend}/api/admin/moderation/organizations/${role.orgId}/approve-all`,
    { token: state.staffModerationToken, method: 'POST' },
  );
  if (!approve.ok) throw new Error(`${label} org approve ${approve.status}`);

  await setPublicShow(state.platformAdminToken, role.userId, true);
  let pub = await apiFetch(`${backend}/api/catalog/org/${role.orgId}`);
  if (pub.status !== 200) throw new Error(`${label} public org expected 200 got ${pub.status}`);

  await setPublicShow(state.platformAdminToken, role.userId, false);
  pub = await apiFetch(`${backend}/api/catalog/org/${role.orgId}`);
  if (pub.status !== 404) throw new Error(`${label} hidden org API expected 404 got ${pub.status}`);
  const shell = await apiFetch(`${backend}/catalog/org/${role.orgId}`);
  console.log(`[ui-harness] ${label} org HTML shell after hide: ${shell.status} (200 shell + API 404 is OK)`);

  await apiFetch(`${backend}/api/pro/organization/branches/${role.branchId}`, {
    token: role.delegationToken,
    method: 'PATCH',
    body: { description: 'Branch QA publish body' },
  });
  const branchSubmit = await apiFetch(
    `${backend}/api/pro/organization/branches/${role.branchId}/submit-for-moderation`,
    { token: role.delegationToken, method: 'POST', body: {} },
  );
  if (!branchSubmit.ok) throw new Error(`${label} branch submit ${branchSubmit.status}`);
  const branchApprove = await apiFetch(
    `${backend}/api/admin/moderation/branches/${role.branchId}/approve`,
    { token: state.staffModerationToken, method: 'POST' },
  );
  if (!branchApprove.ok) throw new Error(`${label} branch approve ${branchApprove.status}`);

  await setPublicShow(state.platformAdminToken, role.userId, true);
  pub = await apiFetch(`${backend}/api/catalog/org/${role.orgId}`);
  const json = await pub.json();
  const branches = json.organization?.branches ?? json.branches ?? [];
  const hasBranch = Array.isArray(branches) && branches.some((b) => b.id === role.branchId);
  if (!hasBranch) throw new Error(`${label} public org JSON missing approved branch`);
  console.log(`[ui-harness] ${label} OK`);
}

async function runSpecialist(page) {
  const role = state.roles.master;
  await profContext(page, role.delegationToken);
  await completeSpecialistWizard(page);
  await expectPendingHeading(page);
  await page.screenshot({ path: path.join(artDir, 'specialist-pending-1440.png'), fullPage: true });

  const approve = await apiFetch(
    `${backend}/api/admin/moderation/partners/${role.userId}/approve`,
    { token: state.staffModerationToken, method: 'POST' },
  );
  if (!approve.ok) throw new Error(`SPECIALIST approve ${approve.status}`);

  await setPublicShow(state.platformAdminToken, role.userId, true);
  const partnerPage = await apiFetch(`${backend}/partner/${role.userId}`);
  if (partnerPage.status !== 200) throw new Error(`SPECIALIST public page expected 200 got ${partnerPage.status}`);

  await setPublicShow(state.platformAdminToken, role.userId, false);
  const hiddenShell = await apiFetch(`${backend}/partner/${role.userId}`);
  console.log(
    `[ui-harness] SPECIALIST shell after hide: ${hiddenShell.status} (list/detail API filters separate from HTML shell)`,
  );
  console.log('[ui-harness] SPECIALIST OK');
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await runSpecialist(page);
  await runOrgRole(page, 'store');
  await runOrgRole(page, 'company');
  console.log('[ui-harness] all roles OK');
} finally {
  await browser.close();
}
