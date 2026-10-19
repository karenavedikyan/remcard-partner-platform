/** Matched impl/ref synthetic catalog preview data (designer preset). */

/** Fixed fixture for R06-CONTACTS-CONTROL-01 (ref + impl must match). */
/** Matched ref/impl for R06-PROFILE-PATTERN-TRANSFER-01 (basics + specialization + review). */
export const R06_PROFILE_PATTERN_FIXTURE = {
  displayName: 'Паттерн Тест Спец',
  city: 'Krasnodar',
  specialistKind: 'designer',
  specialistTitle: '',
  customSpecialistTitle: 'Реставратор фасадов',
  serviceSpecializationIds: ['design', 'planning'],
  navigatorStageIds: ['L1-1'],
  serviceLabels: ['Дизайн интерьера', 'Планирование'],
  stageImplLabels: ['📐 Планирование'],
  phone: '+79001112233',
  email: 'pattern.transfer@example.ru',
};

export const R06_CONTACTS_FIXTURE = {
  displayName: 'Контакт Тест Спец',
  city: 'Krasnodar',
  phone: '+79186360088',
  email: 'contacts.control@example.ru',
  website: 'example-contacts.ru',
  telegram: '@contact_control',
  partnerWorkModeLabel: 'По адресу',
  partnerWorkModeValue: 'ON_SITE',
  areas: 'Краснодар и ближайшие районы',
};

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
  stageImplChipPrefix: 'Этап:',
  /** Stage chip label in ref prototype preview. */
  stageRefLabel: 'Планирование',
};

function catalogRoot(page) {
  return page.locator('[data-testid="specialist-catalog-wizard"]');
}

/** R06.3 B: stages live in a collapsed `<details>` on catalog + working profile steps. */
async function openImplAdvancedDirections(root) {
  const details = root.locator('[data-testid="direction-advanced-collapse"]');
  if ((await details.count()) > 0) {
    const open = await details.evaluate((el) => el.open);
    if (!open) await details.locator('summary').click();
    await details.locator('fieldset').first().waitFor({ state: 'visible', timeout: 15_000 });
    return;
  }
  const stagesGroup = root.locator('[data-direction-group="stages"]');
  if ((await stagesGroup.count()) === 0) return;
  const open = await stagesGroup.evaluate((el) => el.open);
  if (!open) await stagesGroup.locator('summary').click();
  await stagesGroup.locator('fieldset').first().waitFor({ state: 'visible', timeout: 15_000 });
}

export async function fillImplCatalogCard(page, fixture = R06_PREVIEW_FIXTURE) {
  const root = catalogRoot(page);
  await root.locator('#sc-public-name').fill(fixture.publicName);
  await root.locator('#sc-city').fill(fixture.city);
  const showFull = root.getByRole('checkbox', {
    name: /Показывать полное имя представителя в каталоге/i,
  });
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
  await openImplAdvancedDirections(root);
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
  const chips = await page
    .locator('[data-testid="catalog-public-preview"] span')
    .filter({ hasText: /^(Услуга|Этап):/ })
    .allTextContents();
  if (!preview.includes(fixture.publicName)) throw new Error('impl_preview_publicName_mismatch');
  if (!preview.includes(fixture.city)) throw new Error('impl_preview_city_mismatch');
  if (!chips.some((t) => new RegExp(`^Услуга:\\s*${fixture.serviceLabels[0]}`).test(t.trim()))) {
    throw new Error('impl_preview_service_chip_missing');
  }
  if (!chips.some((t) => /^Этап:\s*/.test(t.trim()) && t.includes('Планирование'))) {
    throw new Error('impl_preview_stage_chip_missing');
  }
  const digits = phoneDigits(fixture.phone);
  if (!preview.replace(/\D/g, '').includes(digits.slice(-10))) {
    throw new Error('impl_preview_phone_mismatch');
  }
  if (!/Телефон:/i.test(preview)) throw new Error('impl_preview_phone_label_missing');
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
  const chips = await page
    .locator('[data-catalog-panel="review"] .direction-chip, .catalog-demo-preview .direction-chip')
    .allTextContents();
  if (!chips.some((t) => t.includes(fixture.serviceLabels[0]))) {
    throw new Error('ref_preview_service_chip_missing');
  }
  if (!chips.some((t) => t.includes('📐') || (t.includes('Планирование') && !t.includes('Дизайн')))) {
    throw new Error('ref_preview_stage_chip_missing');
  }
  const digits = phoneDigits(fixture.phone);
  if (!cardText.replace(/\D/g, '').includes(digits.slice(-10))) {
    throw new Error('ref_preview_phone_mismatch');
  }
}

