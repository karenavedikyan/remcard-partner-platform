// Read-only fictional reconciliation from a typed obligation/payment journal.
import { DEMO_DATE, formatDate, formatTime } from "./settlement-analysis.js";
import { legalGroups, legalCaption, renderLegalParties } from "./partner-legal.js";
const cents = (v) => Math.round(v * 100);
const eventDay = (at) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
const supported = new Set(["obligation", "payment", "cancel"]);
const sign = (event) => event.type === "obligation" ? 1 : -1;
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const reconciliationDefaults = () => ({ from: "2026-10-01", to: DEMO_DATE });
export function journal(records) {
  return records.flatMap((r) => r.history.filter((h) => supported.has(h.type) && Number.isFinite(Date.parse(h.at)) && h.amount >= 0).map((h) => ({
    ...h, day: eventDay(h.at), recordId: r.id, direction: r.direction,
    orderId: r.orderId, certificateId: r.certificateId, partnerId: r.partnerId,
    client: r.client, creator: r.creator,
  }))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
const emptyDirection = () => ({ opening: 0, obligations: 0, payments: 0, cancellations: 0, closing: 0 });
export function reconcile(records, filter) {
  const invalid = !validDate(filter.from) || !validDate(filter.to) || filter.from > filter.to;
  const result = { invalid, in: emptyDirection(), out: emptyDirection(), events: [] };
  if (invalid) return result;
  for (const event of journal(records)) {
    if (event.day > filter.to) continue;
    const d = result[event.direction], amount = cents(event.amount);
    if (event.day < filter.from) d.opening += sign(event) * amount;
    else {
      const field = event.type === "obligation" ? "obligations" : event.type === "payment" ? "payments" : "cancellations";
      d[field] += amount;
      result.events.push(event);
    }
  }
  for (const direction of ["in", "out"]) {
    const d = result[direction];
    d.closing = d.opening + d.obligations - d.payments - d.cancellations;
  }
  return result;
}
function groupedEvents(events) {
  const rows = [];
  for (const event of events) {
    const group = event.type === "payment" && event.paymentId && rows.find((r) => r.type === "payment" && r.paymentId === event.paymentId && r.direction === event.direction);
    if (group) {
      group.amount = (cents(group.amount) + cents(event.amount)) / 100;
      group.items.push(event);
    } else rows.push({ ...event, items: [event] });
  }
  return rows;
}
export function renderReconciliation(s, { money, esc, button, orderSummary, paginate }) {
  const records = s.records.filter((r) => r.partnerId === s.partner && (!s.incomingOnly || r.direction === "in"));
  const f = s.reconciliation, result = reconcile(records, f);
  const directions = s.incomingOnly ? [["in", "Партнёр должен вам"]] : [["in", "Партнёр должен вам"], ["out", "Вы должны партнёру"]];
  const events = groupedEvents(result.events);
  const page = paginate ? paginate(events) : {items:events,controls:""};
  return `<section class="settlement-reconciliation" data-testid="settlement-reconciliation"><h3>Сверка с партнёром ${esc(s.partnerName)}</h3><p class="pw-muted">${s.incomingOnly ? "Только ваши расчёты к получению." : "Оба направления отдельно."} По всем расчётам этого партнёра, независимо от поиска и фильтров вкладки «Обязательства». Это сводка, а не подписанный акт сверки.</p>
    <div class="settlement-filter-grid"><label class="pw-field"><span>Начало периода</span><input type="date" required data-reconciliation-filter="from" data-testid="reconciliation-from" value="${esc(f.from)}"></label><label class="pw-field"><span>Конец периода включительно</span><input type="date" required data-reconciliation-filter="to" data-testid="reconciliation-to" value="${esc(f.to)}"></label></div>
    ${button("Весь учебный период", "reconciliation-reset")}
    <details class="ledger-document-legal" data-testid="reconciliation-legal-parties"><summary>Стороны сверки · ${legalGroups(records).length}</summary>${legalGroups(records).map(g=>`${renderLegalParties(g,esc)}<small>Заказов: ${g.records.length}</small>`).join("")}<p class="pw-footnote">Юридические стороны взяты из снимков заказов, не из текущего профиля. Незаполненная сторона отмечена явно.</p></details>
    ${result.invalid ? '<p role="alert" class="settlement-error" data-testid="reconciliation-error">Укажите обе даты. Начало периода не должно быть позже окончания.</p>' : `<p class="pw-footnote">Период: ${formatDate(f.from)} — ${formatDate(f.to)}. Отбор по датам событий: обязательств, фактически подтверждённых выплат и отмен. Все даты в МСК; учебный снимок на 14.10.2026.</p>
    <div class="settlement-reconciliation-totals ${s.incomingOnly ? "incoming-only" : ""}">${directions.map(([direction, label]) => {
      const d = result[direction];
      return `<article class="settlement-reconciliation-total" data-testid="reconciliation-${direction}"><h4>${label}</h4><dl><div><dt>Долг на начало периода</dt><dd data-testid="reconciliation-${direction}-opening">${money(d.opening / 100)}</dd></div><div><dt>Новые обязательства</dt><dd>${money(d.obligations / 100)}</dd></div><div><dt>Подтверждённые выплаты</dt><dd data-testid="reconciliation-${direction}-payments">${money(d.payments / 100)}</dd></div><div><dt>Отменено / возвраты до выплаты</dt><dd>${money(d.cancellations / 100)}</dd></div><div class="settlement-reconciliation-closing"><dt>Долг на конец периода</dt><dd data-testid="reconciliation-${direction}-closing">${money(d.closing / 100)}</dd></div></dl></article>`;
    }).join("")}</div><p class="pw-footnote">Начальный долг + новые обязательства − подтверждённые выплаты − отменённые обязательства = конечный долг. Скидка клиенту не списывается из долга повторно. Несогласованные обязательства и запросы без подтверждения в расчёт не входят.</p>
    ${legalGroups(records).length>1 ? `<details class="ledger-document-legal" data-testid="reconciliation-by-legal"><summary>Сверка отдельно по юридическим сторонам</summary>${legalGroups(records).map(g=>{
      const v=reconcile(g.records,f);
      return `<section>${renderLegalParties(g,esc)}${directions.map(([d,label])=>`<p>${label}: начало ${money(v[d].opening/100)} + обязательства ${money(v[d].obligations/100)} − выплаты ${money(v[d].payments/100)} − отмены ${money(v[d].cancellations/100)} = <strong>${money(v[d].closing/100)}</strong></p>`).join("")}</section>`;
    }).join("")}</details>` : ""}
    <h4>Операции за период · ${events.length}</h4><div class="settlement-reconciliation-events ledger-data-grid" data-testid="reconciliation-events">${page.items.map((event) => {
      const key = `event-${event.paymentId || `${event.direction}-${event.type}-${event.at}-${event.items[0]?.recordId}`}`;
      return `<article class="settlement-reconciliation-event"><details data-ledger-entry="${esc(key)}" ${(s.expandedEntries || []).includes(key) ? "open" : ""}><summary class="settlement-reconciliation-event-top"><span><span class="pw-label">${event.direction === "in" ? "Мне должны" : "Я должен"}</span><strong>${event.type === "obligation" ? "Возникло обязательство" : event.type === "cancel" ? "Обязательство отменено" : event.items.length > 1 ? "Подтверждена общая выплата" : "Получение подтверждено"}</strong><small>${formatTime(event.at)}${event.method ? ` · ${event.method === "cash" ? "Наличный" : "Безналичный"} расчёт` : ""}</small><small class="ledger-card-extra">${esc(event.items[0]?.orderId || "")}${event.items.length > 1 ? ` и ещё ${event.items.length-1}` : ""}</small></span><strong>${event.type === "obligation" ? "+" : "−"}${money(event.amount)}</strong></summary><div class="settlement-detail">
    ${event.items.map((item) => {
      const record = records.find((r) => r.id === item.recordId);
      return `<div class="settlement-reconciliation-source"><small class="ledger-legal-caption">${esc(legalCaption(record?.partnerLegal))}</small><div class="settlement-references">${button(`Заказ ${esc(item.orderId)}`, `order:${item.recordId}`)}${button(`Сертификат ${esc(item.certificateId)}`, `certificate:${item.recordId}`)}</div>${event.items.length > 1 ? `<p>Доля общей выплаты по этому заказу: <strong>${money(item.amount)}</strong></p>` : ""}${event.type === "obligation" ? orderSummary(record, { money, esc }) : ""}</div>`;
    }).join("")}${event.paymentId ? `<small>${esc(event.paymentId)}</small>` : ""}</div></details></article>`;
    }).join("") || '<div class="settlement-ledger-empty"><h4>За этот период операций нет</h4><p>Начальный и конечный долг могут быть ненулевыми, если обязательства возникли раньше.</p></div>'}</div>${page.controls}`}
    <p class="pw-footnote">Сверка ничего не оплачивает и не подтверждает за партнёра. Данные вымышленные; реального согласования акта и выгрузки пока нет.</p></section>`;
}
