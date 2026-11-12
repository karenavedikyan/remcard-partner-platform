/* Забота RemCard в кабинете партнёра.
   Один раздел для всех типов кабинета: агент, специалист, магазин, компания, сотрудник (по правам).
   Партнёр подключает сервисы для своих клиентов; поставщик сервисов (компания) ведёт заявки.
   Все данные демонстрационные, без вознаграждений и реальных условий. */

const SERVICES = [
  {
    id: "delivery",
    title: "Доставка",
    icon: "truck",
    client: "Перевезём покупку, мебель, оборудование или товар со склада — туда, куда нужно клиенту.",
    benefit: {
      agent: "Клиент покупает у партнёра и сразу решает, как забрать. Меньше отказов после сертификата.",
      specialist: "Материалы приезжают на объект к нужному дню. Вы не теряете время на логистику.",
      store: "Покупатель берёт крупные позиции, не думая о транспорте. Средний чек растёт.",
      company: "Единые условия доставки для всех филиалов и направлений без собственного автопарка.",
      employee: "Клиент получает доставку в момент продажи. Оформляет перевозчик, не вы.",
    },
  },
  {
    id: "storage",
    title: "Хранение",
    icon: "warehouse",
    client: "Сохраним товар, вещи или оборудование до нужного момента: переезд, этап работ, сезон.",
    benefit: {
      agent: "Клиент может купить выгодно сейчас и забрать позже. Сертификат не пропадает.",
      specialist: "Материалы ждут на складе, а не мешают на объекте. Этап начинается без простоя.",
      store: "Продавайте заранее со скидкой: товар уходит со склада магазина в хранение партнёра.",
      company: "Освобождает площади филиалов. Клиент видит одно место хранения у всех направлений.",
      employee: "Если покупателю негде держать товар, предложите хранение прямо при продаже.",
    },
  },
  {
    id: "insurance",
    title: "Страхование",
    icon: "umbrella",
    client: "Груз в пути, имущество, товары, работы и ответственность перед соседями.",
    benefit: {
      agent: "Спокойная сделка: клиент защищён, вы рекомендуете уверенно.",
      specialist: "Полис на работы и материалы снимает споры о риске. Заказчик соглашается быстрее.",
      store: "Дорогой товар покупают легче, если он застрахован в пути и на объекте.",
      company: "Страхование для клиентов всех филиалов по одним правилам, без своих договоров со страховыми.",
      employee: "Предложите полис на груз или материалы при продаже. Оформляет страховая компания.",
    },
  },
  {
    id: "finance",
    title: "Рассрочка и кредит",
    icon: "landmark",
    client: "Оплата частями без переплаты до 12 месяцев или кредит до 60 месяцев на покупку и услуги.",
    benefit: {
      agent: "Клиент не откладывает покупку из-за бюджета. Сертификат срабатывает чаще.",
      specialist: "Заказчик оплачивает работы частями, а вы получаете деньги сразу от банка.",
      store: "Больше покупок на крупные суммы. Деньги приходят сразу, риск несёт банк.",
      company: "Рассрочка во всех точках продаж без отдельного договора с каждым банком.",
      employee: "Покажите покупателю платёж в месяц. Решение банк принимает онлайн за минуты.",
    },
  },
];

const PLACES = [
  "Карточка партнёра на сайте remcard.ru",
  "Сертификат, который получает клиент",
  "Список покупок клиента на шаге оформления",
  "Раздел «Забота RemCard» для клиентов, которые ищут сервис отдельно",
];

const DEMO_REQUESTS = [
  { id: "cr-1", from: "client", who: "Ольга К.", via: "Сертификат от «Оптовик»", service: "delivery", task: "Перевезти 42 упаковки ламината и плинтус из магазина на объект, подъём на 4 этаж без лифта", when: "Завтра после 14:00", status: "new" },
  { id: "cr-2", from: "partner", who: "Специалист Алексей", via: "Кабинет партнёра", service: "insurance", task: "Застраховать работы и материалы на объекте заказчика на 3 месяца, смета 480 000 ₽", when: "На этой неделе", status: "inwork" },
  { id: "cr-3", from: "client", who: "Марат Д.", via: "Раздел «Забота RemCard»", service: "storage", task: "Хранение мебели и техники 6 м³ на время переезда, срок 5 недель", when: "С 12 ноября", status: "done" },
];

