(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  // Screenshot values only. No production API, financial writes or persistence.
  const embedParams = new URLSearchParams(location.search);
  const isCabinetEmbed = embedParams.get("cabinet_embed") === "1";
  let embedWalletState = null;
  let embedCertCode = null;

  function readCertCode() {
    return (
      embedCertCode ||
      document.querySelector(".op-document strong")?.textContent?.trim() ||
      "RC-X9Z0WZ"
    );
  }

  function showHistory(filtered) {
    byId("op-detail").hidden = true;
    byId("op-history-view").hidden = false;
    byId("op-history-filter").textContent = filtered
      ? `Документ ${readCertCode()}`
      : "Все документы";
    byId("op-clear-filter").hidden = !filtered;
    document.title = "История операций · RemCard, прототип";
    window.scrollTo({ top: 0, behavior: "instant" });
    byId("op-history-title").setAttribute("tabindex", "-1");
    byId("op-history-title").focus({ preventScroll: true });
  }
  function showDetail() {
    byId("op-history-view").hidden = true;
    byId("op-detail").hidden = false;
    document.title = "Детали операции · RemCard, прототип";
    window.scrollTo({ top: 0, behavior: "instant" });
    byId("op-title").setAttribute("tabindex", "-1");
    byId("op-title").focus({ preventScroll: true });
  }

  function walletListStateForDocument() {
    const cert = readCertCode();
    const base = embedWalletState && typeof embedWalletState === "object" ? embedWalletState : {};
    return {
      ...base,
      view: "purchases",
      selectedAccrualId: null,
      search: cert,
      status: "all",
      from: "",
      to: "",
    };
  }

  function goEmbedWalletHistoryReplace() {
    if (!window.__protoCabinetEmbedNavigate) return false;
    window.__protoCabinetEmbedNavigate(
      147,
      "",
      {
        walletState: walletListStateForDocument(),
        purchaseCtx: null,
        receiptCtx: null,
      },
      { replace: true },
    );
    return true;
  }

  if (isCabinetEmbed) {
    window.addEventListener("message", (ev) => {
      const data = ev.data;
      if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
      if (Number(data.pageN) !== 144) return;
      if (data.payload?.walletState) embedWalletState = data.payload.walletState;
      if (data.payload?.purchaseCtx?.certCode) embedCertCode = data.payload.purchaseCtx.certCode;
    });
  }

  byId("op-history").addEventListener("click", (e) => {
    if (isCabinetEmbed && window.__protoCabinetEmbedBack?.()) {
      e.preventDefault();
      return;
    }
    showHistory(false);
  });
  byId("op-document-operations").addEventListener("click", (e) => {
    if (isCabinetEmbed && goEmbedWalletHistoryReplace()) {
      e.preventDefault();
      return;
    }
    showHistory(true);
  });
  byId("op-clear-filter").addEventListener("click", () => showHistory(false));
  byId("op-open-detail").addEventListener("click", showDetail);
  byId("op-return-detail").addEventListener("click", showDetail);
  byId("op-theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    byId("op-theme").setAttribute(
      "aria-label",
      dark ? "Включить светлую тему" : "Включить тёмную тему",
    );
  });
})();
