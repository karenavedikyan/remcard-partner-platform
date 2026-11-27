/* Закупки RemCard: внутренний рынок партнёрства.
   Партнёр покупает у производителей, импортёров, дистрибьюторов и сервисов для бизнеса.
   Витрина по этапам ремонта, свободные ниши по городу, подключение поставщиков по API.
   Все данные демонстрационные. */

const STAGES = [
  { id: "L1-1", title: "Планирование", short: "План" },
  { id: "L1-4", title: "Демонтаж", short: "Демонтаж" },
  { id: "L1-5", title: "Конструктив", short: "Конструктив" },
  { id: "L1-7", title: "Инженерия", short: "Инженерия" },
  { id: "L1-8", title: "Черновая отделка", short: "Черновая" },
  { id: "L1-9", title: "Чистовая отделка", short: "Чистовая" },
  { id: "L1-10", title: "Оборудование", short: "Оборудование" },
  { id: "L1-11", title: "Приёмка", short: "Приёмка" },
];

const KINDS = {
  manufacturer: ["Производитель", "factory"],
  importer: ["Импортёр", "ship"],
  distributor: ["Дистрибьютор", "boxes"],
  b2b: ["Сервис для бизнеса", "briefcase"],
};

const CITIES = ["Краснодар", "Краснодарский край", "Ростов-на-Дону", "Сочи", "Ставрополь"];

const SUPPLIERS = [
  { id: "s1", name: "Кубанский гипсовый завод", kind: "manufacturer", tags: ["construction", "painting", "rough"], stages: ["L1-8"], cats: ["Сухие смеси", "Гипсокартон"], region: "Краснодар", minOrder: "от 30 000 ₽", delay: "Отсрочка 14 дней", bonus: "−7 % для партнёров RemCard", rating: 4.8, deals: 126, api: true, about: "Штукатурки, шпаклёвки и ГКЛ со своего завода. Отгрузка со склада в Краснодаре в день заказа.", retail: true, dealer: false, items: [["Штукатурка гипсовая 30 кг", 430], ["ГКЛ 12,5 мм, лист", 520]] },
  { id: "s2", name: "TileImport Юг", kind: "importer", tags: ["tiles", "finishing"], stages: ["L1-9"], cats: ["Керамогранит", "Плитка"], region: "Краснодарский край", minOrder: "от 60 м²", delay: "Предоплата 50 %", bonus: "−10 % при заказе от 200 м²", rating: 4.7, deals: 84, api: true, about: "Прямые поставки из Испании, Италии и Индии. Склад 4 000 м² в Краснодаре, резерв коллекций под объект.", retail: true, dealer: false, items: [["Керамогранит 60×60, м²", 1890], ["Плитка настенная 30×60, м²", 1450]] },
  { id: "s3", name: "Электро-Дистрибуция", kind: "distributor", tags: ["electrical", "lighting", "engineering", "smart_home"], stages: ["L1-7"], cats: ["Кабель", "Автоматика", "Розетки"], region: "Ростов-на-Дону", minOrder: "от 20 000 ₽", delay: "Отсрочка 30 дней", bonus: "Бонус 3 % на кошелёк", rating: 4.9, deals: 212, api: true, about: "Официальный дистрибьютор IEK, Schneider, Legrand. Доставка по ЮФО за 1–2 дня.", retail: true, dealer: false, items: [["Кабель ВВГнг 3×2,5, м", 98], ["Автомат 16 А", 310]] },
  { id: "s4", name: "Фабрика дверей «Дубрава»", kind: "manufacturer", tags: ["doors", "handles"], stages: ["L1-9", "L1-10"], cats: ["Межкомнатные двери", "Входные двери"], region: "Краснодар", minOrder: "от 5 полотен", delay: "Отсрочка 21 день", bonus: "Дилерская цена −18 %", rating: 4.6, deals: 57, api: false, about: "Собственное производство в Усть-Лабинске. Нестандартные размеры без наценки для партнёров.", retail: false, dealer: true, items: [["Дверь межкомнатная, полотно", 9800], ["Дверь входная", 32000]] },
  { id: "s5", name: "Сантех-Опт Краснодар", kind: "distributor", tags: ["plumbing", "heating", "engineering"], stages: ["L1-7", "L1-10"], cats: ["Трубы", "Смесители", "Котлы"], region: "Краснодар", minOrder: "от 15 000 ₽", delay: "Отсрочка 14 дней", bonus: "−5 % для партнёров RemCard", rating: 4.5, deals: 143, api: true, about: "Инженерная сантехника и отопление. Подбор по спецификации проекта, комплектация объекта целиком.", retail: true, dealer: false, items: [["Труба PP-R 25, м", 85], ["Смеситель для кухни", 5400]] },
  { id: "s6", name: "Проектное бюро «Линия»", kind: "b2b", tags: ["design", "planning", "renovation"], stages: ["L1-1"], cats: ["Дизайн-проект", "Рабочая документация"], region: "Краснодар", minOrder: "от 1 проекта", delay: "Поэтапная оплата", bonus: "Партнёрская ставка −15 %", rating: 4.8, deals: 39, api: false, about: "Дизайн и рабочие чертежи для бригад и компаний под брендом партнёра. Сроки от 10 дней.", retail: false, dealer: false, items: [["Дизайн-проект, м²", 1500], ["Рабочие чертежи, м²", 700]] },
  { id: "s7", name: "ДемонтажТехника Аренда", kind: "b2b", tags: ["demolition", "tools", "construction"], stages: ["L1-4", "L1-5"], cats: ["Аренда инструмента", "Вывоз мусора"], region: "Краснодар", minOrder: "от 1 смены", delay: "Оплата по факту", bonus: "−12 % на аренду от 5 смен", rating: 4.4, deals: 91, api: false, about: "Отбойники, штроборезы, контейнеры 8 и 20 м³. Подача день в день для партнёров RemCard.", retail: false, dealer: false, items: [["Отбойный молоток, смена", 1200], ["Контейнер 8 м³", 6500]] },
  { id: "s8", name: "Climate Import", kind: "importer", tags: ["climate"], stages: ["L1-10"], cats: ["Кондиционеры", "Вентиляция"], region: "Сочи", minOrder: "от 3 блоков", delay: "Отсрочка 14 дней", bonus: "Дилерская цена −14 %", rating: 4.7, deals: 68, api: true, about: "Импорт климатической техники, сервисные центры в Сочи и Краснодаре. Обучение монтажников бесплатно.", retail: false, dealer: true, items: [["Сплит-система 9 BTU", 32000], ["Монтажный комплект", 4500]] },
  { id: "s9", name: "Лаборатория «Приёмка»", kind: "b2b", tags: ["appraisal", "renovation"], stages: ["L1-11"], cats: ["Тепловизионное обследование", "Проверка качества"], region: "Краснодарский край", minOrder: "от 1 выезда", delay: "Оплата по факту", bonus: "−20 % для партнёров RemCard", rating: 4.9, deals: 31, api: false, about: "Независимая приёмка и акты для сдачи объекта заказчику. Снижает споры и ускоряет оплату.", retail: true, dealer: false, items: [["Тепловизионное обследование", 7000], ["Приёмка квартиры", 5000]] },
  { id: "s10", name: "ЛКМ-Центр Юг", kind: "distributor", tags: ["paint", "wallpaper", "painting", "finishing", "decor"], stages: ["L1-9"], cats: ["Краска", "Обои", "Декоративная штукатурка"], region: "Краснодар", minOrder: "от 10 000 ₽", delay: "Отсрочка 14 дней", bonus: "−8 % для партнёров RemCard", rating: 4.6, deals: 97, api: true, about: "Tikkurila, Caparol, Dulux со склада. Колеровка за час.", retail: true, dealer: false, items: [["Краска интерьерная 9 л", 4200], ["Обои флизелиновые, рулон", 2100]] },
  { id: "s11", name: "Паркет-Хаус", kind: "importer", tags: ["flooring", "finishing"], stages: ["L1-9"], cats: ["Ламинат", "Кварцвинил", "Паркетная доска"], region: "Краснодар", minOrder: "от 40 м²", delay: "Предоплата 30 %", bonus: "Дилерская цена −12 %", rating: 4.7, deals: 73, api: false, about: "Напольные покрытия из Германии и Бельгии. Подложка и плинтус в комплекте.", retail: true, dealer: true, items: [["Ламинат 33 кл., м²", 1350], ["Кварцвинил, м²", 1900]] },
  { id: "s12", name: "Кухни «Форма»", kind: "manufacturer", tags: ["kitchen", "furniture"], stages: ["L1-10"], cats: ["Кухни на заказ", "Шкафы"], region: "Краснодар", minOrder: "от 1 кухни", delay: "Поэтапная оплата", bonus: "Партнёрская ставка −15 %", rating: 4.8, deals: 44, api: false, about: "Фабрика в Краснодаре, замер и 3D-проект бесплатно для партнёров.", retail: true, dealer: true, items: [["Кухня прямая 3 м", 180000], ["Шкаф-купе", 65000]] },
  { id: "s13", name: "ОкнаПроф", kind: "manufacturer", tags: ["windows"], stages: ["L1-6", "L1-9"], cats: ["Окна ПВХ", "Остекление балконов"], region: "Краснодарский край", minOrder: "от 3 изделий", delay: "Предоплата 50 %", bonus: "−10 % для партнёров RemCard", rating: 4.5, deals: 120, api: true, about: "Собственное производство, монтаж за 1 день, гарантия 5 лет.", retail: true, dealer: true, items: [["Окно ПВХ двухстворчатое", 18500], ["Остекление балкона 3 м", 48000]] },
  { id: "s14", name: "Инструмент-Опт", kind: "distributor", tags: ["tools", "construction"], stages: ["L1-4", "L1-8"], cats: ["Электроинструмент", "Расходники", "Спецодежда"], region: "Ростов-на-Дону", minOrder: "от 5 000 ₽", delay: "Отсрочка 30 дней", bonus: "Бонус 4 % на кошелёк", rating: 4.7, deals: 310, api: true, about: "Makita, Bosch, DeWalt и расходники со склада в Ростове. Доставка по ЮФО за 1–2 дня.", retail: false, dealer: false, items: [["Перфоратор Makita", 14500], ["Диски отрезные, уп. 25", 1100]] },
];
const DOCS = [["КП № 118", "pdf · 2 стр."], ["Договор поставки", "подписан"], ["Прайс для партнёров", "xlsx · обновлён вчера"]];

