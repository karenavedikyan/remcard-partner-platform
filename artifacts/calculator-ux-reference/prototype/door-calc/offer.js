(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rub(n) { return Math.round(n).toLocaleString("ru-RU") + " ₽"; }
  var demo = {
    obj: { client: "Иванова Мария", phone: "+7 900 000-00-00", address: "г. Краснодар, ул. Примерная, 10, кв. 25" },
    model: { name: "Скандинавия 01", maker: "Фабрика «Север»" },
    per: [
      { n: 1, room: "Кухня", type: "Межкомнатная", size: "870 × 2050, стена 300", lines: ["Полотно 800 мм", "Коробка", "Наличник 5 шт", "Остаток 235 мм: 2 комплекта добора 150 и стыковочная планка"] },
      { n: 2, room: "Спальня", type: "Межкомнатная", size: "770 × 2070, стена 100", lines: ["Полотно 600 мм", "Коробка", "Наличник 5 шт", "Добор 100: общий комплект с проёмом 3"] },
      { n: 3, room: "Прихожая", type: "Входная", size: "1000 × 2050, стена 250", lines: ["Наличник 2,5 шт", "Добор 200, остаток 185 мм"] }
    ],
    rows: [["Полотно 800 мм", 1, 9800], ["Полотно 600 мм", 1, 9800], ["Коробка", 5, 1570], ["Добор 100 мм", 3, 1180], ["Добор 150 мм", 5, 1670], ["Добор 200 мм", 3, 2160], ["Стыковочная планка", 3, 780], ["Наличник", 13, 590], ["Петли", 4, 440], ["Ручка", 2, 1180], ["Замок", 2, 780]],
    disc: 5
  };
  var data = demo;
  try { var h = (location.hash || window.__offerHash || "").replace(/^#/, ""); if (h) data = JSON.parse(decodeURIComponent(escape(atob(h)))); } catch (e) { data = demo; }
  var P = { company: "Оптовик", manager: "Менеджер по дверям", phone: "+7 861 000-00-00", messenger: "Telegram, MAX: +7 900 000-00-00", email: "sales@optovik.example", site: "optovik.example", address: "г. Краснодар, ул. Складская, 1", note: "Предложение рассчитано по данным замера. Окончательная стоимость подтверждается менеджером при оформлении заказа.", logo: "" };
  function render() {
    var sum = 0, none = 0;
    data.rows.forEach(function (r) { if (r[2] == null || r[2] === "") none++; else sum += r[1] * r[2]; });
    var dp = Math.min(Math.max(+data.disc || 0, 0), 100), dsc = Math.round(sum * dp / 100), total = sum - dsc;
    var d = new Date(), ds = d.toLocaleDateString("ru-RU");
    var o = data.obj || {};
    $page.innerHTML =
      '<div class="hd"><div class="logo">' + (P.logo ? '<img src="' + P.logo + '" alt="">' : esc((P.company || "?").slice(0, 2).toUpperCase())) + '</div>' +
      '<div class="hd__c"><b>' + esc(P.company) + '</b><span>' + esc(P.phone) + ' · ' + esc(P.site) + '</span></div>' +
      '<div class="hd__r"><span class="rcb"><svg width="32" height="32" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#c4292f"/><path d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg><span class="rcb__t"><b>remcard<span>.</span></b><small>калькулятор ремонта</small></span></span></div></div>' +
      '<h1>Коммерческое предложение</h1><div class="meta">№ КП-0001 от ' + ds + ' · Демо-данные</div>' +
      '<div class="two"><div class="box"><small>Заказчик</small><b>' + esc(o.client || "Не указан") + '</b>' + esc(o.phone || "") + (o.address ? "<br>" + esc(o.address) : "") + '</div>' +
      '<div class="box"><small>Модель двери</small><b>' + esc(data.model.name) + '</b>' + esc(data.model.maker) + '<br>Менеджер: ' + esc(P.manager) + '</div></div>' +
      '<h3>Проёмы</h3><table><thead><tr><th>№</th><th>Проём</th><th>Размер, мм</th><th>Состав</th></tr></thead><tbody>' +
      data.per.map(function (p) { return "<tr><td>" + p.n + "</td><td><b>" + esc(p.room || "Проём") + "</b><br>" + esc(p.type) + "</td><td>" + esc(p.size) + "</td><td>" + p.lines.map(esc).join(", ") + "</td></tr>"; }).join("") + '</tbody></table>' +
      '<h3>Спецификация</h3><table><thead><tr><th>Позиция</th><th class="r">Кол-во</th><th class="r">Цена за шт.</th><th class="r">Сумма</th></tr></thead><tbody>' +
      data.rows.map(function (r) { var pr = r[2] == null || r[2] === ""; return "<tr><td>" + esc(r[0]) + '</td><td class="r">' + r[1] + ' шт</td><td class="r">' + (pr ? '<span class="na">по запросу</span>' : rub(r[2])) + '</td><td class="r">' + (pr ? "—" : rub(r[1] * r[2])) + "</td></tr>"; }).join("") + '</tbody></table>' +
      '<div class="tot"><div><span>Стоимость без скидки</span><b>' + rub(sum) + '</b></div>' + (dsc ? '<div><span>Скидка ' + dp + ' %</span><b>− ' + rub(dsc) + '</b></div>' : "") + '<div class="big"><span>Итого</span><span>' + rub(total) + '</span></div>' +
      (dsc ? '<div class="save"><span>Ваша выгода</span><span>' + rub(dsc) + '</span></div>' : "") + (none ? '<div style="font-size:11px;color:#8a5a12">Цена по ' + none + ' поз. уточняется, в итог не включена.</div>' : "") + '</div>' +
      '<div class="ct"><div style="font-size:11px;color:var(--muted);margin-bottom:8px">' + esc(P.note) + '</div><div class="ct__in"><b>Как с нами связаться</b>' +
      '<span><em>Менеджер:</em> ' + esc(P.manager) + '</span><span><em>Телефон:</em> ' + esc(P.phone) + '</span><span><em>Мессенджер:</em> ' + esc(P.messenger) + '</span><span><em>E-mail:</em> ' + esc(P.email) + '</span><span><em>Сайт:</em> ' + esc(P.site) + '</span><span><em>Адрес:</em> ' + esc(P.address) + '</span></div>' +
      '<div class="ft"><span>' + esc(P.company) + '</span><span>Макет на согласование · демо-данные</span></div></div>';
  }
  var $page = document.getElementById("page");
  if ($page) {
  document.querySelectorAll("[data-p]").forEach(function (i) { i.value = P[i.getAttribute("data-p")]; i.addEventListener("input", function () { P[i.getAttribute("data-p")] = i.value; render(); }); });
  document.getElementById("logo").addEventListener("change", function (e) { var f = e.target.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { P.logo = fr.result; render(); }; fr.readAsDataURL(f); });
  document.getElementById("print").addEventListener("click", function () { window.print(); });
  render();
  } else {
    window.RCOffer = function (el, hash) { $page = el; try { var hh = (hash || "").replace(/^#/, ""); data = hh ? JSON.parse(decodeURIComponent(escape(atob(hh)))) : demo; } catch (e) { data = demo; } render(); };
  }
})();
