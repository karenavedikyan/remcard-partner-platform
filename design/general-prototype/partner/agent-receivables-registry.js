// Synthetic AgentReceivablesHub — mirrors reachable src via WalletAccrualsWorkspace agent-registry subview.
// No API, exports, or payouts.

import { downloadAgentReceivablesExport } from "./agent-receivables-export.js";
import {
  PARTNERS,
  ORDERS,
  filterOrders,
  agentRegistryOverviewTotals,
  syncPartnerDebtFields,
} from "./agent-receivables-registry-data.js";

const states = new Map();
const money = (v) => `${new Intl.NumberFormat("ru-RU").format(v)}\u00a0₽`;
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const btn = (label, action, extra = "", primary = false) =>
  `<button type="button" class="pw-btn${primary ? " primary" : ""}" data-agent-registry-action="${action}" data-testid="agent-registry-${action}" ${extra}>${label}</button>`;

const key = (config) => `${config.role}:${config.employerRole?.() || "self"}`;

function state(config) {
  const id = key(config);
  if (!states.has(id)) {
    states.set(id, {
      screen: "overview",
      partnerId: "",
      orderId: "",
      q: "",
      status: "open",
      sort: "debt-desc",
      from: "",
      to: "",
      page: 1,
      pageSize: 25,
      view: "list",
      filtersOpen: true,
      exportBusy: false,
      exportMessage: "",
    });
  }
  return states.get(id);
}

function overviewTotals() {
  syncPartnerDebtFields();
  return agentRegistryOverviewTotals();
}

function paginate(rows, s) {
  const start = (s.page - 1) * s.pageSize;
  return { total: rows.length, items: rows.slice(start, start + s.pageSize) };
}

function filtersBlock(s) {
  return `<details class="agent-registry-filters" ${s.filtersOpen ? "open" : ""} data-testid="agent-registry-filters">
    <summary>Поиск и фильтры</summary>
    <div class="agent-registry-filter-grid">
      <label class="pw-field">Поиск<input type="search" name="q" value="${esc(s.q)}" placeholder="Заказ, клиент, партнёр" data-testid="ledger-search"></label>
      <label class="pw-field">С<input type="date" name="from" value="${esc(s.from)}" data-testid="ledger-from"></label>
      <label class="pw-field">По<input type="date" name="to" value="${esc(s.to)}" data-testid="ledger-to"></label>
      <label class="pw-field">Статус<select name="status" data-testid="ledger-status">
        <option value="open" ${s.status === "open" ? "selected" : ""}>Открытые</option>
        <option value="pending" ${s.status === "pending" ? "selected" : ""}>Ожидают</option>
        <option value="paid" ${s.status === "paid" ? "selected" : ""}>Завершённые</option>
        <option value="all" ${s.status === "all" ? "selected" : ""}>Все</option>
      </select></label>
      <label class="pw-field">Сортировка<select name="sort" data-testid="ledger-sort">
        <option value="debt-desc" ${s.sort === "debt-desc" ? "selected" : ""}>Сумма по убыванию</option>
        <option value="date-desc" ${s.sort === "date-desc" ? "selected" : ""}>Дата</option>
      </select></label>
    </div>
  </details>`;
}

function viewToggle(s) {
  return `<div class="agent-registry-view" role="radiogroup" aria-label="Вид списка" data-testid="ledger-view">
    ${btn("Список", "view:list", s.view === "list" ? 'aria-pressed="true"' : "", s.view === "list")}
    ${btn("Карточки", "view:cards", s.view === "cards" ? 'aria-pressed="true"' : "")}
  </div>`;
}

function pagination(s, total) {
  const pages = Math.max(1, Math.ceil(total / s.pageSize));
  return `<div class="agent-registry-pagination" data-testid="ledger-pagination">
    <label>На странице<select name="pageSize" data-testid="ledger-page-size">
      ${[10, 25, 50].map((n) => `<option value="${n}" ${s.pageSize === n ? "selected" : ""}>${n}</option>`).join("")}
    </select></label>
  <span>Стр. ${s.page} из ${pages}</span>
  ${btn("Назад", "page:prev", s.page <= 1 ? "disabled" : "")}
  ${btn("Вперёд", "page:next", s.page >= pages ? "disabled" : "")}
  </div>`;
}

