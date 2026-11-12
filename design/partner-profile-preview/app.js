(function () {
  "use strict";

  /** @typedef {{ id: string, kind: string, displayName: string, organizationName: string|null, personalAlias: string|null, city: string|null, statusLabel: string, photo: string|null, about: string|null, products: string[], services: string[], stages: string[], geography: string[], contact: {name:string|null, phone:string|null, email:string|null}, cooperation: {status:string, since:string, terms:string, note:string} }} PartnerFixture */

  const VIEWER = {
    id: "usr_demo_viewer_maria",
    kind: "specialist",
    displayName: "Мария Орлова",
    organizationName: null,
    personalAlias: null,
    city: "Казань",
    statusLabel: "Сотрудничает",
    photo: null,
    about:
      "Специалист по мебели и кухням. Работаю с проверенными магазинами и брендами, без скрытых комиссий для клиента.",
    products: ["Мебель", "Кухни"],
    services: ["Подбор поставщиков", "Комплектация"],
    stages: ["Подбор", "Замер"],
    geography: ["Казань", "Татарстан"],
    contact: {
      name: "Мария Орлова",
      phone: "+7 917 000-00-11",
      email: "maria.demo@example.invalid",
    },
    cooperation: {
      status: "Активно",
      since: "март 2025",
      terms: "Базовые условия по направлению «Мебель»",
      note: "Демо: условия только для этой пары.",
    },
  };

  /** @type {PartnerFixture[]} */
  const PARTNERS = [
    {
      id: "usr_demo_agent_k7m2",
      kind: "agent",
      displayName: "Андрей Ким",
      organizationName: null,
      personalAlias: null,
      city: "Москва",
      statusLabel: "Сотрудничает",
      photo: null,
      about:
        "Рекомендую проверенные магазины и специалистов. Публикую короткие обзоры и помогаю клиентам с выбором.",
      products: [],
      services: ["Рекомендации", "Консультации"],
      stages: ["Привлечение", "Сопровождение"],
      geography: ["Москва", "МО"],
      contact: {
        name: "Андрей Ким",
        phone: "+7 926 111-22-33",
        email: "andrey.demo@example.invalid",
      },
      cooperation: {
        status: "Активно",
        since: "январь 2025",
        terms: "Стандартные условия агента по направлению «Мебель»",
        note: "Ваше сотрудничество: вы — специалист, контрагент — агент.",
      },
    },
    {
      id: "usr_demo_spec_elena",
      kind: "specialist",
      displayName:
        "Елена Соколова-Виноградова — дизайнер интерьеров премиум-сегмента",
      organizationName: null,
      personalAlias: "Елена · дизайн",
      city: "Санкт-Петербург",
      statusLabel: "Сотрудничает",
      photo: null,
      about:
        "Проектирую жилые пространства и подбираю материалы. Открыта к долгим коллаборациям с магазинами.",
      products: ["Мебель", "Свет", "Керамика"],
      services: ["Дизайн-проект", "Авторский надзор"],
      stages: ["Концепция", "Комплектация"],
      geography: ["Санкт-Петербург", "Ленобласть"],
      contact: {
        name: "Елена Соколова",
        phone: "+7 812 555-66-77",
        email: "elena.demo@example.invalid",
      },
      cooperation: {
        status: "Активно",
        since: "ноябрь 2024",
        terms: "Индивидуальные условия по направлению «Свет»",
        note: null,
      },
    },
    {
      id: "usr_demo_store_rentech",
      kind: "store",
      displayName: "РемТех на Ленина",
      organizationName: 'ООО «РемТех Северо-Запад»',
      personalAlias: null,
      city: "Казань",
      statusLabel: "Сотрудничает",
      photo: null,
      about:
        "Сеть магазинов стройматериалов и мебели. Работаем с профессионалами по прозрачным условиям.",
      products: ["Мебель", "Кухни", "Стройматериалы"],
      services: [],
      stages: ["Продажа", "Доставка"],
      geography: ["Казань", "Набережные Челны"],
      contact: {
        name: "Отдел партнёрств",
        phone: "+7 843 200-30-40",
        email: "partners.demo@example.invalid",
      },
      cooperation: {
        status: "Активно",
        since: "февраль 2025",
        terms: "Категорийные скидки и фиксированный процент по «Мебель»",
        note: "Организация отличается от названия точки на витрине.",
      },
    },
    {
      id: "usr_demo_company_forma",
      kind: "company",
      displayName: "ФормаПро",
      organizationName: 'ООО «ФормаПро»',
      personalAlias: "ФормаПро · офис",
      city: "Екатеринбург",
      statusLabel: "На паузе",
      photo: null,
      about: "Производство и поставка корпусной мебели для бизнеса и девелоперов.",
      products: ["Корпусная мебель", "Офис"],
      services: ["Логистика", "Монтаж"],
      stages: ["Производство", "Монтаж"],
      geography: ["Екатеринбург", "Урал"],
      contact: {
        name: null,
        phone: null,
        email: null,
      },
      cooperation: {
        status: "Пауза",
        since: "июнь 2024",
        terms: "Условия заморожены до возобновления",
        note: "Контакт для сотрудничества не заполнен — в проде показываем заглушку.",
      },
    },
    {
      id: "usr_demo_sparse_partner",
      kind: "store",
      displayName: "Склад №7",
      organizationName: null,
      personalAlias: null,
      city: null,
      statusLabel: "Ожидает ответа",
      photo: null,
      about: null,
      products: [],
      services: [],
      stages: [],
      geography: [],
      contact: { name: null, phone: null, email: null },
      cooperation: {
        status: "Приглашение",
        since: "—",
        terms: "Условия ещё не согласованы",
        note: null,
      },
    },
  ];

  const KIND_LABEL = {
    agent: "Агент",
    specialist: "Специалист",
    store: "Магазин",
    company: "Компания",
  };

  const listEl = document.getElementById("partner-list");
  const dialogEl = document.getElementById("profile-dialog");
  const dialogBody = document.getElementById("profile-dialog-body");
  const dialogTitle = document.getElementById("profile-dialog-title");
  const perspectiveSelect = document.getElementById("perspective-select");
  const themeToggle = document.getElementById("theme-toggle");
  const viewButtons = document.querySelectorAll("[data-view-mode]");
  let listView = "list";
  /** @type {HTMLElement|null} */
  let lastTrigger = null;
  /** @type {PartnerFixture|null} */
  let selectedPartner = null;
  let perspective = "cabinet";

  function initials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    return (parts[0].slice(0, 1) + (parts[1]?.slice(0, 1) || "")).toUpperCase();
  }

  function partnerTitle(p) {
    if (p.organizationName && p.displayName) {
      return p.displayName;
    }
    return p.displayName;
  }

  function subtitleLine(p) {
    const type = KIND_LABEL[p.kind] || "Партнёр";
    const city = p.city?.trim() || "Город не указан";
    return `${type} · ${city}`;
  }

  function chipList(items, emptyCopy) {
    if (!items.length) {
      return `<p class="pp-empty-hint">${emptyCopy}</p>`;
    }
    return `<div class="pw-chips">${items
      .map((t) => `<span class="pw-chip">${escapeHtml(t)}</span>`)
      .join("")}</div>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function contactLines(contact) {
    const name = contact.name?.trim();
    const phone = contact.phone?.trim();
    const email = contact.email?.trim();
    if (!name && !phone && !email) {
      return '<p class="pp-empty-hint">Партнёр пока не добавил контакт для сотрудничества.</p>';
    }
    const rows = [];
    if (name) rows.push(`<li><strong>Имя:</strong> ${escapeHtml(name)}</li>`);
    if (phone) rows.push(`<li><strong>Телефон:</strong> ${escapeHtml(phone)}</li>`);
    if (email) rows.push(`<li><strong>Email:</strong> ${escapeHtml(email)}</li>`);
    return `<ul>${rows.join("")}</ul>`;
  }

  function activeProfile() {
    if (perspective === "reciprocal" && selectedPartner) {
      return {
        profile: VIEWER,
        cooperation: {
          status: selectedPartner.cooperation.status,
          since: selectedPartner.cooperation.since,
          terms: `Как видит «${selectedPartner.displayName}»: ${VIEWER.cooperation.terms}`,
          note: `Зеркальный просмотр: ${selectedPartner.displayName} открывает ваш профиль.`,
        },
        reciprocal: selectedPartner.displayName,
      };
    }
    if (!selectedPartner) return null;
    return {
      profile: selectedPartner,
      cooperation: selectedPartner.cooperation,
      reciprocal: null,
    };
  }

  function renderProfile() {
    const ctx = activeProfile();
    if (!ctx || !selectedPartner) return;

    const p = ctx.profile;
    const orgLine =
      p.organizationName && p.displayName
        ? `<p class="pw-org-line">Официально: <strong>${escapeHtml(p.organizationName)}</strong></p>`
        : p.organizationName
          ? `<p class="pw-org-line"><strong>${escapeHtml(p.organizationName)}</strong></p>`
          : "";
    const aliasLine = p.personalAlias
      ? `<p class="pw-org-line">Личный алиас в списке: <strong>${escapeHtml(p.personalAlias)}</strong></p>`
      : "";

    const reciprocalNote = ctx.reciprocal
      ? `<p class="pp-reciprocal-note">Как видит партнёр «${escapeHtml(ctx.reciprocal)}» — та же структура профиля, без данных регистрации и витрины.</p>`
      : "";

    const about = p.about?.trim()
      ? escapeHtml(p.about)
      : '<span class="pp-empty-hint">Партнёр пока не добавил описание.</span>';

    dialogTitle.textContent = perspective === "reciprocal"
      ? "Профиль (зеркальный просмотр)"
      : "Профиль партнёра";

    dialogBody.innerHTML = `
      ${reciprocalNote}
      <section class="pw-summary" data-testid="pw-summary">
        <div class="pw-summary-header">
          <div class="pw-avatar" aria-hidden="true">${escapeHtml(initials(p.displayName))}</div>
          <div class="pw-summary-identity">
            <span class="pw-kicker">${escapeHtml(KIND_LABEL[p.kind] || "Партнёр")}</span>
            <h2>${escapeHtml(partnerTitle(p))}</h2>
            <p class="pw-city-muted">${escapeHtml(p.city?.trim() || "Город не указан")}</p>
            ${orgLine}
            ${aliasLine}
          </div>
          <span class="pw-status">${escapeHtml(p.statusLabel)}</span>
        </div>
        <dl class="pw-facts">
          <div><dt>Тип</dt><dd>${escapeHtml(KIND_LABEL[p.kind] || "Партнёр")}</dd></div>
          <div><dt>Город</dt><dd>${escapeHtml(p.city?.trim() || "Не указано")}</dd></div>
          <div><dt>Организация</dt><dd>${escapeHtml(p.organizationName?.trim() || "Не указано")}</dd></div>
          <div><dt>Статус сотрудничества</dt><dd>${escapeHtml(ctx.cooperation.status)}</dd></div>
        </dl>
        <div class="pw-review-directions">
          <h3>Направления</h3>
          ${chipList(
            [...p.products, ...p.services, ...p.stages].slice(0, 8),
            "Партнёр пока не указал направления.",
          )}
        </div>
        <div class="pw-summary-actions">
          <div class="pw-id-block">
            <label for="partner-id-field">ID партнёра</label>
            <div class="pw-id-row">
              <div class="pw-id-value" id="partner-id-field" tabindex="0">${escapeHtml(p.id)}</div>
              <button type="button" class="pp-btn" id="copy-partner-id">Копировать</button>
            </div>
            <p class="pw-copy-status" id="copy-status" role="status" aria-live="polite"></p>
            <p class="pp-empty-hint" style="margin-top:6px">Внутренний идентификатор пользователя. Это не publicId и не id партнёрства.</p>
          </div>
        </div>
      </section>
      <section class="pp-section" aria-labelledby="sec-about">
        <h3 id="sec-about">О партнёре</h3>
        <p>${about}</p>
      </section>
      <section class="pp-section" aria-labelledby="sec-directions">
        <h3 id="sec-directions">Направления работы</h3>
        <p style="margin-bottom:8px;font-size:var(--pp-xs);color:var(--pp-muted)">Товары</p>
        ${chipList(p.products, "Не указано")}
        <p style="margin:12px 0 8px;font-size:var(--pp-xs);color:var(--pp-muted)">Услуги</p>
        ${chipList(p.services, "Не указано")}
        <p style="margin:12px 0 8px;font-size:var(--pp-xs);color:var(--pp-muted)">Этапы</p>
        ${chipList(p.stages, "Не указано")}
      </section>
      <section class="pp-section" aria-labelledby="sec-geo">
        <h3 id="sec-geo">География</h3>
        ${
          p.geography.length
            ? `<ul>${p.geography.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>`
            : '<p class="pp-empty-hint">Не указано</p>'
        }
      </section>
      <section class="pp-section" aria-labelledby="sec-contact">
        <h3 id="sec-contact">Контакт для сотрудничества</h3>
        ${contactLines(p.contact)}
      </section>
      <section class="pp-section pp-section--cooperation" aria-labelledby="sec-coop">
        <h3 id="sec-coop">Ваше сотрудничество</h3>
        <ul>
          <li><strong>Статус:</strong> ${escapeHtml(ctx.cooperation.status)}</li>
          <li><strong>С ${escapeHtml(ctx.cooperation.since)}</strong></li>
          <li><strong>Условия:</strong> ${escapeHtml(ctx.cooperation.terms)}</li>
        </ul>
        ${
          ctx.cooperation.note
            ? `<p style="margin-top:10px;font-size:var(--pp-sm);color:var(--pp-muted)">${escapeHtml(ctx.cooperation.note)}</p>`
            : ""
        }
      </section>
    `;

    const copyBtn = document.getElementById("copy-partner-id");
    copyBtn?.addEventListener("click", () => void copyPartnerId(p.id));
  }

  async function copyPartnerId(id) {
    const status = document.getElementById("copy-status");
    if (!status) return;
    status.textContent = "";
    status.classList.remove("is-ok", "is-fail");
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(id);
      status.textContent = "ID скопирован";
      status.classList.add("is-ok");
    } catch {
      status.textContent = "Не удалось скопировать — выделите ID и скопируйте вручную";
      status.classList.add("is-fail");
      const field = document.getElementById("partner-id-field");
      if (field && window.getSelection) {
        const range = document.createRange();
        range.selectNodeContents(field);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  function renderList() {
    listEl.dataset.view = listView;
    listEl.innerHTML = "";
    for (const partner of PARTNERS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pp-partner-card";
      btn.dataset.partnerId = partner.id;
      btn.innerHTML = `
        <div class="pp-avatar" aria-hidden="true">${escapeHtml(initials(partnerTitle(partner)))}</div>
        <div>
          <p class="pp-card-title">${escapeHtml(partnerTitle(partner))}</p>
          <p class="pp-card-sub">${escapeHtml(subtitleLine(partner))}</p>
          ${
            partner.organizationName
              ? `<p class="pp-card-sub">${escapeHtml(partner.organizationName)}</p>`
              : ""
          }
        </div>
        <span class="pp-status-chip">${escapeHtml(partner.statusLabel)}</span>
      `;
      btn.addEventListener("click", () => openProfile(partner, btn));
      listEl.appendChild(btn);
    }
  }

  function openProfile(partner, trigger) {
    selectedPartner = partner;
    lastTrigger = trigger;
    perspective = perspectiveSelect.value;
    renderProfile();
    if (typeof dialogEl.showModal === "function") {
      dialogEl.showModal();
    }
    const closeBtn = document.getElementById("profile-close");
    closeBtn?.focus();
  }

  function closeProfile() {
    if (dialogEl.open) {
      dialogEl.close();
    }
    if (lastTrigger) {
      lastTrigger.focus();
    }
  }

  perspectiveSelect.addEventListener("change", () => {
    perspective = perspectiveSelect.value;
    if (selectedPartner && dialogEl.open) {
      renderProfile();
    }
  });

  document.getElementById("profile-close")?.addEventListener("click", closeProfile);

  dialogEl.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeProfile();
  });

  dialogEl.addEventListener("close", () => {
    if (lastTrigger) {
      lastTrigger.focus();
    }
  });

  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      listView = btn.dataset.viewMode || "list";
      viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      renderList();
    });
  });

  themeToggle.addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "light") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", "dark");
    }
    themeToggle.textContent = next === "dark" ? "Светлая тема" : "Тёмная тема";
  });

  renderList();
})();
