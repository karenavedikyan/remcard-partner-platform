/** Matched impl/ref synthetic catalog preview data (designer preset). */

export const R06_PREVIEW_FIXTURE = {
  publicName: 'R06 Visual Catalog',
  city: 'Krasnodar',
  phone: '+79001112233',
  designerKind: 'designer',
  serviceIds: ['design', 'planning'],
  stageIds: ['L1-1'],
  serviceLabels: ['Дизайн интерьера', 'Планирование'],
  /** L1-1 stage label in impl taxonomy UI (emoji prefix). */
  stageImplLabels: ['📐 Планирование'],
  /** Stage chip label in ref prototype preview. */
  stageRefLabel: 'Планирование',
};

function catalogRoot(page) {
  return page.locator('[data-testid="specialist-catalog-wizard"]');
}

export async function fillImplCatalogCard(page, fixture = R06_PREVIEW_FIXTURE) {
  const root = catalogRoot(page);
  await root.locator('#sc-public-name').fill(fixture.publicName);
  await root.locator('#sc-city').fill(fixture.city);
  const showFull = root.getByRole('checkbox', { name: /Показывать полное имя в каталоге/i });
  if (!(await showFull.isChecked())) await showFull.check();
}

export async function selectImplCatalogDirections(page, fixture = R06_PREVIEW_FIXTURE) {
  const root = catalogRoot(page);
  await root.waitFor({ state: 'visible' });
  await page.waitForFunction(
    () => {
      const w = document.querySelector('[data-testid="specialist-catalog-wizard"]');
      if (!w) return false;
      const fieldsets = [...w.querySelectorAll('fieldset')];
      const services = fieldsets.find((f) =>
        (f.querySelector('legend')?.textContent || '').includes('Работы и услуги'),
      );
      return services && services.querySelectorAll('input[type="checkbox"]').length >= 3;
    },
    undefined,
    { timeout: 60_000 },
  );
  const servicesGroup = root.getByRole('group', { name: 'Работы и услуги' });
  await servicesGroup.waitFor({ state: 'visible', timeout: 30_000 });
  for (const label of fixture.serviceLabels) {
    const cb = servicesGroup.getByRole('checkbox', { name: label, exact: true });
    if ((await cb.count()) === 0) throw new Error(`impl_service_checkbox_missing:${label}`);
    if (!(await cb.isChecked())) await cb.check();
    if (!(await cb.isChecked())) throw new Error(`impl_service_not_checked:${label}`);
  }
  const stagesGroup = root.getByRole('group', { name: /На каких этапах/i });
  await stagesGroup.waitFor({ state: 'visible', timeout: 30_000 });
  for (const label of fixture.stageImplLabels) {
    const cb = stagesGroup.getByRole('checkbox', { name: label, exact: true });
    if ((await cb.count()) === 0) throw new Error(`impl_stage_checkbox_missing:${label}`);
    if (!(await cb.isChecked())) await cb.check();
    if (!(await cb.isChecked())) throw new Error(`impl_stage_not_checked:${label}`);
  }
}

export async function readImplCatalogDirections(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="specialist-catalog-wizard"]');
    if (!root) return null;
    const readGroup = (legendMatch) => {
      const fieldsets = [...root.querySelectorAll('fieldset')];
      const fs = fieldsets.find((f) => {
        const leg = f.querySelector('legend');
        return leg && legendMatch.test(leg.textContent || '');
      });
      if (!fs) return [];
      return [...fs.querySelectorAll('input[type="checkbox"]:checked')].map(
        (el) => el.parentElement?.querySelector('span')?.textContent?.trim() || '',
      );
    };
    return {
      services: readGroup(/Работы и услуги/),
      stages: readGroup(/На каких этапах/),
    };
  });
}

export async function assertImplCatalogDirections(page, fixture = R06_PREVIEW_FIXTURE) {
  const picked = await readImplCatalogDirections(page);
  for (const label of fixture.serviceLabels) {
    if (!picked?.services?.includes(label)) {
      throw new Error(`impl_directions_service_missing:${label}`);
    }
  }
  for (const label of fixture.stageImplLabels) {
    if (!picked?.stages?.includes(label)) {
      throw new Error(`impl_directions_stage_missing:${label}`);
    }
  }
}

export async function fillImplCatalogContacts(page, fixture = R06_PREVIEW_FIXTURE) {
  const phone = page.locator('[data-testid="agent-profile-input-phone"]').first();
  await phone.waitFor({ state: 'visible', timeout: 30_000 });
  await phone.fill(fixture.phone);
}

async function refCheckbox(page, group, id) {
  const box = page.locator(
    `[data-catalog-panel="directions"] input[type="checkbox"][name="${group}"][value="${id}"]`,
  );
  if ((await box.count()) === 0) {
    throw new Error(`ref_catalog_checkbox_missing:${group}:${id}`);
  }
  if (!(await box.isChecked())) await box.check({ force: true });
  if (!(await box.isChecked())) {
    throw new Error(`ref_catalog_checkbox_not_checked:${group}:${id}`);
  }
}

