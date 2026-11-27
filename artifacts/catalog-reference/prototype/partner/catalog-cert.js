/* Сертификат RemCard в заявке клиента: партнёр вносит номер при оформлении заказа или подтверждает номер, который клиент
   внёс сам на сайте. Расчёт — общий с сайтом (client/catalog-cert-core.js). Скидка клиенту считается по категориям сертификата;
   рекомендателю (партнёр, выдавший сертификат) продавец начисляет вознаграждение со стоимости заказа после скидки.
   Сумма вознаграждения и доход — только владельцу кабинета; сотрудник видит код, скидку и сумму к оплате, прав не получает.
   Кошелёк и взаиморасчёты RemCard в прототипе не меняются: начисление показано как ожидаемое. Все данные демонстрационные. */
import "../client/catalog-cert-core.js?v=cert2";

const SELLER_ID = "s6";
const OPEN = ["new", "accepted", "progress"];
const api = () => globalThis.RCOrderCert;
const num = (n) => Math.round(n).toLocaleString("ru-RU").replace(/\u00a0/g, " ");
const rub = (n) => `${num(n)} ₽`;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const certOpen = (o) => OPEN.includes(o.status);

export function certCalcOrder(o, modelById) {
  if (!o.cert || !api()) return null;
  const items = o.items.map((i, k) => { const m = modelById(i.pid); return { key: k, section: m?.section || "", price: i.price, qty: i.qty, promo: !!m?.oldPrice }; });
  return api().calc(o.cert.code, SELLER_ID, items, { orderId: o.id });
}

/* Две строки под «Итого по ценам каталога». */
export function certTotals(o, modelById) {
  const r = certCalcOrder(o, modelById);
  if (!r || r.state !== "ok") return "";
  return `<div class="pc-total pc-total--cert" data-testid="pc-cert-discount"><span>Скидка по сертификату ${esc(r.shown)}</span><strong>−${rub(r.discount)}</strong></div>
          <div class="pc-total pc-total--pay" data-testid="pc-cert-pay"><span>Клиент платит</span><strong>${rub(r.total)}</strong></div>`;
}

/* Доход владельца с учётом скидки и вознаграждения рекомендателю (по позициям с закупкой из 1С). */
export function certIncome(o, modelById, icon, sale, buy, costedIdx) {
  const r = certCalcOrder(o, modelById);
  if (!r || r.state !== "ok") return "";
  const disc = costedIdx.reduce((a, k) => a + (r.lines[k]?.disc || 0), 0);
  const reward = r.reward ? r.reward.amount : 0;
  return `<div class="pc-total pc-total--mk" data-testid="pc-cert-income"><span>${icon("lock")}Доход после скидки${reward ? " и вознаграждения" : ""}</span><strong>≈ ${rub(sale - buy - disc - reward)}</strong></div>`;
}

