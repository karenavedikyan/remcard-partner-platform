/**
 * Prototype-only cooperation controls: term-change proposals + pause/resume.
 * Local demo state only — no network, cookies, or production APIs.
 */

const STATUS = {
  active: "Действует",
  paused: "Приостановлено",
  pending: "Изменения на согласовании",
};

/** @type {Map<string, object>} */
const store = new Map();

/** @type {Map<string, 'owner' | 'counterparty'>} */
const demoSideByContext = new Map();

let api = null;

/** Bound context captured when opening a mutating UI (submit/pause/resume/respond). */
let boundAction = null;

/** Last meaningful trigger for focus restore after close/refresh. */
let focusToken = null;

/** Snapshot of edit draft fields while showing discard confirm. */
let draftSnapshot = null;
let discardConfirmVisible = false;
/** True only while explicit Discard / clean close is intentionally finishing. */
let allowNativeClose = false;
/** Set when a non-cancelable cancel slips through; reopen + confirm on close. */
let pendingCloseRescue = false;
let nativeCloseGuardsInstalled = false;

function sideKey() {
  const role = api?.getRole?.() || "unknown";
  // Employees share the employer's partnership context; owners use their role.
  if (role === "employee") {
    const employer = api?.getEmployerRole?.() || "employee";
    return `employee:${employer}`;
  }
  return `owner:${role}`;
}

function ctxKey(partnerId) {
  return `${sideKey()}|${partnerId}`;
}

function ensure(partnerId) {
  const key = ctxKey(partnerId);
  if (!store.has(key)) {
    const seed = seedCategories(api.getPartner?.(partnerId));
    store.set(key, {
      cooperation: "active",
      pending: null,
      history: [],
      // Isolated agreed limits — never written back to shared P/G fixtures
      agreed: seed.map((c) => ({ id: c.id, name: c.name, limit: c.limit })),
    });
  }
  return store.get(key);
}

function seedCategories(partner) {
  if (partner?.categories?.length) {
    return partner.categories.map((c) => ({
      id: c.id,
      name: c.name,
      limit: Number(c.limit),
    }));
  }
  return (partner?.generalTerms || []).map((t, i) => ({
    id: `term-${i}`,
    name: t.name,
    limit: Number(t.limit),
  }));
}

function partnerCategories(partner) {
  if (!partner) return [];
  const state = ensure(partner.id);
  return state.agreed.map((c) => ({ ...c }));
}

function applyLimitsLocal(partnerId, rows) {
  const state = ensure(partnerId);
  for (const row of rows) {
    const cat = state.agreed.find((c) => c.id === row.id || c.name === row.name);
    if (cat) cat.limit = row.to;
  }
}

function parsePercent(raw) {
  if (raw === "" || raw == null) return { ok: false, reason: "Укажите процент" };
  const trimmed = String(raw).trim();
  if (!trimmed) return { ok: false, reason: "Укажите процент" };
  const normalized = trimmed.replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, reason: "Введите число от 0 до 100" };
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return { ok: false, reason: "Введите число от 0 до 100" };
  }
  if (value < 0 || value > 100) {
    return { ok: false, reason: "Допустимо от 0 до 100 включительно" };
  }
  return { ok: true, value };
}

function statusLabel(state) {
  if (state.cooperation === "paused") return STATUS.paused;
  if (state.pending?.status === "pending") return STATUS.pending;
  return STATUS.active;
}

function statusPillClass(state) {
  if (state.cooperation === "paused") return "coop-pill is-paused";
  if (state.pending?.status === "pending") return "coop-pill is-pending";
  return "coop-pill is-active";
}

function escapeHtml(value) {
  return api.escape(String(value ?? ""));
}

function demoBanner() {
  return `<p class="coop-demo-note" role="note">Демонстрация: изменения только в этом просмотре</p>`;
}

function comparisonHtml(rows) {
  const changed = rows.filter((r) => r.from !== r.to);
  if (!changed.length) return "";
  return `<ul class="coop-compare">${changed
    .map(
      (r) =>
        `<li><strong>${escapeHtml(r.name)}</strong>: ${escapeHtml(r.from)}% → ${escapeHtml(r.to)}%</li>`,
    )
    .join("")}</ul>`;
}

function historyHtml(state) {
  if (!state.history.length) return "";
  return `<details class="coop-history"><summary>История изменений условий <span class="badge-count">${state.history.length}</span></summary><ul>${state.history
    .map(
      (h) =>
        `<li><span class="small">${escapeHtml(h.at)} · ${h.result === "accepted" ? "принято" : "отклонено"}</span>${comparisonHtml(h.rows)}</li>`,
    )
    .join("")}</ul></details>`;
}

function captureTrigger(el) {
  if (!el || !el.getAttribute) return;
  focusToken = {
    testId: el.getAttribute("data-testid") || "",
    action: el.getAttribute("data-action") || "",
    partnerId: (el.getAttribute("data-action") || "").split(":")[1] || "",
  };
}

function bindAction(partnerId, kind) {
  boundAction = {
    kind,
    partnerId,
    contextKey: ctxKey(partnerId),
    side: sideKey(),
  };
}