export async function selectRefCatalogDirections(page, fixture = R06_PREVIEW_FIXTURE) {
  const kind = page.locator('[data-catalog-panel="directions"] [data-specialist-kind]');
  if (await kind.count()) await kind.selectOption(fixture.designerKind);
  for (const id of fixture.serviceIds) {
    await refCheckbox(page, 'services', id);
  }
  for (const id of fixture.stageIds) {
    await refCheckbox(page, 'stages', id);
  }
}

export async function readRefCatalogDirections(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-catalog-panel="directions"]');
    if (!panel) return null;
    return {
      services: [...panel.querySelectorAll('input[name="services"]:checked')].map((el) => el.value),
      stages: [...panel.querySelectorAll('input[name="stages"]:checked')].map((el) => el.value),
    };
  });
}

export async function assertRefCatalogDirections(page, fixture = R06_PREVIEW_FIXTURE) {
  const picked = await readRefCatalogDirections(page);
  for (const id of fixture.serviceIds) {
    if (!picked?.services?.includes(id)) throw new Error(`ref_directions_service_missing:${id}`);
  }
  for (const id of fixture.stageIds) {
    if (!picked?.stages?.includes(id)) throw new Error(`ref_directions_stage_missing:${id}`);
  }
}

export async function fillRefCatalogCard(page, fixture = R06_PREVIEW_FIXTURE) {
  await page.locator('[name="publicName"]').fill(fixture.publicName);
  await page.locator('[name="city"]').fill(fixture.city);
}

function phoneDigits(phone) {
  return String(phone).replace(/\D/g, '');
}

export async function assertImplCatalogPreviewReady(page, fixture = R06_PREVIEW_FIXTURE) {
  await page.waitForFunction(
    () => document.querySelector('[data-testid="specialist-catalog-wizard"]')?.dataset.catalogStep === '4',
  );
  const root = catalogRoot(page);
  const text = await root.innerText();
  if (!/Можно отправить заявку/i.test(text)) throw new Error('impl_preview_not_ready_to_submit');
  if (/Заполните:/i.test(text)) throw new Error('impl_preview_missing_fields');
  const preview = await page.locator('[data-testid="catalog-public-preview"]').innerText();
  const blob = `${text}\n${preview}`;
  if (!blob.includes(fixture.publicName)) throw new Error('impl_preview_publicName_mismatch');
  if (!blob.includes(fixture.city)) throw new Error('impl_preview_city_mismatch');
  for (const label of fixture.serviceLabels) {
    if (!blob.includes(label)) throw new Error(`impl_preview_service_missing:${label}`);
  }
  for (const label of fixture.stageImplLabels) {
    if (!blob.includes(label.replace(/^[^\s]+\s/, '').trim()) && !blob.includes(label)) {
      throw new Error(`impl_preview_stage_missing:${label}`);
    }
  }
  const digits = phoneDigits(fixture.phone);
  if (!blob.replace(/\D/g, '').includes(digits.slice(-10))) {
    throw new Error('impl_preview_phone_mismatch');
  }
  const submit = root.getByRole('button', { name: /Отправить на публикацию|Отправить повторно/i });
  if (!(await submit.count())) throw new Error('impl_preview_submit_missing');
  if (await submit.isDisabled()) throw new Error('impl_preview_submit_disabled');
}

export async function assertRefCatalogPreviewReady(page, fixture = R06_PREVIEW_FIXTURE) {
  await page.waitForSelector('[data-catalog-panel="review"]:not([hidden])');
  const readiness = await page.locator('[data-catalog-readiness]').innerText();
  if (!/Обязательные поля заполнены/i.test(readiness)) {
    if (/Осталось заполнить/i.test(readiness)) throw new Error('ref_preview_missing_fields');
    throw new Error(`ref_preview_readiness_unexpected:${readiness.slice(0, 120)}`);
  }
  const send = page.locator('[data-catalog-action="send"]');
  if (!(await send.count())) throw new Error('ref_preview_send_missing');
  if (await send.isDisabled()) throw new Error('ref_preview_send_disabled');
  const cardText = await page.locator('[data-catalog-panel="review"]').innerText();
  if (!cardText.includes(fixture.publicName)) throw new Error('ref_preview_publicName_mismatch');
  if (!cardText.includes(fixture.city)) throw new Error('ref_preview_city_mismatch');
  for (const label of fixture.serviceLabels) {
    if (!cardText.includes(label)) throw new Error(`ref_preview_service_missing:${label}`);
  }
  if (!cardText.includes(fixture.stageRefLabel)) {
    throw new Error(`ref_preview_stage_missing:${fixture.stageRefLabel}`);
  }
  const digits = phoneDigits(fixture.phone);
  if (!cardText.replace(/\D/g, '').includes(digits.slice(-10))) {
    throw new Error('ref_preview_phone_mismatch');
  }
}
