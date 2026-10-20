import path from 'node:path';
import { driveRefSpecialistClients } from './r03-prototype-ref.mjs';
import { driveRefAgentSection } from './r03-prototype-ref.mjs';

export const CLIENTS_VISUAL_MATRIX = [
  { id: 'list-1440-light', panel: 'list', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'list-375-dark', panel: 'list', width: 375, height: 812, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'list-cards-375-light', panel: 'list', width: 375, height: 812, theme: 'light', viewMode: 'cards', audience: 'specialist' },
  { id: 'detail-1440-light', panel: 'detail', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'detail-375-light', panel: 'detail', width: 375, height: 812, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'detail-375-dark', panel: 'detail', width: 375, height: 812, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'form-create-1440-light', panel: 'form-create', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'form-create-375-light', panel: 'form-create', width: 375, height: 812, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'form-edit-empty-1440-light', panel: 'form-edit-empty', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'form-edit-empty-375-light', panel: 'form-edit-empty', width: 375, height: 812, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'list-empty-1440-light', panel: 'list-empty', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'agent-list-1440-light', panel: 'list', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'agent' },
];

export async function prepareImplClients(page, origin, spec) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await page.emulateMedia({ colorScheme: spec.theme === 'dark' ? 'dark' : 'light' });
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  }, spec.theme);

  if (spec.panel === 'list-empty') {
    await page.goto(`${origin}/clients?q=__no_such_client__`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Клиенты' }).waitFor({ timeout: 30_000 });
    return;
  }

  if (spec.panel === 'list') {
    await page.goto(`${origin}/clients`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Клиенты' }).waitFor({ timeout: 30_000 });
    if (spec.viewMode === 'cards') {
      const cardsBtn = page.getByRole('button', { name: /Карточки/i });
      if (await cardsBtn.isVisible().catch(() => false)) await cardsBtn.click();
    }
  } else if (spec.panel === 'detail') {
    await page.goto(`${origin}/clients/mock-spec-client-1`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Анна Клиентова' }).waitFor({ timeout: 30_000 });
  } else if (spec.panel === 'form-create') {
    await page.goto(`${origin}/clients`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Добавить клиента' }).click();
    await page.locator('[data-testid="agent-client-form-dialog"]').waitFor({ timeout: 15_000 });
    const detailsOpen = await page
      .locator('details[open]')
      .filter({ hasText: /Контакты и заметка/i })
      .count();
    if (detailsOpen > 0) throw new Error('create_form_optional_should_be_closed');
  } else if (spec.panel === 'form-edit-empty') {
    await page.goto(`${origin}/clients/mock-spec-client-empty`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Изменить заметку' }).click();
    await page.locator('[data-testid="agent-client-form-dialog"]').waitFor({ timeout: 15_000 });
    const detailsOpen = await page
      .locator('details[open]')
      .filter({ hasText: /Контакты и заметка/i })
      .count();
    if (detailsOpen < 1) throw new Error('edit_form_optional_should_be_open');
  }
}

export async function captureRefClients(refPage, refBase, spec, outPath) {
  if (spec.audience === 'agent') {
    await driveRefAgentSection(refPage, refBase, {
      section: 'clients',
      viewMode: spec.viewMode,
      dark: spec.theme === 'dark',
      width: spec.width,
      height: spec.height,
    });
  } else {
    await driveRefSpecialistClients(refPage, refBase, {
      viewMode: spec.viewMode,
      panel: spec.panel,
      theme: spec.theme,
      width: spec.width,
      height: spec.height,
    });
  }
  await refPage.screenshot({ path: outPath, fullPage: false });
}

export async function runClientsVisualCaptures({ browser, refBase, appOrigin, outDir }) {
  const implPage = await browser.newPage();
  const refPage = await browser.newPage();
  const pairs = [];
  try {
    for (const spec of CLIENTS_VISUAL_MATRIX) {
      const implName = `impl-specialist-clients-${spec.id}.png`;
      const refName = `ref-specialist-clients-${spec.id}.png`;
      const implPath = path.join(outDir, implName);
      const refPath = path.join(outDir, refName);
      await prepareImplClients(implPage, appOrigin, spec);
      await implPage.screenshot({ path: implPath, fullPage: false });
      let refError = null;
      try {
        await captureRefClients(refPage, refBase, spec, refPath);
      } catch (e) {
        refError = String(e?.message || e);
      }
      pairs.push({
        id: spec.id,
        panel: spec.panel,
        audience: spec.audience,
        width: spec.width,
        height: spec.height,
        theme: spec.theme,
        impl: implPath,
        ref: refError ? null : refPath,
        refError,
      });
    }
  } finally {
    await implPage.close();
    await refPage.close();
  }
  return pairs;
}
