// Fictional order composition. Amounts calculated in integer kopecks.
const categories = {
  partial: ["Черновые строительные материалы", "Отделочные материалы"],
  outgoing: ["Межкомнатные двери", "Фурнитура и установка"],
  pending: ["Освещение", "Электрооборудование"],
  paid: ["Керамическая плитка", "Клей и затирка"],
  cancelled: ["Напольные покрытия", "Сопутствующие материалы"],
  "materials-out": ["Сантехника", "Монтажные материалы"],
  "materials-order2": ["Кухонная мебель", "Столешницы и фурнитура"],
  "materials-order3": ["Отделочные материалы", "Лакокрасочные материалы"],
};
const cents = (v) => Math.round(v * 100);
export function orderLines(r) {
  const names = categories[r.id] || ["Товары / услуги", "Дополнительные позиции"];
  const totalNet = cents(r.purchase);
  const firstNet = Math.round(totalNet * .6);
  return [firstNet, totalNet - firstNet].map((net, index) => {
    const discountPercent = index === 0 ? 10 : 20;
    const gross = Math.round(net / (1 - discountPercent / 100));
    return {
      category: names[index], gross: gross / 100, discount: (gross - net) / 100,
      discountPercent, net: net / 100, rate: r.rate,
      fee: Math.round(net * r.rate / 100) / 100,
    };
  });
}
export function orderTotals(r) {
  return orderLines(r).reduce((sum, line) => {
    for (const field of ["gross", "discount", "net", "fee"]) sum[field] += cents(line[field]);
    return sum;
  }, { gross: 0, discount: 0, net: 0, fee: 0 });
}
export function renderOrderSummary(r, { money, esc }) {
  const totals = orderTotals(r);
  return `<div class="settlement-order-summary" data-testid="order-summary-${r.id}"><div><span>Заказ без скидки</span><strong>${money(totals.gross / 100)}</strong></div><div><span>Скидка клиенту</span><strong>${money(totals.discount / 100)}</strong></div><div><span>После скидки</span><strong>${money(totals.net / 100)}</strong></div></div><p class="pw-muted settlement-category-names">${orderLines(r).map((line) => esc(line.category)).join(" · ")}</p>`;
}
export function renderOrderBreakdown(r, { money, esc, inline = false }) {
  const lines = orderLines(r), totals = orderTotals(r);
  const valid = totals.fee === cents(r.total) && totals.net === cents(r.purchase);
  const status = r.status === "cancelled"
    ? "Обязательство отменено: расчёт ниже показывает исходный заказ, задолженность по нему равна нулю."
    : r.status === "pending"
      ? "Это предварительный расчёт: обязательство ещё не согласовано и не включено в задолженность."
      : `Полное вознаграждение ${money(r.total)}; получение подтверждено ${money(r.paid)}; остаток ${money(Math.max(0, r.total - r.paid))}.`;
  return `<section class="settlement-order-detail" data-testid="order-breakdown-${r.id}"><h3>${inline ? "Расшифровка по категориям" : "За что рассчитано вознаграждение"}</h3>${inline ? "" : `<p class="pw-muted">Заказ <strong>${esc(r.orderId)}</strong> · сертификат <strong>${esc(r.certificateId)}</strong></p>${renderOrderSummary(r, { money, esc })}`}
    <div class="settlement-category-list" role="list" aria-label="Категории заказа">${lines.map((line, index) => `<article class="settlement-category" role="listitem" data-testid="order-category-${r.id}-${index}"><h4>${esc(line.category)}</h4><dl><div><dt>Без скидки</dt><dd>${money(line.gross)}</dd></div><div><dt>Скидка клиенту · ${line.discountPercent}%</dt><dd>${money(line.discount)}</dd></div><div><dt>После скидки</dt><dd>${money(line.net)}</dd></div><div class="settlement-category-fee"><dt>Вознаграждение партнёру</dt><dd>${money(line.fee)}</dd><small>${money(line.net)} × ${line.rate}%</small></div></dl></article>`).join("")}</div>
    <dl class="settlement-breakdown"><div><dt>Заказ без скидки, всего</dt><dd data-testid="order-gross-${r.id}">${money(totals.gross / 100)}</dd></div><div><dt>Скидка клиенту, всего</dt><dd>${money(totals.discount / 100)}</dd></div><div><dt>Итог заказа после скидки</dt><dd>${money(totals.net / 100)}</dd></div><div><dt>Вознаграждение партнёру, всего</dt><dd data-testid="order-fee-${r.id}">${money(totals.fee / 100)}</dd></div></dl>
    <p class="settlement-debt">${esc(status)}</p>${valid ? "" : '<p class="settlement-error" role="alert">Сумма расшифровки не совпадает с обязательством. Нужна проверка условий; расшифровка не меняет долг автоматически.</p>'}
    <details class="settlement-calculation-help"><summary>Откуда берётся сумма вознаграждения</summary><p>В этом учебном заказе база вознаграждения: сумма каждой категории после скидки, ставка ${r.rate}%. Скидка покупателю и вознаграждение партнёру являются разными суммами. Расшифровка сохранена для исходного заказа и не пересчитывается из текущих настроек профиля.</p><p class="pw-muted">Это вымышленные категории, цены и условия, не данные рабочего ЛК. В реализации база и ставка берутся из условий партнёрства, действовавших при оформлении заказа; они могут отличаться по категориям.</p></details></section>`;
}
