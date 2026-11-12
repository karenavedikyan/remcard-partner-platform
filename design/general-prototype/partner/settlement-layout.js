// Presentation only: never changes obligations, payment allocations or filters.
export const ledgerViews = [["list", "Строки"], ["small", "Малые карточки"], ["medium", "Средние карточки"], ["large", "Крупные карточки"]];
export function renderLedgerView(s) {
  return `<label class="ledger-view-control"><span>Вид данных</span><select data-ledger-view-control data-testid="ledger-view" aria-label="Размер карточек">${ledgerViews.map(([id, label]) => `<option value="${id}" ${s.density === id ? "selected" : ""}>${label}</option>`).join("")}</select></label>`;
}
export function pageSlice(items, page = 1, size = 25) {
  size = [25, 50, 100].includes(Number(size)) ? Number(size) : 25;
  const pages = Math.max(1, Math.ceil(items.length / size));
  page = Math.min(pages, Math.max(1, Math.floor(Number(page) || 1)));
  return { items: items.slice((page - 1) * size, page * size), page, pages, size, total: items.length };
}
export function ledgerPaginator(s, key, button) {
  return (items) => {
    s.pages ||= {};
    const result = pageSlice(items, s.pages[key] || 1, s.pageSize);
    s.pages[key] = result.page;
    s.pageKey = key;
    s.pageCount = result.pages;
    const controls = result.total > 25 ? `<div class="ledger-pagination" data-testid="ledger-pagination"><span data-testid="ledger-page-status">${(result.page - 1) * result.size + 1}–${Math.min(result.page * result.size, result.total)} из ${result.total}</span><label>На странице<select data-ledger-page-size data-testid="ledger-page-size">${[25,50,100].map((v) => `<option value="${v}" ${result.size === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><div>${button("Назад", "page:prev", result.page === 1 ? "disabled" : "")}${button("Далее", "page:next", result.page === result.pages ? "disabled" : "")}</div></div>` : "";
    return { ...result, controls };
  };
}
