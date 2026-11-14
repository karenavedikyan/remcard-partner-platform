// Стартовые страницы разделов для нового партнёра без данных.
// Прототип: переключатель «Данные» в панели макета (Демо / Новый партнёр).
// Модуль не трогает демоданные: он только подменяет первую страницу раздела.

const STORAGE_KEY = "rc-proto-dataset";
const peeked = new Set();

const ICONS = {
  ticket:
    '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  handshake:
    '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
  wallet:
    '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  scan:
    '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  user:
    '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  building:
    '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  sparkles:
    '<path d="M9.9 2.5 11.6 7.1a2 2 0 0 0 1.3 1.3l4.6 1.7a1 1 0 0 1 0 1.8l-4.6 1.7a2 2 0 0 0-1.3 1.3l-1.7 4.6a1 1 0 0 1-1.8 0l-1.7-4.6a2 2 0 0 0-1.3-1.3L.5 11.9a1 1 0 0 1 0-1.8l4.6-1.7a2 2 0 0 0 1.3-1.3l1.7-4.6a1 1 0 0 1 1.8 0Z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  share: '<path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  mapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  store: '<path d="m2 7 4.4-4.4A2 2 0 0 1 7.8 2h8.4a2 2 0 0 1 1.4.6L22 7"/><path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7"/><path d="M15 22v-4a3 3 0 0 0-6 0v4"/><path d="M2 7h20"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a.6.6 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.6a1 1 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/>',
  phone: '<path d="M14 2a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M12 18h.01"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  send: '<path d="M14.5 10 3 3l3 9-3 9 11.5-7Z"/><path d="M6 12h8"/>',
};

const svg = (name, cls = "") =>
  `<svg class="es-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.sparkles}</svg>`;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const btn = (label, action, kind = "primary", extra = "") =>
  `<button type="button" class="btn ${kind}" data-action="${action}" data-testid="es-${action.replaceAll(":", "-")}" ${extra}>${label}</button>`;

const step = (icon, title, note) => ({ icon, title, note });

// ───────────────────────── Copy ─────────────────────────
const SELLER = (role) => ["store", "company", "employee"].includes(role);

