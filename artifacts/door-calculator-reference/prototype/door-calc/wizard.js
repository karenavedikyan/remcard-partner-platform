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
  var STD = [{ w: 600, from: 700, to: 790 }, { w: 700, from: 791, to: 850 }, { w: 800, from: 851, to: 940 }, { w: 900, from: 941, to: 1040 }];
  var DEF = { box: .16, d100: .12, d150: .17, d200: .22, planka: .08, nal: .06, hinge: .045, handle: .12, lock: .08, zav: .06, sill: .1 };
  var uid = 0;
  function newOp(room) { return { id: ++uid, room: room || "", type: "inter", w: "", h: "", depth: "", side: "left", nalF: true, nalB: true, dobor: null, zav: false, hinge: true, handle: true, lock: true, sill: false, blade: "", note: "" }; }
  var S = { obj: { client: "", phone: "", address: "" }, ops: [newOp("")], step: 1, cur: 0, modelId: null, manual: { on: false, name: "", maker: "" }, prices: {}, pricesFor: null, disc: "", share: true, vars: [], vi: 0, adding: false, prevVi: 0, cmpOpen: window.innerWidth > 860 };
  var MAXV = 4;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rub(n) { return Math.round(n).toLocaleString("ru-RU") + " ₽"; }
  function curModel() {
    if (S.manual.on) return { id: "manual", manual: true, name: S.manual.name || "Модель вне каталога", maker: S.manual.maker || "Производитель не указан", blades: null };
    return CATALOG.filter(function (x) { return x.id === S.modelId; })[0] || null;
  }
  function bladeOf(m, o) {
    if (o.blade) return { w: +o.blade, src: "manual" };
    var w = parseInt(o.w, 10); if (!w) return { w: null, src: "nowidth" };
    var std = !m || !m.blades; var tb = std ? STD : m.blades;
    var b = tb.filter(function (x) { return w >= x.from && (!x.to || w <= x.to); })[0];
    return b ? { w: b.w, src: std ? "std" : "auto" } : { w: null, src: "out" };
  }
  function dobEff(o) { if (o.dobor !== null) return o.dobor; var d = parseInt(o.depth, 10); return !!d && d - BOX > 10; }

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
  var PL = [["blade", "Полотно"], ["box", "Коробка"], ["d100", "Добор 100"], ["d150", "Добор 150"], ["d200", "Добор 200"], ["planka", "Стыковочная планка"], ["nal", "Наличник"], ["sill", "Порог"], ["hinge", "Петля"], ["handle", "Ручка"], ["lock", "Замок"], ["zav", "Завёртка"]];
  function offerHref() {
    var res = calc(), t = totals(res), m = curModel();
    var pl = { obj: S.obj, model: { name: m ? m.name : "Модель не выбрана", maker: m ? m.maker : "" }, disc: t.dp,
      per: res.per.map(function (inf) { var o = inf.o; return { n: inf.i + 1, room: o.room, type: o.type === "entry" ? "Входная" : o.type === "arch" ? "Без двери (облагораживание)" : "Межкомнатная", size: (o.w || "?") + " × " + (o.h || "?") + (o.depth ? ", стена " + o.depth : ""), lines: inf.lines }; }),
      rows: res.rows.map(function (r) { var p = priceOf(r); return [r.name, r.q, p]; }) };
    return "./offer.html#" + btoa(unescape(encodeURIComponent(JSON.stringify(pl))));
  }
  /* ---------- сравнение моделей: проёмы общие, у каждого варианта своя модель, цены и ширины полотен ---------- */
  function snap() { var bl = {}; S.ops.forEach(function (o) { bl[o.id] = o.blade; }); return { modelId: S.modelId, manual: Object.assign({}, S.manual), prices: Object.assign({}, S.prices), pricesFor: S.pricesFor, bl: bl }; }
  function load(v) { S.modelId = v.modelId; S.manual = Object.assign({}, v.manual); S.prices = Object.assign({}, v.prices); S.pricesFor = v.pricesFor; S.ops.forEach(function (o) { o.blade = v.bl[o.id] || ""; }); }
  function save() { S.vars[S.vi] = snap(); }
  function eachVar(fn) { save(); var out = S.vars.map(function (v, i) { load(v); return fn(i); }); load(S.vars[S.vi]); return out; }
  function takenIds() { return S.vars.filter(function (v, i) { return i !== S.vi && !v.manual.on && v.modelId; }).map(function (v) { return v.modelId; }); }
  var CG = [["Полотна", /^blade/], ["Коробка", /^box$/], ["Добор", /^d\d/], ["Стыковочная планка", /^planka$/], ["Наличник", /^nal$/], ["Петли", /^hinge$/], ["Ручки", /^handle$/], ["Замки", /^lock$/], ["Завёртки", /^zav$/], ["Порог", /^sill$/]];
  function cmpData() {
    return eachVar(function (i) {
      var m = curModel() || { name: "Модель не выбрана", maker: "" }, res = calc(), t = totals(res);
      var g = CG.map(function (c) {
        var rs = res.rows.filter(function (r) { return c[1].test(r.k); }), q = 0, sum = 0, none = 0, det = [];
        rs.forEach(function (r) { var pr = priceOf(r); q += r.q; if (pr == null) none++; else sum += pr * r.q; var z = /(\d+) мм/.exec(r.name); if (z) det.push(z[1]); });
        return { n: rs.length, q: q, sum: sum, none: none, det: det };
      });
      return { i: i, m: m, t: t, g: g };
    });
  }
  function opById(id) { return S.ops.filter(function (o) { return o.id == id; })[0]; }
  /* ---------- оформление: сайт remcard.ru и кабинет партнёра ---------- */
  var CTX = /[?&]ctx=lk/.test(location.search) ? "lk" : "site";
  var STEPS = ["Проёмы", "Размеры", "Модель", "Расчёт"];
  var IC = {
    left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', minus: '<path d="M5 12h14"/>', check: '<path d="M20 6 9 17l-5-5"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    menu: '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>', user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
    box: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/>',
    door: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    chev: '<path d="m9 18 6-6-6-6"/>'
  };
  function ic(n, c) { return '<svg class="i' + (c ? " " + c : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; }
  var mem = { get: function (k) { try { return (window.rcDemoMemory || window.localStorage).getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { (window.rcDemoMemory || window.localStorage).setItem(k, v); } catch (e) {} } };
  function theme() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  var MARK = '<svg class="brand__mark" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="currentColor"/><path d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  function shell() {
    var site = CTX === "site", C = "../client/index.html#/", L = "../partner/index.html?role=company&dataset=demo";
    var themeBtn = '<button class="iconbtn" data-act="theme" aria-label="День или ночь" id="thm">' + ic(theme() === "dark" ? "sun" : "moon") + '</button>';
    var strip = '<div class="proto"><span>Интерактивный макет · демо-данные</span><span class="proto__sw"><a href="?ctx=site" class="' + (site ? "on" : "") + '">Сайт для клиентов</a><a href="?ctx=lk" class="' + (site ? "" : "on") + '">Кабинет партнёра</a></span><a class="proto__all" href="../index.html">Все прототипы</a></div>';
    var brand = '<a class="brand" href="' + (site ? C : L) + '">' + MARK + '<span class="brand__text"><span class="brand__word">remcard<i>.</i></span><span class="brand__sub">' + (site ? "навигатор ремонта" : "для партнёров") + '</span></span></a>';
    var head = site
      ? '<header class="hdr"><div class="wrap hdr__in">' + brand + '<nav class="nav" id="nav" aria-label="Разделы"><a class="is-active" href="' + C + 'calc">Калькулятор</a><a href="' + C + 'navigator">Навигатор</a><a href="' + C + 'catalog">Каталог</a><a href="' + C + 'concierge">Консьерж</a></nav><div class="hdr__right"><a class="btn btn--ghost btn--sm hdr__login" href="' + C + '">' + ic("user") + ' Войти</a>' + themeBtn + '<button class="iconbtn hdr__burger" data-act="menu" aria-label="Разделы сайта" aria-expanded="false">' + ic("menu") + '</button></div></div></header>'
      : '<header class="hdr"><div class="hdr__in hdr__in--lk">' + brand + '<div class="hdr__right">' + themeBtn + '<span class="who"><span class="who__av">ОП</span><span class="who__t"><b>«Оптовик» · демо</b><small>Компания · категория «Двери»</small></span></span></div></div></header>';
    var nav = [["home", "Главная", L], ["users", "Клиенты", L], ["ticket", "Сертификаты", L], ["scan", "Сканер", L], ["box", "Каталог", L + "&open=goods"], ["door", "Калькулятор дверей", null], ["users", "Партнёры", L], ["wallet", "Кошелёк", L], ["user", "Профиль", L]];
    var side = site ? "" : '<aside class="side"><div class="ws"><span class="eyebrow">Ваше пространство</span><strong>«Оптовик» · демо</strong><small>Компания</small></div><nav aria-label="Разделы кабинета">' + nav.map(function (n) { return n[2] ? '<a class="navbtn" href="' + n[2] + '">' + ic(n[0]) + n[1] + '</a>' : '<span class="navbtn on" aria-current="page">' + ic(n[0]) + n[1] + '</span>'; }).join("") + '</nav><p class="side__n">Раздел виден партнёрам, у которых выбрана категория «Двери».</p></aside>';
    var crumbs = site ? '<div class="crumbs"><a href="' + C + 'calc">Калькулятор</a>' + ic("chev") + '<a href="' + C + 'calc/materials">Отдельный расчёт</a>' + ic("chev") + '<span>Двери и проёмы</span></div>' : '<div class="crumbs"><a href="' + L + '">Кабинет</a>' + ic("chev") + '<span>Калькулятор дверей</span></div>';
    document.body.className = "ctx-" + CTX;
    document.body.innerHTML = strip + head + '<div class="shell">' + side + '<main class="page"><div class="page__in">' + crumbs + '<div id="view"></div></div></main></div><div id="bar"></div>';
  }

  /* ---------- рисунок проёма ---------- */
  var FX1 = 114, FX2 = 362, FY1 = 100, FY2 = 512, VP = [238, 306];
  function sceneSvg(o) {
    var entry = o.type === "entry", arch = o.type === "arch", m = curModel(), dEff = dobEff(o), left = o.side === "left";
    var d = parseInt(o.depth, 10) || 0, sc = d ? .94 - Math.min(d, 500) / 500 * .16 : .9;
    var P = function (x, y) { return [VP[0] + (x - VP[0]) * sc, VP[1] + (y - VP[1]) * sc]; };
    var bl = P(FX1, FY2), br = P(FX2, FY2), tl = P(FX1, FY1), tr = P(FX2, FY1);
    var pt = function (a) { return a[0].toFixed(1) + "," + a[1].toFixed(1); };
    var poly = function (a, fill) { return '<polygon points="' + a.map(pt).join(" ") + '" fill="' + fill + '" stroke="#00000022" stroke-width="1" stroke-linejoin="round"/>'; };
    var frame = function (x1, y1, x2, c) { return '<path fill-rule="evenodd" d="M' + x1 + ' ' + y1 + 'H' + x2 + 'V' + FY2 + 'H' + x1 + 'ZM' + FX1 + ' ' + FY1 + 'H' + FX2 + 'V' + FY2 + 'H' + FX1 + 'Z" fill="' + c + '" stroke="#0000002b" stroke-width="1"/>'; };
    var Ftl = [FX1, FY1], Ftr = [FX2, FY1], Fbl = [FX1, FY2], Fbr = [FX2, FY2];
    var cT = dEff ? "#dcc097" : "#d8d4c9", cL = dEff ? "#cdaa78" : "#cfcabf", cR = dEff ? "#bd9259" : "#c4bfb3";
    var leaf = entry ? "#5e4f41" : (m && m.color) || "#e9e4da";
    var x1 = tl[0], y1 = tl[1], w = br[0] - x1, h = br[1] - y1, x2 = x1 + w;
    var s = '<svg viewBox="0 0 390 612" width="390" height="612" aria-hidden="true"><defs><linearGradient id="lf" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient></defs>' +
      '<rect width="390" height="612" style="fill:var(--sc-wall)"/><rect y="' + FY2 + '" width="390" height="100" style="fill:var(--sc-floor)"/><path d="M0 ' + FY2 + 'H390" stroke="#00000020"/>' +
      (o.nalB ? frame(90, 76, 386, "#cfae7f") : "") + (o.nalF ? frame(97, 83, 379, "#e8d2aa") : "") +
      '<rect x="' + FX1 + '" y="' + FY1 + '" width="' + (FX2 - FX1) + '" height="' + (FY2 - FY1) + '" fill="#b9b4a8"/>' +
      poly([Ftl, Ftr, tr, tl], cT) + poly([Ftl, tl, bl, Fbl], cL) + poly([Ftr, tr, br, Fbr], cR) + poly([Fbl, Fbr, br, bl], o.sill && !arch ? "#7d7972" : "#c9c4b8");
    if (arch) {
      s += '<rect x="' + x1 + '" y="' + y1 + '" width="' + w + '" height="' + h + '" style="fill:var(--sc-bg)"/><rect x="' + x1 + '" y="' + (y1 + h * .8) + '" width="' + w + '" height="' + (h * .2) + '" style="fill:var(--sc-floor)" opacity=".7"/>' +
        '<text x="238" y="' + (y1 + h * .9) + '" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="700" font-size="13" style="fill:var(--muted)">Проём без двери</text>';
    } else {
      s += '<rect x="' + x1 + '" y="' + y1 + '" width="' + w + '" height="' + h + '" fill="' + leaf + '"/>';
      if (entry) {
        [.2, .4, .6, .8].forEach(function (k) { s += '<path d="M' + (x1 + 14) + ' ' + (y1 + h * k) + 'H' + (x2 - 14) + '" stroke="#00000030" stroke-width="2"/>'; });
        s += '<circle cx="' + (x1 + w / 2) + '" cy="' + (y1 + h * .3) + '" r="4" fill="#d8c9a8"/><rect x="' + (left ? x2 - 24 : x1 + 16) + '" y="' + (y1 + h * .42) + '" width="8" height="' + (h * .16) + '" rx="4" fill="#d8c9a8"/>';
      } else {
        var glass = m && /стекл/i.test(m.name), px = x1 + w * .16, pw = w * .68;
        s += '<rect x="' + px + '" y="' + (y1 + h * .07) + '" width="' + pw + '" height="' + (h * .4) + '" rx="2" fill="' + (glass ? "#cfe3ea" : "#ffffff14") + '" stroke="#00000022"/><rect x="' + px + '" y="' + (y1 + h * .53) + '" width="' + pw + '" height="' + (h * .4) + '" rx="2" fill="#ffffff14" stroke="#00000022"/>';
      }
      s += '<rect x="' + x1 + '" y="' + y1 + '" width="' + w + '" height="' + h + '" fill="url(#lf)" stroke="#00000040" stroke-width="1.2"/>';
      if (!entry) {
        var hx = left ? x2 - 20 : x1 + 20, cy = y1 + h * .5, hg = left ? x1 - 2 : x2 - 4;
        if (o.hinge) [.12, .8].forEach(function (k) { s += '<rect x="' + hg + '" y="' + (y1 + h * k) + '" width="6" height="32" rx="2" fill="#2f302e"/>'; });
        s += o.handle ? '<rect x="' + (left ? hx - 30 : hx) + '" y="' + (cy - 3.5) + '" width="30" height="7" rx="3.5" fill="#2a2b29"/><circle cx="' + hx + '" cy="' + cy + '" r="7.5" fill="#2a2b29"/>' : '<circle cx="' + hx + '" cy="' + cy + '" r="6" fill="none" stroke="#00000038" stroke-dasharray="3 3"/>';
        if (o.lock) s += '<rect x="' + (hx - 5) + '" y="' + (cy + 20) + '" width="10" height="17" rx="3" fill="#4b4c49"/><circle cx="' + hx + '" cy="' + (cy + 26) + '" r="1.8" fill="#d9d5cb"/>';
        if (o.zav) s += '<circle cx="' + hx + '" cy="' + (cy + 54) + '" r="6.5" fill="none" stroke="#2a2b29" stroke-width="3"/>';
      }
    }
    s += '<g style="stroke:var(--primary)" stroke-width="1.5" fill="none"><path d="M' + FX1 + ' 44H' + FX2 + 'M' + FX1 + ' 37v14M' + FX2 + ' 37v14"/><path d="M84 ' + FY1 + 'V' + FY2 + 'M77 ' + FY1 + 'h14M77 ' + FY2 + 'h14"/>' +
      '<path d="M' + pt(Fbr).replace(",", " ") + 'L' + pt(br).replace(",", " ") + '" stroke-width="3" stroke-dasharray="1 5" stroke-linecap="round"/></g></svg>';
    return s;
  }
  function depthNote(o) {
    var d = parseInt(o.depth, 10), r = d - BOX;
    return !d ? "укажите глубину" : (r <= 10 ? "остаток " + Math.max(r, 0) + " мм, не нужен" : "остаток " + r + " мм");
  }
  function chip(k, label, sub, on, pos) {
    return '<label class="chip' + (on ? " on" : "") + '" style="' + pos + '"><input type="checkbox" data-k="' + k + '"' + (on ? " checked" : "") + '><span class="chip__i">' + ic("check") + ic("plus") + '</span><span class="chip__t">' + label + (sub ? '<small' + (k === "dobor" ? " data-dn" : "") + '>' + sub + '</small>' : "") + '</span></label>';
  }
  function sceneHtml(o) {
    var entry = o.type === "entry", arch = o.type === "arch", left = o.side === "left";
    var L = "left:124px;", R = "right:38px;", hs = left ? L : R, os2 = left ? "right:78px;" : "left:164px;";
    var c = chip("nalF", "Наличник", "лицевой", o.nalF, L + "top:112px") + chip("nalB", "Наличник", "обратный", o.nalB, R + "top:112px");
    if (!entry && !arch) c += chip("hinge", "Петли", "2 шт", o.hinge, (left ? "left:138px;" : "right:52px;") + "top:166px") + chip("handle", "Ручка", "", o.handle, os2 + "top:280px") + chip("lock", "Замок", "", o.lock, os2 + "top:324px") + chip("zav", "Завёртка", "", o.zav, os2 + "top:368px");
    c += chip("dobor", "Добор", depthNote(o), dobEff(o), hs + "top:" + (entry || arch ? 300 : 416) + "px");
    if (!arch) c += chip("sill", "Порог", "", o.sill, "left:238px;transform:translateX(-50%);top:468px");
    return '<div class="stagebox"><div class="stage"><div class="sv">' + sceneSvg(o) + '</div>' + c +
      '<label class="hin hin--w"><span>Ширина, мм</span><input data-k="w" type="number" inputmode="numeric" value="' + esc(o.w) + '" placeholder="900"></label>' +
      '<label class="hin hin--h"><span>Высота</span><input data-k="h" type="number" inputmode="numeric" value="' + esc(o.h) + '" placeholder="2050"></label>' +
      '<label class="hin hin--d"><span>Глубина стены, мм</span><input data-k="depth" type="number" inputmode="numeric" value="' + esc(o.depth) + '" placeholder="250"></label></div></div>';
  }
  function fit() {
    document.querySelectorAll(".stagebox").forEach(function (b) {
      var g = b.closest(".s2__grid");
      if (g) g.style.setProperty("--scw", (window.innerWidth > 860 ? Math.max(300, Math.min(400, Math.round((window.innerHeight - 340) * 390 / 612))) : 400) + "px");
      var k = b.clientWidth / 390; b.firstChild.style.transform = "scale(" + k + ")"; b.style.height = Math.round(612 * k) + "px";
    });
  }
  window.addEventListener("resize", fit);
  function doorMini(color, glass, plus) {
    if (plus) return '<svg class="mdoor" viewBox="0 0 60 84" aria-hidden="true"><rect x="13" y="5" width="34" height="74" rx="2" fill="none" style="stroke:var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M30 34v16M22 42h16" style="stroke:var(--primary)" stroke-width="2.4" stroke-linecap="round"/></svg>';
    return '<svg class="mdoor" viewBox="0 0 60 84" aria-hidden="true"><rect x="10" y="2" width="40" height="80" rx="2" fill="#e8d2aa" stroke="#00000022"/><rect x="14" y="6" width="32" height="76" fill="' + color + '" stroke="#00000035"/><rect x="19" y="12" width="22" height="28" fill="' + (glass ? "#cfe3ea" : "#ffffff18") + '" stroke="#00000020"/><rect x="19" y="46" width="22" height="28" fill="#ffffff18" stroke="#00000020"/><rect x="38" y="42" width="6" height="2.4" rx="1.2" fill="#2a2b29"/></svg>';
  }

  /* ---------- экраны ---------- */
  function top() {
    var seg = STEPS.map(function (n, i) { return '<i class="' + (i + 1 < S.step ? "done" : i + 1 === S.step ? "on" : "") + '"></i>'; }).join("");
    var exit = CTX === "site" ? "../client/index.html#/calc/materials" : "../partner/index.html?role=company&dataset=demo";
    return '<div class="wtop"><button class="iconbtn" data-act="back" aria-label="Назад"' + (S.step === 1 ? " disabled" : "") + '>' + ic("left") + '</button><div class="wprog" role="progressbar" aria-valuemin="1" aria-valuemax="4" aria-valuenow="' + S.step + '" aria-label="Шаг ' + S.step + ' из 4">' + seg + '</div><a class="iconbtn" href="' + exit + '" aria-label="Закрыть калькулятор">' + ic("x") + '</a></div>';
  }
  function eyebrow(extra) { return '<span class="eyebrow">Шаг ' + S.step + ' из 4 · ' + STEPS[S.step - 1] + (extra || "") + '</span>'; }
  function barHtml(back, nextHtml, hint) {
    return '<div class="bar"><div class="bar__in">' + (back ? '<button class="btn btn--ghost btn--lg bar__back" data-act="back">' + ic("left") + '<span>Назад</span></button>' : "") + nextHtml + '</div>' + (hint ? '<div class="bar__h">' + hint + '</div>' : "") + '</div>';
  }
  function nextBtn(label, ok) { return '<button class="btn btn--primary btn--lg bar__next" data-act="next"' + (ok ? "" : " disabled") + '><span>' + label + '</span>' + ic("right") + '</button>'; }
  function s1() {
    var n = S.ops.length, doors = "";
    for (var i = 0; i < Math.min(n, 12); i++) doors += '<i></i>';
    return { html: '<section class="scr scr--narrow">' + eyebrow() + '<h1>Сколько проёмов?</h1><p class="lead">Размеры и комплектацию каждого проёма укажем на следующем шаге.</p>' +
      '<div class="count"><button class="count__b" data-act="minus" aria-label="Меньше"' + (n < 2 ? " disabled" : "") + '>' + ic("minus") + '</button><div class="count__n"><b>' + n + '</b><span>' + plural(n, "проём", "проёма", "проёмов") + '</span></div><button class="count__b" data-act="plus" aria-label="Больше">' + ic("plus") + '</button></div>' +
      '<div class="doors" aria-hidden="true">' + doors + (n > 12 ? '<span>+' + (n - 12) + '</span>' : "") + '</div>' +
      '<div class="quick" role="group" aria-label="Быстрый выбор">' + [1, 2, 3, 4, 5, 6].map(function (k) { return '<button data-act="setn" data-v="' + k + '" class="' + (n === k ? "on" : "") + '">' + k + '</button>'; }).join("") + '</div></section>',
      bar: barHtml(false, nextBtn("Далее: размеры", true)) };
  }
  function sumLines(i) { var inf = calc().per[i]; return inf.lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join(""); }
  function dotsHtml() {
    return S.ops.map(function (x, i) { return '<button class="dot' + (i === S.cur ? " on" : x.w && x.h ? " full" : "") + '" data-act="goop" data-v="' + i + '" aria-label="Проём ' + (i + 1) + '">' + (i !== S.cur && x.w && x.h ? ic("check") : i + 1) + '</button>'; }).join("");
  }
  function s2() {
    var o = S.ops[S.cur], n = S.ops.length, entry = o.type === "entry", arch = o.type === "arch", last = S.cur === n - 1;
    var seg = function (act, v, on, t) { return '<button data-act="' + act + '" data-v="' + v + '" class="' + (on ? "is-on" : "") + '">' + t + '</button>'; };
    return { html: '<section class="scr s2" data-id="' + o.id + '"><div class="s2__grid">' +
      '<div class="s2__head"><div class="s2__top">' + eyebrow(' · проём ' + (S.cur + 1) + ' из ' + n) + (n > 1 ? '<div class="dots" id="dots">' + dotsHtml() + '</div>' : "") + '</div>' +
      '<label class="room">' + ic("pencil") + '<input data-k="room" value="' + esc(o.room) + '" placeholder="Проём ' + (S.cur + 1) + ': название помещения" aria-label="Название помещения"></label>' +
      '<div class="seg seg--full">' + seg("type", "inter", !entry && !arch, "Межкомнатная") + seg("type", "entry", entry, "Входная") + seg("type", "arch", arch, "Без двери") + '</div></div>' +
      '<div class="s2__scene">' + sceneHtml(o) + '</div>' +
      '<div class="s2__more">' +
      (arch ? "" : '<div class="fld"><span class="fld__l">Петли</span><div class="seg seg--full">' + seg("side", "left", o.side === "left", "Слева") + seg("side", "right", o.side === "right", "Справа") + '</div></div>') +
      '<div class="sumbox"><span class="eyebrow">Состав проёма</span><ul id="sum2">' + sumLines(S.cur) + '</ul><small>' + (arch ? "Облагораживание без двери: добор, наличники." : entry ? "Входная дверь считается в общем заказе: добор, наличники и порог." : "Отмечайте нужное прямо на проёме. Ширина полотна уточнится после выбора модели.") + '</small></div>' +
      '<div class="rowbtns"><button class="btn btn--ghost btn--sm" data-act="dup">' + ic("copy") + ' Копировать проём</button><button class="btn btn--text btn--sm" data-act="del"' + (n < 2 ? " disabled" : "") + '>' + ic("trash") + ' Удалить</button></div></div>' +
      '</div></section>', bar: barHtml(true, nextBtn(last ? "Далее: модель" : "Далее: проём " + (S.cur + 2), true)) };
  }
  function s3() {
    var m = curModel(), ok = !!m, taken = takenIds();
    var own = '<button class="mcard mcard--own' + (S.manual.on ? " is-on" : "") + '" data-pick="manual"><span class="mcard__pic">' + doorMini("", false, true) + '</span><b>Вне каталога</b><small>Своя модель и цены вручную</small>' + (S.manual.on ? '<span class="mcard__ok">' + ic("check") + '</span>' : "") + '</button>';
    var cards = CATALOG.map(function (x) {
      var on = !S.manual.on && S.modelId === x.id, tk = taken.indexOf(x.id) >= 0;
      if (tk) return '<button class="mcard is-taken" disabled><span class="mcard__pic">' + doorMini(x.color, /стекл/i.test(x.name)) + '</span><b>' + esc(x.name) + '</b><small>' + esc(x.maker) + '</small><span class="mcard__p">от ' + rub(x.price) + '</span><span class="pill pill--more">Уже в сравнении</span></button>';
      return '<button class="mcard' + (on ? " is-on" : "") + '" data-pick="' + x.id + '"><span class="mcard__pic">' + doorMini(x.color, /стекл/i.test(x.name)) + '</span><b>' + esc(x.name) + '</b><small>' + esc(x.maker) + '</small><span class="mcard__p">от ' + rub(x.price) + '</span>' + (x.blades ? '<span class="pill pill--ok">Размеры в каталоге</span>' : '<span class="pill pill--warn">Стандартные размеры</span>') + (on ? '<span class="mcard__ok">' + ic("check") + '</span>' : "") + '</button>';
    }).join("");
    var body = "";
    if (S.manual.on) body = '<div class="card manual"><h2>Своя модель</h2><div class="g2"><label class="f">Название модели<input data-m="name" value="' + esc(S.manual.name) + '" placeholder="Например, Престиж 7"></label><label class="f">Производитель<input data-m="maker" value="' + esc(S.manual.maker) + '" placeholder="Необязательно"></label></div><p class="note">Цены необязательны: без цены позиция считается только по количеству.</p></div>';
    var prices = ok ? '<details class="card pl"' + (S.manual.on ? " open" : "") + '><summary><span><b>Цены за штуку</b><small>' + (S.manual.on ? "Введите вручную" : "Подставлены из каталога, можно изменить") + '</small></span>' + ic("chev") + '</summary><div class="prg">' + PL.map(function (x) { return '<label class="f">' + x[1] + '<span class="unit"><input data-pr="' + x[0] + '" type="number" inputmode="numeric" value="' + esc(S.prices[x[0]] == null ? "" : S.prices[x[0]]) + '" placeholder="не задана"><i>₽</i></span></label>'; }).join("") + '</div></details>' : "";
    return { html: '<section class="scr">' + eyebrow(S.adding ? " · сравнение" : "") + '<h1>' + (S.adding ? "Ещё одна модель" : "Какая модель?") + '</h1><p class="lead">' + (S.adding ? "Проёмы и комплектация те же. Выберите модель, расчёт по ней встанет рядом для сравнения." : "Выберите дверь из каталога «Оптовика» или внесите свою модель и цены вручную.") + '</p><div class="mgrid">' + own + cards + '</div>' + body + prices + '</section>',
      bar: barHtml(true, nextBtn(S.adding ? "Добавить к сравнению" : "Рассчитать", ok), ok ? "" : S.adding ? "Выберите модель для сравнения" : "Выберите модель, чтобы получить расчёт") };
  }
  function totHtml(res) {
    var t = totals(res);
    return '<div class="sumc__total">' + rub(t.total) + '</div>' +
      '<dl class="sumc__rows"><div><dt>Без скидки</dt><dd>' + rub(t.sum) + '</dd></div><div><dt>Скидка' + (t.dp ? " " + String(t.dp).replace(".", ",") + " %" : "") + '</dt><dd>' + (t.dsc ? "− " + rub(t.dsc) : "—") + '</dd></div></dl>' +
      (t.dsc ? '<div class="sumc__gain">' + ic("check") + ' Выгода клиента: ' + rub(t.dsc) + '</div>' : "") +
      (t.none ? '<div class="sumc__warn">Цена не задана: ' + t.none + ' поз. Сумма посчитана без них.</div>' : "");
  }
  function sumCell(r) { var p = priceOf(r); return p == null ? '<span class="pill pill--warn">нет цены</span>' : rub(p * r.q); }
  function specHtml(res) {
    return res.rows.map(function (r) {
      return '<div class="srow" data-rk="' + r.k + '"><div class="srow__n"><b>' + esc(r.name) + '</b><small>' + r.q + ' шт</small></div><span class="unit"><input data-pr="' + r.pk + '" type="number" inputmode="numeric" aria-label="Цена за штуку: ' + esc(r.name) + '" value="' + esc(S.prices[r.pk] == null ? "" : S.prices[r.pk]) + '" placeholder="цена"><i>₽</i></span><div class="srow__s" data-sum>' + sumCell(r) + '</div></div>';
    }).join("");
  }
  function perHtml(res) {
    var m = curModel();
    return res.per.map(function (inf) {
      var o = inf.o, bl = bladeOf(m, o), ask = o.type === "inter" && (bl.src === "std" || bl.src === "manual" || bl.src === "out" || bl.src === "nowidth");
      var opts = [600, 700, 800, 900].concat([600, 700, 800, 900].indexOf(+o.blade) < 0 && o.blade ? [+o.blade] : []);
      return '<div class="pr" data-id="' + o.id + '"><div class="pr__h"><span class="pr__n">' + (inf.i + 1) + '</span><b>' + esc(o.room || "Проём " + (inf.i + 1)) + '</b><small>' + (o.w || "?") + " × " + (o.h || "?") + (o.depth ? " · стена " + o.depth : "") + '</small></div><ul>' + inf.lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + '</ul>' +
        (ask ? '<label class="f f--inline">Ширина полотна' + (bl.src === "std" ? " · по стандартной сетке" : bl.src === "out" ? " · проём вне диапазона" : "") + '<select data-k="blade">' + (bl.w ? "" : '<option value="" selected>выберите</option>') + opts.map(function (x) { return '<option value="' + x + '"' + (bl.w === x ? " selected" : "") + ">" + x + " мм</option>"; }).join("") + '</select></label>' : "") + '</div>';
    }).join("");
  }
  function cmpHtml() {
    if (S.vars.length < 2) return "";
    var d = cmpData(), full = d.filter(function (x) { return !x.t.none; }), best = full.length > 1 ? Math.min.apply(null, full.map(function (x) { return x.t.total; })) : null;
    var pic = function (m) { return m.manual || !m.color ? doorMini("#d9d4ca") : doorMini(m.color, /стекл/i.test(m.name)); };
    var cards = d.map(function (x) {
      var on = x.i === S.vi, m = x.m;
      var tag = x.t.none ? '<span class="pill pill--warn">Не все цены заданы</span>' : best == null ? "" : x.t.total === best ? '<span class="pill pill--ok">Самая выгодная</span>' : '<span class="pill pill--more">+ ' + rub(x.t.total - best) + '</span>';
      return '<div class="vcard' + (on ? " is-on" : "") + '"><button class="vcard__m" data-act="var" data-v="' + x.i + '" aria-pressed="' + on + '"><span class="vcard__pic">' + pic(m) + '</span><span class="vcard__t">' + (on ? '<span class="vcard__on">Расчёт ниже</span>' : "") + '<b>' + esc(m.name) + '</b><small>' + esc(m.maker) + '</small><span class="vcard__sum">' + rub(x.t.total) + '</span>' + tag + '</span></button><button class="vcard__x" data-act="delvar" data-v="' + x.i + '" aria-label="Убрать из сравнения: ' + esc(m.name) + '">' + ic("x") + '</button></div>';
    }).join("");
    if (S.vars.length < MAXV) cards += '<button class="vcard vcard--add" data-act="addvar">' + ic("plus") + '<span>Добавить модель</span></button>';
    var cols = "minmax(104px,1.1fr) repeat(" + d.length + ",minmax(104px,1fr))";
    var cell = function (g) { return !g.n ? '<div class="cc cc--no">—</div>' : '<div class="cc">' + (g.none === g.n ? '<span class="pill pill--warn">нет цены</span>' : '<b>' + rub(g.sum) + (g.none ? " *" : "") + '</b>') + '<small>' + g.q + ' шт' + (g.det.length ? " · " + g.det.join(", ") : "") + '</small></div>'; };
    var rows = CG.map(function (c, k) { return d.some(function (x) { return x.g[k].n; }) ? '<div class="cn">' + c[0] + '</div>' + d.map(function (x) { return cell(x.g[k]); }).join("") : ""; }).join("");
    var line = function (name, f, cls) { return '<div class="cn ' + cls + '">' + name + '</div>' + d.map(function (x) { return '<div class="cc ' + cls + '"><b>' + f(x.t) + '</b></div>'; }).join(""); };
    var dp = d[0].t.dp;
    var tbl = '<details class="card pl ctbl"' + (S.cmpOpen ? " open" : "") + '><summary><span><b>Сравнение по позициям</b><small>Одинаковые проёмы, цены каждой модели</small></span>' + ic("chev") + '</summary><div class="ctbl__sc"><div class="ctbl__g" style="grid-template-columns:' + cols + ';min-width:' + (108 * (d.length + 1)) + 'px"><div class="ch"></div>' + d.map(function (x) { return '<div class="ch' + (x.i === S.vi ? " on" : "") + '">' + esc(x.m.name) + '</div>'; }).join("") + rows +
      (dp ? line("Без скидки", function (t) { return rub(t.sum); }, "cf") + line("Скидка " + String(dp).replace(".", ",") + " %", function (t) { return t.dsc ? "− " + rub(t.dsc) : "—"; }, "cf2") : "") + line("Итого", function (t) { return rub(t.total); }, dp ? "ct" : "cf ct") + '</div></div>' +
      (d.length > 2 ? '<p class="note ctbl__swipe">Листайте таблицу вправо, чтобы увидеть все модели.</p>' : "") +
      (d.some(function (x) { return x.t.none; }) ? '<p class="note">* Цена задана не для всех позиций, сумма посчитана без них.</p>' : "") + '</details>';
    return '<div class="cmp__h"><h2>Сравнение моделей</h2><small>' + d.length + ' ' + plural(d.length, "модель", "модели", "моделей") + ' · скидка общая</small></div><div class="vrow">' + cards + '</div>' + tbl;
  }
  function cmpRefresh() { var c = $("#cmp"); if (c) c.innerHTML = cmpHtml(); }
  function s4() {
    var res = calc(), m = curModel(), n = S.ops.length, many = S.vars.length > 1;
    return { html: '<section class="scr">' + eyebrow() + '<h1>Расчёт готов</h1><p class="lead">' + esc(m ? m.name : "") + (m && m.maker ? " · " + esc(m.maker) : "") + ' · ' + n + ' ' + plural(n, "проём", "проёма", "проёмов") + '</p><div class="cmp" id="cmp">' + cmpHtml() + '</div><div class="res">' +
      '<aside class="res__side"><div class="sumc"><span class="eyebrow">Итого</span><div id="tot">' + totHtml(res) + '</div><label class="sumc__disc"><span>Скидка, %</span><span class="unit"><input data-disc type="number" inputmode="decimal" min="0" max="100" value="' + esc(S.disc) + '" placeholder="0"><i>%</i></span></label></div>' +
      '<div class="res__edit"><button class="btn btn--ghost btn--sm" data-act="goto" data-v="2">' + ic("pencil") + ' Изменить проёмы</button><button class="btn btn--ghost btn--sm" data-act="goto" data-v="3">' + ic("door") + ' Сменить модель</button>' + (many ? "" : '<button class="btn btn--ghost btn--sm res__add" data-act="addvar">' + ic("plus") + ' Добавить модель для сравнения</button>') + '</div></aside>' +
      '<div class="res__main"><div class="card"><div class="card__h"><h2>Спецификация</h2><small>Количество по заказу, округлено вверх</small></div><div class="shead"><span>Позиция</span><span>Цена за шт.</span><span>Сумма</span></div><div id="spec">' + specHtml(res) + '</div>' +
      '<label class="chk"><input type="checkbox" data-share' + (S.share ? " checked" : "") + '><span>Делить добор между проёмами</span></label></div>' +
      '<div class="card"><div class="card__h"><h2>По проёмам</h2></div><div id="per">' + perHtml(res) + '</div></div>' +
      '<details class="card pl"><summary><span><b>' + (CTX === "lk" ? "Данные заказчика" : "Ваши данные") + '</b><small>Попадут в предложение, необязательно</small></span>' + ic("chev") + '</summary><div class="g2" style="margin-top:14px"><label class="f">' + (CTX === "lk" ? "Заказчик" : "Имя") + '<input data-o="client" value="' + esc(S.obj.client) + '"></label><label class="f">Телефон<input data-o="phone" inputmode="tel" value="' + esc(S.obj.phone) + '"></label><label class="f f--wide">Адрес объекта<input data-o="address" value="' + esc(S.obj.address) + '"></label></div></details></div>' +
      '</div></section>', bar: barHtml(true, '<a class="btn btn--primary btn--lg bar__next" target="_blank" rel="noopener" href="#" data-offer>' + ic("file") + '<span>Предложение PDF</span></a>') };
  }
  var lastKey = "";
  function render(keep) {
    initPrices();
    if (S.step === 4) { S.adding = false; save(); }
    var v = S.step === 1 ? s1() : S.step === 2 ? s2() : S.step === 3 ? s3() : s4(), key = S.step + ":" + (S.step === 2 ? S.cur : 0), y = keep ? window.scrollY : 0;
    $("#view").innerHTML = top() + '<div class="wz wz--' + S.step + (key !== lastKey ? " enter" : "") + '">' + v.html + '</div>'; $("#bar").innerHTML = v.bar; lastKey = key;
    fit(); window.scrollTo(0, y);
  }
  function go(step) { S.step = step; render(false); }
  function refresh() {
    var res = calc(), ae = document.activeElement; $("#tot").innerHTML = totHtml(res); cmpRefresh();
    if (!(ae && ae.hasAttribute && ae.hasAttribute("data-pr"))) $("#spec").innerHTML = specHtml(res);
    if (!(ae && ae.tagName === "SELECT" && ae.hasAttribute("data-k"))) $("#per").innerHTML = perHtml(res); else { var cur = ae.closest(".pr"); res.per.forEach(function (inf) { if (cur && inf.o.id == cur.getAttribute("data-id")) cur.querySelector("ul").innerHTML = inf.lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join(""); }); }
  }
  function sceneSync(sc, o) {
    var sv = $(".sv", sc); if (sv) sv.innerHTML = sceneSvg(o);
    var s = $("#sum2"); if (s) s.innerHTML = sumLines(S.cur);
    var dn = $("[data-dn]", sc); if (dn) dn.textContent = depthNote(o);
    var d = $("#dots"); if (d) d.innerHTML = dotsHtml();
  }

  document.addEventListener("mouseover", function (e) { var a = e.target.closest("[data-offer]"); if (a) a.href = offerHref(); });
  document.addEventListener("focusin", function (e) { var a = e.target.closest && e.target.closest("[data-offer]"); if (a) a.href = offerHref(); });
  document.addEventListener("click", function (e) {
    var of = e.target.closest("[data-offer]"); if (of) { of.href = offerHref(); return; }
    var pk = e.target.closest("[data-pick]");
    if (pk) { if (pk.disabled) return; var v = pk.getAttribute("data-pick"); if (v === "manual") { S.manual.on = true; S.modelId = null; } else { S.manual.on = false; S.modelId = v; } S.ops.forEach(function (x) { x.blade = ""; }); render(true); return; }
    var b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
    var a = b.getAttribute("data-act"), v2 = b.getAttribute("data-v"), o = S.ops[S.cur];
    if (a === "theme") { var t = theme() === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", t); mem.set("rc_theme", t); $("#thm").innerHTML = ic(t === "dark" ? "sun" : "moon"); return; }
    if (a === "menu") { var nv = $("#nav"), op = nv.classList.toggle("open"); b.setAttribute("aria-expanded", op ? "true" : "false"); return; }
    if (a === "plus") { if (S.ops.length < 20) S.ops.push(newOp()); }
    else if (a === "minus") { if (S.ops.length > 1) S.ops.pop(); }
    else if (a === "setn") { var n = +v2; while (S.ops.length < n) S.ops.push(newOp()); while (S.ops.length > n) S.ops.pop(); }
    else if (a === "next") { if (S.step === 2 && S.cur < S.ops.length - 1) { S.cur++; render(false); return; } if (S.step === 1) S.cur = 0; go(S.step + 1); return; }
    else if (a === "addvar") { if (S.vars.length >= MAXV) return; save(); S.prevVi = S.vi; S.vi = S.vars.length; S.adding = true; S.modelId = null; S.manual = { on: false, name: "", maker: "" }; S.prices = {}; S.pricesFor = null; S.ops.forEach(function (x) { x.blade = ""; }); go(3); return; }
    else if (a === "var") { if (+v2 === S.vi) return; save(); S.vi = +v2; load(S.vars[S.vi]); render(true); return; }
    else if (a === "delvar") { if (S.vars.length < 2) return; save(); S.vars.splice(+v2, 1); if (S.vi > +v2) S.vi--; else if (S.vi === +v2) S.vi = Math.min(+v2, S.vars.length - 1); load(S.vars[S.vi]); render(true); return; }
    else if (a === "back") { if (S.step === 1) return; if (S.step === 3 && S.adding) { S.adding = false; S.vi = S.prevVi; load(S.vars[S.vi]); go(4); return; } if (S.step === 2 && S.cur > 0) { S.cur--; render(false); return; } if (S.step === 3) S.cur = S.ops.length - 1; go(S.step - 1); return; }
    else if (a === "goto") { if (+v2 === 2) S.cur = 0; go(+v2); return; }
    else if (a === "goop") { S.cur = +v2; render(false); return; }
    else if (a === "type") { o.type = v2; o.nalF = true; o.nalB = o.type !== "entry"; if (o.type === "arch") o.sill = false; }
    else if (a === "side") o.side = v2;
    else if (a === "del") { S.ops.splice(S.cur, 1); S.cur = Math.min(S.cur, S.ops.length - 1); }
    else if (a === "dup") { S.ops.splice(S.cur + 1, 0, Object.assign({}, o, { id: ++uid })); S.cur++; render(false); return; }
    render(true);
  });
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-disc")) { S.disc = t.value; $("#tot").innerHTML = totHtml(calc()); cmpRefresh(); return; }
    if (t.hasAttribute("data-pr")) {
      var k = t.getAttribute("data-pr"); S.prices[k] = t.value;
      document.querySelectorAll('[data-pr="' + k + '"]').forEach(function (i2) { if (i2 !== t) i2.value = t.value; });
      if (S.step === 4) { var res = calc(); $("#tot").innerHTML = totHtml(res); res.rows.forEach(function (r) { var tr = $('[data-rk="' + r.k + '"]'); if (tr) tr.querySelector("[data-sum]").innerHTML = sumCell(r); }); cmpRefresh(); }
      return;
    }
    if (t.hasAttribute("data-o")) { S.obj[t.getAttribute("data-o")] = t.value; return; }
    if (t.hasAttribute("data-share")) { S.share = t.checked; refresh(); return; }
    if (t.hasAttribute("data-m")) { S.manual[t.getAttribute("data-m")] = t.value; return; }
    var k2 = t.getAttribute("data-k"); if (!k2) return;
    var sc = t.closest("[data-id]"), o = opById(sc.getAttribute("data-id"));
    o[k2] = t.type === "checkbox" ? t.checked : t.value;
    if (k2 === "room") return;
    if (k2 === "blade") { refresh(); return; }
    if (k2 === "depth") { o.dobor = null; var cb = $("[data-k=dobor]", sc); if (cb) { cb.checked = dobEff(o); cb.closest(".chip").classList.toggle("on", cb.checked); } }
    if (t.type === "checkbox") t.closest(".chip").classList.toggle("on", t.checked);
    sceneSync(sc, o);
  });
  document.addEventListener("toggle", function (e) { if (e.target.classList && e.target.classList.contains("ctbl")) S.cmpOpen = e.target.open; }, true);
  shell(); render();
})();
