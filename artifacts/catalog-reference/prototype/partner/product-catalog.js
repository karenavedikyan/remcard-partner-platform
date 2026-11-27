/* Каталог товаров партнёра: номенклатура из 1С, публикация на сайте remcard.ru, заявки клиентов с сайта.
   Пример — каталог партнёра «Оптовик» (двери, фурнитура, погонаж). Все данные демонстрационные.
   Название, цена и остаток приходят из 1С и в кабинете не редактируются. Партнёр управляет показом на сайте,
   филиалами, где товар представлен, и ценой по филиалам (правило филиала или своя цена товара).
   Закупочная цена и наценка видны только партнёру: сотрудникам, клиентам и на сайте они не показываются.
   Связь с клиентом — переписка по заявке через RemCard (кабинет и боты): телефон клиента не запрашивается и не хранится.
   Кроме своей 1С партнёр может добавить в каталог модели поставщика (вкладка «Поставщики», модуль catalog-suppliers.js):
   они публикуются как товары под заказ, а заказ поставщику отправляется из заявки клиента. */
import { supStatusBlock, supApplyPage, supSiteHint, handleSupMeAction, handleSupMeInput, SME } from "./supplier-status.js?v=sa6";
import { SUP, addedProducts, addedForSite, supplierView, renderSuppliersTab, renderSupplierPage, supplierModelPanel, supplierOrderBlock, lineSupplierTag, supplierOnboarding, handleSupplierAction, handleSupplierInput } from "./catalog-suppliers.js?v=sup1";
import { certTotals, certIncome, certPanel, handleCertAction } from "./catalog-cert.js?v=cert2";

const SELLER_ID = "s6";
const SELLER_NAME = "Оптовик";
const CLIENT_BASE = "../client/";
const FULL = { positions: 4762, photos: 3835, snapshot: "19c7701c" };
const PRICE_TYPES = [
  ["РРЦ Тандор", "розничная цена для сайта"],
  ["АкционнаяЦена_Тандор_Розница", "акционная розничная"],
  ["АкционнаяЦена_Тандор_ОПТ", "внутренняя, на сайте не показывается"],
  ["Минимальная", "внутренняя, на сайте не показывается"],
  ["Минимальная Осауленко", "внутренняя, на сайте не показывается"],
  ["Минимальная Ростов", "внутренняя, на сайте не показывается"],
  ["Эксклюзив Тандор", "внутренняя, на сайте не показывается"],
];
const PUBLIC_PRICE_TYPES = new Set(["РРЦ Тандор", "АкционнаяЦена_Тандор_Розница"]);
const STOCK_MODES = [["status", "Статус: «В наличии» или «Под заказ»"], ["exact", "Точное количество"], ["none", "Не показывать"]];
const BRANCHES = ["Краснодар, Ростовское шоссе, 30/3", "Краснодар, ул. 40 лет Победы, 168", "Краснодар, ул. Красных Партизан, 235", "Краснодар, ул. Новороссийская, 216/5", "Краснодар, ул. Российская, 414", "Новороссийск, ул. Исаева, 19"];
const ORDER_STATUS = {
  new: ["Новая", "accent"],
  accepted: ["Принята", ""],
  progress: ["В работе", ""],
  done: ["Выполнена", "good"],
  declined: ["Отказ", ""],
};
const QUICK_REPLIES = ["Всё в наличии, можно забирать.", "Уточню наличие и отвечу сегодня.", "Подскажите, когда вам удобно получить заказ?"];
/* Демо-ответы для показа общей переписки: клиент отвечает из своего бота, партнёр — из бота RemCard PROF. */
const DEMO_CLIENT_REPLIES = ["Спасибо, подойдёт. Когда можно забрать?", "Хорошо, жду. Напишите, пожалуйста, когда будет готово.", "Понял, спасибо."];
const DEMO_BOT_REPLIES = ["Да, всё есть в наличии — подготовим к вашему приезду.", "Заказ собран, можно забирать сегодня до 19:00.", "Уточню на складе и напишу в течение часа."];
const LOW_MARKUP = 25; /* наценка ниже этого процента подсвечивается как низкая */
const DISCOUNTS = [5, 10, 15, 20];
const DECLINE_REASONS = ["Нет в наличии и под заказ", "Клиент передумал", "Не удалось связаться", "Не доставляем по этому адресу", "Другое"];
const MODEL_STATUS = {
  live: ["На сайте", "good", "eye"],
  hidden: ["Скрыт вами", "", "eye-off"],
  nophoto: ["Нет фото", "accent", "image-off"],
  noprice: ["Нет цены", "accent", "circle-alert"],
};

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
const num = (n) => Math.round(n).toLocaleString("ru-RU");
const rub = (n) => `${num(n)} ₽`;
const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const clip = (v, n = 200) => String(v ?? "").slice(0, n);

/* 1С-only позиции, которые не могут быть опубликованы: показывают правило «без фото и без цены на сайт не выходит». */
const EXTRA = [
  { id: "x901", cat: "hardware", name: "Наличник телескопический 70×8×2150", variant: "Снежно-белый", price: 640, unit: "шт", imgs: [], colors: ["Снежно-белый", "Белый"], specs: { Ширина: "70 мм", Покрытие: "ЭВО ПЭТ", Длина: "2150 мм" }, avail: "in" },
  { id: "x902", cat: "hardware", name: "Добор телескопический 100×10×2070", variant: "Белый", price: null, unit: "шт", imgs: [], colors: ["Белый"], specs: { Ширина: "100 мм", Покрытие: "ЭВО ПЭТ", Длина: "2070 мм" }, avail: "order" },
];

/* Разделы, варианты (позиции 1С) и свойства для фильтров — из общего слоя client/catalog-lk.js:
   кабинет и сайт считают одно и то же по одним правилам (как в ЛК «Тандор»). */
const LK = window.RCLk;
let cachedModels = null; let cachedVer = -1;
function models() {
  if (cachedModels && cachedVer === SUP.ver) return cachedModels;
  cachedVer = SUP.ver;
  /* Свои товары — из 1С партнёра. Модели поставщика (supplierOnly) попадают в каталог, только когда партнёр их добавил. */
  const src = (window.RCCatalogData?.products || []).filter((p) => p.seller === SELLER_ID && !p.supplierOnly);
  const added = addedProducts();
  const sup = new Map(added.map((x) => [x.p.id, x]));
  cachedModels = [...added.map((x) => x.p), ...src, ...EXTRA].map((p) => {
    const item = LK.itemOf(p);
    const from = sup.get(p.id) || null;
    /* Закупочная цена — демо: в продукте приходит из 1С отдельным типом цены. У части позиций её нет.
       У модели поставщика закупка — его дилерская цена. */
    const cost = from ? from.dealer : p.price == null || hash(`nocost:${p.id}`) % 31 === 0 ? null : Math.max(10, Math.round((p.price * (0.56 + (hash(`cost:${p.id}`) % 30) / 100)) / 10) * 10);
    return {
      id: p.id, cat: p.cat, name: p.name, variant: p.variant || "", section: item.section, group: item.group, brand: item.brand, price: p.price, oldPrice: p.oldPrice || null, cost, unit: p.unit,
      imgs: (p.imgs || []).map((x) => CLIENT_BASE + x), specs: p.specs || {}, desc: p.desc || "", skus: item.skus, item, onSite: !String(p.id).startsWith("x"),
      supplier: from ? from.supplier : null, supStock: from ? from.stock : null,
    };
  });
  return cachedModels;
}
const ownModels = () => models().filter((m) => !m.supplier);
const supModels = () => models().filter((m) => m.supplier);
const modelById = (id) => models().find((m) => m.id === id);
const modelIssues = (m) => [m.price == null ? "noprice" : null, m.imgs.length ? null : "nophoto"].filter(Boolean);
const modelStatus = (s, m) => { const issues = modelIssues(m); return issues[0] || (s.hidden.has(m.id) ? "hidden" : "live"); };
const stockOf = (m) => {
  if (m.supplier) return { text: "Под заказ", sub: `у поставщика ${num(m.supStock)} шт · ${m.supplier.days}` };
  const known = m.skus.filter((k) => k.stock != null);
  if (!known.length) return { text: "Под заказ", sub: "остатка в 1С нет" };
  const total = known.reduce((a, k) => a + k.stock, 0);
  return total ? { text: `${num(total)} шт`, sub: known.length < m.skus.length ? "по части вариантов нет данных" : "в наличии" } : { text: "Нет в наличии", sub: "ожидается поступление" };
};
const skuStock = (k) => (k.stock == null ? "нет данных" : k.stock === 0 ? "0" : num(k.stock));
const thumb = (m, icon, cls = "pc-thumb") => (m.imgs[0] ? `<img class="${cls}" src="${esc(m.imgs[0])}" alt="" loading="lazy">` : `<span class="${cls} pc-thumb--none" aria-label="Нет фото">${icon("image-off")}</span>`);
const statusPill = (code, icon) => { const [label, tone, ic] = MODEL_STATUS[code]; return `<span class="pill ${tone} pc-status">${icon(ic)}${label}</span>`; };
const orderPill = (code) => { const [label, tone] = ORDER_STATUS[code] || ORDER_STATUS.new; return `<span class="pill ${tone} pc-order-pill pc-order-pill--${code}">${label}</span>`; };

/* ---------- Закупка, наценка и филиалы ---------- */
/* Закупочная цена приходит из 1С вместе с номенклатурой и видна только партнёру (не сотруднику и не клиенту):
   на сайт она не попадает. По умолчанию товар представлен во всех филиалах по цене 1С; партнёр может выбрать
   филиалы для товара, задать правило цены филиала (% к цене 1С) и свою цену товара в филиале. Всё — демо, в памяти страницы. */
const BRANCH_IDS = BRANCHES.map((_, i) => i);
const BRANCH_SHORT = BRANCHES.map((b) => b.replace(/^Краснодар, /, ""));
const presentIn = (s, m) => BRANCH_IDS.filter((i) => !s.branchOff.get(m.id)?.has(i));
const rulePrice = (s, m, i) => (m.price == null ? null : s.branchPct[i] ? Math.max(10, Math.round((m.price * (1 + s.branchPct[i] / 100)) / 10) * 10) : m.price);
const branchPrice = (s, m, i) => s.branchPrice.get(m.id)?.[i] ?? rulePrice(s, m, i);
const priceIn = (s, m) => (s.branch === "" ? m.price : branchPrice(s, m, Number(s.branch)));
const branchRange = (s, m) => {
  if (m.price == null) return null;
  const ps = presentIn(s, m).map((i) => branchPrice(s, m, i));
  if (!ps.length) return null;
  const lo = Math.min(...ps); const hi = Math.max(...ps);
  return lo !== m.price || hi !== m.price ? { lo, hi } : null;
};
/* Наценка — к закупке; «запас на скидку» — на сколько процентов можно снизить цену, не уходя ниже закупки. */
const markup = (price, cost) => (price == null || !cost ? null : { rub: price - cost, pct: Math.round(((price - cost) / cost) * 100), room: Math.max(0, Math.floor(((price - cost) / price) * 100)) });
const mkTone = (mk) => (mk.pct < 0 ? "bad" : mk.pct < LOW_MARKUP ? "low" : "ok");
const mkPct = (mk) => `${mk.pct < 0 ? "−" : ""}${Math.abs(mk.pct)} %`;
const signed = (n) => `${n < 0 ? "−" : "+"}${num(Math.abs(n))}`;
const isLow = (s, m) => { const mk = markup(priceIn(s, m), m.cost); return !!mk && mk.pct < LOW_MARKUP; };
const skuCost = (m, k) => (m.cost == null || k.price == null || !m.price ? null : Math.round((k.price * m.cost) / m.price / 10) * 10);
/* Остаток по филиалам в демо делится от общего остатка 1С по устойчивым долям. */
const branchStock = (m, i) => {
  const known = m.skus.filter((k) => k.stock != null);
  if (!known.length) return null;
  const total = known.reduce((a, k) => a + k.stock, 0);
  const w = BRANCH_IDS.map((j) => 1 + (hash(`${m.id}:${j}`) % 5));
  const sum = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => Math.floor((total * x) / sum));
  parts[0] += total - parts.reduce((a, b) => a + b, 0);
  return parts[i];
};
const branchesText = (n) => (n === BRANCHES.length ? `Все ${n}` : `${n} из ${BRANCHES.length}`);