const GAPS = [
  { stage: "L1-1", cat: "Дизайн-проекты эконом-сегмента", players: 2, demand: 140, trend: "+32 %" },
  { stage: "L1-4", cat: "Вывоз строительного мусора", players: 3, demand: 210, trend: "+18 %" },
  { stage: "L1-7", cat: "Монтаж тёплого пола", players: 4, demand: 95, trend: "+11 %" },
  { stage: "L1-8", cat: "Механизированная штукатурка", players: 1, demand: 120, trend: "+40 %" },
  { stage: "L1-9", cat: "Укладка крупноформатного керамогранита", players: 2, demand: 86, trend: "+27 %" },
  { stage: "L1-10", cat: "Кухни на заказ, комфорт-сегмент", players: 6, demand: 150, trend: "+6 %" },
  { stage: "L1-10", cat: "Умный дом под ключ", players: 1, demand: 64, trend: "+55 %" },
  { stage: "L1-11", cat: "Независимая приёмка квартир", players: 2, demand: 73, trend: "+21 %" },
];

const ORDERS = [
  { id: "o0", supplier: "s1", from: "Вы", what: "Штукатурка гипсовая 30 кг × 120", sum: "54 000 ₽", status: "Отгружен", date: "28 окт", via: "API" },
  { id: "o00", supplier: "s1", from: "Вы", what: "ГКЛ 12,5 мм × 60, профиль", sum: "41 200 ₽", status: "Подтверждён", date: "3 ноя", via: "API" },
  { id: "o000", supplier: "s2", from: "Вы", what: "Керамогранит 60×60 × 80 м²", sum: "96 000 ₽", status: "Новый", date: "сегодня", via: "Кабинет" },
  { id: "o1", from: "Магазин «Оптовик», Краснодар", what: "Штукатурка гипсовая 30 кг × 400, ГКЛ 12,5 мм × 120", sum: "186 400 ₽", status: "Новый", via: "API" },
  { id: "o2", from: "Бригада Алексея, Краснодар", what: "Шпаклёвка финишная × 40, грунт × 20", sum: "27 900 ₽", status: "Подтверждён", via: "Кабинет" },
  { id: "o3", from: "Компания «СтройГрад», Ростов-на-Дону", what: "Сухие смеси по спецификации объекта, 3 дома", sum: "1 240 000 ₽", status: "Отгружен", via: "API" },
];

const workspaces = new Map();
function ws(key) {
  if (!workspaces.has(key)) workspaces.set(key, { stage: "", kind: "", cat: "", q: "", city: "Краснодар", tab: "market", requests: [], supplier: false, apiKey: "", taken: new Set(), partners: new Set(), view: "", pview: "orders", chan: "", pub: "b2b", dealer: false, invites: [] });
  return workspaces.get(key);
}
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
const stageOf = (id) => STAGES.find((s) => s.id === id);
const CHAN = { b2b: ["Только B2B", "Продаёт только партнёрам RemCard, с розницей не работает"], both: ["B2B + B2C", "Продаёт и партнёрам, и клиентам на сайте"] };
const chanOf = (x) => (x.retail ? "both" : "b2b");
const chanPill = (x) => `<span class="pill proc-chan ${x.retail ? "" : "is-b2b"}" title="${CHAN[chanOf(x)][1]}">${CHAN[chanOf(x)][0]}</span>`;
const fmt = (n) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const disc = (x) => parseInt((x.bonus.match(/−(\d+)/) || [])[1], 10) || 5;
const priceTable = (x, partner, icon) => `<table class="proc-price"><thead><tr><th>Позиция</th><th>РРЦ <small>сайт</small></th><th>B2B-прайс <small>партнёрам</small></th><th>Ваша цена</th></tr></thead><tbody>${x.items.map(([t, rrc]) => { const b2b = rrc * (1 - disc(x) / 100); return `<tr><td>${esc(t)}</td><td class="muted">${fmt(rrc)}</td><td>${fmt(b2b)}</td><td>${partner ? `<strong>${fmt(b2b * 0.97)}</strong>` : `<span class="muted">после КП</span>`}</td></tr>`; }).join("")}</tbody></table><p class="small muted">РРЦ видят клиенты на сайте. B2B-прайс — для всех партнёров RemCard. Индивидуальную цену поставщик назначает партнёру после КП.</p>`;

