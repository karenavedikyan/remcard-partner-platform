(function recommendationCabinetEmbed() {
  const params =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  function post(msg) {
    try {
      parent.postMessage(Object.assign({ source: "proto-cabinet-embed" }, msg), "*");
    } catch (_) {}
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 140 || !data.payload?.designExample) return;
    const root = document.getElementById("recommendation-root");
    if (!root) return;
    requestAnimationFrame(() => {
      if (root.querySelector(".cert-guest-design-sample")) return;
      const note = document.createElement("p");
      note.className = "cert-guest-note cert-guest-design-sample";
      note.textContent =
        "Дизайн-макет публичной рекомендации. Не привязан к выбранному сертификату в кабинете.";
      root.prepend(note);
      window.__protoCabinetEmbedSignalContentReady?.(140);
    });
  });

  post({ type: "need-context", pageN: 140 });
})();