/* ---------- Заявки ---------- */
function orderLine(pid, size, color, qty) {
  const m = modelById(pid);
  if (!m) return null;
  const sku = m.skus.find((k) => k.size === (size || "") && k.color === color) || m.skus.find((k) => k.size === (size || "")) || m.skus[0];
  return { pid, name: m.name, name1c: sku.name1c, size: sku.size, color: sku.color, qty, price: m.price || 0, stock: sku.stock, img: m.imgs[0] || "" };
}
function seedOrders() {
  const mk = (o, lines) => { const items = lines.map((l) => orderLine(...l)).filter(Boolean); return { ...o, unread: o.unread || 0, chat: (o.chat || []).map(([from, when, text, src]) => ({ from, when, text, src: src || (from === "seller" ? "lk" : "bot") })), items, sum: items.reduce((a, i) => a + i.price * i.qty, 0) }; };
  return [
    mk({ id: "1042", date: "сегодня, 09:12", client: "Марина Ковалёва", via: "Telegram", receive: `Самовывоз · ${BRANCHES[0]}`, comment: "Нужны три двери в одном цвете, заберём в субботу.", status: "new", chat: [], history: [["сегодня, 09:12", "Клиент отправил заявку с сайта remcard.ru"]] }, [["p004", "800", "Снежно-белый", 3], ["p037", "", "Чёрный", 3], ["p020", "", "Чёрный", 6]]),
    mk({ id: "1039", date: "вчера, 17:40", client: "Игорь Савченко", via: "MAX", receive: "Доставка · Краснодар, ул. Кожевенная, 28, кв. 114", comment: "Подъём на 9 этаж, грузовой лифт есть.", status: "progress", unread: 1, chat: [["seller", "вчера, 18:05", "Игорь, добрый день. Дверь в наличии, привезём завтра с 10 до 14 — удобно?"], ["client", "вчера, 18:20", "Да, удобно, буду дома.", "bot"], ["client", "сегодня, 08:41", "Подскажите, порог и наличники идут в комплекте?", "bot"]], history: [["вчера, 17:40", "Клиент отправил заявку с сайта remcard.ru"], ["вчера, 18:05", "Заявка принята"], ["сегодня, 08:30", "Взята в работу"]] }, [["p139", "960×2050", "Белый", 1]]),
    mk({ id: "1031", date: "19 ноя, 12:15", client: "Анна Петрова", via: "Telegram", receive: `Самовывоз · ${BRANCHES[2]}`, comment: "", status: "done", chat: [["seller", "20 ноя, 10:05", "Анна, заказ собран, можно забирать с 9 до 19.", "bot"], ["client", "20 ноя, 11:30", "Спасибо, приеду в субботу.", "site"]], history: [["19 ноя, 12:15", "Клиент отправил заявку с сайта remcard.ru"], ["19 ноя, 12:40", "Заявка принята"], ["20 ноя, 10:00", "Взята в работу"], ["22 ноя, 15:20", "Выполнена"]] }, [["p011", "800", "Снежно-белый", 4], ["p011", "700", "Снежно-белый", 1], ["p130", "", "Белый", 14]]),
    mk({ id: "1027", date: "17 ноя, 10:02", client: "Олег Т.", via: "MAX", receive: `Самовывоз · ${BRANCHES[5]}`, comment: "Нужно до пятницы.", status: "declined", reason: "Нет в наличии и под заказ", chat: [["seller", "17 ноя, 11:28", "Олег, к пятнице этой модели не будет. Могу предложить похожую — Mona-58, она в наличии."]], history: [["17 ноя, 10:02", "Клиент отправил заявку с сайта remcard.ru"], ["17 ноя, 11:30", "Отказ: нет в наличии и под заказ"]] }, [["p005", "900", "Белый", 2]]),
  ];
}
/* Заявка, отправленная на клиентском сайте прототипа: приходит в ссылке, чтобы показать путь «клиент → продавец». */
function incomingOrder() {
  try {
    const raw = new URLSearchParams(window.location.search).get("rc_order");
    if (!raw) return null;
    const data = JSON.parse(decodeURIComponent(escape(atob(raw.replace(/-/g, "+").replace(/_/g, "/")))));
    if (!data || !Array.isArray(data.i)) return null;
    const items = data.i.slice(0, 40).map((l) => { const qty = Math.min(999, Math.max(1, parseInt(l.q, 10) || 1)); return orderLine(clip(l.p, 16), clip(l.s, 24), clip(l.c, 40), qty); }).filter(Boolean);
    if (!items.length) return null;
    const id = /^\d{3,6}$/.test(String(data.n)) ? String(data.n) : "1043";
    const when = clip(data.d, 30) || "только что";
    const chat = (Array.isArray(data.t) ? data.t : []).slice(0, 20).map((t) => ({ from: "client", when, text: clip(t, 400), src: "site" })).filter((m) => m.text.trim());
    return {
      id, date: when, client: clip(data.c?.name, 60) || "Клиент с сайта", via: data.c?.via === "MAX" ? "MAX" : "Telegram",
      receive: clip(data.r, 160) || "Самовывоз", comment: clip(data.m, 400), status: "new", items, sum: items.reduce((a, i) => a + i.price * i.qty, 0),
      cert: data.k ? { code: clip(data.k, 24), by: "client", confirmed: false } : null,
      history: [[when, "Клиент отправил заявку с сайта remcard.ru"], ...(data.k ? [[when, `Клиент внёс сертификат ${clip(data.k, 24)}`]] : [])], fresh: true, chat, unread: chat.length,
    };
  } catch (error) {
    return null;
  }
}
const INCOMING = typeof window === "undefined" ? null : incomingOrder();

/* Отправленные клиенту расчёты по дверям: калькулятор возвращает результат в адресе страницы, дальше он хранится в памяти (без браузерного хранилища). */
const doorSentMem = new Map();
const DOOR_BACK = (() => {
  try {
    const q = new URLSearchParams(location.search);
    const id = q.get("door_order");
    if (!id) return null;
    const raw = q.get("door_sent");
    if (raw) doorSentMem.set(id, JSON.parse(raw));
    return { order: id };
  } catch (e) { return null; }
})();

const workspaces = new Map();
function ws(key) {
  if (!workspaces.has(key)) {
    const orders = seedOrders().filter((o) => !INCOMING || o.id !== INCOMING.id);
    workspaces.set(key, {
      tab: INCOMING ? "orders" : "items", q: "", section: "", status: "", branch: "", low: false, onlySup: false, supOrders: [], f: LK.blank(),
      /* закупка и наценка: показываются только партнёру, можно скрыть (например, при клиенте) */
      manage: true, showCost: true,
      /* филиалы: где товара нет (id → филиалы), своя цена товара в филиале (id → {филиал: цена}), правило цены филиала в % к цене 1С */
      branchOff: new Map(), branchPrice: new Map(), branchPct: BRANCHES.map(() => 0), brTarget: [], hidden: new Set(), view: "", shot: 0, order: "", ofilter: "", selected: new Set(), layout: "list", full: false, draft: "", device: "desktop",
      orders: INCOMING ? [{ ...INCOMING, history: [...INCOMING.history], chat: INCOMING.chat.map((m) => ({ ...m })) }, ...orders] : orders,
      priceType: "РРЦ Тандор", stockMode: "status", autoPublish: true, syncing: false,
      log: [
        { when: "сегодня, 06:00", kind: "ok", title: "Обмен выполнен", text: "Изменено цен: 38 · обновлено остатков: 412 · новых позиций: 6 · фото: +14" },
        { when: "вчера, 06:00", kind: "ok", title: "Обмен выполнен", text: "Изменено цен: 0 · обновлено остатков: 367 · новых позиций: 0" },
        { when: "23 ноя, 06:00", kind: "warn", title: "Неполная выгрузка — каталог на сайте не изменён", text: "В файле 1 904 позиции вместо ожидаемых 4 700+. Опубликованные товары оставлены как были, обмен повторён на следующий день." },
        { when: "22 ноя, 06:00", kind: "ok", title: "Обмен выполнен", text: "Изменено цен: 112 · обновлено остатков: 398 · новых позиций: 2" },
      ],
    });
  }
  /* Возврат из калькулятора дверей: открываем ту заявку, из которой его запускали. */
  if (DOOR_BACK && !ws.__doorBackDone) {
    ws.__doorBackDone = true;
    const w = workspaces.get(key);
    if (w.orders.some((o) => o.id === DOOR_BACK.order)) { w.tab = "orders"; w.order = DOOR_BACK.order; }
  }
  return workspaces.get(key);
}

