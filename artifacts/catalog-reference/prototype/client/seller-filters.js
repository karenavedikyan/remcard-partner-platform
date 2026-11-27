/* RemCard — фильтры на странице продавца (вкладка «Товары») для каталога, загруженного из 1С (прототип).
   Тот же набор и те же правила, что в кабинете партнёра и в ЛК «Тандор»: общий слой — catalog-lk.js.
   Состояние хранится только в памяти страницы: поиск, фильтры, сортировка и место в списке сохраняются,
   когда клиент открывает карточку товара и возвращается назад.
   Размер карточек: «Мельче» (по умолчанию, больше моделей на экране) или «Крупнее» — выбор тоже только в памяти страницы. */
(() => {
  const L = window.RCLk;
  if (!L || !window.RC) return;
  const { esc, icon, qs, qsa, renderApp } = window.RC;
  const states = new Map();
  const stateOf = (id) => { if (!states.has(id)) states.set(id, { st: L.blank(), backY: null }); return states.get(id); };
  let current = null;
  let timer = null;
  let view = 'dense';
  const VIEWS = [['dense', 'grid-3x3', 'Мельче: больше моделей на экране'], ['large', 'grid-2x2', 'Крупнее: фото подробнее']];

  const enabled = (sellerId) => L.hasCatalog(sellerId);
  const sortOptions = (st) => L.SORTS.map(([code, , text]) => `<option value="${code}" ${st.sort === code ? 'selected' : ''}>${text}</option>`).join('');

  function render(partner, goods, productCard) {
    const z = stateOf(partner.id);
    const list = L.items(goods);
    z.st = L.prune(list, z.st);
    current = { id: partner.id, name: partner.name, list };
    const st = z.st; const o = L.options(list, st); const rows = L.apply(list, st);
    const active = L.activeCount(st); const partial = L.skuLevel(st);
    const chips = [st.q.trim() ? { id: 'q', text: `Поиск: ${st.q.trim()}` } : null, ...L.chips(st, 'client').filter((c) => c.id !== 'section')].filter(Boolean);
    const sec = o.sections.find((x) => x.name === st.section);
    const total = o.sections.reduce((a, x) => a + x.count, 0);
    const secChip = (value, text, n, on) => `<button type="button" class="chip ${on ? 'is-on' : ''}" data-sf-sec="${esc(value)}" aria-pressed="${on}" ${n || on ? '' : 'disabled'}>${esc(text)} <em>${n}</em></button>`;
    const quick = [...L.MARKS.map(([code, , short]) => ({ id: `marks:${code}`, text: short, on: st.marks.includes(code), n: o.marks.find((x) => x.value === code)?.count ?? 0, show: o.marks.some((x) => x.value === code) })),
      { id: 'avail:in', text: 'В наличии', on: st.avail.includes('in'), n: o.avail.find((x) => x.value === 'in')?.count ?? 0, show: o.avail.some((x) => x.value === 'in') }].filter((x) => x.show);
    const card = (r) => {
      const html = productCard(r.item.raw);
      if (!partial || r.matched.length >= r.item.skus.length) return html;
      const note = `<span class="sf-fit" title="Под выбранные условия подходят не все размеры и цвета этой модели">Подходит ${r.matched.length} из ${r.item.skus.length} ${L.plural(r.item.skus.length, 'варианта', 'вариантов', 'вариантов')}</span>`;
      return html.replace(/<\/article>\s*$/, `${note}</article>`);
    };
    return `<div class="sf" data-testid="sf" data-sf-seller="${esc(partner.id)}">
      <div class="sf-bar">
        <label class="sf-search">${icon('search')}<input type="search" id="sf-q" value="${esc(st.q)}" maxlength="160" placeholder="Модель, цвет или артикул" aria-label="Поиск по каталогу продавца" data-testid="sf-search" autocomplete="off"></label>
        <button type="button" class="btn btn--ghost sf-open ${active ? 'is-active' : ''}" id="sf-open" data-testid="sf-open" aria-haspopup="dialog" aria-expanded="${!!qs('#sf-drawer')}">${icon('sliders-horizontal')} Фильтры${active ? `<em>${active}</em>` : ''}</button>
        <select id="sf-sort" class="sf-sort" aria-label="Сортировка" data-testid="sf-sort">${sortOptions(st)}</select>
        <div class="sf-view" role="group" aria-label="Размер карточек" data-testid="sf-view">${VIEWS.map(([code, ico, title]) => `<button type="button" data-sf-view="${code}" data-testid="sf-view-${code}" aria-pressed="${view === code}" aria-label="${title}" title="${title}">${icon(ico)}</button>`).join('')}</div>
      </div>
      <div class="chips chips--scroll sf-row" role="group" aria-label="Разделы каталога" data-testid="sf-sections">${secChip('', 'Все товары', total, !st.section)}${o.sections.map((x) => secChip(x.name, x.name, x.count, st.section === x.name)).join('')}</div>
      ${sec && sec.groups.length ? `<div class="chips chips--scroll sf-row sf-row--sub" role="group" aria-label="Группы раздела" data-testid="sf-groups">${secChip(sec.name, 'Все', sec.count, !st.group)}${sec.groups.map((g) => secChip(`${sec.name}/${g.name}`, g.name, g.count, st.group === g.name)).join('')}</div>` : ''}
      ${quick.length ? `<div class="chips chips--scroll sf-row sf-row--quick" role="group" aria-label="Быстрый отбор" data-testid="sf-quick">${quick.map((x) => `<button type="button" class="chip ${x.on ? 'is-on' : ''}" data-sf-quick="${x.id}" aria-pressed="${x.on}" ${x.n || x.on ? '' : 'disabled'}>${esc(x.text)} <em>${x.n}</em></button>`).join('')}</div>` : ''}
      <div class="sf-found" data-testid="sf-found"><span class="sf-count" aria-live="polite">${rows.length ? `Найдено: ${esc(L.summary(rows).text)}` : 'Ничего не найдено'}</span>
        ${chips.length ? `<div class="sf-chips">${chips.map((c) => `<button type="button" class="sf-chip" data-sf-chip="${esc(c.id)}" aria-label="Убрать условие: ${esc(c.text)}">${esc(c.text)}${icon('x')}</button>`).join('')}</div>` : ''}
        ${chips.length || st.section ? '<button type="button" class="link small sf-reset" data-sf-reset data-testid="sf-reset">Сбросить фильтры</button>' : ''}</div>
      ${rows.length ? `<div class="goods ${view === 'dense' ? 'goods--dense' : ''}" id="sf-goods" data-testid="sf-goods" data-view="${view}">${rows.map(card).join('')}</div>` : `<div class="empty sf-empty" data-testid="sf-empty"><b>Ничего не найдено</b><p>Проверьте написание модели или снимите часть фильтров.</p><button type="button" class="btn btn--ghost btn--sm" data-sf-reset>Сбросить фильтры</button></div>`}
    </div>`;
  }

  const update = (fn, focusSel) => {
    if (!current) return;
    const z = stateOf(current.id);
    z.st = fn(z.st);
    renderApp();
    if (focusSel) qs(focusSel)?.focus({ preventScroll: true });
  };

  /* ---------- Панель «Фильтры» ---------- */
  /* Панель справа во всю высоту. Каждое изменение сразу обновляет список товаров за панелью;
     «Показать», крестик, фон и Esc только закрывают её. */
  let drawerApi = null;
  function closeDrawer(silent) {
    const d = qs('#sf-drawer');
    if (!d) return;
    if (drawerApi) drawerApi.destroy();
    drawerApi = null;
    d.remove();
    document.body.classList.remove('sf-drawer-open');
    document.removeEventListener('keydown', onKey);
    if (!silent) qs('#sf-open')?.focus({ preventScroll: true });
  }
  function onKey(e) { if (e.key === 'Escape') closeDrawer(); }
  function openDrawer() {
    if (!current || qs('#sf-drawer')) return;
    const z = stateOf(current.id);
    const d = document.createElement('div');
    d.className = 'sf-drawer'; d.id = 'sf-drawer';
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'lkf-title'); d.dataset.testid = 'sf-drawer';
    d.innerHTML = '<div class="sf-drawer__back" data-sf-close></div><aside class="sf-drawer__panel" data-sf-mount></aside>';
    document.body.appendChild(d);
    document.body.classList.add('sf-drawer-open');
    qs('[data-sf-close]', d).onclick = () => closeDrawer();
    document.addEventListener('keydown', onKey);
    drawerApi = L.mount(qs('[data-sf-mount]', d), {
      list: current.list, state: z.st, audience: 'client', title: 'Фильтры', sub: `Каталог продавца «${current.name}» · список обновляется сразу`,
      onChange: (next) => update(() => next), onApply: () => closeDrawer(), onClose: () => closeDrawer(),
    });
    qs('.lkf-close', d)?.focus({ preventScroll: true });
  }

  function bind() {
    const root = qs('[data-testid="sf"]');
    if (!root || !current) return;
    const q = qs('#sf-q', root);
    const runSearch = () => {
      clearTimeout(timer);
      const value = qs('#sf-q')?.value ?? '';
      update((st) => ({ ...st, q: value.slice(0, 160) }));
      const n = qs('#sf-q'); if (n) { n.focus({ preventScroll: true }); n.setSelectionRange(n.value.length, n.value.length); }
    };
    q.oninput = () => { clearTimeout(timer); timer = setTimeout(runSearch, 260); };
    q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } };
    qs('#sf-sort', root).onchange = (e) => update((st) => ({ ...st, sort: e.target.value }), '#sf-sort');
    qs('#sf-open', root).onclick = openDrawer;
    qsa('[data-sf-view]', root).forEach((b) => { b.onclick = () => { if (view === b.dataset.sfView) return; view = b.dataset.sfView; update((st) => st, `[data-sf-view="${view}"]`); }; });
    qsa('[data-sf-sec]', root).forEach((b) => { b.onclick = () => update((st) => L.prune(current.list, { ...st, ...L.parseSection(b.dataset.sfSec) }), `[data-sf-sec="${CSS.escape(b.dataset.sfSec)}"]`); });
    qsa('[data-sf-quick]', root).forEach((b) => { b.onclick = () => { const [field, value] = b.dataset.sfQuick.split(':'); update((st) => L.toggle(st, field, value), `[data-sf-quick="${b.dataset.sfQuick}"]`); }; });
    qsa('[data-sf-chip]', root).forEach((b) => { b.onclick = () => update((st) => (b.dataset.sfChip === 'q' ? { ...st, q: '' } : L.removeChip(st, b.dataset.sfChip)), '#sf-open'); });
    qsa('[data-sf-reset]', root).forEach((b) => { b.onclick = () => update((st) => L.cleared(st, { sort: st.sort }), '#sf-q'); });
    /* Запоминаем место в списке перед переходом в карточку товара. */
    qsa('#sf-goods .good__link', root).forEach((a) => a.addEventListener('click', () => { stateOf(current.id).backY = window.scrollY; }));
  }

  document.addEventListener('rc:rendered', (e) => {
    const path = e.detail.path || '';
    const m = path.match(/^\/catalog\/([a-z0-9]+)$/i);
    if (m && states.has(m[1]) && qs('[data-testid="sf"]')) {
      bind();
      const z = states.get(m[1]);
      if (z.backY != null) { const y = z.backY; z.backY = null; window.scrollTo({ top: y, behavior: 'instant' }); }
      return;
    }
    closeDrawer(true);
    if (!path.startsWith('/catalog/p/')) states.forEach((z) => { z.backY = null; });
  });

  window.RCSellerFilters = { enabled, render };
})();
