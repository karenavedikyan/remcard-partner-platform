/* Статус поставщика у партнёра (прототип).
   Партнёр, который ведёт каталог, подаёт заявку «Стать поставщиком» отдельно от публикации каталога на сайте:
   форма во вкладке «Каталог → Поставщики», решение администрации RemCard по категориям, показ другим партнёрам
   после одобрения, запросы на сотрудничество и заказы от партнёров-покупателей.
   Всё демонстрационное и хранится в памяти страницы. Расчёт с покупателем — по счёту поставщика напрямую, вне RemCard:
   кошелёк, вознаграждения и взаиморасчёты RemCard не затрагиваются. Только владелец кабинета; сотрудникам вкладка недоступна. */
import "./supplier-core.js?v=sa4";

const api = () => globalThis.RCSupplierApp;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (n) => Math.round(n).toLocaleString("ru-RU").replace(/\u00a0/g, " ");
const rub = (n) => `${num(n)} ₽`;
const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
const noIcon = () => "";
const CITY = "Краснодар";
const NAME = "Оптовик";

/* Состояние заявки и работы поставщика. Общее для всех ролей кабинета. */
export const SME = { st: "none", form: null, page: false, tried: false, decisions: {}, reason: "", question: "", live: [], history: [], reqs: [], orders: [], seq: 540, inv: 77, ver: 0 };
const form = () => { if (!SME.form) SME.form = api().blank(); return SME.form; };
const stamp = () => "только что";
const hist = (text) => SME.history.unshift([stamp(), text]);
const okCats = () => Object.entries(SME.decisions).filter(([, v]) => v === "ok").map(([k]) => k);
export const supMeVisible = () => ["approved", "partial"].includes(SME.st) || (SME.st === "moderation" && SME.live.length > 0);
const catsText = (ids) => ids.map((c) => api().catName(c)).join(", ");
const pillOf = (icon, st = SME.st) => { const [label, tone] = api().STATUS[st]; return `<span class="pill ${tone} pc-status">${icon(st === "approved" || st === "partial" ? "circle-check" : st === "moderation" ? "clock" : st === "clarify" ? "message-circle-question" : "circle")}${label}</span>`; };
const reachLine = (ids) => { const n = api().reach(ids); return `${ids.length > 1 ? "до " : ""}${n} ${plural(n, "партнёр", "партнёра", "партнёров")}`; };

