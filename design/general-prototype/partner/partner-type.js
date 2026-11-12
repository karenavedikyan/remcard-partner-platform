// Isolated in-memory prototype interaction. No production API or persistence.
const types = {
  agent: { label: "Агент", description: "Рекомендую партнёров клиентам, друзьям и подписчикам.", changes: "Сертификаты, клиенты, партнёры и кошелёк. Без обязательного каталога и специализации." },
  specialist: { label: "Специалист", description: "Выполняю работы сам или с бригадой.", changes: "Клиенты, сертификаты и партнёры. Специализация и публикация услуг в каталоге заполняются отдельно." },
  store: { label: "Магазин", description: "Продаём товары в одной торговой точке.", changes: "Кабинет магазина: покупатели, сертификаты и расчёты. Потребуются название и данные магазина." },
  company: { label: "Компания", description: "Управляю компанией, сетью или несколькими направлениями.", changes: "Кабинет компании: партнёры, клиенты, команда и филиалы. Потребуются данные организации." },
};
let listeners;
let success = "";
let successRole = "";

export function renderPartnerTypeSettings({ role }) {
  if (role === "employee") return `<section class="panel partner-type-settings" aria-labelledby="partner-type-title">
    <div><h2 id="partner-type-title">Тип партнёрства</h2><p class="partner-type-current">Сотрудник</p>
    <p class="small">Рабочий доступ выдаёт организация по приглашению. Сменить его на доступ владельца или управляющего самостоятельно нельзя.</p></div>
  </section>`;
  if (!types[role]) return "";
  return `<section class="panel partner-type-settings" aria-labelledby="partner-type-title" data-testid="partner-type-settings">
    <div><h2 id="partner-type-title">Тип партнёрства</h2>
      <p class="partner-type-current" data-testid="partner-type-current">${types[role].label}</p>
      <p class="small">Выбрали другой путь? Измените тип в этом аккаунте, без повторной регистрации.</p>
      ${success && successRole === role ? `<p class="partner-type-success" role="status" data-testid="partner-type-success">${success}</p>` : ""}
    </div>
    <button type="button" class="btn" data-partner-type-action="open" data-testid="partner-type-open">Сменить тип партнёрства</button>
  </section>`;
}

export function hydratePartnerTypeSettings({ role, accountId, escape, openDialog, closeDialog, hasUnsavedChanges, apply }) {
  listeners?.abort();
  listeners = new AbortController();
  const { signal } = listeners;
  let selected = role;
  let acknowledgement = false;

  const footer = (primary, action, disabled = false) => `<div class="partner-type-footer"><div class="partner-type-actions">
    <button type="button" class="btn" data-partner-type-action="cancel">Отмена</button>
    <button type="button" class="btn primary" data-partner-type-action="${action}" ${disabled ? "disabled" : ""}>${primary}</button>
  </div></div>`;
  function pinFooter() {
    const dialog = document.querySelector("#role-dialog");
    const footer = dialog?.querySelector(".partner-type-footer");
    if (footer) dialog.append(footer);
  }

  function choose() {
    acknowledgement = false;
    openDialog("Сменить тип партнёрства", `<div class="stack partner-type-dialog" data-testid="partner-type-choose">
      <p>Выберите, как хотите работать в RemCard. Аккаунт останется тем же.</p>
      <fieldset class="partner-type-options"><legend class="sr-only">Новый тип партнёрства</legend>
        ${Object.entries(types).map(([key, value]) => `<label class="partner-type-option">
          <input type="radio" name="partner-type" value="${key}" ${selected === key ? "checked" : ""}>
          <span><strong>${value.label}${key === role ? ' <small class="partner-type-tag">Сейчас</small>' : ""}</strong><span>${value.description}</span></span>
        </label>`).join("")}
      </fieldset>
      <p class="small">«Сотрудник» подключается по приглашению организации. Эта настройка не выдаёт административные права.</p>
      ${footer("Продолжить", "review", selected === role)}
    </div>`);
    pinFooter();
    document.querySelector('input[name="partner-type"]:checked')?.focus();
  }

  function review() {
    if (selected === role || !types[selected]) return;
    openDialog("Подтвердите смену типа", `<div class="stack partner-type-dialog" data-testid="partner-type-review">
      <p class="partner-type-transition">${types[role].label} <span aria-hidden="true">→</span> ${types[selected].label}</p>
      <section><h3>Что изменится</h3><p>${types[selected].changes}</p></section>
      <section><h3>Что сохраняется</h3>
        <p>Тот же аккаунт: <strong>${escape(accountId)}</strong>. Личные контакты, клиенты, сертификаты и история не удаляются. Согласованные условия и незавершённые расчёты не отменяются.</p>
      </section>
      <p class="small">Публикация в каталоге, реквизиты и доступы сотрудников автоматически не меняются. Дополнительные данные нового типа можно заполнить в профиле.</p>
      <p class="small">В макете меняется только демонстрационный кабинет в этой вкладке. Проверки действующих обязательств и смена типа на рабочем сайте будут реализованы отдельно.</p>
      <div class="partner-type-footer">
      <label class="partner-type-ack"><input type="checkbox" data-partner-type-ack>
        <span>Понимаю, что состав разделов и доступных действий изменится.</span>
      </label>
      <div class="partner-type-actions">
        <button type="button" class="btn" data-partner-type-action="choose">Назад</button>
        <button type="button" class="btn" data-partner-type-action="cancel">Отмена</button>
        <button type="button" class="btn primary" data-partner-type-action="apply" data-testid="partner-type-apply" disabled>Сменить на «${types[selected].label}»</button>
      </div>
      </div>
    </div>`);
    pinFooter();
    document.querySelector("[data-partner-type-ack]")?.focus({ preventScroll: true });
  }

  document.addEventListener("change", (event) => {
    if (event.target.matches('input[name="partner-type"]')) {
      selected = event.target.value;
      const next = document.querySelector('[data-partner-type-action="review"]');
      if (next) next.disabled = selected === role || !types[selected];
    }
    if (event.target.matches("[data-partner-type-ack]")) {
      acknowledgement = event.target.checked;
      const button = document.querySelector('[data-partner-type-action="apply"]');
      if (button) button.disabled = !acknowledgement;
    }
  }, { signal });

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-partner-type-action]")?.dataset.partnerTypeAction;
    if (!action) return;
    if (action === "cancel") {
      closeDialog();
    } else if (action === "open" && types[role]) {
      if (hasUnsavedChanges()) {
        openDialog("Сначала сохраните изменения", `<div class="stack partner-type-dialog" data-testid="partner-type-unsaved">
          <p>В профиле есть несохранённые изменения. Сохраните или отмените их, затем вернитесь к смене типа партнёрства.</p>
          <button type="button" class="btn primary" data-partner-type-action="cancel">Вернуться в профиль</button>
        </div>`);
      } else {
        selected = role;
        choose();
      }
    } else if (action === "choose") {
      choose();
    } else if (action === "review") {
      review();
    } else if (action === "apply" && acknowledgement && selected !== role && types[selected]) {
      closeDialog();
      success = `Тип изменён на «${types[selected].label}». Аккаунт сохранён; проверьте профиль нового типа.`;
      successRole = selected;
      apply(selected);
    }
  }, { signal });
}