export function certPanel(s, icon, o, modelById) {
  const r = certCalcOrder(o, modelById);
  const open = certOpen(o);
  const money = s.manage && s.showCost;
  const head = `<div class="row between"><h3>${icon("badge-percent")} Сертификат RemCard</h3>${o.cert && r && r.state === "ok" ? `<span class="pill pc-status ${o.cert.confirmed ? "pc-cert-ok" : ""}">${icon(o.cert.confirmed ? "check" : "clock")}${o.cert.confirmed ? "Подтверждён вами" : "Ждёт вашего подтверждения"}</span>` : ""}</div>`;
  if (o.cert && r && r.state === "ok") {
    const rows = r.lines.map((l, k) => { const it = o.items[k]; return `<li><span>${esc(it.name)}${it.color ? ` · ${esc(it.color)}` : ""}</span><b>${l.pct ? `−${l.pct} % · −${rub(l.disc)}` : `<i>без скидки</i>`}</b>${l.pct ? "" : `<small>${esc(l.why)}</small>`}</li>`; }).join("");
    const rec = r.reward
      ? (money
        ? `<div class="pc-cert-rec" data-testid="pc-cert-reward"><span>${icon("lock")}Рекомендатель · ${esc(r.reward.to)}</span><strong>${rub(r.reward.amount)}</strong><small>${r.reward.rate} % от ${rub(r.total)} (стоимость после скидки). Начисляется от вас в ожидании, пока клиент не оплатит заказ. Виден только владельцу кабинета.</small></div>`
        : `<p class="small pc-cert-note">${icon("handshake")}<span>Рекомендатель сертификата получит вознаграждение от продавца после оплаты заказа. Сумму видит владелец кабинета.</span></p>`)
      : `<p class="small pc-cert-note">${icon("info")}<span>Это сертификат вашей компании: рекомендателя нет, вознаграждение не начисляется.</span></p>`;
    return `<section class="panel stack pc-cert" data-testid="pc-cert">${head}
      <dl class="pc-dl"><div><dt>Номер</dt><dd><strong>${esc(r.shown)}</strong> · ${esc(r.title)}</dd></div><div><dt>Внёс</dt><dd>${o.cert.by === "client" ? "клиент, на сайте в своей заявке" : "вы, при оформлении заказа"}</dd></div>${r.until ? `<div><dt>Действует до</dt><dd>${esc(r.until)}${r.limit ? ` · ${esc(r.limit)}` : ""}</dd></div>` : r.limit ? `<div><dt>Использование</dt><dd>${esc(r.limit)}</dd></div>` : ""}</dl>
      <ul class="pc-cert-lines" data-testid="pc-cert-lines">${rows}</ul>
      ${rec}
      ${open ? `<div class="row">${o.cert.confirmed ? "" : `<button type="button" class="btn primary" data-pc-action="cert-confirm" data-testid="pc-cert-confirm">${icon("check")} Подтвердить скидку</button>`}<button type="button" class="btn" data-pc-action="cert-remove" data-testid="pc-cert-remove">${icon("x")} Убрать сертификат</button></div>` : ""}
      <p class="small">Скидка считается по категориям сертификата, остальные позиции идут по цене каталога. Клиент увидит скидку в своей заявке (демо).</p></section>`;
  }
  const bad = o.cert && r && r.state !== "ok" ? `<p class="notice pc-cert-err" data-testid="pc-cert-msg">${icon("triangle-alert")}<span>Сертификат ${esc(o.cert.code)}: ${esc(r.message || "скидка не применена")}</span></p>` : "";
  const msg = o.certMsg ? `<p class="notice pc-cert-err" data-testid="pc-cert-msg" role="alert">${icon("triangle-alert")}<span>${esc(o.certMsg)}</span></p>` : "";
  if (!open) return o.cert ? `<section class="panel stack pc-cert" data-testid="pc-cert">${head}${bad}</section>` : "";
  return `<section class="panel stack pc-cert" data-testid="pc-cert">${head}${bad}
    <p class="small">Клиент назвал номер сертификата RemCard? Внесите его — скидка пересчитается, а рекомендатель получит вознаграждение от вас.</p>
    <div class="pc-cert-row"><input type="text" class="pc-cert-in" data-testid="pc-cert-input" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Номер, например RC-TD-4F7K" aria-label="Номер сертификата" value=""><button type="button" class="btn primary" data-pc-action="cert-apply" data-testid="pc-cert-apply">${icon("check")} Применить</button></div>
    ${msg}
    <p class="small">Для примера: RC-TD-4F7K — сертификат вашей компании (без рекомендателя), RC-AGENT-2K7Q и RC-CITY-M8V2 — выданы партнёрами.</p></section>`;
}

/* Возвращает true, если действие обработано. */
export function handleCertAction({ s, order, config, rerender, modelById, stamp }, kind) {
  if (!["cert-apply", "cert-remove", "cert-confirm"].includes(kind)) return false;
  if (!order || !certOpen(order) || !api()) return true;
  if (kind === "cert-apply") {
    const input = document.querySelector('[data-testid="pc-cert-input"]');
    const code = api().normalize(input?.value);
    order.cert = null;
    if (!code) { order.certMsg = "Введите номер сертификата."; rerender(); return true; }
    const probe = { ...order, cert: { code } };
    const r = certCalcOrder(probe, modelById);
    if (!r || r.state !== "ok") { order.certMsg = r?.message || "Сертификат не подошёл."; rerender(); return true; }
    order.certMsg = ""; order.cert = { code, by: "partner", confirmed: true }; api().reserve(code, order.id);
    order.history.push([stamp(), `Применён сертификат ${r.shown}: скидка −${rub(r.discount)}`]);
    config.notify(`Сертификат применён: скидка −${rub(r.discount)}, клиент платит ${rub(r.total)}. Клиент увидит это в своей заявке (демо).`);
    rerender(); return true;
  }
  if (kind === "cert-confirm" && order.cert) {
    order.cert.confirmed = true; order.history.push([stamp(), `Скидка по сертификату ${api().normalize(order.cert.code)} подтверждена`]);
    config.notify("Скидка подтверждена. Клиент увидит это в заявке (демо)."); rerender(); return true;
  }
  if (kind === "cert-remove" && order.cert) {
    api().release(order.cert.code, order.id);
    order.history.push([stamp(), `Сертификат ${order.cert.code} убран из заявки`]); order.cert = null; order.certMsg = "";
    config.notify("Сертификат убран, сумма вернулась к ценам каталога (демо)."); rerender(); return true;
  }
  return true;
}
