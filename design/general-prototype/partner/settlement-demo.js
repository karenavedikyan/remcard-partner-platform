// Isolated fictional settlement simulator. No SMS, APIs, payments or real OTPs.
import { batchCandidates, selectedBatchRecords, createBatchPayment, paymentTargets, allocationList, renderBatchDraft, renderBatchHistory } from "./settlement-batch.js";
import { DEMO_DATE, analysisDefaults, ledgerMetadata, filterLedger, sortLedger, renderLedgerFilters, renderLedgerStats, renderPartnerLedgerList, renderRecordMeta, formatTime } from "./settlement-analysis.js";
import { orderLines, renderOrderSummary, renderOrderBreakdown } from "./settlement-order-detail.js";
import { reconciliationDefaults, renderReconciliation } from "./settlement-reconciliation.js";
import { ledgerViews, renderLedgerView, ledgerPaginator } from "./settlement-layout.js";
import { downloadSettlementExport } from "./settlement-export.js";
import { partnerLegal, selectedLegal, legalCaption, legalBlock, legalKey } from "./partner-legal.js";
import { renderWalletAccruals, hydrateWalletAccruals } from "./wallet-accruals.js";
const states = new Map();
const money = (v) => `${new Intl.NumberFormat("ru-RU").format(v)}\u00a0₽`;
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const examples = [
  { id: "partial", direction: "in", partner: "Дом материалов", title: "Бонус за рекомендацию клиента", purchase: 100000, rate: 5, total: 5000, paid: 2000, status: "partial", code: "ДЕМО-101", date: "10 октября", note: "Начислено 5 000 ₽ за покупку клиента. Получение 2 000 ₽ уже подтверждено вами. Магазин должен вам ещё 3 000 ₽." },
  { id: "outgoing", direction: "out", partner: "Мастер Алексей · демо", title: "Вознаграждение за переданного клиента", purchase: 60000, rate: 5, total: 3000, paid: 0, status: "due", code: "ДЕМО-102", date: "11 октября", note: "Вы должны партнёру 3 000 ₽ за переданного клиента. Выберите способ расчёта, передайте деньги вне RemCard и запросите подтверждение получателя. Только после подтверждения долг уменьшится." },
  { id: "pending", direction: "in", partner: "Свет и дом", title: "Покупка ожидает подтверждения", purchase: 30000, rate: 5, total: 1500, paid: 0, status: "pending", code: "ДЕМО-103", date: "12 октября", note: "Ожидается начисление 1 500 ₽. Пока магазин не подтвердил покупку, это не подтверждённая задолженность." },
  { id: "paid", direction: "in", partner: "Плитка и стиль", title: "Бонус выплачен полностью", purchase: 80000, rate: 5, total: 4000, paid: 4000, status: "paid", code: "ДЕМО-104", date: "9 октября", note: "Магазин выплатил вам 4 000 ₽ безналично. Вы подтвердили получение. Долг закрыт, запись о расчёте сохранена." },
  { id: "cancelled", direction: "in", partner: "Дом материалов", title: "Начисление отменено после возврата", purchase: 20000, rate: 5, total: 1000, paid: 0, status: "cancelled", code: "ДЕМО-105", date: "8 октября", note: "Клиент вернул покупку до выплаты бонуса. Начисление 1 000 ₽ отменено; деньги вам не передавались и долга нет." },
  { id: "materials-out", direction: "out", partner: "Дом материалов", title: "Бонус партнёру за другой заказ", purchase: 50000, rate: 2, total: 1000, paid: 0, status: "due", code: "ДЕМО-106", date: "13 октября", note: "По отдельному заказу вы должны магазину 1 000 ₽. Магазин должен вам 3 000 ₽ по другой покупке. Это два разных обязательства: автоматического взаимозачёта нет." },
  { id: "materials-order2", direction: "out", partner: "Дом материалов", title: "Вознаграждение по заказу кухни", purchase: 50000, rate: 5, total: 2500, paid: 0, status: "due", code: "ДЕМО-107", date: "14 октября", note: "Отдельное вознаграждение партнёру 2 500 ₽ по заказу кухни. Можно погасить одной выплатой вместе с другими долгами этому партнёру." },
  { id: "materials-order3", direction: "out", partner: "Дом материалов", title: "Остаток вознаграждения по заказу отделки", purchase: 40000, rate: 5, total: 2000, paid: 500, status: "partial", code: "ДЕМО-108", date: "14 октября", note: "Начислено партнёру 2 000 ₽, получение 500 ₽ уже подтверждено. Для общей выплаты доступен только остаток 1 500 ₽." },
];
const partnerIds = { partial: "materials", outgoing: "master", pending: "light", paid: "tile", cancelled: "materials", "materials-out": "materials", "materials-order2": "materials", "materials-order3": "materials" };
const partnerNames = { materials: "Дом материалов", master: "Мастер дверей", light: "Студия света", tile: "Керамика Юг" };
const labels = { partial: "Частично выплачено", due: "Вы должны партнёру", pending: "Обязательство не согласовано", awaiting: "Получатель ещё не подтвердил", disputed: "Получатель не подтвердил получение", paid: "Получение подтверждено · долг закрыт", cancelled: "Отменено · возврат покупки" };
const closed = (r) => ["paid", "cancelled"].includes(r.status);
const remaining = (r) => ["pending", "cancelled"].includes(r.status) ? 0 : Math.max(0, r.total - r.paid);
const key = (config) => `${config.role}:${config.employerRole?.() || "self"}`;
const methods = (config) => [
  ...(config.canCash?.() ? [["cash", "Наличный расчёт"]] : []),
  ...(config.canTransfer?.() ? [["transfer", "Безналичный расчёт"]] : []),
];
const methodLabel = (method) => method === "cash" ? "Наличный расчёт" : "Безналичный расчёт";
const button = (label, action, extra = "", primary = false) => `<button type="button" class="pw-btn${primary ? " primary" : ""}" data-settlement-action="${action}" data-testid="settlement-${action}" ${extra}>${label}</button>`;
function state(config) {
  const id = key(config);
  if (!states.has(id)) states.set(id, {
    density: "list", pages: {}, pageSize: 25, expandedEntries: [], screen: "overview", expandedRecords: [], filter: "all", direction: "in", incomingOnly: config.role === "agent", analysis: analysisDefaults(), analysisOpen: false, draft: "", receiver: "", partner: "", partnerName: "", reference: null, message: "", error: "", serial: 0,
    batchDraft: "", batchSelected: [], batchView: "", batchSerial: 0, batches: [], reconciliation: reconciliationDefaults(), expandedOrders: [],
    records: examples.filter((r) => config.role !== "agent" || r.direction === "in").map((r) => ({
      ...r, ...ledgerMetadata(r.id), title: r.id === "paid" ? "Расчёт подтверждён и закрыт" : r.title.replace(/Бонус/g, "Вознаграждение").replace(/бонус/g, "вознаграждение").replace(/Начисление/g, "Обязательство"),
      note: r.note.replace(/бонуса/g, "вознаграждения").replace(/бонус/g, "вознаграждение").replace(/Начислено/g, "Согласовано").replace(/Начисление/g, "Обязательство").replace(/начисление/g, "обязательство"),
      partnerId: partnerIds[r.id], partner: partnerNames[partnerIds[r.id]], orderId: `ЗАК-${r.code}`, certificateId: `А-${r.code}`, payment: null,
      partnerLegal: partnerLegal(partnerIds[r.id],ledgerMetadata(r.id).createdAt), ourLegal:selectedLegal(config.role==="employee" ? config.employerRole?.() : config.role),
      orderCategories: orderLines(r).map((line) => line.category),
      history: [
        { title: r.status === "pending" ? "Ожидается согласование обязательства" : "Возникло обязательство по заказу", type: r.status === "pending" ? "note" : "obligation", at: ledgerMetadata(r.id).createdAt, amount: r.total, date: r.date, note: `${money(r.purchase)} после скидки × ${r.rate}% по учебным условиям партнёрства` },
        ...(r.paid ? [{ title: "Получение денег подтверждено", type: "payment", method: "transfer", at: new Date(Date.parse(ledgerMetadata(r.id).createdAt) + (r.id === "materials-order3" ? 3600000 : 86400000)).toISOString(), amount: r.paid, date: r.date, note: "Безналичный расчёт · учебная запись" }] : []),
        ...(r.status === "cancelled" ? [{ title: "Обязательство отменено до выплаты", type: "cancel", at: new Date(Date.parse(ledgerMetadata(r.id).createdAt) + 86400000).toISOString(), amount: r.total, date: r.date, note: "Возврат покупки · долга нет" }] : []),
      ],
    })),
  });
  return states.get(id);
}
export function openSettlementPartner(config, partnerId, name = "") {
  const s = state(config);
  s.partner = partnerId;
  s.partnerName = partnerNames[partnerId] || name || s.records.find((r) => r.partnerId === partnerId)?.partner || "Партнёр";
  s.filter = "all"; s.receiver = ""; s.draft = ""; s.reference = null; s.error = ""; s.message = "";
  s.batchDraft = ""; s.batchSelected = []; s.batchView = "";
}
export function settlementPartnerSummary(config, partnerId) {
  const records = state(config).records.filter((r) => r.partnerId === partnerId);
  const incoming = records.filter((r) => r.direction === "in").reduce((n, r) => n + remaining(r), 0);
  const outgoing = records.filter((r) => r.direction === "out").reduce((n, r) => n + remaining(r), 0);
  return `<section class="stack"><h3>Взаиморасчёты · демо</h3><div class="term-summary"><strong>Партнёр должен ${config.role === "employee" ? "вашей организации" : "вам"}</strong><b>${money(incoming)}</b></div>${config.role === "agent" ? "" : `<div class="term-summary"><strong>${config.role === "employee" ? "Ваша организация должна" : "Вы должны"} партнёру</strong><b>${money(outgoing)}</b></div>`}<small>${records.length ? config.role === "agent" ? "По вашим заказам и сертификатам. Агент только получает вознаграждение." : "По отдельным заказам и сертификатам. Встречные долги не зачтены." : "Для этого партнёра демопримеров нет. Реальные расчёты пока не подключены."}</small></section>`;
}
export function settlementTotals(config) {
  const records = state(config).records;
  return {
    incoming: records.filter((r) => r.direction === "in").reduce((n, r) => n + remaining(r), 0),
    outgoing: records.filter((r) => r.direction === "out").reduce((n, r) => n + remaining(r), 0),
  };
}
const nextEventTime = (records) => new Date(Math.max(Date.parse(`${DEMO_DATE}T16:30:00+03:00`), ...records.flatMap((r) => r.history.map((h) => Date.parse(h.at) || 0))) + 60000).toISOString();
const addEvent = (r, title, amount, note, metadata = {}) => r.history.push({ title, amount, note, type: "note", date: "Сейчас · демо", at: nextEventTime([r]), ...metadata });
function timeline(r) {
  return `<ol class="settlement-timeline">${r.history.map((h) => `<li><div><strong>${esc(h.title)}</strong><span>${money(h.amount)}</span></div><small>${h.at ? formatTime(h.at) : `${formatTime(r.createdAt)} · ${esc(h.date)}`} · ${esc(h.note)}</small></li>`).join("")}</ol>`;
}
function receiverScreen(s, r) {
  const p = r.payment;
  const reference = p.batch ? p.id : r.code;
  return `<section class="settlement-confirm settlement-receiver" data-testid="settlement-receiver"><span class="pw-label">Учебный экран другой стороны</span><h3>Получатель: ${esc(r.partner)}</h3><p>В рабочем ЛК этот экран видит только получатель. Здесь вы переключились на него, чтобы проверить сценарий.</p><dl class="settlement-breakdown"><div><dt>Кто платит</dt><dd>Вы / ваша организация · демо</dd></div><div><dt>Сумма получения</dt><dd>${money(p.amount)}</dd></div><div><dt>Способ</dt><dd>${methodLabel(p.method)}</dd></div><div><dt>${p.batch ? "Общая выплата" : "Расчёт"}</dt><dd>${reference}</dd></div></dl>${allocationList(p, { money, esc })}<p><strong>Подтвердите только фактически полученные деньги.</strong> При безналичном расчёте сначала проверьте поступление на свой счёт.</p>${p.rejected
    ? '<p role="status">Получение не подтверждено. Код не выдан; задолженность остаётся.</p>'
    : p.issued
      ? `<div class="settlement-demo-code"><span>Учебный код подтверждения этой выплаты</span><strong data-testid="settlement-demo-code">${p.code}</strong><p>Демо SMS на +7 ••• •••-00-42: «Подтвердите получение ${money(p.amount)}, ${methodLabel(p.method).toLowerCase()}, ${p.batch ? `общая выплата ${reference}, заказов: ${p.items.length}` : `расчёт ${reference}`}. Код ${p.code}».</p><small>SMS не отправлено. Этот код работает только внутри учебного примера, не является кодом входа или банковским паролем. Срок: 5 минут; максимум 3 попытки.</small></div>${button("Выдать новый учебный код", `issue:${r.id}`)}`
      : `<div class="cab-actions">${button("Деньги получены: выдать учебный код", `issue:${r.id}`, "", true)}${button("Деньги не получены", `reject:${r.id}`)}</div><p class="pw-footnote">В предлагаемой реализации код отправляется только на подтверждённый телефон получателя и привязан к этой сумме, плательщику, получателю и способу расчёта.</p>`}
    <p class="pw-muted">Получатель сообщает плательщику только код подтверждения этой выплаты. До проверки кода долг не уменьшается.</p>${button("Вернуться к плательщику", "payer")}</section>`;
}
function receivePanel(config, s, r) {
  if (!methods(config).length) return '<p class="pw-muted">Получение подтверждает уполномоченный получатель. Вам доступен только просмотр.</p>';
  if (s.draft !== r.id) return `${button("Отметить получение · демо", `receive:${r.id}`, "", true)}<p class="pw-footnote">Вы — получатель. Подтверждайте только деньги, которые действительно получили; долг партнёра уменьшится на подтверждённую сумму.</p>`;
  return `<form data-settlement-receive-form="${r.id}" class="settlement-confirm"><h3>Подтвердить получение от ${esc(r.partner)}</h3><p>Вы подтверждаете как получатель, а не от имени плательщика. В рабочем ЛК подтверждение должно быть связано с запросом выплаты от партнёра.</p><label class="pw-field"><span>Как получены деньги</span><select name="method" data-testid="settlement-receive-method">${methods(config).map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label><label class="pw-field"><span>Фактически получено, ₽</span><input type="number" name="amount" min="1" max="${remaining(r)}" step="0.01" value="${remaining(r)}" required data-testid="settlement-receive-amount"></label><label class="settlement-check"><input name="confirmed" type="checkbox" required data-testid="settlement-receive-confirmed"><span>В учебном примере я получил эту сумму и подтверждаю её получение в своём кабинете.</span></label><div class="cab-actions"><button type="submit" class="pw-btn primary" data-testid="settlement-receive-submit">Подтвердить получение · демо</button>${button("Отмена", "cancel")}</div><small>Деньги не переводятся. Это альтернативный учебный способ подтверждения самим получателем в кабинете; он не требует сообщать пароль входа.</small></form>`;
}
function referencePanel(s) {
  const r = s.records.find((r) => r.id === s.reference?.id);
  if (!r) return "";
  return `<section class="settlement-confirm" data-testid="settlement-reference"><h3>${s.reference.kind === "order" ? "Заказ" : "Сертификат"} ${s.reference.kind === "order" ? r.orderId : r.certificateId}</h3>${button(s.filter === "reconciliation" ? "Вернуться к сверке" : "Вернуться к расчётам", "reference-back")}<p>Партнёр: ${esc(r.partner)}. Демонстрационная связь, не запись рабочего ЛК.</p>${renderRecordMeta(r, { money, esc })}${renderOrderBreakdown(r, { money, esc })}</section>`;
}
function paymentPanelContent(config, s, r, showBatch = false) {
  const available = methods(config);
  if (!available.length) return '<p class="pw-muted">Только просмотр. Для выплаты нужно право на соответствующий способ расчёта.</p>';
  if (r.payment && !available.some(([id]) => id === r.payment.method)) return '<p class="pw-muted">Для подтверждения этой выплаты нет права на выбранный способ расчёта. Долг не погашен; обратитесь к уполномоченному сотруднику.</p>';
  if (r.payment?.batch && !showBatch) return `<p class="pw-muted">Заказ включён в ${esc(r.payment.id)}. Подтверждение ещё ожидается; долг по заказу не уменьшен.</p>${button("Открыть общую выплату", `batch-open:${r.id}`)}`;
  if (r.payment) {
    const p = r.payment;
    return `<section class="settlement-confirm" data-testid="settlement-awaiting"><h3>Шаг 2: подтверждение ${p.batch ? "общей выплаты" : "получателя"}</h3><p>Вы указали выплату ${money(p.amount)}: ${methodLabel(p.method).toLowerCase()}. Получатель — ${esc(r.partner)}.</p>${allocationList(p, { money, esc })}<p><strong>${p.batch ? "Долги по выбранным заказам пока не погашены" : "Долг пока не погашен"}:</strong> ${money(p.batch ? p.amount : remaining(r))}. Закрытие возможно только после подтверждения получателем и проверки кода.</p>${p.rejected
      ? '<p class="settlement-error" role="alert">Получатель указал, что деньги не получил. Запрос не закрывает долг; сначала выясните причину с партнёром.</p>'
      : `${button("Показать экран получателя · демо", `receiver:${r.id}`)}<form class="settlement-code-form" data-settlement-code-form="${r.id}"><label class="pw-field"><span>Код подтверждения выплаты от получателя</span><input name="code" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" required placeholder="6 цифр · только учебный код" data-testid="settlement-code-input"></label><small>Вводите только учебный код из экрана получателя. Не используйте коды входа, SMS банка или другие настоящие пароли.</small><p role="alert" class="settlement-error" data-testid="settlement-code-error">${esc(s.error)}</p><button type="submit" class="pw-btn primary" data-testid="settlement-confirm-code" ${p.attempts >= 3 ? "disabled" : ""}>Проверить код и погасить ${p.batch ? "выбранные долги" : "долг"} · демо</button></form>`}${button("Отменить запрос подтверждения", `withdraw:${r.id}`)}${p.batch ? button("Вернуться к заказам", "batch-close") : ""}<small>Отмена запроса не отменяет банковский перевод или передачу наличных. В демо никаких денег не переводили.</small></section>`;
  }
  if (s.draft === r.id) {
    return `<form data-settlement-form="${r.id}" class="settlement-confirm"><h3>Шаг 1: способ и сумма выплаты</h3><p>Плательщик — вы${config.role === "employee" ? ", от имени организации" : ""}. Получатель — <strong>${esc(r.partner)}</strong>.</p><label class="pw-field"><span>Способ расчёта</span><select name="method" data-testid="settlement-method">${available.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label><label class="pw-field"><span>Сумма выплаты, ₽</span><input type="number" name="amount" min="1" max="${remaining(r)}" step="0.01" value="${remaining(r)}" required data-testid="settlement-amount-input"></label><p class="pw-muted" data-testid="settlement-method-help">Наличные: сначала передайте деньги получателю лично. Безналично: выполните перевод вне RemCard на согласованные с получателем реквизиты. Эта форма не отправляет деньги.</p><label class="settlement-check"><input type="checkbox" name="confirmed" required data-testid="settlement-confirmed"><span>В демосценарии деньги уже переданы. Я запрашиваю подтверждение получателя, а не создаю платёж.</span></label><div class="cab-actions"><button type="submit" class="pw-btn primary" data-testid="settlement-request">Запросить подтверждение · демо</button>${button("Отмена", "cancel")}</div><small>Пока получатель не подтвердит получение, задолженность сохраняется.</small></form>`;
  }
  return `${button("Выплатить долг · демо", `start:${r.id}`, 'aria-label="Выплатить долг партнёру: выбрать наличный или безналичный расчёт"', true)}<p class="pw-footnote">Способ → передача денег вне RemCard → подтверждение получателя → погашение долга.</p>`;
}
function paymentPanel(config,s,r,showBatch=false) {
  const active=s.draft===r.id || !!r.payment;
  return `${active ? legalBlock(r.partnerLegal,esc,"Получатель выплаты · снимок заказа") : ""}${paymentPanelContent(config,s,r,showBatch)}`;
}
export function renderSettlementDemo(config) {
  const s = state(config);
  if (s.incomingOnly) s.direction = "in";
  const scope = s.records.filter((r) => !s.partner || r.partnerId === s.partner);
  const incoming = scope.filter((r) => r.direction === "in").reduce((n, r) => n + remaining(r), 0);
  const outgoing = scope.filter((r) => r.direction === "out").reduce((n, r) => n + remaining(r), 0);
  const demoFooter = `<details class="settlement-demo-note"><summary>О демонстрации</summary><p class="pw-footnote">Учебные суммы и операции. Реальные переводы, SMS и данные ЛК не подключены.</p><p class="pw-footnote">Награда в ожидании ≠ ожидание подтверждения получателем. Подтверждённый баланс не включает ожидание, приостановление, отмену и выплаченное.</p><div class="cab-actions">${button("Добавить 120 учебных расчётов", "seed-ledger", s.bulkSeeded ? "disabled" : "")}${button("Начать демо заново", "reset")}</div></details>`;
  const presentation = `<div class="ledger-presentation">${renderLedgerView(s)}${button(s.exportBusy ? "Готовим Excel…" : "Excel (.xlsx)", "export", `${s.exportBusy ? "disabled" : ""} title="Скачать весь текущий отбор, включая все страницы"` )}</div>${s.exportMessage ? `<p class="pw-footnote" role="status" data-testid="ledger-export-status">${esc(s.exportMessage)}</p>` : ""}`;
  if (!s.partner && s.screen === "overview") return `<section class="settlement-demo settlement-overview" data-ledger-view="${s.density}" data-settlement-demo data-testid="settlement-demo">
    ${renderWalletAccruals(config, { incomingOnly: s.incomingOnly })}
    ${demoFooter}</section>`;
  const recipientRecord = s.records.find((r) => r.id === s.receiver && r.payment);
  const activeBatch = s.records.find((r) => r.id === s.batchView && r.payment?.batch);
  const paginate = ledgerPaginator(s, `${s.partner || "partners"}:${s.direction}:${s.filter}`, button);
  const batchTools = { money, esc, button, paginate };
  s.batchEligible = filterLedger(scope, s.direction, s.analysis).map((r) => r.id);
  const batchStart = s.partner && methods(config).length && batchCandidates(s).length >= 2
    ? `<div class="settlement-batch-start">${button("Выплатить несколько заказов", "batch-start")}</div>` : "";
  const filtered = sortLedger(filterLedger(scope, s.direction, s.analysis), s.analysis.sort);
  s.batchEligible = filtered.map((r) => r.id);
  const orderPage = s.partner && s.filter === "all" ? paginate(filtered) : { items: [], controls: "" };
  const cards = orderPage.items.map((r) => {
    const amount = r.status === "pending" || closed(r) ? r.total : remaining(r);
    const payment = r.direction === "out" && !closed(r)
      ? paymentPanel(config, s, r)
      : r.direction === "in" && remaining(r) > 0
        ? receivePanel(config, s, r)
      : `<p class="pw-muted">${r.status === "partial" ? "Ожидайте выплату от магазина. Подтверждайте получение только после поступления денег." : r.status === "pending" ? "Ожидается подтверждение покупки магазином." : "Расчёт сохранён в истории с партнёром."}</p>`;
    return `<article class="settlement-compact-record" data-testid="settlement-record-${r.id}">
      <details data-settlement-record="${r.id}" data-testid="settlement-details-${r.id}" ${s.expandedRecords.includes(r.id) || s.draft === r.id ? "open" : ""}>
      <summary><span class="settlement-line-info"><strong>Заказ ${esc(r.orderId)}</strong><span>${esc(r.client)}</span><small class="ledger-legal-caption">${esc(legalCaption(r.partnerLegal))}</small><small>Сертификат ${esc(r.certificateId)}</small><small class="ledger-card-extra">Срок: ${r.dueDate ? r.dueDate.split("-").reverse().join(".") : "не согласован"} · вознаграждение ${money(r.total)}</small></span><span class="settlement-line-value"><strong>${money(amount)}</strong><span class="settlement-status settlement-${r.status}">${r.status === "due" ? "К выплате" : labels[r.status]}</span></span></summary>
      <div class="settlement-detail"><div class="settlement-references">${button("Открыть заказ", `order:${r.id}`)}${button("Открыть сертификат", `certificate:${r.id}`)}</div>
      ${renderOrderSummary(r, batchTools)}
      <details class="settlement-order-composition" data-order-composition="${r.id}" data-testid="order-composition-${r.id}" ${s.expandedOrders.includes(r.id) ? "open" : ""}><summary>Категории, скидки и вознаграждение</summary>${renderOrderBreakdown(r, { ...batchTools, inline: true })}</details>
      ${renderRecordMeta(r, batchTools)}
      <dl class="settlement-breakdown"><div><dt>Вознаграждение по заказу</dt><dd>${money(r.total)}</dd></div><div><dt>Получение подтверждено</dt><dd>${money(r.paid)}</dd></div><div><dt>Остаток долга</dt><dd>${money(remaining(r))}</dd></div></dl>
      ${!closed(r) && remaining(r) > 0 ? payment : ""}
      <details><summary>История этого расчёта</summary>${timeline(r)}<p class="pw-muted">${esc(r.note)}</p></details>
      </div></details></article>`;
  }).join("");
  const visibleBatches = s.batches.filter((p) => p.items.some((item) => filtered.some((r) => r.id === item.id)));
  const historyPage = s.partner && s.filter === "history" ? paginate([...visibleBatches.map((p) => ({ batch: p })), ...filtered.map((record) => ({ record }))]) : { items: [], controls: "" };
  const history = `<section class="settlement-history" data-testid="settlement-history"><div class="ledger-data-grid">${historyPage.items.map(({record:r,batch:p}) => p ? `<article class="settlement-history-card">${renderBatchHistory({ ...s, batches:[p] }, batchTools)}</article>` : `<article class="settlement-history-card"><details data-ledger-entry="history-${r.id}" ${s.expandedEntries.includes(`history-${r.id}`) ? "open" : ""}><summary><span><strong>${esc(r.orderId)}</strong><small>${esc(r.client)} · ${r.history.length} события</small><small>Сертификат ${esc(r.certificateId)}</small></span><strong>${money(remaining(r))}<small>Остаток долга</small></strong></summary><div class="settlement-detail"><div class="settlement-references">${button("Открыть заказ", `order:${r.id}`)}${button("Открыть сертификат", `certificate:${r.id}`)}</div>${renderRecordMeta(r, batchTools)}${timeline(r)}</div></details></article>`).join("") || '<p class="pw-muted">Событий по текущему отбору нет.</p>'}</div>${historyPage.controls}</section>`;
  return `<section class="settlement-demo" data-ledger-view="${s.density}" data-settlement-demo data-testid="settlement-demo">
    <div class="settlement-breadcrumb">${button(s.partner ? "← К партнёрам" : "← Все взаиморасчёты", s.partner ? "partners-back" : "overview")}</div>
    <div class="settlement-focus-header"><div><span class="pw-muted">${s.direction === "in" ? "Мне должны" : "Я должен"}</span><h2>${s.partner ? esc(s.partnerName) : "Партнёры"}</h2></div><strong data-testid="${s.direction === "in" ? "settlement-incoming" : "settlement-outgoing"}">${money(s.direction === "in" ? incoming : outgoing)}</strong></div>
    ${s.partner ? `<details class="ledger-current-legal" data-testid="partner-current-legal"><summary>Текущие реквизиты партнёра</summary>${legalBlock(partnerLegal(s.partner),esc)}<small class="pw-muted">Это данные профиля для новых заказов. Сторона каждого существующего заказа указана в его деталях.</small></details>` : ""}
    ${s.partner ? `<div class="cab-tabs settlement-filters" role="group" aria-label="Представление расчётов">${[["all", "Заказы"], ["history", "История"], ["reconciliation", "Сверка"]].map(([id, label]) => button(label, `filter:${id}`, `aria-pressed="${s.filter === id}"`)).join("")}</div>` : ""}
    ${!s.reference && !recipientRecord && !s.batchDraft && !activeBatch ? presentation : ""}
    ${s.filter === "reconciliation" || s.reference || recipientRecord || activeBatch || s.batchDraft ? "" : `<details class="settlement-search-drawer" ${s.analysisOpen || s.analysis.q || s.analysis.status !== (s.filter === "history" ? "all" : "open") || s.analysis.from || s.analysis.to ? "open" : ""}><summary>Поиск и фильтры</summary>${renderLedgerFilters(s, batchTools)}${s.partner ? `<details class="settlement-analysis-drawer"><summary>Анализ задолженности</summary>${renderLedgerStats(filtered, batchTools)}</details>` : ""}</details>`}
    ${s.message ? `<p role="status" class="pw-muted" data-testid="settlement-message">${esc(s.message)}</p>` : ""}
    ${!s.batchDraft && !activeBatch && !recipientRecord && !s.reference && s.direction === "out" && s.filter === "all" ? batchStart : ""}
    ${s.reference ? referencePanel(s) : recipientRecord ? receiverScreen(s, recipientRecord) : s.batchDraft ? renderBatchDraft(s, methods(config), batchTools) : activeBatch ? paymentPanel(config, s, activeBatch, true) : !s.partner ? renderPartnerLedgerList(filtered, s, batchTools) : s.filter === "reconciliation" ? renderReconciliation(s, { ...batchTools, orderSummary: renderOrderSummary }) : s.filter === "history" ? history : `<div class="settlement-records ledger-data-grid">${cards || `<div class="settlement-ledger-empty"><h3>Расчётов по этому отбору нет</h3><p>Проверьте период и состояние.</p>${button("Сбросить фильтры", "analysis-reset")}</div>`}</div>${orderPage.controls}`}
    ${demoFooter}
    </section>`;
}
export function hydrateSettlementDemo(config) {
  const root = document.querySelector("[data-settlement-demo]");
  if (!root || root.dataset.hydrated) return;
  root.dataset.hydrated = "true";
  hydrateWalletAccruals(config, root);
  const refresh = (target = "") => { config.refresh(); if (target) document.querySelector(target)?.scrollIntoView({ block: "center", behavior: "auto" }); };
  const updateFilter = (e) => {
    const input = e.target.closest("[data-ledger-filter]");
    if (!input || (e.type === "input" && input.type !== "search") || (e.type === "change" && input.type === "search")) return;
    e.stopPropagation();
    const s = state(config), field = input.dataset.ledgerFilter;
    if (!Object.hasOwn(s.analysis, field)) return;
    const pos = input.selectionStart;
    s.analysis[field] = input.value;
    s.exportMessage = "";
    s.pages = {};
    s.analysisOpen = !!root.querySelector("[data-ledger-filters]")?.open;
    s.batchDraft = ""; s.batchSelected = []; s.batchView = ""; s.draft = ""; s.receiver = ""; s.reference = null;
    refresh();
    const next = document.querySelector(`[data-ledger-filter="${field}"]`);
    next?.focus({ preventScroll: true });
    if (input.type === "search" && pos !== null) next?.setSelectionRange(pos, pos);
  };
  root.addEventListener("input", updateFilter);
  root.addEventListener("change", updateFilter);
  root.addEventListener("change", (e) => {
    const s = state(config);
    if (e.target.matches("[data-ledger-view-control]") && ledgerViews.some(([id]) => id === e.target.value)) {
      for (const item of root.querySelectorAll("[data-settlement-record][open]")) if (!s.expandedRecords.includes(item.dataset.settlementRecord)) s.expandedRecords.push(item.dataset.settlementRecord);
      for (const item of root.querySelectorAll("[data-ledger-entry][open]")) if (!s.expandedEntries.includes(item.dataset.ledgerEntry)) s.expandedEntries.push(item.dataset.ledgerEntry);
      s.density = e.target.value;
      refresh();
      document.querySelector("[data-ledger-view-control]")?.focus({ preventScroll:true });
    }
    if (e.target.matches("[data-ledger-page-size]") && [25,50,100].includes(Number(e.target.value))) {
      s.pageSize = Number(e.target.value); s.pages = {}; refresh();
      document.querySelector(".ledger-data-grid")?.scrollIntoView({block:"start",behavior:"auto"});
    }
  });
  root.addEventListener("change", (e) => {
    const input = e.target.closest("[data-reconciliation-filter]");
    if (!input) return;
    e.stopPropagation();
    const s = state(config), field = input.dataset.reconciliationFilter;
    if (!["from", "to"].includes(field) || s.filter !== "reconciliation" || !s.partner) return;
    s.reconciliation[field] = input.value;
    s.pages = {};
    refresh();
    document.querySelector(`[data-reconciliation-filter="${field}"]`)?.focus({ preventScroll: true });
  });
  root.addEventListener("toggle", (e) => {
    if (!e.target.isConnected) return;
    if (e.target.matches("[data-ledger-filters],.settlement-search-drawer")) state(config).analysisOpen = e.target.open;
    if (e.target.matches("[data-settlement-record]")) {
      const s = state(config), id = e.target.dataset.settlementRecord;
      s.expandedRecords = e.target.open ? [...new Set([...s.expandedRecords, id])] : s.expandedRecords.filter((v) => v !== id);
    }
    if (e.target.matches("[data-ledger-entry]")) {
      const s = state(config), id = e.target.dataset.ledgerEntry;
      s.expandedEntries = e.target.open ? [...new Set([...s.expandedEntries, id])] : s.expandedEntries.filter((v) => v !== id);
    }
  }, true);
  root.addEventListener("toggle", (e) => {
    if (!e.target.matches("[data-order-composition]")) return;
    const s = state(config), id = e.target.dataset.orderComposition;
    const selected = new Set(s.expandedOrders);
    if (e.target.open) selected.add(id); else selected.delete(id);
    s.expandedOrders = [...selected];
  }, true);
  root.addEventListener("change", (e) => {
    const input = e.target.closest("[data-batch-record]");
    if (!input) return;
    e.stopPropagation();
    const s = state(config);
    if (s.batchDraft !== "select" || !methods(config).length || !batchCandidates(s).some((r) => r.id === input.dataset.batchRecord)) return;
    const selected = new Set(s.batchSelected);
    if (input.checked) selected.add(input.dataset.batchRecord); else selected.delete(input.dataset.batchRecord);
    s.batchSelected = [...selected];
    const id = input.dataset.batchRecord;
    refresh();
    document.querySelector(`[data-batch-record="${id}"]`)?.focus({ preventScroll: true });
  });
  root.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-settlement-action]");
    if (!target) return;
    e.stopPropagation();
    const [action, id] = target.dataset.settlementAction.split(":");
    const s = state(config);
    if(action === "export") {
      if(s.exportBusy || !config.allowed?.includes("settlements")) return;
      s.exportBusy = true; s.exportMessage = ""; refresh();
      try {
        const count = await downloadSettlementExport(s,config.role);
        s.exportMessage = `Excel готов. Расчётов в файле: ${count}, весь текущий отбор. Данные учебные.`;
      } catch(error) { s.exportMessage = error.message || "Не удалось подготовить Excel. Попробуйте ещё раз."; }
      finally { s.exportBusy = false; refresh(); }
      return;
    }
    if(["filter","direction","analysis-reset","reconciliation-reset","partner","partners-back","overview","seed-ledger"].includes(action)) s.exportMessage = "";
    if (["filter","direction","analysis-reset","reconciliation-reset","partner","partners-back","overview"].includes(action)) s.pages = {};
    if (action === "page" && ["prev","next"].includes(id)) {
      s.pages[s.pageKey] = Math.max(1,Math.min(s.pageCount,(s.pages[s.pageKey] || 1) + (id === "next" ? 1 : -1)));
    }
    if (action === "seed-ledger" && !s.bulkSeeded) {
      const template = s.records.find((r) => r.id === "partial");
      for (let n = 1; n <= 120; n++) {
        const id = `bulk-${n}`, direction = s.incomingOnly ? "in" : "out";
        const partnerId = n <= 80 ? "materials" : `bulk-partner-${n-80}`;
        s.records.push({ ...template, id, direction, partnerId, partnerLegal:partnerLegal(partnerId,template.createdAt),ourLegal:selectedLegal(config.role==="employee" ? config.employerRole?.() : config.role), partner: n <= 80 ? "Дом материалов" : `Учебный партнёр ${String(n-80).padStart(2,"0")}`, paid:0, status:"due", title:"Учебный расчёт большого списка", code:`МАССИВ-${n}`, orderId:`ЗАК-МАССИВ-${n}`, certificateId:`А-МАССИВ-${n}`, client:`Учебный клиент ${n}`, payment:null, note:"Дополнительный учебный расчёт. Не данные рабочего ЛК.", history:[{ type:"obligation",title:"Учебное обязательство",at:template.createdAt,amount:template.total,note:"Большой демонабор" }] });
      }
      s.bulkSeeded = true; s.pages = {}; s.message = "Добавлены 120 учебных расчётов. Сброс демо вернёт исходные примеры.";
    }
    const r = s.records.find((r) => r.id === id);
    const authorized = r?.direction === "out" && methods(config).length > 0 && (!r.payment || methods(config).some(([method]) => method === r.payment.method));
    if (action === "filter" && ["all", "history", "reconciliation"].includes(id)) { s.filter = id; s.analysis.status = id === "history" ? "all" : "open"; s.receiver = ""; s.draft = ""; s.reference = null; s.error = ""; s.batchDraft = ""; s.batchSelected = []; s.batchView = ""; }
    if (action === "reconciliation-reset") s.reconciliation = reconciliationDefaults();
    if (action === "direction" && ["in", "out"].includes(id) && (!s.incomingOnly || id === "in")) { s.screen = "partners"; s.direction = id; s.partner = ""; s.partnerName = ""; s.filter = "all"; s.analysis = analysisDefaults(); s.analysisOpen = false; s.receiver = ""; s.draft = ""; s.reference = null; s.batchDraft = ""; s.batchSelected = []; s.batchView = ""; s.message = ""; }
    if (action === "overview") { s.screen = "overview"; s.partner = ""; s.partnerName = ""; s.analysis = analysisDefaults(); s.message = ""; }
    if (action === "analysis-reset") { s.analysis = analysisDefaults(); s.analysisOpen = false; s.filter = "all"; s.batchDraft = ""; s.batchSelected = []; }
    if (action === "partner") openSettlementPartner(config, id);
    if (action === "partners-back") { s.screen = "partners"; s.partner = ""; s.partnerName = ""; s.filter = "all"; s.analysis = analysisDefaults(); s.analysisOpen = false; s.message = ""; s.receiver = ""; s.draft = ""; s.reference = null; s.batchDraft = ""; s.batchSelected = []; s.batchView = ""; }
    if (action === "batch-start" && methods(config).length && batchCandidates(s).length >= 2) { s.batchDraft = "select"; s.batchSelected = []; s.batchView = ""; s.draft = ""; s.receiver = ""; s.reference = null; s.error = ""; s.message="Одна выплата — одни юридические стороны. Первый выбранный заказ определит подходящие заказы для объединения."; }
    if (action === "batch-all" && s.batchDraft === "select" && methods(config).length) {
      const rows=batchCandidates(s),first=rows[0];
      const same=rows.filter(r=>legalKey(r.partnerLegal)===legalKey(first?.partnerLegal) && legalKey(r.ourLegal)===legalKey(first?.ourLegal));
      s.batchSelected = s.batchSelected.length && selectedBatchRecords(s).length === rows.length ? [] : same.map(r=>r.id);
    }
    if (action === "batch-review" && s.batchDraft === "select" && methods(config).length && selectedBatchRecords(s).length >= 2) s.batchDraft = "review";
    if (action === "batch-edit" && s.batchDraft === "review") s.batchDraft = "select";
    if (action === "batch-cancel") { s.batchDraft = ""; s.batchSelected = []; s.message=""; }
    if (action === "batch-open" && authorized && r.payment?.batch) { openSettlementPartner(config, r.partnerId, r.partner); s.batchView = r.payment.anchorId; }
    if (action === "batch-close") s.batchView = "";
    if (["order", "certificate"].includes(action) && r) s.reference = { kind: action, id };
    if (action === "reference-back") s.reference = null;
    if (action === "receive" && r?.direction === "in" && methods(config).length && remaining(r) > 0) s.draft = id;
    if (action === "start" && authorized && remaining(r) > 0 && !r.payment) { s.draft = id; s.error = ""; }
    if (action === "cancel") s.draft = "";
    if (action === "receiver" && authorized && r.payment) s.receiver = id;
    if (action === "payer") s.receiver = "";
    if (action === "issue" && authorized && s.receiver === id && r.payment && !r.payment.rejected) {
      const p = r.payment;
      p.code = String(246810 + (++s.serial * 37)).padStart(6, "0").slice(-6);
      p.issued = true; p.expires = Date.now() + 300000; p.attempts = 0;
      s.error = "";
    }
    if (action === "reject" && authorized && s.receiver === id && r.payment && !r.payment.issued) {
      const p = r.payment;
      const targets = paymentTargets(s, r);
      if (!targets.length) return;
      p.rejected = true; if (p.batch) p.state = "rejected";
      for (const { record, amount } of targets) {
        record.status = "disputed";
        addEvent(record, "Получатель не подтвердил получение", amount, `${p.batch ? `${p.id} · ` : ""}Долг не уменьшен; код не выдан`);
      }
    }
    if (action === "withdraw" && authorized && r.payment) {
      const p = r.payment;
      const targets = paymentTargets(s, r);
      if (!targets.length) return;
      for (const { record, amount } of targets) {
        addEvent(record, "Запрос подтверждения отменён", amount, `${p.batch ? `${p.id} · ` : ""}Передача денег не отменяется; долг не уменьшен`);
        record.payment = null; record.status = record.paid ? "partial" : "due";
      }
      if (p.batch) { p.state = "withdrawn"; p.code = ""; p.expires = 0; }
      s.receiver = ""; s.error = ""; s.batchView = "";
      s.message = "Запрос отменён. Подтверждённой выплаты нет, задолженность сохранена.";
    }
    if (action === "reset") states.delete(key(config));
    refresh(["start", "receive", "receiver", "payer", "issue", "reject", "withdraw", "order", "certificate", "batch-start", "batch-review", "batch-edit", "batch-open"].includes(action) ? "[data-testid=settlement-batch-draft], [data-testid=settlement-reference], [data-testid=settlement-receiver], [data-settlement-form], [data-settlement-receive-form], [data-testid=settlement-awaiting]" : "");
    if (action === "page") document.querySelector(".ledger-data-grid")?.scrollIntoView({block:"start",behavior:"auto"});
  });
  root.addEventListener("submit", (e) => {
    const request = e.target.closest("[data-settlement-form]");
    const confirm = e.target.closest("[data-settlement-code-form]");
    const receive = e.target.closest("[data-settlement-receive-form]");
    const batch = e.target.closest("[data-settlement-batch-form]");
    if (!request && !confirm && !receive && !batch) return;
    e.preventDefault(); e.stopPropagation();
    const s = state(config);
    if (batch) {
      const data = new FormData(batch);
      const p = createBatchPayment(s, data.get("method"), methods(config), batch.querySelector("[name=confirmed]").checked);
      if (!p) return;
      for (const item of p.items) addEvent(s.records.find((r) => r.id === item.id), "Запрошено подтверждение общей выплаты", item.amount, `${p.id} · всего ${money(p.amount)} по ${p.items.length} заказам · ${methodLabel(p.method)} · долг сохранён`);
      s.message = `Создан запрос ${p.id}: ${money(p.amount)} по ${p.items.length} заказам одного партнёра. До подтверждения получателя задолженность не меняется.`;
      refresh("[data-testid=settlement-awaiting]");
      return;
    }
    const r = s.records.find((r) => r.id === (request?.dataset.settlementForm || confirm?.dataset.settlementCodeForm || receive?.dataset.settlementReceiveForm) && r.direction === (receive ? "in" : "out"));
    if (!r || !methods(config).length || remaining(r) <= 0) return;
    if (receive) {
      const data = new FormData(receive);
      const amount = Number(data.get("amount"));
      const method = data.get("method");
      if (s.draft !== r.id || !receive.querySelector("[name=confirmed]").checked || !Number.isFinite(amount) || amount < 1 || amount > remaining(r) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 || !methods(config).some(([id]) => id === method)) return;
      r.paid = Math.round((r.paid + amount) * 100) / 100;
      r.status = remaining(r) === 0 ? "paid" : "partial";
      r.note = `Начислено ${money(r.total)}. Получатель подтвердил ${money(r.paid)}. Остаток долга ${money(remaining(r))}. Все суммы учебные.`;
      addEvent(r, "Вы подтвердили получение от партнёра", amount, `${methodLabel(method)} · подтверждение получателем в кабинете · остаток ${money(remaining(r))}`, { type: "payment", method });
      s.draft = ""; s.message = `Вы подтвердили получение ${money(amount)}. Долг партнёра уменьшен в учебном примере. Запись сохранена в истории с партнёром.`; s.filter = "all"; s.direction = "in"; s.analysis.status = remaining(r) ? "open" : "closed";
      refresh("[data-testid=settlement-message]");
      return;
    }
    if (request) {
      const data = new FormData(request);
      const amount = Number(data.get("amount"));
      const method = data.get("method");
      if (r.payment || s.draft !== r.id || !request.querySelector("[name=confirmed]").checked || !Number.isFinite(amount) || amount < 1 || amount > remaining(r) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 || !methods(config).some(([id]) => id === method)) return;
      r.payment = { amount, method, issued: false, code: "", expires: 0, attempts: 0, rejected: false };
      r.status = "awaiting"; s.draft = ""; s.error = ""; s.message = "Запрос создан только в демо. Получатель ещё не подтвердил получение, долг не уменьшен.";
      addEvent(r, "Запрошено подтверждение получения", amount, `${methodLabel(method)} · задолженность сохранена`);
      refresh("[data-testid=settlement-awaiting]");
      return;
    }
    const p = r.payment;
    if (!p || p.rejected || !methods(config).some(([id]) => id === p.method)) return;
    const entered = String(new FormData(confirm).get("code") || "").trim();
    if (!p.issued) s.error = "Код ещё не выдан. Покажите экран получателя: он должен подтвердить фактическое получение денег.";
    else if (p.attempts >= 3) s.error = "Три неверные попытки. Получатель может выдать новый учебный код; долг не погашен.";
    else if (Date.now() > p.expires) s.error = "Срок кода истёк. Получите новый учебный код у получателя. Долг не погашен.";
    else if (entered !== p.code) { p.attempts++; s.error = p.attempts >= 3 ? "Три неверные попытки. Нужен новый учебный код от получателя; долг не погашен." : `Неверный код. Осталось попыток: ${3 - p.attempts}. Задолженность не изменена.`; }
    else {
      const targets = paymentTargets(s, r);
      if (!targets.length) {
        s.error = "Состав заказов или их остатки изменились. Долги не погашены. Отмените запрос и проверьте расчёты.";
        refresh("[data-testid=settlement-code-error]");
        return;
      }
      const confirmedAt = nextEventTime(targets.map(({ record }) => record));
      for (const { record, amount } of targets) {
        record.paid = Math.round((record.paid + amount) * 100) / 100;
        record.status = remaining(record) === 0 ? "paid" : "partial";
        record.note = `Начислено партнёру ${money(record.total)}. Получение ${money(record.paid)} подтверждено получателем. Остаток долга ${money(remaining(record))}. Все суммы учебные.`;
        addEvent(record, "Получатель подтвердил получение", amount, `${p.batch ? `${p.id} · доля общей выплаты ${money(p.amount)} · ` : ""}${methodLabel(p.method)} · учебный код проверен · остаток ${money(remaining(record))}`, { type: "payment", method: p.method, paymentId: p.batch ? p.id : "", at: confirmedAt });
        record.payment = null;
      }
      s.receiver = ""; s.draft = ""; s.error = ""; s.batchView = "";
      if (p.batch) {
        p.state = "confirmed"; p.code = ""; p.expires = 0;
        const partnerDebt = s.records.filter((record) => record.partnerId === r.partnerId && record.direction === "out").reduce((sum, record) => sum + remaining(record), 0);
        s.message = `Общая выплата ${p.id} на ${money(p.amount)} подтверждена получателем. Закрыто заказов: ${targets.length}. Осталось выплатить этому партнёру ${money(partnerDebt)}. Распределение сохранено в истории. Реальные деньги не переводились.`;
        s.filter = "history"; s.direction = "out"; s.analysis.status = "all";
      } else {
        s.message = `Получатель подтвердил ${money(p.amount)}. ${remaining(r) ? `Осталось выплатить ${money(remaining(r))}.` : "Долг закрыт."} Запись добавлена в историю с партнёром. Реальные деньги не переводились.`;
        s.filter = "all"; s.direction = "out"; s.analysis.status = remaining(r) ? "open" : "closed";
      }
    }
    refresh(s.error ? "[data-testid=settlement-code-error]" : "[data-testid=settlement-message]");
  });
}
