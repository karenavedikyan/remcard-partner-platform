/* RemCard — фильтры каталога продавца «как в ЛК Тандор» (прототип).
   Один общий слой для кабинета партнёра (вкладка «Товары») и для страницы продавца на сайте remcard.ru:
   одинаковые свойства из 1С, одинаковые правила отбора, одинаковая форма фильтра.

   Правила, перенесённые из ЛК «Тандор» (internal-catalog):
   • 24 свойства из 1С с исходными названиями; похожие свойства не склеиваются
     («Цвет» ≠ «Цветовая гамма», «Покрытие» ≠ «Покрытие двери», «Толщина» ≠ «Толщина полотна, мм»);
   • значения внутри одного свойства — «или», разные свойства и остальные ограничения — «и»;
   • все условия проверяются на одной позиции 1С (варианте): модель видна, только если подходит хотя бы один её вариант;
   • неизвестный остаток — не ноль; пустое свойство — не «Нет»;
   • в списке значений только то, что реально есть в ассортименте;
   • поиск — без учёта регистра и «ё/е», по всем словам запроса: название, артикул, бренд, раздел, свойства.
   Значения свойств здесь демонстрационные: в продукте справочники приходят из 1С партнёра. */
(() => {
  const C = window.RCCatalogData;
  if (!C) return;
  const SELLERS = new Set(['s6']);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (t) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[t]);
  const norm = (v) => String(v ?? '').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const cmp = (a, b) => String(a).localeCompare(String(b), 'ru', { numeric: true });
  const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
  const num = (n) => Math.round(n).toLocaleString('ru-RU');

  /* Свойства 1С — в том же составе и порядке, что в ЛК «Тандор». Второе значение — подпись для покупателя
     (только там, где в названии служебный префикс); ключ и смысл свойства не меняются. */
  const FACETS = [
    ['Цвет'], ['Цветовая гамма'], ['Покрытие'], ['Покрытие двери'], ['Материал'], ['Дизайн'], ['Вид двери'], ['Размер, мм'],
    ['Высота', 'Высота, мм'], ['Длина', 'Длина, мм'], ['Толщина', 'Толщина, мм'], ['Сторона открывания'], ['Тип товара'], ['Тип погонажа'], ['Тип фурнитуры'],
    ['Толщина полотна, мм'], ['Толщина стали, мм'],
    ['ВХ. Терморазрыв', 'Терморазрыв (входные двери)'], ['ВХ. По назначению', 'Назначение входной двери'],
    ['ФР. Вид ручки', 'Вид ручки'], ['ФР. Основание ручки', 'Основание ручки'], ['ФР. Тип установки', 'Тип установки фурнитуры'], ['ФР. Тип замка', 'Тип замка'], ['ФР.Стиль', 'Стиль фурнитуры'],
  ].map(([key, buyer]) => ({ key, buyer: buyer || key }));
  const FACET_KEYS = new Set(FACETS.map((f) => f.key));
  const AVAIL = [['in', 'Есть остаток', 'В наличии'], ['zero', 'Нулевой остаток', 'Скоро поступит'], ['unknown', 'Остаток не определён', 'Под заказ']];
  const MARKS = [['hit', 'Хит продаж', 'Хит'], ['new', 'Новинка', 'Новинки'], ['sale', 'Акция', 'Акции']];
  const SORTS = [['', 'По умолчанию', 'По умолчанию'], ['name', 'По названию', 'По названию'], ['price_asc', 'По возрастанию цены', 'Сначала дешевле'], ['price_desc', 'По убыванию цены', 'Сначала дороже'], ['stock', 'Сначала в наличии', 'Сначала в наличии']];
  const SECTION_ORDER = ['Межкомнатные двери', 'Входные двери', 'Фурнитура', 'Погонаж и плинтус'];

  /* ---------- Демо-значения свойств 1С по моделям ---------- */
  const door = (cover, coat, material, design, kind, trim) => ({ Покрытие: cover, 'Покрытие двери': coat, Материал: material, Дизайн: design, 'Вид двери': kind, 'Тип погонажа': trim });
  const NEW = 'Современные покрытия', DG = 'Глухая (ДГ)', DCH = 'Частично остекленная (ДЧ)', TR = 'Обычный погонаж', TT = 'Телескопический погонаж';
  const handle = (style) => ({ 'Тип фурнитуры': 'Ручка', Материал: 'Алюминий', 'ФР. Вид ручки': 'На розетке', 'ФР. Основание ручки': 'Квадратная розетка', 'ФР. Тип установки': 'Врезная', 'ФР.Стиль': style });
  const PROPS = {
    p001: door(NEW, 'ПВХ', 'МДФ', 'Классика', DG, TR), p002: door(NEW, 'ПЭТ', 'МДФ', 'Модерн', DG, TR), p003: door('Эмаль', 'Эмаль', 'Массив + МДФ', 'Классика', DG, TR),
    p004: door(NEW, 'ПВХ', 'МДФ', 'Модерн', DG, TR), p005: door(NEW, 'ПЭТ', 'МДФ', 'Модерн', DCH, TR), p006: door('Эмаль', 'Эмаль', 'Массив + МДФ', 'Модерн', DG, TT),
    p007: door('Эмаль', 'Эмаль', 'Массив + МДФ', 'Классика', DG, TT), p010: door(NEW, 'ПЭТ', 'МДФ', 'Модерн', DG, TR), p011: door(NEW, 'ПВХ', 'МДФ', 'Модерн', DG, TR),
    /* модели поставщика «Тандор» (другие цвета), см. catalog-facets.js */
    t001: door(NEW, 'ПВХ', 'МДФ', 'Классика', DG, TR), t002: door(NEW, 'ПЭТ', 'МДФ', 'Модерн', DG, TR), t003: door('Эмаль', 'Эмаль', 'Массив + МДФ', 'Классика', DG, TR),
    t004: door(NEW, 'ПВХ', 'МДФ', 'Модерн', DG, TR), t010: door(NEW, 'ПЭТ', 'МДФ', 'Модерн', DG, TR), t011: door(NEW, 'ПВХ', 'МДФ', 'Модерн', DG, TR),
    p139: { 'Покрытие двери': 'МДФ / МДФ', Материал: 'Сталь', 'ВХ. Терморазрыв': 'нет', 'ВХ. По назначению': 'для квартиры' },
    p141: { 'Покрытие двери': 'МДФ / МДФ', Материал: 'Сталь', 'ВХ. Терморазрыв': 'нет', 'ВХ. По назначению': 'для квартиры' },
    p144: { 'Покрытие двери': 'Металл / МДФ', Материал: 'Сталь', 'ВХ. Терморазрыв': 'да', 'ВХ. По назначению': 'для дома' },
    p037: handle('Модерн'), p038: handle('Модерн'), p039: handle('Классика'),
    p054: { 'Тип фурнитуры': 'Замок', Материал: 'Сталь', 'ФР. Тип установки': 'Врезная', 'ФР. Тип замка': 'Под цилиндр' },
    p020: { 'Тип фурнитуры': 'Петля', Материал: 'Сталь', 'ФР. Тип установки': 'Врезная', 'ФР.Стиль': 'Классика', 'Размер, мм': '100х75х2,5', Высота: '100', Толщина: '2,5' },
    p130: { 'Тип погонажа': 'Плинтус', Материал: 'МДФ', Покрытие: NEW, 'Размер, мм': '80х10х2070', Высота: '80', Толщина: '10', Длина: '2070' },
    p131: { 'Тип погонажа': 'Плинтус', Материал: 'МДФ', Покрытие: NEW, 'Размер, мм': '80х10х2070', Высота: '80', Толщина: '10', Длина: '2070' },
    x901: { 'Тип погонажа': 'Наличник', Материал: 'МДФ', Покрытие: NEW, 'Размер, мм': '70х8х2150', Толщина: '8', Длина: '2150' },
    x902: { 'Тип погонажа': 'Добор', Материал: 'МДФ', Покрытие: NEW, 'Размер, мм': '100х10х2070', Толщина: '10', Длина: '2070' },
  };
  /* У входных дверей сторона открывания — свойство конкретной позиции 1С, а не модели. */
  const SIDES = { p139: ['Левое', 'Правое'], p141: ['Правое', 'Правое'], p144: ['Правое', 'Левое'] };
  const GAMMA = [[/снежно|бел/, 'Белая'], [/эльбрус|капучино|беж|песок/, 'Светлая'], [/сер|графит|никель|хром/, 'Серая'], [/ч[её]рн|т[её]мн/, 'Тёмная'], [/бронз|дуб|орех/, 'Коричневая']];
  const gammaOf = (color) => { const c = norm(color); const hit = GAMMA.find(([re]) => re.test(c)); return hit ? hit[1] : ''; };

  const isEntry = (p) => p.specs?.Тип === 'Входная';
  function sectionOf(p) {
    if (p.cat === 'doors') return isEntry(p) ? 'Входные двери' : 'Межкомнатные двери';
    if (/^(Плинтус|Наличник|Добор)/.test(p.name)) return 'Погонаж и плинтус';
    return 'Фурнитура';
  }
  function groupOf(p) {
    if (p.cat === 'doors') return '';
    const hit = [[/^Ручка/, 'Ручки'], [/^Замок/, 'Замки'], [/^Петля/, 'Петли'], [/^Плинтус/, 'Плинтус'], [/^Наличник/, 'Наличники'], [/^Добор/, 'Доборы']].find(([re]) => re.test(p.name));
    return hit ? hit[1] : '';
  }
  function skuProps(p, color, size, index) {
    const out = { ...(PROPS[p.id] || {}) };
    if (p.cat === 'doors') {
      const height = isEntry(p) ? (String(size).split('×')[1] || '2050') : String(parseInt(p.specs?.Высота, 10) || 2000);
      out.Высота = height;
      if (size) out['Размер, мм'] = isEntry(p) ? String(size).replace('×', 'х') : `${height}х${size}`;
      const leaf = parseInt(p.specs?.['Толщина полотна'], 10);
      if (leaf) out['Толщина полотна, мм'] = String(leaf);
      if (p.specs?.Сталь) out['Толщина стали, мм'] = String(p.specs.Сталь).replace(/\s*мм$/, '');
      if (SIDES[p.id]) out['Сторона открывания'] = SIDES[p.id][index] || SIDES[p.id][0];
    }
    if (color) { out.Цвет = color; const g = gammaOf(color); if (g) out['Цветовая гамма'] = g; }
    out['Тип товара'] = p.avail === 'order' ? 'Заказная' : 'Складская';
    Object.keys(out).forEach((k) => { if (!FACET_KEYS.has(k) || !String(out[k]).trim()) delete out[k]; });
    return out;
  }
  /* Варианты модели = позиции номенклатуры 1С (размер × цвет). Остаток: число, 0 или null (данных нет). */
  function buildSkus(p) {
    const colors = p.colors?.length ? p.colors : [p.variant || ''];
    const sizes = p.sizes?.length ? p.sizes : [''];
    const height = parseInt(p.specs?.Высота, 10) || 2000;
    const out = [];
    colors.forEach((color) => sizes.forEach((size, index) => {
      const tail = !size ? '' : isEntry(p) ? ` ${size.replace('×', '*')}` : ` ${height}*${size}`;
      const key = `${p.id}|${color}|${size}`;
      const h = hash(key);
      const stock = p.avail === 'order' ? null : p.avail === 'soon' ? 0 : 2 + (h % 23);
      out.push({
        key, name1c: `${p.name} ${color}${tail}`.replace(/\s+/g, ' ').trim(), size, color, price: p.price, stock,
        guid: h.toString(16).padStart(8, '0'), art: `ТД-${String(100000 + (h % 900000))}`,
        state: stock == null ? 'unknown' : stock > 0 ? 'in' : 'zero', props: skuProps(p, color, size, index),
      });
    }));
    return out;
  }
  const cache = new WeakMap();
  function itemOf(p) {
    if (cache.has(p)) return cache.get(p);
    const section = sectionOf(p), group = groupOf(p), brand = p.brand || '';
    const skus = buildSkus(p);
    skus.forEach((k) => { k.text = norm([p.name, k.name1c, k.art, brand, section, group, ...Object.entries(k.props).flat()].join(' ')); });
    const it = { id: p.id, name: p.name, section, group, brand, price: p.price, flags: new Set(p.tags || []), skus, raw: p };
    cache.set(p, it);
    return it;
  }
  const items = (products) => products.map(itemOf);
  /* Свойства модели: все значения по её вариантам (для карточки в кабинете). */
  function modelProps(it) {
    return FACETS.map((f) => [f.key, [...new Set(it.skus.map((k) => k.props[f.key]).filter(Boolean))].sort(cmp)]).filter(([, v]) => v.length);
  }

  /* ---------- Состояние фильтра ---------- */
  const blank = () => ({ q: '', section: '', group: '', brand: [], min: '', max: '', avail: [], marks: [], sort: '', facets: {} });
  const copy = (st) => ({ ...blank(), ...st, brand: [...(st.brand || [])], avail: [...(st.avail || [])], marks: [...(st.marks || [])], facets: Object.fromEntries(Object.entries(st.facets || {}).filter(([k, v]) => FACET_KEYS.has(k) && v.length).map(([k, v]) => [k, [...v]])) });
  const words = (q) => norm(String(q || '').slice(0, 160)).split(' ').filter(Boolean).slice(0, 8);
  const price = (v) => { const n = parseInt(String(v).replace(/[^\d]/g, ''), 10); return Number.isFinite(n) && n >= 0 ? n : null; };
  /* Сколько ограничений включено (поиск и сортировка не считаются). */
  const activeCount = (st) => (st.section ? 1 : 0) + st.brand.length + (price(st.min) != null || price(st.max) != null ? 1 : 0) + st.avail.length + st.marks.length + Object.values(st.facets).reduce((a, v) => a + v.length, 0);
  const skuLevel = (st) => words(st.q).length > 0 || price(st.min) != null || price(st.max) != null || st.avail.length > 0 || Object.keys(st.facets).length > 0;

  function modelPass(it, st, skip) {
    if (st.section && it.section !== st.section) return false;
    if (st.group && it.group !== st.group) return false;
    if (skip !== 'brand' && st.brand.length && !st.brand.includes(it.brand)) return false;
    return st.marks.every((m) => (skip === `mark:${m}` ? true : it.flags.has(m)));
  }
  function skuPass(sku, st, skip, w) {
    if (w.length && !w.every((x) => sku.text.includes(x))) return false;
    const lo = price(st.min), hi = price(st.max);
    if (skip !== 'price' && (lo != null || hi != null)) { if (sku.price == null) return false; if (lo != null && sku.price < lo) return false; if (hi != null && sku.price > hi) return false; }
    if (skip !== 'avail' && st.avail.length && !st.avail.includes(sku.state)) return false;
    return Object.entries(st.facets).every(([key, vals]) => skip === `f:${key}` || !vals.length || vals.includes(sku.props[key]));
  }
  const matched = (it, st, skip) => { if (!modelPass(it, st, skip)) return []; const w = words(st.q); return it.skus.filter((k) => skuPass(k, st, skip, w)); };
  const SECTION_RANK = (s) => { const i = SECTION_ORDER.indexOf(s); return i < 0 ? 99 : i; };
  function apply(list, st) {
    const rows = list.map((it, index) => ({ item: it, index, matched: matched(it, st) })).filter((r) => r.matched.length);
    const inStock = (r) => (r.matched.some((k) => k.state === 'in') ? 0 : r.matched.some((k) => k.state === 'unknown') ? 1 : 2);
    const p = (r) => (r.item.price == null ? Infinity : r.item.price);
    const by = {
      name: (a, b) => cmp(a.item.name, b.item.name),
      price_asc: (a, b) => p(a) - p(b) || cmp(a.item.name, b.item.name),
      price_desc: (a, b) => (b.item.price ?? -1) - (a.item.price ?? -1) || cmp(a.item.name, b.item.name),
      stock: (a, b) => inStock(a) - inStock(b) || a.index - b.index,
    }[st.sort];
    if (by) rows.sort(by);
    return rows;
  }
  /* Что показывать в форме: только значения, которые есть в ассортименте выбранного раздела; число — моделей при остальных условиях. */
  function options(list, st) {
    const scope = list.filter((it) => (!st.section || it.section === st.section) && (!st.group || it.group === st.group));
    const count = (skip, test) => list.filter((it) => matched(it, st, skip).some(test)).length;
    const sectionState = { ...st, section: '', group: '' };
    const inSection = list.filter((it) => matched(it, sectionState).length);
    const sections = [...new Set(list.map((it) => it.section))].sort((a, b) => SECTION_RANK(a) - SECTION_RANK(b) || cmp(a, b)).map((name) => ({
      name, count: inSection.filter((it) => it.section === name).length,
      groups: [...new Set(list.filter((it) => it.section === name && it.group).map((it) => it.group))].sort(cmp).map((g) => ({ name: g, count: inSection.filter((it) => it.section === name && it.group === g).length })),
    }));
    const brands = [...new Set(scope.map((it) => it.brand).filter(Boolean))].sort(cmp).map((value) => ({ value, count: list.filter((it) => it.brand === value && matched(it, st, 'brand').length).length }));
    const avail = AVAIL.filter(([code]) => scope.some((it) => it.skus.some((k) => k.state === code))).map(([code]) => ({ value: code, count: count('avail', (k) => k.state === code) }));
    const marks = MARKS.filter(([code]) => scope.some((it) => it.flags.has(code))).map(([code]) => ({ value: code, count: list.filter((it) => it.flags.has(code) && matched(it, st, `mark:${code}`).length).length }));
    const facets = FACETS.map((f) => ({
      key: f.key, buyer: f.buyer,
      values: [...new Set(scope.flatMap((it) => it.skus.map((k) => k.props[f.key]).filter(Boolean)))].sort(cmp).map((value) => ({ value, count: count(`f:${f.key}`, (k) => k.props[f.key] === value) })),
    })).filter((f) => f.values.length);
    const prices = scope.flatMap((it) => it.skus.map((k) => k.price)).filter((v) => v != null);
    return { sections, brands, avail, marks, facets, price: prices.length ? { lo: Math.min(...prices), hi: Math.max(...prices) } : null };
  }
  /* Итог: сколько моделей найдено и сколько вариантов 1С подходит под условия. */
  function summary(rows) {
    const variants = rows.reduce((a, r) => a + r.matched.length, 0);
    const total = rows.reduce((a, r) => a + r.item.skus.length, 0);
    return { models: rows.length, variants, total, text: `${rows.length} ${plural(rows.length, 'модель', 'модели', 'моделей')} · ${variants === total ? `${variants} ${plural(variants, 'вариант', 'варианта', 'вариантов')}` : `подходит ${variants} из ${total} ${plural(total, 'варианта', 'вариантов', 'вариантов')}`}` };
  }
  const label = (key, audience) => { const f = FACETS.find((x) => x.key === key); return !f ? key : audience === 'client' ? f.buyer : f.key; };
  const availLabel = (code, audience) => { const a = AVAIL.find((x) => x[0] === code); return a ? a[audience === 'client' ? 2 : 1] : code; };
  const markLabel = (code) => (MARKS.find((x) => x[0] === code) || [])[1] || code;
  /* Включённые условия — для «чипов» над списком. */
  function chips(st, audience) {
    const out = [];
    if (st.section) out.push({ id: 'section', text: st.group ? `${st.section} · ${st.group}` : st.section });
    st.brand.forEach((v) => out.push({ id: `brand:${v}`, text: `Бренд: ${v}` }));
    const lo = price(st.min), hi = price(st.max);
    if (lo != null || hi != null) out.push({ id: 'price', text: `Цена: ${lo != null ? `от ${num(lo)}` : ''}${lo != null && hi != null ? ' ' : ''}${hi != null ? `до ${num(hi)}` : ''} ₽` });
    st.avail.forEach((v) => out.push({ id: `avail:${v}`, text: availLabel(v, audience) }));
    st.marks.forEach((v) => out.push({ id: `mark:${v}`, text: markLabel(v) }));
    Object.entries(st.facets).forEach(([key, vals]) => vals.forEach((v) => out.push({ id: `f:${key}:${v}`, text: `${label(key, audience)}: ${v}` })));
    return out;
  }
  function removeChip(st, id) {
    const next = copy(st); const [kind, ...rest] = id.split(':'); const tail = rest.join(':');
    const drop = (arr, v) => arr.filter((x) => x !== v);
    if (kind === 'section') { next.section = ''; next.group = ''; }
    if (kind === 'brand') next.brand = drop(next.brand, tail);
    if (kind === 'price') { next.min = ''; next.max = ''; }
    if (kind === 'avail') next.avail = drop(next.avail, tail);
    if (kind === 'mark') next.marks = drop(next.marks, tail);
    if (kind === 'f') { const key = [...FACET_KEYS].find((k) => tail.startsWith(`${k}:`)); if (key) { const left = drop(next.facets[key] || [], tail.slice(key.length + 1)); if (left.length) next.facets[key] = left; else delete next.facets[key]; } }
    return next;
  }
  const toggle = (st, field, value) => { const next = copy(st); next[field] = next[field].includes(value) ? next[field].filter((x) => x !== value) : [...next[field], value]; return next; };
  /* Сброс фильтров сохраняет поиск и сортировку отдельно: их сбрасывает вызывающий экран, если нужно. */
  const cleared = (st, keep = {}) => ({ ...blank(), ...keep });
  /* После смены раздела убираем значения, которых в новом разделе нет, — чтобы не показывать пустой список «по старой памяти». */
  function prune(list, st) {
    const next = copy(st); const o = options(list, next);
    const sec = o.sections.find((x) => x.name === next.section);
    if (next.section && !sec) { next.section = ''; next.group = ''; }
    if (next.group && !(sec?.groups || []).some((g) => g.name === next.group)) next.group = '';
    next.brand = next.brand.filter((v) => o.brands.some((x) => x.value === v));
    next.avail = next.avail.filter((v) => o.avail.some((x) => x.value === v));
    next.marks = next.marks.filter((v) => o.marks.some((x) => x.value === v));
    Object.keys(next.facets).forEach((key) => { const f = o.facets.find((x) => x.key === key); const left = f ? next.facets[key].filter((v) => f.values.some((x) => x.value === v)) : []; if (left.length) next.facets[key] = left; else delete next.facets[key]; });
    return next;
  }

  /* ---------- Форма фильтра (общая для кабинета и сайта) ---------- */
  const svg = (d) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const SVG = {
    chevron: svg('<path d="m6 9 6 6 6-6"/>'), reset: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
    close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'), search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  };
  const sectionValue = (st) => (st.group ? `${st.section}/${st.group}` : st.section);
  const parseSection = (v) => { const [section, group = ''] = String(v || '').split('/'); return { section, group }; };
  const sectionOptions = (o, st) => `<option value="">Все разделы</option>${o.sections.map((s) => `<option value="${esc(s.name)}" ${st.section === s.name && !st.group ? 'selected' : ''}>${esc(s.name)} · ${s.count}</option>${s.groups.map((g) => `<option value="${esc(`${s.name}/${g.name}`)}" ${st.section === s.name && st.group === g.name ? 'selected' : ''}>— ${esc(g.name)} · ${g.count}</option>`).join('')}`).join('')}`;
  /* Длинный список значений сворачивается: первые SHORT и все отмеченные, остальное — по «Показать ещё». */
  const LONG = 8; const SHORT = 6;
  const priceText = (st) => { const lo = price(st.min), hi = price(st.max); return lo == null && hi == null ? '' : `${lo != null ? `от ${num(lo)}` : ''}${lo != null && hi != null ? ' ' : ''}${hi != null ? `до ${num(hi)}` : ''} ₽`; };
  function bodyHtml(list, st, cfg, ui) {
    const client = cfg.audience === 'client';
    const o = options(list, st);
    const find = norm(ui.find);
    const hit = (text) => norm(text).includes(find);
    const check = (name, key, value, text, count, on) => ({ on, text, html: `<label class="lkf-check ${on ? 'is-on' : ''} ${!count && !on ? 'is-empty' : ''}"><input type="checkbox" data-lkf="${name}" ${key ? `data-key="${esc(key)}"` : ''} value="${esc(value)}" ${on ? 'checked' : ''}><span>${esc(text)}</span><small>${count}</small></label>` });
    /* Группа: при поиске по фильтру остаются только совпавшие группы и значения, и они раскрыты. */
    const group = ({ id, title, n = 0, open = false, sub = '', items = null, before = '', after = '', words = '' }) => {
      let inner = '';
      if (items) {
        const whole = !find || hit(title);
        const shown = whole ? items : items.filter((x) => hit(x.text));
        if (find && !shown.length) return '';
        const short = !find && !ui.more.has(id) && shown.length > LONG;
        const head = short ? shown.filter((x, i) => i < SHORT || x.on) : shown;
        const rest = shown.length - head.length;
        inner = head.map((x) => x.html).join('') + (rest > 0 ? `<button type="button" class="lkf-more" data-lkf-act="more" data-id="${esc(id)}">Показать ещё ${rest}</button>` : '');
      } else if (find && !hit(`${title} ${words}`)) return '';
      const isOpen = find ? true : ui.touched ? ui.open.has(id) : open || n > 0;
      return `<details class="lkf-g ${n ? 'is-on' : ''}" data-lkf-g="${esc(id)}" ${isOpen ? 'open' : ''}><summary><span class="lkf-gt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${n ? `<em>${n}</em>` : ''}${SVG.chevron}</summary><div class="lkf-gb">${before}${inner}${after}</div></details>`;
    };
    const base = [
      group({
        id: 'section', title: 'Раздел и бренд', n: (st.section ? 1 : 0) + st.brand.length, open: true, words: 'категория группа ' + o.brands.map((b) => b.value).join(' '),
        sub: [st.section ? (st.group ? `${st.section} · ${st.group}` : st.section) : '', ...st.brand].filter(Boolean).join(', '),
        before: `<label class="lkf-field"><span>Раздел</span><select data-lkf="section">${sectionOptions(o, st)}</select></label>${o.brands.length ? `<div class="lkf-sub">Бренд</div>${o.brands.map((b) => check('brand', '', b.value, b.value, b.count, st.brand.includes(b.value)).html).join('')}` : ''}`,
      }),
      o.price ? group({
        id: 'price', title: 'Цена', n: priceText(st) ? 1 : 0, open: true, sub: priceText(st), words: 'стоимость рубли от до',
        before: `<div class="lkf-range"><label><span>от, ₽</span><input type="text" inputmode="numeric" data-lkf="min" value="${esc(st.min)}" placeholder="${num(o.price.lo)}" aria-label="Цена от" autocomplete="off"></label><i aria-hidden="true">—</i><label><span>до, ₽</span><input type="text" inputmode="numeric" data-lkf="max" value="${esc(st.max)}" placeholder="${num(o.price.hi)}" aria-label="Цена до" autocomplete="off"></label></div><p class="lkf-note">${client ? 'Цена продавца на сайте.' : `Тип цены для сайта: «${esc(cfg.priceType || 'РРЦ Тандор')}». Внутренние типы цен в фильтре не участвуют.`}</p>`,
      }) : '',
      o.avail.length ? group({
        id: 'avail', title: client ? 'Наличие' : 'Наличие на складах', n: st.avail.length, open: true, sub: st.avail.map((v) => availLabel(v, cfg.audience)).join(', '),
        items: o.avail.map((a) => check('avail', '', a.value, availLabel(a.value, cfg.audience), a.count, st.avail.includes(a.value))),
        after: `<p class="lkf-note">${client ? '«Под заказ» — остаток у продавца не указан, наличие уточняется по заявке.' : 'Неизвестный остаток — не ноль: такие варианты на сайте показываются как «Под заказ».'}</p>`,
      }) : '',
      o.marks.length ? group({ id: 'marks', title: 'Отметки', n: st.marks.length, sub: st.marks.map(markLabel).join(', '), items: o.marks.map((m) => check('marks', '', m.value, markLabel(m.value), m.count, st.marks.includes(m.value))) }) : '',
      group({
        id: 'sort', title: 'Сортировка', n: 0, words: 'порядок дешевле дороже названию', sub: st.sort ? (SORTS.find((x) => x[0] === st.sort) || [])[client ? 2 : 1] : '',
        before: `<label class="lkf-field"><span>Порядок в списке</span><select data-lkf="sort">${SORTS.map(([code, lk, buyer]) => `<option value="${code}" ${st.sort === code ? 'selected' : ''}>${client ? buyer : lk}</option>`).join('')}</select></label>`,
      }),
    ].join('');
    const facets = o.facets.map((f) => { const sel = st.facets[f.key] || []; return group({ id: `f:${f.key}`, title: client ? f.buyer : f.key, n: sel.length, sub: sel.join(', '), items: f.values.map((v) => check('facet', f.key, v.value, v.value, v.count, sel.includes(v.value))) }); }).join('');
    if (find && !base && !facets) return `<p class="lkf-none" data-testid="lkf-none">По запросу «${esc(ui.find.trim())}» ничего нет. Проверьте написание или сотрите запрос.</p>`;
    return `${base}${facets ? `<div class="lkf-divider"><span>${client ? 'Характеристики' : 'Свойства из 1С'}</span>${find ? '' : `<small>${o.facets.length} ${plural(o.facets.length, 'свойство', 'свойства', 'свойств')} в этом разделе</small>`}</div>${facets}` : ''}`;
  }
  function footHtml(list, st) {
    const n = apply(list, st).length;
    return `<button type="button" class="lkf-reset" data-lkf-act="reset" data-testid="lkf-reset" ${activeCount(st) || st.sort ? '' : 'disabled'}>${SVG.reset}<span>Сбросить</span></button><button type="button" class="lkf-apply" data-lkf-act="apply" data-testid="lkf-apply">${n ? `Показать ${n} ${plural(n, 'модель', 'модели', 'моделей')}` : 'Ничего не найдено'}</button>`;
  }
  /* Встраивает панель фильтра в контейнер. Каждое изменение сразу пересчитывает значения и число на кнопке;
     с onChange список на странице обновляется сразу (как в ЛК «Тандор»), кнопка «Показать» только закрывает панель.
     Возвращает { set, get, destroy }: set — когда условия поменяли на самой странице (быстрые кнопки, «чипы», раздел). */
  function mount(root, cfg) {
    let st = copy(cfg.state); let list = cfg.list; let timer = null;
    const ui = { open: new Set(), touched: false, more: new Set(), find: '' };
    root.classList.add('lkf'); root.dataset.testid = 'lkf-form';
    root.innerHTML = `${cfg.title ? `<div class="lkf-head"><div><h3 id="lkf-title">${esc(cfg.title)}</h3>${cfg.sub ? `<p>${esc(cfg.sub)}</p>` : ''}</div><button type="button" class="lkf-close" data-lkf-act="close" data-testid="lkf-close" aria-label="Закрыть фильтры">${SVG.close}</button></div>` : ''}
      <label class="lkf-find">${SVG.search}<input type="search" data-lkf-find data-testid="lkf-find" maxlength="60" placeholder="${cfg.audience === 'client' ? 'Найти характеристику или значение' : 'Найти свойство или значение'}" aria-label="Поиск по фильтру" autocomplete="off"></label>
      <div class="lkf-body" data-lkf-body></div><div class="lkf-foot" data-lkf-foot></div>`;
    const body = root.querySelector('[data-lkf-body]'); const foot = root.querySelector('[data-lkf-foot]'); const findBox = root.querySelector('[data-lkf-find]');
    const draw = (focus) => {
      /* Раскрытые группы запоминаются, пока нет поиска по фильтру: при поиске совпавшие группы раскрыты принудительно. */
      if (body.firstChild && !ui.shownFind) { ui.open = new Set([...body.querySelectorAll('details[open]')].map((d) => d.dataset.lkfG)); ui.touched = true; }
      const top = body.scrollTop;
      body.innerHTML = bodyHtml(list, st, cfg, ui);
      foot.innerHTML = footHtml(list, st);
      ui.shownFind = !!norm(ui.find);
      body.scrollTop = top;
      if (!focus) return;
      const el = [...body.querySelectorAll('[data-lkf]')].find((x) => x.dataset.lkf === focus.name && (x.dataset.key || '') === (focus.key || '') && (focus.value == null || x.value === focus.value));
      if (!el) return;
      el.focus({ preventScroll: true });
      if (focus.caret != null) try { el.setSelectionRange(focus.caret, focus.caret); } catch (e) { /* не текстовое поле */ }
    };
    const emit = () => { if (typeof cfg.onChange === 'function') cfg.onChange(copy(st)); };
    const digits = (v) => String(v).replace(/[^\d]/g, '').slice(0, 9);
    const commitPrice = (focusName) => {
      clearTimeout(timer); timer = null;
      const lo = body.querySelector('[data-lkf="min"]'); const hi = body.querySelector('[data-lkf="max"]');
      if (!lo || !hi) return;
      const next = { min: digits(lo.value), max: digits(hi.value) };
      const el = focusName ? body.querySelector(`[data-lkf="${focusName}"]`) : null;
      const caret = el ? digits(el.value.slice(0, el.selectionStart ?? el.value.length)).length : null;
      if (next.min === st.min && next.max === st.max) { if (el && el.value !== next[focusName]) { el.value = next[focusName]; } return; }
      st.min = next.min; st.max = next.max;
      draw(focusName ? { name: focusName, caret } : null); emit();
    };
    const flip = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    draw();
    body.addEventListener('change', (e) => {
      const el = e.target.closest('[data-lkf]'); if (!el) return;
      const name = el.dataset.lkf;
      if (name === 'min' || name === 'max') { commitPrice(document.activeElement === el ? name : ''); return; }
      if (name === 'section') { Object.assign(st, parseSection(el.value)); st = prune(list, st); }
      else if (name === 'sort') st.sort = SORTS.some((x) => x[0] === el.value) ? el.value : '';
      else if (name === 'facet') { const left = flip(st.facets[el.dataset.key] || [], el.value); if (left.length) st.facets[el.dataset.key] = left; else delete st.facets[el.dataset.key]; }
      else if (name === 'brand' || name === 'avail' || name === 'marks') st[name] = flip(st[name], el.value);
      draw({ name, key: el.dataset.key || '', value: el.type === 'checkbox' ? el.value : null }); emit();
    });
    body.addEventListener('input', (e) => {
      const el = e.target.closest('[data-lkf="min"],[data-lkf="max"]'); if (!el) return;
      clearTimeout(timer); timer = setTimeout(() => commitPrice(el.dataset.lkf), 420);
    });
    body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-lkf="min"],[data-lkf="max"]')) { e.preventDefault(); commitPrice(e.target.dataset.lkf); } });
    findBox.addEventListener('input', () => { ui.find = findBox.value.slice(0, 60); draw(); body.scrollTop = 0; });
    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-lkf-act]'); if (!el) return;
      const act = el.dataset.lkfAct;
      if (act === 'more') { ui.more.add(el.dataset.id); draw(); body.querySelector(`[data-lkf-g="${CSS.escape(el.dataset.id)}"] .lkf-check:nth-of-type(${SHORT + 1}) input`)?.focus({ preventScroll: true }); return; }
      if (act === 'reset') { clearTimeout(timer); st = cleared(st, { q: st.q }); ui.find = ''; findBox.value = ''; draw(); emit(); body.querySelector('[data-lkf="section"]')?.focus({ preventScroll: true }); return; }
      if (timer) commitPrice('');
      if (act === 'apply' && typeof cfg.onApply === 'function') cfg.onApply(copy(st));
      if (act === 'close' && typeof cfg.onClose === 'function') cfg.onClose();
    });
    return {
      set(next, nextList) { clearTimeout(timer); timer = null; st = copy(next); if (nextList) list = nextList; draw(); },
      get: () => copy(st),
      destroy() { clearTimeout(timer); root.innerHTML = ''; root.classList.remove('lkf'); },
    };
  }

  window.RCLk = {
    FACETS, AVAIL, MARKS, SORTS, hasCatalog: (sellerId) => SELLERS.has(sellerId),
    buildSkus, sectionOf, groupOf, items, itemOf, modelProps,
    blank, copy, apply, options, summary, chips, removeChip, toggle, cleared, prune, activeCount, skuLevel, matched,
    label, availLabel, markLabel, sectionValue, parseSection, sectionOptions, mount, norm, plural,
  };
})();
