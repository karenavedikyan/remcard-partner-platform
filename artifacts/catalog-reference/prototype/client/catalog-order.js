/* RemCard — заявка продавцу из списка покупок (прототип).
   Клиент выбирает размер и цвет, собирает список и отправляет заявку продавцу; заявка появляется в кабинете партнёра
   в разделе «Каталог → Заявки». Состояние хранится только в памяти вкладки. Оплата и скидки — у продавца, как обычно.
   Телефон в заявке не запрашивается: клиент и продавец переписываются по заявке внутри RemCard. */
(function () {
  const { D, esc, fmt, plural, qs, qsa, go, icon, state, modal, closeModal, modalHead, toast, route, renderApp } = window.RC;
  const C = window.RCCatalogData;
  const rub = (n) => `${fmt(n)} ₽`;
  const prod = (id) => C.products.find((p) => p.id === id) || null;
  const svc = (id) => C.services.find((s) => s.id === id) || null;
  const seller = (id) => D.partners.find((p) => p.id === id) || (window.RCOffers && window.RCOffers.seller(id)) || { id, name: 'Продавец' };
  const info = (id) => (C.partnerInfo && C.partnerInfo[id]) || {};
  // Филиалы продавца для самовывоза. У «Оптовика» — как на его странице на remcard.ru.
  const BRANCHES = { s6: ['Краснодар, Ростовское шоссе, 30/3', 'Краснодар, ул. 40 лет Победы, 168', 'Краснодар, ул. Красных Партизан, 235', 'Краснодар, ул. Новороссийская, 216/5', 'Краснодар, ул. Российская, 414', 'Новороссийск, ул. Исаева, 19'] };
  const STATUS = { new: ['Отправлена', 'pill--blue'], accepted: ['Принята', 'pill--green'], progress: ['В работе', 'pill--amber'], done: ['Выполнена', 'pill--green'], declined: ['Отказ', 'pill--red'] };
  const STEPS = [['new', 'Отправлена'], ['accepted', 'Принята'], ['progress', 'В работе'], ['done', 'Выполнена']];

  const pick = {};   // pid → { size, color }: выбор на странице товара
  const lines = {};  // pid → [{ size, color, qty }]: варианты товара в списке покупок
  const orders = []; // отправленные заявки (в памяти вкладки)
  let nextNo = 1043;

  const sizeLabel = (x) => (/^\d+$/.test(x) ? `${x} мм` : x);
  const hasSizes = (p) => Array.isArray(p.sizes) && p.sizes.length > 0;
  const hasColors = (p) => Array.isArray(p.colors) && p.colors.length > 1;
  const hasOptions = (p) => hasSizes(p) || hasColors(p);
  const defaults = (p) => ({ size: hasSizes(p) ? p.sizes[0] : '', color: (p.colors && p.colors[0]) || '' });
  const chosen = (p) => ({ ...defaults(p), ...(pick[p.id] || {}) });
  const variantText = (p, v) => [v.size ? sizeLabel(v.size) : '', hasColors(p) || !p.variant ? v.color : ''].filter(Boolean).join(' · ');
  const cartLine = (pid) => state.cart.find((c) => c.type === 'p' && c.id === pid);
  const save = () => { if (window.RCCat && window.RCCat.persistCart) window.RCCat.persistCart(); };
  const writable = () => !window.RCCat || !window.RCCat.ensureCartWritable || window.RCCat.ensureCartWritable();

  // Варианты в списке всегда в сумме равны количеству в строке списка покупок.
  function getLines(p, qty) {
    let list = lines[p.id];
    if (!list || !list.length) list = lines[p.id] = [{ ...chosen(p), qty }];
    let sum = list.reduce((a, l) => a + l.qty, 0);
    if (sum < qty) list[list.length - 1].qty += qty - sum;
    while (sum > qty && list.length) {
      const last = list[list.length - 1];
      const cut = Math.min(sum - qty, last.qty - (list.length > 1 ? 0 : 1));
      last.qty -= cut; sum -= cut;
      if (last.qty <= 0 && list.length > 1) list.pop(); else if (!cut) break;
    }
    return list;
  }
  function syncQty(pid) {
    const c = cartLine(pid); if (!c) return;
    const sum = (lines[pid] || []).reduce((a, l) => a + l.qty, 0);
    c.qty = window.RCCat && window.RCCat.sanitizeCartQty ? window.RCCat.sanitizeCartQty(sum) : sum;
    save();
  }

  // ---------- Строка списка покупок: выбранный вариант ----------
  function rowVariant(p, qty) {
    if (!p || !hasOptions(p)) return '';
    const list = getLines(p, qty); const multi = list.length > 1;
    const sel = (kind, values, cur, i) => `<select class="rco-sel" data-rco-set="${p.id}:${i}:${kind}" aria-label="${kind === 'size' ? 'Размер' : 'Цвет'}">${values.map((v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(kind === 'size' ? sizeLabel(v) : v)}</option>`).join('')}</select>`;
    return `<div class="rco-vars ${multi ? 'is-multi' : ''}" data-rco-vars="${p.id}">${list.map((l, i) => `<div class="rco-var">
        ${hasSizes(p) ? sel('size', p.sizes, l.size, i) : ''}${hasColors(p) ? sel('color', p.colors, l.color, i) : ''}
        ${multi ? `<span class="qty rco-qty"><button type="button" data-rco-qty="${p.id}:${i}:-1" aria-label="Меньше">${icon('minus')}</button><span>${l.qty}</span><button type="button" data-rco-qty="${p.id}:${i}:1" aria-label="Больше">${icon('plus')}</button></span><button type="button" class="iconb rco-del" data-rco-del="${p.id}:${i}" aria-label="Убрать вариант">${icon('x')}</button>` : ''}
      </div>`).join('')}<button type="button" class="link xs rco-add" data-rco-add="${p.id}">${icon('plus')} ${hasSizes(p) ? 'другой размер' : 'другой цвет'}</button></div>`;
  }
  function bindList() {
    qsa('[data-rco-vars].is-multi').forEach((box) => { const row = box.closest('.litem'); if (row) row.classList.add('litem--multi'); });
    qsa('[data-rco-set]').forEach((el) => el.onchange = () => {
      const [pid, i, kind] = el.dataset.rcoSet.split(':'); const l = (lines[pid] || [])[+i]; if (!l) return;
      l[kind] = el.value; renderApp();
    });
    qsa('[data-rco-qty]').forEach((b) => b.onclick = () => {
      if (!writable()) return;
      const [pid, i, d] = b.dataset.rcoQty.split(':'); const l = (lines[pid] || [])[+i]; if (!l) return;
      l.qty = Math.max(1, l.qty + +d); syncQty(pid); renderApp();
    });
    qsa('[data-rco-del]').forEach((b) => b.onclick = () => {
      if (!writable()) return;
      const [pid, i] = b.dataset.rcoDel.split(':'); const list = lines[pid]; if (!list || list.length < 2) return;
      list.splice(+i, 1); syncQty(pid); renderApp();
    });
    qsa('[data-rco-add]').forEach((b) => b.onclick = () => {
      if (!writable()) return;
      const pid = b.dataset.rcoAdd; const p = prod(pid); const list = lines[pid]; if (!p || !list) return;
      const used = new Set(list.map((l) => `${l.size}|${l.color}`));
      const all = (hasSizes(p) ? p.sizes : ['']).flatMap((s) => (hasColors(p) ? p.colors : [list[0].color]).map((c) => ({ size: s, color: c })));
      const free = all.find((v) => !used.has(`${v.size}|${v.color}`));
      if (!free) { toast('Все варианты уже в списке'); return; }
      list.push({ ...free, qty: 1 }); syncQty(pid); renderApp();
    });
    const head = qs('.shop--narrow .pd__name');
    if (head && orders.length && !qs('#rco-mine')) head.insertAdjacentHTML('afterend', `<a class="link small" id="rco-mine" href="#/catalog/orders">Мои заявки · ${orders.length}</a>`);
  }

  // ---------- Страница товара: запоминаем размер и цвет ----------
  function bindProduct(pid) {
    const p = prod(pid); if (!p || !hasOptions(p)) return;
    const groups = qsa('.pd__info .pd__opt').filter((g) => qs('[data-opt]', g));
    const kinds = [hasSizes(p) ? 'size' : null, hasColors(p) ? 'color' : null].filter(Boolean);
    const cur = chosen(p);
    const hint = () => {
      const box = qs('#rco-pick'); if (!box) return;
      const v = chosen(p); const inList = !!cartLine(pid);
      box.innerHTML = `${icon('check')}<span>${inList ? 'В списке' : 'В список попадёт'}: <b>${esc(variantText(p, v) || p.variant || '')}</b>. Количество и другие размеры — в списке покупок.</span>`;
    };
    groups.forEach((g, gi) => {
      const kind = kinds[gi]; if (!kind) return;
      const values = kind === 'size' ? p.sizes : p.colors;
      qsa('[data-opt]', g).forEach((b, i) => {
        b.classList.toggle('is-on', values[i] === cur[kind]);
        b.addEventListener('click', () => {
          pick[pid] = { ...chosen(p), [kind]: values[i] };
          const list = lines[pid];
          if (cartLine(pid) && list && list.length === 1) list[0][kind] = values[i];
          hint();
        });
      });
    });
    const actions = qs('.pd__info [data-cart]');
    if (actions && !qs('#rco-pick')) actions.parentElement.insertAdjacentHTML('beforebegin', '<p class="xs rco-pick" id="rco-pick"></p>');
    hint();
  }

  // ---------- Форма заявки ----------
  /* Раздел позиции — для скидки по сертификату (категории сертификата совпадают с разделами каталога). */
  const sectionOf = (p) => (p.cat === 'doors' ? (/входн/i.test(`${p.specs && p.specs['Тип'] || ''} ${p.variant || ''}`) ? 'Входные двери' : 'Межкомнатные двери') : p.cat === 'hardware' ? 'Фурнитура и ручки' : String(p.cat || ''));
  const certApi = () => window.RCOrderCert;
  const certItems = (goods) => goods.map((x, i) => ({ key: i, section: x.section, price: x.price, qty: x.qty, promo: x.promo }));
  const certCalc = (code, sid, goods, orderId) => (certApi() ? certApi().calc(code, sid, certItems(goods), { orderId }) : { state: 'empty' });
  const money = (n) => rub(n);
  function cartGroups() {
    const map = new Map();
    state.cart.forEach((c) => {
      const o = c.type === 'p' ? prod(c.id) : svc(c.id); if (!o) return;
      /* У модели производителя клиент мог выбрать другого продавца или город (catalog-offers.js): заявка и цена — по его выбору. */
      const off = c.type === 'p' && window.RCOffers ? window.RCOffers.pick(o) : null;
      const sid = off ? off.seller : o.seller; const price = off ? off.price : o.price;
      if (!map.has(sid)) map.set(sid, { seller: seller(sid), goods: [], svcs: [], sum: 0, branch: '' });
      const g = map.get(sid);
      if (off && off.branch && !g.branch) g.branch = off.branch;
      if (c.type === 'p') {
        const list = hasOptions(o) ? getLines(o, c.qty) : [{ size: '', color: (o.colors && o.colors[0]) || '', qty: c.qty }];
        list.forEach((l) => { g.goods.push({ section: sectionOf(o), promo: !!o.oldPrice, pid: o.id, name: o.name, variant: variantText(o, l) || o.variant || '', size: l.size, color: l.color, qty: l.qty, price, unit: o.unit, img: o.imgs[0] }); g.sum += price * l.qty; });
      } else g.svcs.push({ id: o.id, title: o.title, price: o.price, img: o.img });
    });
    return [...map.values()];
  }
  function openForm() {
    const groups = cartGroups();
    if (!groups.length) { toast('В списке пока нет позиций'); return; }
    if (window.RCSellerPreview) { toast('Предпросмотр продавца: заявки отправляют клиенты на сайте'); return; }
    const me = window.RCMe && window.RCMe.logged() ? window.RCMe.me().user : null;
    const form = { receive: 'pickup' };
    const pickupRow = (g) => { const br = BRANCHES[g.seller.id]; return `<div class="rco-pickup"><b>${esc(g.seller.name)}</b>${br ? `<select data-rco-branch="${g.seller.id}">${br.map((x) => `<option ${x === g.branch ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : `<span class="small muted">${esc(info(g.seller.id).addr || g.seller.city || 'адрес уточнит продавец')}</span>`}</div>`; };
    const withGoods = groups.filter((g) => g.goods.length);
    modal(`${modalHead('Отправить заявку', groups.length > 1 ? `Список уйдёт ${groups.length} продавцам — каждому свои позиции` : `Продавец — ${esc(groups[0].seller.name)}`)}
      <div class="stack rco-form">
        <div class="rco-sellers">${groups.map((g) => `<div class="rco-seller"><div><b>${esc(g.seller.name)}</b><small>${[g.goods.length ? `${g.goods.length} ${plural(g.goods.length, 'позиция', 'позиции', 'позиций')}` : '', g.svcs.length ? `${g.svcs.length} ${plural(g.svcs.length, 'услуга', 'услуги', 'услуг')} · смета по запросу` : ''].filter(Boolean).join(' · ')}</small></div>${g.goods.length ? `<b>${rub(g.sum)}</b>` : ''}</div>`).join('')}</div>
        <div><label for="rco-name">Как к вам обращаться</label><input id="rco-name" autocomplete="name" value="${me ? esc(`${me.name} ${me.surname || ''}`.trim()) : ''}" placeholder="Имя"><p class="rco-err" data-err="name" hidden>Укажите имя.</p></div>
        <div><label for="rco-via">Где вам удобнее получить ответ</label><select id="rco-via"><option ${me && me.links && me.links.max && !me.links.tg ? 'selected' : ''}>MAX</option><option ${!me || (me.links && me.links.tg) ? 'selected' : ''}>Telegram</option></select>
          <p class="xs muted" style="margin-top:.35rem">Телефон не нужен: продавец напишет вам в бот RemCard. Отвечать можно прямо в боте или здесь, в заявке.</p></div>
        ${withGoods.length ? `<div><label>Как получить товары</label><div class="chips" id="rco-receive"><button type="button" class="chip is-on" data-receive="pickup">${icon('store')} Самовывоз</button><button type="button" class="chip" data-receive="delivery">${icon('truck')} Доставка</button></div>
          <div id="rco-pickup" class="rco-pickups">${withGoods.map(pickupRow).join('')}</div>
          <div id="rco-delivery" hidden><input id="rco-addr" autocomplete="street-address" placeholder="Город, улица, дом, квартира"><p class="rco-err" data-err="addr" hidden>Укажите адрес доставки.</p><p class="xs muted" style="margin-top:.35rem">Стоимость и срок доставки сообщит продавец.</p></div></div>` : ''}
        ${withGoods.length ? `<div class="rco-cert" data-testid="rco-cert-form"><label for="rco-cert">Сертификат RemCard <span class="muted">· если есть</span></label><div class="rco-cert__row"><input id="rco-cert" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Номер, например RC-TD-4F7K"><button type="button" class="btn" id="rco-cert-apply">Применить</button></div><div id="rco-cert-res" class="rco-cert__res" aria-live="polite"></div><p class="xs muted">Скидка считается по категориям сертификата и подтверждается продавцом. Рекомендателю, который дал сертификат, продавец начислит вознаграждение — вам для этого ничего делать не нужно. Номер можно добавить и позже, в заявке.</p></div>` : ''}
        <div><label for="rco-comment">Комментарий продавцу</label><textarea id="rco-comment" placeholder="Сроки, удобное время, вопросы по товару"></textarea></div>
        <button class="btn btn--primary btn--lg" id="rco-send">${icon('send')} Отправить заявку</button>
        <p class="xs muted">Сумма предварительная: наличие и цену подтвердит продавец. Оплата — при покупке у продавца. Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.</p>
      </div>`, {
      onOpen(m) {
        qsa('[data-receive]', m).forEach((b) => b.onclick = () => {
          form.receive = b.dataset.receive;
          qsa('[data-receive]', m).forEach((x) => x.classList.toggle('is-on', x === b));
          qs('#rco-pickup', m).hidden = form.receive !== 'pickup'; qs('#rco-delivery', m).hidden = form.receive !== 'delivery';
        });
        const certIn = qs('#rco-cert', m); const certRes = qs('#rco-cert-res', m);
        const certApply = () => {
          form.cert = ''; certRes.innerHTML = '';
          const code = certApi() ? certApi().normalize(certIn.value) : '';
          if (!code) { certRes.innerHTML = '<p class="rco-cert__msg is-bad">Введите номер сертификата.</p>'; certIn.focus(); return; }
          const rows = withGoods.map((g) => ({ g, r: certCalc(code, g.seller.id, g.goods, '') }));
          const okAny = rows.some((x) => x.r.state === 'ok');
          certRes.innerHTML = rows.map(({ g, r }) => `<p class="rco-cert__msg ${r.state === 'ok' ? 'is-ok' : 'is-bad'}">${icon(r.state === 'ok' ? 'circle-check' : 'alert-triangle')}<span>${withGoods.length > 1 ? `<b>${esc(g.seller.name)}:</b> ` : ''}${r.state === 'ok' ? `скидка −${money(r.discount)}, к оплате ≈ ${money(r.total)}${r.limit ? ' · сертификат одноразовый' : ''}` : esc(r.message || '')}</span></p>`).join('');
          if (okAny) form.cert = code;
        };
        if (certIn) {
          qs('#rco-cert-apply', m).onclick = certApply;
          certIn.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); certApply(); } };
          certIn.oninput = () => { form.cert = ''; certRes.innerHTML = ''; };
        }
        qs('#rco-send', m).onclick = () => {
          /* Номер введён, но не применён: применяем перед отправкой, чтобы скидка не потерялась. */
          if (certIn && certIn.value.trim() && !form.cert) certApply();
          const name = qs('#rco-name', m).value.trim();
          const addrEl = qs('#rco-addr', m); const addr = addrEl ? addrEl.value.trim() : '';
          const bad = { name: !name, addr: withGoods.length > 0 && form.receive === 'delivery' && !addr };
          qsa('[data-err]', m).forEach((el) => { el.hidden = !bad[el.dataset.err]; });
          const first = ['name', 'addr'].find((k) => bad[k]);
          if (first) { qs(`#rco-${first}`, m).focus(); return; }
          const now = new Date(); const when = `сегодня, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const sent = groups.map((g) => {
            const br = qs(`[data-rco-branch="${g.seller.id}"]`, m);
            const receive = !g.goods.length ? '' : form.receive === 'delivery' ? `Доставка · ${addr}` : `Самовывоз · ${br ? br.value : info(g.seller.id).addr || g.seller.city || 'адрес уточнит продавец'}`;
            const o = { id: String(nextNo++), seller: g.seller.id, date: when, status: 'new', goods: g.goods, svcs: g.svcs, sum: g.sum, receive, comment: qs('#rco-comment', m).value.trim(), contact: { name, via: qs('#rco-via', m).value }, chat: [] };
            if (form.cert && g.goods.length) { const r = certCalc(form.cert, g.seller.id, g.goods, o.id); if (r.state === 'ok') { o.cert = { code: form.cert, by: 'client' }; certApi().reserve(form.cert, o.id); } }
            orders.unshift(o); return o.id;
          });
          const sentKeys = new Set(groups.flatMap((g) => [...g.goods.map((x) => `p:${x.pid}`), ...g.svcs.map((x) => `s:${x.id}`)]));
          if (writable()) { state.cart = state.cart.filter((c) => !sentKeys.has(`${c.type}:${c.id}`)); save(); }
          Object.keys(lines).forEach((pid) => { if (!cartLine(pid)) delete lines[pid]; });
          closeModal();
          go(`#/catalog/orders?sent=${sent.join('-')}`);
        };
      },
    });
  }

  // ---------- Мои заявки ----------
  // Ссылка для демонстрации пути «клиент → продавец»: заявка открывается в кабинете партнёра.
  function sellerDemoHref(o) {
    const payload = { n: o.id, d: o.date, c: o.contact, r: o.receive, m: o.comment, t: o.chat.map((x) => x.text), k: o.cert ? o.cert.code : undefined, i: o.goods.map((x) => ({ p: x.pid, s: x.size, c: x.color, q: x.qty })) };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, '-').replace(/\//g, '_');
    /* Товары поставщика, которые партнёр добавил в свой каталог: кабинет получает их вместе с заявкой (id-цена). */
    const sup = [...new Set(o.goods.map((x) => x.pid))].map((pid) => (window.RCCatalogData?.products || []).find((p) => p.id === pid && p.supplierOnly)).filter(Boolean).map((p) => `${p.id}-${p.price}`);
    return `../partner/index.html?role=company&open=goods&dataset=demo${sup.length ? `&rc_added=${sup.join('.')}` : ''}&rc_order=${b64}`;
  }
  const certOpen = (o) => ['new', 'accepted', 'progress'].includes(o.status);
  function certTotals(o) {
    if (!o.goods.length) return '';
    const r = o.cert ? certCalc(o.cert.code, o.seller, o.goods, o.id) : null;
    const total = `<div class="rco-total"><span>Предварительно</span><b>${rub(o.sum)}</b></div>`;
    if (!r || r.state !== 'ok') return total;
    return `${total}<div class="rco-total rco-total--disc" data-testid="rco-cert-disc-${o.id}"><span>Скидка по сертификату ${esc(r.shown)}</span><b>−${rub(r.discount)}</b></div><div class="rco-total rco-total--pay"><span>К оплате продавцу</span><b>${rub(r.total)}</b></div>`;
  }
  function certBlock(o) {
    if (!o.goods.length) return '';
    if (o.cert) {
      const r = certCalc(o.cert.code, o.seller, o.goods, o.id);
      return `<div class="rco-cert rco-cert--on" data-testid="rco-cert-${o.id}"><div class="rco-cert__top"><b>${icon('badge-percent')} Сертификат ${esc(r.shown || o.cert.code)}</b>${o.cert.by === 'client' && certOpen(o) ? `<button type="button" class="btn btn--ghost btn--sm" data-rco-cert-del="${o.id}">Убрать</button>` : ''}</div>
        <p class="small">${r.state === 'ok' ? `Скидка −${rub(r.discount)}. ${o.cert.by === 'partner' ? 'Применил продавец.' : 'Продавец подтвердит её при ответе по заявке.'}${r.by ? ' Рекомендатель сертификата получит вознаграждение от продавца после оплаты заказа.' : ''}` : esc(r.message || 'Скидка не применена.')}</p></div>`;
    }
    if (!certOpen(o)) return '';
    return `<div class="rco-cert" data-testid="rco-cert-add-${o.id}"><label for="rco-cert-in-${o.id}"><b>${icon('badge-percent')} Есть сертификат RemCard?</b></label><div class="rco-cert__row"><input id="rco-cert-in-${o.id}" data-rco-cert-in="${o.id}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Номер, например RC-TD-4F7K"><button type="button" class="btn" data-rco-cert-add="${o.id}">Применить</button></div><p class="rco-cert__msg is-bad" data-rco-cert-msg="${o.id}" hidden></p><p class="xs muted">Скидку по сертификату подтверждает продавец.</p></div>`;
  }
  function orderCard(o) {
    const s = seller(o.seller); const st = STATUS[o.status] || STATUS.new; const at = STEPS.findIndex(([k]) => k === o.status);
    return `<article class="card rco-order" data-rco-order="${o.id}">
      <div class="rco-order__head"><div><b>Заявка № ${o.id}</b><small>${esc(s.name)} · ${esc(o.date)}</small></div><span class="pill ${st[1]}">${st[0]}</span></div>
      <ol class="rco-steps">${STEPS.map(([k, t], i) => `<li class="${i <= at ? 'is-done' : ''}"><i></i><span>${t}</span></li>`).join('')}</ol>
      <div class="rco-items">${o.goods.map((x) => `<a class="pitem" href="#/catalog/p/${x.pid}"><img src="${x.img}" alt=""><div><b>${esc(x.name)}</b><small>${esc(x.variant)} · ${x.qty} ${esc(x.unit)}</small></div><span>${rub(x.price * x.qty)}</span></a>`).join('')}${o.svcs.map((x) => `<a class="pitem" href="#/catalog/s/${x.id}"><img src="${x.img}" alt=""><div><b>${esc(x.title)}</b><small>смета по запросу</small></div></a>`).join('')}</div>
      ${certTotals(o)}
      ${certBlock(o)}
      <dl class="rco-dl">${o.receive ? `<div><dt>Получение</dt><dd>${esc(o.receive)}</dd></div>` : ''}<div><dt>Связь</dt><dd>Бот RemCard в ${esc(o.contact.via)} · эта страница</dd></div>${o.comment ? `<div><dt>Комментарий</dt><dd>${esc(o.comment)}</dd></div>` : ''}</dl>
      <div class="rco-chat" data-testid="rco-chat-${o.id}"><b>${icon('message-circle')} Чат с продавцом</b>
        ${o.chat.length ? `<ol class="rco-chat__log">${o.chat.map((x) => `<li><p>${esc(x.text)}</p><small>Вы · ${esc(x.when)}</small></li>`).join('')}</ol>` : `<p class="small muted">Продавец напишет вам в бот RemCard в ${esc(o.contact.via)} — отвечать можно в боте или здесь. Можно написать первым.</p>`}
        <div class="rco-chat__form"><input data-rco-msg="${o.id}" maxlength="400" placeholder="Сообщение продавцу" aria-label="Сообщение продавцу по заявке № ${o.id}"><button type="button" class="btn btn--primary btn--sm" data-rco-send="${o.id}">${icon('send')} Отправить</button></div>
      </div>
      <div class="row rco-order__foot">${s.demo ? '' : `<a class="btn btn--ghost btn--sm" href="#/catalog/${s.id}">${icon('store')} Страница продавца</a>`}${o.seller === 's6' && o.goods.length ? `<a class="btn btn--ghost btn--sm" href="${sellerDemoHref(o)}" target="_blank" rel="noopener" data-rco-seller-link>${icon('external-link')} Демо: открыть в кабинете продавца</a>` : ''}</div>
    </article>`;
  }
  function pageOrders(params = {}) {
    const sent = String(params.sent || '').split('-').filter((id) => orders.some((o) => o.id === id));
    return `<section class="section--tight"><div class="wrap shop shop--narrow">
      <div class="crumbs"><a href="#/catalog">Каталог</a>${icon('chevron-right')}<span>Мои заявки</span></div>
      <h1 class="pd__name">Мои заявки</h1>
      ${sent.length ? `<div class="notice notice--green rco-sent" role="status">${icon('circle-check')}<div><b>${sent.length > 1 ? `Отправлено заявок: ${sent.length}` : `Заявка № ${sent[0]} отправлена`}</b><p class="small">Продавец увидит её в своём кабинете и в боте и напишет вам в бот RemCard — отвечать можно в боте или здесь, в заявке. Статус обновится на этой странице.</p></div></div>` : ''}
      ${orders.length ? orders.map(orderCard).join('') : `<div class="empty" style="margin-top:1rem"><h3>Заявок пока нет</h3><p style="margin:.4rem 0 1rem">Соберите список покупок в каталоге и отправьте его продавцу.</p><a class="btn btn--primary" href="#/catalog">В каталог</a></div>`}
      ${orders.length ? '<p class="xs muted" style="margin-top:1rem">Прототип: заявки и переписка хранятся только в этой вкладке; статус меняет и отвечает продавец в своём кабинете.</p>' : ''}
    </div></section>`;
  }

  function bindOrders() {
    const send = (id) => {
      const o = orders.find((x) => x.id === id); const box = qs(`[data-rco-msg="${id}"]`);
      const text = box ? box.value.trim().slice(0, 400) : '';
      if (!o || !box) return;
      if (!text) { box.focus(); return; }
      const now = new Date();
      o.chat.push({ text, when: `сегодня, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` });
      renderApp();
      toast('Сообщение отправлено продавцу');
    };
    const addCert = (id) => {
      const o = orders.find((x) => x.id === id); const inp = qs(`[data-rco-cert-in="${id}"]`); const msg = qs(`[data-rco-cert-msg="${id}"]`);
      if (!o || !inp || !certApi()) return;
      const code = certApi().normalize(inp.value);
      const r = code ? certCalc(code, o.seller, o.goods, o.id) : { state: 'empty', message: 'Введите номер сертификата.' };
      if (r.state !== 'ok') { msg.textContent = r.message || 'Введите номер сертификата.'; msg.hidden = false; inp.focus(); return; }
      o.cert = { code, by: 'client' }; certApi().reserve(code, o.id);
      renderApp(); toast(`Сертификат применён: скидка −${rub(r.discount)}. Продавец увидит его в заявке`);
    };
    qsa('[data-rco-cert-add]').forEach((b) => { b.onclick = () => addCert(b.dataset.rcoCertAdd); });
    qsa('[data-rco-cert-in]').forEach((i) => { i.oninput = () => { const m = qs(`[data-rco-cert-msg="${i.dataset.rcoCertIn}"]`); if (m) m.hidden = true; }; i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addCert(i.dataset.rcoCertIn); } }; });
    qsa('[data-rco-cert-del]').forEach((b) => { b.onclick = () => { const o = orders.find((x) => x.id === b.dataset.rcoCertDel); if (!o || !o.cert) return; certApi().release(o.cert.code, o.id); o.cert = null; renderApp(); toast('Сертификат убран из заявки'); }; });
    qsa('[data-rco-send]').forEach((b) => { b.onclick = () => send(b.dataset.rcoSend); });
    qsa('[data-rco-msg]').forEach((i) => { i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); send(i.dataset.rcoMsg); } }; });
  }

  route('/catalog/orders', pageOrders);
  document.addEventListener('rc:rendered', (e) => {
    const { path, params } = e.detail;
    Object.keys(lines).forEach((pid) => { if (!cartLine(pid)) delete lines[pid]; });
    if (path === '/catalog/list') bindList();
    if (path === '/catalog/orders') bindOrders();
    if (path.startsWith('/catalog/p/')) bindProduct(params.id);
  });
  window.RCCatOrder = { rowVariant, openForm, orders: () => orders, __test: { getLines, lines, pick } };
})();
