// Generated from accepted standalone sources by build-native-cabinet-pages.mjs.
function installRole(document, window, location, parent, matchMedia) {
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
      if (typeof window.__protoCabinetEmbedPost === "function") {
        window.__protoCabinetEmbedPost(msg);
        return;
      }
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
  if (pageN) window.__protoCabinetEmbedAdapterReady?.(pageN);
})();

}
export const NATIVE_PAGES = {
143: {bodyClass:"",html:"\n  <header class=\"preview-header\">\n    <a class=\"back\" href=\"../index.html\">← Все прототипы</a>\n    <span class=\"brand\">remcard<span>.</span></span>\n    <span class=\"preview-label\">Карточка партнёра</span>\n  </header>\n  <main class=\"page\">\n    <div class=\"page-heading\"><div><p class=\"eyebrow\">Личный кабинет партнёра</p><h1>Партнёры</h1></div><span class=\"demo-label\">Прототип · демоданные</span></div>\n    <section class=\"list\" aria-label=\"Демонстрационный список партнёров\">\n      <div class=\"list-person\"><span class=\"avatar\" aria-hidden=\"true\">А</span><div><strong>Артем</strong><p>Специалист · Краснодар</p></div><button class=\"button secondary\" id=\"open-detail\">Открыть карточку <span aria-hidden=\"true\">↗</span></button></div>\n    </section>\n    <p class=\"page-note\">Дизайн для согласования. Ничего не меняет в рабочем кабинете.</p>\n  </main>\n\n  <dialog id=\"partner-dialog\" class=\"partner-dialog\" aria-labelledby=\"partner-title\">\n    <header class=\"dialog-top\">\n      <p>Карточка партнёра</p>\n      <div class=\"top-actions\">\n        <button class=\"icon-button\" id=\"theme\" aria-label=\"Включить тёмную тему\" title=\"Переключить тему\">\n          <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M20.8 13a8.8 8.8 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z\"/></svg>\n        </button>\n        <button class=\"icon-button\" id=\"close-detail\" aria-label=\"Закрыть карточку\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m6 6 12 12M6 18 18 6\"/></svg></button>\n      </div>\n    </header>\n    <div class=\"dialog-scroll\">\n      <section class=\"identity\" aria-label=\"Партнёр\">\n        <div class=\"identity-main\"><span class=\"avatar avatar-large\" aria-hidden=\"true\">А</span><div><h2 id=\"partner-title\">Артем</h2><p>Специалист · Краснодар</p></div></div>\n        <span class=\"status\" id=\"partner-status\"><svg viewBox=\"0 0 16 16\" aria-hidden=\"true\"><path d=\"m3 8 3 3 7-7\"/></svg><span>Активно</span></span>\n      </section>\n\n      <section class=\"specialization\" aria-labelledby=\"specialization-heading\">\n        <h3 id=\"specialization-heading\">Специализации и категории</h3>\n        <span class=\"tag\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"4\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"14\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"4\" y=\"14\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"14\" y=\"14\" width=\"6\" height=\"6\" rx=\"1\"/></svg>Плитка</span>\n      </section>\n\n      <section class=\"terms\" aria-labelledby=\"terms-heading\">\n        <header class=\"section-head\"><div><p class=\"eyebrow\">Действующие условия</p><h3 id=\"terms-heading\">Ваши условия по категориям</h3></div></header>\n        <dl class=\"rate-list\">\n          <div class=\"rate-row\">\n            <dt><span class=\"category-icon\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><path d=\"M5 21h14M7 21V3h10v18M10 12h.01\"/></svg></span><span>Двери</span></dt>\n            <dd>15<span>%</span></dd>\n          </div>\n          <div class=\"rate-row\">\n            <dt><span class=\"category-icon\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><path d=\"m3 9 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 19l9 5 9-5\" transform=\"translate(0 -2)\"/></svg></span><span>Напольные покрытия</span></dt>\n            <dd>10<span>%</span></dd>\n          </div>\n          <div class=\"rate-row\">\n            <dt><span class=\"category-icon\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><rect x=\"5\" y=\"10\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3m-4 5v2\"/></svg></span><span>Фурнитура и замки</span></dt>\n            <dd>15<span>%</span></dd>\n          </div>\n        </dl>\n        <details class=\"explanation\">\n          <summary><span>Как работают проценты</span><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m8 10 4 4 4-4\"/></svg></summary>\n          <p>Процент по категории — общий лимит на скидку клиенту и вознаграждение партнёру. Его распределение задаётся при создании сертификата.</p>\n        </details>\n      </section>\n\n      <div class=\"draft-note\" id=\"draft-note\" role=\"status\" hidden></div>\n      <div class=\"paused-note\" id=\"paused-note\" role=\"status\" hidden>В демонстрации сотрудничество на паузе. Создание новых сертификатов недоступно.</div>\n\n      <section class=\"cooperation\" aria-labelledby=\"cooperation-heading\">\n        <div><h3 id=\"cooperation-heading\">Сотрудничество</h3><p id=\"cooperation-hint\">Условия согласованы, можно работать.</p></div>\n        <button class=\"quiet-button\" id=\"pause\">Приостановить</button>\n      </section>\n    </div>\n    <footer class=\"dialog-footer\">\n      <div class=\"footer-actions\">\n        <button class=\"button secondary\" id=\"edit-terms\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15v5Z\"/></svg>Изменить условия</button>\n        <button class=\"button primary\" id=\"certificate\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 5v14M5 12h14\"/></svg>Создать сертификат</button>\n      </div>\n      <p class=\"footer-note\">Прототип · все действия демонстрационные</p>\n    </footer>\n  </dialog>\n\n  <dialog id=\"edit-dialog\" class=\"sub-dialog\" aria-labelledby=\"edit-title\">\n    <form id=\"terms-form\">\n      <header class=\"sub-heading\"><div><p class=\"eyebrow\">Предложение партнёру</p><h2 id=\"edit-title\">Изменить условия</h2></div><button type=\"button\" class=\"icon-button\" data-close=\"edit-dialog\" aria-label=\"Закрыть изменение условий\">×</button></header>\n      <p class=\"sub-copy\">Посмотрите, как будет выглядеть предложение. Действующие условия пока не изменятся.</p>\n      <div class=\"input-list\">\n        <label for=\"rate-doors\">Двери<span class=\"input-wrap\"><input id=\"rate-doors\" name=\"doors\" type=\"number\" min=\"0\" max=\"100\" step=\"0.1\" value=\"15\" required inputmode=\"decimal\" aria-label=\"Двери, процент\"><span>%</span></span></label>\n        <label for=\"rate-floor\">Напольные покрытия<span class=\"input-wrap\"><input id=\"rate-floor\" name=\"floor\" type=\"number\" min=\"0\" max=\"100\" step=\"0.1\" value=\"10\" required inputmode=\"decimal\" aria-label=\"Напольные покрытия, процент\"><span>%</span></span></label>\n        <label for=\"rate-locks\">Фурнитура и замки<span class=\"input-wrap\"><input id=\"rate-locks\" name=\"locks\" type=\"number\" min=\"0\" max=\"100\" step=\"0.1\" value=\"15\" required inputmode=\"decimal\" aria-label=\"Фурнитура и замки, процент\"><span>%</span></span></label>\n      </div>\n      <p class=\"sub-note\">Только предпросмотр. Предложение никому не отправляется.</p>\n      <div class=\"sub-actions\"><button type=\"button\" class=\"button secondary\" data-close=\"edit-dialog\">Отмена</button><button type=\"submit\" class=\"button primary\">Показать предложение</button></div>\n    </form>\n  </dialog>\n\n  <dialog id=\"pause-dialog\" class=\"sub-dialog\" aria-labelledby=\"pause-title\">\n    <header class=\"sub-heading\"><h2 id=\"pause-title\">Приостановить сотрудничество?</h2><button class=\"icon-button\" data-close=\"pause-dialog\" aria-label=\"Закрыть подтверждение\">×</button></header>\n    <p class=\"sub-copy\">Новые сертификаты для Артема будут недоступны. Сотрудничество можно будет возобновить.</p>\n    <p class=\"sub-note\">Демонстрация состояния. Реальное сотрудничество не изменится.</p>\n    <div class=\"sub-actions\"><button class=\"button secondary\" data-close=\"pause-dialog\">Не приостанавливать</button><button class=\"button primary\" id=\"confirm-pause\">Приостановить в демо</button></div>\n  </dialog>\n\n  <dialog id=\"certificate-dialog\" class=\"sub-dialog\" aria-labelledby=\"certificate-title\">\n    <header class=\"sub-heading\"><div><p class=\"eyebrow\">Следующий шаг</p><h2 id=\"certificate-title\">Создание сертификата</h2></div><button class=\"icon-button\" data-close=\"certificate-dialog\" aria-label=\"Закрыть следующий шаг\">×</button></header>\n    <p class=\"sub-copy\">На сайте здесь откроется существующий сценарий создания сертификата для партнёра Артем с действующими условиями.</p>\n    <div class=\"demo-handoff\"><strong>Двери 15% · Напольные покрытия 10% · Фурнитура и замки 15%</strong><p>Это только переход в макете. Сертификат не создан, клиентские данные не запрашиваются.</p></div>\n    <div class=\"sub-actions\"><button class=\"button primary\" data-close=\"certificate-dialog\">Вернуться к партнёру</button></div>\n  </dialog>\n  \n  \n",css:".native-document{color-scheme:light;--bg:#f6f5f3;--surface:#fff;--soft:#f4f3f0;--ink:#252923;--muted:#646a61;--line:#e5e5df;--brand:#ba272d;--on-brand:#fff;--brand-soft:#fbefec;--brand-line:#ebceca;--green:#35684b;--green-soft:#eaf3ec;--overlay:rgba(28,34,28,.34);--focus:#a91d25;--shadow:0 24px 90px rgba(29,35,29,.17)}\n.native-document[data-theme=dark]{color-scheme:dark;--bg:#131917;--surface:#1c2421;--soft:#252e29;--ink:#eaf0ec;--muted:#b0bdb4;--line:#3a473f;--brand:#f3786d;--on-brand:#251710;--brand-soft:#322624;--brand-line:#65413d;--green:#a0d5b3;--green-soft:#263c30;--overlay:rgba(5,12,8,.64);--focus:#ffb3a9;--shadow:0 24px 90px rgba(0,0,0,.35)}\n*{box-sizing:border-box}\n.native-body{margin:0;background:var(--bg);color:var(--ink);font-family:Manrope,Arial,sans-serif;font-size:14px;font-weight:500;line-height:1.5}\nbutton,input{font:inherit}\nbutton,a,summary{-webkit-tap-highlight-color:transparent;touch-action:manipulation}\nbutton{cursor:pointer;color:inherit}\na{color:inherit}\nbutton:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--focus);outline-offset:3px}\nsvg{width:20px;height:20px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\nh1,h2,h3,p,dl,dd{margin:0}\nh1,h2,h3{font-weight:800;line-height:1.3}\nh1,h2{font-size:20px}\nh3{font-size:14px}\n.preview-header{min-height:76px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:24px;padding:12px 32px;background:var(--surface)}\n.back{display:inline-flex;align-items:center;min-height:44px;font-size:13px;text-decoration:none;color:var(--muted)}\n.brand{font-size:24px;font-weight:800;letter-spacing:-1px}\n.brand span{color:var(--brand)}\n.preview-label{color:var(--muted);font-size:13px;margin-left:auto}\n.page{max-width:1000px;margin:52px auto;padding:0 24px}\n.page-heading{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:24px}\n.eyebrow{font-size:12px;font-weight:700;letter-spacing:.045em;text-transform:uppercase;color:var(--muted)}\n.page h1{margin-top:8px}\n.demo-label,.page-note{color:var(--muted);font-size:12px}\n.list{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:20px 24px}\n.list-person{display:flex;align-items:center;gap:16px}\n.list-person p{color:var(--muted);font-size:13px;margin-top:4px}\n.list-person button{margin-left:auto}\n.page-note{margin:16px 0}\n.avatar{width:44px;height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;background:var(--soft);color:var(--muted);font-size:19px;font-weight:800;flex-shrink:0}\n.avatar-large{width:52px;height:52px;border-radius:16px;font-size:24px}\ndialog{border:1px solid var(--line);padding:0;color:var(--ink);background:var(--surface);box-shadow:var(--shadow);overflow:visible}\ndialog::backdrop{background:var(--overlay);backdrop-filter:blur(3px)}\n.partner-dialog{width:620px;max-width:calc(100vw - 40px);max-height:min(860px,calc(100dvh - 64px));border-radius:24px}\n.partner-dialog[open]{display:flex;flex-direction:column}\n.dialog-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px 8px 28px;flex-shrink:0}\n.dialog-top>p{font-size:13px;color:var(--muted);font-weight:700}\n.top-actions{display:flex;gap:4px}\n.icon-button{width:44px;height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:12px;font-size:25px}\n.icon-button:hover{background:var(--soft)}\n.dialog-scroll{padding:8px 28px 24px;overflow:auto;overscroll-behavior:contain;min-height:0}\n.identity{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:6px 0 24px}\n.identity-main{display:flex;align-items:center;gap:14px;min-width:0}\n.identity-main h2{font-size:20px;margin-bottom:5px}\n.identity p{font-size:13px;color:var(--muted)}\n.status{display:inline-flex;align-items:center;justify-content:center;gap:5px;color:var(--green);background:var(--green-soft);border-radius:8px;padding:5px 9px;font-size:12px;font-weight:800;white-space:nowrap}\n.status svg{width:14px;height:14px}\n.status.is-paused{background:var(--soft);color:var(--muted)}\n.specialization{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--line)}\n.specialization h3{font-size:12px;font-weight:600;color:var(--muted)}\n.tag{display:inline-flex;align-items:center;gap:7px;background:var(--soft);padding:7px 10px;border-radius:8px;font-size:12px;font-weight:700}\n.tag svg{width:15px;height:15px;color:var(--muted)}\n.section-head{margin-bottom:18px}\n.section-head h3{font-size:16px;margin-top:6px}\n.rate-list{border:1px solid var(--brand-line);border-radius:16px;padding:0 18px;background:var(--brand-soft)}\n.rate-row{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:80px}\n.rate-row+.rate-row{border-top:1px solid var(--brand-line)}\n.rate-row dt{display:flex;align-items:center;gap:12px;font-size:14px;font-weight:700;min-width:0}\n.category-icon{display:flex;align-items:center;justify-content:center;width:32px;flex-shrink:0;color:var(--brand)}\n.category-icon svg{width:24px;height:24px}\n.rate-row dd{font-size:30px;line-height:1.2;letter-spacing:-1.2px;font-weight:800;color:var(--brand);font-variant-numeric:tabular-nums;white-space:nowrap}\n.rate-row dd span{font-size:17px;letter-spacing:0;margin-left:3px}\n.explanation{margin-top:4px}\n.explanation summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;cursor:pointer;color:var(--muted);font-size:12px;font-weight:600;border-radius:6px}\n.explanation summary::-webkit-details-marker{display:none}\n.explanation summary svg{width:16px;height:16px}\n.explanation[open] summary svg{transform:rotate(180deg)}\n.explanation>p{font-size:12px;color:var(--muted);padding:0 20px 16px 0;line-height:1.7}\n.cooperation{border-top:1px solid var(--line);margin-top:16px;padding-top:18px;display:flex;align-items:center;justify-content:space-between;gap:16px}\n.cooperation h3{font-size:13px;font-weight:700}\n.cooperation p{font-size:12px;color:var(--muted);margin-top:5px}\n.quiet-button{min-height:44px;min-width:44px;background:transparent;border:0;border-radius:8px;font-size:12px;font-weight:700;color:var(--muted);padding:10px 4px}\n.quiet-button:hover{color:var(--brand);text-decoration:underline}\n.dialog-footer{border-top:1px solid var(--line);padding:18px 28px 16px;flex-shrink:0;border-radius:0 0 24px 24px;background:var(--surface)}\n.footer-actions{display:grid;grid-template-columns:1fr 1.16fr;gap:10px}\n.button{min-height:46px;min-width:44px;display:inline-flex;justify-content:center;align-items:center;gap:8px;border:1px solid transparent;border-radius:11px;padding:11px 15px;font-size:13px;font-weight:800;text-decoration:none;line-height:1.4}\n.button svg{width:17px;height:17px}\n.primary{background:var(--brand);color:var(--on-brand)}\n.primary:hover:not(:disabled){filter:brightness(.95)}\n.secondary{border-color:var(--line);background:var(--surface)}\n.secondary:hover{background:var(--soft)}\n.button:disabled{background:var(--soft);color:var(--muted);border-color:var(--line);cursor:not-allowed}\n.footer-note{text-align:center;font-size:12px;color:var(--muted);margin-top:12px}\n.sub-dialog{width:480px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);overflow:auto;border-radius:20px;padding:24px}\n.sub-heading{display:flex;align-items:start;justify-content:space-between;gap:12px}\n.sub-heading h2{font-size:18px;line-height:1.5}\n.sub-heading .eyebrow{margin-bottom:6px}\n.sub-heading .icon-button{margin:-10px -12px 0 0;flex-shrink:0}\n.sub-copy{color:var(--muted);margin-top:16px;font-size:13px;line-height:1.7}\n.sub-note{font-size:12px;color:var(--muted);background:var(--soft);padding:12px;border-radius:9px;margin:16px 0}\n.input-list{margin:18px 0}\n.input-list label{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px;border-bottom:1px solid var(--line);font-size:13px;font-weight:700}\n.input-wrap{position:relative;flex-shrink:0;width:96px}\n.input-wrap input{width:100%;height:46px;border:1px solid var(--line);border-radius:9px;padding:10px 26px 10px 10px;background:var(--surface);color:var(--ink);font-size:15px;font-weight:700;appearance:textfield;-moz-appearance:textfield}\n.input-wrap input::-webkit-inner-spin-button{appearance:none}\n.input-wrap>span{position:absolute;right:12px;top:12px;font-size:14px;color:var(--muted);pointer-events:none}\n.sub-actions{display:flex;justify-content:end;gap:10px;margin-top:22px;flex-wrap:wrap}\n.sub-actions .button{flex:1}\n.demo-handoff{margin-top:18px;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--soft);font-size:13px;line-height:1.8}\n.demo-handoff p{font-size:12px;color:var(--muted);margin-top:8px}\n.draft-note,.paused-note{margin:12px 0;padding:12px 14px;background:var(--soft);border:1px solid var(--line);border-radius:10px;font-size:12px;line-height:1.7}\n.draft-note strong{display:block;margin-bottom:5px}\n[hidden]{display:none!important}\n@media(max-width:600px){\n  .preview-header{padding:12px 18px;gap:16px}.preview-label{display:none}.brand{margin-left:auto}\n  .page{margin:28px auto;padding:0 18px}.page-heading{align-items:start;flex-direction:column;gap:12px}\n  .list{padding:16px}.list-person{flex-wrap:wrap}.list-person button{width:100%;margin:6px 0 0}\n  .partner-dialog{max-width:calc(100vw - 20px);max-height:calc(100dvh - 24px);border-radius:20px}\n  .dialog-top{padding:10px 10px 8px 20px}.dialog-scroll{padding:4px 20px 18px}\n  .identity{gap:10px;margin:6px 0 20px}.identity-main{gap:10px}.avatar-large{width:44px;height:44px;border-radius:13px;font-size:21px}\n  .identity-main h2{font-size:20px}.identity p{font-size:12px;max-width:148px}\n  .status{font-size:12px;padding:5px 7px;gap:3px}.status svg{width:12px;height:12px}\n  .specialization{gap:12px;margin-bottom:20px;padding-bottom:20px}.specialization h3{max-width:175px}\n  .section-head{margin-bottom:14px}.section-head h3{font-size:15px}\n  .rate-list{padding:0 13px;border-radius:14px}.rate-row{min-height:76px;gap:10px}.rate-row dt{font-size:13px;gap:8px}.category-icon{width:24px}.category-icon svg{width:21px;height:21px}.rate-row dd{font-size:28px}\n  .cooperation{gap:10px;padding-top:14px;margin-top:10px}.cooperation p{max-width:185px}.quiet-button{font-size:12px}\n  .dialog-footer{padding:14px 20px 14px;border-radius:0 0 20px 20px}\n  .footer-actions{grid-template-columns:1fr;gap:8px}.footer-actions .primary{grid-row:1}.button{min-height:46px}\n  .footer-note{font-size:12px;margin-top:10px}.sub-dialog{padding:20px}\n}\n@media(max-width:350px){.dialog-scroll{padding-inline:16px}.dialog-top{padding-left:16px}.dialog-footer{padding-inline:16px}.identity-main{gap:8px}.avatar-large{display:none}.status{padding-inline:6px}.specialization h3{max-width:150px}.rate-row dt{font-size:12px}.rate-row dd{font-size:26px}.rate-row{gap:7px}.category-icon{width:20px}.sub-actions{flex-direction:column}.input-list label{font-size:12px;gap:10px}.input-wrap{width:80px}}\n@media(prefers-reduced-motion:no-preference){button,a{transition:background-color .15s ease,color .15s ease,filter .15s ease}}\n\n.native-document.cabinet-embed-mode .preview-header,\n.native-document.cabinet-embed-mode header.top,\n.native-document.cabinet-embed-mode header.op-top,\n.native-document.cabinet-embed-mode a.back[href*=\"index.html\"],\n.native-document.cabinet-embed-mode .page-heading + .list,\n.native-document.cabinet-embed-mode .page-note,\n.native-document.cabinet-embed-mode .op-page-footer a[href*=\"partner-cooperation\"] {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-mode .native-body {\n  min-height: 100%;\n  background: var(--bg, #f6f6f4);\n}\n\n.native-document.cabinet-embed-mode .skip,\n.native-document.cabinet-embed-mode a.skip {\n  position: absolute;\n  left: -9999px;\n}\n\n.native-document.cabinet-embed-mode .proto-page-flow,\n.native-document.cabinet-embed-mode .proto-page-panel,\n.native-document.cabinet-embed-mode [data-proto-ui=\"flow\"],\n.native-document.cabinet-embed-mode [data-proto-ui=\"panel\"] {\n  display: none !important;\n  visibility: hidden !important;\n  pointer-events: none !important;\n}\n\n.native-document.cabinet-embed-mode main.page,\n.native-document.cabinet-embed-mode main.page > .page-heading {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-mode .native-body {\n  overflow: auto;\n  height: 100%;\n  margin: 0;\n}\n\n.native-document.cabinet-embed-cooperation-panel .partner-dialog.embed-cooperation-panel,\n.native-document.cabinet-embed-mode dialog.partner-dialog.embed-cooperation-panel {\n  position: static !important;\n  display: flex !important;\n  flex-direction: column !important;\n  width: 100% !important;\n  max-width: none !important;\n  max-height: none !important;\n  height: auto !important;\n  min-height: 100% !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border: none !important;\n  border-radius: 0 !important;\n  box-shadow: none !important;\n  background: var(--bg, #f6f6f4) !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel .partner-dialog::backdrop,\n.native-document.cabinet-embed-mode dialog.partner-dialog::backdrop {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel #edit-dialog,\n.native-document.cabinet-embed-cooperation-panel #pause-dialog,\n.native-document.cabinet-embed-cooperation-panel #certificate-dialog {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel .dialog-scroll {\n  flex: 1 1 auto;\n  overflow: auto;\n  max-height: none;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental {\n  margin-top: 1rem;\n  display: grid;\n  gap: 1rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental .counterparty-profile,\n.native-document.cabinet-embed-mode .embed-supplemental .stack,\n.native-document.cabinet-embed-mode .embed-supplemental .fold-list {\n  font: inherit;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  align-items: center;\n  margin-top: 0.75rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions .certificate-list-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions .certificate-list-action,\n.native-document.cabinet-embed-mode .embed-supplemental-actions .btn {\n  font: inherit;\n  cursor: pointer;\n}\n",install(document,window,location,parent,matchMedia){
installRole(document,window,location,parent,matchMedia);
{
(function partnerCooperationDetailEmbed() {
  const params =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  const byId = (id) => document.getElementById(id);

  function post(msg) {
    try {
      if (typeof window.__protoCabinetEmbedPost === "function") {
        window.__protoCabinetEmbedPost(msg);
        return;
      }
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
    wireSupplementalActions();
    signalCoopEmbedReady();
  }

  function wireSupplementalActions() {
    const root = byId("embed-supplemental");
    if (!root || root.dataset.wired === "1") return;
    root.dataset.wired = "1";
    root.addEventListener(
      "click",
      (e) => {
        const coll = e.target.closest("[data-coll-item-action]");
        if (coll) {
          e.preventDefault();
          e.stopPropagation();
          post({
            type: "supplemental",
            kind: "record",
            partnerId: window.__protoEmbedPartnerId || "",
            collKey: coll.getAttribute("data-coll-key") || "directory",
            collAction: coll.getAttribute("data-coll-item-action"),
            collId: coll.getAttribute("data-coll-id"),
          });
          return;
        }
        const act = e.target.closest("[data-action]");
        if (!act) return;
        const action = act.getAttribute("data-action") || "";
        if (
          !/^(coop-copy-id|partner-ledger|coop-change-terms|coop-view-terms|coop-pause|coop-resume):/.test(
            action,
          )
        )
          return;
        e.preventDefault();
        e.stopPropagation();
        post({
          type: "supplemental",
          kind: "action",
          action,
          partnerId: window.__protoEmbedPartnerId || action.split(":")[1] || "",
        });
      },
      true,
    );
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

  function signalCoopEmbedReady() {
    if (window.__protoCoopEmbedReady) return;
    window.__protoCoopEmbedReady = true;
    window.__protoCabinetEmbedSignalContentReady?.(143);
  }

  mountPanelMode();
  window.__protoCabinetEmbedAdapterReady?.(143);
  post({ type: "need-context", pageN: 143 });
  document.addEventListener("DOMContentLoaded", () => {
    post({ type: "need-context", pageN: 143 });
    wireCoopClick("pause", "toggle-pause");
    wireCoopClick("edit-terms", "edit-terms");
    wireCoopClick("certificate", "certificate");
  });
})();

}
{
(() => {
  "use strict";
  const coopParams =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  if (coopParams.get("cabinet_embed") === "1") return;
  const byId = id => document.getElementById(id);
  const detail = byId("partner-dialog");
  const certificate = byId("certificate");
  const pauseButton = byId("pause");
  let paused = false;

  // Isolated visual prototype. No API calls, credentials, storage or persistence.
  function openDialog(id) {
    const dialog = byId(id);
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog(id) {
    byId(id).close();
  }
  function showPauseState(value) {
    paused = value;
    const status = byId("partner-status");
    status.classList.toggle("is-paused", value);
    status.querySelector("span").textContent = value ? "На паузе" : "Активно";
    status.querySelector("svg").innerHTML = value
      ? '<path d="M5 3v10M11 3v10"/>'
      : '<path d="m3 8 3 3 7-7"/>';
    byId("paused-note").hidden = !value;
    byId("cooperation-hint").textContent = value
      ? "Можно возобновить в любой момент."
      : "Условия согласованы, можно работать.";
    pauseButton.textContent = value ? "Возобновить" : "Приостановить";
    certificate.disabled = value;
    certificate.title = value ? "Сначала возобновите сотрудничество" : "";
  }
  byId("open-detail").addEventListener("click", () => openDialog("partner-dialog"));
  byId("close-detail").addEventListener("click", () => closeDialog("partner-dialog"));
  byId("edit-terms").addEventListener("click", () => openDialog("edit-dialog"));
  certificate.addEventListener("click", () => openDialog("certificate-dialog"));
  pauseButton.addEventListener("click", () => {
    if (paused) showPauseState(false);
    else openDialog("pause-dialog");
  });
  byId("confirm-pause").addEventListener("click", () => {
    showPauseState(true);
    closeDialog("pause-dialog");
  });
  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeDialog(button.dataset.close));
  });
  byId("terms-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const note = byId("draft-note");
    const heading = document.createElement("strong");
    heading.textContent = "Предпросмотр предложения · не отправлено";
    const values = ["rate-doors", "rate-floor", "rate-locks"].map(id =>
      Number(byId(id).value).toLocaleString("ru-RU")
    );
    note.replaceChildren(
      heading,
      document.createTextNode(`Двери ${values[0]}% · Напольные покрытия ${values[1]}% · Фурнитура и замки ${values[2]}%. Действующие условия выше не изменились.`)
    );
    note.hidden = false;
    closeDialog("edit-dialog");
    note.scrollIntoView({block:"nearest"});
  });
  byId("theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    byId("theme").setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
  });
  // Native dialogs provide focus containment, Escape, and focus restoration.
  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  detail.addEventListener("close", () => byId("open-detail").focus());
  if (!coopParams.get("cabinet_embed")) openDialog("partner-dialog");
})();

}
}},
144: {bodyClass:"op-body",html:"\n  <header class=\"op-top\">\n    <a class=\"back\" href=\"../index.html\">← Все прототипы</a>\n    <a class=\"brand op-brand\" href=\"../index.html\" aria-label=\"RemCard, общий прототип\">remcard<span>.</span></a>\n    <span class=\"op-top-label\">Кабинет партнёра</span>\n    <button class=\"icon-button\" id=\"op-theme\" aria-label=\"Включить тёмную тему\" title=\"Переключить тему\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M20.8 13a8.8 8.8 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z\"/></svg></button>\n  </header>\n\n  <main class=\"op-main\">\n    <section id=\"op-detail\" aria-labelledby=\"op-title\">\n      <div class=\"op-page-nav\"><button class=\"op-back\" id=\"op-history\">← К истории</button><span class=\"op-demo\">Прототип</span></div>\n      <div class=\"op-title-row\"><h1 id=\"op-title\">Детали операции</h1></div>\n      <p class=\"op-document\"><strong>RC-X9Z0WZ</strong><span class=\"op-document-separator\">·</span><span class=\"op-direction\">Принято у меня</span></p>\n      <div class=\"op-receipt\">\n        <section class=\"op-focus\" aria-labelledby=\"op-focus-label\">\n          <h2 id=\"op-focus-label\">Вознаграждение по операции</h2>\n          <p class=\"op-accrual-amount\">5 400 <span>₽</span></p>\n          <p class=\"op-focus-note\">Начисление сохранено.<br>Статус выплаты здесь не указан.</p>\n        </section>\n        <p class=\"op-purchase-context\"><span>К оплате за покупку</span><strong class=\"op-payable\">162 000 ₽</strong></p>\n        <p class=\"op-participants\">Партнёр <strong>Артем</strong><span>·</span>Исполнитель <strong>Сергей</strong></p>\n        <details class=\"op-breakdown\" id=\"op-breakdown\">\n          <summary><span><span class=\"op-breakdown-label\">Состав и расчёт</span><span class=\"op-breakdown-hint\">Двери, фурнитура и замки</span></span><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m8 10 4 4 4-4\"/></svg></summary>\n          <div class=\"op-breakdown-body\">\n            <dl class=\"op-total-lines\"><div><dt>До скидки</dt><dd>180 000 ₽</dd></div><div><dt>Скидка клиенту</dt><dd>−18 000 ₽</dd></div></dl>\n            <article class=\"op-item\" aria-labelledby=\"op-doors\">\n              <h3 id=\"op-doors\">Двери</h3>\n              <div class=\"op-calculation-content\"><dl><div><dt>Скидка</dt><dd>150 000 ₽ × 10% = 15 000 ₽</dd></div><div><dt>К оплате за позицию</dt><dd>150 000 ₽ − 15 000 ₽ = 135 000 ₽</dd></div><div><dt>Вознаграждение</dt><dd>150 000 ₽ × 3% = 4 500 ₽</dd></div></dl></div>\n            </article>\n            <article class=\"op-item\" aria-labelledby=\"op-locks\">\n              <h3 id=\"op-locks\">Фурнитура и замки</h3>\n              <div class=\"op-calculation-content\"><dl><div><dt>Скидка</dt><dd>30 000 ₽ × 10% = 3 000 ₽</dd></div><div><dt>К оплате за позицию</dt><dd>30 000 ₽ − 3 000 ₽ = 27 000 ₽</dd></div><div><dt>Вознаграждение</dt><dd>30 000 ₽ × 3% = 900 ₽</dd></div></dl></div>\n            </article>\n            <p class=\"op-breakdown-note\">Вознаграждение рассчитано от суммы до скидки. Общее начисление складывается из вознаграждений по двум категориям и не подтверждает выплату.</p>\n          </div>\n        </details>\n        <div class=\"op-summary-actions\"><button class=\"button secondary\" id=\"op-document-operations\">Все операции по документу <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 12h14m-5-5 5 5-5 5\"/></svg></button></div>\n      </div>\n    </section>\n\n    <section id=\"op-history-view\" aria-labelledby=\"op-history-title\" hidden>\n      <div class=\"op-page-nav\"><button class=\"op-back\" id=\"op-return-detail\">← К деталям операции</button><span class=\"op-demo\">Прототип · данные со скриншота</span></div>\n      <div class=\"op-title-row\"><div><p class=\"eyebrow\">Кабинет партнёра</p><h1 id=\"op-history-title\">История операций</h1></div></div>\n      <div class=\"op-history-toolbar\"><span id=\"op-history-filter\">Все документы</span><button class=\"quiet-button\" id=\"op-clear-filter\" hidden>Показать всю историю</button></div>\n      <p class=\"op-history-notice\">В макете показана только операция с вашего скриншота. Это не полный список операций компании и не реальные данные кабинета.</p>\n      <div class=\"op-history-card\">\n        <div><p class=\"eyebrow\">Принято у меня</p><h2>RC-X9Z0WZ</h2><p>Артем · исполнитель Сергей</p></div>\n        <dl><div><dt>К оплате</dt><dd>162 000 ₽</dd></div><div><dt>Сохранённое начисление</dt><dd>5 400 ₽</dd></div></dl>\n        <button class=\"button secondary\" id=\"op-open-detail\">Открыть операцию <span aria-hidden=\"true\">↗</span></button>\n      </div>\n    </section>\n    <footer class=\"op-page-footer\"><p>Демонстрационные данные. Реальных операций нет.</p><a href=\"partner-cooperation-detail.html\">Карточка партнёра ↗</a></footer>\n  </main>\n  \n  \n",css:".native-document{color-scheme:light;--bg:#f6f5f3;--surface:#fff;--soft:#f4f3f0;--ink:#252923;--muted:#646a61;--line:#e5e5df;--brand:#ba272d;--on-brand:#fff;--brand-soft:#fbefec;--brand-line:#ebceca;--green:#35684b;--green-soft:#eaf3ec;--overlay:rgba(28,34,28,.34);--focus:#a91d25;--shadow:0 24px 90px rgba(29,35,29,.17)}\n.native-document[data-theme=dark]{color-scheme:dark;--bg:#131917;--surface:#1c2421;--soft:#252e29;--ink:#eaf0ec;--muted:#b0bdb4;--line:#3a473f;--brand:#f3786d;--on-brand:#251710;--brand-soft:#322624;--brand-line:#65413d;--green:#a0d5b3;--green-soft:#263c30;--overlay:rgba(5,12,8,.64);--focus:#ffb3a9;--shadow:0 24px 90px rgba(0,0,0,.35)}\n*{box-sizing:border-box}\n.native-body{margin:0;background:var(--bg);color:var(--ink);font-family:Manrope,Arial,sans-serif;font-size:14px;font-weight:500;line-height:1.5}\nbutton,input{font:inherit}\nbutton,a,summary{-webkit-tap-highlight-color:transparent;touch-action:manipulation}\nbutton{cursor:pointer;color:inherit}\na{color:inherit}\nbutton:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--focus);outline-offset:3px}\nsvg{width:20px;height:20px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\nh1,h2,h3,p,dl,dd{margin:0}\nh1,h2,h3{font-weight:800;line-height:1.3}\nh1,h2{font-size:20px}\nh3{font-size:14px}\n.preview-header{min-height:76px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:24px;padding:12px 32px;background:var(--surface)}\n.back{display:inline-flex;align-items:center;min-height:44px;font-size:13px;text-decoration:none;color:var(--muted)}\n.brand{font-size:24px;font-weight:800;letter-spacing:-1px}\n.brand span{color:var(--brand)}\n.preview-label{color:var(--muted);font-size:13px;margin-left:auto}\n.page{max-width:1000px;margin:52px auto;padding:0 24px}\n.page-heading{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:24px}\n.eyebrow{font-size:12px;font-weight:700;letter-spacing:.045em;text-transform:uppercase;color:var(--muted)}\n.page h1{margin-top:8px}\n.demo-label,.page-note{color:var(--muted);font-size:12px}\n.list{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:20px 24px}\n.list-person{display:flex;align-items:center;gap:16px}\n.list-person p{color:var(--muted);font-size:13px;margin-top:4px}\n.list-person button{margin-left:auto}\n.page-note{margin:16px 0}\n.avatar{width:44px;height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;background:var(--soft);color:var(--muted);font-size:19px;font-weight:800;flex-shrink:0}\n.avatar-large{width:52px;height:52px;border-radius:16px;font-size:24px}\ndialog{border:1px solid var(--line);padding:0;color:var(--ink);background:var(--surface);box-shadow:var(--shadow);overflow:visible}\ndialog::backdrop{background:var(--overlay);backdrop-filter:blur(3px)}\n.partner-dialog{width:620px;max-width:calc(100vw - 40px);max-height:min(860px,calc(100dvh - 64px));border-radius:24px}\n.partner-dialog[open]{display:flex;flex-direction:column}\n.dialog-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px 8px 28px;flex-shrink:0}\n.dialog-top>p{font-size:13px;color:var(--muted);font-weight:700}\n.top-actions{display:flex;gap:4px}\n.icon-button{width:44px;height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:12px;font-size:25px}\n.icon-button:hover{background:var(--soft)}\n.dialog-scroll{padding:8px 28px 24px;overflow:auto;overscroll-behavior:contain;min-height:0}\n.identity{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:6px 0 24px}\n.identity-main{display:flex;align-items:center;gap:14px;min-width:0}\n.identity-main h2{font-size:20px;margin-bottom:5px}\n.identity p{font-size:13px;color:var(--muted)}\n.status{display:inline-flex;align-items:center;justify-content:center;gap:5px;color:var(--green);background:var(--green-soft);border-radius:8px;padding:5px 9px;font-size:12px;font-weight:800;white-space:nowrap}\n.status svg{width:14px;height:14px}\n.status.is-paused{background:var(--soft);color:var(--muted)}\n.specialization{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--line)}\n.specialization h3{font-size:12px;font-weight:600;color:var(--muted)}\n.tag{display:inline-flex;align-items:center;gap:7px;background:var(--soft);padding:7px 10px;border-radius:8px;font-size:12px;font-weight:700}\n.tag svg{width:15px;height:15px;color:var(--muted)}\n.section-head{margin-bottom:18px}\n.section-head h3{font-size:16px;margin-top:6px}\n.rate-list{border:1px solid var(--brand-line);border-radius:16px;padding:0 18px;background:var(--brand-soft)}\n.rate-row{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:80px}\n.rate-row+.rate-row{border-top:1px solid var(--brand-line)}\n.rate-row dt{display:flex;align-items:center;gap:12px;font-size:14px;font-weight:700;min-width:0}\n.category-icon{display:flex;align-items:center;justify-content:center;width:32px;flex-shrink:0;color:var(--brand)}\n.category-icon svg{width:24px;height:24px}\n.rate-row dd{font-size:30px;line-height:1.2;letter-spacing:-1.2px;font-weight:800;color:var(--brand);font-variant-numeric:tabular-nums;white-space:nowrap}\n.rate-row dd span{font-size:17px;letter-spacing:0;margin-left:3px}\n.explanation{margin-top:4px}\n.explanation summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;cursor:pointer;color:var(--muted);font-size:12px;font-weight:600;border-radius:6px}\n.explanation summary::-webkit-details-marker{display:none}\n.explanation summary svg{width:16px;height:16px}\n.explanation[open] summary svg{transform:rotate(180deg)}\n.explanation>p{font-size:12px;color:var(--muted);padding:0 20px 16px 0;line-height:1.7}\n.cooperation{border-top:1px solid var(--line);margin-top:16px;padding-top:18px;display:flex;align-items:center;justify-content:space-between;gap:16px}\n.cooperation h3{font-size:13px;font-weight:700}\n.cooperation p{font-size:12px;color:var(--muted);margin-top:5px}\n.quiet-button{min-height:44px;min-width:44px;background:transparent;border:0;border-radius:8px;font-size:12px;font-weight:700;color:var(--muted);padding:10px 4px}\n.quiet-button:hover{color:var(--brand);text-decoration:underline}\n.dialog-footer{border-top:1px solid var(--line);padding:18px 28px 16px;flex-shrink:0;border-radius:0 0 24px 24px;background:var(--surface)}\n.footer-actions{display:grid;grid-template-columns:1fr 1.16fr;gap:10px}\n.button{min-height:46px;min-width:44px;display:inline-flex;justify-content:center;align-items:center;gap:8px;border:1px solid transparent;border-radius:11px;padding:11px 15px;font-size:13px;font-weight:800;text-decoration:none;line-height:1.4}\n.button svg{width:17px;height:17px}\n.primary{background:var(--brand);color:var(--on-brand)}\n.primary:hover:not(:disabled){filter:brightness(.95)}\n.secondary{border-color:var(--line);background:var(--surface)}\n.secondary:hover{background:var(--soft)}\n.button:disabled{background:var(--soft);color:var(--muted);border-color:var(--line);cursor:not-allowed}\n.footer-note{text-align:center;font-size:12px;color:var(--muted);margin-top:12px}\n.sub-dialog{width:480px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);overflow:auto;border-radius:20px;padding:24px}\n.sub-heading{display:flex;align-items:start;justify-content:space-between;gap:12px}\n.sub-heading h2{font-size:18px;line-height:1.5}\n.sub-heading .eyebrow{margin-bottom:6px}\n.sub-heading .icon-button{margin:-10px -12px 0 0;flex-shrink:0}\n.sub-copy{color:var(--muted);margin-top:16px;font-size:13px;line-height:1.7}\n.sub-note{font-size:12px;color:var(--muted);background:var(--soft);padding:12px;border-radius:9px;margin:16px 0}\n.input-list{margin:18px 0}\n.input-list label{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px;border-bottom:1px solid var(--line);font-size:13px;font-weight:700}\n.input-wrap{position:relative;flex-shrink:0;width:96px}\n.input-wrap input{width:100%;height:46px;border:1px solid var(--line);border-radius:9px;padding:10px 26px 10px 10px;background:var(--surface);color:var(--ink);font-size:15px;font-weight:700;appearance:textfield;-moz-appearance:textfield}\n.input-wrap input::-webkit-inner-spin-button{appearance:none}\n.input-wrap>span{position:absolute;right:12px;top:12px;font-size:14px;color:var(--muted);pointer-events:none}\n.sub-actions{display:flex;justify-content:end;gap:10px;margin-top:22px;flex-wrap:wrap}\n.sub-actions .button{flex:1}\n.demo-handoff{margin-top:18px;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--soft);font-size:13px;line-height:1.8}\n.demo-handoff p{font-size:12px;color:var(--muted);margin-top:8px}\n.draft-note,.paused-note{margin:12px 0;padding:12px 14px;background:var(--soft);border:1px solid var(--line);border-radius:10px;font-size:12px;line-height:1.7}\n.draft-note strong{display:block;margin-bottom:5px}\n[hidden]{display:none!important}\n@media(max-width:600px){\n  .preview-header{padding:12px 18px;gap:16px}.preview-label{display:none}.brand{margin-left:auto}\n  .page{margin:28px auto;padding:0 18px}.page-heading{align-items:start;flex-direction:column;gap:12px}\n  .list{padding:16px}.list-person{flex-wrap:wrap}.list-person button{width:100%;margin:6px 0 0}\n  .partner-dialog{max-width:calc(100vw - 20px);max-height:calc(100dvh - 24px);border-radius:20px}\n  .dialog-top{padding:10px 10px 8px 20px}.dialog-scroll{padding:4px 20px 18px}\n  .identity{gap:10px;margin:6px 0 20px}.identity-main{gap:10px}.avatar-large{width:44px;height:44px;border-radius:13px;font-size:21px}\n  .identity-main h2{font-size:20px}.identity p{font-size:12px;max-width:148px}\n  .status{font-size:12px;padding:5px 7px;gap:3px}.status svg{width:12px;height:12px}\n  .specialization{gap:12px;margin-bottom:20px;padding-bottom:20px}.specialization h3{max-width:175px}\n  .section-head{margin-bottom:14px}.section-head h3{font-size:15px}\n  .rate-list{padding:0 13px;border-radius:14px}.rate-row{min-height:76px;gap:10px}.rate-row dt{font-size:13px;gap:8px}.category-icon{width:24px}.category-icon svg{width:21px;height:21px}.rate-row dd{font-size:28px}\n  .cooperation{gap:10px;padding-top:14px;margin-top:10px}.cooperation p{max-width:185px}.quiet-button{font-size:12px}\n  .dialog-footer{padding:14px 20px 14px;border-radius:0 0 20px 20px}\n  .footer-actions{grid-template-columns:1fr;gap:8px}.footer-actions .primary{grid-row:1}.button{min-height:46px}\n  .footer-note{font-size:12px;margin-top:10px}.sub-dialog{padding:20px}\n}\n@media(max-width:350px){.dialog-scroll{padding-inline:16px}.dialog-top{padding-left:16px}.dialog-footer{padding-inline:16px}.identity-main{gap:8px}.avatar-large{display:none}.status{padding-inline:6px}.specialization h3{max-width:150px}.rate-row dt{font-size:12px}.rate-row dd{font-size:26px}.rate-row{gap:7px}.category-icon{width:20px}.sub-actions{flex-direction:column}.input-list label{font-size:12px;gap:10px}.input-wrap{width:80px}}\n@media(prefers-reduced-motion:no-preference){button,a{transition:background-color .15s ease,color .15s ease,filter .15s ease}}\n\n.op-.native-body{background:var(--bg)}\n.op-top{display:flex;align-items:center;gap:28px;min-height:72px;padding:10px 36px;background:var(--surface);border-bottom:1px solid var(--line)}\n.op-brand{display:inline-flex;align-items:center;min-height:44px;text-decoration:none}\n.op-top-label{margin-left:auto;color:var(--muted);font-size:13px}\n.op-main{width:min(760px,100%);margin:0 auto;padding:10px 28px 16px}\n.op-page-nav{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:6px}\n.op-back{min-height:44px;min-width:44px;display:inline-flex;align-items:center;padding:8px 0;background:transparent;border:0;border-radius:6px;color:var(--muted);font-size:13px;font-weight:600}\n.op-back:hover{color:var(--brand)}\n.op-demo{font-size:12px;color:var(--muted)}\n.op-title-row{display:flex;align-items:center;justify-content:space-between;gap:16px}\n.op-title-row h1{font-size:20px;letter-spacing:-.4px}\n.op-direction{color:var(--muted);font-size:12px;white-space:nowrap}\n.op-document{margin:8px 0 16px;color:var(--muted);font-size:13px}\n.op-document strong{margin-left:5px;color:var(--ink);font-weight:700;letter-spacing:.02em}\n.op-receipt{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:24px 28px 18px}\n.op-summary{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding-bottom:18px}\n.op-payment,.op-accrual{min-width:0}\n.op-accrual{border-left:1px solid var(--line);padding-left:28px}\n.op-money-label{font-size:13px;font-weight:600;color:var(--muted)}\n.op-payable,.op-accrual-amount{font-size:36px;font-weight:800;letter-spacing:-1.4px;line-height:1.3;font-variant-numeric:tabular-nums;margin-top:8px;white-space:nowrap}\n.op-accrual-amount{color:var(--brand)}\n.op-payable>span,.op-accrual-amount>span{font-size:25px;font-weight:700;letter-spacing:0}\n.op-money-note{color:var(--muted);font-size:12px;line-height:1.6;margin-top:7px}\n.op-total-lines{display:flex;gap:28px;padding:15px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}\n.op-total-lines>div{display:flex;align-items:center;gap:10px;font-size:13px}\n.op-total-lines dt{color:var(--muted)}\n.op-total-lines dd{font-weight:700;font-variant-numeric:tabular-nums}\n.op-people{display:flex;gap:28px;padding:14px 0 18px}\n.op-people>div{display:flex;align-items:baseline;gap:7px;font-size:13px}\n.op-people dt{color:var(--muted)}\n.op-people dd{font-weight:700}\n.op-section-title{display:flex;align-items:baseline;justify-content:space-between;gap:18px;padding-bottom:4px}\n.op-section-title h2{font-size:15px}\n.op-section-title>span{font-size:12px;color:var(--muted)}\n.op-item{padding:14px 0 0;border-bottom:1px solid var(--line)}\n.op-line{display:flex;justify-content:space-between;gap:20px}\n.op-category{min-width:0}\n.op-category h3{font-size:15px;font-weight:800}\n.op-base{color:var(--muted);font-size:13px;margin-top:4px}\n.op-discount{color:var(--muted);font-size:12px;margin-top:3px}\n.op-discount>span{padding-inline:3px}\n.op-reward{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:end;gap:5px}\n.op-reward strong{color:var(--brand);font-size:22px;font-weight:800;line-height:1.25;letter-spacing:-.5px;font-variant-numeric:tabular-nums}\n.op-reward>span{color:var(--muted);font-size:13px;font-weight:600}\n.op-calculation summary,.op-accrual-info summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;list-style:none;cursor:pointer;border-radius:5px;font-size:12px;color:var(--muted);font-weight:600}\n.op-calculation summary::-webkit-details-marker,.op-accrual-info summary::-webkit-details-marker{display:none}\n.op-calculation summary{width:100%;margin-top:0}\n.op-calculation summary>svg,.op-accrual-info summary>svg{width:15px;height:15px}\n.op-calculation[open] summary>svg,.op-accrual-info[open] summary>svg{transform:rotate(180deg)}\n.op-calculation-content{padding:0 0 18px;font-size:12px;line-height:1.7}\n.op-calculation-content dl>div{display:flex;align-items:start;justify-content:space-between;gap:18px;padding:6px 0}\n.op-calculation-content dt{color:var(--muted)}\n.op-calculation-content dd{font-weight:700;font-variant-numeric:tabular-nums;text-align:right}\n.op-calculation-content p{color:var(--muted);margin-top:8px}\n.op-accrual-info{margin-top:4px}\n.op-accrual-info>p{color:var(--muted);font-size:12px;line-height:1.8;padding:0 0 16px}\n.op-summary-actions{display:flex;justify-content:end;margin-top:8px}\n.op-summary-actions .button{font-size:13px;gap:12px;min-height:46px;padding-inline:16px}\n.op-summary-actions .button>svg{width:17px;height:17px;color:var(--brand)}\n.op-page-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:8px 2px 0;color:var(--muted);font-size:12px}\n.op-page-footer>a{display:inline-flex;align-items:center;min-height:44px;text-decoration:none;white-space:nowrap}\n.op-page-footer>a:hover{color:var(--brand)}\n.op-history-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);padding:16px 0;font-size:13px;font-weight:700}\n.op-history-notice{color:var(--muted);font-size:13px;line-height:1.8;margin:16px 0 24px}\n.op-history-card{padding:24px;background:var(--surface);border:1px solid var(--line);border-radius:16px}\n.op-history-card h2{font-size:16px;margin-top:6px}\n.op-history-card p:not(.eyebrow){font-size:12px;color:var(--muted);margin-top:8px}\n.op-history-card dl{display:grid;gap:10px;margin:22px 0}\n.op-history-card dl>div{display:flex;gap:18px;justify-content:space-between;font-size:13px}\n.op-history-card dt{color:var(--muted)}\n.op-history-card dd{font-weight:800;font-variant-numeric:tabular-nums}\n@media(max-width:600px){\n  .op-top{gap:18px;padding:10px 18px;min-height:66px}.op-top-label{display:none}.op-brand{margin-left:auto;font-size:22px}\n  .op-main{padding:12px 16px 16px}.op-page-nav{margin-bottom:12px}\n  .op-title-row{gap:10px;align-items:baseline}.op-title-row h1{font-size:18px}.op-direction{font-size:12px}\n  .op-document{margin:7px 0 18px;font-size:12px}\n  .op-receipt{padding:22px 20px 18px;border-radius:16px}\n  .op-summary{gap:16px;padding-bottom:20px;grid-template-columns:1.08fr 1fr}.op-accrual{padding-left:16px}\n  .op-money-label{font-size:12px}\n  .op-payable,.op-accrual-amount{font-size:28px;letter-spacing:-1px;margin-top:8px}\n  .op-payable>span,.op-accrual-amount>span{font-size:20px}\n  .op-money-note{font-size:12px;line-height:1.6;margin-top:6px}\n  .op-total-lines{gap:14px;justify-content:space-between;padding-block:13px}\n  .op-total-lines>div{display:grid;gap:4px;font-size:12px}\n  .op-total-lines dd{font-size:13px}\n  .op-people{gap:20px;padding:16px 0 24px}.op-people>div{font-size:12px;gap:6px}\n  .op-section-title h2{font-size:14px}\n  .op-line{gap:16px}.op-item{padding-top:18px}\n  .op-category h3{font-size:14px;line-height:1.5}\n  .op-base{font-size:12px;margin-top:6px}.op-discount{font-size:12px;margin-top:5px;line-height:1.6}\n  .op-reward strong{font-size:21px}.op-reward>span{font-size:12px}\n  .op-calculation-content dl>div{display:grid;gap:3px}.op-calculation-content dd{text-align:left}\n  .op-summary-actions .button{width:100%;font-size:12px;gap:10px;padding-inline:9px}\n  .op-page-footer{flex-direction:column;align-items:start;gap:0;padding-top:16px;font-size:12px}\n}\n@media(max-width:350px){\n  .op-top{padding-inline:14px;gap:12px}.op-top .back{font-size:12px}.op-brand{font-size:20px}\n  .op-main{padding-inline:12px}.op-receipt{padding:20px 16px 16px}\n  .op-title-row{flex-wrap:wrap;gap:8px}.op-title-row h1{font-size:18px}\n  .op-summary{gap:12px;grid-template-columns:1.14fr 1fr}.op-accrual{padding-left:12px}\n  .op-money-label{min-height:36px}\n  .op-payable,.op-accrual-amount{font-size:25px;letter-spacing:-.9px}\n  .op-payable>span,.op-accrual-amount>span{font-size:18px}\n  .op-people{gap:24px}.op-people>div{display:grid;gap:4px}\n  .op-line{gap:10px}.op-category h3{font-size:13px;max-width:152px}.op-reward strong{font-size:20px}\n  .op-discount>span{padding-inline:0}\n}\n\n.op-main{width:min(616px,100%);padding-top:10px}\n.op-title-row h1{font-size:18px}\n.op-document{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:9px;font-size:12px}\n.op-document strong{margin:0;font-size:12px;font-weight:700}\n.op-document-separator{color:var(--muted)}\n.op-receipt{padding:28px 28px 22px}\n.op-focus{text-align:center;padding:12px 0 26px}\n.op-focus h2{font-size:14px;font-weight:700;color:var(--ink)}\n.op-focus .op-accrual-amount{font-size:52px;font-weight:800;letter-spacing:-1.8px;line-height:1.2;margin-top:12px;color:var(--brand)}\n.op-focus .op-accrual-amount>span{font-size:34px;font-weight:700;letter-spacing:0}\n.op-focus-note{color:var(--muted);font-size:12px;line-height:1.7;margin-top:12px}\n.op-accrual-amount.op-embed-unavailable{font-size:32px;color:var(--muted);letter-spacing:0}\n.op-embed-calc-unavailable{margin:12px 0 0;font-size:13px;line-height:1.5}\n.op-purchase-context{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;gap:7px 12px;background:var(--soft);border-radius:10px;padding:13px 16px;font-size:13px;color:var(--muted)}\n.op-purchase-context .op-payable{font-size:16px;letter-spacing:0;line-height:1.5;margin:0;color:var(--ink);font-weight:700}\n.op-participants{text-align:center;font-size:12px;color:var(--muted);line-height:1.8;padding:16px 0 20px}\n.op-participants strong{font-weight:700;color:var(--ink)}\n.op-participants>span{margin-inline:8px}\n.op-breakdown{border-top:1px solid var(--line);border-bottom:1px solid var(--line)}\n.op-breakdown>summary{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:72px;padding:13px 0;list-style:none;cursor:pointer;border-radius:5px}\n.op-breakdown>summary::-webkit-details-marker{display:none}\n.op-breakdown-label{display:block;font-size:13px;font-weight:700}\n.op-breakdown-hint{display:block;font-size:12px;color:var(--muted);margin-top:4px;line-height:1.6}\n.op-breakdown>summary>svg{width:16px;height:16px;color:var(--muted)}\n.op-breakdown[open]>summary>svg{transform:rotate(180deg)}\n.op-breakdown-.native-body{padding:0 0 18px}\n.op-breakdown-.native-body .op-total-lines{display:grid;gap:8px;border-top:0;padding:10px 0 16px}\n.op-breakdown-.native-body .op-total-lines>div{display:flex;justify-content:space-between;gap:16px;font-size:12px}\n.op-breakdown-.native-body .op-item{padding-top:16px}\n.op-breakdown-.native-body .op-item h3{font-size:13px;margin-bottom:8px}\n.op-breakdown-.native-body .op-calculation-content dl>div{display:grid;grid-template-columns:1fr;gap:2px;padding:5px 0}\n.op-breakdown-.native-body .op-calculation-content dd{text-align:left;font-size:12px}\n.op-breakdown-.native-body .op-calculation-content{padding-bottom:15px}\n.op-breakdown-note{font-size:12px;color:var(--muted);line-height:1.8;margin-top:15px}\n.op-summary-actions{margin-top:20px;justify-content:stretch}\n.op-summary-actions .button{width:100%;font-size:12px}\n.op-page-footer{align-items:start;flex-direction:column;gap:0;padding-top:16px}\n@media(max-width:600px){\n  .op-main{padding:10px 16px 16px}\n  .op-page-nav{margin-bottom:10px}\n  .op-title-row h1{font-size:18px}\n  .op-receipt{padding:24px 20px 20px}\n  .op-focus{padding:10px 0 24px}\n  .op-focus .op-accrual-amount{font-size:48px}\n  .op-focus .op-accrual-amount>span{font-size:32px}\n  .op-purchase-context{padding:12px 10px;font-size:12px;gap:5px 9px}\n  .op-purchase-context .op-payable{font-size:15px}\n  .op-participants{padding:15px 0 18px;font-size:12px}\n  .op-participants>span{margin-inline:5px}\n}\n@media(max-width:350px){\n  .op-main{padding-inline:12px}\n  .op-receipt{padding:22px 16px 18px}\n  .op-focus .op-accrual-amount{font-size:46px}\n  .op-focus h2{font-size:13px}\n  .op-purchase-context{gap:4px 8px}\n  .op-purchase-context .op-payable{font-size:14px}\n  .op-participants{max-width:220px;margin-inline:auto}\n}\n\n.native-document.cabinet-embed-mode .preview-header,\n.native-document.cabinet-embed-mode header.top,\n.native-document.cabinet-embed-mode header.op-top,\n.native-document.cabinet-embed-mode a.back[href*=\"index.html\"],\n.native-document.cabinet-embed-mode .page-heading + .list,\n.native-document.cabinet-embed-mode .page-note,\n.native-document.cabinet-embed-mode .op-page-footer a[href*=\"partner-cooperation\"] {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-mode .native-body {\n  min-height: 100%;\n  background: var(--bg, #f6f6f4);\n}\n\n.native-document.cabinet-embed-mode .skip,\n.native-document.cabinet-embed-mode a.skip {\n  position: absolute;\n  left: -9999px;\n}\n\n.native-document.cabinet-embed-mode .proto-page-flow,\n.native-document.cabinet-embed-mode .proto-page-panel,\n.native-document.cabinet-embed-mode [data-proto-ui=\"flow\"],\n.native-document.cabinet-embed-mode [data-proto-ui=\"panel\"] {\n  display: none !important;\n  visibility: hidden !important;\n  pointer-events: none !important;\n}\n\n.native-document.cabinet-embed-mode main.page,\n.native-document.cabinet-embed-mode main.page > .page-heading {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-mode .native-body {\n  overflow: auto;\n  height: 100%;\n  margin: 0;\n}\n\n.native-document.cabinet-embed-cooperation-panel .partner-dialog.embed-cooperation-panel,\n.native-document.cabinet-embed-mode dialog.partner-dialog.embed-cooperation-panel {\n  position: static !important;\n  display: flex !important;\n  flex-direction: column !important;\n  width: 100% !important;\n  max-width: none !important;\n  max-height: none !important;\n  height: auto !important;\n  min-height: 100% !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border: none !important;\n  border-radius: 0 !important;\n  box-shadow: none !important;\n  background: var(--bg, #f6f6f4) !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel .partner-dialog::backdrop,\n.native-document.cabinet-embed-mode dialog.partner-dialog::backdrop {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel #edit-dialog,\n.native-document.cabinet-embed-cooperation-panel #pause-dialog,\n.native-document.cabinet-embed-cooperation-panel #certificate-dialog {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel .dialog-scroll {\n  flex: 1 1 auto;\n  overflow: auto;\n  max-height: none;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental {\n  margin-top: 1rem;\n  display: grid;\n  gap: 1rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental .counterparty-profile,\n.native-document.cabinet-embed-mode .embed-supplemental .stack,\n.native-document.cabinet-embed-mode .embed-supplemental .fold-list {\n  font: inherit;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  align-items: center;\n  margin-top: 0.75rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions .certificate-list-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions .certificate-list-action,\n.native-document.cabinet-embed-mode .embed-supplemental-actions .btn {\n  font: inherit;\n  cursor: pointer;\n}\n",install(document,window,location,parent,matchMedia){
installRole(document,window,location,parent,matchMedia);
{
(function partnerPurchaseDetailEmbed() {
  const params =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
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
    window.__protoCabinetEmbedSignalContentReady?.(144);
  }

  window.__protoApplyPurchaseEmbedCtx = applyPurchaseEmbedCtx;

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
    if (Number(data.pageN) !== 144) return;
    if (data.payload?.purchaseCtx) applyPurchaseEmbedCtx(data.payload);
  });
})();

}
{
(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  // Screenshot values only. No production API, financial writes or persistence.
  const embedParams =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  const isCabinetEmbed = embedParams.get("cabinet_embed") === "1";
  let embedWalletState = null;
  let embedCertCode = null;

  function readCertCode() {
    return (
      embedCertCode ||
      document.querySelector(".op-document strong")?.textContent?.trim() ||
      "RC-X9Z0WZ"
    );
  }

  function showHistory(filtered) {
    byId("op-detail").hidden = true;
    byId("op-history-view").hidden = false;
    byId("op-history-filter").textContent = filtered
      ? `Документ ${readCertCode()}`
      : "Все документы";
    byId("op-clear-filter").hidden = !filtered;
    document.title = "История операций · RemCard, прототип";
    window.scrollTo({ top: 0, behavior: "instant" });
    byId("op-history-title").setAttribute("tabindex", "-1");
    byId("op-history-title").focus({ preventScroll: true });
  }
  function showDetail() {
    byId("op-history-view").hidden = true;
    byId("op-detail").hidden = false;
    document.title = "Детали операции · RemCard, прототип";
    window.scrollTo({ top: 0, behavior: "instant" });
    byId("op-title").setAttribute("tabindex", "-1");
    byId("op-title").focus({ preventScroll: true });
  }

  function walletListStateForDocument() {
    const cert = readCertCode();
    const base = embedWalletState && typeof embedWalletState === "object" ? embedWalletState : {};
    return {
      ...base,
      view: "purchases",
      selectedAccrualId: null,
      search: cert,
      status: "all",
      from: "",
      to: "",
    };
  }

  function goEmbedWalletHistoryReplace() {
    if (!window.__protoCabinetEmbedNavigate) return false;
    window.__protoCabinetEmbedNavigate(
      147,
      "",
      {
        walletState: walletListStateForDocument(),
        purchaseCtx: null,
        receiptCtx: null,
      },
      { replace: true },
    );
    return true;
  }

  if (isCabinetEmbed) {
    window.addEventListener("message", (ev) => {
      const data = ev.data;
      if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
      if (Number(data.pageN) !== 144) return;
      if (data.payload?.walletState) embedWalletState = data.payload.walletState;
      if (data.payload?.purchaseCtx?.certCode) embedCertCode = data.payload.purchaseCtx.certCode;
      if (typeof window.__protoApplyPurchaseEmbedCtx === "function" && data.payload?.purchaseCtx) {
        window.__protoApplyPurchaseEmbedCtx(data.payload);
      }
    });
  }

  function returnEmbedWalletHistoryDetail() {
    if (!window.__protoCabinetEmbedNavigate) return false;
    const state =
      embedWalletState && typeof embedWalletState === "object"
        ? { ...embedWalletState, view: embedWalletState.view || "detail" }
        : { view: "detail" };
    window.__protoCabinetEmbedNavigate(
      147,
      "",
      {
        walletState: state,
        purchaseCtx: null,
        receiptCtx: null,
      },
      { replace: true },
    );
    return true;
  }

  byId("op-history").addEventListener("click", (e) => {
    if (isCabinetEmbed) {
      e.preventDefault();
      if (window.__protoCabinetEmbedBack?.()) return;
      if (returnEmbedWalletHistoryDetail()) return;
    }
    showHistory(false);
  });
  byId("op-document-operations").addEventListener("click", (e) => {
    if (isCabinetEmbed && goEmbedWalletHistoryReplace()) {
      e.preventDefault();
      return;
    }
    showHistory(true);
  });
  byId("op-clear-filter").addEventListener("click", () => showHistory(false));
  byId("op-open-detail").addEventListener("click", showDetail);
  byId("op-return-detail").addEventListener("click", showDetail);
  byId("op-theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    byId("op-theme").setAttribute(
      "aria-label",
      dark ? "Включить светлую тему" : "Включить тёмную тему",
    );
  });
})();

}
}},
145: {bodyClass:"prr-body",html:"\n  <a class=\"prr-skip\" href=\"#prr-main\">К списку сертификатов</a>\n  <header class=\"prr-top\">\n    <a class=\"prr-back\" href=\"../index.html\">← К прототипам</a>\n    <p class=\"prr-brand\"><span class=\"prr-brand__dot\" aria-hidden=\"true\">·</span> RemCard · партнёр</p>\n    <p class=\"prr-top__title\">Сертификаты</p>\n    <button type=\"button\" class=\"prr-theme\" id=\"prr-theme\" aria-label=\"Включить тёмную тему\">Тема</button>\n  </header>\n\n  <main id=\"prr-main\" class=\"prr-main\">\n    <section class=\"prr-panel\" aria-labelledby=\"prr-certs-heading\">\n      <h1 id=\"prr-certs-heading\" class=\"prr-panel__title\">Ваши сертификаты</h1>\n      <div class=\"prr-table-wrap\">\n        <table class=\"prr-table\" aria-describedby=\"prr-table-caption\">\n          <caption id=\"prr-table-caption\" class=\"prr-sr-only\">Демонстрационная таблица сертификатов</caption>\n          <thead>\n            <tr>\n              <th scope=\"col\">Код</th>\n              <th scope=\"col\">Клиент</th>\n              <th scope=\"col\">Активность</th>\n            </tr>\n          </thead>\n          <tbody>\n            <tr>\n              <td data-label=\"Код\">RC-DEMO-7X4K</td>\n              <td data-label=\"Клиент\">Демо-клиент</td>\n              <td data-label=\"Активность\">\n                <button type=\"button\" class=\"prr-link\" id=\"prr-open-purchases\">Есть покупки · Подробнее</button>\n              </td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    </section>\n  </main>\n\n  <div class=\"prr-overlay\" id=\"prr-overlay\" role=\"presentation\">\n    <div\n      class=\"prr-dialog\"\n      id=\"prr-dialog\"\n      role=\"dialog\"\n      aria-modal=\"true\"\n      aria-labelledby=\"prr-dialog-title\"\n      tabindex=\"-1\"\n    >\n      <div class=\"prr-dialog__head\">\n        <h2 id=\"prr-dialog-title\">Начисление по сертификату</h2>\n        <button type=\"button\" class=\"prr-icon-btn\" id=\"prr-close\" aria-label=\"Закрыть\">×</button>\n      </div>\n      <p class=\"prr-dialog__proto\" role=\"note\">Прототип · демоданные. Реальных начислений нет</p>\n\n      <div class=\"prr-dialog__scroll\">\n        <section class=\"prr-hero\" aria-labelledby=\"prr-hero-label\">\n          <p class=\"prr-hero__kicker\" id=\"prr-hero-label\">Ваше вознаграждение</p>\n          <p class=\"prr-hero__amount\" id=\"prr-amount\" aria-live=\"polite\">+3&nbsp;450 ₽</p>\n          <p class=\"prr-hero__badge\" id=\"prr-status-badge\">Начислено</p>\n          <p class=\"prr-hero__hint\" id=\"prr-helper\"></p>\n        </section>\n\n        <div class=\"prr-cert prr-cert--compact\" aria-label=\"Контекст сертификата\">\n          <span class=\"prr-cert__mark\" aria-hidden=\"true\"></span>\n          <p class=\"prr-cert__line\">\n            <span class=\"prr-cert__code\" id=\"prr-cert-code\">RC-DEMO-7X4K</span>\n            <span class=\"prr-cert__sep\" aria-hidden=\"true\">·</span>\n            <span class=\"prr-cert__client\" id=\"prr-client\">Демо-клиент</span>\n          </p>\n        </div>\n\n        <section class=\"prr-purchase\" aria-labelledby=\"prr-purchase-heading\">\n          <h3 class=\"prr-section-title\" id=\"prr-purchase-heading\">Покупка</h3>\n          <dl class=\"prr-facts\">\n            <dt>Номер</dt>\n            <dd id=\"prr-purchase-number\">П-10482</dd>\n            <dt>Дата</dt>\n            <dd id=\"prr-purchase-date\">28.10.2026</dd>\n            <dt>Партнёр</dt>\n            <dd id=\"prr-merchant\">Демо · Торговый партнёр</dd>\n            <dt>Филиал</dt>\n            <dd id=\"prr-branch\">Центральный</dd>\n          </dl>\n          <p class=\"prr-paid-line\">\n            <span class=\"prr-paid-line__label\">Оплачено</span>\n            <strong class=\"prr-paid-line__value\" id=\"prr-paid\">103&nbsp;500 ₽</strong>\n          </p>\n        </section>\n\n        <details class=\"prr-details\" id=\"prr-details-purchase\">\n          <summary>Подробности покупки</summary>\n          <dl class=\"prr-facts prr-facts--dense\">\n            <dt>До скидки</dt>\n            <dd id=\"prr-before\">115&nbsp;000 ₽</dd>\n            <dt>Скидка клиенту</dt>\n            <dd id=\"prr-discount\">−11&nbsp;500 ₽</dd>\n            <dt>Категория</dt>\n            <dd id=\"prr-category\">Двери</dd>\n          </dl>\n        </details>\n\n        <details class=\"prr-details\" id=\"prr-details-calc\">\n          <summary>Как рассчитано</summary>\n          <p class=\"prr-details__body\" id=\"prr-calc-text\"></p>\n        </details>\n\n        <details class=\"prr-details\" id=\"prr-details-history\">\n          <summary>История начисления</summary>\n          <ol class=\"prr-timeline\" id=\"prr-timeline\"></ol>\n        </details>\n\n        <details class=\"prr-details prr-details--demo\" id=\"prr-details-demo\">\n          <summary>Демо: другие статусы</summary>\n          <fieldset class=\"prr-demo\" id=\"prr-demo-states\">\n            <legend class=\"prr-sr-only\">Демо-состояние начисления</legend>\n            <div class=\"prr-demo__options\" role=\"radiogroup\" aria-label=\"Демо-состояние\">\n              <label class=\"prr-demo__opt\"><input type=\"radio\" name=\"prr-state\" value=\"pending\"> Ожидает</label>\n              <label class=\"prr-demo__opt\"><input type=\"radio\" name=\"prr-state\" value=\"credited\" checked> Начислено</label>\n              <label class=\"prr-demo__opt\"><input type=\"radio\" name=\"prr-state\" value=\"paid\"> Выплачено</label>\n              <label class=\"prr-demo__opt\"><input type=\"radio\" name=\"prr-state\" value=\"cancelled\"> Отменено</label>\n            </div>\n          </fieldset>\n        </details>\n      </div>\n\n      <div class=\"prr-dialog__foot\">\n        <button type=\"button\" class=\"prr-btn prr-btn--primary\" id=\"prr-ok\">Понятно</button>\n      </div>\n    </div>\n  </div>\n\n  \n  \n",css:"/* Partner cabinet — reward receipt prototype (static) */\n.native-document {\n  --prr-bg: #f6f5f3;\n  --prr-surface: #ffffff;\n  --prr-offset: #f2f1ee;\n  --prr-ink: #252923;\n  --prr-muted: #646a61;\n  --prr-line: #e5e5df;\n  --prr-primary: #c12b2f;\n  --prr-primary-hover: #a72226;\n  --prr-soft: #fcf0ed;\n  --prr-green: #35684b;\n  --prr-green-soft: #eef5ef;\n  --prr-shadow-sm: 0 6px 24px rgba(39, 43, 36, 0.08);\n  --prr-r-md: 12px;\n  --prr-r-lg: 16px;\n  --prr-r-xl: 20px;\n  --prr-font: \"Manrope\", system-ui, -apple-system, \"Segoe UI\", sans-serif;\n  --prr-focus: 0 0 0 3px rgba(193, 43, 47, 0.2);\n  --prr-outline: #8b1a1e;\n  --prr-muted-strong: #5c615a;\n  --prr-cert-1: #9b2028;\n  --prr-cert-2: #c23c40;\n  --prr-dialog-max: 37.5rem;\n  color-scheme: light;\n}\n[data-theme=\"dark\"] {\n  --prr-bg: #131917;\n  --prr-surface: #1c2421;\n  --prr-offset: #25312b;\n  --prr-ink: #eaf0ec;\n  --prr-muted: #b0bdb4;\n  --prr-line: rgba(210, 236, 220, 0.14);\n  --prr-primary: #f3786d;\n  --prr-primary-hover: #ff9288;\n  --prr-soft: #372a27;\n  --prr-green: #a4d2b1;\n  --prr-green-soft: #253b2c;\n  --prr-shadow-sm: 0 6px 24px rgba(0, 0, 0, 0.35);\n  --prr-focus: 0 0 0 3px rgba(243, 120, 109, 0.35);\n  --prr-outline: #ffc8c2;\n  --prr-muted-strong: #c4d0c8;\n  color-scheme: dark;\n}\n\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n.native-document {\n  -webkit-text-size-adjust: 100%;\n}\n.native-body.prr-.native-body {\n  margin: 0;\n  min-height: 100dvh;\n  font-family: var(--prr-font);\n  font-size: 1rem;\n  line-height: 1.5;\n  color: var(--prr-ink);\n  background: var(--prr-bg);\n  -webkit-font-smoothing: antialiased;\n}\n.prr-.native-body :focus-visible {\n  outline: 2px solid var(--prr-outline);\n  outline-offset: 2px;\n}\n.prr-skip {\n  position: absolute;\n  left: -9999px;\n}\n.prr-skip:focus {\n  left: 0.75rem;\n  top: 0.75rem;\n  z-index: 99;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 44px;\n  min-height: 44px;\n  padding: 0.5rem 0.85rem;\n  background: var(--prr-surface);\n  border-radius: 8px;\n  box-shadow: var(--prr-focus);\n}\n.prr-sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n\n.prr-top {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem 0.75rem;\n  min-height: 56px;\n  padding: 0.65rem 1rem;\n  border-bottom: 1px solid var(--prr-line);\n  background: color-mix(in srgb, var(--prr-bg) 92%, transparent);\n  backdrop-filter: blur(10px);\n  position: sticky;\n  top: 0;\n  z-index: 10;\n}\n.prr-back {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.35rem 0.65rem;\n  border-radius: var(--prr-r-md);\n  border: 1px solid var(--prr-line);\n  background: var(--prr-surface);\n  color: var(--prr-ink);\n  font-size: 0.8125rem;\n  font-weight: 700;\n  text-decoration: none;\n}\n.prr-back:hover {\n  border-color: var(--prr-primary);\n  color: var(--prr-primary);\n}\n.prr-brand {\n  margin: 0;\n  font-weight: 800;\n  font-size: 0.95rem;\n}\n.prr-brand__dot {\n  color: var(--prr-primary);\n}\n.prr-top__title {\n  margin: 0;\n  flex: 1;\n  font-size: 1.05rem;\n  font-weight: 800;\n}\n.prr-theme {\n  min-width: 44px;\n  min-height: 44px;\n  padding: 0.45rem 0.85rem;\n  border-radius: var(--prr-r-md);\n  border: 1px solid var(--prr-line);\n  background: var(--prr-surface);\n  color: var(--prr-ink);\n  font: inherit;\n  font-weight: 700;\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n\n.prr-main {\n  max-width: 40rem;\n  margin: 0 auto;\n  padding: 1rem 1rem 2rem;\n}\n.prr-panel {\n  background: var(--prr-surface);\n  border: 1px solid var(--prr-line);\n  border-radius: var(--prr-r-lg);\n  padding: 1rem 1.1rem;\n  box-shadow: var(--prr-shadow-sm);\n}\n.prr-panel__title {\n  margin: 0 0 0.85rem;\n  font-size: 1.1rem;\n  font-weight: 800;\n}\n.prr-table-wrap {\n  overflow-x: auto;\n}\n.prr-table {\n  width: 100%;\n  border-collapse: collapse;\n  font-size: 0.875rem;\n}\n.prr-table th,\n.prr-table td {\n  padding: 0.65rem 0.5rem;\n  text-align: left;\n  border-bottom: 1px solid var(--prr-line);\n  vertical-align: middle;\n}\n.prr-table th {\n  font-size: 0.75rem;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  color: var(--prr-muted);\n  font-weight: 800;\n}\n.prr-link {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.35rem 0.25rem;\n  border: 0;\n  background: transparent;\n  color: var(--prr-primary);\n  font: inherit;\n  font-weight: 700;\n  font-size: 0.875rem;\n  text-decoration: underline;\n  text-underline-offset: 3px;\n  cursor: pointer;\n}\n.prr-link:hover {\n  color: var(--prr-primary-hover);\n}\n\n.prr-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 40;\n  display: grid;\n  place-items: center;\n  padding: max(0.5rem, env(safe-area-inset-top)) 0.5rem max(0.5rem, env(safe-area-inset-bottom));\n  background: rgba(20, 24, 22, 0.45);\n}\n.prr-overlay[hidden] {\n  display: none !important;\n}\n.prr-dialog {\n  width: min(100%, var(--prr-dialog-max));\n  max-height: min(92dvh, 680px);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  background: var(--prr-surface);\n  border: 1px solid var(--prr-line);\n  border-radius: var(--prr-r-xl);\n  box-shadow: var(--prr-shadow-sm);\n}\n.prr-dialog__head {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 0.5rem;\n  padding: 0.85rem 1rem 0.35rem;\n  flex-shrink: 0;\n}\n.prr-dialog__head h2 {\n  margin: 0;\n  font-size: 1.1rem;\n  font-weight: 800;\n  line-height: 1.35;\n}\n.prr-dialog__proto {\n  margin: 0;\n  padding: 0 1rem 0.45rem;\n  font-size: 0.75rem;\n  font-weight: 700;\n  letter-spacing: 0.03em;\n  text-transform: uppercase;\n  color: var(--prr-muted-strong);\n  flex-shrink: 0;\n}\n.prr-dialog__scroll {\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  padding: 0 1rem 0.5rem;\n}\n.prr-dialog__foot {\n  flex-shrink: 0;\n  padding: 0.65rem 1rem 0.85rem;\n  border-top: 1px solid var(--prr-line);\n  background: color-mix(in srgb, var(--prr-surface) 94%, var(--prr-offset));\n}\n.prr-icon-btn {\n  flex-shrink: 0;\n  width: 44px;\n  height: 44px;\n  margin: -0.35rem -0.35rem 0 0;\n  border: 1px solid var(--prr-line);\n  border-radius: var(--prr-r-md);\n  background: var(--prr-offset);\n  color: var(--prr-ink);\n  font-size: 1.35rem;\n  line-height: 1;\n  cursor: pointer;\n}\n\n.prr-hero {\n  padding: 0.65rem 0.85rem;\n  margin-bottom: 0.65rem;\n  border-radius: var(--prr-r-lg);\n  background: var(--prr-soft);\n  border: 1px solid color-mix(in srgb, var(--prr-primary) 18%, var(--prr-line));\n}\n.prr-hero__kicker {\n  margin: 0 0 0.1rem;\n  font-size: 0.75rem;\n  font-weight: 800;\n  letter-spacing: 0.03em;\n  text-transform: uppercase;\n  color: var(--prr-muted-strong);\n}\n.prr-hero__amount {\n  margin: 0;\n  font-size: clamp(1.6rem, 5.5vw, 2rem);\n  font-weight: 800;\n  line-height: 1.12;\n  color: var(--prr-primary);\n}\n.prr-hero__amount[data-tone=\"muted\"] {\n  color: var(--prr-muted-strong);\n}\n.prr-hero__amount[data-tone=\"strike\"] {\n  color: var(--prr-muted);\n  text-decoration: line-through;\n  font-size: 1.25rem;\n}\n.prr-hero__badge {\n  display: inline-block;\n  margin: 0.35rem 0 0;\n  padding: 0.15rem 0.5rem;\n  border-radius: 999px;\n  font-size: 0.75rem;\n  font-weight: 800;\n  background: var(--prr-surface);\n  border: 1px solid var(--prr-line);\n}\n.prr-hero__hint {\n  margin: 0.4rem 0 0;\n  font-size: 0.8125rem;\n  line-height: 1.4;\n  color: var(--prr-muted);\n  font-weight: 600;\n}\n\n.prr-cert--compact {\n  display: flex;\n  align-items: center;\n  gap: 0.55rem;\n  margin-bottom: 0.65rem;\n  padding: 0.45rem 0.65rem;\n  border-radius: var(--prr-r-md);\n  color: #fff;\n  background: linear-gradient(90deg, var(--prr-cert-1), var(--prr-cert-2));\n}\n.prr-cert__mark {\n  width: 0.45rem;\n  height: 1.6rem;\n  border-radius: 999px;\n  background: rgba(255, 255, 255, 0.35);\n  flex-shrink: 0;\n}\n.prr-cert__line {\n  margin: 0;\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  gap: 0.25rem 0.35rem;\n  font-size: 0.8125rem;\n  font-weight: 700;\n  line-height: 1.35;\n}\n.prr-cert__code {\n  font-weight: 800;\n  font-size: 0.875rem;\n}\n.prr-cert__sep {\n  opacity: 0.75;\n}\n.prr-cert__client {\n  font-weight: 600;\n  opacity: 0.95;\n}\n\n.prr-section-title {\n  margin: 0 0 0.35rem;\n  font-size: 0.75rem;\n  font-weight: 800;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  color: var(--prr-muted);\n}\n.prr-facts {\n  display: grid;\n  grid-template-columns: minmax(4.25rem, 5.25rem) minmax(0, 1fr);\n  gap: 0.2rem 0.5rem;\n  margin: 0 0 0.5rem;\n  font-size: 0.8125rem;\n}\n.prr-facts dt {\n  margin: 0;\n  color: var(--prr-muted);\n  font-weight: 600;\n}\n.prr-facts dd {\n  margin: 0;\n  font-weight: 700;\n  word-break: break-word;\n  overflow-wrap: anywhere;\n}\n.prr-facts--dense {\n  margin: 0;\n  padding: 0 0.75rem 0.65rem;\n}\n\n.prr-paid-line {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 0.75rem;\n  margin: 0.25rem 0 0.35rem;\n  padding: 0.45rem 0.6rem;\n  border-radius: var(--prr-r-md);\n  background: var(--prr-offset);\n  border: 1px solid var(--prr-line);\n  font-size: 0.875rem;\n}\n.prr-paid-line__label {\n  color: var(--prr-muted);\n  font-weight: 700;\n}\n.prr-paid-line__value {\n  font-size: 1rem;\n  font-weight: 800;\n  white-space: nowrap;\n}\n\n.prr-details {\n  margin: 0.35rem 0;\n  border: 1px solid var(--prr-line);\n  border-radius: var(--prr-r-md);\n  background: var(--prr-offset);\n}\n.prr-details summary {\n  display: flex;\n  align-items: center;\n  min-height: 44px;\n  padding: 0.45rem 0.75rem;\n  font-size: 0.875rem;\n  font-weight: 700;\n  cursor: pointer;\n  list-style-position: outside;\n}\n.prr-details__body {\n  margin: 0;\n  padding: 0 0.75rem 0.65rem;\n  font-size: 0.8125rem;\n  line-height: 1.45;\n  color: var(--prr-muted-strong);\n  font-weight: 600;\n}\n.prr-details--demo {\n  border-style: dashed;\n}\n\n.prr-timeline {\n  margin: 0;\n  padding: 0 0.75rem 0.65rem;\n  list-style: none;\n  display: grid;\n  gap: 0.35rem;\n}\n.prr-timeline li {\n  display: grid;\n  grid-template-columns: auto 1fr;\n  gap: 0.45rem;\n  align-items: start;\n  font-size: 0.8125rem;\n  font-weight: 600;\n}\n.prr-timeline__dot {\n  width: 0.5rem;\n  height: 0.5rem;\n  margin-top: 0.3rem;\n  border-radius: 50%;\n  background: var(--prr-line);\n}\n.prr-timeline li[data-done=\"true\"] .prr-timeline__dot {\n  background: var(--prr-green);\n}\n.prr-timeline li[data-cancelled=\"true\"] .prr-timeline__dot {\n  background: var(--prr-primary);\n}\n.prr-timeline li[data-pending=\"true\"] {\n  color: var(--prr-muted);\n}\n\n.prr-demo {\n  margin: 0;\n  padding: 0 0.75rem 0.65rem;\n  border: 0;\n  min-inline-size: 0;\n}\n.prr-demo__options {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 0.25rem 0.5rem;\n}\n.prr-demo__opt {\n  display: flex;\n  align-items: center;\n  gap: 0.4rem;\n  min-height: 44px;\n  font-size: 0.8125rem;\n  font-weight: 600;\n  cursor: pointer;\n}\n.prr-demo__opt input {\n  width: 1.1rem;\n  height: 1.1rem;\n  accent-color: var(--prr-primary);\n}\n\n.prr-btn {\n  min-height: 44px;\n  min-width: 44px;\n  width: 100%;\n  padding: 0.55rem 1.1rem;\n  border-radius: var(--prr-r-md);\n  border: 1px solid var(--prr-line);\n  font: inherit;\n  font-size: 0.9375rem;\n  font-weight: 800;\n  cursor: pointer;\n}\n.prr-btn--primary {\n  border-color: var(--prr-primary);\n  background: var(--prr-primary);\n  color: #fff;\n}\n.prr-btn--primary:hover {\n  background: var(--prr-primary-hover);\n  border-color: var(--prr-primary-hover);\n}\n[data-theme=\"dark\"] .prr-btn--primary {\n  color: #1a1210;\n}\n\n@media (max-width: 420px) {\n  .prr-table thead {\n    display: none;\n  }\n  .prr-table tr {\n    display: block;\n    padding: 0.5rem 0;\n    border-bottom: 1px solid var(--prr-line);\n  }\n  .prr-table td {\n    display: flex;\n    justify-content: space-between;\n    gap: 0.75rem;\n    border: 0;\n    padding: 0.35rem 0;\n  }\n  .prr-table td::before {\n    content: attr(data-label);\n    color: var(--prr-muted);\n    font-weight: 700;\n    font-size: 0.75rem;\n  }\n  .prr-demo__options {\n    grid-template-columns: 1fr;\n  }\n}\n\n@media (min-width: 1280px) {\n  .prr-dialog {\n    width: min(100%, var(--prr-dialog-max));\n  }\n}\n\n.native-document.cabinet-embed-mode .preview-header,\n.native-document.cabinet-embed-mode header.top,\n.native-document.cabinet-embed-mode header.op-top,\n.native-document.cabinet-embed-mode a.back[href*=\"index.html\"],\n.native-document.cabinet-embed-mode .page-heading + .list,\n.native-document.cabinet-embed-mode .page-note,\n.native-document.cabinet-embed-mode .op-page-footer a[href*=\"partner-cooperation\"] {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-mode .native-body {\n  min-height: 100%;\n  background: var(--bg, #f6f6f4);\n}\n\n.native-document.cabinet-embed-mode .skip,\n.native-document.cabinet-embed-mode a.skip {\n  position: absolute;\n  left: -9999px;\n}\n\n.native-document.cabinet-embed-mode .proto-page-flow,\n.native-document.cabinet-embed-mode .proto-page-panel,\n.native-document.cabinet-embed-mode [data-proto-ui=\"flow\"],\n.native-document.cabinet-embed-mode [data-proto-ui=\"panel\"] {\n  display: none !important;\n  visibility: hidden !important;\n  pointer-events: none !important;\n}\n\n.native-document.cabinet-embed-mode main.page,\n.native-document.cabinet-embed-mode main.page > .page-heading {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-mode .native-body {\n  overflow: auto;\n  height: 100%;\n  margin: 0;\n}\n\n.native-document.cabinet-embed-cooperation-panel .partner-dialog.embed-cooperation-panel,\n.native-document.cabinet-embed-mode dialog.partner-dialog.embed-cooperation-panel {\n  position: static !important;\n  display: flex !important;\n  flex-direction: column !important;\n  width: 100% !important;\n  max-width: none !important;\n  max-height: none !important;\n  height: auto !important;\n  min-height: 100% !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border: none !important;\n  border-radius: 0 !important;\n  box-shadow: none !important;\n  background: var(--bg, #f6f6f4) !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel .partner-dialog::backdrop,\n.native-document.cabinet-embed-mode dialog.partner-dialog::backdrop {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel #edit-dialog,\n.native-document.cabinet-embed-cooperation-panel #pause-dialog,\n.native-document.cabinet-embed-cooperation-panel #certificate-dialog {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel .dialog-scroll {\n  flex: 1 1 auto;\n  overflow: auto;\n  max-height: none;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental {\n  margin-top: 1rem;\n  display: grid;\n  gap: 1rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental .counterparty-profile,\n.native-document.cabinet-embed-mode .embed-supplemental .stack,\n.native-document.cabinet-embed-mode .embed-supplemental .fold-list {\n  font: inherit;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  align-items: center;\n  margin-top: 0.75rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions .certificate-list-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions .certificate-list-action,\n.native-document.cabinet-embed-mode .embed-supplemental-actions .btn {\n  font: inherit;\n  cursor: pointer;\n}\n",install(document,window,location,parent,matchMedia){
installRole(document,window,location,parent,matchMedia);
{
(function partnerRewardReceiptEmbed() {
  const params =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  if (params.get("cabinet_embed") !== "1") return;

  const money = (n) => (Number.isFinite(n) ? n.toLocaleString("ru-RU") : "0") + " ₽";
  const pageN = Number(params.get("proto_n") || 145);

  let embedDismissCaptureBound = false;

  function dismissEmbedReceipt() {
    if (window.__protoReceiptEmbedDismissInFlight) return;
    window.__protoReceiptEmbedDismissInFlight = true;
    try {
      if (typeof window.__protoCabinetEmbedBack === "function") {
        window.__protoCabinetEmbedBack();
      }
    } finally {
      requestAnimationFrame(() => {
        window.__protoReceiptEmbedDismissInFlight = false;
      });
    }
  }

  function bindEmbedDismissCapture() {
    if (embedDismissCaptureBound) return;
    const overlay = document.getElementById("prr-overlay");
    if (!overlay) return;
    embedDismissCaptureBound = true;
    window.__protoReceiptEmbedDismissBound = true;
    overlay.addEventListener(
      "click",
      (e) => {
        const hit =
          e.target.closest?.("#prr-ok, #prr-close") ||
          (e.target.id === "prr-close" ? e.target : null);
        if (!hit) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        dismissEmbedReceipt();
      },
      true,
    );
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Escape") return;
        const ov = document.getElementById("prr-overlay");
        if (!ov || ov.hidden) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        dismissEmbedReceipt();
      },
      true,
    );
  }

  bindEmbedDismissCapture();

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
    bindEmbedDismissCapture();
    if (overlay) overlay.hidden = false;
    window.__protoCabinetEmbedSignalContentReady?.(pageN);
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

}
{
/**
 * Partner reward receipt prototype — in-memory only, no network/storage.
 * Pure helpers mirrored in partner-reward-receipt-logic.mjs
 */
(function () {
  "use strict";

  const DEMO_PURCHASE = {
    number: "П-10482",
    dateDisplay: "28.10.2026",
    merchant: "Демо · Торговый партнёр",
    branch: "Центральный",
    category: "Двери",
    beforeKopecks: 11_500_000,
    discountKopecks: 1_150_000,
    paidKopecks: 10_350_000,
    rewardRatePercent: 3,
    rewardBaseKopecks: 11_500_000,
    rewardKopecks: 345_000,
    certCode: "RC-DEMO-7X4K",
    clientLabel: "Демо-клиент",
    pendingDaysDemo: 14,
  };

  const inertTargetId = "prr-main";

  function formatRub(kopecks) {
    if (!Number.isInteger(kopecks)) return "—";
    const negative = kopecks < 0;
    const abs = Math.abs(kopecks);
    const rub = Math.trunc(abs / 100);
    const frac = abs % 100;
    const rubStr = rub.toLocaleString("ru-RU");
    const body = frac === 0 ? rubStr : `${rubStr},${String(frac).padStart(2, "0")}`;
    const sign = negative ? "−" : "+";
    return `${sign}${body} ₽`;
  }

  function formatRubPlain(kopecks) {
    if (!Number.isInteger(kopecks)) return "—";
    const rub = Math.trunc(Math.abs(kopecks) / 100);
    const frac = Math.abs(kopecks) % 100;
    const rubStr = rub.toLocaleString("ru-RU");
    return frac === 0 ? `${rubStr} ₽` : `${rubStr},${String(frac).padStart(2, "0")} ₽`;
  }

  function rewardHeadline(state) {
    switch (state) {
      case "pending":
        return "Ожидается начисление";
      case "credited":
        return "Ваше вознаграждение";
      case "paid":
        return "Выплачено";
      case "cancelled":
        return "Начисление отменено";
      default:
        return "Ваше вознаграждение";
    }
  }

  function rewardStatusBadge(state) {
    switch (state) {
      case "pending":
        return "Ожидает начисления";
      case "credited":
        return "Начислено";
      case "paid":
        return "Выплачено";
      case "cancelled":
        return "Отменено";
      default:
        return "Начислено";
    }
  }

  function rewardHelperText(state) {
    const d = DEMO_PURCHASE;
    switch (state) {
      case "pending":
        return `Демо: ориентир ${d.pendingDaysDemo} дней до записи начисления. Это не гарантия срока на сайте.`;
      case "credited":
        return "Начисление учтено. Выплата ещё не проведена.";
      case "paid":
        return "Демо: выплата отмечена в истории.";
      case "cancelled":
        return "Синтетический сценарий без начисления.";
      default:
        return "";
    }
  }

  function rewardAmountDisplay(state) {
    const d = DEMO_PURCHASE;
    if (state === "cancelled") {
      return { text: "0 ₽", tone: "strike" };
    }
    if (state === "pending") {
      const plain = formatRubPlain(d.rewardKopecks);
      return { text: plain, tone: "muted" };
    }
    return { text: formatRub(d.rewardKopecks), tone: "default" };
  }

  function historyEvents(state) {
    if (state === "cancelled") {
      return [
        { label: "Покупка подтверждена", done: true, pending: false, cancelled: false },
        { label: "Начисление отменено", done: false, pending: false, cancelled: true },
      ];
    }
    if (state === "pending") {
      return [
        { label: "Покупка подтверждена", done: true, pending: false, cancelled: false },
        { label: "Ожидается начисление", done: false, pending: true, cancelled: false },
        { label: "Выплата партнёру", done: false, pending: true, cancelled: false },
      ];
    }
    if (state === "paid") {
      return [
        { label: "Покупка подтверждена", done: true, pending: false, cancelled: false },
        { label: "Начисление записано", done: true, pending: false, cancelled: false },
        { label: "Выплата партнёру (демо)", done: true, pending: false, cancelled: false },
      ];
    }
    return [
      { label: "Покупка подтверждена", done: true, pending: false, cancelled: false },
      { label: "Начисление записано", done: true, pending: false, cancelled: false },
      { label: "Выплата партнёру", done: false, pending: true, cancelled: false },
    ];
  }

  function calcExplanationText() {
    const d = DEMO_PURCHASE;
    const base = formatRubPlain(d.rewardBaseKopecks);
    const reward = formatRubPlain(d.rewardKopecks);
    return `Демо-условия: ${d.rewardRatePercent}% от ${base} до скидки клиента = ${reward}. Пример для согласования, не формула продакшена.`;
  }

  function isUsableOpener(node) {
    if (!node || typeof node.focus !== "function") return false;
    if (node === document.body || node === document.documentElement) return false;
    const main = el.main || document.getElementById(inertTargetId);
    return Boolean(main && main.contains(node));
  }

  function pickFocusReturnTarget() {
    if (isUsableOpener(state.lastFocus)) return state.lastFocus;
    return el.openPurchases || null;
  }

  function rememberOpenerBeforeOpen() {
    const active = document.activeElement;
    if (isUsableOpener(active)) {
      state.lastFocus = active;
    } else if (el.openPurchases) {
      state.lastFocus = el.openPurchases;
    }
  }

  const state = {
    theme: "light",
    rewardState: "credited",
    lastFocus: null,
    dialogOpen: true,
  };

  const el = {};

  function qs(sel) {
    return document.querySelector(sel);
  }

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function renderState() {
    if (window.__protoReceiptEmbedSnapshot) return;
    const st = state.rewardState;
    const amount = rewardAmountDisplay(st);
    setText(el.heroLabel, rewardHeadline(st));
    setText(el.amount, amount.text);
    if (el.amount) {
      if (amount.tone === "default") {
        el.amount.removeAttribute("data-tone");
      } else {
        el.amount.setAttribute("data-tone", amount.tone);
      }
    }
    setText(el.badge, rewardStatusBadge(st));
    setText(el.helper, rewardHelperText(st));
    setText(el.calcText, calcExplanationText());

    if (el.timeline) {
      el.timeline.replaceChildren();
      historyEvents(st).forEach((ev) => {
        const li = document.createElement("li");
        li.dataset.done = ev.done ? "true" : "false";
        if (ev.pending) li.dataset.pending = "true";
        if (ev.cancelled) li.dataset.cancelled = "true";
        const dot = document.createElement("span");
        dot.className = "prr-timeline__dot";
        dot.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.textContent = ev.label;
        li.append(dot, label);
        el.timeline.appendChild(li);
      });
    }
  }

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => {
      if (node.disabled) return false;
      if (node.getAttribute("aria-hidden") === "true") return false;
      return node.getClientRects().length > 0;
    });
  }

  function focusFirstInDialog(dialog) {
    const focusable = getFocusable(dialog);
    if (focusable.length) {
      focusable[0].focus();
    } else {
      dialog.focus();
    }
  }

  function setMainInert(inert) {
    const main = el.main || document.getElementById(inertTargetId);
    if (!main) return;
    if (inert) {
      main.setAttribute("inert", "");
    } else {
      main.removeAttribute("inert");
    }
  }

  function resetDialogScroll() {
    const scroller = el.dialogScroll;
    if (scroller) scroller.scrollTop = 0;
  }

  function openDialog() {
    if (!el.overlay || !el.dialog) return;
    rememberOpenerBeforeOpen();
    el.overlay.hidden = false;
    state.dialogOpen = true;
    setMainInert(true);
    resetDialogScroll();

    const trap = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeDialog();
        return;
      }
      if (ev.key !== "Tab") return;
      const focusable = getFocusable(el.dialog);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = active && el.dialog.contains(active) && active !== el.dialog;
      if (!inside) {
        ev.preventDefault();
        (ev.shiftKey ? last : first).focus();
        return;
      }
      if (ev.shiftKey && active === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && active === last) {
        ev.preventDefault();
        first.focus();
      }
    };
    if (el.overlay._trap) {
      document.removeEventListener("keydown", el.overlay._trap);
    }
    el.overlay._trap = trap;
    document.addEventListener("keydown", trap);
    focusFirstInDialog(el.dialog);
  }

  function closeDialog() {
    try {
      if (
        (typeof window.__protoCabinetEmbedParams === "function"
          ? window.__protoCabinetEmbedParams()
          : new URLSearchParams(window.location.search)
        ).get("cabinet_embed") === "1" &&
        typeof window.__protoCabinetEmbedBack === "function"
      ) {
        window.__protoCabinetEmbedBack();
        return;
      }
    } catch (_) {}
    if (!el.overlay) return;
    el.overlay.hidden = true;
    state.dialogOpen = false;
    if (el.overlay._trap) {
      document.removeEventListener("keydown", el.overlay._trap);
      el.overlay._trap = null;
    }
    setMainInert(false);
    const target = pickFocusReturnTarget();
    if (target) target.focus();
  }

  function toggleTheme() {
    state.theme = state.theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    if (el.theme) {
      el.theme.setAttribute(
        "aria-label",
        state.theme === "light" ? "Включить тёмную тему" : "Включить светлую тему",
      );
    }
  }

  function onStateRadioChange(ev) {
    if (window.__protoReceiptEmbedSnapshot) return;
    const input = ev.target;
    if (!input || input.name !== "prr-state") return;
    state.rewardState = input.value;
    renderState();
  }

  function initStaticFields() {
    const d = DEMO_PURCHASE;
    setText(el.before, formatRubPlain(d.beforeKopecks));
    setText(el.discount, `−${formatRubPlain(d.discountKopecks).replace(/\s*₽$/, "")} ₽`);
    setText(el.paid, formatRubPlain(d.paidKopecks));
    setText(el.category, d.category);
    setText(el.certCode, d.certCode);
    setText(el.client, d.clientLabel);
    setText(el.purchaseNumber, d.number);
    setText(el.purchaseDate, d.dateDisplay);
    setText(el.merchant, d.merchant);
    setText(el.branch, d.branch);
  }

  function init() {
    el.main = qs("#" + inertTargetId);
    el.overlay = qs("#prr-overlay");
    el.dialog = qs("#prr-dialog");
    el.dialogScroll = qs(".prr-dialog__scroll");
    el.close = qs("#prr-close");
    el.ok = qs("#prr-ok");
    el.openPurchases = qs("#prr-open-purchases");
    el.theme = qs("#prr-theme");
    el.heroLabel = qs("#prr-hero-label");
    el.amount = qs("#prr-amount");
    el.badge = qs("#prr-status-badge");
    el.helper = qs("#prr-helper");
    el.timeline = qs("#prr-timeline");
    el.calcText = qs("#prr-calc-text");
    el.before = qs("#prr-before");
    el.category = qs("#prr-category");
    el.discount = qs("#prr-discount");
    el.paid = qs("#prr-paid");
    el.certCode = qs("#prr-cert-code");
    el.client = qs("#prr-client");
    el.purchaseNumber = qs("#prr-purchase-number");
    el.purchaseDate = qs("#prr-purchase-date");
    el.merchant = qs("#prr-merchant");
    el.branch = qs("#prr-branch");

    initStaticFields();
    renderState();
    state.lastFocus = el.openPurchases;
    const cabinetEmbed = (() => {
      try {
        return (
          typeof window.__protoCabinetEmbedParams === "function"
            ? window.__protoCabinetEmbedParams()
            : new URLSearchParams(window.location.search)
        ).get("cabinet_embed") === "1";
      } catch (_) {
        return false;
      }
    })();
    const embedSnapshot = !!window.__protoReceiptEmbedSnapshot;
    const embedDismissBound = !!window.__protoReceiptEmbedDismissBound;
    if (cabinetEmbed && embedSnapshot) {
      state.dialogOpen = el.overlay ? !el.overlay.hidden : true;
    } else {
      openDialog();
    }

    if (!embedDismissBound) {
      el.close?.addEventListener("click", closeDialog);
      el.ok?.addEventListener("click", closeDialog);
    }
    el.openPurchases?.addEventListener("click", openDialog);
    el.theme?.addEventListener("click", toggleTheme);
    document.querySelectorAll('input[name="prr-state"]').forEach((input) => {
      input.addEventListener("change", onStateRadioChange);
    });

    el.overlay?.addEventListener("click", (ev) => {
      if (ev.target === el.overlay) closeDialog();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

}
}},
147: {bodyClass:"",html:"\n  <a class=\"skip\" href=\"#main\">К содержимому</a>\n  <header class=\"top\">\n    <a class=\"brand\" href=\"../index.html\" aria-label=\"RemCard, все прототипы\">remcard<span>.</span></a>\n    <span class=\"cabinet-label\">для партнёров</span>\n    <span class=\"prototype-label\">Прототип · на согласование</span>\n    <button class=\"theme\" id=\"theme\" aria-label=\"Включить тёмную тему\" title=\"Переключить тему\">◐</button>\n  </header>\n  <main id=\"main\" tabindex=\"-1\">\n    <div class=\"context\"><span>ОПТОВИК</span><span>Покупки и начисления</span></div>\n    <section id=\"history-view\" aria-labelledby=\"history-title\">\n      <div class=\"page-heading\"><h1 id=\"history-title\">История операций</h1></div>\n      <div class=\"history-tabs\" role=\"group\" aria-label=\"Тип операции\"><button data-view=\"purchases\" aria-pressed=\"true\">Покупки <span>2</span></button><button data-view=\"accruals\" aria-pressed=\"false\">Начисления <span>4</span></button></div>\n      <p class=\"view-purpose\" id=\"view-purpose\">Принято у меня · суммы покупок после скидки</p>\n      <div class=\"toolbar\">\n        <label class=\"search\"><span class=\"sr-only\">Поиск по партнёру или сертификату</span><input id=\"search\" type=\"search\" placeholder=\"Партнёр или сертификат\" autocomplete=\"off\"></label>\n        <button class=\"filter-button\" id=\"filter-button\" aria-expanded=\"false\" aria-controls=\"filters\">Фильтры <span id=\"filter-count\" hidden></span><span aria-hidden=\"true\">⌄</span></button>\n      </div>\n      <div id=\"filters\" class=\"filters\" hidden>\n        <label><span>Статус</span><select id=\"status\"><option value=\"all\">Все статусы</option><option value=\"active\">Подтверждена</option><option value=\"paid\">Выплачено</option></select></label>\n        <label><span>С даты</span><input id=\"from\" type=\"date\"></label><label><span>По дату</span><input id=\"to\" type=\"date\"></label>\n        <button class=\"text-button\" id=\"clear-filters\">Сбросить фильтры</button>\n      </div>\n      <div class=\"results-heading\"><p id=\"result-count\" role=\"status\"></p><button class=\"text-button\" id=\"clear-search\">Сбросить поиск</button></div>\n      <div class=\"rows\" id=\"history-rows\"></div>\n      <details class=\"fine-print\"><summary>Об истории <span aria-hidden=\"true\">+</span></summary><p>Поиск и фильтры работают по загруженным записям. Покупки «Принято у меня» загружаются постранично; «По рекомендациям» охватывают до 200 последних заказов. Суммы показаны как сохранено, без пересчёта по текущим условиям.</p></details>\n    </section>\n    <section id=\"detail-view\" aria-labelledby=\"detail-title\" hidden>\n      <button class=\"back text-button\" data-view=\"accruals\">← К начислениям</button>\n      <div class=\"page-heading detail-heading\"><h1 id=\"detail-title\">Детали начисления</h1><span class=\"status neutral\">Начислено</span></div>\n      <article class=\"receipt\">\n        <div class=\"receipt-focus\"><p>Вознаграждение профклиенту</p><p class=\"main-amount\">0 <span>₽</span></p><p class=\"muted\">Сохранённая сумма начисления, не сумма покупки.</p></div>\n        <dl class=\"receipt-meta\"><div><dt>Партнёр</dt><dd>Артем</dd></div><div><dt>Сертификат</dt><dd>RC-X9Z0WZ</dd></div><div><dt>Дата начисления</dt><dd id=\"detail-date\">10 ноября 2026, 15:48</dd></div><div><dt>Тип</dt><dd>Вознаграждение профклиенту</dd></div></dl>\n        <button type=\"button\" class=\"primary-link\" id=\"open-receipt\" data-testid=\"wallet-open-receipt-145\">Квитанция начисления <span aria-hidden=\"true\">↗</span></button>\n        <button type=\"button\" class=\"primary-link\" id=\"open-related\">Открыть связанную покупку <span aria-hidden=\"true\">↗</span></button>\n        <details class=\"technical\"><summary>Номер начисления <span aria-hidden=\"true\">+</span></summary><p id=\"detail-id\">cmwaor7m00014o30k7lrqpa0s</p></details>\n      </article>\n      <p class=\"read-only\">Режим просмотра. Финансовые действия недоступны.</p>\n    </section>\n    <footer><span>Демонстрационные данные · без реальных операций</span><a href=\"../index.html\">Все прототипы ↗</a></footer>\n  </main>\n  <dialog id=\"purchase-dialog\" aria-labelledby=\"dialog-title\">\n    <div class=\"dialog-heading\"><h2 id=\"dialog-title\">Покупка</h2><button class=\"close\" id=\"close-dialog\" aria-label=\"Закрыть\">×</button></div>\n    <span class=\"status neutral\" id=\"dialog-status\">Подтверждена</span><p class=\"dialog-amount\" id=\"dialog-amount\"></p>\n    <dl class=\"receipt-meta\"><div><dt>Партнёр</dt><dd id=\"dialog-partner\"></dd></div><div><dt>Сертификат</dt><dd id=\"dialog-certificate\"></dd></div><div><dt>Дата покупки</dt><dd id=\"dialog-order\"></dd></div></dl>\n    <p class=\"muted\" id=\"dialog-note\"></p>\n    <button class=\"primary-link\" id=\"dialog-return\">Вернуться к истории</button>\n  </dialog>\n",css:".native-document{color-scheme:light;--bg:#f6f5f3;--surface:#fff;--soft:#f1f0ed;--ink:#252923;--muted:#62685f;--line:#dedfd9;--brand:#ad2229;--brand-soft:#fbefec;--green:#35684b;--green-soft:#eaf3ec;--focus:#a91d25;--font-.native-body:Manrope,Arial,sans-serif;--font-display:Manrope,Arial,sans-serif;--text-xs:clamp(.75rem,.73rem + .1vw,.8125rem);--text-sm:clamp(.875rem,.85rem + .1vw,.9375rem);--text-base:1rem;--text-lg:1.125rem;--text-xl:clamp(1.375rem,1.2rem + .65vw,1.75rem);--money:clamp(2rem,1.6rem + 1.5vw,2.75rem);--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:20px;--s6:24px;--s8:32px;--s10:40px;--s12:48px}\n[data-theme=dark]{color-scheme:dark;--bg:#161c19;--surface:#1e2722;--soft:#29322c;--ink:#ecf0ec;--muted:#b3c0b7;--line:#3c4941;--brand:#f59b91;--brand-soft:#382b28;--green:#a0d5b3;--green-soft:#283c30;--focus:#ffb3a9}\n*,*:before,*:after{box-sizing:border-box;margin:0;padding:0}\n.native-document{-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased}\n.native-body{background:var(--bg);color:var(--ink);font:500 var(--text-sm)/1.6 var(--font-.native-body);min-height:100dvh}\nbutton,input,select{font:inherit;color:inherit}button,a,summary{touch-action:manipulation;-webkit-tap-highlight-color:transparent}\nbutton{cursor:pointer;background:none;border:0}a{color:inherit;text-decoration:none}\nbutton,a,input,select,summary{border-radius:8px}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--focus);outline-offset:3px}\nbutton,a,summary,input,select{min-height:44px;min-width:44px}a{display:inline-flex;align-items:center}\nbutton:hover,a:hover,summary:hover{color:var(--brand)}\n[hidden]{display:none!important}\n.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}\n.skip{position:absolute;left:16px;top:-100px;background:var(--surface);padding:var(--s3);z-index:10}.skip:focus{top:12px}\n.top{display:flex;align-items:center;gap:var(--s3);max-width:1120px;margin:auto;padding:var(--s4) var(--s8);min-height:80px}\n.brand{font-size:24px;font-weight:800;letter-spacing:-1.4px;flex-shrink:0}.brand span{color:var(--brand)}\n.cabinet-label,.prototype-label{font-size:var(--text-xs);color:var(--muted)}.prototype-label{margin-left:auto}\n.theme{border:1px solid var(--line);width:44px;height:44px;font-size:22px;background:var(--surface);flex-shrink:0}\n.preview-nav{display:flex;justify-content:center;gap:var(--s2);flex-wrap:wrap;padding:var(--s2) var(--s4) var(--s4);border-bottom:1px solid var(--line)}\n.preview-nav button{padding:var(--s2) var(--s4);color:var(--muted);font-size:var(--text-xs)}\n.preview-nav button[aria-pressed=true]{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px #25292312;font-weight:800}\nmain{max-width:936px;padding:var(--s8) var(--s8) var(--s6);margin:auto;outline:none!important}\n.context{display:flex;justify-content:space-between;gap:var(--s3);color:var(--muted);font-size:var(--text-xs);margin-bottom:var(--s2)}.context span:first-child{font-weight:800;letter-spacing:.08em}\n.page-heading{display:flex;align-items:center;justify-content:space-between;gap:var(--s4);margin-bottom:var(--s6)}h1{font-size:var(--text-xl);font-family:var(--font-display);font-weight:800;letter-spacing:-.04em;line-height:1.3}h2{font-size:var(--text-base);font-weight:800;letter-spacing:-.02em}\n.text-button{display:inline-flex;align-items:center;justify-content:center;gap:var(--s2);padding:var(--s2);color:var(--muted);font-size:var(--text-xs);font-weight:700}\n.directions{display:flex;gap:var(--s1);background:var(--soft);padding:var(--s1);border-radius:10px;width:max-content;margin-bottom:var(--s6)}.directions button{padding:var(--s2) var(--s6);font-weight:700;color:var(--muted)}.directions button[aria-pressed=true]{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px #25292315}\n.balance{display:flex;justify-content:space-between;align-items:center;gap:var(--s6);padding:var(--s8);border:1px solid var(--line);border-radius:16px;background:var(--surface);margin-bottom:var(--s8)}\n.balance>div>p:first-child{font-size:var(--text-sm);font-weight:700}.main-amount{font-size:var(--money);font-weight:800;line-height:1.25;letter-spacing:-.045em;margin:var(--s2) 0}.main-amount span{font-size:.7em;letter-spacing:0}\n.muted{color:var(--muted);font-size:var(--text-xs)}\n.confirmed{display:grid;gap:var(--s1);font-size:var(--text-xs);color:var(--muted);padding-left:var(--s8);border-left:1px solid var(--line)}.confirmed strong{font-size:var(--text-lg);font-weight:700;color:var(--ink)}\n.list-heading{display:flex;align-items:center;justify-content:space-between;gap:var(--s4);margin-bottom:var(--s3)}\n.chips{display:flex;gap:var(--s1);align-items:center}.chips button{padding:var(--s2) var(--s3);font-size:var(--text-xs);color:var(--muted)}.chips button[aria-pressed=true]{background:var(--soft);color:var(--ink);font-weight:800}\n.ledger-label{display:flex;justify-content:space-between;gap:var(--s4);padding:var(--s2) var(--s5);font-size:var(--text-xs);color:var(--muted)}\n.rows{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden}\n.operation{display:flex;width:100%;align-items:center;gap:var(--s4);text-align:left;padding:var(--s4) var(--s5);border-radius:0;min-height:82px;line-height:1.5}.operation+.operation{border-top:1px solid var(--line)}.operation:hover{background:var(--soft);color:var(--ink)}.operation:focus-visible{outline-offset:-4px}\n.operation-main{min-width:0;flex:1}.operation-main strong{font-size:var(--text-sm);font-weight:800;display:block}.operation-main p{color:var(--muted);font-size:var(--text-xs);margin-top:var(--s1);overflow-wrap:anywhere}\n.operation-money{margin-left:auto;text-align:right;flex-shrink:0}.operation-money strong{font-size:var(--text-base);font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}.operation-money small{display:block;color:var(--muted);font-size:var(--text-xs);margin-top:var(--s1)}\n.arrow{color:var(--muted);font-size:20px;padding-left:var(--s2)}\n.status{font-size:var(--text-xs);font-weight:700;display:inline-flex;align-items:center;gap:var(--s2);color:var(--green)}.status:before{content:\"\";width:5px;height:5px;border-radius:50%;background:currentColor}.neutral{color:var(--muted)}\n.fine-print{margin-top:var(--s4);color:var(--muted);font-size:var(--text-xs)}summary{display:flex;align-items:center;justify-content:space-between;gap:var(--s4);cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}.fine-print summary{justify-content:flex-start;gap:var(--s2);width:max-content;max-width:100%}details[open] summary>span:last-child{transform:rotate(45deg)}.fine-print p{max-width:72ch;padding-top:var(--s2)}\n.history-tabs{display:flex;gap:var(--s6);border-bottom:1px solid var(--line);margin-bottom:var(--s6)}.history-tabs button{display:flex;align-items:center;gap:var(--s2);border-radius:0;padding:var(--s2) 0 var(--s4);font-weight:700;color:var(--muted);border-bottom:2px solid transparent}.history-tabs button[aria-pressed=true]{color:var(--ink);border-bottom-color:var(--brand)}.history-tabs span{font-size:var(--text-xs);color:var(--muted)}\n.toolbar{display:flex;gap:var(--s3)}.search{flex:1;min-width:0}.search input{width:100%;min-height:48px;padding:var(--s3) var(--s4);border:1px solid var(--line);background:var(--surface);font-size:var(--text-sm)}input::placeholder{color:var(--muted);opacity:1}\n.filter-button{display:flex;align-items:center;justify-content:center;gap:var(--s3);padding:var(--s3) var(--s4);background:var(--surface);border:1px solid var(--line);font-size:var(--text-xs);font-weight:700}.filter-button[aria-expanded=true]{border-color:var(--brand)}\n.filters{display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--s3);padding:var(--s4);margin-top:var(--s3);border:1px solid var(--line);border-radius:10px;background:var(--surface)}.filters label{display:grid;gap:var(--s2);min-width:0;color:var(--muted);font-size:var(--text-xs)}.filters input,.filters select{width:100%;min-width:0;border:1px solid var(--line);background:var(--bg);padding:var(--s2);font-size:var(--text-sm)}.filters button{justify-self:start;grid-column:1/-1}\n.results-heading{display:flex;justify-content:space-between;align-items:center;gap:var(--s4);margin:var(--s2) 0;color:var(--muted);font-size:var(--text-xs)}\n.empty{padding:var(--s10) var(--s6);text-align:center;color:var(--muted);font-size:var(--text-sm)}.empty strong{display:block;color:var(--ink);font-size:var(--text-base);margin-bottom:var(--s2)}.empty button{margin-top:var(--s3);text-decoration:underline}\n.back{padding-left:0;margin-bottom:var(--s3)}.detail-heading{margin-bottom:var(--s5)}.receipt{max-width:640px;margin:0 auto;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:var(--s8)}.receipt-focus{text-align:center;padding:var(--s3) 0 var(--s8)}.receipt-focus>p:first-child{font-weight:700;color:var(--muted);font-size:var(--text-sm)}\n.receipt-meta{padding:var(--s5) 0;border-top:1px solid var(--line)}.receipt-meta>div{display:flex;justify-content:space-between;gap:var(--s5);padding:var(--s2) 0;font-size:var(--text-sm)}dt{color:var(--muted);flex-shrink:0}dd{text-align:right;font-weight:700;overflow-wrap:anywhere;min-width:0}\n.primary-link{display:flex;width:100%;justify-content:center;align-items:center;gap:var(--s3);background:var(--brand);color:#fff;font-weight:800;font-size:var(--text-sm);min-height:48px;padding:var(--s3) var(--s4);border-radius:9px}.primary-link:hover{color:#fff;filter:brightness(.93)}[data-theme=dark] .primary-link{color:#281916}\n.technical{color:var(--muted);font-size:var(--text-xs);margin-top:var(--s4)}.technical p{overflow-wrap:anywhere;padding-top:var(--s2);font-variant-numeric:tabular-nums}.read-only{text-align:center;color:var(--muted);font-size:var(--text-xs);margin-top:var(--s4)}\nfooter{display:flex;align-items:center;justify-content:space-between;gap:var(--s4);padding-top:var(--s8);margin-top:var(--s8);color:var(--muted);font-size:var(--text-xs)}\ndialog{margin:auto;width:480px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);overflow:auto;padding:var(--s6);border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--ink);box-shadow:0 24px 70px #101b1540}dialog::backdrop{background:#0c17106b}.dialog-heading{display:flex;justify-content:space-between;align-items:center;gap:var(--s3);margin-bottom:var(--s4)}.close{font-size:26px;width:44px;height:44px}.dialog-amount{font-size:var(--money);font-weight:800;letter-spacing:-.04em;margin:var(--s3) 0 var(--s6)}dialog .primary-link{margin-top:var(--s6)}\n@media(max-width:600px){.top{padding:var(--s3) var(--s4);gap:var(--s2)}.cabinet-label{display:none}.prototype-label{max-width:140px;line-height:1.4}.preview-nav{display:grid;grid-template-columns:1fr 1fr;gap:var(--s1);padding:var(--s2) var(--s3)}.preview-nav button{padding:var(--s2);font-size:var(--text-xs)}main{padding:var(--s6) var(--s4)}.context{flex-wrap:wrap;gap:var(--s1);margin-bottom:var(--s3)}.page-heading{gap:var(--s2);margin-bottom:var(--s4)}.page-heading .text-button{max-width:136px;font-size:var(--text-xs);line-height:1.4;text-align:right}.balance{display:block;padding:var(--s6);margin-bottom:var(--s6)}.confirmed{border-left:0;border-top:1px solid var(--line);padding:var(--s4) 0 0;margin-top:var(--s5);grid-template-columns:1fr auto;gap:var(--s1) var(--s2);align-items:center}.confirmed>span:last-child{grid-column:1/-1}.list-heading{display:block}.chips{margin-top:var(--s2)}.ledger-label{padding-inline:var(--s3)}.ledger-label span:last-child{max-width:145px;text-align:right}.operation{padding:var(--s4) var(--s3);gap:var(--s2)}.operation-money strong{font-size:var(--text-sm)}.arrow{padding-left:0;font-size:18px}.operation-main p{max-width:210px}.toolbar{gap:var(--s2)}.filter-button{padding:var(--s2) var(--s3);gap:var(--s2)}.filters{grid-template-columns:1fr}.filters button{grid-column:auto}.receipt{padding:var(--s6) var(--s4)}.receipt-meta>div{font-size:var(--text-xs);gap:var(--s3)}.detail-heading{align-items:start}.detail-heading .status{margin-top:var(--s1)}.receipt-focus{padding-top:var(--s2)}footer{display:block}footer a{margin-top:var(--s2)}}\n@media(max-width:600px){footer a{display:flex;width:max-content;max-width:100%}.prototype-label{min-width:0}}\n.top{border-bottom:1px solid var(--line)}.view-purpose{color:var(--muted);font-size:var(--text-xs);margin:calc(-1 * var(--s2)) 0 var(--s5)}.operation-main .row-partner{color:var(--ink);font-weight:600}.operation-money strong{font-size:var(--text-lg)}\n@media(max-width:600px){.operation{gap:var(--s3)}.operation-main strong{font-size:var(--text-sm);line-height:1.4}.operation-main p{font-size:var(--text-xs)}.operation-money strong{font-size:var(--text-base)}.operation-money small{font-size:var(--text-xs)}}\n@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}\n\n.native-document.cabinet-embed-mode .preview-header,\n.native-document.cabinet-embed-mode header.top,\n.native-document.cabinet-embed-mode header.op-top,\n.native-document.cabinet-embed-mode a.back[href*=\"index.html\"],\n.native-document.cabinet-embed-mode .page-heading + .list,\n.native-document.cabinet-embed-mode .page-note,\n.native-document.cabinet-embed-mode .op-page-footer a[href*=\"partner-cooperation\"] {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-mode .native-body {\n  min-height: 100%;\n  background: var(--bg, #f6f6f4);\n}\n\n.native-document.cabinet-embed-mode .skip,\n.native-document.cabinet-embed-mode a.skip {\n  position: absolute;\n  left: -9999px;\n}\n\n.native-document.cabinet-embed-mode .proto-page-flow,\n.native-document.cabinet-embed-mode .proto-page-panel,\n.native-document.cabinet-embed-mode [data-proto-ui=\"flow\"],\n.native-document.cabinet-embed-mode [data-proto-ui=\"panel\"] {\n  display: none !important;\n  visibility: hidden !important;\n  pointer-events: none !important;\n}\n\n.native-document.cabinet-embed-mode main.page,\n.native-document.cabinet-embed-mode main.page > .page-heading {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-mode .native-body {\n  overflow: auto;\n  height: 100%;\n  margin: 0;\n}\n\n.native-document.cabinet-embed-cooperation-panel .partner-dialog.embed-cooperation-panel,\n.native-document.cabinet-embed-mode dialog.partner-dialog.embed-cooperation-panel {\n  position: static !important;\n  display: flex !important;\n  flex-direction: column !important;\n  width: 100% !important;\n  max-width: none !important;\n  max-height: none !important;\n  height: auto !important;\n  min-height: 100% !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border: none !important;\n  border-radius: 0 !important;\n  box-shadow: none !important;\n  background: var(--bg, #f6f6f4) !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel .partner-dialog::backdrop,\n.native-document.cabinet-embed-mode dialog.partner-dialog::backdrop {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel #edit-dialog,\n.native-document.cabinet-embed-cooperation-panel #pause-dialog,\n.native-document.cabinet-embed-cooperation-panel #certificate-dialog {\n  display: none !important;\n}\n\n.native-document.cabinet-embed-cooperation-panel .dialog-scroll {\n  flex: 1 1 auto;\n  overflow: auto;\n  max-height: none;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental {\n  margin-top: 1rem;\n  display: grid;\n  gap: 1rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental .counterparty-profile,\n.native-document.cabinet-embed-mode .embed-supplemental .stack,\n.native-document.cabinet-embed-mode .embed-supplemental .fold-list {\n  font: inherit;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  align-items: center;\n  margin-top: 0.75rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions .certificate-list-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n}\n\n.native-document.cabinet-embed-mode .embed-supplemental-actions .certificate-list-action,\n.native-document.cabinet-embed-mode .embed-supplemental-actions .btn {\n  font: inherit;\n  cursor: pointer;\n}\n",install(document,window,location,parent,matchMedia){
installRole(document,window,location,parent,matchMedia);
{
/* Isolated visual prototype. No network, storage, financial actions or production integration. */
(() => {
  const $ = (s) => document.querySelector(s);
  const money = (n) => n.toLocaleString("ru-RU") + " ₽";
  const purchases = [
    {date:"2026-11-10",display:"10 ноября, 15:48",amount:162000,title:"Артем",id:"purchase-1"},
    {date:"2026-11-09",display:"9 ноября, 16:17",amount:103500,title:"Артем",id:"purchase-2"}
  ];
  const accruals = [
    {date:"2026-11-10",display:"10 ноября, 15:48",amount:0,title:"Артем",id:"cmwaor7m00014o30k7lrqpa0s"},
    {date:"2026-11-10",display:"10 ноября, 10:39",amount:0,title:"Артем",id:null},
    {date:"2026-11-10",display:"10 ноября, 09:23",amount:0,title:"Артем",id:null},
    {date:"2026-11-09",display:"9 ноября, 16:17",amount:0,title:"Артем",id:null}
  ];
  let view = "purchases",
    selectedAccrual = accruals[0];
  let accrualOperationLabel = "Вознаграждение профклиенту";
  const refreshAccrualDetailLabels = () => {
    const focus = document.querySelector("#detail-view .receipt-focus > p:not(.main-amount)");
    if (focus) focus.textContent = accrualOperationLabel;
    document.querySelectorAll("#detail-view .receipt-meta > div").forEach((row) => {
      const dt = row.querySelector("dt");
      if (dt?.textContent?.trim() === "Тип") {
        const dd = row.querySelector("dd");
        if (dd) dd.textContent = accrualOperationLabel;
      }
    });
  };
  const WALLET_CERT = "RC-X9Z0WZ";
  const embedParams =
    typeof window.__protoCabinetEmbedParams === "function"
      ? window.__protoCabinetEmbedParams()
      : new URLSearchParams(location.search);
  const isCabinetEmbed = embedParams.get("cabinet_embed") === "1";
  function accrualReceiptCtx(accrual) {
    if (!accrual) return null;
    const linkedPurchase = accrual === accruals[0] && purchases[0] ? purchases[0] : null;
    const relatedPurchasePayable = linkedPurchase ? linkedPurchase.amount : undefined;
    const savedAmount = Number(accrual.amount);
    const hasSavedReward =
      accrual.id != null && Number.isFinite(savedAmount);
    return {
      accrualId: accrual.id,
      date: accrual.date,
      dateDisplay: accrual.display,
      amount: hasSavedReward ? savedAmount : null,
      rewardAmount: hasSavedReward ? savedAmount : null,
      hasRewardSnapshot: hasSavedReward,
      partner: accrual.title,
      certCode: WALLET_CERT,
      clientLabel: "Демо-клиент",
      relatedPurchasePayable,
      purchaseCtx: linkedPurchase ? purchaseRowCtx(0) : null,
      hasCalcSnapshot: false,
      embedSnapshot: true,
    };
  }
  function purchaseRowCtx(index) {
    const row = purchases[index];
    if (!row) return null;
    return {
      index,
      amount: row.amount,
      partner: row.title,
      certCode: WALLET_CERT,
      dateDisplay: row.display,
      id: row.id,
      embedSnapshot: true,
      hasCalcSnapshot: false,
      hasRewardSnapshot: false,
      rewardAmount: null,
    };
  }
  let theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const setTheme = () => {
    document.documentElement.dataset.theme = theme;
    $("#theme").setAttribute("aria-label",`Включить ${theme === "dark" ? "светлую" : "тёмную"} тему`);
  };
  $("#theme").addEventListener("click",()=>{theme=theme==="dark"?"light":"dark";setTheme();});
  setTheme();
  const empty = (title,text,reset) => `<div class="empty"><strong>${title}</strong><p>${text}</p>${reset?'<button class="text-button" data-reset>Сбросить отбор</button>':""}</div>`;
  function renderHistory(){
    const isPurchase = view === "purchases";
    const all = isPurchase ? purchases : accruals;
    const search = $("#search").value.trim().toLocaleLowerCase("ru-RU");
    const status = $("#status").value, from = $("#from").value, to = $("#to").value;
    const matches = all.filter(r => (`${r.title} RC-X9Z0WZ`).toLocaleLowerCase("ru-RU").includes(search) && status !== "paid" && (!from || r.date >= from) && (!to || r.date <= to));
    $("#result-count").textContent = `${isPurchase?"Покупки":"Начисления"}: ${matches.length} из ${all.length}`;
    $("#clear-search").hidden = !search;
    const count = [status!=="all",!!from,!!to].filter(Boolean).length;
    $("#filter-count").hidden = count===0; $("#filter-count").textContent=String(count);
    $("#history-rows").innerHTML = matches.length ? matches.map(r=>{
      const index=all.indexOf(r);
      const standaloneFirstPurchase = isPurchase && !isCabinetEmbed && index === 0;
      const embedPurchaseAttrs =
        isCabinetEmbed && isPurchase
          ? ` data-proto-embed-ignore data-purchase-embed="${index}"`
          : "";
      const rowTag = standaloneFirstPurchase ? 'a href="partner-purchase-detail.html"' : "button";
      const rowAttrs = isPurchase
        ? isCabinetEmbed
          ? embedPurchaseAttrs
          : standaloneFirstPurchase
            ? ""
            : `data-purchase-row="${index}"`
        : `data-accrual-row="${index}"`;
      const rowClose = standaloneFirstPurchase ? "a" : "button";
      return `<${rowTag} class="operation" ${rowAttrs}><div class="operation-main"><strong>${isPurchase?"Покупка по сертификату":accrualOperationLabel}</strong><p class="row-partner">Партнёр: ${r.title}</p><p>RC-X9Z0WZ · ${r.display}</p></div><div class="operation-money"><strong>${money(r.amount)}</strong><small class="status ${isPurchase?"":"neutral"}">${isPurchase?"Подтверждена":"Начислено"}</small></div><span class="arrow" aria-hidden="true">›</span></${rowClose}>`;
    }).join("") : empty("Ничего не найдено","Измените запрос или выбранный период.",true);
  }
  let viewPurposeCopy = null;
  function refreshViewPurpose(){
    const purpose = $("#view-purpose");
    if (!purpose) return;
    if (viewPurposeCopy && viewPurposeCopy[view]) {
      purpose.textContent = viewPurposeCopy[view];
      return;
    }
    purpose.textContent = view === "purchases"
      ? "Принято у меня · суммы покупок после скидки"
      : "Вознаграждения профклиентам · сохранённые суммы";
  }
  function setView(next){
    view = next;
    $("#history-view").hidden=!["purchases","accruals"].includes(view);
    $("#detail-view").hidden=view!=="detail";
    document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===view)));
    if(["purchases","accruals"].includes(view)){
      refreshViewPurpose();
      $("#status option[value=active]").textContent=view==="purchases"?"Подтверждена":"Начислено";
      renderHistory();
    }
    if(view==="detail"){
      refreshAccrualDetailLabels();
      $("#detail-date").textContent=selectedAccrual.display.replace(","," 2026,");
      $("#detail-id").textContent=selectedAccrual.id || "Номер этой записи не показан на снимке";
      const receiptBtn = $("#open-receipt");
      if (receiptBtn) receiptBtn.hidden = !selectedAccrual.id;
      $("#open-related").innerHTML=selectedAccrual===accruals[0]?'Открыть связанную покупку <span aria-hidden="true">↗</span>':'Покупки по этому сертификату <span aria-hidden="true">↗</span>';
    }
    $("#main").focus({preventScroll:true});
  }
  const walletState = () => ({
    view,
    selectedAccrualId: selectedAccrual?.id || null,
    search: $("#search").value,
    status: $("#status").value,
    from: $("#from").value,
    to: $("#to").value,
  });
  function navigatePurchaseEmbed(purchaseIndex) {
    window.__protoCabinetEmbedNavigate?.(144, "", {
      walletState: walletState(),
      purchaseCtx: purchaseRowCtx(purchaseIndex),
    });
  }
  document.addEventListener("click",e=>{
    const b = e.target.closest("button"); if(!b)return;
    if(b.dataset.view)setView(b.dataset.view);
    if(b.hasAttribute("data-reset")){
      $("#search").value="";$("#status").value="all";$("#from").value="";$("#to").value="";renderHistory();
    }
    if(b.dataset.purchaseRow!==undefined){
      $("#dialog-title").textContent="Покупка";$("#dialog-status").textContent="Подтверждена";$("#dialog-amount").textContent="103 500 ₽";
      $("#dialog-partner").textContent="Артем";$("#dialog-certificate").textContent="RC-X9Z0WZ";$("#dialog-order").textContent="9 ноября 2026, 16:17";
      $("#dialog-note").textContent="К оплате за покупку. До скидки: 115 000 ₽, скидка: 11 500 ₽.";$("#dialog-return").textContent="Вернуться к истории";$("#purchase-dialog").showModal();
    }
    if(b.dataset.accrualRow!==undefined){selectedAccrual=accruals[Number(b.dataset.accrualRow)];setView("detail");}
  });
  $("#filter-button").addEventListener("click",()=>{
    const open=$("#filters").hidden;$("#filters").hidden=!open;$("#filter-button").setAttribute("aria-expanded",String(open));
  });
  $("#clear-filters").addEventListener("click",()=>{$("#status").value="all";$("#from").value="";$("#to").value="";renderHistory();});
  $("#clear-search").addEventListener("click",()=>{$("#search").value="";renderHistory();$("#search").focus();});
  $("#open-related").addEventListener("click",(e)=>{
    if(selectedAccrual===accruals[0]){
      if(isCabinetEmbed){
        e.preventDefault();
        navigatePurchaseEmbed(0);
        return;
      }
      if(window.__protoCabinetEmbedNavigate?.(144))return;
      location.href="partner-purchase-detail.html";
    }
    else{$("#search").value="RC-X9Z0WZ";$("#status").value="all";$("#from").value="";$("#to").value="";setView("purchases");}
  });
  ["#search","#status","#from","#to"].forEach(s=>$(s).addEventListener("input",renderHistory));
  ["#close-dialog","#dialog-return"].forEach(s=>$(s).addEventListener("click",()=>$("#purchase-dialog").close()));
  if (isCabinetEmbed) {
    const applyWalletState = (state) => {
      if (!state) return;
      if (state.search != null) $("#search").value = state.search;
      if (state.status != null) $("#status").value = state.status;
      if (state.from != null) $("#from").value = state.from;
      if (state.to != null) $("#to").value = state.to;
      if (state.selectedAccrualId) {
        const hit = accruals.find((row) => row.id === state.selectedAccrualId);
        if (hit) selectedAccrual = hit;
      }
      setView(state.view || view);
      renderHistory();
    };
    window.__protoWalletApplyState = applyWalletState;
    window.__protoWalletSetView = setView;
    window.__protoWalletRefreshPurpose = (copy) => {
      viewPurposeCopy = copy;
      refreshViewPurpose();
    };
    window.__protoWalletSetAccrualLabels = (actor) => {
      if (!actor) return;
      if (actor.accrualOperationLabel) accrualOperationLabel = actor.accrualOperationLabel;
      else if (actor.receiptMode === "earned") accrualOperationLabel = "Заработанное вознаграждение";
      refreshAccrualDetailLabels();
      if (view === "accruals") renderHistory();
    };
    $("#open-receipt")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!selectedAccrual?.id) return;
      window.__protoCabinetEmbedNavigate?.(145, "", {
        walletState: { ...walletState(), view: "detail" },
        receiptCtx: accrualReceiptCtx(selectedAccrual),
      });
    });
    $("#history-rows")?.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest("[data-purchase-embed]");
        if (!link) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        navigatePurchaseEmbed(Number(link.getAttribute("data-purchase-embed")));
      },
      true,
    );
  }
  setView("purchases");
})();

}
}},
};
