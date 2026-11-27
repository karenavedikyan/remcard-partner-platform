/**
 * Partner scan transaction prototype — in-memory only, no network/storage.
 * Pure helpers mirrored in tests/partner-scan-transaction-logic.mjs
 */
(function () {
  "use strict";

  const CATEGORIES = [
    { id: "doors", label: "Двери", bps: 1000 },
    { id: "floors", label: "Напольные покрытия", bps: 700 },
    { id: "hardware", label: "Фурнитура и замки", bps: 1000 },
  ];

  const MAX_KOPECKS = BigInt(Number.MAX_SAFE_INTEGER);
  const inertTargetId = "pst-main";

  function parseAmountKopecks(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return { ok: true, empty: true, kopecks: 0 };
    const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      return { ok: false, empty: false, kopecks: 0, reason: "invalid" };
    }
    const [intPart, fracPart = ""] = normalized.split(".");
    const fracPadded = (fracPart + "00").slice(0, 2);
    let kopecksBi;
    try {
      kopecksBi = BigInt(intPart) * 100n + BigInt(fracPadded);
    } catch {
      return { ok: false, empty: false, kopecks: 0, reason: "overflow" };
    }
    if (kopecksBi > MAX_KOPECKS) {
      return { ok: false, empty: false, kopecks: 0, reason: "overflow" };
    }
    const kopecks = Number(kopecksBi);
    if (!Number.isSafeInteger(kopecks)) {
      return { ok: false, empty: false, kopecks: 0, reason: "overflow" };
    }
    return { ok: true, empty: false, kopecks };
  }

  function categoryDiscountKopecks(kopecks, bps) {
    if (!Number.isSafeInteger(kopecks) || kopecks < 0) return 0;
    return Number((BigInt(kopecks) * BigInt(bps) + 5000n) / 10000n);
  }

  function computeTotals(amountsKopecks) {
    let grossBi = 0n;
    let discountBi = 0n;
    for (let idx = 0; idx < CATEGORIES.length; idx++) {
      const cat = CATEGORIES[idx];
      const k = amountsKopecks[idx] || 0;
      if (!Number.isSafeInteger(k) || k < 0) {
        return { ok: false, reason: "invalid" };
      }
      const kBi = BigInt(k);
      grossBi += kBi;
      if (grossBi > MAX_KOPECKS) {
        return { ok: false, reason: "overflow" };
      }
      discountBi += (kBi * BigInt(cat.bps) + 5000n) / 10000n;
      if (discountBi > MAX_KOPECKS) {
        return { ok: false, reason: "overflow" };
      }
    }
    const grossKopecks = Number(grossBi);
    const discountKopecks = Number(discountBi);
    const dueKopecks = grossKopecks - discountKopecks;
    if (
      !Number.isSafeInteger(grossKopecks) ||
      !Number.isSafeInteger(discountKopecks) ||
      !Number.isSafeInteger(dueKopecks)
    ) {
      return { ok: false, reason: "overflow" };
    }
    return { ok: true, grossKopecks, discountKopecks, dueKopecks };
  }

  function formatRub(kopecks) {
    if (!Number.isSafeInteger(kopecks)) return "—";
    const negative = kopecks < 0;
    const abs = Math.abs(kopecks);
    const rub = Math.trunc(abs / 100);
    const frac = abs % 100;
    const rubStr = rub.toLocaleString("ru-RU");
    const body = frac === 0 ? rubStr : `${rubStr},${String(frac).padStart(2, "0")}`;
    return `${negative ? "−" : ""}${body} ₽`;
  }

  function parseDelayDays(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return { ok: false, empty: true, days: 0, reason: "empty" };
    if (!/^\d+$/.test(trimmed)) {
      return { ok: false, empty: false, days: 0, reason: "invalid" };
    }
    const days = Number(trimmed);
    if (!Number.isSafeInteger(days) || days < 0 || days > 36500) {
      return { ok: false, empty: false, days: 0, reason: "range" };
    }
    return { ok: true, empty: false, days };
  }

  const state = {
    theme: "light",
    lastFocus: null,
    delayAll: false,
    openDialogCount: 0,
  };

  const el = {
    form: null,
    confirm: null,
    cancel: null,
    blockReason: null,
    gross: null,
    discount: null,
    due: null,
    complete: null,
    restart: null,
    reviewOverlay: null,
    reviewDialog: null,
    reviewBody: null,
    reviewBack: null,
    reviewFinish: null,
    cancelOverlay: null,
    cancelDialog: null,
    cancelBack: null,
    cancelConfirm: null,
    theme: null,
    delayAll: null,
    main: null,
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function amountErrorMessage(reason) {
    if (reason === "overflow") {
      return "Слишком большая сумма для демо — уменьшите значение.";
    }
    return "Введите сумму числом, не больше двух знаков после запятой.";
  }

  function formatDaysRu(days) {
    const n = Math.abs(days);
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${days} день`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${days} дня`;
    return `${days} дней`;
  }

  function updateRewardSummaries() {
    CATEGORIES.forEach((cat) => {
      const summary = qs(`[data-reward-summary="${cat.id}"]`);
      const textEl = summary?.querySelector("[data-reward-summary-text]");
      const input = qs(`#pst-delay-${cat.id}`);
      if (!summary || !textEl || !input) return;
      const parsed = parseDelayDays(input.value);
      if (!parsed.ok) {
        summary.classList.add("pst-reward-summary--invalid");
        textEl.textContent = "Вознаграждение · Проверьте срок";
      } else {
        summary.classList.remove("pst-reward-summary--invalid");
        textEl.textContent = `Вознаграждение · ${formatDaysRu(parsed.days)}`;
      }
    });
  }

  function delayErrorMessage(reason) {
    if (reason === "range") {
      return "Укажите целое число дней от 0 до 36 500.";
    }
    if (reason === "empty") {
      return "Укажите срок в днях (по умолчанию 14).";
    }
    return "Срок — только целое число дней, без дробной части.";
  }

  function readAmounts() {
    const values = [];
    const errors = [];
    CATEGORIES.forEach((cat) => {
      const input = qs(`#pst-amt-${cat.id}`);
      const field = input?.closest("[data-field='amount']");
      const err = field?.querySelector(".pst-field__err");
      const parsed = parseAmountKopecks(input?.value);
      if (!parsed.ok) {
        field?.classList.add("pst-field--invalid");
        if (err) {
          err.hidden = false;
          err.textContent = amountErrorMessage(parsed.reason);
        }
        errors.push(cat.id);
        values.push(0);
      } else {
        field?.classList.remove("pst-field--invalid");
        if (err) err.hidden = true;
        values.push(parsed.empty ? 0 : parsed.kopecks);
      }
    });
    return { values, errors, hasPositive: values.some((v) => v > 0) };
  }

  function readDelays() {
    const values = {};
    const errors = [];
    CATEGORIES.forEach((cat) => {
      const input = qs(`#pst-delay-${cat.id}`);
      const field = input?.closest("[data-field='delay']");
      const err = field?.querySelector(".pst-field__err");
      const parsed = parseDelayDays(input?.value);
      if (!parsed.ok) {
        field?.classList.add("pst-field--invalid");
        if (err) {
          err.hidden = false;
          err.textContent = delayErrorMessage(parsed.reason);
        }
        errors.push(cat.id);
      } else {
        field?.classList.remove("pst-field--invalid");
        if (err) err.hidden = true;
        values[cat.id] = parsed.days;
      }
    });
    return { values, errors };
  }

  function updateHandoffLabels() {
    document.querySelectorAll("fieldset[data-cat]").forEach((fieldset) => {
      const cat = fieldset.getAttribute("data-cat");
      const type = qs(`input[name="type-${cat}"]:checked`, fieldset)?.value || "goods";
      const label = qs("[data-handoff-label]", fieldset);
      const span = label?.querySelector("span");
      if (span) {
        span.textContent =
          type === "service" ? "Услуга оказана клиенту" : "Товар передан клиенту";
      }
    });
  }

  function updateDueHints() {
    document.querySelectorAll("fieldset[data-cat]").forEach((fieldset) => {
      const cat = fieldset.getAttribute("data-cat");
      const parsed = parseDelayDays(qs(`#pst-delay-${cat}`, fieldset)?.value);
      const handoff = qs(`input[name="handoff-${cat}"]`, fieldset)?.checked;
      const hint = qs("[data-due-hint]", fieldset);
      if (!hint) return;
      if (!parsed.ok) {
        hint.hidden = true;
        hint.textContent = "";
        return;
      }
      if (handoff && parsed.days > 0) {
        const d = new Date();
        d.setDate(d.getDate() + parsed.days);
        hint.hidden = false;
        hint.textContent = `Ориентир подтверждения вознаграждения: ${d.toLocaleDateString("ru-RU")} (демо).`;
      } else if (handoff && parsed.days === 0) {
        hint.hidden = false;
        hint.textContent = "Вознаграждение можно подтвердить сразу после передачи (демо).";
      } else {
        hint.hidden = true;
        hint.textContent = "";
      }
    });
  }

  function syncDelaysFromPrimary() {
    if (!state.delayAll) return;
    const primary = qs("#pst-delay-doors");
    const parsed = parseDelayDays(primary?.value);
    if (!parsed.ok) return;
    document.querySelectorAll("[data-delay]").forEach((input) => {
      if (input !== primary) input.value = String(parsed.days);
    });
  }

  function refreshTotals() {
    const amounts = readAmounts();
    const delays = readDelays();
    const totals = computeTotals(amounts.values);
    if (totals.ok) {
      el.gross.textContent = formatRub(totals.grossKopecks);
      el.discount.textContent = formatRub(totals.discountKopecks);
      el.due.textContent = formatRub(totals.dueKopecks);
    } else {
      el.gross.textContent = "—";
      el.discount.textContent = "—";
      el.due.textContent = "—";
    }

    const blocked =
      amounts.errors.length > 0 ||
      delays.errors.length > 0 ||
      !amounts.hasPositive ||
      !totals.ok;

    el.confirm.disabled = blocked;
    el.confirm.setAttribute("aria-disabled", blocked ? "true" : "false");
    if (amounts.errors.length) {
      el.blockReason.textContent = "Исправьте суммы с ошибкой — подтверждение недоступно.";
    } else if (delays.errors.length) {
      el.blockReason.textContent = "Исправьте срок вознаграждения: нужно целое число 0–36 500.";
    } else if (!totals.ok) {
      el.blockReason.textContent = "Слишком большие суммы для демо — уменьшите значения.";
    } else if (!amounts.hasPositive) {
      el.blockReason.textContent = "Укажите сумму хотя бы в одной категории, чтобы продолжить.";
    } else {
      el.blockReason.textContent = "Можно открыть проверку перед демо-подтверждением.";
    }
    updateRewardSummaries();
    return {
      values: amounts.values,
      totals: totals.ok ? totals : null,
      delays: delays.values,
      blocked,
    };
  }

  function buildReviewHtml(values, totals, delayValues) {
    function esc(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    const catRows = CATEGORIES.map((cat, i) => {
      if (!values[i]) return "";
      const disc = categoryDiscountKopecks(values[i], cat.bps);
      const type = qs(`input[name="type-${cat.id}"]:checked`)?.value;
      const delay = delayValues[cat.id];
      const handoff = qs(`input[name="handoff-${cat.id}"]`)?.checked;
      const typeLabel = type === "service" ? "Услуга" : "Товар";
      const meta = [
        `<li>${esc(typeLabel)}</li>`,
        `<li>Подтверждение вознаграждения: ${esc(formatDaysRu(delay))}</li>`,
      ];
      if (handoff) {
        meta.push(
          `<li>${esc(type === "service" ? "Услуга оказана клиенту" : "Товар передан клиенту")}</li>`,
        );
      }
      return `<li class="pst-review-cat">
        <h3 class="pst-review-cat__name">${esc(cat.label)}</h3>
        <dl class="pst-review-cat__nums">
          <div><dt>До скидки</dt><dd>${formatRub(values[i])}</dd></div>
          <div><dt>Скидка</dt><dd>−${formatRub(disc)}</dd></div>
        </dl>
        <ul class="pst-review-cat__meta" aria-label="Детали категории">${meta.join("")}</ul>
      </li>`;
    })
      .filter(Boolean)
      .join("");

    return `<div class="pst-review">
      <section class="pst-review__due" aria-labelledby="pst-review-due-label">
        <p class="pst-review__due-label" id="pst-review-due-label">К оплате клиентом</p>
        <p class="pst-review__due-value">${formatRub(totals.dueKopecks)}</p>
        <dl class="pst-review__rollup">
          <div><dt>Сумма покупки</dt><dd>${formatRub(totals.grossKopecks)}</dd></div>
          <div><dt>Скидка клиенту</dt><dd>−${formatRub(totals.discountKopecks)}</dd></div>
        </dl>
      </section>
      <section class="pst-review__cats-wrap" aria-label="По категориям">
        <ul class="pst-review__cats">${catRows}</ul>
      </section>
      <p class="pst-review__branch">Филиал: Демонстрационный филиал · Центральный</p>
      <p class="pst-review__demo" role="note">Демо: покупка не создаётся, данные никуда не отправляются.</p>
    </div>`;
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

  function openDialog(overlay, dialog) {
    state.lastFocus = document.activeElement;
    overlay.hidden = false;
    state.openDialogCount += 1;
    setMainInert(true);

    const trap = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeDialog(overlay, dialog);
        return;
      }
      if (ev.key !== "Tab") return;
      const focusable = getFocusable(dialog);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = active && dialog.contains(active) && active !== dialog;
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
    overlay._trap = trap;
    document.addEventListener("keydown", trap);
    focusFirstInDialog(dialog);
  }

  function closeDialog(overlay, dialog) {
    overlay.hidden = true;
    if (overlay._trap) {
      document.removeEventListener("keydown", overlay._trap);
      overlay._trap = null;
    }
    state.openDialogCount = Math.max(0, state.openDialogCount - 1);
    if (state.openDialogCount === 0) {
      setMainInert(false);
    }
    if (state.lastFocus && typeof state.lastFocus.focus === "function") {
      state.lastFocus.focus();
    }
  }

  function toggleTheme() {
    state.theme = state.theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    el.theme.setAttribute(
      "aria-label",
      state.theme === "light" ? "Включить тёмную тему" : "Включить светлую тему",
    );
  }

  function showComplete() {
    el.form.hidden = true;
    el.complete.hidden = false;
    el.restart.focus();
  }

  function resetDemo() {
    el.form.hidden = false;
    el.complete.hidden = true;
    el.form.reset();
    document.querySelectorAll("[data-delay]").forEach((input) => {
      input.value = "14";
    });
    state.delayAll = false;
    if (el.delayAll) el.delayAll.checked = false;
    document.querySelectorAll(".pst-field--invalid").forEach((f) => f.classList.remove("pst-field--invalid"));
    document.querySelectorAll(".pst-field__err").forEach((e) => {
      e.hidden = true;
    });
    updateHandoffLabels();
    updateDueHints();
    refreshTotals();
    qs("#pst-amt-doors")?.focus();
  }

  function bind() {
    el.form = qs("#pst-form");
    el.confirm = qs("#pst-confirm");
    el.cancel = qs("#pst-cancel");
    el.blockReason = qs("#pst-block-reason");
    el.gross = qs("#pst-sum-gross");
    el.discount = qs("#pst-sum-discount");
    el.due = qs("#pst-sum-due");
    el.complete = qs("#pst-complete");
    el.restart = qs("#pst-restart");
    el.reviewOverlay = qs("#pst-overlay-review");
    el.reviewDialog = qs("#pst-overlay-review .pst-dialog");
    el.reviewBody = qs("#pst-review-body");
    el.reviewBack = qs("#pst-review-back");
    el.reviewFinish = qs("#pst-review-finish");
    el.cancelOverlay = qs("#pst-overlay-cancel");
    el.cancelDialog = qs("#pst-overlay-cancel .pst-dialog");
    el.cancelBack = qs("#pst-cancel-back");
    el.cancelConfirm = qs("#pst-cancel-confirm");
    el.theme = qs("#pst-theme");
    el.delayAll = qs("#pst-delay-all");
    el.main = qs(`#${inertTargetId}`);

    el.form.addEventListener("submit", (ev) => {
      ev.preventDefault();
    });

    el.form.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter") return;
      const target = ev.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === "text" &&
        target.id.startsWith("pst-amt-")
      ) {
        ev.preventDefault();
      }
    });

    el.form.addEventListener("input", () => {
      if (state.delayAll && document.activeElement?.hasAttribute("data-delay")) {
        syncDelaysFromPrimary();
      }
      updateHandoffLabels();
      updateDueHints();
      refreshTotals();
    });
    el.form.addEventListener("change", () => {
      if (el.delayAll?.checked) {
        state.delayAll = true;
        syncDelaysFromPrimary();
      } else if (document.activeElement === el.delayAll) {
        state.delayAll = false;
      }
      updateHandoffLabels();
      updateDueHints();
      refreshTotals();
    });

    el.confirm.addEventListener("click", () => {
      const snap = refreshTotals();
      if (snap.blocked || !snap.totals) return;
      el.reviewBody.innerHTML = buildReviewHtml(snap.values, snap.totals, snap.delays);
      openDialog(el.reviewOverlay, el.reviewDialog);
    });
    el.reviewBack.addEventListener("click", () => closeDialog(el.reviewOverlay, el.reviewDialog));
    el.reviewFinish.addEventListener("click", () => {
      closeDialog(el.reviewOverlay, el.reviewDialog);
      showComplete();
    });

    el.cancel.addEventListener("click", () => openDialog(el.cancelOverlay, el.cancelDialog));
    el.cancelBack.addEventListener("click", () => closeDialog(el.cancelOverlay, el.cancelDialog));
    el.cancelConfirm.addEventListener("click", () => {
      closeDialog(el.cancelOverlay, el.cancelDialog);
      el.blockReason.textContent = "Ввод отменён: суммы в полях сохранены (демо). Можно продолжить правки.";
      qs("#pst-amt-doors")?.focus();
    });

    el.restart.addEventListener("click", resetDemo);
    el.theme.addEventListener("click", toggleTheme);

    el.reviewOverlay.addEventListener("click", (ev) => {
      if (ev.target === el.reviewOverlay) closeDialog(el.reviewOverlay, el.reviewDialog);
    });
    el.cancelOverlay.addEventListener("click", (ev) => {
      if (ev.target === el.cancelOverlay) closeDialog(el.cancelOverlay, el.cancelDialog);
    });

    updateHandoffLabels();
    updateDueHints();
    refreshTotals();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  window.PST_SCAN_TX = {
    CATEGORIES,
    parseAmountKopecks,
    computeTotals,
    formatRub,
    parseDelayDays,
    categoryDiscountKopecks,
    formatDaysRu,
  };
})();
