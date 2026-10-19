/**
 * Drive frozen remcard-profile-wizard prototype to agent «Партнёры» collection.
 */
import { applyRefParityCaptureStyles } from './r03-prototype-ref.mjs';

export async function driveRefRolePartners(page, baseUrl, opts = {}) {
  const viewMode = opts.viewMode ?? 'list';
  const segment = opts.segment ?? 'active';
  const role = opts.role ?? 'agent';

  await page.goto(`${baseUrl}/roles.html`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const app = document.getElementById('app');
      const text = app?.textContent ?? '';
      return text.length > 80 && !/Загружаем прототип/i.test(text);
    },
    { timeout: 90_000 },
  );

  await page.evaluate((scenarioRole) => {
    const sel = document.querySelector('[data-testid="scenario-role"]');
    if (!(sel instanceof HTMLSelectElement)) throw new Error('ref_role_select_missing');
    sel.value = scenarioRole;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, role);
  await page.waitForTimeout(600);

  const cabinetPressed = await page
    .locator('[data-testid="view-cabinet"]')
    .getAttribute('aria-pressed');
  if (cabinetPressed !== 'true') {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="view-cabinet"]');
      if (btn instanceof HTMLElement) btn.click();
    });
    await page.waitForTimeout(800);
  }

  const menuBtn = page.locator('[data-action="menu"]').first();
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(400);
  }

  await page.evaluate(() => {
    const btn = document.querySelector('[data-action="nav:partners"], [data-testid="nav-partners"]');
    if (btn instanceof HTMLElement) btn.click();
  });
  await page.waitForTimeout(800);

  await page.getByRole('heading', { name: 'Партнёры' }).first().waitFor({ timeout: 25_000 });

  if (segment === 'invitations') {
    const invTab = page.getByRole('button', { name: /Приглашения/i }).first();
    if (await invTab.isVisible().catch(() => false)) {
      await invTab.click();
      await page.waitForTimeout(500);
    }
  }

  const viewAction = viewMode === 'list' ? 'view-list' : 'view-cards';
  const viewBtn = page.locator(`[data-coll-action="${viewAction}"]`).first();
  if (await viewBtn.isVisible().catch(() => false)) {
    await viewBtn.click();
    await page.waitForTimeout(400);
  }

  if (opts.dark) {
    const themeBtn = page.locator('[data-action="theme"], [data-testid="theme-toggle"]').first();
    for (let i = 0; i < 6; i++) {
      const state = await page.evaluate(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
      }));
      if (state.theme === 'dark' || state.colorScheme === 'dark') break;
      if (await themeBtn.isVisible().catch(() => false)) {
        await themeBtn.click();
        await page.waitForTimeout(500);
      } else break;
    }
  }

  await page.keyboard.press('Escape').catch(() => null);
  await page.evaluate(() => {
    for (const dlg of document.querySelectorAll('dialog[open]')) {
      if (dlg instanceof HTMLDialogElement) dlg.close();
    }
  });
  await page.waitForTimeout(200);

  const hubTab = opts.hubTab ?? (opts.openFind ? 'find' : null);
  if (hubTab) {
    const findBtn = page.getByRole('button', { name: /Найти|пригласить/i }).first();
    await findBtn.waitFor({ state: 'visible', timeout: 20_000 });
    await findBtn.click();
    await page.waitForTimeout(600);
    if (hubTab === 'link') {
      const linkSeg = page.locator('[data-action="external-partner"]').first();
      await linkSeg.waitFor({ state: 'visible', timeout: 15_000 });
      await linkSeg.click();
      const pressed = await linkSeg.getAttribute('aria-pressed');
      if (pressed !== 'true') throw new Error('ref_link_segment_not_active');
      await page
        .getByText(/ещё нет на платформе|Знакомого ещё нет/i)
        .first()
        .waitFor({ timeout: 10_000 });
    } else {
      const findSeg = page.locator('[data-action="partner-hub"]').first();
      await findSeg.waitFor({ state: 'visible', timeout: 10_000 });
      const pressed = await findSeg.getAttribute('aria-pressed');
      if (pressed !== 'true') {
        await findSeg.click();
        await page.waitForTimeout(400);
      }
      if ((await findSeg.getAttribute('aria-pressed')) !== 'true') {
        throw new Error('ref_find_segment_not_active');
      }
    }
  }

  await applyRefParityCaptureStyles(page);

  if (segment !== 'invitations' && !opts.openFind) {
    const filters = await page.locator('[data-testid="active-partner-filters"]').count();
    if (filters === 0) {
      return { ok: false, reason: 'ref_missing_partner_filters' };
    }
  }

  return { ok: true, viewMode, segment, role };
}

/** @deprecated use driveRefRolePartners */
export async function driveRefAgentPartners(page, baseUrl, opts = {}) {
  return driveRefRolePartners(page, baseUrl, { ...opts, role: 'agent' });
}

export async function setImplR04ViewMode(page, viewMode) {
  const label = viewMode === 'list' ? 'Список' : 'Карточки';
  const toggle = page.locator('[data-testid="agent-r04-view-toggle"]');
  await toggle.getByRole('button', { name: label }).click();
  await toggle.locator(`button[aria-pressed="true"]`).filter({ hasText: label }).waitFor({ timeout: 10_000 });
}

export async function openImplR04Panel(page, panel, platformOrigin) {
  const base = platformOrigin.replace(/\/$/, '');
  await page.goto(`${base}/partners`, { waitUntil: 'networkidle' });
  if (panel === 'find') {
    await page.getByRole('button', { name: /Найти или пригласить партнёра/i }).click();
    await page.locator('[data-testid="agent-partner-hub-modal"]').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(400);
  } else if (panel === 'invitations') {
    const tab = page.locator('[data-testid="agent-r04-partners"]').getByRole('tab', { name: 'Приглашения' });
    await tab.click({ timeout: 20_000 });
    await page.waitForTimeout(400);
  }
}
