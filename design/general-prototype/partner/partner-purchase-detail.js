(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  // Screenshot values only. No production API, financial writes or persistence.
  function showHistory(filtered) {
    byId("op-detail").hidden = true;
    byId("op-history-view").hidden = false;
    byId("op-history-filter").textContent = filtered ? "Документ RC-X9Z0WZ" : "Все документы";
    byId("op-clear-filter").hidden = !filtered;
    document.title = "История операций · RemCard, прототип";
    window.scrollTo({top:0,behavior:"instant"});
    byId("op-history-title").setAttribute("tabindex","-1");
    byId("op-history-title").focus({preventScroll:true});
  }
  function showDetail() {
    byId("op-history-view").hidden = true;
    byId("op-detail").hidden = false;
    document.title = "Детали операции · RemCard, прототип";
    window.scrollTo({top:0,behavior:"instant"});
    byId("op-title").setAttribute("tabindex","-1");
    byId("op-title").focus({preventScroll:true});
  }
  byId("op-history").addEventListener("click", () => showHistory(false));
  byId("op-document-operations").addEventListener("click", () => showHistory(true));
  byId("op-clear-filter").addEventListener("click", () => showHistory(false));
  byId("op-open-detail").addEventListener("click", showDetail);
  byId("op-return-detail").addEventListener("click", showDetail);
  byId("op-theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    byId("op-theme").setAttribute("aria-label",dark ? "Включить светлую тему" : "Включить тёмную тему");
  });
})();
