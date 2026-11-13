(function certificateCabinetEmbed() {
  const params =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  const embedded = params.get("cabinet_embed") === "1";

  function post(msg) {
    try {
      if (typeof window.__protoCabinetEmbedPost === "function") {
        window.__protoCabinetEmbedPost(msg);
        return;
      }
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
    if (typeof window.__certificateEmbedGuestHydrate === "function") {
      window.__certificateEmbedGuestHydrate(root, payload || {});
    }
    signalCertReady(payload || {});
  }

  function qrRasterReady(src) {
    return /^data:image\/(?:png|jpeg|jpg);/i.test(src || "") && String(src).length >= 512;
  }

  let certReadySignal = 0;

  function signalCertReady(payload) {
    const token = ++certReadySignal;
    const qrPayload = payload?.qrDataUrl ? String(payload.qrDataUrl).length : 0;

    const emit = () => {
      if (token !== certReadySignal) return;
      const qrImg = root.querySelector("[data-cert-qr]");
      const qrSrc = qrImg?.currentSrc || qrImg?.getAttribute("src") || "";
      const decoded =
        qrImg &&
        qrImg.complete &&
        qrImg.naturalWidth > 0 &&
        qrImg.naturalHeight > 0 &&
        qrRasterReady(qrSrc);
      const dims = decoded ? `${qrImg.naturalWidth}x${qrImg.naturalHeight}` : "0";
      window.__protoCabinetEmbedSignalContentReady?.(139, {
        guestMarker: `cert139-qr-${decoded ? "raster-ok" : "missing"}-payload-${qrPayload}-dims-${dims}`,
      });
    };

    const qrImg = root.querySelector("[data-cert-qr]");
    const expectedQr = payload?.qrDataUrl ? String(payload.qrDataUrl) : "";
    if (qrImg && expectedQr && qrRasterReady(expectedQr)) {
      const currentSrc = qrImg.currentSrc || qrImg.getAttribute("src") || "";
      if (!qrRasterReady(currentSrc)) {
        qrImg.src = expectedQr;
      } else if (qrImg.complete && qrImg.naturalWidth === 0) {
        qrImg.src = expectedQr;
      }
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

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 139) return;
    const payload = data.payload || {};
    const mounted = root.querySelector(".cert-guest, .pc-page");
    if (!mounted) {
      renderPublic(payload);
      return;
    }
    if (typeof window.__certificateEmbedGuestHydrate === "function") {
      window.__certificateEmbedGuestHydrate(root, payload);
    }
    signalCertReady(payload);
  });

  post({ type: "need-context", pageN: 139 });
  window.__protoCabinetEmbedAdapterReady?.(139);
})();
