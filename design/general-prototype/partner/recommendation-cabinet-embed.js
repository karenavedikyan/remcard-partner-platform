(function recommendationCabinetEmbed() {
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
    mod.src = "./recommendation-guest.js";
    document.body.appendChild(mod);
    return;
  }

  const root = document.getElementById("recommendation-root");
  if (!root) {
    // eslint-disable-next-line no-console
    console.warn("recommendation-root missing");
    return;
  }

  let recReadySignal = 0;

  function qrRasterReady(src) {
    return /^data:image\/(?:png|jpeg|jpg);/i.test(src || "") && String(src).length >= 512;
  }

  function signalRecReady(payload) {
    const token = ++recReadySignal;
    const qrPayload = payload?.qrDataUrl ? String(payload.qrDataUrl).length : 0;

    const emit = () => {
      if (token !== recReadySignal) return;
      const qrImg = root.querySelector("[data-recommendation-qr]");
      const qrSrc = qrImg?.currentSrc || qrImg?.getAttribute("src") || "";
      const decoded =
        qrImg &&
        qrImg.complete &&
        qrImg.naturalWidth > 0 &&
        qrImg.naturalHeight > 0 &&
        qrRasterReady(qrSrc);
      const dims = decoded ? `${qrImg.naturalWidth}x${qrImg.naturalHeight}` : "0";
      window.__protoCabinetEmbedSignalContentReady?.(140, {
        guestMarker: `rec140-qr-${decoded ? "raster-ok" : "missing"}-payload-${qrPayload}-dims-${dims}`,
      });
    };

    const qrImg = root.querySelector("[data-recommendation-qr]");
    const expectedQr = payload?.qrDataUrl ? String(payload.qrDataUrl) : "";
    if (qrImg && expectedQr && qrRasterReady(expectedQr)) {
      const currentSrc = qrImg.currentSrc || qrImg.getAttribute("src") || "";
      if (!qrRasterReady(currentSrc)) qrImg.src = expectedQr;
      else if (qrImg.complete && qrImg.naturalWidth === 0) qrImg.src = expectedQr;
      if (qrImg.complete && qrImg.naturalWidth > 0) {
        emit();
        return;
      }
      qrImg.addEventListener("load", emit, { once: true });
      qrImg.addEventListener("error", emit, { once: true });
      emit();
      return;
    }
    emit();
  }

  function renderPublic(payload) {
    if (payload?.unavailable) {
      root.innerHTML = `<main class="cert-error" role="alert"><h2>Гостевая рекомендация недоступна</h2><p>${String(
        payload.unavailableMessage || "Нет данных для этого просмотра.",
      ).replace(/</g, "&lt;")}</p></main>`;
      window.__protoCabinetEmbedSignalContentReady?.(140, { guestMarker: "rec140-unavailable" });
      return;
    }
    const html = payload?.publicHtml;
    const model = payload?.publicModel;
    if (typeof html === "string" && html.length > 0) {
      root.innerHTML = html;
    } else if (model?.code) {
      root.innerHTML =
        '<main class="cert-error" role="alert"><h2>Не удалось отобразить рекомендацию</h2><p class="muted">Во встроенном просмотре не удалось построить страницу. Обновите вкладку или откройте просмотр снова.</p></main>';
    } else {
      root.innerHTML =
        '<main class="cert-error"><p>Откройте гостевую рекомендацию из кабинета или оглавления прототипа.</p></main>';
    }
    if (typeof window.__recommendationEmbedGuestHydrate === "function") {
      window.__recommendationEmbedGuestHydrate(root, payload || {});
    }
    signalRecReady(payload || {});
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 140) return;
    const payload = data.payload || {};
    const mounted = root.querySelector("[data-recommendation-payload], .cert-error");
    if (!mounted) {
      renderPublic(payload);
      return;
    }
    if (typeof window.__recommendationEmbedGuestHydrate === "function") {
      window.__recommendationEmbedGuestHydrate(root, payload);
    }
    if (payload?.publicHtml && payload.publicHtml !== root.innerHTML && !root.querySelector(".cert-error")) {
      root.innerHTML = payload.publicHtml;
      window.__recommendationEmbedGuestHydrate?.(root, payload);
    }
    signalRecReady(payload);
  });

  post({ type: "need-context", pageN: 140 });
})();
