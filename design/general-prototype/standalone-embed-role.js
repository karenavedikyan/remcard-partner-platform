(function protoStandaloneEmbedRole() {
  var params;
  try {
    params =
      typeof window.__protoCabinetEmbedParams === "function"
        ? window.__protoCabinetEmbedParams()
        : new URLSearchParams(window.location.search);
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
    if (typeof window.__protoWalletSetAccrualLabels === "function") {
      window.__protoWalletSetAccrualLabels(actor);
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

  var scan146GuardsReady = false;
  var scanSaleLocking = false;
  var scanSaleRelockScheduled = false;
  var SCAN_SALE_ACTION_SELECTOR =
    "#pst-confirm, #pst-cancel-confirm, #pst-review-finish, #pst-overlay-review .pst-dialog__actions .pst-btn--primary";

  function embedCanConfirmSale() {
    var perms = window.__protoEmbedPermissions;
    return !!(perms && perms.canConfirmSale);
  }

  function lockScanSaleEl(el) {
    if (!el) return;
    if (el.disabled !== true) el.disabled = true;
    if (el.getAttribute("aria-disabled") !== "true") el.setAttribute("aria-disabled", "true");
    if (!el.hasAttribute("hidden")) el.setAttribute("hidden", "");
    if (!el.hasAttribute("data-embed-sale-locked")) el.setAttribute("data-embed-sale-locked", "");
  }

  function releaseScanSaleEl(el) {
    if (!el) return;
    if (el.hasAttribute("data-embed-sale-locked")) el.removeAttribute("data-embed-sale-locked");
    if (el.hasAttribute("hidden")) el.removeAttribute("hidden");
  }

  function closeScanReviewIfOpen() {
    var overlay = document.getElementById("pst-overlay-review");
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    if (!overlay.hasAttribute("hidden")) overlay.setAttribute("hidden", "");
    var dialog = overlay.querySelector(".pst-dialog");
    if (dialog && typeof dialog.blur === "function") dialog.blur();
  }

  function scanSaleLockedNotice() {
    return "Просмотр макета. Подтверждение продажи недоступно без права «Продажа и начисление».";
  }

  function lockAllScanSaleActions(noticeText) {
    if (embedCanConfirmSale() || scanSaleLocking) return;
    scanSaleLocking = true;
    try {
      if (document.documentElement.dataset.embedSaleLocked !== "1") {
        document.documentElement.dataset.embedSaleLocked = "1";
      }
      document.querySelectorAll(SCAN_SALE_ACTION_SELECTOR).forEach(lockScanSaleEl);
      closeScanReviewIfOpen();
      var reason = document.getElementById("pst-block-reason");
      var nextNotice = noticeText || scanSaleLockedNotice();
      if (reason && reason.textContent !== nextNotice) reason.textContent = nextNotice;
    } finally {
      scanSaleLocking = false;
    }
  }

  function releaseScanSaleActionLocks() {
    scanSaleLocking = true;
    try {
      if (document.documentElement.dataset.embedSaleLocked === "1") {
        delete document.documentElement.dataset.embedSaleLocked;
      }
      document.querySelectorAll("[data-embed-sale-locked]").forEach(releaseScanSaleEl);
    } finally {
      scanSaleLocking = false;
    }
  }

  function isScanSaleActionTarget(node) {
    if (!node || !node.closest) return false;
    return !!node.closest(SCAN_SALE_ACTION_SELECTOR);
  }

  function installScan146SaleGuards() {
    if (scan146GuardsReady) return;
    scan146GuardsReady = true;

    document.addEventListener(
      "click",
      function (e) {
        if (embedCanConfirmSale()) return;
        if (!isScanSaleActionTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        lockAllScanSaleActions();
      },
      true,
    );

    var scheduleRelock = function () {
      if (embedCanConfirmSale() || scanSaleLocking) return;
      if (scanSaleRelockScheduled) return;
      scanSaleRelockScheduled = true;
      requestAnimationFrame(function () {
        scanSaleRelockScheduled = false;
        if (!embedCanConfirmSale() && !scanSaleLocking) lockAllScanSaleActions();
      });
    };

    var form = document.getElementById("pst-form");
    if (form) {
      form.addEventListener("input", scheduleRelock, true);
      form.addEventListener("change", scheduleRelock, true);
    }

    function watchScanSaleNodes() {
      var confirm = document.getElementById("pst-confirm");
      if (confirm) {
        new MutationObserver(function () {
          if (scanSaleLocking || embedCanConfirmSale()) return;
          scheduleRelock();
        }).observe(confirm, {
          attributes: true,
          attributeFilter: ["disabled", "aria-disabled", "hidden"],
        });
      }
      var reviewActions = document.querySelector("#pst-overlay-review .pst-dialog__actions");
      if (reviewActions) {
        new MutationObserver(function () {
          if (scanSaleLocking || embedCanConfirmSale()) return;
          scheduleRelock();
        }).observe(reviewActions, {
          childList: true,
          subtree: true,
        });
      }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", watchScanSaleNodes, { once: true });
    } else {
      watchScanSaleNodes();
    }
  }

  function apply146(payload) {
    var perms = payload.permissions || {};
    var actor = payload.embedActor || {};
    window.__protoEmbedPermissions = Object.assign({}, perms);
    setReadOnlyFlag(perms);
    installScan146SaleGuards();
    var title = document.querySelector(".pst-page-title");
    if (title && actor.scanTitle) title.textContent = actor.scanTitle;
    var notice = document.querySelector(".pst-notice span");
    var saleNotice = actor.saleReadOnlyNote || scanSaleLockedNotice();
    if (!perms.canConfirmSale) {
      lockAllScanSaleActions(saleNotice);
      if (notice) notice.textContent = saleNotice;
    } else {
      releaseScanSaleActionLocks();
    }
    document.documentElement.dataset.embedScanMode = perms.canScan ? "scan" : "view";
  }

  function apply144(payload) {
    var perms = payload.permissions || {};
    var ctx = payload.purchaseCtx || {};
    if (payload.designExample || ctx.designExample) {
      var note144 = document.getElementById("op-embed-design-note");
      if (!note144) {
        note144 = document.createElement("p");
        note144.id = "op-embed-design-note";
        note144.className = "notice op-embed-design-note";
        var titleRow = document.querySelector(".op-title-row");
        if (titleRow) titleRow.insertAdjacentElement("afterend", note144);
      }
      note144.textContent =
        "Дизайн-макет без привязки к выбранной покупке в обращениях. Цифры на странице — демонстрационный пример.";
      if (typeof window.__protoCabinetEmbedSignalContentReady === "function") {
        window.__protoCabinetEmbedSignalContentReady(144);
      }
      return;
    }
    if (typeof window.__protoApplyPurchaseEmbedCtx === "function" && ctx.embedSnapshot) {
      window.__protoApplyPurchaseEmbedCtx(payload);
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
    if (payload.designExample || payload.receiptCtx?.designExample) {
      var note145 = document.getElementById("prr-embed-design-note");
      if (!note145) {
        note145 = document.createElement("p");
        note145.id = "prr-embed-design-note";
        note145.className = "notice";
        var main = document.querySelector(".prr-main");
        if (main) main.prepend(note145);
      }
      note145.textContent =
        "Дизайн-макет квитанции без снимка выбранной покупки. Откройте покупку в обращениях, чтобы увидеть связанный пример.";
      if (typeof window.__protoCabinetEmbedSignalContentReady === "function") {
        window.__protoCabinetEmbedSignalContentReady(145);
      }
      return;
    }
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

  function finishEmbedApply(target) {
    setReadOnlyFlag(window.__protoEmbedPermissions);
    if (typeof window.__protoCabinetEmbedSignalContentReady === "function") {
      window.__protoCabinetEmbedSignalContentReady(target);
    }
  }

  window.__protoEmbedApplyContext = function applyContext(payload, n) {
    var target = n || pageN;
    if (payload && payload.permissions) {
      window.__protoEmbedPermissions = Object.assign({}, payload.permissions);
    }
    if (payload && payload.role) {
      document.documentElement.dataset.embedRole = payload.role;
    }
    if (target === 147) apply147(payload);
    else if (target === 146) apply146(payload);
    else if (target === 144) apply144(payload);
    else if (target === 145) apply145(payload);
    finishEmbedApply(target);
  };

  window.addEventListener("message", function (ev) {
    var data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== pageN) return;
    window.__protoEmbedApplyContext(data.payload, pageN);
  });

  post({ type: "need-context", pageN: pageN || null });
})();
