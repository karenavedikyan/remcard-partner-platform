(function () {
  "use strict";
  var BOX = 65;
  var CATALOG = [
    { id: "m1", name: "Скандинавия 01", maker: "Фабрика «Север»", color: "#e9e4da", price: 9800, blades: [{ w: 600, from: 720, to: 790 }, { w: 700, from: 791, to: 850 }, { w: 800, from: 851, to: 940 }, { w: 900, from: 941, to: 1040 }] },
    { id: "m2", name: "Лофт 2", maker: "Вега", color: "#8d8a86", price: 11400, blades: [{ w: 600, from: 700, to: 770 }, { w: 700, from: 771, to: 840 }, { w: 800, from: 841, to: 930 }, { w: 900, from: 931, to: 1020 }] },
    { id: "m3", name: "Классика Н", maker: "Вега", color: "#c9a77c", price: 8600, blades: null, dobors: [100, 150] },
    { id: "m4", name: "Модерн 5 стекло", maker: "Фабрика «Север»", color: "#f1f1ef", price: 12900, blades: [{ w: 700, from: 791, to: 850 }, { w: 800, from: 851, to: 940 }] },
    { id: "m5", name: "Эко 10", maker: "Дом дверей", color: "#b9b3a8", price: 6900, blades: null },
    { id: "m6", name: "Тоскана", maker: "Дом дверей", color: "#6b5b4b", price: 14200, blades: [{ w: 600, from: 705, to: 775 }, { w: 700, from: 776, to: 845 }, { w: 800, from: 846, to: 935 }] }
  ];
  var DEF = { box: .16, d100: .12, d150: .17, d200: .22, planka: .08, nal: .06, hinge: .045, handle: .12, lock: .08, zav: .06, sill: .1 };
  var uid = 0;
  function newOp(room) { return { id: ++uid, room: room || "", type: "inter", w: "", h: "", depth: "", side: "left", nalF: true, nalB: true, dobor: null, zav: false, hinge: true, handle: true, lock: true, sill: false, blade: "", note: "" }; }
  var S = { obj: { client: "", phone: "", address: "" }, ops: [newOp("Кухня"), newOp("Спальня")], modelId: "m1", manual: { on: false, name: "", maker: "" }, prices: {}, pricesFor: null, disc: "", share: true };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rub(n) { return Math.round(n).toLocaleString("ru-RU") + " ₽"; }
  function curModel() {
    if (S.manual.on) return { id: "manual", manual: true, name: S.manual.name || "Модель вне каталога", maker: S.manual.maker || "Производитель не указан", blades: null };
    return CATALOG.filter(function (x) { return x.id === S.modelId; })[0] || null;
  }
  function bladeOf(m, o) {
    if (o.blade) return { w: +o.blade, src: "manual" };
    if (!m || !m.blades) return { w: null, src: "nosize" };
    var w = parseInt(o.w, 10); if (!w) return { w: null, src: "nowidth" };
    var b = m.blades.filter(function (x) { return w >= x.from && (!x.to || w <= x.to); })[0];
    return b ? { w: b.w, src: "auto" } : { w: null, src: "out" };
  }
  function dobEff(o) { if (o.dobor !== null) return o.dobor; var d = parseInt(o.depth, 10); return !!d && d - BOX > 10; }

  function drawing(o, dEff) {
    var entry = o.type === "entry", arch = o.type === "arch", m = curModel(), leaf = entry ? "#6b5b4b" : (m && m.color) || "#e9e4da";
    var hx = o.side === "left" ? 168 : 392, handleX = o.side === "left" ? 382 : 178;
    var glass = !entry && m && /стекл/i.test(m.name);
    var trim = function (on, off, c) { return on ? '<rect x="' + (150 - off) + '" y="' + (60 - off) + '" width="' + (260 + 2 * off) + '" height="' + (480 + off) + '" fill="none" stroke="' + c + '" stroke-width="12"/>' : ""; };
    return '<svg width="560" height="630" viewBox="0 0 560 630" aria-hidden="true">' +
      '<rect width="560" height="630" rx="14" fill="#e9e7e1"/>' +
      '<rect x="140" y="50" width="280" height="500" fill="#d9d6ce"/>' +
      trim(o.nalB, 14, "#c7a77a") + trim(o.nalF, 7, "#e2c79c") +
      (dEff ? '<rect x="150" y="60" width="260" height="480" fill="none" stroke="#b98a52" stroke-width="10" stroke-dasharray="2 0"/>' : "") +
      '<rect x="155" y="65" width="250" height="475" fill="#fff" stroke="#9c988f" stroke-width="2"/>' +
      (arch ? '<rect x="160" y="70" width="240" height="470" fill="#f3f1ec" stroke="#0002" stroke-dasharray="6 5"/><text x="280" y="310" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="700" font-size="16" fill="#8d8a86">Проём без двери</text>' : '<rect x="160" y="70" width="240" height="470" rx="2" fill="' + leaf + '" stroke="#0004" stroke-width="2"/>') +
      (glass && !arch ? '<rect x="190" y="110" width="180" height="150" fill="#cfe3ea" stroke="#0003"/>' : "") +
      (entry || arch ? "" : '<rect x="' + (o.side === "left" ? 158 : 396) + '" y="130" width="6" height="40" rx="2" fill="#0007"/><rect x="' + (o.side === "left" ? 158 : 396) + '" y="440" width="6" height="40" rx="2" fill="#0007"/>') +
      (o.sill && !arch ? '<rect x="158" y="534" width="244" height="14" rx="2" fill="#8d8a86" stroke="#0004"/>' : "") +
      (arch ? "" : '<circle cx="' + handleX + '" cy="320" r="8" fill="#0008"/>') + '</svg>';
  }
  function chip(top, side, key, label, checked, extra) {
    return '<label class="hot hot--' + side + (checked ? " on" : "") + '" style="top:' + top + 'px"><span class="hot__r"><input type="checkbox" data-k="' + key + '"' + (checked ? " checked" : "") + '> ' + label + '</span>' + (extra || "") + '</label>';
  }
  function opHtml(o, i) {
    var entry = o.type === "entry", arch = o.type === "arch", m = curModel(), bl = bladeOf(m, o), d = parseInt(o.depth, 10), r = d ? d - BOX : null, dEff = dobEff(o);
    var note = !d ? "Укажите глубину" : (r <= 10 ? "Остаток " + Math.max(r, 0) + " мм, добор не нужен" : "Остаток " + r + " мм");
    var hs = o.side === "left" ? "l" : "r", os = o.side === "left" ? "r" : "l";
    var chips = chip(70, os, "nalF", "Наличник, лицевая", o.nalF) + chip(112, os, "nalB", "Наличник, обратная", o.nalB) +
      chip(440, hs, "dobor", "Добор", dEff, '<span class="hot__n" data-dn>' + note + '</span>');
    if (!arch) chips += chip(500, os, "sill", "Порог", o.sill);
    if (!entry && !arch) chips += chip(140, hs, "hinge", "Петли, 2 шт", o.hinge) + chip(330, os, "handle", "Ручка", o.handle) + chip(372, os, "lock", "Замок", o.lock) + chip(414, os, "zav", "Завёртка", o.zav);
    return '<div class="opc" data-id="' + o.id + '"><div class="stagebox"><div class="stage">' + drawing(o, dEff) + chips +
      '<div class="hin hin--w"><label>Ширина, мм</label><input data-k="w" type="number" inputmode="numeric" value="' + esc(o.w) + '" placeholder="900"></div>' +
      '<div class="hin hin--h"><label>Высота, мм</label><input data-k="h" type="number" inputmode="numeric" value="' + esc(o.h) + '" placeholder="2050"></div>' +
      '<div class="hin hin--d"><label>Глубина стены, мм</label><input data-k="depth" type="number" inputmode="numeric" value="' + esc(o.depth) + '" placeholder="250"></div></div></div>' +
      '<div class="opts"><h3><span class="op__n">' + (i + 1) + '</span><input data-k="room" value="' + esc(o.room) + '" placeholder="Помещение" style="font-weight:700"></h3>' +
      '<div class="seg"><button data-act="type" data-v="inter" class="' + (!entry && !arch ? "on" : "") + '">Межкомнатная</button><button data-act="type" data-v="entry" class="' + (entry ? "on" : "") + '">Входная</button><button data-act="type" data-v="arch" class="' + (arch ? "on" : "") + '">Без двери</button></div>' +
      (arch ? "" : '<div><div class="note" style="margin-bottom:4px">Открывание (петли)</div><div class="seg"><button data-act="side" data-v="left" class="' + (o.side === "left" ? "on" : "") + '">Слева</button><button data-act="side" data-v="right" class="' + (o.side === "right" ? "on" : "") + '">Справа</button></div></div>') +
      (arch ? '<div class="mini">Облагораживание проёма без двери: только добор и наличники.</div>' : entry ? '<div class="mini">Входная считается в общем заказе: только добор и наличники.</div>' :
        '<div class="mini" data-bl>Полотно: <span data-bt>' + bladeText(bl, m) + '</span><input data-k="blade" type="number" value="' + esc(o.blade) + '" placeholder="Своя ширина полотна, мм" style="margin-top:6px"></div>') +
      '<div class="sp2"><button class="btn sm" data-act="dup">Копировать</button><button class="btn sm ghost" data-act="del"' + (S.ops.length < 2 ? " disabled" : "") + '>Удалить</button></div>' +
      '<p class="note">Отмечайте нужное прямо на проёме. Добор отмечается сам, если указана глубина.</p></div></div>';
  }
  function bladeText(bl, m) {
    if (bl.src === "manual") return "<b>" + bl.w + " мм</b> (вручную)";
    if (bl.src === "auto") return "<b>" + bl.w + " мм</b> (из размеров модели)";
    if (bl.src === "out") return "<b>проём вне диапазона модели</b>";
    if (bl.src === "nowidth") return "укажите ширину проёма";
    return "размеров модели нет, внесите вручную";
  }
  function fit() {
    document.querySelectorAll(".stagebox").forEach(function (b) {
      var s = Math.min(1, b.clientWidth / 560), st = b.firstChild; st.style.transform = "scale(" + s + ")"; b.style.height = Math.round(630 * s) + "px";
    });
  }
  window.addEventListener("resize", fit);

  function calc() {
    var m = curModel(), rows = {}, order = [], per = [], sizes = (m && m.dobors) || [100, 150, 200], box = 0, groups = {};
    function add(k, name, q) { if (!rows[k]) { rows[k] = { k: k, name: name, q: 0 }; order.push(k); } rows[k].q += q; }
    S.ops.forEach(function (o, i) {
      var inter = o.type === "inter", info = { i: i, o: o, lines: [] }; per.push(info);
      if (o.type === "arch") info.lines.push("Без двери: облагораживание");
      if (inter) {
        var p = bladeOf(m, o);
        if (p.w) { add("blade" + p.w, "Полотно " + p.w + " мм", 1); info.lines.push("Полотно " + p.w + " мм"); } else { add("blade?", "Полотно (ширина не определена)", 1); info.lines.push("Полотно: ширина не определена"); }
        box += 2.5; info.lines.push("Коробка");
        if (o.hinge) add("hinge", "Петли", 2); if (o.handle) add("handle", "Ручка", 1); if (o.lock) add("lock", "Замок", 1); if (o.zav) { add("zav", "Завёртка", 1); info.lines.push("Завёртка"); }
      }
      if (o.sill) { add("sill", "Порог", 1); info.lines.push("Порог"); }
      var nq = (o.nalF ? 2.5 : 0) + (o.nalB ? 2.5 : 0);
      if (nq) { add("nal", "Наличник", nq); info.lines.push("Наличник " + String(nq).replace(".", ",") + " шт"); }
      var d = parseInt(o.depth, 10);
      if (!dobEff(o)) { info.lines.push(d ? "Добор не нужен" : "Добор: глубина не указана"); return; }
      if (!d) { info.lines.push("Добор: глубина не указана"); return; }
      var r = d - BOX; info.R = r;
      if (r <= 0) { info.lines.push("Добор: остаток 0 мм"); return; }
      var single = sizes.filter(function (z) { return r <= z + 10; })[0];
      if (single) {
        info.dob = { size: single, sets: 1, planks: 0 };
        var sh = o.type !== "entry" && S.share ? sizes.filter(function (z) { return r <= z / 2 - 5; })[0] : null;
        if (sh) (groups[sh] = groups[sh] || []).push(info);
      } else {
        for (var k = 2; k <= 4 && !info.dob; k++) { var z = sizes.filter(function (zz) { return r / k <= zz + 10; })[0]; if (z) info.dob = { size: z, sets: k, planks: k - 1, split: true }; }
        if (!info.dob) info.lines.push("Остаток " + r + " мм: добор вручную");
      }
    });
    Object.keys(groups).forEach(function (z) {
      var g = groups[z]; if (g.length < 2) return;
      g.forEach(function (inf, idx) { inf.dob = { size: +z, sets: 0, shared: true, mate: g[idx % 2 ? idx - 1 : Math.min(idx + 1, g.length - 1)].i + 1 }; });
      for (var j = 0; j < g.length; j += 2) g[j].dob.sets = 1;
    });
    var dq = {}, pl = 0;
    per.forEach(function (inf) {
      var b = inf.dob; if (!b) return;
      if (b.shared) inf.lines.push("Добор " + b.size + (b.sets ? ": общий комплект с проёмом " + b.mate : ": на комплекте проёма " + b.mate));
      else if (b.split) inf.lines.push("Остаток " + inf.R + " мм: " + b.sets + " комплекта добора " + b.size + " и стыковочная планка");
      else inf.lines.push("Добор " + b.size + ", остаток " + inf.R + " мм");
      dq[b.size] = (dq[b.size] || 0) + b.sets * 2.5; if (b.planks) pl += 2.5 * b.planks;
    });
    var out = [];
    order.forEach(function (k) { if (/^blade/.test(k)) out.push(rows[k]); });
    if (box) out.push({ k: "box", name: "Коробка", q: box });
    Object.keys(dq).sort().forEach(function (z) { out.push({ k: "d" + z, name: "Добор " + z + " мм", q: dq[z] }); });
    if (pl) out.push({ k: "planka", name: "Стыковочная планка", q: pl });
    ["nal", "hinge", "handle", "lock", "zav", "sill"].forEach(function (k) { if (rows[k]) out.push(rows[k]); });
    out.forEach(function (r) { r.q = Math.ceil(r.q - 1e-9); r.pk = /^blade/.test(r.k) ? "blade" : r.k; });
    return { per: per, rows: out };
  }
  function initPrices() {
    var m = curModel(), key = m ? m.id : "none";
    if (S.pricesFor === key) return; S.pricesFor = key; S.prices = {};
    if (m && !m.manual) { S.prices.blade = m.price; Object.keys(DEF).forEach(function (k) { S.prices[k] = Math.round(m.price * DEF[k] / 10) * 10; }); }
  }
  function priceOf(r) { var v = S.prices[r.pk]; return v === "" || v == null ? null : +v; }
  function totals(res) {
    var sum = 0, none = 0; res.rows.forEach(function (r) { var p = priceOf(r); if (p == null) none++; else sum += p * r.q; });
    var dp = Math.min(Math.max(parseFloat(String(S.disc).replace(",", ".")) || 0, 0), 100), dsc = Math.round(sum * dp / 100);
    return { sum: sum, none: none, dp: dp, dsc: dsc, total: sum - dsc };
  }
  function totHtml(res) {
    var t = totals(res);
    return '<table><tbody><tr><td>Без скидки</td><td style="text-align:right"><b>' + rub(t.sum) + '</b></td></tr><tr><td>Скидка ' + (t.dp ? t.dp + " %" : "") + '</td><td style="text-align:right">' + (t.dsc ? "− " + rub(t.dsc) : "—") + '</td></tr>' +
      '<tr><td><b>Итого</b></td><td style="text-align:right;font-size:22px;color:var(--brand)"><b>' + rub(t.total) + '</b></td></tr>' + (t.dsc ? '<tr><td colspan="2"><span class="tag ok">Выгода клиента: ' + rub(t.dsc) + '</span></td></tr>' : "") + '</tbody></table>' +
      (t.none ? '<p class="note" style="margin-top:8px"><span class="tag warn">Цена не задана: ' + t.none + ' поз.</span></p>' : "");
  }
  function specHtml(res) {
    return res.rows.map(function (r) {
      var p = priceOf(r);
      return '<tr data-rk="' + r.k + '"><td>' + esc(r.name) + '</td><td>' + r.q + ' шт</td><td><div class="unit" style="width:120px"><input data-pr="' + r.pk + '" type="number" value="' + esc(S.prices[r.pk] == null ? "" : S.prices[r.pk]) + '" placeholder="Цена"><span>₽</span></div></td><td data-sum style="text-align:right">' + (p == null ? '<span class="tag warn">Цена не задана</span>' : rub(p * r.q)) + '</td></tr>';
    }).join("");
  }

  var PL = [["blade", "Полотно"], ["box", "Коробка"], ["d100", "Добор 100"], ["d150", "Добор 150"], ["d200", "Добор 200"], ["planka", "Стыковочная планка"], ["nal", "Наличник"], ["sill", "Порог"], ["hinge", "Петля"], ["handle", "Ручка"], ["lock", "Замок"], ["zav", "Завёртка"]];
  function modelCard() {
    var m = curModel();
    var own = '<button class="mcard mcard--own' + (S.manual.on ? " sel" : "") + '" data-pick="manual"><span class="mplus">+</span><b>Вне каталога</b><small>Своя модель и цены вручную</small></button>';
    var cards = CATALOG.map(function (x) {
      return '<button class="mcard' + (!S.manual.on && S.modelId === x.id ? " sel" : "") + '" data-pick="' + x.id + '"><span class="mdoor" style="background:' + x.color + '"></span><b>' + esc(x.name) + '</b><small>' + esc(x.maker) + '</small><small>от ' + rub(x.price) + '</small>' + (x.blades ? '<span class="tag ok">размеры есть</span>' : '<span class="tag warn">размеров нет</span>') + '</button>';
    }).join("");
    var body = S.manual.on
      ? '<div class="manual" style="margin-top:12px"><div class="grid g2"><label class="f">Название модели<input data-m="name" value="' + esc(S.manual.name) + '" placeholder="Например, Престиж 7"></label><label class="f">Производитель<input data-m="maker" value="' + esc(S.manual.maker) + '" placeholder="Необязательно"></label></div><p class="note" style="margin-top:8px">Ширину полотна вводите в каждом проёме. Цены ниже необязательны: без цены позиция считается по количеству.</p></div>'
      : '<p class="note" style="margin-top:10px">Выбрано: <b>' + esc(m ? m.name : "модель не выбрана") + '</b>' + (m && m.blades ? ". Размеры полотен подставляются из каталога." : ". Размеров нет: ширину полотна вводите в проёме.") + '</p>';
    var prices = '<details class="pl"' + (S.manual.on ? " open" : "") + '><summary>Цены за штуку, ₽</summary><div class="grid g4" style="margin-top:10px">' + PL.map(function (x) { return '<label class="f">' + x[1] + '<div class="unit"><input data-pr="' + x[0] + '" type="number" value="' + esc(S.prices[x[0]] == null ? "" : S.prices[x[0]]) + '" placeholder="не задана"><span>₽</span></div></label>'; }).join("") + '</div></details>';
    return '<section class="card" id="model"><h2>Модель и цены</h2><p class="sub">Выберите модель из каталога «Оптовика» или введите свою вручную. Цены за штуку можно изменить в любом случае.</p><div class="mscroll">' + own + cards + '</div>' + body + prices + '</section>';
  }
  function view() {
    initPrices();
    var res = calc(), m = curModel();
    var makers = CATALOG.map(function (x) { return '<option value="' + x.id + '"' + (!S.manual.on && S.modelId === x.id ? " selected" : "") + ">" + esc(x.name) + " · " + esc(x.maker) + "</option>"; }).join("");
    return '<div class="lay"><div>' +
      '<details class="obj"><summary>Данные заказчика (необязательно)</summary><div class="grid g3"><label class="f">Заказчик<input data-o="client" value="' + esc(S.obj.client) + '"></label><label class="f">Телефон<input data-o="phone" value="' + esc(S.obj.phone) + '"></label><label class="f">Адрес<input data-o="address" value="' + esc(S.obj.address) + '"></label></div></details>' +
      modelCard() + '<section class="card"><h2>Сколько проёмов</h2><div class="sum"><div class="stepper"><button data-act="minus" aria-label="Меньше">−</button><b id="cnt">' + S.ops.length + '</b><button data-act="plus" aria-label="Больше">+</button></div><span class="note">Введите размеры прямо на проёме. Добор появится, если указана глубина стены.</span></div></section>' +
      '<div id="ops">' + S.ops.map(opHtml).join("") + '</div>' +
      '<section class="card"><h2>Спецификация и цены</h2><p class="sub">Количество по заказу, округлено вверх. Цены за штуку из каталога или вручную.</p><div style="overflow:auto"><table><thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена за шт.</th><th style="text-align:right">Сумма</th></tr></thead><tbody id="spec">' + specHtml(res) + '</tbody></table></div></section>' +
      '</div><aside class="aside">' +
      '<section class="card"><h2>Итог</h2><label class="f" style="margin:8px 0">Скидка, %<div class="unit" style="max-width:140px"><input data-disc type="number" min="0" max="100" value="' + esc(S.disc) + '" placeholder="0"><span>%</span></div></label><div id="tot">' + totHtml(res) + '</div>' +
      '<label class="chk" style="margin-top:10px"><input type="checkbox" data-share' + (S.share ? " checked" : "") + '> Делить добор между проёмами</label>' +
      '<a class="btn pri" id="offer" target="_blank" href="#" style="display:block;text-align:center;text-decoration:none;margin-top:12px" data-offer>Предложение PDF</a><p class="note" style="margin-top:8px">Макет предложения с логотипом и контактами партнёра. Сравнение моделей будет на следующем шаге.</p></section></aside></div>';
  }
  function render() { var y = window.scrollY; $("#view").innerHTML = view(); fit(); window.scrollTo(0, y); }
  function live() { var res = calc(); $("#tot").innerHTML = totHtml(res); $("#spec").innerHTML = specHtml(res); }
  function offerHref() {
    var res = calc(), t = totals(res), m = curModel();
    var pl = { obj: S.obj, model: { name: m ? m.name : "Модель не выбрана", maker: m ? m.maker : "" }, disc: t.dp,
      per: res.per.map(function (inf) { var o = inf.o; return { n: inf.i + 1, room: o.room, type: o.type === "entry" ? "Входная" : o.type === "arch" ? "Без двери (облагораживание)" : "Межкомнатная", size: (o.w || "?") + " × " + (o.h || "?") + (o.depth ? ", стена " + o.depth : ""), lines: inf.lines }; }),
      rows: res.rows.map(function (r) { var p = priceOf(r); return [r.name, r.q, p]; }) };
    return "./offer.html#" + btoa(unescape(encodeURIComponent(JSON.stringify(pl))));
  }
  function opById(id) { return S.ops.filter(function (o) { return o.id == id; })[0]; }

  document.addEventListener("mouseover", function (e) { var a = e.target.closest("[data-offer]"); if (a) a.href = offerHref(); });
  document.addEventListener("focusin", function (e) { var a = e.target.closest && e.target.closest("[data-offer]"); if (a) a.href = offerHref(); });
  document.addEventListener("click", function (e) {
    var of = e.target.closest("[data-offer]"); if (of) { of.href = offerHref(); return; }
    var pk = e.target.closest("[data-pick]"); if (pk) { var v = pk.getAttribute("data-pick"); if (v === "manual") S.manual.on = true; else { S.manual.on = false; S.modelId = v; } S.ops.forEach(function (x) { x.blade = ""; }); render(); return; }
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.getAttribute("data-act"), el = e.target.closest(".opc"), o = el && opById(el.getAttribute("data-id"));
    if (a === "plus") S.ops.push(newOp()); else if (a === "minus") { if (S.ops.length > 1) S.ops.pop(); }
    else if (a === "del") S.ops.splice(S.ops.indexOf(o), 1);
    else if (a === "dup") S.ops.splice(S.ops.indexOf(o) + 1, 0, Object.assign({}, o, { id: ++uid }));
    else if (a === "type") { o.type = b.getAttribute("data-v"); o.nalF = true; o.nalB = o.type !== "entry"; if (o.type === "arch") o.sill = false; }
    else if (a === "side") o.side = b.getAttribute("data-v");
    render();
  });
  document.addEventListener("input", function (e) {
    var t = e.target, el = t.closest(".opc");
    if (t.hasAttribute("data-disc")) { S.disc = t.value; $("#tot").innerHTML = totHtml(calc()); return; }
    if (t.hasAttribute("data-pr")) { S.prices[t.getAttribute("data-pr")] = t.value; document.querySelectorAll('[data-pr="' + t.getAttribute("data-pr") + '"]').forEach(function (i2) { if (i2 !== t) i2.value = t.value; }); var res = calc(); $("#tot").innerHTML = totHtml(res); res.rows.forEach(function (r) { var tr = $('[data-rk="' + r.k + '"]'); if (!tr) return; var p = priceOf(r); tr.querySelector("[data-sum]").innerHTML = p == null ? '<span class="tag warn">Цена не задана</span>' : rub(p * r.q); }); return; }
    if (t.hasAttribute("data-o")) { S.obj[t.getAttribute("data-o")] = t.value; return; }
    if (t.hasAttribute("data-share")) { S.share = t.checked; live(); return; }
    if (t.hasAttribute("data-model")) { if (t.value) { S.manual.on = false; S.modelId = t.value; } else S.manual.on = true; S.ops.forEach(function (x) { x.blade = ""; }); render(); return; }
    if (t.hasAttribute("data-m")) { S.manual[t.getAttribute("data-m")] = t.value; return; }
    if (el && t.hasAttribute("data-k")) {
      var o = opById(el.getAttribute("data-id")), k = t.getAttribute("data-k");
      o[k] = t.type === "checkbox" ? t.checked : t.value;
      if (k === "room") return;
      if (k === "depth" || k === "dobor") { if (k === "depth") o.dobor = null; var d = parseInt(o.depth, 10), r = d - BOX; $("[data-dn]", el).textContent = !d ? "Укажите глубину" : (r <= 10 ? "Остаток " + Math.max(r, 0) + " мм, добор не нужен" : "Остаток " + r + " мм"); if (k === "depth") { var cb = $('[data-k=dobor]', el); cb.checked = dobEff(o); } }
      if (k === "w" || k === "blade") { var m2 = curModel(), bt = $("[data-bt]", el); if (bt) bt.innerHTML = bladeText(bladeOf(m2, o), m2); }
      if (t.type === "checkbox" && ["nalF","nalB","dobor","hinge","handle","lock","zav","sill"].indexOf(k) > -1) { render(); return; }
      live();
    }
  });
  render();
})();