export async function assertImplContactsStepReady(page) {
  await page.getByRole('heading', { name: 'Как с вами связаться?' }).waitFor({ timeout: 30_000 });
  await page.waitForSelector('[data-testid="specialist-profile-contacts-panel"]', { timeout: 30_000 });
}

export async function assertRefContactsStepReady(page) {
  await page.locator('#pw-title').getByText('Как с вами связаться?').waitFor({ timeout: 30_000 });
  await page.waitForSelector('[name="contactPhone"], [data-testid="pw-input-contactPhone"]', {
    timeout: 30_000,
  });
}

export async function fillRefContactsFixture(page, fixture = R06_CONTACTS_FIXTURE, options = {}) {
  const { openDetails = false } = options;
  const phone = page.locator('[name="contactPhone"], [data-testid="pw-input-contactPhone"]').first();
  await phone.fill(fixture.phone);
  await page.locator('[name="contactEmail"]').fill(fixture.email);
  if (openDetails) {
    const siteBlock = page.locator('details.pw-optional').filter({ hasText: 'Сайт и Telegram' });
    await siteBlock.locator('summary').click();
    await page.locator('[name="website"]').fill(fixture.website);
    await page.locator('[name="telegram"]').fill(fixture.telegram);
    const workBlock = page.locator('details.pw-optional').filter({ hasText: 'Где и как вы работаете' });
    await workBlock.locator('summary').click();
    await page.locator('[name="partnerWorkMode"]').selectOption({ label: fixture.partnerWorkModeLabel });
    await page.locator('[name="serviceArea"]').fill(fixture.areas);
  } else {
    for (const el of await page.locator('details.pw-optional').all()) {
      await el.evaluate((node) => {
        node.open = false;
      });
    }
  }
}

export async function fillImplContactsFixture(page, fixture = R06_CONTACTS_FIXTURE, options = {}) {
  const { openDetails = false } = options;
  const phone = page.getByTestId('agent-profile-input-phone');
  await phone.fill(fixture.phone);
  await phone.blur();
  await page.locator('#sp-email').fill(fixture.email);
  if (openDetails) {
    const siteBlock = page.getByTestId('sp-contacts-optional-site-tg');
    await siteBlock.locator('summary').click();
    await page.locator('#sp-site').fill(fixture.website);
    await page.locator('#sp-tg').fill(fixture.telegram);
    const workBlock = page.getByTestId('sp-contacts-optional-work');
    await workBlock.locator('summary').click();
    await page.locator('#sp-workmode').selectOption(fixture.partnerWorkModeValue);
    await page.locator('#sp-areas').fill(fixture.areas);
  } else {
    for (const testId of ['sp-contacts-optional-site-tg', 'sp-contacts-optional-work']) {
      const el = page.getByTestId(testId);
      if (await el.count()) {
        await el.evaluate((node) => {
          node.open = false;
        });
      }
    }
  }
}

function rectMetrics(node) {
  if (!node) return null;
  const b = node.getBoundingClientRect();
  return { width: Math.round(b.width), height: Math.round(b.height) };
}

export async function measureContactsFormBox(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const phone = el.querySelector('[name="contactPhone"], [data-testid="agent-profile-input-phone"]');
    const email = el.querySelector('[name="contactEmail"], #sp-email');
    const grid = el.querySelector('.pw-two, [data-testid="specialist-contacts-two-col"]');
    const pr = (node) => {
      if (!node) return null;
      const b = node.getBoundingClientRect();
      return { width: Math.round(b.width), height: Math.round(b.height) };
    };
    const gridStyle = grid ? getComputedStyle(grid) : null;
    return {
      form: { width: Math.round(r.width), height: Math.round(r.height) },
      grid: {
        ...pr(grid),
        gap: gridStyle?.gap ?? null,
        gridTemplateColumns: gridStyle?.gridTemplateColumns ?? null,
      },
      phoneInput: pr(phone),
      emailInput: pr(email),
    };
  }, selector);
}

