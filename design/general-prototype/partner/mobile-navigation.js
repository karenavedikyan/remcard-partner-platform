// Same role-filtered navigation as desktop. No permissions or routes added.
const mobile = matchMedia("(max-width: 680px)");
// Prototype-only preferences, isolated by role/workspace. No browser storage or API.
const preferences = new Map();
mobile.addEventListener("change", () => {
  const settings = document.querySelector(".mobile-demo-settings");
  if (settings) settings.open = !mobile.matches;
});

export function hydrateMobileNavigation({
  openDialog,
  closeDialog,
  icon,
  contextKey,
  refresh,
  report,
}) {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar && !sidebar.dataset.mobileNavigation) {
    sidebar.dataset.mobileNavigation = "ready";
    sidebar.classList.add("mobile-navigation");
    const nav = sidebar.querySelector("nav");
    const buttons = [...nav.querySelectorAll(".nav-btn")];
    const byKey = new Map(
      buttons.map((button) => [button.dataset.action.split(":")[1], button]),
    );
    const defaultKeys = [
      ...new Set(
        [
          "home",
          byKey.has("scanner")
            ? "scanner"
            : byKey.has("partners")
              ? "partners"
              : null,
          byKey.has("wallet")
            ? "wallet"
            : byKey.has("clients")
              ? "clients"
              : null,
          "profile",
        ].filter((key) => key && byKey.has(key)),
      ),
    ].slice(0, 4);
    const saved = preferences.get(contextKey);
    const permittedSaved = saved?.filter((key) => byKey.has(key)).slice(0, 4);
    const primaryKeys = permittedSaved?.length ? permittedSaved : defaultKeys;
    const keyOf = (button) => button.dataset.action.split(":")[1];
    const label = (key) => byKey.get(key).textContent.trim();
    function configurePanel() {
      let draft = [...primaryKeys];
      let replacement = null;
      const markup = () => `<section class="mobile-nav-editor">
        <p class="small">Выберите до 4 быстрых разделов. Нажмите нужный пункт ниже: если панель заполнена, выберите, какой раздел заменить. «Ещё» всегда остаётся последней кнопкой.</p>
        <div class="mobile-panel-preview" aria-label="Предпросмотр нижней панели">${draft.map((key) => `<span>${byKey.get(key).innerHTML}</span>`).join("")}<span>${icon("layout-grid")}Ещё</span></div>
        <div class="mobile-editor-heading"><h3>На нижней панели</h3><span>${draft.length} из 4</span></div>
        <div class="mobile-nav-selected">${
          draft.length
            ? draft
                .map(
                  (key, index) => `<div class="mobile-nav-option">
          <label><input type="checkbox" data-mobile-choice="${key}" checked><span>${label(key)}</span></label>
          <button type="button" class="btn icon" data-mobile-move="${key}:up" aria-label="Поднять ${label(key)}" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="btn icon" data-mobile-move="${key}:down" aria-label="Опустить ${label(key)}" ${index === draft.length - 1 ? "disabled" : ""}>↓</button></div>`,
                )
                .join("")
            : '<p class="small" role="status">Выберите хотя бы один раздел ниже.</p>'
        }</div>
        <h3 class="mobile-editor-available">Можно добавить</h3>
        <div class="mobile-nav-available">${
          buttons
            .filter((button) => !draft.includes(keyOf(button)))
            .map(
              (button) =>
                `<label class="mobile-nav-option ${replacement === keyOf(button) ? "is-pending" : ""}"><input type="checkbox" data-mobile-choice="${keyOf(button)}" ${replacement === keyOf(button) ? "checked" : ""}><span>${label(keyOf(button))}</span></label>`,
            )
            .join("") ||
          '<p class="small">Все доступные разделы уже выбраны.</p>'
        }</div>
        ${replacement ? `<section class="mobile-nav-replacement" aria-labelledby="mobile-replacement-title" data-testid="mobile-replacement">
          <h3 id="mobile-replacement-title">Добавить «${label(replacement)}»</h3>
          <p class="small">Четыре места уже заняты. Какой раздел заменить? Остальные останутся в том же порядке.</p>
          <div class="mobile-replacement-options">${draft.map((key) => `<button type="button" class="btn" data-mobile-replace="${key}" data-testid="mobile-replace-${key}">${byKey.get(key).querySelector("svg")?.outerHTML || ""}<span>Вместо «${label(key)}»</span></button>`).join("")}</div>
          <button type="button" class="btn ghost" data-mobile-replace-cancel>Не заменять</button>
        </section>` : ""}
        <button type="button" class="btn ghost" data-mobile-reset>Вернуть стандартную панель</button>
        <p class="small mobile-nav-demo-note">В прототипе настройка сохраняется до обновления страницы. На рабочем сайте её нужно сохранять в вашем аккаунте.</p>
        <div class="mobile-editor-footer"><button type="button" class="btn" data-mobile-cancel>Отмена</button><button type="button" class="btn primary" data-mobile-save ${draft.length && !replacement ? "" : "disabled"}>Сохранить панель</button></div>
        </section>`;
      openDialog("Настройка нижней панели", markup());
      const body = document.querySelector("dialog[open] .dialog-body");
      const update = (focusSelector) => {
        body.innerHTML = markup();
        document.dispatchEvent(new CustomEvent("remcard:mobile-icons"));
        if (focusSelector)
          body.querySelector(focusSelector)?.focus({ preventScroll: true });
      };
      body.addEventListener("change", (event) => {
        const input = event.target.closest("[data-mobile-choice]");
        if (!input) return;
        const key = input.dataset.mobileChoice;
        if (!byKey.has(key)) return;
        replacement = null;
        if (input.checked && !draft.includes(key)) {
          if (draft.length < 4) draft.push(key);
          else replacement = key;
        }
        if (!input.checked) draft = draft.filter((value) => value !== key);
        update(`[data-mobile-choice="${key}"]`);
        if (replacement) {
          body.querySelector("[data-mobile-replace]")?.focus({ preventScroll: true });
          body.querySelector(".mobile-nav-replacement")?.scrollIntoView({ block: "start" });
        }
      });
      body.addEventListener("click", (event) => {
        const replace = event.target.closest("[data-mobile-replace]");
        if (replace && replacement) {
          const index = draft.indexOf(replace.dataset.mobileReplace);
          if (index >= 0 && byKey.has(replacement)) {
            const key = replacement;
            draft[index] = key;
            replacement = null;
            update(`[data-mobile-choice="${key}"]`);
          }
        }
        if (event.target.closest("[data-mobile-replace-cancel]")) {
          const key = replacement;
          replacement = null;
          update(key ? `[data-mobile-choice="${key}"]` : null);
        }
        const move = event.target.closest("[data-mobile-move]");
        if (move) {
          const [key, direction] = move.dataset.mobileMove.split(":");
          const from = draft.indexOf(key),
            to = from + (direction === "up" ? -1 : 1);
          if (from >= 0 && to >= 0 && to < draft.length)
            [draft[from], draft[to]] = [draft[to], draft[from]];
          update(`[data-mobile-choice="${key}"]`);
        }
        if (event.target.closest("[data-mobile-reset]")) {
          draft = [...defaultKeys];
          replacement = null;
          update("[data-mobile-reset]");
        }
        if (event.target.closest("[data-mobile-cancel]")) closeDialog();
        if (
          event.target.closest("[data-mobile-save]") &&
          !replacement &&
          draft.length &&
          draft.length <= 4 &&
          draft.every((key) => byKey.has(key))
        ) {
          preferences.set(contextKey, [...draft]);
          closeDialog();
          refresh();
          document
            .querySelector(".mobile-sections-trigger")
            ?.focus({ preventScroll: true });
          report("Нижняя панель сохранена в этом просмотре.");
        }
      });
    }
    buttons.forEach((button) => {
      button.classList.add(
        primaryKeys.includes(button.dataset.action.split(":")[1])
          ? "mobile-primary"
          : "mobile-secondary",
      );
    });
    // Visual order differs only on mobile, while the full desktop order remains unchanged.
    primaryKeys.forEach((key, index) => {
      byKey.get(key)?.style.setProperty("--mobile-order", index);
    });
    const secondary = buttons.filter((button) =>
      button.classList.contains("mobile-secondary"),
    );
    {
      const menu = document.createElement("button");
      menu.type = "button";
      menu.className = "nav-btn mobile-sections-trigger";
      menu.dataset.testid = "mobile-sections";
      menu.setAttribute("aria-haspopup", "dialog");
      menu.setAttribute("aria-label", "Ещё: все разделы ЛК");
      menu.innerHTML = `${icon("layout-grid")}<span>Ещё</span>`;
      if (secondary.some((button) => button.hasAttribute("aria-current")))
        menu.setAttribute("aria-current", "page");
      nav.append(menu);
      menu.addEventListener("click", () => {
        const items = buttons
          .map((button) => {
            const clone = button.cloneNode(true);
            clone.removeAttribute("style");
            clone.className = "nav-btn";
            clone.dataset.testid = `mobile-section-${button.dataset.action.split(":")[1]}`;
            return clone.outerHTML;
          })
          .join("");
        openDialog(
          "Разделы ЛК",
          `<nav class="mobile-section-menu" aria-label="Все доступные разделы">${items}</nav><button type="button" class="btn mobile-nav-customize" data-testid="mobile-customize">${icon("settings-2")}Настроить нижнюю панель</button><p class="small">Показаны только разделы, доступные вашему аккаунту.</p>`,
        );
        document
          .querySelector("[data-testid=mobile-customize]")
          .addEventListener("click", () => {
            // Close before changing dialogs, and restore focus to the permanent menu trigger.
            closeDialog();
            menu.focus({ preventScroll: true });
            configurePanel();
          });
        document
          .querySelector(".mobile-section-menu")
          .addEventListener("click", (event) => {
            if (event.target.closest('[data-action^="nav:"]')) closeDialog();
          });
      });
    }
  }
  const toolbar = document.querySelector(".review-toolbar");
  if (toolbar && !toolbar.closest(".mobile-demo-settings")) {
    const settings = document.createElement("details");
    settings.className = "mobile-demo-settings";
    settings.open = !mobile.matches;
    const summary = document.createElement("summary");
    summary.textContent = "Настройки прототипа";
    toolbar.before(settings);
    settings.append(summary, toolbar);
  }
}
