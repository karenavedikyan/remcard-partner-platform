// Макет PDF-сертификата. Только демонстрационные данные; поля повторяют публичный ответ сертификата
// (код, срок, лимит, кто выдал, партнёры с категориями и контактами). Ничего не отправляется.
const root = document.documentElement;
const preference = matchMedia("(prefers-color-scheme: dark)");
const themeButton = document.querySelector("[data-testid=button-theme]");
let manualTheme = false;
function setTheme(dark) {
  root.dataset.theme = dark ? "dark" : "light";
  themeButton.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
  themeButton.setAttribute("aria-pressed", String(dark));
}
setTheme(preference.matches);
preference.addEventListener("change", ({ matches }) => { if (!manualTheme) setTheme(matches); });
themeButton.addEventListener("click", () => {
  manualTheme = true;
  setTheme(root.dataset.theme !== "dark");
});

const W = 794;
const place = id => `../client/assets/places/${id}.webp`;
const P = (name, logo, cats, extra = {}) => ({ name, logo, city: "Краснодар", cats, ...extra });

const CASES = {
  one: {
    code: "RC-SMOR6O", id: "SOYDJ0FV", issued: "24 ноября 2026", issuer: "agent",
    term: "до 23 декабря 2026", limit: "1 покупка", where: ["Город", "Краснодар"], noStack: true,
    partners: [P("ОПТОВИК", null, [["Двери", 7], ["Напольные покрытия", 8], ["Фурнитура и замки", 9]], {
      contacts: [["Телефон", "+7 (861) 200-00-00"], ["Telegram", "@optovik_demo"]],
    })],
  },
  org: {
    code: "TD-4F7K", id: "TD4F7KQ2", issued: "18 ноября 2026", issuer: "org", org: "Tandoor",
    term: "до 31 декабря 2026", limit: "1 покупка", where: ["Где", "Все филиалы Tandoor"], noStack: true,
    partners: [P("Tandoor", place("s6"), [["Межкомнатные двери", 10], ["Входные двери", 7], ["Фурнитура и ручки", 7], ["Погонаж и наличники", 5], ["Монтаж дверей", 5]], {
      address: "ул. Уральская, 79",
      contacts: [["Телефон", "+7 (861) 200-00-00"], ["WhatsApp", "+7 (900) 000-00-00"], ["Сайт", "tandoor.example"]],
    })],
  },
  many: {
    code: "RC-AGENT-2K7Q", id: "AG2K7QX9", issued: "12 ноября 2026", issuer: "agent",
    term: "Бессрочный", limit: "Без ограничений", where: ["Город", "Краснодар"],
    partners: [
      P("Tandoor", place("s6"), [["Межкомнатные двери", 10], ["Фурнитура и ручки", 7]]),
      P("Керамика Юг", place("s1"), [["Керамогранит", 7], ["Сантехника", 5]]),
      P("Электромир", place("s3"), [["Кабель и щиты", 10], ["Светильники", 8]]),
      P("Дом красок", place("s5"), [["Краски и колеровка", 8], ["Обои", 5], ["Декоративная штукатурка", 5]]),
      P("Стройбаза Кубань", place("s4"), [["Смеси и ГКЛ", 4], ["Инструмент", 3]]),
      P("Паркет Холл", place("s2"), [["Паркет и ламинат", 5]]),
      P("Кубань Кирпич", place("s7"), [["Кирпич и блоки", 3]]),
      P("Кровля и Фасад Центр", place("s9"), [["Кровля", 5], ["Фасад", 5]]),
    ],
  },
  city: {
    code: "RC-CITY-M8V2", id: "CTM8V2L4", issued: "5 ноября 2026", issuer: "agent",
    term: "до 31 марта 2027", limit: "Без ограничений", where: ["Город", "Краснодар"],
    partners: [
      P("Tandoor", place("s6"), [["Межкомнатные двери", 10], ["Входные двери", 7], ["Фурнитура и ручки", 7], ["Погонаж и наличники", 5], ["Монтаж дверей", 5]], { group: "Двери и полы" }),
      P("Паркет Холл", place("s2"), [["Паркет и инженерная доска", 7], ["Ламинат", 5], ["Плинтус", 5], ["Укладка", 3]], { group: "Двери и полы" }),
      P("Керамика Юг", place("s1"), [["Керамогранит", 7], ["Настенная плитка", 7], ["Сантехника", 5], ["Смесители", 5], ["Мебель для ванной", 4]], { group: "Плитка и сантехника" }),
      P("Электромир", place("s3"), [["Кабель и щиты", 10], ["Розетки и выключатели", 8], ["Светильники", 8], ["Умный дом", 5]], { group: "Электрика и свет" }),
      P("Дом красок", place("s5"), [["Краски и колеровка", 8], ["Обои", 5], ["Декоративная штукатурка", 5], ["Малярный инструмент", 3]], { group: "Отделка" }),
      P("Стройбаза Кубань", place("s4"), [["Смеси и ГКЛ", 4], ["Утеплитель", 4], ["Профиль и крепёж", 3], ["Инструмент", 3]], { group: "Стройматериалы" }),
      P("Кубань Кирпич", place("s7"), [["Кирпич и блоки", 3], ["Газобетон", 3], ["Арматура и металлопрокат", 2], ["Пиломатериалы", 2]], { group: "Стройматериалы" }),
      P("Нерудные материалы Юг", place("s8"), [["Песок и щебень", 4], ["Товарный бетон", 3], ["Чернозём и грунт", 4]], { group: "Стройматериалы" }),
      P("Кровля и Фасад Центр", place("s9"), [["Металлочерепица", 6], ["Гибкая черепица", 6], ["Водосток", 5], ["Фасадные панели", 5], ["Утеплитель", 4]], { group: "Кровля и фасад" }),
      P("Ландшафт Маркет", place("s10"), [["Тротуарная плитка", 7], ["Бордюры", 5], ["Заборы", 5], ["Автополив", 6], ["Уличный свет", 6], ["Садовая мебель", 4]], { group: "Участок и сад" }),
      P("Питомник «Южный сад»", place("s11"), [["Рулонный газон", 8], ["Саженцы", 8], ["Живая изгородь", 6], ["Плодородный грунт", 5]], { group: "Участок и сад" }),
      P("Ландшафт Бюро", place("c4"), [["Проект участка", 10], ["Мощение", 5], ["Озеленение", 5], ["Забор под ключ", 4]], { group: "Участок и сад" }),
      P("Бассейны Юга", place("c7"), [["Бассейн под ключ", 5], ["Оборудование", 7], ["Обслуживание", 10]], { group: "Участок и сад" }),
      P("РемСтройПроект", place("c1"), [["Дизайн-проект", 15], ["Ремонт под ключ", 5], ["Инженерные сети", 5]], { group: "Услуги и работы" }),
      P("Кубань Дом", place("c2"), [["Строительство дома", 3], ["Фундамент", 3], ["Кровельные работы", 4]], { group: "Услуги и работы" }),
      P("Климат Сервис", place("c3"), [["Кондиционеры", 7], ["Монтаж", 10], ["Вентиляция", 5], ["Обслуживание", 10]], { group: "Услуги и работы" }),
      P("СпецТехника 23", place("c5"), [["Аренда экскаватора", 5], ["Аренда манипулятора", 5], ["Вывоз грунта", 3]], { group: "Услуги и работы" }),
      P("ЮгБурВод", place("c6"), [["Бурение скважины", 5], ["Кессон и насос", 7], ["Анализ воды", 15]], { group: "Услуги и работы" }),
    ],
  },
};

