// Original catalogue form remains authoritative; hidden steps retain their fields.
import { applySpecialistPreset } from "./specialist-presets.js";
const steps = [
  ["card", "Карточка"],
  ["directions", "Направления"],
  ["contacts", "Контакты"],
  ["presentation", "Оформление"],
  ["review", "Предпросмотр"],
];
export function hydrateCatalogWizard(api) {
  const root = document.querySelector(".production-catalog");
  const form = root?.querySelector("[data-catalog-form]");
  if (!form || root.dataset.wizardReady) return;
  root.dataset.wizardReady = "true";
  root.classList.add("cw");
  const state = api.state();
  const intro = root.firstElementChild;
  const status = intro.querySelector(".profile-step-state");
  intro.innerHTML = `<div class="cw-heading"><div><span class="eyebrow">Публичная страница</span><h2>Подключение к каталогу</h2></div></div><p class="small">Уже сохранённые данные подставляем из профиля: проверьте их и при необходимости измените. Черновик не публикуется, отправка на проверку будет только в конце.</p>`;
  intro.querySelector(".cw-heading").append(status);
  const card = form.querySelector('[data-catalog-panel="card"]');
  const presentation = document.createElement("section");
  presentation.className = "panel stack";
  presentation.dataset.catalogPanel = "presentation";
  presentation.innerHTML = `<h2>Фото и описание</h2><p class="small">Фото и описание необязательны. Можно перейти к предпросмотру без заполнения.</p>`;
  const image = card.querySelector("[data-catalog-image]").closest("label");
  const thumb = card.querySelector(".catalog-upload-thumb")?.closest(".row");
  const description = card
    .querySelector('[name="description"]')
    .closest(".profile-field-group, .field");
  presentation.append(image);
  if (thumb) presentation.append(thumb);
  presentation.append(description);
  form.querySelector('[data-catalog-panel="review"]').before(presentation);
  const current = Math.max(
    0,
    steps.findIndex(([id]) => id === state.step),
  );
  form.querySelectorAll("[data-catalog-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.catalogPanel !== steps[current][0];
    panel.querySelector("h2").tabIndex = -1;
  });
  const nav = document.createElement("nav");
  nav.className = "cw-steps";
  nav.setAttribute("aria-label", "Шаги подключения к каталогу");
  nav.innerHTML = steps
    .map(
      ([id, title], index) =>
        `<button type="button" data-cw-step="${id}" ${index === current ? 'aria-current="step"' : ""}><span class="cw-number">${index + 1}</span><strong>${title}</strong></button>`,
    )
    .join("");
  form.prepend(nav);
  const footer = form.querySelector(".catalog-footer");
  footer.querySelector('[data-catalog-action="send"]').hidden = current !== 4;
  if (current === 4) {
    const saveDraft = footer.querySelector("[data-save-label]");
    saveDraft?.classList.remove("primary");
    saveDraft?.classList.add("ghost");
  }
  const actions = document.createElement("div");
  actions.className = "row cw-actions";
  actions.innerHTML = `<span class="small">Шаг ${current + 1} из 5</span>${current ? '<button type="button" class="btn" data-cw-move="back">Назад</button>' : ""}${current < 4 ? `<button type="button" class="btn primary" data-cw-move="next">${current === 3 ? "Предпросмотр" : "Далее"}</button>` : ""}`;
  footer.before(actions);
  form.addEventListener("change", (event) => {
    if (!event.target.matches("[data-specialist-kind]")) return;
    api.capture(form);
    const applied = applySpecialistPreset(state.values, api.dictionary);
    state.values.specialistNotice = !state.values.specialistKind
      ? "Категории и этапы можно выбрать вручную."
      : state.values.specialistKind === "other"
        ? "Укажите свою специализацию и выберите категории/этапы вручную."
        : applied
          ? "Стартовые категории и этапы подставлены. Проверьте и отредактируйте их."
          : "Текущий выбор сохранён. Чтобы добавить подсказки, откройте стартовый набор.";
    for (const key of ["specialistKind", "services", "stages"])
      state.touched[key] = true;
    api.refresh();
  });
  form.addEventListener("click", (event) => {
    if (event.target.closest("[data-specialist-apply]")) {
      event.preventDefault();
      event.stopPropagation();
      api.capture(form);
      applySpecialistPreset(state.values, api.dictionary, { merge: true });
      for (const key of ["services", "stages"]) state.touched[key] = true;
      state.values.specialistNotice =
        "Стартовый набор добавлен. Уже выбранные категории и этапы сохранены.";
      api.refresh();
      return;
    }
    const button = event.target.closest("[data-cw-step], [data-cw-move]");
    if (!button) return;
    event.preventDefault();
    api.capture(form);
    let next = button.dataset.cwStep;
    if (!next) {
      next = steps[current + (button.dataset.cwMove === "back" ? -1 : 1)][0];
      if (button.dataset.cwMove === "next") {
        const missing = api
          .missing()
          .find((item) => item.step === steps[current][0]);
        if (missing) {
          state.error = `Заполните: ${missing.label}. Незавершённую карточку можно сохранить как черновик.`;
          api.refresh();
          return;
        }
      }
    }
    state.step = next;
    state.error = "";
    if (next === "review") state.preview = true;
    api.refresh();
    const heading = document.querySelector(`[data-catalog-panel="${next}"] h2`);
    heading?.focus({ preventScroll: true });
    if (next === "review")
      heading
        ?.closest("[data-catalog-panel]")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
  });
}