function guardMutation(partnerId, kind) {
  if (!canWrite()) {
    return {
      ok: false,
      message: "Условия меняет уполномоченный сотрудник. Действие не выполнено.",
    };
  }
  if (
    !boundAction ||
    boundAction.partnerId !== partnerId ||
    boundAction.kind !== kind ||
    boundAction.contextKey !== ctxKey(partnerId) ||
    boundAction.side !== sideKey()
  ) {
    return {
      ok: false,
      message:
        "Рабочий контекст или сторона изменились с момента открытия. Действие не применено ни к прежнему, ни к новому контексту.",
    };
  }
  return { ok: true };
}

function isUsableFocusTarget(el) {
  if (!el || !el.isConnected) return false;
  if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;
  if (el.hasAttribute("inert")) return false;
  const dlg = el.closest("dialog");
  if (dlg && !dlg.open) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  return true;
}

/** Bring el into the dialog's visible scrollport without relying on focus scroll. */
function revealInDialog(el, block = "nearest") {
  if (!el || typeof el.scrollIntoView !== "function") return;
  try {
    el.scrollIntoView({ block, inline: "nearest", behavior: "instant" });
  } catch {
    el.scrollIntoView(false);
  }
}

function isRectInDialogView(el, dialog) {
  if (!el || !dialog) return false;
  const er = el.getBoundingClientRect();
  const dr = dialog.getBoundingClientRect();
  if (er.width < 1 || er.height < 1) return false;
  return er.top >= dr.top - 1 && er.bottom <= dr.bottom + 1;
}

function focusDialogContent() {
  const dialog = api.getDialog?.() || document.querySelector("#role-dialog");
  if (!dialog || !dialog.open) return;
  // Discard confirm first — never leave focus on frozen inputs under the question
  const discard = dialog.querySelector(".coop-discard-confirm");
  if (discard) {
    // Question + actions must be in the dialog viewport (375/320); focus alone is not enough
    revealInDialog(discard, "nearest");
    if (!isRectInDialogView(discard, dialog)) {
      revealInDialog(discard, "end");
    }
    const keep =
      discard.querySelector('[data-testid="coop-discard-keep"]') ||
      discard.querySelector(".btn.primary") ||
      discard.querySelector("button");
    if (keep && typeof keep.focus === "function") {
      keep.focus({ preventScroll: true });
      if (!isRectInDialogView(keep, dialog)) {
        revealInDialog(discard, "end");
      }
      return;
    }
  }
  const prefer =
    dialog.querySelector("[data-coop-autofocus]") ||
    dialog.querySelector(".coop-percent-input:not([readonly])") ||
    dialog.querySelector(".coop-percent-input") ||
    dialog.querySelector(".dialog-body .btn.primary") ||
    dialog.querySelector(".dialog-body button, .dialog-body input, .dialog-body select");
  if (prefer && typeof prefer.focus === "function" && isUsableFocusTarget(prefer)) {
    prefer.focus({ preventScroll: true });
    revealInDialog(prefer, "nearest");
  }
}

function restoreFocusAfterRefresh(partnerId) {
  const token = focusToken;
  const candidates = [];
  const push = (el) => {
    if (el) candidates.push(el);
  };
  const attempt = () => {
    candidates.length = 0;
    if (token?.testId) {
      document
        .querySelectorAll(`[data-testid="${CSS.escape(token.testId)}"]`)
        .forEach((el) => push(el));
    }
    if (token?.action) {
      document
        .querySelectorAll(`[data-action="${CSS.escape(token.action)}"]`)
        .forEach((el) => push(el));
    }
    if (partnerId) {
      push(document.querySelector(`[data-testid="coop-change-${CSS.escape(partnerId)}"]`));
      push(document.querySelector(`[data-action="coop-change-terms:${CSS.escape(partnerId)}"]`));
      push(document.querySelector(`[data-action="coop-view-terms:${CSS.escape(partnerId)}"]`));
      push(document.querySelector(`[data-action="coop-resume:${CSS.escape(partnerId)}"]`));
      push(document.querySelector(`[data-coll-open="${CSS.escape(partnerId)}"]`));
    }
    for (const el of candidates) {
      if (!isUsableFocusTarget(el)) continue;
      el.focus({ preventScroll: true });
      if (document.activeElement === el) return true;
    }
    const dialog = api.getDialog?.() || document.querySelector("#role-dialog");
    if (dialog?.open) {
      focusDialogContent();
      if (dialog.contains(document.activeElement) && document.activeElement !== document.body) {
        return true;
      }
    }
    const fallback =
      document.querySelector(".coop-list-btn:not([disabled])") ||
      document.querySelector("[data-coll-open]");
    if (isUsableFocusTarget(fallback)) {
      fallback.focus({ preventScroll: true });
      return document.activeElement === fallback;
    }
    return false;
  };
  // Double rAF: wait for refresh DOM replacement
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      attempt();
    });
  });
}

function canWrite() {
  return !!api.canManageTerms?.();
}

function getDemoSide(partnerId) {
  return demoSideByContext.get(ctxKey(partnerId)) || "owner";
}

function setDemoSide(partnerId, side) {
  demoSideByContext.set(ctxKey(partnerId), side);
}

