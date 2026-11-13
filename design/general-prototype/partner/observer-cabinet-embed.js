(function observerCabinetEmbed() {
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

  function applyDesignNotice(payload) {
    if (!payload?.designExample) return;
    const state = document.getElementById("observer-state");
    if (state && payload.naReason) {
      state.textContent = payload.naReason;
      state.classList.add("notice");
    }
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 142) return;
    applyDesignNotice(data.payload);
    window.__protoCabinetEmbedSignalContentReady?.(142);
  });

  post({ type: "need-context", pageN: 142 });
})();
