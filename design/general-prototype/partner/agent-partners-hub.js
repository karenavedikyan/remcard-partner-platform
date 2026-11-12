// AgentPartnersHub shell: find/link modal composition over shared PartnersHub demo (no API).

let host = null;

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function initAgentPartnersHub({ getRole, onAction }) {
  host = { getRole, onAction };
}

function ensureOverlay() {
  let el = document.getElementById("agent-partners-hub");
  if (el) return el;
  el = document.createElement("dialog");
  el.id = "agent-partners-hub";
  el.className = "agent-partners-hub";
  el.setAttribute("aria-labelledby", "agent-hub-title");
  document.body.appendChild(el);
  return el;
}

function tabButton(id, label, active) {
  return `<button type="button" class="agent-hub-tab" data-agent-hub-tab="${id}" aria-selected="${active ? "true" : "false"}" ${active ? 'aria-pressed="true"' : ""}>${esc(label)}</button>`;
}

export function openAgentPartnersHub({ tab = "find", title, body, wide = false }) {
  if (!host || host.getRole() !== "agent") return false;
  const dialog = ensureOverlay();
  const isFind = tab !== "link";
  dialog.innerHTML = `<form method="dialog" class="agent-hub-sheet${wide ? " is-wide" : ""}">
    <header class="agent-hub-header">
      <h2 id="agent-hub-title">${esc(title || (isFind ? "Найти в RemCard" : "Пригласить по ссылке"))}</h2>
      <button type="submit" class="agent-hub-close" aria-label="Закрыть" data-testid="agent-hub-close">×</button>
    </header>
    <nav class="agent-hub-tabs" role="tablist" aria-label="Способы приглашения">
      ${tabButton("find", "Найти в RemCard", isFind)}
      ${tabButton("link", "Пригласить по ссылке", !isFind)}
    </nav>
    <div class="agent-hub-body" data-testid="agent-hub-body">${body}</div>
  </form>`;
  if (!dialog.dataset.bound) {
    dialog.dataset.bound = "true";
    dialog.addEventListener("click", (event) => {
      const tabBtn = event.target.closest("[data-agent-hub-tab]");
      if (!tabBtn) return;
      event.preventDefault();
      const next = tabBtn.dataset.agentHubTab;
      if (next === "find") host.onAction("partner-hub");
      else host.onAction("external-partner");
    });
  }
  dialog.showModal();
  dialog.querySelector(".agent-hub-close")?.focus();
  return true;
}

export function closeAgentPartnersHub() {
  const dialog = document.getElementById("agent-partners-hub");
  if (dialog?.open) dialog.close();
}

export function agentPartnersLeadHtml() {
  return "Магазины и компании, которым вы рекомендуете клиентов. Поиск и приглашения — в отдельном окне, как в AgentPartnersHub.";
}