/* ---------- Вкладка «Товары» ---------- */
/* Поиск, раздел и фильтр «как в ЛК» считает общий слой; статус показа, филиал и наценка — только в кабинете. */
const filterState = (s) => ({ ...s.f, q: s.q, ...LK.parseSection(s.section) });
const setFilter = (s, st) => { s.section = LK.sectionValue(st); s.f = { ...LK.copy(st), q: "", section: "", group: "" }; };
const inScope = (s, m) => (!s.status || modelStatus(s, m) === s.status) && (s.branch === "" || !s.branchOff.get(m.id)?.has(Number(s.branch))) && (!s.low || !s.manage || isLow(s, m)) && (!s.onlySup || !!m.supplier);
/* Значения в фильтре считаются по тем же моделям, что и список: с выбранным статусом показа и филиалом. */
const poolOf = (s) => models().filter((m) => inScope(s, m)).map((m) => m.item);
function filteredRows(s) {
  const byId = new Map(models().map((m) => [m.id, m]));
  return LK.apply(models().map((m) => m.item), filterState(s)).map((r) => ({ m: byId.get(r.item.id), matched: r.matched, item: r.item })).filter((r) => inScope(s, r.m));
}
const filteredModels = (s) => filteredRows(s).map((r) => r.m);
const prune = (s) => { const ids = new Set(filteredModels(s).map((m) => m.id)); s.selected = new Set([...s.selected].filter((id) => ids.has(id))); };
let panel = null; /* открытая панель фильтра: { el, api } */
function renderItems(s, icon) {
  const all = models();
  const count = (code) => all.filter((m) => modelStatus(s, m) === code).length;
  const attention = count("nophoto") + count("noprice");
  const found = filteredRows(s);
  const list = found.map((r) => r.m);
  const st = filterState(s);
  const opts = LK.options(poolOf(s), st);
  const money = s.manage && s.showCost;
  const fit = new Map(found.map((r) => [r.m.id, r.matched.length]));
  const partial = LK.skuLevel(st);
  const variants = (m) => (partial && fit.get(m.id) < m.skus.length ? `подходит ${fit.get(m.id)} из ${m.skus.length}` : `${m.skus.length} ${plural(m.skus.length, "вариант", "варианта", "вариантов")}`);
  const active = LK.activeCount(st);
  const chips = [s.q.trim() ? { id: "q", text: `Поиск: ${s.q.trim()}` } : null, ...LK.chips(st, "partner"), s.status ? { id: "status", text: `Статус: ${MODEL_STATUS[s.status][0]}` } : null,
    s.branch !== "" ? { id: "branch", text: `Филиал: ${BRANCH_SHORT[Number(s.branch)]}` } : null, s.low && s.manage ? { id: "low", text: `Наценка ниже ${LOW_MARKUP} %` } : null, s.onlySup ? { id: "sup", text: "От поставщиков" } : null,
    st.sort ? { id: "sort", text: `Сортировка: ${(LK.SORTS.find((x) => x[0] === st.sort) || [])[1].toLowerCase()}` } : null].filter(Boolean);
  const quick = [...LK.MARKS.map(([code, , short]) => ({ id: `marks:${code}`, text: short === "Хит" ? "Хит продаж" : short, on: st.marks.includes(code), n: opts.marks.find((x) => x.value === code)?.count ?? 0 })),
    { id: "avail:in", text: "В наличии", on: st.avail.includes("in"), n: opts.avail.find((x) => x.value === "in")?.count ?? 0 },
    money ? { id: "low", text: `Наценка ниже ${LOW_MARKUP} %`, on: s.low, n: list.filter((m) => isLow(s, m)).length } : null,
    supModels().length || s.onlySup ? { id: "sup", text: "От поставщиков", on: s.onlySup, n: s.onlySup ? list.length : list.filter((m) => m.supplier).length } : null].filter(Boolean);
  const supFlag = (m) => (m.supplier ? `<small class="pc-row-sup" data-testid="pc-sup-flag-${m.id}">${icon("factory")}${esc(m.supplier.name)} · под заказ</small>` : "");
  const picked = list.filter((m) => s.selected.has(m.id));
  const allPicked = list.length > 0 && picked.length === list.length;
  const canHide = picked.filter((m) => modelStatus(s, m) === "live").length;
  const canShow = picked.filter((m) => modelStatus(s, m) === "hidden").length;
  const models_ = (n) => `${n} ${plural(n, "модель", "модели", "моделей")}`;
  const pick = (m) => `<label class="pc-pick"><input type="checkbox" data-pc-action="sel:${m.id}" data-testid="pc-select-${m.id}" ${s.selected.has(m.id) ? "checked" : ""} aria-label="Выбрать: ${esc(m.name)}"></label>`;
  const action = (m, code) => (code === "live" || code === "hidden" ? `<button type="button" class="btn pc-btn-sm" data-pc-action="toggle:${m.id}">${code === "live" ? "Скрыть" : "Показать"}</button>` : `<button type="button" class="btn pc-btn-sm" data-pc-action="open:${m.id}">Что исправить</button>`);
  const price = (m) => {
    if (m.price == null) return '<span class="muted">не задана</span>';
    const p = priceIn(s, m); const range = s.branch === "" ? branchRange(s, m) : null;
    return `<strong>${rub(p)}</strong>${money ? `<small>${m.cost == null ? "закупки нет в 1С" : `${m.supplier ? "дилерская" : "закупка"} ${rub(m.cost)}`}</small>` : ""}${range ? `<small class="pc-brnote">в филиалах ${num(range.lo)}–${num(range.hi)} ₽</small>` : s.branch !== "" && p !== m.price ? `<small class="pc-brnote">в 1С ${rub(m.price)}</small>` : ""}`;
  };
  const mkCell = (m) => { const mk = markup(priceIn(s, m), m.cost); return mk ? `<strong class="pc-mk pc-mk--${mkTone(mk)}">${mkPct(mk)}</strong><small>${signed(mk.rub)} ₽ с шт.</small>` : '<span class="muted">—</span>'; };
  const brCell = (m) => { const n = presentIn(s, m).length; return s.manage ? `<button type="button" class="pc-brbtn ${n < BRANCHES.length ? "is-part" : ""}" data-pc-action="branches:${m.id}" data-testid="pc-branches-${m.id}" aria-label="Филиалы: ${branchesText(n).toLowerCase()}. Изменить">${icon("map-pin")}<span>${branchesText(n)}</span></button>` : `<span>${branchesText(n)}</span>`; };
  const rows = list.map((m) => {
    const code = modelStatus(s, m); const stock = stockOf(m);
    return `<article class="pc-row ${s.selected.has(m.id) ? "is-picked" : ""}" data-testid="pc-model-${m.id}">
      ${pick(m)}
      <button type="button" class="pc-row-main" data-pc-action="open:${m.id}" aria-label="Открыть: ${esc(m.name)}">${thumb(m, icon)}<span class="pc-row-title"><strong>${esc(m.name)}</strong><small>${esc(m.variant)}</small><small class="pc-row-var">${variants(m)}</small>${supFlag(m)}${code === "live" ? "" : `<small class="pc-row-flag">${MODEL_STATUS[code][0]}</small>`}</span></button>
      <span class="pc-cell pc-cell--price" data-label="Цена">${price(m)}</span>
      ${money ? `<span class="pc-cell pc-cell--mk" data-label="Наценка">${mkCell(m)}</span>` : ""}
      <span class="pc-cell pc-cell--stock" data-label="Остаток"><span>${esc(stock.text)}</span><small class="pc-stock-sub">${esc(stock.sub)}</small><small class="pc-stock-br">${presentIn(s, m).length === BRANCHES.length ? "все филиалы" : `филиалов: ${presentIn(s, m).length} из ${BRANCHES.length}`}</small></span>
      <span class="pc-cell pc-cell--br" data-label="Филиалы">${brCell(m)}</span>
      <span class="pc-cell pc-cell--status">${statusPill(code, icon)}</span>
      <span class="pc-cell pc-cell--act">${action(m, code)}</span>
    </article>`;
  }).join("");
  const cards = list.map((m) => {
    const code = modelStatus(s, m); const stock = stockOf(m); const mk = markup(priceIn(s, m), m.cost); const n = presentIn(s, m).length;
    return `<article class="pc-card ${s.selected.has(m.id) ? "is-picked" : ""}" data-testid="pc-model-${m.id}">
      ${pick(m)}
      <button type="button" class="pc-card-photo" data-pc-action="open:${m.id}" aria-label="Открыть: ${esc(m.name)}">${m.imgs[0] ? `<img src="${esc(m.imgs[0])}" alt="" loading="lazy">` : `<span class="pc-card-nophoto">${icon("image-off")}Фото из 1С не пришло</span>`}</button>
      <div class="pc-card-body">
        <button type="button" class="pc-card-title" data-pc-action="open:${m.id}"><strong>${esc(m.name)}</strong><small>${esc(m.variant)} · ${variants(m)}</small></button>
        ${supFlag(m)}
        <div class="pc-card-nums">${m.price == null ? '<span class="muted">не задана</span>' : `<strong>${rub(priceIn(s, m))}</strong>`}<span>${esc(stock.text)}</span></div>
        ${money && m.price != null ? `<div class="pc-card-mk">${mk ? `<span>${m.supplier ? "дилерская" : "закупка"} ${rub(m.cost)}</span><b class="pc-mk pc-mk--${mkTone(mk)}">${mkPct(mk)}</b>` : "<span>закупки нет в 1С</span>"}</div>` : ""}
        <div class="pc-card-br">${icon("map-pin")}${n === BRANCHES.length ? "во всех филиалах" : `в ${n} из ${BRANCHES.length} филиалов`}</div>
        <div class="pc-card-foot">${statusPill(code, icon)}${action(m, code)}</div>
      </div>
    </article>`;
  }).join("");
  const toolbar = `<div class="pc-toolbar ${picked.length ? "is-bulk" : ""}" data-testid="pc-toolbar">
      <label class="pc-pick pc-pick--all"><input type="checkbox" data-pc-action="selall" data-testid="pc-select-all" data-pc-partial="${picked.length > 0 && !allPicked}" ${allPicked ? "checked" : ""} ${list.length ? "" : "disabled"}><span>${picked.length ? `Выбрано ${picked.length} из ${list.length}` : `Выбрать все · ${models_(list.length)}`}</span></label>
      ${picked.length ? `<div class="pc-bulk" data-testid="pc-bulk-bar"><button type="button" class="btn pc-btn-sm" data-pc-action="bulk:hide" data-testid="pc-bulk-hide" ${canHide ? "" : "disabled"}>${icon("eye-off")} Скрыть с сайта${canHide ? ` · ${canHide}` : ""}</button><button type="button" class="btn pc-btn-sm" data-pc-action="bulk:show" data-testid="pc-bulk-show" ${canShow ? "" : "disabled"}>${icon("eye")} Показать на сайте${canShow ? ` · ${canShow}` : ""}</button>${s.manage ? `<button type="button" class="btn pc-btn-sm" data-pc-action="branches:" data-testid="pc-bulk-branches">${icon("map-pin")} Филиалы</button>` : ""}<button type="button" class="linkbtn pc-bulk-clear" data-pc-action="bulk:clear" data-testid="pc-bulk-clear">Снять выбор</button></div>` : ""}
      <div class="pc-view">
        ${s.manage ? `<button type="button" class="btn pc-btn-sm pc-cost-btn ${s.showCost ? "is-on" : ""}" data-pc-action="cost" data-testid="pc-cost-toggle" aria-pressed="${s.showCost}" title="${s.showCost ? "Скрыть закупку и наценку, например при клиенте" : "Показать закупку и наценку"}">${icon(s.showCost ? "eye" : "eye-off")}<span>Закупка и наценка</span></button>` : ""}
        <div class="pc-seg" role="group" aria-label="Вид списка"><button type="button" class="${s.layout === "list" ? "selected" : ""}" data-pc-action="layout:list" data-testid="pc-layout-list" aria-pressed="${s.layout === "list"}">${icon("list")}<span>Список</span></button><button type="button" class="${s.layout === "cards" ? "selected" : ""}" data-pc-action="layout:cards" data-testid="pc-layout-cards" aria-pressed="${s.layout === "cards"}">${icon("layout-grid")}<span>Карточки</span></button></div>
        <button type="button" class="btn pc-btn-sm pc-full-btn" data-pc-action="full" data-testid="pc-fullscreen" aria-pressed="${s.full}">${icon(s.full ? "minimize-2" : "maximize-2")}<span>${s.full ? "Свернуть" : "На весь экран"}</span></button>
      </div>
    </div>`;
  const body = !list.length ? `<div class="panel empty" data-testid="pc-empty"><h3>Ничего не найдено</h3><p class="muted">Проверьте написание модели или снимите часть фильтров.</p><button type="button" class="btn" data-pc-action="reset">Сбросить фильтры</button></div>`
    : s.layout === "cards" ? `<section class="pc-cards" aria-label="Товары каталога">${cards}</section>`
      : `<section class="pc-list ${money ? "pc-list--money" : ""}" aria-label="Товары каталога" data-testid="pc-list"><div class="pc-row pc-row--head" aria-hidden="true"><span></span><span>Модель</span><span>Цена${money ? " · закупка" : ""}</span>${money ? '<span class="pc-cell--mk">Наценка</span>' : ""}<span class="pc-cell--stock">Остаток</span><span class="pc-cell--br">Филиалы</span><span class="pc-cell--status">Статус</span><span></span></div>${rows}</section>`;
  const priced = all.filter((m) => markup(m.price, m.cost));
  const avg = priced.length ? { pct: Math.round(priced.reduce((a, m) => a + markup(m.price, m.cost).pct, 0) / priced.length), rub: Math.round(priced.reduce((a, m) => a + (m.price - m.cost), 0) / priced.length) } : null;
  const supN = supModels().length;
  return `<div class="stats pc-stats ${money && avg ? "pc-stats--4" : ""}">
      <div class="stat" data-testid="pc-stat-models"><span class="small">${supN ? "Моделей в каталоге" : "Моделей из 1С"}</span><strong>${all.length}</strong><small>${supN ? `${all.length - supN} из вашей 1С · ${supN} от поставщика` : `${all.reduce((a, m) => a + m.skus.length, 0)} вариантов · демо-выборка`}</small></div>
      <div class="stat"><span class="small">На сайте remcard.ru</span><strong>${count("live")}</strong><small>видят клиенты</small></div>
      <div class="stat"><span class="small">Требуют внимания</span><strong>${attention}</strong><small>${attention ? "нет фото или цены — на сайт не выходят" : "всё в порядке"}</small></div>
      ${money && avg ? `<div class="stat" data-testid="pc-stat-markup"><span class="small">Средняя наценка</span><strong>${avg.pct} %</strong><small>в среднем ${signed(avg.rub)} ₽ с единицы · видно только вам</small></div>` : ""}
    </div>
    ${s.full ? `<div class="pc-full-title"><strong>Товары из 1С</strong><span>«${SELLER_NAME}» · на сайте ${count("live")} из ${all.length}</span></div>` : ""}
    <div class="panel pc-filters">
      <label class="field pc-search"><span class="pc-flabel">Поиск</span><input type="search" data-pc-input="q" value="${esc(s.q)}" maxlength="160" placeholder="Модель, цвет или артикул" data-testid="pc-search"></label>
      <label class="field"><span class="pc-flabel">Раздел</span><select data-pc-input="section" data-testid="pc-section-filter">${LK.sectionOptions(opts, st)}</select></label>
      <label class="field"><span class="pc-flabel">Статус</span><select data-pc-input="status" data-testid="pc-status-filter"><option value="">Все статусы</option>${Object.entries(MODEL_STATUS).map(([code, [label]]) => `<option value="${code}" ${s.status === code ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span class="pc-flabel">Филиал</span><select data-pc-input="branch" data-testid="pc-branch-filter"><option value="">Все филиалы</option>${BRANCH_IDS.map((i) => `<option value="${i}" ${s.branch === String(i) ? "selected" : ""}>${esc(BRANCH_SHORT[i])}</option>`).join("")}</select></label>
      <button type="button" class="btn pc-filter-btn ${active ? "is-on" : ""} ${panel ? "is-open" : ""}" data-pc-action="filters" data-testid="pc-filters-open" aria-expanded="${!!panel}" aria-controls="pc-fpanel">${icon("sliders-horizontal")}<span>${panel ? "Скрыть фильтры" : "Все фильтры"}</span>${active ? `<em>${active}</em>` : ""}</button>
    </div>
    <div class="pc-quick" role="group" aria-label="Быстрый отбор" data-testid="pc-quick">${quick.map((x) => `<button type="button" class="${x.on ? "selected" : ""}" data-pc-action="quick:${x.id}" data-testid="pc-quick-${x.id.replace(":", "-")}" aria-pressed="${x.on}" ${x.n || x.on ? "" : "disabled"}>${esc(x.text)}<em>${x.n}</em></button>`).join("")}<span class="pc-quick-note">Свойства и отметки приходят из 1С</span></div>
    ${chips.length ? `<div class="pc-found" data-testid="pc-found"><span class="pc-found-n">Найдено: ${esc(LK.summary(found).text)}</span><div class="pc-fchips">${chips.map((c) => `<button type="button" data-pc-action="chip:${esc(c.id)}" aria-label="Убрать условие: ${esc(c.text)}">${esc(c.text)}${icon("x")}</button>`).join("")}</div><button type="button" class="linkbtn" data-pc-action="reset" data-testid="pc-reset">Сбросить фильтры</button></div>` : ""}
    ${toolbar}
    ${body}
    <p class="small pc-foot">Название, цена и остаток приходят из 1С и меняются только там. ${supN ? `Модели с пометкой «от поставщика» добавлены из его каталога: карточку ведёт поставщик, продаются под заказ${s.manage ? ", цену клиенту назначаете вы" : ""}. ` : ""}${s.manage ? "Здесь вы решаете, показывать ли товар на сайте, в каких филиалах он представлен и по какой цене. Закупочная цена и наценка видны только вам: на сайт и клиентам они не попадают." : "Здесь вы решаете, показывать ли товар на сайте. Филиалы и цены по филиалам настраивает владелец."}</p>`;
}

const mkSpan = (x) => (x ? `<b class="pc-mk pc-mk--${mkTone(x)}">${mkPct(x)}</b>` : "—");
/* Подпись под ценой филиала: откуда цена и какая получается наценка. Обновляется на месте, без перерисовки карточки. */
function branchMeta(s, m, i) {
  const own = s.branchPrice.get(m.id)?.[i]; const rule = rulePrice(s, m, i); const pct = s.branchPct[i];
  const here = !s.branchOff.get(m.id)?.has(i); const x = markup(branchPrice(s, m, i), m.cost);
  const source = own != null ? `своя цена${s.manage ? ` · <button type="button" class="linkbtn" data-pc-action="bprice-reset:${i}">вернуть ${rub(rule)}</button>` : ""}` : pct ? `правило филиала: ${signed(pct)} % к ${m.supplier ? "вашей цене" : "цене 1С"}` : m.supplier ? "ваша цена клиенту" : "как в 1С";
  return `<span>${source}</span>${s.manage && s.showCost && here && x ? `<span class="${x.rub < 0 ? "pc-brloss" : ""}">наценка ${mkSpan(x)} · ${signed(x.rub)} ₽${x.rub < 0 ? " · ниже закупки" : ""}</span>` : ""}`;
}
function renderModel(s, icon, m) {
  const st = modelStatus(s, m); const issues = modelIssues(m);
  const shot = Math.min(s.shot, Math.max(0, m.imgs.length - 1));
  const money = s.manage && s.showCost;
  const fitKeys = new Set(LK.matched(m.item, filterState(s)).map((k) => k.key));
  const outside = (k) => LK.skuLevel(filterState(s)) && fitKeys.size > 0 && !fitKeys.has(k.key);
  const props = [["Раздел", m.group ? `${m.section} · ${m.group}` : m.section], m.brand ? ["Бренд", m.brand] : null, ...LK.modelProps(m.item).map(([key, vals]) => [key, vals.join(", ")])].filter(Boolean);
  const issueText = { nophoto: "В 1С к позиции не прикреплено фото. Добавьте фото в карточку номенклатуры — после следующего обмена товар можно будет опубликовать.", noprice: `В 1С не задана цена типа «${esc(s.priceType)}». Установите цену — после следующего обмена товар можно будет опубликовать.` };
  const mk = markup(m.price, m.cost);
  const sup = m.supplier;
  /* Ссылка «Как видит клиент»: модели поставщика клиент видит, только если они добавлены — передаём их в адресе. */
  const addedQs = addedForSite(new Set(supModels().filter((x) => modelStatus(s, x) === "live").map((x) => x.id)));
  const clientHref = `${CLIENT_BASE}index.html${addedQs.length ? `?rc_added=${addedQs.join(".")}` : ""}#/catalog/p/${esc(m.id)}`;
  /* Закупка, наценка и «что будет при скидке» — только для партнёра. */
  const moneyPanel = !money || m.price == null ? "" : `<section class="panel stack pc-money" data-testid="pc-money"><div class="row between"><h3>Закупка и наценка</h3><span class="pill pc-status">${icon("lock")}видно только вам</span></div>
      ${mk ? `<div class="pc-figs"><div><span>Цена на сайте</span><strong>${rub(m.price)}</strong></div><div><span>${sup ? "Дилерская цена" : "Закупка у поставщика"}</span><strong>${rub(m.cost)}</strong></div><div><span>Наценка</span><strong class="pc-mk pc-mk--${mkTone(mk)}">${mkPct(mk)}</strong></div><div><span>Доход с единицы</span><strong>${rub(mk.rub)}</strong></div></div>
      <div class="pc-table-wrap"><table class="pc-table pc-disc"><thead><tr><th>Скидка клиенту</th><th>Цена со скидкой</th><th>Ваш доход с единицы</th><th>Наценка</th></tr></thead><tbody>${DISCOUNTS.map((d) => { const p = Math.round(m.price * (1 - d / 100)); const x = markup(p, m.cost); return `<tr class="${x.rub < 0 ? "is-loss" : ""}"><td>${d} %</td><td data-l="Цена со скидкой">${rub(p)}</td><td data-l="Ваш доход с единицы">${x.rub < 0 ? `−${rub(-x.rub)}` : rub(x.rub)}</td><td data-l="Наценка">${mkSpan(x)}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="small">Без убытка можно дать скидку до <strong>${mk.room} %</strong>. ${sup ? "Дилерская цена поставщика видна только вам" : "Закупочная цена приходит из 1С и видна только вам"}: на сайте и клиентам она не показывается. Расчёт предварительный — без учёта скидки по сертификату RemCard и вознаграждений партнёрам.</p>` : `<p class="notice">${icon("circle-alert")}<span>В 1С нет закупочной цены этой позиции — наценка и доход не считаются. Они появятся после следующего обмена, когда цена закупки будет заполнена.</span></p>`}
    </section>`;
  /* Филиалы: по умолчанию товар есть везде по цене 1С; партнёр может выбрать филиалы и свою цену в каждом. */
  const on = new Set(presentIn(s, m));
  const branchRow = (i) => {
    const here = on.has(i); const own = s.branchPrice.get(m.id)?.[i]; const rule = rulePrice(s, m, i); const p = branchPrice(s, m, i); const stock = branchStock(m, i);
    return `<div class="pc-brrow ${here ? "" : "is-off"}" data-testid="pc-model-branch-${i}">
        <label class="pc-check"><input type="checkbox" data-pc-input="bron:${i}" data-testid="pc-branch-on-${i}" ${here ? "checked" : ""} ${s.manage ? "" : "disabled"}><span><strong>${esc(BRANCHES[i])}</strong><small>${here ? (sup ? `под заказ · поставка ${sup.days}` : stock == null ? "под заказ · остатка в 1С нет" : stock ? `в наличии ${num(stock)} шт` : "нет в наличии") : "товар здесь не представлен"}</small></span></label>
        ${m.price == null ? "" : s.manage ? `<label class="pc-brprice"><span>Цена в филиале, ₽</span><input type="text" inputmode="numeric" data-pc-input="bprice:${i}" data-testid="pc-branch-price-${i}" value="${own != null ? own : ""}" placeholder="${num(rule)}" maxlength="9" autocomplete="off" ${here ? "" : "disabled"}></label>` : `<div class="pc-brprice"><span>Цена в филиале</span><strong>${rub(p)}</strong></div>`}
        ${m.price == null ? "" : `<div class="pc-brmeta" data-pc-brmeta="${i}">${branchMeta(s, m, i)}</div>`}
      </div>`;
  };
  const branchPanel = `<section class="panel stack pc-brs" data-testid="pc-model-branches"><div class="row between"><h3>Филиалы и цены</h3><span class="small">${on.size === BRANCHES.length ? "представлен во всех филиалах" : `представлен в ${on.size} из ${BRANCHES.length} филиалов`}</span></div>
      <div class="pc-brlist">${BRANCH_IDS.map(branchRow).join("")}</div>
      <p class="small">${s.manage ? sup ? "Товар поставщика продаётся под заказ: клиент может получить его в любом отмеченном филиале. Снимите отметку, если филиал с ним не работает, или укажите свою цену для филиала — пустое поле означает цену по правилу филиала. Изменения демонстрационные." : "По умолчанию товар представлен во всех филиалах по цене из 1С. Снимите отметку, если в филиале его нет, или укажите свою цену для филиала — пустое поле означает цену по правилу филиала. Изменения демонстрационные и в 1С не передаются." : "Филиалы и цены настраивает владелец кабинета."}</p>
    </section>`;
  return `<div class="stack pc-section" data-testid="pc-model-view">
    <button type="button" class="linkbtn pc-back" data-pc-action="back">${icon("arrow-left")} Ко всем товарам</button>
    <section class="panel pc-model">
      <div class="pc-gallery">${m.imgs.length ? `<button type="button" class="pc-shot-btn" data-pc-action="zoom" data-testid="pc-shot-zoom" aria-label="Увеличить фото"><img class="pc-shot" src="${esc(m.imgs[shot])}" alt="${esc(m.name)}"><span class="pc-shot-zoom">${icon("zoom-in")}</span></button>${m.imgs.length > 1 ? `<div class="pc-shots">${m.imgs.map((src, i) => `<button type="button" class="${i === shot ? "selected" : ""}" data-pc-action="shot:${i}" aria-label="Фото ${i + 1}"><img src="${esc(src)}" alt=""></button>`).join("")}</div>` : ""}` : `<div class="pc-shot pc-shot--none">${icon("image-off")}<span>Фото из 1С не пришло</span></div>`}</div>
      <div class="stack pc-model-info">
        <div><span class="eyebrow">${esc(m.section)}</span><h2>${esc(m.name)}</h2><p class="muted">${esc(m.variant)}</p></div>
        <div class="row">${statusPill(st, icon)}${sup ? `<span class="pill accent pc-status">${icon("factory")}от поставщика «${esc(sup.name)}»</span>` : ""}<span class="pill">${m.skus.length} ${plural(m.skus.length, "вариант", "варианта", "вариантов")}</span><span class="pill">${m.imgs.length} фото</span><span class="pill">${on.size === BRANCHES.length ? "все филиалы" : `${on.size} из ${BRANCHES.length} филиалов`}</span></div>
        <div class="pc-price">${m.price == null ? '<span class="muted">Цена не задана</span>' : `${rub(m.price)}<small> / ${esc(m.unit)}</small>`}<span class="small">${sup ? `под заказ · поставка ${esc(sup.days)}` : `тип цены: ${esc(s.priceType)}`}${money && mk ? ` · ${sup ? "дилерская" : "закупка"} ${rub(m.cost)} · наценка ${mkPct(mk)}` : ""}</span></div>
        ${issues.map((code) => `<p class="notice accent">${issueText[code]}</p>`).join("")}
        ${issues.length ? "" : `<div class="row">${st === "live" ? `<button type="button" class="btn" data-pc-action="toggle:${m.id}">${icon("eye-off")} Скрыть с сайта</button><a class="btn" href="${clientHref}" target="_blank" rel="noopener" data-testid="pc-model-client-link">${icon("external-link")} Как видит клиент</a>` : `<button type="button" class="btn primary" data-pc-action="toggle:${m.id}">${icon("eye")} Показать на сайте</button>`}</div>`}
        ${m.desc ? `<p class="small">${esc(m.desc)}</p>` : ""}
      </div>
    </section>
    ${sup ? supplierModelPanel(s, icon, m) : ""}
    ${moneyPanel}
    ${branchPanel}
    <section class="panel stack"><div class="row between"><h3>${sup ? "Варианты поставщика" : "Варианты из 1С"}</h3><span class="small">одна модель на сайте — несколько позиций номенклатуры</span></div>
      <div class="pc-table-wrap"><table class="pc-table"><thead><tr><th>${sup ? "Позиция у поставщика" : "Позиция в 1С"}</th><th>Размер</th><th>Цвет</th><th>Цена</th>${money ? "<th>Закупка</th><th>Наценка</th>" : ""}<th>Остаток</th></tr></thead><tbody>${m.skus.map((k) => { const c = skuCost(m, k); return `<tr class="${outside(k) ? "is-outside" : ""}"><td>${esc(k.name1c)}${outside(k) ? ' <span class="pc-outside">вне фильтра</span>' : ""}<small>Арт. ${esc(k.art)} · GUID …${esc(k.guid)}</small></td><td data-l="Размер">${esc(k.size || "—")}</td><td data-l="Цвет">${esc(k.color || "—")}</td><td data-l="Цена">${k.price == null ? "—" : rub(k.price)}</td>${money ? `<td data-l="Закупка">${c == null ? "—" : rub(c)}</td><td data-l="Наценка">${mkSpan(markup(k.price, c))}</td>` : ""}<td data-l="Остаток">${sup ? "под заказ" : skuStock(k)}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="small">${sup ? `Клиент выбирает размер и цвет на сайте — в заявку и в заказ поставщику попадает конкретная позиция. Остаток ведёт поставщик; срок поставки — ${esc(sup.days)}.` : "Клиент выбирает размер и цвет на сайте — в заявку попадает конкретная позиция 1С. «Нет данных» по остатку не означает ноль: такой вариант показывается как «Под заказ»."}</p>
    </section>
    <section class="panel stack" data-testid="pc-model-props"><div class="row between"><h3>${sup ? "Свойства от поставщика" : "Свойства из 1С"}</h3><span class="small">по ним товар находят в фильтрах — в кабинете и на сайте</span></div><dl class="pc-specs">${props.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl><p class="small">Названия и значения свойств приходят из ${sup ? "каталога поставщика" : "1С"} и здесь не редактируются. Пустое свойство в фильтр не попадает и не считается значением «нет».</p></section>
  </div>`;
}

/* ---------- Вкладка «Заявки» ---------- */
function renderOrders(s, icon) {
  const count = (code) => s.orders.filter((o) => o.status === code).length;
  const list = s.orders.filter((o) => !s.ofilter || o.status === s.ofilter);
  const chips = [["", "Все", s.orders.length], ...Object.entries(ORDER_STATUS).map(([code, [label]]) => [code, label, count(code)])];
  return `<div class="stats pc-stats">
      <div class="stat"><span class="small">Новые</span><strong>${count("new")}</strong><small>ждут ответа клиенту</small></div>
      <div class="stat"><span class="small">В обработке</span><strong>${count("accepted") + count("progress")}</strong><small>приняты и в работе</small></div>
      <div class="stat"><span class="small">Выполнено</span><strong>${count("done")}</strong><small>за ноябрь · демо</small></div>
    </div>
    <div class="pc-chips" role="group" aria-label="Статус заявки">${chips.map(([code, label, n]) => `<button type="button" class="${s.ofilter === code ? "selected" : ""}" data-pc-action="ofilter:${code}">${label} <em>${n}</em></button>`).join("")}</div>
    ${list.length ? `<section class="pc-orders">${list.map((o) => `<article class="panel pc-order ${o.fresh ? "is-fresh" : ""}" data-testid="pc-order-${esc(o.id)}">
        <div class="pc-order-head"><div><strong>Заявка № ${esc(o.id)}</strong><small>${esc(o.date)}${o.fresh ? " · только что с сайта" : ""}</small></div>${orderPill(o.status)}</div>
        <div class="pc-order-body"><div class="pc-order-thumbs">${o.items.slice(0, 4).map((i) => (i.img ? `<img src="${esc(i.img)}" alt="" loading="lazy">` : "")).join("")}</div>
          <div class="pc-order-meta"><span><b>${esc(o.client)}</b> · бот RemCard в ${esc(o.via)}${o.unread ? ` <em class="pc-unread" data-testid="pc-unread-${esc(o.id)}">${o.unread} ${plural(o.unread, "новое сообщение", "новых сообщения", "новых сообщений")}</em>` : ""}</span><span class="muted">${o.items.length} ${plural(o.items.length, "позиция", "позиции", "позиций")} · ${esc(o.receive)}</span></div>
          <strong class="pc-order-sum">${rub(o.sum)}</strong></div>
        <div class="row pc-order-actions"><button type="button" class="btn ${o.status === "new" ? "primary" : ""}" data-pc-action="order:${esc(o.id)}">${o.status === "new" ? "Открыть и ответить" : "Открыть"}</button></div>
      </article>`).join("")}</section>` : `<div class="panel empty"><h3>Заявок с таким статусом нет</h3><button type="button" class="btn" data-pc-action="ofilter:">Показать все</button></div>`}
    <p class="small pc-foot">Заявка — это список товаров, который клиент собрал в каталоге на remcard.ru и отправил вам. Новые заявки и сообщения клиентов приходят сюда и в ваш бот RemCard PROF. Продажа, скидка и начисления по сертификату оформляются как обычно — в разделе «Сканер».</p>`;
}


/* Калькулятор дверей внутри заявки: расчёт по проёмам клиента и отправка предложения в переписку (прототип). */
const hasDoors = (o) => o.items.some((i) => modelById(i.pid)?.cat === "doors");
const doorSent = (o) => doorSentMem.get(o.id) || null;
function doorPanel(icon, o) {
  if (!hasDoors(o)) return "";
  const sent = doorSent(o);
  const href = `../door-calc/wizard.html?ctx=lk&order=${encodeURIComponent(o.id)}&client=${encodeURIComponent(o.client)}${sent ? `&sent=${encodeURIComponent(JSON.stringify(sent))}` : ""}`;
  return `<section class="panel stack pc-doorcalc" data-testid="pc-door-calc"><div class="row between"><h3>Расчёт по дверям</h3>${sent ? `<span class="pill ok">${icon("check")}отправлено клиенту</span>` : ""}</div>
    <p class="small">В заявке есть двери. Посчитайте проёмы клиента: полотно, коробка, добор, наличники и фурнитура. Модель можно взять из каталога или назвать свою, скидку задаёте вы. Готовое предложение уходит клиенту в переписку.</p>
    ${sent ? `<div class="pc-door-sent"><strong>${esc(sent.model)} · ${rub(sent.total)}</strong><small>${esc(sent.when)} · ${esc(sent.rows)} позиций · PDF в переписке</small></div>` : ""}
    <div class="row"><a class="btn primary" href="${href}" data-testid="pc-door-calc-open">${icon("door-open")} ${sent ? "Пересчитать двери" : "Рассчитать двери"}</a></div></section>`;
}
/* Переписка по заявке идёт через RemCard, без телефона: клиент пишет из своего бота RemCard (MAX или Telegram — что выбрал в заявке)
   или с сайта; партнёр получает сообщение и в кабинете, и в боте RemCard PROF и отвечает там, где удобнее. Лента одна, у каждого сообщения — пометка канала. */
const clientSrc = (o, m) => (m.src === "site" ? "с сайта" : `из бота в ${o.via}`);
const sellerSrc = (m) => (m.src === "bot" ? "из бота RemCard PROF" : "из кабинета");
function renderOrder(s, icon, o) {
  const actions = {
    new: `<button type="button" class="btn primary" data-pc-action="status:accepted" data-testid="pc-order-accept">${icon("check")} Принять заявку</button><button type="button" class="btn" data-pc-action="decline">Отказать</button>`,
    accepted: `<button type="button" class="btn primary" data-pc-action="status:progress">Взять в работу</button><button type="button" class="btn" data-pc-action="decline">Отказать</button>`,
    progress: `<button type="button" class="btn primary" data-pc-action="status:done">${icon("check")} Отметить выполненной</button><button type="button" class="btn" data-pc-action="decline">Отказать</button>`,
  }[o.status] || "";
  const stockNote = (i) => (i.stock == null ? '<span class="pc-stock pc-stock--ask">под заказ</span>' : i.stock >= i.qty ? `<span class="pc-stock pc-stock--ok">в наличии ${num(i.stock)}</span>` : `<span class="pc-stock pc-stock--low">в наличии ${num(i.stock)} из ${i.qty}</span>`);
  const via = esc(o.via);
  const msg = (m) => (m.from === "seller"
    ? `<li class="pc-msg pc-msg--seller"><p>${esc(m.text)}</p><span class="pc-msg-meta"><b>Вы</b><i class="pc-src">${icon(m.src === "bot" ? "bot" : "monitor")}${sellerSrc(m)}</i><time>${esc(m.when)}</time><i class="pc-deliv">${icon("check-check")}доставлено в ${via}</i></span></li>`
    : `<li class="pc-msg pc-msg--client"><p>${esc(m.text)}</p><span class="pc-msg-meta"><b>${esc(o.client)}</b><i class="pc-src">${icon(m.src === "site" ? "globe" : "bot")}${clientSrc(o, m)}</i><time>${esc(m.when)}</time></span></li>`);
  const doorMsg = (ic, d) => `<li class="pc-msg pc-msg--seller" data-testid="pc-door-msg"><p><b>Расчёт по дверям: ${esc(d.model)}</b><br>Итого ${rub(d.total)}${d.disc ? ` (скидка ${esc(d.disc)}%)` : ""}</p><span class="pc-door-file">${ic("file")}Предложение.pdf</span><span class="pc-msg-meta"><b>Вы</b><i class="pc-src">${ic("monitor")}из кабинета</i><time>${esc(d.when)}</time><i class="pc-deliv">${ic("check-check")}доставлено в ${via}</i></span></li>`;
  const chat = `<section class="panel stack pc-chat" data-testid="pc-chat">
        <div class="row between"><h3>Переписка с клиентом</h3><span class="pill pc-status">${icon("shield-check")}без телефона · через RemCard</span></div>
        <div class="pc-chan" data-testid="pc-chat-channels">
          <div>${icon("user")}<span><strong>Клиент</strong> пишет из своего бота RemCard в ${via} или с сайта, из заявки</span></div>
          <div>${icon("store")}<span><strong>Вы</strong> отвечаете здесь или в боте RemCard PROF — переписка общая</span></div>
        </div>
        ${o.chat.length || doorSent(o) ? `<ol class="pc-chat-log" data-testid="pc-chat-log">${o.chat.map(msg).join("")}${doorSent(o) ? doorMsg(icon, doorSent(o)) : ""}</ol>` : `<p class="muted pc-chat-empty">Сообщений пока нет. Напишите клиенту, чтобы подтвердить наличие, цену и срок, — он получит сообщение в своём боте.</p>`}
        <div class="pc-chips pc-chat-tpl" role="group" aria-label="Быстрые ответы">${QUICK_REPLIES.map((t, i) => `<button type="button" data-pc-action="tpl:${i}">${esc(t)}</button>`).join("")}</div>
        <label class="field">Сообщение клиенту<textarea data-pc-input="draft" data-testid="pc-chat-input" rows="3" maxlength="1000" placeholder="Например: всё в наличии, можно забирать завтра после 10:00">${esc(s.draft)}</textarea></label>
        <div class="row pc-chat-send"><button type="button" class="btn primary" data-pc-action="msg" data-testid="pc-chat-send">${icon("send")} Отправить</button><button type="button" class="linkbtn" data-pc-action="demo-reply" data-testid="pc-chat-demo-reply">Показать ответ клиента из бота (демо)</button></div>
        <p class="small">Клиент получит сообщение в боте RemCard в ${via} и сможет ответить прямо там или на сайте, в своей заявке. Его ответ придёт сюда и в ваш бот RemCard PROF.</p>
      </section>`;
  /* Как эта же переписка выглядит в боте партнёра. */
  const lastIn = [...o.chat].reverse().find((m) => m.from === "client");
  const lastBot = o.chat[o.chat.length - 1]?.from === "seller" && o.chat[o.chat.length - 1].src === "bot" ? o.chat[o.chat.length - 1] : null;
  const bot = `<section class="panel stack pc-bot" data-testid="pc-bot">
        <div class="row between"><h3>То же в вашем боте</h3><span class="small">RemCard PROF · Telegram или MAX</span></div>
        <div class="pc-bot-screen" aria-label="Пример сообщения в боте RemCard PROF">
          <div class="pc-bot-msg"><b>Заявка № ${esc(o.id)} · ${esc(o.client)}</b>${lastIn ? `<p>«${esc(clip(lastIn.text, 220))}»</p><small>${esc(lastIn.when)} · клиент пишет ${clientSrc(o, lastIn)}</small>` : `<p>Новая заявка с сайта: ${o.items.length} ${plural(o.items.length, "позиция", "позиции", "позиций")} на ${rub(o.sum)}.</p><small>${esc(o.date)} · клиент ответит в ${via}</small>`}
            <div class="pc-bot-keys"><button type="button" data-pc-action="bot-reply" data-testid="pc-bot-reply">Ответить</button><button type="button" data-pc-action="bot-open">Открыть заявку</button></div></div>
          ${lastBot ? `<div class="pc-bot-msg pc-bot-msg--out"><p>${esc(clip(lastBot.text, 220))}</p><small>${esc(lastBot.when)} · отправлено клиенту</small></div>` : ""}
        </div>
        <p class="small">В боте нажмите «Ответить» и напишите сообщение: клиент получит его у себя, а здесь оно появится с пометкой «из бота». Сообщения по заявкам приходят владельцу и сотрудникам с правом «Каталог». Кнопки в примере — демонстрация.</p>
      </section>`;
  /* Доход по заявке — только для партнёра и только по позициям, у которых в 1С есть закупочная цена. */
  const money = s.manage && s.showCost;
  const costed = o.items.map((i) => ({ i, cost: modelById(i.pid)?.cost })).filter((x) => x.cost != null);
  const sale = costed.reduce((a, x) => a + x.i.price * x.i.qty, 0); const buy = costed.reduce((a, x) => a + x.cost * x.i.qty, 0);
  const costedIdx = o.items.map((i, k) => (modelById(i.pid)?.cost != null ? k : -1)).filter((k) => k >= 0);
  const certIncomeHtml = money && costed.length ? certIncome(o, modelById, icon, sale, buy, costedIdx) : "";
  const income = money && costed.length ? `<div class="pc-total pc-total--mk" data-testid="pc-order-income"><span>${icon("lock")}Ваш доход до скидок</span><strong>≈ ${rub(sale - buy)}</strong></div><p class="small">Закупка ${rub(buy)} · наценка ${Math.round(((sale - buy) / buy) * 100)} %${costed.length < o.items.length ? " · по позициям, у которых в 1С есть закупочная цена" : ""}. Видно только вам; клиент этих цифр не видит.</p>` : "";
  return `<div class="stack pc-section" data-testid="pc-order-view">
    <button type="button" class="linkbtn pc-back" data-pc-action="back">${icon("arrow-left")} Ко всем заявкам</button>
    <section class="panel stack"><div class="pc-order-head"><div><h2>Заявка № ${esc(o.id)}</h2><small>${esc(o.date)} · с сайта remcard.ru</small></div>${orderPill(o.status)}</div>
      ${o.status === "declined" && o.reason ? `<p class="notice">Причина отказа: ${esc(o.reason)}</p>` : ""}
      ${actions ? `<div class="row">${actions}</div>` : ""}</section>
    <div class="pc-order-grid">
      <div class="stack">
        <section class="panel stack"><h3>Состав заявки</h3>
          <div class="pc-lines">${o.items.map((i) => `<div class="pc-line">${i.img ? `<img src="${esc(i.img)}" alt="" loading="lazy">` : `<span class="pc-thumb pc-thumb--none">${icon("image-off")}</span>`}<div class="pc-line-body"><strong>${esc(i.name)}</strong><small>${esc([i.size, i.color].filter(Boolean).join(" · "))}</small><small class="pc-line-1c">${SUP.added.has(i.pid) ? "Поставщик" : "1С"}: ${esc(i.name1c)}</small>${lineSupplierTag(i)}</div><div class="pc-line-num"><span>${i.qty} × ${rub(i.price)}</span><strong>${rub(i.price * i.qty)}</strong>${stockNote(i)}</div></div>`).join("")}</div>
          <div class="pc-total"><span>Итого по ценам каталога</span><strong>${rub(o.sum)}</strong></div>
          ${certTotals(o, modelById)}
          ${income}
          ${certIncomeHtml}
          <p class="small">Сумма предварительная: цена и наличие подтверждаются при ответе клиенту. Сертификат RemCard можно внести ниже, в заявке; при продаже в магазине скидка и начисления считаются через «Сканер».</p>
        </section>
        ${certPanel(s, icon, o, modelById)}
        ${doorPanel(icon, o)}
        ${supplierOrderBlock(s, icon, o)}
        ${chat}
      </div>
      <div class="stack">
        <section class="panel stack"><h3>Клиент</h3><p><strong>${esc(o.client)}</strong></p><dl class="pc-dl"><div><dt>Связь</dt><dd>Бот RemCard в ${via} · сайт remcard.ru</dd></div><div><dt>Получение</dt><dd>${esc(o.receive)}</dd></div>${o.comment ? `<div><dt>Комментарий</dt><dd>${esc(o.comment)}</dd></div>` : ""}</dl>
          <p class="small pc-next">${icon("lock")}<span>Телефон в заявке не запрашивается: RemCard его не собирает и не передаёт. Клиент пишет из своего бота, вы — из кабинета или из бота.</span></p></section>
        ${bot}
        <section class="panel stack"><h3>История</h3><ol class="pc-history">${o.history.map(([when, text]) => `<li><span>${esc(when)}</span>${esc(text)}</li>`).join("")}</ol></section>
        <p class="small pc-next">${icon("database")} Передача принятых заявок в 1С как заказов покупателя — следующий этап после согласования обмена.</p>
      </div>
    </div>
  </div>`;
}

/* ---------- Вкладка «Вид на сайте» ---------- */
/* Скрытые партнёром модели передаются в предпросмотр, чтобы он совпадал с тем, что видит клиент. */
const hiddenOnSite = (s) => models().filter((m) => m.onSite && modelStatus(s, m) !== "live").map((m) => m.id);
/* Модели поставщика, добавленные партнёром и не скрытые: «id-цена» — клиент видит их по цене партнёра. */
const addedOnSite = (s) => addedForSite(new Set(supModels().filter((m) => modelStatus(s, m) === "live").map((m) => m.id)));
function sitePreviewHref(s) {
  const off = hiddenOnSite(s); const add = addedOnSite(s);
  return `${CLIENT_BASE}index.html?rc_preview=${SELLER_ID}${off.length ? `&rc_hidden=${off.join(".")}` : ""}${add.length ? `&rc_added=${add.join(".")}` : ""}#/catalog/${SELLER_ID}`;
}
function renderSite(s, icon) {
  const all = models();
  const count = (code) => all.filter((m) => modelStatus(s, m) === code).length;
  const live = count("live"); const hidden = count("hidden"); const attn = count("nophoto") + count("noprice");
  const src = sitePreviewHref(s);
  const seg = [["desktop", "monitor", "Компьютер"], ["phone", "smartphone", "Телефон"]];
  return `<section class="panel pc-site-head">
      <div class="stack"><h2>Так ваш каталог видят клиенты</h2>
        <p class="muted">Ваша страница на remcard.ru. Клиентам видны ${live} из ${all.length} ${plural(all.length, "модели", "моделей", "моделей")}${hidden ? ` · скрыто вами: ${hidden}` : ""}${attn ? ` · без фото или цены: ${attn}` : ""}${supModels().length ? ` · от поставщика, под заказ: ${supModels().filter((m) => modelStatus(s, m) === "live").length}` : ""}.</p></div>
      <div class="pc-site-tools"><div class="pc-seg" role="group" aria-label="Устройство">${seg.map(([id, ic, label]) => `<button type="button" class="${s.device === id ? "selected" : ""}" data-pc-action="device:${id}" data-testid="pc-device-${id}" aria-pressed="${s.device === id}">${icon(ic)}<span>${label}</span></button>`).join("")}</div>
        <a class="btn pc-btn-sm" href="${esc(src)}" target="_blank" rel="noopener" data-testid="pc-site-open">${icon("external-link")} В новой вкладке</a></div>
    </section>
    <div class="pc-browser pc-browser--${s.device === "phone" ? "phone" : "desktop"}" data-testid="pc-site-preview" data-state="loading">
      <div class="pc-browser-bar" aria-hidden="true"><i></i><i></i><i></i><span>${icon("lock")}remcard.ru/catalog/org/org_optovikk</span></div>
      <div class="pc-browser-view">
        <iframe title="Предпросмотр: каталог продавца на сайте remcard.ru" data-testid="pc-site-frame" data-preview-src="${esc(src)}"></iframe>
        <div class="pc-browser-wait" data-testid="pc-site-wait" role="status"><span class="pc-spin" aria-hidden="true"></span>Загружаем предпросмотр сайта…</div>
        <div class="pc-browser-fail" data-testid="pc-site-fail"><strong>Предпросмотр не загрузился</strong><span>Откройте каталог в новой вкладке — там он выглядит так же, как у клиента.</span><div class="row"><a class="btn primary" href="${esc(src)}" target="_blank" rel="noopener">${icon("external-link")} Открыть в новой вкладке</a><button type="button" class="btn" data-pc-action="site-retry" data-testid="pc-site-retry">Повторить</button></div></div>
      </div>
    </div>
    <p class="small pc-foot">Предпросмотр работает как сайт: можно открывать товары, фильтры и список покупок. Заявки из предпросмотра не отправляются. Чтобы изменить состав, скройте или покажите товары во вкладке «Товары».</p>`;
}
/* Предпросмотр встраивается не по адресу, а готовым документом (srcdoc): хостинг прототипа запрещает открывать
   свои страницы во вложенной рамке, из-за чего рамка оставалась пустой. Страница сайта загружается запросом,
   в неё добавляются базовый адрес и параметры предпросмотра, после чего она работает как обычно.
   Если запрос невозможен, рамка открывается по адресу; если сайт не ответил — показывается понятная подсказка. */
function previewBoot(cfg) {
  window.__RC_PREVIEW__ = cfg;
  try { if (!window.location.hash) window.location.hash = cfg.hash; } catch (e) { /* адрес документа менять нельзя */ }
  try { window.history.pushState = function () {}; window.history.replaceState = function () {}; } catch (e) { /* не критично */ }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || e.defaultPrevented) return;
    var href = a.getAttribute("href") || "";
    e.preventDefault();
    /* Переходы внутри сайта — только сменой «решётки»; внешние ссылки в предпросмотре не открываются. */
    if (href.charAt(0) === "#" && window.location.hash !== href) window.location.hash = href;
  });
}
let sitePage = null;
function loadSitePage() {
  if (!sitePage) {
    sitePage = fetch(new URL(`${CLIENT_BASE}index.html`, window.location.href).href, { credentials: "same-origin" })
      .then((r) => { if (!r.ok) throw new Error(`site ${r.status}`); return r.text(); })
      .catch((error) => { sitePage = null; throw error; });
  }
  return sitePage;
}
function previewDoc(html, s) {
  const base = new URL(CLIENT_BASE, window.location.href).href;
  const cfg = { seller: SELLER_ID, hidden: hiddenOnSite(s), added: addedOnSite(s), hash: `#/catalog/${SELLER_ID}` };
  const boot = `<base href="${esc(base)}"><script>(${previewBoot.toString()})(${JSON.stringify(cfg).replace(/</g, "\\u003c")});</` + `script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, (tag) => tag + boot) : boot + html;
}
function mountSitePreview(s) {
  const frame = document.querySelector('[data-testid="pc-site-frame"]:not([data-mounted])');
  if (!frame) return;
  frame.dataset.mounted = "1";
  const box = frame.closest(".pc-browser");
  const state = (v) => { if (box && frame.isConnected) box.dataset.state = v; };
  let done = false;
  const ready = (e) => {
    if (e.source !== frame.contentWindow || e.data?.source !== "rc-seller-preview") return;
    done = true; window.removeEventListener("message", ready); state("ready");
  };
  window.addEventListener("message", ready);
  /* Сайт сообщает о готовности сам; если сообщения нет — показываем подсказку вместо пустой рамки. */
  window.setTimeout(() => { if (!done) { window.removeEventListener("message", ready); state("failed"); } }, 12000);
  loadSitePage()
    .then((html) => { if (frame.isConnected) frame.srcdoc = previewDoc(html, s); })
    .catch(() => { if (frame.isConnected) frame.src = frame.dataset.previewSrc; });
}

/* ---------- Вкладка «Филиалы и цены» ---------- */
const branchNote = (pct) => (pct ? `Цены филиала ${pct > 0 ? "выше" : "ниже"} цены 1С на ${Math.abs(pct)} %` : "Цены как в 1С");
const branchAvg = (s, i) => {
  const mks = models().filter((m) => !s.branchOff.get(m.id)?.has(i)).map((m) => markup(branchPrice(s, m, i), m.cost)).filter(Boolean);
  if (!s.showCost || !mks.length) return "";
  const avg = Math.round(mks.reduce((a, x) => a + x.pct, 0) / mks.length);
  return `средняя наценка <b class="pc-mk pc-mk--${mkTone({ pct: avg })}">${avg} %</b>`;
};
const pctText = (pct) => `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}`;
const branchesChanged = (s) => s.branchPct.some(Boolean) || s.branchOff.size > 0 || s.branchPrice.size > 0;
function renderBranches(s, icon) {
  const all = models().filter((m) => m.price != null);
  const total = models().length;
  const card = (i) => {
    const here = models().filter((m) => !s.branchOff.get(m.id)?.has(i)).length;
    const own = [...s.branchPrice.values()].filter((x) => x[i] != null).length;
    const pct = s.branchPct[i];
    return `<article class="panel pc-brcard" data-testid="pc-branch-${i}">
        <div class="pc-brcard-h">${icon("map-pin")}<div><strong>${esc(BRANCHES[i])}</strong><small>${here} из ${total} ${plural(total, "модели", "моделей", "моделей")}${own ? ` · своих цен: ${own}` : ""}</small></div></div>
        <div class="pc-brcard-rule"><span class="pc-flabel">Цена филиала к цене 1С</span>
          <div class="pc-stepper" role="group" aria-label="Цена филиала к цене 1С, проценты"><button type="button" data-pc-action="bpct:${i}:-1" data-testid="pc-branch-pct-${i}-minus" aria-label="Уменьшить на 1 %">${icon("minus")}</button><input type="text" inputmode="numeric" data-pc-input="bpct:${i}" data-testid="pc-branch-pct-${i}" value="${pctText(pct)}" maxlength="4" aria-label="Проценты к цене 1С" autocomplete="off"><span>%</span><button type="button" data-pc-action="bpct:${i}:1" data-testid="pc-branch-pct-${i}-plus" aria-label="Увеличить на 1 %">${icon("plus")}</button></div>
          <small data-pc-brnote="${i}">${branchNote(pct)}</small></div>
        <div class="pc-brcard-foot"><span data-pc-bravg="${i}">${branchAvg(s, i)}</span><button type="button" class="btn pc-btn-sm" data-pc-action="bshow:${i}">Товары филиала</button></div>
      </article>`;
  };
  return `<section class="panel pc-site-head">
      <div class="stack"><h2>Ассортимент и цены по филиалам</h2>
        <p class="muted">По умолчанию каждый товар представлен во всех филиалах по цене из 1С (тип цены «${esc(s.priceType)}»). Здесь можно задать правило цены для филиала; филиалы и свою цену отдельного товара — в его карточке или кнопкой «Филиалы» в списке.</p></div>
      <div class="pc-site-tools"><button type="button" class="btn pc-btn-sm" data-pc-action="breset" data-testid="pc-branches-reset" ${branchesChanged(s) ? "" : "disabled"}>${icon("rotate-ccw")} Вернуть как в 1С</button></div>
    </section>
    <section class="pc-brcards" aria-label="Филиалы">${BRANCH_IDS.map(card).join("")}</section>
    <section class="panel stack"><h3>Как считается цена в филиале</h3><ol class="pc-flow pc-flow--3"><li><strong>Цена из 1С</strong><span>Тип цены для сайта, одинаковый для всех филиалов</span></li><li><strong>Правило филиала</strong><span>Процент к цене 1С для всех товаров филиала</span></li><li><strong>Своя цена товара</strong><span>Задаётся в карточке товара и важнее правила</span></li></ol>
      <p class="small">Товаров с ценой: ${all.length}. Изменения демонстрационные: в 1С они не передаются и на сайте в прототипе пока не отражаются. В продукте цену филиала можно будет брать и из отдельного типа цены 1С — решим при настройке обмена.</p></section>`;
}

/* ---------- Вкладка «Обмен с 1С» ---------- */
function renderExchange(s, icon) {
  const all = ownModels();
  const noPhoto = all.filter((m) => !m.imgs.length).length; const noPrice = all.filter((m) => m.price == null).length; const attn = all.filter((m) => !m.imgs.length || m.price == null).length;
  const loads = [["boxes", "Номенклатура и разделы", "Название, раздел и группа — как в 1С"], ["sliders-horizontal", "Характеристики", "Используются в карточке и фильтрах на сайте"], ["badge-russian-ruble", "Цены", "Один тип цены для сайта, остальные клиентам не показываются"], ["lock", "Закупочные цены", "Только для вас: по ним считается наценка. На сайт и клиентам не попадают"], ["warehouse", "Остатки", "Нет данных ≠ ноль: такой товар выходит как «Под заказ»"], ["image", "Фото", "Только прикреплённые в 1С. Товар без фото на сайт не выходит"]];
  return `<section class="panel pc-sync">
      <div class="stack"><div class="row"><span class="pill good pc-status">${icon("circle-check")}Подключено</span><span class="small">1С партнёра «${SELLER_NAME}» · выгрузка каталога</span></div>
        <h2>Последний обмен — сегодня, 06:00</h2>
        <p class="muted">Каталог обновляется каждый день в 06:00. На сайт попадает только полностью проверенная выгрузка: если файл пришёл неполным, опубликованные товары не меняются.</p>
        <div class="row"><button type="button" class="btn primary" data-pc-action="sync" data-testid="pc-sync" ${s.syncing ? "disabled" : ""}>${icon("refresh-cw")} ${s.syncing ? "Обновляем…" : "Обновить из 1С"}</button><span class="small">Снимок ${FULL.snapshot}…</span></div></div>
      <div class="pc-sync-nums"><div><strong>${num(FULL.positions)}</strong><span>позиций в выгрузке 1С</span></div><div><strong>${num(FULL.photos)}</strong><span>фото товаров</span></div><div><strong>${all.length}</strong><span>моделей в демо-выборке</span></div></div>
    </section>
    ${attn ? `<button type="button" class="notice accent pc-attn" data-pc-action="attention">${icon("circle-alert")}<span><strong>${attn} ${plural(attn, "модель требует", "модели требуют", "моделей требуют")} внимания.</strong> Без фото: ${noPhoto} · без цены: ${noPrice}. На сайт они не выходят, пока данные не появятся в 1С.</span>${icon("chevron-right")}</button>` : ""}
    <div class="pc-two">
      <section class="panel stack"><h3>Что приходит из 1С</h3><ul class="pc-loads">${loads.map(([ic, title, text]) => `<li>${icon(ic)}<div><strong>${title}</strong><small>${text}</small></div></li>`).join("")}</ul></section>
      <section class="panel stack"><h3>Настройки публикации</h3>
        <label class="field">Тип цены для сайта<select data-pc-input="priceType" data-testid="pc-price-type">${PRICE_TYPES.map(([name, note]) => `<option value="${esc(name)}" ${s.priceType === name ? "selected" : ""} ${PUBLIC_PRICE_TYPES.has(name) ? "" : "disabled"}>${esc(name)} — ${note}</option>`).join("")}</select></label>
        <label class="field">Остатки на сайте<select data-pc-input="stockMode">${STOCK_MODES.map(([code, label]) => `<option value="${code}" ${s.stockMode === code ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label class="pc-check"><input type="checkbox" data-pc-input="autoPublish" ${s.autoPublish ? "checked" : ""}><span><strong>Публиковать новые позиции автоматически</strong><small>Если у позиции есть фото и цена. Иначе новые товары ждут вашего решения в списке.</small></span></label>
        <p class="small">Изменения настроек применяются при следующем обмене.</p>
      </section>
    </div>
    <section class="panel stack"><h3>Журнал обменов</h3><ol class="pc-log">${s.log.map((row) => `<li class="pc-log-row pc-log-row--${row.kind}">${icon(row.kind === "ok" ? "circle-check" : "triangle-alert")}<div><strong>${esc(row.title)}</strong><small>${esc(row.when)}</small><p class="small">${esc(row.text)}</p></div></li>`).join("")}</ol></section>
    <section class="panel stack"><h3>Как это работает</h3><ol class="pc-flow"><li><strong>1С</strong><span>Выгрузка каталога по расписанию</span></li><li><strong>Проверка</strong><span>Полнота, цены, фото</span></li><li><strong>Каталог в кабинете</strong><span>Вы решаете, что показывать</span></li><li><strong>Сайт remcard.ru</strong><span>Клиент собирает список</span></li><li><strong>Заявки</strong><span>Приходят сюда, во вкладку «Заявки»</span></li></ol></section>`;
}

function renderOnboarding(icon, manage) {
  const steps = [["plug", "Подключите обмен с 1С", "Команда RemCard настраивает выгрузку номенклатуры, цен, остатков и фото из вашей 1С."], ["list-checks", "Проверьте каталог", "Товары появятся здесь. Позиции без фото или цены на сайт не выходят."], ["globe", "Опубликуйте на remcard.ru", "Клиенты собирают список покупок и отправляют заявки — они приходят в этот раздел."]];
  return `<div class="stack pc-section" data-testid="product-catalog-section"><section class="panel pc-onboard"><span class="care-badge care-badge--ink">${icon("package")} Каталог товаров</span><h2>Разместите свои товары на сайте RemCard</h2><p class="muted">Ассортимент загружается из вашей 1С и обновляется каждый день. Вручную заполнять карточки не нужно.</p>
    <ol class="pc-steps">${steps.map(([ic, title, text], i) => `<li><span class="pc-step-n">${i + 1}</span>${icon(ic)}<strong>${title}</strong><p class="small">${text}</p></li>`).join("")}</ol>
    <div class="row"><button type="button" class="btn primary" data-pc-action="connect" data-testid="pc-connect">${icon("plug")} Подключить каталог из 1С</button></div></section>${manage ? supplierOnboarding(icon) : ""}</div>`;
}

export function renderProductCatalog(config) {
  const icon = config.icon;
  if (config.empty) return renderOnboarding(icon, config.role !== "employee");
  const s = ws(config.key);
  /* Закупку, наценку и цены филиалов видит и меняет партнёр; сотруднику с правом «Каталог» они не показываются. */
  s.manage = config.role !== "employee";
  /* «Филиалы и цены» и «Поставщики» — только у владельца кабинета. */
  if (!s.manage && (s.tab === "branches" || s.tab === "suppliers")) s.tab = "items";
  if (s.view && modelById(s.view)) return renderModel(s, icon, modelById(s.view));
  const order = s.order && s.orders.find((o) => o.id === s.order);
  if (order) return renderOrder(s, icon, order);
  if (s.tab === "suppliers" && s.manage && SME.page) return supApplyPage(s, icon);
  if (s.tab === "suppliers" && supplierView(s)) return renderSupplierPage(s, icon);
  const fresh = s.orders.filter((o) => o.status === "new").length;
  const tabs = [["items", "Товары"], ["orders", `Заявки${fresh ? ` · ${fresh} ${plural(fresh, "новая", "новые", "новых")}` : ""}`], s.manage ? ["branches", "Филиалы и цены"] : null, s.manage ? ["suppliers", "Поставщики"] : null, ["exchange", "Обмен с 1С"], ["site", "Вид на сайте"]].filter(Boolean);
  const full = s.full && s.tab === "items";
  const body = s.tab === "orders" ? renderOrders(s, icon) : s.tab === "exchange" ? renderExchange(s, icon) : s.tab === "site" ? supSiteHint(s, icon) + renderSite(s, icon) : s.tab === "branches" ? renderBranches(s, icon) : s.tab === "suppliers" ? supStatusBlock(s, icon) + renderSuppliersTab(s, icon) : renderItems(s, icon);
  return `<div class="stack pc-section ${full ? "is-full" : ""}" data-testid="product-catalog-section">
    <p class="notice pc-demo">${icon("info")}<span>Пример: каталог партнёра «${SELLER_NAME}» из 1С. В прототипе показана выборка из ${num(FULL.positions)} позиций; данные демонстрационные.</span></p>
    <div class="pc-tabrow"><div class="tabs proc-tabs pc-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" class="${s.tab === id ? "selected" : ""}" data-pc-action="tab:${id}" data-testid="pc-tab-${id}" role="tab" aria-selected="${s.tab === id}">${label}</button>`).join("")}</div><a class="pc-calcbtn" href="../door-calc/wizard.html?ctx=lk" data-testid="pc-door-calc-global"><svg class="lucide lucide-calculator" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></svg><span>Калькулятор дверей</span></a></div>
    ${body}
  </div>`;
}

let bound = false;
export function hydrateProductCatalog(config) {
  if (bound) return;
  bound = true;
  const stamp = () => "только что";
  const cur = () => { const s = ws(config.key()); s.manage = !String(config.key()).startsWith("employee:"); return s; };
  const toggleBtn = () => document.querySelector('[data-testid="pc-filters-open"]');
  /* Перерисовка с сохранением прокрутки полноэкранного списка и состояния «выбрано частично». */
  const rerender = (focusId, opts = {}) => {
    const box = document.querySelector(".pc-section.is-full");
    const top = box ? box.scrollTop : null;
    config.refresh();
    const next = document.querySelector(".pc-section.is-full");
    if (next && top != null) next.scrollTop = top;
    document.querySelectorAll("[data-pc-partial]").forEach((el) => { el.indeterminate = el.dataset.pcPartial === "true"; });
    /* Переписка всегда открыта на последних сообщениях. */
    const log = document.querySelector(".pc-chat-log");
    if (log) log.scrollTop = log.scrollHeight;
    /* Открытая панель фильтра показывает те же условия, что и список; если изменение пришло из неё — она уже актуальна. */
    if (panel && !opts.fromPanel) { const s = cur(); panel.api.set(filterState(s), poolOf(s)); }
    if (focusId) document.querySelector(`[data-testid="${focusId}"]`)?.focus({ preventScroll: true });
  };
  /* Панель фильтра: на широком экране стоит рядом со списком и не закрывает его, на узком выезжает поверх.
     Список обновляется при каждом изменении — кнопку «Показать» ждать не нужно. */
  const closePanel = (refresh) => {
    if (!panel) return;
    panel.api.destroy(); panel.el.remove(); panel = null;
    document.documentElement.classList.remove("pc-fpanel-open");
    if (refresh && toggleBtn()) rerender("pc-filters-open");
  };
  const openPanel = (s) => {
    const el = document.createElement("aside");
    el.id = "pc-fpanel"; el.className = "pc-fpanel"; el.dataset.testid = "pc-filter-panel"; el.setAttribute("aria-labelledby", "lkf-title");
    el.innerHTML = '<div class="pc-fpanel__back" data-pc-action="filters-close"></div><div class="pc-fpanel__box" data-pc-lkf></div>';
    document.body.appendChild(el);
    const api = LK.mount(el.querySelector("[data-pc-lkf]"), {
      list: poolOf(s), state: filterState(s), audience: "partner", priceType: s.priceType, title: "Фильтр", sub: "Данные из 1С · список обновляется сразу",
      onChange: (next) => { const w = cur(); setFilter(w, next); prune(w); rerender(null, { fromPanel: true }); },
      onApply: () => closePanel(true), onClose: () => closePanel(true),
    });
    panel = { el, api };
    document.documentElement.classList.add("pc-fpanel-open");
    rerender();
    el.querySelector("[data-lkf-find]")?.focus({ preventScroll: true });
  };
  /* Страница перерисовывается целиком: следим, чтобы панель не осталась открытой вне списка товаров,
     а предпросмотр сайта загружался, как только появляется его рамка. */
  let tick = 0;
  const afterRender = () => {
    tick = 0;
    if (panel && !toggleBtn()) closePanel(false);
    if (document.querySelector('[data-testid="pc-site-frame"]:not([data-mounted])')) mountSitePreview(cur());
  };
  new MutationObserver(() => { if (!tick) tick = window.requestAnimationFrame(afterRender); }).observe(document.body, { childList: true, subtree: true });
  afterRender();

  /* Окно «Филиалы»: для одной модели или для всех выбранных. */
  const branchDialog = (s, ids) => {
    const list = ids.map(modelById).filter(Boolean);
    if (!list.length) return;
    s.brTarget = list.map((m) => m.id);
    const one = list.length === 1 ? list[0] : null;
    const state = (i) => { const n = list.filter((m) => !s.branchOff.get(m.id)?.has(i)).length; return n === list.length ? "all" : n ? "part" : "none"; };
    config.openDialog(one ? `Филиалы: ${one.name}` : `Филиалы для ${list.length} ${plural(list.length, "модели", "моделей", "моделей")}`, `<div class="stack pc-brdlg" data-pc-brdlg data-testid="pc-branches-dialog">
        <p class="muted">Отметьте филиалы, где ${one ? "товар представлен" : "представлены выбранные товары"}. По умолчанию — во всех.</p>
        <div class="pc-brdlg-list">${BRANCH_IDS.map((i) => `<label class="pc-check"><input type="checkbox" value="${i}" data-pc-partial="${state(i) === "part"}" ${state(i) === "all" ? "checked" : ""}><span><strong>${esc(BRANCHES[i])}</strong>${one && one.price != null ? `<small>цена в филиале ${rub(branchPrice(s, one, i))}</small>` : state(i) === "part" ? "<small>сейчас — у части выбранных</small>" : ""}</span></label>`).join("")}</div>
        <p class="rco-err pc-brdlg-err" hidden>Оставьте хотя бы один филиал. Чтобы убрать товар с сайта, используйте «Скрыть».</p>
        <div class="row"><button type="button" class="btn primary" data-pc-action="branches-ok" data-testid="pc-branches-ok">Сохранить</button><button type="button" class="btn" data-pc-action="branches-all" data-testid="pc-branches-all">Во всех филиалах</button><button type="button" class="btn" data-action="close-dialog">Отмена</button></div>
        <p class="small">${one ? "Свою цену для филиала можно задать в карточке товара. " : ""}Изменения демонстрационные и в 1С не передаются.</p>
      </div>`);
    document.querySelectorAll("[data-pc-brdlg] [data-pc-partial]").forEach((el) => { el.indeterminate = el.dataset.pcPartial === "true"; });
  };
  const applyBranches = (s, on, touched) => {
    s.brTarget.map(modelById).filter(Boolean).forEach((m) => {
      const off = new Set(s.branchOff.get(m.id) || []);
      BRANCH_IDS.forEach((i) => { if (!touched || touched.has(i)) { if (on.has(i)) off.delete(i); else off.add(i); } });
      if (off.size >= BRANCHES.length) return;
      if (off.size) s.branchOff.set(m.id, off); else s.branchOff.delete(m.id);
    });
  };

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
    if (panel) { closePanel(true); return; }
    if (!document.querySelector(".pc-section.is-full")) return;
    cur().full = false;
    rerender("pc-fullscreen");
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-pc-action]");
    if (!el) return;
    const [kind, ...rest] = el.dataset.pcAction.split(":");
    const id = rest.join(":");
    const s = cur();
    const order = s.orders.find((o) => o.id === s.order);
    /* Поставщики: каталог поставщика, добавление моделей и заказ поставщику — в модуле catalog-suppliers.js. */
    if (handleSupMeAction({ s, config, rerender }, kind, id, el)) return;
    if (handleSupplierAction({ s, icon: config.icon, config, rerender, modelById, BRANCHES, stamp }, kind, id, el)) return;
    if (handleCertAction({ s, order, config, rerender, modelById, stamp }, kind)) return;
    if (kind === "tab") { SME.page = false; s.tab = id; s.view = ""; s.order = ""; s.full = false; s.draft = ""; }
    if (kind === "open") {
      s.view = id; s.shot = 0;
      rerender();
      /* Карточка модели открывается так, чтобы фото в полный рост было видно сразу. */
      const view = document.querySelector('[data-testid="pc-model-view"]');
      if (view) window.scrollTo({ top: Math.max(0, view.getBoundingClientRect().top + window.scrollY - 12) });
      return;
    }
    if (kind === "back") { s.view = ""; s.order = ""; s.draft = ""; }
    if (kind === "zoom") {
      const m = modelById(s.view);
      const src = m?.imgs[Math.min(s.shot, m.imgs.length - 1)];
      if (src) config.openDialog(m.name, `<div class="pc-zoom"><img src="${esc(src)}" alt="${esc(m.name)}"></div>`);
      return;
    }
    if (kind === "sel") { if (s.selected.has(id)) s.selected.delete(id); else s.selected.add(id); rerender(el.dataset.testid); return; }
    if (kind === "selall") {
      const list = filteredModels(s);
      s.selected = new Set(list.length && list.every((m) => s.selected.has(m.id)) ? [] : list.map((m) => m.id));
      rerender("pc-select-all"); return;
    }
    if (kind === "bulk") {
      if (id === "clear") { s.selected.clear(); rerender("pc-select-all"); return; }
      const picked = filteredModels(s).filter((m) => s.selected.has(m.id));
      const target = picked.filter((m) => modelStatus(s, m) === (id === "hide" ? "live" : "hidden"));
      if (!target.length) return;
      const skipped = picked.filter((m) => modelIssues(m).length).length;
      target.forEach((m) => { if (id === "hide") s.hidden.add(m.id); else s.hidden.delete(m.id); });
      s.selected.clear();
      const n = `${target.length} ${plural(target.length, "модель", "модели", "моделей")}`;
      config.notify(`${id === "hide" ? `Скрыто с сайта: ${n}.` : `Снова на сайте: ${n}.`}${skipped ? ` Пропущено ${skipped}: нет фото или цены.` : ""} В 1С товары не меняются (демо).`);
      rerender("pc-select-all"); return;
    }
    if (kind === "layout") { s.layout = id === "cards" ? "cards" : "list"; rerender(el.dataset.testid); return; }
    if (kind === "full") { s.full = !s.full; rerender("pc-fullscreen"); const box = document.querySelector(".pc-section.is-full"); if (box) box.scrollTop = 0; return; }
    if (kind === "cost") { if (!s.manage) return; s.showCost = !s.showCost; if (!s.showCost) s.low = false; prune(s); rerender("pc-cost-toggle"); return; }
    if (kind === "device") { s.device = id === "phone" ? "phone" : "desktop"; rerender(el.dataset.testid); return; }
    if (kind === "site-retry") { rerender("pc-site-open"); return; }

    /* ----- Переписка ----- */
    if (kind === "tpl" && order) {
      const box = document.querySelector('[data-pc-input="draft"]');
      const now = (box ? box.value : s.draft).trim();
      s.draft = now ? `${now} ${QUICK_REPLIES[Number(id)] || ""}`.trim() : QUICK_REPLIES[Number(id)] || "";
      rerender("pc-chat-input"); return;
    }
    if (kind === "msg" && order) {
      const box = document.querySelector('[data-pc-input="draft"]');
      const text = clip(box ? box.value : s.draft, 1000).trim();
      if (!text) { config.notify("Напишите сообщение клиенту.", "info"); box?.focus(); return; }
      order.chat.push({ from: "seller", when: stamp(), text, src: "lk" });
      s.draft = "";
      config.notify(`Сообщение отправлено. Клиент получит его в боте RemCard в ${order.via} (демо).`);
      rerender("pc-chat-input"); return;
    }
    if (kind === "demo-reply" && order) {
      order.chat.push({ from: "client", when: stamp(), text: DEMO_CLIENT_REPLIES[(order.demoIn || 0) % DEMO_CLIENT_REPLIES.length], src: "bot" });
      order.demoIn = (order.demoIn || 0) + 1;
      config.notify(`Демо: клиент ответил из своего бота RemCard в ${order.via}. Сообщение пришло в кабинет и в ваш бот.`, "info");
      rerender("pc-chat-demo-reply"); return;
    }
    if (kind === "bot-reply" && order) {
      order.chat.push({ from: "seller", when: stamp(), text: DEMO_BOT_REPLIES[(order.demoOut || 0) % DEMO_BOT_REPLIES.length], src: "bot" });
      order.demoOut = (order.demoOut || 0) + 1;
      config.notify("Демо: вы ответили из бота RemCard PROF — сообщение появилось в переписке с пометкой «из бота».", "info");
      rerender("pc-bot-reply"); return;
    }
    if (kind === "bot-open") { config.notify("В боте эта кнопка открывает заявку в кабинете — вы уже здесь (демо).", "info"); return; }

    if (kind === "shot") s.shot = Number(id) || 0;
    if (kind === "reset") { s.q = ""; s.section = ""; s.status = ""; s.branch = ""; s.low = false; s.onlySup = false; s.f = LK.blank(); prune(s); rerender("pc-search"); return; }
    if (kind === "filters") { if (panel) closePanel(true); else openPanel(s); return; }
    if (kind === "filters-close") { closePanel(true); return; }
    if (kind === "quick") {
      if (id === "low") s.low = !s.low;
      else if (id === "sup") s.onlySup = !s.onlySup;
      else { const [field, value] = id.split(":"); setFilter(s, LK.toggle(filterState(s), field, value)); }
      prune(s); rerender(el.dataset.testid); return;
    }
    if (kind === "chip") {
      if (id === "q") s.q = ""; else if (id === "status") s.status = ""; else if (id === "branch") s.branch = ""; else if (id === "low") s.low = false; else if (id === "sup") s.onlySup = false; else if (id === "sort") s.f.sort = ""; else setFilter(s, LK.removeChip(filterState(s), id));
      prune(s); rerender("pc-filters-open"); return;
    }
    if (kind === "toggle") {
      const m = modelById(id);
      if (!m || modelIssues(m).length) return;
      if (s.hidden.has(id)) { s.hidden.delete(id); config.notify(`«${m.name}» снова виден клиентам на сайте (демо).`); }
      else { s.hidden.add(id); config.notify(`«${m.name}» скрыт с сайта. В 1С товар не меняется (демо).`); }
      prune(s);
    }

    /* ----- Филиалы и цены ----- */
    if (kind === "branches") { if (!s.manage) return; branchDialog(s, id ? [id] : filteredModels(s).filter((m) => s.selected.has(m.id)).map((m) => m.id)); return; }
    if (kind === "branches-ok" || kind === "branches-all") {
      if (!s.manage) return;
      const boxes = [...document.querySelectorAll("[data-pc-brdlg] input[type=checkbox]")];
      const on = kind === "branches-all" ? new Set(BRANCH_IDS) : new Set(boxes.filter((b) => b.checked).map((b) => Number(b.value)));
      /* Филиалы с отметкой «у части выбранных», которые не трогали, остаются как были. */
      const touched = kind === "branches-all" ? null : new Set(boxes.filter((b) => !b.indeterminate).map((b) => Number(b.value)));
      const keepsOne = s.brTarget.map(modelById).filter(Boolean).every((m) => BRANCH_IDS.some((i) => (touched && !touched.has(i) ? !s.branchOff.get(m.id)?.has(i) : on.has(i))));
      if (!keepsOne) { const err = document.querySelector(".pc-brdlg-err"); if (err) err.hidden = false; return; }
      const n = s.brTarget.length; const focus = n === 1 ? `pc-branches-${s.brTarget[0]}` : "pc-select-all";
      applyBranches(s, on, touched);
      if (n > 1) s.selected.clear();
      s.brTarget = [];
      config.closeDialog();
      const kept = n === 1 ? presentIn(s, modelById(focus.replace("pc-branches-", "")) || { id: "" }).length : 0;
      config.notify(n > 1 ? `Филиалы сохранены для ${n} ${plural(n, "модели", "моделей", "моделей")} (демо).` : `Филиалы сохранены: ${kept === BRANCHES.length ? "товар во всех филиалах" : `товар в ${kept} из ${BRANCHES.length} филиалов`} (демо).`);
      prune(s); rerender(focus); return;
    }
    if (kind === "bprice-reset") {
      const m = modelById(s.view); const i = Number(id);
      if (!m || !s.manage) return;
      const own = { ...(s.branchPrice.get(m.id) || {}) }; delete own[i];
      if (Object.keys(own).length) s.branchPrice.set(m.id, own); else s.branchPrice.delete(m.id);
      rerender(`pc-branch-price-${i}`); return;
    }
    if (kind === "bpct") {
      if (!s.manage) return;
      const [i, step] = id.split(":").map(Number);
      s.branchPct[i] = Math.max(-50, Math.min(100, (s.branchPct[i] || 0) + step));
      rerender(el.dataset.testid); return;
    }
    if (kind === "bshow") { s.tab = "items"; s.branch = String(Number(id)); s.status = ""; prune(s); rerender("pc-branch-filter"); window.scrollTo({ top: 0 }); return; }
    if (kind === "breset") {
      if (!s.manage) return;
      s.branchPct = BRANCH_IDS.map(() => 0); s.branchOff.clear(); s.branchPrice.clear();
      config.notify("Филиалы и цены возвращены к данным 1С: все товары во всех филиалах по цене 1С (демо).");
    }

    if (kind === "ofilter") s.ofilter = id;
    if (kind === "order") { s.order = id; s.draft = ""; const o = s.orders.find((x) => x.id === id); if (o) { o.fresh = false; o.unread = 0; } window.scrollTo({ top: 0 }); }
    if (kind === "status" && order && ORDER_STATUS[id]) {
      order.status = id;
      order.history.push([stamp(), { accepted: "Заявка принята", progress: "Взята в работу", done: "Выполнена" }[id]]);
      config.notify({ accepted: "Заявка принята. Клиент увидит статус «Принято» на сайте и получит сообщение в боте (демо).", progress: "Заявка в работе (демо).", done: "Заявка выполнена (демо)." }[id]);
    }
    if (kind === "decline" && order) {
      config.openDialog(`Отказ по заявке № ${order.id}`, `<div class="stack" data-pc-decline><p class="muted">Клиент увидит статус «Отказ» и причину.</p><label class="field">Причина<select name="reason">${DECLINE_REASONS.map((x) => `<option>${esc(x)}</option>`).join("")}</select></label><div class="row"><button type="button" class="btn primary" data-pc-action="decline-ok" data-testid="pc-decline-ok">Отказать</button><button type="button" class="btn" data-action="close-dialog">Отмена</button></div></div>`);
      return;
    }
    if (kind === "decline-ok" && order) {
      const reason = document.querySelector("[data-pc-decline] select")?.value || DECLINE_REASONS[0];
      order.status = "declined"; order.reason = reason;
      order.history.push([stamp(), `Отказ: ${reason.toLowerCase()}`]);
      config.closeDialog();
      config.notify("Заявка закрыта с отказом (демо).");
    }
    if (kind === "attention") { s.tab = "items"; s.status = "nophoto"; s.section = ""; s.q = ""; s.branch = ""; s.low = false; s.onlySup = false; s.f = LK.blank(); prune(s); }
    if (kind === "connect") { config.notify("Демо: заявка на подключение 1С отправлена. Чтобы увидеть готовый каталог, выберите «Демо» в поле «Данные»."); return; }
    if (kind === "sync") {
      if (s.syncing) return;
      s.syncing = true;
      rerender();
      window.setTimeout(() => {
        s.syncing = false;
        s.log.unshift({ when: "только что", kind: "ok", title: "Обмен выполнен вручную", text: "Изменений в 1С нет: цены, остатки и состав каталога прежние." });
        config.notify("Каталог сверен с 1С: изменений нет (демо).");
        rerender();
      }, 900);
      return;
    }
    rerender();
  });
  const onInput = (e) => {
    if (handleSupMeInput(e)) return;
    if (handleSupplierInput(e)) return;
    const el = e.target.closest?.("[data-pc-input]");
    if (!el) return;
    const s = cur();
    const [key, arg] = el.dataset.pcInput.split(":");
    if (key === "q") {
      if (e.type !== "input") return;
      s.q = clip(el.value, 160);
      prune(s);
      rerender();
      const next = document.querySelector('[data-pc-input="q"]');
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
      return;
    }
    if (key === "draft") { s.draft = el.value; return; }
    if (e.type !== "change") return;
    if (key === "bron" || key === "bprice" || key === "bpct") {
      if (!s.manage) return;
      const i = Number(arg);
      /* Поля цены обновляются на месте: страница не перерисовывается, и переход к следующему полю не сбивается. */
      if (key === "bpct") {
        const v = parseInt(String(el.value).replace(/[−–]/g, "-").replace(/[^\d-]/g, ""), 10);
        s.branchPct[i] = Number.isFinite(v) ? Math.max(-50, Math.min(100, v)) : 0;
        el.value = pctText(s.branchPct[i]);
        const note = document.querySelector(`[data-pc-brnote="${i}"]`); if (note) note.textContent = branchNote(s.branchPct[i]);
        const avg = document.querySelector(`[data-pc-bravg="${i}"]`); if (avg) avg.innerHTML = branchAvg(s, i);
        const reset = document.querySelector('[data-testid="pc-branches-reset"]'); if (reset) reset.disabled = !branchesChanged(s);
        return;
      }
      const m = modelById(s.view);
      if (!m) return;
      if (key === "bron") {
        const off = new Set(s.branchOff.get(m.id) || []);
        if (el.checked) off.delete(i); else off.add(i);
        if (off.size >= BRANCHES.length) { config.notify("Оставьте хотя бы один филиал. Чтобы убрать товар с сайта, нажмите «Скрыть с сайта».", "info"); rerender(el.dataset.testid); return; }
        if (off.size) s.branchOff.set(m.id, off); else s.branchOff.delete(m.id);
        rerender(el.dataset.testid); return;
      }
      const v = parseInt(String(el.value).replace(/[^\d]/g, "").slice(0, 9), 10);
      const own = { ...(s.branchPrice.get(m.id) || {}) };
      if (Number.isFinite(v) && v > 0 && v !== rulePrice(s, m, i)) own[i] = v; else delete own[i];
      if (Object.keys(own).length) s.branchPrice.set(m.id, own); else s.branchPrice.delete(m.id);
      el.value = own[i] != null ? String(own[i]) : "";
      const meta = document.querySelector(`[data-pc-brmeta="${i}"]`); if (meta) meta.innerHTML = branchMeta(s, m, i);
      if (own[i] != null && m.cost != null && own[i] < m.cost) config.notify(`Цена ${rub(own[i])} ниже закупочной (${rub(m.cost)}) — продажа в этом филиале будет в убыток.`, "info");
      return;
    }
    if (key === "autoPublish") s.autoPublish = el.checked;
    else if (key === "priceType") { if (PUBLIC_PRICE_TYPES.has(el.value)) s.priceType = el.value; config.notify("Тип цены сохранён. Цены на сайте обновятся при следующем обмене (демо)."); }
    else if (["section", "status", "stockMode", "branch"].includes(key)) {
      s[key] = el.value;
      /* После смены раздела убираем значения свойств, которых в нём нет. */
      if (key === "section") setFilter(s, LK.prune(models().map((m) => m.item), filterState(s)));
      prune(s);
      rerender(el.dataset.testid); return;
    }
    rerender();
  };
  document.addEventListener("input", onInput);
  document.addEventListener("change", onInput);
}
