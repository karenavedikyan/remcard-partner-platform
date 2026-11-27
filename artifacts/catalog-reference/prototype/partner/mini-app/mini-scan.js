/*
 * «Сканер» по сценарию ЛК (ScannerHub.tsx, ReceivingAppealScannerPanels.tsx, PurchaseReviewModal.tsx):
 * предпросмотр документа → суммы покупки → «Проверьте покупку» → покупка и привязка заказа к обращению в «Клиентах».
 * В рабочем мини-кабинете сейчас только проверка (MiniAppScanVerify.tsx) — этот сценарий требует разработки.
 * «Кошелёк» (card-info, MiniAppRoot.tsx), «Полный кабинет» (MiniAppFullCabinet.tsx).
 */
(function () {
  'use strict';
  var RCMini = window.RCMini;
  var ui = RCMini.ui;
  var esc = ui.esc;

  var STATE_LABEL = {
    used: 'Сертификат уже использован или недействителен',
    unknown: 'Сертификат не найден',
    wrong_branch: 'Сертификат недоступен в этом филиале',
    forbidden: 'Нет прав на проверку сертификатов. Получите доступ у вашего руководителя.',
    invalid_input: 'Введите код сертификата'
  };

  /* parseCertificateCode (src/lib/certificate-code.ts) */
  function normalizeLookupCode(code) {
    return /^rc-/i.test(code) ? code.toUpperCase() : code;
  }
  function safeDecode(s) {
    try {
      return decodeURIComponent(s);
    } catch (e) {
      return null;
    }
  }
  function parseCertificateCode(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return { ok: false, error: 'Укажите код документа' };
    var res = [
      /remcard\.ru\/certificate\/([^/?#]+)/i,
      /(?:127\.0\.0\.1|localhost)(?::\d+)?\/certificate\/([^/?#]+)/i,
      /\/certificate\/([^/?#]+)\/add/i,
      /\/certificate\/([^/?#]+)/i
    ];
    for (var i = 0; i < res.length; i++) {
      var m = trimmed.match(res[i]);
      if (m && m[1]) {
        var code = safeDecode(m[1]);
        if (!code) return { ok: false, error: 'Некорректная ссылка в QR-коде. Введите код вручную.' };
        return { ok: true, code: normalizeLookupCode(code) };
      }
    }
    return { ok: true, code: normalizeLookupCode(trimmed) };
  }
  RCMini.parseCertificateCode = parseCertificateCode;

  /* Демо-ответ miniAppStoreScanLookup: RCMini.data.scanCodes + выпущенные в прототипе сертификаты (RCMini.data.cert.issued, если есть). */
  function demoLookup(code, c) {
    var codes = RCMini.data.scanCodes || {};
    var hit = codes[code];
    if (!hit && RCMini.data.cert && typeof RCMini.data.cert.lookup === 'function') {
      try {
        hit = RCMini.data.cert.lookup(code, c) || null;
      } catch (e) {
        hit = null;
      }
    }
    if (!hit) {
      var issued = (RCMini.data.cert && RCMini.data.cert.issued) || RCMini.mem.get('cert:issued', []) || [];
      for (var i = 0; i < issued.length; i++) {
        var it = issued[i];
        if (it && (it.promoCode === code || it.qrCode === code)) {
          hit = {
            state: 'valid',
            clientDisplayName: (it.clientUser && it.clientUser.displayName) || it.clientName || '',
            promoCode: it.promoCode,
            usageCount: it.usageCount || 0,
            maxUsages: it.maxUsages == null ? 1 : it.maxUsages
          };
        }
      }
    }
    if (!hit) return { state: 'unknown' };
    /* RC-B2-ONLY действует только в филиале «пр. Демо, Казань» (b2) */
    if (hit.state === 'wrong_branch' && code === 'RC-B2-ONLY' && c.branchId === 'b2') {
      return { state: 'valid', clientDisplayName: 'Павел Котов', promoCode: code, usageCount: 0, maxUsages: 1 };
    }
    return hit;
  }

  /*
   * Сканер как в ЛК (ScannerHub.tsx): после считывания открывается окно оформления покупки —
   * красная карта сертификата, «Клиент от партнёра», суммы по категориям, «Проверьте покупку», «Покупка подтверждена».
   * Обращение в разделе «Клиенты» создаётся или открывается сканом (useReceivingAppealScannerHandoff +
   * ReceivingAppealScannerPanels.tsx), после покупки заказ привязывается к обращению.
   */
  /* Демо-условия: скидка в сертификате, затем общий согласованный процент. */
  var PROGRAM = {
    store: [['doors', 'Двери и входные группы', 15, 25], ['flooring', 'Напольные покрытия', 12, 22], ['lighting', 'Освещение', 10, 17]],
    company: [['doors', 'Двери и входные группы', 12, 22], ['windows', 'Окна', 10, 18], ['construction', 'Ремонт и отделка', 10, 17]],
    specialist: [['general', 'Дизайн-проект и комплектация', 10, 15]]
  };
  var STORE_NAME = { store: 'Магазин «Маяк»', company: 'Компания «Формат»', specialist: 'Мария Орлова' };
  var VOLKOV = {
    typeLabel: 'Специалист', displayName: 'Игорь Волков', city: 'Казань',
    contacts: [{ label: 'Телефон', value: '+7 900 000-00-21', href: 'tel:+79000000021' }]
  };
  var ROMANOV = { typeLabel: 'Агент', displayName: 'Алексей Романов', city: 'Краснодар', contacts: [] };
  /* Кто направил клиента и что известно о клиенте — по демо-кодам. */
  var CLIENTS = {
    'RC-FIXTURE': { contact: '+7 900 000-00-11', need: 'Двери и напольное покрытие в квартиру', city: 'Казань', referrer: VOLKOV },
    'RC-4821-KZN': { contact: '+7 900 000-00-12', need: 'Комплектация кухни', city: 'Казань', referrer: VOLKOV },
    'RC-OPEN-77': { contact: 'olga@example.ru', need: 'Ремонт ванной', city: 'Краснодар', referrer: ROMANOV },
    'RC-4810': { contact: '+7 900 000-00-11', need: 'Освещение в гостиную', city: 'Казань', referrer: ROMANOV },
    'RC-B2-ONLY': { contact: '+7 900 000-00-14', need: 'Окна на лоджию', city: 'Казань', referrer: VOLKOV }
  };
  var CRM_READ_ONLY_NOTICE =
    'Создание обращения в CRM недоступно при текущих правах. Покупку через сканер можно оформить, но новое обращение по сертификату здесь не создаётся — откройте раздел «Клиенты» или обратитесь к администратору.';

  function formatRub(v) {
    return Math.round(v).toLocaleString('ru-RU') + ' ₽';
  }
  function formatDiscountRub(v) {
    return (v > 0 ? '−' : '') + formatRub(v);
  }
  function pluralRu(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
  /* reward-confirmation.ts */
  function formatDaysRu(s) {
    if (!/^\d+$/.test(String(s).trim())) return 'Проверьте срок';
    var n = Number(s);
    return n + ' ' + pluralRu(n, 'день', 'дня', 'дней');
  }
  function rewardDateHint(d) {
    if (!d.handedOver) return d.kind === 'SERVICE' ? 'Дата будет определена после принятия работ' : 'Дата будет определена после передачи товара';
    if (!/^\d+$/.test(d.days) || Number(d.days) > 36500) return 'Укажите целое неотрицательное число дней';
    var days = Number(d.days);
    if (!days) return 'Без ожидания после проведения операции';
    var m = new Date(Date.now() + 3 * 3600000);
    var at = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() + days + 1) - 3 * 3600000);
    return 'Подтверждение с ' + at.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }) + ', 00:00 МСК';
  }
  function dateRu(iso) {
    return new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
  }
  function dateTimeRu(iso) {
    return new Date(iso).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function freshScan() {
    return { manual: '', loading: false, cameraActive: true, cameraError: null, result: { kind: 'idle' }, mode: 'entry', session: null, success: null, appealOpen: false };
  }
  var scan = freshScan();
  function resetScan() {
    closeReview();
    scan = freshScan();
  }

  /* Обращения, созданные сканом (раздел «Клиенты»): в памяти прототипа, повторный скан открывает уже существующее. */
  function appeals() {
    return RCMini.mem.get('scan:appeals', {}) || {};
  }
  function saveAppeal(a) {
    var all = appeals();
    all[a.code] = a;
    RCMini.mem.set('scan:appeals', all);
  }
  function usedCodes() {
    return RCMini.mem.get('scan:used', {}) || {};
  }

  /* submitReceivingCertificateEntry: outcome 'created' | 'existing' */
  function ensureAppeal(code, res, session) {
    var existing = appeals()[code];
    if (existing) return { appeal: existing, outcome: 'existing' };
    var info = CLIENTS[code] || {};
    var seq = Number(RCMini.mem.get('scan:appeal-seq', 1041)) + 1;
    RCMini.mem.set('scan:appeal-seq', seq);
    var now = new Date().toISOString();
    var a = {
      id: 'ap-' + seq, number: String(seq), code: code,
      clientLabel: res.clientDisplayName || 'Клиент по сертификату ' + code,
      contact: info.contact || '', need: info.need || '', city: info.city || '',
      referrerName: session.referrer ? session.referrer.displayName : '',
      discountPercent: session.topDiscount,
      createdAt: now, updatedAt: now, stage: 'new', orderId: null, paidLabel: null, paidAt: null
    };
    saveAppeal(a);
    return { appeal: a, outcome: 'created' };
  }

  function buildSession(code, res, c) {
    var storeName = STORE_NAME[c.role] || c.profile.entityLine || c.profile.displayName || 'Партнёр';
    var issued = res.certificate;
    var offer = issued && (issued.offers.find(function (item) { return item.name === storeName; }) ||
      (issued.offers.length === 1 ? issued.offers[0] : null));
    if (issued && !offer) return null;
    var program = PROGRAM[c.role] || PROGRAM.specialist;
    var cats = offer ? offer.categories.map(function (cat) {
      return { id: cat.id, label: cat.label, discount: cat.discount, limit: offer.self ? cat.discount : cat.pool, self: offer.self };
    }) : program.map(function (p) {
      return { id: p[0], label: p[1], discount: p[2], limit: p[3], self: false };
    });
    if (offer) storeName = offer.name;
    var info = CLIENTS[code] || {};
    var branch = null;
    (c.profile.branches || []).forEach(function (b) {
      if (b.active) branch = b;
    });
    var validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    var s = {
      code: code,
      storeName: storeName,
      branchLabel: branch ? branch.label : null,
      categories: cats,
      topDiscount: Math.max.apply(null, cats.map(function (x) { return x.discount; })),
      referrer: info.referrer || null,
      issuer: { label: 'Выдал', name: info.referrer ? info.referrer.displayName : 'Партнёр RemCard' },
      clientAlias: res.clientDisplayName || '',
      usage: res.maxUsages && res.maxUsages > 0 ? (res.usageCount || 0) + ' из ' + res.maxUsages : (res.usageCount || 0) + ' (без ограничений)',
      maxUsages: res.maxUsages || 0,
      usageCount: res.usageCount || 0,
      /* сертификат для красной карты (orderPreviewToStoreCertificate) */
      cert: issued || {
        role: info.referrer && info.referrer.typeLabel === 'Агент' ? 'agent' : 'specialist',
        code: code,
        url: 'https://remcard.ru/certificate/' + encodeURIComponent(code),
        validUntil: validUntil.toISOString(),
        offers: [{ name: storeName, categories: cats.map(function (x) { return { discount: x.discount }; }), policy: null }]
      },
      amounts: {}, discounts: {}, rewards: {}, rewardOpen: {},
      appeal: null, crmNotice: null, submitError: ''
    };
    cats.forEach(function (x) {
      s.rewards[x.id] = { days: '14', kind: 'GOODS', handedOver: false };
    });
    return s;
  }

  function discountDraft(s, cat) {
    return s.discounts[cat.id] == null || s.discounts[cat.id] === '' ? String(cat.discount) : s.discounts[cat.id];
  }
  function appliedPercent(s, cat) {
    return Number(discountDraft(s, cat).replace(',', '.'));
  }
  function discountError(s, cat) {
    var pct = appliedPercent(s, cat);
    return !Number.isFinite(pct) || pct < 0 || pct > cat.limit
      ? 'Укажите скидку от 0 до ' + percentLabel(cat.limit) + '.'
      : '';
  }
  function hasDiscountErrors(s) {
    return s.categories.some(function (cat) { return !!discountError(s, cat); });
  }
  function percentLabel(value) {
    return String(value).replace('.', ',') + '%';
  }
  function weightedPercent(t, rateOf) {
    return (t.items.reduce(function (sum, item) { return sum + item.amount * rateOf(item); }, 0) / t.totalAmount)
      .toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + '%';
  }
  function amountOf(s, cat) {
    var n = Number(String(s.amounts[cat.id] == null ? '' : s.amounts[cat.id]).replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  /* buildOrderItems + totals (ориентир; окончательный расчёт — сервер) */
  function totalsOf(s) {
    var t = { totalAmount: 0, totalDiscount: 0, payableAmount: 0, totalIssuerBonus: 0, items: [] };
    if (hasDiscountErrors(s)) return t;
    s.categories.forEach(function (cat) {
      var amount = amountOf(s, cat);
      if (!amount) return;
      var pct = appliedPercent(s, cat);
      var discount = Math.round((amount * pct) / 100);
      var issuerPct = cat.self ? 0 : cat.limit - pct;
      t.totalAmount += amount;
      t.totalDiscount += discount;
      t.totalIssuerBonus += cat.self ? 0 : Math.round((amount * cat.limit) / 100) - discount;
      t.items.push({ cat: cat, amount: amount, pct: pct, discount: discount, issuerPct: issuerPct });
    });
    t.payableAmount = t.totalAmount - t.totalDiscount;
    return t;
  }

  function lookup(raw) {
    var parsed = parseCertificateCode(raw);
    if (!parsed.ok) {
      scan.result = { kind: 'invalid', message: parsed.error || 'Не удалось распознать код сертификата.' };
      RCMini.rerender();
      return;
    }
    var c = RCMini.ctx();
    scan.loading = true;
    scan.result = { kind: 'idle' };
    RCMini.rerender();
    setTimeout(function () {
      scan.loading = false;
      var sc = RCMini.scenario('scan');
      if (sc === 'network-error') {
        scan.result = { kind: 'error', message: 'Не удалось проверить сертификат. Проверьте сеть.' };
      } else if (sc === 'forbidden') {
        scan.result = { kind: 'invalid', message: STATE_LABEL.forbidden };
      } else {
        var res = demoLookup(parsed.code, c);
        if (res.state === 'valid' && usedCodes()[parsed.code]) res = { state: 'used' };
        if (res.state === 'valid') {
          var s = buildSession(parsed.code, res, c);
          if (!s) {
            scan.mode = 'denied';
            scan.cameraActive = false;
            scan.result = { kind: 'denied', code: parsed.code, message: 'В демо не удалось определить принимающего партнёра для этого сертификата. Проверьте условия у нужного партнёра.' };
            RCMini.rerender({ resetScroll: true });
            return;
          }
          if (sc === 'crm-readonly') {
            s.crmNotice = CRM_READ_ONLY_NOTICE;
          } else {
            var entry = ensureAppeal(parsed.code, res, s);
            s.appeal = entry.appeal;
            ui.toast(entry.outcome === 'created' ? 'Создано обращение в разделе «Клиенты»' : 'Открыто существующее обращение клиента');
          }
          scan.session = s;
          scan.mode = 'preview';
          scan.cameraActive = false;
        } else {
          /* previewSession && !preview.allowed → deniedBlock */
          scan.mode = 'denied';
          scan.cameraActive = false;
          scan.result = { kind: 'denied', code: parsed.code, message: res.message || STATE_LABEL[res.state] || 'Сертификат недоступен.' };
        }
      }
      RCMini.rerender({ resetScroll: true });
    }, 600);
  }
  /* Для панели «Демо»: имитация считывания QR камерой */
  RCMini.simulateQr = function (raw) {
    if (RCMini.ctx().screen !== 'scan') return;
    closeReview();
    scan = freshScan();
    scan.cameraActive = false; // QrScanner останавливает камеру после распознавания
    lookup(raw);
  };

  RCMini.registerScenarios(
    'scan',
    [
      { id: 'network-error', label: 'Проверка: нет сети' },
      { id: 'forbidden', label: 'Проверка: нет доступа' },
      { id: 'camera-denied', label: 'Камера недоступна' },
      { id: 'crm-readonly', label: 'Нет прав на создание обращений' },
      { id: 'link-failed', label: 'Привязка к обращению не удалась' }
    ],
    'Проверка QR'
  );

  /* ---------- окно сканера после считывания ---------- */
  function appealBanner(s) {
    if (!s.appeal) return s.crmNotice ? '<p class="scNotice" role="status" data-testid="scanner-crm-readonly">' + esc(s.crmNotice) + '</p>' : '';
    return (
      '<div class="scCard scBanner" data-testid="ca-scanner-receiving-context-ready">' +
      '<p class="scMeta">Оформление покупки для обращения «' + esc(s.appeal.clientLabel) + '» — требуется документ этого сертификата.</p>' +
      '<button type="button" class="scLinkBtn" data-scan-appeal data-testid="scanner-appeal-open">Вернуться к обращению</button>' +
      '</div>'
    );
  }
  function referrerBlock(s) {
    var r = s.referrer;
    var h = '<section class="scCard scReferrer" aria-labelledby="scanner-referrer-heading" data-testid="scanner-referrer-block">' +
      '<h3 id="scanner-referrer-heading" class="scReferrerHeading">Клиент от партнёра</h3>';
    if (!r) return h + '<p class="scMeta" data-testid="scanner-referrer-unavailable">Данные партнёра недоступны.</p></section>';
    h += '<div class="scReferrerRow"><span class="scReferrerType">' + esc(r.typeLabel) + '</span><span class="scReferrerName">' + esc(r.displayName) + '</span></div>';
    if (r.city) h += '<p class="scMeta">' + esc(r.city) + '</p>';
    if (r.contacts.length) {
      h += '<ul class="scContacts">' + r.contacts.map(function (ct) {
        return '<li><a class="scContactLink" href="' + esc(ct.href) + '" data-rcm-external>' + esc(ct.label) + ': ' + esc(ct.value) + '</a></li>';
      }).join('') + '</ul>';
    } else {
      h += '<p class="scMeta">Публичные контакты не указаны</p>';
    }
    return h + '</section>';
  }
  function rewardFields(s, cat) {
    var d = s.rewards[cat.id];
    return (
      '<details class="scReward" data-reward="' + esc(cat.id) + '"' + (s.rewardOpen[cat.id] ? ' open' : '') + ' data-testid="reward-terms-' + esc(cat.id) + '">' +
      '<summary class="scRewardSummary"><span class="scRewardLabel">Вознаграждение PRO</span>' +
      '<span class="scRewardValue" data-reward-days-label>' + esc(formatDaysRu(d.days)) + '</span>' +
      '<span class="scRewardAction">Изменить</span></summary>' +
      '<div class="scRewardTerms">' +
      '<label class="field"><span class="label">Тип позиции</span><select class="select" data-reward-kind>' +
      '<option value="GOODS"' + (d.kind === 'GOODS' ? ' selected' : '') + '>Товар</option>' +
      '<option value="SERVICE"' + (d.kind === 'SERVICE' ? ' selected' : '') + '>Услуга</option></select></label>' +
      '<label class="field"><span class="label">Подтвердить вознаграждение через, дней</span>' +
      '<input class="input" type="number" min="0" max="36500" step="1" inputmode="numeric" value="' + esc(d.days) + '" data-reward-days></label>' +
      (s.categories.length > 1 ? '<button type="button" class="scLinkBtn" data-reward-apply-all>Этот срок для всех категорий</button>' : '') +
      '<label class="scCheck"><input type="checkbox"' + (d.handedOver ? ' checked' : '') + ' data-reward-handover>' +
      '<span>' + (d.kind === 'SERVICE' ? 'Работы приняты клиентом' : 'Товар передан клиенту') + '</span></label>' +
      '<p class="scMeta" data-reward-date>' + esc(rewardDateHint(d)) + '</p>' +
      '<p class="scMeta">Начисление видно сразу. Срок определяет подтверждение, а не ограничивает право клиента на возврат.</p>' +
      '</div></details>'
    );
  }
  function summaryHtml(s) {
    var t = totalsOf(s);
    if (!t.totalAmount) return '';
    return (
      '<div class="scSummary">' +
      '<div class="scSummaryRow"><span>Сумма покупки</span><span>' + formatRub(t.totalAmount) + '</span></div>' +
      '<div class="scSummaryRow"><span>Скидка клиенту</span><span>' + formatDiscountRub(t.totalDiscount) + '</span></div>' +
      '<div class="scSummaryRow scSummaryTotal"><span>К оплате (ориентир)</span><span data-testid="scanner-payable">' + formatRub(t.payableAmount) + '</span></div>' +
      (t.totalIssuerBonus > 0 ? '<p class="scSummaryMeta">Вознаграждение PROF (ориентир): ' + formatRub(t.totalIssuerBonus) + '</p>' : '') +
      '</div>'
    );
  }
  function previewHtml(s) {
    var card = typeof RCMini.lkCertCard === 'function' ? RCMini.lkCertCard(s.cert, { scanner: true }) : '';
    var form =
      '<div class="scCard scForm">' +
      '<h2 class="scFormLead">Введите суммы покупки</h2>' +
      '<p class="scFormHint">Укажите суммы до скидки. Скидка подставляется из сертификата и не может превышать максимум по категории. ' +
      (s.categories[0].self ? 'По своему сертификату вознаграждение PROF не начисляется.' : 'Вознаграждение PROF — оставшаяся часть согласованного процента.') + '</p>' +
      '<p class="scMeta">Партнёр: ' + esc(s.storeName) + '</p>' +
      '<div class="scCategories">' +
      s.categories.map(function (cat) {
        var error = discountError(s, cat);
        var fieldId = 'scanner-discount-' + esc(cat.id);
        return (
          '<div class="scCategory" data-cat="' + esc(cat.id) + '">' +
          '<div class="scCategoryHead"><strong>' + esc(cat.label) + '</strong><span class="scBadge">−' + cat.discount + '%</span></div>' +
          '<label class="field"><span class="label">Сумма покупки до скидки, ₽</span>' +
          '<input class="input" type="number" min="0" inputmode="numeric" value="' + esc(s.amounts[cat.id] || '') + '" data-scan-amount data-testid="scanner-amount-' + esc(cat.id) + '"></label>' +
          '<label class="field"><span class="label">Скидка клиенту, %</span>' +
          '<input class="input" type="number" min="0" max="' + cat.limit + '" step="any" inputmode="decimal" value="' + esc(discountDraft(s, cat)) +
          '" aria-describedby="' + fieldId + '-limit ' + fieldId + '-error" aria-invalid="' + !!error + '" data-scan-discount></label>' +
          '<p class="scMeta" id="' + fieldId + '-limit">Максимум по категории: ' + percentLabel(cat.limit) + '</p>' +
          '<p class="scError scDiscountError" id="' + fieldId + '-error" data-scan-discount-error role="alert"' + (error ? '' : ' hidden') + '>' + error + '</p>' +
          rewardFields(s, cat) +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '<div data-scan-summary>' + summaryHtml(s) + '</div>' +
      '<p class="scError" role="alert" data-scan-error' + (s.submitError ? '' : ' hidden') + '>' + esc(s.submitError) + '</p>' +
      '<div class="scActions">' +
      '<button type="button" class="secondaryBtn" data-scan-cancel>Отмена</button>' +
      '<button type="button" class="primaryBtn" data-scan-confirm data-testid="scanner-confirm"' + (totalsOf(s).totalAmount > 0 ? '' : ' disabled') + '>Подтвердить покупку</button>' +
      '</div></div>';
    return (
      '<section class="scWrap" data-testid="scanner-preview">' +
      appealBanner(s) +
      (s.branchLabel ? '<p class="scBranch" data-testid="scanner-confirmation-branch">Филиал операции: ' + esc(s.branchLabel) + '</p>' : '') +
      card +
      referrerBlock(s) +
      '<details class="scCard scIssuer"><summary>Эмитент и где принимается документ</summary><div class="scIssuerBody">' +
      '<p class="scMeta">' + esc(s.issuer.label) + ': ' + esc(s.issuer.name) + '</p>' +
      '<p class="scMeta">Код для операции: ' + esc(s.code) + '</p>' +
      (s.clientAlias ? '<p class="scMeta">Клиент: ' + esc(s.clientAlias) + '</p>' : '') +
      '<p class="scMeta">Использований: ' + esc(s.usage) + '</p>' +
      '<p class="scMeta">Принимается у партнёра ' + esc(s.storeName) + '</p>' +
      '</div></details>' +
      form +
      '</section>'
    );
  }

  /* PurchaseReviewModal.tsx — «Проверьте покупку» */
  var reviewEl = null;
  function closeReview() {
    if (reviewEl && reviewEl.parentNode) reviewEl.parentNode.removeChild(reviewEl);
    reviewEl = null;
  }
  function openReview() {
    var s = scan.session;
    if (!s) return;
    var t = totalsOf(s);
    if (!t.totalAmount) return;
    var app = document.getElementById('app');
    if (!app || !app.parentNode) return;
    closeReview();
    reviewEl = document.createElement('div');
    reviewEl.className = 'rcm-sheet';
    reviewEl.innerHTML =
      '<div class="rcm-sheet-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-review-title" data-testid="purchase-review-dialog">' +
      '<h2 id="purchase-review-title" class="rcm-sheet-title">Проверьте покупку</h2>' +
      '<div class="rcm-sheet-body" tabindex="0" role="region" aria-label="Детали покупки перед подтверждением">' +
      '<div class="rcm-sheet-due"><p class="rcm-sheet-due-label">К оплате клиентом</p>' +
      '<p class="rcm-sheet-due-value" data-testid="purchase-review-due">' + formatRub(t.payableAmount) + '</p>' +
      '<dl class="rcm-sheet-rollup"><div><dt>Сумма покупки</dt><dd>' + formatRub(t.totalAmount) + '</dd></div>' +
      '<div><dt>Скидка клиенту</dt><dd>' + formatRub(t.totalDiscount) + '</dd></div>' +
      '<div><dt>Вознаграждение PROF</dt><dd>' + formatRub(t.totalIssuerBonus) + '</dd></div></dl></div>' +
      '<ul class="rcm-sheet-cats">' +
      t.items.map(function (it) {
        var d = s.rewards[it.cat.id];
        var handoff = d.handedOver ? (d.kind === 'SERVICE' ? 'работы приняты' : 'товар передан') : '';
        var overridden = Math.abs(it.cat.discount - it.pct) > 1e-6;
        return (
          '<li><p class="rcm-sheet-cat-title">' + esc(it.cat.label) + '</p>' +
          '<dl class="rcm-sheet-rollup"><div><dt>До скидки</dt><dd>' + formatRub(it.amount) + '</dd></div>' +
          '<div><dt>' + (overridden ? 'Скидка вручную' : 'Скидка по сертификату') + ' (' + percentLabel(it.pct) + ')</dt><dd>' + formatRub(it.discount) + '</dd></div></dl>' +
          (overridden ? '<p class="rcm-sheet-cat-meta">По сертификату: ' + percentLabel(it.cat.discount) + '.</p>' : '') +
          '<ul class="rcm-sheet-cat-meta"><li>' + (d.kind === 'SERVICE' ? 'услуга' : 'товар') + ', срок вознаграждения ' + esc(formatDaysRu(d.days)) +
          (handoff ? ' · ' + handoff : '') + '</li><li>' + esc(rewardDateHint(d)) + '</li></ul></li>'
        );
      }).join('') +
      '</ul>' +
      (s.branchLabel ? '<p class="rcm-sheet-foot">Филиал операции: ' + esc(s.branchLabel) + '</p>' : '') +
      '<p class="rcm-sheet-foot">Партнёр: ' + esc(s.storeName) + '</p>' +
      '</div>' +
      '<footer class="rcm-sheet-footer">' +
      '<button type="button" class="rcm-sheet-btn" data-review-back data-testid="purchase-review-back">Назад</button>' +
      '<button type="button" class="rcm-sheet-btn is-primary" data-review-confirm data-testid="purchase-review-confirm">Подтвердить покупку</button>' +
      '</footer></div>';
    reviewEl.addEventListener('click', function (e) {
      if (e.target === reviewEl || e.target.closest('[data-review-back]')) {
        closeReview();
        return;
      }
      var ok = e.target.closest('[data-review-confirm]');
      if (ok && !ok.disabled) {
        ok.disabled = true;
        ok.textContent = 'Подтверждение…';
        reviewEl.querySelector('[data-review-back]').disabled = true;
        setTimeout(confirmPurchase, 700);
      }
    });
    app.parentNode.appendChild(reviewEl);
    var first = reviewEl.querySelector('[data-review-confirm]');
    if (first) first.focus();
  }

  function confirmPurchase() {
    var s = scan.session;
    closeReview();
    if (!s || scan.mode !== 'preview') return;
    var t = totalsOf(s);
    if (!t.totalAmount) {
      RCMini.rerender();
      return;
    }
    var seq = Number(RCMini.mem.get('scan:order-seq', 48210)) + 1;
    RCMini.mem.set('scan:order-seq', seq);
    scan.success = { orderId: String(seq), code: s.code, totals: t, linkPhase: s.appeal ? 'progress' : 'none' };
    scan.mode = 'success';
    if (s.maxUsages === 1 || (s.maxUsages > 1 && s.usageCount + 1 >= s.maxUsages)) {
      var used = usedCodes();
      used[s.code] = true;
      RCMini.mem.set('scan:used', used);
    }
    RCMini.rerender({ resetScroll: true });
    if (s.appeal) setTimeout(linkOrder, 900);
  }
  /* linkReceivingAppealOrder: заказ → обращение, этап «Оплачено» */
  function linkOrder() {
    var s = scan.session, ok = scan.success;
    if (!s || !ok || scan.mode !== 'success') return;
    if (RCMini.scenario('scan') === 'link-failed' && !ok.retried) {
      ok.linkPhase = 'failed';
    } else {
      var now = new Date().toISOString();
      s.appeal.stage = 'paid';
      s.appeal.orderId = ok.orderId;
      s.appeal.paidLabel = formatRub(ok.totals.totalAmount);
      s.appeal.paidAt = now;
      s.appeal.updatedAt = now;
      saveAppeal(s.appeal);
      ok.linkPhase = 'linked';
    }
    RCMini.rerender();
  }

  function purchaseHref(orderId) {
    return 'https://prof.remcard.ru/history/purchases/' + encodeURIComponent(orderId);
  }
  function successHtml(s, ok) {
    var t = ok.totals;
    var combined = t.totalDiscount + t.totalIssuerBonus;
    var rewardRate = weightedPercent(t, function (it) { return it.issuerPct; });
    var receiptValue = function (percent, label) {
      return '<span class="scReceiptValue">' + (percent ? '<span class="scReceiptPercent">' + percent + '</span> ' : '') +
        '<strong>' + label + '</strong></span>';
    };
    var link;
    if (ok.linkPhase === 'progress') {
      link = '<p class="scMeta" data-testid="ca-scanner-receiving-link-progress">Покупка создана. Привязываем заказ к обращению…</p>';
    } else if (ok.linkPhase === 'failed') {
      link =
        '<div data-testid="ca-scanner-receiving-link-failed"><p class="scError" role="alert">Покупка уже создана (заказ ' + esc(ok.orderId) +
        '), но привязка к обращению не выполнена.</p><div class="scActions scActionsStack">' +
        '<button type="button" class="primaryBtn" data-scan-relink>Повторить привязку</button>' +
        '<button type="button" class="secondaryBtn" data-scan-appeal>К обращению</button>' +
        '<button type="button" class="secondaryBtn" data-rcm-external data-href="' + esc(purchaseHref(ok.orderId)) + '">Открыть покупку</button></div></div>';
    } else if (ok.linkPhase === 'linked') {
      link =
        '<div data-testid="ca-scanner-receiving-link-linked"><p class="scMeta">Заказ привязан к обращению.</p><div class="scActions scActionsStack">' +
        '<button type="button" class="primaryBtn" data-scan-appeal data-testid="scanner-appeal-open">Вернуться к обращению</button>' +
        '<button type="button" class="secondaryBtn" data-rcm-external data-href="' + esc(purchaseHref(ok.orderId)) + '">Открыть покупку</button></div></div>';
    } else {
      link =
        '<div class="scActions scActionsStack">' +
        '<button type="button" class="secondaryBtn" data-rcm-external data-href="' + esc(purchaseHref(ok.orderId)) + '">Открыть покупку</button>' +
        '<button type="button" class="secondaryBtn" data-rcm-external data-href="https://prof.remcard.ru/history?search=' + esc(encodeURIComponent(ok.code)) + '">Все операции по документу</button>' +
        '<button type="button" class="primaryBtn" data-scan-new>Новая покупка</button></div>';
    }
    return (
      '<section class="scWrap" data-testid="scanner-success">' +
      (s.crmNotice ? '<p class="scNotice" role="status">' + esc(s.crmNotice) + '</p>' : '') +
      '<div class="scSuccessBanner">Покупка подтверждена</div>' +
      '<div class="scSummary scReceipt">' +
      '<p class="scSummaryMeta">Операция #' + esc(ok.orderId) + '</p>' +
      '<p class="scReceiptTitle">Документ ' + esc(ok.code) + '</p>' +
      '<div class="scSummaryRow"><span>Сумма покупки</span><span>' + formatRub(t.totalAmount) + '</span></div>' +
      '<div class="scSummaryRow"><span>Скидка клиенту</span>' + receiptValue(weightedPercent(t, function (it) { return it.pct; }), formatDiscountRub(t.totalDiscount)) + '</div>' +
      '<div class="scSummaryRow scSummaryTotal"><span>К оплате</span><strong>' + formatRub(t.payableAmount) + '</strong></div>' +
      '<div class="scSummaryRow"><span>Вознаграждение PROF</span>' + receiptValue(rewardRate, formatRub(t.totalIssuerBonus)) + '</div>' +
      '<div class="scSummaryRow scReceiptCombined"><span>Скидка и вознаграждение</span>' + receiptValue(weightedPercent(t, function (it) { return it.pct + it.issuerPct; }), formatRub(combined)) + '</div>' +
      '<p class="scSummaryMeta">Проценты от суммы до скидки. Вознаграждение не уменьшает сумму к оплате.</p>' +
      (t.totalIssuerBonus > 0 ? '<p class="scSummaryMeta">Срок подтверждения отсчитывается с передачи товара или приёмки работ.</p>' : '') +
      '</div>' +
      link +
      (ok.linkPhase !== 'none' && ok.linkPhase !== 'progress' ? '<button type="button" class="scLinkBtn scCenter" data-scan-new>Новая покупка</button>' : '') +
      '</section>'
    );
  }

  /* Карточка обращения (ReceivingAppealDetailView.tsx, сжато под мини-кабинет) */
  function appealHtml(a) {
    var steps = [['new', 'Новое обращение'], ['paid', 'Оплачено'], ['shipped', 'Отгружено']];
    var idx = a.stage === 'paid' ? 1 : 0;
    var row = function (dt, dd) {
      return '<div><dt>' + esc(dt) + '</dt><dd>' + esc(dd) + '</dd></div>';
    };
    var clientsHref = 'https://prof.remcard.ru/clients?appeal=' + encodeURIComponent(a.id);
    return (
      '<section class="scWrap" data-testid="ca-receiving-appeal-detail">' +
      '<ol class="scStepper" aria-label="Этапы обращения">' +
      steps.map(function (st, i) {
        return '<li class="' + (i < idx ? 'is-done' : i === idx ? 'is-current' : '') + '"' + (i === idx ? ' aria-current="step"' : '') + '>' + esc(st[1]) + '</li>';
      }).join('') +
      '</ol>' +
      '<div class="scCard scNext" data-testid="ca-receiving-detail-stage">' +
      (a.stage === 'paid'
        ? '<h3>Оплачено · ждём отгрузку</h3><p class="scMeta">Покупка привязана к обращению. Отгрузка отмечается в карточке обращения.</p>' +
          '<button type="button" class="secondaryBtn" data-rcm-external data-href="' + esc(clientsHref) + '">Отметить отгрузку</button>'
        : '<h3>Следующий шаг: Оплата</h3><p class="scMeta">Оплата отмечается при оформлении покупки в сканере.</p>' +
          (scan.mode === 'preview' ? '<button type="button" class="primaryBtn" data-scan-appeal-close data-testid="ca-receiving-pay">Отметить оплату</button>' : '')) +
      '</div>' +
      '<div class="scCard"><h3>Клиент</h3><p class="scStrong">' + esc(a.clientLabel) + '</p>' +
      '<p class="scMeta">' + esc(a.contact || 'Контакт не указан') + '</p><dl class="scDl">' +
      (a.need ? row('Запрос', a.need) : '') + row('Источник', 'По сертификату') + (a.city ? row('Город', a.city) : '') +
      row('Обновлено', dateTimeRu(a.updatedAt)) + '</dl></div>' +
      '<div class="scCard" data-testid="ca-receiving-cert-card"><h3>Сертификат</h3><dl class="scDl">' +
      row('Направил', a.referrerName || 'Имя не указано') + row('Скидка', a.discountPercent != null ? a.discountPercent + '%' : '—') +
      row('Код', a.code) + '</dl></div>' +
      (a.orderId
        ? '<div class="scCard" data-testid="ca-receiving-purchase-panel"><h3>Покупка</h3><dl class="scDl">' +
          row('Сумма покупки до скидки', a.paidLabel || '—') + row('Оплачено', dateTimeRu(a.paidAt)) + '</dl>' +
          '<button type="button" class="secondaryBtn" data-rcm-external data-href="' + esc(purchaseHref(a.orderId)) + '">Подробнее о покупке</button></div>'
        : '') +
      '<button type="button" class="scLinkBtn scCenter" data-rcm-external data-href="' + esc(clientsHref) + '">Открыть обращение в разделе «Клиенты»</button>' +
      '</section>'
    );
  }

  function entryHtml() {
    var cameraError = scan.cameraError;
    if (RCMini.scenario('scan') === 'camera-denied') cameraError = 'Не удалось запустить камеру. Разрешите доступ или используйте ручной ввод кода.';
    var cam =
      '<div class="cameraWrap"><div id="partner-scanner-qr-reader" class="qrReader" data-testid="mini-scan-camera"></div>' +
      (scan.cameraActive && !cameraError
        ? '<div style="padding: var(--space-3)"><button type="button" class="button secondary controlButton" data-scan-stop>Остановить камеру</button></div>'
        : '') +
      '</div>';
    var r = scan.result;
    return (
      '<section class="scanPanel">' +
      cam +
      (cameraError ? '<p class="scanNotice" role="alert">' + esc(cameraError) + '</p>' : '') +
      '<form class="manualForm" data-scan-form>' +
      '<label class="field" for="код-вручную"><span class="label">Код или промокод</span>' +
      '<input id="код-вручную" class="input" autocomplete="off" placeholder="RC-XXXXXX" value="' + esc(scan.manual) + '" data-scan-input></label>' +
      '<button type="submit" class="primaryBtn"' + (scan.loading || !scan.manual.trim() ? ' disabled' : '') + ' data-scan-submit>' +
      (scan.loading ? 'Проверка…' : 'Найти') + '</button>' +
      '</form>' +
      (scan.loading ? '<p class="scMeta" role="status" data-testid="scan-loading">Проверяем сертификат и обращение…</p>' : '') +
      (r.kind === 'invalid' ? '<p class="scanBad" data-testid="scan-result-invalid">' + esc(r.message) + '</p>' : '') +
      (r.kind === 'error' ? '<p class="scanBad" data-testid="scan-result-error">' + esc(r.message) + '</p>' : '') +
      '</section>'
    );
  }

  RCMini.registerScreen('scan', {
    render: function () {
      var s = scan.session;
      if (scan.appealOpen && s && s.appeal) {
        return ui.subpage({
          backLabel: '← К сканеру',
          title: s.appeal.clientLabel,
          lead: 'Обращение от ' + dateRu(s.appeal.createdAt) + ' · По сертификату',
          body: appealHtml(s.appeal)
        });
      }
      if (scan.mode === 'preview' && s) {
        return ui.subpage({ backLabel: '← Сканировать другой код', title: 'Документ ' + s.code, body: previewHtml(s) });
      }
      if (scan.mode === 'success' && s && scan.success) {
        return ui.subpage({ title: 'Сканер', body: successHtml(s, scan.success) });
      }
      if (scan.mode === 'denied') {
        return ui.subpage({
          title: 'Сканер',
          body:
            '<div class="scDenied" data-testid="scanner-denied"><p class="scReceiptTitle">Документ ' + esc(scan.result.code) + '</p>' +
            '<p class="scError" role="alert" data-testid="scan-result-invalid">' + esc(scan.result.message) + '</p>' +
            '<button type="button" class="secondaryBtn" data-scan-new>Сканировать другой код</button></div>'
        });
      }
      return ui.subpage({
        title: 'Сканер',
        lead: 'Сканируйте QR-код документа или введите промокод вручную. Предпросмотр не создаёт покупку — подтверждение только по кнопке.',
        body: entryHtml()
      });
    },
    afterRender: function (root) {
      var s = scan.session;
      var q = function (sel) { return root.querySelector(sel); };
      var each = function (sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); };
      var input = q('[data-scan-input]');
      var submit = q('[data-scan-submit]');
      var form = q('[data-scan-form]');
      var stop = q('[data-scan-stop]');
      if (input) {
        input.addEventListener('input', function () {
          scan.manual = input.value;
          submit.disabled = scan.loading || !scan.manual.trim();
        });
      }
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          lookup(scan.manual);
        });
      }
      if (stop) {
        stop.addEventListener('click', function () {
          scan.cameraActive = false;
          RCMini.rerender();
        });
      }
      each('[data-scan-new]', function (b) {
        b.addEventListener('click', function () {
          resetScan();
          RCMini.rerender({ resetScroll: true });
        });
      });
      each('[data-scan-appeal]', function (b) {
        b.addEventListener('click', function () {
          scan.appealOpen = true;
          RCMini.rerender({ resetScroll: true });
        });
      });
      each('[data-scan-appeal-close]', function (b) {
        b.addEventListener('click', function () {
          scan.appealOpen = false;
          RCMini.rerender({ resetScroll: true });
        });
      });
      var relink = q('[data-scan-relink]');
      if (relink) {
        relink.addEventListener('click', function () {
          scan.success.retried = true;
          scan.success.linkPhase = 'progress';
          RCMini.rerender();
          setTimeout(linkOrder, 900);
        });
      }
      if (scan.mode !== 'preview' || !s || scan.appealOpen) return;

      var refresh = function () {
        var box = q('[data-scan-summary]');
        if (box) box.innerHTML = summaryHtml(s);
        var ok = q('[data-scan-confirm]');
        if (ok) ok.disabled = !(totalsOf(s).totalAmount > 0);
        var err = q('[data-scan-error]');
        if (err && s.submitError) {
          s.submitError = '';
          err.hidden = true;
        }
      };
      each('[data-cat]', function (rowEl) {
        var id = rowEl.getAttribute('data-cat');
        var cat = s.categories.find(function (item) { return item.id === id; });
        var amount = rowEl.querySelector('[data-scan-amount]');
        var discount = rowEl.querySelector('[data-scan-discount]');
        amount.addEventListener('input', function () {
          s.amounts[id] = amount.value;
          refresh();
        });
        discount.addEventListener('input', function () {
          s.discounts[id] = discount.validity.badInput ? 'invalid' : discount.value;
          var msg = discountError(s, cat);
          var error = rowEl.querySelector('[data-scan-discount-error]');
          discount.setAttribute('aria-invalid', String(!!msg));
          error.textContent = msg;
          error.hidden = !msg;
          refresh();
        });
        discount.addEventListener('blur', function () {
          if (!discountError(s, cat)) discount.value = discountDraft(s, cat);
        });
        var det = rowEl.querySelector('[data-reward]');
        var d = s.rewards[id];
        det.addEventListener('toggle', function () {
          s.rewardOpen[id] = det.open;
        });
        var days = rowEl.querySelector('[data-reward-days]');
        days.addEventListener('input', function () {
          d.days = days.value.trim();
          rowEl.querySelector('[data-reward-days-label]').textContent = formatDaysRu(d.days);
          rowEl.querySelector('[data-reward-date]').textContent = rewardDateHint(d);
        });
        rowEl.querySelector('[data-reward-kind]').addEventListener('change', function (e) {
          d.kind = e.target.value;
          s.rewardOpen[id] = true;
          RCMini.rerender();
        });
        rowEl.querySelector('[data-reward-handover]').addEventListener('change', function (e) {
          d.handedOver = e.target.checked;
          rowEl.querySelector('[data-reward-date]').textContent = rewardDateHint(d);
        });
        var all = rowEl.querySelector('[data-reward-apply-all]');
        if (all) {
          all.addEventListener('click', function () {
            s.categories.forEach(function (cat) {
              s.rewards[cat.id].days = d.days;
            });
            s.rewardOpen[id] = true;
            RCMini.rerender();
            ui.toast('Срок ' + formatDaysRu(d.days) + ' — для всех категорий');
          });
        }
      });
      var cancel = q('[data-scan-cancel]');
      if (cancel) {
        cancel.addEventListener('click', function () {
          resetScan();
          RCMini.rerender({ resetScroll: true });
        });
      }
      var confirm = q('[data-scan-confirm]');
      if (confirm) {
        confirm.addEventListener('click', function () {
          var bad = null;
          s.categories.forEach(function (cat) {
            var d = s.rewards[cat.id];
            if (amountOf(s, cat) && (!/^\d+$/.test(d.days) || Number(d.days) > 36500)) bad = 'Срок подтверждения: целое число от 0 до 36500 дней';
          });
          if (bad) {
            s.submitError = bad;
            var err = q('[data-scan-error]');
            err.textContent = bad;
            err.hidden = false;
            return;
          }
          openReview();
        });
      }
    },
    onBack: function () {
      closeReview();
      if (scan.appealOpen) {
        scan.appealOpen = false;
        RCMini.rerender({ resetScroll: true });
        return true;
      }
      if (scan.mode === 'preview' || scan.mode === 'denied') {
        resetScan();
        RCMini.rerender({ resetScroll: true });
        return true;
      }
      resetScan();
      return false;
    }
  });

  RCMini.on('render', function (e) {
    if (e.screen !== 'scan') closeReview();
    if (e.screen !== 'scan' && e.screen !== 'gate') {
      if (scan.mode !== 'entry' || scan.result.kind !== 'idle' || scan.manual || !scan.cameraActive) resetScan();
    }
  });

  /* card-info */
  RCMini.registerScreen('card-info', {
    render: function (c) {
      return ui.subpage({
        title: 'Кошелёк',
        body:
          '<p>' + esc(c.profile.presentation.cardExplainer) + '</p>' +
          '<button type="button" class="secondaryBtn" data-rcm-external data-href="https://prof.remcard.ru' +
          esc(c.profile.presentation.historyHref) + '">История начислений в кабинете</button>'
      });
    }
  });

  /* full-cabinet. params (необязательно): { url, lead, buttonLabel } — например из кошелька: url .../settlements */
  RCMini.registerScreen('full-cabinet', {
    testid: 'mini-full-cabinet',
    render: function (c, params) {
      var url = params.url || c.profile.partnersUrl;
      var lead = params.lead || 'Здесь мини-приложение откроет раздел «Партнёры» в RemCard.';
      var label = params.buttonLabel || 'Открыть партнёров';
      return ui.subpage({
        backLabel: '← Назад',
        title: 'Полный кабинет',
        body:
          '<p class="subpageLead">' + esc(lead) + '</p>' +
          '<div class="infoCard"><h2 class="infoCardTitle">Что остаётся в полном кабинете</h2>' +
          '<p class="infoCardText">История кошелька, список сертификатов, оформление покупок, поиск партнёров и настройки.</p></div>' +
          '<button type="button" class="primaryBtn" data-testid="mini-open-partners" data-rcm-external data-href="' + esc(url) + '">' +
          ui.icon('external') + esc(label) + '</button>'
      });
    }
  });
})();
