(function certificateCabinetEmbed() {
  const params =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  const embedded = params.get("cabinet_embed") === "1";

  function post(msg) {
    try {
      parent.postMessage(Object.assign({ source: "proto-cabinet-embed" }, msg), "*");
    } catch (_) {}
  }

  if (!embedded) {
    const mod = document.createElement("script");
    mod.type = "module";
    mod.src = "./certificate-guest.js";
    document.body.appendChild(mod);
    return;
  }

  const root = document.getElementById("certificate-root");
  if (!root) {
    // eslint-disable-next-line no-console
    console.warn("certificate-root missing");
    return;
  }

  function renderPublic(payload) {
    const html = payload?.publicHtml;
    const model = payload?.publicModel;
    if (typeof html === "string" && html.length > 0) {
      root.innerHTML = html;
    } else if (model?.code) {
      root.innerHTML =
        '<main class="cert-error" role="alert"><h2>Не удалось отобразить сертификат</h2><p class="muted">Во встроенном просмотре не удалось построить страницу. Обновите вкладку или откройте просмотр снова.</p></main>';
    } else {
      root.innerHTML =
        '<main class="cert-error"><p>Выберите сертификат в кабинете и откройте гостевой просмотр снова.</p></main>';
    }
    window.__protoCabinetEmbedSignalContentReady?.(139);
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 139) return;
    renderPublic(data.payload || {});
  });

  post({ type: "need-context", pageN: 139 });
})();