const STATUS = { new: "Новая", inwork: "В работе", done: "Выполнена" };

const workspaces = new Map();
function ws(key) {
  if (!workspaces.has(key)) workspaces.set(key, { on: new Set(), provider: false, providerKinds: new Set(), requests: DEMO_REQUESTS.map((x) => ({ ...x })), tab: "clients", booked: new Set() });
  return workspaces.get(key);
}

const CONSULT = [
  { id: "law", icon: "scale", title: "Юрист", lead: "Договоры с клиентами, претензии, споры.", price: "Первая консультация бесплатно" },
  { id: "tax", icon: "calculator", title: "Бухгалтерия и налоги", lead: "Режим налогообложения, отчётность, самозанятость.", price: "от 3 000 ₽ / мес" },
  { id: "marketing", icon: "megaphone", title: "Маркетинг в RemCard", lead: "Как попасть выше в витрине и получать больше сертификатов.", price: "Бесплатно для партнёров" },
  { id: "sales", icon: "graduation-cap", title: "Продажи по сертификатам", lead: "Обучение команды: как принимать клиента RemCard.", price: "Вебинар раз в неделю" },
  { id: "setup", icon: "settings-2", title: "Настройка кабинета", lead: "Каталог, профиль, команда и права — вместе с менеджером.", price: "Бесплатно" },
  { id: "finance", icon: "piggy-bank", title: "Финансы", lead: "Планирование, кредит для бизнеса, лизинг техники.", price: "По запросу" },
];

function renderConsult(s, icon, role) {
  const who = role === "specialist" ? "мастеру и бригаде" : role === "store" ? "магазину" : role === "agent" ? "агенту" : "компании";
  return `<p class="muted care-hint-text">Поддержка ${who}: специалисты RemCard и партнёры платформы. Короткая запись, ответ в рабочее время.</p>
    <div class="care-grid care-grid--3">${CONSULT.map((c) => { const on = s.booked.has(c.id); return `<article class="care-card ${on ? "is-on" : ""}" data-testid="consult-${c.id}"><div class="care-card-top"><span class="care-ico">${icon(c.icon)}</span><div><h3>${c.title}</h3><small class="muted">${esc(c.lead)}</small></div></div><div class="care-card-actions"><span class="small muted">${esc(c.price)}</span>${on ? `<span class="small">${icon("calendar-check")} Записаны, свяжемся</span>` : `<button type="button" class="btn ghost" data-care-action="book:${c.id}">Записаться</button>`}</div></article>`; }).join("")}</div>`;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}

export function careNavLabel() {
  return "Забота";
}

export function careHomeTeaser(config) {
  const s = ws(config.key);
  const n = s.on.size;
  return `<section class="panel care-teaser" data-testid="care-home-teaser"><div class="care-teaser-head"><span class="care-badge">${config.icon("heart-handshake")} Забота RemCard</span><strong>${n ? `Подключено сервисов: ${n} из ${SERVICES.length}` : "Доставка, хранение, страхование и рассрочка для ваших клиентов"}</strong><p class="muted">${n ? "Клиенты видят их в вашей карточке, сертификате и списке покупок." : "Подключается одним переключателем. Заявки обрабатывают сервисные компании, вы ничего не оформляете сами."}</p></div><button type="button" class="btn ${n ? "ghost" : "primary"}" data-action="nav:care">${n ? "Открыть раздел" : "Посмотреть сервисы"}</button></section>`;
}

