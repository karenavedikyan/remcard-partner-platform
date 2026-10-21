import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { driveRefSpecialistClients } from './r03-prototype-ref.mjs';
import { driveRefAgentSection } from './r03-prototype-ref.mjs';

export const CLIENTS_VISUAL_MATRIX = [
  { id: 'list-1440-light', panel: 'list', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'list-1440-dark', panel: 'list', width: 1440, height: 900, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'list-375-dark', panel: 'list', width: 375, height: 812, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'list-cards-375-light', panel: 'list', width: 375, height: 812, theme: 'light', viewMode: 'cards', audience: 'specialist' },
  { id: 'list-empty-1440-light', panel: 'list-empty', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'list-error-1440-light', panel: 'list-error', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'detail-1440-light', panel: 'detail', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'detail-1440-dark', panel: 'detail', width: 1440, height: 900, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'detail-375-light', panel: 'detail', width: 375, height: 812, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'detail-375-dark', panel: 'detail', width: 375, height: 812, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'detail-purchases-1440-light', panel: 'detail-purchases', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist', fullPage: true },
  { id: 'form-create-1440-light', panel: 'form-create', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'form-create-1440-dark', panel: 'form-create', width: 1440, height: 900, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'form-create-375-light', panel: 'form-create', width: 375, height: 812, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'form-create-375-dark', panel: 'form-create', width: 375, height: 812, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'form-edit-empty-1440-light', panel: 'form-edit-empty', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'form-edit-empty-375-light', panel: 'form-edit-empty', width: 375, height: 812, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'form-edit-empty-1440-dark', panel: 'form-edit-empty', width: 1440, height: 900, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'form-edit-empty-375-dark', panel: 'form-edit-empty', width: 375, height: 812, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'agent-list-1440-light', panel: 'list', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'agent' },
  { id: 'certs-list-1440-light', panel: 'certificates-list', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
  { id: 'certs-list-375-dark', panel: 'certificates-list', width: 375, height: 812, theme: 'dark', viewMode: 'list', audience: 'specialist' },
  { id: 'certs-create-1440-light', panel: 'certificates-create', width: 1440, height: 900, theme: 'light', viewMode: 'list', audience: 'specialist' },
];

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

export function applyClientsVisualScenario(mockState, spec) {
  if (!mockState) return;
  mockState.mode = spec.audience === 'agent' ? 'agent' : 'specialist';
  mockState.clientsForceEmpty = spec.panel === 'list-empty';
  mockState.clientsListGetFail = spec.panel === 'list-error';
  if (spec.panel !== 'list-empty' && spec.panel !== 'list-error') {
    mockState.clientsForceEmpty = false;
  }
  if (spec.panel !== 'list-error') {
    mockState.clientsListGetFail = false;
  }
  mockState.clients = null;
  mockState.clientCerts = null;
  mockState.clientPurchases = null;
}

async function applyVisualTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  }, theme);
}

async function assertVisualTheme(page, theme) {
  const actual = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (actual !== theme) {
    throw new Error(`theme_mismatch:expected=${theme} actual=${actual ?? 'null'}`);
  }
}

