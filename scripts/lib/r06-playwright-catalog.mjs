/** Shared catalog wizard step transitions for R06 Playwright runners. */

function catalogWizard(page) {
  return page.locator('[data-testid="specialist-catalog-wizard"]');
}

function catalogNextButton(page) {
  return catalogWizard(page)
    .getByRole('button', { name: /Далее|Предпросмотр/i })
    .and(page.locator(':not([disabled])'))
    .first();
}

function catalogBackButton(page) {
  return catalogWizard(page).getByRole('button', { name: 'Назад' }).first();
}

export async function fillCatalogStepRequirements(page, step) {
  if (step === 0) {
    const name = page.locator('#sc-public-name');
    if (await name.count()) {
      const val = await name.inputValue();
      if (!val.trim()) await name.fill('R06 BFF Catalog');
    }
    const city = page.locator('#sc-city');
    if (await city.count()) {
      const val = await city.inputValue();
      if (!val.trim()) await city.fill('Krasnodar');
    }
  }
  if (step === 1) {
    const copyBtn = page.getByRole('button', { name: /Взять услуги и этапы из рабочего профиля/i });
    if (await copyBtn.count()) {
      await copyBtn.click();
    } else {
      const boxes = page.locator('[data-testid="specialist-catalog-wizard"] input[type="checkbox"]');
      const n = await boxes.count();
      for (let i = 0; i < Math.min(2, n); i += 1) {
        if (!(await boxes.nth(i).isChecked())) await boxes.nth(i).check();
      }
    }
    await page.waitForTimeout(150);
  }
  if (step === 2) {
    const phone = page.locator('[data-testid="agent-profile-input-phone"]').first();
    if (await phone.count()) {
      const val = await phone.inputValue();
      if (!val.trim()) await phone.fill('+79001112233');
    }
  }
}

async function readCatalogStep(page) {
  const wizard = page.locator('[data-testid="specialist-catalog-wizard"]');
  await wizard.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction(() => {
    const step = document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep;
    return step !== undefined && step !== '';
  });
  const rawStep = await wizard.getAttribute('data-catalog-step');
  const current = Number(rawStep);
  if (Number.isNaN(current)) throw new Error(`invalid_catalog_step:${String(rawStep)}`);
  return current;
}

export async function ensureCatalogStep(page, targetStep) {
  for (let guard = 0; guard < 10; guard += 1) {
    const current = await readCatalogStep(page);
    if (current === targetStep) return;
    if (current < targetStep) {
      await fillCatalogStepRequirements(page, current);
      const expected = current + 1;
      await catalogNextButton(page).click();
      await page.waitForFunction(
        (step) =>
          Number(document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep) ===
          step,
        expected,
        { timeout: 30_000 },
      );
    } else {
      await catalogBackButton(page).click();
      await page.waitForFunction(
        (step) =>
          Number(document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep) ===
          step,
        current - 1,
        { timeout: 30_000 },
      );
    }
  }
  throw new Error(`ensure_catalog_step_timeout:${targetStep}`);
}

export async function advanceCatalogSteps(page, toStep) {
  await ensureCatalogStep(page, toStep);
}

const REF_CATALOG_STEP_IDS = ['card', 'directions', 'contacts', 'presentation', 'review'];

export async function advanceRefCatalogSteps(page, toIndex) {
  for (;;) {
    const currentIndex = await page.evaluate(() => {
      const panel = document.querySelector(
        '[data-catalog-form] [data-catalog-panel]:not([hidden])',
      );
      const id = panel?.dataset.catalogPanel;
      const steps = ['card', 'directions', 'contacts', 'presentation', 'review'];
      return steps.indexOf(id ?? '');
    });
    if (currentIndex < 0) throw new Error('ref_catalog_step_unknown');
    if (currentIndex >= toIndex) return;

    if (currentIndex === 0) {
      const name = page.locator('[name="publicName"]');
      if (await name.count()) {
        const val = await name.inputValue();
        if (!val.trim()) await name.fill('R06 Visual Catalog');
      }
      const city = page.locator('[name="city"]');
      if (await city.count()) {
        const val = await city.inputValue();
        if (!val.trim()) await city.fill('Krasnodar');
      }
    }
    if (currentIndex === 1) {
      const copyBtn = page.locator('[data-catalog-action="copy-directions"]');
      if ((await copyBtn.count()) && (await copyBtn.isEnabled())) {
        await copyBtn.click();
      }
      const boxes = page.locator(
        '[data-catalog-panel="directions"] input[type="checkbox"], [data-catalog-form] .direction-option input[type="checkbox"]',
      );
      const n = await boxes.count();
      let picked = 0;
      for (let i = 0; i < n && picked < 2; i += 1) {
        const box = boxes.nth(i);
        if (!(await box.isVisible())) continue;
        if (!(await box.isChecked())) await box.check();
        picked += 1;
      }
    }
    if (currentIndex === 2) {
      const phone = page.locator('[name="publicPhone"]');
      if (await phone.count()) {
        const val = await phone.inputValue();
        if (!val.trim()) await phone.fill('+79001112233');
      }
    }

    const next = page.locator('[data-cw-move="next"]').first();
    await next.waitFor({ state: 'visible', timeout: 30_000 });
    await next.click();
    const expectedId = REF_CATALOG_STEP_IDS[currentIndex + 1];
    await page.waitForFunction(
      (stepId) => {
        const panel = document.querySelector(
          '[data-catalog-form] [data-catalog-panel]:not([hidden])',
        );
        return panel?.dataset.catalogPanel === stepId;
      },
      expectedId,
      { timeout: 30_000 },
    );
  }
}
