// Fictional ledger metadata. Fixed date makes the demo reproducible.
import { legalGroups, legalCaption, renderLegalParties } from "./partner-legal.js";
export const DEMO_DATE = "2026-10-14";
export const analysisDefaults = () => ({ q: "", status: "open", from: "", to: "", sort: "debt-desc" });
const details = {
  partial: { createdAt: "2026-10-10T12:30:00+03:00", dueDate: "2026-10-12", creator: "Агент «Рекомендации»", client: "Клиент №101 · демо" },
  outgoing: { createdAt: "2026-10-11T15:10:00+03:00", dueDate: "2026-10-20", creator: "Мастер дверей", client: "Клиент №102 · демо" },
  pending: { createdAt: "2026-10-12T11:20:00+03:00", dueDate: "", creator: "Агент «Рекомендации»", client: "Клиент №103 · демо" },
  paid: { createdAt: "2026-10-09T14:00:00+03:00", dueDate: "2026-10-10", creator: "Агент «Рекомендации»", client: "Клиент №104 · демо" },
  cancelled: { createdAt: "2026-10-08T10:30:00+03:00", dueDate: "2026-10-15", creator: "Агент «Рекомендации»", client: "Клиент №105 · демо" },
  "materials-out": { createdAt: "2026-10-13T09:00:00+03:00", dueDate: "2026-10-13", creator: "Дом материалов", client: "Клиент №106 · демо" },
  "materials-order2": { createdAt: "2026-10-14T10:15:00+03:00", dueDate: "2026-10-17", creator: "Дом материалов", client: "Клиент №107 · демо" },
  "materials-order3": { createdAt: "2026-10-14T11:45:00+03:00", dueDate: "2026-10-14", creator: "Дом материалов", client: "Клиент №108 · демо" },
};
export const ledgerMetadata = (id) => ({ createdAt: "", dueDate: "", creator: "Не указан", client: "Не указан", ...(details[id] || {}) });
export const debt = (r) => ["pending", "cancelled"].includes(r.status) ? 0 : Math.max(0, Math.round((r.total - r.paid) * 100) / 100);
const day = (value) => value ? Date.parse(`${value.slice(0, 10)}T00:00:00Z`) / 86400000 : NaN;
export const overdueDays = (r) => debt(r) > 0 && r.dueDate ? Math.max(0, day(DEMO_DATE) - day(r.dueDate)) : 0;
export const dueSoon = (r) => debt(r) > 0 && r.dueDate && day(r.dueDate) >= day(DEMO_DATE) && day(r.dueDate) <= day(DEMO_DATE) + 7;
export const formatDate = (v) => v ? v.slice(0, 10).split("-").reverse().join(".") : "Не согласован";
export const formatTime = (v) => v && Number.isFinite(Date.parse(v)) ? `${new Intl.DateTimeFormat("ru-RU", {timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v))} МСК` : "Не указана";
const normalize = (v) => String(v || "").trim().toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/\s+/g, " ");
export function filterLedger(records, direction, filter) {
  if (filter.from && filter.to && filter.from > filter.to) return [];
  const query = normalize(filter.q);
  return records.filter((r) => {
    const created = r.createdAt.slice(0, 10);
    if (r.direction !== direction || (filter.from && (!created || created < filter.from)) || (filter.to && (!created || created > filter.to))) return false;
    if (query && !normalize([r.partner, r.partnerLegal?.name,r.partnerLegal?.inn,r.partnerLegal?.kpp,r.ourLegal?.name,r.ourLegal?.inn, r.orderId, r.certificateId, r.code, r.creator, r.client, r.title, ...(r.orderCategories || [])].join(" ")).includes(query)) return false;
    const status = filter.status;
    return status === "all" ||
      (status === "open" && debt(r) > 0) ||
      (status === "overdue" && overdueDays(r) > 0) ||
      (status === "soon" && dueSoon(r)) ||
      (status === "awaiting" && r.payment && !r.payment.rejected) ||
      (status === "disputed" && r.status === "disputed") ||
      (status === "pending" && r.status === "pending") ||
      (status === "closed" && ["paid", "cancelled"].includes(r.status));
  });
}
export function sortLedger(records, sort) {
  return [...records].sort((a, b) => sort === "due-asc" ? (day(a.dueDate) || Infinity) - (day(b.dueDate) || Infinity)
    : sort === "overdue-desc" ? overdueDays(b) - overdueDays(a) || debt(b) - debt(a)
      : sort === "name" ? a.partner.localeCompare(b.partner, "ru") : debt(b) - debt(a));
}
export function ledgerStats(records) {
  return {
    total: records.reduce((n, r) => n + Math.round(debt(r) * 100), 0) / 100,
    overdue: records.filter((r) => overdueDays(r) > 0).reduce((n, r) => n + Math.round(debt(r) * 100), 0) / 100,
    soon: records.filter(dueSoon).reduce((n, r) => n + Math.round(debt(r) * 100), 0) / 100,
    waiting: new Set(records.filter((r) => r.payment && !r.payment.rejected).map((r) => r.payment)).size,
    pending: records.filter((r) => r.status === "pending").reduce((n, r) => n + r.total, 0),
  };
}
export function groupPartners(records, sort) {
  const groups = [...new Set(records.map((r) => r.partnerId))].map((id) => {
    const rows = records.filter((r) => r.partnerId === id);
    const dates = rows.filter((r) => debt(r) > 0 && r.dueDate).map((r) => r.dueDate).sort();
    return { id, name: rows[0].partner, records: rows, ...ledgerStats(rows), maxOverdue: Math.max(0, ...rows.map(overdueDays)), nearest: dates[0] || "" };
  });
  return groups.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ru")
    : sort === "due-asc" ? (day(a.nearest) || Infinity) - (day(b.nearest) || Infinity)
      : sort === "overdue-desc" ? b.maxOverdue - a.maxOverdue || b.total - a.total : b.total - a.total);
}
export function renderLedgerFilters(s, { esc, button }) {
  const f = s.analysis;
  const defaultStatus = s.filter === "history" ? "all" : "open";
  const changed = f.q || f.status !== defaultStatus || f.from || f.to || f.sort !== "debt-desc";
  return `<section class="settlement-search" aria-label="Поиск и фильтры">
    <label class="pw-field"><span>${s.partner ? "Найти заказ, сертификат, клиента или категорию" : "Найти партнёра, заказ, сертификат или категорию"}</span><input type="search" maxlength="120" data-ledger-filter="q" data-testid="ledger-search" value="${esc(f.q)}" placeholder="Название, номер, категория или имя"></label>
    <details data-ledger-filters ${s.analysisOpen || f.status !== defaultStatus || f.from || f.to || f.sort !== "debt-desc" ? "open" : ""}><summary>Фильтры и сортировка${changed ? " · применены" : ""}</summary><div class="settlement-filter-grid">
    <label class="pw-field"><span>Состояние расчётов</span><select data-ledger-filter="status" data-testid="ledger-status">${[["open","Все открытые долги"],["overdue","Просроченные"],["soon","Срок в ближайшие 7 дней"],["awaiting","Ожидают подтверждения получения"],["disputed","Получение не подтверждено"],["pending","Обязательство ещё не согласовано"],["closed","Закрытые и отменённые"],["all","Вся история"]].map(([id,label])=>`<option value="${id}" ${f.status===id?"selected":""}>${label}</option>`).join("")}</select></label>
    <label class="pw-field"><span>Показывать сначала</span><select data-ledger-filter="sort" data-testid="ledger-sort">${[["debt-desc","Крупные долги"],["due-asc","Ближайший срок выплаты"],["overdue-desc","Большую просрочку"],["name","По имени партнёра"]].map(([id,label])=>`<option value="${id}" ${f.sort===id?"selected":""}>${label}</option>`).join("")}</select></label>
    <label class="pw-field"><span>Обязательство возникло с</span><input type="date" data-ledger-filter="from" data-testid="ledger-from" value="${esc(f.from)}"></label>
    <label class="pw-field"><span>По дату включительно</span><input type="date" data-ledger-filter="to" data-testid="ledger-to" value="${esc(f.to)}"></label></div>
    <small>Период относится к дате возникновения обязательства, а не к дате фактической выплаты. Срок выплаты показан отдельно.</small></details>
    ${changed ? button("Сбросить фильтры", "analysis-reset") : ""}
    ${f.from && f.to && f.from > f.to ? '<p class="settlement-error" role="alert" data-testid="ledger-date-error">Дата начала позже даты окончания. Исправьте период или сбросьте фильтры.</p>' : ""}
    </section>`;
}
export function renderLedgerStats(records, { money }) {
  const stats = ledgerStats(records);
  return `<div class="settlement-analysis-stats" data-testid="ledger-stats"><div><span>Долг по текущему отбору</span><strong data-testid="ledger-filtered-total">${money(stats.total)}</strong></div><div><span>Из него просрочено</span><strong class="${stats.overdue ? "settlement-error" : ""}" data-testid="ledger-overdue">${money(stats.overdue)}</strong></div><div><span>Срок в ближайшие 7 дней</span><strong>${money(stats.soon)}</strong></div></div><p class="pw-footnote">Просрочка и ближайшие сроки рассчитаны на 14.10.2026, дату учебного примера. Запросов подтверждения получения: ${stats.waiting}.${stats.pending ? ` Не согласовано и не входит в долг: ${money(stats.pending)}.` : ""}</p>`;
}
export function renderPartnerLedgerList(records, s, { money, esc, button, paginate }) {
  const groups = groupPartners(records, s.analysis.sort);
  const page = paginate ? paginate(groups) : {items:groups,controls:""};
  return `<section data-testid="ledger-partners"><p class="pw-footnote" role="status">Партнёры: ${groups.length}</p><div class="settlement-partner-list ledger-data-grid">${page.items.map((g) => {
    const identities=legalGroups(g.records);
    return `<button type="button" class="settlement-partner-compact" data-settlement-action="partner:${g.id}" data-testid="settlement-partner:${g.id}" aria-label="${esc(g.name)}: ${money(g.total)}, открыть расчёты"><span><strong>${esc(g.name)}</strong><small class="ledger-legal-caption">${identities.length===1 ? esc(legalCaption(identities[0].partnerLegal)) : `Сторон в заказах: ${identities.length} · детализация внутри`}</small><small>${g.records.length} заказ${g.records.length === 1 ? "" : g.records.length < 5 ? "а" : "ов"}${g.overdue ? " · есть просрочка" : g.waiting ? " · ждёт подтверждения" : ""}</small><small class="ledger-card-extra">Ближайший срок: ${formatDate(g.nearest)}${g.overdue ? ` · просрочено ${money(g.overdue)}` : ""}</small></span><span class="settlement-partner-number"><strong>${money(g.total)}</strong><span aria-hidden="true">›</span></span></button>`;
  }).join("") || `<div class="settlement-ledger-empty"><h3>Партнёров по этому отбору нет</h3><p>Измените поиск или состояние расчётов.</p>${button("Показать открытые долги", "analysis-reset")}</div>`}</div>${page.controls}</section>`;
}
export function renderRecordMeta(r, { money, esc, compact = false }) {
  const late = overdueDays(r);
  if (compact) return `<dl class="settlement-record-meta"><div><dt>Возникло обязательство</dt><dd>${formatTime(r.createdAt)}</dd></div><div><dt>Срок выплаты</dt><dd>${formatDate(r.dueDate)}${late ? ` <span class="settlement-error">· просрочка ${late} дн.</span>` : debt(r) > 0 && r.dueDate === DEMO_DATE ? " · сегодня" : ""}</dd></div></dl>`;
  return `${renderLegalParties(r,esc)}<dl class="settlement-record-meta"><div><dt>Дата и время операции</dt><dd>${formatTime(r.createdAt)}</dd></div><div><dt>Срок выплаты по условиям</dt><dd>${formatDate(r.dueDate)}${late ? ` <span class="settlement-error">· просрочка ${late} дн.</span>` : debt(r) > 0 && r.dueDate === DEMO_DATE ? " · сегодня" : ""}</dd></div><div><dt>От кого сертификат</dt><dd>${esc(r.creator)}</dd></div><div><dt>Клиент / получатель сертификата</dt><dd>${esc(r.client)}</dd></div></dl><p class="pw-footnote">${esc(r.code)} · вознаграждение по условиям партнёрства: ${money(r.total)}. Данные и сроки вымышленные; это не бонусная программа RemCard.</p>`;
}
