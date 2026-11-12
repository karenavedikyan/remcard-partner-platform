(function partnerPurchaseDetailEmbed() {
  const params = new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  const money = (n) =>
    Number.isFinite(n) ? `${n.toLocaleString("ru-RU")} ₽` : null;

  function applyPurchaseEmbedCtx(payload) {
    const ctx = payload?.purchaseCtx;
    if (!ctx || ctx.designExample || payload.designExample) return;

    document.documentElement.dataset.embedPurchaseSnapshot = "1";
    window.__protoPurchaseEmbedSnapshot = true;

    const dir = document.querySelector(".op-direction");
    const actor = payload.embedActor || {};
    if (dir && actor.directionLabel) dir.textContent = actor.directionLabel;

    if (ctx.certCode) {
      const doc = document.querySelector(".op-document strong");
      if (doc) doc.textContent = ctx.certCode;
    }

    const payable = document.querySelector(".op-payable");
    if (payable) {
      if (ctx.amount != null && Number.isFinite(Number(ctx.amount))) {
        payable.textContent = money(Number(ctx.amount));
      } else if (ctx.amountDisplay) {
        payable.textContent = ctx.amountDisplay;
      } else {
        payable.textContent = "Сумма в этом снимке не указана";
      }
    }

    const participants = document.querySelector(".op-participants");
    if (participants && ctx.partner) {
      if (ctx.executor) {
        participants.innerHTML = `Партнёр <strong>${ctx.partner}</strong><span>·</span>Исполнитель <strong>${ctx.executor}</strong>`;
      } else {
        participants.innerHTML = `Партнёр <strong>${ctx.partner}</strong>`;
      }
    }

    const focus = document.getElementById("op-focus-label");
    if (focus && (payload.role === "agent" || payload.role === "specialist")) {
      focus.textContent = "Связанное начисление · просмотр";
    }

    const rewardAmt = document.querySelector(".op-accrual-amount");
    const focusNote = document.querySelector(".op-focus-note");
  const hasReward =
      ctx.hasRewardSnapshot === true &&
      ctx.rewardAmount != null &&
      Number.isFinite(Number(ctx.rewardAmount));

    if (hasReward) {
      if (rewardAmt) {
        rewardAmt.classList.remove("op-embed-unavailable");
        rewardAmt.innerHTML = `${Number(ctx.rewardAmount).toLocaleString("ru-RU")} <span>₽</span>`;
      }
      if (focusNote) {
        focusNote.innerHTML = "Начисление сохранено.<br>Статус выплаты здесь не указан.";
      }
    } else {
      if (rewardAmt) {
        rewardAmt.classList.add("op-embed-unavailable");
        rewardAmt.innerHTML = "<span>—</span>";
      }
      if (focusNote) {
        focusNote.textContent =
          "Сумма вознаграждения для выбранной записи в этом снимке не сохранена.";
      }
    }

    const breakdown = document.getElementById("op-breakdown");
    if (breakdown) {
      if (ctx.hasCalcSnapshot === true) {
        breakdown.hidden = false;
      } else {
        breakdown.hidden = true;
        if (!document.getElementById("op-embed-calc-unavailable")) {
          const note = document.createElement("p");
          note.id = "op-embed-calc-unavailable";
          note.className = "notice op-embed-calc-unavailable";
          note.textContent =
            "Состав и расчёт для выбранной операции в демо недоступны. Показаны только поля из снимка кабинета.";
          breakdown.insertAdjacentElement("afterend", note);
        }
      }
    }

    const historyCard = document.querySelector(".op-history-card");
    if (historyCard && ctx.embedSnapshot) {
      const h2 = historyCard.querySelector("h2");
      if (h2 && ctx.certCode) h2.textContent = ctx.certCode;
      const cardMeta = historyCard.querySelector("p");
      if (cardMeta && ctx.partner) {
        cardMeta.textContent = ctx.executor
          ? `${ctx.partner} · исполнитель ${ctx.executor}`
          : ctx.partner;
      }
      const payDd = historyCard.querySelector("dl div:first-child dd");
      if (payDd && ctx.amount != null) payDd.textContent = money(ctx.amount);
      const accrualDd = historyCard.querySelector("dl div:last-child dd");
      if (accrualDd) {
        accrualDd.textContent = hasReward
          ? money(Number(ctx.rewardAmount))
          : "—";
      }
    }
  }

  window.__protoApplyPurchaseEmbedCtx = applyPurchaseEmbedCtx;

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 144) return;
    if (data.payload?.purchaseCtx) applyPurchaseEmbedCtx(data.payload);
  });
})();