export function procurementHomeTeaser(config) {
  const s = ws(config.key);
  return `<section class="panel care-teaser" data-testid="procurement-home-teaser"><div class="care-teaser-head"><span class="care-badge care-badge--ink">${config.icon("package-search")} Закупки RemCard</span><strong>${s.requests.length ? `Запросов поставщикам: ${s.requests.length}` : "Поставщики для вашего бизнеса"}</strong><p class="muted">Производители, импортёры, дистрибьюторы. Партнёрские цены и свободные ниши в вашем городе.</p></div><button type="button" class="btn ghost" data-action="nav:procurement">Открыть закупки</button></section>`;
}

let lastIcon = (n) => "";
export function renderProcurementSection(config) {
  const s = ws(config.key);
  const icon = config.icon;
  lastIcon = icon;
  const role = config.role;
  const tabs = [["market", "Найти поставщика"], ["mine", `Мои поставщики${s.partners.size ? ` (${s.partners.size})` : ""}`], ["gaps", "Свободные ниши"], ["requests", `Мои запросы${s.requests.length + s.invites.length ? ` (${s.requests.length + s.invites.length})` : ""}`], ...(["company", "store"].includes(role) ? [["supply", s.supplier ? "Я поставщик · заказы" : "Я поставщик"]] : [])];
  if (s.view) return renderSupplierPage(s, icon, config);
  const body = s.tab === "gaps" ? renderGaps(s, icon, role) : s.tab === "requests" ? renderRequests(s, icon) : s.tab === "supply" ? renderSupply(s, icon) : s.tab === "mine" ? renderMine(s, icon) : renderMarket(s, icon, role, config);
  return `<div class="stack care-section proc-section" data-testid="procurement-section">
    <section class="panel care-hero"><div><span class="care-badge care-badge--ink">${icon("package-search")} Закупки RemCard</span><h2>Всё для вашего бизнеса в одном кабинете</h2><p class="muted">Тот же каталог, что на сайте для клиентов, — только поставщики с B2B-условиями для партнёров RemCard.</p></div>
      <div class="stats care-stats"><div class="stat"><span class="small">Поставщиков</span><strong>${SUPPLIERS.length}</strong><small>Юг России · демо</small></div><div class="stat"><span class="small">Мои поставщики</span><strong>${s.partners.size}</strong><small>${s.requests.length ? `Запросов: ${s.requests.length}` : "Сотрудничаем"}</small></div><div class="stat"><span class="small">Свободных ниш</span><strong>${GAPS.filter((g) => g.players <= 2).length}</strong><small>${esc(s.city)} · мало игроков</small></div></div></section>
    <div class="tabs proc-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" class="${s.tab === id ? "selected" : ""}" data-proc-action="tab:${id}" data-testid="proc-tab-${id}" role="tab" aria-selected="${s.tab === id}">${label}</button>`).join("")}</div>
    ${body}
  </div>`;
}

function stageStrip(s, icon) {
  return `<div class="proc-stages" aria-label="Этапы ремонта"><button type="button" class="proc-stage ${!s.stage ? "is-on" : ""}" data-proc-action="stage:">Все этапы</button>${STAGES.map((st, i) => `<button type="button" class="proc-stage ${s.stage === st.id ? "is-on" : ""}" data-proc-action="stage:${st.id}"><i>${i + 1}</i>${st.title}</button>`).join("")}</div>`;
}

function profileTags(config) {
  const p = (config.profile && config.profile()) || {};
  const dict = p.dict || {};
  let ids = [...(p.products || []), ...(p.services || [])];
  let demo = false;
  if (!ids.length) { ids = DEMO_TAGS[config.role] || []; demo = true; }
  const label = (id) => (dict.products || []).concat(dict.services || []).find((x) => x.id === id)?.label || TAG_LABEL[id] || id;
  const out = [...new Set(ids)].map((id) => ({ id, label: label(id) }));
  out.demo = demo;
  return out;
}
const DEMO_TAGS = { store: ["tiles", "paint", "flooring", "doors"], specialist: ["tiles", "plumbing", "electrical", "painting"], company: ["construction", "engineering", "finishing", "design"], employee: ["construction", "tiles", "paint"], agent: [] };
const CATS = () => { const m = new Map(); SUPPLIERS.forEach((x) => (x.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1))); return m; };
const TAG_LABEL = { doors: "Двери", tiles: "Плитка", plumbing: "Сантехника", electrical: "Электрика", flooring: "Напольные покрытия", paint: "Краска", wallpaper: "Обои", lighting: "Освещение", furniture: "Мебель", kitchen: "Кухни", tools: "Инструменты", handles: "Фурнитура", windows: "Окна", construction: "Стройматериалы", heating: "Отопление", smart_home: "Умный дом", climate: "Климат", decor: "Декор", painting: "Покраска и штукатурка", demolition: "Демонтаж", design: "Дизайн", appraisal: "Приёмка и оценка", planning: "Планирование", rough: "Черновые работы", engineering: "Инженерия", finishing: "Чистовая отделка", renovation: "Ремонт под ключ" };

const STAGE_ICONS = { "L1-1": "pencil-ruler", "L1-4": "hammer", "L1-5": "brick-wall", "L1-7": "zap", "L1-8": "paint-roller", "L1-9": "paintbrush", "L1-10": "sofa", "L1-11": "badge-check" };
const TONE = { manufacturer: "company", importer: "store", distributor: "specialist", b2b: "company" };
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };

function renderMarket(s, icon, role, config) {
  const mine = profileTags(config);
  const mineIds = new Set(mine.map((m) => m.id));
  const q = s.q.trim().toLowerCase();
  const cityOk = (x) => s.city === "Краснодарский край" || x.region === s.city || x.region === "Краснодарский край" || s.city === "Все регионы";
  const fits = (x, o = {}) => { const st = o.stage ?? s.stage, cat = o.cat ?? s.cat, chan = o.chan ?? s.chan; return (!st || x.stages.includes(st)) && (!s.kind || x.kind === s.kind) && (!chan || chanOf(x) === chan) && (!cat || (x.tags || []).includes(cat)) && cityOk(x) && (!q || `${x.name} ${x.cats.join(" ")} ${x.about}`.toLowerCase().includes(q)); };
  const list = SUPPLIERS.filter((x) => fits(x));
  const forMe = list.filter((x) => (x.tags || []).some((t) => mineIds.has(t)));
  const others = list.filter((x) => !forMe.includes(x));
  const nStage = (id) => SUPPLIERS.filter((x) => fits(x, { stage: id, cat: "" })).length;
  const nCat = (id) => SUPPLIERS.filter((x) => fits(x, { cat: id })).length;
  const nChan = (id) => SUPPLIERS.filter((x) => fits(x, { chan: id, stage: "", cat: "" })).length;
  const baseCount = SUPPLIERS.filter((x) => fits(x, { stage: "", cat: "" })).length;
  const stageCount = SUPPLIERS.filter((x) => fits(x, { cat: "" })).length;

  // Путь ремонта, как в витрине партнёров
  const steps = STAGES.map((st, index) => ({ ...st, index, n: nStage(st.id) }));
  const sel = steps.find((st) => st.id === s.stage);
  const covered = steps.filter((st) => st.n).length;
  const progress = sel ? Math.round(((sel.index + 1) / steps.length) * 100) : Math.round((covered / steps.length) * 100);
  const questHead = `<div class="pr-quest-head"><span class="pr-quest-eyebrow">${icon("route")} Путь ремонта</span><strong>${sel ? `Этап ${sel.index + 1} из ${steps.length}` : `${steps.length} этапов пути`}</strong><div class="pr-quest-bar" role="img"><i style="width:${progress}%"></i></div><small>${sel ? `${esc(sel.title)} · ${sel.n} ${plural(sel.n, "поставщик", "поставщика", "поставщиков")}` : `Поставщики есть на ${covered} из ${steps.length} этапов`}</small></div>`;
  const step = (st) => { const on = s.stage === st.id; const passed = sel ? st.index < sel.index : false; const inner = `<span class="pr-step-node">${icon(STAGE_ICONS[st.id] || "milestone")}<i>${st.index + 1}</i></span><span class="pr-step-text"><b>${esc(st.title)}</b><em>${on ? "Вы здесь" : st.n ? `Уровень ${st.index + 1}` : "Пока без поставщиков"}</em></span>`; return st.n ? `<li class="pr-path-step ${on ? "is-current" : ""} ${passed ? "is-passed" : ""}"><button type="button" class="pr-nav-item pr-step" aria-pressed="${on}" data-proc-action="stage:${on ? "" : st.id}">${inner}<small>${st.n}</small></button></li>` : `<li class="pr-path-step is-empty"><span class="pr-nav-item pr-step" aria-disabled="true">${inner}<small>—</small></span></li>`; };
  const pathAll = `<li class="pr-path-step pr-path-all ${s.stage ? "" : "is-current"}"><button type="button" class="pr-nav-item pr-step" aria-pressed="${!s.stage}" data-proc-action="stage:"><span class="pr-step-node">${icon("map")}</span><span class="pr-step-text"><b>Весь путь</b><em>Все этапы ремонта</em></span><small>${baseCount}</small></button></li>`;
  const catCounts = CATS();
  const otherCats = [...catCounts.keys()].filter((t) => !mineIds.has(t) && TAG_LABEL[t]).map((t) => ({ id: t, label: TAG_LABEL[t], n: nCat(t) })).filter((c) => c.n).sort((a, b) => b.n - a.n);
  const chip = (id, label, n, star) => `<button type="button" class="pr-nav-item ${star ? "is-mine" : ""}" aria-pressed="${s.cat === id}" data-proc-action="cat:${s.cat === id ? "" : id}"><span>${star ? icon("star") : ""}${esc(label)}</span><small>${n}</small></button>`;
  const skills = `<div class="pr-nav-section pr-skills"><h3>${icon("sparkles")} Направление</h3><div class="pr-skill-grid">${chip("", "Все направления", stageCount, false)}${mine.map((m) => chip(m.id, m.label, nCat(m.id), true)).join("")}${otherCats.map((c) => chip(c.id, c.label, c.n, false)).join("")}</div>${mine.length ? `<small class="muted">${icon("star")} ${mine.demo ? "направления из профиля · демо" : "ваши направления из профиля"}</small>` : `<small class="muted"><button type="button" class="proc-link" data-action="nav:profile">Отметьте направления в профиле</button> — подходящих покажем первыми</small>`}</div>`;
  const nav = `<details class="pr-navigator" open><summary>Навигатор</summary><nav class="pr-nav-body pr-quest" aria-label="Навигатор поставщиков">${questHead}<ol class="pr-path">${pathAll}${steps.map(step).join("")}</ol>${skills}</nav></details>`;

  const chanTab = (id, label) => `<button type="button" class="${s.chan === id ? "selected" : ""}" data-proc-action="chan:${id}">${label} <small>${nChan(id)}</small></button>`;
  const active = [["chan", s.chan ? CHAN[s.chan][0] : ""], ["stage", s.stage ? `Этап: ${stageOf(s.stage).title}` : ""], ["cat", s.cat ? TAG_LABEL[s.cat] || s.cat : ""], ["kind", s.kind ? KINDS[s.kind][0] : ""], ["q", q ? `Поиск: ${s.q.trim()}` : ""]].filter(([, l]) => l);
  const activeRow = active.length ? `<div class="directory-active">${active.map(([k, l]) => `<button type="button" class="directory-filter-chip" data-proc-action="clear:${k}">${esc(l)}${icon("x")}</button>`).join("")}<button type="button" class="btn ghost small-btn" data-proc-action="reset">Сбросить всё</button></div>` : "";
  const group = (title, arr, star) => arr.length ? `<div class="proc-group"><h3>${star ? icon("star") : ""} ${title} <span class="muted">${arr.length}</span></h3><div class="proc-grid">${arr.map((x) => supplierCard(x, s, icon)).join("")}</div></div>` : "";

  return `<div class="pr proc-find" data-testid="proc-find">
    <div class="pr-head"><p class="muted pr-lead">Поставщики, которые продают партнёрам RemCard. У каждого виден канал: только B2B или B2B + B2C.</p><button type="button" class="btn primary pr-primary" data-proc-action="chooser">${icon("user-plus")} Найти поставщика</button></div>
    <div class="proc-find-top">
      <label class="field pr-search"><span class="pr-search-box">${icon("search")}<input type="search" data-proc-action="q" value="${esc(s.q)}" maxlength="120" placeholder="Название, товар, услуга или этап"></span></label>
      <div class="tabs proc-tabs proc-chan-tabs" aria-label="Канал продаж">${chanTab("", "Все")}${chanTab("b2b", "Только B2B")}${chanTab("both", "B2B + B2C")}</div>
      <details class="optional pr-refine" ${s.kind || s.city !== "Краснодар" ? "open" : ""}><summary>Регион и тип поставщика${s.kind || s.city !== "Краснодар" ? " · выбраны" : ""}</summary><div class="directory-filters"><label class="field">Регион<select data-proc-action="city">${[...CITIES, "Все регионы"].map((c) => `<option ${s.city === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><label class="field">Тип поставщика<select data-proc-action="kind"><option value="">Все</option>${Object.entries(KINDS).map(([id, [label]]) => `<option value="${id}" ${s.kind === id ? "selected" : ""}>${label}</option>`).join("")}</select></label></div></details>
    </div>
    <div class="proc-find-body">
      <div class="proc-find-results">${activeRow}${group("Под ваш профиль", forMe, true)}${group(forMe.length ? "Остальные поставщики" : "Поставщики", others, false)}${!list.length ? `<div class="notice">Поставщиков с такими условиями пока нет. Это свободная ниша — или пригласите своего поставщика.</div>` : ""}
        <div class="invite-inline pr-invite-inline"><div><strong>Вашего поставщика ещё нет в RemCard?</strong><small>Отправьте ссылку: он зарегистрируется, заполнит каталог и включит B2B.</small></div><button type="button" class="btn" data-proc-action="invite">${icon("link")} Пригласить по ссылке</button></div>
        <small class="muted">Макет общего поиска на примерах. Живая база платформы здесь не подключена.</small></div>
      <aside class="proc-find-nav">${nav}</aside>
    </div></div>`;
}

function supplierCard(x, s, icon) {
  const [kindLabel, kindIcon] = KINDS[x.kind];
  const asked = s.requests.some((r) => r.supplier === x.id);
  const partner = s.partners.has(x.id);
  const status = partner ? `<span class="pill good">${icon("handshake")} Сотрудничаем</span>` : asked ? `<button type="button" class="btn ghost small-btn" data-proc-action="accept:${x.id}" title="Демо: КП получено">Ждём КП · получено</button>` : `<button type="button" class="btn primary" data-proc-action="ask:${x.id}" data-testid="proc-ask-${x.id}">Запросить цену</button>`;
  return `<article class="pr-card proc-card ${partner ? "is-partner" : ""}" data-testid="supplier-${x.id}">
    <div class="pr-card-cover pr-cover-${TONE[x.kind]}"><span>${kindLabel}</span><span class="pr-open ${x.retail ? "" : "is-b2b"}" title="${CHAN[chanOf(x)][1]}">${CHAN[chanOf(x)][0]}</span></div>
    <div class="pr-card-top"><span class="care-ico">${icon(kindIcon)}</span><div class="pr-card-title"><h3><button type="button" class="proc-title" data-proc-action="open:${x.id}">${esc(x.name)}</button></h3><p class="small">${esc(x.region)} · ${icon("star")} ${x.rating} · ${x.deals} ${plural(x.deals, "сделка", "сделки", "сделок")}${x.dealer ? " · ищет дилеров" : ""}</p></div></div>
    <p class="pr-card-description">${x.cats.map(esc).join(" · ")}</p>
    <p class="small pr-stages">${x.stages.map((id) => stageOf(id)?.title).filter(Boolean).join(" · ")}</p>
    <div class="pr-terms"><div class="pr-terms-heading"><span class="pr-terms-title">Условия для партнёров</span><strong class="proc-bonus">${esc(x.bonus.replace(" для партнёров RemCard", ""))}</strong></div><ul><li><span>Мин. заказ</span><b>${esc(x.minOrder)}</b></li><li><span>Оплата</span><b>${esc(x.delay)}</b></li><li><span>Заказы</span><b>${x.api ? "По API" : "В кабинете"}</b></li></ul></div>
    <div class="pr-card-foot"><button type="button" class="btn ghost" data-proc-action="open:${x.id}" data-testid="proc-open-${x.id}">Подробнее</button>${status}</div>
  </article>`;
}

function chooserDialog(s, icon, config) {
  config.openDialog("Найти поставщика", `<p class="muted">Два пути: поставщик уже в RemCard или его ещё нужно пригласить.</p><div class="pr-scenarios">
    <button type="button" class="pr-scenario" data-proc-action="find"><span class="pr-scenario-icon">${icon("search")}</span><span class="eyebrow">Уже в RemCard</span><strong>Найти в RemCard</strong><p class="small">Витрина по этапам и направлениям. Сразу видно, кто продаёт только B2B, а кто и B2B, и B2C.</p><span class="pr-scenario-link">Открыть витрину ${icon("arrow-right")}</span></button>
    <button type="button" class="pr-scenario" data-proc-action="invite"><span class="pr-scenario-icon">${icon("link")}</span><span class="eyebrow">Ещё не в RemCard</span><strong>Пригласить по ссылке</strong><p class="small">Ваш поставщик зарегистрируется по ссылке, заполнит каталог, включит B2B и вернётся к вашему запросу.</p><span class="pr-scenario-link">Создать приглашение ${icon("arrow-right")}</span></button>
  </div>`);
}
function inviteDialog(s, icon, config) {
  const code = `sup-${Math.random().toString(36).slice(2, 6)}`;
  config.openDialog("Пригласить поставщика по ссылке", `<div class="stack proc-ask-form" data-proc-invite="${code}">
    <p class="small muted">Для поставщика, которого ещё нет на платформе. По ссылке он зарегистрируется как партнёр, заполнит профиль и каталог, включит «Я поставщик».</p>
    <label class="proc-field"><span>Компания</span><input name="name" maxlength="120" placeholder="Например, Завод сухих смесей «Юг»"></label>
    <label class="proc-field"><span>Что хотите закупать</span><textarea name="text" rows="2" placeholder="Штукатурка, шпаклёвка, объёмы от 5 тонн в месяц"></textarea></label>
    <label class="proc-field"><span>Канал продаж поставщика</span><select name="chan"><option value="b2b">Только B2B · работает с партнёрами</option><option value="both">B2B + B2C · и с клиентами на сайте</option></select></label>
    <div class="proc-key"><span class="small">Ссылка · демо</span><code>remcard.ru/i/${code}</code><button type="button" class="btn ghost small-btn" data-proc-action="copy">Скопировать</button></div>
    <div class="row" style="gap:8px"><button type="button" class="btn primary" data-proc-action="invite-send">Создать приглашение</button><button type="button" class="btn ghost" data-action="close-dialog">Отмена</button></div>
  </div>`);
}

function renderMine(s, icon) {
  const list = SUPPLIERS.filter((x) => s.partners.has(x.id));
  if (!list.length) return `<section class="panel empty">${icon("handshake")}<h2>Пока нет поставщиков</h2><p class="muted">Запросите цену на витрине. После первого КП поставщик появится здесь со своим рабочим пространством.</p><button type="button" class="btn primary" data-proc-action="chooser">${icon("user-plus")} Найти поставщика</button></section>`;
  return `<p class="muted proc-lead">Поставщики, с которыми вы работаете. Внутри — заказы, КП, документы и условия.</p>
    <div class="proc-grid">${list.map((x) => { const my = ORDERS.filter((o) => o.supplier === x.id); return `<article class="proc-card is-partner"><div class="care-card-top"><span class="care-ico">${icon(KINDS[x.kind][1])}</span><div><h3>${esc(x.name)}</h3><small class="muted">${x.cats.join(", ")}</small></div>${x.api ? `<span class="pill good">${icon("plug-zap")} API</span>` : `<span class="pill">Кабинет</span>`}</div>
      <div class="stats proc-ministats"><div><strong>${my.length}</strong><small>заказов</small></div><div><strong>${my.filter((o) => o.status === "Новый" || o.status === "Подтверждён").length}</strong><small>в работе</small></div><div><strong class="sm">${esc(x.bonus.replace(" для партнёров RemCard", ""))}</strong><small>ваши условия</small></div></div>
      <div class="care-card-actions"><button type="button" class="btn primary" data-proc-action="open:${x.id}">Открыть</button><button type="button" class="btn ghost" data-proc-action="ask:${x.id}">Новый запрос</button></div></article>`; }).join("")}</div>`;
}

function renderSupplierPage(s, icon, config) {
  const x = SUPPLIERS.find((y) => y.id === s.view);
  if (!x) { s.view = ""; return renderProcurementSection(config); }
  const partner = s.partners.has(x.id);
  const asked = s.requests.some((r) => r.supplier === x.id);
  const my = ORDERS.filter((o) => o.supplier === x.id);
  const tabs = [["about", "О поставщике"], ["prices", "Цены"], ...(partner ? [["orders", `Заказы${my.length ? ` (${my.length})` : ""}`], ["docs", "КП и документы"], ["terms", "Условия"], ["chat", "Связь"]] : [])];
  if (!tabs.some(([id]) => id === s.pview)) s.pview = partner ? "orders" : "about";
  const body = s.pview === "about" ? `<section class="panel stack"><p>${esc(x.about)}</p><dl class="proc-terms proc-terms--big"><div><dt>Тип</dt><dd>${KINDS[x.kind][0]}</dd></div><div><dt>Регион</dt><dd>${esc(x.region)}</dd></div><div><dt>Рейтинг</dt><dd>${icon("star")} ${x.rating} · ${x.deals} сделок</dd></div><div><dt>Канал продаж</dt><dd>${chanPill(x)}<small class="muted" style="display:block;margin-top:4px">${CHAN[chanOf(x)][1]}</small></dd></div><div><dt>Партнёрам</dt><dd>${esc(x.bonus)}</dd></div><div><dt>Дилерская сеть</dt><dd>${x.dealer ? "Ищет дилеров в регионах" : "Поставки без дилерства"}</dd></div></dl></section>`
    : s.pview === "prices" ? `<section class="panel stack">${priceTable(x, partner, icon)}</section>`
    : s.pview === "docs" ? `<div class="care-requests">${DOCS.map(([t, m]) => `<div class="care-request"><span class="care-ico">${icon("file-text")}</span><div><strong>${t}</strong><small class="muted">${m}</small></div><button type="button" class="btn ghost small-btn" data-proc-action="noop">Открыть</button></div>`).join("")}</div>`
    : s.pview === "terms" ? `<dl class="proc-terms proc-terms--big"><div><dt>Цена для вас</dt><dd><strong>${esc(x.bonus)}</strong></dd></div><div><dt>Минимальный заказ</dt><dd>${esc(x.minOrder)}</dd></div><div><dt>Оплата</dt><dd>${esc(x.delay)}</dd></div><div><dt>Регион отгрузки</dt><dd>${esc(x.region)}</dd></div><div><dt>Канал заказов</dt><dd>${x.api ? "API: заказы уходят в систему поставщика" : "Кабинет RemCard: поставщик отвечает здесь"}</dd></div><div><dt>Рейтинг</dt><dd>${icon("star")} ${x.rating} · ${x.deals} сделок</dd></div></dl>`
    : s.pview === "chat" ? `<div class="proc-chat"><div class="proc-msg them"><b>${esc(x.name)}</b>КП отправили, резерв на складе до пятницы.</div><div class="proc-msg me"><b>Вы</b>Спасибо, берём. Отгрузка на объект в среду.</div><label class="proc-field"><textarea rows="2" placeholder="Сообщение менеджеру…"></textarea></label><button type="button" class="btn primary" data-proc-action="noop">Отправить</button></div>`
    : `<div class="care-requests">${my.length ? my.map((o) => `<div class="care-request"><span class="care-ico">${icon("shopping-cart")}</span><div><strong>${esc(o.what)}</strong><small class="muted">${o.sum} · ${o.date}</small></div><div class="care-request-status"><span class="pill ${o.status === "Отгружен" ? "good" : o.status === "Новый" ? "accent" : ""}">${o.status}</span><button type="button" class="btn ghost small-btn" data-proc-action="repeat:${x.id}">Повторить</button></div></div>`).join("") : `<div class="notice">Заказов пока нет. Начните с запроса цены.</div>`}</div>`;
  const action = partner ? `<button type="button" class="btn primary" data-proc-action="ask:${x.id}">Новый запрос</button>` : asked ? `<button type="button" class="btn primary" data-proc-action="accept:${x.id}" title="Демо: КП получено">КП получено · начать</button>` : `<button type="button" class="btn primary" data-proc-action="ask:${x.id}">Запросить цену</button>`;
  return `<div class="stack care-section proc-section" data-testid="supplier-page">
    <button type="button" class="proc-back" data-proc-action="back">${icon("arrow-left")} К поставщикам</button>
    <section class="panel proc-sup-head"><span class="care-ico care-ico--lg">${icon(KINDS[x.kind][1])}</span><div><h2>${esc(x.name)}</h2><p class="muted">${KINDS[x.kind][0]} · ${esc(x.region)} · ${x.cats.join(", ")}</p></div><div class="row" style="gap:8px">${action}${partner ? `<span class="pill good">${icon("handshake")} Сотрудничаем</span>` : ""}${x.api ? `<span class="pill ${partner ? "good" : ""}">${icon("plug-zap")} API</span>` : ""}</div></section>
    <div class="tabs proc-tabs">${tabs.map(([id, label]) => `<button type="button" class="${s.pview === id ? "selected" : ""}" data-proc-action="pview:${id}">${label}</button>`).join("")}</div>
    ${body}
    <p class="small muted">${partner ? (x.api ? "У поставщика свой кабинет: заказы и статусы идут по API. Интеграция — следующий этап." : "Поставщик работает в кабинете RemCard. Если появится свой B2B-кабинет, подключим его по API.") : "Профиль поставщик заполняет сам, как любой партнёр RemCard."} Данные демонстрационные.</p>
  </div>`;
}

function renderGaps(s, icon, role) {
  const rows = GAPS.filter((g) => !s.stage || g.stage === s.stage);
  return `<p class="muted proc-lead">Где мало игроков, а спрос растёт. Займите нишу первыми и будьте в приоритете показа.</p>
    <div class="proc-filters"><label>Город<select data-proc-action="city">${CITIES.map((c) => `<option ${s.city === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><span class="small muted">Спрос за 30 дней · демо</span></div>
    ${stageStrip(s, icon)}
    <div class="proc-gaps">${rows.map((g, i) => {
      const key = `${g.stage}:${g.cat}`; const taken = s.taken.has(key); const hot = g.players <= 2;
      return `<div class="proc-gap ${hot ? "is-hot" : ""} ${taken ? "is-taken" : ""}" data-testid="gap-${i}"><div class="proc-gap-stage"><span class="pill accent">${esc(stageOf(g.stage).title)}</span></div><div><strong>${esc(g.cat)}</strong><small class="muted">${esc(s.city)} · ${g.players} ${g.players === 1 ? "игрок" : g.players < 5 ? "игрока" : "игроков"} в RemCard · спрос ${g.demand} запросов, ${g.trend} за месяц</small></div><div class="proc-gap-meter" aria-hidden="true"><i style="width:${Math.min(100, g.players * 14)}%"></i><b style="width:${Math.min(100, g.demand / 2.2)}%"></b></div><div class="care-request-status">${taken ? `<span class="pill good">${icon("check")} Вы в приоритете</span><span class="small muted">до 31 декабря · демо</span>` : `<span class="pill ${hot ? "good" : ""}">${hot ? "Мало игроков" : "Умеренная конкуренция"}</span><button type="button" class="btn ${hot ? "primary" : "ghost"} small-btn" data-proc-action="take:${esc(key)}">Занять нишу</button>`}</div></div>`;
    }).join("")}</div>
    <p class="small muted">Приоритет показа действует, пока игроков в городе меньше трёх. Направление подтверждает модерация. Цифры демонстрационные.</p>`;
}

function renderRequests(s, icon) {
  const inv = s.invites.length ? `<div class="care-requests" data-testid="proc-invites">${s.invites.map((v) => `<div class="care-request"><span class="care-ico">${icon("link")}</span><div><strong>${esc(v.name)}</strong><small>${esc(v.text || "Без описания")}</small><small class="muted">Приглашение по ссылке · ${CHAN[v.chan][0]} · ${v.when}</small></div><div class="care-request-status"><span class="pill">Ждём регистрации</span><button type="button" class="btn ghost small-btn" data-proc-action="cancel-inv:${v.id}">Отозвать</button></div></div>`).join("")}</div>` : "";
  if (!s.requests.length && inv) return inv + `<p class="small muted">Когда поставщик зарегистрируется и включит B2B, он появится на витрине, а вы получите уведомление.</p>`;
  return s.requests.length
    ? `<div class="care-requests" data-testid="proc-requests">${s.requests.map((r) => { const x = SUPPLIERS.find((y) => y.id === r.supplier); return `<div class="care-request"><span class="care-ico">${icon(KINDS[x.kind][1])}</span><div><strong>${esc(x.name)}</strong><small>${esc(r.text)}</small><small class="muted">Отправлен ${r.when} · ${x.api ? "поставщик получит запрос в свою систему по API" : "поставщик ответит в кабинете"}</small></div><div class="care-request-status"><span class="pill accent">Ждём КП</span><div class="row" style="gap:6px"><button type="button" class="btn ghost small-btn" data-proc-action="accept:${x.id}">КП получено · начать</button><button type="button" class="btn ghost small-btn" data-proc-action="cancel:${r.id}">Отозвать</button></div></div></div>`; }).join("")}<p class="small muted">Коммерческое предложение придёт сюда и в уведомления. Оплата поставщику идёт напрямую, платформа фиксирует сделку для бонусов и рейтинга.</p></div>${inv}`
    : `<section class="panel empty">${icon("file-search")}<h2>Запросов пока нет</h2><p class="muted">Выберите поставщика на витрине и нажмите «Запросить цену».</p><button type="button" class="btn primary" data-proc-action="tab:market">К витрине</button></section>`;
}

function renderSupply(s, icon) {
  const me = { bonus: "−8 %", items: [["Ваша позиция 1", 1200], ["Ваша позиция 2", 3400], ["Ваша услуга", 5000]] };
  return `<section class="panel stack" data-testid="proc-supply"><div class="row between"><div><h2>Продавайте партнёрам RemCard</h2><p class="muted">Профиль и каталог — те же, что у любого партнёра. Включите B2B: появятся цены для партнёров, публикация и API.</p></div><label class="care-switch"><input type="checkbox" data-proc-action="supplier" ${s.supplier ? "checked" : ""}><span>${s.supplier ? "Принимаем заказы" : "Выключено"}</span></label></div>
    ${s.supplier ? `<div class="proc-api">
      <div class="proc-api-card"><h3>${icon("store")} Кому показывать каталог</h3>
        <div class="tabs proc-tabs proc-tabs--full">${[["b2b", "Только B2B"], ["both", "B2B + B2C"], ["b2c", "Только B2C"]].map(([id, label]) => `<button type="button" class="${s.pub === id ? "selected" : ""}" data-proc-action="pub:${id}">${label}</button>`).join("")}</div>
        <p class="small">${s.pub === "b2b" ? "Каталог виден только партнёрам в «Закупках». Вы строите сеть дилеров и представителей, с розницей не работаете." : s.pub === "both" ? "Каталог виден партнёрам в «Закупках» по B2B-прайсу и клиентам на сайте по РРЦ." : "Каталог виден только клиентам на сайте по РРЦ. В «Закупках» вас не будет."}</p>
        <label class="proc-check"><input type="checkbox" data-proc-action="dealer" ${s.dealer ? "checked" : ""}><span>Развиваю дилерскую или дистрибьюторскую сеть <small class="muted">приоритет показа магазинам и компаниям</small></span></label>
        <p class="small muted">Товары и услуги берутся из <button type="button" class="proc-link" data-action="nav:profile">Профиль → Каталог</button>. Позиций в каталоге: ${me.items.length} · демо.</p></div>
      <div class="proc-api-card"><h3>${icon("calculator")} Цены</h3>
        <table class="proc-price"><thead><tr><th>Позиция</th><th>РРЦ <small>сайт</small></th><th>B2B-прайс <small>все партнёры</small></th><th>Индивидуальная</th></tr></thead><tbody>${me.items.map(([t, rrc]) => `<tr><td>${esc(t)}</td><td>${fmt(rrc)}</td><td>${fmt(rrc * 0.92)}</td><td><button type="button" class="proc-link" data-proc-action="indprice">назначить партнёру</button></td></tr>`).join("")}</tbody></table>
        <p class="small muted">РРЦ видят клиенты на сайте, B2B-прайс — все партнёры (${me.bonus} от РРЦ, демо). Индивидуальная цена — для конкретного партнёра.</p></div>
      <div class="proc-api-card"><h3>${icon("plug-zap")} Подключение по API</h3><ol class="proc-steps"><li>Выпустите ключ и передайте прайс, остатки и условия.</li><li>Укажите адрес вашей системы: заказы и запросы придут туда автоматически.</li><li>Возвращайте статусы заказов, бонусы начислятся сами.</li></ol>
      <div class="proc-key"><span class="small">Ключ API · демо</span><code>${s.apiKey || "••••-••••-••••-••••"}</code><button type="button" class="btn ghost small-btn" data-proc-action="key">${s.apiKey ? "Перевыпустить" : "Выпустить ключ"}</button></div>
      <p class="small muted">Коннекторы: 1С, МойСклад, Bitrix24, свой B2B-портал. Или ведите заказы вручную здесь.</p></div>
      <div class="proc-api-card"><h3>${icon("inbox")} Заказы и запросы от партнёров</h3><div class="care-requests">${ORDERS.filter((o) => o.from !== "Вы").map((o) => `<div class="care-request"><span class="care-ico">${icon("shopping-cart")}</span><div><strong>${esc(o.from)}</strong><small>${esc(o.what)}</small><small class="muted">${o.sum} · поступил через ${o.via}</small></div><span class="pill ${o.status === "Отгружен" ? "good" : o.status === "Новый" ? "accent" : ""}">${o.status}</span></div>`).join("")}</div><p class="small muted">Демонстрационные заказы. Бонус платформы с подтверждённых сделок.</p></div></div>` : `<div class="notice">Включите, если поставляете товары или услуги другим партнёрам. Появятся публикация в каталоге, B2B-цены, API и заказы.</div>`}
  </section>`;
}

let bound = false;
export function hydrateProcurement(config) {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-proc-action]");
    if (!el || el.matches("select, input")) return;
    const [kind, ...rest] = el.dataset.procAction.split(":");
    const id = rest.join(":");
    const s = ws(config.key());
    if (kind === "tab") { s.tab = id; s.view = ""; }
    if (kind === "cat") s.cat = id;
    if (kind === "pub") s.pub = id;
    if (kind === "open") { s.view = id; s.pview = s.partners.has(id) ? "orders" : "about"; }
    if (kind === "back") s.view = "";
    if (kind === "pview") s.pview = id;
    if (kind === "accept") { s.partners.add(id); s.requests = s.requests.filter((r) => r.supplier !== id); config.notify("КП принято. Поставщик добавлен в «Мои поставщики», открыто рабочее пространство."); s.view = id; s.pview = "orders"; }
    if (kind === "repeat") config.notify("Повторный заказ отправлен поставщику (демо).");
    if (kind === "noop") config.notify("В макете это действие не ведёт дальше.");
    if (kind === "stage") s.stage = id;
    if (kind === "ask") {
      const x = SUPPLIERS.find((y) => y.id === id);
      config.openDialog(`Запрос цены · ${x.name}`, `<div class="stack proc-ask-form" data-proc-form="${id}"><p class="small muted">Опишите объём и сроки. Поставщик ответит коммерческим предложением с условиями для партнёров RemCard.</p><label class="proc-field"><span>Что нужно</span><textarea name="text" rows="3" placeholder="${esc(x.cats[0])}: объём, сроки, адрес отгрузки"></textarea></label><label class="proc-field"><span>Когда нужно</span><select name="when"><option>В течение недели</option><option>В течение месяца</option><option>Под объект, дата обсуждается</option></select></label><div class="row" style="gap:8px"><button type="button" class="btn primary" data-proc-action="send:${id}">Отправить запрос</button><button type="button" class="btn ghost" data-action="close-dialog">Отмена</button></div></div>`);
      return;
    }
    if (kind === "send") {
      const form = document.querySelector(`[data-proc-form="${id}"]`);
      const textValue = form?.querySelector('[name="text"]').value.trim();
      if (!textValue) { config.notify("Опишите, что нужно, в пару слов.", "error"); return; }
      s.requests.unshift({ id: `rq-${Date.now()}`, supplier: id, text: textValue, when: "сегодня" });
      config.closeDialog();
      config.notify("Запрос отправлен. КП появится во вкладке «Мои запросы».");
      s.tab = "requests";
    }
    if (kind === "cancel") s.requests = s.requests.filter((r) => r.id !== id);
    if (kind === "catalog") config.notify("Позиции поставщика добавлены в черновик вашего каталога. Опубликуйте их в разделе «Профиль → Каталог».");
    if (kind === "take") { s.taken.add(id); config.notify("Направление добавлено в профиль. Вы в приоритете показа на этом этапе, пока игроков меньше трёх."); }
    if (kind === "chooser") { chooserDialog(s, lastIcon, config); return; }
    if (kind === "find") { config.closeDialog(); s.tab = "market"; s.view = ""; config.refresh(); const f = document.querySelector('[data-proc-action="q"]'); if (f) { f.scrollIntoView({ block: "center" }); f.focus(); } return; }
    if (kind === "invite") { inviteDialog(s, lastIcon, config); return; }
    if (kind === "copy") { config.notify("Ссылка скопирована (демо)."); return; }
    if (kind === "invite-send") {
      const form = document.querySelector("[data-proc-invite]");
      const name = form?.querySelector('[name="name"]').value.trim();
      if (!name) { config.notify("Укажите название компании поставщика.", "error"); return; }
      s.invites.unshift({ id: `inv-${Date.now()}`, name, text: form.querySelector('[name="text"]').value.trim(), chan: form.querySelector('[name="chan"]').value, when: "сегодня" });
      config.closeDialog(); config.notify("Приглашение создано. Статус — во вкладке «Мои запросы»."); s.tab = "requests"; s.view = "";
    }
    if (kind === "cancel-inv") s.invites = s.invites.filter((v) => v.id !== id);
    if (kind === "chan") s.chan = id;
    if (kind === "clear") { if (id === "q") s.q = ""; else s[id] = ""; }
    if (kind === "reset") { s.q = ""; s.stage = ""; s.cat = ""; s.chan = ""; s.kind = ""; s.city = "Краснодар"; }
    if (kind === "indprice") config.notify("Индивидуальная цена назначается конкретному партнёру и видна только ему (демо).");
    if (kind === "key") s.apiKey = `rc_live_${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
    config.refresh();
  });
  const onChange = (e) => {
    const el = e.target.closest("[data-proc-action]");
    if (!el || !el.matches("select, input")) return;
    const s = ws(config.key());
    const kind = el.dataset.procAction;
    if (kind === "q" && e.type === "input") { s.q = el.value; config.refresh(); const f = document.querySelector('[data-proc-action="q"]'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } return; }
    if (kind === "kind") s.kind = el.value;
    if (kind === "city") s.city = el.value;
    if (kind === "supplier") s.supplier = el.checked;
        if (kind === "dealer") s.dealer = el.checked;
    if (kind === "q") s.q = el.value;
    config.refresh();
  };
  document.addEventListener("change", onChange);
  document.addEventListener("input", (e) => { if (e.target.matches('input[data-proc-action="q"]')) onChange(e); });
}
