// Editable profile UI for the ZIP copy. No network calls or browser storage.
import {
  normalizeContact,
  validContact,
  contactError,
  formatPhoneForDisplay,
} from "./contact-validation.js";
import {
  navigatorExplanation,
  addDirection,
  customDirectionForm,
} from "./direction-options.js";
import {
  stageProposalSection,
  categoryProposalSection,
} from "./stage-proposals.js";
import {
  specialistPresetSection,
  applySpecialistPreset,
  specialistKinds,
} from "./specialist-presets.js";
const sessions = new Map();
export function profileHasUnsavedChanges(role) {
  const s = sessions.get(role);
  if (!s || !s.editing) return false;
  const root = document.querySelector(`[data-profile-wizard="${role}"]`);
  if (root) capture(s, root);
  const normalized = (data) => {
    const value = { products: [], services: [], stages: [], partnerSearchOptIn: true, ...data };
    return JSON.stringify(Object.keys(value)
      .filter((key) => value[key] !== "" && value[key] !== undefined && value[key] !== null)
      .sort().map((key) => [key, value[key]]));
  };
  return normalized(s.saved) !== normalized(s.draft);
}
export function syncProfileIdentity(role, fields) {
  const s = sessions.get(role);
  if (!s) return;
  Object.assign(s.saved, fields);
  Object.assign(s.draft, fields);
}
export function employeeEmployerRole() {
  return sessions.get("employee")?.assignment?.ownerRole || null;
}
const employerLookups = new Map();
const rightLabels = {
  scanner: "Сканер и оформление покупок",
  recommendations: "Работа с рекомендациями",
  partners: "Просмотр партнёров",
};
const roles = {
  specialist: {
    label: "Специалист",
    title: "Расскажите о себе",
    note: "Имя и город для начала. Остальное можно заполнить позже.",
    steps: ["О себе", "Специализация", "Связь и работа", "Проверка"],
  },
  store: {
    label: "Магазин",
    title: "Представьте ваш магазин",
    note: "Название, представитель и город. Адреса и команду настроите отдельно.",
    steps: ["О магазине", "Ассортимент", "Связь и работа", "Проверка"],
  },
  company: {
    label: "Компания",
    title: "Представьте вашу компанию",
    note: "Общие данные организации. Филиалы и доступы сотрудников не нужно заполнять сейчас.",
    steps: ["О компании", "Направления", "Связь и работа", "Проверка"],
  },
  agent: {
    label: "Агент",
    title: "Познакомимся",
    note: "Для начала достаточно имени и города. Канал или большая аудитория не обязательны.",
    steps: ["О себе", "Аудитория", "Контакты", "Проверка"],
  },
  employee: {
    label: "Сотрудник",
    title: "Как к вам обращаться?",
    note: "Заполните только свои данные. Организацию и рабочие доступы назначает работодатель.",
    steps: ["О себе", "Контакты", "Проверка"],
  },
};
const groupNames = {
  products: "Товары",
  services: "Работы и услуги",
  stages: "Этапы ремонта",
};
const esc = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const clone = (data) => JSON.parse(JSON.stringify(data || {}));
const organization = (role) => ["company", "store"].includes(role);
const business = (role) => ["company", "store", "specialist"].includes(role);
const btn = (label, action, style = "", extra = "") =>
  `<button type="button" class="pw-btn ${style}" data-pw-action="${action}" data-testid="pw-${action}" ${extra}>${label}</button>`;

