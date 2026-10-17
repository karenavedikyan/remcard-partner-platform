/** Shared catalog wizard step transitions for R06 Playwright runners. */

export async function advanceCatalogSteps(page, toStep) {
  for (;;) {
    const current = Number(
      await page.locator('[data-testid="specialist-catalog-wizard"]').getAttribute('data-catalog-step'),
    );
    if (Number.isNaN(current) || current >= toStep) return;
    const expected = current + 1;
    await page.getByRole('button', { name: /Далее|Предпросмотр/i }).click();
    await page.waitForFunction(
      (step) =>
        Number(document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep) ===
        step,
      expected,
      { timeout: 30_000 },
    );
  }
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
      if (await copyBtn.count()) await copyBtn.click();
      const chip = page.locator('.direction-chip, .direction-option input[type="checkbox"]').first();
      if (await chip.count()) {
        if (await chip.evaluate((el) => el.tagName === 'INPUT')) await chip.check();
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