/** Read-only view of current agreed categories for this owner/partnership context. */
function categoriesFor(partnerId) {
  return partnerCategories(api.getPartner?.(partnerId));
}

/** Bind respond when the counterparty response UI is actually open. */
function onPartnerOpened(partnerId) {
  if (!partnerId) return;
  const state = ensure(partnerId);
  if (
    state.pending?.status === "pending" &&
    getDemoSide(partnerId) === "counterparty" &&
    canWrite() &&
    state.cooperation !== "paused"
  ) {
    bindAction(partnerId, "respond");
  }
}

function cooperationNeedsCloseProtection() {
  const dialog = api?.getDialog?.() || document.querySelector("#role-dialog");
  if (discardConfirmVisible || dialog?.querySelector?.(".coop-discard-confirm")) {
    return true;
  }
  return cooperationHasUnsavedDraft();
}

/**
 * Chromium CloseWatcher: the second Escape after a prevented cancel is often
 * non-cancelable (cancelable===false). Intercept Escape on keydown so dirty
 * drafts always re-enter the in-page confirm instead of native-closing.
 */
function installNativeCloseGuards(dialog) {
  if (!dialog || nativeCloseGuardsInstalled) return;
  nativeCloseGuardsInstalled = true;

  dialog.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      if (allowNativeClose) return;
      if (!cooperationNeedsCloseProtection()) return;
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    },
    true,
  );

  dialog.addEventListener("cancel", (event) => {
    if (allowNativeClose) return;
    if (!cooperationNeedsCloseProtection()) return;
    if (event.cancelable) {
      event.preventDefault();
      requestClose();
      return;
    }
    // Non-cancelable cancel: dialog will close — rescue on close
    pendingCloseRescue = true;
  });

  dialog.addEventListener("close", () => {
    if (allowNativeClose) {
      pendingCloseRescue = false;
      return;
    }
    if (!pendingCloseRescue) return;
    pendingCloseRescue = false;
    // Content still in DOM until next modal(); reopen and re-show confirm
    if (dialog.open) return;
    try {
      dialog.showModal();
    } catch {
      return;
    }
    requestClose();
  });
}

export function initCooperationControls(context) {
  api = context;
  installNativeCloseGuards(api.getDialog?.() || document.querySelector("#role-dialog"));
  return {
    ensure,
    categoriesFor,
    isPaused: (partnerId) => ensure(partnerId).cooperation === "paused",
    statusLabel: (partnerId) => statusLabel(ensure(partnerId)),
    listActionHtml,
    counterpartyProfileHtml,
    cardBlockHtml,
    openTermChange,
    openPauseConfirm,
    openResumeConfirm,
    handleClick,
    handleSubmit,
    handleInput,
    filterCertPartners,
    decoratePartnerStatus,
    requestClose,
    afterModalOpen: focusDialogContent,
    captureTriggerFromEvent,
    onPartnerOpened,
  };
}

function captureTriggerFromEvent(event) {
  const t = event?.target?.closest?.("[data-action], [data-coll-open], [data-testid]");
  if (!t) return;
  const action = t.getAttribute("data-action") || "";
  const kind = action.split(":")[0] || "";
  // Only remember meaningful openers — never transient modal submit/accept/discard
  const openers = new Set([
    "coop-change-terms",
    "coop-view-terms",
    "coop-pause",
    "coop-resume",
  ]);
  if (t.hasAttribute("data-coll-open") || openers.has(kind)) {
    captureTrigger(t);
  }
}

function counterpartyProfileHtml(partner) {
  if (!partner) return "";
  const demoPublicId = `RC-${String(partner.id).replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "DEMO"}`;
  const typeLabel =
    { store: "Магазин", company: "Компания", specialist: "Специалист", agent: "Агент" }[
      partner.type
    ] || "Партнёр";
  const topics = partner.topics?.length ? partner.topics : ["Отделка", "Материалы"];
  const goods = topics.filter((t) => /материал|плитк|свет|товар/i.test(t)).join(", ") || "—";
  const stages = ["Подготовка", "Черновые работы", "Отделка"];
  return `<div class="counterparty-profile stack" data-testid="counterparty-profile">
    <section data-testid="counterparty-about"><h3>О партнёре</h3><p class="small">${escapeHtml(typeLabel)} · ${escapeHtml(partner.city || "Город не указан")}</p><p class="small muted">Публичный ID: <code data-testid="counterparty-public-id">${escapeHtml(demoPublicId)}</code> <button type="button" class="btn ghost" data-action="coop-copy-id:${escapeHtml(partner.id)}" data-testid="counterparty-copy-id">Скопировать ID</button></p></section>
    <section data-testid="counterparty-directions"><h3>Направления работы</h3><dl class="pw-facts"><div><dt>Товары</dt><dd>${escapeHtml(goods)}</dd></div><div><dt>Услуги</dt><dd>${escapeHtml(topics.join(", "))}</dd></div><div><dt>Этапы ремонта</dt><dd>${escapeHtml(stages.join(" · "))}</dd></div></dl></section>
    <section data-testid="counterparty-geo"><h3>География</h3><p class="small">${escapeHtml(partner.city || "Работа по городу профиля")}${partner.city ? " · демо-зона" : ""}</p></section>
    <section data-testid="counterparty-contact"><h3>Контакт для сотрудничества</h3><p class="small">Демо-канал: согласование через RemCard. Реальные контакты не показываются в макете.</p></section>
    <section data-testid="counterparty-cooperation-heading"><h3>Ваше сотрудничество</h3><p class="small muted">Категории, пауза и изменение условий — ниже.</p></section>
  </div>`;
}