const plural = (n, one, few, many) => {
  const d = n % 10, h = n % 100;
  return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
};
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
};
const pcts = partner => partner.cats.map(([, pct]) => pct);
const pctText = values => {
  const max = Math.max(...values);
  return (Math.min(...values) === max ? "" : "<small>до</small>") + `−${max}&nbsp;%`;
};
const badge = partner => {
  const values = pcts(partner), max = Math.max(...values);
  return `<span class="badge">${Math.min(...values) === max ? "" : "до "}−${max} %</span>`;
};
const logo = (partner, tag = "span") => partner.logo
  ? `<img class="logo" src="${partner.logo}" alt="" width="48" height="48">`
  : `<${tag} class="logo" aria-hidden="true">${partner.name[0]}</${tag}>`;

const HOUSE = '<svg width="21" height="21" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 17l8-7 8 7v8H8z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg>';
const CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/></svg>';

const brand = '<div class="sh-brand"><i>' + HOUSE + '</i><div><b>remcard<span>.</span></b><small>навигатор ремонта</small></div></div>';
const sheetTop = (c, next) => `<header class="sh-top">${brand}<p class="sh-meta">${next
  ? `<b>Сертификат ${c.code}</b>Партнёры, продолжение`
  : `<b>Скидочный сертификат</b>Выпущен ${c.issued}`}</p></header>`;
const foot = c => `<footer class="sh-foot"><span>Проверить сертификат: <b>remcard.ru/certificate/${c.code}</b></span><span>№ ${c.id} · <span data-page></span></span></footer>`;