function renderOverview(config, s) {
  const t = overviewTotals();
  return `<section class="agent-receivables-registry settlement-demo" data-agent-receivables-registry data-testid="agent-r05-receivables" data-ledger-view="${s.view}">
    ${btn("← К кошельку", "wallet-registry-back", "", true)}
    <p class="pw-muted">Выберите сумму, чтобы увидеть партнёров.</p>
    <div class="agent-registry-overview-grid" data-testid="agent-r05-overview-grid">
      <button type="button" class="agent-registry-tile agent-registry-tile--primary" data-agent-registry-action="screen:partners" data-testid="agent-r05-incoming-tile">
        <span>Мне должны</span>
        <strong>${money(t.confirmed)}</strong>
        <small>Посмотреть партнёров →</small>
      </button>
    </div>
    ${t.pending > 0 ? `<p class="pw-muted" data-testid="agent-reward-pending">Ожидает подтверждения: ${money(t.pending)} — не входит в баланс.</p>` : ""}
    ${t.suspended > 0 ? `<p class="pw-muted" data-testid="agent-reward-suspended">Приостановлено: ${money(t.suspended)} — не входит в баланс.</p>` : ""}
    <details><summary>Справка по кошельку</summary><p class="pw-muted">${t.openCount} открытых · ${t.pendingCount} ожидают согласования.</p></details>
    ${btn(s.exportBusy ? "Готовим Excel…" : "Excel (.xlsx, весь отбор)", "export", s.exportBusy ? "disabled" : "", false)}
    ${s.exportMessage ? `<p class="pw-footnote" role="status">${esc(s.exportMessage)}</p>` : ""}
    <p class="pw-footnote">Демо-реестр агента. Данные не связаны с API.</p>
  </section>`;
}

function renderPartners(config, s) {
  const t = overviewTotals();
  const partnerRows = PARTNERS.map(
    (p) => `<button type="button" class="agent-registry-partner-row" data-agent-registry-action="partner:${p.id}" data-testid="agent-r05-partner-row">
      <span><strong>${esc(p.name)}</strong><small>${esc(p.city)} · ${p.orders} заказ(ов)</small></span>
      <strong>${money(p.debt)}</strong>
    </button>`,
  ).join("");
  return `<section class="agent-receivables-registry settlement-demo" data-agent-receivables-registry data-testid="agent-r05-partners" data-ledger-view="${s.view}">
    ${btn("← К кошельку", "wallet-registry-back", "", true)}
    ${btn("← Все взаиморасчёты", "screen:overview")}
    <header class="agent-registry-focus">
      <span class="pw-label">Мне должны</span>
      <h2>Партнёры</h2>
      <strong data-testid="ledger-totals">${money(t.confirmed)}</strong>
    </header>
    ${viewToggle(s)}
    ${filtersBlock(s)}
    <div class="agent-registry-partners" data-testid="ledger-partners">${partnerRows}</div>
    ${pagination(s, PARTNERS.length)}
  </section>`;
}

function renderOrders(config, s) {
  const partner = PARTNERS.find((p) => p.id === s.partnerId);
  const rows = filterOrders(s);
  const page = paginate(rows, s);
  const list =
    s.view === "cards"
      ? page.items
          .map(
            (o) => `<article class="agent-registry-order-card" data-testid="agent-r05-order-card">
          <button type="button" data-agent-registry-action="order:${o.id}">${esc(o.number)} · ${money(o.total)}</button>
          <p class="pw-muted">${esc(o.client)}</p>
        </article>`,
          )
          .join("")
      : page.items
          .map(
            (o) => `<details class="agent-registry-order-row" data-testid="agent-r05-order-summary">
          <summary><strong>${esc(o.number)}</strong> · ${esc(o.client)} · ${money(o.total)}</summary>
          <div class="cab-actions">${btn("Открыть заказ", `order:${o.id}`, "", true)}</div>
        </details>`,
          )
          .join("");
  return `<section class="agent-receivables-registry settlement-demo" data-agent-receivables-registry data-testid="agent-r05-orders" data-ledger-view="${s.view}">
    ${btn("← К кошельку", "wallet-registry-back", "", true)}
    ${btn("← Партнёры", "screen:partners")}
    <h2>Заказы · ${esc(partner?.name || "Партнёр")}</h2>
    ${viewToggle(s)}
    ${filtersBlock(s)}
    <div class="agent-registry-orders" data-testid="ledger-orders">${list || '<p class="pw-muted">Нет записей в отборе</p>'}</div>
    ${pagination(s, page.total)}
    ${btn(s.exportBusy ? "Готовим Excel…" : "Excel (.xlsx, весь отбор)", "export", s.exportBusy ? "disabled" : "")}
  </section>`;
}

