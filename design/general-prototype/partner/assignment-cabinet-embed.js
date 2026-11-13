(function assignmentCabinetEmbed() {
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

  const root = document.getElementById("assignment-root");
  if (!root) {
    console.warn("assignment-root missing");
    return;
  }

  function signalReady(marker) {
    if (marker) {
      window.__protoCabinetEmbedSignalContentReady?.(141, { guestMarker: marker });
    } else {
      window.__protoCabinetEmbedSignalContentReady?.(141);
    }
  }

  function renderAssignment(payload) {
    const html = payload?.assignmentHtml;
    if (typeof html === "string" && html.length > 0) {
      root.innerHTML = html;
      const title = payload.objectName || "";
      const address = payload.objectAddress || "";
      if (
        !payload.guestMarker ||
        (title && !html.includes(title)) ||
        (address && !html.includes(address))
      ) {
        root.innerHTML =
          '<section class="panel"><h1>Поручение не найдено</h1><p>Ссылка повреждена. Попросите отправителя прислать её ещё раз.</p></section>';
        return;
      }
      signalReady(payload.guestMarker || payload.repairObjectId || "");
      return;
    }
    root.innerHTML =
      '<section class="panel"><h1>Поручение не найдено</h1><p>Ссылка повреждена. Попросите отправителя прислать её ещё раз.</p></section>';
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 141) return;
    renderAssignment(data.payload || {});
  });

  post({ type: "need-context", pageN: 141 });
})();