function session(config) {
  const role = config.role;
  if (!sessions.has(role)) {
    const saved = clone(config.data);
    const draft = {
      products: [],
      services: [],
      stages: [],
      partnerSearchOptIn: true,
      ...clone(saved),
    };
    sessions.set(role, {
      saved,
      draft,
      step: 0,
      editing: !saved.name,
      group: role === "specialist" ? "services" : "products",
      query: "",
      errors: {},
      message: "",
    });
  }
  const state = sessions.get(role);
  state.config = config;
  return state;
}
function field(
  s,
  key,
  label,
  {
    required = false,
    hint = "",
    type = "text",
    placeholder = "",
    multiline = false,
  } = {},
) {
  const error = s.errors[key];
  const displayed = ["contactPhone", "publicPhone"].includes(key)
    ? formatPhoneForDisplay(s.draft[key])
    : s.draft[key] || "";
  return `<div class="pw-field"><label for="pw-${key}">${label}${required ? ' <span class="pw-required">*</span>' : ""}</label>
    ${multiline ? `<textarea id="pw-${key}" name="${key}" rows="2" placeholder="${esc(placeholder)}" data-testid="pw-input-${key}">${esc(s.draft[key])}</textarea>` : `<input id="pw-${key}" name="${key}" type="${type}" value="${esc(displayed)}" placeholder="${esc(placeholder)}" ${required ? "required" : ""} ${error ? 'aria-invalid="true"' : ""} aria-describedby="pw-hint-${key}" data-testid="pw-input-${key}" autocomplete="${key === "name" ? "name" : key === "contactEmail" ? "email" : "off"}">`}
    <small id="pw-hint-${key}" class="${error ? "pw-error" : ""}">${esc(error || hint)}</small></div>`;
}
function identity(s) {
  const role = s.config.role;
  return `<div class="pw-fields">
    ${organization(role) ? field(s, "organization", role === "store" ? "Название магазина" : "Название компании", { required: true, placeholder: role === "store" ? "Например, Дом материалов" : "Например, Студия ремонта", hint: "Привычное название, без юридических реквизитов." }) : ""}
    ${field(s, "name", organization(role) ? "Имя представителя" : role === "employee" ? "Ваше имя и фамилия" : "Ваше имя", { required: true, placeholder: "Например, Алексей Иванов", hint: organization(role) ? "Кто ведёт кабинет и общается с партнёрами." : "Так вас будут узнавать в RemCard." })}
    ${role !== "employee" ? field(s, "city", role === "specialist" ? "Город работы" : "Город", { required: true, placeholder: "Например, Краснодар", hint: organization(role) ? "Основной город. Остальные укажете в филиалах." : "Поможет подобрать партнёров рядом." }) : ""}
    </div><p class="pw-footnote">Поля со звёздочкой обязательны. Это всё, что нужно для первого шага.</p>
    ${role === "employee" ? employeeId(s) : ""}`;
}
function employeeId(s) {
  return `<section class="pw-employee-id" data-testid="pw-employee-id"><h3>Ваш ID для работодателя</h3>
    <div class="pw-id-row"><input id="pw-employee-id-value" value="${esc(s.config.userId)}" readonly aria-label="Ваш ID" data-testid="pw-id-value">${btn("Скопировать ID", "copy-id")}</div>
    <p class="pw-muted">Скопируйте и отправьте ID работодателю. Он найдёт вас, добавит в свою компанию, филиал или офис и назначит должность и права доступа.</p>
    <p class="pw-copy-status" role="status" data-testid="pw-copy-status"></p>
    <small>ID принадлежит аккаунту и не меняется при редактировании профиля. В макете используется демонстрационный ID.</small></section>`;
}
function employeeWork(s) {
  const a = s.assignment;
  if (!a && s.config.staffLinked?.()) {
    return `<section class="pw-employer-block" data-testid="pw-employer-readonly"><h3>Данные от работодателя</h3><span class="pw-label">Только просмотр</span>${s.config.staffContext?.() || ""}</section>`;
  }
  if (!a)
    return `<section class="pw-employer-block" data-testid="pw-employer-readonly"><h3>Место работы</h3>
    <p class="pw-muted">Вы пока не добавлены в команду. Отправьте ID работодателю или откройте его ссылку-приглашение.</p>
    <p class="pw-footnote">Компания, подразделение, должность и права появятся после добавления. Их назначает работодатель.</p></section>`;
  return `<section class="pw-employer-block" data-testid="pw-employer-readonly"><div class="pw-card-top"><h3>Данные от работодателя</h3><span class="pw-label">Только просмотр</span></div>
    <dl class="pw-facts"><div><dt>Организация</dt><dd>${esc(a.organization)}</dd></div><div><dt>Подразделение</dt><dd>${esc(a.unit)}</dd></div><div><dt>Должность</dt><dd>${esc(a.position)}</dd></div><div><dt>Права доступа</dt><dd>${a.rights.map((id) => esc(rightLabels[id])).join(", ") || "Права пока не назначены"}</dd></div></dl>
    <p class="pw-footnote">Вы можете менять свои имя и контакты. Для изменения должности, места работы или прав обратитесь к работодателю.</p></section>`;
}
const dealServiceOptions = [
  { id: "delivery", label: "Доставка", hint: "Газель по городу 900 ₽, подъём 150 ₽/этаж" },
  { id: "storage", label: "Хранение до этапа", hint: "350 ₽/м³ в неделю, приём без клиента" },
  { id: "insurance", label: "Страхование", hint: "Груз в пути 0,4 %, материалы на объекте 0,8 %/мес" },
  { id: "finance", label: "Рассрочка и кредит", hint: "0 % до 12 мес, кредит до 60 мес" },
];
function selectedChips(s, removable = true) {
  const dict = s.config.directions;
  return ["products", "services", "stages"]
    .flatMap((group) =>
      (s.draft[group] || []).map((id) => {
        const item = dict[group].find((x) => x.id === id);
        if (!item) return "";
        const text = `${group === "products" ? "Товар" : group === "stages" ? "Этап" : "Услуга"}: ${item.label}`;
        return removable
          ? `<button type="button" class="pw-chip" data-pw-remove="${group}:${id}" aria-label="Убрать ${esc(text)}" data-testid="pw-remove-${group}-${id}">${esc(text)} <span aria-hidden="true">×</span></button>`
          : `<span class="pw-chip pw-static">${esc(text)}</span>`;
      }),
    )
    .join("");
}
function choices(s, group) {
  const list = s.config.directions[group]
    .filter((item) =>
      item.label
        .toLocaleLowerCase("ru")
        .includes(s.query.toLocaleLowerCase("ru")),
    )
    .sort(
      (a, b) =>
        Number((s.draft[group] || []).includes(b.id)) -
        Number((s.draft[group] || []).includes(a.id)),
    );
  return list.length
    ? list
        .map(
          (item) =>
            `<label class="pw-choice ${(s.draft[group] || []).includes(item.id) ? "is-selected" : ""}"><input type="checkbox" name="pw-choice" data-pw-group="${group}" value="${esc(item.id)}" ${(s.draft[group] || []).includes(item.id) ? "checked" : ""} data-testid="pw-choice-${group}-${item.id}"><span>${esc(item.label)}</span></label>`,
        )
        .join("")
    : `<p class="pw-empty">Ничего не найдено. Попробуйте другое слово.</p>`;
}
function activity(s) {
  const groups =
    s.config.role === "specialist" ? ["services"] : ["products", "services"];
  if (!groups.includes(s.group)) s.group = groups[0];
  const picked = selectedChips(s);
  return `<p class="pw-intro">${s.config.role === "specialist" ? "Выберите работы, которые выполняете. Можно несколько." : "Выберите товары и услуги, которые предлагаете. Можно указать одно направление или оба."}</p>
    ${s.config.role === "specialist" ? specialistPresetSection(s.draft, s.config.directions, esc) : ""}
    <section class="direction-selection-summary"><div class="direction-selection-heading"><strong>Уже выбрано</strong>${btn("Добавить / изменить", "edit-directions", "direction-edit-link")}</div>
    <div class="pw-picked" aria-label="Выбранные направления">${picked || '<span class="pw-muted">Пока ничего не выбрано</span>'}</div>
    <small>Отмеченные варианты показаны первыми в списке. Нажмите ×, чтобы убрать лишнее, или добавьте другие ниже.</small></section>
    <p class="pw-muted">${navigatorExplanation}</p>
    ${s.directionNotice ? `<p class="pw-success" role="status">${esc(s.directionNotice)}</p>` : ""}
    ${groups.length > 1 ? `<div class="pw-group-tabs" role="group" aria-label="Вид направления">${groups.map((g) => btn(groupNames[g], `group-${g}`, s.group === g ? "active" : "", `aria-pressed="${s.group === g}"`)).join("")}</div>` : ""}
    <label class="pw-search-label" for="pw-search">Найти направление</label><input type="search" id="pw-search" data-testid="pw-search" value="${esc(s.query)}" placeholder="Например, двери или плитка">
    <div class="pw-choices" data-pw-choices>${choices(s, s.group)}</div>
    ${customDirectionForm(s.group, esc, { profile: true })}
    <details class="pw-optional" ${s.detailsOpen ? "open" : ""}><summary>Этапы ремонта и основное направление <span>необязательно</span></summary>
      <p class="pw-muted">На каждом этапе ремонта клиент выбирает тех, кто может помочь именно сейчас. Отметьте свои этапы, чтобы появляться среди подходящих партнёров. Можно выбрать несколько и дополнить позже.</p>
      <div class="pw-stage-list">${s.config.directions.stages.map((item) => `<label class="pw-choice"><input type="checkbox" data-pw-group="stages" value="${esc(item.id)}" ${(s.draft.stages || []).includes(item.id) ? "checked" : ""}><span>${esc(item.label)}</span></label>`).join("")}</div>
      ${customDirectionForm("stages", esc, { profile: true })}
      <div class="pw-field"><label for="pw-primary">Основное направление</label><select id="pw-primary" name="primary"><option value="">Не выделять основное</option>${[
        "products",
        "services",
      ]
        .flatMap((g) =>
          (s.draft[g] || []).map((id) => {
            const item = s.config.directions[g].find((x) => x.id === id);
            return item
              ? `<option value="${g}:${id}" ${s.draft.primary === `${g}:${id}` ? "selected" : ""}>${g === "products" ? "Товар" : "Услуга"}: ${esc(item.label)}</option>`
              : "";
          }),
        )
        .join("")}</select></div>
    </details>
    <details class="pw-optional pw-deal" ${s.dealOpen || (s.draft.dealServices || []).length ? "open" : ""}><summary>Забота RemCard: предоставляю сервисы <span>необязательно</span></summary>
      <p class="pw-muted">Перевозчики, склады, страховые и банки. Отметьте, что предоставляете, — появитесь в разделе «Забота RemCard» для клиентов и в списке покупок у любого партнёра. Заявки будете получать в разделе «Забота» кабинета.</p>
      <div class="pw-stage-list">${dealServiceOptions.map((item) => `<label class="pw-choice"><input type="checkbox" data-pw-group="dealServices" value="${item.id}" ${(s.draft.dealServices || []).includes(item.id) ? "checked" : ""} data-testid="pw-choice-dealServices-${item.id}"><span>${item.label}</span></label>`).join("")}</div>
      ${(s.draft.dealServices || []).length ? `<div class="pw-field"><label for="pw-deal-terms">Условия коротко</label><input id="pw-deal-terms" name="dealTerms" value="${esc(s.draft.dealTerms || "")}" placeholder="${esc(dealServiceOptions.filter((d) => (s.draft.dealServices || []).includes(d.id)).map((d) => d.hint).join("; "))}"><small>Полные тарифы заполните в кабинете — клиент увидит их в карточке сервиса.</small></div>` : ""}
    </details>
    ${categoryProposalSection(esc, `profile-${s.config.role}`, { servicesOnly: s.config.role === "specialist" })}
    ${stageProposalSection(esc, `profile-${s.config.role}`)}`;
}
function audience(s) {
  return `<p class="pw-intro">Расскажите, кому вы рекомендуете. Если делитесь лично, канал не нужен.</p>
    ${field(s, "audience", "Кому вы рекомендуете?", { placeholder: "Друзьям, клиентам, подписчикам", hint: "Коротко, своими словами." })}
    ${field(s, "channel", "Ссылка на канал или страницу", { type: "url", placeholder: "https://…", hint: "Можно оставить пустым." })}`;
}
function contacts(s) {
  return `<p class="pw-intro">Укажите удобный способ связи. Необязательные поля можно оставить пустыми.</p>
    <div class="pw-fields pw-two">${field(s, "contactPhone", "Телефон", { type: "tel", placeholder: "+7 (___) ___-__-__", hint: "Можно начать с 8, 7 или ввести 10 цифр. Сохраним через +7. Для связи, не для повторного входа." })}${field(s, "contactEmail", "Email", { type: "email", placeholder: "name@example.ru", hint: "Для письменных предложений." })}</div>
    ${
      business(s.config.role)
        ? `<details class="pw-optional" ${s.errors.website || s.errors.telegram ? "open" : ""}><summary>Сайт и Telegram <span>необязательно</span></summary>
      ${field(s, "website", "Сайт", { type: "text", placeholder: "example.ru", hint: "Можно без https:// — добавим автоматически. Сайт подставится в каталог." })}
      ${field(s, "telegram", "Telegram", { placeholder: "@username или https://t.me/username", hint: "Можно изменить или убрать при подготовке публичной карточки." })}
    </details><details class="pw-optional"><summary>Где и как вы работаете <span>необязательно</span></summary>
    <div class="pw-field"><label for="pw-workmode">Формат работы</label><select name="partnerWorkMode" id="pw-workmode">${["Не указан", "По адресу", "На выезде", "По адресу и на выезде", "Онлайн"].map((value) => `<option ${s.draft.partnerWorkMode === value ? "selected" : ""}>${value}</option>`).join("")}</select></div>
    ${field(s, "serviceArea", "Территория работы", { multiline: true, placeholder: "Например, Краснодар и ближайшие районы", hint: "Если работаете за пределами основного города." })}
    ${field(s, "contactPerson", "Другое контактное лицо", { placeholder: "Если с партнёрами общается другой человек", hint: "Если это вы, оставьте пустым." })}
    </details>`
        : ""
    }`;
}
function facts(s, saved = false) {
  const d = saved ? s.saved : s.draft;
  const row = (label, value) =>
    `<div><dt>${label}</dt><dd>${esc(value || "Не указано")}</dd></div>`;
  return `<dl class="pw-facts">
    ${organization(s.config.role) ? row("Организация", d.organization) : ""}
    ${row(organization(s.config.role) ? "Представитель" : "Имя", d.name)}
    ${s.config.role !== "employee" ? row("Город", d.city) : ""}
    ${row("Телефон", formatPhoneForDisplay(d.contactPhone))}${row("Email", d.contactEmail)}
    ${s.config.role === "specialist" && d.specialistKind ? row("Роль специалиста", d.specialistKind === "other" ? d.specialistTitle || "Свой вариант" : specialistKinds.find((item) => item.id === d.specialistKind)?.label) : ""}
    ${business(s.config.role) && d.website ? row("Сайт", d.website) : ""}
    ${business(s.config.role) && d.telegram ? row("Telegram", d.telegram) : ""}
    ${s.config.role === "agent" && d.audience ? row("Аудитория", d.audience) : ""}
    ${s.config.role === "agent" && d.channel ? row("Канал", d.channel) : ""}
    ${d.partnerWorkMode && d.partnerWorkMode !== "Не указан" ? row("Формат работы", d.partnerWorkMode) : ""}
    ${d.serviceArea ? row("Территория работы", d.serviceArea) : ""}
    ${d.contactPerson ? row("Контактное лицо", d.contactPerson) : ""}
    ${(d.dealServices || []).length ? row("Забота RemCard (поставщик)", dealServiceOptions.filter((x) => d.dealServices.includes(x.id)).map((x) => x.label).join(", ") + (d.dealTerms ? ` — ${d.dealTerms}` : "")) : ""}
    </dl>`;
}
function review(s) {
  return `${facts(s)}${
    business(s.config.role)
      ? `<div class="pw-review-directions"><strong>Направления</strong><div class="pw-picked">${selectedChips(s, false) || '<span class="pw-muted">Можно добавить позже</span>'}</div>
    </div>
    <label class="pw-visibility"><input type="checkbox" name="partnerSearchOptIn" ${s.draft.partnerSearchOptIn !== false ? "checked" : ""}><span><strong>Показывать профиль партнёрам</strong><small>Поиск внутри RemCard. Это не публикация в каталоге для клиентов.</small></span></label>`
      : ""
  }
    ${s.config.role === "employee" ? employeeWork(s) : '<p class="pw-footnote">Профиль и карточка в каталоге независимы. Сохранение не публикует вас для клиентов.</p>'}`;
}
function summary(s) {
  const d = s.saved;
  const dataForChips = { ...s, draft: d };
  return `<section class="pw-summary" data-testid="pw-summary"><div class="pw-summary-header"><div class="pw-avatar">${esc((d.organization || d.name || "?").slice(0, 2).toUpperCase())}</div><div><span class="pw-kicker">${roles[s.config.role].label}</span><h2>${esc(d.organization || d.name)}</h2><p class="pw-muted">${esc(d.city || "Личный профиль сотрудника")}</p></div><span class="pw-status">Заполнено</span></div>
    ${s.message ? `<p class="pw-success" role="status">${esc(s.message)}</p>` : ""}
    ${facts(s, true)}${business(s.config.role) ? `<div class="pw-picked">${selectedChips(dataForChips, false) || '<span class="pw-muted">Направления пока не указаны</span>'}</div>` : ""}
    <div class="pw-summary-actions">${btn(s.config.role === "employee" ? "Изменить имя и контакты" : "Редактировать профиль", "edit", "primary")}${s.config.role !== "employee" ? `<span class="pw-muted">ID ${esc(s.config.userId)}</span>` : ""}</div></section>
    ${business(s.config.role) ? `<section class="pw-after"><div><h3>Хотите появиться в каталоге?</h3><p>Публикация добровольна. Публичную карточку можно подготовить отдельно.</p></div><button type="button" class="pw-btn" data-profile-action="tab" data-profile-id="catalog">Перейти к каталогу</button></section>` : s.config.role === "employee" ? employeeId(s) + employeeWork(s) : ""}
    <p class="pw-footnote">Демонстрационные данные хранятся только до обновления страницы.</p>`;
}
function wizardPayCategories(s) {
  return `<div class="pw-layout pw-layout--pay-categories" data-testid="pw-pay-categories"><section class="pw-card pw-card--pay-categories">
    <div class="pw-card-top"><span class="pw-kicker">Оформление покупки</span><span class="pw-label">Только категории</span></div>
    <h2 id="pw-title" tabindex="-1">${s.config.role === "specialist" ? "Услуги для оплаты" : "Товары и услуги для оплаты"}</h2>
    <p class="pw-muted">Отметьте направления, которые доступны для этой покупки. Имя, город и контакты профиля не меняются.</p>
    <form data-pw-form novalidate>${activity(s)}
    <div class="pw-actions"><div>${btn("Отменить", "cancel", "quiet")}</div><div><button type="submit" class="pw-btn primary" data-testid="pw-save-categories">Сохранить категории</button></div></div></form>
    <p class="pw-demo-note">Демо: сохраняются только выбранные категории в макете.</p></section></div>`;
}
function wizard(s) {
  const spec = roles[s.config.role];
  const last = spec.steps.length - 1;
  const title =
    s.step === 0
      ? spec.title
      : s.step === last
        ? "Всё верно?"
        : s.step === 1
          ? s.config.role === "employee"
            ? "Как с вами связаться?"
            : s.config.role === "agent"
              ? "Кому вы рекомендуете?"
              : "Чем вы занимаетесь?"
          : "Как с вами связаться?";
  const content =
    s.step === 0
      ? identity(s)
      : s.step === last
        ? review(s)
        : s.step === 1
          ? s.config.role === "employee"
            ? contacts(s)
            : s.config.role === "agent"
              ? audience(s)
              : activity(s)
          : contacts(s);
  return `<div class="pw-layout"><aside class="pw-journey" aria-label="Шаги заполнения"><span class="pw-kicker">${spec.label}</span><h2>Профиль без лишнего</h2><p>${spec.note}</p>
    <ol class="pw-steps">${spec.steps.map((label, i) => `<li class="${i === s.step ? "current" : i < s.step ? "done" : ""}"><button type="button" data-pw-action="step-${i}" aria-current="${i === s.step ? "step" : "false"}" data-testid="pw-step-${i}"><span class="pw-step-number">${i < s.step ? "✓" : i + 1}</span><span>${label}</span>${i > 0 && i < last ? "<small>необязательно</small>" : ""}</button></li>`).join("")}</ol>
    <div class="pw-journey-note"><strong>Не нужно заполнять всё сразу</strong><p>Дополнительные сведения можно пропустить и вернуться к ним позже.</p></div></aside>
    <section class="pw-card"><div class="pw-card-top"><span class="pw-kicker" data-testid="pw-progress">Шаг ${s.step + 1} из ${spec.steps.length}</span><span class="pw-label">${s.step === 0 ? "Обязательные данные" : s.step === last ? "Перед сохранением" : "Можно пропустить"}</span></div>
    <h2 id="pw-title" tabindex="-1">${title}</h2><form data-pw-form novalidate>${content}
    <div class="pw-actions"><div>${s.step ? btn("Назад", "back") : ""}${s.saved.name ? btn("Отменить", "cancel", "quiet") : ""}</div><div>${s.step > 0 && s.step < last ? btn("Пропустить", "skip", "quiet") : ""}<button type="submit" class="pw-btn primary" data-testid="pw-next">${s.step === last ? "Сохранить профиль" : "Продолжить"}${s.step < last ? ' <span aria-hidden="true">→</span>' : ""}</button></div></div></form>
    <p class="pw-demo-note">Макет: сохранение только в этой вкладке, без отправки в ЛК.</p></section></div>`;
}
export function renderProfileWizard(config, mode = "overview") {
  const s = session(config);
  // Opening Basic data from the saved overview explicitly enters editing.
  if (
    mode === "basics" &&
    s.lastMode !== "basics" &&
    !s.editing &&
    !s.payCategoriesTrip &&
    !s.payCategoriesOnly
  ) {
    s.editing = true;
    s.step = 0;
    s.draft = clone(s.saved);
  }
  s.lastMode = mode;
  return `<div class="pw" data-profile-wizard="${config.role}">${
    s.editing
      ? s.payCategoriesOnly
        ? wizardPayCategories(s)
        : wizard(s)
      : summary(s)
  }</div>`;
}