function copy(page, role) {
  const seller = SELLER(role);
  switch (page) {
    case "home":
      return {
        agent: {
          icon: "ticket",
          kicker: "Первый шаг",
          title: "Первый сертификат — за минуту",
          lead: "Рекомендуйте партнёра клиенту и получайте бонус с его покупок.",
          steps: [
            step("user", "Заполните профиль", "Имя и контакты видят партнёры"),
            step("handshake", "Найдите партнёров", "Магазины и специалисты вашего города"),
            step("ticket", "Создайте сертификат", "Отправьте клиенту ссылку"),
          ],
          cta: btn("Создать сертификат", "action:recommend"),
          alt: btn("Найти партнёра", "nav:partners", "ghost"),
        },
        specialist: {
          icon: "sparkles",
          kicker: "Первый шаг",
          title: "Начните с профиля и партнёров",
          lead: "Клиент покупает у вашего партнёра — бонус получаете вы.",
          steps: [
            step("user", "Профиль и направления", "Чем занимаетесь и где"),
            step("handshake", "Партнёры", "Магазины и коллеги с условиями для вас"),
            step("ticket", "Сертификат клиенту", "Ссылка — и клиент идёт к партнёру"),
          ],
          cta: btn("Заполнить профиль", "nav:profile"),
          alt: btn("Найти партнёра", "nav:partners", "ghost"),
        },
        store: {
          icon: "store",
          kicker: "Первый шаг",
          title: "Подготовьте магазин к первым клиентам",
          lead: "Партнёры направляют к вам клиентов с сертификатами — вы подтверждаете покупку.",
          steps: [
            step("percent", "Профиль и условия", "Категории, скидка и бонус"),
            step("handshake", "Партнёры", "Агенты и специалисты, которые рекомендуют вас"),
            step("scan", "Проверка на кассе", "Сканируйте сертификат при покупке"),
          ],
          cta: btn("Заполнить профиль", "nav:profile"),
          alt: btn("Найти партнёра", "nav:partners", "ghost"),
        },
        company: {
          icon: "building",
          kicker: "Первый шаг",
          title: "Настройте компанию за три шага",
          lead: "Филиалы, сотрудники и партнёры — в одном кабинете.",
          steps: [
            step("mapPin", "Профиль и филиалы", "Адреса и направления"),
            step("users", "Сотрудники и права", "Каждый видит только своё"),
            step("handshake", "Партнёры и условия", "Кто приводит клиентов и на каких условиях"),
          ],
          cta: btn("Заполнить профиль", "nav:profile"),
          alt: btn("Пригласить сотрудника", "new-link:employee", "ghost"),
        },
      };
    case "clients":
      return seller
        ? {
            icon: "users",
            kicker: "Пока пусто",
            title: "Клиенты придут с сертификатами",
            lead: "Клиент появляется здесь после первой проверенной покупки.",
            steps: [
              step("phone", "Клиент показывает сертификат", "QR или код на телефоне"),
              step("scan", "Вы проверяете его на кассе", "Условия видны сразу"),
              step("bag", "Покупка — в карточке клиента", "Сумма, бонус и статус"),
            ],
            cta: btn("Проверить сертификат", "action:scan"),
          }
        : {
            icon: "users",
            kicker: "Пока пусто",
            title: "Здесь появятся ваши клиенты",
            lead: "Клиент добавляется, когда вы создаёте для него сертификат.",
            steps: [
              step("ticket", "Создайте сертификат", "Партнёр, клиент, условия"),
              step("share", "Поделитесь ссылкой", "Клиент откроет её в телефоне"),
              step("bag", "Следите за покупками", "Статусы и начисления — в карточке"),
            ],
            cta: btn("Создать сертификат", "action:recommend"),
            alt: btn("Добавить клиента", "client-add", "ghost"),
          };
    case "recommendations":
      return seller
        ? {
            icon: "ticket",
            kicker: "Пока пусто",
            title: "Сертификаты ваших клиентов",
            lead: "Те, с которыми клиенты пришли к вам, и те, что выдали вы.",
            steps: [
              step("scan", "Клиент пришёл с сертификатом", "Проверьте до продажи"),
              step("check", "Продажа подтверждена", "Бонус начислен партнёру"),
              step("ticket", "Рекомендуйте сами", "Выдавайте сертификаты на других партнёров"),
            ],
            cta: btn("Проверить сертификат", "action:scan"),
            alt: btn("Создать сертификат", "action:recommend", "ghost"),
          }
        : {
            icon: "ticket",
            kicker: "Пока пусто",
            title: "Сертификат — ваша рекомендация",
            lead: "Партнёр, клиент и условия в одной ссылке. Бонус — вам.",
            steps: [
              step("handshake", "Выберите партнёра", "С согласованными условиями"),
              step("user", "Укажите клиента", "Имя и телефон"),
              step("share", "Отправьте ссылку", "Клиент покажет её при покупке"),
            ],
            cta: btn("Создать сертификат", "action:recommend"),
          };
    case "scanner":
      return {
        icon: "scan",
        kicker: "Как это работает",
        title: "Проверка сертификата — 10 секунд",
        lead: "Сканирование показывает условия. Продажа подтверждается отдельно.",
        steps: [
          step("scan", "Отсканируйте QR", "Или введите код вручную"),
          step("percent", "Посмотрите условия", "Скидка и бонус по категории"),
          step("check", "Подтвердите продажу", "Сумма — и бонус начислен"),
        ],
        cta: btn("Открыть сканер", "action:scan"),
      };
    case "partners":
    case "links":
      return seller
        ? {
            icon: "handshake",
            kicker: "Пока пусто",
            title: "Партнёры приведут клиентов",
            lead: "Агенты и специалисты рекомендуют вас — вы подтверждаете покупки.",
            steps: [
              step("search", "Найдите в RemCard", "По категориям и городу"),
              step("link", "Или пригласите по ссылке", "Если партнёра ещё нет в системе"),
              step("percent", "Согласуйте условия", "Скидка и бонус по каждой категории"),
            ],
            cta: btn("Найти партнёра", "partner-hub", "primary", 'data-es-peek="partners"'),
            alt: btn("Пригласить по ссылке", "external-partner", "ghost", 'data-es-peek="partners"'),
          }
        : {
            icon: "handshake",
            kicker: "Пока пусто",
            title: "Соберите сеть партнёров",
            lead: "Чем больше партнёров — тем больше поводов для сертификата.",
            steps: [
              step("search", "Найдите в RemCard", "Магазины и специалисты по категориям"),
              step("link", "Или пригласите по ссылке", "Если партнёра ещё нет в системе"),
              step("percent", "Согласуйте условия", "Скидка и бонус по каждой категории"),
            ],
            cta: btn("Найти партнёра", "partner-hub", "primary", 'data-es-peek="partners"'),
            alt: btn("Пригласить по ссылке", "external-partner", "ghost", 'data-es-peek="partners"'),
          };
    case "wallet":
    case "bonus":
    case "settlements":
    case "history":
      return seller
        ? {
            icon: "wallet",
            art: "card",
            kicker: "Пока пусто",
            title: "Кошелёк: кому и сколько",
            lead: "Начисления партнёрам и ваши выплаты — в одном месте.",
            steps: [
              step("bag", "Продажа по сертификату", "Бонус начислен партнёру"),
              step("clock", "Подтверждение", "В срок по категории или вручную"),
              step("check", "Выплата", "Фиксируете перевод — долг закрыт"),
            ],
            cta: btn("Проверить сертификат", "action:scan"),
          }
        : {
            icon: "wallet",
            art: "card",
            kicker: "Пока пусто",
            title: "Здесь будут ваши начисления",
            lead: "Бонус появляется после покупки клиента по вашему сертификату.",
            steps: [
              step("bag", "Клиент покупает у партнёра", "По вашему сертификату"),
              step("clock", "Партнёр подтверждает", "Начисление «в ожидании»"),
              step("wallet", "Сумма в кошельке", "После подтверждения — к получению"),
            ],
            cta: btn("Создать сертификат", "action:recommend"),
          };
    case "team":
      return {
        icon: "users",
        kicker: "Пока пусто",
        title: "Пригласите команду",
        lead: "Каждый сотрудник видит только то, что нужно для его работы.",
        steps: [
          step("send", "Отправьте ссылку", "Персональное приглашение"),
          step("shield", "Назначьте должность и права", "Продажи, касса, клиенты — по отдельности"),
          step("mapPin", "Укажите филиалы", "Один, несколько или офис"),
        ],
        cta: btn("Пригласить сотрудника", "new-link:employee"),
      };
    case "profile": {
      const steps = {
        agent: [
          step("user", "Имя и контакты", "Так вас увидят партнёры"),
          step("mapPin", "Город", "Чтобы находить партнёров рядом"),
          step("card", "Реквизиты", "Куда получать бонусы"),
        ],
        specialist: [
          step("sparkles", "О себе и направления", "Что делаете и для кого"),
          step("mapPin", "Город и контакты", "Чтобы вас находили партнёры"),
          step("card", "Реквизиты", "Куда получать бонусы"),
        ],
        store: [
          step("store", "Магазин и адрес", "Название, точка, контакты"),
          step("percent", "Категории и условия", "Скидка и бонус по каждой"),
          step("card", "Реквизиты", "Для расчётов с партнёрами"),
        ],
        company: [
          step("building", "Компания и филиалы", "Головной офис и точки"),
          step("percent", "Направления и условия", "Что предлагаете партнёрам"),
          step("card", "Реквизиты", "Для расчётов с партнёрами"),
        ],
      };
      return {
        icon: "user",
        kicker: "Пара минут",
        title: "Заполните профиль",
        lead: "Его видят партнёры и клиенты. Без профиля сертификат не создать.",
        steps: steps[role] || steps.agent,
        cta: btn("Перейти к заполнению", "empty:peek", "primary", 'data-es-peek="profile"'),
      };
    }
    default:
      return null;
  }
}

