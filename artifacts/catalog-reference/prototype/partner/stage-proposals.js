// Separate demo suggestion flow: neither the selected stages nor the dictionary change.
const forms = new Map();
const proposals = new Map();
const clean = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
const key = (value) => clean(value).toLocaleLowerCase("ru").replace(/ё/g, "е");
function state(scope) {
  if (!forms.has(scope))
    forms.set(scope, {
      open: false,
      name: "",
      description: "",
      message: "",
      error: false,
    });
  return forms.get(scope);
}
export function stageProposalSection(escape, scope) {
  return proposalSection(escape, scope, { kind: "stage" });
}
export function categoryProposalSection(
  escape,
  scope,
  { servicesOnly = false } = {},
) {
  return proposalSection(escape, `${scope}-category`, {
    kind: "category",
    servicesOnly,
  });
}
function proposalSection(escape, scope, { kind, servicesOnly = false }) {
  const s = state(scope);
  const stage = kind === "stage";
  const groups = stage
    ? ["stages"]
    : servicesOnly
      ? ["services"]
      : ["services", "products"];
  if (!groups.includes(s.group)) s.group = groups[0];
  const id = `stage-proposal-${scope.replace(/[^a-z\d-]/gi, "-")}`;
  return `<section class="stage-proposal" data-stage-proposal="${escape(scope)}" data-proposal-kind="${kind}">
    <label class="stage-proposal-toggle"><input type="checkbox" data-stage-proposal-toggle aria-controls="${id}" ${s.open ? "checked" : ""}><span>${stage ? "Предложить новый этап" : "Предложить новую категорию"} <small>в общий справочник</small></span></label>
    <div class="stage-proposal-form stack" id="${id}" ${s.open ? "" : "hidden"}>
      <h3>${stage ? "Новый этап" : "Новая категория"} для общего справочника</h3>
      <p class="small">Предложение не меняет выбранные категории и этапы вашего профиля.</p>
      ${groups.length > 1 ? `<label class="field">Тип категории<select data-stage-proposal-field="group">${groups.map((group) => `<option value="${group}" ${s.group === group ? "selected" : ""}>${group === "products" ? "Товары" : "Работы и услуги"}</option>`).join("")}</select></label>` : ""}
      <label class="field">Название ${stage ? "этапа" : "категории"}<input type="text" maxlength="80" data-stage-proposal-field="name" value="${escape(s.name)}" placeholder="${stage ? "Например, восстановление после затопления" : "Например, реставрация лепнины"}"></label>
      <label class="field">${stage ? "Что включает этот этап" : "Что входит в категорию"} <span class="small">необязательно</span><textarea rows="2" maxlength="300" data-stage-proposal-field="description" placeholder="Коротко опишите свой вариант">${escape(s.description)}</textarea></label>
      <div class="row"><button type="button" class="btn primary" data-stage-proposal-action="send">Отправить предложение</button><button type="button" class="btn ghost" data-stage-proposal-action="cancel">Отмена</button></div>
      <small class="stage-proposal-demo">Демо: предложение сохраняется только в этой вкладке. Общий справочник рабочего сайта не меняется.</small>
    </div>
    <p class="${s.error ? "field-error" : "small"}" role="status" data-stage-proposal-status>${escape(s.message)}</p>
  </section>`;
}
export function hydrateStageProposals(dictionary) {
  document.querySelectorAll("[data-stage-proposal]").forEach((root) => {
    if (root.dataset.hydrated) return;
    root.dataset.hydrated = "true";
    const s = state(root.dataset.stageProposal);
    const panel = root.querySelector(".stage-proposal-form");
    const trigger = root.querySelector("[data-stage-proposal-toggle]");
    const status = root.querySelector("[data-stage-proposal-status]");
    const stage = root.dataset.proposalKind === "stage";
    const paint = () => {
      panel.hidden = !s.open;
      trigger.checked = s.open;
      status.textContent = s.message;
      status.className = s.error ? "field-error" : "small";
      root
        .querySelector('[data-stage-proposal-field="name"]')
        .setAttribute("aria-invalid", String(s.error));
    };
    root.addEventListener("input", (event) => {
      event.stopPropagation();
      const field = event.target.dataset.stageProposalField;
      if (!field) return;
      s[field] = event.target.value;
      if (s.error) {
        s.error = false;
        s.message = "";
        paint();
      }
    });
    root.addEventListener("change", (event) => {
      event.stopPropagation();
      if (!event.target.matches("[data-stage-proposal-toggle]")) return;
      s.open = event.target.checked;
      s.error = false;
      s.message = "";
      paint();
      if (s.open)
        root
          .querySelector('[data-stage-proposal-field="name"]')
          .focus({ preventScroll: true });
    });
    // Enter submits only this suggestion, never the surrounding profile/catalogue.
    root.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        event.target.matches('[data-stage-proposal-field="name"]')
      ) {
        event.preventDefault();
        root.querySelector('[data-stage-proposal-action="send"]').click();
      }
      if (event.key === "Escape" && s.open) {
        event.preventDefault();
        event.stopPropagation();
        root.querySelector('[data-stage-proposal-action="cancel"]').click();
      }
    });
    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-stage-proposal-action]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.stageProposalAction;
      if (action === "cancel") {
        s.open = false;
        s.name = "";
        s.description = "";
        s.message = "";
        s.error = false;
        root.querySelectorAll("[data-stage-proposal-field]").forEach((el) => {
          if (el.dataset.stageProposalField !== "group") el.value = "";
        });
        paint();
        trigger.focus({ preventScroll: true });
        return;
      }
      const name = clean(s.name);
      const description = String(s.description).trim();
      if (name.length < 2 || name.length > 80) {
        s.message = `Укажите название ${stage ? "этапа" : "категории"} от 2 до 80 символов.`;
        s.error = true;
        paint();
        root.querySelector('[data-stage-proposal-field="name"]').focus();
        return;
      }
      if (description.length > 300) {
        s.message = "Описание должно быть не длиннее 300 символов.";
        s.error = true;
        paint();
        return;
      }
      if (dictionary[s.group].some((item) => key(item.label) === key(name))) {
        s.message = `${stage ? "Этап" : "Категория"} «${name}» уже есть в справочнике. Найдите и выберите ${stage ? "его" : "её"} в списке.`;
        s.error = false;
        paint();
        return;
      }
      const proposalKey = `${s.group}:${key(name)}`;
      if (proposals.has(proposalKey)) {
        s.message = `${stage ? "Этап" : "Категория"} «${name}» уже ${stage ? "предложен" : "предложена"} в этой вкладке. Повторное предложение не создано.`;
        s.error = false;
        paint();
        return;
      }
      proposals.set(proposalKey, {
        name,
        description,
        group: s.group,
        source: root.dataset.stageProposal,
      });
      s.message = `Предложение «${name}» сохранено в макете. Ваш профиль, выбранные категории/этапы и общий справочник не изменены.`;
      s.error = false;
      s.open = false;
      s.name = "";
      s.description = "";
      root.querySelectorAll("[data-stage-proposal-field]").forEach((el) => {
        if (el.dataset.stageProposalField !== "group") el.value = "";
      });
      paint();
      trigger.focus({ preventScroll: true });
    });
  });
}