/* ---------- Блок статуса на вкладке «Поставщики» ---------- */
export function supStatusBlock(s, icon) {
  if (!s.manage) return "";
  const A = api();
  const head = (title, body, tools) => `<section class="panel stack pc-me" data-testid="pc-me" data-status="${SME.st}">
      <div class="row between pc-me-h"><div class="pc-me-t"><span class="pc-sup-ico">${icon("handshake")}</span><div><h3>${title}</h3><small>Вы как поставщик для других партнёров RemCard</small></div></div>${pillOf(icon)}</div>
      ${body}${tools ? `<div class="row">${tools}</div>` : ""}</section>`;
  const f = form();
  const catPills = (ids) => `<div class="row pc-sup-cats">${ids.map((c) => `<span class="pill">${esc(A.catName(c))} · ${reachLine([c])}</span>`).join("")}</div>`;
  const demoBox = (inner) => `<div class="pc-me-demo" data-testid="pc-me-demo"><strong>${icon("shield-check")} Демо: решение администрации RemCard</strong>${inner}</div>`;
  if (SME.st === "none" || SME.st === "draft" || SME.st === "withdrawn") {
    const again = SME.st === "withdrawn";
    return head(again ? "Вы сняли статус поставщика" : "Хотите продавать другим партнёрам?",
      `<p class="muted pc-me-lead">${again ? "Партнёры вас больше не видят. Можно подать заявку заново." : "Покажите свои условия партнёрам сети: они смогут запросить сотрудничество и заказывать у вас."}</p>
       <ol class="pc-me-steps"><li><b>1</b><span>Заявка<small>роль, категории, условия</small></span></li><li><b>2</b><span>Проверка RemCard<small>до двух рабочих дней</small></span></li><li><b>3</b><span>Вас видят партнёры<small>запросы и заказы</small></span></li></ol>
       ${SME.st === "draft" ? `<p class="small">${icon("info")} Черновик сохранён: ${esc(f.role ? A.label(A.ROLES.map((r) => [r.id, r.label]), f.role) : "роль не выбрана")}${f.cats.length ? ` · ${esc(catsText(f.cats))}` : ""}.</p>` : ""}
       <p class="small pc-me-cap">Публикация каталога на сайте проверяется отдельно и на эту заявку не влияет.</p>`,
      `<button type="button" class="btn primary" data-pc-action="sme-open" data-testid="pc-me-apply">${icon("send")} ${SME.st === "draft" ? "Продолжить заявку" : "Подать заявку"}</button>`);
  }
  if (SME.st === "moderation") {
    const keep = SME.live.length ? `<p class="notice pc-me-note">${icon("info")}<span>Пока идёт проверка изменений, вас по-прежнему видят партнёры в категориях: ${esc(catsText(SME.live))}.</span></p>` : "";
    return head("Заявка на проверке",
      `<p class="muted">Администрация RemCard проверяет роль, категории и документы. Обычно это занимает до двух рабочих дней. Ответ придёт в кабинет и в бот RemCard PROF.</p>${keep}
       <dl class="pc-dl pc-me-dl"><div><dt>Роль</dt><dd>${esc(A.roleOf(f.role)?.label || "—")}</dd></div><div><dt>Категории</dt><dd>${esc(catsText(f.cats))}</dd></div><div><dt>Увидят после одобрения</dt><dd>${reachLine(f.cats)} сети в этих категориях</dd></div></dl>`
      + demoBox(`<div class="row"><button type="button" class="btn pc-btn-sm" data-pc-action="sme-demo:ok" data-testid="pc-me-demo-ok">Одобрить</button><button type="button" class="btn pc-btn-sm" data-pc-action="sme-demo:part" data-testid="pc-me-demo-part" ${f.cats.length < 2 ? "disabled" : ""}>Одобрить частично</button><button type="button" class="btn pc-btn-sm" data-pc-action="sme-demo:ask" data-testid="pc-me-demo-ask">Вернуть с вопросом</button><button type="button" class="btn pc-btn-sm" data-pc-action="sme-demo:no" data-testid="pc-me-demo-no">Отклонить</button></div><small>В кабинете администратора это одна карточка заявки с решением по каждой категории.</small>`),
      `<button type="button" class="btn" data-pc-action="sme-withdraw-app" data-testid="pc-me-recall">Отозвать заявку</button>`);
  }
  if (SME.st === "clarify") {
    return head("Администрация задала вопрос",
      `<p class="notice pc-me-note" data-testid="pc-me-question">${icon("message-circle-question")}<span>${esc(SME.question)}</span></p><p class="small">Исправьте заявку и отправьте повторно — решение примут по новой версии.</p>`,
      `<button type="button" class="btn primary" data-pc-action="sme-open" data-testid="pc-me-fix">${icon("pencil")} Исправить заявку</button>`);
  }
  if (SME.st === "rejected") {
    return head("Заявка отклонена",
      `<p class="notice pc-me-note" data-testid="pc-me-reason">${icon("triangle-alert")}<span>${esc(SME.reason)}</span></p><p class="small">Каталог на сайте и остальные возможности кабинета работают как раньше. Можно подать заявку заново.</p>`,
      `<button type="button" class="btn primary" data-pc-action="sme-open" data-testid="pc-me-again">${icon("send")} Подать заново</button>`);
  }
  if (SME.st === "paused") {
    return head("Показ приостановлен",
      `<p class="muted">Партнёры вас не видят и не могут отправлять новые запросы. Уже подтверждённое сотрудничество и открытые заказы сохраняются.</p>`,
      `<button type="button" class="btn primary" data-pc-action="sme-resume" data-testid="pc-me-resume">${icon("play")} Вернуть показ</button>`);
  }
  /* approved / partial */
  const rej = Object.entries(SME.decisions).filter(([, v]) => v === "no").map(([k]) => k);
  const ok = okCats();
  const body = `<p class="notice pc-sup-ok pc-me-note">${icon("circle-check")}<span><strong>${SME.st === "partial" ? "Одобрено по части категорий." : "Заявка одобрена."}</strong> Партнёры сети видят вас в категориях ниже и могут запросить сотрудничество.</span></p>
    ${catPills(ok)}
    ${rej.length ? `<p class="notice pc-me-note" data-testid="pc-me-rejected">${icon("triangle-alert")}<span>Не одобрено: ${esc(catsText(rej))}. ${esc(SME.reason)}</span></p>` : ""}
    <p class="small">${icon("badge-check")} Статус «${esc(A.roleOf(f.role)?.label || "")}» подтверждён администрацией RemCard и показывается партнёрам значком.</p>`;
  return head(SME.st === "partial" ? "Вы поставщик по части категорий" : "Вы поставщик в RemCard",
    body + supPreview(icon) + supSeller(s, icon),
    `<button type="button" class="btn" data-pc-action="sme-open" data-testid="pc-me-edit">${icon("pencil")} Править условия</button><button type="button" class="btn" data-pc-action="sme-pause" data-testid="pc-me-pause">${icon("pause")} Приостановить показ</button><button type="button" class="btn" data-pc-action="sme-drop" data-testid="pc-me-drop">Снять статус поставщика</button>`);
}

