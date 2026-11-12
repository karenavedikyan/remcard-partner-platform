(function partnerRewardReceiptEmbed() {
  const params = new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  const money = (n) => (Number.isFinite(n) ? n.toLocaleString("ru-RU") : "0") + " ₽";
  const pageN = Number(params.get("proto_n") || 145);

  function hideFact(id) {
    const node = document.getElementById(id);
    if (!node) return;
    const dt = node.closest("dd")?.previousElementSibling;
    node.textContent = "—";
    node.setAttribute("data-embed-unavailable", "1");
    if (dt && dt.tagName === "DT") dt.setAttribute("hidden", "");
    node.setAttribute("hidden", "");
  }

  function applyReceiptCtx(payload) {
    const ctx = payload?.receiptCtx;
    if (!ctx) return;
    window.__protoReceiptEmbedSnapshot = true;
    const actor = payload.embedActor || {};
    const hero = document.getElementById("prr-hero-label");
    if (hero) {
      const earned =
        payload.role === "agent" || payload.role === "specialist" || actor.receiptMode === "earned";
      hero.textContent =
        actor.receiptHeroLabel ||
        (earned ? "Заработанное вознаграждение" : "Начисление профклиенту") ||
        ctx.heroLabel;
    }
    const hasReward =
      ctx.hasRewardSnapshot === true &&
      ctx.rewardAmount != null &&
      Number.isFinite(Number(ctx.rewardAmount));
    const amount = document.getElementById("prr-amount");
    const helper = document.getElementById("prr-helper");
    if (amount) {
      amount.textContent = hasReward
        ? `+${money(Number(ctx.rewardAmount))}`
        : "—";
    }
    if (helper) {
      helper.textContent = hasReward
        ? ""
        : "Сумма вознаграждения для выбранной записи в этом снимке не сохранена.";
    }
    const badge = document.getElementById("prr-status-badge");
    if (badge) badge.textContent = hasReward ? "Начислено" : "—";
    const cert = document.getElementById("prr-cert-code");
    if (cert && ctx.certCode) cert.textContent = ctx.certCode;
    const client = document.getElementById("prr-client");
    if (client) client.textContent = ctx.clientLabel || "Демо-клиент";
    const merchant = document.getElementById("prr-merchant");
    if (merchant && ctx.partner) merchant.textContent = ctx.partner;
    const pDate = document.getElementById("prr-purchase-date");
    if (pDate) {
      pDate.textContent = ctx.dateDisplay ? ctx.dateDisplay.replace(",", " ·") : "—";
    }
    const paid = document.getElementById("prr-paid");
    if (paid) {
      if (ctx.relatedPurchasePayable != null && Number.isFinite(Number(ctx.relatedPurchasePayable))) {
        paid.textContent = money(Number(ctx.relatedPurchasePayable));
      } else if (ctx.relatedPurchasePayableDisplay) {
        paid.textContent = ctx.relatedPurchasePayableDisplay;
      } else {
        paid.textContent = "—";
      }
    }
    hideFact("prr-purchase-number");
    hideFact("prr-branch");

    const calcDetails = document.getElementById("prr-details-calc");
    const calcText = document.getElementById("prr-calc-text");
    if (calcText) {
      calcText.textContent = ctx.hasCalcSnapshot
        ? calcText.textContent
        : "На этом снимке детализация расчёта недоступна. Показаны только сумма и дата из выбранной записи в истории.";
    }
    if (calcDetails && !ctx.hasCalcSnapshot) {
      calcDetails.open = false;
      calcDetails.dataset.embedCalcUnavailable = "1";
    }

    const demoStates = document.getElementById("prr-details-demo");
    if (demoStates) demoStates.hidden = true;

    const before = document.getElementById("prr-before");
    const discount = document.getElementById("prr-discount");
    const category = document.getElementById("prr-category");
    [before, discount, category].forEach((node) => {
      if (!node) return;
      const dt = node.closest("dd")?.previousElementSibling;
      if (dt) dt.setAttribute("hidden", "");
      node.setAttribute("hidden", "");
    });

    const timeline = document.getElementById("prr-timeline");
    if (timeline && ctx.accrualId) {
      timeline.innerHTML = `<li><span>${ctx.dateDisplay || ctx.date || ""} · ID ${ctx.accrualId}</span></li>`;
    }

    const purchaseDetails = document.getElementById("prr-details-purchase");
    if (purchaseDetails && ctx.purchaseCtx) {
      purchaseDetails.innerHTML = `
        <summary>Подробности покупки</summary>
        <p class="small">Связанная покупка · ${ctx.relatedPurchasePayableDisplay || (ctx.relatedPurchasePayable != null ? money(ctx.relatedPurchasePayable) : "—")}${ctx.purchaseCtx?.dateDisplay ? ` · ${ctx.purchaseCtx.dateDisplay}` : ""}</p>
        <button type="button" class="prr-link" id="prr-open-linked-purchase" data-proto-embed-ignore>Открыть покупку <span aria-hidden="true">↗</span></button>`;
      document.getElementById("prr-open-linked-purchase")?.addEventListener("click", (e) => {
        e.preventDefault();
        window.__protoCabinetEmbedNavigate?.(144, "", {
          walletState: payload.walletState || null,
          purchaseCtx: ctx.purchaseCtx,
          receiptCtx: null,
        });
      });
    }

    const overlay = document.getElementById("prr-overlay");
    const mainTable = document.querySelector(".prr-panel");
    if (mainTable) mainTable.setAttribute("hidden", "");
    if (overlay) overlay.hidden = false;
  }

  function onHostContext(data) {
    if (!data?.payload) return;
    if (data.payload.receiptCtx) applyReceiptCtx(data.payload);
    if (window.__protoEmbedApplyContext) window.__protoEmbedApplyContext(data.payload, pageN);
  }

  window.__protoApplyReceiptEmbedCtx = applyReceiptCtx;
  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== pageN && !data.payload?.receiptCtx) return;
    onHostContext(data);
  });
})();
