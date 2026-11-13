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

  function signalReady(meta) {
    const marker =
      meta && typeof meta === "object" ? meta.guestMarker || "" : String(meta || "");
    if (marker) {
      window.__protoCabinetEmbedSignalContentReady?.(142, { guestMarker: marker });
    } else {
      window.__protoCabinetEmbedSignalContentReady?.(142);
    }
  }

  const root = document.getElementById("observer-root");
  if (!root) {
    console.warn("observer-root missing");
    return;
  }

  function renderObserver(payload) {
    const html = payload?.observerHtml;
    const state = document.getElementById("observer-state");
    if (typeof html === "string" && html.length > 0) {
      root.innerHTML = html;
      if (state) {
        if (payload.readOnlyObserver) {
          state.textContent =
            "Демо-снимок выбранного объекта · без синхронизации между устройствами.";
          state.classList.add("notice");
        } else if (payload.naReason) {
          state.textContent = payload.naReason;
          state.classList.add("notice");
        }
      }
      const marker = payload.guestMarker || payload.repairObjectId || "";
      const name = payload.objectName || "";
      if (!marker || !name || !html.includes(name)) {
        root.innerHTML =
          '<section class="panel"><h1>Не удалось открыть объект</h1><p>Попросите отправителя прислать ссылку ещё раз.</p></section>';
        return;
      }
      signalReady({ guestMarker: marker });
      return;
    }
    root.innerHTML =
      '<section class="panel"><h1>Не удалось открыть объект</h1><p>Попросите отправителя прислать ссылку ещё раз.</p></section>';
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 142) return;
    renderObserver(data.payload || {});
  });

  post({ type: "need-context", pageN: 142 });
})();