function listActionHtml(partner, { readOnly = false } = {}) {
  if (!partner?.ready) return "";
  const state = ensure(partner.id);
  const paused = state.cooperation === "paused";
  const pending = state.pending?.status === "pending";
  if (!canWrite() || readOnly) {
    return `<span class="coop-readonly-hint" title="Условия меняет уполномоченный сотрудник">Условия меняет уполномоченный сотрудник</span>`;
  }
  const label = pending ? "Смотреть предложение" : "Изменить условия";
  const action = pending ? `coop-view-terms:${partner.id}` : `coop-change-terms:${partner.id}`;
  const disabled = paused && !pending ? "disabled" : "";
  const title = paused && !pending ? "Сначала возобновите сотрудничество" : label;
  return `<button type="button" class="btn ghost coop-list-btn" data-action="${action}" data-testid="coop-change-${escapeHtml(partner.id)}" ${disabled} title="${escapeHtml(title)}">${escapeHtml(label)}</button>`;
}

function cardBlockHtml(partner) {
  if (!partner?.ready) return "";
  const state = ensure(partner.id);
  const write = canWrite();
  const paused = state.cooperation === "paused";
  const pending = state.pending?.status === "pending";
  const side = getDemoSide(partner.id);
  const cats = partnerCategories(partner);

  let actions = "";
  if (!write) {
    actions = `<p class="small">Условия меняет уполномоченный сотрудник</p>`;
  } else if (paused) {
    actions = `${api.button("Возобновить сотрудничество", `coop-resume:${partner.id}`, "primary")}
      ${pending ? api.button("Смотреть предложение", `coop-view-terms:${partner.id}`, "ghost") : `<p class="small">Пока сотрудничество на паузе, новое изменение условий недоступно.</p>`}`;
  } else {
    const changeLabel = pending ? "Смотреть предложение" : "Изменить условия";
    const changeAction = pending ? `coop-view-terms:${partner.id}` : `coop-change-terms:${partner.id}`;
    actions = `${api.button(changeLabel, changeAction, pending ? "ghost" : "")}${api.button("Приостановить", `coop-pause:${partner.id}`, "ghost")}`;
  }

  const currentTerms = `<div class="coop-current-terms" data-testid="coop-current-${escapeHtml(partner.id)}">${cats
    .map(
      (c) =>
        `<div class="term-summary"><strong>${escapeHtml(c.name)}</strong><span>Скидка + бонус: <b>${escapeHtml(c.limit)}%</b></span></div>`,
    )
    .join("")}</div>`;

  const pendingBlock =
    pending && state.pending
      ? `<div class="coop-pending" data-testid="coop-pending-${escapeHtml(partner.id)}">
          <strong>Изменения на согласовании</strong>
          ${comparisonHtml(state.pending.rows)}
          <p class="small">Действуют прежние условия.</p>
          ${
            paused
              ? `<p class="notice">Сначала возобновите сотрудничество</p>`
              : side === "counterparty" && write
                ? `<div class="row coop-respond">${api.button("Согласовать", `coop-accept:${partner.id}`, "primary")}${api.button("Отклонить", `coop-reject:${partner.id}`, "ghost")}<p class="small">Демо-ответ второй стороны. Владелец запроса не может принять его сам.</p></div>`
                : `<p class="small">Ожидаем ответ партнёра. Вы не можете согласовать собственное предложение.</p>`
          }
        </div>`
      : "";

  const demoSwitch =
    pending && write && !paused
      ? `<div class="coop-demo-side" role="group" aria-label="Демонстрация ответа второй стороны">
          <span class="eyebrow">Демо-переключатель</span>
          <div class="segment">
            <button type="button" data-action="coop-side-owner:${partner.id}" aria-pressed="${side === "owner"}">Мой кабинет</button>
            <button type="button" data-action="coop-side-counter:${partner.id}" aria-pressed="${side === "counterparty"}">Ответ партнёра · демо</button>
          </div>
        </div>`
      : "";

  return `<section class="coop-block" data-testid="coop-block-${escapeHtml(partner.id)}">
    <div class="coop-block-head">
      <h3>Сотрудничество</h3>
      <span class="${statusPillClass(state)}" data-testid="coop-status-${escapeHtml(partner.id)}">${escapeHtml(statusLabel(state))}</span>
    </div>
    ${demoBanner()}
    ${currentTerms}
    ${pendingBlock}
    ${demoSwitch}
    <div class="coop-actions row">${actions}</div>
    ${historyHtml(state)}
  </section>`;
}

