/**
 * Drive frozen remcard-profile-wizard prototype to a verified agent cabinet section.
 */

export const REF_PARITY_CAPTURE_CSS = `
  .demo-top,
  .review-toolbar,
  .review-details,
  details.review-details,
  .app-footer { display: none !important; }
  .page-header > .pill { display: none !important; }
`;

export async function applyRefParityCaptureStyles(page) {
  await page.addStyleTag({ content: REF_PARITY_CAPTURE_CSS });
}

export async function driveRefAgentSection(page, baseUrl, opts) {
  const section = opts.section;
  const viewMode = opts.viewMode ?? 'list';
  await page.goto(`${baseUrl}/roles.html`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const app = document.getElementById('app');
      const text = app?.textContent ?? '';
      return text.length > 80 && !/Загружаем прототип/i.test(text);
    },
    { timeout: 90_000 },
  );

  const roleSelect = page.locator('[data-testid="scenario-role"]');
  await roleSelect.waitFor({ state: 'attached', timeout: 30_000 });
  await page.evaluate(() => {
    const sel = document.querySelector('[data-testid="scenario-role"]');
    if (!(sel instanceof HTMLSelectElement)) throw new Error('ref_role_select_missing');
    sel.value = 'agent';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  const roleAfter = await roleSelect.inputValue();
  if (roleAfter !== 'agent') {
    return { ok: false, reason: 'ref_role_select_failed' };
  }

  const cabinetBtn = page.locator('[data-testid="view-cabinet"]');
  await cabinetBtn.waitFor({ state: 'attached', timeout: 20_000 });
  const cabinetPressed = await cabinetBtn.getAttribute('aria-pressed');
  if (cabinetPressed !== 'true') {
    await cabinetBtn.click({ force: true });
    await page.waitForTimeout(800);
  }

  const navKey = section === 'certificates' ? 'home' : 'clients';
  const menuBtn = page.locator('[data-action="menu"]').first();
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(400);
  }
  await page.evaluate((key) => {
    const btn = document.querySelector(`[data-action="nav:${key}"], [data-testid="nav-${key}"]`);
    if (btn instanceof HTMLElement) btn.click();
  }, navKey);
  await page.waitForTimeout(600);

  const heading = section === 'certificates' ? 'Сертификаты' : 'Клиенты';
  await page.getByRole('heading', { name: heading }).first().waitFor({ timeout: 20_000 });

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
        theme:
          document.documentElement.getAttribute('data-theme') ||
          document.documentElement.dataset.theme ||
          null,
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
      }));
      if (state.theme === 'dark' || state.colorScheme === 'dark') break;
      if (await themeBtn.isVisible().catch(() => false)) {
        await themeBtn.click();
        await page.waitForTimeout(500);
      } else break;
    }
  }

  if (opts.scrollList && viewMode === 'list') {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
  }

  if (opts.searchQuery) {
    await page.evaluate((q) => {
      const input = document.querySelector('[data-coll-control="q"]');
      if (input instanceof HTMLInputElement) {
        input.value = q;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, opts.searchQuery);
    await page.waitForTimeout(500);
  }

  await applyRefParityCaptureStyles(page);

  const verify = await verifyRefAgentSection(page, opts);
  if (!verify.ok) return verify;

  return { ok: true, section, viewMode };
}

export async function verifyRefAgentSection(page, opts) {
  const role = await page.locator('[data-testid="scenario-role"]').inputValue().catch(() => '');
  if (role !== 'agent') return { ok: false, reason: 'ref_role_not_agent' };

  const cabinetPressed = await page
    .locator('[data-testid="view-cabinet"]')
    .getAttribute('aria-pressed');
  if (cabinetPressed !== 'true') return { ok: false, reason: 'ref_not_cabinet_mode' };

  const headingName = opts.section === 'certificates' ? 'Сертификаты' : 'Клиенты';
  const heading = page.getByRole('heading', { name: headingName }).first();
  if (!(await heading.isVisible().catch(() => false))) {
    return { ok: false, reason: `ref_missing_heading_${headingName}` };
  }

  const navKey = opts.section === 'certificates' ? 'home' : 'clients';
  const navCurrent = await page
    .locator(`[data-action="nav:${navKey}"], [data-testid="nav-${navKey}"]`)
    .first()
    .getAttribute('aria-current');
  if (navCurrent !== 'page') return { ok: false, reason: 'ref_nav_not_active' };

  if (opts.viewMode === 'list') {
    const listBtn = page.locator('[data-coll-action="view-list"]').first();
    const pressed = await listBtn.getAttribute('aria-pressed');
    if (pressed !== 'true') return { ok: false, reason: 'ref_not_list_view' };
  }
  if (opts.viewMode === 'cards') {
    const cardsBtn = page.locator('[data-coll-action="view-cards"]').first();
    const pressed = await cardsBtn.getAttribute('aria-pressed');
    if (pressed !== 'true') return { ok: false, reason: 'ref_not_cards_view' };
  }

  return { ok: true };
}

export async function driveRefSpecialistClients(page, baseUrl, opts = {}) {
  const viewMode = opts.viewMode ?? 'list';
  const panel = opts.panel ?? 'list';
  if (opts.width && opts.height) {
    await page.setViewportSize({ width: opts.width, height: opts.height });
  }
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
    sel.value = 'specialist';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="view-cabinet"]');
    if (btn instanceof HTMLElement && btn.getAttribute('aria-pressed') !== 'true') {
      btn.click();
    }
  });
  await page.waitForTimeout(800);

  const menuBtn = page.locator('[data-action="menu"]').first();
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    const btn = document.querySelector('[data-action="nav:clients"], [data-testid="nav-clients"]');
    if (btn instanceof HTMLElement) btn.click();
  });
  await page.waitForTimeout(800);
  await page.getByRole('heading', { name: 'Клиенты' }).first().waitFor({ timeout: 25_000 });

  const viewAction = viewMode === 'list' ? 'view-list' : 'view-cards';
  const viewBtn = page.locator(`[data-coll-action="${viewAction}"]`).first();
  if (await viewBtn.isVisible().catch(() => false)) {
    await viewBtn.click();
    await page.waitForTimeout(400);
  }

  if (panel === 'detail') {
    await page.locator('[data-coll-open]').first().click();
    await page.waitForTimeout(600);
    await page.getByRole('heading', { name: /Анна|Клиент/i }).first().waitFor({ timeout: 15_000 });
  } else if (panel === 'form-create') {
    await page.locator('[data-action="client-add"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('#client-form').waitFor({ timeout: 15_000 });
  } else if (panel === 'form-edit-empty') {
    await page.evaluate(() => {
      const opens = [
        ...document.querySelectorAll('[data-coll-open], button.collection-open[data-coll-open]'),
      ];
      const byLabel = opens.find((el) => /Пустой|empty/i.test(el.textContent ?? ''));
      const target = byLabel ?? opens[opens.length - 1];
      if (target instanceof HTMLElement) target.click();
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const edit = document.querySelector('[data-action^="client-edit:"]');
      if (edit instanceof HTMLElement) edit.click();
    });
    await page.waitForTimeout(500);
    await page.locator('#client-form').waitFor({ timeout: 15_000 });
  }

  if (opts.theme === 'dark') {
    const themeBtn = page.locator('[data-action="theme"], [data-testid="theme-toggle"]').first();
    for (let i = 0; i < 6; i++) {
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme'),
      );
      if (theme === 'dark') break;
      if (await themeBtn.isVisible().catch(() => false)) await themeBtn.click();
      await page.waitForTimeout(400);
    }
  }

  await applyRefParityCaptureStyles(page);
  return { ok: true, panel, viewMode };
}

