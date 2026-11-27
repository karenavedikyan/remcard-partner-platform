/* Поставщики в каталоге партнёра (прототип).
   Идея: производитель или поставщик размещает свой ассортимент в RemCard (выгружает из своей 1С). Партнёр, который продаёт
   товары этой категории, открывает каталог поставщика, выбирает модели или весь ассортимент и публикует их в своём каталоге
   для клиентов. Клиент видит товар у партнёра; получив заявку, партнёр отправляет заказ поставщику, менеджер поставщика
   выставляет счёт, партнёр оплачивает и продаёт клиенту. Пример — производитель «Тандор» в категории «Двери».
   Всё демонстрационное и хранится в памяти страницы. Расчёт с поставщиком — по его счёту, вне RemCard:
   кошелёк, вознаграждения и взаиморасчёты RemCard этим сценарием не меняются.
   Дилерские цены и заказы поставщику видит только владелец кабинета — как закупку и наценку; сотруднику они не показываются. */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
const num = (n) => Math.round(n).toLocaleString("ru-RU");
const rub = (n) => `${num(n)} ₽`;
const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const round10 = (n) => Math.max(10, Math.round(n / 10) * 10);
const CLIENT_BASE = "../client/";
const HOME_SELLER = "s6";
const DEFAULT_PCT = 35;

/* Категории партнёра «Оптовик» — по ним подбираются поставщики. */
export const SUP_CATS = [["doors", "Двери"], ["hardware", "Фурнитура"], ["trim", "Погонаж"]];
const SECTION_CAT = { "Межкомнатные двери": "doors", "Входные двери": "doors", Фурнитура: "hardware", "Погонаж и плинтус": "trim" };
const SECTION_ORDER = ["Межкомнатные двери", "Входные двери", "Фурнитура", "Погонаж и плинтус"];

export const SUPPLIERS = [
  {
    id: "tandoor", name: "Тандор", kind: "Производитель", icon: "factory", city: "Краснодар", cats: ["doors", "hardware", "trim"], catalog: true, days: "3–5 дней",
    about: "Межкомнатные и входные двери, фурнитура и погонаж. Ассортимент выгружается из 1С производителя и обновляется каждый день.",
    facts: [["Дилерская цена", "на весь ассортимент, после подтверждения сотрудничества"], ["Поставка", "3–5 дней со склада в Краснодаре"], ["Оплата", "по счёту поставщика"]],
  },
  {
    id: "dubrava", name: "Фабрика дверей «Дубрава»", kind: "Производитель", icon: "factory", city: "Усть-Лабинск", cats: ["doors"], catalog: false,
    about: "Собственное производство межкомнатных и входных дверей. Нестандартные размеры под заказ.",
    facts: [["Каталог", "ещё не выгружен в RemCard"], ["Минимальный заказ", "от 5 полотен"]],
  },
  {
    id: "install", name: "Павел Нечаев", kind: "Услуги для ваших клиентов", icon: "hammer", city: "Краснодар", cats: ["doors", "hardware"], catalog: false,
    about: "Установка межкомнатных и входных дверей: сборка коробки, врезка замка и петель, наличники и доборы.",
    facts: [["Стоимость", "от 3 500 ₽ за дверь"], ["Формат", "выезжает к вашим клиентам после покупки"]],
  },
];
export const supplierById = (id) => SUPPLIERS.find((x) => x.id === id) || null;

/* Общее для всех ролей кабинета: сотрудничество с поставщиком и добавленные модели. Заказы поставщику — в рабочем состоянии владельца. */
export const SUP = { conn: { tandoor: "none" }, asked: new Set(), added: new Map(), ver: 0, seq: 318 };

/* Ассортимент поставщика: модели производителя из общего слоя каталога. Модели, которые уже есть в 1С партнёра,
   сопоставляются по артикулу и помечаются «уже в вашем каталоге»; остальные можно добавить. Цены и остатки — демо. */
let itemsCache = null;
export function supItems() {
  if (itemsCache) return itemsCache;
  const LK = window.RCLk;
  const src = (window.RCCatalogData?.products || []).filter((p) => p.seller === HOME_SELLER && p.brand === "Tandoor" && typeof p.price === "number");
  itemsCache = src.map((p) => {
    const item = LK.itemOf(p);
    const rrc = p.price;
    return {
      id: p.id, p, name: p.name, variant: p.variant || "", section: item.section, cat: SECTION_CAT[item.section] || "doors", img: p.imgs?.[0] ? CLIENT_BASE + p.imgs[0] : "",
      rrc, dealer: round10(rrc * (1 - (22 + (hash(`dealer:${p.id}`) % 9)) / 100)), stock: 12 + (hash(`supstock:${p.id}`) % 170), own: !p.supplierOnly, skus: item.skus.length, unit: p.unit,
    };
  }).sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section) || Number(a.own) - Number(b.own) || a.name.localeCompare(b.name, "ru"));
  return itemsCache;
}
export const supItem = (id) => supItems().find((x) => x.id === id) || null;
const clientPrice = (it, mode, pct) => (mode === "pct" ? round10(it.dealer * (1 + pct / 100)) : it.rrc);
const isActive = (id = "tandoor") => SUP.conn[id] === "active";
export const supplierOfModel = (id) => (SUP.added.has(id) ? supplierById("tandoor") : null);

/* Путь «клиент → продавец»: клиент оставил заявку на товар поставщика на сайте, и кабинет открывается по ссылке из заявки.
   Состояние прототипа живёт в памяти страницы, поэтому добавленные модели приходят в адресе (?rc_added=id-цена.id-цена). */
let imported = false;
function importAdded() {
  if (imported) return;
  imported = true;
  let raw = "";
  try { raw = new URLSearchParams(window.location.search).get("rc_added") || ""; } catch (error) { return; }
  raw.split(".").slice(0, 60).forEach((x) => {
    const m = /^([a-z0-9]{1,16})(?:-(\d{1,7}))?$/i.exec(x);
    const it = m && supItem(m[1]);
    if (!it || it.own) return;
    const price = m[2] ? Number(m[2]) : it.rrc;
    const pct = Math.max(0, Math.min(300, Math.round((price / it.dealer - 1) * 100)));
    SUP.added.set(it.id, { id: it.id, mode: price === it.rrc ? "rrc" : "pct", pct: price === it.rrc ? DEFAULT_PCT : pct, prod: null });
    SUP.conn.tandoor = "active";
  });
}
/* Добавленные модели в виде товаров для каталога партнёра: цена клиенту — по выбору партнёра, закупка — дилерская цена. */
export function addedProducts() {
  importAdded();
  return [...SUP.added.values()].map((a) => {
    const it = supItem(a.id);
    if (!it) return null;
    const price = clientPrice(it, a.mode, a.pct);
    if (!a.prod || a.prod.price !== price) a.prod = { ...it.p, price, avail: "order" };
    return { p: a.prod, dealer: it.dealer, rrc: it.rrc, stock: it.stock, supplier: supplierById("tandoor"), mode: a.mode, pct: a.pct };
  }).filter(Boolean);
}
/* Для предпросмотра сайта: «id-цена» моделей поставщика, которые сейчас показываются клиентам. */
export const addedForSite = (liveIds) => addedProducts().filter((x) => liveIds.has(x.p.id)).map((x) => `${x.p.id}-${x.p.price}`);