/* Как карточку видит партнёр-покупатель в списке «Поставщики». */
function supPreview(icon) {
  const A = api(); const f = form();
  const role = A.roleOf(f.role);
  const facts = [
    ["Дилерская цена", f.prices === "open" ? "видна сразу после запроса" : "открывается после подтверждения вами"],
    ["Поставка", f.days || "по согласованию"], ["Минимальный заказ", f.min || "не ограничен"],
    ["Оплата", f.pay.map((p) => A.label(A.PAY, p)).join(", ") || "по счёту"],
    ["География", `${A.label(A.GEO, f.geo || "city")}${f.deliv.length ? ` · ${f.deliv.map((d) => A.label(A.DELIV, d).toLowerCase()).join(", ")}` : ""}`],
  ];
  const flags = f.flags.map((x) => `<span class="pill">${esc(A.label(A.FLAGS, x))}</span>`).join("");
  return `<div class="pc-me-prev" data-testid="pc-me-preview"><small class="pc-me-cap">Так вас видят партнёры в списке «Поставщики»</small>
      <article class="panel pc-sup pc-sup--prev"><div class="pc-sup-h"><span class="pc-sup-ico pc-sup-ico--logo">${NAME[0]}</span><div><strong>${NAME}</strong><small>${esc(role?.label || "Поставщик")} · ${CITY}</small></div>${SME.st === "approved" || SME.st === "partial" ? `<span class="pill good pc-status">${icon("badge-check")}Проверен RemCard</span>` : ""}</div>
        <div class="row pc-sup-cats">${f.cats.filter((c) => !SME.decisions[c] || SME.decisions[c] === "ok").map((c) => `<span class="pill">${esc(A.catName(c))}</span>`).join("")}${flags}</div>
        <dl class="pc-dl">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></article></div>`;
}

/* ---------- Запросы и заказы от партнёров-покупателей ---------- */
const LEVELS = { dealer: ["Дилерская", 0.7], opt: ["Оптовая", 0.65], big: ["Крупный опт", 0.6] };
const BUYERS = [
  { id: "arka", name: "Салон дверей «Арка»", type: "Магазин", city: "Краснодар", cat: "doors", msg: "Работаем с межкомнатными дверями, хотим закупать у вас под заказ клиентов." },
  { id: "dom", name: "Студия «Дом и свет»", type: "Компания", city: "Сочи", cat: "hardware", msg: "Нужна фурнитура для объектов дизайнеров. Интересуют условия и сроки." },
];
const GOODS = [{ name: "Дверь межкомнатная Mona-58", size: "800 мм", qty: 6, rrc: 8900 }, { name: "Ручка FLAT TDAL 301-01", size: "чёрная", qty: 12, rrc: 1450 }];
const SO = [["new", "Новый"], ["invoiced", "Счёт выставлен"], ["marked", "Партнёр отметил оплату"], ["paid", "Оплата подтверждена"], ["shipped", "Отгружен"], ["received", "Получен"]];
const SO_TONE = { new: "accent", invoiced: "accent", marked: "accent", paid: "", shipped: "", received: "good" };

