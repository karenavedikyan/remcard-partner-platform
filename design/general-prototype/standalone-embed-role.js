(function protoStandaloneEmbedRole() {
  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (_) {
    return;
  }
  if (params.get("cabinet_embed") !== "1") return;

  var pageN = Number(params.get("proto_n") || 0);

  function post(msg) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ source: "proto-cabinet-embed" }, msg), "*");
      }
    } catch (_) {}
  }

  function setReadOnlyFlag(perms) {
    if (perms && (perms.readOnlyWallet || perms.viewOnly)) {
      document.documentElement.dataset.embedReadonly = "1";
    } else {
      delete document.documentElement.dataset.embedReadonly;
    }
  }

  function apply147(payload) {
    var actor = payload.embedActor || {};
    var perms = payload.permissions || {};
    var ctx = document.querySelector(".context");
    if (ctx) {
      var spans = ctx.querySelectorAll("span");
      if (spans[0] && actor.contextBadge) spans[0].textContent = actor.contextBadge;
      if (spans[1] && actor.subheading) spans[1].textContent = actor.subheading;
    }
    var title = document.getElementById("history-title");
    if (title && actor.historyTitle) title.textContent = actor.historyTitle;
    var purchasesTab = document.querySelector('[data-view="purchases"]');
    var accrualsTab = document.querySelector('[data-view="accruals"]');
    var tabs = actor.tabs || {};
    if (purchasesTab) {
      purchasesTab.hidden = tabs.purchases && tabs.purchases.visible === false;
      if (tabs.purchases && tabs.purchases.label) {
        var pCount = purchasesTab.querySelector("span");
        purchasesTab.textContent = tabs.purchases.label + " ";
        if (pCount) purchasesTab.appendChild(pCount);
      }
    }
    if (accrualsTab) {
      accrualsTab.hidden = tabs.accruals && tabs.accruals.visible === false;
    }
    if (typeof window.__protoWalletApplyState === "function" && payload.walletState) {
      window.__protoWalletApplyState(payload.walletState);
    } else if (typeof window.__protoWalletSetView === "function" && actor.defaultView) {
      window.__protoWalletSetView(actor.defaultView);
    }
    if (typeof window.__protoWalletRefreshPurpose === "function" && actor.viewPurpose) {
      window.__protoWalletRefreshPurpose(actor.viewPurpose);
    }
    var fine = document.querySelector(".fine-print p");
    if (fine && actor.finePrint) fine.textContent = actor.finePrint;
    var ro = document.querySelector("#detail-view .read-only");
    if (ro && (perms.viewOnly || actor.readOnlyDetail)) {
      ro.textContent =
        actor.readOnlyBanner ||
        "Режим просмотра. Финансовые действия недоступны для этой роли.";
    }
    setReadOnlyFlag(perms);
  }

  function disableEl(el) {
    if (!el) return;
    el.disabled = true;
    el.setAttribute("aria-disabled", "true");
    el.setAttribute("hidden", "");
  }

  function apply146(payload) {
    var perms = payload.permissions || {};
    var actor = payload.embedActor || {};
    setReadOnlyFlag(perms);
    var title = document.querySelector(".pst-page-title");
    if (title && actor.scanTitle) title.textContent = actor.scanTitle;
    if (!perms.canConfirmSale) {
      disableEl(document.getElementById("pst-confirm"));
      disableEl(document.getElementById("pst-cancel-confirm"));
      var reviewFinish = document.getElementById("pst-review-finish");
      disableEl(reviewFinish);
      var notice = document.querySelector(".pst-notice span");
      if (notice) {
        notice.textContent =
          actor.saleReadOnlyNote ||
          "Просмотр макета. Подтверждение продажи недоступно без права «Продажа и начисление».";
      }
    }
    document.documentElement.dataset.embedScanMode = perms.canScan ? "scan" : "view";
  }

  function apply144(payload) {
    var actor = payload.embedActor || {};
    var perms = payload.permissions || {};
    var ctx = payload.purchaseCtx || {};
    var dir = document.querySelector(".op-direction");
    if (dir && actor.directionLabel) dir.textContent = actor.directionLabel;
    if (ctx.certCode) {
      var doc = document.querySelector(".op-document strong");
      if (doc) doc.textContent = ctx.certCode;
    }
    if (ctx.amount != null) {
      var pay = document.querySelector(".op-payable");
      if (pay) pay.textContent = Number(ctx.amount).toLocaleString("ru-RU") + " ₽";
    }
    if (ctx.partner) {
      var part = document.querySelector(".op-participants strong");
      if (part) part.textContent = ctx.partner;
    }
    var focus = document.getElementById("op-focus-label");
    if (focus && (payload.role === "agent" || payload.role === "specialist")) {
      focus.textContent = "Связанное начисление · просмотр";
    }
    if (perms.viewOnly) {
      document.documentElement.dataset.embedReadonly = "1";
      var actions = document.querySelectorAll(".op-actions button, .op-actions a");
      actions.forEach(function (btn) {
        if (!btn.classList.contains("op-back")) {
          btn.setAttribute("hidden", "");
          btn.setAttribute("aria-disabled", "true");
        }
      });
    }
  }

  function apply145(payload) {
    var actor = payload.embedActor || {};
    if (typeof window.__protoApplyReceiptEmbedCtx === "function" && payload.receiptCtx) {
      window.__protoApplyReceiptEmbedCtx(payload);
    }
    if (payload.permissions && payload.permissions.viewOnly) {
      document.documentElement.dataset.embedReadonly = "1";
    }
    var title = document.getElementById("prr-dialog-title");
    if (title) {
      title.textContent =
        actor.receiptMode === "earned"
          ? "Квитанция заработанного вознаграждения"
          : "Начисление по сертификату";
    }
    var hero = document.getElementById("prr-hero-label");
    if (hero && actor.receiptHeroLabel && !payload.receiptCtx) hero.textContent = actor.receiptHeroLabel;
    var topTitle = document.querySelector(".prr-top__title");
    if (topTitle && actor.contextBadge) topTitle.textContent = actor.contextBadge;
  }

  window.__protoEmbedApplyContext = function applyContext(payload, n) {
    var target = n || pageN;
    if (payload && payload.role) {
      document.documentElement.dataset.embedRole = payload.role;
    }
    if (target === 147) apply147(payload);
    else if (target === 146) apply146(payload);
    else if (target === 144) apply144(payload);
    else if (target === 145) apply145(payload);
    setReadOnlyFlag(payload.permissions);
  };

  window.addEventListener("message", function (ev) {
    var data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== pageN) return;
    window.__protoEmbedApplyContext(data.payload, pageN);
  });

  post({ type: "need-context", pageN: pageN || null });
})();
