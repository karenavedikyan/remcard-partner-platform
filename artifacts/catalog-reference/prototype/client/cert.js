// Публичная страница сертификата — remcard.ru/certificate/<код>.
// Клиент получает ссылку от партнёра (или сканирует QR из PDF) и открывает её без регистрации.
// Все поля повторяют текущий публичный ответ API (certificatePublicPayload): код, QR, срок, статус,
// кто выдал, где действует, партнёры с категориями и контактами. Варианты оформления — только для выбора.
(function () {
  const { D, esc, qs, qsa, go, icon, route, renderApp, toast, modal, closeModal, dateRu } = window.RC;

  const VARIANTS = [
    ['card', 'Карта', 'Тёмная карта как в личном кабинете, партнёры справа'],
    ['coupon', 'Купон', 'Светлый купон с отрывным корешком и крупной скидкой'],
    ['sheet', 'Лист', 'Для компьютера и печати на A4. Число страниц зависит от количества партнёров'],
    ['now', 'Как сейчас', 'Текущая страница remcard.ru — для сравнения'],
  ];
  const LS = 'rc_cert_variant';
  let memVariant = null; // запас, если хранилище недоступно (например, в защищённом окне)
  const lsGet = () => { try { return rcDemoMemory.getItem(LS); } catch (e) { return memVariant; } };
  const lsSet = (v) => { memVariant = v; try { rcDemoMemory.setItem(LS, v); } catch (e) { /* ignore */ } };
  const variant = () => { const v = lsGet(); return VARIANTS.some(([k]) => k === v) ? v : 'card'; };

  // ---------- Демо-данные в формате публичного API ----------
  const CONTACTS = {
    s1: ['phone', 'whatsapp', 'telegram', 'site'], s2: ['phone', 'max', 'site'], s3: ['phone', 'whatsapp'], s4: ['phone', 'site'],
    s5: ['phone', 'telegram', 'vk'], s6: ['phone', 'whatsapp', 'telegram', 'max', 'site'], s7: ['phone'], s9: [],
    s8: ['phone', 'whatsapp'], s10: ['phone', 'whatsapp', 'telegram', 'site'], s11: ['phone', 'max'],
    c1: ['phone', 'telegram', 'site'], c2: ['phone', 'whatsapp', 'site'], c3: ['phone', 'whatsapp', 'telegram'], c4: ['phone', 'telegram'], c5: ['phone', 'whatsapp'], c6: ['phone', 'site'], c7: ['phone', 'whatsapp', 'site'],
  };
  const SUBTITLE = { s1: 'Плитка, керамогранит, сантехника', s2: 'Паркет, ламинат, двери', s3: 'Кабель, щиты, розетки, свет', s4: 'Смеси, ГКЛ, утеплитель, инструмент', s5: 'Краски, обои, декор', s6: 'Межкомнатные и входные двери, фурнитура', s7: 'Кирпич, блоки, металлопрокат', s9: 'Кровля, фасад, утепление',
    s8: 'Песок, щебень, бетон', s10: 'Мощение, заборы, полив, уличный свет', s11: 'Газон, саженцы, грунт',
    c1: 'Ремонт и дизайн под ключ', c2: 'Строительство домов', c3: 'Кондиционеры и вентиляция', c4: 'Проекты и благоустройство участка', c5: 'Аренда спецтехники', c6: 'Бурение и водоснабжение', c7: 'Бассейны под ключ' };
  const P = (id, cats, extra = {}) => Object.assign({ id, categories: cats.map(([categoryLabel, discountPercent]) => ({ categoryLabel, discountPercent })) }, extra);

  const CERTS = {
    'RC-TD-4F7K': {
      issuer: 'org', organizationName: 'Tandoor', scopeLabel: 'Действует во всех филиалах Tandoor', branchName: 'Салон на Уральской', branchCity: 'Краснодар', branchAddress: 'ул. Уральская, 79',
      promoCode: 'RC-TD-4F7K', displayCode: 'TD-4F7K', validUntil: '2026-12-31', status: 'ACTIVE', usageCount: 0, maxUsages: 1, excludesPromotions: true,
      partners: [P('s6', [['Межкомнатные двери', 10], ['Входные двери', 7], ['Фурнитура и ручки', 7], ['Погонаж и наличники', 5], ['Монтаж дверей', 5]])],
    },
    'RC-KY-9Q2M': {
      issuer: 'org', organizationName: 'Керамика Юг', scopeLabel: 'Действует во всех филиалах Керамика Юг', branchName: 'Шоурум на Ростовском шоссе', branchCity: 'Краснодар', branchAddress: 'Ростовское шоссе, 14/2',
      promoCode: 'RC-KY-9Q2M', displayCode: null, validUntil: '2026-11-30', status: 'ACTIVE', usageCount: 0, maxUsages: 0, excludesPromotions: false,
      partners: [P('s1', [['Керамогранит', 7], ['Настенная плитка', 7], ['Сантехника', 5], ['Смесители', 5]])],
    },
    'RC-AGENT-2K7Q': {
      issuer: 'agent', organizationName: null, scopeLabel: null, branchName: null, branchCity: null, branchAddress: null,
      promoCode: 'RC-AGENT-2K7Q', displayCode: '2K7Q', validUntil: null, status: 'ACTIVE', usageCount: 3, maxUsages: 0, excludesPromotions: false,
      partners: [
        P('s6', [['Межкомнатные двери', 10], ['Фурнитура и ручки', 7]]), P('s1', [['Керамогранит', 7], ['Сантехника', 5]]), P('s3', [['Кабель и щиты', 10], ['Светильники', 8]]),
        P('s5', [['Краски и колеровка', 8], ['Обои', 5], ['Декоративная штукатурка', 5]]), P('s4', [['Смеси и ГКЛ', 4], ['Инструмент', 3]]), P('s2', [['Паркет и ламинат', 5]]),
        P('s7', [['Кирпич и блоки', 3]]), P('s9', [['Кровля', 5], ['Фасад', 5]], { publicProfileIncomplete: true }),
      ],
    },
    'RC-CITY-M8V2': {
      issuer: 'agent', organizationName: null, scopeLabel: null, branchName: null, branchCity: null, branchAddress: null,
      promoCode: 'RC-CITY-M8V2', displayCode: 'M8V2', validUntil: '2027-03-31', status: 'ACTIVE', usageCount: 12, maxUsages: 0, excludesPromotions: false,
      partners: [
        P('s6', [['Межкомнатные двери', 10], ['Входные двери', 7], ['Фурнитура и ручки', 7], ['Погонаж и наличники', 5], ['Монтаж дверей', 5]], { group: 'Двери и полы' }),
        P('s2', [['Паркет и инженерная доска', 7], ['Ламинат', 5], ['Плинтус', 5], ['Укладка', 3]], { group: 'Двери и полы' }),
        P('s1', [['Керамогранит', 7], ['Настенная плитка', 7], ['Сантехника', 5], ['Смесители', 5], ['Мебель для ванной', 4]], { group: 'Плитка и сантехника' }),
        P('s3', [['Кабель и щиты', 10], ['Розетки и выключатели', 8], ['Светильники', 8], ['Умный дом', 5]], { group: 'Электрика и свет' }),
        P('s5', [['Краски и колеровка', 8], ['Обои', 5], ['Декоративная штукатурка', 5], ['Малярный инструмент', 3]], { group: 'Отделка' }),
        P('s4', [['Смеси и ГКЛ', 4], ['Утеплитель', 4], ['Профиль и крепёж', 3], ['Инструмент', 3]], { group: 'Стройматериалы' }),
        P('s7', [['Кирпич и блоки', 3], ['Газобетон', 3], ['Арматура и металлопрокат', 2], ['Пиломатериалы', 2]], { group: 'Стройматериалы' }),
        P('s8', [['Песок и щебень', 4], ['Товарный бетон', 3], ['Чернозём и грунт', 4]], { group: 'Стройматериалы' }),
        P('s9', [['Металлочерепица', 6], ['Гибкая черепица', 6], ['Водосток', 5], ['Фасадные панели', 5], ['Утеплитель', 4]], { group: 'Кровля и фасад', publicProfileIncomplete: true }),
        P('s10', [['Тротуарная плитка', 7], ['Бордюры', 5], ['Заборы', 5], ['Автополив', 6], ['Уличный свет', 6], ['Садовая мебель', 4]], { group: 'Участок и сад' }),
        P('s11', [['Рулонный газон', 8], ['Саженцы', 8], ['Живая изгородь', 6], ['Плодородный грунт', 5]], { group: 'Участок и сад' }),
        P('c4', [['Проект участка', 10], ['Мощение', 5], ['Озеленение', 5], ['Забор под ключ', 4]], { group: 'Участок и сад' }),
        P('c7', [['Бассейн под ключ', 5], ['Оборудование', 7], ['Обслуживание', 10]], { group: 'Участок и сад' }),
        P('c1', [['Дизайн-проект', 15], ['Ремонт под ключ', 5], ['Инженерные сети', 5]], { group: 'Услуги и работы' }),
        P('c2', [['Строительство дома', 3], ['Фундамент', 3], ['Кровельные работы', 4]], { group: 'Услуги и работы' }),
        P('c3', [['Кондиционеры', 7], ['Монтаж', 10], ['Вентиляция', 5], ['Обслуживание', 10]], { group: 'Услуги и работы' }),
        P('c5', [['Аренда экскаватора', 5], ['Аренда манипулятора', 5], ['Вывоз грунта', 3]], { group: 'Услуги и работы' }),
        P('c6', [['Бурение скважины', 5], ['Кессон и насос', 7], ['Анализ воды', 15]], { group: 'Услуги и работы' }),
      ],
    },
    'RC-DK-1A8Z': {
      issuer: 'org', organizationName: 'Дом красок', scopeLabel: 'Действует во всех филиалах Дом красок', branchName: null, branchCity: 'Краснодар', branchAddress: 'ул. Тургенева, 112',
      promoCode: 'RC-DK-1A8Z', displayCode: 'DK-1A8Z', validUntil: '2026-10-31', status: 'ACTIVE', usageCount: 1, maxUsages: 1, excludesPromotions: true,
      partners: [P('s5', [['Краски и колеровка', 5], ['Обои', 5]])],
    },
    'RC-PH-7C3V': {
      issuer: 'org', organizationName: 'Паркет Холл', scopeLabel: 'Действует во всех филиалах Паркет Холл', branchName: null, branchCity: 'Краснодар', branchAddress: 'ул. Северная, 326',
      promoCode: 'RC-PH-7C3V', displayCode: 'PH-7C3V', validUntil: '2026-09-30', status: 'EXPIRED', usageCount: 0, maxUsages: 1, excludesPromotions: false,
      partners: [P('s2', [['Паркет и ламинат', 5], ['Плинтус', 5]])],
    },
  };

  // Вычисляемые поля — как в certificatePublicPayload.
  function model(code) {
    const c = CERTS[code]; if (!c) return null;
    const partners = c.partners.map((x) => {
      const p = D.partners.find((z) => z.id === x.id) || { name: x.id, city: '' };
      return { id: x.id, name: p.name, publicName: p.name, city: p.city, logoUrl: `./assets/places/${x.id}.webp`, subtitle: SUBTITLE[x.id] || '', categories: x.categories, group: x.group || 'Партнёры',
        catalogUrl: x.publicProfileIncomplete ? null : `#/catalog/${x.id}`, publicProfileIncomplete: !!x.publicProfileIncomplete, publicContacts: (CONTACTS[x.id] || []).slice() };
    });
    const discountPercent = Math.max(...partners.flatMap((p) => p.categories.map((k) => k.discountPercent)));
    const minPct = Math.min(...partners.flatMap((p) => p.categories.map((k) => k.discountPercent)));
    const used = c.maxUsages > 0 && c.usageCount >= c.maxUsages;
    const usageLabel = c.maxUsages === 0 ? (c.usageCount ? `Использован ${c.usageCount} ${window.RC.plural(c.usageCount, 'раз', 'раза', 'раз')}` : 'Активен')
      : used ? 'Использован полностью' : c.usageCount ? `Использован ${c.usageCount} из ${c.maxUsages}` : 'Активен';
    const state = c.status === 'CANCELLED' ? 'cancelled' : c.status === 'EXPIRED' ? 'expired' : used ? 'used' : 'active';
    const statusLabel = state === 'expired' ? 'Истёк' : state === 'cancelled' ? 'Отозван' : usageLabel;
    const base = location.origin + location.pathname;
    return Object.assign({}, c, { code, partners, discountPercent, minPct, usageLabel, statusLabel, state, active: state === 'active',
      shownCode: c.displayCode || c.promoCode, issuerLabel: c.issuer === 'agent' ? 'Сертификат Ремкард' : (c.organizationName || 'Партнёр RemCard'),
      title: c.issuer === 'agent' ? 'Сертификат Ремкард' : 'Скидочный сертификат',
      certificateUrl: `${base}#/cert/${code}`, prodUrl: `https://remcard.ru/certificate/${code}`,
      many: partners.length > 6, catCount: partners.reduce((n, p) => n + p.categories.length, 0), groups: [...new Set(partners.map((p) => p.group))],
      storeNames: partners.map((p) => p.name), categories: [...new Set(partners.flatMap((p) => p.categories.map((k) => k.categoryLabel)))] });
  }

  // ---------- QR: настоящий код (библиотека из партнёрского прототипа), запасной вариант — заглушка ----------
  let qrLib = null, qrErr = null, qrReady = null;
  const loadQr = () => qrReady || (qrReady = import(new URL('../partner/chunk-3HBG25M4.js', document.baseURI).href).then((m) => { qrLib = m.a(); }).catch((e) => { qrErr = e; qrReady = null; }));
  const qrCache = {};
  function qrBox(url, cls = '') { return `<div class="cf-qr ${cls}" data-qr="${esc(url)}" aria-label="QR-код сертификата">${qrCache[url] || ''}</div>`; }
  async function fillQr(root) {
    await loadQr();
    if (!qrLib) await loadQr(); // вторая попытка, если первая загрузка не удалась
    qsa('[data-qr]', root).forEach((el) => {
      const url = el.dataset.qr; if (el.firstElementChild) return;
      if (!qrLib) { el.innerHTML = '<div class="cf-qr__fallback">QR</div>'; return; }
      if (qrCache[url]) { el.innerHTML = qrCache[url]; return; }
      qrLib.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1b1f1a', light: '#ffffff' } }, (e, svg) => { if (!e) { qrCache[url] = svg; el.innerHTML = svg; } });
    });
  }

  // ---------- Общие куски ----------
  const CONTACT = { phone: ['phone', 'Позвонить'], whatsapp: ['message-circle', 'WhatsApp'], telegram: ['send', 'Telegram'], max: ['message-square', 'MAX'], vk: ['users', 'ВКонтакте'], email: ['send', 'Почта'], site: ['external-link', 'Сайт'] };
  const logged = () => window.RCMe && window.RCMe.logged();
  const stateText = (m) => m.state === 'expired' ? `Срок действия истёк ${m.validUntil ? longDate(m.validUntil) : ''}` : m.state === 'used' ? 'Сертификат уже использован' : m.state === 'cancelled' ? 'Сертификат отозван партнёром' : '';
  const pctText = (m) => m.minPct === m.discountPercent ? `−${m.discountPercent} %` : `до −${m.discountPercent} %`;
  const longDate = (v) => new Date(v + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(' г.', '');
  const termText = (m) => m.validUntil ? `до ${longDate(m.validUntil)}` : 'Бессрочный';

  function issuerBlock(m, cls = '') {
    if (m.issuer === 'agent') return `<div class="cf-issuer ${cls}"><span>${icon('badge-check')}</span><div><b>Выдан агентом RemCard</b><small>Скидки у ${m.partners.length} ${window.RC.plural(m.partners.length, 'партнёра', 'партнёров', 'партнёров')} · ${m.partners[0].city}</small></div></div>`;
    return `<div class="cf-issuer ${cls}"><span>${icon('store')}</span><div><b>От: ${esc(m.issuerLabel)}</b><small>${esc(m.scopeLabel || '')}${m.branchAddress ? ` · ${esc(m.branchCity)}, ${esc(m.branchAddress)}` : ''}</small></div></div>`;
  }
  function actions(m, cls = '') {
    return `<div class="cf-actions ${cls}">
      <button class="btn btn--primary" data-cf="copy">${icon('copy')} <span>Скопировать код</span></button>
      <button class="btn btn--ghost" data-cf="pdf" ${m.active ? '' : 'disabled'}>${icon('download')} Скачать PDF</button>
      <button class="btn btn--ghost" data-cf="share">${icon('share')} Поделиться</button>
      <button class="btn btn--ghost" data-cf="save" ${m.active ? '' : 'disabled'}>${icon('wallet')} ${logged() ? 'Сохранить в кабинет' : 'Сохранить в RemCard'}</button>
    </div>`;
  }
  function conditions(m) {
    const rows = [['calendar', 'Срок', termText(m)], ['badge-check', 'Статус', m.statusLabel]];
    if (m.maxUsages > 0) rows.push(['repeat', 'Лимит', `${m.maxUsages} ${window.RC.plural(m.maxUsages, 'раз', 'раза', 'раз')}`]);
    if (m.excludesPromotions) rows.push(['percent', 'Акции', 'Не суммируется с акциями партнёра']);
    return `<div class="cf-cond">${rows.map(([ic, k, v]) => `<div><span>${icon(ic)}</span><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>`;
  }
  function howTo() {
    return `<ol class="cf-how"><li><div><b>Покажите QR-код</b>или назовите код продавцу</div></li><li><div><b>Продавец применит скидку</b>по категории товара</div></li><li><div><b>С аккаунтом RemCard</b>за покупку начислятся баллы</div></li></ol>`;
  }
  const maxPct = (p) => Math.max(...p.categories.map((c) => c.discountPercent));
  const catsHtml = (cats) => `<div class="cf-p__cats">${cats.map((c) => `<div><span>${esc(c.categoryLabel)}</span><i></i><b>${c.discountPercent} %</b></div>`).join('')}</div>`;
  function footHtml(p) {
    const contacts = p.publicContacts.map((k) => CONTACT[k] ? `<button class="cf-ct" data-ct="${k}" data-p="${p.id}">${icon(CONTACT[k][0])} ${CONTACT[k][1]}</button>` : '').join('');
    return `<div class="cf-p__foot">${contacts}${logged() ? `<button class="cf-ct" data-ct="rc" data-p="${p.id}">${icon('message-circle')} Написать</button>` : ''}
        ${p.catalogUrl ? `<a class="btn btn--dark btn--sm cf-p__open" href="${p.catalogUrl}">Открыть карточку ${icon('arrow-right')}</a>` : `<span class="cf-p__soon">${icon('clock')} Карточка партнёра скоро появится</span>`}</div>`;
  }
  function partnerCard(m, p, i) {
    const open = window.RC.state.ui.cfOpen === p.id;
    const cats = open ? p.categories : p.categories.slice(0, 4);
    const more = p.categories.length - 4;
    return `<article class="cf-p" data-pid="${p.id}">
      <div class="cf-p__head"><img src="${p.logoUrl}" alt="" loading="lazy"><div><b>${esc(p.name)}</b><small>${esc(p.city)}${p.subtitle ? ` · ${esc(p.subtitle)}` : ''}</small></div><span class="cf-p__pct">−${maxPct(p)} %</span></div>
      ${catsHtml(cats)}
      ${more > 0 && !open ? `<button class="cf-more" data-cf="more" data-p="${p.id}">Ещё ${more} ${window.RC.plural(more, 'категория', 'категории', 'категорий')} ${icon('chevron-down')}</button>` : ''}
      <small class="cf-p__note">Условия уточняйте у партнёра.</small>
      ${footHtml(p)}
    </article>`;
  }
  // Много партнёров: компактные строки-аккордеон, поиск и фильтр по направлениям
  function partnerRow(p) {
    const open = window.RC.state.ui.cfOpen === p.id;
    const search = [p.name, p.subtitle, p.group, ...p.categories.map((c) => c.categoryLabel)].join(' ').toLowerCase();
    const preview = p.categories.slice(0, 3).map((c) => `${esc(c.categoryLabel)} ${c.discountPercent} %`).join(' · ') + (p.categories.length > 3 ? ` · ещё ${p.categories.length - 3}` : '');
    return `<article class="cf-row ${open ? 'is-open' : ''}" data-pid="${p.id}" data-group="${esc(p.group)}" data-search="${esc(search)}">
      <button class="cf-row__head" data-cf="toggle" data-p="${p.id}" aria-expanded="${open}"><img src="${p.logoUrl}" alt="" loading="lazy"><div><b>${esc(p.name)}</b><small>${open ? esc(p.subtitle || p.city) : preview}</small></div><span class="cf-p__pct">−${maxPct(p)} %</span>${icon('chevron-down', 'cf-row__chev')}</button>
      ${open ? `<div class="cf-row__body">${catsHtml(p.categories)}<small class="cf-p__note">Условия уточняйте у партнёра.</small>${footHtml(p)}</div>` : ''}
    </article>`;
  }
  function partnerDense(p) {
    return `<article class="cf-d" data-pid="${p.id}">
      <div class="cf-d__head"><img src="${p.logoUrl}" alt="" loading="lazy"><div><b>${esc(p.name)}</b><small>${esc(p.subtitle || p.city)}</small></div><span class="cf-p__pct">−${maxPct(p)} %</span></div>
      <div class="cf-d__cats">${p.categories.map((c) => `<span>${esc(c.categoryLabel)} <b>${c.discountPercent} %</b></span>`).join('')}</div>
      ${p.catalogUrl ? `<a class="cf-d__link" href="${p.catalogUrl}">Карточка партнёра ${icon('arrow-right')}</a>` : `<small class="cf-p__soon">${icon('clock')} Карточка скоро появится</small>`}
    </article>`;
  }
  function manyBlock(m, compact) {
    const ui = window.RC.state.ui; const g = ui.cfGroup || 'all'; const q = ui.cfQ || '';
    const list = compact || g === 'all' ? m.partners : m.partners.filter((p) => p.group === g);
    const byGroup = m.groups.map((name) => [name, list.filter((p) => p.group === name)]).filter(([, arr]) => arr.length);
    const sum = `<div class="cf-sum"><b>${m.partners.length} ${window.RC.plural(m.partners.length, 'партнёр', 'партнёра', 'партнёров')}</b><span>·</span><b>${m.catCount} ${window.RC.plural(m.catCount, 'категория', 'категории', 'категорий')}</b><span>·</span><span>скидки ${m.minPct}–${m.discountPercent} %</span></div>`;
    if (compact) return `<section class="cf-partners cf-partners--sheet">
      <div class="cf-h"><h2>Сертификат принимают</h2>${sum}</div>
      <div class="cf-dense">${byGroup.map(([, arr]) => arr.map(partnerDense).join('')).join('')}</div>
    </section>`;
    const chips = [['all', 'Все', m.partners.length], ...m.groups.map((name) => [name, name, m.partners.filter((p) => p.group === name).length])];
    return `<section class="cf-partners cf-partners--many">
      <div class="cf-h"><h2>Сертификат принимают</h2>${sum}</div>
      <div class="cf-tools">
        <label class="cf-search">${icon('search')}<input id="cf-q" type="search" placeholder="Партнёр или категория: плитка, двери, газон…" value="${esc(q)}" autocomplete="off"></label>
      </div>
      <div class="cf-groups">${chips.map(([k, t, n]) => `<button class="chip ${g === k ? 'is-on' : ''}" data-cf="group" data-g="${esc(k)}">${esc(t)} <em>${n}</em></button>`).join('')}</div>
      <div class="cf-rows" id="cf-rows">${byGroup.map(([name, arr]) => `${g === 'all' ? `<h3 class="cf-g" data-g="${esc(name)}">${esc(name)}<span>${arr.length}</span></h3>` : ''}${arr.map(partnerRow).join('')}`).join('')}
        <div class="cf-empty" id="cf-empty" hidden>${icon('search')}<b>Ничего не нашлось</b><span>Попробуйте другое слово или выберите направление выше</span></div></div>
    </section>`;
  }
  function partnersBlock(m, compact) {
    if (m.many) return manyBlock(m, compact);
    const all = window.RC.state.ui.cfAll;
    const list = all || compact ? m.partners : m.partners.slice(0, 6);
    const rest = m.partners.length - list.length;
    return `<section class="cf-partners ${compact ? 'cf-partners--sheet' : ''}">
      <div class="cf-h"><h2>Сертификат принимают</h2><p class="small muted">${m.partners.length === 1 ? 'Скидка по категориям у партнёра' : 'Выберите партнёра и посмотрите условия скидки'}</p></div>
      <div class="cf-plist ${m.partners.length === 1 ? 'cf-plist--one' : ''}">${list.map((p, i) => partnerCard(m, p, i)).join('')}</div>
      ${rest > 0 ? `<button class="btn btn--ghost cf-allbtn" data-cf="all">Показать ещё ${rest} ${window.RC.plural(rest, 'партнёра', 'партнёров', 'партнёров')}</button>` : ''}
    </section>`;
  }
  const wallet = () => `<div class="cf-wallet">${icon('smartphone')}<span>Apple Wallet / Google Wallet — скоро</span></div>`;
  const banner = (m) => m.active ? '' : `<div class="notice ${m.state === 'expired' ? 'notice--amber' : 'notice--grey'} cf-banner">${icon(m.state === 'expired' ? 'hourglass' : 'info')}<span><b>${stateText(m)}.</b> Данные сертификата сохранены для справки${m.active ? '' : ' — скидка по нему больше не применяется'}.</span></div>`;

  // ---------- Вариант А «Карта» ----------
  function vCard(m) {
    return `<div class="cf-grid">
      <aside class="cf-side">
        <div class="cf-card ${m.active ? '' : 'is-off'}">
          <div class="cf-card__top"><span class="cf-card__brand">remcard<i>.</i></span><span class="pill pill--light">${esc(m.title)}</span></div>
          <div class="cf-card__pct"><b>${pctText(m)}</b><span>${m.issuer === 'agent' ? `у ${m.partners.length} ${window.RC.plural(m.partners.length, 'партнёра', 'партнёров', 'партнёров')} RemCard` : `в ${esc(m.organizationName)}`}</span></div>
          <div class="cf-card__qr">${qrBox(m.certificateUrl)}<div class="cf-code"><small>КОД</small><b>${esc(m.shownCode)}</b></div>${m.active ? '' : `<span class="cf-stamp">${esc(m.state === 'expired' ? 'Истёк' : m.state === 'used' ? 'Использован' : 'Отозван')}</span>`}</div>
          <div class="cf-card__bot"><span>${termText(m)}</span><span>${esc(m.statusLabel)}</span></div>
        </div>
        ${actions(m)}
        ${issuerBlock(m, 'cf-issuer--card')}
        ${wallet()}
      </aside>
      <div class="cf-main">
        ${banner(m)}
        ${partnersBlock(m)}
        <section class="cf-block"><div class="cf-h"><h2>Условия</h2></div>${conditions(m)}</section>
        <section class="cf-block"><div class="cf-h"><h2>Как воспользоваться</h2></div>${howTo()}</section>
        ${openRemcard()}
      </div>
    </div>`;
  }

  // ---------- Вариант Б «Купон» ----------
  function vCoupon(m) {
    return `<div class="cf-grid">
      <aside class="cf-side">
        <div class="cf-coupon ${m.active ? '' : 'is-off'}">
          <div class="cf-coupon__body">
            <div class="cf-coupon__brand"><span class="cf-card__brand">remcard<i>.</i></span><span class="eyebrow">${esc(m.title)}</span></div>
            <div class="cf-coupon__pct"><b>${pctText(m)}</b><span>${m.issuer === 'agent' ? `скидка у ${m.partners.length} ${window.RC.plural(m.partners.length, 'партнёра', 'партнёров', 'партнёров')}` : `скидка в ${esc(m.organizationName)}`}</span></div>
            ${issuerBlock(m)}
            <div class="cf-coupon__meta"><span>${icon('calendar')} ${termText(m)}</span><span>${icon('badge-check')} ${esc(m.statusLabel)}</span></div>
          </div>
          <div class="cf-coupon__tear" aria-hidden="true"><i></i><i></i></div>
          <div class="cf-coupon__stub">${qrBox(m.certificateUrl)}<div class="cf-code"><small>Назовите код продавцу</small><b>${esc(m.shownCode)}</b><button class="cf-copy" data-cf="copy">${icon('copy')} <span>Скопировать</span></button></div>${m.active ? '' : `<span class="cf-stamp">${esc(m.state === 'expired' ? 'Истёк' : m.state === 'used' ? 'Использован' : 'Отозван')}</span>`}</div>
        </div>
        ${actions(m, 'cf-actions--nocopy')}
        ${wallet()}
      </aside>
      <div class="cf-main">
        ${banner(m)}
        ${partnersBlock(m)}
        <section class="cf-block"><div class="cf-h"><h2>Условия</h2></div>${conditions(m)}</section>
        <section class="cf-block"><div class="cf-h"><h2>Как воспользоваться</h2></div>${howTo()}</section>
        ${openRemcard()}
      </div>
    </div>`;
  }

  // ---------- Вариант В «Лист» ----------
  function vSheet(m) {
    return `<div class="cf-sheetwrap">
      <article class="cf-sheet ${m.active ? '' : 'is-off'}">
        <header class="cf-sheet__head"><span class="cf-card__brand">remcard<i>.</i></span><span class="eyebrow">${esc(m.title)} · № ${esc(m.shownCode)}</span></header>
        <div class="cf-sheet__hero">
          <div>
            <h1>${pctText(m)}</h1>
            <p class="cf-sheet__sub">${m.issuer === 'agent' ? `Скидка у ${m.partners.length} ${window.RC.plural(m.partners.length, 'партнёра', 'партнёров', 'партнёров')} RemCard в ${esc(m.partners[0].city)}е` : `Скидка в ${esc(m.organizationName)}`}</p>
            ${issuerBlock(m)}
            ${conditions(m)}
          </div>
          <div class="cf-sheet__qr">${qrBox(m.certificateUrl)}<div class="cf-code"><small>КОД</small><b>${esc(m.shownCode)}</b></div>${m.active ? '' : `<span class="cf-stamp">${esc(m.state === 'expired' ? 'Истёк' : m.state === 'used' ? 'Использован' : 'Отозван')}</span>`}</div>
        </div>
        ${banner(m)}
        ${partnersBlock(m, true)}
        <footer class="cf-sheet__foot"><div>${howTo()}</div>${wallet()}</footer>
      </article>
      ${actions(m, 'cf-actions--row')}
      ${openRemcard()}
    </div>`;
  }

  // ---------- «Как сейчас» — текущая страница remcard.ru для сравнения ----------
  function vNow(m) {
    const pc = (p) => `<div class="now-p"><div class="now-p__h"><span class="now-av">${p.name[0]}</span><div><b>${esc(p.name)}</b><small>${esc(p.city)}</small>${p.subtitle ? `<small>${esc(p.subtitle)}</small>` : ''}</div></div>
      <small class="now-lbl">Скидки по категориям</small>${p.categories.slice(0, 4).map((c) => `<div class="now-cat"><span>${esc(c.categoryLabel)}</span><b>${c.discountPercent}%</b></div>`).join('')}${p.categories.length > 4 ? `<small class="now-dim">Ещё ${p.categories.length - 4} категорий</small>` : ''}
      <small class="now-dim">Условия уточняйте у партнёра.</small>
      <div class="now-row">${p.publicContacts.slice(0, 3).map((k) => `<span class="now-btn">${CONTACT[k] ? CONTACT[k][1] : k}</span>`).join('')}</div>
      ${p.catalogUrl ? '<span class="now-btn now-btn--full">Открыть карточку</span>' : '<small class="now-dim">Карточка партнёра скоро появится</small>'}</div>`;
    return `<div class="cf-now">
      <div class="now-top">${icon('arrow-left')} Сертификат</div>
      <div class="now-logo">remcard</div>
      <h1>${esc(m.title)}</h1>
      ${m.issuer !== 'agent' ? `<div class="now-box"><b>От: ${esc(m.issuerLabel)}</b><small>${esc(m.scopeLabel)}</small><small>${esc(m.branchCity)}, ${esc(m.branchAddress)}</small></div>` : ''}
      <div class="now-qr">${qrBox(m.prodUrl)}</div>
      <small class="now-lbl">ПРОМОКОД</small><div class="now-code">${esc(m.shownCode)}</div><span class="now-btn">Скопировать</span>
      <div class="now-row"><span class="now-btn now-btn--full">Скачать PDF</span><span class="now-btn now-btn--full">Поделиться</span></div>
      <h2>Сертификат принимают</h2><small class="now-dim">Выберите партнёра и посмотрите условия скидки</small>
      ${m.partners.slice(0, 6).map(pc).join('')}${m.partners.length > 6 ? '<small class="now-dim">Показаны первые 6 партнёров</small>' : ''}
      <small class="now-dim" style="text-align:center">Apple Wallet / Google Wallet — скоро</small>
      <div class="now-box"><small class="now-lbl">СКИДОЧНЫЙ СЕРТИФИКАТ</small><small>Условия по категориям указаны у каждого партнёра выше</small><small>Срок: ${m.validUntil ? 'до ' + dateRu(m.validUntil) : 'Бессрочный'}</small><small>Статус: ${esc(m.usageLabel)}</small></div>
      <small class="now-dim" style="text-align:center">Покажите этот QR-код или назовите промокод продавцу в магазине</small>
      <span class="now-btn now-btn--full now-btn--red">Открыть RemCard</span>
    </div>`;
  }

  const openRemcard = () => `<section class="cf-open card card--soft"><div><b>Это RemCard</b><p class="small muted">Калькулятор ремонта, маршрут по этапам и каталог партнёров со скидками — для всех, не только по сертификату.</p></div><a class="btn btn--dark" href="#/">Открыть RemCard ${icon('arrow-right')}</a></section>`;

  // ---------- Панель вариантов (только в прототипе) ----------
  function protoBar(m) {
    const v = variant();
    return `<div class="cf-proto">
      <div class="cf-proto__l"><span class="pill pill--amber">Прототип</span><span class="small">Вариант оформления:</span>
        <div class="cf-proto__v">${VARIANTS.map(([k, t, d]) => `<button class="chip ${v === k ? 'is-on' : ''}" data-cf="variant" data-v="${k}" title="${esc(d)}">${t}</button>`).join('')}</div></div>
      <div class="cf-proto__r"><span class="small muted">Другие примеры:</span>${Object.keys(CERTS).map((k) => `<a class="chip ${k === m.code ? 'is-on' : ''}" href="#/cert/${k}">${k}</a>`).join('')}</div>
    </div>`;
  }

  // ---------- Страницы ----------
  function pageCert({ code }) {
    const m = model(code);
    document.title = (m ? 'Скидочный сертификат' : 'Сертификат не найден') + ' — RemCard';
    if (!m) return `<section class="wrap cf"><div class="cf-404"><span class="cf-404__ic">${icon('search')}</span><h1>Сертификат не найден</h1>
        <p class="muted">Ссылка неполная или сертификат с кодом <b>${esc(code)}</b> не существует. Попросите партнёра отправить ссылку ещё раз или введите код вручную.</p>
        <form class="cf-404__form" id="cf-find"><input placeholder="Код сертификата" id="cf-code" autocomplete="off"><button class="btn btn--primary" type="submit">Открыть</button></form>
        <div class="row" style="justify-content:center;gap:.5rem;margin-top:1rem"><a class="btn btn--ghost" href="#/">На главную RemCard</a><a class="btn btn--ghost" href="#/cert">Примеры сертификатов</a></div></div></section>`;
    const v = variant();
    const body = v === 'coupon' ? vCoupon(m) : v === 'sheet' ? vSheet(m) : v === 'now' ? vNow(m) : vCard(m);
    return `<section class="wrap cf cf--${v}" data-code="${esc(m.code)}">${protoBar(m)}${body}
      <p class="xs muted cf-foot">Адрес страницы на сайте: remcard.ru/certificate/${esc(m.code)} · ссылки старого формата продолжат открываться</p></section>`;
  }

  function pageIndex() {
    document.title = 'Страница сертификата — RemCard';
    const rows = Object.keys(CERTS).map((k) => { const m = model(k); return `<a class="cf-ex" href="#/cert/${k}"><span class="cf-ex__pct">${pctText(m)}</span><div><b>${esc(m.issuerLabel)}</b><small>${m.issuer === 'agent' ? `${m.partners.length} партнёров` : esc(m.partners[0].subtitle)} · ${termText(m)}</small></div><span class="pill ${m.active ? 'pill--green' : 'pill--amber'}">${esc(m.active ? 'Активен' : stateText(m))}</span>${icon('chevron-right')}</a>`; }).join('');
    return `<section class="wrap cf"><div class="cf-h" style="margin-bottom:1rem"><span class="eyebrow eyebrow--red">remcard.ru/certificate/…</span><h1>Страница сертификата</h1><p class="lead">Её открывает клиент по ссылке от партнёра или по QR из PDF — без входа. Ниже примеры: партнёрский, агентский, городской на 18 партнёров, использованный и истёкший.</p></div>
      <div class="cf-exlist">${rows}</div>
      <div class="cf-vars">${VARIANTS.map(([k, t, d]) => `<button class="cf-var ${variant() === k ? 'is-on' : ''}" data-cf="variant" data-v="${k}" data-go="RC-TD-4F7K"><b>${t}</b><small>${d}</small></button>`).join('')}</div></section>`;
  }

  route('/cert', pageIndex);
  route('/cert/:code', pageCert);

  // ---------- Поведение ----------
  function copyText(t) { try { navigator.clipboard.writeText(t); } catch (e) { /* демо */ } }
  document.addEventListener('rc:rendered', (e) => {
    const root = qs('#app'); if (!/^\/cert/.test(e.detail.path)) return;
    fillQr(root);
    const code = qs('.cf[data-code]') && qs('.cf[data-code]').dataset.code; const m = code ? model(code) : null;
    qsa('[data-cf]', root).forEach((b) => { b.onclick = (ev) => {
      const a = b.dataset.cf;
      if (a === 'variant') { lsSet(b.dataset.v); if (b.dataset.go) go('#/cert/' + b.dataset.go); else renderApp(); return; }
      if (!m) return;
      if (a === 'copy') { copyText(m.shownCode); const s = qs('span', b); if (s) { s.textContent = 'Скопировано'; setTimeout(() => { s.textContent = b.classList.contains('cf-copy') ? 'Скопировать' : 'Скопировать код'; }, 1800); } toast('Код скопирован'); }
      if (a === 'share') { if (navigator.share) navigator.share({ title: 'Скидочный сертификат RemCard', url: m.certificateUrl }).catch(() => {}); else { copyText(m.certificateUrl); toast('Ссылка скопирована'); } }
      if (a === 'pdf') { toast('Готовим PDF…'); setTimeout(() => window.print(), 400); }
      if (a === 'save') { const to = `#/me/card?tab=certs&add=${m.code}`; window.RC.state.ui.afterLogin = to; go(to); }
      if (a === 'more') { window.RC.state.ui.cfOpen = b.dataset.p; renderApp(); }
      if (a === 'all') { window.RC.state.ui.cfAll = true; renderApp(); }
      if (a === 'toggle') { window.RC.state.ui.cfOpen = window.RC.state.ui.cfOpen === b.dataset.p ? null : b.dataset.p; renderApp(); const el = qs(`.cf-row[data-pid="${b.dataset.p}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); }
      if (a === 'group') { window.RC.state.ui.cfGroup = b.dataset.g; window.RC.state.ui.cfOpen = null; renderApp(); const t = qs('.cf-groups'); if (t) t.scrollIntoView({ block: 'nearest' }); }
    }; });
    // Поиск по партнёрам и категориям — фильтруем на месте, без перерисовки
    const qInput = qs('#cf-q', root);
    const applyQ = () => {
      const q = (qInput.value || '').trim().toLowerCase(); window.RC.state.ui.cfQ = q; let n = 0;
      qsa('.cf-row', root).forEach((r) => { const ok = !q || r.dataset.search.includes(q); r.hidden = !ok; if (ok) n++; });
      qsa('.cf-g[data-g]', root).forEach((h) => { h.hidden = !qsa(`.cf-row[data-group="${CSS.escape(h.dataset.g)}"]`, root).some((r) => !r.hidden); });
      const e = qs('#cf-empty', root); if (e) e.hidden = n > 0;
    };
    if (qInput) { qInput.oninput = applyQ; if (qInput.value) applyQ(); }
    qsa('[data-ct]', root).forEach((b) => { b.onclick = () => {
      const p = m && m.partners.find((x) => x.id === b.dataset.p); const k = b.dataset.ct;
      if (k === 'rc') { go(`#/catalog/${p.id}?chat=1`); return; }
      const t = { phone: 'Открываем звонок +7 861 …', whatsapp: 'Открываем WhatsApp партнёра', telegram: 'Открываем Telegram партнёра', max: 'Открываем MAX партнёра', vk: 'Открываем ВКонтакте партнёра', site: 'Открываем сайт партнёра', email: 'Открываем почту' }[k];
      toast(`${t} · ${p ? p.name : ''}`);
    }; });
    const f = qs('#cf-find', root); if (f) f.onsubmit = (ev) => { ev.preventDefault(); const v = qs('#cf-code', root).value.trim().toUpperCase(); if (v.length < 4) { toast('Введите код'); return; } go('#/cert/' + v); };
  });

  window.RCCert = { model, CERTS, variant, qrState: () => ({ lib: !!qrLib, err: qrErr && String(qrErr) }) };
})();