function hero(c) {
  const all = c.partners.flatMap(pcts), n = c.partners.length;
  const who = c.issuer === "org" ? `скидка в ${c.org}`
    : n === 1 ? `скидка у партнёра ${c.partners[0].name}`
    : `скидки у ${n} ${plural(n, "партнёра", "партнёров", "партнёров")} RemCard`;
  return `<section class="hero" aria-label="Скидка и код">
    <div class="hero-main">
      <p class="pill">${CHECK}${c.issuer === "org" ? `От: ${c.org}` : "Выдан агентом RemCard"}</p>
      <p class="pct">${pctText(all)}</p>
      <p class="who">${who}</p>
      <dl class="facts">
        <div><dt>Срок</dt><dd>${c.term}</dd></div>
        <div><dt>Покупки</dt><dd>${c.limit}</dd></div>
        <div><dt>${c.where[0]}</dt><dd>${c.where[1]}</dd></div>
      </dl>
    </div>
    <div class="pass">
      <div class="tile">
        <div class="qr" role="img" aria-label="QR-код сертификата" data-qr="https://remcard.ru/certificate/${c.code}/add"></div>
        <p class="code"><span>Код сертификата</span><b class="${c.code.length > 10 ? "long" : ""}">${c.code}</b></p>
      </div>
      <p class="scan">Наведите камеру телефона</p>
    </div>
  </section>`;
}

function card(c) {
  const p = c.partners[0];
  const rates = p.cats.map(([label, pct]) => `<div><dt>${label}</dt><dd>${pct} %</dd></div>`).join("");
  const reach = (p.contacts || []).map(([label, value]) => `<span>${label}: <b>${value}</b></span>`).join("");
  return el("article", "card", `
    <div class="card-head">${logo(p)}<div><h3>${p.name}</h3><p>${p.city}${p.address ? `, ${p.address}` : ""}</p></div>${badge(p)}</div>
    <dl class="rates${p.cats.length > 5 ? " two" : ""}">${rates}</dl>
    ${reach ? `<p class="reach">${reach}</p>` : ""}`);
}

function grp(name, next) {
  const node = el("h3", "grp", next ? `${name} · продолжение` : name);
  node.dataset.group = name;
  return node;
}

// Юридические условия: спокойная сноска внизу первой страницы. Кегль 11 px на листе 794 px = 8,25 pt —
// не ниже ориентира Роспотребнадзора для основного текста (8 pt); тише делаем цветом и весом, а не размером.
function legal(c) {
  return `<section class="legal" aria-labelledby="legal-title" data-testid="pdf-legal">
    <h2 id="legal-title">Условия</h2>
    <div class="legal-text">
      <p>Скидка действует на товары и услуги из категорий сертификата, если назвать код или показать QR-код до оплаты. Она не распространяется на товары и услуги по акциям, распродажам и специальным ценам${c.noStack ? " и не суммируется с другими скидками партнёра" : ""}. Сертификат не является средством платежа и не обменивается на деньги.</p>
      <p>Скидку предоставляет партнёр: он продаёт товар или оказывает услугу и отвечает за них и за цену. RemCard — информационный сервис и продавцом не является. Партнёр может обновить условия скидки или досрочно завершить действие сертификата; это не затрагивает уже оплаченные покупки. Актуальные условия — на странице сертификата.</p>
    </div>
  </section>`;
}

function rows(c) {
  const out = [];
  let group = null;
  for (const p of c.partners) {
    if (p.group && p.group !== group) { group = p.group; out.push(grp(group)); }
    const cats = p.cats.map(([label, pct]) => `<span>${label} <b>${pct}&nbsp;%</b></span>`).join(" · ");
    const row = el("article", "row", `${logo(p)}<div><h3>${p.name} <span>· ${p.city}</span></h3><p>${cats}</p></div>${badge(p)}`);
    if (p.group) row.dataset.group = p.group;
    out.push(row);
  }
  return out;
}

function page(c, next) {
  const n = c.partners.length, cats = c.partners.reduce((sum, p) => sum + p.cats.length, 0);
  const sub = next ? "" : n === 1 ? "Скидка по категориям у партнёра"
    : `${n} ${plural(n, "партнёр", "партнёра", "партнёров")} · ${cats} ${plural(cats, "категория", "категории", "категорий")}. Контакты — на странице сертификата по QR-коду`;
  const howto = `<section class="howto"><h2>Как воспользоваться</h2><ol>
    <li><i>1</i><span><b>Покажите QR-код</b> или&nbsp;назовите код продавцу</span></li>
    <li><i>2</i><span><b>Продавец применит скидку</b> по категории товара</span></li>
    <li><i>3</i><span><b>С аккаунтом RemCard</b> за&nbsp;покупку начислятся баллы</span></li></ol></section>`;
  const paper = el("article", "paper");
  paper.innerHTML = `<div class="sheet${next ? " next" : ""}">${sheetTop(c, next)}${next ? "" : hero(c)}
    <section class="accept"><div class="sec-h"><h2>${next ? "Сертификат принимают — продолжение" : "Сертификат принимают"}</h2><span>${sub}</span></div><div class="list"></div></section>
    ${next ? "" : howto + legal(c)}${foot(c)}</div>`;
  return paper;
}