function renderOrderDetail(config, s) {
  const order = ORDERS.find((o) => o.id === s.orderId);
  if (!order) return renderOrders(config, s);
  const partner = PARTNERS.find((p) => p.id === order.partnerId);
  return `<section class="agent-receivables-registry settlement-demo" data-agent-receivables-registry data-testid="agent-r05-order-detail" data-ledger-view="${s.view}">
    ${btn("← К кошельку", "wallet-registry-back", "", true)}
    ${btn("← К заказам", `partner:${order.partnerId}`)}
    <h2 data-testid="agent-r05-order-detail-heading">${esc(order.number)}</h2>
    <strong data-testid="agent-r05-order-detail-sum">${money(order.total)}</strong>
    <p class="pw-muted">${esc(partner?.name)} · ${esc(order.client)}</p>
    <dl class="pw-facts agent-registry-breakdown" data-testid="agent-r05-order-breakdown">
      <div><dt>Ожидает</dt><dd>${money(order.pending)}</dd></div>
      <div><dt>Приостановлено</dt><dd>${money(order.suspended)}</dd></div>
    </dl>
    <table class="agent-registry-lines" data-testid="agent-r05-order-lines-table">
      <thead><tr><th>Позиция</th><th>Сумма</th></tr></thead>
      <tbody>${order.lines.map((l) => `<tr><td>${esc(l.title)}</td><td>${money(l.amount)}</td></tr>`).join("")}</tbody>
    </table>
    <ol class="agent-registry-timeline" data-testid="agent-r05-order-history">
      ${order.history.map((h) => `<li><strong>${esc(h.title)}</strong><small>${esc(h.note)}</small></li>`).join("")}
    </ol>
  </section>`;
}

export function renderAgentReceivablesRegistry(config) {
  const s = state(config);
  if (s.screen === "partners") return renderPartners(config, s);
  if (s.screen === "orders") return renderOrders(config, s);
  if (s.screen === "order") return renderOrderDetail(config, s);
  return renderOverview(config, s);
}

export function hydrateAgentReceivablesRegistry(config, root = document) {
  const section = root.querySelector("[data-agent-receivables-registry]");
  if (!section || section.dataset.hydrated) return;
  section.dataset.hydrated = "true";
  const refresh = () => config.refresh?.();

  section.addEventListener("change", (event) => {
    const s = state(config);
    const el = event.target;
    if (!el.name) return;
    if (el.name === "pageSize") {
      s.pageSize = Number(el.value) || 25;
      s.page = 1;
      refresh();
      return;
    }
    if (["q", "from", "to", "status", "sort"].includes(el.name)) {
      s[el.name] = el.value;
      s.page = 1;
      refresh();
    }
  });

  section.addEventListener("click", (event) => {
    const btnEl = event.target.closest("[data-agent-registry-action]");
    if (!btnEl) return;
    event.preventDefault();
    const action = btnEl.dataset.agentRegistryAction;
    const s = state(config);
    if (action === "wallet-registry-back") {
      config.closeWalletAgentRegistry?.();
      return;
    }
    if (action === "screen:overview") {
      s.screen = "overview";
      s.partnerId = "";
      s.orderId = "";
      refresh();
      return;
    }
    if (action === "screen:partners") {
      s.screen = "partners";
      refresh();
      return;
    }
    if (action.startsWith("partner:")) {
      s.partnerId = action.slice(8);
      s.screen = "orders";
      s.page = 1;
      refresh();
      return;
    }
    if (action.startsWith("order:")) {
      s.orderId = action.slice(6);
      s.screen = "order";
      refresh();
      return;
    }
    if (action.startsWith("view:")) {
      s.view = action.slice(5) === "cards" ? "cards" : "list";
      refresh();
      return;
    }
    if (action === "page:prev" && s.page > 1) {
      s.page -= 1;
      refresh();
      return;
    }
    if (action === "page:next") {
      s.page += 1;
      refresh();
      return;
    }
    if (action === "export") {
      if (s.exportBusy) return;
      s.exportBusy = true;
      s.exportMessage = "";
      refresh();
      downloadAgentReceivablesExport(s)
        .then((count) => {
          s.exportMessage = `Excel готов. Заказов в файле: ${count}, весь текущий отбор. Данные учебные.`;
        })
        .catch((error) => {
          s.exportMessage = error?.message || "Не удалось подготовить Excel. Попробуйте ещё раз.";
        })
        .finally(() => {
          s.exportBusy = false;
          refresh();
        });
    }
  });
}
