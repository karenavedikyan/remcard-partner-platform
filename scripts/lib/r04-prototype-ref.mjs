/**
 * Drive frozen remcard-profile-wizard prototype to agent «Партнёры» collection.
 */
import { applyRefParityCaptureStyles } from './r03-prototype-ref.mjs';

export async function driveRefAgentPartners(page, baseUrl, opts = {}) {
  const viewMode = opts.viewMode ?? 'list';
  const segment = opts.segment ?? 'active';

  await page.goto(`${baseUrl}/roles.html`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const app = document.getElementById('app');
      const text = app?.textContent ?? '';
      return text.length > 80 && !/Загружаем прототип/i.test(text);
    },
    { timeout: 90_000 },
  );

  await page.evaluate(() => {
    const sel = document.querySelector('[data-testid="scenario-role"]');
    if (!(sel instanceof HTMLSelectElement)) throw new Error('ref_role_select_missing');
    sel.value = 'agent';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(600);

  const cabinetBtn = page.locator('[data-testid="view-cabinet"]');
  if ((await cabinetBtn.getAttribute('aria-pressed')) !== 'true') {
    await cabinetBtn.click({ force: true });
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

  if (opts.openFind) {
    const findBtn = page.getByRole('button', { name: /Найти|пригласить/i }).first();
    if (await findBtn.isVisible().catch(() => false)) {
      await findBtn.click();
      await page.waitForTimeout(600);
    }
  }

  await applyRefParityCaptureStyles(page);

  if (segment !== 'invitations' && !opts.openFind) {
    const filters = await page.locator('[data-testid="active-partner-filters"]').count();
    if (filters === 0) {
      return { ok: false, reason: 'ref_missing_partner_filters' };
    }
  }

  return { ok: true, viewMode, segment };
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
    await page.getByRole('button', { name: 'Найти в RemCard' }).click();
    await page.waitForTimeout(600);
  } else if (panel === 'invitations') {
    const tab = page.locator('[data-testid="agent-r04-partners"]').getByRole('tab', { name: 'Приглашения' });
    await tab.click({ timeout: 20_000 });
    await page.waitForTimeout(400);
  }
}