function resolve(page, role, employerRole) {
  let c = copy(page, role);
  if (!c) return null;
  if (!c.title) {
    // объект по ролям
    c = c[role] || c[employerRole] || c.store || Object.values(c)[0];
  }
  return c;
}

// ───────────────────────── Render ─────────────────────────
function cardArt(label) {
  return `<div class="es-card" aria-hidden="true"><div class="es-card-top"><span class="es-card-brand">Rem<em>Card</em></span><span class="es-card-chip"></span></div><div class="es-card-sum">0 ₽</div><div class="es-card-foot"><span>${esc(label)}</span><span class="es-card-num">•••• 0000</span></div></div>`;
}

function clientsCopy(direction, readOnly) {
  if (direction === "at-partners") {
    return {
      icon: "users",
      kicker: "Мои клиенты у партнёров",
      title: "Здесь появятся клиенты, которых вы направили",
      lead: "Создайте сертификат и передайте его клиенту. Когда принимающий партнёр зарегистрирует обращение, здесь появятся его этапы и покупка.",
      steps: [
        step("ticket", "Создайте сертификат", "Выберите партнёра и условия"),
        step("share", "Передайте его клиенту", "Клиент покажет QR или код партнёру"),
        step("bag", "Следите за обращением", "После регистрации у партнёра: этапы и покупка"),
      ],
      cta: readOnly ? "" : btn("Создать сертификат", "action:recommend"),
      foot: "Сам по себе сертификат не создаёт обращение, покупку или начисление.",
    };
  }
  const action = (label, view, kind) =>
    `<button type="button" class="btn ${kind}" data-ca-action="nav:${view}">${label}</button>`;
  return {
    icon: "users",
    kicker: "Клиенты у меня",
    title: "Здесь начнётся работа с вашими клиентами",
    lead: readOnly
      ? "Здесь появятся обращения вашей команды. В режиме просмотра создание и изменение обращений недоступны."
      : "Примите сертификат клиента или добавьте обращение вручную. В одной карточке будут запрос, этапы работы и покупка.",
    steps: [
      step("scan", "Зарегистрируйте обращение", "По сертификату или вручную"),
      step("users", "Работайте с клиентом", "Сохраняйте запрос и обновляйте этапы"),
      step("bag", "Оформите покупку", "В этом же обращении, с возвратом в карточку"),
    ],
    cta: readOnly ? "" : action("Сканировать сертификат", "scan", "primary"),
    alt: readOnly ? "" : action("Добавить клиента", "manual", "ghost"),
    foot: readOnly
      ? "Доступные действия определяются назначенными правами."
      : "Обращение появляется до покупки. Покупка и начисления учитываются отдельно.",
  };
}

