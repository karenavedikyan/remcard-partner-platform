(function certificateCabinetEmbed() {
  const params = new URLSearchParams(location.search);
  const embedded = params.get("cabinet_embed") === "1";

  if (!embedded) {
    const mod = document.createElement("script");
    mod.type = "module";
    mod.src = "./certificate-guest.js";
    document.body.appendChild(mod);
    return;
  }

  const root = document.getElementById("certificate-root");
  if (!root) return;

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function post(msg) {
    try {
      parent.postMessage(Object.assign({ source: "proto-cabinet-embed" }, msg), "*");
    } catch (_) {}
  }

  function renderGuest(record) {
    if (!record) {
      root.innerHTML =
        '<main class="cert-error"><p>Выберите сертификат в кабинете и откройте гостевой просмотр снова.</p></main>';
      return;
    }
    const code = record.displayCode || "Код не указан";
    const terms = record.terms || [];
    const offers = terms.length
      ? terms
      : [{ partnerName: record.partner, categoryName: record.category, discount: 0 }];
    root.innerHTML = `<main class="cert-guest-embed" data-testid="certificate-guest-embed">
      <article class="rc-cert">
        <span class="rc-cert-badge">${record.disabled ? "Отключён" : "Демонстрационный сертификат"}</span>
        <h1>Скидочный сертификат RemCard</h1>
        <p class="cert-partner">${esc(record.partner || record.name || "Партнёр")}</p>
        <ul class="cert-offers">${offers
          .map(
            (t) =>
              `<li>${esc(t.partnerName || record.partner)} · ${esc(t.categoryName || "Категория")}: скидка ${esc(t.discount)}%</li>`,
          )
          .join("")}</ul>
        <p class="cert-code" data-testid="certificate-guest-code">${esc(code)}</p>
        <p class="small">Публичный пример совпадает с выбранной записью в кабинете. QR и рабочая ссылка в демо не создаются.</p>
      </article>
    </main>`;
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 139) return;
    renderGuest(data.payload?.record);
  });

  post({ type: "need-context", pageN: 139 });
})();