function openTermChange(partner, { viewOnly = false } = {}) {
  discardConfirmVisible = false;
  draftSnapshot = null;
  const state = ensure(partner.id);
  const cats = partnerCategories(partner);
  const pending = state.pending?.status === "pending" ? state.pending : null;
  const paused = state.cooperation === "paused";
  const readOnly = viewOnly || !!pending || paused || !canWrite();
  if (!readOnly) bindAction(partner.id, "submit");

  const rowsHtml = cats
    .map((c) => {
      const proposed = pending
        ? pending.rows.find((r) => r.id === c.id || r.name === c.name)?.to ?? c.limit
        : c.limit;
      return `<tr>
        <th scope="row">${escapeHtml(c.name)}</th>
        <td>${escapeHtml(c.limit)}%</td>
        <td>${
          readOnly
            ? `${escapeHtml(proposed)}%`
            : `<input class="coop-percent-input" type="text" inputmode="decimal" data-coop-cat="${escapeHtml(c.id)}" data-coop-from="${escapeHtml(c.limit)}" value="${escapeHtml(proposed)}" aria-label="Предлагаете % для ${escapeHtml(c.name)}" />`
        }</td>
      </tr>`;
    })
    .join("");

  const body = `<div class="coop-term-modal" data-coop-partner="${escapeHtml(partner.id)}" data-coop-mode="${readOnly ? "view" : "edit"}">
    ${demoBanner()}
    <p class="muted">Партнёр: <strong>${escapeHtml(partner.name)}</strong></p>
    <p class="notice">Новые условия начнут действовать только после согласия партнёра. Пока действуют прежние.</p>
    ${paused && pending ? `<p class="notice">Сначала возобновите сотрудничество</p>` : ""}
    ${pending ? `<p class="small"><strong>Статус:</strong> ${escapeHtml(STATUS.pending)}</p>${comparisonHtml(pending.rows)}` : ""}
    <div class="table-wrap coop-term-table-wrap"><table class="coop-term-table"><thead><tr><th>Категория</th><th>Сейчас, %</th><th>Предлагаете, %</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
    <p class="small">Общий процент «скидка клиенту + бонус», а не обещание дохода. Редактируются только уже согласованные категории.</p>
    <div id="coop-term-live-compare" class="coop-live-compare" aria-live="polite"></div>
    <p class="field-error" id="coop-term-error" role="alert" data-coop-error-active="0"></p>
    <div id="coop-discard-slot"></div>
    <div class="row form-footer" id="coop-term-footer">
      ${api.button("Отмена", "close-dialog", "ghost")}
      ${
        readOnly
          ? ""
          : `<button type="button" class="btn primary" data-action="coop-submit-terms:${escapeHtml(partner.id)}" data-testid="coop-submit-terms">Отправить на согласование</button>`
      }
    </div>
  </div>`;

  api.modal("Предложить изменение условий", body);
  focusDialogContent();
  if (!readOnly) updateLiveCompare(partner.id);
}

function collectDraft(partnerId, { requireTouched = false } = {}) {
  const root = document.querySelector(`.coop-term-modal[data-coop-partner="${partnerId}"]`);
  if (!root) return { rows: [], error: "Форма не найдена" };
  const cats = partnerCategories(api.getPartner(partnerId));
  const rows = [];
  let error = "";
  for (const c of cats) {
    const input = root.querySelector(`[data-coop-cat="${CSS.escape(c.id)}"]`);
    const raw = input ? input.value : String(c.limit);
    const parsed = parsePercent(raw);
    if (!parsed.ok) {
      error = `${c.name}: ${parsed.reason}`;
      input?.classList.add("is-invalid");
      break;
    }
    input?.classList.remove("is-invalid");
    rows.push({ id: c.id, name: c.name, from: Number(c.limit), to: parsed.value });
  }
  if (!error && rows.every((r) => r.from === r.to)) {
    error = "Нет изменений относительно действующих условий";
  }
  return { rows, error };
}

function clearTermErrorIfStale(partnerId) {
  const err = document.getElementById("coop-term-error");
  if (!err || err.getAttribute("data-coop-error-active") !== "1") return;
  const { error } = collectDraft(partnerId);
  if (!error) {
    err.textContent = "";
    err.setAttribute("data-coop-error-active", "0");
  } else if (error !== err.textContent) {
    // Value changed: drop outdated message until next submit
    err.textContent = "";
    err.setAttribute("data-coop-error-active", "0");
  }
}

function updateLiveCompare(partnerId) {
  const live = document.getElementById("coop-term-live-compare");
  if (!live) return;
  const root = document.querySelector(`.coop-term-modal[data-coop-partner="${partnerId}"]`);
  if (!root) return;
  const cats = partnerCategories(api.getPartner(partnerId));
  const changed = [];
  for (const c of cats) {
    const input = root.querySelector(`[data-coop-cat="${CSS.escape(c.id)}"]`);
    if (!input) continue;
    const parsed = parsePercent(input.value);
    if (parsed.ok && parsed.value !== Number(c.limit)) {
      changed.push({ id: c.id, name: c.name, from: Number(c.limit), to: parsed.value });
    }
  }
  live.innerHTML = changed.length
    ? `<p class="small"><strong>Изменится:</strong></p>${comparisonHtml(changed)}`
    : `<p class="small muted">Пока нет отличий от действующих условий.</p>`;
}

