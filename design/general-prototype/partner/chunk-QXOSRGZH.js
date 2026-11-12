import { a as h } from "./chunk-PG3I4FMB.js";
import { a as A } from "./chunk-3HBG25M4.js";
import { a as q } from "./chunk-HYSRPJ57.js";
import { c as P } from "./chunk-5TBO732O.js";
var U = P(A(), 1),
  x = P(q(), 1);
var n = (t) =>
    String(t ?? "").replace(
      /[&<>"']/g,
      (e) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[e],
    ),
  w = {
    brand: ["Фирменный", "Как на действующем сайте"],
    compact: ["Компактный", "QR и условия рядом"],
    light: ["Светлый", "Чистый фон, красные акценты"],
  },
  r = { signedIn: !1, saved: new Map(), offersConsent: !1 },
  f = (t) => `${t.code}|${t.issuer}`,
  $ = new Map();
function Q() {
  ((r.signedIn = !1), r.saved.clear(), (r.offersConsent = !1), $.clear());
}
function M(t, e) {
  if (!r.saved.has(f(t))) return !1;
  let a = $.get(f(t)) || [];
  return (a.push({ ...e }), $.set(f(t), a), !0);
}
function O(t) {
  let e = $.get(f(t)) || [],
    a = (s) =>
      new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(s) +
      " ₽";
  return `<section class="cc-history"><h3>Мои покупки по сертификату</h3>${e.length ? e.map((s) => `<article><strong>${n(s.seller)}</strong><p>Транзакция ${n(s.id)} \xB7 подтверждена через сканер</p><p>До скидки: ${a(s.amount)} \xB7 скидка: ${a(s.discountAmount ?? (s.amount * s.discount) / 100)} \xB7 оплачено: ${a(s.paid ?? s.amount * (1 - s.discount / 100))}</p>${s.lines ? s.lines.map((c) => `<p>${n(c.category)}: ${a(c.amount)}, скидка ${c.discount}%</p>`).join("") : ""}${s.promoAmount ? `<p>Акционные модели: ${a(s.promoAmount)}, без дополнительной скидки по QR.</p>` : ""}</article>`).join("") : "<p>Пока покупок нет. После оформления покупки партнёром через сканер здесь появятся сумма и ваша скидка.</p>"}<p class="cc-small">Связь со сканером работает в одном открытом окне прототипа: откройте вид клиента из кабинета партнёра, сохраните сертификат, затем проведите покупку. Отдельная гостевая вкладка не синхронизируется. Анонимные покупки автоматически к клиенту не привязываются.</p></section>`;
}
function C(t, e = "intro") {
  let a = r.saved.has(f(t));
  return e === "account"
    ? `<section class="cc-panel"><span class="cc-eyebrow">ЛИЧНЫЙ КАБИНЕТ КЛИЕНТА \xB7 ДЕМО</span><h2>Мои сертификаты</h2><p>Здесь собраны ваши сертификаты, партнёры, условия и QR-коды. Сохранение не означает покупку и не расходует лимит.</p><div class="cc-saved"><span class="cc-check">Сохранён в кабинете</span><h3>${n(t.code)}</h3><p>От ${n(t.issuer)} \xB7 предложений: ${R(t).length}</p><ul>${R(
        t,
      )
        .map(
          (s) =>
            `<li><span>${n(s.name)} \xB7 ${n(s.category)}</span><strong>${s.discount}%</strong></li>`,
        )
        .join(
          "",
        )}</ul><button class="pc-primary" data-client-action="open">Условия, партнёры и QR-код</button></div><label class="cc-consent"><input type="checkbox" data-client-consent ${r.offersConsent ? "checked" : ""}><span>Хочу получать полезные предложения партнёров RemCard. Необязательно, можно отключить в любой момент.</span></label><p class="cc-small">В этом прототипе данные живут только до обновления страницы. Сообщения и рассылки не отправляются.</p></section>`
    : e === "register" || e === "login"
      ? `<section class="cc-panel"><span class="cc-eyebrow">${e === "login" ? "ВХОД" : "РЕГИСТРАЦИЯ КЛИЕНТА"} \xB7 ДЕМО</span><h2>Сертификат будет в вашем кабинете</h2><p>В рабочем RemCard здесь проходит ${e === "login" ? "вход в существующий аккаунт" : "регистрация клиента"}. Для проверки прототипа не нужны телефон, пароль или личные данные.</p><ul><li>Не потеряете сертификат в переписке.</li><li>Всегда сможете найти условия, контакты партнёров и QR-код.</li><li>По желанию будете получать подходящие предложения.</li></ul><label class="cc-consent"><input type="checkbox" data-client-consent ${r.offersConsent ? "checked" : ""}><span>Хочу получать предложения партнёров. Это необязательно и не влияет на скидку.</span></label><div class="cc-actions"><button class="pc-primary" data-client-action="complete">${e === "login" ? "Войти в демо и сохранить" : "Зарегистрироваться в демо и сохранить"}</button><button data-client-action="open">Продолжить без регистрации</button></div><p class="cc-small">Создаётся только демонстрационное состояние. Настоящий аккаунт не регистрируется.</p></section>`
      : `<section class="cc-panel"><span class="cc-eyebrow">ДВА СПОСОБА ИСПОЛЬЗОВАТЬ СЕРТИФИКАТ</span><h2>${a ? "Сертификат уже в вашем кабинете" : "Сохраните сертификат, чтобы он был под рукой"}</h2><p>После регистрации он появится в разделе \xABМои сертификаты\xBB: все скидки, принимающие партнёры, контакты и QR-код в одном месте.</p><div class="cc-actions"><button class="pc-primary" data-client-action="${a ? "account" : "register"}">${a ? "Открыть \xABМои сертификаты\xBB" : "Активировать и сохранить в кабинете"}</button>${a ? "" : '<button data-client-action="login">У меня уже есть аккаунт</button>'}<button data-client-action="qr">Показать QR без регистрации</button></div><p class="cc-small"><strong>Регистрация не обязательна для покупки.</strong> Просто покажите QR-код партнёру до оплаты. Активация лишь сохраняет сертификат в кабинете и не расходует его.</p><div class="cc-status" role="status">${a ? "Сохранено в демонстрационном кабинете. Лимит покупок не изменился." : ""}</div></section>`;
}
function I(t, e) {
  let a = e.kind === "company" ? e.profile.name : "Партнёр RemCard";
  return t.profReferral
    ? {
        v: 2,
        code: `DEMO-${t.id}`,
        issuer: "PROF \xB7 RemCard",
        offers: (t.allocations || [t]).map((s) => ({
          name: t.sellerName,
          city: e.profile.city || "Краснодар",
          category: s.category,
          discount: s.discount,
        })),
        excludesPromotions: !0,
        used: t.saleAmount ? 1 : 0,
        limit: 1,
        validUntil: null,
        cancelled: !!t.closed,
        style: "brand",
      }
    : t.certGroup
      ? {
          v: 2,
          code: `DEMO-${t.id}`,
          issuer: t.publicIssuer || a,
          offers: t.acceptors.flatMap((s) =>
            (s.allocations || [s]).map((c) => ({
              name: s.publicName,
              city: s.city,
              category: c.category,
              discount: c.discount,
            })),
          ),
          excludesPromotions: !0,
          used: t.sales.length,
          limit: t.usageLimit,
          validUntil: t.validUntil,
          cancelled: !!t.closed,
          paused: !!t.paused,
          style: "brand",
        }
      : {
          v: 1,
          code: `DEMO-${t.id}`,
          issuer: t.mode === 0 ? t.counterparty : a,
          seller: t.mode === 0 ? a : t.counterparty,
          city: e.profile.city || "Краснодар",
          category: t.publicCategory || "Двери и фурнитура",
          discount: Number(t.discount) || 0,
          used: t.stage >= 3 ? 1 : 0,
          cancelled: !!t.closed,
          style: "brand",
        };
}
function j(t, e) {
  let a = I(t, e);
  return `<section class="case-draft"><div class="draft-created" role="status"><span>Сохранено в этом просмотре</span><h2>Черновик сертификата создан</h2><p>Проверьте карточку и выдайте сертификат. Пока его видите только вы.</p></div><div class="draft-layout"><article class="cert-card draft-art"><div class="cert-wordmark">${h}<span class="cert-demo">ЧЕРНОВИК</span></div><div class="draft-card-content"><p>${a.offers?.length > 1 ? "Групповой сертификат" : "Скидочный сертификат"}</p>${a.offers ? `<h3 class="draft-group-title">${a.offers.length > 1 ? "Один сертификат, несколько предложений" : "Ваше предложение для клиента"}</h3><div class="draft-offers">${a.offers.map((s) => `<div><span>${n(s.name)}<small>${n(s.category)}</small></span><strong>${s.discount}%</strong></div>`).join("")}</div>` : `<strong>${a.discount}%</strong><span>скидка клиенту</span><h3>${n(a.seller)}</h3><p>${n(a.category)}</p>`}</div><div class="draft-code"><span>ЕЩЁ НЕ ВЫДАН</span><strong>${n(a.code)}</strong><small>QR-код и ссылка появятся после выдачи</small></div></article><div class="draft-next"><span class="eyebrow">СЛЕДУЮЩИЙ ШАГ</span><h3>Выдать сертификат</h3><p>После выдачи станет доступна клиентская страница. Её можно отправить ссылкой или скачать в PDF.</p><button class="btn primary" data-action="wf-${t.certGroup ? "cg-issue" : "next"}:${n(t.id)}">Выдать сертификат</button><button class="btn secondary" data-action="wf-edit:${n(t.id)}">Изменить черновик</button><small>Это демо. Выдача не отправляет сообщения клиентам и не создаёт начислений.</small></div></div></section>`;
}
function g(t) {
  let e = new URL("./certificate.html", location.href);
  return (
    (e.hash = x.default.compressToEncodedURIComponent(JSON.stringify(t))),
    e.href
  );
}
function R(t) {
  return (
    t.offers || [
      {
        name: t.seller,
        city: t.city,
        category: t.category,
        discount: t.discount,
      },
    ]
  );
}
function E(t, e, a = !1) {
  let s = new URL(g(t));
  return (
    s.searchParams.set("partner", String(e)),
    a && s.searchParams.set("contact", "1"),
    s.href
  );
}
function k(t, e) {
  return `<div class="cert-partner-actions" data-html2canvas-ignore><a href="${n(E(t, e))}" target="_blank" rel="noopener">Профиль партнёра ↗</a><a href="${n(E(t, e, !0))}" target="_blank" rel="noopener">Связаться ↗</a></div>`;
}
function T(t, e) {
  let a = R(t)[e];
  if (!a) throw Error("Участник не найден.");
  return `<main class="pc-page"><header class="pc-nav"><a href="${n(g(t))}">← Вернуться к сертификату</a><span class="pc-demo">ДЕМО-ПРОФИЛЬ</span></header>
 <section class="pc-hero"><div class="cert-wordmark">${h}</div><div class="pc-partner-heading"><div class="pc-avatar">${n(a.name.trim().charAt(0))}</div><div><p>ПАРТНЁР ПРИНИМАЕТ ВАШ СЕРТИФИКАТ</p><h1>${n(a.name)}</h1><span>${n(a.city)} \xB7 ${n(a.category)}</span></div></div><p class="pc-disclaimer">Пример публичного профиля. Контакты и описание демонстрационные, это не действующая карточка организации.</p><button class="pc-primary" data-profile-action="contact">Связаться с партнёром</button></section>
 <div class="pc-columns"><div><section class="pc-panel"><span class="pc-eyebrow">УСЛОВИЯ ВАШЕГО СЕРТИФИКАТА</span><div class="pc-discount"><strong>${a.discount}%</strong><h2>скидка на ${n(a.category.toLowerCase())}</h2></div>${t.excludesPromotions ? '<p class="cert-exclusion">На акционные модели скидка по сертификату не распространяется.</p>' : ""}<p>Покажите сертификат или назовите код <strong>${n(t.code)}</strong> до оплаты. Эта скидка действует у ${n(a.name)}, не суммируется со скидками других участников сертификата.</p><dl><div><dt>Срок</dt><dd>${t.v === 2 ? (t.validUntil ? new Date(t.validUntil + "T12:00:00").toLocaleDateString("ru-RU") : "Без ограничения") : "Не задан в демо"}</dd></div><div><dt>Покупки по сертификату</dt><dd>${t.v === 2 ? (t.limit === null ? "Без ограничения" : `${t.limit} всего у всех участников`) : "1 в этом примере"}</dd></div></dl><details><summary>Все условия предложения</summary><p>Категория: \xAB${n(a.category)}\xBB. ${t.excludesPromotions ? "Акционные модели исключены." : "Сочетание с акциями уточните у партнёра."} Наличие и место обслуживания уточните до покупки.</p><p>Это демо: код нельзя использовать для настоящей покупки. Публичная ссылка показывает снимок условий и не обновляет статус после действий в кабинете.</p></details></section>
 <section class="pc-panel"><h2>О партнёре</h2><p>Здесь клиент знакомится с компанией или специалистом: направлениями работы, товарами, услугами и местами обслуживания.</p><div class="pc-service"><strong>${n(a.category)}</strong><span>${n(a.city)}</span><p>Демонстрационное предложение. Состав, стоимость и сроки можно обсудить с партнёром.</p></div><button data-profile-action="contact">Уточнить предложение</button></section></div>
 <aside><section class="pc-panel"><h2>Контакты</h2><p class="pc-small">Образцы полей публичного профиля. Не используйте эти данные для связи.</p><dl><div><dt>Город</dt><dd>${n(a.city)}</dd></div><div><dt>Адрес</dt><dd>Демонстрационная точка, реальный адрес не указан</dd></div><div><dt>Телефон</dt><dd><button class="pc-inline-button" data-profile-action="phone">Показать демо-номер</button><span class="pc-phone" hidden>+7 (000) 000-00-00<br><small>Недействующий номер для примера</small></span></dd></div><div><dt>Email</dt><dd>info@example.com<br><small>Тестовый адрес</small></dd></div><div><dt>Время работы</dt><dd>Пн–Пт, 09:00–18:00<br><small>Пример расписания</small></dd></div></dl><p class="pc-small">В рабочем продукте здесь отображаются только публичные контакты, заполненные самим партнёром. Если данных нет, они не выдумываются.</p></section>
 <section class="pc-panel" id="partner-contact"><h2>Связаться с партнёром</h2><p>Кому: <strong>${n(a.name)}</strong>. Сертификат ${n(t.code)} уже прикреплён к обращению.</p><form id="pc-contact-form" data-partner="${n(a.name)}" data-code="${n(t.code)}"><label for="pc-name">Как к вам обращаться <small>необязательно</small></label><input id="pc-name" name="client" placeholder="Вымышленное имя для демо" maxlength="80"><label for="pc-message">Ваш вопрос *</label><textarea id="pc-message" name="message" required maxlength="1500" rows="5">Здравствуйте! Хочу уточнить предложение по сертификату ${n(t.code)}.</textarea><p class="pc-small">Ничего не отправляется партнёру. Используйте вымышленные данные, чтобы проверить путь обращения без регистрации.</p><p class="pc-error" role="alert"></p><button type="submit" class="pc-primary">Отправить в демо</button></form><div class="pc-contact-result" role="status"></div></section></aside></div>
 <footer class="pc-footer"><a href="${n(g(t))}">Все участники и скидки сертификата</a><span>Прототип RemCard \xB7 нет реальных отправок</span></footer></main>`;
}
function J(t) {
  if (t.length > 6e3) throw Error("Ссылка слишком длинная.");
  let e = JSON.parse(
    x.default.decompressFromEncodedURIComponent(t.replace(/^#/, "")) || "null",
  );
  if (e?.v === 2) {
    let a = (c) =>
      typeof c == "string" && c.trim().length > 0 && c.length <= 160;
    if (
      !/^(?:DEMO-RC-\d{1,8}|[АМКС]-[A-F0-9]{8})$/.test(e.code) ||
      !a(e.issuer) ||
      !w[e.style] ||
      !Array.isArray(e.offers) ||
      e.offers.length < 1 ||
      e.offers.length > 50 ||
      !Number.isInteger(e.used) ||
      e.used < 0 ||
      e.used > 1e6 ||
      (e.limit !== null && ![1, 3, 5].includes(e.limit)) ||
      (e.validUntil !== null &&
        !(
          typeof e.validUntil == "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(e.validUntil) &&
          Number.isFinite(Date.parse(e.validUntil))
        ))
    )
      throw Error("Ссылка повреждена.");
    let s = e.offers.map((c) => {
      if (
        !c ||
        ![c.name, c.city, c.category].every(a) ||
        !Number.isFinite(c.discount) ||
        c.discount < 0 ||
        c.discount > 100
      )
        throw Error("Условия повреждены.");
      return {
        name: c.name,
        city: c.city,
        category: c.category,
        discount: c.discount,
      };
    });
    if (
      e.excludesPromotions !== void 0 &&
      typeof e.excludesPromotions != "boolean"
    )
      throw Error("Некорректные условия акций.");
    return {
      v: 2,
      code: e.code,
      issuer: e.issuer,
      usageMode: ["once_per_partner", "multiple_per_partner"].includes(e.usageMode) ? e.usageMode : null,
      offers: s,
      excludesPromotions: e.excludesPromotions === !0,
      used: e.used,
      limit: e.limit,
      validUntil: e.validUntil,
      cancelled: e.cancelled === !0,
      paused: e.paused === !0,
      style: e.style,
    };
  }
  if (
    !e ||
    e.v !== 1 ||
    !/^(?:DEMO-RC-\d{1,8}|[АМКС]-[A-F0-9]{8})$/.test(e.code) ||
    !Number.isFinite(e.discount) ||
    e.discount < 0 ||
    e.discount > 100 ||
    !w[e.style]
  )
    throw Error("Ссылка повреждена или имеет неизвестный формат.");
  for (let a of ["issuer", "seller", "city", "category"])
    if (typeof e[a] != "string" || !e[a].trim() || e[a].length > 160)
      throw Error("Не удалось прочитать данные сертификата.");
  return {
    v: 1,
    code: e.code,
    issuer: e.issuer,
    seller: e.seller,
    city: e.city,
    category: e.category,
    discount: e.discount,
    used: e.used === 1 ? 1 : 0,
    cancelled: e.cancelled === !0,
    style: e.style,
  };
}
function S(t) {
  let e = Array.isArray(t.offers),
    a = e ? t.limit : 1,
    s =
      e && t.validUntil && t.validUntil < new Date().toISOString().slice(0, 10),
    c = `<dl><div><dt>Срок действия</dt><dd>${e ? (t.validUntil ? new Date(t.validUntil + "T12:00:00").toLocaleDateString("ru-RU") : "Без ограничения") : "Не задан в демо"}</dd></div><div><dt>Статус</dt><dd>${t.cancelled ? "Отменён" : t.paused ? "Приём приостановлен" : s ? "Срок истёк" : a !== null && t.used >= a ? "Лимит использован" : "Готов к показу"}</dd></div><div><dt>Использование</dt><dd>${t.used}${a === null ? " \xB7 без ограничения" : ` из ${a}`} в этом примере</dd></div></dl>`;
  return `<article class="cert-card cert-${t.style}" data-cert-document>
 <div class="cert-wordmark">${h}<span class="cert-demo">ДЕМО</span></div>
 <header class="cert-heading"><p>ВАША ВЫГОДА С REMCARD</p><h2>Скидочный сертификат RemCard</h2><span>Для просмотра не нужны вход и регистрация</span></header>
 ${t.excludesPromotions ? '<p class="cert-exclusion">На акционные модели скидка по сертификату не распространяется.</p>' : ""}
 <section class="cert-issuer"><small>${e ? `Предложений: ${t.offers.length}. Один QR-код для всех выбранных категорий.` : `Предложение партнёра ${n(t.seller)} \xB7 ${n(t.city)}`}</small></section>
 <div class="cert-main"><div class="cert-redeem"><div class="cert-qr"><img data-cert-qr alt="QR-код для открытия демонстрационного сертификата" width="300" height="300"></div><span class="cert-caption">ПРОМОКОД</span><strong class="cert-code">${n(t.code)}</strong><button class="cert-text-button" data-cert-action="code">Скопировать промокод</button></div>
 <div class="cert-offer">${e ? `<h3>Где действует сертификат</h3><div class="cert-acceptor-offers">${t.offers.map((d, o) => `<section><div><strong>${n(d.name)}</strong><small>${n(d.city)} \xB7 ${n(d.category)}</small></div><b>${d.discount}%<small>скидка</small></b>${k(t, o)}</section>`).join("")}</div><p>Откройте профиль участника, чтобы посмотреть условия и контакты. Каждая скидка действует только у указанного участника; проценты не складываются.</p>` : `<div class="cert-discount"><strong>${t.discount}%</strong><span>скидка клиенту</span></div><h3>${n(t.seller)}</h3><p>${n(t.category)}</p><dl><div><dt>Город</dt><dd>${n(t.city)}</dd></div></dl>${k(t, 0)}`}${c}</div></div>
 <div class="cert-buttons" data-html2canvas-ignore><button data-cert-action="pdf">Скачать PDF</button><button class="cert-primary" data-cert-action="share">Поделиться ссылкой</button></div>
 <section class="cert-instructions"><h3>Как воспользоваться</h3><ol><li><strong>Выберите предложение</strong><span>Уточните у партнёра, какие товары и услуги входят в условия.</span></li><li><strong>Покажите QR до оплаты</strong><span>Можно без регистрации и активации. Продавец сканирует QR-код или вводит промокод.</span></li><li><strong>Проверьте скидку в расчёте</strong><span>Партнёр подтверждает покупку, а не обязательное \xABпринятие\xBB сертификата клиентом.</span></li></ol><p>Хотите сохранить сертификат под рукой? После регистрации активируйте его в кабинете клиента. Он появится в разделе \xABМои сертификаты\xBB со всеми условиями и контактами участников.</p></section>
 <section class="cert-terms"><h3>Условия и информация для клиента</h3><p>${e ? t.usageMode === "once_per_partner" ? "Одна покупка у каждого указанного партнёра. Покупка у одного не закрывает доступ у остальных. Просмотр и сканирование не расходуют использование." : t.usageMode === "multiple_per_partner" ? "Можно использовать несколько раз у каждого указанного партнёра по его условиям." : "Сертификат принимают только участники, перечисленные выше, по своим категориям и скидкам. Лимит покупок, если указан, общий для всех предложений." : `Скидка ${t.discount}% показана для категории \xAB${n(t.category)}\xBB у партнёра \xAB${n(t.seller)}\xBB.`} ${t.excludesPromotions ? "Акционные модели исключены. Скидка применяется отдельно к обычным позициям каждой категории." : "Сочетание с акциями необходимо уточнить у партнёра."} Ассортимент и филиал уточните до покупки.</p><p>Это демонстрация интерфейса, не действующее предложение. Код не даёт права на скидку и не принимается к оплате. Срок, лимит и правила реального сертификата устанавливаются отдельно.</p><p>По этой ссылке открывается сохранённый пример. Его статус не обновляется после действий в кабинете.</p></section>
 <footer class="cert-footer"><a href="https://remcard.ru" target="_blank" rel="noopener">Открыть RemCard ↗</a><span>Демонстрационный сертификат</span></footer></article>`;
}
function H(t) {
  return `<div class="cert-preview"><span class="eyebrow">СЕРТИФИКАТ / ВИД КЛИЕНТА</span><h2>Узнаваемый RemCard. Понятные условия.</h2><p>Сравните три варианта оформления. Содержимое и действия клиента одинаковы.</p><div class="cert-variants" role="group" aria-label="Оформление сертификата">${Object.entries(
    w,
  )
    .map(
      ([e, [a, s]]) =>
        `<button data-cert-style="${e}" aria-pressed="${t.style === e}"><strong>${a}</strong><small>${s}</small></button>`,
    )
    .join(
      "",
    )}</div><a class="cert-guest-link" data-cert-guest href="${n(g(t))}" target="_blank" rel="noopener">Открыть как незарегистрированный клиент ↗</a><p class="input-hint">Без входа в RemCard. Доступ к самому прототипу зависит от настроек его публикации. Пометки о клиенте и внутренние расчёты в ссылку не попадают.</p><div data-cert-mount data-cert-payload="${n(JSON.stringify(t))}">${S(t)}</div><div class="cert-feedback" role="status" aria-live="polite"></div></div>`;
}
function G(t) {
  return `<main class="cert-guest"><div class="cert-guest-note">Пример клиентской страницы \xB7 без регистрации в RemCard</div><div data-client-area>${C(t)}</div><div data-cert-mount data-cert-payload="${n(JSON.stringify(t))}">${S(t)}</div><div class="cert-feedback" role="status" aria-live="polite"></div></main>`;
}
function L(t, e, a) {
  t.innerHTML = C(e, a) + (a === "account" ? O(e) : "");
}
async function F(t = document) {
  let e = t.querySelector("[data-cert-mount]");
  if (!e) return;
  let a = JSON.parse(e.dataset.certPayload),
    s = e.querySelector("[data-cert-qr]");
  if (
    e.closest(".cert-preview") &&
    !e.parentElement.querySelector("[data-client-area]")
  ) {
    let c = document.createElement("div");
    ((c.dataset.clientArea = ""), (c.innerHTML = C(a)), e.before(c));
  }
  try {
    s.src = await U.default.toDataURL(g(a), {
      width: 600,
      margin: 3,
      errorCorrectionLevel: "M",
    });
  } catch {
    s.replaceWith(
      Object.assign(document.createElement("p"), {
        textContent:
          "QR-код недоступен. Используйте кнопку \xABПоделиться ссылкой\xBB.",
      }),
    );
  }
}
function b(t, e, a) {
  let s = t.parentElement.querySelector(".cert-feedback");
  if (((s.textContent = e), a)) {
    let c = document.createElement("input");
    ((c.readOnly = !0),
      (c.value = a),
      c.setAttribute("aria-label", "Текст для копирования"),
      s.append(c),
      c.focus(),
      c.select());
  }
}
async function D(t, e, a) {
  try {
    (await navigator.clipboard.writeText(e), b(t, a));
  } catch {
    b(t, "Автокопирование недоступно. Выделите и скопируйте:", e);
  }
}
document.addEventListener("click", async (t) => {
  let e = t.target.closest("[data-client-action]");
  if (e) {
    let m = e.closest(".cert-guest,.cert-preview"),
      v = m.querySelector("[data-cert-mount]"),
      y = m.querySelector("[data-client-area]"),
      i = JSON.parse(v.dataset.certPayload),
      l = e.dataset.clientAction;
    if (l === "qr") {
      ((v.hidden = !1),
        v
          .querySelector(".cert-redeem")
          .scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    let u = "intro";
    ((l === "register" || l === "login") &&
      ((u = r.signedIn ? "account" : l), r.signedIn && r.saved.set(f(i), i)),
      l === "account" && (u = "account"),
      l === "complete" &&
        ((r.signedIn = !0), r.saved.set(f(i), i), (u = "account")),
      L(y, i, u),
      (v.hidden = u !== "intro"),
      y.scrollIntoView({ block: "start" }));
    return;
  }
  let a = t.target.closest("[data-profile-action]");
  if (a) {
    (a.dataset.profileAction === "phone" &&
      ((a.hidden = !0), (a.nextElementSibling.hidden = !1)),
      a.dataset.profileAction === "contact" &&
        (document
          .getElementById("partner-contact")
          .scrollIntoView({ behavior: "smooth", block: "start" }),
        document.getElementById("pc-message").focus({ preventScroll: !0 })));
    return;
  }
  let s = t.target.closest("[data-cert-style]"),
    c = t.target.closest("[data-cert-action]");
  if (!s && !c) return;
  let d = (s || c).closest(".cert-preview,.cert-guest"),
    o = d.querySelector("[data-cert-mount]"),
    p = JSON.parse(o.dataset.certPayload);
  if (s) {
    ((p.style = s.dataset.certStyle),
      (o.dataset.certPayload = JSON.stringify(p)),
      (o.innerHTML = S(p)),
      d
        .querySelectorAll("[data-cert-style]")
        .forEach((m) =>
          m.setAttribute("aria-pressed", m.dataset.certStyle === p.style),
        ),
      (d.querySelector("[data-cert-guest]").href = g(p)),
      await F(d));
    return;
  }
  if (c.dataset.certAction === "code")
    return D(o, p.code, "Промокод скопирован.");
  if (c.dataset.certAction === "share")
    return D(o, g(p), "Ссылка скопирована. Клиенту не нужен аккаунт RemCard.");
  if (c.dataset.certAction === "pdf") {
    ((c.disabled = !0), (c.textContent = "Готовим PDF…"));
    try {
      let { default: m } = await import("./html2canvas-PLECWQBY.js"),
        { jsPDF: v } = await import("./jspdf.es.min-4X5GC7H6.js");
      await document.fonts.ready;
      let y = await m(o.querySelector("[data-cert-document]"), {
          scale: 2,
          backgroundColor: null,
          useCORS: !0,
        }),
        i = 210,
        l = (i * y.height) / y.width,
        u = new v({
          orientation: l >= i ? "portrait" : "landscape",
          unit: "mm",
          format: [i, l],
          compress: !0,
        });
      (u.addImage(y.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, i, l),
        u.save(`${p.code}.pdf`),
        b(o, "PDF готов. В нём только информация для клиента."));
    } catch {
      b(
        o,
        "Не удалось создать PDF. Попробуйте ещё раз или поделитесь ссылкой.",
      );
    } finally {
      ((c.disabled = !1), (c.textContent = "Скачать PDF"));
    }
  }
});
document.addEventListener("change", (t) => {
  t.target.matches("[data-client-consent]") &&
    (r.offersConsent = t.target.checked);
});
document.addEventListener("submit", (t) => {
  let e = t.target;
  if (e.id !== "pc-contact-form") return;
  t.preventDefault();
  let a = new FormData(e),
    s = String(a.get("message") || "").trim();
  if (!s) {
    e.querySelector(".pc-error").textContent =
      "Напишите, что хотите уточнить у партнёра.";
    return;
  }
  e.querySelector(".pc-error").textContent = "";
  let c = document.querySelector(".pc-contact-result");
  ((c.innerHTML = `<h3>Демонстрационное обращение создано</h3><p>Получатель: ${n(e.dataset.partner)}. Сертификат: ${n(e.dataset.code)}.</p><blockquote>${n(s)}</blockquote><p>Реального сообщения нет. В рабочем продукте обращение появится у выбранного партнёра; дальнейший вход и способы связи зависят от выбранного канала.</p>`),
    c.scrollIntoView({ behavior: "smooth", block: "nearest" }));
});
export {
  Q as a,
  M as b,
  I as c,
  j as d,
  T as e,
  J as f,
  H as g,
  G as h,
  F as i,
  g as j,
};
