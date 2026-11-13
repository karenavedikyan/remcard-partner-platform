/* RemCard — личный кабинет клиента: вход, покупки, карта и бонусы, отзывы, профиль.
   Функции перенесены с remcard.ru (/client/*): вход по коду из Telegram/MAX и через Яндекс/VK ID,
   баланс RemBonus и история начислений, заказы, обращения, сертификаты, отзывы с модерацией,
   избранное, проекты навигатора, уведомления, профиль с привязками, сессиями и удалением аккаунта.
   Упрощено: уровни «Новичок/Мастер/Эксперт/Гуру» убраны — одна карта, баллы = рубли у партнёров;
   «Заказы» и «Обращения» объединены в «Покупки»; сертификаты живут внутри карты. */
(function () {
  const { D, esc, fmt, money, plural, qs, qsa, go, icon, state, activeProject, modal, closeModal, toast, route, renderApp } = window.RC;
  const C = window.RCCatalogData;
  const prod = (id) => C.products.find((p) => p.id === id);
  const svc = (id) => C.services.find((s) => s.id === id);
  const partner = (id) => D.partners.find((p) => p.id === id);
  const pinfo = (id) => (C.partnerInfo && C.partnerInfo[id]) || {};
  const dateRu = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const dateShort = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const KEY = 'rc_me_v1';

  // ---------- Демо-данные кабинета ----------
  function demo() {
    return {
      user: { name: 'Анна', surname: 'Петрова', city: 'Краснодар', phone: '+7 918 ··· 42-17', card: '2204 0417 8821', since: '2026-03-12', avatar: 'АП',
        links: { tg: true, max: false, ya: false, vk: false }, notify: { tg: true, email: false, sms: false }, consents: true },
      balance: 1240,
      // Покупки у партнёров: товары и услуги. bonus — баллы за покупку, bstatus: pending (ждём подтверждения) | done | none
      purchases: [
        { id: 'z1', date: '2026-11-01', partner: 's6', kind: 'goods', items: [{ p: 'p004', q: 3 }, { p: 'p020', q: 3 }], sum: 35640, disc: 10, bonus: 356, bstatus: 'pending', bdue: '2026-11-15', status: 'done', reviewed: false },
        { id: 'z2', date: '2026-10-28', partner: 's1', kind: 'goods', items: [{ p: 'tile-marble', q: 24 }, { p: 'tile-wood', q: 12 }], sum: 98400, disc: 7, bonus: 984, bstatus: 'pending', bdue: '2026-11-11', status: 'progress', reviewed: false },
        { id: 'z3', date: '2026-10-25', partner: 'p1', kind: 'service', svc: 'tiler', title: 'Укладка плитки · ванная 6 м²', sum: 54000, disc: 0, bonus: 540, bstatus: 'pending', bdue: '2026-11-20', status: 'progress', reviewed: false },
        { id: 'z4', date: '2026-10-14', partner: 's3', kind: 'goods', items: [{ p: 'elec-socket', q: 18 }, { p: 'elec-cable', q: 2 }], sum: 71200, disc: 5, bonus: 712, bstatus: 'done', status: 'done', reviewed: true },
        { id: 'z5', date: '2026-10-09', partner: 's5', kind: 'goods', items: [{ p: 'paint-can', q: 4 }], sum: 22400, disc: 5, bonus: 224, bstatus: 'done', status: 'done', reviewed: false },
        { id: 'z6', date: '2026-10-02', partner: 'p3', kind: 'service', svc: 'electric', title: 'Электромонтаж · 2 комнаты', sum: 38000, disc: 0, bonus: 380, bstatus: 'done', status: 'done', reviewed: true },
        { id: 'z7', date: '2026-09-20', partner: 's2', kind: 'goods', items: [{ p: 'floor-laminate', q: 10 }], sum: 12900, disc: 5, bonus: 0, bstatus: 'none', status: 'cancelled', reviewed: false },
      ],
      // Обращения к мастерам и магазинам (бывшие «leads»)
      leads: [
        { id: 'l1', date: '2026-11-03', partner: 'p8', what: 'Установка 5 межкомнатных дверей', status: 'accepted' },
        { id: 'l2', date: '2026-10-30', partner: 'c3', what: 'Кондиционер в спальню, монтаж до отделки', status: 'thinking' },
        { id: 'l3', date: '2026-09-12', partner: 'p2', what: 'Дизайн-проект квартиры 62 м²', status: 'done' },
      ],
      // История баллов: + покупки и действия, − списания
      ledger: [
        { id: 'h1', date: '2026-11-03', kind: 'action', title: 'Этап «Электрика» завершён', amount: 20 },
        { id: 'h2', date: '2026-10-29', kind: 'buy', ref: 'z4', title: 'Покупка в Электромир', amount: 712 },
        { id: 'h3', date: '2026-10-24', kind: 'buy', ref: 'z5', title: 'Покупка в Дом красок', amount: 224 },
        { id: 'h4', date: '2026-10-20', kind: 'spend', title: 'Оплата баллами в Электромир', amount: -500 },
        { id: 'h5', date: '2026-10-18', kind: 'action', title: 'Отзыв о Сергее Ткачуке', amount: 10 },
        { id: 'h6', date: '2026-10-16', kind: 'buy', ref: 'z6', title: 'Услуга: Сергей Ткачук', amount: 380 },
        { id: 'h7', date: '2026-10-05', kind: 'action', title: 'Друг зарегистрировался по ссылке', amount: 50 },
        { id: 'h8', date: '2026-09-28', kind: 'action', title: 'Фото этапа «Черновые»', amount: 5 },
        { id: 'h9', date: '2026-09-15', kind: 'action', title: 'Задачи чек-листа · 9 шт.', amount: 9 },
        { id: 'h10', date: '2026-03-12', kind: 'action', title: 'Приветственные баллы', amount: 330 },
      ],
      // Сертификаты (скидки партнёров), перенесены с /client/certificates
      certs: [
        { id: 'c1', partner: 's6', pct: 10, cats: 'Двери и фурнитура', till: '2026-12-31', status: 'active', code: 'RC-TD-4F7K' },
        { id: 'c2', partner: 's1', pct: 7, cats: 'Плитка и сантехника', till: '2026-11-30', status: 'active', code: 'RC-KY-9Q2M' },
        { id: 'c3', partner: 's5', pct: 5, cats: 'Краски и декор', till: '2026-10-31', status: 'used', code: 'RC-DK-1A8Z' },
        { id: 'c4', partner: 's2', pct: 5, cats: 'Напольные покрытия', till: '2026-09-30', status: 'expired', code: 'RC-PH-7C3V' },
      ],
      reviews: [
        { id: 'r1', date: '2026-10-18', partner: 'p3', ref: 'z6', stars: 5, text: 'Аккуратно, по проекту, все трассы сфотографировали до штукатурки. Рекомендую.', status: 'published' },
        { id: 'r2', date: '2026-10-30', partner: 's3', ref: 'z4', stars: 4, text: 'Хороший выбор, помогли посчитать кабель. Доставку ждали на день дольше.', status: 'moderation' },
      ],
      favorites: ['s6', 'p1', 'p2'],
      notices: [
        { id: 'n1', date: '2026-11-03', text: 'Павел Нечаев принял обращение по дверям — ждёт удобную дату', read: false, href: '#/me/purchases?tab=leads' },
        { id: 'n2', date: '2026-11-01', text: 'Tandoor: заказ выдан. Баллы придут после подтверждения — до 15 ноября', read: false, href: '#/me/purchases' },
        { id: 'n3', date: '2026-10-30', text: 'Отзыв об Электромир отправлен на модерацию', read: true, href: '#/me/reviews' },
      ],
    };
  }

  // ---------- Состояние (сохраняем в браузере, чтобы вход переживал перезагрузку) ----------
  let me = null;
  try { me = JSON.parse(rcDemoMemory.getItem(KEY) || 'null'); } catch (e) { me = null; }
  const save = () => { try { rcDemoMemory.setItem(KEY, JSON.stringify(me)); } catch (e) { /* ignore */ } };
  const logged = () => !!me;
  const login = { step: 1, via: null, code: '' };
  const LOGIN_CARD_WAYS = [['tg', 'Telegram', 'Код придёт в @RemCardBot'], ['max', 'MAX', 'Без VPN · код в боте']];
  const LOGIN_VIA_META = {
    tg: { title: 'Telegram', subtitle: 'Код придёт в @RemCardBot' },
    max: { title: 'MAX', subtitle: 'Без VPN · код в боте' },
    ya: { title: 'Яндекс ID', subtitle: 'Войти одним нажатием' },
    vk: { title: 'VK ID', subtitle: 'Войти одним нажатием' },
  };
  const LOGIN_VIA_ACTIVE = new Set(['tg', 'max']);
  function normalizeLoginVia() {
    if (login.step === 2 && (!login.via || !LOGIN_VIA_ACTIVE.has(login.via))) {
      login.step = 1;
      login.via = null;
      login.code = '';
    }
  }

  // ---------- Общие кусочки ----------
  const PST = { new: ['Новый', 'pill--blue'], accepted: ['Принят', 'pill--blue'], progress: ['В работе', 'pill--amber'], done: ['Выполнен', 'pill--green'], cancelled: ['Отменён', ''] };
  const LST = { new: ['Отправлено', 'pill--blue'], accepted: ['Принято', 'pill--green'], progress: ['В работе', 'pill--amber'], thinking: ['На размышлении', ''], done: ['Выполнено', 'pill--green'], declined: ['Отказ', 'pill--red'] };
  const RST = { moderation: ['На модерации', 'pill--amber'], published: ['Опубликован', 'pill--green'], rejected: ['Отклонён', 'pill--red'] };
  const pill = ([t, c]) => `<span class="pill ${c}">${t}</span>`;
  const ava = (id) => { const i = pinfo(id); const p = partner(id); return i.photo ? `<img class="pav" src="${i.photo}" alt="">` : `<span class="avatar">${esc((p && p.name[0]) || '?')}</span>`; };
  const stars = (n, cls = '') => `<span class="stars ${cls}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'is-on' : ''}">${icon('star')}</i>`).join('')}</span>`;
  const pts = (n) => `${fmt(Math.abs(n))} ${plural(Math.abs(n), 'балл', 'балла', 'баллов')}`;
  const pending = () => me.purchases.filter((z) => z.bstatus === 'pending').reduce((s, z) => s + z.bonus, 0);
  const toReview = () => me.purchases.filter((z) => z.status === 'done' && !z.reviewed);
  const unread = () => me.notices.filter((n) => !n.read).length;
  const thumbs = (z) => z.kind === 'service' ? `<img src="${svc(z.svc).img}" alt="">` : z.items.slice(0, 3).map((it) => `<img src="${prod(it.p).imgs[0]}" alt="">`).join('');
  const ztitle = (z) => z.kind === 'service' ? z.title : z.items.map((it) => prod(it.p).name).join(', ');

  function headerButton(path) {
    if (!logged()) return `<a class="btn btn--ghost btn--sm hdr-me" href="#/login">${icon('user')} Войти</a>`;
    const n = unread();
    return `<a class="hdr-ava ${path.startsWith('/me') ? 'is-on' : ''}" href="#/me" aria-label="Личный кабинет"><span>${esc(me.user.avatar)}</span>${n ? `<b>${n}</b>` : ''}</a>`;
  }
  const mobileLink = () => logged() ? `<a href="#/me">${icon('user')} Личный кабинет</a>` : `<a href="#/login">${icon('user')} Войти</a>`;

  // ---------- Вход: одно действие на экране ----------
  function pageLogin() {
    normalizeLoginVia();
    let body = '';
    if (login.step === 1) body = `<h1>Войти в RemCard</h1><p class="lead">Аккаунт создаётся сам — пароль не нужен.</p>
      <div class="ways ways--login">${LOGIN_CARD_WAYS.map(([k, t, s]) => `<button class="way" data-via="${k}"><span class="way__ico way__ico--${k}">${icon(k === 'tg' ? 'send' : 'message-square')}</span><div><b>${t}</b><small>${s}</small></div>${icon('arrow-right')}</button>`).join('')}</div>
      <p class="xs" style="margin-top:1.25rem">Входя, вы соглашаетесь с <a class="link" href="#/me">условиями</a> и обработкой данных. Партнёрам — <a class="link" href="../partner/index.html">prof.remcard.ru</a>.</p>`;
    else if (login.step === 2) {
      const meta = LOGIN_VIA_META[login.via];
      if (!meta) { normalizeLoginVia(); return pageLogin(); }
      body = `<button class="link link--ink small" id="lg-back">${icon('arrow-left')} Другой способ</button>
      <h1 style="margin-top:1rem">Код из ${meta.title}</h1><p class="lead">Откройте ${meta.title}, дождитесь кода и введите его здесь.</p>
      <div class="otp" id="otp">${[0, 1, 2, 3, 4, 5].map((i) => `<input inputmode="numeric" maxlength="1" aria-label="Цифра ${i + 1}" value="${login.code[i] || ''}">`).join('')}</div>
      <p class="xs">В прототипе подойдёт любой код из 6 цифр.</p>
      <div class="row" style="margin-top:1.25rem;gap:1rem"><button class="btn btn--primary btn--lg" id="lg-ok">Войти ${icon('arrow-right')}</button><button class="link small" id="lg-copy">${icon('copy')} Ссылка на бота</button></div>`;
    }
    return `<section class="section"><div class="wrap"><div class="login card card--pad-lg">${body}</div></div></section>`;
  }
  function bindLogin() {
    if (login.step === 2 && (!login.via || !LOGIN_VIA_ACTIVE.has(login.via))) {
      normalizeLoginVia();
      renderApp();
      return;
    }
    qsa('[data-via]').forEach((b) => (b.onclick = () => { login.via = b.dataset.via; login.step = 2; login.code = ''; renderApp(); setTimeout(() => { const i = qs('#otp input'); i && i.focus(); }, 50); }));
    const back = qs('#lg-back'); if (back) back.onclick = () => { login.step = 1; renderApp(); };
    const inputs = qsa('#otp input');
    inputs.forEach((inp, i) => {
      inp.oninput = () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); login.code = inputs.map((x) => x.value).join(''); if (inp.value && inputs[i + 1]) inputs[i + 1].focus(); if (login.code.length === 6) finish(); };
      inp.onkeydown = (e) => { if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus(); };
      inp.onpaste = (e) => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!t) return; e.preventDefault(); t.split('').forEach((ch, k) => inputs[k] && (inputs[k].value = ch)); login.code = t; if (t.length === 6) finish(); };
    });
    const ok = qs('#lg-ok'); if (ok) ok.onclick = () => { if (login.code.length < 6) { toast('Введите 6 цифр'); return; } finish(); };
    const cp = qs('#lg-copy'); if (cp) cp.onclick = () => toast('Ссылка на бота скопирована');
    function finish() {
      me = demo(); if (Object.prototype.hasOwnProperty.call(me.user.links, login.via)) me.user.links[login.via] = true; save(); login.step = 1; login.code = '';
      toast(`Здравствуйте, ${me.user.name}`); const nxt = window.RC.state.ui.afterLogin; window.RC.state.ui.afterLogin = null; go(nxt || '#/me');
    }
  }

  // ---------- Каркас кабинета ----------
  const TABS = [['/me', 'Главная', 'home'], ['/me/purchases', 'Покупки', 'shopping-bag'], ['/me/card', 'Карта', 'credit-card'], ['/me/reviews', 'Отзывы', 'star'], ['/me/profile', 'Профиль', 'user']];
  function shell(path, title, body, aside) {
    const n = unread();
    const nav = TABS.map(([h, t, ic]) => `<a href="#${h}" class="${path === h || (h !== '/me' && path.startsWith(h)) ? 'is-on' : ''}">${icon(ic)}<span>${t}</span>${h === '/me/reviews' && toReview().length ? `<b>${toReview().length}</b>` : ''}</a>`).join('');
    return `<section class="section--tight"><div class="wrap me">
      <aside class="me__nav"><div class="me__who">${icon('user')}<div><b>${esc(me.user.name)} ${esc(me.user.surname)}</b><small>${esc(me.user.city)} · карта ${esc(me.user.card.slice(-4))}</small></div></div>
        <nav class="menav">${nav}</nav>
        <div class="menav menav--sub"><a href="#/navigator">${icon('route')}<span>Мой ремонт</span></a><a href="#/catalog/list">${icon('list-checks')}<span>Список покупок</span>${state.cart.length ? `<b>${state.cart.length}</b>` : ''}</a><a href="#/me/favorites">${icon('heart')}<span>Избранное</span></a><a href="#/me/notices">${icon('bell')}<span>Уведомления</span>${n ? `<b>${n}</b>` : ''}</a></div>
        <a class="menav__out" href="#/me/profile">${icon('settings')} Настройки</a></aside>
      <div class="me__main">
        <div class="me__head"><h1>${title}</h1><a class="iconb bellb" href="#/me/notices" aria-label="Уведомления">${icon('bell')}${n ? `<b>${n}</b>` : ''}</a></div>
        ${body}</div>
      ${aside ? `<aside class="me__side">${aside}</aside>` : ''}
      <nav class="metabs" aria-label="Кабинет">${nav}</nav>
    </div></section>`;
  }
  const guard = (fn) => (params) => logged() ? fn(params) : pageLogin();

  // ---------- Бонусная карта ----------
  function bonusCard(compact) {
    const u = me.user;
    return `<div class="bcard ${compact ? 'bcard--sm' : ''}">
      <div class="bcard__top"><span class="bcard__brand">remcard<i>.</i></span><span class="bcard__chip">${icon('qr-code')}</span></div>
      <div class="bcard__bal"><b>${fmt(me.balance)}</b><span>${plural(me.balance, 'балл', 'балла', 'баллов')} · ${money(me.balance)} у партнёров</span></div>
      <div class="bcard__bot"><span class="bcard__num">${esc(u.card)}</span><span>${esc(u.name)} ${esc(u.surname)}</span></div>
      <button class="bcard__show" data-act="show-card">${icon('qr-code')} Показать на кассе</button></div>`;
  }
  function qrSvg(seed, size = 160) {
    let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const n = 21, cells = []; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const inEye = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      if (inEye) { const ex = x > 13 ? x - 14 : x, ey = y > 13 ? y - 14 : y; const ring = ex === 0 || ey === 0 || ex === 6 || ey === 6; const core = ex > 1 && ex < 5 && ey > 1 && ey < 5; if (ring || core) cells.push([x, y]); }
      else if (rnd() > 0.52) cells.push([x, y]);
    }
    return `<svg class="qr" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-label="QR-код карты">${cells.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1"/>`).join('')}</svg>`;
  }
  function showCard() {
    modal(`<div class="modal__head"><h3>Карта RemCard</h3><button class="iconb" data-close aria-label="Закрыть">${icon('x')}</button></div>
      <div class="cardshow"><div class="cardshow__qr">${qrSvg(me.user.card, 200)}</div><b class="cardshow__num">${esc(me.user.card)}</b>
        <p class="small">Покажите на кассе партнёра: скидка по сертификату применится сама, баллы начислятся после подтверждения покупки.</p>
        <div class="row" style="justify-content:center;gap:.5rem;margin-top:.75rem"><button class="btn btn--ghost btn--sm" id="cs-copy">${icon('copy')} Скопировать номер</button><button class="btn btn--dark btn--sm" id="cs-pay">${icon('coins')} Оплатить баллами</button></div></div>`,
      { onOpen: (m) => { qs('#cs-copy', m).onclick = () => toast('Номер карты скопирован'); qs('#cs-pay', m).onclick = () => { closeModal(); payModal(); }; } });
  }
  function payModal() {
    modal(`<div class="modal__head"><h3>Оплатить баллами</h3><button class="iconb" data-close aria-label="Закрыть">${icon('x')}</button></div>
      <p class="small" style="margin-bottom:1rem">Доступно ${pts(me.balance)}. Кассир введёт сумму — вам останется подтвердить.</p>
      <label>Сколько списать</label><input type="number" id="pay-n" min="1" max="${me.balance}" value="${Math.min(500, me.balance)}">
      <div class="modal__foot"><button class="btn btn--ghost" data-close>Отмена</button><button class="btn btn--primary" id="pay-ok">Подтвердить</button></div>`,
      { onOpen: (m) => { qs('#pay-ok', m).onclick = () => { const n = Math.max(1, Math.min(me.balance, +qs('#pay-n', m).value || 0)); me.balance -= n; me.ledger.unshift({ id: 'h' + Date.now(), date: new Date().toISOString(), kind: 'spend', title: 'Оплата баллами у партнёра', amount: -n }); save(); closeModal(); toast(`Списали ${pts(n)}`); renderApp(); }; } });
  }

  // ---------- Главная кабинета ----------
  function pageMe() {
    const p = activeProject(); const nx = p && window.RCNav && window.RCNav.nextStep ? window.RCNav.nextStep(p) : null;
    const todo = [];
    toReview().slice(0, 2).forEach((z) => todo.push({ ic: 'star', t: `Оцените: ${partner(z.partner).name}`, s: '+10 баллов за отзыв', act: `data-review="${z.id}"` }));
    me.leads.filter((l) => l.status === 'accepted').forEach((l) => todo.push({ ic: 'message-circle', t: `${partner(l.partner).name} принял обращение`, s: 'Договоритесь о дате', href: '#/me/purchases?tab=leads' }));
    if (nx) todo.push({ ic: 'route', t: `Ремонт: ${nx.l1.title}`, s: nx.l2 ? `Сейчас — ${nx.l2.title}` : `Этап ${nx.k + 1} из ${nx.n}`, href: '#/navigator' });
    if (!nx) todo.push({ ic: 'route', t: 'Начните маршрут ремонта', s: 'Шаги, чек-листы и баллы за этапы', href: '#/navigator' });
    const recent = me.purchases.filter((z) => z.status !== 'cancelled').slice(0, 3);
    const refN = window.RCDemoMem ? window.RCDemoMem.get().refJoinedCount : 0;
    const body = `
      <div class="me-grid">
        ${bonusCard()}
        <div class="card me-sum"><div class="me-sum__row"><div><span class="eyebrow">Ожидают начисления</span><b>${fmt(pending())}</b><small>баллов · после подтверждения покупок</small></div><div><span class="eyebrow">Сэкономлено</span><b>${money(me.purchases.filter((z) => z.status !== 'cancelled').reduce((s, z) => s + Math.round(z.sum * z.disc / (100 - z.disc)), 0))}</b><small>скидки партнёров за всё время</small></div></div>
          <div class="row" style="gap:.5rem;margin-top:1rem"><a class="btn btn--ghost btn--sm" href="#/me/card">${icon('badge-percent')} Скидки ${me.certs.filter((c) => c.status === 'active').length}</a><a class="btn btn--ghost btn--sm" href="#/me/card?tab=history">${icon('coins')} История</a><a class="btn btn--ghost btn--sm" href="#/catalog">${icon('store')} В каталог</a></div></div>
      </div>
      <div class="retained-ref-block" id="retained-ref"><span id="retained-ref-count">По вашей ссылке зарегистрировались: <b>${fmt(refN)}</b> (демо)</span>
        <button type="button" class="btn btn--ghost btn--sm" id="retained-ref-copy" aria-label="Скопировать пригласительную ссылку">${icon('copy')} Ссылка</button></div>
      <h3 class="me-h">Что сделать</h3>
      <div class="todo">${todo.map((t) => `<a class="todo__i" ${t.href ? `href="${t.href}"` : `href="#/me/reviews" ${t.act}`}><span class="todo__ic">${icon(t.ic)}</span><div><b>${esc(t.t)}</b><small>${esc(t.s)}</small></div>${icon('chevron-right')}</a>`).join('')}</div>
      <div class="me-h row" style="justify-content:space-between"><h3>Последние покупки</h3><a class="link small" href="#/me/purchases">Все ${me.purchases.length} ${icon('arrow-right')}</a></div>
      <div class="plist">${recent.map(purchaseRow).join('')}</div>`;
    return shell('/me', `Здравствуйте, ${esc(me.user.name)}`, body);
  }

  // ---------- Покупки и обращения ----------
  function purchaseRow(z) {
    const p = partner(z.partner); const st = PST[z.status];
    const bonus = z.status === 'cancelled' ? '' : z.bstatus === 'done' ? `<span class="ok">+${fmt(z.bonus)}</span>` : `<span class="muted">+${fmt(z.bonus)} · до ${dateShort(z.bdue)}</span>`;
    return `<button class="prow" data-open="${z.id}"><div class="prow__th ${z.kind === 'service' ? 'prow__th--1' : ''}">${thumbs(z)}</div>
      <div class="prow__b"><div class="prow__t"><b>${esc(ztitle(z))}</b>${pill(st)}</div><small>${esc(p.name)} · ${dateRu(z.date)}${z.disc ? ` · скидка ${z.disc} %` : ''}</small>
        <div class="prow__f"><b>${money(z.sum)}</b>${bonus}${z.status === 'done' && !z.reviewed ? `<span class="pill pill--amber">${icon('star')} оценить</span>` : ''}</div></div>${icon('chevron-right')}</button>`;
  }
  function leadRow(l) {
    const p = partner(l.partner);
    const href = `#/me/enquiry/${l.id}`;
    return `<a class="prow prow--lead" href="${href}" data-lead="${l.id}"><div class="prow__th prow__th--1">${ava(p.id)}</div><div class="prow__b"><div class="prow__t"><b>${esc(l.what)}</b>${pill(LST[l.status])}</div><small>${esc(p.name)} · ${dateRu(l.date)}</small></div>${icon('chevron-right')}</a>`;
  }
  function pagePurchases({ tab = 'buy', f = 'all' }) {
    const list = f === 'all' ? me.purchases : f === 'goods' ? me.purchases.filter((z) => z.kind === 'goods') : f === 'service' ? me.purchases.filter((z) => z.kind === 'service') : me.purchases.filter((z) => z.status === 'progress' || z.status === 'accepted' || z.status === 'new');
    const total = me.purchases.filter((z) => z.status !== 'cancelled').reduce((s, z) => s + z.sum, 0);
    const body = `
      <div class="ptabs"><button class="${tab === 'buy' ? 'is-on' : ''}" data-href="#/me/purchases">Покупки · ${me.purchases.length}</button><button class="${tab === 'leads' ? 'is-on' : ''}" data-href="#/me/purchases?tab=leads">Обращения · ${me.leads.length}</button></div>
      ${tab === 'buy' ? `<div class="chips" style="margin-bottom:1rem">${[['all', 'Все'], ['progress', 'В работе'], ['goods', 'Товары'], ['service', 'Услуги']].map(([k, t]) => `<a class="chip ${f === k ? 'is-on' : ''}" href="#/me/purchases?f=${k}">${t}</a>`).join('')}</div>
        <div class="plist">${list.map(purchaseRow).join('') || '<div class="empty">Пока пусто</div>'}</div>
        <p class="xs" style="margin-top:1rem">Всего куплено у партнёров на ${money(total)}. Покупка попадает сюда автоматически, когда партнёр проводит её по вашей карте.</p>`
      : `<div class="plist">${me.leads.map(leadRow).join('')}</div><p class="xs" style="margin-top:1rem">Обращение — это ваш запрос мастеру или магазину из каталога. Когда партнёр проведёт покупку, она появится во вкладке «Покупки».</p>`}`;
    return shell('/me/purchases', 'Покупки', body);
  }
  function openPurchase(id) {
    const z = me.purchases.find((x) => x.id === id); if (!z) return;
    const p = partner(z.partner);
    const items = z.kind === 'service' ? `<a class="pitem" href="#/catalog/s/${z.svc}"><img src="${svc(z.svc).img}" alt=""><div><b>${esc(z.title)}</b><small>${esc(svc(z.svc).price)}</small></div></a>`
      : z.items.map((it) => { const pr = prod(it.p); return `<a class="pitem" href="#/catalog/p/${pr.id}"><img src="${pr.imgs[0]}" alt=""><div><b>${esc(pr.name)}</b><small>${esc(pr.variant || '')} · ${it.q} ${esc(pr.unit)}</small></div><span>${money(pr.price * it.q)}</span></a>`; }).join('');
    const saved = Math.round(z.sum * z.disc / (100 - z.disc));
    const bonusLine = z.status === 'cancelled' ? 'Покупка отменена — баллы не начисляются' : z.bstatus === 'done' ? `Начислено ${pts(z.bonus)}` : `${pts(z.bonus)} придут после подтверждения — до ${dateRu(z.bdue)}`;
    modal(`<div class="modal__head"><div><span class="xs muted">${dateRu(z.date)} · № ${z.id.toUpperCase()}-RC</span><h3>${esc(p.name)}</h3></div><button class="iconb" data-close aria-label="Закрыть">${icon('x')}</button></div>
      <div class="row" style="gap:.5rem;margin-bottom:1rem">${pill(PST[z.status])}${z.disc ? `<span class="pill pill--green">скидка ${z.disc} %</span>` : ''}</div>
      <div class="pitems">${items}</div>
      <div class="sums"><div><span>Сумма</span><b>${money(z.sum)}</b></div>${saved ? `<div><span>Сэкономлено</span><b>${money(saved)}</b></div>` : ''}<div><span>Баллы</span><b>${z.status === 'cancelled' ? '—' : '+' + fmt(z.bonus)}</b></div></div>
      <div class="notice ${z.bstatus === 'done' || z.status === 'cancelled' ? 'notice--grey' : 'notice--amber'}">${icon(z.bstatus === 'done' ? 'circle-check' : 'hourglass')}<span>${bonusLine}</span></div>
      <div class="modal__foot" style="flex-wrap:wrap">${z.status === 'done' && !z.reviewed ? `<button class="btn btn--primary" data-review="${z.id}">${icon('star')} Оценить</button>` : ''}${z.status === 'new' || z.status === 'accepted' ? `<button class="btn btn--ghost" id="z-cancel">Отменить</button>` : ''}<a class="btn btn--ghost" href="#/catalog/${p.id}" data-close>${icon('message-circle')} Написать партнёру</a>${z.kind === 'goods' ? `<button class="btn btn--ghost" id="z-again">${icon('repeat')} Повторить</button>` : ''}</div>`,
      { onOpen: (m) => {
        const r = qs('[data-review]', m); if (r) r.onclick = () => { closeModal(); reviewModal(z.id); };
        const a = qs('#z-again', m); if (a) a.onclick = () => { if (!window.RCCat || !window.RCCat.ensureCartWritable()) return; if (!window.RCCat.repeatOrderItems(z.items)) return; closeModal(); toast('Добавили в список покупок'); renderApp(); };
        const c = qs('#z-cancel', m); if (c) c.onclick = () => { z.status = 'cancelled'; z.bstatus = 'none'; save(); closeModal(); toast('Заказ отменён'); renderApp(); };
      } });
  }

  // ---------- Карта, баллы, сертификаты ----------
  function pageCard({ tab = 'history', add }) {
    if (add && window.RCCert && window.RCCert.CERTS[add]) {
      const src = window.RCCert.model(add);
      if (!me.certs.some((c) => c.code === add)) { me.certs.unshift({ id: 'c' + Date.now(), partner: src.partners[0].id, pct: src.discountPercent, cats: src.categories.slice(0, 2).join(', '), till: src.validUntil || '2027-12-31', status: 'active', code: add }); save(); toast('Сертификат сохранён в вашей карте'); }
      else toast('Этот сертификат уже в вашей карте');
      history.replaceState(null, '', '#/me/card?tab=certs');
    }
    const act = me.certs.filter((c) => c.status === 'active'), rest = me.certs.filter((c) => c.status !== 'active');
    const cert = (c) => { const p = partner(c.partner); return `<div class="cert ${c.status !== 'active' ? 'cert--off' : ''}"><div class="cert__pct">−${c.pct} %</div><div class="cert__b"><b>${esc(p.name)}</b><small>${esc(c.cats)} · ${c.status === 'active' ? 'до ' + dateRu(c.till) : c.status === 'used' ? 'использован' : 'истёк ' + dateRu(c.till)}</small></div>${c.code && window.RCCert && window.RCCert.CERTS[c.code] ? `<a class="btn btn--ghost btn--sm cert__page" href="#/cert/${c.code}" title="Страница сертификата">${icon('qr-code')}</a>` : ''}${c.status === 'active' ? `<a class="btn btn--ghost btn--sm" href="#/catalog/${p.id}">В магазин</a>` : ''}</div>`; };
    const earn = [['store', 'Покупка у партнёра', '1 % от суммы'], ['star', 'Отзыв о покупке', '+10'], ['flag', 'Этап ремонта в навигаторе', '+20'], ['trophy', 'Ремонт завершён', '+100'], ['users', 'Друг по вашей ссылке', '+50'], ['camera', 'Фото этапа', '+5']];
    const hist = `<div class="ledger">${me.ledger.map((h) => `<div class="ledger__i"><span class="ledger__ic ledger__ic--${h.kind}">${icon(h.kind === 'buy' ? 'shopping-bag' : h.kind === 'spend' ? 'coins' : 'sparkles')}</span><div><b>${esc(h.title)}</b><small>${dateRu(h.date)}</small></div><b class="${h.amount < 0 ? 'red' : 'ok'}">${h.amount < 0 ? '−' : '+'}${fmt(Math.abs(h.amount))}</b></div>`).join('')}</div>
      ${pending() ? `<div class="notice notice--amber" style="margin-top:1rem">${icon('hourglass')}<span>Ещё ${pts(pending())} ждут подтверждения покупок — обычно 7–14 дней, чтобы учесть возвраты.</span></div>` : ''}`;
    const certs = `<div class="row" style="justify-content:space-between;margin-bottom:.75rem"><p class="small">Скидки партнёров привязаны к вашей карте — на кассе ничего показывать отдельно не нужно.</p><button class="btn btn--ghost btn--sm" id="cert-add">${icon('plus')} Ввести код</button></div>
      <div class="stack" style="gap:.5rem">${act.map(cert).join('') || '<div class="empty">Активных скидок нет</div>'}</div>
      ${rest.length ? `<details class="fg" style="margin-top:1rem"><summary class="fg__h">Использованные и истёкшие · ${rest.length}</summary><div class="stack" style="gap:.5rem;margin-top:.5rem">${rest.map(cert).join('')}</div></details>` : ''}`;
    const how = `<div class="earn">${earn.map(([ic, t, v]) => `<div class="earn__i"><span>${icon(ic)}</span><b>${t}</b><em>${v}</em></div>`).join('')}</div>
      <div class="notice notice--green" style="margin-top:1rem">${icon('coins')}<span>1 балл = 1 ₽ при оплате у любого партнёра RemCard. Баллы не сгорают, пока вы заходите хотя бы раз в год.</span></div>
      <div class="card card--soft" style="margin-top:1rem"><b>Пригласите друга — +50 баллов</b><p class="small" style="margin:.3rem 0 .75rem">Другу — приветственные баллы и ваши скидки.</p><div class="row" style="gap:.5rem"><input readonly value="remcard.ru/i/anna-0417" style="max-width:260px"><button class="btn btn--dark btn--sm" id="ref-copy">${icon('copy')} Скопировать</button></div></div>`;
    const body = `${bonusCard()}
      <div class="ptabs" style="margin-top:1.25rem"><button class="${tab === 'history' ? 'is-on' : ''}" data-href="#/me/card?tab=history">История</button><button class="${tab === 'certs' ? 'is-on' : ''}" data-href="#/me/card?tab=certs">Скидки · ${act.length}</button><button class="${tab === 'how' ? 'is-on' : ''}" data-href="#/me/card?tab=how">Как копить</button></div>
      ${tab === 'history' ? hist : tab === 'certs' ? certs : how}`;
    return shell('/me/card', 'Карта и баллы', body);
  }
  function addCert() {
    modal(`<div class="modal__head"><h3>Код сертификата</h3><button class="iconb" data-close aria-label="Закрыть">${icon('x')}</button></div>
      <p class="small" style="margin-bottom:1rem">Код даёт партнёр или агент RemCard. Скидка привяжется к карте.</p><input id="cert-code" placeholder="RC-XX-0000" autocomplete="off">
      <div class="modal__foot"><button class="btn btn--ghost" data-close>Отмена</button><button class="btn btn--primary" id="cert-ok">Добавить</button></div>`,
      { onOpen: (m) => { const i = qs('#cert-code', m); i.focus(); qs('#cert-ok', m).onclick = () => { if (i.value.trim().length < 4) { toast('Введите код'); return; } me.certs.unshift({ id: 'c' + Date.now(), partner: 's3', pct: 5, cats: 'Электрика и свет', till: '2027-01-31', status: 'active', code: i.value.trim().toUpperCase() }); save(); closeModal(); toast('Скидка 5 % в Электромир добавлена'); go('#/me/card?tab=certs'); }; } });
  }

  // ---------- Отзывы и рейтинги ----------
  function pageReviews() {
    const wait = toReview();
    const body = `${wait.length ? `<h3 class="me-h" style="margin-top:0">Ждут вашей оценки · ${wait.length}</h3><div class="plist">${wait.map((z) => `<div class="prow prow--rv"><div class="prow__th prow__th--1">${ava(z.partner)}</div><div class="prow__b"><b>${esc(partner(z.partner).name)}</b><small>${esc(ztitle(z))} · ${dateRu(z.date)}</small><div class="row" style="gap:.4rem;margin-top:.5rem">${stars(0, 'stars--pick')}<span class="xs muted">+10 баллов</span></div></div><button class="btn btn--primary btn--sm" data-review="${z.id}">Оценить</button></div>`).join('')}</div>` : `<div class="notice notice--green">${icon('circle-check')}<span>Все покупки оценены — спасибо. Отзывы помогают другим клиентам и поднимают рейтинг честных партнёров.</span></div>`}
      <h3 class="me-h">Мои отзывы · ${me.reviews.length}</h3>
      <div class="stack" style="gap:.6rem">${me.reviews.map((r) => { const p = partner(r.partner); return `<div class="card rv"><div class="rv__h">${ava(p.id)}<div><a class="rv__p" href="#/catalog/${p.id}">${esc(p.name)}</a><small>${dateRu(r.date)} · рейтинг партнёра ${p.rating}</small></div>${pill(RST[r.status])}</div>${stars(r.stars)}<p>${esc(r.text)}</p>${r.status === 'moderation' ? '<small class="xs muted">Проверим за 1–2 дня. Баллы уже начислены.</small>' : ''}</div>`; }).join('')}</div>
      <div class="card card--soft" style="margin-top:1.25rem"><b>Как считается рейтинг партнёра</b><p class="small" style="margin-top:.3rem">Только отзывы клиентов с подтверждённой покупкой по карте RemCard. Партнёр не может удалить отзыв — только ответить на него.</p></div>`;
    return shell('/me/reviews', 'Отзывы', body);
  }
  function reviewModal(zid) {
    const z = me.purchases.find((x) => x.id === zid); if (!z) return; const p = partner(z.partner); let n = 0;
    modal(`<div class="modal__head"><div><span class="xs muted">${esc(ztitle(z))}</span><h3>${esc(p.name)}</h3></div><button class="iconb" data-close aria-label="Закрыть">${icon('x')}</button></div>
      <div class="rvpick" id="rvpick">${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-n="${i}" aria-label="${i}">${icon('star')}</button>`).join('')}</div><p class="small" id="rv-hint" style="text-align:center;margin:.3rem 0 1rem">Нажмите на звезду</p>
      <div class="chips chips--center" id="rv-tags">${['По срокам', 'Аккуратно', 'Помогли выбрать', 'Честная цена', 'Задержали', 'Есть замечания'].map((t) => `<button class="chip" type="button">${t}</button>`).join('')}</div>
      <textarea id="rv-text" placeholder="Пара слов для других клиентов (необязательно)" style="margin-top:.75rem"></textarea>
      <div class="modal__foot"><button class="btn btn--ghost" data-close>Позже</button><button class="btn btn--primary" id="rv-ok">Отправить · +10 баллов</button></div>`,
      { onOpen: (m) => {
        const hints = ['', 'Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично'];
        qsa('#rvpick button', m).forEach((b) => (b.onclick = () => { n = +b.dataset.n; qsa('#rvpick button', m).forEach((x) => x.classList.toggle('is-on', +x.dataset.n <= n)); qs('#rv-hint', m).textContent = hints[n]; }));
        qsa('#rv-tags .chip', m).forEach((c) => (c.onclick = () => c.classList.toggle('is-on')));
        qs('#rv-ok', m).onclick = () => {
          if (!n) { toast('Поставьте оценку'); return; }
          const tags = qsa('#rv-tags .chip.is-on', m).map((c) => c.textContent).join(', ');
          const text = (qs('#rv-text', m).value.trim() || tags || 'Без комментария');
          me.reviews.unshift({ id: 'r' + Date.now(), date: new Date().toISOString(), partner: p.id, ref: z.id, stars: n, text, status: 'moderation' });
          z.reviewed = true; me.balance += 10; me.ledger.unshift({ id: 'h' + Date.now(), date: new Date().toISOString(), kind: 'action', title: `Отзыв: ${p.name}`, amount: 10 }); save();
          closeModal(); toast('Спасибо. +10 баллов'); renderApp();
        };
      } });
  }

  // ---------- Избранное, уведомления ----------
  function pageFavorites() {
    const body = `<p class="small" style="margin-bottom:1rem">Мастера и магазины, которых вы сохранили в каталоге.</p>
      <div class="mgrid mgrid--favorites">${me.favorites.map((id) => { const p = partner(id); return p.kind === 'store' ? window.RCCat.storeCard(p) : window.RCCat.masterCard(p); }).join('') || '<div class="empty">Пока пусто</div>'}</div>
      <p class="xs" style="margin-top:1rem">Товары и услуги для покупки — в <a class="link" href="#/catalog/list">списке покупок</a>.</p>`;
    return shell('/me/favorites', 'Избранное', body);
  }
  function pageNotices() {
    const body = `<div class="stack" style="gap:.5rem">${me.notices.map((n) => `<a class="ntc ${n.read ? '' : 'is-new'}" href="${n.href}" data-read="${n.id}"><i></i><div><b>${esc(n.text)}</b><small>${dateRu(n.date)}</small></div>${icon('chevron-right')}</a>`).join('')}</div>
      <div class="row" style="justify-content:space-between;margin-top:1rem"><button class="link small" id="n-all">Отметить всё прочитанным</button><a class="link small muted" href="#/me/profile">Куда присылать ${icon('arrow-right')}</a></div>`;
    return shell('/me/notices', 'Уведомления', body);
  }

  // ---------- Профиль ----------
  function pageProfile() {
    const u = me.user;
    const avUrl = window.RCDemoMem && window.RCDemoMem.getAvatar();
    const avPick = avUrl
      ? `<img src="${avUrl}" alt="" width="64" height="64" style="object-fit:cover;border-radius:16px" id="profile-avatar-img">`
      : `<span class="avatar" id="profile-avatar-initials" style="width:64px;height:64px;font-size:1.3rem;display:inline-flex;align-items:center;justify-content:center;border-radius:16px">${esc(u.avatar)}</span>`;
    const sw = (on, key, group) => `<button class="sw ${on ? 'is-on' : ''}" role="switch" aria-checked="${on}" data-sw="${group}.${key}"><i></i></button>`;
    const linkRow = (k, t, s) => `<div class="prow prow--set"><span class="way__ico way__ico--${k}">${k === 'ya' ? 'Я' : k === 'vk' ? 'VK' : icon(k === 'tg' ? 'send' : 'message-square')}</span><div class="prow__b"><b>${t}</b><small>${u.links[k] ? 'Привязан' : s}</small></div>${u.links[k] ? `<span class="pill pill--green">${icon('check')} есть</span>` : `<button class="btn btn--ghost btn--sm" data-link="${k}">Привязать</button>`}</div>`;
    const body = `
      <div class="card profile-card"><div class="row profile-head-row" style="gap:1rem;align-items:flex-start">
        <div class="profile-photo-col">
          <button type="button" class="retained-avatar-btn" id="retained-avatar-pick" aria-label="Фото профиля, необязательно">${avPick}</button>
          <input type="file" id="retained-avatar-file" accept="image/jpeg,image/png,image/webp" hidden>
          <button type="button" class="btn btn--ghost btn--sm" id="retained-avatar-reset">Сбросить к инициалам</button>
        </div>
        <div class="grow profile-fields-grow"><div class="grid2 profile-name-city"><div><label for="pf-name">Имя</label><input id="pf-name" value="${esc(u.name)}"></div><div><label for="pf-city">Город</label><select id="pf-city">${['Краснодар', 'Новороссийск', 'Анапа', 'Сочи', 'Ростов-на-Дону', 'Другой…'].map((c) => `<option ${c === u.city ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div></div></div>
        <div class="row" style="justify-content:space-between;margin-top:1rem"><small class="xs muted">Телефон ${esc(u.phone)} · карта ${esc(u.card)} · с нами с ${dateRu(u.since)}</small><button class="btn btn--dark btn--sm" id="pf-save">Сохранить</button></div></div>
      <h3 class="me-h">Способы входа</h3>
      <div class="plist">${linkRow('tg', 'Telegram', 'Код в @RemCardBot')}${linkRow('max', 'MAX', 'Без VPN')}${linkRow('ya', 'Яндекс ID', 'Вход одним нажатием')}${linkRow('vk', 'VK ID', 'Вход одним нажатием')}</div>
      <h3 class="me-h">Уведомления</h3>
      <div class="card" style="padding:.25rem 1rem">${[['tg', 'Telegram / MAX', 'Статусы покупок, начисления, ответы партнёров'], ['email', 'Почта', 'Чеки и сертификаты'], ['sms', 'СМС', 'Только коды подтверждения']].map(([k, t, s]) => `<div class="setrow"><div><b>${t}</b><small>${s}</small></div>${sw(u.notify[k], k, 'notify')}</div>`).join('')}</div>
      <h3 class="me-h">Данные и безопасность</h3>
      <div class="card" style="padding:.25rem 1rem">
        <a class="setrow" href="#/me/privacy"><div><b>Мои данные и согласия</b><small>Что храним и зачем · выгрузка</small></div>${icon('chevron-right')}</a>
        <a class="setrow" href="#/install"><div><b>Установить RemCard</b><small>Ярлык на экран — когда сайт открыт вне песочницы</small></div>${icon('chevron-right')}</a>
        <button class="setrow" id="pf-sessions"><div><b>Выйти на других устройствах</b><small>Активных сессий: 2</small></div>${icon('chevron-right')}</button>
        <button class="setrow" id="pf-out"><div><b>Выйти</b><small>На этом устройстве</small></div>${icon('log-out')}</button>
        <button class="setrow setrow--danger" id="pf-del"><div><b>Удалить аккаунт</b><small>Баллы и история будут потеряны</small></div>${icon('trash-2')}</button></div>
      <div class="card card--dark" style="margin-top:1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap"><div><b style="color:#fff">Вы мастер, магазин или агент?</b><p class="small">Разместите товары и услуги — они появятся в каталоге.</p></div><a class="btn btn--light btn--sm" href="../partner/index.html">Стать партнёром ${icon('arrow-right')}</a></div>`;
    return shell('/me/profile', 'Профиль', body);
  }

  // ---------- Привязка событий ----------
  function bind(path) {
    if (path === '/login' || (path.startsWith('/me') && !logged())) { bindLogin(); return; }
    if (!path.startsWith('/me')) return;
    qsa('[data-act="show-card"]').forEach((b) => (b.onclick = showCard));
    qsa('[data-open]').forEach((b) => (b.onclick = () => openPurchase(b.dataset.open)));
    qsa('[data-review]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); reviewModal(b.dataset.review); }));
    qsa('[data-href]').forEach((b) => (b.onclick = () => go(b.dataset.href)));
    const ca = qs('#cert-add'); if (ca) ca.onclick = addCert;
    qsa('a.prow--lead').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('#')) { e.preventDefault(); go(href); }
      });
    });
    const rc = qs('#ref-copy');
    if (rc) {
      rc.onclick = () => {
        const inp = rc.closest('.row')?.querySelector('input') || qs('#ref-copy')?.previousElementSibling;
        const raw = (inp && inp.value) || 'remcard.ru/i/demo-ref';
        const link = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
        if (window.RCRetained && window.RCRetained.copyWithFallback) window.RCRetained.copyWithFallback('Ссылка', link, rc);
        else toast('Скопируйте ссылку вручную из поля');
      };
    }
    qsa('[data-read]').forEach((a) => a.addEventListener('click', () => { const n = me.notices.find((x) => x.id === a.dataset.read); if (n) { n.read = true; save(); } }));
    const na = qs('#n-all'); if (na) na.onclick = () => { me.notices.forEach((n) => (n.read = true)); save(); renderApp(); };
    const ps = qs('#pf-save'); if (ps) ps.onclick = () => { const v = qs('#pf-name').value.trim(); if (v.length < 2) { toast('Имя — от 2 символов'); return; } me.user.name = v; me.user.avatar = (v[0] + (me.user.surname[0] || '')).toUpperCase(); me.user.city = qs('#pf-city').value; save(); toast('Сохранено'); renderApp(); };
    qsa('[data-sw]').forEach((b) => (b.onclick = () => { const [g, k] = b.dataset.sw.split('.'); me.user[g][k] = !me.user[g][k]; save(); b.classList.toggle('is-on', me.user[g][k]); b.setAttribute('aria-checked', me.user[g][k]); }));
    qsa('[data-link]').forEach((b) => (b.onclick = () => { me.user.links[b.dataset.link] = true; save(); toast('Привязано'); renderApp(); }));
    const ss = qs('#pf-sessions'); if (ss) ss.onclick = () => toast('Другие устройства разлогинены');
    const out = qs('#pf-out'); if (out) out.onclick = () => { me = null; try { rcDemoMemory.removeItem(KEY); } catch (e) {} if (window.RCRetained?.invalidateAvatarPending) window.RCRetained.invalidateAvatarPending(); toast('Вы вышли'); go('#/'); };
    const del = qs('#pf-del'); if (del) del.onclick = () => modal(`<div class="modal__head"><h3>Удалить аккаунт?</h3><button class="iconb" data-close aria-label="Закрыть">${icon('x')}</button></div><p class="small">Баллы (${pts(me.balance)}), скидки, история покупок и отзывы будут удалены без возможности восстановить.</p><div class="modal__foot"><button class="btn btn--ghost" data-close>Оставить</button><button class="btn btn--primary" id="del-ok">Удалить</button></div>`,
      { onOpen: (m) => { qs('#del-ok', m).onclick = () => { me = null; try { rcDemoMemory.removeItem(KEY); } catch (e) {} closeModal(); toast('Аккаунт удалён'); go('#/'); }; } });
  }

  route('/login', () => logged() ? pageMe() : pageLogin());
  route('/me', guard(pageMe));
  route('/me/purchases', guard(pagePurchases));
  route('/me/card', guard(pageCard));
  route('/me/reviews', guard(pageReviews));
  route('/me/favorites', guard(pageFavorites));
  route('/me/notices', guard(pageNotices));
  route('/me/profile', guard(pageProfile));
  function privacyPage(body) { return shell('/me/privacy', 'Мои данные и согласия', body); }
  function threadShell(title, body, partnerId) {
    const tail = partnerId ? `<a class="btn btn--ghost btn--sm" href="#/catalog/${partnerId}" style="margin-top:1rem">${icon('store')} Карточка партнёра</a>` : '';
    return shell('/me/purchases', title, body + tail);
  }
  const leadById = (id) => (me && me.leads.find((l) => l.id === id)) || null;
  const leadAt = (i) => (me && me.leads[i]) || null;

  document.addEventListener('rc:rendered', (e) => { document.body.classList.toggle('in-me', e.detail.path.startsWith('/me') && logged()); bind(e.detail.path); });
  window.RCMe = { headerButton, mobileLink, logged: () => logged(), me: () => me, privacyPage, threadShell, leadById, leadAt };
})();