function setTermError(message) {
  const err = document.getElementById("coop-term-error");
  if (err) {
    err.textContent = message;
    err.setAttribute("data-coop-error-active", message ? "1" : "0");
  }
}

function submitTerms(partnerId) {
  const guard = guardMutation(partnerId, "submit");
  if (!guard.ok) {
    setTermError(guard.message);
    return;
  }
  if (!canWrite()) {
    setTermError("Условия меняет уполномоченный сотрудник");
    return;
  }
  const state = ensure(partnerId);
  if (state.cooperation === "paused") {
    setTermError("Сначала возобновите сотрудничество");
    return;
  }
  if (state.pending?.status === "pending") {
    setTermError("Предложение уже ожидает ответа");
    return;
  }
  const { rows, error } = collectDraft(partnerId);
  if (error) {
    setTermError(error);
    return;
  }
  state.pending = { rows, status: "pending" };
  setDemoSide(partnerId, "owner");
  boundAction = null;
  discardConfirmVisible = false;
  closeAndRestore(partnerId, "Предложение отправлено на согласование · демо");
}

function openPauseConfirm(partner) {
  discardConfirmVisible = false;
  bindAction(partner.id, "pause");
  api.modal(
    `Приостановить сотрудничество с ${partner.name}?`,
    `<div class="stack" data-coop-pause="${escapeHtml(partner.id)}">
      ${demoBanner()}
      <p>Сотрудничество временно остановится. Ранее созданные сертификаты, покупки, взаиморасчёты и история сохранятся. Возобновить можно из этой карточки.</p>
      <p class="small">Пауза не удаляет партнёра и не архивирует запись. Юридическая сила старых сертификатов в макете не пересчитывается.</p>
      <div class="row">${api.button("Отмена", `coop-nested-cancel:${partner.id}`, "ghost")}<button type="button" class="btn primary" data-action="coop-pause-confirm:${escapeHtml(partner.id)}" data-testid="coop-pause-confirm" data-coop-autofocus>Приостановить</button></div>
    </div>`,
  );
  focusDialogContent();
}

function openResumeConfirm(partner) {
  discardConfirmVisible = false;
  bindAction(partner.id, "resume");
  const cats = partnerCategories(partner);
  const terms = cats
    .map(
      (c) =>
        `<div class="term-summary"><strong>${escapeHtml(c.name)}</strong><span><b>${escapeHtml(c.limit)}%</b></span></div>`,
    )
    .join("");
  api.modal(
    "Возобновить сотрудничество?",
    `<div class="stack" data-coop-resume="${escapeHtml(partner.id)}">
      ${demoBanner()}
      <p>Вернём статус «Действует» и доступность для новых действий по действующим согласованным условиям.</p>
      <div class="offer-summary">${terms}</div>
      <p class="small">Возобновление не принимает ожидающее изменение условий автоматически.</p>
      <div class="row">${api.button("Отмена", `coop-nested-cancel:${partner.id}`, "ghost")}<button type="button" class="btn primary" data-action="coop-resume-confirm:${escapeHtml(partner.id)}" data-testid="coop-resume-confirm" data-coop-autofocus>Возобновить сотрудничество</button></div>
    </div>`,
  );
  focusDialogContent();
}

function confirmPause(partnerId) {
  const guard = guardMutation(partnerId, "pause");
  if (!guard.ok) {
    api.notice?.(guard.message);
    return;
  }
  if (!canWrite()) {
    api.notice?.("Условия меняет уполномоченный сотрудник. Действие не выполнено.");
    return;
  }
  const state = ensure(partnerId);
  state.cooperation = "paused";
  api.onPaused?.(partnerId);
  boundAction = null;
  closeAndRestore(partnerId, "Сотрудничество приостановлено · демо");
}

function confirmResume(partnerId) {
  const guard = guardMutation(partnerId, "resume");
  if (!guard.ok) {
    api.notice?.(guard.message);
    return;
  }
  if (!canWrite()) {
    api.notice?.("Условия меняет уполномоченный сотрудник. Действие не выполнено.");
    return;
  }
  const state = ensure(partnerId);
  state.cooperation = "active";
  boundAction = null;
  closeAndRestore(partnerId, "Сотрудничество возобновлено · демо");
}

function respond(partnerId, result) {
  // Binding was set when counterparty response UI opened — do not refresh it here
  const guard = guardMutation(partnerId, "respond");
  if (!guard.ok) {
    api.notice?.(guard.message);
    boundAction = null;
    return;
  }
  if (!canWrite()) {
    api.notice?.("Условия меняет уполномоченный сотрудник. Действие не выполнено.");
    boundAction = null;
    return;
  }
  const state = ensure(partnerId);
  const side = getDemoSide(partnerId);
  if (side !== "counterparty") {
    api.notice?.("Владелец запроса не может принять собственное предложение");
    boundAction = null;
    return;
  }
  if (state.cooperation === "paused") {
    api.notice?.("Сначала возобновите сотрудничество");
    boundAction = null;
    return;
  }
  if (!state.pending || state.pending.status !== "pending") {
    boundAction = null;
    return;
  }
  const rows = state.pending.rows;
  if (result === "accepted") {
    applyLimitsLocal(partnerId, rows);
  }
  state.history.unshift({
    at: new Date().toLocaleString("ru-RU"),
    rows,
    result,
  });
  state.pending = null;
  setDemoSide(partnerId, "owner");
  boundAction = null;
  closeAndRestore(
    partnerId,
    result === "accepted"
      ? "Условия обновлены для будущих действий · демо"
      : "Предложение отклонено, действуют прежние условия · демо",
  );
}

