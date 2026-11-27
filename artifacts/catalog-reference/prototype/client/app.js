/* RemCard — главная, каталог, консьерж */
(function () {
  const { D, NAV, esc, fmt, moneyShort, plural, duration, durationRange, qs, qsa, go, icon, stageIcon, ROOM_ICONS, state, activeProject, modal, closeModal, modalHead, toast, route, renderApp } = window.RC;
  const { forSegment, applicableL1, by } = window.RCCalc;
  const E = D.est;
  const L = D.locality;

  // ---------- Главная ----------
  const quick = { objectType: 'apartment-new', city: 'krasnodar', localityName: '', localityRegion: '', area: 60, segment: 'comfort' };
  function quickInput() {
    const base = { ...quick, scope: 'full', stage: 'bare', style: null, options: [] };
    if (L.isCustom(quick)) return { ...base, city: L.CUSTOM, localityName: quick.localityName, localityRegion: quick.localityRegion };
    return base;
  }
  function updateQuickTotals() {
    const box = qs('.quick__total');
    if (!box) return;
    const q = forSegment(quickInput(), quick.segment);
    const seg = by(E.segments, quick.segment);
    const cols = box.querySelectorAll(':scope > div');
    const priceB = cols[0] && cols[0].querySelector('b');
    const durB = cols[1] && cols[1].querySelector('b');
    if (priceB) priceB.textContent = `${moneyShort(q.total * seg.min)} – ${moneyShort(q.total * seg.max)}`;
    if (durB) durB.textContent = durationRange(q.days * 0.75, q.days * 1.35);
  }
  function pageHome() {
    const p = activeProject();
    const qCustom = L.isCustom(quick);
    const q = forSegment(quickInput(), quick.segment);
    const seg = by(E.segments, quick.segment);
    const nx = p && window.RCNav.nextStep ? window.RCNav.nextStep(p) : null;
    // Правая карточка героя: продолжение маршрута для вернувшегося человека, иначе — быстрый расчёт
    const heroCard = nx ? `<div class="card quick quick--resume"><span class="eyebrow">${esc(p.name)}</span><h3>Этап ${nx.k + 1} из ${nx.n} · ${nx.l1.title}</h3>
        <div class="l1__progress" style="margin:.75rem 0 1rem"><i style="width:${nx.percent}%"></i></div>
        ${nx.l2 ? `<div class="nextcard"><span class="xs muted">Сейчас</span><b>${esc(nx.l2.title)}</b><small>${esc(nx.l2.duration)}</small></div>` : ''}
        <a class="btn btn--primary btn--block btn--lg" href="#/navigator" style="margin-top:1rem">Продолжить ${icon('arrow-right')}</a>
        <div class="row" style="justify-content:space-between;margin-top:.75rem"><a class="link small" href="#/calc">Пересчитать</a><a class="link small muted" href="#/catalog">Каталог</a></div></div>`
      : `<div class="card quick"><h3>Сколько стоит ремонт?</h3>
        <div class="grid2" style="margin-top:1rem"><div><label>Объект</label><select id="q-type">${E.objectTypes.map((t) => `<option value="${t.id}" ${quick.objectType === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div><div><label>Город</label><select id="q-city">${E.cities.map((c) => `<option value="${c.id}" ${!qCustom && quick.city === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}<option value="${L.CUSTOM}" ${qCustom ? 'selected' : ''}>Другой населённый пункт</option></select></div>
          <div><label>Площадь, м²</label><input type="number" id="q-area" min="10" value="${quick.area}" placeholder="60"></div><div><label>Уровень</label><select id="q-seg">${E.segments.map((s) => `<option value="${s.id}" ${quick.segment === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div></div>
        ${
          qCustom
            ? `<div class="locality-fields locality-fields--quick" id="q-locality-fields">
          <label class="field"><span class="field__label">Населённый пункт</span><input type="text" id="q-loc-name" value="${esc(quick.localityName)}" maxlength="100" placeholder="Село, посёлок, станица…" autocomplete="off"></label>
          <label class="field" style="margin-top:.75rem"><span class="field__label">Регион <span class="muted" style="font-weight:500">· необязательно</span></span><input type="text" id="q-loc-region" value="${esc(quick.localityRegion)}" maxlength="100" placeholder="Краснодарский край" autocomplete="off"></label>
          <p class="locality-caveat">${esc(L.CAVEAT)}</p>
          <p class="locality-err hide" id="q-loc-err" role="alert"></p>
        </div>`
            : ''
        }
        <div class="quick__total"><div><span class="xs muted">${seg.label}${qCustom ? ' · ориентировочно' : ''}</span><br><b>${moneyShort(q.total * seg.min)} – ${moneyShort(q.total * seg.max)}</b></div><div style="text-align:right"><span class="xs muted">Срок</span><br><b style="font-size:1rem">${durationRange(q.days * 0.75, q.days * 1.35)}</b></div></div>
        <button class="btn btn--primary btn--block btn--lg" id="q-go" ${qCustom && !L.cityStepValid({ city: L.CUSTOM, localityName: quick.localityName, localityRegion: quick.localityRegion }, E.cities) ? 'disabled' : ''}>${qCustom ? 'Продолжить расчёт' : 'Точный расчёт'} ${icon('arrow-right')}</button>
        <a class="quick__alt" href="#/calc/materials">${icon('calculator')} ${window.RC_R(2) ? 'Посчитать бассейн, навес, плитку — отдельно' : 'Посчитать отдельный материал или работу'} ${icon('chevron-right')}</a></div>`;
    return `
    <section class="hero"><div class="wrap hero__grid">
      <div><h1>Ремонт по шагам.<br>Без хаоса.</h1>
        <p class="lead">Посчитать → пройти по шагам → купить у проверенных.</p>
        <div class="doors doors--hero">
          <a class="door" href="#/calc/start"><span class="door__ico">${icon('calculator', 'i--24')}</span><div><h3>Калькулятор</h3><p>Сколько стоит и сколько займёт</p></div>${icon('arrow-right', 'door__arrow')}</a>
          <a class="door door--main" href="#/navigator"><span class="door__ico door__ico--dark" style="background:rgba(255,255,255,.12)">${icon('route', 'i--24')}</span><div><h3>Навигатор</h3><p>${p ? 'Что делать сейчас — продолжить' : 'Что делать сейчас и дальше'}</p></div>${icon('arrow-right', 'door__arrow')}</a>
          <a class="door" href="#/catalog"><span class="door__ico door__ico--green">${icon('store', 'i--24')}</span><div><h3>Каталог</h3><p>Мастера и магазины со скидкой</p></div>${icon('arrow-right', 'door__arrow')}</a>
        </div></div>
      ${heroCard}
    </div></section>

    <section class="section" style="background:var(--surface);border-top:1px solid var(--line);border-bottom:1px solid var(--line)"><div class="wrap">
      <div class="est-grid" style="align-items:center">
        <div><span class="eyebrow eyebrow--red">Навигатор</span><h2 style="margin:.5rem 0 1rem">Один шаг за раз</h2>
          <ul class="list list--check" style="font-size:var(--text-md)">${['Показываем только то, что делать сейчас', 'Советы и чек-листы — по запросу', 'Деньги по этапам считаются сами', 'Не хотите сами — поручите мастеру в один клик'].map((x) => `<li>${icon('circle-check')}<span>${x}</span></li>`).join('')}</ul>
          <a class="btn btn--dark" href="#/navigator" style="margin-top:1.5rem">${p ? 'Продолжить' : 'Начать'} ${icon('arrow-right')}</a></div>
        <div class="now now--demo" aria-hidden="true">
          <div class="now__head"><div class="dots"><i class="is-done"></i><i class="is-cur"></i><i></i></div><span class="xs muted">Шаг 2 из 3</span></div>
          <h2 style="font-size:1.5rem">Снять старые покрытия</h2>
          <div class="now__who"><span class="xs muted">${icon('user')} Демонтажник · 2–3 дня</span><div class="seg seg--sm"><button class="is-on" type="button">Сам</button><button type="button">Мастер</button></div></div>
          <ul class="tasks tasks--big">${[['Вынести мебель и технику', true], ['Снять обои и напольное покрытие', true], ['Демонтировать старую сантехнику', false], ['Вывезти мусор', false]].map(([t, d]) => `<li class="task ${d ? 'is-done' : ''}"><span class="task__box">${icon('check')}</span><span><span class="task__title">${t}</span></span></li>`).join('')}</ul>
          <span class="btn btn--primary btn--lg btn--block">${icon('check')} Готово</span>
        </div>
      </div></div></section>

    <section class="section"><div class="wrap">
      <div class="section-head"><h2>Из каталога</h2><a class="link" href="#/catalog">Весь каталог ${icon('arrow-right')}</a></div>
      <div class="goods">${window.RCCatalogData.products.filter((x) => x.tags.includes('hit')).slice(0, 4).map(window.RCCat.productCard).join('')}</div></div></section>

    ${window.RCExtras && window.RC_R(2) ? `<section class="section" style="background:var(--surface);border-top:1px solid var(--line);border-bottom:1px solid var(--line)"><div class="wrap">
      <div class="section-head"><div><span class="eyebrow eyebrow--red">${icon('heart')} ${window.RCExtras.CARE.name}</span> ${window.RC.rel2()}<h2 style="margin-top:.4rem">Задачи, которые решим за вас</h2><p class="muted" style="margin-top:.3rem">Не только ремонт.</p></div><a class="link" href="#/care">Раздел «Сервисы» ${icon('arrow-right')}</a></div>
      <div class="care-home">${window.RCExtras.TYPES.map((t) => `<a class="care-home__i" href="#/care?type=${t.id}"><span class="svct__ico">${icon(t.icon)}</span><div><b>${t.title}</b><ul>${t.tasks.slice(0, 2).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><span class="care-home__cta">${t.short} ${icon('arrow-right')}</span></a>`).join('')}</div></div></section>` : ''}

    <section class="section section--tight"><div class="wrap"><div class="card card--dark cta-dark">
      <div><h2 style="color:#fff">Не хотите вникать?</h2><p>Поручите ремонт консьержу RemCard.</p></div>
      <a class="btn btn--primary btn--lg" href="#/concierge">Оставить заявку</a></div></div></section>`;
  }
  function bindHome() {
    if (!qs('#q-type')) return;
    const selUpd = () => {
      quick.objectType = qs('#q-type').value;
      const c = qs('#q-city').value;
      if (c === L.CUSTOM) {
        quick.city = L.CUSTOM;
      } else {
        quick.city = c;
        quick.localityName = '';
        quick.localityRegion = '';
      }
      quick.area = Math.max(10, +qs('#q-area').value || 10);
      quick.segment = qs('#q-seg').value;
      renderApp();
    };
    ['#q-type', '#q-city', '#q-seg'].forEach((s) => (qs(s).onchange = selUpd));
    qs('#q-area').onchange = () => {
      quick.area = Math.max(10, +qs('#q-area').value || 10);
      updateQuickTotals();
    };
    const syncQuickLocality = () => {
      const nameEl = qs('#q-loc-name');
      if (!nameEl) return;
      const regionEl = qs('#q-loc-region');
      quick.localityName = nameEl.value;
      quick.localityRegion = regionEl ? regionEl.value : '';
      const vn = L.validateName(quick.localityName);
      const vr = L.validateRegion(quick.localityRegion);
      const ok = L.cityStepValid({ city: L.CUSTOM, localityName: quick.localityName, localityRegion: quick.localityRegion }, E.cities);
      const goBtn = qs('#q-go');
      if (goBtn) goBtn.disabled = !ok;
      const err = qs('#q-loc-err');
      if (err) {
        const msg = !vn.ok ? vn.msg : !vr.ok ? vr.msg : '';
        err.textContent = msg;
        err.classList.toggle('hide', !msg);
      }
      if (ok) updateQuickTotals();
    };
    const nameEl = qs('#q-loc-name');
    if (nameEl) {
      nameEl.oninput = syncQuickLocality;
      nameEl.onkeydown = (e) => {
        if (e.key === 'Enter' && L.cityStepValid({ city: L.CUSTOM, localityName: quick.localityName, localityRegion: quick.localityRegion }, E.cities)) qs('#q-go')?.click();
      };
      const regionEl = qs('#q-loc-region');
      if (regionEl) {
        regionEl.oninput = syncQuickLocality;
        regionEl.onkeydown = (e) => {
          if (e.key === 'Enter' && L.cityStepValid({ city: L.CUSTOM, localityName: quick.localityName, localityRegion: quick.localityRegion }, E.cities)) qs('#q-go')?.click();
        };
      }
      syncQuickLocality();
    }
    const goBtn = qs('#q-go');
    if (goBtn)
      goBtn.onclick = () => {
        const patch = { objectType: quick.objectType, area: quick.area, segment: quick.segment, ...L.toInputFields(quick) };
        Object.assign(state.estimateInput, patch);
        state.calcStep = 1;
        go('#/calc');
      };
  }

  // ---------- Каталог ----------
  function partnerCard(p) {
    const kindCls = p.kind === 'store' ? 'avatar--store' : p.kind === 'company' ? 'avatar--company' : '';
    const tags = p.tags.map((t) => (p.kind === 'store' ? D.storeCategories[t] : D.specializations[t]) || t);
    return `<a class="pcard" href="#/catalog/${p.id}"><div class="pcard__top"><div class="row" style="gap:.7rem;flex-wrap:nowrap"><span class="avatar ${kindCls}">${esc(p.name[0])}</span><div><div class="pcard__name">${esc(p.name)}</div><div class="pcard__rating">${icon('star')} ${p.rating} · ${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}${p.years ? ` · ${p.years} лет` : ''}</div></div></div><span class="pill">${D.kinds[p.kind]}</span></div>
      <p class="small">${esc(p.about)}</p><div class="chips">${tags.slice(0, 3).map((t) => `<span class="chip" style="pointer-events:none">${esc(t)}</span>`).join('')}</div>
      <div class="pcard__foot"><span>${esc(p.price)}</span><span class="muted xs">${icon('map-pin')} ${esc(p.city)}</span></div></a>`;
  }
  function pageDetail({ id }) {
    const p = D.partners.find((x) => x.id === id);
    if (!p) return `<section class="section"><div class="wrap"><div class="empty">Партнёр не найден. <a class="link" href="#/catalog">В каталог</a></div></div></section>`;
    const cats = p.kind === 'store' ? D.storeCategories : D.specializations;
    const proj = activeProject();
    return `<section class="section"><div class="wrap">
      <a class="link link--ink small" href="#/catalog?kind=${p.kind}">${icon('arrow-left')} В каталог</a>
      <div class="detail" style="margin-top:1rem"><div class="stack" style="gap:1rem">
        <div class="card card--pad-lg"><div class="row" style="gap:1rem;flex-wrap:nowrap;align-items:flex-start"><span class="avatar ${p.kind === 'store' ? 'avatar--store' : p.kind === 'company' ? 'avatar--company' : ''}" style="width:64px;height:64px;font-size:1.5rem;border-radius:16px">${esc(p.name[0])}</span><div><span class="pill">${D.kinds[p.kind]}</span><h2 style="margin:.4rem 0 .3rem">${esc(p.name)}</h2><div class="pcard__rating">${icon('star')} ${p.rating} · ${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}${p.years ? ` · опыт ${p.years} лет` : ''} · ${icon('map-pin')} ${esc(p.city)}</div></div></div>
          <p style="margin-top:1rem">${esc(p.about)}</p><div class="chips" style="margin-top:1rem">${p.tags.map((t) => `<span class="chip" style="pointer-events:none">${esc(cats[t] || t)}</span>`).join('')}</div></div>
        <div class="card"><h4 style="margin-bottom:.75rem">Этапы маршрута, на которых поможет</h4><div class="stack" style="gap:.4rem">${p.stages.map((sid) => { const s = NAV.stagesL1.find((x) => x.id === sid); return `<a class="evt" href="#/navigator?stage=${sid}"><div class="row" style="gap:.6rem;flex-wrap:nowrap"><span class="bar__ico">${stageIcon(sid)}</span><div><b class="ink">${s.title}</b><small>${esc(s.description)}</small></div></div>${icon('chevron-right')}</a>`; }).join('')}</div></div>
        <div class="card"><h4 style="margin-bottom:.75rem">Отзывы клиентов RemCard</h4><div class="stack" style="gap:.6rem">${[['Ольга, Краснодар', 'Всё по срокам, аккуратно, с фотоотчётом по скрытым работам.'], ['Андрей, Новороссийск', 'Смету сверили со средними ценами — без накруток. Рекомендую.']].map(([a, t]) => `<div class="evt"><div><b class="ink">${a}</b><small>${t}</small></div><span class="pill pill--amber">${icon('star')} 5.0</span></div>`).join('')}</div></div>
      </div>
      <aside><div class="card"><span class="eyebrow">Условия</span><h3 style="margin:.4rem 0 1rem">${esc(p.price)}</h3>
        <button class="btn btn--primary btn--block" id="d-contact">${icon('message-circle')} Написать</button><button class="btn btn--ghost btn--block" id="d-call" style="margin-top:.5rem">${icon('phone')} Показать телефон</button>
        ${proj ? `<button class="btn btn--ghost btn--block" id="d-assign" style="margin-top:.5rem">${icon('hand-helping')} Поручить задачи из маршрута</button>` : `<a class="btn btn--ghost btn--block" href="#/navigator" style="margin-top:.5rem">${icon('route')} Начать маршрут с этим партнёром</a>`}
        <p class="xs" style="margin-top:.9rem">Скидка партнёра действует при обращении через RemCard. Споры и гарантии — через консьержа.</p></div>
        <div class="card card--soft"><h4 style="margin-bottom:.4rem">Сравнить предложения</h4><p class="xs">Запросите 2–3 сметы на один объём — консьерж сведёт их в таблицу.</p><a class="btn btn--ghost btn--sm btn--block" href="#/concierge" style="margin-top:.6rem">Запросить сравнение</a></div></aside></div></div></section>`;
  }
  function bindDetail() {
    const c = qs('#d-contact'); if (c) c.onclick = () => toast('Открываем чат с партнёром (в прототипе — заглушка)');
    const t = qs('#d-call'); if (t) t.onclick = () => { t.textContent = '+7 (861) 000-00-00'; };
    const a = qs('#d-assign'); if (a) a.onclick = () => go('#/navigator');
  }

  // ---------- Консьерж ----------
  function pageConcierge() {
    return `<section class="section"><div class="wrap"><div class="concierge">
      <div><span class="eyebrow eyebrow--red">Консьерж RemCard</span><h2 style="margin:.5rem 0 .75rem">Ремонт под присмотром — без вашего участия в процессе</h2>
        <p class="lead">Берём на себя подбор исполнителей, проверку смет, контроль этапов по чек-листам навигатора и приёмку работ. Вы видите прогресс и деньги в своём маршруте.</p>
        <ul class="list list--check" style="margin:1.25rem 0">${['Подбор 2–3 исполнителей на этап из каталога партнёров', 'Сверка смет со средними ценами по рынку', 'Контроль технологических пауз и скрытых работ по фото', 'Приёмка по чек-листам качества с инструментом и допусками', 'Один чат в MAX или Telegram на весь ремонт'].map((x) => `<li>${icon('circle-check')}<span>${x}</span></li>`).join('')}</ul>
        <div class="img-card"><img src="assets/concierge-desk.webp" alt="Консьерж RemCard"><div class="img-card__cap"><b>Тариф:</b> от 3 % от стоимости работ этапа или фиксированно за приёмку.</div></div></div>
      <div class="card card--pad-lg"><h3>Оставить заявку</h3><p class="small" style="margin:.3rem 0 1rem">Ответим в течение часа в рабочее время.</p>
        <div class="stack"><div><label>Что нужно</label><div class="chips" id="cn-what">${['Весь ремонт под ключ', 'Отдельный этап', 'Проверка сметы', 'Приёмка работ', 'Подбор мастера', ...(window.RC_R(2) ? ['Купить товар за меня'] : [])].map((t, i) => `<button class="chip ${i === 0 ? 'is-on' : ''}" data-what="${t}">${t}</button>`).join('')}</div><p class="xs muted" id="cn-buy" hidden style="margin-top:.5rem">Ремонт не обязателен. Найдём лучшее предложение по цене и качеству, купим и привезём. <a class="link" href="#/care?type=purchase">Подробнее</a></p></div>
          <div class="grid2" id="cn-obj"><div><label>Объект</label><select>${E.objectTypes.map((t) => `<option>${t.full}</option>`).join('')}</select></div><div><label>Площадь, м²</label><input type="number" min="10" placeholder="60"></div></div>
          <div><label id="cn-cl">Комментарий</label><textarea id="cn-comment" placeholder="Сроки, бюджет, пожелания"></textarea></div>
          <div class="grid2"><div><label>Телефон</label><input placeholder="+7 ___ ___-__-__"></div><div><label>Мессенджер</label><select><option>MAX</option><option>Telegram</option><option>WhatsApp</option><option>Звонок</option></select></div></div>
          <button class="btn btn--primary btn--lg" id="cn-send">${icon('send')} Отправить заявку</button><p class="xs">Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.</p></div></div>
    </div></div></section>`;
  }
  function bindConcierge() {
    qsa('#cn-what .chip').forEach((b) => b.onclick = () => { qsa('#cn-what .chip').forEach((x) => x.classList.toggle('is-on', x === b)); const buy = /Купить/.test(b.dataset.what); qs('#cn-buy').hidden = !buy; qs('#cn-obj').style.display = buy ? 'none' : ''; qs('#cn-cl').textContent = buy ? 'Что купить' : 'Комментарий'; qs('#cn-comment').placeholder = buy ? 'Товар, объём, бюджет, адрес доставки. Можно ссылку' : 'Сроки, бюджет, пожелания'; });
    const s = qs('#cn-send'); if (s) s.onclick = () => toast('Заявка отправлена — консьерж свяжется с вами');
  }

  route('/', pageHome);
  route('/concierge', pageConcierge);
  document.addEventListener('rc:rendered', (e) => { const p = e.detail.path; if (p === '/') bindHome(); else if (p === '/concierge') bindConcierge(); });
})();