export async function verifyImplAgentShell(page, section, viewMode) {
  if (!(await page.locator('[data-testid="agent-product-topbar"]').isVisible().catch(() => false))) {
    return { ok: false, reason: 'impl_not_agent_shell' };
  }
  const navKey = section === 'certificates' ? 'certificates' : 'clients';
  const viewport = page.viewportSize();
  const isMobile = viewport != null && viewport.width <= 680;
  const desktopNav = page.locator(`[data-testid="nav-${navKey}"]`);
  const mobileNav = page.locator(`[data-testid="nav-mobile-${navKey}"]`);
  if (isMobile) {
    const mobileVisible = await mobileNav.isVisible().catch(() => false);
    if (!mobileVisible) {
      const more = page.locator('[data-testid="mobile-nav-more"]');
      if (!(await more.isVisible().catch(() => false))) {
        return { ok: false, reason: `impl_missing_mobile_nav_${navKey}` };
      }
    }
  } else if (!(await desktopNav.isVisible().catch(() => false))) {
    return { ok: false, reason: `impl_missing_nav_${navKey}` };
  }

  const heading = section === 'certificates' ? 'Сертификаты' : 'Клиенты';
  await page.getByRole('heading', { name: heading }).waitFor({ timeout: 20_000 });

  const listToggle = page.locator('[data-testid="agent-r03-view-toggle"] button[aria-pressed="true"]');
  const activeText = ((await listToggle.textContent()) ?? '').trim();
  if (viewMode === 'list' && !activeText.includes('Список')) {
    return { ok: false, reason: 'impl_not_list_view' };
  }
  if (viewMode === 'cards' && !activeText.includes('Карточки')) {
    return { ok: false, reason: 'impl_not_cards_view' };
  }
  return { ok: true };
}