function closeAndRestore(partnerId, notice) {
  discardConfirmVisible = false;
  draftSnapshot = null;
  pendingCloseRescue = false;
  allowNativeClose = true;
  try {
    api.clearReturnFocus?.();
    api.close();
  } finally {
    allowNativeClose = false;
  }
  api.refresh();
  if (notice) api.notice?.(notice);
  restoreFocusAfterRefresh(partnerId);
}

function reopenPartnerCard(partnerId) {
  const partner = api.getPartner(partnerId);
  if (partner) {
    api.openPartner?.(partner);
    restoreFocusAfterRefresh(partnerId);
  } else {
    api.close();
    restoreFocusAfterRefresh(partnerId);
  }
}

function filterCertPartners(list) {
  return (list || []).filter((p) => ensure(p.id).cooperation === "active");
}

function decoratePartnerStatus(partner, baseStatus) {
  if (!partner?.ready) return baseStatus;
  const state = ensure(partner.id);
  if (state.cooperation === "paused") return STATUS.paused;
  if (state.pending?.status === "pending") return STATUS.pending;
  return baseStatus;
}

function snapshotDraftInputs(partnerId) {
  const root = document.querySelector(`.coop-term-modal[data-coop-partner="${partnerId}"]`);
  if (!root) return null;
  return [...root.querySelectorAll(".coop-percent-input")].map((el) => ({
    cat: el.getAttribute("data-coop-cat"),
    value: el.value,
  }));
}

function restoreDraftInputs(partnerId, snapshot) {
  if (!snapshot) return;
  const root = document.querySelector(`.coop-term-modal[data-coop-partner="${partnerId}"]`);
  if (!root) return;
  for (const row of snapshot) {
    const input = root.querySelector(`[data-coop-cat="${CSS.escape(row.cat)}"]`);
    if (input) input.value = row.value;
  }
  updateLiveCompare(partnerId);
}

function freezeDraftInputs(partnerId, frozen) {
  const root = document.querySelector(`.coop-term-modal[data-coop-partner="${partnerId}"]`);
  if (!root) return;
  root.toggleAttribute("data-coop-discarding", !!frozen);
  for (const el of root.querySelectorAll(".coop-percent-input")) {
    el.readOnly = !!frozen;
    if (frozen) el.setAttribute("data-coop-frozen", "1");
    else el.removeAttribute("data-coop-frozen");
  }
}

function showDiscardConfirm(partnerId) {
  const slot = document.getElementById("coop-discard-slot");
  const footer = document.getElementById("coop-term-footer");
  if (!slot) return false;
  draftSnapshot = snapshotDraftInputs(partnerId);
  discardConfirmVisible = true;
  freezeDraftInputs(partnerId, true);
  if (footer) {
    footer.hidden = true;
    footer.setAttribute("inert", "");
    footer.setAttribute("aria-hidden", "true");
  }
  slot.innerHTML = `<div class="coop-discard-confirm notice" role="alertdialog" aria-labelledby="coop-discard-title" data-testid="coop-discard-confirm">
    <p id="coop-discard-title"><strong>Закрыть без отправки?</strong></p>
    <p class="small">Черновик изменения условий будет потерян.</p>
    <div class="row">
      <button type="button" class="btn primary" data-action="coop-discard-keep:${escapeHtml(partnerId)}" data-testid="coop-discard-keep" data-coop-autofocus>Продолжить редактирование</button>
      <button type="button" class="btn ghost" data-action="coop-discard-close:${escapeHtml(partnerId)}" data-testid="coop-discard-close">Закрыть без отправки</button>
    </div>
  </div>`;
  focusDialogContent();
  return true;
}

function hideDiscardConfirm(partnerId) {
  const slot = document.getElementById("coop-discard-slot");
  const footer = document.getElementById("coop-term-footer");
  if (slot) slot.innerHTML = "";
  if (footer) {
    footer.hidden = false;
    footer.removeAttribute("inert");
    footer.removeAttribute("aria-hidden");
  }
  discardConfirmVisible = false;
  freezeDraftInputs(partnerId, false);
  restoreDraftInputs(partnerId, draftSnapshot);
  draftSnapshot = null;
  focusDialogContent();
}

function closeNativeAllowed(partnerId) {
  allowNativeClose = true;
  pendingCloseRescue = false;
  try {
    api.clearReturnFocus?.();
    api.close();
  } finally {
    allowNativeClose = false;
  }
  if (partnerId) restoreFocusAfterRefresh(partnerId);
}

