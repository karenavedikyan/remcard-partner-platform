(() => {
  'use strict';

  const M = window.RCMini;
  const { esc, icon, subpage, toast } = M.ui;
  const saved = (key, fallback) => M.mem.get('cert:' + key, fallback);
  const save = (key, value) => M.mem.set('cert:' + key, value);
  const text = (v) => esc(String(v ?? ''));
  const isBusiness = (ctx) => ctx.role === 'store' || ctx.role === 'company';
  const wizard = (ctx) => ctx.role !== 'agent';
  const scenario = (ctx) => ctx.scenarios?.cert || (ctx.scenario?.startsWith('cert-') ? ctx.scenario : 'default');
  const validity = [['1', '1 месяц'], ['3', '3 месяца'], ['6', '6 месяцев'], ['12', '12 месяцев'], ['unlimited', 'Без ограничения']];
  const limitError = 'Превышен лимит пула % для выбранного филиала. Уменьшите скидку или смените точку.';
  const loadError = 'Не удалось загрузить данные для выпуска. Проверьте подключение к PROF.';
  const noPartners = 'Нет доступных партнёрств для создания документа. Сначала оформите активное партнёрство.';
  const blockedCategory = 'Согласовано 0%: по этой категории сертификат не выдаётся. Остальные категории не затронуты.';
  const recipientLimits = 'Срок и число покупок задаёт принимающий партнёр и фиксируется при выпуске.';
  const oldLimits = 'Общие лимиты сертификата';
  const roleName = (ctx) => ({ store: 'Магазин «Маяк»', company: 'Компания «Формат»', specialist: 'Мария Орлова' })[ctx.role];
  const labelOf = (branch) => branch?.label || branch?.name || '';
  const activeBranches = (ctx) => (ctx.branches || []).filter((b) => b.isActive !== false);
  const stepError = 'Укажите скидку от 0 до согласованного процента, с точностью до 0,1%.';
  const normalized = (value) => String(value ?? '').trim().toLowerCase().replaceAll('ё', 'е');
  const round = (value) => Math.round(value * 100) / 100;
  const pct = (value) => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`;
  const uniqueId = () => window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const certUrl = (code) => `https://remcard.test/c/${code}`;
  const fieldKey = (p, c) => `${p.id}:${c.id}`;

  const category = (id, label, pool, discount) => ({ id, label, pool, discount });
  const policy = (source, days, purchases, promotions = false, minimum = 0, exclusions = '') =>
    ({ source, days, purchases, promotions, minimum, exclusions });
  const partner = (id, name, categories, policy = null, self = false, city = 'Краснодар') => ({
    id, name, categories: categories.map((c) => category(...c)), policy, self, city
  });
  const dom = partner('p-dom-materialov', 'Магазин «Дом материалов»', [
    ['doors', 'Двери и входные группы', 15, 10], ['flooring', 'Напольные покрытия', 13, 8],
    ['handles', 'Фурнитура и замки', 8, 5], ['paint', 'Краска / ЛКМ', 0, 0]
  ], policy('individual', 30, 1, false, 15000, 'Не действует на акционные товары и уценку.'));
  const keramika = partner('p-keramika-yug', 'Магазин «Керамика Юг»', [
    ['tiles', 'Плитка', 12, 7], ['plumbing', 'Сантехника', 10, 6]
  ], policy('general', 45, 2, true), false, 'Сочи');
  const svet = partner('p-studiya-sveta', 'Магазин «Студия света»', [
    ['lighting', 'Освещение', 14, 10], ['electrical', 'Электротовары', 8, 5]
  ], policy('general', 30, 1, false, 10000, 'Лампы и расходники — без скидки.'));
  const line = partner('p-fabrika-line', 'Компания «Фабрика LINE»', [
    ['kitchen', 'Кухни', 12, 7], ['furniture', 'Мебель', 10, 5]
  ], policy('individual', 60, 1, false, 50000, 'Встраиваемая техника рассчитывается отдельно.'));
  const remont = partner('p-studiya-remonta', 'Компания «Студия ремонта»', [
    ['ceilings', 'Потолки', 10, 5], ['general', 'Общие условия', 8, 4]
  ], policy('general', 90, 3, true, 30000));
  const volkov = partner('p-igor-volkov', 'Специалист «Игорь Волков»', [
    ['doors', 'Монтаж дверей', 10, 5], ['flooring', 'Укладка напольных покрытий', 12, 7]
  ], policy('general', 30, 1));
  const ownPrograms = {
    store: partner('self', roleName({ role: 'store' }), [
      ['doors', 'Двери и входные группы', 15, 10], ['flooring', 'Напольные покрытия', 12, 10], ['lighting', 'Освещение', 10, 7]
    ], policy('general', 30, 1, false, 10000, 'Не суммируется с распродажей витринных образцов.'), true),
    company: partner('self', roleName({ role: 'company' }), [
      ['doors', 'Двери и входные группы', 12, 10], ['windows', 'Окна', 10, 8], ['construction', 'Ремонт и отделка', 10, 7]
    ], policy('general', 60, 2, false, 25000, 'Действует при заказе в выбранном филиале компании.'), true),
    specialist: partner('self', roleName({ role: 'specialist' }), [['general', 'Дизайн-проект и комплектация', 10, 10]],
      policy('general', 45, 1, false, 20000), true)
  };
  const clientRow = (id, displayName, phone, email, city, need, note) => ({ id, displayName, phone, email, city, need, note });
  const clientList = (rows) => rows.map((row) => clientRow(...row));
  const demoClients = {
    agent: clientList([
      ['cl-fixture', 'Анна Клиентова', '+7 (900) 000-10-01', 'anna.klientova@example.remcard', 'Краснодар', 'Входная и межкомнатные двери в новостройку', 'ЖК Южный парк, ключи получены'],
      ['cl-ag-2', 'Карен Сафарян', '+7 (900) 000-10-02', 'karen.demo@example.remcard', 'Краснодар', 'Керамогранит и сантехника для двух санузлов', 'Подбор в субботу'],
      ['cl-ag-3', 'Ольга Соколова', '+7 (900) 000-10-03', 'olga.sokolova@example.remcard', 'Краснодар', 'Трековое освещение и чистовая электрика', 'Бюджет до 180 000 ₽'],
      ['cl-ag-4', 'Дмитрий Морозов', '+7 (900) 000-10-04', 'dmitry.morozov@example.remcard', 'Сочи', 'Кухня на заказ и встроенные шкафы', 'Апартаменты, замер согласован']
    ]),
    specialist: clientList([
      ['cl-fixture', 'Анна Клиентова', '+7 (900) 000-10-01', 'anna.klientova@example.remcard', 'Краснодар', 'Комплектация: двери и напольные покрытия', 'Объект на авторском надзоре'],
      ['cl-sp-2', 'Сергей Белов', '+7 (900) 000-20-02', 'sergey.belov@example.remcard', 'Краснодар', 'Чистовая отделка и свет в 3-комн. квартире', 'Этап: малярные работы и свет'],
      ['cl-sp-3', 'Екатерина Лебедева', '+7 (900) 000-20-03', 'ekaterina.demo@example.remcard', 'Краснодар', 'Кухня и корпусная мебель по проекту', 'Спецификация утверждена'],
      ['cl-sp-4', 'Артём Новиков', '+7 (900) 000-20-04', 'artem.novikov@example.remcard', 'Казань', 'Крупноформатная плитка и тёплый пол', 'Дистанционный дизайн-проект']
    ]),
    store: clientList([
      ['cl-st-1', 'Виктор Кузнецов', '+7 (900) 000-30-01', '', 'Краснодар', 'Кухня и сантехника для частного дома'],
      ['cl-st-2', 'Наталья Захарова', '+7 (900) 000-30-02', '', 'Краснодар', 'Краска, свет и электротовары']
    ]),
    company: clientList([
      ['cl-co-1', 'Павел Громов', '+7 (900) 000-40-01', '', 'Краснодар', 'Комплектация объекта: двери, плитка, свет'],
      ['cl-co-2', 'Алина Сафина', '+7 (900) 000-40-02', '', 'Казань', 'Напольные покрытия и освещение после чернового этапа']
    ])
  };
  const blockedPartners = [
    { name: 'Магазин «Плитка и стиль»', message: 'Условия сотрудничества ожидают подтверждения партнёра.', action: 'Открыть приглашение', target: 'cabinet' },
    { name: 'Магазин «Северный декор»', message: 'Сотрудничество временно приостановлено.', action: 'Возобновить сотрудничество', target: 'cabinet' },
    { name: 'Агент «Елена Фомина»', message: 'Агент рекомендует вас клиентам, но сам не принимает сертификаты.', roles: ['store', 'company', 'specialist'] }
  ];
  const scenarios = [
    ['cert-limit', 'Превышен лимит филиала'], ['cert-no-programs', 'Нет доступных партнёрств'],
    ['cert-load-error', 'Ошибка загрузки'], ['cert-common-validity', 'Есть партнёр без условия получателя'],
    ['cert-submit-error', 'Повтор выпуска после сбоя'], ['cert-profile-blocked', 'Профиль выпускающего не готов'],
    ['cert-alias-error', 'Повтор сохранения названия'], ['cert-staff', 'Сотрудник · несколько филиалов'],
    ['cert-staff-one', 'Сотрудник · один филиал'], ['cert-staff-unassigned', 'Сотрудник · без привязки к филиалу'],
    ['cert-staff-no-branches', 'Сотрудник · нет доступных филиалов'], ['cert-staff-forbidden', 'Сотрудник · нет права выпуска']
  ];
  M.data.cert = {
    clients: demoClients,
    partners: {
      agent: [dom, keramika, svet, line, remont, volkov], specialist: [dom, keramika, svet, line, remont],
      store: [dom, keramika, svet, line, remont, volkov], company: [dom, keramika, svet, line, volkov]
    },
    selfScanPartner: ownPrograms,
    blockedPartners, scenarios,
    lookup(raw, ctx) {
      const code = String(raw).trim().match(/(?:^|\/)(RC-\d+)\/?(?:[?#].*)?$/i)?.[1].toUpperCase();
      if (!code) return null;
      const cert = saved('issued:' + code, null);
      if (!cert) return null;
      if (cert.role === ctx.role && cert.branchId && ctx.branchId && !(cert.branchIds || [cert.branchId]).includes(ctx.branchId) && cert.offers.some((p) => p.self)) {
        return { state: 'wrong_branch' };
      }
      const latestExpiry = cert.offers.map((p) => p.policy?.validUntil || cert.validUntil || null);
      if (latestExpiry.every((date) => date && Date.parse(date) < Date.now())) return { state: 'used' };
      const counts = cert.offers.map((p) => p.policy?.purchases || 0);
      return { state: 'valid', promoCode: code, clientDisplayName: cert.clientName, certificate: cert, usageCount: 0, maxUsages: counts.includes(0) ? 0 : Math.max(...counts) };
    }
  };
  M.registerScenarios?.('cert', scenarios.map(([id, label]) => ({
    id, label,
    patchProfile(p) {
      if (!isBusiness(p)) return p;
      if (id === 'cert-staff-forbidden' || id === 'cert-staff-no-branches') {
        p.actions = p.actions.filter((action) => action.id !== 'create_certificate');
      }
      if (id === 'cert-staff-unassigned') {
        p.branches = []; p.activeBranchId = null; p.workplaceLabel = null;
      }
      if (['cert-staff', 'cert-staff-one', 'cert-limit'].includes(id) && !p.branches.length) {
        p.branches = [{ id: 'b1', label: 'Центральный', active: true }, { id: 'b2', label: 'Южный', active: false }];
        p.activeBranchId = 'b1';
      }
      if (id === 'cert-staff-one') p.branches = p.branches.slice(0, 1);
      if (id === 'cert-staff') { p.activeBranchId = null; p.workplaceLabel = null; }
      if (id === 'cert-limit') {
        p.activeBranchId = 'b2'; p.workplaceLabel = labelOf(p.branches.find((b) => b.id === 'b2'));
      }
      return p;
    }
  })), 'Сертификат');

  function access(ctx) {
    const mode = scenario(ctx);
    const allBranches = activeBranches(ctx);
    if (!isBusiness(ctx)) return { branches: [], allowed: true, staff: false };
    if (mode === 'cert-staff-forbidden' || ctx.profile?.canCreate === false || ctx.profile?.canIssueCertificates === false) {
      return { branches: [], allowed: false, staff: true, message: 'У вас нет прав на выпуск сертификатов. Получите доступ у вашего руководителя.' };
    }
    if (mode === 'cert-staff-no-branches') {
      return { branches: [], allowed: false, staff: true, message: 'Нет филиала, где вам разрешён выпуск сертификатов. Получите доступ у вашего руководителя.' };
    }
    if (mode === 'cert-staff-unassigned') return { branches: [], allowed: true, staff: true };
    if (mode === 'cert-staff-one') return { branches: allBranches.slice(0, 1), allowed: true, staff: true };
    if (mode === 'cert-staff') {
      const eligible = allBranches.filter((b) => b.canManageCertificates !== false);
      return { branches: eligible, allowed: eligible.length > 0, staff: true, message: 'Нет филиала, где вам разрешён выпуск сертификатов. Получите доступ у вашего руководителя.' };
    }
    return { branches: allBranches, allowed: true, staff: false };
  }

  function availablePartners(ctx) {
    if (scenario(ctx) === 'cert-no-programs') return [];
    const own = M.data.cert.selfScanPartner[ctx.role];
    const rows = M.data.cert.partners[ctx.role];
    const adapted = scenario(ctx) === 'cert-common-validity' ? rows.map((p) => p === keramika ? { ...p, policy: null } : p) : rows;
    if (isBusiness(ctx) && own) return [own, ...adapted];
    return own ? [...adapted, own] : adapted;
  }

  const scopeOf = (ctx) => `${ctx.role}:${scenario(ctx)}`;
  const setDraft = (ctx, draft) => save('draft:' + scopeOf(ctx), draft);
  function getDraft(ctx, params, rows) {
    let draft = saved('draft:' + scopeOf(ctx), null);
    const prefill = params?.clientId || '';
    if (!draft || draft.prefill !== prefill) {
      const hasCommonValidity = scenario(ctx) === 'cert-common-validity';
      const initial = hasCommonValidity ? rows.find((p) => !p.policy)
        : scenario(ctx) === 'cert-limit' && isBusiness(ctx) ? rows.find((p) => p.self) : null;
      draft = {
        selected: initial ? [initial.id] : [], excluded: {},
        discounts: scenario(ctx) === 'cert-limit' && isBusiness(ctx) ? { 'self:doors': '11' } : {}, validity: '3', alias: '',
        query: '', validityOpen: hasCommonValidity,
        prefill, loadRetried: false, submitError: '', fieldErrors: {}, selectedBranch: '',
        pending: null, injectedError: false
      };
      setDraft(ctx, draft);
    }
    return draft;
  }

  function branchFor(ctx, acc) {
    return acc.branches.find((b) => b.id === ctx.branchId) ||
      (acc.branches.length === 1 ? acc.branches[0] : null);
  }

  /* Филиалы сертификата. В рабочем кабинете сертификат выпускается от одного филиала;
     по комментарию к прототипу можно отметить один, несколько или все доступные. */
  function pickedBranches(d, acc, branch) {
    const ids = Array.isArray(d.branchIds) ? d.branchIds : [];
    const list = acc.branches.filter((b) => ids.includes(b.id));
    return list.length ? list : branch ? [branch] : [];
  }
  const branchesLabel = (list, total) => list.length > 1 && list.length === total
    ? `Все филиалы (${total})` : list.map(labelOf).join(', ');
  function branchChips(d, acc, branch) {
    const picked = pickedBranches(d, acc, branch).map((b) => b.id);
    const all = picked.length === acc.branches.length;
    const chip = (id, label, on) => `<button type="button" class="certChip" data-cert-branch="${text(id)}" aria-pressed="${on ? 'true' : 'false'}">${text(label)}</button>`;
    return `<fieldset class="certBranches" data-testid="mini-cert-branches">
      <legend class="miniFieldLabel">Филиалы сертификата</legend>
      <div class="certChips">
        ${chip('all', `Все · ${acc.branches.length}`, all)}
        ${acc.branches.map((b) => chip(b.id, labelOf(b), picked.includes(b.id))).join('')}
      </div>
      <p class="certBranchesHint" data-testid="mini-cert-branches-summary">${all ? 'Выбраны все филиалы.' : `Выбрано ${picked.length} из ${acc.branches.length}\u00a0— можно отметить несколько или все.`}</p>
    </fieldset>`;
  }

  const branchesLine = (list, total) => list.length > 1 && list.length === total
    ? branchesLabel(list, total) : `${list.length > 1 ? 'Филиалы' : 'Филиал'}: ${branchesLabel(list, total)}`;

  function beginBranchPick(params, acc, resume) {
    M[resume ? 'go' : 'replace']('branch-pick', {
      next: 'cert-create', nextParams: { ...(params || {}), resume },
      purpose: 'certificate', branchIds: acc.branches.map((b) => b.id)
    });
  }

  const option = (value, label, selected) => `<option value="${text(value)}"${selected ? ' selected' : ''}>${text(label)}</option>`;
  const miniSelect = (label, name, body) => `<label class="miniField"><span class="miniFieldLabel">${text(label)}</span><select class="miniSelect" name="${name}" aria-label="${text(label)}">${body}</select></label>`;
  const miniInput = (label, name, value, attrs = '') => `<label class="miniField"><span class="miniFieldLabel">${text(label)}</span><input class="miniSelect" name="${name}" value="${text(value)}" ${attrs}></label>`;
  const button = (label, action, style = 'secondaryBtn', attrs = '') => `<button type="button" class="${style}" data-cert-action="${action}" ${attrs}>${label}</button>`;
  const errorLine = (message) => `<p class="scanBad" role="alert">${text(message)}</p>`;
  const block = (message, action = '') => `<div class="blockedPanel" role="alert"><p>${text(message)}</p>${action}</div>`;
  const steps = (title, body, open, data) => `<details class="certDisclosure" ${data || ''}${open ? ' open' : ''}><summary>${title}</summary>${body}</details>`;
  const formBox = (html) => `<div class="createWrap">${html}</div>`;

  function getPolicySummary(policy) {
    if (!policy) return '';
    return `<p class="scanNotice">Условия получателя · ${policy.source === 'individual' ? 'индивидуальные' : 'общие'}</p>
      <p class="scanNotice">Срок скидки: ${policy.days ? policy.days + ' дн.' : 'без ограничения'} · ${purchaseLabel(policy.purchases)}</p>
      <p class="scanNotice">${policy.promotions ? 'Совместим с акциями' : 'Не суммируется с акциями'}</p>
      ${policy.minimum ? `<p class="scanNotice">Минимальная покупка: ${text(M.ui.money(policy.minimum))}</p>` : ''}
      ${policy.exclusions ? `<p class="scanNotice">Исключения: ${text(policy.exclusions)}</p>` : ''}`;
  }

  function purchaseLabel(number) {
    if (!number) return 'Без лимита покупок';
    if (number % 10 === 1 && number % 100 !== 11) return `${number} покупка`;
    if (number % 10 >= 2 && number % 10 <= 4 && (number % 100 < 12 || number % 100 > 14)) return `${number} покупки`;
    return `${number} покупок`;
  }

  function discountOf(ctx, draft, p, c) {
    return draft.discounts[fieldKey(p, c)] ?? String(wizard(ctx) ? Math.min(5, c.pool) : c.discount);
  }

  function compute(ctx, p, c, raw) {
    const val = String(raw).trim().replace(',', '.');
    const n = Number(val);
    if (!val) return { error: 'Укажите скидку клиенту' };
    if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(val) || !Number.isFinite(n)) return { error: 'Некорректное значение скидки' };
    if (n < 0) return { error: 'Скидка не может быть отрицательной' };
    if (wizard(ctx) && Math.abs(n * 10 - Math.round(n * 10)) > 1e-8) return { error: stepError };
    if (n > (p.self ? 100 : c.pool)) return { error: p.self ? 'Укажите скидку от 0 до 100%' : `Согласовано ${c.pool}%. Укажите скидку от 0 до ${c.pool}% или предложите изменить условия партнёрства`, over: !p.self };
    return { discount: round(n), issuer: p.self ? 0 : round(c.pool - n) };
  }

  function allocationRow(ctx, d, p, c) {
    const key = fieldKey(p, c);
    const allowed = c.pool > 0;
    const included = allowed && !d.excluded[key];
    const val = discountOf(ctx, d, p, c);
    const bonus = included ? compute(ctx, p, c, val).issuer : null;
    const err = d.fieldErrors[key];
    const available = wizard(ctx)
      ? `<label class="certCheck"><input type="checkbox" data-cert-category="${key}" ${included ? 'checked' : ''} ${allowed ? '' : 'disabled'}><span>${text(c.label)}</span></label>`
      : `<p class="infoCardTitle">${text(c.label)}</p>`;
    return `<div class="certAllocation">
      ${available}
      <p class="scanNotice">${p.self ? 'Самосканирование: только скидка клиенту, вознаграждение PROF — 0%' : `Согласовано: ${pct(c.pool)}`}</p>
      ${allowed ? `<div class="certAllocationFields">
        ${miniInput('Скидка клиенту, %', 'discount-' + key, val, `inputmode="decimal" autocomplete="off" data-cert-discount="${key}"${included ? '' : ' disabled'}${err ? ' aria-invalid="true"' : ''}`)}
        <div class="miniField"><span class="miniFieldLabel">${wizard(ctx) ? 'Ваш бонус' : 'Ваше вознаграждение'}</span><strong class="certBonus" data-cert-bonus="${key}">${bonus == null ? '—' : pct(bonus)}</strong></div>
      </div>` : `<p class="scanNotice">${c.pool === 0 ? blockedCategory : 'Нет согласованного процента для этой категории'}</p>`}
      ${wizard(ctx) && allowed ? button('Всё клиенту', 'all-client', 'certTextBtn', `data-key="${key}" ${included ? '' : 'disabled'}`) : ''}
      <div data-cert-discount-error="${key}">${err ? errorLine(err.message) + (err.over ? button('Изменить условия партнёрства', 'terms', 'certTextBtn', `data-partner="${p.id}"`) : '') : ''}</div>
    </div>`;
  }

  function partnerFilter(rows, query) {
    const q = normalized(query);
    return !q ? rows : rows.filter((p) => normalized([p.name, p.city, ...p.categories.map((c) => c.label)].join(' ')).includes(q));
  }

  function partnerMatches(d, rows) {
    const matching = partnerFilter(rows, d.query);
    if (!matching.length) {
      return `<div class="infoCard certStack"><strong>Такого партнёра пока нет</strong><p class="scanNotice">Пригласите знакомую компанию. После принятия приглашения и согласования условий она станет доступна для сертификата.</p>${button('Найти или пригласить', 'invite', 'certTextBtn')}</div>`;
    }
    return matching.map((p) => `<label class="certCheck certPartner"><input type="checkbox" data-cert-partner="${p.id}" ${d.selected.includes(p.id) ? 'checked' : ''}><span><strong>${text(p.name)}</strong><small>${text([p.city, p.categories.map((c) => c.label).join(', ')].filter(Boolean).join(' · '))}</small><span class="certPartnerStatus">Условия согласованы</span></span></label>`).join('');
  }

  function partnerStep(ctx, d, rows) {
    const search = miniInput('Найти партнёра', 'partner-search', d.query, 'type="search" placeholder="Название, город, товар или услуга" autocomplete="off"');
    return `<section class="certStack" aria-label="Партнёры">
      ${wizard(ctx) ? `<p class="scanNotice">Выберите одного или нескольких партнёров с уже согласованными условиями.</p>${search}` : '<h3>Партнёры</h3>'}
      <div class="certStack" data-cert-partner-list>${partnerMatches(d, rows)}</div>
      ${steps('Пока недоступны для выдачи', `<div class="certStack">${M.data.cert.blockedPartners.filter((p) => !p.roles || p.roles.includes(ctx.role)).map((p) =>
        `<div class="infoCard certStack"><strong>${text(p.name)}</strong><p class="scanNotice">${text(p.message)}</p>${p.action ? button(text(p.action), p.target || 'invite', 'certTextBtn') : ''}</div>`).join('')}</div>`, !!d.blockedOpen, 'data-cert-blocked')}
      ${wizard(ctx) ? `<div class="infoCard certStack"><strong>Нужен новый партнёр?</strong><p class="scanNotice">Найдите его в RemCard или отправьте ссылку знакомому.</p>${button('Найти или пригласить', 'invite', 'certTextBtn')}</div>
        <p class="scanNotice">Выбрано: ${d.selected.length}</p>${button('Далее: скидки', 'discounts', 'primaryBtn', d.selected.length ? '' : 'disabled')}` : ''}
    </section>`;
  }

  function isDiscountStep(ctx, params, d) {
    return wizard(ctx) && params?.step === 'discounts' && d.selected.length > 0;
  }

  function discountStep(ctx, d, rows) {
    const selected = rows.filter((p) => d.selected.includes(p.id));
    if (!selected.length) return '';
    const hasWizard = wizard(ctx);
    const onlyPolicies = selected.every((p) => p.policy);
    const validityField = miniSelect('Срок', 'certificate-validity', validity.map(([v, name]) => option(v, name, v === d.validity)).join(''));
    return `<section class="certStack" aria-label="${hasWizard ? 'Скидки' : 'Условия для клиента'}">
      ${hasWizard ? '<p class="scanNotice">Вы задаёте скидку клиенту. Остаток согласованного процента становится вашим бонусом после покупки.</p>'
        : '<h3>Условия для клиента</h3><p class="scanNotice">Общий процент задаётся в условиях партнёрства. Здесь вы распределяете его между скидкой клиенту и своим вознаграждением.</p>'}
      ${selected.map((p) => `<div class="infoCard certStack"><h3 class="infoCardTitle">${text(p.name)}</h3>${getPolicySummary(p.policy)}${p.categories.map((c) => allocationRow(ctx, d, p, c)).join('')}</div>`).join('')}
      ${hasWizard ? steps('Название для себя · необязательно', miniInput('Название', 'certificate-alias', d.alias, 'maxlength="100" placeholder="Например, ремонт для Анны"'), !!d.aliasOpen, 'data-cert-alias') : ''}
      ${onlyPolicies ? `<p class="scanNotice">${recipientLimits}</p>` : hasWizard ? steps('Срок действия', validityField, !!d.validityOpen, 'data-cert-validity') : `<h3>Срок действия</h3>${validityField}`}
      ${hasWizard ? '<p class="scanNotice">Акционные модели не участвуют. Чтобы увеличить общий процент, сначала согласуйте новые условия с партнёром.</p>' : ''}
    </section>`;
  }

  function renderCreate(ctx, params) {
    const rows = availablePartners(ctx);
    const acc = access(ctx);
    const d = getDraft(ctx, params, rows);
    const branch = branchFor(ctx, acc);
    if (d.selectedBranch !== (branch?.id || '')) {
      if (d.selectedBranch && d.submitError === limitError) d.submitError = '';
      d.selectedBranch = branch?.id || '';
      d.branchIds = branch ? [branch.id] : [];
      setDraft(ctx, d);
    }
    const mode = scenario(ctx);
    const hasWizard = wizard(ctx);
    const discountPage = isDiscountStep(ctx, params, d);
    const client = M.data.cert.clients[ctx.role].find((item) => item.id === d.prefill);
    let html;
    if (ctx.profile?.workplaceForbidden) html = block(ctx.profile.workplaceForbiddenMessage || 'Нет прав на работу с выбранной точкой. Получите доступ у вашего руководителя.');
    else if (ctx.profile?.canCreate === false || ctx.profile?.canIssueCertificates === false) html = block('У вас нет прав на выпуск сертификатов. Получите доступ у вашего руководителя.');
    else if (!acc.allowed) html = block(acc.message);
    else if (acc.branches.length > 1 && !branch) html = `<p class="scanNotice">Выберите филиал выпуска на главном экране.</p>`;
    else if (mode === 'cert-load-error' && !d.loadRetried) html = block(loadError, button('Повторить', 'retry-load'));
    else if (mode === 'cert-profile-blocked') html = block('Профиль выпускающего не готов. Завершите настройку в полном кабинете.', button('Открыть полный кабинет', 'cabinet'));
    else if (!rows.length) html = block(noPartners, button('Найти или пригласить', 'invite'));
    else {
      const submit = '<button type="submit" class="primaryBtn" data-testid="mini-create-submit">Создать сертификат</button>';
      html = `<form class="miniCreateForm" data-testid="mini-create-form" data-cert-create novalidate>
        ${!branch ? '' : acc.branches.length > 1
          ? (discountPage
            ? `<p class="scanNotice" data-testid="mini-cert-branches-line">${text(branchesLine(pickedBranches(d, acc, branch), acc.branches.length))}</p>`
            : branchChips(d, acc, branch))
          : `<div class="certBranch"><p class="scanNotice">Филиал: ${text(labelOf(branch))}</p></div>`}
        ${client ? `<p class="scanNotice">Клиент: ${text(client.displayName)}</p>` : ''}
        ${hasWizard ? `<ol class="certProgress" aria-label="Шаги создания сертификата">
          <li${discountPage ? '' : ' aria-current="step"'}><b>1</b> Партнёры</li>
          <li${discountPage ? ' aria-current="step"' : ''}><b>2</b> Скидки</li>
        </ol>` : ''}
        ${discountPage ? '' : partnerStep(ctx, d, rows)}
        ${discountPage || !hasWizard ? discountStep(ctx, d, rows) : ''}
        ${d.submitError && (discountPage || !hasWizard) ? errorLine(d.submitError) : ''}
        ${discountPage ? `<div class="certButtonRow">${button('Назад', 'partners')}${submit}</div>` : !hasWizard ? submit : ''}
      </form>`;
    }
    return subpage({
      title: discountPage ? 'Скидки по категориям' : hasWizard ? 'Создать сертификат' : 'Новый сертификат',
      backLabel: discountPage ? '← Назад' : undefined,
      body: formBox(html)
    });
  }

  function frozenPolicy(policy, issuedAt) {
    if (!policy) return null;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(issuedAt).reduce((acc, p) => ({ ...acc, [p.type]: Number(p.value) }), {});
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + policy.days - 1, 20, 59, 59, 999));
    return { ...policy, validUntil: policy.days ? date.toISOString() : null };
  }

  function attempt(ctx, d, rows, branch, submit, acc) {
    if (!submit || submit.disabled) return;
    const selected = rows.filter((p) => d.selected.includes(p.id));
    d.fieldErrors = {};
    d.submitError = '';
    if (!selected.length) d.submitError = 'Выберите хотя бы одного партнёра';
    const offers = selected.flatMap((p) => {
      const categories = p.categories.flatMap((c) => {
        if (!c.pool || d.excluded[fieldKey(p, c)]) return [];
        const outcome = compute(ctx, p, c, discountOf(ctx, d, p, c));
        if (outcome.error) {
          d.fieldErrors[fieldKey(p, c)] = { message: outcome.error, over: outcome.over };
          return [];
        }
        return [{ id: c.id, label: c.label, discount: outcome.discount, issuer: outcome.issuer, pool: c.pool }];
      });
      return categories.length ? [{ id: p.id, name: p.name, self: p.self, policy: p.policy, categories }] : [];
    });
    if (Object.keys(d.fieldErrors).length) {
      d.submitError = 'Исправьте условия по категориям';
    }
    if (!d.submitError && !offers.length) d.submitError = wizard(ctx) ? 'Выберите хотя бы одну категорию' : 'Выберите хотя бы одного партнёра';
    if (d.submitError) {
      setDraft(ctx, d); M.rerender(); return;
    }
    const client = M.data.cert.clients[ctx.role].find((item) => item.id === d.prefill);
    const branchId = branch?.id || '';
    const branches = acc ? pickedBranches(d, acc, branch) : branch ? [branch] : [];
    const branchIds = branches.map((b) => b.id);
    const validityPreset = offers.every((p) => p.policy) ? null : d.validity;
    const hash = JSON.stringify([ctx.role, client?.id || '', branchIds, validityPreset, offers]);
    d.pending = d.pending?.hash === hash ? d.pending : { hash, key: uniqueId() };
    const byKey = saved('issued-by-key', {});
    let result = byKey[d.pending.key] || null;
    if (!result) {
      const limitOf = (id) => id === 'b2' && (ctx.role === 'company' || scenario(ctx) === 'cert-limit') ? 10
        : id === 'b1' && ctx.role === 'company' ? 15 : 100;
      const over = (branchIds.length ? branchIds : [branchId]).find((id) =>
        offers.some((p) => p.categories.some((c) => (p.self ? c.discount : c.pool) > limitOf(id))));
      if (over !== undefined) {
        d.submitError = branchIds.length > 1
          ? `Превышен лимит пула % для филиала «${labelOf(branches.find((b) => b.id === over))}». Уменьшите скидку или уберите этот филиал.`
          : limitError;
        // For other partners the entire agreed pool (discount + issuer bonus) counts.
        // Their available recovery is to change the partner/program or the branch.
        setDraft(ctx, d); M.rerender(); return;
      }
      if (scenario(ctx) === 'cert-submit-error' && !d.injectedError) {
        d.submitError = 'Не удалось выпустить сертификат';
        d.injectedError = true;
        setDraft(ctx, d); M.rerender(); return;
      }
      submit.disabled = true;
      submit.textContent = 'Создание…';
      const seq = Number(saved('issued-seq', 0)) + 1;
      const code = `RC-${4820 + seq}`;
      const issuedAt = new Date();
      const validUntil = new Date(issuedAt);
      if (validityPreset && validityPreset !== 'unlimited') validUntil.setMonth(validUntil.getMonth() + Number(validityPreset));
      const alias = wizard(ctx) ? d.alias.trim().slice(0, 100) : '';
      const aliasFailed = !!alias && scenario(ctx) === 'cert-alias-error';
      result = { id: code, code, url: certUrl(code), role: ctx.role, clientName: client?.displayName || '', branch: branches.length > 1 ? branchesLabel(branches, acc.branches.length) : labelOf(branch), branchId,
        branchIds, branchLine: branches.length ? branchesLine(branches, acc ? acc.branches.length : 1) : '',
        createdAt: issuedAt.toISOString(), offers: offers.map((p) => ({ ...p, policy: frozenPolicy(p.policy, issuedAt) })),
        validityPreset, validUntil: validityPreset && validityPreset !== 'unlimited' ? validUntil.toISOString() : null,
        program: offers[0].categories[0].label, alias: aliasFailed ? '' : alias, pendingAlias: aliasFailed ? alias : '' };
      byKey[d.pending.key] = result;
      save('issued-by-key', byKey);
      save('issued-seq', seq);
      saveResult(result, ctx);
    }
    setDraft(ctx, null);
    M.replace('cert-ready', { id: result.id });
  }

  function saveResult(result, ctx) {
    save('issued:' + result.id, result);
    save('last:' + scopeOf(ctx), result.id);
    save('last:' + ctx.role, result.id);
  }

  function afterCreate(root, ctx, params) {
    const rows = availablePartners(ctx);
    const acc = access(ctx);
    const d = getDraft(ctx, params, rows);
    const branch = branchFor(ctx, acc);
    if (!ctx.profile?.workplaceForbidden && acc.allowed && acc.branches.length > 1 && !branch) {
      const page = root.querySelector('.createWrap');
      queueMicrotask(() => { if (page?.isConnected) beginBranchPick(params, acc, false); });
      return;
    }
    const form = root.querySelector('[data-cert-create]');
    const edit = () => setDraft(ctx, d);
    const detailsKeys = [
      ['[data-cert-blocked]', 'blockedOpen'],
      ['[data-cert-alias]', 'aliasOpen'], ['[data-cert-validity]', 'validityOpen'],
    ];
    const update = () => {
      const active = document.activeElement;
      const attr = ['data-cert-partner', 'data-cert-category', 'name'].find((a) => active?.hasAttribute(a));
      const value = attr && active.getAttribute(attr);
      detailsKeys.forEach(([selector, key]) => {
        const details = form?.querySelector(selector);
        if (details) d[key] = details.open;
      });
      edit(); M.rerender();
      if (attr && value) root.querySelector(`[${attr}="${CSS.escape(value)}"]`)?.focus({ preventScroll: true });
    };
    const clearErrors = () => { d.submitError = ''; d.fieldErrors = {}; };
    const toggleSelector = (selector, key) => form?.querySelector(selector)?.addEventListener('toggle', (e) => {
      if (!form.isConnected) return;
      d[key] = e.target.open; edit();
    });
    detailsKeys.forEach(([selector, key]) => toggleSelector(selector, key));
    root.querySelector('.createWrap')?.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-cert-branch]');
      if (chip) {
        const id = chip.dataset.certBranch;
        const all = acc.branches.map((b) => b.id);
        const now = pickedBranches(d, acc, branch).map((b) => b.id);
        let next;
        if (id === 'all') next = now.length === all.length ? [branch.id] : all;
        else next = now.includes(id) ? now.filter((x) => x !== id) : all.filter((x) => now.includes(x) || x === id);
        /* хотя бы один филиал остаётся выбранным */
        if (next.length) { d.branchIds = next; clearErrors(); }
        edit(); M.rerender();
        root.querySelector(`[data-cert-branch="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
        return;
      }
      const control = e.target.closest('[data-cert-action]');
      if (!control) return;
      switch (control.dataset.certAction) {
        case 'retry-load': d.loadRetried = true; update(); break;
        case 'branch': beginBranchPick(params, acc, true); break;
        case 'discounts':
          if (d.selected.length) { clearErrors(); edit(); M.replace('cert-create', { ...params, step: 'discounts' }); }
          break;
        case 'partners': M.back(); break;
        case 'invite': M.go('invite'); break;
        case 'cabinet': M.go('full-cabinet'); break;
        case 'terms': {
          const p = rows.find((row) => row.id === control.dataset.partner);
          M.go('cert-terms', { partner: p?.id });
          break;
        }
        case 'all-client': {
          const categories = rows.flatMap((p) => p.categories.map((c) => [fieldKey(p, c), p.self ? 100 : c.pool]));
          const item = categories.find(([key]) => key === control.dataset.key);
          if (item) { d.discounts[item[0]] = String(item[1]); clearErrors(); update(); }
          break;
        }
      }
    });
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      attempt(ctx, d, rows, branch, form.querySelector('[type="submit"]'), acc);
    });
    form?.addEventListener('change', (e) => {
      const input = e.target;
      if (input.name === 'certificate-validity') {
        d.validity = input.value; clearErrors(); edit();
      } else if (input.dataset.certPartner) {
        const id = input.dataset.certPartner;
        d.selected = input.checked ? [...new Set([...d.selected, id])] : d.selected.filter((p) => p !== id);
        clearErrors(); update();
      } else if (input.dataset.certCategory) {
        d.excluded[input.dataset.certCategory] = !input.checked;
        clearErrors(); update();
      }
    });
    form?.addEventListener('input', (e) => {
      const input = e.target;
      if (input.name === 'partner-search') {
        d.query = input.value; edit();
        form.querySelector('[data-cert-partner-list]').innerHTML = partnerMatches(d, rows);
      } else if (input.name === 'certificate-alias') {
        d.alias = input.value; edit();
      } else if (input.dataset.certDiscount) {
        const key = input.dataset.certDiscount;
        const p = rows.find((row) => key.startsWith(row.id + ':'));
        const c = p?.categories.find((row) => fieldKey(p, row) === key);
        if (!p || !c) return;
        d.discounts[key] = input.value;
        const outcome = compute(ctx, p, c, input.value);
        form.querySelector(`[data-cert-bonus="${key}"]`).textContent = outcome.issuer == null ? '—' : pct(outcome.issuer);
        if (d.fieldErrors[key]) {
          delete d.fieldErrors[key];
          form.querySelector(`[data-cert-discount-error="${key}"]`).innerHTML = '';
          input.removeAttribute('aria-invalid');
        }
        edit();
      }
    });
  }

  M.registerScreen('cert-create', {
    render: renderCreate,
    afterRender: afterCreate,
    onBack(ctx, params) {
      const draft = getDraft(ctx, params, availablePartners(ctx));
      if (!isDiscountStep(ctx, params, draft)) return false;
      const next = { ...params };
      delete next.step;
      M.replace('cert-create', next);
      return true;
    }
  });

  M.registerScreen('cert-terms', {
    render(ctx, params) {
      const p = availablePartners(ctx).find((row) => row.id === params?.partner);
      return subpage({ title: 'Условия партнёрства', backLabel: 'К сертификату', body: p
        ? `<div class="infoCard certStack"><h3 class="infoCardTitle">${text(p.name)}</h3>${p.categories.map((c) => `<p class="scanNotice">${text(c.label)}: согласовано ${pct(c.pool)}</p>`).join('')}${getPolicySummary(p.policy)}<p class="scanNotice">Измените согласованные условия с партнёром в полном кабинете.</p></div>${button('Открыть полный кабинет', 'cabinet')}`
        : block(noPartners) });
    },
    afterRender(root) { root.querySelector('[data-cert-action="cabinet"]')?.addEventListener('click', () => M.go('full-cabinet')); }
  });

  function sample(ctx) {
    const p = (isBusiness(ctx) ? M.data.cert.selfScanPartner[ctx.role] : M.data.cert.partners[ctx.role][0]);
    const code = 'RC-FIXTURE';
    return { id: code, code, url: certUrl(code), role: ctx.role, clientName: '',
      program: p.categories[0].label, branch: '', alias: '', pendingAlias: '', validityPreset: null,
      offers: [{ ...p, policy: frozenPolicy(p.policy, new Date()), categories: p.categories.filter((c) => c.pool > 0).map((c) => ({
        ...c, issuer: p.self ? 0 : c.pool - c.discount
      })) }] };
  }

  function readResult(ctx, params) {
    if (params?.id === 'RC-FIXTURE') return sample(ctx);
    if (params?.id) {
      const cert = saved('issued:' + params.id, null);
      return cert?.role === ctx.role ? cert : null;
    }
    const id = saved('last:' + scopeOf(ctx), '') || saved('last:' + ctx.role, '');
    return (id ? saved('issued:' + id, null) : null) || sample(ctx);
  }

  /* ---------- Готовый сертификат: как в ЛК (CertificateResultView.tsx + PartnerClientCertificateCard.tsx) ---------- */
  const ruPlural = (n, one, few, many) => {
    const a = Math.abs(n) % 10, b = Math.abs(n) % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  };
  const policyDate = (iso) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  const purchaseChip = (n) => n === 1 ? 'Разовый' : `${n} ${ruPlural(n, 'покупка', 'покупки', 'покупок')}`;

  /* issuedRecipientPolicies(): условия получателя по каждому партнёру; без своих условий — общие лимиты сертификата. */
  function issuedRows(cert) {
    return cert.offers.flatMap((p) => {
      if (p.policy?.validUntil) return [{ name: p.name, legacy: false, policy: p.policy, validUntil: p.policy.validUntil }];
      if (cert.validUntil) return [{ name: p.name, legacy: true, policy: null, validUntil: cert.validUntil }];
      return [];
    });
  }

  /* buildStoreCertificateClientCardModel() + buildIssuedCertificatePreview() */
  function cardModel(cert) {
    const pcts = cert.offers.flatMap((p) => p.categories.map((c) => c.discount)).filter((n) => Number.isFinite(n) && n >= 0);
    const top = pcts.length ? Math.max(...pcts) : null;
    const names = [...new Set(cert.offers.map((p) => p.name).filter(Boolean))];
    const n = cert.offers.length;
    const hasPolicies = cert.offers.some((p) => p.policy);
    const rows = hasPolicies ? issuedRows(cert) : null;
    const model = {
      title: cert.role === 'agent' ? 'Сертификат Ремкард' : 'Скидочный сертификат',
      pct: top == null ? '—' : (Math.min(...pcts) === top ? `−${top} %` : `до −${top} %`),
      subtitle: names.length === 1 ? `в ${names[0]}` : n === 0 ? 'у партнёров RemCard' : `у ${n} ${ruPlural(n, 'партнёра', 'партнёров', 'партнёров')}`,
      term: cert.validUntil
        ? 'до ' + new Date(cert.validUntil).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(' г.', '')
        : 'Бессрочный',
      status: 'Активен',
      rows
    };
    if (rows) {
      model.term = rows.length === 1 ? `до ${policyDate(rows[0].validUntil)}` : rows.length ? 'Срок и покупки — по партнёрам' : '—';
      model.status = !rows.length ? '—' : `${rows.length} ${rows.length === 1 ? 'партнёр активен' : ruPlural(rows.length, 'партнёр активен', 'партнёра активны', 'партнёров активны')}`;
    }
    return model;
  }

  function policyRowHtml(row) {
    const pol = row.policy;
    const fact = [
      pol?.days ? `${pol.days} ${ruPlural(pol.days, 'день', 'дня', 'дней')}` : null,
      pol?.purchases ? purchaseChip(pol.purchases) : 'без лимита',
      `до ${policyDate(row.validUntil)}`
    ].filter(Boolean).join(' · ');
    const restrictions = row.legacy ? '' : [
      pol.promotions ? 'Суммируется со скидками' : 'Не суммируется со скидками',
      pol.minimum > 0 ? `Покупка от ${new Intl.NumberFormat('ru-RU').format(pol.minimum)} ₽` : '',
      (pol.exclusions || '').trim()
    ].filter(Boolean).join(' · ');
    return `<li class="lkCertRow">
      <div class="lkCertRowHead"><strong class="lkCertRowName">${text(row.name)}</strong>
        <span class="lkCertRowTag">${!row.legacy && pol.source === 'individual' ? 'Активен · индивид.' : 'Активен'}</span></div>
      <p class="lkCertRowFact">${text(fact)}</p>
      ${restrictions ? `<p class="lkCertRowFine">${text(restrictions)}</p>` : ''}
      <p class="lkCertRowFine">${pol?.purchases ? `осталось ${pol.purchases} · использовано 0` : 'без лимита покупок'}</p>
    </li>`;
  }

  function qrImage(cert) {
    try {
      const matrix = qrMatrix(cert.url);
      const path = matrix.flatMap((row, y) => row.flatMap((cell, x) => cell ? [`M${x} ${y}h1v1h-1z`] : [])).join('');
      const size = matrix.length;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h${size}v${size}H0z"/><path fill="#1b1f1a" d="${path}"/></svg>`;
      return `<img src="data:image/svg+xml,${encodeURIComponent(svg)}" alt="QR-код документа ${text(cert.code)}" data-testid="mini-cert-qr">`;
    } catch {
      return '<span class="lkCertQrEmpty" role="status">Нет QR</span>';
    }
  }

  /* Красная карта сертификата — та же, что в ЛК после создания (PartnerClientCertificateCard). */
  function resultCard(cert, opts) {
    const m = cardModel(cert);
    return `<article class="lkCert${opts?.scanner ? ' lkCertScanner' : ''}" data-testid="client-certificate-card" aria-label="Сертификат как видит клиент">
      <div class="lkCertGlowA" aria-hidden="true"></div><div class="lkCertGlowB" aria-hidden="true"></div>
      <header class="lkCertHeader"><span class="lkCertWordmark">remcard<span class="lkCertWordmarkDot">.</span></span>
        <span class="lkCertPill">${text(m.title)}</span></header>
      <p class="lkCertPct">${text(m.pct)}</p>
      <p class="lkCertSubtitle">${text(m.subtitle)}</p>
      <div class="lkCertQrTile">
        <div class="lkCertQrBox">${qrImage(cert)}</div>
        <div class="lkCertCodeCol"><span class="lkCertCodeLabel">КОД</span>
          <span class="lkCertCodeValue" data-testid="mini-cert-code">${text(cert.code)}</span></div>
      </div>
      <footer class="lkCertFooter"><span>${text(m.term)}</span><span class="lkCertStatus">${text(m.status)}</span></footer>
      ${m.rows ? `<ul class="lkCertRows" data-testid="cp-cert-rows">${m.rows.map(policyRowHtml).join('')}</ul>` : ''}
    </article>`;
  }

  /* Та же карта в окне сканера (presentation="scanner": светлая плашка и точка в логотипе). */
  M.lkCertCard = resultCard;

  /* Сертификат без условий получателя: под картой — блок «Условия приёма по партнёрам» (CertificateResultIssuedRecipientPolicies). */
  function legacyPolicies(cert) {
    if (cert.offers.some((p) => p.policy)) return '';
    const rows = issuedRows(cert);
    if (!rows.length) return '';
    return `<section class="infoCard certStack" aria-label="Условия по партнёрам"><h3 class="infoCardTitle">Условия приёма по партнёрам</h3>
      ${rows.map((row) => `<div class="certStack"><strong>${text(row.name)}</strong>
        <p class="scanNotice">Общие лимиты сертификата · до ${text(policyDate(row.validUntil))} · без лимита покупок</p></div>`).join('')}</section>`;
  }

  function resultDetails(cert) {
    const lines = cert.offers.flatMap((p) => p.categories.map((c) => `<li>${text(p.name)} · ${text(c.label)}: скидка ${pct(c.discount)}</li>`));
    return `<details class="lkCertDetails"><summary>Условия и информация о создании</summary>
      <ul>${lines.join('')}</ul>
      ${cert.branch ? `<p data-testid="mini-cert-ready-branch">${text(cert.branchLine || 'Филиал: ' + cert.branch)}</p>` : ''}
    </details>`;
  }

  function renderReady(ctx, params) {
    const cert = readResult(ctx, params);
    if (!cert) return subpage({ title: 'Сертификат не найден', body: block('Не удалось открыть сохранённый сертификат.') });
    return subpage({
      title: 'Сертификат готов',
      body: `<div class="lkCertWrap" data-testid="recommendation-create-success">
        <div class="lkCertBanner">Готово — документ создан</div>
        ${resultCard(cert)}
        ${legacyPolicies(cert)}
        ${cert.pendingAlias ? `<div class="blockedPanel certStack" role="alert"><p>Сертификат создан, но название не сохранилось</p>${button('Сохранить название', 'retry-alias')}</div>` : ''}
        ${cert.alias ? `<div class="lkCertAlias"><span>Название для себя</span><strong>${text(cert.alias)}</strong></div>` : ''}
        <button type="button" class="lkCertPublicLink" data-cert-action="preview" data-testid="certificate-public-view">Посмотреть как клиент</button>
        ${resultDetails(cert)}
        <div class="lkCertActions">
          ${button('Скопировать код', 'copy-code', 'primaryBtn')}${button('Скопировать ссылку', 'copy-link', 'primaryBtn')}
          ${button('Поделиться', 'share')}${button('Скачать PDF', 'download')}
        </div>
        <div data-cert-ready-status aria-live="polite"></div>
      </div>`
    });
  }

  function afterReady(root, ctx, params) {
    const cert = readResult(ctx, params);
    if (!cert) return;
    const status = root.querySelector('[data-cert-ready-status]');
    const notice = (message, error = false) => {
      status.innerHTML = error ? errorLine(message) : '';
      if (!error) toast(message);
    };
    function on(action, fn) { root.querySelector(`[data-cert-action="${action}"]`)?.addEventListener('click', fn); }
    async function copyLink() {
      if (await M.ui.copy(cert.url)) notice('Ссылка скопирована');
      else notice('Не удалось скопировать ссылку', true);
    }
    on('copy-code', async (e) => {
      const target = e.currentTarget;
      if (await M.ui.copy(cert.code)) {
        target.textContent = 'Код скопирован';
        notice('Код скопирован');
      } else notice('Не удалось скопировать код', true);
    });
    on('copy-link', copyLink);
    on('share', async () => {
      if (!navigator.share) { await copyLink(); return; }
      try {
        await navigator.share({ title: 'Ваша рекомендация RemCard', text: 'Скидка по рекомендации RemCard', url: cert.url });
      } catch (err) {
        if (err?.name !== 'AbortError') await copyLink();
      }
    });
    on('download', () => {
      try { downloadPdf(cert); } catch { notice('Не удалось скачать PDF', true); }
    });
    on('preview', () => M.go('cert-client-view', { id: cert.id }));
    on('retry-alias', () => {
      cert.alias = cert.pendingAlias; cert.pendingAlias = ''; saveResult(cert, ctx); M.rerender();
      toast('Название сохранено');
    });
    on('home', () => M.home());
  }

  M.registerScreen('cert-ready', { render: renderReady, afterRender: afterReady, onBack() { M.home(); return true; } });
  M.registerScreen('cert-client-view', {
    render(ctx, params) {
      const cert = readResult(ctx, params);
      return subpage({ title: 'Сертификат RemCard', backLabel: 'К сертификату',
        lead: 'Посмотрите условия и покажите QR-код при покупке.',
        body: cert ? `<div class="lkCertWrap">${resultCard(cert)}${legacyPolicies(cert)}</div>` : block('Сертификат не найден') });
    }
  });

  // QR Model 2, byte mode, fixed version 3-M. Demo URLs are at most 42 ASCII bytes.
  // One RS block of 44 data + 26 corrections, with the standard mask 0.
  function qrMatrix(payload) {
    const bytes = new TextEncoder().encode(payload);
    if (bytes.length > 42) throw new RangeError('QR payload exceeds version 3-M');
    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4); push(bytes.length, 8);
    bytes.forEach((byte) => push(byte, 8));
    push(0, Math.min(4, 352 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    for (let p = 0; data.length < 44; p++) data.push(p % 2 ? 0x11 : 0xec);

    function multiply(a, b) {
      let out = 0;
      while (b) {
        if (b & 1) out ^= a;
        b >>>= 1;
        a = (a << 1) ^ (a & 128 ? 0x11d : 0);
      }
      return out;
    }
    let generator = [1], alpha = 1;
    for (let i = 0; i < 26; i++) {
      const next = Array(generator.length + 1).fill(0);
      generator.forEach((v, j) => { next[j] ^= v; next[j + 1] ^= multiply(v, alpha); });
      generator = next; alpha = multiply(alpha, 2);
    }
    const remainder = [...data, ...Array(26).fill(0)];
    data.forEach((_, i) => {
      const first = remainder[i];
      generator.forEach((c, j) => { remainder[i + j] ^= multiply(c, first); });
    });
    const all = [...data, ...remainder.slice(data.length)];

    const size = 29;
    const map = Array.from({ length: size }, () => Array(size).fill(null));
    function set(x, y, value) { if (x >= 0 && y >= 0 && x < size && y < size) map[y][x] = value; }
    function finder(cx, cy) {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    for (let i = 8; i < size - 8; i++) {
      set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0);
    }
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      set(22 + dx, 22 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    // BCH-coded format value: medium error correction (00), mask pattern 000.
    const fmt = 0x5412;
    const fmtBit = (i) => Boolean((fmt >>> i) & 1);
    for (let i = 0; i <= 5; i++) set(8, i, fmtBit(i));
    set(8, 7, fmtBit(6)); set(8, 8, fmtBit(7)); set(7, 8, fmtBit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, fmtBit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, fmtBit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, fmtBit(i));
    set(8, size - 8, true);

    let index = 0;
    for (let col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col = 5;
      const upward = ((col + 1) & 2) === 0;
      for (let row = 0; row < size; row++) {
        const y = upward ? size - 1 - row : row;
        for (let i = 0; i < 2; i++) {
          const x = col - i;
          if (map[y][x] !== null) continue;
          const bit = index < all.length * 8 && ((all[index >>> 3] >>> (7 - (index & 7))) & 1) === 1;
          set(x, y, bit !== ((x + y) % 2 === 0)); index++;
        }
      }
    }
    return map;
  }

  // Canvas writes only procedural text and QR, so export works in an opaque origin.
  function downloadPdf(cert) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1528;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#35252f';
    let y = 100;
    const line = (value, font = '32px sans-serif', advance = 52) => {
      ctx.font = font; ctx.fillText(value, 88, y, 904); y += advance;
    };
    line('RemCard', '700 46px sans-serif', 68);
    line('Сертификат', '700 60px sans-serif', 80);
    line(cert.code, '700 42px sans-serif', 58);
    line(cert.program, '36px sans-serif', 54);
    if (cert.clientName) line(cert.clientName);
    y += 24;
    const matrix = qrMatrix(cert.url);
    const top = y;
    const scale = 9;
    matrix.forEach((row, i) => row.forEach((cell, j) => {
      if (cell) ctx.fillRect(88 + (j + 4) * scale, top + (i + 4) * scale, scale, scale);
    }));
    y += (matrix.length + 8) * scale + 52;
    line(cert.url, '28px sans-serif', 64);
    const lines = cert.offers.flatMap((p) => [
      [p.name, 32, 48, true],
      ...p.categories.map((c) => [`${c.label}: скидка ${pct(c.discount)}`, 28, 42, false]),
      [p.policy
        ? `Срок скидки: ${p.policy.days} дн. · ${purchaseLabel(p.policy.purchases)}`
        : `${oldLimits} · ${cert.validUntil ? new Date(cert.validUntil).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }) : 'Без ограничения'}`,
      26, 48, false]
    ]);
    const scaleText = Math.min(1, (canvas.height - y - 70) / lines.reduce((acc, row) => acc + row[2], 0));
    lines.forEach(([caption, px, advance, strong]) => line(caption, `${strong ? '700 ' : ''}${Math.max(18, Math.floor(px * scaleText))}px sans-serif`, advance * scaleText));
    line('Демонстрационный сертификат. Не действует при покупке.', '26px sans-serif');
    const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]), (c) => c.charCodeAt(0));
    const enc = new TextEncoder();
    const parts = [], offsets = [];
    let length = 0;
    function push(data) { const bytes = typeof data === 'string' ? enc.encode(data) : data; parts.push(bytes); length += bytes.length; }
    function pdfObj(id, data, bin) {
      offsets[id] = length; push(`${id} 0 obj\n${data}`);
      if (bin) { push(bin); push('\nendstream'); }
      push('\nendobj\n');
    }
    push('%PDF-1.4\n');
    pdfObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    pdfObj(2, '<< /Type /Pages /Count 1 /Kids [3 0 R] >>');
    pdfObj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    pdfObj(4, `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg);
    const stream = enc.encode('q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ');
    pdfObj(5, `<< /Length ${stream.length} >>\nstream\n`, stream);
    const xref = length;
    push('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const blob = new Blob(parts, { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `remcard-${cert.code}.pdf`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();