export function syncProfileWizardSavedData(role, data) {
  const s = sessions.get(role);
  if (!s || (s.editing && !s.payCategoriesOnly)) return;
  const next = {
    products: [],
    services: [],
    stages: [],
    partnerSearchOptIn: true,
    ...clone(data),
  };
  s.saved = { ...clone(s.saved), ...next };
  s.draft = clone(s.saved);
}

/** Basics wizard → categories step only (pay form), without full onboarding. */
export function primeProfileWizardPayCategories(config) {
  const s = session(config);
  const incoming = {
    products: [],
    services: [],
    stages: [],
    partnerSearchOptIn: true,
    ...clone(config.data),
  };
  s.saved = { ...clone(s.saved), ...incoming };
  s.draft = clone(s.saved);
  s.editing = true;
  s.step = 1;
  s.lastMode = "basics";
  s.payCategoriesTrip = true;
  s.payCategoriesOnly = true;
  s.group = config.role === "specialist" ? "services" : "products";
  s.query = "";
  s.errors = {};
  s.message = "";
  s.detailsOpen = (s.draft.stages || []).length > 0;
  return s;
}

export function clearProfileWizardPayCategoriesTrip(role) {
  const s = sessions.get(role);
  if (!s) return;
  s.payCategoriesTrip = false;
  s.payCategoriesOnly = false;
}

