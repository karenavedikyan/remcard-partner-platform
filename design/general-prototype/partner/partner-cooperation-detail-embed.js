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

  function setSpecializations(topics) {
    const section = document.querySelector(".specialization");
    if (!section || !topics?.length) return;
    const heading = section.querySelector("h3");
    section.innerHTML = "";
    if (heading) section.appendChild(heading);
    topics.forEach((topic) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = topic;
      section.appendChild(span);
    });
  }

  function applyPermissions(perms) {
    if (!perms) return;
    const hide = (id, allowed) => {
      const el = byId(id);
      if (!el) return;
      if (allowed) {
        el.removeAttribute("hidden");
        el.disabled = false;
      } else {
        el.setAttribute("hidden", "");
        el.disabled = true;
      }
    };
    hide("edit-terms", perms.editTerms);
    hide("pause", perms.pauseCoop);
    hide("certificate", perms.createCertificate);
  }

  function mountPanelMode() {
    document.documentElement.classList.add("cabinet-embed-cooperation-panel");
    document.querySelector("main.page")?.setAttribute("hidden", "");
    ["edit-dialog", "pause-dialog", "certificate-dialog"].forEach((id) => {
      const el = byId(id);
      if (el) el.setAttribute("hidden", "");
    });
    const dialog = byId("partner-dialog");
    if (!dialog) return;
    dialog.classList.add("embed-cooperation-panel");
    dialog.setAttribute("open", "");
    byId("close-detail")?.setAttribute("hidden", "");
    byId("theme")?.setAttribute("hidden", "");
    const top = dialog.querySelector(".dialog-top p");
    if (top) top.textContent = "Условия сотрудничества";
  }

  let lastPermissions = null;
  let supplementalMount = byId("embed-supplemental");

  function ensureSupplemental() {
    if (supplementalMount) return supplementalMount;
    const scroll = dialogScroll();
    if (!scroll) return null;
    supplementalMount = document.createElement("div");
    supplementalMount.id = "embed-supplemental";
    supplementalMount.className = "embed-supplemental";
    scroll.appendChild(supplementalMount);
    return supplementalMount;
  }

  function dialogScroll() {
    return document.querySelector("#partner-dialog .dialog-scroll");
  }

  function applyContext(payload) {
    lastPermissions = payload?.permissions || null;
    if (!payload?.partner) return;
    mountPanelMode();
    if (payload.partnerId) window.__protoEmbedPartnerId = payload.partnerId;
    applyPermissions(payload.permissions);
    const p = payload.partner;
    const title = byId("partner-title");
    if (title) title.textContent = p.name || "Партнёр";
    const avatar = document.querySelector(".identity .avatar");
    if (avatar && p.avatarInitial) avatar.textContent = p.avatarInitial;
    document.querySelector(".identity-main p")?.replaceChildren(
      document.createTextNode(`${p.typeLabel || "Партнёр"} · ${p.city || ""}`),
    );
    setSpecializations(p.topics);
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
    const mount = ensureSupplemental();
    if (mount && payload.sectionsHtml) {
      mount.innerHTML = payload.sectionsHtml;
      mount.hidden = false;
    }
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 143) return;
    applyContext(data.payload);
  });

  function wireCoopClick(id, action) {
    const el = byId(id);
    if (!el) return;
    el.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (lastPermissions) {
          if (action === "edit-terms" && !lastPermissions.editTerms) return;
          if (action === "toggle-pause" && !lastPermissions.pauseCoop) return;
          if (action === "certificate" && !lastPermissions.createCertificate) return;
        }
        post({ type: "coop", action, partnerId: window.__protoEmbedPartnerId || "" });
      },
      true,
    );
  }

  post({ type: "need-context", pageN: 143 });
  document.addEventListener("DOMContentLoaded", () => {
    mountPanelMode();
    post({ type: "need-context", pageN: 143 });
    wireCoopClick("pause", "toggle-pause");
    wireCoopClick("edit-terms", "edit-terms");
    wireCoopClick("certificate", "certificate");
  });
})();
