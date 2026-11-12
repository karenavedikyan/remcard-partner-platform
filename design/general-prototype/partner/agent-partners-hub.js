// AgentPartnersHub shell: find/link modal composition over shared PartnersHub demo (no API).

let host = null;
let inviteDirtyGetter = () => false;
let clearInviteDirty = () => {};
let hubTab = "find";
let hubReadyMode = false;

const DISCARD_COPY = {
  title: "Закрыть без сохранения?",
  body: "Черновик приглашения к обсуждению будет потерян.",
  keep: "Продолжить редактирование",
  discard: "Закрыть без сохранения",
};

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function initAgentPartnersHub({ getRole, onAction, inviteDirty, clearInviteDraft }) {
  host = { getRole, onAction };
  if (inviteDirty) inviteDirtyGetter = inviteDirty;
  if (clearInviteDraft) clearInviteDirty = clearInviteDraft;
}

export function partnerInviteDirtyInHub() {
  const dialog = document.getElementById("agent-partners-hub");
  if (!dialog?.open) return false;
  return inviteDirtyGetter();
}

function ensureOverlay() {
  let el = document.getElementById("agent-partners-hub");
  if (el) return el;
  el = document.createElement("dialog");
  el.id = "agent-partners-hub";
  el.className = "agent-partners-hub";
  el.setAttribute("aria-labelledby", "agent-hub-title");
  document.body.appendChild(el);
  if (!el.dataset.bound) {
    el.dataset.bound = "true";
    el.addEventListener("submit", (event) => {
      if (event.submitter?.closest?.("[data-invite-discard]")) return;
      event.preventDefault();
      requestAgentHubClose("close");
    });
    el.addEventListener("cancel", (event) => {
      if (!inviteDirtyGetter()) return;
      event.preventDefault();
      requestAgentHubClose("close");
    });
    el.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !inviteDirtyGetter()) return;
      event.preventDefault();
      event.stopPropagation();
      requestAgentHubClose("close");
    });
    el.addEventListener("click", (event) => {
      const tabBtn = event.target.closest("[data-agent-hub-tab]");
      if (tabBtn) {
        event.preventDefault();
        const next = tabBtn.dataset.agentHubTab;
        if (next === hubTab) return;
        requestAgentHubClose("tab", next);
        return;
      }
      const keep = event.target.closest("[data-invite-discard-keep]");
      if (keep) {
        event.preventDefault();
        hideDiscardConfirm(el);
        return;
      }
      const discard = event.target.closest("[data-invite-discard-close]");
      if (discard) {
        event.preventDefault();
        const pending = el.dataset.pendingExit || "close";
        const nextTab = el.dataset.pendingTab;
        hideDiscardConfirm(el);
        clearInviteDirty();
        if (pending === "tab" && nextTab) {
          hubTab = nextTab;
          host?.onAction(nextTab === "find" ? "partner-hub" : "external-partner");
          return;
        }
        el.close();
        hubReadyMode = false;
      }
    });
  }
  return el;
}

function hideDiscardConfirm(dialog) {
  dialog.querySelector("[data-invite-discard-confirm]")?.remove();
  delete dialog.dataset.pendingExit;
  delete dialog.dataset.pendingTab;
}

function showDiscardConfirm(dialog, pending, nextTab) {
  dialog.dataset.pendingExit = pending;
  if (nextTab) dialog.dataset.pendingTab = nextTab;
  if (dialog.querySelector("[data-invite-discard-confirm]")) return;
  dialog.querySelector(".agent-hub-sheet")?.insertAdjacentHTML(
    "beforeend",
    `<div class="coop-discard-confirm notice" role="alertdialog" data-invite-discard-confirm data-testid="partner-invite-discard-confirm">
      <p><strong>${esc(DISCARD_COPY.title)}</strong></p>
      <p class="small">${esc(DISCARD_COPY.body)}</p>
      <div class="row">
        <button type="button" class="btn primary" data-invite-discard-keep>${esc(DISCARD_COPY.keep)}</button>
        <button type="button" class="btn ghost" data-invite-discard-close>${esc(DISCARD_COPY.discard)}</button>
      </div>
    </div>`,
  );
  dialog.querySelector("[data-invite-discard-keep]")?.focus({ preventScroll: true });
}

export function requestAgentHubClose(pending = "close", nextTab) {
  const dialog = document.getElementById("agent-partners-hub");
  if (!dialog?.open) return;
  if (inviteDirtyGetter()) {
    showDiscardConfirm(dialog, pending, nextTab);
    return;
  }
  if (pending === "tab" && nextTab) {
    hubTab = nextTab;
    host?.onAction(nextTab === "find" ? "partner-hub" : "external-partner");
    return;
  }
  dialog.close();
  hubReadyMode = false;
}

function tabButton(id, label, active) {
  return `<button type="button" class="agent-hub-tab" data-agent-hub-tab="${id}" aria-selected="${active ? "true" : "false"}" ${active ? 'aria-pressed="true"' : ""}>${esc(label)}</button>`;
}

export function openAgentPartnersHub({ tab = "find", title, body, wide = false, readyMode = false }) {
  if (!host || host.getRole() !== "agent") return false;
  const dialog = ensureOverlay();
  hubTab = tab;
  hubReadyMode = readyMode;
  const isFind = tab === "find";
  const modalTitle = readyMode
    ? "Приглашение создано"
    : title || (isFind ? "Найти в RemCard" : "Пригласить по ссылке");
  const tabsNav = readyMode
    ? ""
    : `<nav class="agent-hub-tabs" role="tablist" aria-label="Способы приглашения">
      ${tabButton("find", "Найти в RemCard", isFind)}
      ${tabButton("link", "Пригласить по ссылке", tab === "link")}
    </nav>`;
  dialog.innerHTML = `<form method="dialog" class="agent-hub-sheet${wide ? " is-wide" : ""}${readyMode ? " is-ready" : ""}" data-ready-mode="${readyMode ? "true" : "false"}" data-hub-tab="${readyMode ? "ready" : tab}">
    <header class="agent-hub-header">
      <h2 id="agent-hub-title">${esc(modalTitle)}</h2>
      <button type="submit" class="agent-hub-close" aria-label="Закрыть" data-testid="agent-hub-close">×</button>
    </header>
    ${tabsNav}
    <div class="agent-hub-body" data-testid="agent-hub-body">${body}</div>
  </form>`;
  dialog.showModal();
  dialog.querySelector(".agent-hub-close")?.focus();
  return true;
}

export function closeAgentPartnersHub() {
  const dialog = document.getElementById("agent-partners-hub");
  if (dialog?.open) requestAgentHubClose("close");
}

export function agentPartnersLeadHtml() {
  return "Магазины и компании, которым вы рекомендуете клиентов. Поиск и приглашения — в отдельном окне, как в AgentPartnersHub.";
}