/** In-page close request — replaces system confirm dialogs. Returns true if close proceeded. */
export function requestClose() {
  const dialog = api.getDialog?.() || document.querySelector("#role-dialog");
  const modal = document.querySelector(".coop-term-modal");
  const partnerId = modal?.getAttribute("data-coop-partner");
  // DOM confirm is authoritative if the module flag ever desyncs
  if (discardConfirmVisible || dialog?.querySelector?.(".coop-discard-confirm")) {
    if (!discardConfirmVisible && partnerId) {
      discardConfirmVisible = true;
    }
    focusDialogContent();
    return false;
  }
  if (!cooperationHasUnsavedDraft()) {
    closeNativeAllowed(partnerId);
    return true;
  }
  if (!partnerId) {
    closeNativeAllowed(null);
    return true;
  }
  showDiscardConfirm(partnerId);
  return false;
}

function handleClick(event) {
  const target = event.target.closest?.("[data-action]");
  if (!target) return false;
  const action = target.getAttribute("data-action") || "";
  const [kind, id] = action.split(":");
  if (!kind?.startsWith("coop-") && kind !== "close-dialog") return false;

  // Remember only opening triggers — never submit/accept/side/discard (focus restore)
  if (
    kind &&
    ["coop-change-terms", "coop-view-terms", "coop-pause", "coop-resume"].includes(kind)
  ) {
    captureTrigger(target);
  }

  const partner = id ? api.getPartner(id) : null;

  if (kind === "coop-copy-id" && id) {
    const code = document.querySelector(`[data-testid="counterparty-public-id"]`)?.textContent?.trim() || `RC-${id}`;
    void navigator.clipboard.writeText(code).then(
      () => api.notice?.("ID скопирован · демо"),
      () => api.notice?.("Скопируйте ID вручную из карточки"),
    );
    return true;
  }

  if (kind === "coop-change-terms" && partner) {
    if (!canWrite()) return true;
    if (ensure(partner.id).cooperation === "paused") {
      api.notice?.("Сначала возобновите сотрудничество");
      return true;
    }
    openTermChange(partner, { viewOnly: false });
    return true;
  }
  if (kind === "coop-view-terms" && partner) {
    openTermChange(partner, { viewOnly: true });
    return true;
  }
  if (kind === "coop-submit-terms" && id) {
    submitTerms(id);
    return true;
  }
  if (kind === "coop-pause" && partner) {
    if (!canWrite()) return true;
    openPauseConfirm(partner);
    return true;
  }
  if (kind === "coop-pause-confirm" && id) {
    confirmPause(id);
    return true;
  }
  if (kind === "coop-resume" && partner) {
    if (!canWrite()) return true;
    openResumeConfirm(partner);
    return true;
  }
  if (kind === "coop-resume-confirm" && id) {
    confirmResume(id);
    return true;
  }
  if (kind === "coop-accept" && id) {
    respond(id, "accepted");
    return true;
  }
  if (kind === "coop-reject" && id) {
    respond(id, "rejected");
    return true;
  }
  if (kind === "coop-side-owner" && id) {
    setDemoSide(id, "owner");
    if (boundAction?.kind === "respond" && boundAction.partnerId === id) {
      boundAction = null;
    }
    const p = api.getPartner(id);
    if (p) {
      api.openPartner?.(p);
      focusDialogContent();
    } else api.refresh();
    return true;
  }
  if (kind === "coop-side-counter" && id) {
    setDemoSide(id, "counterparty");
    // Bind respond to the context at the moment response UI opens
    bindAction(id, "respond");
    const p = api.getPartner(id);
    if (p) {
      api.openPartner?.(p);
      focusDialogContent();
    } else api.refresh();
    return true;
  }
  if (kind === "coop-nested-cancel" && id) {
    // Return to partner card instead of leaving focus on BODY
    reopenPartnerCard(id);
    return true;
  }
  if (kind === "coop-discard-keep" && id) {
    hideDiscardConfirm(id);
    return true;
  }
  if (kind === "coop-discard-close" && id) {
    discardConfirmVisible = false;
    draftSnapshot = null;
    freezeDraftInputs(id, false);
    closeNativeAllowed(id);
    return true;
  }
  return false;
}

function handleInput(event) {
  const input = event.target.closest?.(".coop-percent-input");
  if (!input) return false;
  const modal = input.closest(".coop-term-modal");
  const partnerId = modal?.getAttribute("data-coop-partner");
  if (partnerId) {
    clearTermErrorIfStale(partnerId);
    updateLiveCompare(partnerId);
  }
  return true;
}

function handleSubmit() {
  return false;
}

export function cooperationHasUnsavedDraft() {
  const dialog = api?.getDialog?.() || document.querySelector("#role-dialog");
  if (discardConfirmVisible || dialog?.querySelector?.(".coop-discard-confirm")) {
    return true;
  }
  const modal = document.querySelector('.coop-term-modal[data-coop-mode="edit"]');
  if (!modal) return false;
  return [...modal.querySelectorAll(".coop-percent-input")].some((el) => {
    const from = Number(el.getAttribute("data-coop-from"));
    const parsed = parsePercent(el.value);
    if (!parsed.ok) return el.value.trim() !== String(from);
    return parsed.value !== from;
  });
}