function supSeller(s, icon) {
  const reqs = SME.reqs; const orders = SME.orders;
  const hasOk = reqs.some((r) => r.st === "ok");
  const reqCard = (r) => `<article class="pc-so pc-me-req" data-testid="pc-me-req-${r.id}" data-status="${r.st}">
      <div class="pc-order-head"><div><strong>${esc(r.name)}</strong><small>${esc(r.type)} · ${esc(r.city)} · категория «${esc(api().catName(r.cat))}»</small></div><span class="pill ${r.st === "ok" ? "good" : r.st === "new" ? "accent" : ""} pc-status">${r.st === "ok" ? "Сотрудничаете" : r.st === "new" ? "Новый запрос" : "Отказано"}</span></div>
      <p class="small">«${esc(r.msg)}»</p>
      ${r.st === "ok" ? `<p class="small">${icon("badge-percent")} Уровень цен: ${esc(LEVELS[r.level][0])}. Партнёр видит ваши дилерские цены и может отправлять заказы.</p>` : r.st === "no" ? `<p class="small">${esc(r.why)}</p>` : `<div class="row"><button type="button" class="btn primary pc-btn-sm" data-pc-action="sme-req-ok:${r.id}" data-testid="pc-me-req-ok-${r.id}">${icon("check")} Подтвердить</button><button type="button" class="btn pc-btn-sm" data-pc-action="sme-req-no:${r.id}" data-testid="pc-me-req-no-${r.id}">Отказать</button></div>`}
    </article>`;
  const orderCard = (o) => {
    const at = SO.findIndex(([k]) => k === o.st);
    const sum = o.lines.reduce((a, l) => a + l.price * l.qty, 0);
    const act = {
      new: `<button type="button" class="btn primary pc-btn-sm" data-pc-action="sme-so:${o.id}" data-testid="pc-me-so-${o.id}">${icon("file-text")} Выставить счёт</button>`,
      invoiced: `<p class="small pc-so-wait">${icon("clock")}<span>${esc(o.invoice)} на ${rub(sum)}. Ждём оплату партнёра.</span></p><button type="button" class="linkbtn" data-pc-action="sme-so:${o.id}" data-testid="pc-me-so-${o.id}">Показать отметку оплаты партнёром (демо)</button>`,
      marked: `<p class="small pc-so-wait">${icon("circle-alert")}<span>Партнёр отметил оплату счёта ${esc(o.invoice)}. Проверьте поступление на ваш счёт.</span></p><button type="button" class="btn primary pc-btn-sm" data-pc-action="sme-so:${o.id}" data-testid="pc-me-so-${o.id}">${icon("check")} Подтвердить поступление</button>`,
      paid: `<p class="small pc-so-wait">${icon("package")}<span>Оплата подтверждена. Скомплектуйте заказ.</span></p><button type="button" class="btn primary pc-btn-sm" data-pc-action="sme-so:${o.id}" data-testid="pc-me-so-${o.id}">${icon("truck")} Отметить отгрузку</button>`,
      shipped: `<p class="small pc-so-wait">${icon("truck")}<span>Отгружено: ${esc(o.delivery)}.</span></p><button type="button" class="linkbtn" data-pc-action="sme-so:${o.id}" data-testid="pc-me-so-${o.id}">Показать получение партнёром (демо)</button>`,
      received: `<p class="small pc-so-wait">${icon("circle-check")}<span>Партнёр получил заказ. Расчёт прошёл по вашему счёту вне RemCard.</span></p>`,
    }[o.st];
    return `<article class="pc-so" data-testid="pc-me-order-${o.id}" data-status="${o.st}">
      <div class="pc-order-head"><div><strong>Заказ партнёра № ${esc(o.id)}</strong><small>${esc(o.buyer)} · ${esc(o.date)} · цены: ${esc(LEVELS[o.level][0].toLowerCase())}</small></div><span class="pill ${SO_TONE[o.st]} pc-status">${SO[at][1]}</span></div>
      <ol class="pc-so-steps" aria-label="Этапы заказа партнёра">${SO.map(([, label], i) => `<li class="${i <= at ? "is-done" : ""} ${i === at ? "is-cur" : ""}"><i></i><span>${label}</span></li>`).join("")}</ol>
      <div class="pc-so-lines">${o.lines.map((l) => `<div><span>${esc(l.name)} <small>${esc(l.size)}</small></span><span>${l.qty} × ${rub(l.price)}</span><strong>${rub(l.price * l.qty)}</strong></div>`).join("")}</div>
      <div class="pc-so-totals"><div><span>Партнёр платит вам</span><strong>${rub(sum)}</strong></div></div>
      <dl class="pc-dl"><div><dt>Получение</dt><dd>${esc(o.delivery)}</dd></div></dl>${act}</article>`;
  };
  return `<div class="pc-me-sell" data-testid="pc-me-sell"><h4>${icon("users")} Партнёры-покупатели</h4>
      <p class="small">Партнёр отправляет запрос из списка «Поставщики». Вы подтверждаете сотрудничество и уровень цен, после этого он видит ваши цены и заказывает из заявок своих клиентов. Менеджер получает уведомление в кабинете и в боте RemCard PROF.</p>
      <div class="pc-me-col"><div class="row between"><strong>Запросы на сотрудничество</strong><span class="small">${reqs.length ? `${reqs.length}` : "пока нет"}</span></div>
        ${reqs.length ? reqs.map(reqCard).join("") : ""}
        <div class="row"><button type="button" class="linkbtn" data-pc-action="sme-demo-req" data-testid="pc-me-demo-req" ${reqs.length >= BUYERS.length ? "disabled" : ""}>Показать запрос партнёра (демо)</button></div></div>
      <div class="pc-me-col"><div class="row between"><strong>Заказы партнёров</strong><span class="small">${orders.length ? `${orders.length}` : "пока нет"}</span></div>
        ${orders.length ? orders.map(orderCard).join("") : ""}
        <div class="row"><button type="button" class="linkbtn" data-pc-action="sme-demo-order" data-testid="pc-me-demo-order" ${hasOk ? "" : "disabled"}>Показать заказ партнёра (демо)</button>${hasOk ? "" : `<span class="small">сначала подтвердите запрос партнёра</span>`}</div></div>
      <p class="small">Расчёт идёт по вашему счёту напрямую между вами и партнёром: RemCard платёж не проводит. Кошелёк и взаиморасчёты RemCard не затрагиваются. Ваши дилерские цены видят только подтверждённые вами партнёры.</p></div>`;
}

/* ---------- Подсказка на вкладке «Вид на сайте» ---------- */
export function supSiteHint(s, icon) {
  if (!s.manage) return "";
  const open = ["none", "draft", "withdrawn", "rejected"].includes(SME.st);
  return `<section class="panel row between pc-me-hint" data-testid="pc-me-hint"><div class="pc-me-t"><span class="pc-sup-ico">${icon("handshake")}</span><div><strong>${open ? "Продавать другим партнёрам" : "Ваш статус поставщика"}</strong><small>${open ? "Отдельная заявка: после проверки партнёры в ваших категориях увидят вас как поставщика." : `${api().STATUS[SME.st][0]}${supMeVisible() ? " · партнёры видят вас в списке «Поставщики»" : ""}`}</small></div></div>
      <button type="button" class="btn pc-btn-sm" data-pc-action="${open ? "sme-open" : "sme-goto"}" data-testid="pc-me-hint-btn">${open ? "Подать заявку" : "Открыть"}</button></section>`;
}

