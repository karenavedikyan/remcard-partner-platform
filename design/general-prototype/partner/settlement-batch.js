// Pure helpers for fictional grouped payouts. No SMS, bank or server calls.
import { legalKey, legalCaption } from "./partner-legal.js";
const sameParties=(a,b)=>legalKey(a.partnerLegal)===legalKey(b.partnerLegal) && legalKey(a.ourLegal)===legalKey(b.ourLegal);
export const batchCandidates = (s) => s.records.filter((r) =>
  s.partner && r.partnerId === s.partner && r.direction === "out" &&
  (!s.batchEligible || s.batchEligible.includes(r.id)) &&
  !r.payment && !["pending", "cancelled", "paid"].includes(r.status) &&
  Math.round((r.total - r.paid) * 100) > 0 &&
  (!(s.batchSelected || []).length || sameParties(r,s.records.find(v=>v.id===s.batchSelected[0]) || r)));
export function selectedBatchRecords(s) {
  const ids = new Set(s.batchSelected || []);
  return batchCandidates(s).filter((r) => ids.has(r.id));
}
export const batchTotal = (records) => records.reduce((n, r) => n + Math.round((r.total - r.paid) * 100), 0) / 100;
export function createBatchPayment(s, method, allowedMethods, confirmed) {
  const selected = selectedBatchRecords(s);
  const unique = new Set(s.batchSelected || []);
  if (s.batchDraft !== "review" || !confirmed || selected.length < 2 ||
      unique.size !== selected.length || !allowedMethods.some(([id]) => id === method) ||
      !selected.every(r=>sameParties(r,selected[0]))) return null;
  const items = selected.map((r) => ({
    id: r.id, orderId: r.orderId, certificateId: r.certificateId,
    amount: Math.round((r.total - r.paid) * 100) / 100,
  }));
  const p = {
    batch: true, id: `ВЫП-ДЕМО-${String(++s.batchSerial).padStart(3, "0")}`,
    partnerId: s.partner, partner: selected[0].partner,
    partnerLegal:selected[0].partnerLegal || null,ourLegal:selected[0].ourLegal || null,
    anchorId: selected[0].id, items, amount: batchTotal(selected), method,
    issued: false, code: "", expires: 0, attempts: 0, rejected: false,
    state: "awaiting",
  };
  for (const r of selected) { r.payment = p; r.status = "awaiting"; }
  s.batches.push(p);
  s.batchDraft = ""; s.batchSelected = []; s.batchView = p.anchorId;
  s.draft = ""; s.receiver = ""; s.error = "";
  return p;
}
export function paymentTargets(s, r) {
  const p = r?.payment;
  if (!p) return [];
  if (p.batch && (p.partnerId !== r.partnerId || !["awaiting", "rejected"].includes(p.state) || p.items.length < 2)) return [];
  const items = p.items || [{ id: r.id, amount: p.amount }];
  if (new Set(items.map((item) => item.id)).size !== items.length) return [];
  const targets = items.map((item) => ({ record: s.records.find((row) => row.id === item.id), amount: item.amount, allocation: item }));
  if (targets.some(({ record, amount, allocation }) => !record || record.direction !== "out" ||
      record.partnerId !== r.partnerId || record.payment !== p ||
      !sameParties(record,r) ||
      !["awaiting", "disputed"].includes(record.status) ||
      (p.batch && (record.orderId !== allocation.orderId || record.certificateId !== allocation.certificateId)) ||
      !Number.isFinite(amount) || amount <= 0 ||
      Math.round(amount * 100) > Math.round((record.total - record.paid) * 100))) return [];
  if (targets.reduce((n, item) => n + Math.round(item.amount * 100), 0) !== Math.round(p.amount * 100)) return [];
  return targets;
}
export function allocationList(p, { money, esc }) {
  if (!p.batch) return "";
  return `<div class="settlement-allocation" data-testid="settlement-batch-allocation"><h3>Распределение общей выплаты</h3><p class="pw-muted">${esc(p.id)} · ${p.items.length} заказа · один получатель</p><p class="ledger-legal-caption">${esc(legalCaption(p.partnerLegal))}</p><ul>${p.items.map((item) => `<li><div><strong>${esc(item.orderId)}</strong><b>${money(item.amount)}</b></div><small>Сертификат ${esc(item.certificateId)}</small></li>`).join("")}</ul><div class="settlement-batch-total"><strong>Итого одной выплатой</strong><strong>${money(p.amount)}</strong></div></div>`;
}
export function renderBatchDraft(s, availableMethods, tools) {
  const { money, esc, button } = tools;
  const candidates = batchCandidates(s);
  const selected = selectedBatchRecords(s);
  const total = batchTotal(selected);
  const list = selected.map((r) => ({ id: r.id, orderId: r.orderId, certificateId: r.certificateId, amount: Math.round((r.total - r.paid) * 100) / 100 }));
  if (s.batchDraft === "review") {
    return `<section class="settlement-confirm" data-testid="settlement-batch-draft"><h3>Одна выплата партнёру ${esc(s.partnerName)}</h3><p>Проверьте заказы и сумму. Каждому выбранному заказу соответствует его полный неоплаченный остаток.</p>${allocationList({ batch: true, id: "Предпросмотр · запрос ещё не создан", items: list, amount: total,partnerLegal:selected[0]?.partnerLegal }, tools)}<form data-settlement-batch-form class="settlement-code-form"><label class="pw-field"><span>Способ общей выплаты</span><select name="method" data-testid="settlement-batch-method">${availableMethods.map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select></label><label class="settlement-check"><input type="checkbox" name="confirmed" required data-testid="settlement-batch-confirmed"><span>В демосценарии общая сумма уже передана получателю наличными или переводом вне RemCard. Я запрашиваю подтверждение, а не отправляю деньги.</span></label><p class="pw-muted">Получатель увидит весь список заказов и общую сумму. Один код подтвердит именно этот состав выплаты. До проверки кода все долги сохраняются.</p><button type="submit" class="pw-btn primary" data-testid="settlement-batch-request" ${selected.length < 2 || !availableMethods.length ? "disabled" : ""}>Запросить подтверждение общей выплаты · демо</button></form><div class="cab-actions">${button("Изменить выбранные заказы", "batch-edit")}${button("Отмена", "batch-cancel")}</div></section>`;
  }
  return `<section class="settlement-confirm" data-testid="settlement-batch-draft"><h3>Выберите заказы для одной выплаты</h3><p>Получатель: <strong>${esc(s.partnerName)}</strong>. Можно объединить только ваши долги этому партнёру; встречные начисления не вычитаются.</p>${button(selected.length === candidates.length && candidates.length ? "Снять выбор со всех" : "Выбрать все доступные", "batch-all")}<div class="settlement-batch-options">${candidates.map((r) => `<label class="settlement-batch-option"><input type="checkbox" data-batch-record="${r.id}" data-testid="settlement-batch-select-${r.id}" ${selected.some((row) => row.id === r.id) ? "checked" : ""}><span><strong>${esc(r.orderId)}</strong><small>${esc(r.title)} · сертификат ${esc(r.certificateId)}</small><b>Осталось выплатить ${money(r.total - r.paid)}</b></span></label>`).join("") || '<p class="pw-muted">Нет доступных заказов для объединения. Закрытые заказы и заказы с запросом выплаты исключены.</p>'}</div><div class="settlement-batch-total" role="status"><span data-testid="settlement-batch-count">Выбрано: ${selected.length}</span><strong data-testid="settlement-batch-total">${money(total)}</strong></div><small>Для общей выплаты выберите минимум два заказа. Частичная выплата по одному заказу остаётся доступной в его карточке.</small><div class="cab-actions">${button("Перейти к общей выплате", "batch-review", selected.length < 2 || !availableMethods.length ? "disabled" : "", true)}${button("Отмена", "batch-cancel")}</div></section>`;
}
export function renderBatchHistory(s, tools) {
  const { money, esc } = tools;
  const batches = s.batches.filter((p) => !s.partner || p.partnerId === s.partner);
  if (!batches.length) return "";
  const labels = { awaiting: "Ожидает подтверждения", confirmed: "Получение подтверждено", rejected: "Получение не подтверждено", withdrawn: "Запрос отменён" };
  return `<section class="settlement-batch-history" data-testid="settlement-batch-history"><h3>Общие выплаты по нескольким заказам</h3>${batches.map((p) => `<details class="settlement-record" data-testid="settlement-batch-history-${p.id}"><summary>${esc(p.id)} · ${esc(p.partner)} · ${money(p.amount)}</summary><p><strong>${labels[p.state]}</strong> · ${p.method === "cash" ? "Наличный" : "Безналичный"} расчёт</p>${allocationList(p, tools)}<small>${p.state === "confirmed" ? "Это одна выплата. Распределение по заказам не является дополнительными платежами." : "Запрос выплаты не уменьшает задолженность."}</small></details>`).join("")}</section>`;
}
