/* RemCard — сертификат в заявке: проверка номера, скидка клиенту и вознаграждение рекомендателю (прототип).
   Один расчёт для обеих сторон: клиент вносит номер на сайте в своей заявке, партнёр — в кабинете при оформлении заказа.
   Файл подключается и на сайте клиента (classic script), и в кабинете партнёра (import ради побочного эффекта),
   результат — globalThis.RCOrderCert. Данные демонстрационные; таблица сертификатов повторяет client/cert.js
   (только продавцы каталога), в продукте проверку и расчёт делает сервер.
   Правила прототипа:
   - скидка — по категории каждой позиции; позиции вне категорий сертификата идут без скидки;
   - сертификат с пометкой «не суммируется с акциями» не действует на позиции со старой ценой;
   - сертификат продавца (issuer = org) рекомендателя не имеет — вознаграждения нет;
   - сертификат агента или специалиста: рекомендатель получает вознаграждение от продавца со стоимости заказа после скидки,
     в ожидании до оплаты заказа; кошелёк и взаиморасчёты RemCard этим прототипом не меняются. */
(function (g) {
  const TODAY = '2026-11-25';
  const REWARD_RATE = 5; // как в демо взаиморасчётов («Вознаграждение за переданного клиента», 5 %)
  const D = (label, pct) => [label, pct];
  const DOORS = [D('Межкомнатные двери', 10), D('Входные двери', 7), D('Фурнитура и ручки', 7), D('Погонаж и наличники', 5), D('Монтаж дверей', 5)];

  const CERTS = {
    'RC-TD-4F7K': { short: 'TD-4F7K', issuer: 'org', title: 'Сертификат Tandoor', until: '2026-12-31', max: 1, noPromo: true, by: null, sellers: { s6: DOORS } },
    'RC-AGENT-2K7Q': { short: '2K7Q', issuer: 'agent', title: 'Сертификат Ремкард', until: null, max: 0, noPromo: false, by: 'Мастер Алексей · демо',
      sellers: { s6: [D('Межкомнатные двери', 10), D('Фурнитура и ручки', 7)], s1: [D('Керамогранит', 7), D('Сантехника', 5)] } },
    'RC-CITY-M8V2': { short: 'M8V2', issuer: 'agent', title: 'Сертификат Ремкард', until: '2027-03-31', max: 0, noPromo: false, by: 'Дизайнер Ирина · демо', sellers: { s6: DOORS, s2: [D('Паркет и инженерная доска', 7)] } },
    'RC-KY-9Q2M': { short: '', issuer: 'org', title: 'Сертификат Керамика Юг', until: '2026-11-30', max: 0, noPromo: false, by: null, sellers: { s1: [D('Керамогранит', 7), D('Сантехника', 5)] } },
    'RC-DK-1A8Z': { short: 'DK-1A8Z', issuer: 'org', title: 'Сертификат Дом красок', until: '2026-10-31', max: 1, usedAlready: 1, noPromo: true, by: null, sellers: { s5: [D('Краски и колеровка', 5)] } },
    'RC-PH-7C3V': { short: 'PH-7C3V', issuer: 'org', title: 'Сертификат Паркет Холл', until: '2026-09-30', max: 1, noPromo: false, by: null, sellers: { s2: [D('Паркет и ламинат', 5)] } },
  };

  const reserved = new Map(); // code → id заявки: одноразовый сертификат занят заявкой до её закрытия

  function normalize(raw) {
    const t = String(raw || '').toUpperCase().replace(/[\s_–—−]+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
    if (!t) return '';
    if (CERTS[t]) return t;
    if (CERTS[`RC-${t}`]) return `RC-${t}`;
    const byShort = Object.keys(CERTS).find((k) => CERTS[k].short && CERTS[k].short === t);
    return byShort || t;
  }

  /* Тип категории по тексту: одинаково для названий разделов каталога и категорий сертификата. */
  function kind(text) {
    const t = String(text || '').toLowerCase();
    if (/монтаж|установк/.test(t)) return 'mount';
    if (/входн/.test(t)) return 'entry';
    if (/межкомн/.test(t)) return 'inter';
    if (/фурнитур|ручк|замк|петл/.test(t)) return 'hw';
    if (/погонаж|плинтус|наличник/.test(t)) return 'trim';
    return t.trim();
  }

  const fmtDate = (iso) => iso.split('-').reverse().join('.');

  /* items: [{ key, section, price, qty, promo }]. Результат одинаков для клиента и партнёра. */
  function calc(raw, sellerId, items, opts = {}) {
    const code = normalize(raw);
    if (!code) return { state: 'empty' };
    const c = CERTS[code];
    if (!c) return { state: 'notfound', code, message: 'Такого сертификата нет. Проверьте номер: он выглядит как RC-TD-4F7K или короткий код с карточки сертификата.' };
    const info = { code, title: c.title, issuer: c.issuer, shown: code, by: c.by };
    if (c.until && c.until < TODAY) return { state: 'expired', ...info, message: `Срок действия сертификата истёк ${fmtDate(c.until)}.` };
    const taken = reserved.get(code);
    if (c.max > 0 && ((c.usedAlready || 0) >= c.max || (taken && taken !== opts.orderId))) return { state: 'used', ...info, message: 'Сертификат уже использован: он одноразовый.' };
    const cats = c.sellers[sellerId];
    if (!cats) return { state: 'other', ...info, message: 'Сертификат не действует у этого продавца.' };
    const lines = []; let discount = 0; let base = 0;
    (items || []).forEach((it) => {
      const sum = Math.round(it.price * it.qty); base += sum;
      const k = kind(it.section);
      const hit = cats.find(([label]) => kind(label) === k);
      let pct = hit ? hit[1] : 0; let why = hit ? '' : 'вне категорий сертификата';
      if (pct && c.noPromo && it.promo) { pct = 0; why = 'акционная цена: сертификат не суммируется с акциями'; }
      const disc = Math.round((sum * pct) / 100); discount += disc;
      lines.push({ key: it.key, pct, disc, why, label: hit ? hit[0] : '' });
    });
    const total = base - discount;
    if (!discount) return { state: 'nodisc', ...info, lines, base, discount: 0, total: base, message: 'Сертификат действует у продавца, но на позиции в заявке скидка не распространяется.' };
    const reward = c.by ? { to: c.by, rate: REWARD_RATE, amount: Math.round((total * REWARD_RATE) / 100) } : null;
    return { state: 'ok', ...info, lines, base, discount, total, reward, until: c.until ? fmtDate(c.until) : '', limit: c.max === 1 ? 'одноразовый' : '' };
  }

  g.RCOrderCert = {
    calc, normalize, rate: REWARD_RATE,
    reserve: (code, orderId) => { const c = CERTS[code]; if (c && c.max > 0) reserved.set(code, orderId); },
    release: (code, orderId) => { if (reserved.get(code) === orderId) reserved.delete(code); },
    examples: () => ['RC-TD-4F7K', 'RC-AGENT-2K7Q', 'RC-CITY-M8V2'],
  };
}(typeof globalThis !== 'undefined' ? globalThis : window));
