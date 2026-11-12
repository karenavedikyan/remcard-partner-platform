/** Session-only paid purchase visibility for wallet accruals (prototype). Not cleared on role switch. */
const byPurchaseId = new Map();

const RECEIVER_PARTNER_DEFAULT = "DEMO-PARTNER-017";
const REFERRER_VIEWER_DEFAULT = "DEMO-PARTNER-0100";

const esc = (v = "") =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function upsertPaidPurchaseLedger(entry) {
  if (!entry?.purchaseId) return;
  const prev = byPurchaseId.get(entry.purchaseId);
  byPurchaseId.set(entry.purchaseId, { ...prev, ...entry, updatedAt: Date.now() });
}

export function clearClientPurchaseLedger() {
  byPurchaseId.clear();
}

export function resolveWalletViewerPartnerId(config) {
  let role = config.role;
  if (role === "employee" && typeof config.employerRole === "function") {
    const employer = config.employerRole();
    if (employer) role = employer;
  }
  if (role === "agent" || role === "specialist") return REFERRER_VIEWER_DEFAULT;
  return RECEIVER_PARTNER_DEFAULT;
}

export function clientPurchaseLedgerRows(config, direction) {
  const viewerId = resolveWalletViewerPartnerId(config);
  return [...byPurchaseId.values()]
    .filter((e) => {
      if (direction === "out") return e.receivingPartnerId === viewerId;
      if (direction === "in") return e.referralEligible && e.referrerPartnerId === viewerId;
      return false;
    })
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
}

export function clientPurchaseLedgerHistoryKind(entry) {
  if (entry.fulfillmentPhase === "return") return "return";
  if (entry.fulfillmentPhase === "accrual_confirmed" || entry.fulfillmentPhase === "accrual_paid") return "confirmed";
  return "waiting";
}

export function filterClientPurchaseLedgerRows(rows, historyFilter) {
  if (historyFilter === "all") return rows;
  if (historyFilter === "waiting") {
    return rows.filter((r) => ["await_handoff", "accrual_waiting"].includes(r.fulfillmentPhase));
  }
  if (historyFilter === "received") {
    return rows.filter((r) => r.fulfillmentPhase === "accrual_confirmed");
  }
  if (historyFilter === "paid") {
    return rows.filter((r) => r.fulfillmentPhase === "accrual_paid");
  }
  return rows;
}

function formatShortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function breakdownHtml(rows) {
  if (!rows?.length) return "";
  const items = rows
    .map((row) => {
      const accrual =
        row.accrualPhase && row.accrualPhase !== "n/a"
          ? ` · ${esc(row.accrualStateText || row.accrualPhase)}`
          : "";
      return `<li><span>${esc(row.categoryLabel || row.categoryKey)}</span><span>${esc(row.amountLabel || "")}${accrual}</span></li>`;
    })
    .join("");
  return `<ul class="wallet-client-purchase__cats">${items}</ul>`;
}

export function renderClientPurchaseLedgerRow(entry, direction) {
  const kind = clientPurchaseLedgerHistoryKind(entry);
  const title =
    direction === "out"
      ? entry.manualEntry
        ? "Покупка без реферального начисления"
        : entry.clientName
      : entry.clientName;
  const subMain =
    direction === "out"
      ? `№ ${entry.purchaseId}`
      : `${esc(entry.receivingPartnerName)} · № ${entry.purchaseId}`;
  const status = direction === "out" ? entry.receiverStatus : entry.referrerStatus;
  const amountRub =
    direction === "out" && entry.totalRub != null
      ? `<span class="wallet-status-badge wallet-status-badge--teal-outline" aria-hidden="true"><strong class="wallet-status-badge__amount">${esc(entry.totalRub)}</strong><span class="wallet-status-badge__caption">${esc(entry.manualEntry ? "покупка" : "сумма покупки")}</span></span>`
      : `<span class="wallet-client-purchase__terms pw-muted">По согласованным условиям</span>`;
  return `<details class="wallet-accrual-row wallet-accruals-history__row wallet-client-purchase" data-client-purchase-id="${esc(entry.purchaseId)}" data-accrual-row-kind="${esc(kind)}" data-testid="wallet-client-purchase-${esc(entry.purchaseId)}">
    <summary class="wallet-client-purchase__summary">
      <span class="wallet-accrual-row__main">
        <strong class="wallet-accrual-row__title">${esc(title)}</strong>
        <span class="wallet-accrual-row__sub">${subMain}</span>
        <span class="wallet-accrual-row__sub wallet-accrual-row__date">${formatShortDate(entry.paidAt)} · ${esc(status)}</span>
      </span>
      <span class="wallet-client-purchase__summary-end">
        ${amountRub}
        <span class="wallet-client-purchase__affordance"><span class="wallet-client-purchase__chev" aria-hidden="true"></span><span class="wallet-client-purchase__affordance-text--closed">Подробнее</span><span class="wallet-client-purchase__affordance-text--open">Свернуть</span></span>
      </span>
    </summary>
    <div class="wallet-client-purchase__detail">
      <dl class="wallet-client-purchase__facts">
        <div><dt>ID покупки</dt><dd>${esc(entry.purchaseId)}</dd></div>
        ${direction === "out" ? `<div><dt>Сумма покупки</dt><dd>${esc(entry.totalRub || "—")}</dd></div>` : ""}
        ${direction === "in" ? `<div><dt>Принимает</dt><dd>${esc(entry.receivingPartnerName)}</dd></div>` : ""}
        <div><dt>Клиент</dt><dd>${esc(entry.clientName)}</dd></div>
        ${entry.certificateId ? `<div><dt>Сертификат</dt><dd>${esc(entry.certificateId)}</dd></div>` : ""}
        <div><dt>Статус</dt><dd>${esc(status)}</dd></div>
        ${entry.referralEligible && entry.rewardStatusLabel ? `<div><dt>Начисление</dt><dd>${esc(entry.rewardStatusLabel)}${entry.waitDaysLeft != null && entry.waitDaysLeft > 0 ? ` · осталось ${esc(String(entry.waitDaysLeft))} дн.` : ""}</dd></div>` : ""}
        ${direction === "in" ? `<div><dt>Вознаграждение</dt><dd>По согласованным условиям</dd></div>` : ""}
      </dl>
      ${breakdownHtml(entry.categoryRows)}
      <p class="pw-footnote">Демо: оплата из раздела «Клиенты». Сумма покупки не смешивается с учебными начислениями кошелька.</p>
    </div>
  </details>`;
}
