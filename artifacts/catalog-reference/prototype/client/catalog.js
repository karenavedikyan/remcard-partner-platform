/* RemCard — каталог как маркетплейс: товары, услуги, мастера, компании и магазины.
   Поиск с подсказками, разделы, фильтры по схеме категории (как «Фильтр» на tandoor.ru),
   срезы «по помещению / по стилю / по этапу / по району», карта партнёров, страница партнёра. */
(function () {
  const { D, esc, fmt, plural, qs, qsa, go, icon, state, activeProject, modal, closeModal, toast, route, renderApp } = window.RC;
  const C = window.RCCatalogData;
  const rub = (n) => `${fmt(n)} ₽`;
  const prod = (id) => C.products.find((p) => p.id === id);
  const svc = (id) => C.services.find((s) => s.id === id);
  const seller = (id) => D.partners.find((p) => p.id === id);
  const info = (id) => C.partnerInfo[id] || {};
  const catOf = (id) => C.categories.find((c) => c.id === id);
  const stageOf = (id) => C.stages.find((s) => s.id === id);
  const stageByL1 = (l1) => C.stages.find((s) => s.l1.includes(l1));
  const prodStage = (p) => catOf(p.cat).stage;
  const prodTitle = (p) => `${p.name}${p.variant ? ' · ' + p.variant : ''}`;
  const distOf = (id) => C.districts.find((d) => d.id === id);
  const roomOf = (id) => C.rooms.find((r) => r.id === id);
  const styleOf = (id) => C.styles.find((s) => s.id === id);
  const gammaOf = (id) => C.gammas.find((g) => g.id === id);
  const masters = () => D.partners.filter((p) => p.kind !== 'store');
  const stores = () => D.partners.filter((p) => p.kind === 'store');
  const partnerTags = (p) => p.tags.map((t) => (p.kind === 'store' ? D.storeCategories[t] : D.specializations[t]) || t);
  const partnerGoods = (id) => C.products.filter((p) => p.seller === id);
  const partnerSvcs = (id) => C.services.filter((s) => s.seller === id);
  // «Открыто сейчас» по строке часов работы вида «пн–сб 9:00–19:00»
  function openNow(hours) {
    if (!hours) return null;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const wd = (now.getDay() + 6) % 7; const names = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
    const parts = hours.split(',').map((x) => x.trim());
    for (const part of parts) {
      const m = part.match(/^(ежедневно|([а-я]{2})(?:–([а-я]{2}))?)\s+(\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})$/);
      if (!m) continue;
      let ok = m[1] === 'ежедневно';
      if (!ok) { const a = names.indexOf(m[2]), b = m[3] ? names.indexOf(m[3]) : a; ok = wd >= a && wd <= b; }
      if (!ok) continue;
      const t = now.getHours() * 60 + now.getMinutes();
      return t >= +m[4] * 60 + +m[5] && t < +m[6] * 60 + +m[7];
    }
    return false;
  }

  // ---------- Список покупок (browser / session / read-only) ----------
  const CART_LS = 'rc_browser_cart_v1';
  const CART_VER = 1;
  const CART_MAX_QTY = 9999;
  const prodOrNull = (id) => C.products.find((p) => p.id === id) || null;
  const svcOrNull = (id) => C.services.find((s) => s.id === id) || null;
  let cartStorageMode = 'persistent';
  let cartReadonly = false;
  let cartRawPreserved = null;
  let sessionCartBuf = null;

  function sanitizeCartQty(q) {
    let x = q;
    if (x === null || x === undefined) return 1;
    if (typeof x === 'string') {
      const t = x.trim();
      if (!/^\d+$/.test(t)) return 1;
      x = parseInt(t, 10);
    } else if (typeof x !== 'number') return 1;
    if (!Number.isFinite(x) || Number.isNaN(x)) {
      return x === Infinity || x > CART_MAX_QTY ? CART_MAX_QTY : 1;
    }
    if (x < 1) return 1;
    if (x > CART_MAX_QTY) return CART_MAX_QTY;
    return Math.floor(x);
  }

  function sanitizeCartId(raw) {
    let s = raw;
    if (typeof s === 'number' && Number.isFinite(s)) s = String(Math.floor(s));
    if (typeof s !== 'string') return null;
    s = s.trim();
    if (!s || s.length > 80) return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null;
    return s;
  }

  function escAttr(v) {
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function coerceCartLine(c) {
    if (!c || (c.type !== 'p' && c.type !== 's')) return null;
    const id = sanitizeCartId(c.id);
    if (!id) return null;
    return { type: c.type, id, qty: sanitizeCartQty(c.qty) };
  }

  function sanitizeCartState(lines) {
    return dedupeCartLines((lines || []).map(coerceCartLine).filter(Boolean));
  }

  function cartQtyText(q) {
    return String(sanitizeCartQty(q));
  }

  function dedupeCartLines(lines) {
    const seen = new Set();
    const out = [];
    lines.forEach((c) => {
      const key = `${c.type}:${c.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ type: c.type, id: c.id, qty: sanitizeCartQty(c.qty) });
    });
    return out;
  }

  function normalizeCartLines(raw) {
    if (!Array.isArray(raw)) return [];
    return sanitizeCartState(raw);
  }

  function detectStorageBackend() {
    if (typeof window.rcDemoMemory === 'object' && window.rcDemoMemory !== null) return 'preview-memory';
    try {
      const probe = '__rc_cart_probe__';
      rcDemoMemory.setItem(probe, '1');
      const ok = rcDemoMemory.getItem(probe) === '1';
      rcDemoMemory.removeItem(probe);
      return ok ? 'persistent' : 'preview-memory';
    } catch (e) {
      return 'denied';
    }
  }

  function strictParseLines(arr) {
    if (!Array.isArray(arr)) return { ok: false };
    const out = [];
    for (const row of arr) {
      if (!row || typeof row !== 'object') return { ok: false };
      if (row.type !== 'p' && row.type !== 's') return { ok: false };
      const id = sanitizeCartId(row.id);
      if (!id) return { ok: false };
      out.push({ type: row.type, id, qty: sanitizeCartQty(row.qty) });
    }
    return { ok: true, lines: dedupeCartLines(out) };
  }

  function parseStoredCart(text) {
    if (text == null || text === '') return { lines: [], writable: true };
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { lines: [], writable: false, preserved: text };
    }
    if (Array.isArray(parsed)) {
      const strict = strictParseLines(parsed);
      if (!strict.ok) return { lines: [], writable: false, preserved: text };
      return { lines: strict.lines, writable: true, legacy: true };
    }
    if (!parsed || typeof parsed !== 'object' || parsed === null) return { lines: [], writable: false, preserved: text };
    if (parsed.v !== CART_VER || !Array.isArray(parsed.lines)) return { lines: [], writable: false, preserved: text };
    const strict = strictParseLines(parsed.lines);
    if (!strict.ok) return { lines: [], writable: false, preserved: text };
    return { lines: strict.lines, writable: true };
  }

  function loadCartFromStorage() {
    cartReadonly = false;
    cartRawPreserved = null;
    const backend = detectStorageBackend();
    let text = null;
    try {
      text = rcDemoMemory.getItem(CART_LS);
    } catch (e) { /* ignore */ }
    const parsed = parseStoredCart(text);
    if (!parsed.writable) {
      cartReadonly = true;
      cartRawPreserved = parsed.preserved;
      state.cart = [];
      cartStorageMode = 'readonly';
      return;
    }
    state.cart = sanitizeCartState(parsed.lines);
    if (isRcDemoMemoryHost() || backend === 'preview-memory') cartStorageMode = 'preview-memory';
    else if (backend === 'denied') {
      cartStorageMode = 'session';
      sessionCartBuf = state.cart.slice();
    } else cartStorageMode = 'persistent';
  }

  function isRcDemoMemoryHost() {
    return typeof window.rcDemoMemory === 'object' && window.rcDemoMemory !== null;
  }

  function ensureCartWritable() {
    if (cartReadonly) {
      toast('Список только для чтения');
      return false;
    }
    return true;
  }

  function cartStorageNotice() {
    if (cartReadonly) return 'Данные списка в браузере не читаются — исходный блок сохранён, правки заблокированы.';
    if (isRcDemoMemoryHost() || cartStorageMode === 'preview-memory') {
      return 'Режим предпросмотра: список хранится в памяти вкладки (rcDemoMemory); после перезагрузки страницы пропадёт.';
    }
    if (cartStorageMode === 'session') return 'Память браузера недоступна — список только в памяти вкладки; после перезагрузки страницы пропадёт.';
    return 'Только в этом браузере. Синхронизация с аккаунтом не выполняется.';
  }

  function addLinesFromMatcalc(prodId, qty, svcId, addSvc) {
    if (!ensureCartWritable()) return false;
    if (prodId) {
      const sid = sanitizeCartId(prodId);
      if (sid) {
        const ex = state.cart.find((x) => x.type === 'p' && x.id === sid);
        const q = sanitizeCartQty(qty);
        if (ex) ex.qty = q;
        else state.cart.push({ type: 'p', id: sid, qty: q });
      }
    }
    if (addSvc && svcId) {
      const sid = sanitizeCartId(svcId);
      if (sid && !state.cart.some((x) => x.type === 's' && x.id === sid)) state.cart.push({ type: 's', id: sid, qty: 1 });
    }
    state.cart = sanitizeCartState(state.cart);
    return persistCart();
  }

  function repeatOrderItems(items) {
    if (!ensureCartWritable()) return false;
    (items || []).forEach((it) => {
      const id = sanitizeCartId(it && it.p);
      if (!id) return;
      const q = sanitizeCartQty(it.q);
      if (state.cart.some((c) => c.type === 'p' && c.id === id)) return;
      state.cart.push({ type: 'p', id, qty: q });
    });
    state.cart = sanitizeCartState(state.cart);
    return persistCart();
  }

  function addKitToCart(productIds, serviceIds) {
    if (!ensureCartWritable()) return false;
    (productIds || []).forEach((id) => {
      const sid = sanitizeCartId(id);
      if (sid && !inCart('p', sid)) state.cart.push({ type: 'p', id: sid, qty: 1 });
    });
    (serviceIds || []).forEach((id) => {
      const sid = sanitizeCartId(id);
      if (sid && !inCart('s', sid)) state.cart.push({ type: 's', id: sid, qty: 1 });
    });
    state.cart = sanitizeCartState(state.cart);
    return persistCart();
  }

  function persistCart() {
    if (cartReadonly) return false;
    state.cart = sanitizeCartState(state.cart);
    const payload = JSON.stringify({ v: CART_VER, lines: state.cart });
    if (cartStorageMode === 'session') {
      sessionCartBuf = state.cart.slice();
      return true;
    }
    try {
      rcDemoMemory.setItem(CART_LS, payload);
      return true;
    } catch (e) {
      cartStorageMode = 'session';
      sessionCartBuf = state.cart.slice();
      return false;
    }
  }

  loadCartFromStorage();

  const inCart = (type, id) => state.cart.some((c) => c.type === type && c.id === id);
  function toggleCart(type, id) {
    if (!ensureCartWritable()) return;
    const sid = sanitizeCartId(id);
    if (!sid) return;
    const i = state.cart.findIndex((c) => c.type === type && c.id === sid);
    if (i >= 0) { state.cart.splice(i, 1); toast('Убрали из списка'); }
    else {
      state.cart.push({ type, id: sid, qty: 1 });
      let st = null;
      if (type === 'p') { const p = prodOrNull(id); if (p) st = stageOf(prodStage(p)); }
      else { const s = svcOrNull(id); if (s) st = stageOf(s.stage); }
      if (st) {
        const pr = stageProgress(st);
        toast(pr.done === pr.total ? `Этап «${st.title}» собран полностью` : `В списке · ${st.title}: ${pr.done} из ${pr.total}`);
      } else toast('В списке');
    }
    persistCart();
    renderApp();
  }
  const needDone = ([kind, id]) => (kind === 'cat'
    ? state.cart.some((c) => { if (c.type !== 'p') return false; const p = prodOrNull(c.id); return p && p.cat === id; })
    : state.cart.some((c) => c.type === 's' && c.id === id));
  const stageProgress = (st) => ({ done: st.need.filter(needDone).length, total: st.need.length });
  const needLabel = ([kind, id]) => kind === 'cat' ? catOf(id).title : svc(id).title;
  const needHref = ([kind, id], stage) =>
    kind === 'cat'
      ? catalogHref(`/catalog?${stage ? `stage=${stage}&` : ''}sec=goods&cat=${id}`)
      : catalogHref(`/catalog/s/${id}`);
  /* У моделей производителя несколько продавцов (catalog-offers.js): цена и продавец — те, что выбрал клиент. */
  const offPrice = (p) => (window.RCOffers ? window.RCOffers.priceOf(p) : p.price);
  const offSeller = (p) => (window.RCOffers && window.RCOffers.sellerOf(p)) || seller(p.seller);
  const offPlace = (p) => (window.RCOffers ? window.RCOffers.placeOf(p) : '');
  const cartTotal = () => state.cart.reduce((s, c) => {
    if (c.type !== 'p') return s;
    const p = prodOrNull(c.id);
    return p ? s + offPrice(p) * sanitizeCartQty(c.qty) : s;
  }, 0);
  const cartItemStage = (c) => {
    if (c.type === 'p') { const p = prodOrNull(c.id); return p ? prodStage(p) : null; }
    const s = svcOrNull(c.id);
    return s ? s.stage : null;
  };
  function currentStage() {
    const p = activeProject(); if (!p || !window.RCNav || !window.RCNav.nextStep) return null;
    const nx = window.RCNav.nextStep(p); return nx ? stageByL1(nx.l1.id) : null;
  }

  // ---------- Карточки ----------
  const addBtn = (type, id, cls = '') => `<button type="button" class="addb ${cls} ${inCart(type, id) ? 'is-on' : ''}" data-cart="${type}:${id}" aria-label="${inCart(type, id) ? 'Убрать из списка' : 'В список'}">${icon(inCart(type, id) ? 'check' : 'plus')}</button>`;
  const tagPill = (tags) => tags && tags.length ? `<span class="good__tag good__tag--${tags[0]}">${C.tagLabel[tags[0]]}</span>` : '';
  const avail = (p) => `<span class="avail avail--${p.avail}">${C.availLabel[p.avail]}</span>`;
  const stars = (r) => `<span class="rate">${icon('star')} ${Number(r).toFixed(1)}</span>`;
  function productCard(p) {
    const s = seller(p.seller);
    const sw = p.colors && p.colors.length > 1 ? `<span class="good__sw">${p.colors.slice(0, 4).map((c) => `<i title="${esc(c)}" style="background:${swatch(c)}"></i>`).join('')}${p.colors.length > 4 ? `<em>+${p.colors.length - 4}</em>` : ''}</span>` : '';
    return `<article class="good"><a class="good__link" href="${catPath('/catalog/p/' + p.id)}" aria-label="${esc(prodTitle(p))}"></a>
      <div class="good__img">${tagPill(p.tags)}<img src="${p.imgs[0]}" alt="${esc(p.name)}" loading="lazy">${p.imgs.length > 1 ? `<span class="good__dots">${p.imgs.map((_, i) => `<i class="${i ? '' : 'is-on'}"></i>`).join('')}</span>` : ''}</div>
      <div class="good__body"><b class="good__name">${esc(p.name)}</b><span class="good__var">${esc(p.variant || '')}</span>${sw}
        <div class="good__price">${rub(p.price)}<small> / ${p.unit}</small>${p.oldPrice ? ` <s>${rub(p.oldPrice)}</s>` : ''}</div>
        <div class="good__meta">${avail(p)}<span class="good__seller">${esc(s.name)} · ${icon('star')} ${s.rating}</span></div></div>
      ${addBtn('p', p.id)}</article>`;
  }
  const SW = { 'белый': '#fff', 'снежно-белый': '#fafafa', 'чёрный': '#111', 'серый': '#9a9a96', 'графит': '#4a4c4e', 'никель': '#c9c9c4', 'хром': '#d9dadc', 'бронза': '#8a6a3a', 'капучино': '#c7ad8a', 'дуб': '#b4834e', 'бежевый': '#e3d2b8', 'шалфей': '#9fb49a', 'зелёный': '#4e8a5e', 'песок': '#e0cfa7', 'эльбрус': '#e9e2d4', 'мрамор тёмный': '#3a3a3c', 'дымчатый': '#8d8378', 'натуральный': '#c99b63', 'ламинация': '#a67c52' };
  const swatch = (name) => { const k = name.toLowerCase(); const hit = Object.keys(SW).find((x) => k.includes(x)); return hit ? SW[hit] : '#d8d4cc'; };
  function serviceCard(sv) {
    const s = seller(sv.seller); const i = info(s.id);
    return `<article class="good good--svc"><a class="good__link" href="${catPath('/catalog/s/' + sv.id)}" aria-label="${esc(sv.title)}"></a>
      <div class="good__img good__img--wide">${tagPill(sv.tags)}<img src="${sv.img}" alt="${esc(sv.title)}" loading="lazy"><span class="good__who">${i.photo ? `<img src="${i.photo}" alt="">` : `<span class="avatar avatar--xs">${esc(s.name[0])}</span>`}<span>${esc(s.name)}</span>${i.verified ? icon('badge-check') : ''}</span></div>
      <div class="good__body"><b class="good__name">${esc(sv.title)}</b><span class="good__var">${esc(sv.desc)}</span>
        <div class="good__price">${esc(sv.price)}</div>
        <div class="good__meta">${stars(s.rating)}<span class="muted xs">${s.reviews} ${plural(s.reviews, 'отзыв', 'отзыва', 'отзывов')}</span>${sv.attrs['Когда может начать'] === 'На этой неделе' ? '<span class="avail avail--in">свободен на неделе</span>' : ''}</div></div>
      ${addBtn('s', sv.id)}</article>`;
  }
  // Мастер / компания: фото человека или бригады, портфолио, район, цена
  function masterCard(p) {
    const i = info(p.id);
    return `<article class="mcard"><a class="good__link" href="${catPath('/catalog/' + p.id)}" aria-label="${esc(p.name)}"></a>
      <div class="mcard__img"><img src="${i.photo}" alt="${esc(p.name)}" loading="lazy"><span class="mcard__kind">${D.kinds[p.kind]}</span>${i.verified ? `<span class="mcard__ver">${icon('badge-check')} Проверен</span>` : ''}</div>
      <div class="mcard__body"><b class="mcard__name">${esc(p.name)}</b><span class="mcard__tags">${partnerTags(p).slice(0, 2).map(esc).join(' · ')}</span>
        <div class="mcard__row">${stars(p.rating)}<span class="muted xs">${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}</span></div>
        <div class="mcard__row mcard__row--bottom"><span class="xs">${icon('map-pin')} ${esc(i.district ? distOf(i.district).title : p.city)}</span><b class="mcard__price">${esc(p.price)}</b></div>
      </div></article>`;
  }
  // Магазин: фото зала, адрес, часы, «открыто», категории, скидка
  function storeCard(p) {
    const i = info(p.id); const open = openNow(i.hours);
    return `<article class="mcard mcard--store"><a class="good__link" href="${catPath('/catalog/' + p.id)}" aria-label="${esc(p.name)}"></a>
      <div class="mcard__img"><img src="${i.photo}" alt="${esc(p.name)}" loading="lazy">${i.showroom ? `<span class="mcard__kind">Шоурум</span>` : ''}<span class="mcard__disc">${icon('percent')} ${esc(p.price.replace('Скидка партнёрам', 'Скидка RemCard').replace('Скидка клиентам RemCard', 'Скидка RemCard'))}</span></div>
      <div class="mcard__body"><b class="mcard__name">${esc(p.name)}</b><span class="mcard__tags">${partnerTags(p).slice(0, 2).map(esc).join(' · ')}</span>
        <div class="mcard__row">${stars(p.rating)}<span class="muted xs">${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}</span></div>
        <div class="mcard__row mcard__row--bottom"><span class="xs" title="${esc(i.addr)}">${icon('map-pin')} ${esc(i.district ? distOf(i.district).title : p.city)}</span><span class="xs ${open ? 'ok' : 'muted'}">${icon('clock')} ${open ? 'Открыто' : 'Закрыто'}</span></div></div></article>`;
  }
  const kitCard = (k) => `<a class="kit" href="${catalogHref(`/catalog/kit/${k.id}`)}"><span class="kit__ico">${icon(k.icon, 'i--20')}</span><b>${k.title}</b><small>${k.products.length ? `${k.products.length} ${plural(k.products.length, 'товар', 'товара', 'товаров')}` : ''}${k.products.length && k.services.length ? ' · ' : ''}${k.services.length ? `${k.services.length} ${plural(k.services.length, 'услуга', 'услуги', 'услуг')}` : ''}</small></a>`;
  const tile = (c) => { const n = C.products.filter((p) => p.cat === c.id).length; return `<a class="tile" href="${href({ sec: 'goods', cat: c.id })}"><img src="${c.img}" alt="" loading="lazy"><b>${c.title}</b><small>${n}</small></a>`; };
  const roomCard = (r) => `<a class="roomc" href="${href({ room: r.id })}"><img src="${r.img}" alt="" loading="lazy"><div><b>${r.title}</b><small>${C.products.filter((p) => p.rooms.includes(r.id)).length} товаров · ${C.services.filter((s) => s.rooms.includes(r.id)).length} услуг</small></div></a>`;

  // Маршрут покупок — как дорожка этапов в навигаторе, с прогрессом
  function routeStrip(activeId, compact) {
    const cur = currentStage();
    return `<div class="sroute ${compact ? 'sroute--compact' : ''}">${C.stages.map((st) => {
      const pr = stageProgress(st); const full = pr.done === pr.total;
      return `<a class="sroute__n ${activeId === st.id ? 'is-on' : ''} ${full ? 'is-done' : ''} ${cur && cur.id === st.id ? 'is-here' : ''}" href="${href({ stage: st.id })}">
        <span class="sroute__ico">${full ? icon('check') : icon(st.icon)}</span><b class="sroute__t">${compact ? st.short : st.title}</b>${compact ? '' : `<b class="sroute__s">${st.short}</b>`}
        <small>${full ? 'собран' : pr.done ? `${pr.done} из ${pr.total}` : cur && cur.id === st.id ? 'вы здесь' : ''}</small></a>`;
    }).join('')}</div>`;
  }

  // ---------- Схема-карта районов (стилизованная, как маршрут в навигаторе) ----------
  function mapSvg(points, sel) {
    const d = C.districts;
    return `<div class="rmap"><svg viewBox="0 0 100 76" preserveAspectRatio="xMidYMid meet" aria-label="Схема районов Краснодара">
      <defs><filter id="mapsh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity=".18"/></filter></defs>
      <path class="rmap__river" d="M-2 72 C 12 70, 16 60, 20 56 S 30 54, 34 60 S 44 72, 56 70 S 70 66, 80 72 L 102 76" />
      <path class="rmap__road" d="M50 0 L50 76"/><path class="rmap__road" d="M0 40 C 30 36, 70 36, 100 44"/><path class="rmap__road" d="M12 6 C 30 24, 72 40, 96 50"/>
      ${d.map((x) => `<g class="rmap__d ${sel === x.id ? 'is-on' : ''}" data-dist="${x.id}"><ellipse cx="${x.x}" cy="${x.y}" rx="10.5" ry="7"/><text x="${x.x}" y="${x.y + (points.some((p) => p.dist === x.id) ? 5.2 : 1.1)}">${x.title}</text></g>`).join('')}
      ${(() => { const seen = {}; return points.map((p) => { const dd = d.find((x) => x.id === p.dist); if (!dd) return ''; const n = points.filter((o) => o.dist === p.dist).length; const i = seen[p.dist] = (seen[p.dist] || 0) + 1; const px = dd.x + (i - (n + 1) / 2) * 4.5; const py = dd.y - 1.5; return `<a class="rmap__pin ${p.cls || ''}" href="${p.href}" aria-label="${esc(p.title)}"><g transform="translate(${px} ${py})" filter="url(#mapsh)"><path d="M0 0 C -2.6 -3 -3.4 -4.4 -3.4 -6 A 3.4 3.4 0 0 1 3.4 -6 C 3.4 -4.4 2.6 -3 0 0 Z"/><circle cx="0" cy="-6" r="1.4"/></g><title>${esc(p.title)}</title></a>`; }).join(''); })()}
    </svg></div>`;
  }

  // ---------- Состояние выдачи ----------
  const SECS = [['all', 'Всё'], ['goods', 'Товары'], ['services', 'Услуги'], ['masters', 'Мастера и компании'], ['stores', 'Магазины']];
  const F = { sec: 'all', q: '', cat: '', sub: '', stage: '', room: '', style: '', gamma: '', dist: '', seller: '', min: '', max: '', sort: 'pop', tag: '', view: 'grid', f: {} };
  const NR = { nrp: '', nrl1: '', nrl2: '', nrv: '' };
  function clearNavReturn() {
    NR.nrp = '';
    NR.nrl1 = '';
    NR.nrl2 = '';
    NR.nrv = '';
  }
  /** Rebuild in-memory NR only from the current route query (no sticky carry-over). */
  function syncNavReturn(params = {}) {
    if (params.nrp) {
      NR.nrp = params.nrp;
      NR.nrl1 = params.nrl1 || '';
      NR.nrl2 = params.nrl2 || '';
      NR.nrv = params.nrv === 'intro' ? 'intro' : 'step';
    } else {
      clearNavReturn();
    }
  }
  function navReturnQuery() {
    if (!NR.nrp) return {};
    const o = { nrp: NR.nrp, nrl1: NR.nrl1, nrv: NR.nrv || 'step' };
    if (NR.nrl2) o.nrl2 = NR.nrl2;
    return o;
  }
  function mergeCatalogQuery(qs, extra = {}) {
    const merged = new URLSearchParams(qs || '');
    if (NR.nrp) {
      Object.entries(navReturnQuery()).forEach(([k, v]) => {
        if (!merged.has(k)) merged.set(k, v);
      });
    }
    Object.entries(extra).forEach(([k, v]) => {
      if (v) merged.set(k, v);
      else merged.delete(k);
    });
    return merged.toString();
  }
  /** Any catalog hash path or fragment; appends active NR when present. */
  function catalogHref(path, extra = {}) {
    const raw = String(path || '').replace(/^#/, '');
    const [p, q = ''] = raw.split('?');
    const qs = mergeCatalogQuery(q, extra);
    return `#${p}${qs ? `?${qs}` : ''}`;
  }
  function catPath(path, extra = {}) {
    return catalogHref(path, extra);
  }
  function returnParamsFromRoute(params = {}) {
    if (params.nrp) return params;
    if (!NR.nrp) return params;
    return { ...params, nrp: NR.nrp, nrl1: NR.nrl1, nrl2: NR.nrl2 || '', nrv: NR.nrv || 'step' };
  }
  function catalogNavReturnBar(params) {
    const v = window.RCNav?.validateCatalogReturn?.(returnParamsFromRoute(params));
    if (!v) return '';
    return `<div class="catalog-nav-return" data-testid="catalog-nav-return">
      <button type="button" class="btn btn--ghost btn--block catalog-nav-return__btn" id="catalog-nav-return" style="min-height:2.75rem;font-size:var(--text-sm)" aria-label="Вернуться к текущему шагу">${icon('arrow-left')} Вернуться к текущему шагу${v.hint ? `<span class="catalog-nav-return__hint muted xs"> — ${v.hint}</span>` : ''}</button>
    </div>`;
  }
  const ui = { fopen: false, sug: false, closed: new Set() };
  const L1STAGE = (l1) => (stageByL1(l1) || {}).id || '';
  const encF = (f) => Object.entries(f).filter(([, v]) => v.length).map(([k, v]) => `${k}~${v.join('~')}`).join(';');
  const decF = (s) => { const o = {}; (s || '').split(';').filter(Boolean).forEach((part) => { const [k, ...v] = part.split('~'); if (v.length) o[k] = v; }); return o; };
  const href = (o = {}) => {
    const n = { ...F, ...o, ...navReturnQuery(), f: encF(o.f !== undefined ? o.f : F.f) };
    return '#/catalog?' + new URLSearchParams(Object.fromEntries(Object.entries(n).filter(([k, v]) => v && !(k === 'sec' && v === 'all') && !(k === 'sort' && v === 'pop') && !(k === 'view' && v === 'grid')))).toString();
  };
  const withF = (key, val) => { const f = { ...F.f }; const cur = f[key] || []; const nx = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]; if (nx.length) f[key] = nx; else delete f[key]; return f; };
  const hasAttr = (o, key, v) => { const a = (o.attrs || {})[key]; return Array.isArray(a) ? a.includes(v) : a === v; };
  const q = () => F.q.trim().toLowerCase();
  const match = (txt) => !q() || txt.toLowerCase().includes(q());

  // Фильтр товаров: skip — ключ фасета, который не учитываем (для подсчёта вариантов)
  function passGoods(p, skip) {
    if (F.cat && p.cat !== F.cat) return false;
    if (F.sub && p.sub !== F.sub) return false;
    if (F.stage && prodStage(p) !== F.stage) return false;
    if (F.room && !p.rooms.includes(F.room)) return false;
    if (F.style && !p.styles.includes(F.style)) return false;
    if (F.gamma && skip !== 'gamma' && p.gamma !== F.gamma) return false;
    if (F.seller && p.seller !== F.seller) return false;
    if (F.tag && !p.tags.includes(F.tag)) return false;
    if (F.min && p.price < +F.min) return false;
    if (F.max && p.price > +F.max) return false;
    if (!match([p.name, p.variant, p.brand, p.sub, catOf(p.cat).title, p.desc, (p.colors || []).join(' '), seller(p.seller).name, Object.values(p.attrs).join(' ')].join(' '))) return false;
    for (const [k, vals] of Object.entries(F.f)) { if (k === skip || !vals.length) continue; if (k === 'Продавец') { if (!vals.includes(seller(p.seller).name)) return false; continue; } if (!vals.some((v) => hasAttr(p, k, v))) return false; }
    return true;
  }
  function passSvc(s, skip) {
    if (F.cat && !s.cats.includes(F.cat)) return false;
    if (F.sub && s.group !== F.sub) return false;
    if (F.stage && s.stage !== F.stage) return false;
    if (F.room && !s.rooms.includes(F.room)) return false;
    if (F.dist && !s.districts.includes(F.dist)) return false;
    if (F.seller && s.seller !== F.seller) return false;
    if (F.tag && !s.tags.includes(F.tag)) return false;
    if (F.min && s.priceNum < +F.min) return false;
    if (F.max && s.priceNum > +F.max) return false;
    if (!match([s.title, s.desc, seller(s.seller).name, s.includes.join(' '), (C.serviceGroups.find((g) => g.id === s.group) || {}).title || ''].join(' '))) return false;
    for (const [k, vals] of Object.entries(F.f)) { if (k === skip || !vals.length) continue; if (k === 'Район выезда') { if (!vals.some((v) => s.districts.map((d) => distOf(d).title).includes(v))) return false; continue; } if (!vals.some((v) => hasAttr(s, k, v))) return false; }
    return true;
  }
  // Атрибуты партнёра для фасетов
  function pAttrs(p) {
    const i = info(p.id);
    return { Кто: D.kinds[p.kind], Специализация: partnerTags(p), Район: i.district ? distOf(i.district).title : p.city, Рейтинг: [p.rating >= 4.8 ? '4.8 и выше' : null, p.rating >= 4.5 ? '4.5 и выше' : null].filter(Boolean), 'Проверен RemCard': i.verified ? 'Да' : 'Нет', 'Договор и чек': i.contract ? 'Да' : 'Нет', Шоурум: i.showroom ? 'Да' : 'Нет', Самовывоз: i.pickup ? 'Да' : 'Нет', Опыт: [p.years >= 5 ? 'от 5 лет' : null, p.years >= 10 ? 'от 10 лет' : null].filter(Boolean), Город: p.city };
  }
  function passPartner(p, skip) {
    const a = pAttrs(p); const i = info(p.id);
    if (F.dist && i.district !== F.dist) return false;
    if (F.cat && !(p.kind === 'store' ? partnerGoods(p.id).some((x) => x.cat === F.cat) : partnerSvcs(p.id).some((s) => s.cats.includes(F.cat)))) return false;
    if (F.stage && !(p.kind === 'store' ? partnerGoods(p.id).some((x) => prodStage(x) === F.stage) : partnerSvcs(p.id).some((s) => s.stage === F.stage))) return false;
    if (F.room && !(p.kind === 'store' ? partnerGoods(p.id).some((x) => x.rooms.includes(F.room)) : partnerSvcs(p.id).some((s) => s.rooms.includes(F.room)))) return false;
    if (!match([p.name, p.about, p.city, partnerTags(p).join(' '), i.addr || '', a.Район].join(' '))) return false;
    for (const [k, vals] of Object.entries(F.f)) { if (k === skip || !vals.length) continue; if (!vals.some((v) => hasAttr({ attrs: a }, k, v))) return false; }
    return true;
  }
  const sorters = {
    pop: (a, b) => ((b.tags || []).includes('hit') - (a.tags || []).includes('hit')) || ((b.rating || 0) - (a.rating || 0)),
    asc: (a, b) => (a.price ?? a.priceNum ?? 0) - (b.price ?? b.priceNum ?? 0), desc: (a, b) => (b.price ?? b.priceNum ?? 0) - (a.price ?? a.priceNum ?? 0),
    rating: (a, b) => ((b.rating || seller(b.seller).rating) - (a.rating || seller(a.seller).rating)), new: (a, b) => ((b.tags || []).includes('new') - (a.tags || []).includes('new')),
  };
  function results() {
    const goods = F.sec === 'services' || F.sec === 'masters' || F.sec === 'stores' ? [] : C.products.filter((p) => passGoods(p)).sort(sorters[F.sort] || sorters.pop);
    const services = F.sec === 'goods' || F.sec === 'masters' || F.sec === 'stores' || F.gamma ? [] : C.services.filter((s) => passSvc(s)).sort(sorters[F.sort === 'pop' ? 'rating' : F.sort] || sorters.rating);
    const ms = F.sec === 'goods' || F.sec === 'services' || F.sec === 'stores' || F.gamma || F.style ? [] : masters().filter((p) => passPartner(p)).sort(sorters.rating);
    const ss = F.sec === 'goods' || F.sec === 'services' || F.sec === 'masters' || F.gamma || F.style ? [] : stores().filter((p) => passPartner(p)).sort(sorters.rating);
    return { goods, services, masters: ms, stores: ss };
  }
  const activeCount = () => Object.values(F.f).reduce((a, v) => a + v.length, 0) + (F.min || F.max ? 1 : 0) + (F.gamma ? 1 : 0) + (F.dist ? 1 : 0) + (F.room ? 1 : 0) + (F.style ? 1 : 0) + (F.sub ? 1 : 0) + (F.tag ? 1 : 0) + (F.seller ? 1 : 0);

  // ---------- Панель фильтров (общая для разделов) ----------
  const check = (on, h, label, n, swatchCss) => `<button type="button" class="fchk ${on ? 'is-on' : ''} ${n === 0 && !on ? 'is-empty' : ''}" data-href="${h}" ${n === 0 && !on ? 'disabled' : ''} role="checkbox" aria-checked="${on}">${swatchCss ? `<i class="fchk__sw" style="background:${swatchCss}"></i>` : `<span class="fchk__box">${icon('check')}</span>`}<span class="fchk__l">${label}</span>${n != null ? `<small>${n}</small>` : ''}</button>`;
  const fgroup = (title, body, openDefault = true) => body ? `<details class="fg" ${ui.closed.has(title) || !openDefault ? '' : 'open'} data-fg="${esc(title)}"><summary><span>${title}</span>${icon('chevron-down')}</summary><div class="fg__b">${body}</div></details>` : '';
  function priceGroup(items, key) {
    if (!items.length) return '';
    const ps = items.map((x) => x[key]); const lo = Math.min(...ps), hi = Math.max(...ps); if (lo === hi) return '';
    const vmin = Math.min(Math.max(+F.min || lo, lo), hi), vmax = Math.max(Math.min(+F.max || hi, hi), lo);
    const pct = (v) => ((v - lo) / (hi - lo)) * 100;
    return `<div class="prange"><input type="number" inputmode="numeric" placeholder="от ${fmt(lo)}" value="${esc(F.min)}" data-fnum="min" aria-label="Цена от"><i></i><input type="number" inputmode="numeric" placeholder="до ${fmt(hi)}" value="${esc(F.max)}" data-fnum="max" aria-label="Цена до"></div>
      <div class="rslider" style="--a:${pct(vmin)}%;--b:${pct(vmax)}%"><input type="range" min="${lo}" max="${hi}" step="10" value="${vmin}" data-frange="min" aria-label="Цена от"><input type="range" min="${lo}" max="${hi}" step="10" value="${vmax}" data-frange="max" aria-label="Цена до"></div><div class="rvals"><span>${fmt(lo)} ₽</span><span>${fmt(hi)} ₽</span></div>`;
  }
  function attrGroups(schema, items, pass, getAttrs) {
    return schema.map(([key, opts]) => {
      const present = [...new Set(items.flatMap((x) => [].concat(getAttrs(x)[key] || [])))];
      if (!present.length && !(F.f[key] || []).length) return '';
      const all = (opts || []).slice(); present.forEach((v) => { if (!all.includes(v)) all.push(v); });
      const sel = F.f[key] || [];
      const base = items.filter((x) => pass(x, key));
      const rows = all.map((v) => { const n = base.filter((x) => hasAttr({ attrs: getAttrs(x) }, key, v)).length; if (!n && !sel.includes(v) && all.length > 6) return ''; return check(sel.includes(v), href({ f: withF(key, v) }), esc(v), n); }).join('');
      return fgroup(key, rows, sel.length > 0 || schema.indexOf(schema.find((s) => s[0] === key)) < 3);
    }).join('');
  }
  function filtersGoods(scope) {
    const cat = F.cat ? catOf(F.cat) : null;
    const subs = cat ? cat.subs : [];
    const subRows = subs.map((sName) => { const n = C.products.filter((p) => p.cat === F.cat && p.sub === sName && passGoodsNoSub(p)).length; return check(F.sub === sName, href({ sub: F.sub === sName ? '' : sName }), esc(sName), n); }).join('');
    const catRows = !cat ? C.categories.map((c) => { const n = scope.filter((p) => p.cat === c.id).length; return n || F.cat === c.id ? check(false, href({ cat: c.id, sub: '' }), c.title, n) : ''; }).join('') : '';
    const gam = C.gammas.map((g) => { const n = C.products.filter((p) => passGoods(p, 'gamma') && p.gamma === g.id).length; return check(F.gamma === g.id, href({ gamma: F.gamma === g.id ? '' : g.id }), g.title, n, g.hex); }).join('');
    const rooms = C.rooms.map((r) => { const n = scope.filter((p) => p.rooms.includes(r.id)).length; return n || F.room === r.id ? check(F.room === r.id, href({ room: F.room === r.id ? '' : r.id }), r.title, n) : ''; }).join('');
    const styles = C.styles.map((s) => { const n = scope.filter((p) => p.styles.includes(s.id)).length; return n || F.style === s.id ? check(F.style === s.id, href({ style: F.style === s.id ? '' : s.id }), s.title, n) : ''; }).join('');
    const sellers = stores().map((s) => { const n = C.products.filter((p) => passGoods(p, 'Продавец') && p.seller === s.id).length; return n || (F.f['Продавец'] || []).includes(s.name) ? check((F.f['Продавец'] || []).includes(s.name), href({ f: withF('Продавец', s.name) }), esc(s.name), n) : ''; }).join('');
    const getA = (p) => p.attrs;
    return `${cat ? fgroup('Тип', subRows) : fgroup('Категория', catRows)}
      ${fgroup('Цена', priceGroup(scope, 'price'))}
      ${fgroup('Цвет', gam)}
      ${attrGroups(cat ? cat.facets : [], scope, passGoods, getA)}
      ${attrGroups(C.commonFacets, scope, passGoods, getA)}
      ${fgroup('Помещение', rooms, false)}${fgroup('Стиль', styles, false)}
      ${fgroup('Продавец', sellers, false)}${attrGroups([['Бренд', null]], scope, passGoods, getA)}`;
  }
  const passGoodsNoSub = (p) => { const s = F.sub; F.sub = ''; const r = passGoods(p); F.sub = s; return r; };
  function filtersServices(scope) {
    const groups = C.serviceGroups.map((g) => { const n = C.services.filter((s) => s.group === g.id && passSvcNoSub(s)).length; return n || F.sub === g.id ? check(F.sub === g.id, href({ sub: F.sub === g.id ? '' : g.id }), g.title, n) : ''; }).join('');
    const dists = C.districts.map((d) => { const n = C.services.filter((s) => passSvc(s, 'dist') && s.districts.includes(d.id)).length; return check(F.dist === d.id, href({ dist: F.dist === d.id ? '' : d.id }), d.title, n); }).join('');
    const rooms = C.rooms.map((r) => { const n = scope.filter((s) => s.rooms.includes(r.id)).length; return n || F.room === r.id ? check(F.room === r.id, href({ room: F.room === r.id ? '' : r.id }), r.title, n) : ''; }).join('');
    return `${fgroup('Вид работ', groups)}${fgroup('Район выезда', dists)}${fgroup('Цена за единицу', priceGroup(scope, 'priceNum'), false)}${attrGroups(C.serviceFacets, scope, passSvc, (s) => s.attrs)}${fgroup('Помещение', rooms, false)}`;
  }
  const passSvcNoSub = (s) => { const x = F.sub; F.sub = ''; const r = passSvc(s); F.sub = x; return r; };
  function filtersPartners(scope, isStores) {
    const dists = C.districts.map((d) => { const n = (isStores ? stores() : masters()).filter((p) => passPartner(p) && info(p.id).district === d.id).length; return n || F.dist === d.id ? check(F.dist === d.id, href({ dist: F.dist === d.id ? '' : d.id }), d.title, n) : ''; }).join('');
    const cats = C.categories.map((c) => { const n = scope.filter((p) => (isStores ? partnerGoods(p.id).some((x) => x.cat === c.id) : partnerSvcs(p.id).some((s) => s.cats.includes(c.id)))).length; return n || F.cat === c.id ? check(F.cat === c.id, href({ cat: F.cat === c.id ? '' : c.id }), c.title, n) : ''; }).join('');
    const schema = isStores ? C.partnerFacets.filter(([k]) => !['Кто', 'Договор и чек', 'Опыт'].includes(k)) : C.partnerFacets.filter(([k]) => !['Шоурум', 'Самовывоз'].includes(k));
    return `${fgroup('Район', dists)}${isStores ? fgroup('Что продают', cats) : attrGroups([['Специализация', null]], scope, passPartner, pAttrs)}${attrGroups(schema, scope, passPartner, pAttrs)}${isStores ? '' : fgroup('Категории товаров', cats, false)}`;
  }
  function activeChips() {
    const out = [];
    const chip = (l, o) => out.push(`<button type="button" class="achip" data-href="${href(o)}">${l}${icon('x')}</button>`);
    if (F.sub) chip(F.sec === 'services' ? (C.serviceGroups.find((g) => g.id === F.sub) || {}).title : F.sub, { sub: '' });
    if (F.gamma) chip(`Цвет: ${gammaOf(F.gamma).title}`, { gamma: '' });
    if (F.room) chip(roomOf(F.room).title, { room: '' });
    if (F.style) chip(`Стиль: ${styleOf(F.style).title}`, { style: '' });
    if (F.dist) chip(distOf(F.dist).title, { dist: '' });
    if (F.seller) chip(seller(F.seller).name, { seller: '' });
    if (F.tag) chip(C.tagLabel[F.tag], { tag: '' });
    if (F.min || F.max) chip(`${F.min ? 'от ' + fmt(+F.min) : ''}${F.min && F.max ? ' ' : ''}${F.max ? 'до ' + fmt(+F.max) : ''} ₽`, { min: '', max: '' });
    Object.entries(F.f).forEach(([k, vals]) => vals.forEach((v) => chip(['Да', 'Нет'].includes(v) ? `${k}: ${v.toLowerCase()}` : v, { f: withF(k, v) })));
    return out.join('');
  }
  const resetHref = () => href({ sub: '', gamma: '', room: '', style: '', dist: '', seller: '', tag: '', min: '', max: '', f: {} });

  // ---------- Подсказки поиска ----------
  function suggestions(text) {
    const t = text.trim().toLowerCase(); if (t.length < 2) return '';
    const has = (s) => String(s || '').toLowerCase().includes(t);
    const grp = (title, rows) => rows.length ? `<div class="sug__g"><span>${title}</span>${rows.join('')}</div>` : '';
    const row = (h, img, name, sub) => `<a class="sug__i" href="${h}">${img ? `<img src="${img}" alt="">` : ''}<div><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></a>`;
    const cats = C.categories.flatMap((c) => [[c.title, href({ sec: 'goods', cat: c.id }), c.img, 'категория'], ...c.subs.map((s) => [s, href({ sec: 'goods', cat: c.id, sub: s }), c.img, c.title])]).filter(([n]) => has(n)).slice(0, 3);
    const goods = C.products.filter((p) => has(p.name) || has(p.variant) || has(p.brand) || has(p.sub) || has(catOf(p.cat).title)).sort((a, b) => (has(b.name) || has(b.brand)) - (has(a.name) || has(a.brand))).slice(0, 4);
    const svcs = C.services.filter((s) => has(s.title) || has(s.desc)).slice(0, 3);
    const ms = masters().filter((p) => has(p.name) || partnerTags(p).some(has)).slice(0, 3);
    const ss = stores().filter((p) => has(p.name) || partnerTags(p).some(has) || has(info(p.id).addr)).slice(0, 3);
    const ds = C.districts.filter((d) => has(d.title)).slice(0, 2);
    const rs = C.rooms.filter((r) => has(r.title)).slice(0, 2);
    const html = grp('Разделы', cats.map(([n, h, im, sub]) => row(h, im, n, sub))) + grp('Товары', goods.map((p) => row(catalogHref(`/catalog/p/${p.id}`), p.imgs[0], prodTitle(p), `${rub(p.price)} · ${seller(p.seller).name}`))) + grp('Услуги', svcs.map((s) => row(catalogHref(`/catalog/s/${s.id}`), s.img, s.title, `${s.price} · ${seller(s.seller).name}`)))
      + grp('Мастера и компании', ms.map((p) => row(catalogHref(`/catalog/${p.id}`), info(p.id).photo, p.name, partnerTags(p).slice(0, 2).join(', ')))) + grp('Магазины', ss.map((p) => row(catalogHref(`/catalog/${p.id}`), info(p.id).photo, p.name, info(p.id).addr)))
      + grp('Рядом', [...ds.map((d) => row(href({ dist: d.id }), '', `Район ${d.title}`, 'мастера и магазины')), ...rs.map((r) => row(href({ room: r.id }), r.img, r.title, 'всё для помещения'))]);
    return html ? `<div class="sug">${html}<a class="sug__all" href="${href({ q: text.trim() })}">${icon('search')} Искать «${esc(text.trim())}» везде</a></div>` : `<div class="sug"><p class="xs" style="padding:.8rem 1rem">Ничего похожего. Нажмите Enter — поищем по описаниям.</p></div>`;
  }

  // ---------- Страница каталога ----------
  function pageCatalog(params) {
    syncNavReturn(params);
    const returnBar = catalogNavReturnBar(params);
    // Совместимость со ссылками навигатора: kind=store/specialist, type=goods|services, stage=L1-x
    const sec = params.sec || (params.kind === 'store' ? 'stores' : params.kind ? 'masters' : params.type === 'goods' ? 'goods' : params.type === 'services' ? 'services' : 'all');
    const stage = params.stage ? (params.stage.startsWith('L1') ? L1STAGE(params.stage) : params.stage) : '';
    Object.assign(F, { sec, q: params.q || '', cat: params.cat || '', sub: params.sub || '', stage, room: params.room || '', style: params.style || '', gamma: params.gamma || '', dist: params.dist || '', seller: params.seller || '', min: params.min || '', max: params.max || '', sort: params.sort || 'pop', tag: params.tag || '', view: params.view || 'grid', f: decF(params.f) });
    if (F.cat && !catOf(F.cat)) F.cat = '';
    const home = F.sec === 'all' && !F.q && !F.cat && !F.stage && !F.room && !F.style && !F.gamma && !F.dist && !F.tag && !F.seller && !Object.keys(F.f).length;
    const R = results();
    const total = R.goods.length + R.services.length + R.masters.length + R.stores.length;
    const counts = { all: total, goods: R.goods.length, services: R.services.length, masters: R.masters.length, stores: R.stores.length };
    const head = `${returnBar}<div class="shop-top"><div class="search ${home ? 'search--hero' : ''}"><span class="search__ico">${icon('search')}</span><input id="shop-q" type="search" placeholder="${home ? 'Плитка под мрамор, электрик, магазин дверей рядом…' : 'Что ищете?'}" value="${esc(F.q)}" autocomplete="off" aria-label="Поиск по каталогу">${F.q ? `<a class="search__x" href="${href({ q: '' })}" aria-label="Очистить">${icon('x')}</a>` : ''}<div id="sug-box"></div></div>
        <a class="btn btn--dark cartb" href="${catPath('/catalog/list')}">${icon('shopping-bag')}<span>Список</span>${state.cart.length ? `<b>${state.cart.length}</b>` : ''}</a></div>
      <div class="seg seg--type seg--scroll" role="tablist">${SECS.map(([k, t]) => `<button role="tab" class="${F.sec === k ? 'is-on' : ''}" data-href="${href({ sec: k, sub: '', f: {} })}">${t}</button>`).join('')}</div>`;

  if (home) return pageHome(head, params);

    // ----- Выдача -----
    const st = F.stage ? stageOf(F.stage) : null; const cat = F.cat ? catOf(F.cat) : null;
    const ctx = [F.room ? roomOf(F.room).title : '', F.style ? styleOf(F.style).title : '', F.dist ? 'район ' + distOf(F.dist).title : ''].filter(Boolean).join(' · ');
    const title = q() ? `«${esc(F.q.trim())}»` : cat ? cat.title : st ? st.title : F.sub && F.sec === 'services' ? (C.serviceGroups.find((g) => g.id === F.sub) || {}).title : F.room ? `Всё для: ${roomOf(F.room).title}` : F.style ? `Стиль «${styleOf(F.style).title}»` : F.dist ? `Рядом: ${distOf(F.dist).title}` : F.tag ? C.tagLabel[F.tag] + 'ы' : F.seller ? seller(F.seller).name : { goods: 'Товары', services: 'Услуги мастеров', masters: 'Мастера и компании', stores: 'Магазины', all: 'Каталог' }[F.sec];
    const pr = st ? stageProgress(st) : null;
    const nAct = activeCount();
    const mapMode = window.RC_R(2) && F.view === 'map' && (F.sec === 'masters' || F.sec === 'stores');
    const sidebar = !window.RC_R(2) ? '' : F.sec === 'goods' ? filtersGoods(R.goods) : F.sec === 'services' ? filtersServices(R.services) : F.sec === 'masters' ? filtersPartners(R.masters, false) : F.sec === 'stores' ? filtersPartners(R.stores, true) : '';
    const sortOpts = F.sec === 'goods' ? [['pop', 'Популярные'], ['asc', 'Дешевле'], ['desc', 'Дороже'], ['new', 'Новинки']] : F.sec === 'services' ? [['pop', 'По рейтингу'], ['asc', 'Дешевле'], ['desc', 'Дороже']] : [];
    const panel = sidebar ? `<aside class="fside ${ui.fopen ? 'is-open' : ''}" id="fside"><div class="fside__h"><b>Фильтры${nAct ? ` · ${nAct}` : ''}</b><button type="button" class="iconb" id="fside-x" aria-label="Закрыть">${icon('x')}</button></div><div class="fside__b">${sidebar}</div><div class="fside__f"><a class="btn btn--ghost" href="${resetHref()}">${icon('rotate-ccw')} Сбросить</a><button type="button" class="btn btn--primary grow" id="fside-ok">Показать ${counts[F.sec]}</button></div></aside>` : '';
    // Подкатегории с фото (второй уровень дерева) и быстрые группы «по типу / по цвету»
    const subStrip = cat && !F.sub && cat.subs.length ? `<div class="subs">${cat.subs.map((sName) => { const ps = C.products.filter((p) => p.cat === cat.id && p.sub === sName); return ps.length ? `<a class="subc" href="${href({ sub: sName })}"><img src="${ps[0].imgs[0]}" alt=""><b>${sName}</b><small>${ps.length}</small></a>` : `<span class="subc is-empty"><span class="subc__ph">${icon('package')}</span><b>${sName}</b><small>скоро</small></span>`; }).join('')}</div>` : '';
    const groupsStrip = cat && cat.groups.length ? `<div class="qgroups">${cat.groups.map(([gt, items]) => `<div class="qgroup"><span>${gt}:</span>${items.map(([l, k, v]) => { const on = (F.f[k] || []).includes(v); const n = C.products.filter((p) => passGoods(p, k) && hasAttr(p, k, v)).length; return `<button type="button" class="chip ${on ? 'is-on' : ''}" data-href="${href({ f: withF(k, v) })}" ${!n && !on ? 'disabled' : ''}>${l}${n ? ` <em>${n}</em>` : ''}</button>`; }).join('')}</div>`).join('')}</div>` : '';
    const svcGroups = F.sec === 'services' && !F.sub ? `<div class="subs subs--svc">${C.serviceGroups.map((g) => { const n = C.services.filter((s) => s.group === g.id && passSvcNoSub(s)).length; return `<a class="subc ${n ? '' : 'is-empty'}" href="${href({ sub: g.id })}"><span class="subc__ph">${icon(g.icon)}</span><b>${g.title}</b><small>${n || 'скоро'}</small></a>`; }).join('')}</div>` : '';
    const sectionsRow = (R2) => `${R2.goods.length ? `<div class="shop-sec"><div class="shop-h"><h3>Товары <span class="muted">${R2.goods.length}</span></h3>${F.sec === 'all' ? `<a class="link small" href="${href({ sec: 'goods' })}">Все ${icon('arrow-right')}</a>` : ''}</div><div class="goods ${F.view === 'big' ? 'goods--big' : ''}">${(F.sec === 'all' ? R2.goods.slice(0, 8) : R2.goods).map(productCard).join('')}</div></div>` : ''}
      ${R2.services.length ? `<div class="shop-sec"><div class="shop-h"><h3>Услуги <span class="muted">${R2.services.length}</span></h3>${F.sec === 'all' ? `<a class="link small" href="${href({ sec: 'services' })}">Все ${icon('arrow-right')}</a>` : ''}</div><div class="goods goods--svc">${(F.sec === 'all' ? R2.services.slice(0, 4) : R2.services).map(serviceCard).join('')}</div></div>` : ''}
      ${R2.masters.length ? `<div class="shop-sec"><div class="shop-h"><h3>Мастера и компании <span class="muted">${R2.masters.length}</span></h3>${F.sec === 'all' ? `<a class="link small" href="${href({ sec: 'masters' })}">Все ${icon('arrow-right')}</a>` : ''}</div><div class="mgrid">${(F.sec === 'all' ? R2.masters.slice(0, 4) : R2.masters).map(masterCard).join('')}</div></div>` : ''}
      ${R2.stores.length ? `<div class="shop-sec"><div class="shop-h"><h3>Магазины <span class="muted">${R2.stores.length}</span></h3>${F.sec === 'all' ? `<a class="link small" href="${href({ sec: 'stores' })}">Все ${icon('arrow-right')}</a>` : ''}</div><div class="mgrid">${(F.sec === 'all' ? R2.stores.slice(0, 3) : R2.stores).map(storeCard).join('')}</div></div>` : ''}`;
    const pins = mapMode ? (F.sec === 'stores' ? R.stores : R.masters).map((p) => ({ x: info(p.id).x, y: info(p.id).y, title: p.name, href: catalogHref(`/catalog/${p.id}`), dist: info(p.id).district, cls: p.kind === 'store' ? 'is-store' : '' })) : [];
    const mapBlock = mapMode ? `<div class="mapwrap">${mapSvg(pins, F.dist)}<div class="maplist">${(F.sec === 'stores' ? R.stores : R.masters).map((p) => { const i = info(p.id); return `<a class="mapitem" href="${catalogHref(`/catalog/${p.id}`)}"><img src="${i.photo}" alt=""><div><b>${esc(p.name)}</b><small>${i.district ? distOf(i.district).title + ' · ' : ''}${esc(p.kind === 'store' ? i.addr : partnerTags(p).slice(0, 2).join(', '))}</small></div>${stars(p.rating)}</a>`; }).join('') || '<p class="xs" style="padding:1rem">В этом районе пока никого — расширьте фильтр.</p>'}</div></div>` : '';
    return `<section class="section--tight"><div class="wrap shop">${head}
      ${routeStrip(F.stage, true)}
      <div class="shop-title"><a class="link link--ink small" href="${href()}">${icon('arrow-left')} Каталог</a><h2>${title} <span class="muted">${F.sec === 'all' ? total : counts[F.sec]}</span></h2>${ctx && !F.room && !F.style && !F.dist ? '' : ''}${st ? `<p class="small">${st.hint}</p>` : F.sec === 'all' && ctx ? `<p class="small">${ctx}</p>` : ''}</div>
      ${st ? `<div class="stagekit ${pr.done === pr.total ? 'is-done' : ''}"><div class="stagekit__head"><b>${pr.done === pr.total ? `${icon('check')} Этап собран` : `Собрано ${pr.done} из ${pr.total}`}</b><div class="stagekit__bar"><i style="width:${(pr.done / pr.total) * 100}%"></i></div></div>
        <div class="chips">${st.need.map((nd) => `<a class="chip ${needDone(nd) ? 'is-done' : F.cat && nd[0] === 'cat' && nd[1] === F.cat ? 'is-on' : ''}" href="${F.cat && nd[0] === 'cat' && nd[1] === F.cat ? href({ cat: '' }) : needHref(nd, st.id)}">${needDone(nd) ? icon('check') : ''}${needLabel(nd)}</a>`).join('')}</div></div>` : ''}
      ${F.sec === 'all' && !st && window.RC_R(2) ? `<div class="chips chips--scroll" style="margin-top:.5rem">${C.rooms.map((r) => `<button type="button" class="chip ${F.room === r.id ? 'is-on' : ''}" data-href="${href({ room: F.room === r.id ? '' : r.id })}">${r.title}</button>`).join('')}</div>` : ''}
      <div class="shop-body ${sidebar ? 'has-side' : ''}">${panel}
        <div class="shop-main">
          ${subStrip}${groupsStrip}${svcGroups}
          <div class="shop-bar">${sidebar ? `<button type="button" class="btn btn--ghost btn--sm fbtn" id="fbtn">${icon('sliders-horizontal')} Фильтры${nAct ? `<b>${nAct}</b>` : ''}</button>` : ''}
            <div class="achips">${activeChips()}${nAct > 1 ? `<a class="link small" href="${resetHref()}">Сбросить всё</a>` : ''}</div>
            <div class="shop-bar__r">${sortOpts.length ? `<select id="shop-sort" class="sel-sm" aria-label="Сортировка">${sortOpts.map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}
            ${F.sec === 'goods' ? `<div class="seg seg--sm seg--icons"><button class="${F.view !== 'big' ? 'is-on' : ''}" data-href="${href({ view: 'grid' })}" aria-label="Сетка">${icon('layout-grid')}</button><button class="${F.view === 'big' ? 'is-on' : ''}" data-href="${href({ view: 'big' })}" aria-label="Крупно">${icon('grid-2x2')}</button></div>` : ''}
            ${(F.sec === 'masters' || F.sec === 'stores') && window.RC_R(2) ? `<div class="seg seg--sm"><button class="${!mapMode ? 'is-on' : ''}" data-href="${href({ view: 'grid' })}">${icon('list')} Список</button><button class="${mapMode ? 'is-on' : ''}" data-href="${href({ view: 'map' })}">${icon('map')} Карта</button></div>` : ''}</div></div>
          ${mapMode ? mapBlock : sectionsRow(R)}
          ${!total ? `<div class="empty"><h3>Ничего не нашли</h3><p style="margin:.4rem 0 1rem">Снимите часть фильтров или поручите подбор консьержу.</p><div class="row" style="justify-content:center;gap:.5rem"><a class="btn btn--ghost" href="${resetHref()}">Сбросить фильтры</a><a class="btn btn--primary" href="#/concierge">Консьержу</a></div></div>` : ''}
        </div></div>
    </div></section>`;
  }

  // ----- Витрина -----
  function pageHome(head, params = {}) {
    syncNavReturn(params);
    const topMasters = masters().filter((p) => info(p.id).verified).sort((a, b) => b.rating - a.rating).slice(0, 4);
    const pins = D.partners.filter((p) => info(p.id).x).map((p) => ({ x: info(p.id).x, y: info(p.id).y, title: p.name, href: catalogHref(`/catalog/${p.id}`), dist: info(p.id).district, cls: p.kind === 'store' ? 'is-store' : '' }));
    return `<section class="section--tight"><div class="wrap shop">${head}
      <div class="ways">${[['goods', 'package', 'Нужен товар', 'плитка, кирпич, щебень, свет…'], ['services', 'wrench', 'Нужен мастер', 'плиточник, каменщик, кровельщик…'], ['stores', 'store', 'Магазин рядом', 'адреса, часы, шоурумы'], ['masters', 'users', 'Компания под ключ', 'договор и смета']].map(([s, ic, t, sub]) => `<a class="way" href="${href({ sec: s })}"><span class="way__ico">${icon(ic, 'i--20')}</span><div><b>${t}</b><small>${sub}</small></div>${icon('arrow-right')}</a>`).join('')}</div>
      ${window.RC_R(2) ? `<div class="shop-sec"><div class="shop-h"><h3>Под задачу ${window.RC.rel2()}</h3><span class="xs muted">товары + мастер одним списком</span></div><div class="kits">${C.kits.map(kitCard).join('')}</div></div>` : ''}
      ${window.RC_R(2) ? `<div class="shop-sec"><div class="shop-h"><h3>По помещению ${window.RC.rel2()}</h3><span class="xs muted">материалы, сантехника, свет и мастера — для одной комнаты</span></div><div class="roomgrid">${C.rooms.map(roomCard).join('')}</div></div>` : ''}
      <div class="shop-sec"><div class="shop-h"><h3>По этапу ремонта</h3><span class="xs muted">соберите всё нужное — этап закроется галочкой</span></div>${routeStrip('', false)}</div>
      <div class="shop-sec"><div class="shop-h"><h3>Товары</h3><a class="link small" href="${href({ sec: 'goods' })}">Все ${C.products.length} ${icon('arrow-right')}</a></div>
        ${(C.categoryGroups || [{ id: 'interior', title: '' }]).map((gr) => `<div class="catgroup"><div class="catgroup__h"><b>${gr.title}</b>${gr.id !== 'interior' ? window.RC.rel2() : ''}${gr.note ? `<span class="xs muted">${gr.note}</span>` : ''}</div><div class="tiles">${C.categories.filter((c) => (c.group || 'interior') === gr.id).map(tile).join('')}</div></div>`).join('')}</div>
      <div class="shop-sec"><div class="shop-h"><h3>Услуги мастеров</h3><a class="link small" href="${href({ sec: 'services' })}">Все ${C.services.length} ${icon('arrow-right')}</a></div><div class="subs subs--svc">${C.serviceGroups.map((g) => `<a class="subc" href="${href({ sec: 'services', sub: g.id })}"><span class="subc__ph">${icon(g.icon)}</span><b>${g.title}</b><small>${g.items.length}</small></a>`).join('')}</div>
        <div class="goods goods--svc" style="margin-top:.75rem">${C.services.filter((s) => s.tags.includes('hit')).slice(0, 4).map(serviceCard).join('')}</div></div>
      <div class="shop-sec"><div class="shop-h"><h3>Мастера и компании</h3><a class="link small" href="${href({ sec: 'masters' })}">Все ${masters().length} ${icon('arrow-right')}</a></div><div class="mgrid">${topMasters.map(masterCard).join('')}</div></div>
      <div class="shop-sec"><div class="shop-h"><h3>Магазины рядом</h3><a class="link small" href="${href({ sec: 'stores', view: window.RC_R(2) ? 'map' : 'grid' })}">${window.RC_R(2) ? 'На карте' : 'Все'} ${icon('arrow-right')}</a></div>
        ${window.RC_R(2) ? `<div class="near"><div class="near__map">${mapSvg(pins, '')}<div class="chips chips--scroll near__dists">${C.districts.map((d) => `<a class="chip" href="${href({ dist: d.id })}">${d.title}</a>`).join('')}</div></div><div class="near__list">${stores().slice(0, 6).map(storeCard).join('')}</div></div>` : `<div class="mgrid">${stores().slice(0, 4).map(storeCard).join('')}</div>`}</div>
      ${window.RC_R(2) ? `<div class="shop-sec"><div class="shop-h"><h3>По стилю ${window.RC.rel2()}</h3><span class="xs muted">как в калькуляторе — подберём материалы под выбранный стиль</span></div><div class="stylerow">${C.styles.map((s) => `<a class="stylec" href="${href({ style: s.id })}"><img src="${s.img}" alt="" loading="lazy"><b>${s.title}</b></a>`).join('')}</div></div>` : ''}
      <div class="shop-sec"><div class="shop-h"><h3>Популярное</h3><a class="link small" href="${href({ sec: 'goods', tag: 'hit' })}">Все хиты ${icon('arrow-right')}</a></div><div class="goods">${C.products.filter((p) => p.tags.includes('hit')).slice(0, 8).map(productCard).join('')}</div></div>
      <p class="xs" style="margin-top:1.5rem">Продавец или мастер? Разместите товары и услуги в кабинете партнёра — <a class="link" href="../partner/index.html">prof.remcard.ru</a>. Карточки появятся здесь с теми же фильтрами.</p>
    </div></section>`;
  }

  // ---------- Товар ----------
  const gal = { id: null, i: 0 };
  function pageProduct(params) {
    syncNavReturn(params);
    const returnBar = catalogNavReturnBar(params);
    const { id } = params;
    const p = prod(id); if (!p) return `<section class="section"><div class="wrap"><div class="empty">Товар не найден. <a class="link" href="${href()}">В каталог</a></div></div></section>`;
    if (gal.id !== id) { gal.id = id; gal.i = 0; }
    const s = seller(p.seller); const si = info(s.id); const c = catOf(p.cat); const st = stageOf(c.stage);
    const install = C.services.filter((x) => x.cats.includes(p.cat)).slice(0, 2);
    const more = C.products.filter((x) => x.id !== p.id && (x.cat === p.cat || C.kits.some((k) => k.products.includes(p.id) && k.products.includes(x.id)))).slice(0, 4);
    const siblings = C.products.filter((x) => x.id !== p.id && x.name === p.name && x.cat === p.cat);
    const specs = { ...Object.fromEntries(Object.entries(p.attrs).filter(([k]) => !['Наличие', 'Доставка'].includes(k))), ...p.specs };
    return `<section class="section--tight"><div class="wrap shop">
      ${returnBar}
      <div class="crumbs"><a href="${href()}">Каталог</a>${icon('chevron-right')}<a href="${href({ sec: 'goods', cat: c.id })}">${c.title}</a>${p.sub ? `${icon('chevron-right')}<a href="${href({ sec: 'goods', cat: c.id, sub: p.sub })}">${p.sub}</a>` : ''}</div>
      <div class="pd">
        <div class="pd__gal"><button type="button" class="pd__main" data-zoom="${gal.i}"><img src="${p.imgs[gal.i]}" alt="${esc(p.name)}">${tagPill(p.tags)}<span class="pd__zoom">${icon('zoom-in')}</span></button>
          ${p.imgs.length > 1 ? `<div class="pd__thumbs">${p.imgs.map((im, i) => `<button type="button" class="${i === gal.i ? 'is-on' : ''}" data-thumb="${i}"><img src="${im}" alt=""></button>`).join('')}</div>` : ''}</div>
        <div class="pd__info">
          <span class="xs muted">${esc(p.brand)}</span><h1 class="pd__name">${esc(p.name)}</h1><p class="pd__var">${esc(p.variant || '')}</p>
          <div class="pd__price">${rub(p.price)}<small> / ${p.unit}</small>${p.oldPrice ? `<s>${rub(p.oldPrice)}</s>` : ''}</div>
          <div class="row" style="gap:.6rem;margin:.5rem 0 1rem;flex-wrap:wrap">${avail(p)}<span class="xs muted">${icon('truck')} ${esc(p.attrs['Доставка'])}${si.pickup ? ' · самовывоз' : ''}</span></div>
          ${p.sizes ? `<div class="pd__opt"><span>Размер</span><div class="chips">${p.sizes.map((x, i) => `<button class="chip ${i === 0 ? 'is-on' : ''}" data-opt>${x}</button>`).join('')}</div></div>` : ''}
          ${p.colors && p.colors.length > 1 ? `<div class="pd__opt"><span>Цвет</span><div class="chips">${p.colors.map((x, i) => `<button class="chip chip--sw ${i === 0 ? 'is-on' : ''}" data-opt><i style="background:${swatch(x)}"></i>${x}</button>`).join('')}</div></div>` : ''}
          ${siblings.length ? `<div class="pd__opt"><span>Другие варианты</span><div class="sibs">${siblings.map((x) => `<a class="sib" href="${catPath('/catalog/p/' + x.id)}"><img src="${x.imgs[0]}" alt=""><small>${esc(x.variant)}</small></a>`).join('')}</div></div>` : ''}
          <div class="row" style="gap:.5rem;margin-top:1.1rem"><button class="btn btn--primary btn--lg grow ${inCart('p', p.id) ? 'is-on' : ''}" data-cart="p:${p.id}">${inCart('p', p.id) ? `${icon('check')} В списке` : `${icon('plus')} В список покупок`}</button><button class="btn btn--ghost btn--lg" id="pd-ask">${icon('message-circle')} Спросить</button></div>
          <a class="seller" href="${catPath('/catalog/' + s.id)}"><img class="seller__ph" src="${si.photo}" alt=""><div><b>${esc(s.name)} ${si.verified ? icon('badge-check') : ''}</b><small>${icon('star')} ${s.rating} · ${s.reviews} ${plural(s.reviews, 'отзыв', 'отзыва', 'отзывов')} · ${icon('map-pin')} ${esc(si.addr || s.city)}</small></div><span class="pill pill--green">${esc(s.price.replace('Скидка партнёрам', 'Скидка').replace('Скидка клиентам RemCard', 'Скидка'))}</span></a>
          <p style="margin-top:1rem">${esc(p.desc)}</p>
          <dl class="specs">${Object.entries(specs).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl>
          <div class="chips" style="margin-top:.9rem">${p.rooms.map((r) => `<a class="chip" href="${href({ room: r })}">${roomOf(r).title}</a>`).join('')}${p.styles.slice(0, 3).map((x) => `<a class="chip" href="${href({ sec: 'goods', style: x })}">${styleOf(x).title}</a>`).join('')}</div>
          <a class="stagelink" href="${href({ stage: st.id })}">${icon(st.icon)}<span>Этап «${st.title}»</span><small>посмотреть всё для этапа</small>${icon('chevron-right')}</a>
        </div></div>
      ${install.length ? `<div class="shop-sec"><div class="shop-h"><h3>Кто установит</h3></div><div class="goods goods--svc">${install.map(serviceCard).join('')}</div></div>` : ''}
      ${more.length ? `<div class="shop-sec"><div class="shop-h"><h3>Дополнить</h3><a class="link small" href="${href({ sec: 'goods', cat: c.id })}">Вся категория ${icon('arrow-right')}</a></div><div class="goods">${more.map(productCard).join('')}</div></div>` : ''}
    </div></section>`;
  }
  function bindProduct(id) {
    const p = prod(id); if (!p) return;
    qsa('[data-thumb]').forEach((b) => b.onclick = () => { gal.i = +b.dataset.thumb; renderApp(); });
    const m = qs('[data-zoom]'); if (m) m.onclick = () => openGallery(p.imgs, p.name, p.variant);
    qsa('[data-opt]').forEach((b) => b.onclick = () => qsa('.chip', b.parentElement).forEach((x) => x.classList.toggle('is-on', x === b)));
    const ask = qs('#pd-ask'); if (ask) ask.onclick = () => toast('Открываем чат с продавцом (в прототипе — заглушка)');
  }
  function openGallery(imgs, name, sub = '') {
    const render = () => `<div class="pgal"><button class="gallery__close" data-close aria-label="Закрыть">${icon('x')}</button><img class="pgal__img" src="${imgs[gal.i]}" alt="${esc(name)}">
      ${imgs.length > 1 ? `<button class="gallery__nav gallery__nav--prev" data-g="-1">${icon('chevron-left')}</button><button class="gallery__nav gallery__nav--next" data-g="1">${icon('chevron-right')}</button>` : ''}
      <div class="gallery__bar"><h3>${esc(name)} <span class="muted" style="font-weight:600">${esc(sub || '')}</span></h3>${imgs.length > 1 ? `<span class="xs">${gal.i + 1} / ${imgs.length}</span>` : ''}</div></div>`;
    const wire = () => {
      qsa('#modal [data-g]').forEach((b) => b.onclick = () => { gal.i = (gal.i + +b.dataset.g + imgs.length) % imgs.length; qs('#modal .modal__box').innerHTML = render(); wire(); });
      qsa('#modal [data-close]').forEach((x) => x.onclick = () => { closeModal(); renderApp(); });
    };
    modal(render(), { onOpen: () => { qs('#modal .modal__box').classList.add('modal__box--gallery'); wire(); } });
    wire();
  }

  // ---------- Услуга ----------
  function pageService(params) {
    syncNavReturn(params);
    const returnBar = catalogNavReturnBar(params);
    const { id } = params;
    const sv = svc(id); if (!sv) return `<section class="section"><div class="wrap"><div class="empty">Услуга не найдена. <a class="link" href="${href()}">В каталог</a></div></div></section>`;
    const s = seller(sv.seller); const si = info(s.id); const st = stageOf(sv.stage); const gr = C.serviceGroups.find((g) => g.id === sv.group);
    const goods = C.products.filter((p) => sv.cats.includes(p.cat)).slice(0, 4);
    const others = C.services.filter((x) => x.id !== sv.id && x.group === sv.group).slice(0, 2);
    return `<section class="section--tight"><div class="wrap shop">
      ${returnBar}
      <div class="crumbs"><a href="${href()}">Каталог</a>${icon('chevron-right')}<a href="${href({ sec: 'services' })}">Услуги</a>${icon('chevron-right')}<a href="${href({ sec: 'services', sub: gr.id })}">${gr.title}</a></div>
      <div class="pd"><div class="pd__gal"><div class="pd__main pd__main--wide"><img src="${sv.img}" alt="${esc(sv.title)}">${tagPill(sv.tags)}</div>${si.portfolio && si.portfolio.length ? `<div class="pd__thumbs">${si.portfolio.slice(0, 4).map((im, i) => `<button type="button" data-folio="${i}"><img src="${im}" alt=""></button>`).join('')}</div>` : ''}</div>
        <div class="pd__info"><h1 class="pd__name">${esc(sv.title)}</h1><p class="pd__var">${esc(sv.desc)}</p>
          <div class="pd__price">${esc(sv.price)}</div>
          <div class="facts">${[['shield-check', sv.attrs['Гарантия'] ? 'Гарантия ' + sv.attrs['Гарантия'] : ''], ['file-check', sv.attrs['Договор и чек'] === 'Да' ? 'Договор и чек' : ''], ['package', sv.attrs['С материалами'] === 'Да' ? 'Может закупить материалы' : 'Материалы — ваши'], ['calendar', 'Старт: ' + sv.attrs['Когда может начать'].toLowerCase()]].filter(([, t]) => t).map(([ic, t]) => `<span>${icon(ic)} ${t}</span>`).join('')}</div>
          <ul class="list list--check" style="margin:.75rem 0 1rem">${sv.includes.map((x) => `<li>${icon('circle-check')}<span>${x}</span></li>`).join('')}</ul>
          <div class="row" style="gap:.5rem"><button class="btn btn--primary btn--lg grow" id="sv-quote">${icon('send')} Запросить смету</button><button class="btn btn--ghost btn--lg ${inCart('s', sv.id) ? 'is-on' : ''}" data-cart="s:${sv.id}">${inCart('s', sv.id) ? icon('check') : icon('plus')} В список</button></div>
          <a class="seller" href="${catPath('/catalog/' + s.id)}"><img class="seller__ph seller__ph--round" src="${si.photo}" alt=""><div><b>${esc(s.name)} ${si.verified ? icon('badge-check') : ''}</b><small>${icon('star')} ${s.rating} · ${s.reviews} ${plural(s.reviews, 'отзыв', 'отзыва', 'отзывов')}${s.years ? ` · опыт ${s.years} лет` : ''}</small></div>${icon('chevron-right')}</a>
          <p class="small" style="margin-top:1rem">${esc(s.about)}</p>
          <div class="pd__opt" style="margin-top:.9rem"><span>Выезд</span><div class="chips">${sv.districts.map((d) => `<a class="chip" href="${href({ sec: 'services', dist: d })}">${distOf(d).title}</a>`).join('')}</div></div>
          <a class="stagelink" href="${href({ stage: st.id })}">${icon(st.icon)}<span>Этап «${st.title}»</span><small>посмотреть всё для этапа</small>${icon('chevron-right')}</a>
        </div></div>
      ${goods.length ? `<div class="shop-sec"><div class="shop-h"><h3>Что понадобится</h3></div><div class="goods">${goods.map(productCard).join('')}</div></div>` : ''}
      ${others.length ? `<div class="shop-sec"><div class="shop-h"><h3>Ещё в разделе «${gr.title}»</h3></div><div class="goods goods--svc">${others.map(serviceCard).join('')}</div></div>` : ''}
    </div></section>`;
  }

  // ---------- Партнёр: мастер, компания или магазин ----------
  const ptab = { id: null, t: '' };
  function pagePartner(params) {
    syncNavReturn(params);
    const returnBar = catalogNavReturnBar(params);
    const { id } = params;
    const p = D.partners.find((x) => x.id === id);
    if (!p) return `<section class="section"><div class="wrap"><div class="empty">Партнёр не найден. <a class="link" href="${href()}">В каталог</a></div></div></section>`;
    const i = info(p.id); const isStore = p.kind === 'store'; const goods = partnerGoods(p.id); const svcs = partnerSvcs(p.id); const open = openNow(i.hours);
    const tabs = [goods.length ? ['goods', `Товары · ${goods.length}`] : null, svcs.length ? ['svcs', `Услуги · ${svcs.length}`] : null, i.portfolio && i.portfolio.length ? ['folio', 'Портфолио'] : null, ['reviews', `Отзывы · ${p.reviews}`], ['about', 'О партнёре']].filter(Boolean);
    if (ptab.id !== id || !tabs.some(([t]) => t === ptab.t)) { ptab.id = id; ptab.t = tabs[0][0]; }
    const proj = activeProject();
    const stagesL1 = (window.NAV && window.NAV.stagesL1) || [];
    const bodies = {
      /* Каталог продавца из 1С: поиск и фильтры «как в ЛК» (seller-filters.js); у остальных продавцов — прежний список. */
      goods: () => (window.RCSellerFilters && window.RCSellerFilters.enabled(p.id) ? window.RCSellerFilters.render(p, goods, productCard) : `<div class="chips" style="margin-bottom:.9rem">${[...new Set(goods.map((g) => g.cat))].map((c) => `<a class="chip" href="${href({ sec: 'goods', cat: c, seller: p.id })}">${catOf(c).title} <em>${goods.filter((g) => g.cat === c).length}</em></a>`).join('')}</div><div class="goods">${goods.map(productCard).join('')}</div>`),
      svcs: () => `<div class="goods goods--svc">${svcs.map(serviceCard).join('')}</div>`,
      folio: () => `<div class="folio">${i.portfolio.map((im, k) => `<button type="button" data-folio="${k}"><img src="${im}" alt="" loading="lazy"></button>`).join('')}</div>`,
      reviews: () => `<div class="stack" style="gap:.6rem">${[['Ольга, Краснодар', 'Всё по срокам, аккуратно, с фотоотчётом по скрытым работам.', '5.0'], ['Андрей, Новороссийск', 'Смету сверили со средними ценами — без накруток. Рекомендую.', '5.0'], ['Марина, ФМР', isStore ? 'Помогли с раскладкой и посчитали запас. Привезли на следующий день.' : 'Пришёл вовремя, после себя убрал. Вопросы решал по телефону быстро.', '4.8']].map(([a, t, r]) => `<div class="evt"><div><b class="ink">${a}</b><small>${t}</small></div><span class="pill pill--amber">${icon('star')} ${r}</span></div>`).join('')}</div>`,
      about: () => `<p>${esc(p.about)}</p><div class="chips" style="margin:1rem 0">${partnerTags(p).map((t) => `<span class="chip" style="pointer-events:none">${esc(t)}</span>`).join('')}</div>
        <h4 style="margin:1rem 0 .6rem">Этапы маршрута, на которых поможет</h4><div class="stack" style="gap:.4rem">${p.stages.map((sid) => { const s = stagesL1.find((x) => x.id === sid); return s ? `<a class="evt" href="#/navigator?stage=${sid}"><div class="row" style="gap:.6rem;flex-wrap:nowrap"><span class="bar__ico">${window.RC.stageIcon(sid)}</span><div><b class="ink">${s.title}</b><small>${esc(s.description)}</small></div></div>${icon('chevron-right')}</a>` : ''; }).join('')}</div>`,
    };
    const pins = i.x ? [{ x: i.x, y: i.y, title: p.name, href: '#', dist: i.district, cls: isStore ? 'is-store' : '' }] : [];
    return `<section class="section--tight"><div class="wrap shop">
      ${returnBar}
      <div class="crumbs"><a href="${href()}">Каталог</a>${icon('chevron-right')}<a href="${href({ sec: isStore ? 'stores' : 'masters' })}">${isStore ? 'Магазины' : 'Мастера и компании'}</a></div>
      <div class="phero"><img class="phero__bg" src="${isStore || !i.portfolio.length ? i.photo : i.portfolio[0]}" alt="">
        <div class="phero__in">${!isStore ? `<img class="phero__av" src="${i.photo}" alt="">` : ''}<div class="phero__t"><span class="pill pill--light">${D.kinds[p.kind]}</span><h1>${esc(p.name)} ${i.verified ? `<span class="ver" title="Проверен RemCard">${icon('badge-check')}</span>` : ''}</h1>
          <div class="phero__meta">${stars(p.rating)}<span>${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}</span>${p.years ? `<span>опыт ${p.years} лет</span>` : i.since ? `<span>с ${i.since} года</span>` : ''}<span>${icon('map-pin')} ${i.district ? distOf(i.district).title + ', ' : ''}${esc(p.city)}</span></div></div></div></div>
      <div class="pgrid">
        <div>
          <div class="facts facts--lg">${[i.verified ? ['badge-check', 'Проверен RemCard'] : null, i.contract ? ['file-check', 'Договор и чек'] : null, i.showroom ? ['store', 'Шоурум'] : null, i.pickup ? ['package', 'Самовывоз'] : null, i.delivery ? ['truck', i.delivery] : null].filter(Boolean).map(([ic, t]) => `<span>${icon(ic)} ${t}</span>`).join('')}</div>
          <div class="ptabs">${tabs.map(([t, l]) => `<button type="button" class="${ptab.t === t ? 'is-on' : ''}" data-ptab="${t}">${l}</button>`).join('')}</div>
          <div class="ptab-body">${bodies[ptab.t]()}</div>
        </div>
        <aside class="pside">
          <div class="card"><h3 style="margin-bottom:.9rem">${esc(p.price.replace('Скидка партнёрам', 'Скидка RemCard').replace('Скидка клиентам RemCard', 'Скидка RemCard'))}</h3>
            <button class="btn btn--primary btn--block" id="d-contact">${icon('message-circle')} Написать</button><button class="btn btn--ghost btn--block" id="d-call" style="margin-top:.5rem">${icon('phone')} Показать телефон</button>
            ${proj ? `<a class="btn btn--ghost btn--block" href="#/navigator" style="margin-top:.5rem">${icon('hand-helping')} Поручить задачи из маршрута</a>` : ''}
            <p class="xs" style="margin-top:.9rem">Скидка действует при обращении через RemCard. Споры и гарантии — через консьержа.</p></div>
          <div class="card card--soft pinfo"><div>${icon('map-pin')}<div><b>${isStore ? 'Адрес' : 'Выезд'}</b><small>${esc(i.addr || p.city)}</small></div></div><div>${icon('clock')}<div><b>${open === null ? 'Часы работы' : open ? `<span class="ok">${isStore ? 'Открыто сейчас' : 'Сейчас на связи'}</span>` : isStore ? 'Сейчас закрыто' : 'Ответит в рабочее время'}</b><small>${esc(i.hours || '')}</small></div></div>
            ${pins.length ? mapSvg(pins, i.district) : ''}${isStore ? `<a class="link small" href="${href({ sec: 'stores', view: 'map', dist: i.district })}">Другие магазины рядом ${icon('arrow-right')}</a>` : `<a class="link small" href="${href({ sec: 'masters', dist: i.district })}">Другие мастера в районе ${icon('arrow-right')}</a>`}</div>
        </aside></div>
    </div></section>`;
  }

  // ---------- Набор под задачу ----------
  function pageKit(params) {
    syncNavReturn(params);
    const returnBar = catalogNavReturnBar(params);
    const { id } = params;
    const k = C.kits.find((x) => x.id === id); if (!k) return `<section class="section"><div class="wrap"><div class="empty">Набор не найден. <a class="link" href="${href()}">В каталог</a></div></div></section>`;
    const ps = k.products.map(prod), ss = k.services.map(svc); const st = stageOf(k.stage);
    const total = ps.reduce((s, p) => s + p.price, 0);
    const all = [...k.products.map((x) => ['p', x]), ...k.services.map((x) => ['s', x])];
    const added = all.filter(([t, x]) => inCart(t, x)).length;
    return `<section class="section--tight"><div class="wrap shop">
      ${returnBar}
      <div class="crumbs"><a href="${href()}">Каталог</a>${icon('chevron-right')}<span>Под задачу</span></div>
      <div class="kithead"><span class="kit__ico kit__ico--lg">${icon(k.icon, 'i--24')}</span><div><h1 class="pd__name">${k.title}</h1><p class="small">${k.note}</p></div>
        <div class="kithead__sum"><span class="xs muted">${ps.length ? 'Товары от' : 'Услуги'}</span><b>${ps.length ? rub(total) : ss.map((s) => s.price).join(', ')}</b>${ss.length && ps.length ? `<small>+ работа: ${ss.map((s) => s.price).join(', ')}</small>` : ''}</div></div>
      <div class="row" style="gap:.5rem;margin:1rem 0 1.5rem"><button class="btn btn--primary btn--lg" id="kit-all" ${added === all.length ? 'disabled' : ''}>${added === all.length ? `${icon('check')} Всё в списке` : `${icon('plus')} Добавить всё в список${added ? ` (${all.length - added})` : ''}`}</button><a class="btn btn--ghost btn--lg" href="${href({ stage: st.id })}">${icon(st.icon)} Этап «${st.title}»</a></div>
      ${ss.length ? `<div class="shop-sec"><div class="shop-h"><h3>Мастер</h3></div><div class="goods goods--svc">${ss.map(serviceCard).join('')}</div></div>` : ''}
      ${ps.length ? `<div class="shop-sec"><div class="shop-h"><h3>Товары</h3><span class="xs muted">можно заменить на аналог из категории</span></div><div class="goods">${ps.map(productCard).join('')}</div></div>` : ''}
    </div></section>`;
  }

  function renderListRow(c, stale) {
    const line = coerceCartLine(c);
    const isP = c.type === 'p';
    const catalogId = line ? line.id : null;
    const qtyN = line ? line.qty : sanitizeCartQty(c.qty);
    const qtyLabel = cartQtyText(qtyN);
    const o = catalogId ? (isP ? prodOrNull(catalogId) : svcOrNull(catalogId)) : null;
    if (!catalogId) {
      const rawId = esc(String(c.id ?? '').slice(0, 120));
      return `<div class="litem litem--stale"><div class="litem__body"><b>${esc(isP ? 'Товар' : 'Услуга')}</b><small class="muted">${rawId ? `${rawId} · ` : ''}некорректный идентификатор в сохранённом списке.</small></div></div>`;
    }
    if (!o) {
      return `<div class="litem litem--stale"><div class="litem__body min-w-0"><b class="break-words">${esc(isP ? `Товар ${catalogId}` : `Услуга ${catalogId}`)}</b><small class="muted">Сохранено в списке, но позиции нет в каталоге.</small></div>
        <div class="litem__ctl litem__ctl--stale">${isP ? `<div class="qty"><button type="button" class="cart-qty-btn" data-qty="${escAttr(catalogId)}:-1" ${cartReadonly ? 'disabled' : ''} aria-label="Уменьшить">${icon('minus')}</button><span class="cart-qty-num">${qtyLabel}</span><button type="button" class="cart-qty-btn" data-qty="${escAttr(catalogId)}:1" ${cartReadonly ? 'disabled' : ''} aria-label="Увеличить">${icon('plus')}</button></div>` : ''}<button type="button" class="iconb cart-qty-btn" data-cart="${escAttr(line.type)}:${escAttr(catalogId)}" aria-label="Убрать" ${cartReadonly ? 'disabled' : ''}>${icon('trash-2')}</button></div></div>`;
    }
    const s = isP ? offSeller(o) : seller(o.seller);
    const price = isP ? offPrice(o) : 0; const place = isP ? offPlace(o) : '';
    const rowType = line ? line.type : (isP ? 'p' : 's');
    return `<div class="litem"><a href="${catalogHref(`/catalog/${isP ? 'p' : 's'}/${esc(o.id)}`)}" class="litem__img"><img src="${isP ? o.imgs[0] : o.img}" alt=""></a><div class="litem__body"><b>${esc(isP ? prodTitle(o) : o.title)}</b><small>${esc(s.name)}${place ? ` · ${esc(place)}` : ''} · ${isP ? rub(price) + ' / ' + esc(o.unit) : esc(o.price)}</small>${isP && window.RCCatOrder ? window.RCCatOrder.rowVariant(o, qtyN) : ''}</div>
      <div class="litem__ctl">${isP ? `<div class="qty"><button data-qty="${escAttr(catalogId)}:-1" ${cartReadonly ? 'disabled' : ''}>${icon('minus')}</button><span>${qtyLabel}</span><button data-qty="${escAttr(catalogId)}:1" ${cartReadonly ? 'disabled' : ''}>${icon('plus')}</button></div><b class="litem__sum">${rub(price * qtyN)}</b>` : '<span class="pill">смета по запросу</span>'}<button class="iconb" data-cart="${escAttr(rowType)}:${escAttr(catalogId)}" aria-label="Убрать" ${cartReadonly ? 'disabled' : ''}>${icon('trash-2')}</button></div></div>`;
  }

  // ---------- Список покупок ----------
  function pageList(params = {}) {
    syncNavReturn(params);
    const returnBar = catalogNavReturnBar(params);
    state.cart = sanitizeCartState(state.cart);
    const byStage = {};
    const unknown = [];
    state.cart.forEach((c) => {
      const sid = cartItemStage(c);
      if (!sid) { unknown.push(c); return; }
      if (!byStage[sid]) byStage[sid] = [];
      byStage[sid].push(c);
    });
    const groups = C.stages.map((st) => ({ st, items: byStage[st.id] || [] })).filter((g) => g.items.length);
    const total = cartTotal(); const svcs = state.cart.filter((c) => c.type === 's' && svcOrNull(c.id));
    const notice = cartStorageNotice();
    const storageNoticeBlock = `<p class="notice ${cartReadonly ? 'notice--warn' : 'notice--soft'}" style="margin:.75rem 0 0;font-size:var(--text-xs)">${esc(notice)}</p>`;
    return `<section class="section--tight"><div class="wrap shop shop--narrow">
      ${returnBar}
      <div class="crumbs"><a href="${href()}">Каталог</a>${icon('chevron-right')}<span>Список покупок</span></div>
      ${storageNoticeBlock}
      <div class="row" style="justify-content:space-between;align-items:flex-end;gap:1rem"><h1 class="pd__name">Список покупок</h1>${state.cart.length ? `<button class="link small" id="list-clear">Очистить</button>` : ''}</div>
      ${!state.cart.length ? `<div class="empty" style="margin-top:1rem"><h3>Пока пусто</h3><p style="margin:.4rem 0 1rem">Нажимайте «+» на товарах и услугах — соберём список по этапам.</p><a class="btn btn--primary" href="${href()}">В каталог</a></div>` : `
      ${routeStrip('', true)}
      ${groups.map(({ st, items }) => { const pr = stageProgress(st); return `<div class="lgroup"><div class="lgroup__h"><span class="sroute__ico">${icon(st.icon)}</span><b>${st.title}</b><span class="pill ${pr.done === pr.total ? 'pill--green' : ''}">${pr.done === pr.total ? 'собран' : `${pr.done} из ${pr.total}`}</span></div>
        ${items.map((c) => renderListRow(c)).join('')}
        ${pr.done < pr.total ? `<div class="chips" style="margin-top:.5rem"><span class="xs muted" style="align-self:center">Ещё нужно:</span>${st.need.filter((nd) => !needDone(nd)).map((nd) => `<a class="chip" href="${needHref(nd, st.id)}">${needLabel(nd)}</a>`).join('')}</div>` : ''}</div>`; }).join('')}
      ${unknown.length ? `<div class="lgroup"><div class="lgroup__h"><b>Нет в каталоге</b><span class="cart-stale-pill">сохранено</span></div><ul class="litems litems--stale">${unknown.map((c) => renderListRow(c, true)).join('')}</ul></div>` : ''}
      <div class="card card--pad-lg ltotal"><div class="row" style="justify-content:space-between"><span>Товары</span><b>${rub(total)}</b></div>${svcs.length ? `<div class="row" style="justify-content:space-between"><span>Работы</span><span class="muted">${svcs.length} ${plural(svcs.length, 'смета', 'сметы', 'смет')} по запросу</span></div>` : ''}
        <div class="row" style="gap:.5rem;margin-top:1rem"><button class="btn btn--primary btn--lg grow" id="list-send">${icon('send')} Отправить продавцам</button><a class="btn btn--ghost btn--lg" href="#/concierge">Консьержу</a></div>
        <p class="xs" style="margin-top:.75rem">Продавцы получат список в своём кабинете и ответят в чате по заявке на RemCard. Оплата — при покупке у продавца. Прототип: заявка хранится только в этой вкладке.</p></div>`}
    </div></section>`;
  }

  function wireCatalogNavReturnLinks(root = document) {
    if (!NR.nrp) return;
    qsa('a[href^="#/catalog"]', root).forEach((a) => {
      const h = a.getAttribute('href');
      if (!h || h.includes('nrp=')) return;
      const nh = catalogHref(h.replace(/^#/, ''));
      if (nh !== h) a.setAttribute('href', nh);
    });
  }

  // ---------- Привязки ----------
  let sugT;
  function bindCommon(path, params) {
    const navRet = qs('#catalog-nav-return');
    if (navRet) {
      navRet.onclick = () => {
        const routeParams = (params && Object.keys(params).length ? params : null) || (window.RC.parseHash?.() || {}).params || {};
        const p = returnParamsFromRoute(routeParams);
        if (!window.RCNav?.performCatalogReturn?.(p)) toast('Шаг недоступен');
      };
    }
    wireCatalogNavReturnLinks(qs('#app') || document);
    qsa('[data-cart]').forEach((b) => b.onclick = (e) => { e.preventDefault(); const [t, id] = b.dataset.cart.split(':'); toggleCart(t, id); });
    const qi = qs('#shop-q'); const box = qs('#sug-box');
    if (qi) {
      const run = () => { box.innerHTML = ''; go(href({ q: qi.value.trim(), sec: F.sec })); };
      qi.onkeydown = (e) => { if (e.key === 'Enter') run(); if (e.key === 'Escape') box.innerHTML = ''; };
      qi.oninput = () => { clearTimeout(sugT); sugT = setTimeout(() => { box.innerHTML = suggestions(qi.value); }, 120); };
      qi.onfocus = () => { if (qi.value.trim().length >= 2) box.innerHTML = suggestions(qi.value); };
      document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.innerHTML = ''; }, { once: true });
    }
    const s = qs('#shop-sort'); if (s) s.onchange = () => go(href({ sort: s.value }));
    // Панель фильтров: цена (поля и ползунки), сворачивание групп, мобильная шторка
    const fs = qs('#fside');
    if (fs) {
      const apply = () => go(href({ min: qs('[data-fnum="min"]', fs).value, max: qs('[data-fnum="max"]', fs).value }));
      qsa('[data-fnum]', fs).forEach((inp) => { inp.onchange = apply; inp.onkeydown = (e) => { if (e.key === 'Enter') apply(); }; });
      let rT; qsa('[data-frange]', fs).forEach((r) => r.oninput = () => { const lo = qs('[data-frange="min"]', fs), hi = qs('[data-frange="max"]', fs); if (+lo.value > +hi.value) { if (r === lo) hi.value = lo.value; else lo.value = hi.value; } qs('[data-fnum="min"]', fs).value = +lo.value === +lo.min ? '' : lo.value; qs('[data-fnum="max"]', fs).value = +hi.value === +hi.max ? '' : hi.value; const wrap = r.closest('.rslider'); const pct = (v) => ((v - +lo.min) / (+lo.max - +lo.min)) * 100; wrap.style.setProperty('--a', pct(+lo.value) + '%'); wrap.style.setProperty('--b', pct(+hi.value) + '%'); clearTimeout(rT); rT = setTimeout(apply, 350); });
      qsa('details.fg', fs).forEach((d) => d.ontoggle = () => { if (d.open) ui.closed.delete(d.dataset.fg); else ui.closed.add(d.dataset.fg); });
      const close = () => { ui.fopen = false; fs.classList.remove('is-open'); document.body.classList.remove('fside-open'); };
      qs('#fside-x').onclick = close; qs('#fside-ok').onclick = close;
      const fb = qs('#fbtn'); if (fb) fb.onclick = () => { ui.fopen = true; fs.classList.add('is-open'); document.body.classList.add('fside-open'); };
      document.body.classList.toggle('fside-open', ui.fopen);
    } else document.body.classList.remove('fside-open');
    // Схема районов: клик по району — фильтр
    qsa('.rmap__d[data-dist]').forEach((d) => d.onclick = () => go(href({ dist: F.dist === d.dataset.dist ? '' : d.dataset.dist, view: F.view })));
    if (path.startsWith('/catalog/p/')) bindProduct(params.id);
    const folio = qsa('[data-folio]'); if (folio.length) { const imgs = folio.map((b) => qs('img', b).src); folio.forEach((b) => b.onclick = () => { gal.i = +b.dataset.folio; openGallery(imgs, 'Портфолио'); }); }
    qsa('[data-ptab]').forEach((b) => b.onclick = () => { ptab.t = b.dataset.ptab; renderApp(); });
    const quote = qs('#sv-quote'); if (quote) quote.onclick = () => toast('Запрос отправлен — мастер ответит в чате');
    const c = qs('#d-contact'); if (c) c.onclick = () => toast('Открываем чат с партнёром (в прототипе — заглушка)');
    const t = qs('#d-call'); if (t) t.onclick = () => { t.textContent = '+7 (861) 000-00-00'; };
    const ka = qs('#kit-all'); if (ka) ka.onclick = () => {
      const k = C.kits.find((x) => x.id === params.id);
      if (!k || !addKitToCart(k.products, k.services)) return;
      toast(`Набор «${k.title}» в списке`);
      renderApp();
    };
    qsa('[data-qty]').forEach((b) => b.onclick = () => {
      if (!ensureCartWritable()) return;
      const [id, d] = b.dataset.qty.split(':');
      const cc = state.cart.find((x) => x.type === 'p' && x.id === id);
      if (!cc) return;
      cc.qty = sanitizeCartQty(cc.qty + +d);
      persistCart();
      renderApp();
    });
    const clr = qs('#list-clear'); if (clr) clr.onclick = () => { if (!ensureCartWritable()) return; state.cart = []; persistCart(); renderApp(); };
    const send = qs('#list-send'); if (send) send.onclick = () => (window.RCCatOrder ? window.RCCatOrder.openForm() : toast('Демо: отправка не выполняется'));
  }

  route('/catalog', pageCatalog);
  route('/catalog/p/:id', pageProduct);
  route('/catalog/s/:id', pageService);
  route('/catalog/kit/:id', (p) => (window.RC_R(2) ? pageKit(p) : window.RC.release2Page('Наборы «под задачу»', 'Готовые комплекты товаров и мастера одним списком появятся во втором релизе.')));
  route('/catalog/list', pageList);
  route('/catalog/:id', pagePartner);
  document.addEventListener('rc:rendered', (e) => { if (e.detail.path.startsWith('/catalog')) bindCommon(e.detail.path, e.detail.params); else document.body.classList.remove('fside-open'); });
  window.RCCat = {
    productCard,
    serviceCard,
    masterCard,
    storeCard,
    routeStrip,
    currentStage,
    persistCart,
    cartStorageNotice,
    ensureCartWritable,
    addLinesFromMatcalc,
    repeatOrderItems,
    addKitToCart,
    sanitizeCartQty,
    __testHooks: {
      parseStoredCart,
      normalizeCartLines,
      dedupeCartLines,
      sanitizeCartQty,
      sanitizeCartId,
      coerceCartLine,
      escAttr,
      detectStorageBackend: () => detectStorageBackend(),
      CART_LS,
      syncNavReturn,
      clearNavReturn,
      navReturnQuery,
      href,
      catPath,
      catalogHref,
      catalogNavReturnBar,
      returnParamsFromRoute,
      wireCatalogNavReturnLinks,
      getNR: () => ({ ...NR }),
    },
  };
})();
