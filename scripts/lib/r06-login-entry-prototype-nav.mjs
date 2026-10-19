/** Specialist profile + catalog navigation in login-entry-20261018 prototype. */
import { assertPrototypePageReady, PROTO_LOAD_ERROR } from './r06-login-entry-prototype-pack.mjs';

export async function bootRefCabinetSpecialist(page, protoBaseUrl) {
  await page.goto(`${protoBaseUrl}/roles.html`, { waitUntil: 'networkidle', timeout: 120_000 });
  await assertPrototypePageReady(page);
  await page.evaluate(() => {
    document.querySelector('[data-testid="view-cabinet"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });
  await page.waitForSelector('[data-testid="scenario-role"]', { timeout: 60_000 });
  await page.getByTestId('scenario-role').selectOption('specialist');
  await page.locator('[data-action="nav:profile"]').click();
  await page.waitForSelector('.production-profile, [data-profile-form="working"], [data-profile-wizard="specialist"]', {
    timeout: 60_000,
  });
  const err = await page.evaluate((t) => document.body?.textContent?.includes(t), PROTO_LOAD_ERROR);
  if (err) throw new Error('ref_prototype_load_error_banner');
}

export async function openRefCatalogProfile(page, protoBaseUrl) {
  await bootRefCabinetSpecialist(page, protoBaseUrl);
  const catalogTab = page.locator('[data-profile-action="tab"][data-profile-id="catalog"]');
  if (await catalogTab.count()) await catalogTab.click();
  await page.waitForSelector('[data-profile-step="catalog"]', { timeout: 60_000 });
}

export async function refCompleteWorkingProfile(page, protoBaseUrl) {
  await bootRefCabinetSpecialist(page, protoBaseUrl);
  if (await page.locator('[data-testid="pw-summary"]').count()) return;
  const wizard = page.locator('[data-profile-wizard="specialist"]');
  if (await wizard.count()) {
    await page.locator('[name="name"]').fill('R06 Visual Spec');
    await page.locator('[name="city"]').fill('Krasnodar');
    await page.getByTestId('pw-next').click();
    await page.locator('[data-specialist-kind]').selectOption('designer');
    await page.getByTestId('pw-next').click();
    await page.getByRole('button', { name: 'Пропустить' }).click();
    await page.getByTestId('pw-next').click();
    await page.waitForSelector('[data-testid="pw-summary"]');
    return;
  }
  await page.locator('[data-profile-action="tab"][data-profile-id="basics"]').click();
  await page.locator('[name="name"]').fill('R06 Visual Spec');
  await page.locator('[name="city"]').fill('Krasnodar');
  await page.getByRole('button', { name: /Сохранить основные данные/i }).click();
}

export async function prepareRefSpecializationStep(page, protoBaseUrl) {
  await refCompleteWorkingProfile(page, protoBaseUrl);
  if (await page.locator('[data-pw-action="edit"]').count()) {
    await page.locator('[data-pw-action="edit"]').click();
    await page.waitForSelector('.pw-steps');
    await page.locator('[data-testid="pw-step-1"]').click();
    await page.waitForSelector('[data-specialist-kind]', { state: 'visible' });
    return;
  }
  await page.locator('[data-profile-action="tab"][data-profile-id="activity"]').click();
  await page.waitForSelector('[data-specialist-kind]', { state: 'visible' });
}

export async function prepareRefBasicsStep(page, protoBaseUrl) {
  await bootRefCabinetSpecialist(page, protoBaseUrl);
  await page.locator('[data-profile-action="tab"][data-profile-id="basics"]').click();
  await page.waitForSelector('[name="name"]', { state: 'visible' });
}

export async function prepareRefContactsStep(page, protoBaseUrl) {
  await prepareRefSpecializationStep(page, protoBaseUrl);
  await page.getByTestId('pw-step-2').click();
  await page.waitForSelector('[data-testid="pw-input-contactPhone"], [name="contactPhone"]', {
    timeout: 30_000,
  });
}

export async function prepareRefReviewStep(page, protoBaseUrl) {
  await prepareRefContactsStep(page, protoBaseUrl);
  await page.getByTestId('pw-step-3').click();
  await page.waitForSelector('[data-testid="pw-progress"]', { timeout: 30_000 });
}