async function resetClientsUiStorage(page) {
  await page.evaluate(() => {
    try {
      localStorage.removeItem('remcard.agent-r03.view.clients');
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

async function assertImplPersona(page, audience, spec) {
  const onClientDetail =
    spec.panel === 'detail' ||
    spec.panel === 'detail-purchases' ||
    spec.panel === 'form-edit-empty';
  if (audience === 'agent') {
    if (onClientDetail) {
      await page.getByRole('heading', { name: 'Клиенты' }).waitFor({ timeout: 15_000 }).catch(() =>
        page.getByTestId('agent-r03-collection-toolbar').waitFor({ timeout: 15_000 }),
      );
      return;
    }
    await page.getByText('АГЕНТ', { exact: true }).waitFor({ timeout: 15_000 });
    const specialistEyebrow = await page.getByText('Специалист', { exact: true }).count();
    if (specialistEyebrow > 0) throw new Error('impl_agent_polluted_by_specialist_eyebrow');
  } else if (onClientDetail) {
    await page.getByTestId('specialist-client-detail-root').waitFor({ timeout: 15_000 });
    const agentEyebrow = await page.getByText('АГЕНТ', { exact: true }).count();
    if (agentEyebrow > 0) throw new Error('impl_specialist_detail_polluted_by_agent');
  } else if (spec.panel === 'certificates-list' || spec.panel === 'certificates-create') {
    await page.getByText('СПЕЦИАЛИСТ', { exact: true }).waitFor({ timeout: 15_000 });
  } else {
    await page.getByText('Специалист', { exact: true }).waitFor({ timeout: 15_000 });
    const agentEyebrow = await page.getByText('АГЕНТ', { exact: true }).count();
    if (agentEyebrow > 0) throw new Error('impl_specialist_polluted_by_agent_eyebrow');
  }
}

async function assertImplContent(page, spec) {
  if (spec.panel === 'list-empty') {
    await page.getByTestId('agent-r03-found-count').filter({ hasText: 'Найдено: 0' }).waitFor({ timeout: 15_000 });
    await page.getByText('Добавьте первого клиента.').waitFor({ timeout: 15_000 });
    return;
  }
  if (spec.panel === 'list-error') {
    await page
      .locator('p[role="alert"]')
      .filter({ hasText: /mock_clients|Не удалось|ошиб/i })
      .first()
      .waitFor({ timeout: 20_000 });
    return;
  }
  if (spec.panel === 'detail' || spec.panel === 'detail-purchases') {
    if (spec.audience === 'specialist') {
      await page.getByTestId('specialist-client-back').waitFor({ timeout: 15_000 });
      await page.getByTestId('specialist-client-metrics').waitFor({ timeout: 15_000 });
    }
  }
  if (spec.panel === 'form-create' || spec.panel === 'form-edit-empty') {
    await page.locator('[data-testid="agent-client-form-dialog"]').waitFor({ timeout: 15_000 });
  }
  if (spec.panel === 'certificates-list') {
    await page.getByTestId('specialist-certificates-root').waitFor({ timeout: 15_000 });
    await page.getByTestId('agent-r03-collection-toolbar').waitFor({ timeout: 15_000 });
  }
  if (spec.panel === 'certificates-create') {
    await page.locator('#certificate-create-root, form').first().waitFor({ timeout: 15_000 });
  }
}

export async function prepareImplClients(page, origin, spec) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await applyVisualTheme(page, spec.theme);
  await resetClientsUiStorage(page);

  if (spec.panel === 'list-empty' || spec.panel === 'list-error' || spec.panel === 'list') {
    await page.goto(`${origin}/clients`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Клиенты' }).waitFor({ timeout: 30_000 });
    if (spec.viewMode === 'cards' && spec.panel === 'list') {
      const cardsBtn = page.getByRole('button', { name: /Карточки/i });
      if (await cardsBtn.isVisible().catch(() => false)) await cardsBtn.click();
    }
  } else if (spec.panel === 'detail' || spec.panel === 'detail-purchases') {
    await page.goto(`${origin}/clients/mock-spec-client-1`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Анна Клиентова' }).waitFor({ timeout: 30_000 });
    if (spec.panel === 'detail-purchases') {
      await page.locator('[data-testid="client-purchase-history"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }
  } else if (spec.panel === 'form-create') {
    await page.goto(`${origin}/clients`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Добавить клиента' }).click();
    await page.locator('[data-testid="agent-client-form-dialog"]').waitFor({ timeout: 15_000 });
    const detailsOpen = await page
      .locator('details[open]')
      .filter({ hasText: /Контакты и заметка/i })
      .count();
    if (detailsOpen > 0) throw new Error('create_form_optional_should_be_closed');
  } else if (spec.panel === 'certificates-list') {
    await page.goto(`${origin}/recommendations`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Сертификаты' }).waitFor({ timeout: 30_000 });
  } else if (spec.panel === 'certificates-create') {
    await page.goto(`${origin}/recommendations/new`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.getByRole('heading', { name: /Создать сертификат/i }).waitFor({ timeout: 30_000 });
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

  await applyVisualTheme(page, spec.theme);
  await assertVisualTheme(page, spec.theme);
  await assertImplPersona(page, spec.audience, spec);
  await assertImplContent(page, spec);
}

export async function captureRefClients(refPage, refBase, spec, outPath) {
  await refPage.setViewportSize({ width: spec.width, height: spec.height });
  if (spec.audience === 'agent') {
    const drive = await driveRefAgentSection(refPage, refBase, {
      section: 'clients',
      viewMode: spec.viewMode,
      dark: spec.theme === 'dark',
      width: spec.width,
      height: spec.height,
    });
    if (!drive.ok) throw new Error(drive.reason ?? 'ref_agent_clients_failed');
  } else if (spec.panel === 'list-error') {
    throw new Error('ref_unavailable:prototype_has_no_clients_list_network_error_state');
  } else {
    await driveRefSpecialistClients(refPage, refBase, {
      viewMode: spec.viewMode,
      panel: spec.panel,
      theme: spec.theme,
      width: spec.width,
      height: spec.height,
    });
    await assertVisualTheme(refPage, spec.theme);
  }
  await refPage.screenshot({ path: outPath, fullPage: Boolean(spec.fullPage) });
}

export async function runClientsVisualCaptures({ browser, refBase, appOrigin, outDir, mockState }) {
  const implPage = await browser.newPage();
  const refPage = await browser.newPage();
  const pairs = [];
  try {
    for (const spec of CLIENTS_VISUAL_MATRIX) {
      applyClientsVisualScenario(mockState, spec);
      const implName = `impl-specialist-clients-${spec.id}.png`;
      const refName = `ref-specialist-clients-${spec.id}.png`;
      const implPath = path.join(outDir, implName);
      const refPath = path.join(outDir, refName);
      let implError = null;
      try {
        await prepareImplClients(implPage, appOrigin, spec);
        await implPage.screenshot({ path: implPath, fullPage: Boolean(spec.fullPage) });
      } catch (e) {
        implError = String(e?.message || e);
      }
      const refUnavailable = spec.panel === 'list-error';
      let refError = null;
      let refUnavailableReason = null;
      if (!implError && !refUnavailable) {
        try {
          await captureRefClients(refPage, refBase, spec, refPath);
        } catch (e) {
          refError = String(e?.message || e);
        }
      } else if (refUnavailable) {
        refUnavailableReason = 'prototype_has_no_clients_list_network_error_state';
      } else {
        refError = `impl_failed:${implError}`;
      }
      pairs.push({
        id: spec.id,
        panel: spec.panel,
        audience: spec.audience,
        width: spec.width,
        height: spec.height,
        theme: spec.theme,
        persona: spec.audience,
        themeVerified: spec.theme,
        impl: implError ? null : implPath,
        ref: refError || refUnavailable ? null : refPath,
        implError,
        refError,
        refUnavailable: refUnavailable || undefined,
        refUnavailableReason,
        implSha256: !implError && implPath ? sha256File(implPath) : null,
        refSha256: !refError && !refUnavailable && refPath ? sha256File(refPath) : null,
        emptyVerified: spec.panel === 'list-empty' ? !implError : undefined,
        errorCaseBoundary:
          spec.panel === 'list-error'
            ? 'impl_only_mock_503_alert_no_prototype_ref'
            : undefined,
      });
    }
  } finally {
    await implPage.close();
    await refPage.close();
  }
  return pairs;
}
