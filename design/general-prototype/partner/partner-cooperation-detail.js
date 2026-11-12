(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const detail = byId("partner-dialog");
  const certificate = byId("certificate");
  const pauseButton = byId("pause");
  let paused = false;

  // Isolated visual prototype. No API calls, credentials, storage or persistence.
  function openDialog(id) {
    const dialog = byId(id);
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog(id) {
    byId(id).close();
  }
  function showPauseState(value) {
    paused = value;
    const status = byId("partner-status");
    status.classList.toggle("is-paused", value);
    status.querySelector("span").textContent = value ? "На паузе" : "Активно";
    status.querySelector("svg").innerHTML = value
      ? '<path d="M5 3v10M11 3v10"/>'
      : '<path d="m3 8 3 3 7-7"/>';
    byId("paused-note").hidden = !value;
    byId("cooperation-hint").textContent = value
      ? "Можно возобновить в любой момент."
      : "Условия согласованы, можно работать.";
    pauseButton.textContent = value ? "Возобновить" : "Приостановить";
    certificate.disabled = value;
    certificate.title = value ? "Сначала возобновите сотрудничество" : "";
  }
  byId("open-detail").addEventListener("click", () => openDialog("partner-dialog"));
  byId("close-detail").addEventListener("click", () => closeDialog("partner-dialog"));
  byId("edit-terms").addEventListener("click", () => openDialog("edit-dialog"));
  certificate.addEventListener("click", () => openDialog("certificate-dialog"));
  pauseButton.addEventListener("click", () => {
    if (paused) showPauseState(false);
    else openDialog("pause-dialog");
  });
  byId("confirm-pause").addEventListener("click", () => {
    showPauseState(true);
    closeDialog("pause-dialog");
  });
  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeDialog(button.dataset.close));
  });
  byId("terms-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const note = byId("draft-note");
    const heading = document.createElement("strong");
    heading.textContent = "Предпросмотр предложения · не отправлено";
    const values = ["rate-doors", "rate-floor", "rate-locks"].map(id =>
      Number(byId(id).value).toLocaleString("ru-RU")
    );
    note.replaceChildren(
      heading,
      document.createTextNode(`Двери ${values[0]}% · Напольные покрытия ${values[1]}% · Фурнитура и замки ${values[2]}%. Действующие условия выше не изменились.`)
    );
    note.hidden = false;
    closeDialog("edit-dialog");
    note.scrollIntoView({block:"nearest"});
  });
  byId("theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    byId("theme").setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
  });
  // Native dialogs provide focus containment, Escape, and focus restoration.
  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  detail.addEventListener("close", () => byId("open-detail").focus());
  openDialog("partner-dialog");
})();
