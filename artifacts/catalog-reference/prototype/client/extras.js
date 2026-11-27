/* Забота RemCard: доставка, хранение, страхование, рассрочка и кредит.
   Самостоятельный раздел для клиентов (не только ремонт) + предложения к списку покупок.
   Данные — примеры условий для прототипа. Поставщики сервисов — партнёры платформы (регистрируются на партнёрском сайте). */
(function () {
  const { esc, fmt, plural, qs, qsa, go, icon, state, modal, modalHead, toast, route, renderApp, activeProject } = window.RC;
  const rub = (n) => `${fmt(Math.round(n))} ₽`;
  const dec = (n) => String(n).replace('.', ',');
  const C = () => window.RCCatalogData;

  // ---------- Финансирование ----------
  const FIN = [
    { id: 'parts', name: 'Долями', who: 'сервис рассрочки', label: '4 платежа раз в 2 недели', months: [2], parts: 4, rate: 0, min: 1000, max: 150000, badge: 'без переплаты', note: 'Первая часть — при заказе, остальные три спишутся автоматически. Без справок и звонков.' },
    { id: 'split', name: 'Сплит', who: 'банк-партнёр', label: '2–6 месяцев без переплаты', months: [2, 4, 6], rate: 0, min: 3000, max: 300000, badge: 'без переплаты', note: 'Переплату компенсирует скидка партнёра RemCard — цена для вас не меняется.' },
    { id: 'inst12', name: 'Рассрочка 0-0-12', who: 'банк-партнёр', label: '6–12 месяцев без переплаты', months: [6, 10, 12], rate: 0, min: 10000, max: 1000000, badge: 'без переплаты', note: 'Для товаров и работ партнёров, подключивших рассрочку. Решение онлайн за 2 минуты.' },
    { id: 'credit', name: 'Кредит на ремонт', who: 'банк-партнёр', label: '12–60 месяцев', months: [12, 24, 36, 60], rate: 19.9, min: 30000, max: 5000000, badge: 'от 19,9 % годовых', note: 'Деньги сразу уходят партнёру по вашему списку покупок — ничего не нужно переводить вручную.' },
  ];
  function payment(amount, months, rate) { if (!rate) return amount / months; const r = rate / 100 / 12; return (amount * r) / (1 - Math.pow(1 + r, -months)); }
  function offersFor(amount) { return FIN.filter((f) => amount >= f.min && amount <= f.max); }
  function best(amount) {
    const list = offersFor(amount); if (!list.length) return null;
    const zero = list.filter((f) => !f.rate && !f.parts);
    const f = zero.length ? zero[zero.length - 1] : list[list.length - 1];
    const m = f.months[f.months.length - 1];
    return { offer: f, months: m, pay: payment(amount, m, f.rate) };
  }
  state.pay = state.pay || { mode: 'now', offer: null, months: null };
  function finLine(amount, title, cls = '') {
    const b = best(amount); if (!b) return '';
    return `<button type="button" class="fin-line ${cls}" data-fin-amount="${Math.round(amount)}" data-fin-title="${esc(title || '')}">${icon('badge-percent')}<span>или от <b>${rub(b.pay)}</b>/мес${b.offer.rate ? '' : ' без переплаты'}</span>${icon('chevron-right')}</button>`;
  }
  function finCard(amount, title) {
    const b = best(amount); if (!b) return '';
    const chosen = state.pay.mode !== 'now' && state.pay.offer ? FIN.find((f) => f.id === state.pay.offer) : null;
    return `<div class="card fin-card"><div class="fin-card__top"><span class="fin-card__ico">${icon('landmark')}</span><div><b>Рассрочка и кредит ${window.RC.rel2()}</b><small>${chosen ? `${chosen.name} · ${state.pay.months} мес · ${rub(payment(amount, state.pay.months, chosen.rate))}/мес` : `от ${rub(b.pay)}/мес · ${b.offer.name}, ${b.months} мес, без переплаты`}</small></div></div>
      <div class="fin-card__opts">${offersFor(amount).map((f) => `<span class="pill ${f.rate ? '' : 'pill--green'}">${esc(f.name)} · ${f.label}</span>`).join('')}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-fin-amount="${Math.round(amount)}" data-fin-title="${esc(title || '')}">${chosen ? 'Изменить условия' : 'Подобрать условия'}</button></div>`;
  }
  function finModal(amount, title, prefer = '') {
    const list = offersFor(amount); if (!list.length) return toast('Для этой суммы рассрочка не предлагается');
    const preferred = prefer === 'credit' ? list.find((f) => f.rate) : prefer === 'inst' ? [...list].reverse().find((f) => !f.rate) : null;
    const ui = { offer: preferred ? preferred.id : state.pay.offer && list.some((f) => f.id === state.pay.offer) ? state.pay.offer : best(amount).offer.id, months: null };
    const cur = () => list.find((f) => f.id === ui.offer);
    const view = () => {
      const f = cur(); if (!ui.months || !f.months.includes(ui.months)) ui.months = f.months[f.months.length - 1];
      const pay = f.parts ? amount / f.parts : payment(amount, ui.months, f.rate); const over = f.parts ? 0 : pay * ui.months - amount;
      return `<div class="fin-offers">${list.map((o) => `<button type="button" class="fin-offer ${o.id === ui.offer ? 'is-on' : ''}" data-offer="${o.id}"><span class="fin-offer__chk">${icon('check')}</span><div><b>${esc(o.name)}</b><small>${o.label} · ${o.who}</small></div><span class="pill ${o.rate ? '' : 'pill--green'}">${o.badge}</span></button>`).join('')}</div>
        <div class="fin-detail">
          ${f.parts ? `<div class="fin-parts">${Array.from({ length: f.parts }, (_, i) => `<div><small>${i === 0 ? 'сегодня' : `через ${i * 2} нед`}</small><b>${rub(pay)}</b></div>`).join('')}</div>`
          : `<div class="row" style="justify-content:space-between;gap:.75rem;flex-wrap:wrap"><div class="seg">${f.months.map((m) => `<button type="button" class="${m === ui.months ? 'is-on' : ''}" data-months="${m}">${m} мес</button>`).join('')}</div><b class="fin-pay">${rub(pay)}<small>/мес</small></b></div>`}
          <div class="fin-sum"><span>Сумма</span><b>${rub(amount)}</b><span>Переплата</span><b class="${over ? '' : 'ok'}">${over ? rub(over) : '0 ₽'}</b></div>
          <p class="xs muted">${esc(f.note)}</p>
        </div>`;
    };
    modal(`${modalHead('Как оплатить', title ? `${title} · ${rub(amount)}` : rub(amount))}<div id="fin-body">${view()}</div>
      <p class="xs muted" style="margin-top:.75rem">${icon('shield-check')} Решение принимает банк или сервис рассрочки онлайн. Деньги получает партнёр, скидка RemCard сохраняется. Условия в прототипе — примерные.</p>
      <div class="modal__foot"><button class="btn btn--ghost" data-close>Пока нет</button><button class="btn btn--primary" id="fin-ok">Выбрать этот способ</button></div>`, {
      onOpen(mo) {
        const body = qs('#fin-body', mo);
        const bind = () => {
          qsa('[data-offer]', body).forEach((b) => b.onclick = () => { ui.offer = b.dataset.offer; ui.months = null; body.innerHTML = view(); bind(); });
          qsa('[data-months]', body).forEach((b) => b.onclick = () => { ui.months = +b.dataset.months; body.innerHTML = view(); bind(); });
        };
        bind();
        qs('#fin-ok', mo).onclick = () => { const f = cur(); state.pay = { mode: f.rate ? 'credit' : 'inst', offer: f.id, months: f.parts ? 2 : ui.months }; window.RC.closeModal(); toast(`${f.name}: ${f.parts ? `4 платежа по ${rub(amount / f.parts)}` : `${ui.months} мес · ${rub(payment(amount, ui.months, f.rate))}/мес`}. Применим в списке покупок`); renderApp(); };
      },
    });
  }

  // ---------- Забота RemCard ----------
  const CARE = { name: 'Забота RemCard', short: 'Сервисы', lead: 'Купить за вас, перевезти, сохранить, застраховать, оплатить частями.' };
  const TYPES = [
    { id: 'purchase', title: 'Закупка за вас', icon: 'shopping-bag', lead: 'Найдём лучшее предложение по цене и качеству, купим и привезём. Ремонт не обязателен', short: 'подбор бесплатно', cta: 'Поручить закупку', ask: 'Поручить закупку', tasks: ['Купить по списку', 'Найти дешевле', 'Подобрать аналог'], wide: true },
    { id: 'delivery', title: 'Доставка', icon: 'truck', lead: 'Покупки, мебель, товары — куда скажете', short: 'от 900 ₽ за рейс', cta: 'Выбрать доставку', ask: 'Заказать перевозку', tasks: ['Перевезти мебель', 'Покупки одним рейсом', 'Отправить товар клиенту'] },
    { id: 'storage', title: 'Хранение', icon: 'warehouse', lead: 'Вещи, товары, материалы — до нужного дня', short: 'от 0 ₽ первые 14 дней', cta: 'Выбрать склад', ask: 'Подобрать хранение', tasks: ['Вещи на время переезда', 'Материалы до начала работ', 'Сезонный товар'] },
    { id: 'insurance', title: 'Страхование', icon: 'umbrella', lead: 'Груз, имущество, работы, ответственность', short: 'от 0,4 % стоимости', cta: 'Оформить полис', ask: 'Рассчитать полис', tasks: ['Застраховать груз', 'Защитить имущество', 'Полис на работы'] },
    { id: 'finance', title: 'Рассрочка и кредит', icon: 'landmark', lead: '0 % до 12 месяцев или кредит до 60 месяцев', short: '0 % до 12 мес', cta: 'Подобрать условия', ask: 'Подобрать условия', tasks: ['Оплатить частями', 'Кредит на услугу', 'Рассрочка для бизнеса'] },
  ];
  const PROV = [
    { id: 'rc-buyer', type: 'purchase', name: 'Закупки RemCard', city: 'Краснодар и край', rating: 4.9, reviews: 156, since: 2024, about: 'Опишите, что нужно: сравним цены и условия у магазинов и поставщиков-партнёров, выберем лучшее по цене и качеству, купим и привезём. Подходит, когда ремонта нет, а нужен просто товар.',
      tariffs: [['Подбор и сравнение предложений', 0, '—'], ['Закупка под ключ', 3, '% от суммы'], ['Срочный подбор за 2 часа', 990, 'заявка']], features: ['Сравниваем от 3 предложений', 'Цена не выше рыночной', 'Оплата после согласования'], zones: 'Краснодар, край, доставка по России', slots: 'ответ в течение часа' },
    { id: 'kuban-log', type: 'delivery', name: 'Кубань Логистик', city: 'Краснодар', rating: 4.8, reviews: 212, since: 2016, about: 'Газели, пятитонники и манипуляторы по Краснодару и краю. Возим покупки от партнёров RemCard, переезды и товары для бизнеса. Забираем в нескольких местах и привозим одним рейсом — платите за одну доставку, а не за три.',
      tariffs: [['Газель по городу, до 1,5 т', 900, 'рейс'], ['Газель за город', 35, 'км'], ['Манипулятор 5 т', 2500, 'час'], ['Подъём без лифта', 150, 'место за этаж'], ['Грузчик', 600, 'час']],
      features: ['Сборная доставка от нескольких магазинов', 'Фото при передаче', 'Оплата после разгрузки'], zones: 'Краснодар, Адыгейск, Динская, Северская, до 100 км от города', slots: 'сегодня после 16:00 · завтра с 9:00' },
    { id: 'gazel24', type: 'delivery', name: 'Газель 24', city: 'Краснодар', rating: 4.6, reviews: 98, since: 2019, about: 'Срочная подача машины за час, работаем круглосуточно. Подходит, когда материал нужен «вчера».',
      tariffs: [['Газель по городу', 1100, 'рейс'], ['Срочная подача за 1 час', 500, 'доплата'], ['Грузчик', 500, 'час']], features: ['Круглосуточно', 'Подача за 1 час', 'Оплата картой водителю'], zones: 'Краснодар и пригород до 30 км', slots: 'в течение часа' },
    { id: 'store-own', type: 'delivery', name: 'Доставка магазина', city: 'Краснодар', rating: 4.7, reviews: 340, since: 2012, about: 'Собственная доставка магазина-партнёра. Условия указаны в карточке каждого товара; у многих партнёров бесплатно от определённой суммы.',
      tariffs: [['По городу', 1200, 'рейс'], ['При заказе от 50 000 ₽', 0, '—'], ['Подъём на этаж', 200, 'место за этаж']], features: ['Товар едет напрямую со склада', 'Один ответственный за товар и доставку'], zones: 'Краснодар', slots: 'на следующий день' },
    { id: 'sklad-yug', type: 'storage', name: 'Склад «Хранение Юг»', city: 'Краснодар, Прикубанский округ', rating: 4.9, reviews: 64, since: 2018, about: 'Отапливаемый склад ответственного хранения: материалы, мебель, техника, товарные остатки. Принимаем доставку без вашего присутствия, ведём опись с фото и выдаём к нужному дню — на объект, домой или вашему клиенту.',
      tariffs: [['Хранение, за м³', 350, 'неделя'], ['Приём и размещение', 0, '—'], ['Доставка со склада на объект', 900, 'рейс']], features: ['Приём без вашего присутствия', 'Опись и фотоотчёт', 'Страхование на складе включено', 'Выдача по этапу маршрута'], zones: 'Краснодар', slots: 'приём ежедневно 8:00–20:00' },
    { id: 'store-keep', type: 'storage', name: 'Хранение у магазина', city: 'Краснодар', rating: 4.7, reviews: 120, since: 2012, about: 'Магазины-партнёры бесплатно держат оплаченный товар до 14 дней (двери Tandoor — до 30 дней). Дальше — по тарифу склада магазина. Удобно, когда до этапа осталось немного.',
      tariffs: [['Первые 14 дней', 0, '—'], ['Далее, за м³', 250, 'неделя']], features: ['Без лишних перемещений', 'Выдача по коду сертификата'], zones: 'склады магазинов-партнёров', slots: 'в часы работы магазина' },
    { id: 'sk-garant', type: 'insurance', name: 'СК «Гарант-Юг»', city: 'Краснодар', rating: 4.7, reviews: 41, since: 2009, about: 'Страхуем груз в пути, имущество и товары на хранении, материалы на объекте, строительно-монтажные работы и ответственность исполнителя. Не только для ремонта: любые отправки и ценности.',
      tariffs: [['Груз в пути', 0.4, '% от стоимости'], ['Материалы на объекте', 0.8, '% в месяц'], ['Ремонт под ключ (СМР)', 1.2, '% от сметы'], ['Ответственность мастера', 1500, 'полис в месяц']], features: ['Полис онлайн за 5 минут', 'Выплата до 10 дней', 'Без осмотра до 500 000 ₽'], zones: 'Краснодарский край', slots: 'онлайн, круглосуточно' },
    { id: 'sk-dom', type: 'insurance', name: 'СК «Дом и ремонт»', city: 'Краснодар', rating: 4.5, reviews: 27, since: 2015, about: 'Специализация — готовая отделка и ответственность перед соседями. Полис на год после завершения ремонта.',
      tariffs: [['Груз в пути', 0.5, '% от стоимости'], ['Отделка после ремонта, 1 год', 0.6, '% от стоимости'], ['Залив соседей', 2900, 'полис в год']], features: ['Полис на готовый ремонт', 'Урегулирование без справок до 100 000 ₽'], zones: 'Краснодар, Новороссийск, Сочи', slots: 'онлайн' },
    ...FIN.map((f) => ({ id: 'fin-' + f.id, type: 'finance', name: f.name, city: f.who, rating: 4.8, reviews: 500, since: 2020, about: f.note, fin: f.id,
      tariffs: [[f.label, f.rate ? `от ${dec(f.rate)} % годовых` : 'без переплаты', ''], ['Сумма', `${fmt(f.min)} – ${fmt(f.max)} ₽`, '']], features: ['Решение онлайн', 'Деньги напрямую партнёру', 'Скидка RemCard сохраняется'], zones: 'вся Россия', slots: 'онлайн' })),
  ];
  const tar = (r) => typeof r[1] === 'string' ? r[1] : r[2].startsWith('%') ? `${dec(r[1])} ${r[2]}` : r[1] ? `${fmt(r[1])} ₽ / ${r[2]}` : 'бесплатно';
  const typeOf = (id) => TYPES.find((t) => t.id === id);
  const prov = (id) => PROV.find((p) => p.id === id);
  state.deal = state.deal || { delivery: null, storage: null, insurance: null };

  function cartGoods() { const c = C(); return state.cart.filter((x) => x.type === 'p').reduce((s, x) => { const p = c.products.find((y) => y.id === x.id); return s + (p ? p.price * x.qty : 0); }, 0); }
  function cartVolume() { const c = C(); return Math.max(0.5, state.cart.filter((x) => x.type === 'p').reduce((s, x) => { const p = c.products.find((y) => y.id === x.id); if (!p) return s; const v = /м²/.test(p.unit) ? 0.012 : /мешок|ведро/.test(p.unit) ? 0.03 : /полотно|комплект/.test(p.unit) ? 0.15 : 0.05; return s + v * x.qty; }, 0)); }
  // Оценка стоимости сервиса для выбранных параметров
  function price(type, o, amount) {
    const p = prov(o.provider); if (!p) return 0;
    if (type === 'delivery') { let s = p.tariffs[0][1]; if (p.id === 'store-own' && amount >= 50000) s = 0; if (o.floor > 1 && !o.lift) s += (p.id === 'store-own' ? 200 : 150) * Math.max(1, Math.round(cartVolume() * 4)) * (o.floor - 1); if (o.out) s += 35 * o.km; return s; }
    if (type === 'storage') { const m3 = Math.ceil(cartVolume() * 10) / 10; const w = o.weeks; if (p.id === 'store-keep') return Math.max(0, w - 2) * 250 * m3; return w * 350 * m3; }
    if (type === 'insurance') { let s = 0; const t = Object.fromEntries(p.tariffs.map((r) => [r[0], r[1]])); if (o.kinds.includes('transit')) s += amount * (t['Груз в пути'] / 100); if (o.kinds.includes('site')) s += amount * ((t['Материалы на объекте'] || 0.8) / 100) * o.months; if (o.kinds.includes('works')) s += amount * 0.6 * ((t['Ремонт под ключ (СМР)'] || 1.2) / 100); if (o.kinds.includes('flood')) s += t['Залив соседей'] || 2900; return Math.round(s); }
    return 0;
  }
  function dealTotal() { const amount = cartGoods(); return ['delivery', 'storage', 'insurance'].reduce((s, t) => s + (state.deal[t] ? price(t, state.deal[t], amount) : 0), 0); }
  function dealLabel(type) {
    const o = state.deal[type]; if (!o) return '';
    const p = prov(o.provider); const amount = cartGoods(); const cost = price(type, o, amount);
    const det = type === 'delivery' ? `${o.out ? `за город, ${o.km} км` : 'по городу'}${o.floor > 1 ? ` · ${o.floor} этаж${o.lift ? ', лифт' : ', без лифта'}` : ''}` : type === 'storage' ? `${o.weeks} ${plural(o.weeks, 'неделя', 'недели', 'недель')} · ≈ ${Math.ceil(cartVolume() * 10) / 10} м³` : o.kinds.map((k) => ({ transit: 'груз в пути', site: `на объекте ${o.months} мес`, works: 'работы', flood: 'залив соседей' })[k]).join(', ');
    return `${p.name} · ${det} · <b>${cost ? rub(cost) : 'бесплатно'}</b>`;
  }
  const KINDS = [['transit', 'Груз в пути'], ['site', 'Материалы на объекте'], ['works', 'Работы (СМР)'], ['flood', 'Залив соседей']];
  function dealModal(type, ctx = {}) {
    const t = typeOf(type); const list = PROV.filter((p) => p.type === type); const amount = ctx.amount || cartGoods() || 0;
    const o = state.deal[type] ? { ...state.deal[type] } : type === 'delivery' ? { provider: list[0].id, floor: 1, lift: true, out: false, km: 20 } : type === 'storage' ? { provider: list[0].id, weeks: 3 } : { provider: list[0].id, kinds: ['transit'], months: 1 };
    const view = () => {
      const cost = price(type, o, amount);
      const params = type === 'delivery' ? `<div class="deal-params"><label>Этаж<input type="number" min="1" max="30" value="${o.floor}" data-p="floor"></label><label class="deal-check"><input type="checkbox" data-p="lift" ${o.lift ? 'checked' : ''}><span>Есть лифт</span></label><label class="deal-check"><input type="checkbox" data-p="out" ${o.out ? 'checked' : ''}><span>За город</span></label>${o.out ? `<label>Км от города<input type="number" min="1" value="${o.km}" data-p="km"></label>` : ''}</div>`
        : type === 'storage' ? `<div class="deal-params"><label>Срок, недель<input type="number" min="1" max="52" value="${o.weeks}" data-p="weeks"></label><span class="xs muted">Объём списка ≈ ${Math.ceil(cartVolume() * 10) / 10} м³. Склад сам заберёт товар у магазина и привезёт к этапу маршрута.</span></div>`
        : `<div class="deal-params deal-params--col"><div class="chips">${KINDS.map(([k, l]) => `<button type="button" class="chip ${o.kinds.includes(k) ? 'is-on' : ''}" data-kind="${k}">${l}</button>`).join('')}</div>${o.kinds.includes('site') ? `<label>Хранение на объекте, мес<input type="number" min="1" max="12" value="${o.months}" data-p="months"></label>` : ''}<span class="xs muted">Страховая сумма — стоимость товаров в списке: ${rub(amount)}</span></div>`;
      return `<div class="deal-provs">${list.map((p) => `<button type="button" class="deal-prov ${p.id === o.provider ? 'is-on' : ''}" data-prov="${p.id}"><span class="fin-offer__chk">${icon('check')}</span><div><b>${esc(p.name)}</b><small>${icon('star')} ${p.rating} · ${p.tariffs.slice(0, 2).map((r) => `${r[0]} — ${tar(r)}`).join(' · ')}</small></div><a class="link xs" href="#/care/${p.id}" data-close>о партнёре</a></button>`).join('')}</div>
        ${params}
        <div class="fin-sum"><span>${t.title}</span><b>${cost ? rub(cost) : 'бесплатно'}</b><span>${type === 'delivery' ? 'Когда' : type === 'storage' ? 'Приём' : 'Полис'}</span><b class="ok" style="font-size:.9rem">${esc(prov(o.provider).slots)}</b></div>`;
    };
    modal(`${modalHead(t.title, t.lead)}<div id="deal-body">${view()}</div>
      <div class="modal__foot">${state.deal[type] ? `<button class="btn btn--ghost" id="deal-rm">Убрать</button>` : `<button class="btn btn--ghost" data-close>Отмена</button>`}<button class="btn btn--primary" id="deal-ok">${state.deal[type] ? 'Сохранить' : 'Добавить к заказу'}</button></div>`, {
      onOpen(mo) {
        const body = qs('#deal-body', mo);
        const bind = () => {
          qsa('[data-prov]', body).forEach((b) => b.onclick = (e) => { if (e.target.closest('a')) return; o.provider = b.dataset.prov; body.innerHTML = view(); bind(); });
          qsa('[data-kind]', body).forEach((b) => b.onclick = () => { o.kinds = o.kinds.includes(b.dataset.kind) ? o.kinds.filter((k) => k !== b.dataset.kind) : [...o.kinds, b.dataset.kind]; body.innerHTML = view(); bind(); });
          qsa('[data-p]', body).forEach((i) => i.onchange = () => { o[i.dataset.p] = i.type === 'checkbox' ? i.checked : Math.max(+i.min || 0, +i.value || 0); body.innerHTML = view(); bind(); });
        };
        bind();
        qs('#deal-ok', mo).onclick = () => { if (type === 'insurance' && !o.kinds.length) return toast('Выберите, что страхуем'); state.deal[type] = o; window.RC.closeModal(); toast(`${t.title}: ${prov(o.provider).name} — добавлено к заказу`); renderApp(); };
        const rm = qs('#deal-rm', mo); if (rm) rm.onclick = () => { state.deal[type] = null; window.RC.closeModal(); renderApp(); };
      },
    });
  }

  // Блок «К заказу» на карточке товара и в списке покупок
  function dealRows(ctx = {}, compact = false) {
    const amount = ctx.amount || cartGoods();
    const hint = { delivery: ctx.sellerDelivery ? `${ctx.sellerDelivery} · или партнёр от 900 ₽` : 'от 900 ₽ за рейс, можно одним рейсом от всех магазинов', storage: '14 дней бесплатно у магазина, дальше от 350 ₽/м³ в неделю', insurance: amount ? `груз в пути от ${rub(amount * 0.004)}, на объекте от ${rub(amount * 0.008)}/мес` : 'от 0,4 % стоимости' };
    return `<div class="deal ${compact ? 'deal--compact' : ''}"><div class="deal__h"><b>${compact ? 'К заказу' : 'К заказу'}</b><a class="link small" href="#/care">${CARE.name} ${icon('arrow-right')}</a></div>
      ${['delivery', 'storage', 'insurance'].map((id) => { const t = typeOf(id); const on = !!state.deal[id]; return `<button type="button" class="deal__row ${on ? 'is-on' : ''}" data-deal="${id}"><span class="deal__ico">${icon(t.icon)}</span><div><b>${t.title}</b><small>${on ? dealLabel(id) : hint[id]}</small></div><span class="deal__act">${on ? icon('check') : icon('plus')}</span></button>`; }).join('')}
    </div>`;
  }
  function payBlock() {
    const goods = cartGoods(); const extra = dealTotal(); const total = goods + extra; const b = best(total);
    const mode = state.pay.mode; const f = state.pay.offer ? FIN.find((x) => x.id === state.pay.offer) : null;
    const monthly = f ? (f.parts ? total / f.parts : payment(total, state.pay.months, f.rate)) : 0;
    return `<div class="card card--pad-lg pay"><h4 style="margin-bottom:.6rem">Как оплатить</h4>
      <div class="seg pay__seg"><button type="button" class="${mode === 'now' ? 'is-on' : ''}" data-pay="now">Сразу</button><button type="button" class="${mode === 'inst' ? 'is-on' : ''}" data-pay="inst">Рассрочка 0 %</button><button type="button" class="${mode === 'credit' ? 'is-on' : ''}" data-pay="credit">Кредит</button></div>
      ${mode === 'now' ? `<p class="xs muted" style="margin-top:.6rem">Оплата напрямую продавцам по сертификату RemCard. ${b ? `Можно и частями — от ${rub(b.pay)}/мес без переплаты.` : ''}</p>`
      : `<div class="pay__pick">${f && ((mode === 'inst' && !f.rate) || (mode === 'credit' && f.rate)) ? `<div><b>${esc(f.name)}</b><small>${f.parts ? `4 платежа по ${rub(monthly)}` : `${state.pay.months} мес · ${rub(monthly)}/мес`}${f.rate ? ` · переплата ${rub(monthly * state.pay.months - total)}` : ' · без переплаты'}</small></div>` : `<div><b>${mode === 'inst' ? 'Выберите сервис рассрочки' : 'Выберите банк'}</b><small>${mode === 'inst' ? '0 % — до 12 месяцев' : 'от 19,9 % годовых, до 60 месяцев'}</small></div>`}<button type="button" class="btn btn--ghost btn--sm" data-fin-amount="${Math.round(total)}" data-fin-title="Список покупок" data-fin-mode="${mode}">${f ? 'Изменить' : 'Подобрать'}</button></div>`}
    </div>`;
  }

  // ---------- Страницы: /services, /service/:id ----------
  function provCard(p) {
    const t = typeOf(p.type);
    return `<a class="svcp" href="#/care/${p.id}"><div class="svcp__top"><span class="svcp__ico">${icon(t.icon)}</span><div><b>${esc(p.name)}</b><small>${icon('star')} ${p.rating} · ${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}</small></div></div>
      <div class="svcp__tar">${p.tariffs.slice(0, 2).map((r) => `<span>${esc(r[0])}</span><b>${tar(r)}</b>`).join('')}</div>
      <div class="chips chips--xs">${p.features.slice(0, 2).map((x) => `<span class="chip chip--static">${esc(x)}</span>`).join('')}</div></a>`;
  }
  function careRequestModal(type, providerId) {
    const any = !typeOf(type);
    const t = any ? { title: 'Задача', tasks: ['Например: перевезти мебель и застраховать груз'] } : typeOf(type); const p = providerId ? prov(providerId) : type === 'purchase' ? prov('rc-buyer') : null;
    const who = p ? p.name : any ? 'подходящая компания' : `компания из раздела «${t.title}»`;
    modal(`${modalHead(any ? 'Опишите задачу' : `${t.title} · заявка`, p ? esc(p.name) : 'Подберём компанию под задачу')}
      <div class="stack" id="care-form">
        <div><label>${type === 'purchase' ? 'Что купить' : 'Что нужно сделать'}</label><textarea id="care-task" rows="3" placeholder="${type === 'purchase' ? 'Например: керамогранит 60×60, 40 м², светлый. Или ссылка на товар' : esc(t.tasks[0])}"></textarea></div>
        ${type === 'purchase' ? `<div class="grid2"><div><label>Бюджет</label><input placeholder="до 80 000 ₽"></div><div><label>Что важнее</label><select><option>Цена и качество</option><option>Дешевле</option><option>Быстрее</option></select></div></div>` : ''}
        <div class="grid2"><div><label>Город</label><input id="care-city" value="Краснодар"></div><div><label>Когда</label><select id="care-when"><option>Как можно скорее</option><option>На этой неделе</option><option>Выберу дату с компанией</option></select></div></div>
        <div class="grid2"><div><label>Телефон</label><input id="care-phone" placeholder="+7 ___ ___-__-__"></div><div><label>Связь</label><select><option>MAX</option><option>Telegram</option><option>WhatsApp</option><option>Звонок</option></select></div></div>
        <button class="btn btn--primary btn--lg" id="care-send">${icon('send')} Отправить заявку</button>
        <p class="xs muted">${type === 'purchase' ? 'Закупщик RemCard пришлёт 2–3 предложения на выбор. Подбор бесплатный.' : `${esc(who[0].toUpperCase() + who.slice(1))} свяжется с вами. Без комиссии платформы.`}</p>
      </div>`, { onOpen: (mo) => { qs('#care-send', mo).onclick = () => { if (!qs('#care-task', mo).value.trim()) return toast('Опишите задачу в пару слов'); window.RC.closeModal(); toast(any ? 'Заявка отправлена. Подберём компанию и ответим в рабочее время' : `Заявка отправлена: ${t.title.toLowerCase()}. Ответим в рабочее время`); }; } });
  }
  function careTasks(sel) {
    const list = sel ? typeOf(sel).tasks.map((x) => [sel, x]) : TYPES.flatMap((t) => t.tasks.slice(0, 2).map((x) => [t.id, x]));
    return `<div class="care-tasks">${list.map(([id, x]) => `<button type="button" class="chip" data-care-ask="${id}">${icon(typeOf(id).icon)} ${esc(x)}</button>`).join('')}</div>`;
  }
  function pageServices(params) {
    const sel = params.type && typeOf(params.type) ? params.type : '';
    const inCart = state.cart.filter((x) => x.type === 'p').length;
    if (!sel) {
      return `<section class="section--tight"><div class="wrap shop">
      <div class="care-hero"><div><span class="eyebrow eyebrow--red">${icon('heart')} ${CARE.name}</span><h1 class="pd__name" style="margin-top:.4rem">Сервисы для вашей задачи</h1><p class="lead" style="margin:.4rem 0 0">${CARE.lead}</p></div></div>
      <div class="care-home care-home--page">${TYPES.map((t) => `<a class="care-home__i ${t.wide ? 'care-home__i--wide' : ''}" href="#/care?type=${t.id}"><span class="svct__ico">${icon(t.icon)}</span><div><b>${t.title}</b>${t.wide ? `<p>${esc(t.lead)}</p>` : ''}<ul>${t.tasks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><span class="care-home__cta">${t.short} ${icon('arrow-right')}</span></a>`).join('')}</div>
      <div class="care-foot"><button type="button" class="btn btn--ghost" data-care-ask="any">${icon('send')} Описать задачу своими словами</button><a class="link small" href="../partner/index.html">Партнёрам: подключение в кабинете ${icon('arrow-right')}</a></div>
    </div></section>`;
    }
    const t = typeOf(sel);
    return `<section class="section--tight"><div class="wrap shop">
      <div class="crumbs"><a href="#/care">${CARE.short}</a>${icon('chevron-right')}<span>${t.title}</span></div>
      <div class="care-hero"><div><h1 class="pd__name" style="margin-top:.4rem">${t.title}</h1><p class="lead" style="margin:.4rem 0 0">${esc(t.lead)}</p></div></div>
      <div class="svct">${TYPES.map((x) => `<a class="svct__i ${sel === x.id ? 'is-on' : ''}" href="#/care?type=${x.id}"><span class="svct__ico">${icon(x.icon)}</span><b>${x.title}</b><small>${x.short}</small></a>`).join('')}</div>
      <div class="care-ask"><span class="xs muted">Что нужно сделать?</span>${careTasks(sel)}</div>
      ${sel === 'purchase' ? `<div class="care-steps">${[['Опишите', 'Что купить, объём, бюджет'], ['Сравним', 'Цены и условия у партнёров, выберем лучшее'], ['Купим и привезём', 'Оплата после согласования']].map(([a, b], i) => `<div class="card card--soft"><i>${i + 1}</i><b>${a}</b><small>${b}</small></div>`).join('')}</div>` : ''}
      <div class="shop-sec" style="margin-top:1.25rem"><div class="shop-h"><h3>${sel === 'purchase' ? 'Кто выполняет' : 'Компании'}</h3><span class="xs muted">${PROV.filter((p) => p.type === sel).length} в вашем городе</span></div><div class="goods goods--svcp">${PROV.filter((p) => p.type === sel).map(provCard).join('')}</div>
        <div class="row" style="gap:.5rem;margin-top:.75rem;flex-wrap:wrap">${sel !== 'finance' ? `<button type="button" class="btn btn--primary btn--sm" data-care-ask="${sel}">${icon('send')} ${t.ask}</button>${inCart ? `<button type="button" class="btn btn--ghost btn--sm" data-deal="${sel}">${icon(t.icon)} ${t.cta} к списку покупок</button>` : ''}` : `<button type="button" class="btn btn--primary btn--sm" data-fin-amount="${Math.round(cartGoods() || 120000)}" data-fin-title="${cartGoods() ? 'Список покупок' : 'Пример: 120 000 ₽'}">${icon('landmark')} ${t.cta}</button><button type="button" class="btn btn--ghost btn--sm" data-care-ask="finance">${icon('send')} Заявка на свою сумму</button>`}</div></div>
    </div></section>`;
  }
  function pageProvider(params) {
    const p = prov(params.id); if (!p) return pageServices({});
    const t = typeOf(p.type); const amount = cartGoods();
    const fin = p.fin ? FIN.find((f) => f.id === p.fin) : null;
    return `<section class="section--tight"><div class="wrap shop shop--narrow">
      <div class="crumbs"><a href="#/">Главная</a>${icon('chevron-right')}<a href="#/care">${CARE.short}</a>${icon('chevron-right')}<a href="#/care?type=${t.id}">${t.title}</a></div>
      <div class="svcp-hero"><span class="svcp-hero__ico">${icon(t.icon)}</span><div><span class="pill">${t.title}</span><h1 class="pd__name" style="margin-top:.4rem">${esc(p.name)}</h1><small class="muted">${icon('star')} ${p.rating} · ${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')} · на платформе с ${p.since} · ${esc(p.city)}</small></div></div>
      <p style="margin:1rem 0">${esc(p.about)}</p>
      <div class="chips">${p.features.map((x) => `<span class="chip chip--static">${icon('check')} ${esc(x)}</span>`).join('')}</div>
      <h3 style="margin:1.4rem 0 .6rem">Тарифы</h3>
      <div class="card svcp-tar">${p.tariffs.map((r) => `<div><span>${esc(r[0])}</span><b>${tar(r)}</b></div>`).join('')}</div>
      <dl class="specs" style="margin-top:1rem"><div><dt>${t.id === 'finance' ? 'Где работает' : 'Зона'}</dt><dd>${esc(p.zones)}</dd></div><div><dt>${t.id === 'delivery' ? 'Ближайшее окно' : t.id === 'storage' ? 'Приём' : 'Оформление'}</dt><dd>${esc(p.slots)}</dd></div></dl>
      <div class="row" style="gap:.5rem;margin-top:1.2rem;flex-wrap:wrap">${fin ? `<button class="btn btn--primary btn--lg grow" data-fin-amount="${Math.round(amount || 120000)}" data-fin-title="${amount ? 'Список покупок' : 'Пример: 120 000 ₽'}">${icon('landmark')} Посчитать платёж</button>` : amount ? `<button class="btn btn--primary btn--lg grow" data-deal="${t.id}" data-prov-pre="${p.id}">${icon('plus')} ${state.deal[t.id]?.provider === p.id ? 'Изменить в заказе' : 'Добавить к заказу'}</button>` : `<button class="btn btn--primary btn--lg grow" data-care-ask="${t.id}" data-care-prov="${p.id}">${icon('send')} Оставить заявку</button>`}<button class="btn btn--ghost btn--lg" id="svcp-ask">Написать</button></div>
      <p class="xs muted" style="margin-top:.75rem">${amount ? `Расчёт — по вашему списку покупок на ${rub(amount)}.` : 'Заявка подходит для любой задачи, не только для покупок у партнёров. Для расчёта по списку покупок добавьте в него товары.'} Оплата сервиса — напрямую компании, без комиссии платформы.</p>
    </div></section>`;
  }

  // ---------- Точки входа в существующих страницах (вставка после отрисовки) ----------
  function inject(path, params) {
    if (!window.RC_R(2)) return; // рассрочка, доставка, хранение, страхование — релиз 2
    const c = C();
    if (path.startsWith('/catalog/p/')) {
      const p = c.products.find((x) => x.id === params.id); const pr = qs('.pd__price'); if (!p || !pr || qs('.fin-line')) return;
      pr.insertAdjacentHTML('afterend', finLine(p.price, p.name));
      const btns = qs('.pd__info .row[style*="margin-top:1.1rem"]'); if (btns) btns.insertAdjacentHTML('afterend', `<a class="mc-hint" href="#/calc/materials?for=${p.cat}">${icon('calculator')}<span>Сколько нужно? Посчитать по размерам</span>${icon('chevron-right')}</a>` + dealRows({ amount: p.price, sellerDelivery: p.attrs['Доставка'] }, true));
    }
    if (path === '/catalog/kit/' + params.id) {
      const sum = qs('.kithead__sum > b'); if (sum && !qs('.fin-line')) { const n = +sum.textContent.replace(/[^\d]/g, ''); if (n > 1000) sum.closest('.kithead__sum').insertAdjacentHTML('beforeend', finLine(n, 'Комплект')); }
    }
    if (path.startsWith('/catalog/s/')) {
      const s = c.services.find((x) => x.id === params.id); const pr = qs('.pd__price'); if (!s || !pr || qs('.fin-line')) return;
      pr.insertAdjacentHTML('afterend', `<button type="button" class="fin-line" data-fin-amount="60000" data-fin-title="${esc(s.title)} · пример сметы">${icon('badge-percent')}<span>работы — <b>в рассрочку</b> от 0 %</span>${icon('chevron-right')}</button>`);
    }
    if (path === '/catalog/list' && state.cart.length) {
      const tot = qs('.ltotal'); if (!tot || qs('.pay')) return;
      tot.insertAdjacentHTML('beforebegin', dealRows({}) + payBlock());
      const goodsRow = qs('.ltotal .row'); const extra = dealTotal(); const total = cartGoods() + extra;
      if (goodsRow && extra) goodsRow.insertAdjacentHTML('afterend', `<div class="row" style="justify-content:space-between"><span>${CARE.name} · к заказу</span><b>${rub(extra)}</b></div>`);
      const f = state.pay.offer ? FIN.find((x) => x.id === state.pay.offer) : null; const monthly = f ? (f.parts ? total / f.parts : payment(total, state.pay.months, f.rate)) : 0;
      const btnRow = qs('.ltotal .row[style*="margin-top:1rem"]'); if (btnRow) btnRow.insertAdjacentHTML('beforebegin', `<div class="row" style="justify-content:space-between;align-items:baseline;margin-top:.6rem;padding-top:.6rem;border-top:1px solid var(--line)"><span>Итого</span><b style="font-size:1.25rem;letter-spacing:-0.03em">${rub(total)}</b></div>${state.pay.mode !== 'now' && f ? `<div class="row" style="justify-content:space-between;align-items:baseline;margin-top:.3rem;flex-wrap:nowrap;gap:.75rem"><span class="muted">${f.name} · ${f.parts ? '4 платежа' : state.pay.months + ' мес'}</span><b style="color:var(--green)">${rub(monthly)}<small style="font-size:.8rem;font-weight:600"> / ${f.parts ? '2 нед' : 'мес'}</small></b></div>` : ''}`);
      const note = qs('.ltotal p.xs'); if (note) { const parts = ['Продавцы подтвердят наличие и цену со скидкой RemCard']; if (state.deal.delivery) parts.push('перевозчик — окно доставки'); if (state.deal.storage) parts.push('склад — приём товара'); if (state.deal.insurance) parts.push('страховая — полис'); if (state.pay.mode !== 'now') parts.push('банк — решение по рассрочке'); note.textContent = parts.join(', ') + '. Оплата — напрямую, без комиссии.'; }
    }
    if (path === '/estimate') {
      const card = qsa('.card').find((x) => /^Рассрочка/.test(x.textContent.trim())); const r = state.estimate;
      if (card && r && !qs('.fin-card')) card.outerHTML = finCard(r.turnkey || r.total || 0, 'Ремонт по смете');
    }
    if (path === '/catalog' && !params.sec && !params.q && !params.cat && !params.stage && !params.room && !qs('.svcrow')) {
      const anchor = qsa('.shop-sec').pop();
      if (anchor) anchor.insertAdjacentHTML('afterend', `<div class="shop-sec svcrow"><div class="shop-h"><h3>${CARE.name}</h3><a class="link small" href="#/care">Все ${icon('arrow-right')}</a></div><div class="svct">${TYPES.map((t) => `<a class="svct__i" href="#/care?type=${t.id}"><span class="svct__ico">${icon(t.icon)}</span><b>${t.title}</b><small>${t.short}</small></a>`).join('')}</div></div>`);
    }
    if (path === '/catalog' && params.q && !qs('.care-search')) {
      const q = params.q.toLowerCase(); const hit = TYPES.find((t) => (CARE_WORDS[t.id] || []).some((w) => q.includes(w)));
      const host = qs('.shop'); if (hit && host) host.insertAdjacentHTML('afterbegin', `<a class="care-search" href="#/care?type=${hit.id}"><span class="svct__ico">${icon(hit.icon)}</span><div><b>${hit.title} — в разделе «Сервисы»</b><small>${esc(hit.lead)}</small></div>${icon('arrow-right')}</a>`);
    }
  }
  function bind() {
    qsa('[data-fin-amount]').forEach((b) => b.onclick = (e) => { e.preventDefault(); finModal(+b.dataset.finAmount, b.dataset.finTitle, b.dataset.finMode || ''); });
    qsa('[data-deal]').forEach((b) => b.onclick = (e) => { e.preventDefault(); const type = b.dataset.deal; if (b.dataset.provPre && !state.deal[type]) state.deal[type] = null; dealModal(type); if (b.dataset.provPre) { const pb = qs(`#deal-body [data-prov="${b.dataset.provPre}"]`); if (pb) pb.click(); } });
    qsa('[data-pay]').forEach((b) => b.onclick = () => { const m = b.dataset.pay; if (m === 'now') { state.pay = { mode: 'now', offer: null, months: null }; renderApp(); return; } const f = state.pay.offer ? FIN.find((x) => x.id === state.pay.offer) : null; if (f && ((m === 'inst' && !f.rate) || (m === 'credit' && f.rate))) { state.pay.mode = m; renderApp(); return; } state.pay = { mode: m, offer: null, months: null }; renderApp(); finModal(cartGoods() + dealTotal(), 'Список покупок', m); });
    const ask = qs('#svcp-ask'); if (ask) ask.onclick = () => toast('Открываем чат с компанией (в прототипе — заглушка)');
    qsa('[data-care-ask]').forEach((b) => b.onclick = (e) => { e.preventDefault(); careRequestModal(b.dataset.careAsk, b.dataset.careProv); });
  }
  const CARE_WORDS = { purchase: ['купить', 'закуп', 'дешевле', 'где взять'], delivery: ['достав', 'перевоз', 'грузчик', 'газель', 'переезд', 'логист'], storage: ['хранен', 'склад', 'хранить'], insurance: ['страх', 'полис'], finance: ['рассрочк', 'кредит', 'частями', 'долями', 'банк'] };
  const r2 = (fn) => (params) => (window.RC_R(2) ? fn(params) : window.RC.release2Page(CARE.name, 'Закупка за вас, доставка, хранение, страхование и рассрочка появятся во втором релизе.'));
  route('/care', r2(pageServices));
  route('/care/:id', r2(pageProvider));
  route('/services', r2(pageServices));
  route('/service/:id', r2(pageProvider));
  document.addEventListener('rc:rendered', (e) => { inject(e.detail.path, e.detail.params); bind(); });
  window.RCExtras = { CARE, FIN, TYPES, PROV, careRequestModal, finLine, finCard, finModal, dealModal, dealRows, payBlock, payment, best, cartGoods, dealTotal };
})();