/* ---------- Страница заявки ---------- */
const chk = (name, val, on, label, hint, type = "checkbox") => `<label class="pc-check"><input type="${type}" name="${name}" value="${esc(val)}" data-pc-sme="${name}" ${on ? "checked" : ""}><span><strong>${esc(label)}</strong>${hint ? `<small>${hint}</small>` : ""}</span></label>`;
const txt = (name, label, val, ph) => `<label class="field"><span>${label}</span><input type="text" name="${name}" value="${esc(val)}" placeholder="${esc(ph)}" maxlength="80" autocomplete="off" data-pc-sme="${name}" data-testid="pc-sme-${name}"></label>`;

function liveHtml(icon) {
  const A = api(); const f = form();
  const need = A.needProof(f.role);
  const errs = SME.tried ? A.problems(f) : [];
  return `${errs.length ? `<div class="notice pc-me-err" role="alert" data-testid="pc-sme-errors">${icon("triangle-alert")}<span><strong>Чтобы отправить заявку:</strong><ul>${errs.map(([, t]) => `<li>${esc(t)}</li>`).join("")}</ul></span></div>` : ""}
    ${f.cats.length ? `<p class="notice pc-me-note" data-testid="pc-sme-reach">${icon("users")}<span>После одобрения вас увидят <strong>${reachLine(f.cats)}</strong> сети, которые продают товары или оказывают услуги в категориях: ${esc(catsText(f.cats))}.</span></p>` : `<p class="small">Выберите категории — покажем, сколько партнёров вас увидит.</p>`}
    ${need ? `<p class="small">${icon("lock")} Для статуса «${esc(A.roleOf(f.role).label)}» нужен договор дистрибуции или письмо производителя. Без него значок не подтверждается.</p>` : ""}
    ${supPreview(icon)}`;
}