export function revertProfileWizardDraft(role) {
  const s = sessions.get(role);
  if (!s) return;
  const root = document.querySelector(`[data-profile-wizard="${role}"]`);
  if (root && s.editing) capture(s, root);
  s.draft = clone(s.saved);
  s.editing = false;
  s.payCategoriesTrip = false;
  s.payCategoriesOnly = false;
  s.errors = {};
}

export function focusProfileWizardActivityStep(role) {
  requestAnimationFrame(() => {
    const root = document.querySelector(`[data-profile-wizard="${role}"]`);
    if (!root) return;
    root.scrollIntoView({ block: "start", behavior: "smooth" });
    const title = root.querySelector("#pw-title");
    title?.focus({ preventScroll: true });
    root.querySelector('[data-pw-action="edit-directions"]')?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  });
}
function capture(s, root) {
  root.querySelectorAll("[name]").forEach((el) => {
    if (el.dataset.pwGroup || el.name === "pw-choice") return;
    s.draft[el.name] =
      el.type === "checkbox"
        ? el.checked
        : ["contactPhone", "publicPhone"].includes(el.name)
          ? normalizeContact(el.name, el.value)
          : el.value;
  });
  s.detailsOpen =
    [...root.querySelectorAll(".pw-optional")].find((el) =>
      el.querySelector(".pw-stage-list") && !el.classList.contains("pw-deal"),
    )?.open || false;
  s.dealOpen = root.querySelector(".pw-deal")?.open || false;
}
function validate(s, step) {
  const errors = {};
  if (step === 0) {
    [
      "name",
      ...(organization(s.config.role) ? ["organization"] : []),
      ...(s.config.role === "employee" ? [] : ["city"]),
    ].forEach((key) => {
      if (!String(s.draft[key] || "").trim())
        errors[key] = "Заполните это поле.";
      else s.draft[key] = s.draft[key].trim();
    });
  }
  if (step === roles[s.config.role].steps.length - 2) {
    for (const key of [
      "contactEmail",
      "contactPhone",
      ...(business(s.config.role) ? ["website", "telegram"] : []),
    ]) {
      s.draft[key] = normalizeContact(key, s.draft[key]);
      if (s.draft[key] && !validContact(key, s.draft[key]))
        errors[key] = contactError(key);
    }
  }
  if (
    s.config.role === "agent" &&
    step === 1 &&
    s.draft.channel &&
    !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(s.draft.channel)
  )
    errors.channel = "Укажите полную ссылку, начиная с https://.";
  s.errors = errors;
  return !Object.keys(errors).length;
}
function paint(s, focus = true) {
  s.config.refresh();
  const root = document.querySelector(
    `[data-profile-wizard="${s.config.role}"]`,
  );
  if (focus) {
    const payReturn = !s.editing
      ? document.querySelector("[data-pay-profile-return]")
      : null;
    if (payReturn) {
      payReturn.scrollIntoView({ block: "start", behavior: "instant" });
      payReturn
        .querySelector('[data-action="pay-profile:resume"]')
        ?.focus({ preventScroll: true });
      return;
    }
    const firstError = Object.keys(s.errors)[0];
    const target = root?.querySelector(
      firstError ? `#pw-${firstError}` : "#pw-title",
    );
    target?.focus({ preventScroll: true });
    root?.scrollIntoView({ block: "start", behavior: "instant" });
  }
}
export function hydrateProfileWizards() {
  document.querySelectorAll("[data-profile-wizard]").forEach((root) => {
    if (root.dataset.hydrated) return;
    root.dataset.hydrated = "true";
    const s = sessions.get(root.dataset.profileWizard);
    if (!s) return;
    root.addEventListener("input", (event) => {
      const target = event.target;
      if (target.name && s.errors[target.name]) {
        delete s.errors[target.name];
        target.removeAttribute("aria-invalid");
        const hint = root.querySelector(`#pw-hint-${target.name}`);
        if (hint) {
          hint.textContent = "";
          hint.classList.remove("pw-error");
        }
      }
      if (event.target.id === "pw-search") {
        s.query = event.target.value;
        root.querySelector("[data-pw-choices]").innerHTML = choices(s, s.group);
      }
    });
    root.addEventListener("change", (event) => {
      const target = event.target;
      if (target.matches("[data-specialist-kind]")) {
        capture(s, root);
        const applied = applySpecialistPreset(s.draft, s.config.directions);
        s.draft.specialistNotice = !s.draft.specialistKind
          ? "Категории и этапы можно выбрать вручную."
          : s.draft.specialistKind === "other"
            ? "Укажите свою специализацию и выберите категории/этапы вручную."
            : applied
              ? "Стартовые категории и этапы подставлены. Проверьте и отредактируйте их."
              : "Текущий выбор сохранён. Чтобы добавить подсказки, откройте стартовый набор.";
        paint(s, false);
        return;
      }
      if (!target.dataset.pwGroup) return;
      capture(s, root);
      const group = target.dataset.pwGroup;
      const selected = new Set(s.draft[group] || []);
      target.checked
        ? selected.add(target.value)
        : selected.delete(target.value);
      s.draft[group] = [...selected];
      if (
        s.draft.primary &&
        !["products", "services"].some((g) =>
          (s.draft[g] || []).some((id) => `${g}:${id}` === s.draft.primary),
        )
      )
        s.draft.primary = "";
      const scroll = window.scrollY;
      paint(s, false);
      window.scrollTo(0, scroll);
      document
        .querySelector(
          `[data-profile-wizard="${s.config.role}"] input[data-pw-group="${group}"][value="${CSS.escape(target.value)}"]`,
        )
        ?.focus({ preventScroll: true });
    });
    root.addEventListener("click", async (event) => {
      if (event.target.closest("[data-specialist-apply]")) {
        event.preventDefault();
        capture(s, root);
        applySpecialistPreset(s.draft, s.config.directions, { merge: true });
        s.draft.specialistNotice =
          "Стартовый набор добавлен. Уже выбранные категории и этапы сохранены.";
        paint(s, false);
        return;
      }
      const button = event.target.closest("[data-pw-action], [data-pw-remove]");
      if (!button) return;
      event.preventDefault();
      capture(s, root);
      const action = button.dataset.pwAction;
      if (action === "edit-directions") {
        s.query = "";
        const search = root.querySelector("#pw-search");
        search.value = "";
        root.querySelector("[data-pw-choices]").innerHTML = choices(s, s.group);
        if ((s.draft.stages || []).length) {
          const stages = root
            .querySelector(".pw-stage-list")
            ?.closest("details");
          if (stages) stages.open = s.detailsOpen = true;
        }
        search.focus({ preventScroll: true });
        search.scrollIntoView({ block: "center", behavior: "instant" });
        return;
      }
      if (action === "add-direction") {
        const group = button.dataset.pwAdd;
        const input = root.querySelector(`[data-custom-direction="${group}"]`);
        const result = addDirection(s.config.directions, group, input.value);
        if (result.error) {
          root.querySelector(`[data-direction-result="${group}"]`).textContent =
            result.error;
          input.focus();
          return;
        }
        s.draft[group] = [
          ...new Set([...(s.draft[group] || []), result.item.id]),
        ];
        s.directionNotice = result.created
          ? `«${result.item.label}» добавлено и выбрано в макете.`
          : `«${result.item.label}» уже есть в справочнике и выбрано.`;
        s.query = "";
        if (group === "stages") s.detailsOpen = true;
        paint(s, false);
        return;
      }
      if (action === "copy-id") {
        const status = root.querySelector(".pw-copy-status");
        try {
          await navigator.clipboard.writeText(s.config.userId);
          status.textContent = "ID скопирован. Отправьте его работодателю.";
        } catch {
          const input = root.querySelector("#pw-employee-id-value");
          input.focus();
          input.select();
          status.textContent =
            "ID выделен. Нажмите Ctrl+C или скопируйте через меню устройства и отправьте работодателю.";
        }
        return;
      }
      const last = roles[s.config.role].steps.length - 1;
      if (button.dataset.pwRemove) {
        const [group, id] = button.dataset.pwRemove.split(":");
        s.draft[group] = (s.draft[group] || []).filter((x) => x !== id);
        if (s.draft.primary === `${group}:${id}`) s.draft.primary = "";
      } else if (action.startsWith("group-")) {
        s.group = action.slice(6);
        s.query = "";
      } else if (action === "back") {
        s.step = Math.max(0, s.step - 1);
        s.errors = {};
      } else if (action === "skip") {
        s.step = Math.min(last, s.step + 1);
        s.errors = {};
      } else if (action === "edit") {
        s.draft = clone(s.saved);
        s.editing = true;
        s.payCategoriesOnly = false;
        s.step = 0;
        s.message = "";
      } else if (action === "cancel") {
        const payOnly = s.payCategoriesOnly;
        s.draft = clone(s.saved);
        s.editing = false;
        s.payCategoriesTrip = false;
        s.payCategoriesOnly = false;
        s.errors = {};
        s.message = payOnly ? "" : "Изменения отменены.";
      } else if (action.startsWith("step-") && !s.payCategoriesOnly) {
        const dest = Number(action.slice(5));
        if (dest > s.step && !validate(s, s.step)) {
          paint(s);
          return;
        }
        if (dest > 0 && !validate(s, 0)) {
          s.step = 0;
          paint(s);
          return;
        }
        s.errors = {};
        s.step = dest;
      }
      paint(
        s,
        action !== "group-products" &&
          action !== "group-services" &&
          !button.dataset.pwRemove,
      );
    });
    root.querySelector("form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      capture(s, root);
      if (s.payCategoriesOnly) {
        s.saved = {
          ...clone(s.saved),
          products: [...(s.draft.products || [])],
          services: [...(s.draft.services || [])],
          stages: [...(s.draft.stages || [])],
          primary: s.draft.primary || "",
          dealServices: [...(s.draft.dealServices || [])],
        };
        s.draft = clone(s.saved);
        s.config.save(clone(s.saved));
        s.editing = false;
        s.payCategoriesTrip = false;
        s.payCategoriesOnly = false;
        s.errors = {};
        s.message = "";
        paint(s);
        return;
      }
      if (!validate(s, s.step)) {
        paint(s);
        return;
      }
      const last = roles[s.config.role].steps.length - 1;
      if (s.step < last) s.step++;
      else {
        // Re-check non-empty optional values when the user jumped directly to review.
        if (!validate(s, 0)) {
          s.step = 0;
          paint(s);
          return;
        }
        if (!validate(s, last - 1)) {
          s.step = last - 1;
          paint(s);
          return;
        }
        if (s.config.role === "agent" && !validate(s, 1)) {
          s.step = 1;
          paint(s);
          return;
        }
        s.saved = clone(s.draft);
        s.config.save(clone(s.saved));
        s.editing = false;
        s.payCategoriesTrip = false;
        s.payCategoriesOnly = false;
        s.message = "Профиль сохранён в макете. Рабочий ЛК не изменён.";
      }
      paint(s);
    });
  });
  hydrateEmployerLookups();
}

