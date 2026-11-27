import { renderWelcome, hydrateWelcome } from "./registration-welcome.js";
// A self-contained demonstration. No credentials, messages or production writes.
export const entryState = {
  provider: "MAX",
  returning: false,
  accepted: false,
  invite: false,
  resend: false,
  registering: false,
  dataStep: 0,
  dataDone: false,
  source: null,
  chosen: false,
};
const screens = new Set(["welcome", "entry-login", "entry-data", "entry-code", "entry-consents", "entry-ready"]);
export const isEntryScreen = (screen) => screens.has(screen);
const rolePlans = {
  agent: {
    title: "Начните с партнёров",
    intro: "Для старта агенту достаточно имени и города.",
    later: "Аудиторию, контакты и реквизиты можно дополнить позже в профиле.",
    next: "Найдите партнёра для сотрудничества",
    description: "Изучите условия партнёров. Затем создайте сертификат для клиента и поделитесь им.",
    action: "Перейти к партнёрам", target: "partners",
    steps: ["Найти партнёра", "Создать сертификат", "Поделиться с клиентом"],
  },
  specialist: {
    title: "Начните со своих проектов",
    intro: "Имя и город работы — всё, что нужно специалисту для первого входа.",
    later: "Специализацию, направления работы, контакты и публикацию в каталоге настройте позже.",
    next: "Подберите партнёров для ваших клиентов",
    description: "Найдите магазины и исполнителей для своих проектов. Создавайте сертификаты и отслеживайте обращения клиентов.",
    action: "Найти партнёров", target: "partners",
    steps: ["Подобрать партнёров", "Рекомендовать клиентам", "Следить за результатом"],
  },
  store: {
    title: "Подготовьте кабинет магазина",
    intro: "Имя представителя, название магазина и город. Документы и полный каталог сейчас не нужны.",
    later: "Категории товаров, условия сотрудничества, команду и реквизиты добавляйте по мере необходимости.",
    next: "Подготовьте предложение магазина",
    description: "Укажите категории товаров и настройте условия для партнёров в профиле. Регистрация сама по себе не публикует магазин и не включает программу.",
    action: "Настроить профиль магазина", target: "profile",
    steps: ["Указать категории товаров", "Подготовить условия", "Пригласить партнёров"],
  },
  company: {
    title: "Создайте рабочее пространство компании",
    intro: "Начнём с представителя, названия компании и города.",
    later: "Направления работы, условия, команду, филиалы и реквизиты можно настроить позже.",
    next: "Расскажите о работе компании",
    description: "Добавьте направления и услуги в профиль. Затем подготовьте предложение и подключайте партнёров, когда будете готовы.",
    action: "Настроить профиль компании", target: "profile",
    steps: ["Добавить направления", "Подготовить предложение", "Подключить партнёров"],
  },
  employee: {
    title: "Присоединитесь к своей команде",
    intro: "Нужны только ваши ФИО. Компания, должность и права доступа берутся из приглашения.",
    later: "Сотрудник не назначает себе права и не получает доступ к организации только по её названию.",
    next: "Откройте рабочее пространство",
    description: "В кабинете будут только разделы и действия, которые доступны вам по приглашению организации.",
    action: "Перейти к работе", target: "home",
    steps: ["Получить приглашение", "Подтвердить свои данные", "Работать в рамках доступа"],
  },
};
const roleLabels = { agent: "Агент", specialist: "Специалист", store: "Магазин", company: "Компания", employee: "Сотрудник" };
const roleFields = {
  agent: [
    { key: "name", title: "Как к вам обращаться?", label: "Ваше имя", placeholder: "Например, Анна", help: "Так вас будут видеть клиенты и партнёры." },
    { key: "city", title: "В каком городе вы работаете?", label: "Город", placeholder: "Например, Краснодар", help: "Подберём партнёров рядом с вами. Город можно изменить позже." },
  ],
  specialist: [
    { key: "name", title: "Представьтесь клиентам и партнёрам", label: "Как к вам обращаться", placeholder: "Например, Алексей", help: "Это имя будет использоваться в сертификатах и общении." },
    { key: "city", title: "Где вы работаете?", label: "Город работы", placeholder: "Например, Краснодар", help: "Специализацию и направления работы добавите позже в профиле." },
  ],
  store: [
    { key: "name", title: "Кто будет вести кабинет?", label: "Имя представителя", placeholder: "Например, Анна", help: "Личные данные представителя хранятся отдельно от названия магазина." },
    { key: "organization", title: "Как называется ваш магазин?", label: "Название магазина", placeholder: "Например, Дом материалов", help: "Можно указать привычное покупателям название. Юридические реквизиты сейчас не нужны." },
    { key: "city", title: "В каком городе находится магазин?", label: "Город", placeholder: "Например, Краснодар", help: "Другие точки и команду можно добавить после регистрации." },
  ],
  company: [
    { key: "name", title: "Кто будет представлять компанию?", label: "Имя представителя", placeholder: "Например, Анна", help: "Этот человек начинает работу в кабинете компании." },
    { key: "organization", title: "Как называется ваша компания?", label: "Название компании", placeholder: "Например, РемСтрой", help: "Укажите коммерческое название. Юридическое лицо и реквизиты можно добавить позже." },
    { key: "city", title: "С какого города начнём?", label: "Город", placeholder: "Например, Краснодар", help: "Направления работы, филиалы и команду настроите в кабинете." },
  ],
  employee: [
    { key: "name", title: "Как вас зовут?", label: "ФИО", placeholder: "Например, Алексей Иванов", help: "Чтобы коллеги узнали вас. Организацию и права задаёт приглашение." },
    { key: "inviteCode", title: "Есть приглашение от команды?", label: "Код приглашения", placeholder: "TEAM-DEMO", help: "Демонстрационный код: TEAM-DEMO. Без приглашения можно создать аккаунт, но нельзя открыть данные организации.", optional: true },
  ],
};
export function beginRegistration(state, role = null) {
  entryState.registering = true;
  entryState.returning = false;
  entryState.accepted = false;
  entryState.dataStep = 0;
  entryState.dataDone = false;
  entryState.source = role;
  entryState.chosen = Boolean(role);
  if (role && rolePlans[role]) state.role = role;
  state.screen = "choose";
}
export function initializeEntry(state) {
  const role = location.hash.match(/^#register\/(agent|specialist|store|company|employee)$/)?.[1];
  if (role) beginRegistration(state, role);
}
const button = (text, action, primary = false) =>
  `<button type="button" class="btn${primary ? " primary" : ""}" data-entry="${action}">${text}</button>`;

function progress(step) {
  return `<ol class="entry-progress" aria-label="Этапы регистрации">${["Тип партнёра", "Ваши данные", "Подтверждение", "Кабинет"].map((name, index) =>
    `<li${index + 1 === step ? ' aria-current="step"' : ""}><span>${index + 1 < step ? "✓" : index + 1}</span>${name}</li>`).join("")}</ol>`;
}
function main(content, step = 1, wide = false) {
  return `<main id="main" class="registration entry-page${wide ? " entry-wide" : ""}" tabindex="-1">${step ? progress(step) : ""}${content}<p class="entry-disclaimer">Интерактивный прототип. Вход, согласия и регистрация демонстрационные: сообщения не отправляются, рабочие аккаунты не создаются.</p></main>`;
}
export function renderEntry(screen, { role, roleLabel, name, draft = {}, employeeInvited, employerName, escape: esc }) {
  const plan = rolePlans[role] || rolePlans.agent;
  const employee = role === "employee";
  const partnershipInvite = entryState.invite && !employee;
  if (screen === "welcome") return renderWelcome({ entryState, roleLabels, button });
  if (screen === "entry-data") {
    const fields = roleFields[role] || roleFields.agent;
    const index = Math.min(entryState.dataStep, fields.length - 1);
    const field = fields[index];
    return main(`
      <div class="entry-role-context"><span class="pill">${esc(roleLabel)}</span><span class="small">Регистрация партнёра</span>${button("Изменить тип", "change-role")}</div>
      <div class="form-layout">
        <section class="panel stack"><div class="row between"><span class="eyebrow">Ваши данные · шаг ${index + 1} из ${fields.length}</span><span class="small">${field.optional ? "Можно пропустить" : "Обязательный шаг"}</span></div>
          <div class="entry-data-track" aria-hidden="true">${fields.map((_, n) => `<span class="${n <= index ? "done" : ""}"></span>`).join("")}</div>
          <h1>${field.title}</h1>
          <form id="entry-data-form" class="stack" novalidate>
            <label class="field" for="entry-data-input">${field.label}${field.optional ? " · необязательно" : " *"}<input id="entry-data-input" name="${field.key}" value="${esc(draft[field.key] || "")}" maxlength="100" autocomplete="${field.key === "name" ? "name" : field.key === "city" ? "address-level2" : "off"}" placeholder="${field.placeholder}" ${field.optional ? "" : "required"} aria-describedby="entry-data-help entry-data-error"></label>
            <p id="entry-data-help" class="small">${field.help}</p>
            <p id="entry-data-error" class="field-error" role="alert"></p>
            <div class="form-footer">${button("Назад", "data-back")}<button class="btn primary" type="submit">${index < fields.length - 1 ? "Продолжить" : "К подтверждению"}</button></div>
            ${field.optional ? button("У меня пока нет приглашения", "skip-invite") : ""}
          </form>
        </section>
        <aside class="panel stack"><span class="eyebrow">${esc(roleLabel)}</span><h2>Без лишних вопросов на старте</h2><p class="muted">${plan.intro}</p><ol class="entry-role-roadmap">${plan.steps.map((step) => `<li>${step}</li>`).join("")}</ol><p class="small">${plan.later}</p></aside>
      </div>`, 2);
  }
  if (screen === "entry-login") return main(`
    <section class="panel stack entry-single">
      <span class="eyebrow">${entryState.returning ? "Вход в кабинет" : `Регистрация · ${esc(roleLabel)}`}</span>
      <h1>${entryState.returning ? "С возвращением" : "Осталось подтвердить вход"}</h1>
      <p class="muted">${entryState.returning ? "Выберите способ, уже привязанный к вашему аккаунту. Повторно проходить регистрацию не нужно." : "Ваши данные сохранены в этом прототипе. Подтвердите вход через MAX или Telegram, затем примите условия."}</p>
      ${entryState.returning ? "" : `<dl class="entry-data-summary">${(roleFields[role] || []).filter(f => draft[f.key]).map(f => `<div><dt>${f.label}</dt><dd>${esc(draft[f.key])}</dd></div>`).join("")}</dl>`}
      <div class="entry-providers">
        <button class="btn primary" type="button" data-entry="provider-max"><span class="entry-provider-mark" aria-hidden="true">M</span>Продолжить с MAX<span aria-hidden="true">↗</span></button>
        <button class="btn" type="button" data-entry="provider-telegram"><span class="entry-provider-mark" aria-hidden="true">T</span>Продолжить с Telegram<span aria-hidden="true">↗</span></button>
      </div>
      <p class="small">В прототипе открывать мессенджер не нужно: используйте демонстрационный код 104827.</p>
      ${button(entryState.returning ? "Назад" : "Вернуться к данным", entryState.returning ? "back-welcome" : "back-data")}
      ${entryState.returning ? button("Нет аккаунта? Регистрация", "register") : button("Уже есть аккаунт? Войти", "sign-in")}
    </section>`, entryState.returning ? 0 : 3);
  if (screen === "entry-code") return main(`
    <section class="panel stack entry-single">
      <span class="eyebrow">${entryState.returning ? "Повторный вход" : "Подтверждение входа"} · ${entryState.provider}</span>
      <h1>Введите одноразовый код</h1>
      <p class="muted">В рабочем сервисе код приходит от бота ${entryState.provider}. В прототипе используйте код ниже — открывать мессенджер не нужно.</p>
      <div class="entry-demo-code"><span>Демонстрационный код</span><strong>104827</strong></div>
      <form id="entry-code-form" class="stack" novalidate>
        <label class="field" for="entry-code">Код из 6 цифр<input id="entry-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" aria-describedby="entry-code-error"></label>
        <p id="entry-code-error" class="field-error" role="alert"></p>
        <button class="btn primary" type="submit">Подтвердить и продолжить</button>
      </form>
      <div class="row between">${button("Другой способ входа", "back-login")}${button("Получить код повторно", "resend")}</div>
      <p class="small" role="status">${entryState.resend ? "Демокод обновлён: 104827. Сообщение не отправлялось." : "Код подтверждает вход, а не создаёт новый аккаунт при каждом посещении."}</p>
    </section>`, entryState.returning ? 0 : 3);
  if (screen === "entry-consents") return main(`
    <section class="panel stack entry-single">
      <span class="eyebrow">Перед началом работы</span><h1>Ознакомьтесь с условиями</h1>
      <p class="muted">Показываем документы один раз при первом входе. Рекламных рассылок и дополнительных согласий здесь нет.</p>
      ${entryState.invite ? '<p class="notice">Приглашение от «Дом материалов» сохранено.</p>' : ""}
      <form id="entry-consents-form" class="stack" novalidate>
        <div class="entry-document"><button class="linkbtn" type="button" data-entry="document-terms">Условия использования RemCard</button><label class="check"><input type="checkbox" name="terms"><span>Принимаю условия использования</span></label></div>
        <div class="entry-document"><button class="linkbtn" type="button" data-entry="document-data">Обработка персональных данных</button><label class="check"><input type="checkbox" name="personal"><span>Даю согласие на обработку персональных данных для работы в сервисе</span></label></div>
        <p class="field-error" id="entry-consent-error" role="alert"></p>
        <div class="form-footer">${button("Назад", "back-code")}<button class="btn primary" type="submit">Принять и продолжить</button></div>
      </form><p class="small">Документы в прототипе — пояснение сценария, не юридическая оферта и не запись согласия в рабочей системе.</p>
    </section>`, 3);
  if (screen === "entry-ready") return main(`
    <section class="panel stack entry-single">
      <span class="pill ${employee && !employeeInvited ? "" : "good"}">${employee && !employeeInvited ? "Нужно приглашение" : "Можно начинать"}</span>
      <h1>${partnershipInvite ? "Приглашение ждёт вас" : employee && !employeeInvited ? "Осталось подключиться к команде" : `Добро пожаловать${name ? `, ${esc(name)}` : ""}`}</h1>
      <p class="muted">${employee ? employeeInvited ? `Демоприглашение принято. Организация: ${esc(employerName)}. Доступ назначен вашей командой.` : "Ваши данные заполнены, но доступа к организации пока нет. Попросите владельца или управляющего прислать приглашение." : `Кабинет настроен: ${esc(roleLabel)}. Дополнительные сведения заполните, когда они понадобятся для конкретной задачи.`}</p>
      <div class="entry-next"><span class="eyebrow">Ваш первый шаг</span><h2>${partnershipInvite ? "Посмотрите предложение партнёра" : employee && !employeeInvited ? "Получите приглашение от организации" : plan.next}</h2><p>${partnershipInvite ? "Предложение «Дома материалов» сохранено. Решение о сотрудничестве принимаете вы." : employee && !employeeInvited ? "Код приглашения связывает вас с конкретной организацией и назначенными правами. Самостоятельный выбор чужой компании не открывает её данные." : plan.description}</p></div>
      ${button(partnershipInvite ? "Посмотреть приглашение" : employee && !employeeInvited ? "Ввести код приглашения" : plan.action, partnershipInvite ? "open-partners" : employee && !employeeInvited ? "employee-invite" : `open-${plan.target}`, true)}
      ${button("Сначала посмотреть кабинет", "open-cabinet")}
      <p class="small">${plan.later}</p>
    </section>`, 4);
  return "";
}

export function hydrateEntry({ root, state, render, dialog }) {
  hydrateWelcome(root);
  const adminEntryHost = state.screen === "welcome"
    ? root.querySelector(".welcome-footer")
    : state.screen === "entry-login" && entryState.returning
      ? root.querySelector("#main")
      : null;
  if (adminEntryHost) {
    adminEntryHost.insertAdjacentHTML("beforeend", '<div class="entry-admin-access"><button type="button" class="entry-admin-link" data-entry="admin-login" data-testid="admin-login-open">Администратору</button></div>');
  }
  root.querySelector("#main")?.classList.toggle("entry-flow", state.screen !== "cabinet" && state.screen !== "signed-out");
  if (state.screen === "choose") {
    const grid = root.querySelector(".role-grid");
    Object.keys(roleLabels).forEach((key) => grid.append(root.querySelector(`[data-testid="choose-${key}"]`)));
    if (!entryState.chosen) {
      grid.querySelectorAll(".role-card").forEach((card) => {
        card.setAttribute("aria-pressed", "false");
        card.querySelector(".selection")?.remove();
      });
    }
    root.querySelector('[data-action="continue"]').disabled = !entryState.chosen;
    root.querySelector(".intro .eyebrow").textContent = "Регистрация · шаг 1 из 4";
    root.querySelector(".intro h1").textContent = "Какой тип партнёрства вам подходит?";
    root.querySelector(".intro>.muted").textContent = "Сравните варианты и выберите, как планируете работать. Затем начнём заполнять данные по шагам.";
    root.querySelector(".intro").insertAdjacentHTML("beforebegin", progress(1));
    if (entryState.source) {
      root.querySelector(".intro").insertAdjacentHTML("beforeend", `<p class="notice entry-source-note">Вы пришли с лендинга «${roleLabels[entryState.source]}». Сравните все типы: можно оставить предложенный вариант или выбрать другой.</p>`);
    }
    root.querySelector(".choice-footer").insertAdjacentHTML("beforeend", button("Уже есть аккаунт? Войти", "sign-in"));
  }
  // Preserve the old role-specific form, but do not ask for consent twice.
  if (state.screen === "form" && entryState.accepted) {
    const plan = rolePlans[state.role] || rolePlans.agent;
    root.querySelector(".intro h1").textContent = plan.title;
    root.querySelector(".intro>.muted").textContent = plan.intro;
    const aside = root.querySelector(".form-layout>aside");
    if (aside) {
      aside.innerHTML = `<span class="eyebrow">После первого входа</span><h2>${state.role === "employee" ? "Только ваша работа" : "Ваш путь к первому результату"}</h2><ol class="entry-role-roadmap">${plan.steps.map((step) => `<li>${step}</li>`).join("")}</ol><p class="small">${plan.later}</p>`;
    }
    const label = root.querySelector('[data-testid="consent"]')?.closest("label");
    if (label) label.outerHTML = '<p class="small entry-consent-done">Условия и согласие на обработку данных уже приняты на предыдущем шаге.</p>';
    const steps = root.querySelector(".steps");
    if (steps) steps.innerHTML = progress(3);
    root.querySelector("#registration-form")?.addEventListener("input", () => {
      root.querySelector("#form-error").textContent = "";
    });
  }
  root.querySelectorAll("[data-entry]").forEach((el) => el.addEventListener("click", () => {
    const action = el.dataset.entry;
    const saveData = () => {
      const form = root.querySelector("#entry-data-form");
      if (form) state.drafts[state.role] = { ...state.drafts[state.role], ...Object.fromEntries(new FormData(form)) };
    };
    if (action === "admin-login") {
      dialog("Вход администратора", `
        <form id="entry-admin-form" class="stack" data-testid="admin-login-form">
          <p class="muted">Служебный вход. Для партнёров используйте MAX или Telegram.</p>
          <label class="field" for="entry-admin-login">Логин<input id="entry-admin-login" name="login" autocomplete="off" autocapitalize="none" spellcheck="false" required data-testid="admin-login-input"></label>
          <label class="field" for="entry-admin-password">Пароль<input id="entry-admin-password" name="password" type="password" autocomplete="off" required data-testid="admin-password-input"></label>
          <p class="small">Это макет. Не вводите настоящий пароль: вход в рабочую систему здесь не выполняется.</p>
          <p id="entry-admin-status" class="small" role="status" aria-live="polite"></p>
          <button type="submit" class="btn primary" data-testid="admin-login-submit">Войти</button>
        </form>`);
      const adminForm = document.querySelector("#entry-admin-form");
      adminForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        adminForm.elements.password.value = "";
        document.querySelector("#entry-admin-status").textContent = "Демонстрация: данные не отправлены. Рабочий вход будет подключён при реализации.";
      });
      document.querySelector("#entry-admin-login")?.focus();
      return;
    } else if (action === "register") {
      beginRegistration(state);
    } else if (action.startsWith("landing-")) {
      beginRegistration(state, action.slice("landing-".length));
    } else if (action === "sign-in") {
      saveData();
      entryState.returning = true;
      entryState.registering = false;
      state.screen = "entry-login";
    } else if (action === "change-role") {
      saveData();
      state.screen = "choose";
      entryState.dataStep = 0;
    } else if (action === "data-back") {
      saveData();
      if (entryState.dataStep > 0) entryState.dataStep--;
      else state.screen = "choose";
    } else if (action === "back-data") {
      entryState.dataStep = (roleFields[state.role] || roleFields.agent).length - 1;
      state.screen = "entry-data";
    } else if (action === "skip-invite") {
      saveData();
      state.drafts.employee.inviteCode = "";
      state.invite = "none";
      entryState.dataDone = true;
      state.screen = entryState.accepted ? "entry-ready" : "entry-login";
    } else if (action.startsWith("provider-")) {
      entryState.provider = action === "provider-max" ? "MAX" : "Telegram";
      entryState.resend = false;
      state.screen = "entry-code";
    } else if (action === "back-welcome") state.screen = "welcome";
    else if (action === "back-login") state.screen = "entry-login";
    else if (action === "back-code") state.screen = "entry-code";
    else if (action === "resend") entryState.resend = true;
    else if (action === "returning") {
      entryState.returning = true;
      state.screen = "entry-code";
    } else if (action === "invite") {
      entryState.invite = true;
      entryState.returning = false;
    } else if (action.startsWith("document-")) {
      dialog(action === "document-terms" ? "Условия использования" : "Обработка персональных данных",
        '<div class="stack"><p>Демонстрация экрана документов. Перед реализацией здесь будут размещены актуальные юридические тексты с версией и датой.</p><p>В рабочем сервисе принятие должно фиксироваться на сервере. Этот прототип не собирает юридически значимые согласия.</p></div>');
      return;
    } else if (action === "employee-invite") {
      entryState.dataStep = 1;
      state.screen = "entry-data";
    } else if (["open-partners", "open-cabinet", "open-home", "open-profile"].includes(action)) {
      state.screen = "cabinet";
      state.page = action === "open-partners" ? "partners" : action === "open-profile" ? "profile" : "home";
      if (entryState.invite && action === "open-partners") {
        state.notice = "Сохранённое демоприглашение: «Дом материалов». Посмотрите условия и решите, подходит ли сотрудничество. Автоматического принятия нет.";
      }
    }
    render();
  }));
  root.querySelector("#entry-data-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = roleFields[state.role] || roleFields.agent;
    const field = fields[entryState.dataStep];
    const input = event.target.elements[field.key];
    const value = input.value.trim();
    if ((!field.optional && !value) || (field.key === "inviteCode" && value && value !== "TEAM-DEMO")) {
      root.querySelector("#entry-data-error").textContent = field.key === "inviteCode"
        ? "Демоприглашение не найдено. Используйте TEAM-DEMO или продолжите без приглашения."
        : "Заполните это поле, чтобы продолжить.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    state.drafts[state.role] = { ...state.drafts[state.role], [field.key]: value };
    if (field.key === "inviteCode") state.invite = value === "TEAM-DEMO" ? "valid" : "none";
    if (entryState.dataStep < fields.length - 1) {
      entryState.dataStep++;
    } else {
      entryState.dataDone = true;
      state.screen = entryState.accepted ? "entry-ready" : "entry-login";
    }
    render();
  });
  root.querySelector("#entry-code-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.target.elements.code;
    if (input.value.trim() !== "104827") {
      root.querySelector("#entry-code-error").textContent = "Неверный код. Для проверки прототипа введите 104827.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    state.screen = entryState.returning ? (entryState.invite ? "entry-ready" : "cabinet") : "entry-consents";
    if (entryState.returning) state.page = "home";
    render();
  });
  root.querySelector("#entry-consents-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    if (!form.elements.terms.checked || !form.elements.personal.checked) {
      root.querySelector("#entry-consent-error").textContent = "Для продолжения примите условия и согласие на обработку данных.";
      (!form.elements.terms.checked ? form.elements.terms : form.elements.personal).focus();
      return;
    }
    entryState.accepted = true;
    state.screen = "entry-ready";
    render();
  });
}
