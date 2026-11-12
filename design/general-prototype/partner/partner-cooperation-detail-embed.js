(function partnerCooperationDetailEmbed() {
  const params = new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  const byId = (id) => document.getElementById(id);

  function post(msg) {
    try {
      parent.postMessage(Object.assign({ source: "proto-cabinet-embed" }, msg), "*");
    } catch (_) {}
  }

  function setRates(categories) {
    const list = document.querySelector(".rate-list");
    if (!list || !categories?.length) return;
    list.innerHTML = categories
      .map(
        (c) => `<div class="rate-row"><dt><span>${c.name}</span></dt><dd>${c.limit}<span>%</span></dd></div>`,
      )
      .join("");
  }

  function applyContext(payload) {
    if (!payload?.partner) return;
    if (payload.partnerId) window.__protoEmbedPartnerId = payload.partnerId;
    const p = payload.partner;
    const title = byId("partner-title");
    if (title) title.textContent = p.name || "Партнёр";
    document.querySelector(".identity-main p")?.replaceChildren(
      document.createTextNode(`${p.typeLabel || "Партнёр"} · ${p.city || ""}`),
    );
    setRates(payload.categories);
    if (typeof payload.paused === "boolean") {
      const status = byId("partner-status");
      if (status) {
        status.classList.toggle("is-paused", payload.paused);
        const span = status.querySelector("span");
        if (span) span.textContent = payload.paused ? "На паузе" : "Активно";
      }
      byId("paused-note").hidden = !payload.paused;
      const hint = byId("cooperation-hint");
      if (hint) {
        hint.textContent = payload.paused
          ? "Можно возобновить в любой момент."
          : "Условия согласованы, можно работать.";
      }
      const pauseBtn = byId("pause");
      if (pauseBtn) pauseBtn.textContent = payload.paused ? "Возобновить" : "Приостановить";
      const cert = byId("certificate");
      if (cert) cert.disabled = payload.paused;
    }
    document.querySelector(".list")?.setAttribute("hidden", "");
    const dialog = byId("partner-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 143) return;
    applyContext(data.payload);
  });

  function wireCoop(id, action) {
    const el = byId(id);
    if (!el) return;
    el.addEventListener("click", () => {
      post({ type: "coop", action, partnerId: window.__protoEmbedPartnerId || "" });
    });
  }

  post({ type: "need-context", pageN: 143 });
  document.addEventListener("DOMContentLoaded", () => {
    post({ type: "need-context", pageN: 143 });
    const pause = byId("pause");
    pause?.addEventListener("click", () => {
      post({ type: "coop", action: "toggle-pause", partnerId: window.__protoEmbedPartnerId || "" });
    });
    byId("edit-terms")?.addEventListener("click", (e) => {
      e.preventDefault();
      post({ type: "coop", action: "edit-terms", partnerId: window.__protoEmbedPartnerId || "" });
    });
    byId("certificate")?.addEventListener("click", (e) => {
      e.preventDefault();
      post({ type: "coop", action: "certificate", partnerId: window.__protoEmbedPartnerId || "" });
    });
  });
})();
