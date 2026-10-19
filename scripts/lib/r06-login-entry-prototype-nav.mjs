/** Specialist profile + catalog navigation in login-entry prototype (roles.html shell). */
import { assertPrototypePageReady } from './r06-login-entry-prototype-pack.mjs';

export async function bootRefCabinetSpecialist(page, protoBaseUrl) {
  await page.goto(`${protoBaseUrl}/roles.html`, { waitUntil: 'load', timeout: 120_000 });
  await assertPrototypePageReady(page);
  await page.evaluate(() => {
    document.querySelector('[data-action="view:cabinet"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const sel = document.querySelector('[data-control="role"], [data-testid="scenario-role"]');
    if (sel instanceof HTMLSelectElement) {
      sel.value = 'specialist';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.evaluate(() => {
    document.querySelector('[data-action="nav:profile"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });
  await page.waitForSelector('.production-profile, [data-profile-form="working"]', { timeout: 60_000 });
}

export async function openRefCatalogProfile(page, protoBaseUrl) {
  await bootRefCabinetSpecialist(page, protoBaseUrl);
  const catalogTab = page
    .locator('[data-profile-action="tab"], [role="tab"]')
    .filter({ hasText: /Каталог/i })
    .first();
  if (await catalogTab.count()) await catalogTab.click();
  await page.waitForSelector('[data-profile-step="catalog"]', { timeout: 60_000 });
}

export async function refCompleteWorkingProfile(page, protoBaseUrl) {
  await bootRefCabinetSpecialist(page, protoBaseUrl);
  if (await page.locator('[data-testid="pw-summary"]').count()) return;
  await page.locator('[name="name"]').fill('R06 Visual Spec');
  await page.locator('[name="city"]').fill('Krasnodar');
  await page.getByTestId('pw-next').click();
  await page.locator('[data-specialist-kind]').selectOption('designer');
  await page.getByTestId('pw-next').click();
  await page.getByRole('button', { name: 'Пропустить' }).click();
  await page.getByTestId('pw-next').click();
  await page.waitForSelector('[data-testid="pw-summary"]');
}

export async function prepareRefSpecializationStep(page, protoBaseUrl) {
  await refCompleteWorkingProfile(page, protoBaseUrl);
  await page.locator('[data-pw-action="edit"]').click();
  await page.waitForSelector('.pw-steps');
  await page.locator('[data-testid="pw-step-1"]').click();
  await page.waitForSelector('[data-specialist-kind]', { state: 'visible' });
}

export async function prepareRefBasicsStep(page, protoBaseUrl) {
  await bootRefCabinetSpecialist(page, protoBaseUrl);
  if (await page.locator('[data-testid="pw-summary"]').count()) {
    await page.locator('[data-pw-action="edit"]').click();
    await page.waitForSelector('.pw-steps');
  }
  await page.locator('[data-testid="pw-step-0"]').click();
  await page.waitForSelector('[name="name"]', { state: 'visible' });
}

export async function prepareRefContactsStep(page, protoBaseUrl) {
  await refCompleteWorkingProfile(page, protoBaseUrl);
  await page.locator('[data-pw-action="edit"]').click();
  await page.waitForSelector('.pw-steps');
  await page.locator('[data-testid="pw-step-2"]').click();
  await page.waitForSelector('[data-testid="pw-input-contactPhone"], [name="contactPhone"]', {
    timeout: 30_000,
  });
}

export async function prepareRefReviewStep(page, protoBaseUrl) {
  await refCompleteWorkingProfile(page, protoBaseUrl);
  await page.locator('[data-pw-action="edit"]').click();
  await page.waitForSelector('.pw-steps');
  await page.locator('[data-testid="pw-step-3"]').click();
  await page.waitForSelector('[data-testid="pw-progress"]', { timeout: 30_000 });
}