export function renderCareSection(config) {
  const s = ws(config.key);
  const role = config.role;
  const icon = config.icon;
  const readOnly = !!config.readOnly;
  const who = role === "agent" ? "клиентов, которым вы рекомендуете партнёров" : role === "specialist" ? "ваших заказчиков" : role === "employee" ? "покупателей вашей организации" : "ваших клиентов";
  const cards = SERVICES.map((svc) => {
    const on = s.on.has(svc.id);
    return `<article class="care-card ${on ? "is-on" : ""}" data-testid="care-card-${svc.id}">
      <div class="care-card-top"><span class="care-ico">${icon(svc.icon)}</span><div><h3>${svc.title}</h3><small class="muted">${esc(svc.client)}</small></div><span class="pill ${on ? "good" : ""}">${on ? "Подключено" : "Не подключено"}</span></div>
      <p class="care-benefit">${icon("trending-up")} ${esc(svc.benefit[role] || svc.benefit.company)}</p>
      <div class="care-card-actions">${readOnly ? `<span class="small muted">Подключение меняет владелец или сотрудник с правом «Условия партнёрств».</span>` : `<button type="button" class="btn ${on ? "ghost" : "primary"}" data-care-action="toggle:${svc.id}" data-testid="care-toggle-${svc.id}">${on ? "Отключить" : "Подключить"}</button>`}${on ? `<span class="small">${icon("eye")} Виден клиентам в карточке, сертификате и списке покупок</span>` : ""}</div>
    </article>`;
  }).join("");

  const hints = {
    agent: "Агенту выгоднее всего рассрочка и доставка: клиент покупает по сертификату без лишних причин отложить.",
    specialist: "Специалисту чаще всего нужны страхование работ и материалов и хранение до этапа.",
    store: "Магазину в первую очередь: рассрочка и доставка. Хранение помогает продавать заранее.",
    company: "Компания подключает сервисы сразу для всех филиалов. Отдельные филиалы можно исключить позже.",
    employee: "Подключённые сервисы предлагайте клиенту при продаже. Оформление делает сервисная компания.",
  };

  const providerBlock = ["company", "store"].includes(role)
    ? `<section class="panel stack care-provider" data-testid="care-provider">
        <div class="row between"><div><h2>Вы сами предоставляете такие сервисы?</h2><p class="muted">Перевозчики, склады, страховые, банки и сервисы рассрочки получают заявки от клиентов и партнёров RemCard прямо здесь.</p></div>
        <label class="care-switch"><input type="checkbox" data-care-action="provider" ${s.provider ? "checked" : ""} ${readOnly ? "disabled" : ""}><span>${s.provider ? "Да, принимаем заявки" : "Нет"}</span></label></div>
        ${s.provider ? `<div class="care-kinds"><span class="small">Что предоставляете</span><div class="care-kind-list">${SERVICES.map((svc) => `<label class="care-kind ${s.providerKinds.has(svc.id) ? "is-on" : ""}"><input type="checkbox" data-care-action="kind:${svc.id}" ${s.providerKinds.has(svc.id) ? "checked" : ""} ${readOnly ? "disabled" : ""}>${icon(svc.icon)} ${svc.title}</label>`).join("")}</div><p class="small muted">Условия, тарифы и зону работы заполняют в профиле. На сайте для клиентов компания появится в разделе «Забота RemCard» после проверки администратором.</p></div>${renderRequests(s, icon, readOnly)}` : ""}
      </section>`
    : "";

  return `<div class="stack care-section" data-testid="care-section">
    <section class="panel care-hero"><div><span class="care-badge">${icon("heart-handshake")} Забота RemCard</span><h2>Сервисы для ${who}</h2><p class="muted">Сервисы для клиентов: доставка, хранение, страхование, рассрочка. И консалтинг для вас. Оформляют сервисные компании, вы продаёте больше.</p></div>
      <div class="stats care-stats"><div class="stat"><span class="small">Подключено</span><strong>${s.on.size} из ${SERVICES.length}</strong><small>Сервисов для клиентов</small></div><div class="stat"><span class="small">Заявки клиентов</span><strong>0</strong><small>Через ваши сервисы · демо</small></div><div class="stat"><span class="small">Условия для вас</span><strong>—</strong><small>Согласуем отдельно</small></div></div></section>
    <div class="tabs care-tabs" role="tablist"><button type="button" class="${s.tab === "clients" ? "selected" : ""}" data-care-action="tab:clients" role="tab">Сервисы для клиентов</button><button type="button" class="${s.tab === "consult" ? "selected" : ""}" data-care-action="tab:consult" role="tab" data-testid="care-tab-consult">Консалтинг для вас${s.booked.size ? ` (${s.booked.size})` : ""}</button></div>
    ${s.tab === "consult" ? renderConsult(s, icon, role) : `<div class="notice care-hint">${icon("lightbulb")} ${esc(hints[role] || hints.company)}</div>
    <div class="care-grid">${cards}</div>
    <section class="panel stack"><h2>Где клиент увидит подключённые сервисы</h2><ul class="care-places">${PLACES.map((p) => `<li>${icon("check")} ${esc(p)}</li>`).join("")}</ul><p class="small muted">Партнёр не заключает договоры с перевозчиками, складами, страховыми и банками. Платформа подбирает поставщика по городу и задаче клиента. В макете вознаграждение партнёра за подключённые сервисы не показывается: условия ещё не согласованы.</p></section>
    ${providerBlock}`}
  </div>`;
}

