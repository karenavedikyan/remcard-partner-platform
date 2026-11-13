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