const ui = (s) => { if (!s.supUi) s.supUi = { view: "", cat: "", section: "", fresh: false, picked: new Set(), target: [] }; return s.supUi; };
export const supplierView = (s) => (s.manage ? ui(s).view : "");

const CONN = { none: ["Не подключён", ""], pending: ["Запрос отправлен", "accent"], active: ["Сотрудничаете", "good"] };
const connPill = (id, icon) => { const [label, tone] = CONN[SUP.conn[id] || "none"]; return `<span class="pill ${tone} pc-status">${icon(SUP.conn[id] === "active" ? "handshake" : SUP.conn[id] === "pending" ? "clock" : "circle")}${label}</span>`; };
const thumb = (it, icon) => (it.img ? `<img class="pc-thumb" src="${esc(it.img)}" alt="" loading="lazy">` : `<span class="pc-thumb pc-thumb--none">${icon("image-off")}</span>`);
const models_ = (n) => `${n} ${plural(n, "модель", "модели", "моделей")}`;

/* ---------- Заказы поставщику ---------- */
const SO_STEPS = [["sent", "Отправлен"], ["invoiced", "Счёт выставлен"], ["paid", "Оплачен"], ["shipped", "Отгружен"], ["received", "Получен"]];
const SO_PILL = { sent: ["Ждёт счёта", "accent"], invoiced: ["Счёт выставлен", "accent"], paid: ["Оплачен", ""], shipped: ["Отгружен", ""], received: ["Получен", "good"] };
const supLines = (o) => o.items.filter((i) => SUP.added.has(i.pid) && supItem(i.pid));
const supOrderOf = (s, orderId) => (s.supOrders || []).find((x) => x.orderId === orderId) || null;

function supOrderCard(s, icon, so, { withLink } = {}) {
  const at = SO_STEPS.findIndex(([k]) => k === so.status);
  const [pill, tone] = SO_PILL[so.status];
  const sup = supplierById(so.supplier);
  const action = {
    sent: `<p class="small pc-so-wait">${icon("clock")}<span>Менеджер поставщика получил заказ в кабинете и в боте RemCard PROF. Ждём счёт.</span></p><div class="row"><button type="button" class="linkbtn" data-pc-action="sup-step:${esc(so.id)}" data-testid="pc-so-demo-${esc(so.id)}">Показать ответ поставщика (демо)</button></div>`,
    invoiced: `<p class="small pc-so-wait">${icon("file-text")}<span><strong>${esc(so.invoice)}</strong> на ${rub(so.sum)}. Оплатите по реквизитам поставщика и отметьте оплату — поставщик увидит отметку и подтвердит поступление.</span></p><div class="row"><button type="button" class="btn primary" data-pc-action="sup-step:${esc(so.id)}" data-testid="pc-so-paid-${esc(so.id)}">${icon("check")} Отметить оплату</button><button type="button" class="btn" data-pc-action="sup-invoice:${esc(so.id)}">${icon("download")} Счёт</button></div>`,
    paid: `<p class="small pc-so-wait">${icon("package")}<span>Оплата отмечена. Поставщик комплектует заказ.</span></p><div class="row"><button type="button" class="linkbtn" data-pc-action="sup-step:${esc(so.id)}" data-testid="pc-so-demo-${esc(so.id)}">Показать отгрузку поставщика (демо)</button></div>`,
    shipped: `<p class="small pc-so-wait">${icon("truck")}<span>Поставщик отгрузил заказ: ${esc(so.delivery)}.</span></p><div class="row"><button type="button" class="btn primary" data-pc-action="sup-step:${esc(so.id)}" data-testid="pc-so-received-${esc(so.id)}">${icon("check")} Отметить получение</button></div>`,
    received: `<p class="small pc-so-wait">${icon("circle-check")}<span>Товар получен. Передайте его клиенту и отметьте заявку выполненной; скидка и начисления по сертификату — как обычно, через «Сканер».</span></p>`,
  }[so.status];
  return `<article class="pc-so" data-testid="pc-so-${esc(so.id)}" data-status="${so.status}">
      <div class="pc-order-head"><div><strong>Заказ поставщику № ${esc(so.id)}</strong><small>${esc(sup.name)} · ${esc(so.date)} · по заявке клиента № ${esc(so.orderId)}</small></div><span class="pill ${tone} pc-status">${pill}</span></div>
      <ol class="pc-so-steps" aria-label="Этапы заказа поставщику">${SO_STEPS.map(([, label], i) => `<li class="${i <= at ? "is-done" : ""} ${i === at ? "is-cur" : ""}"><i></i><span>${label}</span></li>`).join("")}</ol>
      <div class="pc-so-lines">${so.lines.map((l) => `<div><span>${esc(l.name)} <small>${esc([l.size, l.color].filter(Boolean).join(" · "))}</small></span><span>${l.qty} × ${rub(l.dealer)}</span><strong>${rub(l.dealer * l.qty)}</strong></div>`).join("")}</div>
      <div class="pc-so-totals"><div><span>К оплате поставщику</span><strong>${rub(so.sum)}</strong></div><div><span>Клиент платит вам</span><strong>${rub(so.sale)}</strong></div><div><span>${icon("lock")}Ваш доход</span><strong>≈ ${rub(so.sale - so.sum)}</strong></div></div>
      <dl class="pc-dl"><div><dt>Доставка</dt><dd>${esc(so.delivery)}</dd></div>${so.comment ? `<div><dt>Комментарий</dt><dd>${esc(so.comment)}</dd></div>` : ""}</dl>
      ${action}
      ${withLink ? `<div class="row"><button type="button" class="btn pc-btn-sm" data-pc-action="sup-goto:${esc(so.orderId)}">Открыть заявку клиента № ${esc(so.orderId)}</button></div>` : ""}
    </article>`;
}