function renderRequests(s, icon, readOnly) {
  const svc = (id) => SERVICES.find((x) => x.id === id);
  const rows = s.requests.filter((r) => !s.providerKinds.size || s.providerKinds.has(r.service));
  return `<div class="care-requests" data-testid="care-requests"><div class="row between"><h3>Заявки по сервисам</h3><span class="small muted">${rows.length} ${rows.length === 1 ? "заявка" : rows.length < 5 ? "заявки" : "заявок"} · демо</span></div>
    ${rows.length ? rows.map((r) => `<div class="care-request ${r.status === "done" ? "is-done" : ""}" data-testid="care-request-${r.id}"><span class="care-ico">${icon(svc(r.service).icon)}</span><div><strong>${svc(r.service).title} · ${esc(r.who)}</strong><small>${esc(r.task)}</small><small class="muted">${r.from === "client" ? "От клиента" : "От партнёра"} · ${esc(r.via)} · ${esc(r.when)}</small></div><div class="care-request-status"><span class="pill ${r.status === "done" ? "good" : r.status === "inwork" ? "accent" : ""}">${STATUS[r.status]}</span>${readOnly || r.status === "done" ? "" : `<button type="button" class="btn ghost small-btn" data-care-action="advance:${r.id}">${r.status === "new" ? "Взять в работу" : "Выполнена"}</button>`}</div></div>`).join("") : `<p class="muted">По выбранным сервисам заявок пока нет.</p>`}
    <p class="small muted">Заявка не оплата и не договор. Условия согласуете с клиентом напрямую, оплата сервиса идёт без комиссии платформы.</p></div>`;
}

let bound = false;
export function hydrateCareServices(config) {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-care-action]");
    if (!el || el.matches('input[type="checkbox"]')) return;
    const [kind, id] = el.dataset.careAction.split(":");
    const s = ws(config.key());
    if (kind === "toggle") {
      s.on.has(id) ? s.on.delete(id) : s.on.add(id);
      config.notify(s.on.has(id) ? `Сервис подключён. Клиенты увидят его в карточке и сертификате.` : `Сервис отключён. Уже оформленные заявки клиентов не отменяются.`);
      config.refresh();
    }
    if (kind === "tab") { s.tab = id; config.refresh(); }
    if (kind === "book") { s.booked.add(id); config.notify("Заявка на консультацию принята. Свяжемся в рабочее время."); config.refresh(); }
    if (kind === "advance") {
      const r = s.requests.find((x) => x.id === id);
      if (r) r.status = r.status === "new" ? "inwork" : "done";
      config.refresh();
    }
  });
  document.addEventListener("change", (e) => {
    const el = e.target.closest("input[data-care-action]");
    if (!el) return;
    const [kind, id] = el.dataset.careAction.split(":");
    const s = ws(config.key());
    if (kind === "provider") s.provider = el.checked;
    if (kind === "kind") el.checked ? s.providerKinds.add(id) : s.providerKinds.delete(id);
    config.refresh();
  });
}
