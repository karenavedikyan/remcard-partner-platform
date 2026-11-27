(function () {
  "use strict";
  var BOX = 65; // вычет под дверную коробку, мм (настройка по умолчанию)
  var CATALOG = [
    { id: "m1", name: "Скандинавия 01", maker: "Фабрика «Север»", color: "#e9e4da", price: 9800,
      blades: [{ w: 600, from: 720, to: 790 }, { w: 700, from: 791, to: 850 }, { w: 800, from: 851, to: 940 }, { w: 900, from: 941, to: 1040 }] },
    { id: "m2", name: "Лофт 2", maker: "Вега", color: "#8d8a86", price: 11400,
      blades: [{ w: 600, from: 700, to: 770 }, { w: 700, from: 771, to: 840 }, { w: 800, from: 841, to: 930 }, { w: 900, from: 931, to: 1020 }] },
    { id: "m3", name: "Классика Н", maker: "Вега", color: "#c9a77c", price: 8600, blades: null, dobors: [100, 150] },
    { id: "m4", name: "Модерн 5 стекло", maker: "Фабрика «Север»", color: "#f1f1ef", price: 12900,
      blades: [{ w: 700, from: 791, to: 850 }, { w: 800, from: 851, to: 940 }] },
    { id: "m5", name: "Эко 10", maker: "Дом дверей", color: "#b9b3a8", price: 6900, blades: null },
    { id: "m6", name: "Тоскана", maker: "Дом дверей", color: "#6b5b4b", price: 14200,
      blades: [{ w: 600, from: 705, to: 775 }, { w: 700, from: 776, to: 845 }, { w: 800, from: 846, to: 935 }] }
  ];
  var uid = 0;
  function newOp(n) { return { id: ++uid, room: n ? "" : "", type: "inter", w: "", h: "", depth: "", side: "left", glass: false, complex: false, addons: "no", note: "", blade: "" }; }
  var S = {
    step: 1,
    obj: { client: "", address: "", phone: "", floor: "ready" },
    ops: [newOp(), newOp()],
    tab: "catalog", q: "", maker: "", modelId: null,
    manual: { name: "", maker: "", blades: [{ w: "", from: "", to: "" }] },
    prices: {}, pricesFor: null, disc: "",
    opt: { dobor: true, planka: true, nal: true, hinge: true, handle: true, lock: true, share: true }, zav: {}
  };
  S.ops[0].room = "Кухня"; S.ops[1].room = "Спальня";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rub(n) { return n.toLocaleString("ru-RU") + " ₽"; }

  function steps() {
    var names = ["Замер", "Модель", "Расчёт"];
    $("#steps").innerHTML = names.map(function (t, i) {
      var n = i + 1, c = n === S.step ? "on" : (n < S.step ? "done" : "");
      return '<li class="' + c + '"><i>' + (n < S.step ? "✓" : n) + "</i>" + t + "" + "</li>";
    }).join("");
  }

  function depthHint(o) {
    var d = parseInt(o.depth, 10);
    if (!d) return "Глубина стены не указана: добор считаться не будет.";
    var r = d - BOX;
    if (o.type === "entry" && o.addons === "no") return "Доборы на входную не устанавливаются.";
    if (r <= 10) return "Остаток под добор: <b>" + Math.max(r, 0) + " мм</b> (до 10 мм добор не нужен).";
    return "Остаток под добор: <b>" + r + " мм</b> (глубина " + d + " − коробка " + BOX + ").";
  }

  function opHtml(o, i) {
    var entry = o.type === "entry";
    return '<div class="op" data-id="' + o.id + '">' +
      '<div class="op__h"><span class="op__n">' + (i + 1) + '</span><b>Проём ' + (i + 1) + '</b>' +
      '<div class="seg" role="group" aria-label="Тип двери"><button data-act="type" data-v="inter" class="' + (!entry ? "on" : "") + '">Межкомнатная</button><button data-act="type" data-v="entry" class="' + (entry ? "on" : "") + '">Входная</button></div>' +
      '<div class="sp"><button class="btn sm" data-act="dup">Копировать</button><button class="btn sm ghost" data-act="del"' + (S.ops.length < 2 ? " disabled" : "") + '>Удалить</button></div></div>' +
      '<div class="grid g4">' +
      '<label class="f">Помещение<input data-k="room" value="' + esc(o.room) + '" placeholder="Например, кухня"></label>' +
      '<label class="f">Ширина проёма<div class="unit"><input data-k="w" type="number" inputmode="numeric" value="' + esc(o.w) + '" placeholder="900"><span>мм</span></div></label>' +
      '<label class="f">Высота проёма<div class="unit"><input data-k="h" type="number" inputmode="numeric" value="' + esc(o.h) + '" placeholder="2050"><span>мм</span></div></label>' +
      '<label class="f">' + (entry ? "Глубина стены (колонка «Вход»)" : "Глубина стены") + '<div class="unit"><input data-k="depth" type="number" inputmode="numeric" value="' + esc(o.depth) + '" placeholder="250"><span>мм</span></div></label>' +
      '</div>' +
      '<div class="grid g4" style="margin-top:12px">' +
      '<label class="f">Открывание<select data-k="side"><option value="left"' + (o.side === "left" ? " selected" : "") + '>Левое</option><option value="right"' + (o.side === "right" ? " selected" : "") + '>Правое</option></select></label>' +
      (entry ? '<label class="f">Доборы на входную<select data-k="addons"><option value="yes"' + (o.addons === "yes" ? " selected" : "") + '>Устанавливать</option><option value="no"' + (o.addons === "no" ? " selected" : "") + '>Не устанавливать</option></select></label>' : '<div></div>') +
      '<label class="f" style="justify-content:flex-end"><span class="chk"><input type="checkbox" data-k="glass"' + (o.glass ? " checked" : "") + '> Остекление</span></label>' +
      '<label class="f" style="justify-content:flex-end"><span class="chk"><input type="checkbox" data-k="complex"' + (o.complex ? " checked" : "") + '> Сложный проём</span></label>' +
      '</div>' +
      '<label class="f" style="margin-top:12px">Комментарий (для услуг: подрезка, роспуск наличника)<input data-k="note" value="' + esc(o.note) + '" placeholder="Необязательно"></label>' +
      '<div class="hint" data-hint>' + depthHint(o) + '</div></div>';
  }

  function step1() {
    var missing = S.ops.filter(function (o) { return !o.w || !o.h; }).length;
    return '<section class="card"><h2>Объект</h2><p class="sub">Поля необязательные. Нужны для заявки и коммерческого предложения.</p>' +
      '<div class="grid g4">' +
      '<label class="f">Заказчик<input data-o="client" value="' + esc(S.obj.client) + '" placeholder="Имя клиента"></label>' +
      '<label class="f">Телефон<input data-o="phone" value="' + esc(S.obj.phone) + '" placeholder="+7"></label>' +
      '<label class="f">Адрес объекта<input data-o="address" value="' + esc(S.obj.address) + '" placeholder="Город, улица"></label>' +
      '<label class="f">Пол<select data-o="floor"><option value="ready"' + (S.obj.floor === "ready" ? " selected" : "") + '>Готовый пол</option><option value="screed"' + (S.obj.floor === "screed" ? " selected" : "") + '>Черновая стяжка</option></select></label>' +
      '</div></section>' +
      '<section class="card"><h2>Проёмы</h2><p class="sub">Укажите количество проёмов и данные замера по каждому. Глубина стены нужна для добора, её можно оставить пустой.</p>' +
      '<div class="sum" style="margin-bottom:14px"><span class="note">Количество проёмов</span><div class="stepper"><button data-act="minus" aria-label="Меньше">−</button><b id="cnt">' + S.ops.length + '</b><button data-act="plus" aria-label="Больше">+</button></div></div>' +
      S.ops.map(opHtml).join("") +
      '<div class="bar"><button class="btn" data-act="add">Добавить проём</button><span class="note" id="miss">' + (missing ? "Без ширины или высоты: " + missing + ". Расчёт по ним будет неполным." : "Все проёмы с шириной и высотой.") + '</span>' +
      '<button class="btn pri sp" data-act="to2">Далее: выбор модели</button></div></section>';
  }

  function allModels() { return CATALOG; }
  function curModel() {
    if (S.tab === "manual") {
      var m = S.manual, bl = m.blades.filter(function (b) { return b.w; }).map(function (b) { return { w: +b.w, from: +b.from || 0, to: +b.to || 0 }; });
      return (m.name || bl.length) ? { id: "manual", name: m.name || "Модель без названия", maker: m.maker || "Производитель не указан", manual: true, blades: bl.length ? bl : null } : null;
    }
    return CATALOG.filter(function (x) { return x.id === S.modelId; })[0] || null;
  }
  function pick(model, o) {
    if (o.blade) return { w: +o.blade, src: "manual" };
    if (!model) return null;
    if (!model.blades) return { w: null, src: "nosize" };
    var w = parseInt(o.w, 10);
    if (!w) return { w: null, src: "nowidth" };
    var b = model.blades.filter(function (x) { return w >= x.from && (!x.to || w <= x.to); })[0];
    return b ? { w: b.w, src: "auto" } : { w: null, src: "out" };
  }

  function modelsHtml() {
    var q = S.q.toLowerCase();
    var list = allModels().filter(function (m) { return (!S.maker || m.maker === S.maker) && (!q || (m.name + " " + m.maker).toLowerCase().indexOf(q) > -1); });
    var makers = Array.from(new Set(CATALOG.map(function (m) { return m.maker; })));
    return '<div class="tools"><input data-q placeholder="Поиск по модели" value="' + esc(S.q) + '"><select data-maker><option value="">Все производители</option>' +
      makers.map(function (x) { return '<option' + (S.maker === x ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + '</select></div>' +
      (list.length ? '<div class="models">' + list.map(function (m) {
        return '<div class="model' + (S.modelId === m.id ? " sel" : "") + '" data-model="' + m.id + '" tabindex="0" role="button">' +
          '<div class="door"><i style="background:' + m.color + '"></i></div><h3>' + esc(m.name) + '</h3><span class="mf">' + esc(m.maker) + '</span>' +
          '<div class="row"><span class="pr">от ' + rub(m.price) + '</span>' +
          (m.blades ? '<span class="tag ok">Размеры из каталога</span>' : '<span class="tag warn">Размеров нет, внести вручную</span>') + '</div>' +
          (m.blades ? '<span class="note">Полотна: ' + m.blades.map(function (b) { return b.w; }).join(", ") + ' мм</span>' : "") + '</div>';
      }).join("") + "</div>" : '<div class="empty">Ничего не найдено</div>');
  }

  function manualHtml() {
    var m = S.manual;
    return '<div class="manual"><div class="grid g2"><label class="f">Название модели<input data-m="name" value="' + esc(m.name) + '" placeholder="Модели нет в каталоге"></label>' +
      '<label class="f">Производитель<input data-m="maker" value="' + esc(m.maker) + '" placeholder="Необязательно"></label></div>' +
      '<p class="note" style="margin:12px 0 8px">Размеры полотен этой модели (можно оставить пустыми, тогда ширину полотна вводите по проёмам ниже). Диапазон показывает, на какую ширину проёма подходит полотно.</p>' +
      m.blades.map(function (b, i) {
        return '<div class="blade-row" data-bi="' + i + '"><label class="f">Полотно<div class="unit"><input data-b="w" type="number" value="' + esc(b.w) + '" placeholder="800"><span>мм</span></div></label>' +
          '<label class="f">Проём от<div class="unit"><input data-b="from" type="number" value="' + esc(b.from) + '"><span>мм</span></div></label>' +
          '<label class="f">Проём до<div class="unit"><input data-b="to" type="number" value="' + esc(b.to) + '"><span>мм</span></div></label>' +
          '<button class="btn sm ghost" data-act="delb" aria-label="Удалить">×</button></div>';
      }).join("") + '<button class="btn sm" data-act="addb">Добавить размер полотна</button>' +
      '<p class="note" style="margin-top:10px">Цены этой модели вносятся на шаге расчёта.</p></div>';
  }

  function fitHtml() {
    var m = curModel();
    if (!m) return "";
    var rows = S.ops.map(function (o, i) {
      var p = pick(m, o), st;
      if (p.src === "manual") st = '<span class="tag off">Вручную</span>';
      else if (p.src === "auto") st = '<span class="tag ok">Подошло из размеров модели</span>';
      else if (p.src === "out") st = '<span class="tag red">Проём вне диапазона модели</span>';
      else if (p.src === "nowidth") st = '<span class="tag warn">Не указана ширина проёма</span>';
      else st = '<span class="tag warn">Размеров модели нет</span>';
      return "<tr data-fid=\"" + o.id + '"><td>' + (i + 1) + ". " + esc(o.room || "Проём") + "</td><td>" + (o.type === "entry" ? "Входная" : "Межкомнатная") + "</td><td>" + (o.w ? o.w + " × " + (o.h || "?") : "не указан") + "</td>" +
        '<td><div class="unit" style="width:120px"><input data-bl type="number" value="' + esc(o.blade || (p.src === "auto" ? p.w : "")) + '" placeholder="Ширина"><span>мм</span></div></td><td data-st>' + st + "</td></tr>";
    }).join("");
    return '<section class="card"><h2>Полотно по проёмам: ' + esc(m.name) + '</h2><p class="sub">Размер подставлен из данных модели. Любое значение можно изменить, на каталог это не повлияет.</p>' +
      '<div style="overflow:auto"><table><thead><tr><th>Проём</th><th>Тип</th><th>Проём, мм</th><th>Ширина полотна</th><th>Источник</th></tr></thead><tbody>' + rows + "</tbody></table></div></section>";
  }

  function step2() {
    var m = curModel();
    return '<section class="card"><h2>Модель</h2><p class="sub">Выберите модель из каталога «Оптовика» или введите свою. Один выбор применяется ко всем проёмам.</p>' +
      '<div class="seg" style="margin-bottom:14px"><button data-act="tab" data-v="catalog" class="' + (S.tab === "catalog" ? "on" : "") + '">Из каталога</button><button data-act="tab" data-v="manual" class="' + (S.tab === "manual" ? "on" : "") + '">Вне каталога</button></div>' +
      '<div id="tabbody">' + (S.tab === "catalog" ? modelsHtml() : manualHtml()) + "</div></section>" +
      '<div id="fit">' + fitHtml() + "</div>" +
      '<div class="bar"><button class="btn" data-act="to1">Назад к замеру</button>' +
      '<span class="note" id="sel">' + (m ? "Выбрано: <b>" + esc(m.name) + "</b>" : "Модель не выбрана") + '</span>' +
      '<button class="btn pri sp" data-act="to3">Рассчитать</button></div>' +
      '<p class="note" style="text-align:right;margin-top:6px">Без модели расчёт тоже работает: количество по замеру, цены вносятся вручную.</p>';
  }

  var DEF = { box: .16, d100: .12, d150: .17, d200: .22, planka: .08, nal: .06, hinge: .045, handle: .12, lock: .08, zav: .06 };
  function initPrices() {
    var m = curModel(), key = S.tab + ":" + (m ? m.id + m.name : "none");
    if (S.pricesFor === key) return;
    S.pricesFor = key; S.prices = {};
    if (m && !m.manual) {
      S.prices.blade = m.price;
      Object.keys(DEF).forEach(function (k) { S.prices[k] = Math.round(m.price * DEF[k] / 10) * 10; });
    }
  }
  function calc() {
    var m = curModel(), rows = {}, order = [], per = [], sizes = (m && m.dobors) || [100, 150, 200], O = S.opt;
    function add(k, name, q) { if (!rows[k]) { rows[k] = { k: k, name: name, q: 0 }; order.push(k); } rows[k].q += q; }
    var box = 0, groups = {};
    S.ops.forEach(function (o, i) {
      var inter = o.type !== "entry", info = { i: i, o: o, lines: [] }; per.push(info);
      if (inter) {
        var p = pick(m, o);
        if (p && p.w) { add("blade" + p.w, "Полотно " + p.w + " мм", 1); info.lines.push("Полотно " + p.w + " мм"); }
        else { add("blade?", "Полотно (ширина не определена)", 1); info.lines.push("Полотно: ширина не определена"); }
        box += 2.5; info.lines.push("Коробка 2,5 шт");
        if (O.hinge) add("hinge", "Петли", 2);
        if (O.handle) add("handle", "Ручка", 1);
        if (O.lock) add("lock", "Замок", 1);
        if (S.zav[o.id]) add("zav", "Завертка", 1);
      }
      var nq = inter ? 5 : (o.addons === "yes" ? 2.5 : 0);
      if (O.nal && nq) { add("nal", "Наличник", nq); info.lines.push("Наличник " + String(nq).replace(".", ",") + " шт"); }
      var d = parseInt(o.depth, 10);
      if (!O.dobor) { info.lines.push("Добор отключён"); return; }
      if (!inter && o.addons !== "yes") { info.lines.push("Добор на входную не устанавливается"); return; }
      if (!d) { info.lines.push("Глубина стены не указана, добор не считается"); return; }
      var r = d - BOX; info.R = r;
      if (r <= 10) { info.lines.push("Добор не нужен (остаток " + Math.max(r, 0) + " мм)"); return; }
      var single = sizes.filter(function (z) { return r <= z + 10; })[0];
      if (single) {
        info.dob = { size: single, sets: 1, planks: 0 };
        var sh = inter && O.share ? sizes.filter(function (z) { return r <= z / 2 - 5; })[0] : null;
        if (sh) (groups[sh] = groups[sh] || []).push(info);
      } else {
        for (var k = 2; k <= 4 && !info.dob; k++) {
          var z = sizes.filter(function (zz) { return r / k <= zz + 10; })[0];
          if (z) info.dob = { size: z, sets: k, planks: k - 1, split: true };
        }
        if (!info.dob) { info.lines.push("Остаток " + r + " мм: добор вручную"); }
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
      if (b.shared) { inf.lines.push("Добор " + b.size + (b.sets ? ": общий комплект с проёмом " + b.mate : ": использует комплект проёма " + b.mate)); }
      else if (b.split) { inf.lines.push("Остаток " + inf.R + " мм: " + b.sets + " комплекта добора " + b.size + " и стыковочная планка"); }
      else inf.lines.push("Добор " + b.size + ", остаток " + inf.R + " мм");
      dq[b.size] = (dq[b.size] || 0) + b.sets * 2.5;
      if (O.planka && b.planks) pl += 2.5 * b.planks;
    });
    var out = [];
    order.forEach(function (k) { if (/^blade/.test(k)) out.push(rows[k]); });
    if (box) out.push({ k: "box", name: "Коробка", q: box });
    Object.keys(dq).sort().forEach(function (z) { out.push({ k: "d" + z, name: "Добор " + z + " мм", q: dq[z] }); });
    if (pl) out.push({ k: "planka", name: "Стыковочная планка", q: pl });
    ["nal", "hinge", "handle", "lock", "zav"].forEach(function (k) { if (rows[k]) out.push(rows[k]); });
    out.forEach(function (r) { r.q = Math.ceil(r.q - 1e-9); r.pk = /^blade/.test(r.k) ? "blade" : r.k; });
    return { per: per, rows: out, model: m };
  }
  function priceOf(r) { var v = S.prices[r.pk]; return v === "" || v == null ? null : +v; }
  function totals(res) {
    var sum = 0, none = 0;
    res.rows.forEach(function (r) { var p = priceOf(r); if (p == null) none++; else sum += p * r.q; });
    var dp = Math.min(Math.max(parseFloat(String(S.disc).replace(",", ".")) || 0, 0), 100), dsc = Math.round(sum * dp / 100);
    return { sum: sum, none: none, dp: dp, dsc: dsc, total: sum - dsc };
  }
  function totalsHtml(res) {
    var t = totals(res);
    return '<table><tbody><tr><td>Цена без скидки</td><td style="text-align:right"><b>' + rub(t.sum) + '</b></td></tr>' +
      '<tr><td>Скидка ' + (t.dp ? t.dp + " %" : "") + '</td><td style="text-align:right">' + (t.dsc ? "− " + rub(t.dsc) : "—") + '</td></tr>' +
      '<tr><td><b>Итого со скидкой</b></td><td style="text-align:right;font-size:20px;color:var(--brand)"><b>' + rub(t.total) + '</b></td></tr>' +
      (t.dsc ? '<tr><td colspan="2"><span class="tag ok">Выгода клиента: ' + rub(t.dsc) + '</span></td></tr>' : "") + '</tbody></table>' +
      (t.none ? '<p class="note" style="margin-top:10px"><span class="tag warn">Цена не задана: ' + t.none + ' поз.</span> Итог посчитан по заданным ценам.</p>' : "");
  }
  function specHtml(res) {
    return res.rows.map(function (r) {
      var p = priceOf(r);
      return '<tr data-rk="' + r.k + '"><td>' + esc(r.name) + '</td><td>' + r.q + ' шт</td><td><div class="unit" style="width:130px"><input data-pr="' + r.pk + '" type="number" value="' + esc(S.prices[r.pk] == null ? "" : S.prices[r.pk]) + '" placeholder="Цена"><span>₽</span></div></td><td data-sum style="text-align:right">' + (p == null ? '<span class="tag warn">Цена не задана</span>' : rub(p * r.q)) + '</td></tr>';
    }).join("");
  }
  function step3() {
    initPrices();
    var res = calc(), m = res.model, O = S.opt;
    var chips = [["dobor", "Добор"], ["planka", "Стыковочная планка"], ["nal", "Наличники"], ["hinge", "Петли"], ["handle", "Ручка"], ["lock", "Замок"], ["share", "Совместный добор"]];
    return '<section class="card"><h2>' + (m ? esc(m.name) + " · " + esc(m.maker) : "Модель не выбрана") + '</h2><p class="sub">Что ввели, то и получили. Позиции можно отключить, цены правятся в спецификации.</p>' +
      '<div class="sum">' + chips.map(function (c) { return '<label class="chk"><input type="checkbox" data-opt="' + c[0] + '"' + (O[c[0]] ? " checked" : "") + '> ' + c[1] + "</label>"; }).join("") + '</div>' +
      '<div class="sum" style="margin-top:10px"><span class="note">Завертка (по желанию клиента):</span>' + S.ops.filter(function (o) { return o.type !== "entry"; }).map(function (o) { return '<label class="chk"><input type="checkbox" data-zav="' + o.id + '"' + (S.zav[o.id] ? " checked" : "") + '> ' + esc(o.room || "Проём " + (S.ops.indexOf(o) + 1)) + "</label>"; }).join("") + '</div></section>' +
      '<section class="card"><h2>По проёмам</h2><div style="overflow:auto"><table><thead><tr><th>Проём</th><th>Размер</th><th>Что входит</th></tr></thead><tbody>' +
      res.per.map(function (inf) { var o = inf.o; return "<tr><td>" + (inf.i + 1) + ". " + esc(o.room || "Проём") + "<br><span class=\"note\">" + (o.type === "entry" ? "Входная" : "Межкомнатная") + "</span></td><td>" + (o.w || "?") + " × " + (o.h || "?") + (o.depth ? "<br><span class=\"note\">стена " + esc(o.depth) + "</span>" : "") + "</td><td>" + inf.lines.map(esc).join("<br>") + "</td></tr>"; }).join("") + '</tbody></table></div></section>' +
      '<section class="card"><h2>Спецификация и цены</h2><p class="sub">Количество по всему заказу, округлено вверх. Цены за штуку: из каталога или вручную.</p><div style="overflow:auto"><table><thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена за шт.</th><th style="text-align:right">Сумма</th></tr></thead><tbody id="spec">' + specHtml(res) + '</tbody></table></div></section>' +
      '<section class="card"><h2>Итог</h2><div class="grid g2"><div><label class="f">Скидка, %<div class="unit" style="max-width:160px"><input data-disc type="number" min="0" max="100" value="' + esc(S.disc) + '" placeholder="0"><span>%</span></div></label><p class="note" style="margin-top:8px">Скидка на весь расчёт. Цена без скидки и выгода клиента попадут в PDF предложения.</p></div><div id="tot">' + totalsHtml(res) + '</div></div></section>' +
      '<div class="bar"><button class="btn" data-act="to2">Назад к модели</button><span class="note sp">Сравнение моделей и PDF предложения будут на следующем шаге прототипа.</span></div>';
  }
  function updateSums() {
    var res = calc(); $("#tot").innerHTML = totalsHtml(res);
    res.rows.forEach(function (r) { var tr = $('[data-rk="' + r.k + '"]'); if (!tr) return; var p = priceOf(r); tr.querySelector("[data-sum]").innerHTML = p == null ? '<span class="tag warn">Цена не задана</span>' : rub(p * r.q); });
  }
  function render() { steps(); $("#view").innerHTML = (S.step === 1 ? step1() : S.step === 2 ? step2() : step3()); window.scrollTo(0, 0); }
  function rerender() { var y = window.scrollY; steps(); $("#view").innerHTML = (S.step === 1 ? step1() : S.step === 2 ? step2() : step3()); window.scrollTo(0, y); }
  function opById(id) { return S.ops.filter(function (o) { return o.id == id; })[0]; }
  function refreshFit() { $("#fit").innerHTML = fitHtml(); var m = curModel(); $("#sel").innerHTML = m ? "Выбрано: <b>" + esc(m.name) + "</b>" : "Модель не выбрана"; }

  document.addEventListener("click", function (e) {
    var mod = e.target.closest("[data-model]");
    if (mod) { S.modelId = mod.getAttribute("data-model"); S.ops.forEach(function (o) { o.blade = ""; }); $("#tabbody").innerHTML = modelsHtml(); refreshFit(); return; }
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.getAttribute("data-act"), opEl = e.target.closest(".op"), o = opEl && opById(opEl.getAttribute("data-id"));
    if (a === "type") { o.type = b.getAttribute("data-v"); rerender(); }
    else if (a === "del") { S.ops.splice(S.ops.indexOf(o), 1); rerender(); }
    else if (a === "dup") { var c = Object.assign({}, o, { id: ++uid }); S.ops.splice(S.ops.indexOf(o) + 1, 0, c); rerender(); }
    else if (a === "add" || a === "plus") { S.ops.push(newOp()); rerender(); }
    else if (a === "minus") { if (S.ops.length > 1) { S.ops.pop(); rerender(); } }
    else if (a === "to2") { S.step = 2; render(); }
    else if (a === "to3") { S.step = 3; render(); }
    else if (a === "to1") { S.step = 1; render(); }
    else if (a === "tab") { S.tab = b.getAttribute("data-v"); S.ops.forEach(function (x) { x.blade = ""; }); rerender(); }
    else if (a === "addb") { S.manual.blades.push({ w: "", from: "", to: "" }); $("#tabbody").innerHTML = manualHtml(); }
    else if (a === "delb") { var i = +b.closest("[data-bi]").getAttribute("data-bi"); S.manual.blades.splice(i, 1); if (!S.manual.blades.length) S.manual.blades.push({ w: "", from: "", to: "" }); $("#tabbody").innerHTML = manualHtml(); refreshFit(); }
  });
  document.addEventListener("keydown", function (e) { var m = e.target.closest && e.target.closest("[data-model]"); if (m && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); m.click(); } });
  document.addEventListener("input", function (e) {
    var t = e.target, opEl = t.closest(".op");
    if (t.hasAttribute("data-disc")) { S.disc = t.value; $("#tot").innerHTML = totalsHtml(calc()); return; }
    if (t.hasAttribute("data-pr")) { S.prices[t.getAttribute("data-pr")] = t.value; updateSums(); return; }
    if (t.hasAttribute("data-opt")) { S.opt[t.getAttribute("data-opt")] = t.checked; rerender(); return; }
    if (t.hasAttribute("data-zav")) { S.zav[t.getAttribute("data-zav")] = t.checked; rerender(); return; }
    if (opEl && t.hasAttribute("data-k")) {
      var o = opById(opEl.getAttribute("data-id")), k = t.getAttribute("data-k");
      o[k] = t.type === "checkbox" ? t.checked : t.value;
      if (k === "addons" || k === "depth") $("[data-hint]", opEl).innerHTML = depthHint(o);
      var miss = S.ops.filter(function (x) { return !x.w || !x.h; }).length;
      $("#miss").textContent = miss ? "Без ширины или высоты: " + miss + ". Расчёт по ним будет неполным." : "Все проёмы с шириной и высотой.";
    } else if (t.hasAttribute("data-o")) S.obj[t.getAttribute("data-o")] = t.value;
    else if (t.hasAttribute("data-q")) { S.q = t.value; $("#tabbody").innerHTML = modelsHtml(); var n = $("[data-q]"); n.focus(); n.setSelectionRange(S.q.length, S.q.length); }
    else if (t.hasAttribute("data-maker")) { S.maker = t.value; $("#tabbody").innerHTML = modelsHtml(); }
    else if (t.hasAttribute("data-m")) { S.manual[t.getAttribute("data-m")] = t.value; $("#sel").innerHTML = curModel() ? "Выбрано: <b>" + esc(curModel().name) + "</b>" : "Модель не выбрана"; $("#fit").innerHTML = fitHtml(); }
    else if (t.hasAttribute("data-b")) { S.manual.blades[+t.closest("[data-bi]").getAttribute("data-bi")][t.getAttribute("data-b")] = t.value; $("#fit").innerHTML = fitHtml(); }
    else if (t.hasAttribute("data-bl")) { var oo = opById(t.closest("[data-fid]").getAttribute("data-fid")); oo.blade = t.value; var p = pick(curModel(), oo); t.closest("tr").querySelector("[data-st]").innerHTML = oo.blade ? '<span class="tag off">Вручную</span>' : '<span class="tag warn">Значение очищено</span>'; }
  });
  render();
})();