const pages = document.querySelector("[data-testid=pdf-pages]");
const fileNote = document.querySelector("[data-testid=text-file]");
const scale = new ResizeObserver(entries => entries.forEach(entry => entry.target.style.setProperty("--k", entry.contentRect.width / W)));

function render(key) {
  const c = CASES[key];
  scale.disconnect();
  pages.replaceChildren();
  let paper = page(c, false);
  pages.append(paper);
  const lists = [paper.querySelector(".list")];
  const addPage = () => {
    paper = page(c, true);
    pages.append(paper);
    lists.push(paper.querySelector(".list"));
    return lists.at(-1);
  };
  let list = lists[0];
  // Раскладка по страницам: блок, который не помещается, уходит на следующий лист вместе с заголовком группы.
  for (const block of c.partners.length === 1 ? [card(c)] : rows(c)) {
    list.append(block);
    if (list.scrollHeight <= list.clientHeight + 1 || list.children.length === 1) continue;
    const carry = [block];
    block.remove();
    const last = list.lastElementChild;
    if (last && last.classList.contains("grp")) { last.remove(); carry.unshift(last); }
    else if (block.dataset.group && !block.classList.contains("grp")) carry.unshift(grp(block.dataset.group, true));
    list = addPage();
    list.append(...carry);
  }
  // Один партнёр на последнем листе смотрится оторванным: забираем к нему ещё одного с предыдущего.
  const tail = lists.at(-1), prev = lists.at(-2);
  if (prev && tail.querySelectorAll(".row").length === 1 && prev.querySelectorAll(".row").length > 2) {
    const row = prev.lastElementChild;
    row.remove();
    const carry = [row];
    const before = prev.lastElementChild;
    if (before.classList.contains("grp")) { before.remove(); carry.unshift(before); }
    else if (row.dataset.group) carry.unshift(grp(row.dataset.group, true));
    const first = tail.firstElementChild;
    if (first.classList.contains("grp") && first.dataset.group === row.dataset.group) first.remove();
    tail.prepend(...carry);
  }
  const total = pages.children.length;
  [...pages.children].forEach((node, index) => {
    node.setAttribute("aria-label", `Страница ${index + 1} из ${total}`);
    node.querySelector("[data-page]").textContent = `стр. ${index + 1} из ${total}`;
    scale.observe(node);
  });
  fileNote.textContent = `Файл: remcard-${c.code}.pdf · A4 · ${total} ${plural(total, "страница", "страницы", "страниц")}`;
  pages.dataset.case = key;
  fillQr();
}

// Настоящий QR из библиотеки партнёрского прототипа; если она недоступна — заглушка.
let qrLib = null;
const qrReady = import(new URL("../partner/chunk-3HBG25M4.js", document.baseURI).href).then(module => { qrLib = module.a(); }).catch(() => {});
async function fillQr() {
  await qrReady;
  document.querySelectorAll("[data-qr]").forEach(node => {
    if (node.firstElementChild) return;
    if (!qrLib) { node.innerHTML = '<span class="qr-fallback">QR</span>'; return; }
    qrLib.toString(node.dataset.qr, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1b1f1a", light: "#ffffff" } }, (error, svg) => {
      node.innerHTML = error ? '<span class="qr-fallback">QR</span>' : svg;
    });
  });
}

const buttons = [...document.querySelectorAll("[data-case]")];
function show(key) {
  buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.case === key)));
  render(key);
}
buttons.forEach(button => button.addEventListener("click", () => show(button.dataset.case)));

const zoom = document.querySelector("[data-testid=button-zoom]");
zoom.addEventListener("click", () => {
  const on = pages.dataset.zoom !== "1";
  pages.dataset.zoom = on ? "1" : "0";
  zoom.setAttribute("aria-pressed", String(on));
  zoom.textContent = on ? "По ширине экрана" : "Увеличить лист";
});

const requested = new URLSearchParams(location.search).get("case");
const initial = CASES[requested] ? requested : "one";
show(initial);
// Раскладка зависит от ширины букв: после загрузки шрифта пересобираем страницы.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => show(pages.dataset.case));