export function renderEmptyState({ page, role, employerRole, clientsDirection, readOnly = false }) {
  const c = page === "clients"
    ? clientsCopy(clientsDirection || (role === "agent" ? "at-partners" : "incoming"), readOnly)
    : resolve(page, role, employerRole);
  if (!c) return null;
  const art = c.art === "card" ? cardArt(SELLER(role) ? "начислений пока нет" : "к получению") : `<div class="es-art" aria-hidden="true">${svg(c.icon)}</div>`;
  return `<section class="es" data-testid="empty-state" data-es-page="${esc(page)}">
  <div class="es-hero ${c.art === "card" ? "is-card" : ""}">
    ${art}
    <div class="es-hero-text">
      <span class="es-kicker">${esc(c.kicker)}</span>
      <h2 class="es-title">${esc(c.title)}</h2>
      <p class="es-lead">${esc(c.lead)}</p>
      <div class="es-actions">${c.cta || ""}${c.alt || ""}</div>
    </div>
  </div>
  <ol class="es-steps">${c.steps
    .map(
      (s, n) =>
        `<li class="es-step"><span class="es-num">${n + 1}</span><span class="es-step-ico">${svg(s.icon)}</span><div><strong>${esc(s.title)}</strong><small>${esc(s.note)}</small></div></li>`,
    )
    .join("")}</ol>
  <div class="es-foot"><span>${esc(c.foot || "Раздел заполнится сам, когда появятся первые данные.")}</span><button type="button" class="linkbtn" data-action="empty:demo" data-testid="es-show-demo">Посмотреть на примере</button></div>
</section>`;
}

// ───────────────────────── State / controls ─────────────────────────
// Состояние держим в памяти; window.rcDemoMemory — только как необязательная память между перезагрузками
// (во встроенном фрейме доступ к хранилищу может быть запрещён, тогда работаем без него).
let datasetEmpty = (() => {
  try {
    const requested = new URLSearchParams(window.location.search).get("dataset");
    if (requested === "empty" || requested === "demo") return requested === "empty";
    return window.rcDemoMemory.getItem(STORAGE_KEY) === "empty";
  } catch {
    return false;
  }
})();

export function emptyDatasetOn() {
  return datasetEmpty;
}

function setDataset(value) {
  datasetEmpty = value === "empty";
  try {
    datasetEmpty ? window.rcDemoMemory.setItem(STORAGE_KEY, "empty") : window.rcDemoMemory.removeItem(STORAGE_KEY);
  } catch {}
  peeked.clear();
}

export function emptyStateActive(page) {
  return emptyDatasetOn() && !peeked.has(page);
}

export function renderDatasetControl() {
  const on = emptyDatasetOn();
  return `<label>Данные<select data-control="dataset" data-testid="scenario-dataset" aria-label="Данные в кабинете"><option value="demo" ${on ? "" : "selected"}>Демо</option><option value="empty" ${on ? "selected" : ""}>Новый партнёр · пусто</option></select></label>`;
}

export function emptyHeaderPill(page) {
  if (!emptyDatasetOn()) return "";
  return peeked.has(page)
    ? '<span class="pill">Новый партнёр · открыт раздел</span>'
    : '<span class="pill accent">Новый партнёр</span>';
}

export function createEmptyStates({ refresh }) {
  return {
    change(e) {
      if (e.target?.dataset?.control !== "dataset") return false;
      setDataset(e.target.value);
      refresh();
      return true;
    },
    click(e) {
      const t = e.target.closest("[data-action]");
      if (!t) return false;
      if (t.dataset.esPeek) peeked.add(t.dataset.esPeek);
      const [a, s] = t.dataset.action.split(":");
      if (a !== "empty") {
        if (t.dataset.esPeek) refresh();
        return false;
      }
      if (s === "demo") {
        setDataset("demo");
        const sel = document.querySelector('[data-control="dataset"]');
        if (sel) sel.value = "demo";
      }
      refresh();
      return true;
    },
  };
}