export function renderEmployerIdLookup(config) {
  if (!organization(config.role)) return "";
  if (!employerLookups.has(config.role))
    employerLookups.set(config.role, {
      query: "",
      found: false,
      error: "",
      unit: "",
      position: "",
      rights: [],
      added: false,
    });
  const state = employerLookups.get(config.role);
  state.config = config;
  const employee = sessions.get("employee");
  return `<section class="pw pw-id-lookup pw-card" data-employer-lookup="${config.role}" data-testid="pw-employer-lookup"><span class="pw-kicker">Ещё один способ добавить сотрудника</span><h2>Добавить по ID</h2>
    <p class="pw-intro">Сотрудник может зарегистрироваться сам и отправить вам свой ID. Приглашение по ссылке по-прежнему доступно.</p>
    <form data-id-search><label for="pw-find-id" class="pw-search-label">ID сотрудника</label><div class="pw-id-row"><input id="pw-find-id" value="${esc(state.query)}" placeholder="Например, DEMO-104827" autocomplete="off" data-testid="pw-find-id"><button class="pw-btn" type="submit" data-testid="pw-find-employee">Найти</button></div></form>
    ${state.error ? `<p class="pw-error pw-footnote" role="alert">${esc(state.error)}</p>` : ""}
    ${
      state.found && employee?.saved.name
        ? `<div class="pw-id-result"><h3>${esc(employee.saved.name)}</h3><p class="pw-muted">ID ${esc(employee.config.userId)} · самостоятельно зарегистрирован</p>
      ${
        state.added
          ? `<p class="pw-success" role="status" data-testid="pw-id-added">Сотрудник добавлен в макете. Он видит назначенные данные в своём профиле и не может их редактировать.</p>`
          : `<form data-id-add novalidate>
      <div class="pw-field"><label for="pw-id-unit">Куда добавить</label><select id="pw-id-unit" data-testid="pw-id-unit">${["Вся организация", ...config.branches, "Офис · демо"].map((unit) => `<option ${state.unit === unit ? "selected" : ""}>${esc(unit)}</option>`).join("")}</select></div>
      <div class="pw-field"><label for="pw-id-position">Должность <span class="pw-required">*</span></label><input id="pw-id-position" data-testid="pw-id-position" value="${esc(state.position)}" placeholder="Например, менеджер" required></div>
      <fieldset class="pw-rights"><legend>Права доступа</legend><p class="pw-muted">Отметьте только нужное. Без выбранных прав рабочие действия недоступны.</p>${Object.entries(
        rightLabels,
      )
        .map(
          ([key, label]) =>
            `<label class="pw-choice"><input type="checkbox" data-id-right="${key}" ${state.rights.includes(key) ? "checked" : ""} data-testid="pw-right-${key}"><span>${label}</span></label>`,
        )
        .join("")}</fieldset>
      <button type="submit" class="pw-btn primary" data-testid="pw-add-by-id">Добавить сотрудника в макете</button></form>`
      }</div>`
        : ""
    }
    <p class="pw-demo-note">Демонстрация в одной вкладке: сначала заполните и сохраните профиль «Сотрудник», затем переключитесь на «Компания» или «Магазин» и найдите этот ID. Реальный поиск и добавление в ЛК не подключены.</p></section>`;
}
function hydrateEmployerLookups() {
  document.querySelectorAll("[data-employer-lookup]").forEach((root) => {
    if (root.dataset.hydrated) return;
    root.dataset.hydrated = "true";
    const state = employerLookups.get(root.dataset.employerLookup);
    root
      .querySelector("[data-id-search]")
      .addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.query = root.querySelector("#pw-find-id").value.trim();
        const employee = sessions.get("employee");
        state.found =
          !!employee?.saved.name &&
          state.query.toUpperCase() === employee.config.userId.toUpperCase();
        state.error = state.found
          ? ""
          : state.query
            ? "Сотрудник не найден. Проверьте ID; для этой демонстрации сначала сохраните профиль «Сотрудник» в той же вкладке."
            : "Введите ID сотрудника.";
        state.added =
          state.found && employee.assignment?.ownerRole === state.config.role;
        if (
          state.found &&
          employee.assignment &&
          employee.assignment.ownerRole !== state.config.role
        ) {
          state.found = false;
          state.error =
            "В этом макете сотрудник уже добавлен в другую организацию.";
        }
        state.config.refresh();
      });
    root.querySelector("[data-id-add]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.unit = root.querySelector("#pw-id-unit").value;
      state.position = root.querySelector("#pw-id-position").value.trim();
      state.rights = [...root.querySelectorAll("[data-id-right]:checked")].map(
        (el) => el.dataset.idRight,
      );
      if (!state.position) {
        state.error = "Укажите должность сотрудника.";
        state.config.refresh();
        document.querySelector("#pw-id-position")?.focus();
        return;
      }
      const employee = sessions.get("employee");
      if (
        !employee?.saved.name ||
        state.query.toUpperCase() !== employee.config.userId.toUpperCase()
      )
        return;
      if (employee.assignment) {
        state.added = true;
        state.config.refresh();
        return;
      }
      employee.assignment = {
        ownerRole: state.config.role,
        organization:
          state.config.data.organization ||
          roles[state.config.role].label + " · демо",
        unit: state.unit,
        position: state.position,
        rights: [...state.rights],
      };
      state.added = true;
      state.error = "";
      state.config.refresh();
    });
  });
}
