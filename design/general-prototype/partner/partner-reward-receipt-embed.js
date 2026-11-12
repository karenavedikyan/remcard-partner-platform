(function partnerRewardReceiptEmbed() {
  const params = new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  const money = (n) => (Number.isFinite(n) ? n.toLocaleString("ru-RU") : "0") + " ₽";

  function applyReceiptCtx(payload) {
    const ctx = payload?.receiptCtx;
    if (!ctx) return;
    const actor = payload.embedActor || {};
    const hero = document.getElementById("prr-hero-label");
    if (hero) {
      hero.textContent =
        actor.receiptMode === "earned" ? "Заработанное вознаграждение" : "Ваше вознаграждение";
    }
    const amount = document.getElementById("prr-amount");
    if (amount) amount.textContent = `+${money(ctx.amount ?? 0)}`;
    const badge = document.getElementById("prr-status-badge");
    if (badge) badge.textContent = "Начислено";
    const cert = document.getElementById("prr-cert-code");
    if (cert && ctx.certCode) cert.textContent = ctx.certCode;
    const client = document.getElementById("prr-client");
    if (client) client.textContent = ctx.clientLabel || "Демо-клиент";
    const merchant = document.getElementById("prr-merchant");
    if (merchant && ctx.partner) merchant.textContent = ctx.partner;
    const pDate = document.getElementById("prr-purchase-date");
    if (pDate && ctx.dateDisplay) pDate.textContent = ctx.dateDisplay.replace(",", " ·");
    const paid = document.getElementById("prr-paid");
    if (paid && ctx.relatedPurchasePayable != null) {
      paid.textContent = money(ctx.relatedPurchasePayable);
    }
    const timeline = document.getElementById("prr-timeline");
    if (timeline && ctx.accrualId) {
      timeline.innerHTML = `<li><span>${ctx.dateDisplay || ctx.date || ""} · ID ${ctx.accrualId}</span></li>`;
    }
    const overlay = document.getElementById("prr-overlay");
    const mainTable = document.querySelector(".prr-panel");
    if (mainTable) mainTable.setAttribute("hidden", "");
    if (overlay) overlay.hidden = false;
  }

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 145) return;
    applyReceiptCtx(data.payload);
    if (window.__protoEmbedApplyContext) window.__protoEmbedApplyContext(data.payload, 145);
  });
})();
