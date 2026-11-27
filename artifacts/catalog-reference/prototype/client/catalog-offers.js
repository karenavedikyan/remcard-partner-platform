/* RemCard — продавцы и цены одного товара (прототип).
   Карточку товара (фото, описание, характеристики) ведёт производитель — в примере «Тандор». Продавцы добавляют его
   модели в свой каталог и назначают свою цену, поэтому у одной модели несколько продавцов в разных городах.
   На странице товара клиент видит производителя и блок «Где купить»: продавец, город и адрес, цена, наличие.
   «Выбрать» меняет продавца и цену на странице, в списке покупок и в заявке. Выбор хранится в памяти вкладки.
   Цены продавцов демонстрационные; продавцы с пометкой «пример» в общий список партнёров не входят. */
(function () {
  const { D, esc, fmt, plural, qs, qsa, icon, renderApp } = window.RC;
  const C = window.RCCatalogData;
  if (!D || !C) return;
  const rub = (n) => `${fmt(n)} ₽`;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const MAKER = { brand: 'Tandoor', name: 'Тандор' };
  const HOME = 's6';
  /* Продавцы-примеры в других городах. */
  const DEMO = {
    dx1: { id: 'dx1', name: 'Салон дверей в Сочи', city: 'Сочи', demo: true },
    dx2: { id: 'dx2', name: 'Салон дверей в Ростове-на-Дону', city: 'Ростов-на-Дону', demo: true },
  };
  const partner = (id) => D.partners.find((p) => p.id === id) || null;
  const sellerById = (id) => partner(id) || DEMO[id] || null;
  const round10 = (n) => Math.max(10, Math.round(n / 10) * 10);
  /* Цены других продавцов считаются от РРЦ производителя (p.rrc), а не от цены, которую назначил этот продавец. */
  const shift = (p, key, lo, hi, own) => round10((own ? p.price : p.rrc || p.price) * (1 + (lo + (hash(`${key}:${p.id}`) % (hi - lo + 1))) / 100));
  const AV = { in: 'В наличии', soon: 'Скоро поступит', order: 'Под заказ' };

  const applies = (p) => !!p && p.brand === MAKER.brand && p.seller === HOME && typeof p.price === 'number';
  const cache = new Map();
  function list(p) {
    if (!applies(p)) return [];
    const key = `${p.id}:${p.price}`;
    if (cache.has(key)) return cache.get(key);
    const own = AV[p.avail] || AV.order;
    const rows = [
      { key: HOME, seller: HOME, city: 'Краснодар', addr: 'Ростовское шоссе, 30/3 и ещё 4 филиала', price: p.price, avail: own, branch: '' },
      { key: `${HOME}-nvr`, seller: HOME, city: 'Новороссийск', addr: 'ул. Исаева, 19', price: shift(p, 'nvr', 2, 4, true), avail: p.avail === 'in' ? 'Под заказ · 2–3 дня' : own, branch: 'Новороссийск, ул. Исаева, 19' },
      p.cat === 'doors' ? { key: 's2', seller: 's2', city: 'Краснодар', addr: 'ул. Тургенева, 138/6', price: shift(p, 's2', -2, 4), avail: 'Под заказ · 3–5 дней', branch: '' } : null,
      { key: 'dx1', seller: 'dx1', city: 'Сочи', addr: 'адрес — в заявке', price: shift(p, 'dx1', 3, 7), avail: 'Под заказ · 5–7 дней', branch: '' },
      { key: 'dx2', seller: 'dx2', city: 'Ростов-на-Дону', addr: 'адрес — в заявке', price: shift(p, 'dx2', -1, 5), avail: 'Под заказ · 4–6 дней', branch: '' },
    ].filter((o) => o && sellerById(o.seller));
    cache.set(key, rows);
    return rows;
  }
  const chosen = new Map(); /* id товара → ключ предложения */
  const pick = (p) => { const rows = list(p); return rows.find((o) => o.key === chosen.get(p.id)) || rows[0] || null; };
  const isDefault = (p) => { const o = pick(p); return !o || o.key === HOME; };
  const priceOf = (p) => { const o = pick(p); return o ? o.price : p.price; };
  const sellerOf = (p) => { const o = pick(p); return o ? sellerById(o.seller) : null; };
  const placeOf = (p) => { const o = pick(p); return o && o.key !== HOME ? `${o.city}${/в заявке/.test(o.addr) ? '' : `, ${o.addr}`}` : ''; };
  const branchOf = (p) => { const o = pick(p); return o ? o.branch : ''; };

  let cityFor = { id: '', city: '' };
  function block(p) {
    const rows = [...list(p)].sort((a, b) => a.price - b.price);
    const cur = pick(p);
    if (cityFor.id !== p.id) cityFor = { id: p.id, city: '' };
    const cities = [...new Set(rows.map((o) => o.city))];
    const shown = rows.filter((o) => !cityFor.city || o.city === cityFor.city);
    const sellers = new Set(rows.map((o) => o.seller)).size;
    const min = Math.min(...rows.map((o) => o.price));
    const row = (o) => {
      const s = sellerById(o.seller); const on = o.key === cur.key;
      const name = s.demo ? `${esc(s.name)} <span class="pill rcof__demo">пример</span>` : `<a href="#/catalog/${esc(s.id)}">${esc(s.name)}</a>`;
      return `<li class="rcof__row ${on ? 'is-on' : ''}" data-testid="rcof-row-${esc(o.key)}">
        <div class="rcof__who"><b>${name}</b><small>${icon('map-pin')} ${esc(o.city)} · ${esc(o.addr)}</small></div>
        <span class="rcof__av">${esc(o.avail)}</span>
        <b class="rcof__price">${rub(o.price)}${o.price === min && rows.length > 1 ? '<small>ниже всех</small>' : ''}</b>
        <button type="button" class="btn btn--sm ${on ? 'btn--primary' : 'btn--ghost'}" data-rcof-pick="${esc(o.key)}" data-testid="rcof-pick-${esc(o.key)}" aria-pressed="${on}">${on ? `${icon('check')} Выбран` : 'Выбрать'}</button>
      </li>`;
    };
    return `<section class="rcof" data-testid="rcof" aria-label="Где купить">
      <div class="rcof__head"><h3>Где купить</h3><span class="xs muted">${sellers} ${plural(sellers, 'продавец', 'продавца', 'продавцов')} · ${cities.length} ${plural(cities.length, 'город', 'города', 'городов')}</span></div>
      <div class="chips rcof__cities" role="group" aria-label="Город">${['', ...cities].map((c) => `<button type="button" class="chip ${cityFor.city === c ? 'is-on' : ''}" data-rcof-city="${esc(c)}" aria-pressed="${cityFor.city === c}">${c ? esc(c) : 'Все города'}</button>`).join('')}</div>
      <ol class="rcof__list">${shown.map(row).join('')}</ol>
      <p class="xs muted rcof__note">Производитель — ${MAKER.name}: карточку товара ведёт он. Цену, наличие и срок указывает каждый продавец. Заявка уйдёт продавцу, которого вы выбрали. Цены и продавцы с пометкой «пример» — демонстрационные.</p>
    </section>`;
  }
  function bind(id) {
    const p = C.products.find((x) => x.id === id);
    const host = qs('.pd__info');
    if (!host || !applies(p) || qs('[data-testid="rcof"]', host)) return;
    const cur = pick(p); const s = sellerById(cur.seller);
    const brand = qs('.pd__info > span.xs.muted');
    if (brand) { brand.innerHTML = `Производитель · <b>${MAKER.name}</b>`; brand.classList.add('rcof__maker'); brand.dataset.testid = 'rcof-maker'; }
    const card = qs('a.seller', host);
    if (cur.key !== HOME) {
      /* Выбран другой продавец или другой город: цена и продавец на странице — его. */
      const price = qs('.pd__price', host);
      if (price) price.innerHTML = `${rub(cur.price)}<small> / ${esc(p.unit)}</small>`;
      if (card) {
        const plain = `<div><b>${esc(s.name)}</b><small>${icon('map-pin')} ${esc(cur.city)} · ${esc(cur.addr)}</small></div><span class="pill">${esc(cur.avail)}</span>`;
        if (s.demo) { const box = document.createElement('div'); box.className = 'seller rcof__seller'; box.innerHTML = plain; card.replaceWith(box); }
        else { card.setAttribute('href', `#/catalog/${s.id}`); const ph = qs('.seller__ph', card); card.innerHTML = `${ph && s.id === p.seller ? ph.outerHTML : ''}${plain}`; }
      }
    }
    const anchor = qs('.seller', host);
    if (anchor) anchor.insertAdjacentHTML('afterend', block(p)); else host.insertAdjacentHTML('beforeend', block(p));
    qsa('[data-rcof-pick]', host).forEach((b) => { b.onclick = () => { chosen.set(p.id, b.dataset.rcofPick); renderApp(); const next = qs(`[data-rcof-pick="${b.dataset.rcofPick}"]`); if (next) next.focus({ preventScroll: true }); }; });
    qsa('[data-rcof-city]', host).forEach((b) => { b.onclick = () => { cityFor = { id: p.id, city: b.dataset.rcofCity }; renderApp(); const next = qsa('[data-rcof-city]').find((x) => x.dataset.rcofCity === b.dataset.rcofCity); if (next) next.focus({ preventScroll: true }); }; });
  }
  document.addEventListener('rc:rendered', (e) => { const { path, params } = e.detail; if (path.startsWith('/catalog/p/')) bind(params.id); });
  window.RCOffers = { list, pick, priceOf, sellerOf, placeOf, branchOf, isDefault, seller: (id) => DEMO[id] || null, maker: MAKER.name };
})();