/* Блок в заявке клиента: товары поставщика и заказ ему. Сотрудник видит только пометку. */
export function supplierOrderBlock(s, icon, o) {
  const lines = supLines(o);
  if (!lines.length) return "";
  const sup = supplierById("tandoor");
  const n = `${lines.length} ${plural(lines.length, "позиция", "позиции", "позиций")}`;
  if (!s.manage) return `<section class="panel stack pc-sup-order" data-testid="pc-sup-order"><h3>Товары поставщика</h3><p class="small pc-next">${icon("factory")}<span>В заявке ${n} от поставщика «${esc(sup.name)}» — они поставляются под заказ. Заказ поставщику оформляет владелец кабинета.</span></p></section>`;
  const so = supOrderOf(s, o.id);
  if (so) return `<section class="panel stack pc-sup-order" data-testid="pc-sup-order"><div class="row between"><h3>Заказ поставщику</h3><span class="pill pc-status">${icon("lock")}видно только вам</span></div>${supOrderCard(s, icon, so)}<p class="small">Расчёт с поставщиком — по его счёту, напрямую: RemCard платёж не проводит. В кошельке и взаиморасчётах RemCard заказ не отражается.</p></section>`;
  const sum = lines.reduce((a, i) => a + supItem(i.pid).dealer * i.qty, 0); const sale = lines.reduce((a, i) => a + i.price * i.qty, 0);
  const closed = o.status === "declined" || o.status === "done";
  return `<section class="panel stack pc-sup-order" data-testid="pc-sup-order"><div class="row between"><h3>Товары поставщика</h3><span class="pill pc-status">${icon("lock")}видно только вам</span></div>
      <p class="muted">В заявке ${n} от поставщика «${esc(sup.name)}». На вашем складе их нет — закажите у поставщика: он выставит счёт, а вы продадите клиенту.</p>
      <div class="pc-so-totals"><div><span>По дилерской цене</span><strong>${rub(sum)}</strong></div><div><span>Клиент платит вам</span><strong>${rub(sale)}</strong></div><div><span>${icon("lock")}Ваш доход</span><strong>≈ ${rub(sale - sum)}</strong></div></div>
      ${closed ? `<p class="small">Заявка закрыта — заказ поставщику не нужен.</p>` : `<div class="row"><button type="button" class="btn primary" data-pc-action="sup-order:${esc(o.id)}" data-testid="pc-sup-order-btn">${icon("send")} Заказать у поставщика</button></div>`}
      <p class="small">Срок поставки — ${esc(sup.days)}. Расчёт с поставщиком — по его счёту, напрямую: RemCard платёж не проводит.</p></section>`;
}
export const lineSupplierTag = (i) => (SUP.added.has(i.pid) ? `<small class="pc-line-sup">от поставщика «Тандор» · под заказ</small>` : "");