export async function measureContactsComputedActions(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="specialist-contacts-actions"]');
    if (!root) return null;
    const left = root.querySelector('[class*="contactsActionsLeft"]');
    const right = root.querySelector('[class*="contactsActionsRight"]');
    const cs = (node) => (node ? getComputedStyle(node) : null);
    const leftStyle = cs(left);
    const rightStyle = cs(right);
    return {
      actions: {
        display: getComputedStyle(root).display,
        flexWrap: getComputedStyle(root).flexWrap,
      },
      left: leftStyle
        ? { display: leftStyle.display, flexWrap: leftStyle.flexWrap, gap: leftStyle.gap }
        : null,
      right: rightStyle
        ? { display: rightStyle.display, flexWrap: rightStyle.flexWrap, gap: rightStyle.gap }
        : null,
    };
  });
}

export async function assertImplBasicsStepReady(page) {
  await page.getByRole('heading', { name: 'Расскажите о себе' }).waitFor({ timeout: 30_000 });
  await page.waitForSelector('[data-testid="specialist-profile-basics-panel"]', { timeout: 30_000 });
}

export async function assertRefBasicsStepReady(page) {
  await page.locator('#pw-title').getByText('Расскажите о себе').waitFor({ timeout: 30_000 });
  await page.waitForSelector('[name="name"]', { timeout: 30_000 });
}

export async function fillImplBasicsFixture(page, fixture = R06_PROFILE_PATTERN_FIXTURE) {
  await page.locator('#sp-displayName').fill(fixture.displayName);
  await page.locator('#sp-city').fill(fixture.city);
}

export async function fillRefBasicsFixture(page, fixture = R06_PROFILE_PATTERN_FIXTURE) {
  await page.locator('[name="name"]').fill(fixture.displayName);
  await page.locator('[name="city"]').fill(fixture.city);
}

export async function assertImplSpecializationStepReady(page) {
  await page.getByRole('heading', { name: 'Чем вы занимаетесь?' }).waitFor({ timeout: 30_000 });
  await page.waitForSelector('[data-testid="specialist-profile-specialization-panel"]', {
    timeout: 30_000,
  });
}

export async function assertRefSpecializationStepReady(page) {
  await page.locator('#pw-title').getByText('Чем вы занимаетесь?').waitFor({ timeout: 30_000 });
  await page.waitForSelector('[data-specialist-kind]', { timeout: 30_000 });
}

async function setImplAdvancedDirectionsOpen(page, open) {
  const details = page.getByTestId('direction-advanced-collapse');
  if ((await details.count()) === 0) return;
  const isOpen = await details.evaluate((el) => el.open);
  if (open !== isOpen) await details.locator('summary').click();
}

async function setRefAdvancedDirectionsOpen(page, open) {
  const adv = page.locator('details.pw-optional').filter({ hasText: 'Этапы ремонта' });
  if ((await adv.count()) === 0) return;
  const isOpen = await adv.evaluate((el) => el.open);
  if (open !== isOpen) await adv.locator('summary').click();
}

export async function fillImplSpecializationFixture(
  page,
  fixture = R06_PROFILE_PATTERN_FIXTURE,
  options = {},
) {
  const { advancedOpen = false } = options;
  const root = page.locator('[data-testid="specialist-profile-specialization-panel"]');
  await root.locator('[data-specialist-kind]').selectOption(fixture.specialistKind);
  await page.waitForFunction(
    () => {
      const w = document.querySelector('[data-testid="specialist-profile-specialization-panel"]');
      if (!w) return false;
      const fieldsets = [...w.querySelectorAll('fieldset')];
      const services = fieldsets.find((f) =>
        (f.querySelector('legend')?.textContent || '').includes('Работы и услуги'),
      );
      return services && services.querySelectorAll('input[type="checkbox"]').length >= 2;
    },
    undefined,
    { timeout: 60_000 },
  );
  const servicesGroup = root.getByRole('group', { name: 'Работы и услуги' });
  for (const label of fixture.serviceLabels) {
    const cb = servicesGroup.getByRole('checkbox', { name: label, exact: true });
    if ((await cb.count()) === 0) throw new Error(`impl_pattern_service_missing:${label}`);
    if (!(await cb.isChecked())) await cb.check();
  }
  await setImplAdvancedDirectionsOpen(page, advancedOpen);
  if (advancedOpen) {
    const stagesGroup = root.getByRole('group', { name: /На каких этапах/i });
    await stagesGroup.waitFor({ state: 'visible', timeout: 30_000 });
    for (const label of fixture.stageImplLabels) {
      const cb = stagesGroup.getByRole('checkbox', { name: label, exact: true });
      if ((await cb.count()) === 0) throw new Error(`impl_pattern_stage_missing:${label}`);
      if (!(await cb.isChecked())) await cb.check();
    }
  }
}