export function supApplyPage(s, icon) {
  const A = api(); const f = form();
  const sec = (n, title, body) => `<section class="panel stack pc-me-sec"><h3><span class="pc-me-n">${n}</span>${title}</h3>${body}</section>`;
  const doc = ([id, label]) => {
    const need = id === "req" || (id === "proof" && A.needProof(f.role));
    return `<div class="pc-me-doc" data-testid="pc-sme-doc-${id}"><span>${icon(f.docs[id] ? "file-check" : "file")}<span><strong>${label}</strong><small>${need ? "обязательно" : "по желанию"}${f.docs[id] ? ` · ${id === "price" ? "прайс.xlsx" : id === "req" ? "реквизиты.pdf" : "договор.pdf"} (демо)` : ""}</small></span></span>
      <button type="button" class="btn pc-btn-sm" data-pc-action="sme-doc:${id}" data-testid="pc-sme-doc-btn-${id}">${f.docs[id] ? "Убрать" : "Приложить"}</button></div>`;
  };
  return `<div class="stack pc-section pc-me-page" data-testid="pc-me-page">
    <button type="button" class="linkbtn pc-back" data-pc-action="sme-back" data-testid="pc-sme-back">${icon("arrow-left")} Ко всем поставщикам</button>
    <section class="panel stack pc-supplier-head"><h2>Заявка на статус поставщика</h2>
      <p class="muted">Это отдельная заявка от публикации каталога на сайте. Администрация RemCard проверяет вас как поставщика по каждой категории. После одобрения ваши условия увидят партнёры, которые работают в этих категориях.</p>
      ${SME.st === "clarify" ? `<p class="notice pc-me-note">${icon("message-circle-question")}<span><strong>Вопрос администрации:</strong> ${esc(SME.question)}</span></p>` : ""}
      ${supMeVisible() && SME.st !== "moderation" ? `<p class="notice pc-me-note">${icon("info")}<span>Сроки, оплата и минимальный заказ меняются сразу. Новые категории и смена роли уходят на проверку, а показ в уже одобренных категориях не прерывается.</span></p>` : ""}
      <div class="row"><button type="button" class="linkbtn" data-pc-action="sme-example" data-testid="pc-sme-example">Заполнить примером (демо)</button></div></section>
    ${sec(1, "Кем вы являетесь", `<fieldset class="pc-sup-modes"><legend>Роль</legend>${A.ROLES.map((r) => chk("role", r.id, f.role === r.id, r.label, esc(r.hint) + (r.proof ? " · нужен документ" : ""), "radio")).join("")}</fieldset>
      <fieldset class="pc-sup-modes"><legend>Особенности</legend>${A.FLAGS.map(([id, label]) => chk("flags", id, f.flags.includes(id), label, "")).join("")}</fieldset>`)}
    ${sec(2, "Что вы поставляете", `<fieldset class="pc-sup-modes"><legend>Категории · как при регистрации · сколько партнёров сети их ведут</legend><div class="pc-me-cats">${catsHtml(f)}</div></fieldset>
      ${txt("brands", "Бренды и производители", f.brands, "Например: Tandoor, Профильдорс")}
      <fieldset class="pc-sup-modes"><legend>Откуда ассортимент</legend>${A.SOURCE.map(([id, label]) => chk("source", id, f.source === id, label, id === "1c" ? "Каталог выгружается из вашей 1С, как для клиентов" : id === "none" ? "Партнёры увидят карточку без каталога и смогут запросить условия" : "", "radio")).join("")}</fieldset>`)}
    ${sec(3, "Куда и как поставляете", `<fieldset class="pc-sup-modes"><legend>География</legend>${A.GEO.map(([id, label]) => chk("geo", id, f.geo === id, label, "", "radio")).join("")}</fieldset>
      <fieldset class="pc-sup-modes"><legend>Получение</legend>${A.DELIV.map(([id, label]) => chk("deliv", id, f.deliv.includes(id), label, "")).join("")}</fieldset>`)}
    ${sec(4, "Условия для партнёров", `<fieldset class="pc-sup-modes"><legend>Дилерские цены</legend>${A.PRICES.map(([id, label]) => chk("prices", id, f.prices === id, label, id === "on-approve" ? "Рекомендуем: цены видят только те, кого вы подтвердили" : "", "radio")).join("")}</fieldset>
      <div class="pc-me-two">${txt("min", "Минимальный заказ", f.min, "Например: от 5 000 ₽")}${txt("days", "Срок поставки", f.days, "Например: 2–4 дня")}</div>
      <fieldset class="pc-sup-modes"><legend>Оплата</legend>${A.PAY.map(([id, label]) => chk("pay", id, f.pay.includes(id), label, "")).join("")}</fieldset>`)}
    ${sec(5, "Документы", `<div class="pc-me-docs">${A.DOCS.map(doc).join("")}</div><p class="small">Файлы видны только администрации RemCard. В прототипе вложения условные.</p>`)}
    ${sec(6, "Согласие", chk("consent", "1", f.consent, "Согласен показывать условия партнёрам", "Название, категории, география, сроки и оплата будут видны партнёрам в списке «Поставщики». Дилерские цены — по выбранному правилу."))}
    <div class="pc-me-live" data-pc-sme-live data-testid="pc-sme-live">${liveHtml(noIcon)}</div>
    <div class="row"><button type="button" class="btn primary" data-pc-action="sme-submit" data-testid="pc-sme-submit">${icon("send")} ${supMeVisible() && SME.st !== "moderation" ? "Сохранить и отправить" : "Отправить на модерацию"}</button><button type="button" class="btn" data-pc-action="sme-draft" data-testid="pc-sme-draft">Сохранить черновик</button><button type="button" class="btn" data-pc-action="sme-back">Отмена</button></div>
    <p class="small">Отправка заявки ничего не меняет в вашем каталоге для клиентов, ценах и заявках. Данные демонстрационные.</p></div>`;
}