/* ---------- Вкладка «Поставщики» ---------- */
export function renderSuppliersTab(s, icon) {
  const u = ui(s);
  const items = supItems();
  const fits = (x) => !u.cat || x.cats.includes(u.cat);
  const list = SUPPLIERS.filter(fits);
  const chips = [["", "Все", SUPPLIERS.length], ...SUP_CATS.map(([id, label]) => [id, label, SUPPLIERS.filter((x) => x.cats.includes(id)).length])];
  const catPills = (x) => x.cats.map((c) => `<span class="pill">${esc((SUP_CATS.find(([id]) => id === c) || [])[1] || c)}</span>`).join("");
  const card = (x) => {
    const fresh = items.filter((i) => !i.own).length; const added = SUP.added.size;
    const nums = x.catalog ? `<div class="pc-sup-nums"><div><strong>${items.length}</strong><span>${plural(items.length, "модель", "модели", "моделей")} в каталоге</span></div><div><strong>${items.length - fresh}</strong><span>уже есть у вас</span></div><div><strong>${fresh}</strong><span>можно добавить</span></div><div><strong>${added}</strong><span>добавлено вами</span></div></div>` : "";
    const asked = SUP.asked.has(x.id);
    const act = x.catalog
      ? `<button type="button" class="btn primary" data-pc-action="sup-open:${x.id}" data-testid="pc-sup-open-${x.id}">${icon("book-open")} Открыть каталог</button>`
      : `<button type="button" class="btn" data-pc-action="sup-ask:${x.id}" data-testid="pc-sup-ask-${x.id}" ${asked ? "disabled" : ""}>${icon(asked ? "check" : "send")} ${asked ? "Запрос отправлен" : "Запросить условия"}</button>`;
    return `<article class="panel pc-sup" data-testid="pc-sup-${x.id}">
        <div class="pc-sup-h"><span class="pc-sup-ico">${icon(x.icon)}</span><div><strong>${esc(x.name)}</strong><small>${esc(x.kind)} · ${esc(x.city)}</small></div>${x.catalog ? connPill(x.id, icon) : ""}</div>
        <p class="small">${esc(x.about)}</p>
        <div class="row pc-sup-cats">${catPills(x)}</div>
        <dl class="pc-dl">${x.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(isActive(x.id) && k === "Дилерская цена" ? "открыта для вас · на 22–30 % ниже РРЦ" : v)}</dd></div>`).join("")}</dl>
        ${nums}
        <div class="row">${act}</div>
      </article>`;
  };
  const orders = s.supOrders || [];
  const canDemo = SUP.added.size > 0;
  return `<section class="panel pc-site-head">
      <div class="stack"><h2>Поставщики по вашим категориям</h2>
        <p class="muted">Производители и поставщики размещают свой ассортимент в RemCard. Добавьте их модели в свой каталог — клиенты увидят их на вашей странице, а заказ поставщику отправляется прямо из заявки клиента.</p></div>
      <div class="pc-site-tools"><button type="button" class="btn pc-btn-sm" data-pc-action="sup-invite" data-testid="pc-sup-invite">${icon("user-plus")} Пригласить поставщика</button></div>
    </section>
    <div class="pc-chips" role="group" aria-label="Категория" data-testid="pc-sup-cats">${chips.map(([id, label, n]) => `<button type="button" class="${u.cat === id ? "selected" : ""}" data-pc-action="sup-cat:${id}" aria-pressed="${u.cat === id}">${label} <em>${n}</em></button>`).join("")}</div>
    <section class="pc-sups" aria-label="Поставщики">${list.map(card).join("")}</section>
    <section class="panel stack" data-testid="pc-sup-orders"><div class="row between"><h3>Заказы поставщикам</h3><span class="small">${orders.length ? `${orders.length} ${plural(orders.length, "заказ", "заказа", "заказов")}` : "пока нет"}</span></div>
      ${orders.length ? `<div class="pc-so-list">${orders.map((so) => supOrderCard(s, icon, so, { withLink: true })).join("")}</div>` : `<p class="muted">Заказ поставщику создаётся из заявки клиента, если в ней есть товары поставщика.</p>`}
      <div class="row"><button type="button" class="linkbtn" data-pc-action="sup-demo-order" data-testid="pc-sup-demo-order" ${canDemo ? "" : "disabled"}>Показать заявку клиента на товар поставщика (демо)</button>${canDemo ? "" : `<span class="small">сначала добавьте модель из каталога поставщика</span>`}</div>
    </section>
    <section class="panel stack"><h3>Как это работает</h3><ol class="pc-flow"><li><strong>Поставщик</strong><span>Выгружает ассортимент из своей 1С</span></li><li><strong>Вы</strong><span>Выбираете модели и публикуете у себя</span></li><li><strong>Клиент</strong><span>Видит товар на вашей странице и оставляет заявку</span></li><li><strong>Заказ поставщику</strong><span>Отправляете из заявки, менеджер выставляет счёт</span></li><li><strong>Продажа</strong><span>Оплачиваете счёт, получаете товар и продаёте клиенту</span></li></ol>
      <p class="small">Карточку товара — фото, описание, характеристики — ведёт поставщик; цену клиенту и показ на сайте определяете вы. Расчёт с поставщиком идёт по его счёту, напрямую между вами: RemCard платёж не проводит. Дилерские цены и заказы поставщикам видны только владельцу кабинета. Поставщики и условия — примеры.</p></section>`;
}

/* ---------- Каталог поставщика ---------- */
const itemStatus = (it) => (it.own ? "own" : SUP.added.has(it.id) ? "added" : "free");
const visibleItems = (u) => supItems().filter((it) => (!u.section || it.section === u.section) && (!u.fresh || !it.own));
export function renderSupplierPage(s, icon) {
  const u = ui(s);
  const sup = supplierById(u.view);
  const conn = SUP.conn[sup.id] || "none";
  const active = conn === "active";
  const all = supItems();
  const list = visibleItems(u);
  const free = list.filter((it) => itemStatus(it) === "free");
  const picked = free.filter((it) => u.picked.has(it.id));
  const allPicked = free.length > 0 && picked.length === free.length;
  const freeAll = all.filter((it) => itemStatus(it) === "free").length;
  const sections = SECTION_ORDER.filter((x) => all.some((it) => it.section === x));
  const head = {
    none: `<p class="muted">Каталог можно посмотреть уже сейчас — с рекомендованными розничными ценами. Дилерские цены и добавление моделей в ваш каталог откроются после того, как поставщик подтвердит сотрудничество.</p><div class="row"><button type="button" class="btn primary" data-pc-action="sup-request:${sup.id}" data-testid="pc-sup-request">${icon("handshake")} Запросить сотрудничество</button></div>`,
    pending: `<p class="notice accent">${icon("clock")}<span><strong>Запрос отправлен.</strong> Менеджер поставщика увидит его в своём кабинете и в боте RemCard PROF. После подтверждения откроются дилерские цены и добавление моделей.</span></p><div class="row"><button type="button" class="linkbtn" data-pc-action="sup-confirm:${sup.id}" data-testid="pc-sup-confirm">Показать подтверждение поставщика (демо)</button></div>`,
    active: `<p class="notice pc-sup-ok">${icon("circle-check")}<span><strong>Сотрудничество подтверждено.</strong> Вам доступны дилерские цены. Выберите модели и добавьте их в свой каталог — они появятся на вашей странице на remcard.ru как товары под заказ.</span></p>`,
  }[conn];
  const skuN = all.reduce((a, it) => a + it.skus, 0);
  const facts = sup.facts.map(([k, v]) => (active && k === "Дилерская цена" ? [k, "открыта для вас · на 22–30 % ниже РРЦ, видна только владельцу кабинета"] : [k, v]));
  const stat = (label, value, note) => `<div class="stat"><span class="small">${label}</span><strong>${value}</strong><small>${note}</small></div>`;
  const status = (it) => {
    const st = itemStatus(it);
    if (st === "own") return `<span class="pc-sstat pc-sstat--own">${icon("database")}<span>Уже в вашем каталоге<small>из вашей 1С · сопоставлено по артикулу</small></span></span>`;
    if (st === "added") return `<span class="pc-sstat pc-sstat--added">${icon("circle-check")}<span>В вашем каталоге<small>добавлено от поставщика</small></span></span>`;
    return `<span class="pc-sstat">${icon("circle-plus")}<span>Можно добавить<small>${active ? "под заказ у поставщика" : "после подтверждения"}</small></span></span>`;
  };
  const act = (it) => {
    const st = itemStatus(it);
    if (st === "own") return "";
    if (st === "added") return `<button type="button" class="btn pc-btn-sm" data-pc-action="sup-remove:${it.id}" data-testid="pc-sup-remove-${it.id}">Убрать</button>`;
    return `<button type="button" class="btn pc-btn-sm" data-pc-action="sup-add:${it.id}" data-testid="pc-sup-add-${it.id}" ${active ? "" : "disabled"} ${active ? "" : 'title="Доступно после подтверждения сотрудничества"'}>${icon("plus")} Добавить</button>`;
  };
  const row = (it) => {
    const st = itemStatus(it); const income = it.rrc - it.dealer;
    const check = st === "free" && active ? `<label class="pc-pick"><input type="checkbox" data-pc-action="sup-sel:${it.id}" data-testid="pc-sup-select-${it.id}" ${u.picked.has(it.id) ? "checked" : ""} aria-label="Выбрать: ${esc(it.name)} ${esc(it.variant)}"></label>` : `<span class="pc-pick" aria-hidden="true"></span>`;
    return `<article class="pc-srow ${u.picked.has(it.id) ? "is-picked" : ""} ${st === "own" ? "is-own" : ""}" data-testid="pc-sup-item-${it.id}" data-status="${st}">
        ${check}
        <div class="pc-srow-main">${thumb(it, icon)}<span class="pc-row-title"><strong>${esc(it.name)}</strong><small>${esc(it.variant)}</small><small class="pc-row-var">${esc(it.section)} · ${it.skus} ${plural(it.skus, "вариант", "варианта", "вариантов")}</small></span></div>
        <span class="pc-cell" data-label="РРЦ"><strong>${rub(it.rrc)}</strong><small>за ${esc(it.unit)}</small></span>
        <span class="pc-cell" data-label="Дилерская цена">${active ? `<strong>${rub(it.dealer)}</strong><small>−${Math.round((1 - it.dealer / it.rrc) * 100)} % от РРЦ</small>` : `<span class="pc-slock">${icon("lock")}после подтверждения</span>`}</span>
        <span class="pc-cell" data-label="Ваш доход">${active ? `<strong class="pc-mk pc-mk--ok">${rub(income)}</strong><small>с единицы по РРЦ</small>` : `<span class="muted">—</span>`}</span>
        <span class="pc-cell" data-label="У поставщика"><span>${num(it.stock)} шт</span><small>поставка ${esc(sup.days)}</small></span>
        <span class="pc-cell pc-cell--status">${status(it)}</span>
        <span class="pc-cell pc-cell--act">${act(it)}</span>
      </article>`;
  };
  return `<div class="stack pc-section" data-testid="pc-supplier-view">
    <button type="button" class="linkbtn pc-back" data-pc-action="sup-back">${icon("arrow-left")} Ко всем поставщикам</button>
    <section class="panel stack pc-supplier-head">
      <div class="pc-sup-h"><span class="pc-sup-ico">${icon(sup.icon)}</span><div><h2>${esc(sup.name)}</h2><small>${esc(sup.kind)} · ${esc(sup.city)} · каталог из 1С поставщика, обновлён сегодня в 06:00</small></div>${connPill(sup.id, icon)}</div>
      <p class="small">${esc(sup.about)}</p>
      ${head}
      <dl class="pc-dl pc-sup-terms">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    </section>
    <div class="stats pc-stats pc-stats--4">
      ${stat("В каталоге поставщика", all.length, `${skuN} ${plural(skuN, "вариант", "варианта", "вариантов")} · демо-выборка`)}
      ${stat("Уже есть у вас", all.filter((it) => it.own).length, "из вашей 1С — добавлять не нужно")}
      ${stat("Можно добавить", freeAll, "этих моделей нет в вашем каталоге")}
      ${stat("Добавлено вами", SUP.added.size, SUP.added.size ? "на вашей странице — под заказ" : "пока ничего")}
    </div>
    <div class="pc-quick" role="group" aria-label="Раздел каталога поставщика" data-testid="pc-sup-sections">${[["", "Все разделы", all.length], ...sections.map((x) => [x, x, all.filter((it) => it.section === x).length])].map(([id, label, n]) => `<button type="button" class="${u.section === id ? "selected" : ""}" data-pc-action="sup-section:${esc(id)}" aria-pressed="${u.section === id}">${esc(label)}<em>${n}</em></button>`).join("")}<button type="button" class="${u.fresh ? "selected" : ""}" data-pc-action="sup-fresh" data-testid="pc-sup-fresh" aria-pressed="${u.fresh}">Только новые для меня<em>${all.filter((it) => !it.own).length}</em></button></div>
    <div class="pc-toolbar ${picked.length ? "is-bulk" : ""}" data-testid="pc-sup-toolbar">
      <label class="pc-pick pc-pick--all"><input type="checkbox" data-pc-action="sup-selall" data-testid="pc-sup-select-all" data-pc-partial="${picked.length > 0 && !allPicked}" ${allPicked ? "checked" : ""} ${active && free.length ? "" : "disabled"}><span>${picked.length ? `Выбрано ${picked.length} из ${free.length}` : active ? (free.length ? `Выбрать все новые · ${models_(free.length)}` : "Новых моделей в этом разделе нет") : "Выбор — после подтверждения сотрудничества"}</span></label>
      <div class="pc-bulk"><button type="button" class="btn pc-btn-sm ${picked.length ? "primary" : ""}" data-pc-action="sup-add:" data-testid="pc-sup-add-picked" ${picked.length ? "" : "disabled"}>${icon("plus")} Добавить выбранные${picked.length ? ` · ${picked.length}` : ""}</button><button type="button" class="btn pc-btn-sm" data-pc-action="sup-add:*" data-testid="pc-sup-add-all" ${active && freeAll ? "" : "disabled"}>${icon("layers")} Добавить весь ассортимент${active && freeAll ? ` · ${freeAll}` : ""}</button></div>
    </div>
    ${list.length ? `<section class="pc-slist ${active ? "" : "is-locked"}" aria-label="Ассортимент поставщика" data-testid="pc-sup-list"><div class="pc-srow pc-srow--head" aria-hidden="true"><span></span><span>Модель</span><span>РРЦ</span><span>Дилерская цена</span><span>Ваш доход</span><span>У поставщика</span><span>Статус</span><span></span></div>${list.map(row).join("")}</section>` : `<div class="panel empty"><h3>В этом разделе всё уже есть у вас</h3><button type="button" class="btn" data-pc-action="sup-section:">Показать все разделы</button></div>`}
    <p class="small pc-foot">РРЦ — рекомендованная розничная цена поставщика. Дилерская цена и ваш доход видны только владельцу кабинета: сотрудникам, клиентам и на сайте они не показываются. Фото, описание и характеристики ведёт поставщик — они обновляются у всех продавцов сразу. Цены, остатки и условия — демонстрационные.</p>
  </div>`;
}

/* Блок «Поставщик» в карточке модели, добавленной от поставщика. */
export function supplierModelPanel(s, icon, m) {
  const a = SUP.added.get(m.id); const it = supItem(m.id);
  if (!a || !it) return "";
  const sup = supplierById("tandoor");
  /* Сотруднику размер наценки не показывается — только цена и кто её назначает. */
  const priceRule = !s.manage ? "назначает владелец кабинета" : a.mode === "pct" ? `своя наценка ${a.pct} % к дилерской цене` : "РРЦ поставщика";
  return `<section class="panel stack pc-sup-model" data-testid="pc-sup-model"><div class="row between"><h3>Поставщик</h3><span class="pill pc-status">${icon("factory")}${esc(sup.name)} · ${esc(sup.kind.toLowerCase())}</span></div>
      <dl class="pc-dl"><div><dt>Наличие</dt><dd>Под заказ · поставка ${esc(sup.days)} · у поставщика ${num(it.stock)} шт</dd></div><div><dt>Цена клиенту</dt><dd>${rub(m.price)} · ${priceRule}</dd></div>${s.manage && s.showCost ? `<div><dt>Дилерская цена</dt><dd>${rub(it.dealer)} · РРЦ ${rub(it.rrc)}</dd></div>` : ""}<div><dt>Карточка товара</dt><dd>Фото, описание и характеристики ведёт поставщик</dd></div></dl>
      ${s.manage ? `<div class="row"><button type="button" class="btn" data-pc-action="sup-price:${m.id}" data-testid="pc-sup-price">${icon("pencil")} Изменить цену</button><button type="button" class="btn" data-pc-action="sup-open:tandoor">${icon("book-open")} Каталог поставщика</button><button type="button" class="btn" data-pc-action="sup-remove:${m.id}" data-testid="pc-sup-remove-model">${icon("trash-2")} Убрать из каталога</button></div>` : ""}
      <p class="small">Товара нет на вашем складе: при заявке клиента ${s.manage ? "вы отправляете заказ поставщику прямо из заявки" : "заказ поставщику оформляет владелец кабинета"}.</p></section>`;
}

export function supplierOnboarding(icon) {
  return `<section class="panel pc-onboard pc-onboard--sup" data-testid="pc-onboard-supplier"><span class="care-badge care-badge--ink">${icon("factory")} Каталог поставщика</span><h2>Нет своей 1С? Начните с каталога поставщика</h2><p class="muted">Производители размещают свой ассортимент в RemCard. Выберите поставщика по вашей категории, добавьте его модели — и клиенты увидят их на вашей странице. Заказ поставщику отправляется из заявки клиента.</p>
    <div class="row"><button type="button" class="btn" data-pc-action="sup-onboard" data-testid="pc-onboard-supplier-btn">${icon("book-open")} Посмотреть поставщиков</button></div></section>`;
}

/* ---------- Окна ---------- */
function priceDialog(ctx, ids, edit) {
  const { s, config } = ctx; const u = ui(s);
  const list = ids.map(supItem).filter(Boolean);
  if (!list.length) return;
  u.target = list.map((it) => it.id);
  const cur = edit ? SUP.added.get(list[0].id) : null;
  const mode = cur?.mode || "rrc"; const pct = cur?.pct ?? DEFAULT_PCT;
  const sample = list[0];
  const title = edit ? `Цена клиенту: ${sample.name}` : list.length === 1 ? `Добавить в каталог: ${sample.name}` : `Добавить в каталог: ${models_(list.length)}`;
  config.openDialog(title, `<div class="stack pc-sup-dlg" data-pc-supdlg data-edit="${edit ? "1" : ""}" data-testid="pc-sup-add-dialog">
      <p class="muted">${edit ? "Цена, по которой клиенты видят товар на вашей странице." : `${list.length === 1 ? "Модель появится" : "Модели появятся"} в ваших «Товарах» и на вашей странице на remcard.ru как ${list.length === 1 ? "товар" : "товары"} под заказ от поставщика «Тандор».`}</p>
      <fieldset class="pc-sup-modes"><legend>Цена клиенту</legend>
        <label class="pc-check"><input type="radio" name="pc-sup-mode" value="rrc" ${mode === "rrc" ? "checked" : ""} data-testid="pc-sup-mode-rrc"><span><strong>РРЦ поставщика</strong><small>Как рекомендует производитель; меняется вместе с его прайсом</small></span></label>
        <label class="pc-check"><input type="radio" name="pc-sup-mode" value="pct" ${mode === "pct" ? "checked" : ""} data-testid="pc-sup-mode-pct"><span><strong>Своя наценка к дилерской цене</strong><small>Цена считается от дилерской цены и округляется до 10 ₽</small></span></label>
        <label class="pc-sup-pct"><span>Наценка, %</span><input type="text" inputmode="numeric" name="pc-sup-pct" value="${pct}" maxlength="3" autocomplete="off" data-testid="pc-sup-pct" ${mode === "pct" ? "" : "disabled"}></label>
      </fieldset>
      <div class="pc-sup-sample" data-pc-supsample data-id="${esc(sample.id)}" data-n="${list.length}" data-testid="pc-sup-sample">${sampleLine(sample, mode, pct, list.length)}</div>
      <p class="rco-err pc-sup-err" hidden>Укажите наценку от 0 до 300 %.</p>
      <div class="row"><button type="button" class="btn primary" data-pc-action="sup-add-ok" data-testid="pc-sup-add-ok">${edit ? "Сохранить" : "Добавить и опубликовать"}</button><button type="button" class="btn" data-action="close-dialog">Отмена</button></div>
      <p class="small">${edit ? "" : "Товар будет представлен во всех филиалах; филиалы можно изменить в карточке товара. "}Клиент видит только цену и срок поставки — дилерская цена ему не показывается. Изменения демонстрационные.</p>
    </div>`);
}
const sampleLine = (it, mode, pct, n) => { const p = clientPrice(it, mode, pct); const inc = p - it.dealer; return `<strong>${esc(it.name)} · ${esc(it.variant)}</strong><span>дилерская ${rub(it.dealer)} → клиенту <b>${rub(p)}</b> · ваш доход <b class="${inc < 0 ? "pc-brloss" : ""}">${inc < 0 ? "−" : ""}${rub(Math.abs(inc))}</b> с единицы${mode === "pct" && p !== it.rrc ? ` · РРЦ ${rub(it.rrc)}` : ""}</span>${p < it.rrc ? `<small class="pc-sup-below">Цена ниже РРЦ поставщика на ${rub(it.rrc - p)}. Можно ли продавать ниже РРЦ — определяют условия поставщика.</small>` : ""}${n > 1 ? `<small>пример по первой из ${n} моделей; для остальных цена считается так же</small>` : ""}`; };
const readPct = (el) => { const v = parseInt(String(el?.value ?? "").replace(/[^\d]/g, ""), 10); return Number.isFinite(v) && v >= 0 && v <= 300 ? v : null; };

function requestDialog(ctx, sup) {
  const { config, icon } = ctx;
  const terms = [["badge-percent", "Дилерская цена на весь ассортимент поставщика", "Вы видите её в каталоге поставщика; клиентам и сотрудникам она не показывается."], ["package", "Товар под заказ", `Поставка ${sup.days} со склада поставщика — в ваш филиал или сразу клиенту.`], ["file-text", "Оплата по счёту поставщика", "Менеджер поставщика выставляет счёт на каждый заказ. Расчёт идёт напрямую между вами: RemCard платёж не проводит."], ["handshake", "Договор — между вами и поставщиком", "RemCard передаёт запрос, каталог и заказы; условия поставки вы согласуете с поставщиком."]];
  config.openDialog(`Сотрудничество с поставщиком «${sup.name}»`, `<div class="stack pc-sup-dlg" data-pc-supreq="${sup.id}" data-testid="pc-sup-request-dialog">
      <p class="muted">Поставщик получит запрос от вашей компании и подтвердит сотрудничество. После этого вы сможете добавлять его модели в свой каталог и отправлять ему заказы.</p>
      <ul class="pc-loads">${terms.map(([ic, title, text]) => `<li>${icon(ic)}<div><strong>${title}</strong><small>${text}</small></div></li>`).join("")}</ul>
      <label class="pc-check"><input type="checkbox" data-testid="pc-sup-agree"><span><strong>С условиями поставщика ознакомлен</strong><small>Условия — пример для прототипа</small></span></label>
      <p class="rco-err pc-sup-err" hidden>Отметьте, что ознакомились с условиями поставщика.</p>
      <div class="row"><button type="button" class="btn primary" data-pc-action="sup-request-ok" data-testid="pc-sup-request-ok">${icon("send")} Отправить запрос</button><button type="button" class="btn" data-action="close-dialog">Отмена</button></div>
    </div>`);
}

function orderDialog(ctx, o) {
  const { s, config, icon, BRANCHES } = ctx;
  const lines = supLines(o);
  if (!lines.length) return;
  const sup = supplierById("tandoor");
  const sum = lines.reduce((a, i) => a + supItem(i.pid).dealer * i.qty, 0); const sale = lines.reduce((a, i) => a + i.price * i.qty, 0);
  const toClient = /^Доставка/.test(o.receive);
  const pickup = BRANCHES.findIndex((b) => o.receive.includes(b));
  config.openDialog(`Заказ поставщику «${sup.name}»`, `<div class="stack pc-sup-dlg" data-pc-suporder="${esc(o.id)}" data-testid="pc-sup-order-dialog">
      <p class="muted">По заявке клиента № ${esc(o.id)}. Менеджер поставщика получит заказ в кабинете и в боте RemCard PROF и выставит счёт.</p>
      <div class="pc-so-lines">${lines.map((i) => { const d = supItem(i.pid).dealer; return `<div><span>${esc(i.name)} <small>${esc([i.size, i.color].filter(Boolean).join(" · "))}</small></span><span>${i.qty} × ${rub(d)}</span><strong>${rub(d * i.qty)}</strong></div>`; }).join("")}</div>
      <div class="pc-so-totals"><div><span>К оплате поставщику</span><strong>${rub(sum)}</strong></div><div><span>Клиент платит вам</span><strong>${rub(sale)}</strong></div><div><span>${icon("lock")}Ваш доход</span><strong>≈ ${rub(sale - sum)}</strong></div></div>
      <fieldset class="pc-sup-modes"><legend>Куда доставить</legend>
        <label class="pc-check"><input type="radio" name="pc-sup-deliv" value="branch" ${toClient ? "" : "checked"}><span><strong>В мой филиал</strong><small>Клиент заберёт товар у вас</small></span></label>
        <label class="pc-sup-pct pc-sup-branch"><span>Филиал</span><select name="pc-sup-branch" data-testid="pc-sup-order-branch">${BRANCHES.map((b, i) => `<option value="${i}" ${i === Math.max(0, pickup) ? "selected" : ""}>${esc(b)}</option>`).join("")}</select></label>
        <label class="pc-check"><input type="radio" name="pc-sup-deliv" value="client" ${toClient ? "checked" : ""} ${toClient ? "" : "disabled"}><span><strong>Сразу клиенту</strong><small>${toClient ? esc(o.receive.replace(/^Доставка · /, "")) : "Клиент выбрал самовывоз — адреса доставки в заявке нет"}</small></span></label>
      </fieldset>
      <label class="field">Комментарий поставщику<textarea name="pc-sup-comment" rows="2" maxlength="300" placeholder="Например: нужна поставка до пятницы" data-testid="pc-sup-order-comment"></textarea></label>
      <div class="row"><button type="button" class="btn primary" data-pc-action="sup-order-ok" data-testid="pc-sup-order-ok">${icon("send")} Отправить заказ поставщику</button><button type="button" class="btn" data-action="close-dialog">Отмена</button></div>
      <p class="small">Поставщик получает состав заказа, адрес доставки и название вашей компании. Имя клиента передаётся только при доставке сразу клиенту; телефон не передаётся — RemCard его не собирает. Оплата — по счёту поставщика, вне RemCard.</p>
    </div>`);
}

/* ---------- Действия ---------- */
/* Возвращает true, если действие относится к поставщикам (перерисовку выполняет само). */
export function handleSupplierAction(ctx, kind, id, el) {
  if (!kind.startsWith("sup-")) return false;
  const { s, config, rerender, stamp } = ctx;
  const u = ui(s);
  /* Поставщики, дилерские цены и заказы поставщику — только для владельца кабинета. */
  if (!s.manage) return true;
  const sup = supplierById(u.view) || supplierById("tandoor");
  if (kind === "sup-cat") { u.cat = id; rerender(); return true; }
  if (kind === "sup-open") { const x = supplierById(id); if (!x?.catalog) return true; s.tab = "suppliers"; s.view = ""; s.order = ""; s.full = false; u.view = id; u.picked.clear(); rerender(); window.scrollTo({ top: 0 }); return true; }
  if (kind === "sup-back") { u.view = ""; u.picked.clear(); rerender(`pc-sup-open-${sup.id}`); return true; }
  if (kind === "sup-ask") { SUP.asked.add(id); config.notify(`Запрос условий отправлен: ${supplierById(id)?.name || "поставщик"} ответит в кабинете и в боте RemCard PROF (демо).`); rerender(`pc-sup-ask-${id}`); return true; }
  if (kind === "sup-invite") { config.notify("Демо: ссылка-приглашение скопирована. Поставщик регистрируется в RemCard, выгружает каталог из своей 1С и появляется в этом списке.", "info"); return true; }
  if (kind === "sup-onboard") { config.notify("Демо: откроется список поставщиков по вашим категориям. Чтобы увидеть его, выберите «Демо» в поле «Данные» и вкладку «Поставщики».", "info"); return true; }
  if (kind === "sup-request") { requestDialog(ctx, sup); return true; }
  if (kind === "sup-request-ok") {
    const box = document.querySelector("[data-pc-supreq]");
    if (!box?.querySelector("input[type=checkbox]")?.checked) { const err = box?.querySelector(".pc-sup-err"); if (err) err.hidden = false; box?.querySelector("input[type=checkbox]")?.focus(); return true; }
    SUP.conn[box.dataset.pcSupreq] = "pending"; SUP.ver += 1;
    config.closeDialog();
    config.notify(`Запрос сотрудничества отправлен поставщику «${sup.name}» (демо).`);
    rerender("pc-sup-confirm"); return true;
  }
  if (kind === "sup-confirm") {
    if (SUP.conn[id] !== "pending") return true;
    SUP.conn[id] = "active"; SUP.ver += 1;
    config.notify(`Демо: поставщик «${sup.name}» подтвердил сотрудничество. Доступны дилерские цены и добавление моделей.`, "info");
    rerender("pc-sup-select-all"); return true;
  }
  if (kind === "sup-section") { u.section = id; u.picked = new Set([...u.picked].filter((x) => visibleItems(u).some((it) => it.id === x))); rerender(); return true; }
  if (kind === "sup-fresh") { u.fresh = !u.fresh; u.picked = new Set([...u.picked].filter((x) => visibleItems(u).some((it) => it.id === x))); rerender("pc-sup-fresh"); return true; }
  if (kind === "sup-sel") { if (!isActive()) return true; if (u.picked.has(id)) u.picked.delete(id); else u.picked.add(id); rerender(el.dataset.testid); return true; }
  if (kind === "sup-selall") {
    if (!isActive()) return true;
    const free = visibleItems(u).filter((it) => itemStatus(it) === "free");
    u.picked = new Set(free.length && free.every((it) => u.picked.has(it.id)) ? [] : free.map((it) => it.id));
    rerender("pc-sup-select-all"); return true;
  }
  if (kind === "sup-add") {
    if (!isActive()) { config.notify("Добавлять модели можно после того, как поставщик подтвердит сотрудничество.", "info"); return true; }
    const ids = id === "*" ? supItems().filter((it) => itemStatus(it) === "free").map((it) => it.id) : id ? [id] : visibleItems(u).filter((it) => itemStatus(it) === "free" && u.picked.has(it.id)).map((it) => it.id);
    priceDialog(ctx, ids.filter((x) => itemStatus(supItem(x)) === "free"), false); return true;
  }
  if (kind === "sup-price") { if (SUP.added.has(id)) priceDialog(ctx, [id], true); return true; }
  if (kind === "sup-add-ok") {
    const box = document.querySelector("[data-pc-supdlg]");
    if (!box || !isActive()) return true;
    const mode = box.querySelector('input[name="pc-sup-mode"]:checked')?.value === "pct" ? "pct" : "rrc";
    const pct = mode === "pct" ? readPct(box.querySelector('input[name="pc-sup-pct"]')) : DEFAULT_PCT;
    if (pct == null) { const err = box.querySelector(".pc-sup-err"); if (err) err.hidden = false; box.querySelector('input[name="pc-sup-pct"]')?.focus(); return true; }
    const edit = box.dataset.edit === "1";
    const ids = u.target.filter((x) => supItem(x) && (edit ? SUP.added.has(x) : itemStatus(supItem(x)) === "free"));
    ids.forEach((x) => { const prev = SUP.added.get(x); SUP.added.set(x, { id: x, mode, pct, prod: prev?.prod || null }); u.picked.delete(x); });
    u.target = []; SUP.ver += 1;
    config.closeDialog();
    config.notify(edit ? "Цена клиенту сохранена (демо)." : `Добавлено в ваш каталог: ${models_(ids.length)} от поставщика «Тандор». Товары уже на вашей странице — под заказ (демо).`);
    rerender(edit ? "pc-sup-price" : "pc-sup-select-all"); return true;
  }
  if (kind === "sup-remove") {
    const it = supItem(id);
    if (!it || !SUP.added.has(id)) return true;
    SUP.added.delete(id); SUP.ver += 1; s.hidden.delete(id); s.selected.delete(id); s.branchOff.delete(id); s.branchPrice.delete(id);
    if (s.view === id) s.view = "";
    config.notify(`«${it.name} · ${it.variant}» убран из вашего каталога. У поставщика модель остаётся (демо).`);
    rerender(`pc-sup-add-${id}`); return true;
  }
  if (kind === "sup-demo-order") {
    const added = addedProducts();
    if (!added.length) return true;
    const no = String(Math.max(1043, ...s.orders.map((o) => Number(o.id) || 0)) + 1);
    const line = (m, size, qty) => { const sku = m.skus.find((k) => k.size === size) || m.skus[0]; return { pid: m.id, name: m.name, name1c: sku.name1c, size: sku.size, color: sku.color, qty, price: m.price || 0, stock: sku.stock, img: m.imgs[0] || "" }; };
    const items = [...added.slice(0, 2).map((x, i) => { const m = ctx.modelById(x.p.id); return m ? line(m, "800", i ? 1 : 2) : null; }), (() => { const m = ctx.modelById("p037"); return m ? line(m, "", 3) : null; })()].filter(Boolean);
    s.orders.unshift({ id: no, date: "только что", client: "Сергей Литвинов", via: "Telegram", receive: `Самовывоз · ${ctx.BRANCHES[1]}`, comment: "Подскажите, пожалуйста, срок поставки.", status: "new", items, sum: items.reduce((a, i) => a + i.price * i.qty, 0), history: [["только что", "Клиент отправил заявку с сайта remcard.ru"]], fresh: false, chat: [], unread: 0 });
    s.tab = "orders"; s.view = ""; u.view = ""; s.order = no; s.ofilter = "";
    config.notify("Демо: клиент оставил заявку на товар поставщика. Ниже — блок «Товары поставщика».", "info");
    rerender("pc-sup-order-btn"); window.scrollTo({ top: 0 }); return true;
  }
  if (kind === "sup-order") { const o = s.orders.find((x) => x.id === id); if (o && !supOrderOf(s, id)) orderDialog(ctx, o); return true; }
  if (kind === "sup-order-ok") {
    const box = document.querySelector("[data-pc-suporder]");
    const o = box && s.orders.find((x) => x.id === box.dataset.pcSuporder);
    if (!o || supOrderOf(s, o.id)) return true;
    const lines = supLines(o).map((i) => ({ pid: i.pid, name: i.name, size: i.size, color: i.color, qty: i.qty, dealer: supItem(i.pid).dealer, price: i.price }));
    const toClient = box.querySelector('input[name="pc-sup-deliv"]:checked')?.value === "client";
    const branch = ctx.BRANCHES[Number(box.querySelector('select[name="pc-sup-branch"]')?.value) || 0];
    const so = { id: `П-${o.id}`, supplier: "tandoor", orderId: o.id, date: stamp(), status: "sent", lines, sum: lines.reduce((a, l) => a + l.dealer * l.qty, 0), sale: lines.reduce((a, l) => a + l.price * l.qty, 0), delivery: toClient ? `сразу клиенту · ${o.receive.replace(/^Доставка · /, "")}` : `в ваш филиал · ${branch}`, comment: String(box.querySelector('textarea[name="pc-sup-comment"]')?.value || "").trim().slice(0, 300), invoice: "" };
    s.supOrders = [so, ...(s.supOrders || [])];
    o.history.push([stamp(), "Заказ поставщику «Тандор» отправлен"]);
    config.closeDialog();
    config.notify("Заказ отправлен поставщику «Тандор». Менеджер выставит счёт — он появится здесь и в вашем боте (демо).");
    rerender(`pc-so-demo-${so.id}`); return true;
  }
  if (kind === "sup-step") {
    const so = (s.supOrders || []).find((x) => x.id === id);
    if (!so) return true;
    const o = s.orders.find((x) => x.id === so.orderId);
    const next = { sent: "invoiced", invoiced: "paid", paid: "shipped", shipped: "received" }[so.status];
    if (!next) return true;
    if (next === "invoiced") { SUP.seq += 1; so.invoice = `Счёт № Т-${SUP.seq} от 25 ноября`; }
    so.status = next;
    const text = { invoiced: `Поставщик выставил счёт: ${so.invoice} на ${rub(so.sum)}`, paid: "Оплата счёта поставщика отмечена", shipped: "Поставщик отгрузил заказ", received: "Товар поставщика получен" }[next];
    o?.history.push([stamp(), text]);
    config.notify({ invoiced: `Демо: менеджер поставщика выставил счёт на ${rub(so.sum)}.`, paid: "Оплата отмечена. Поставщик увидит отметку и подтвердит поступление (демо).", shipped: "Демо: поставщик отгрузил заказ.", received: "Товар получен. Можно выдавать клиенту (демо)." }[next], next === "invoiced" || next === "shipped" ? "info" : "success");
    rerender({ invoiced: `pc-so-paid-${so.id}`, paid: `pc-so-demo-${so.id}`, shipped: `pc-so-received-${so.id}` }[next]); return true;
  }
  if (kind === "sup-invoice") { config.notify("Демо: счёт поставщика откроется в PDF. Оплата — по реквизитам поставщика, вне RemCard.", "info"); return true; }
  if (kind === "sup-goto") { s.tab = "orders"; u.view = ""; s.order = id; s.view = ""; rerender(); window.scrollTo({ top: 0 }); return true; }
  return true;
}

/* Окно цены: пересчёт примера на месте, без перерисовки страницы. */
export function handleSupplierInput(e) {
  const box = e.target.closest?.("[data-pc-supdlg]");
  if (!box) return false;
  const mode = box.querySelector('input[name="pc-sup-mode"]:checked')?.value === "pct" ? "pct" : "rrc";
  const pctEl = box.querySelector('input[name="pc-sup-pct"]');
  if (pctEl) pctEl.disabled = mode !== "pct";
  const pct = readPct(pctEl);
  const err = box.querySelector(".pc-sup-err"); if (err) err.hidden = mode !== "pct" || pct != null;
  const sample = box.querySelector("[data-pc-supsample]");
  if (sample && sample.dataset.id && supItem(sample.dataset.id)) sample.innerHTML = sampleLine(supItem(sample.dataset.id), mode, pct ?? DEFAULT_PCT, Number(sample.dataset.n) || 1);
  return true;
}