export async function fillRefSpecializationFixture(
  page,
  fixture = R06_PROFILE_PATTERN_FIXTURE,
  options = {},
) {
  const { advancedOpen = false } = options;
  await page.locator('[data-specialist-kind]').selectOption(fixture.specialistKind);
  await page.waitForSelector('[data-pw-choices]', { timeout: 30_000 });
  for (const id of fixture.serviceSpecializationIds) {
    const cb = page.locator(`[data-testid="pw-choice-services-${id}"]`);
    if ((await cb.count()) === 0) throw new Error(`ref_pattern_service_missing:${id}`);
    if (!(await cb.isChecked())) await cb.check();
  }
  await setRefAdvancedDirectionsOpen(page, advancedOpen);
  if (advancedOpen) {
    const adv = page.locator('details.pw-optional').filter({ hasText: 'Этапы ремонта' });
    for (const id of fixture.navigatorStageIds) {
      const stageCb = adv.locator(`input[data-pw-group="stages"][value="${id}"]`);
      if ((await stageCb.count()) === 0) throw new Error(`ref_pattern_stage_missing:${id}`);
      if (!(await stageCb.isChecked())) await stageCb.check();
    }
  }
}

export async function assertImplReviewStepReady(page) {
  await page.getByRole('heading', { name: 'Всё верно?' }).waitFor({ timeout: 30_000 });
  await page.waitForSelector('[data-testid="specialist-profile-review-panel"]', { timeout: 30_000 });
}

export async function assertRefReviewStepReady(page) {
  await page.locator('#pw-title').getByText('Всё верно?').waitFor({ timeout: 30_000 });
  await page.waitForSelector('[data-testid="pw-progress"]', { timeout: 30_000 });
}

export async function measureStepFormBox(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const nameInput = el.querySelector('#sp-displayName, [name="name"]');
    const cityInput = el.querySelector('#sp-city, [name="city"]');
    const pr = (node) => {
      if (!node) return null;
      const b = node.getBoundingClientRect();
      return { width: Math.round(b.width), height: Math.round(b.height) };
    };
    return {
      form: { width: Math.round(r.width), height: Math.round(r.height) },
      nameInput: pr(nameInput),
      cityInput: pr(cityInput),
    };
  }, selector);
}

export async function measureStepComputedActions(page) {
  return page.evaluate(() => {
    const root =
      document.querySelector('[data-testid="specialist-step-actions"]') ||
      document.querySelector('[data-testid="specialist-contacts-actions"]');
    if (!root) return null;
    const left = root.querySelector('[class*="ActionsLeft"]');
    const right = root.querySelector('[class*="ActionsRight"]');
    const cs = (node) => (node ? getComputedStyle(node) : null);
    const leftStyle = cs(left);
    const rightStyle = cs(right);
    return {
      actions: {
        display: getComputedStyle(root).display,
        flexWrap: getComputedStyle(root).flexWrap,
      },
      left: leftStyle
        ? { display: leftStyle.display, flexWrap: leftStyle.flexWrap, gap: leftStyle.gap }
        : null,
      right: rightStyle
        ? { display: rightStyle.display, flexWrap: rightStyle.flexWrap, gap: rightStyle.gap }
        : null,
    };
  });
}

export async function auditContactsScrollUnderShell(page) {
  return page.evaluate(() => {
    const results = [];
    const card = document.querySelector('[data-testid="specialist-profile-step-card"]');
    const title = card?.querySelector('h2');
    const tg = document.querySelector('#sp-tg');
    const submit = card?.querySelector('button[type="submit"]');
    for (const [id, node] of [
      ['title', title],
      ['telegram', tg],
      ['submit', submit],
    ]) {
      if (!node) {
        results.push({ id, ok: false, reason: 'missing' });
        continue;
      }
      node.scrollIntoView({ block: 'center', inline: 'nearest' });
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const visible =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= vh &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth);
      results.push({
        id,
        ok: visible,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        viewportHeight: vh,
      });
    }
    return results;
  });
}