/* ---------- Действия ---------- */
export function handleSupMeAction(ctx, kind, id, el) {
  if (!kind.startsWith("sme-")) return false;
  const { s, config, rerender } = ctx; const A = api();
  if (!s.manage) return true;
  const to = (v) => { s.tab = "suppliers"; s.view = ""; s.order = ""; s.full = false; SME.page = v; };
  const live = () => { const el2 = document.querySelector("[data-pc-sme-live]"); if (el2) el2.innerHTML = liveHtml(noIcon); };
  if (kind === "sme-open") { to(true); SME.tried = false; rerender(); window.scrollTo({ top: 0 }); return true; }
  if (kind === "sme-goto") { to(false); rerender("pc-me"); window.scrollTo({ top: 0 }); return true; }
  if (kind === "sme-back") { SME.page = false; rerender("pc-me-apply"); window.scrollTo({ top: 0 }); return true; }
  if (kind === "sme-example") { const keep = form().consent; SME.form = A.example(); SME.form.consent = keep; rerender("pc-sme-example"); return true; }
  if (kind === "sme-doc") { const f = form(); f.docs[id] = !f.docs[id]; rerender(`pc-sme-doc-btn-${id}`); return true; }
  if (kind === "sme-draft") { if (!["approved", "partial", "moderation"].includes(SME.st)) SME.st = "draft"; SME.page = false; config.notify("Черновик заявки сохранён."); rerender(); return true; }
  if (kind === "sme-submit") {
    const f = form(); SME.tried = true;
    if (A.problems(f).length) { live(); document.querySelector('[data-testid="pc-sme-errors"]')?.scrollIntoView({ block: "center" }); return true; }
    const was = SME.st;
    if (was === "approved" || was === "partial") SME.live = okCats().filter((c) => f.cats.includes(c));
    SME.st = "moderation"; SME.page = false; SME.decisions = {}; SME.tried = false;
    hist(was === "none" || was === "draft" || was === "withdrawn" ? "Заявка на статус поставщика отправлена" : "Заявка отправлена повторно");
    config.notify("Заявка отправлена на модерацию. Ответ придёт в кабинет и в бот RemCard PROF (демо).");
    rerender("pc-me"); window.scrollTo({ top: 0 }); return true;
  }
  if (kind === "sme-withdraw-app") { SME.st = SME.live.length ? "approved" : "draft"; if (SME.live.length) { SME.decisions = Object.fromEntries(SME.live.map((c) => [c, "ok"])); SME.live = []; } hist("Заявка отозвана"); config.notify("Заявка отозвана. Черновик сохранён."); rerender("pc-me-apply"); return true; }
  if (kind === "sme-demo") {
    const f = form();
    if (id === "ok") { SME.decisions = Object.fromEntries(f.cats.map((c) => [c, "ok"])); SME.st = "approved"; SME.reason = ""; SME.live = []; hist("Заявка одобрена по всем категориям"); config.notify(`Демо: администрация одобрила заявку. Вас видят ${reachLine(f.cats)} сети.`); }
    if (id === "part") { SME.decisions = Object.fromEntries(f.cats.map((c, i) => [c, i === 0 ? "ok" : "no"])); SME.st = "partial"; SME.reason = "Для этих категорий нужны подтверждающие документы; можно подать их отдельной заявкой."; SME.live = []; hist("Заявка одобрена частично"); config.notify("Демо: заявка одобрена по части категорий."); }
    if (id === "ask") { SME.st = "clarify"; SME.question = A.needProof(f.role) ? "Приложите договор дистрибуции или письмо производителя и уточните, какие бренды вы поставляете." : "Уточните, откуда берётся ассортимент и какой минимальный заказ вы готовы принимать от партнёров."; hist("Администрация вернула заявку с вопросом"); config.notify("Демо: администрация вернула заявку с вопросом."); }
    if (id === "no") { SME.st = "rejected"; SME.reason = "Не удалось подтвердить статус по документам. Приложите договор дистрибуции и подайте заявку заново."; SME.live = []; hist("Заявка отклонена"); config.notify("Демо: заявка отклонена."); }
    rerender("pc-me"); return true;
  }
  if (kind === "sme-pause") { SME.live = []; SME.keep = { ...SME.decisions }; SME.prev = SME.st; SME.st = "paused"; hist("Показ приостановлен вами"); config.notify("Показ приостановлен: партнёры вас не видят. Подтверждённое сотрудничество сохраняется."); rerender("pc-me-resume"); return true; }
  if (kind === "sme-resume") { SME.st = SME.prev || "approved"; SME.decisions = SME.keep || SME.decisions; hist("Показ возвращён без повторной проверки"); config.notify("Показ возвращён. Повторная модерация не нужна: условия не менялись."); rerender("pc-me-pause"); return true; }
  if (kind === "sme-drop") {
    if (SME.orders.some((o) => o.st !== "received")) { config.notify("Есть незавершённые заказы партнёров. Закройте их, затем снимите статус.", "info"); return true; }
    SME.st = "withdrawn"; SME.decisions = {}; SME.live = []; hist("Статус поставщика снят вами"); config.notify("Статус поставщика снят. Партнёры вас больше не видят."); rerender("pc-me-apply"); return true;
  }
  if (kind === "sme-demo-req") {
    const b = BUYERS.find((x) => !SME.reqs.some((r) => r.id === x.id)); if (!b) return true;
    SME.reqs.push({ ...b, st: "new" }); config.notify(`Демо: ${b.name} запросил сотрудничество. Уведомление пришло в кабинет и в бот.`, "info"); rerender(`pc-me-req-ok-${b.id}`); return true;
  }
  if (kind === "sme-req-ok") {
    const r = SME.reqs.find((x) => x.id === id); if (!r || r.st !== "new") return true;
    config.openDialog(`Подтвердить сотрудничество: ${r.name}`, `<div class="stack pc-sup-dlg" data-pc-smereq="${esc(r.id)}" data-testid="pc-me-req-dialog"><p class="muted">Партнёр увидит ваши дилерские цены и сможет отправлять заказы из заявок своих клиентов. Уровень цен можно поменять позже.</p>
      <fieldset class="pc-sup-modes"><legend>Уровень цен для партнёра</legend>${Object.entries(LEVELS).map(([k, [l, m]]) => `<label class="pc-check"><input type="radio" name="pc-me-level" value="${k}" ${k === "dealer" ? "checked" : ""}><span><strong>${l}</strong><small>${Math.round((1 - m) * 100)} % от розничной цены</small></span></label>`).join("")}</fieldset>
      <div class="row"><button type="button" class="btn primary" data-pc-action="sme-req-ok2" data-testid="pc-me-req-confirm">Подтвердить</button><button type="button" class="btn" data-action="close-dialog">Отмена</button></div></div>`);
    return true;
  }
  if (kind === "sme-req-ok2") {
    const box = document.querySelector("[data-pc-smereq]"); const r = box && SME.reqs.find((x) => x.id === box.dataset.pcSmereq); if (!r) return true;
    r.st = "ok"; r.level = box.querySelector('input[name="pc-me-level"]:checked')?.value || "dealer"; config.closeDialog(); hist(`Подтверждено сотрудничество: ${r.name}`);
    config.notify(`Сотрудничество с «${r.name}» подтверждено. Партнёр видит ваши цены (демо).`); rerender(`pc-me-demo-order`); return true;
  }
  if (kind === "sme-req-no") {
    const r = SME.reqs.find((x) => x.id === id); if (!r || r.st !== "new") return true;
    config.openDialog(`Отказать: ${r.name}`, `<div class="stack pc-sup-dlg" data-pc-smeno="${esc(r.id)}" data-testid="pc-me-no-dialog"><p class="muted">Партнёр увидит причину в своём кабинете. Ваши цены ему не открываются.</p>
      <label class="field"><span>Причина</span><select name="pc-me-why" data-testid="pc-me-why"><option>Не работаем в вашем городе</option><option>Не подходит минимальный объём</option><option>Нужно сначала обсудить условия</option></select></label>
      <div class="row"><button type="button" class="btn primary" data-pc-action="sme-req-no2" data-testid="pc-me-no-confirm">Отказать</button><button type="button" class="btn" data-action="close-dialog">Отмена</button></div></div>`);
    return true;
  }
  if (kind === "sme-req-no2") {
    const box = document.querySelector("[data-pc-smeno]"); const r = box && SME.reqs.find((x) => x.id === box.dataset.pcSmeno); if (!r) return true;
    r.st = "no"; r.why = `Причина: ${box.querySelector("select")?.value || "не указана"}.`; config.closeDialog(); hist(`Отказано в сотрудничестве: ${r.name}`); config.notify(`Отказ отправлен партнёру «${r.name}».`); rerender("pc-me-demo-req"); return true;
  }
  if (kind === "sme-demo-order") {
    const r = SME.reqs.find((x) => x.st === "ok"); if (!r) return true;
    SME.seq += 1; const m = LEVELS[r.level][1];
    SME.orders.unshift({ id: `ПЗ-${SME.seq}`, buyer: r.name, level: r.level, date: stamp(), st: "new", lines: GOODS.map((g) => ({ name: g.name, size: g.size, qty: g.qty, price: Math.round((g.rrc * m) / 10) * 10 })), delivery: `самовывоз со склада · ${CITY}`, invoice: "" });
    config.notify(`Демо: ${r.name} отправил заказ. Уведомление пришло в кабинет и в бот.`, "info"); rerender(`pc-me-so-ПЗ-${SME.seq}`); return true;
  }
  if (kind === "sme-so") {
    const o = SME.orders.find((x) => x.id === id); if (!o) return true;
    const next = { new: "invoiced", invoiced: "marked", marked: "paid", paid: "shipped", shipped: "received" }[o.st]; if (!next) return true;
    if (next === "invoiced") { SME.inv += 1; o.invoice = `Счёт № О-${SME.inv}`; }
    if (next === "shipped") o.delivery = `самовывоз со склада · ${CITY}, отгружено`;
    o.st = next;
    config.notify({ invoiced: "Счёт выставлен. Партнёр получил его в кабинете и в боте.", marked: "Демо: партнёр отметил оплату счёта.", paid: "Поступление подтверждено. Партнёр увидит, что заказ оплачен.", shipped: "Отгрузка отмечена. Партнёр увидит её в заказе.", received: "Демо: партнёр отметил получение." }[next]);
    rerender(`pc-me-so-${o.id}`); return true;
  }
  return true;
}

/* Ввод в форме заявки: без перерисовки страницы, чтобы не терять фокус. */
const catsHtml = (f) => api().catsFor(f.role).map(([id, label, n]) => chk("cats", id, f.cats.includes(id), label, `${n} ${plural(n, "партнёр", "партнёра", "партнёров")}`)).join("");
export function handleSupMeInput(e) {
  const el = e.target.closest?.("[data-pc-sme]"); if (!el) return false;
  const f = form(); const k = el.dataset.pcSme;
  if (el.type === "text") { if (e.type !== "input") return true; f[k] = String(el.value).slice(0, 80); }
  else if (e.type === "change") {
    if (k === "consent") f.consent = el.checked;
    else if (el.type === "radio") {
      f[k] = el.value;
      if (k === "role") { const ok = new Set(api().catsFor(f.role).map((c) => c[0])); f.cats = f.cats.filter((c) => ok.has(c)); const cb = document.querySelector(".pc-me-cats"); if (cb) cb.innerHTML = catsHtml(f); }
    }
    else { const set = new Set(f[k]); if (el.checked) set.add(el.value); else set.delete(el.value); f[k] = [...set]; }
  } else return true;
  const box = document.querySelector("[data-pc-sme-live]");
  if (box) box.innerHTML = liveHtml(noIcon);
  return true;
}
