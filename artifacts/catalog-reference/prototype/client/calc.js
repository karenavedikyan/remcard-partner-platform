/* RemCard — калькулятор ремонта (5 шагов) и страница результата. Формулы перенесены из src/lib/estimation/calculate.ts */
(function () {
  const { D, NAV, esc, fmt, money, moneyShort, plural, duration, durationRange, qs, qsa, go, icon, stageIcon, ROOM_ICONS, state, route, renderApp, renderTop, toast } = window.RC;
  const E = D.est;
  const L = D.locality;
  const by = (arr, id) => arr.find((x) => x.id === id);
  const pricingCity = (inp) => L.pricingCity(E.cities, inp);
  const pricingLevel = (seg) => (seg === 'economy' ? 'economy' : seg === 'premium' ? 'premium' : 'standard');
  // Срок для больших объектов растёт медленнее площади: бригады работают параллельно
  const durArea = (area) => (area <= 100 ? area : 100 * Math.pow(area / 100, 0.6));
  const applicableL1 = (objectType, roomType) => NAV.stagesL1.filter((s) => s.applicableTo.includes(objectType) && (!roomType || (D.roomStages[roomType] || []).includes(s.id)));

  // ---------- Расчёт ----------
  const isYard = (i) => i.objectType === 'yard';
  const hasYard = (i) => isYard(i) || i.objectType === 'house-new' || i.objectType === 'house-renovation';
  const NO_ST = { id: null, label: '', cost: 1, time: 1 };
  const yardM2 = (i) => Math.max(1, +i.plot || 0) * 100;
  // Участок: выбранные работы × площадь участка × уровень × город
  function yardCalc(i, segId) {
    const city = pricingCity(i), m2 = yardM2(i);
    const rows = (i.yard || []).map((id) => { const it = by(E.yardItems, id); if (!it) return null; const qty = it.qty(m2); const price = it.price[segId]; const total = Math.round(qty * price * city.cost); const days = it.daysPer ? Math.ceil(qty / it.daysPer) : it.days[segId]; return { id: it.id, label: it.label, unit: it.unit, qty, price, total, days, kind: it.kind ? it.kind[segId] : '', note: it.note ? it.note[segId] : '' }; }).filter((r) => r && r.total > 0);
    return { rows, total: rows.reduce((a, r) => a + r.total, 0), days: Math.round(rows.reduce((a, r) => a + r.days, 0) * city.time) };
  }
  // Коробка дома с нуля: фундамент, стены, кровля, фасад
  function shellCalc(i, segId) {
    if (i.objectType !== 'house-new' || i.shell !== 'new') return { total: 0, days: 0 };
    const city = pricingCity(i);
    return { total: Math.round(E.shell[segId] * i.area * city.cost), days: E.shell.daysPerM2[segId] * durArea(i.area) * city.time };
  }
  function forSegment(inp, segId) {
    const seg = by(E.segments, segId), city = pricingCity(inp), type = by(E.objectTypes, inp.objectType), st = by(E.stages, inp.stage) || NO_ST;
    const yard = hasYard(inp) ? yardCalc(inp, segId) : { rows: [], total: 0, days: 0 };
    if (isYard(inp)) return { base: yard.total, opts: 0, shell: 0, yard: yard.total, yardRows: yard.rows, total: yard.total, perM2: Math.round(yard.total / Math.max(1, +inp.plot || 0)), days: yard.days, seg, city, type, st };
    const shell = shellCalc(inp, segId);
    const style = inp.style ? by(E.styles, inp.style).cost : 1;
    const base = seg.basePerM2 * inp.area * city.cost * type.cost * st.cost * style;
    const opts = inp.options.reduce((s, o) => s + by(E.options, o).perM2 * inp.area, 0);
    const optDays = inp.options.reduce((s, o) => s + by(E.options, o).days, 0);
    const baseDays = seg.daysPerM2 * durArea(inp.area) * city.time * type.time * st.time;
    // Участок делают параллельно с отделкой — в срок идёт половина его дней
    return { base, opts, shell: shell.total, yard: yard.total, yardRows: yard.rows, total: Math.round(base + opts + shell.total + yard.total), perM2: Math.round((base + opts) / inp.area), days: baseDays + optDays + shell.days + yard.days * 0.5, seg, city, type, st };
  }
  function calculateEstimate(inp) {
    if (isYard(inp)) return calculateYard(inp);
    const r = forSegment(inp, inp.segment);
    const { seg, city, type, st } = r;
    const renovation = r.total;
    const furniture = Math.round(by(E.furniture, inp.furniture).perM2 * inp.area);
    const appliance = by(E.appliances, inp.appliance).fixed;
    const roomFactor = inp.scope === 'room' && inp.roomType ? (by(E.rooms, inp.roomType).factor || 0.15) : 1;
    const sc = (n) => Math.round(n * roomFactor);
    const level = pricingLevel(inp.segment);
    const stages = applicableL1(inp.objectType, inp.scope === 'room' ? inp.roomType : null).filter((s) => s.id !== 'L1-12');
    let raw = 0;
    const rows = stages.map((s) => { const p = NAV.stageEstimates.find((x) => x.stageId === s.id); const v = (p.workPricePerM2[level] + p.materialPricePerM2[level]) * inp.area; raw += v; return { s, p, v }; });
    const interior = sc(Math.round(r.base + r.opts)), shell = sc(r.shell), yard = sc(r.yard);
    const scopedRenovation = interior + shell + yard;
    const breakdown = rows.map(({ s, p, v }) => {
      const share = v / raw; const total = Math.round(interior * share) + (shell ? Math.round(shell * (E.shell.split[s.id] || 0)) : 0); const work = Math.round(total * seg.workShare);
      return { id: s.id, title: s.title, total, work, material: total - work, days: Math.max(1, Math.round(p.durationDays[level] * (durArea(inp.area) / 60) * city.time * roomFactor)), percent: Math.max(1, Math.round(total / scopedRenovation * 100)) };
    });
    if (yard) { const y = yardCalc(inp, inp.segment); const l1 = NAV.stagesL1.find((x) => x.id === 'L1-12'); breakdown.push({ id: 'L1-12', title: l1 ? l1.title : 'Благоустройство', total: yard, work: Math.round(yard * 0.55), material: yard - Math.round(yard * 0.55), days: Math.max(1, y.days), percent: Math.max(1, Math.round(yard / scopedRenovation * 100)) }); const order = NAV.stagesL1.map((x) => x.id); breakdown.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); }
    const dmin = Math.round(r.days * 0.75), dmax = Math.round(r.days * 1.35);
    const factors = [`Уровень «${seg.label}» — базовая ставка ${fmt(seg.basePerM2)} ₽/м²`, `Площадь ${fmt(inp.area)} м² — основной множитель стоимости`];
    const pct = (f) => `${f > 1 ? '+' : ''}${Math.round((f - 1) * 100)} %`;
    if (inp.area > 100) factors.push(`Объект больше 100 м² — срок рассчитан с учётом параллельной работы бригад`);
    if (L.isCustom(inp)) factors.push(L.CAVEAT);
    else if (city.cost !== 1) factors.push(`${city.label} — ${pct(city.cost)} к стоимости`);
    if (type.cost !== 1) factors.push(`${type.full} — ${pct(type.cost)} к стоимости`);
    if (st.cost !== 1) factors.push(`${st.label} — ${pct(st.cost)} к стоимости`);
    if (inp.style && by(E.styles, inp.style).cost !== 1) factors.push(`Стиль «${by(E.styles, inp.style).label}» — ${pct(by(E.styles, inp.style).cost)} к стоимости`);
    if (inp.options.length) factors.push(`${inp.options.length} доп. ${plural(inp.options.length, 'опция', 'опции', 'опций')} — +${money(sc(r.opts))}`);
    if (roomFactor !== 1) factors.push(`Ремонт одной комнаты (${by(E.rooms, inp.roomType).label}) — ${Math.round(roomFactor * 100)} % от стоимости всего объекта`);
    if (shell) factors.push(`Коробка дома с нуля (фундамент, стены, кровля, фасад) — ${fmt(E.shell[inp.segment])} ₽/м², +${money(shell)}`);
    if (yard) factors.push(`Участок ${fmt(inp.plot)} сот., ${r.yardRows.length} ${plural(r.yardRows.length, 'работа', 'работы', 'работ')} — +${money(yard)}`);
    const exclusions = E.exclusions.filter((x) => !(x.includes('Мебель') && inp.furniture !== 'none') && !(x.includes('техника') && inp.appliance !== 'none'));
    if (inp.objectType === 'house-new' && !shell) exclusions.unshift('Коробка дома — считаем, что она уже есть');
    if (hasYard(inp) && !yard) exclusions.unshift('Благоустройство участка (не выбрано)');
    const turnkey = scopedRenovation + sc(furniture) + sc(appliance);
    return {
      input: { ...inp }, renovation: scopedRenovation, min: sc(renovation * seg.min), max: sc(renovation * seg.max), perM2: Math.round((r.base + r.opts + r.shell) / inp.area), unit: 'м²',
      furniture: sc(furniture), appliance: sc(appliance), turnkey, turnkeyPerM2: Math.round(turnkey / inp.area), reserve: Math.round(scopedRenovation * E.reservePercent / 100),
      works: sc(r.base * seg.workShare) + Math.round(shell * E.shell.workShare) + Math.round(yard * 0.55), materials: sc(r.base * (1 - seg.workShare)) + (shell - Math.round(shell * E.shell.workShare)) + (yard - Math.round(yard * 0.55)), options: sc(r.opts),
      shell, yard, yardRows: r.yardRows, plot: inp.plot,
      dmin: roomFactor !== 1 ? Math.max(14, sc(dmin)) : dmin, dmax: roomFactor !== 1 ? Math.max(14, sc(dmax)) : dmax,
      breakdown, factors, exclusions, level,
      comparison: E.segments.map((s) => { const c = forSegment(inp, s.id); return { id: s.id, label: s.label, total: sc(c.total), perM2: c.perM2, days: Math.round(c.days), popular: s.popular }; }),
      finance: [12, 24, 36, 60].map((m) => ({ m, pay: Math.round(turnkey / m) })),
    };
  }
  // Только участок: без дома, считаем выбранные работы по соткам
  function calculateYard(inp) {
    const r = forSegment(inp, inp.segment), { seg, city } = r, level = pricingLevel(inp.segment);
    const total = r.total, plot = Math.max(1, +inp.plot || 0);
    const design = r.yardRows.find((x) => x.id === 'design');
    const rest = total - (design ? design.total : 0);
    const breakdown = [];
    if (design) breakdown.push({ id: 'L1-0', title: 'Обследование и проект участка', total: design.total, work: design.total, material: 0, days: design.days, percent: Math.max(1, Math.round(design.total / total * 100)) });
    const l1 = NAV.stagesL1.find((x) => x.id === 'L1-12');
    breakdown.push({ id: 'L1-12', title: l1 ? l1.title : 'Благоустройство', total: rest, work: Math.round(rest * 0.55), material: rest - Math.round(rest * 0.55), days: Math.max(1, r.days - (design ? design.days : 0)), percent: Math.max(1, Math.round(rest / total * 100)) });
    const factors = [`Участок ${fmt(plot)} ${plural(plot, 'сотка', 'сотки', 'соток')} — ${fmt(plot * 100)} м², от площади считаем забор, дорожки и газон`, `Уровень «${seg.label}» — материалы и решения этого класса`, `${r.yardRows.length} ${plural(r.yardRows.length, 'работа выбрана', 'работы выбраны', 'работ выбрано')}`];
    if (L.isCustom(inp)) factors.push(L.CAVEAT);
    else if (city.cost !== 1) factors.push(`${city.label} — ${city.cost > 1 ? '+' : ''}${Math.round((city.cost - 1) * 100)} % к стоимости`);
    const works = Math.round(total * 0.55), dmin = Math.round(r.days * 0.8), dmax = Math.round(r.days * 1.3);
    return {
      input: { ...inp, area: plot * 100, scope: 'full', roomType: null }, renovation: total, min: Math.round(total * seg.min), max: Math.round(total * seg.max), perM2: Math.round(total / plot), unit: 'сотка',
      furniture: 0, appliance: 0, turnkey: total, turnkeyPerM2: Math.round(total / plot), reserve: Math.round(total * E.reservePercent / 100),
      works, materials: total - works, options: 0, shell: 0, yard: total, yardRows: r.yardRows, plot,
      dmin: Math.max(3, dmin), dmax: Math.max(5, dmax), breakdown, factors, exclusions: E.yardExclusions, level,
      comparison: E.segments.map((s) => { const c = forSegment(inp, s.id); return { id: s.id, label: s.label, total: c.total, perM2: c.perM2, days: Math.round(c.days), popular: s.popular }; }),
      finance: [12, 24, 36, 60].map((m) => ({ m, pay: Math.round(total / m) })),
    };
  }

  // ---------- UI калькулятора: один вопрос — один экран ----------
  const inp = () => state.estimateInput;
  function freshEstimateInput() {
    return {
      objectType: null,
      city: 'krasnodar',
      scope: 'full',
      roomType: null,
      area: 60,
      rooms: 2,
      stage: null,
      segment: null,
      style: null,
      options: [],
      furniture: 'none',
      appliance: 'none',
      shell: null,
      yard: [],
      plot: 6,
      localityName: '',
      localityRegion: '',
    };
  }
  function beginNewEstimateSession() {
    state.estimateInput = freshEstimateInput();
    state.calcStep = 1;
    state.calcViewFrozen = false;
    state.estimate = null;
    state.activeCalcRecordId = null;
    state._restoredCalcRecord = null;
    state._restoredEstimateRecord = null;
  }
  const pick = (on, html, action, cls = '') => `<button type="button" class="pick ${cls} ${on ? 'is-on' : ''}" data-act="${action}" aria-pressed="${on ? 'true' : 'false'}">${html}</button>`;
  const pct = (v) => `${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)} %`;
  const fn = (v, i) => (typeof v === 'function' ? v(i) : v);
  // Участок: один вопрос про работы (можно несколько) и один про площадь в сотках
  const yardQ = (id, when) => ({ id, key: 'yard', title: (i) => (isYard(i) ? 'Что сделать на участке?' : 'Участок благоустроить?'), hint: 'Можно несколько', optional: (i) => !isYard(i), when, valid: (i) => !isYard(i) || i.yard.length > 0,
    render: (i) => `<div class="picks picks--2">${E.yardItems.map((o) => pick(i.yard.includes(o.id), `<span class="box">${icon('check')}</span><span class="grow"><b>${o.label}</b><span>${o.desc}</span></span>`, `yard:${o.id}`, 'pick--check')).join('')}</div>` });
  const plotQ = (id, when) => ({ id, key: 'plot', title: 'Сколько соток участок?', hint: 'Примерно — от площади зависят забор, дорожки и газон', when, valid: (i) => i.plot >= 1,
    render: (i) => `<div class="num num--big"><input type="number" id="plot" inputmode="decimal" min="1" step="0.5" value="${i.plot || ''}" placeholder="6" autofocus><span class="num__unit">соток</span></div>
        <div class="chips chips--center" style="margin-top:1rem">${[4, 6, 8, 10, 15, 20, 30].map((a) => `<button type="button" class="chip ${i.plot === a ? 'is-on' : ''}" data-act="plot:${a}">${a}</button>`).join('')}</div>` });
  // Вопросы. auto — переход сразу после выбора; optional — можно пропустить; when — показывать ли вопрос.
  const Q = [
    { id: 'type', title: 'Что ремонтируем?', auto: true, valid: (i) => !!i.objectType,
      render: (i) => `<div class="picks picks--2">${E.objectTypes.map((t) => pick(i.objectType === t.id, `<span class="pick__ico">${icon(t.icon, 'i--20')}</span><b>${t.label}</b><span>${t.desc}</span>`, `type:${t.id}`)).join('')}</div>` },
    { id: 'scope', title: 'Весь объект или одна комната?', auto: true, when: (i) => !isYard(i), valid: (i) => !!i.scope,
      render: (i) => `<div class="picks picks--2">${pick(i.scope === 'full', `<span class="pick__ico">${icon('home', 'i--20')}</span><b>Весь объект</b>`, 'scope:full', 'pick--center')}${pick(i.scope === 'room', `<span class="pick__ico">${icon('door-open', 'i--20')}</span><b>Одну комнату</b>`, 'scope:room', 'pick--center')}</div>` },
    { id: 'room', title: 'Какую комнату?', auto: true, when: (i) => !isYard(i) && i.scope === 'room', valid: (i) => !!i.roomType,
      render: (i) => `<div class="picks picks--3">${E.rooms.map((r) => pick(i.roomType === r.id, `<span class="pick__ico">${icon(ROOM_ICONS[r.id], 'i--20')}</span><b>${r.label}</b>`, `room:${r.id}`, 'pick--center')).join('')}</div>` },
    {
      id: 'city',
      title: 'Где объект?',
      auto: (i) => !L.isCustom(i),
      valid: (i) => L.cityStepValid(i, E.cities),
      render: (i) => {
        const custom = L.isCustom(i);
        const vn = custom ? L.validateName(i.localityName) : { ok: true };
        const vr = custom ? L.validateRegion(i.localityRegion) : { ok: true };
        const err = custom && (!vn.ok ? vn.msg : !vr.ok ? vr.msg : '');
        return `<div class="picks picks--3">${E.cities
          .map((c) =>
            pick(!custom && i.city === c.id, `<b>${c.label}</b>${c.cost !== 1 ? `<span>${pct(c.cost)} к ценам</span>` : ''}`, `city:${c.id}`, 'pick--center')
          )
          .join('')}${pick(
          custom,
          `<b>Другой населённый пункт</b><span>село, посёлок, станица…</span>`,
          `city:${L.CUSTOM}`,
          'pick--center'
        )}</div>
        ${
          custom
            ? `<div class="locality-fields" id="locality-fields">
          <label class="field"><span class="field__label">Населённый пункт</span><input type="text" id="loc-name" value="${esc(i.localityName || '')}" maxlength="100" placeholder="Например, станица Старощербиновская" autocomplete="off"></label>
          <label class="field"><span class="field__label">Регион <span class="muted" style="font-weight:500">· необязательно</span></span><input type="text" id="loc-region" value="${esc(i.localityRegion || '')}" maxlength="100" placeholder="Краснодарский край" autocomplete="off"></label>
          <p class="locality-caveat">${esc(L.CAVEAT)}</p>
          ${err ? `<p class="locality-err" id="loc-err" role="alert">${esc(err)}</p>` : `<p class="locality-err hide" id="loc-err" role="alert"></p>`}
        </div>`
            : ''
        }`;
      },
    },
    { id: 'area', title: 'Какая площадь?', hint: 'Примерно — потом можно уточнить', when: (i) => !isYard(i), valid: (i) => i.area >= 10,
      render: (i) => `<div class="num num--big"><input type="number" id="area" inputmode="decimal" min="10" step="1" value="${i.area || ''}" placeholder="64" autofocus><span class="num__unit">м²</span></div>
        <div class="chips chips--center" style="margin-top:1rem">${[35, 45, 60, 80, 100, 150, 250].map((a) => `<button type="button" class="chip ${i.area === a ? 'is-on' : ''}" data-act="area:${a}">${a}</button>`).join('')}</div>` },
    { id: 'rooms', title: 'Сколько комнат?', auto: true, when: (i) => !isYard(i) && i.scope !== 'room', valid: (i) => i.rooms >= 1,
      render: (i) => `<div class="picks picks--3 picks--num">${[1, 2, 3, 4, 5].map((n) => pick(i.rooms === n || (n === 5 && i.rooms > 5), `<b>${n}${n === 5 ? '+' : ''}</b>`, `rooms:${n}`, 'pick--center')).join('')}</div>
        ${i.rooms >= 5 ? `<div class="num" style="justify-content:center;margin-top:1rem"><input type="number" id="rooms" min="5" step="1" value="${i.rooms}" aria-label="Точное количество комнат" style="max-width:120px"><span class="num__unit">комнат</span></div>` : ''}` },
    { id: 'stage', title: 'В каком состоянии сейчас?', auto: true, when: (i) => !isYard(i), valid: (i) => !!i.stage,
      render: (i) => `<div class="picks picks--2">${E.stages.map((s) => pick(i.stage === s.id, `<b>${s.label}</b><span>${s.desc}</span>${s.cost !== 1 ? `<em class="pick__tag ${s.cost > 1 ? 'is-up' : 'is-down'}">${pct(s.cost)}</em>` : ''}`, `stage:${s.id}`)).join('')}</div>` },
    yardQ('yard-a', (i) => isYard(i)), plotQ('plot-a', (i) => isYard(i)),
    { id: 'segment', title: (i) => (isYard(i) ? 'Какой уровень благоустройства?' : 'Какой уровень ремонта?'), auto: true, last: (i) => isYard(i), valid: (i) => !!i.segment,
      render: (i) => `<div class="picks picks--2">${E.segments.map((s) => { const c = forSegment({ ...i, segment: s.id, style: null }, s.id); return pick(i.segment === s.id, `${s.popular ? '<span class="pill pill--red">Чаще всего</span>' : ''}<b style="font-size:1.1rem">${s.label}</b><span>${s.desc}</span><span class="ink" style="margin-top:.4rem;font-weight:700">≈ ${moneyShort(c.total)} · ${duration(c.days)}</span>`, `segment:${s.id}`); }).join('')}</div>` },
    { id: 'shell', title: 'Коробка дома уже есть?', auto: true, when: (i) => i.objectType === 'house-new' && window.RC_R(2), valid: (i) => !!i.shell,
      render: (i) => `<div class="picks picks--2">${pick(i.shell === 'new', `<span class="pick__ico">${icon('brick-wall', 'i--20')}</span><b>Строим с нуля</b><span>фундамент, стены, кровля и фасад — добавим в расчёт</span>`, 'shell:new')}${pick(i.shell === 'has', `<span class="pick__ico">${icon('home', 'i--20')}</span><b>Коробка уже есть</b><span>считаем только инженерию и отделку</span>`, 'shell:has')}</div>` },
    yardQ('yard-b', (i) => hasYard(i) && !isYard(i)), plotQ('plot-b', (i) => hasYard(i) && !isYard(i) && i.yard.length > 0),
    { id: 'style', title: 'Какой стиль нравится?', hint: 'Нажмите на карточку, чтобы выбрать. Кнопка в углу — рассмотреть фото.', optional: true, when: (i) => !isYard(i), valid: () => true,
      render: (i) => `<div class="styles">${E.styles.map((s) => `<div class="style ${i.style === s.id ? 'is-on' : ''}"><button type="button" class="style__select" data-act="style:${s.id}" data-testid="select-style-${s.id}" aria-label="Выбрать стиль «${s.label}»" aria-pressed="${i.style === s.id ? 'true' : 'false'}"><span class="style__img"><img src="assets/styles/${s.id}.webp" alt="" loading="lazy"></span><span class="style__body"><span class="style__check" aria-hidden="true">${icon('check')}</span><b>${s.label}</b><em>${s.cost === 1 ? 'базовая' : `${pct(s.cost)} к материалам`}</em><small class="style__action">${i.style === s.id ? 'Выбрано' : 'Выбрать'}</small></span></button><button type="button" class="style__zoom" data-act="stylezoom:${s.id}" data-testid="preview-style-${s.id}" aria-label="Рассмотреть стиль «${s.label}»" title="Рассмотреть фото">${icon('maximize-2')}</button></div>`).join('')}</div>` },
    { id: 'options', title: 'Что-то из этого нужно?', hint: 'Можно несколько', optional: true, when: (i) => !isYard(i), valid: () => true,
      render: (i) => `<div class="calc-selection-tools"><button type="button" class="btn btn--ghost btn--sm" data-act="opts:all" data-testid="select-all-options" ${E.options.every((o) => i.options.includes(o.id)) ? 'disabled' : ''}>Выбрать всё</button><button type="button" class="btn btn--ghost btn--sm" data-act="opts:none" data-testid="clear-all-options" ${i.options.length ? '' : 'disabled'}>Снять всё</button><span class="small" role="status" aria-live="polite" data-testid="options-selection-count">Выбрано ${E.options.filter((o) => i.options.includes(o.id)).length} из ${E.options.length}</span></div><div class="picks picks--2">${E.options.map((o) => pick(i.options.includes(o.id), `<span class="box">${icon('check')}</span><span class="grow"><b>${o.label}</b><span>+${fmt(o.perM2)} ₽/м²</span></span>`, `opt:${o.id}`, 'pick--check')).join('')}</div>` },
    { id: 'furn', title: 'Мебель считать?', optional: true, auto: true, when: (i) => !isYard(i), valid: () => true,
      render: (i) => `<div class="picks picks--2">${E.furniture.map((f) => pick(i.furniture === f.id, `<b>${f.label}</b><span>${f.perM2 ? `${fmt(f.perM2)} ₽/м²` : 'не считаем'}</span>`, `furn:${f.id}`, 'pick--center')).join('')}</div>` },
    { id: 'appl', title: 'А технику?', optional: true, auto: true, when: (i) => !isYard(i), valid: () => true, last: true,
      render: (i) => `<div class="picks picks--2">${E.appliances.map((a) => pick(i.appliance === a.id, `<b>${a.label}</b><span>${a.fixed ? money(a.fixed) : 'не считаем'}</span>`, `appl:${a.id}`, 'pick--center')).join('')}</div>` },
  ];
  const visible = () => Q.filter((q) => !q.when || q.when(inp()));
  const qIndex = () => Math.min(state.calcStep - 1, visible().length - 1);
  // Совместимость со старыми ссылками #/calc?step=1..4
  const LEGACY = { 1: 'type', 2: 'area', 3: 'segment', 4: 'style' };
  const finish = () => {
    const rec = activeEstimateRecord();
    if (rec && window.RCProjectCalcs?.recordEditBlocked?.(rec)) return;
    state.estimate = calculateEstimate(inp());
    if (window.RCProjectCalcs) {
      window.RCProjectCalcs.saveEstimateResult(state.estimate);
      const recId = window.RCProjectCalcs.activeIdForType('estimate-total');
      window.RCProjectCalcs.calcNavigate('#/estimate', recId);
      state._restoredEstimateRecord = recId;
    } else {
      go('#/estimate');
    }
  };
  let autoAdvanceT = null;
  const cancelAutoAdvance = () => { if (autoAdvanceT != null) { clearTimeout(autoAdvanceT); autoAdvanceT = null; } };
  const next = () => {
    const activeRec = activeEstimateRecord();
    if (activeRec && window.RCProjectCalcs?.recordEditBlocked?.(activeRec)) return;
    cancelAutoAdvance();
    const v = visible(), k = qIndex(), q = v[k];
    if (q && !q.valid(inp())) return;
    if (fn(q?.last, inp()) || k >= v.length - 1) return finish();
    state.calcStep = k + 2;
    if (window.RCProjectCalcs) {
      window.RCProjectCalcs.autosaveEstimate(
        { ...state.estimateInput },
        { path: '#/calc', calcStep: state.calcStep },
      );
    }
    renderTop();
  };
  const scheduleAutoAdvance = () => {
    cancelAutoAdvance();
    const expectedStep = state.calcStep;
    const expectedId = visible()[qIndex()]?.id;
    autoAdvanceT = setTimeout(() => {
      autoAdvanceT = null;
      const activeRec = activeEstimateRecord();
      if (activeRec && window.RCProjectCalcs?.recordEditBlocked?.(activeRec)) return;
      if (state.calcStep !== expectedStep) return;
      const v = visible(), k = qIndex(), q = v[k];
      if (!q || q.id !== expectedId || !q.valid(inp())) return;
      next();
    }, 220);
  };
  function activeEstimateRecord() {
    if (!window.RCProjectCalcs) return null;
    const rid = window.RCProjectCalcs.resolveEstimateRecordId
      ? window.RCProjectCalcs.resolveEstimateRecordId({})
      : state._restoredCalcRecord;
    return rid ? window.RCProjectCalcs.findRecord(rid) : null;
  }

  const set = (patch, advance) => {
    const rec = activeEstimateRecord();
    if (rec && window.RCProjectCalcs?.recordEditBlocked?.(rec)) return;
    cancelAutoAdvance();
    Object.assign(state.estimateInput, patch);
    if (window.RCProjectCalcs) {
      window.RCProjectCalcs.autosaveEstimate(patch, { path: '#/calc', calcStep: state.calcStep });
    }
    if (advance) { renderApp(); scheduleAutoAdvance(); } else renderApp();
  };

  function pageCalc(params) {
    if (window.RCProjectCalcs) {
      const rid = window.RCProjectCalcs.resolveEstimateRecordId
        ? window.RCProjectCalcs.resolveEstimateRecordId(params)
        : (params.record || null);
      if (rid) {
        const rec = window.RCProjectCalcs.findRecord(rid);
        if (rec && rec.calcType === 'estimate-total' && state._restoredCalcRecord !== rid) {
          window.RCProjectCalcs.restoreEstimateRoute(rec);
          state._restoredCalcRecord = rid;
          if (rec.incomplete || !rec.resultSnapshot) state._restoredEstimateRecord = null;
        }
      }
    }
    const estRid = window.RCProjectCalcs?.resolveEstimateRecordId?.(params) || null;
    const estRec = estRid && window.RCProjectCalcs ? window.RCProjectCalcs.findRecord(estRid) : null;
    const estWrongType = window.RCProjectCalcs?.wrongTypeRecordParam?.('estimate-total', params)
      ? `<div class="notice notice--amber" data-testid="calc-record-wrong-type" style="margin-bottom:1rem">${icon('info')}<span>Ссылка указывает на расчёт другого типа — показан актуальный общий расчёт.</span></div>`
      : '';
    const estUnusable = estRec && estRec.dataTypedInvalid
      ? `<div class="notice notice--amber" data-testid="calc-record-unusable" style="margin-bottom:1rem">${icon('info')}<span>Сохранённые данные этого расчёта повреждены — редактирование и пересохранение отключены.</span></div>`
      : '';
    const estParentUnavailable = estRec && window.RCProjectCalcs?.isOrphanProjectBinding?.(estRec)
      ? `<div class="notice notice--amber" data-testid="calc-record-parent-unavailable" style="margin-bottom:1rem">${icon('info')}<span>Маршрут, к которому был привязан этот расчёт, сейчас недоступен в навигаторе — автосохранение отключено, исходные данные сохранены. Откройте «Мои проекты», чтобы скопировать или отвязать расчёт.</span></div>`
      : '';
    const estParentShared = estRec && window.RCProjectCalcs?.isSharedProjectBinding?.(estRec)
      ? `<div class="notice notice--amber" data-testid="calc-record-parent-readonly" style="margin-bottom:1rem">${icon('info')}<span>Расчёт привязан к общему маршруту — редактирование и пересохранение отключены. Скопируйте расчёт в «Мои проекты», чтобы получить редактируемую копию без проекта.</span></div>`
      : '';
    if (params.step) {
      const id = LEGACY[+params.step];
      const k = visible().findIndex((q) => q.id === id);
      state.calcStep = k >= 0 ? k + 1 : 1;
      const url = window.RCProjectCalcs?.calcHistoryUrl
        ? window.RCProjectCalcs.calcHistoryUrl('#/calc')
        : (typeof location !== 'undefined' && location.search ? `${location.pathname || '/'}${location.search}#/calc` : '#/calc');
      history.replaceState(history.state, '', url);
    }
    const v = visible(), k = qIndex(), q = v[k], i = inp();
    const ok = q.valid(i), optional = fn(q.optional, i), last = fn(q.last, i), title = fn(q.title, i);
    const est =
      i.segment && L.cityStepValid(i, E.cities) && (isYard(i) ? i.plot >= 1 && i.yard.length : i.area >= 10)
        ? forSegment({ ...i, style: i.style || null }, i.segment)
        : null;
    const seg = i.segment ? by(E.segments, i.segment) : null;
    const lockEst = !!(estRec && window.RCProjectCalcs?.recordEditBlocked?.(estRec));
    return `<section class="section--tight"><div class="wrap calc calc--q${lockEst ? ' calc--locked' : ''}">
      ${estUnusable}
      ${estParentUnavailable}
      ${estParentShared}
      ${estWrongType}
      <div class="q__top"><button class="btn btn--ghost btn--sm btn--icon" data-act="prev" aria-label="Назад" ${k === 0 || lockEst ? 'disabled' : ''}>${icon('arrow-left')}</button><div class="steps__bar" style="margin:0;flex:1"><i style="width:${((k + 1) / (v.length + 1)) * 100}%"></i></div><a class="btn btn--ghost btn--sm btn--icon" href="#/" aria-label="Закрыть">${icon('x')}</a></div>
      <fieldset class="calc-wizard__fields" ${lockEst ? 'disabled' : ''}>
      <div class="q__body">
        ${k === 0 && window.RCMatCalc ? window.RCMatCalc.modeSwitch('all') : ''}
        <span class="eyebrow">${k + 1} из ${v.length}${optional ? ' · необязательно' : ''}</span>
        <h2 class="q__title">${title}</h2>
        ${q.hint ? `<p class="small q__hint">${q.hint}</p>` : ''}
        <div id="calc-body" class="q__content">${q.render(i)}</div>
      </div>
      <div class="q__foot">
        <div class="q__est">${est && seg ? `<span class="xs muted">Пока выходит</span><b>${moneyShort(est.total * seg.min)} – ${moneyShort(est.total * seg.max)}</b>` : ''}</div>
        <div class="row q__foot-actions" style="gap:.5rem">
          ${optional ? `<button class="btn btn--ghost" data-act="skip"${lockEst ? ' disabled' : ''}>${last ? 'Пропустить и показать расчёт' : 'Пропустить'}</button>` : ''}
          ${!fn(q.auto, i) || last || (optional && q.id === 'style') ? `<button class="btn btn--primary" data-act="next" ${ok && !lockEst ? '' : 'disabled'}>${last ? 'Показать расчёт' : 'Далее'} ${icon('arrow-right')}</button>` : ''}
        </div></div>
      </fieldset>
      ${window.RCProjectCalcs ? window.RCProjectCalcs.libraryLink('calc-library-link') : ''}
    </div></section>`;
  }

  function styleGallery(id) {
    let idx = E.styles.findIndex((s) => s.id === id);
    const render = () => {
      const s = E.styles[idx], cur = inp().style === s.id;
      return `<div class="gallery">
        <img class="gallery__img" src="assets/styles/${s.id}-lg.webp" alt="${s.label}">
        <button class="gallery__nav gallery__nav--prev" data-g="prev" aria-label="Предыдущий">${icon('chevron-left')}</button>
        <button class="gallery__nav gallery__nav--next" data-g="next" aria-label="Следующий">${icon('chevron-right')}</button>
        <button class="gallery__close" data-close aria-label="Закрыть">${icon('x')}</button>
        <div class="gallery__bar"><div><span class="xs" style="opacity:.7">${idx + 1} из ${E.styles.length}</span><h3>${s.label}</h3><p class="small" style="opacity:.85">${s.desc} · ${s.cost === 1 ? 'базовая стоимость' : `${s.cost > 1 ? '+' : ''}${Math.round((s.cost - 1) * 100)} % к материалам`}</p></div>
          <button class="btn ${cur ? 'btn--light' : 'btn--primary'}" data-g="pick">${cur ? icon('check') + ' Выбран' : 'Выбрать этот стиль'}</button></div>
        <div class="gallery__thumbs">${E.styles.map((x, k) => `<button class="${k === idx ? 'is-on' : ''}" data-g="go" data-k="${k}" aria-label="${x.label}"><img src="assets/styles/${x.id}.webp" alt=""></button>`).join('')}</div>
      </div>`;
    };
    const open = () => RC.modal(render(), { onOpen(m) {
      m.querySelector('.modal__box').classList.add('modal__box--gallery');
      m.onkeydown = null;
      qsa('[data-g]', m).forEach((b) => (b.onclick = () => {
        const g = b.dataset.g;
        if (g === 'prev') idx = (idx - 1 + E.styles.length) % E.styles.length;
        if (g === 'next') idx = (idx + 1) % E.styles.length;
        if (g === 'go') idx = +b.dataset.k;
        if (g === 'pick') { set({ style: E.styles[idx].id }); RC.closeModal(); toast(`Стиль «${E.styles[idx].label}» выбран`); return; }
        open();
      }));
    } });
    open();
    const key = (e) => { if (!document.querySelector('.modal__box--gallery')) return document.removeEventListener('keydown', key); if (e.key === 'ArrowLeft') { idx = (idx - 1 + E.styles.length) % E.styles.length; open(); } if (e.key === 'ArrowRight') { idx = (idx + 1) % E.styles.length; open(); } };
    document.addEventListener('keydown', key);
  }
  function bindCalc() {
    const i = inp();
    const recLocked = !!(activeEstimateRecord() && window.RCProjectCalcs?.recordEditBlocked?.(activeEstimateRecord()));
    if (recLocked) {
      cancelAutoAdvance();
      qsa('#calc-body button, #calc-body input, #calc-body select, .q__foot-actions button').forEach((el) => {
        el.disabled = true;
        if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'number')) {
          el.readOnly = true;
          el.setAttribute('aria-readonly', 'true');
        }
      });
    }
    qsa('#app [data-act]').forEach((el) => el.onclick = () => {
      if (recLocked) return;
      const [k, v] = el.dataset.act.split(':');
      if (k === 'type') return set({ objectType: v, ...(v === 'yard' ? { scope: 'full', roomType: null, shell: null } : {}), ...(v !== 'house-new' ? { shell: null } : {}), ...(!['house-new', 'house-renovation', 'yard'].includes(v) ? { yard: [] } : {}) }, true);
      if (k === 'shell') return set({ shell: v }, true);
      if (k === 'yard') return set({ yard: i.yard.includes(v) ? i.yard.filter((o) => o !== v) : [...i.yard, v] });
      if (k === 'plot') return set({ plot: +v }, true);
      if (k === 'city') {
        if (v === L.CUSTOM) return set({ city: L.CUSTOM, localityName: i.localityName || '', localityRegion: i.localityRegion || '' }, false);
        return set({ city: v, localityName: '', localityRegion: '' }, true);
      }
      if (k === 'scope') return set({ scope: v, roomType: v === 'full' ? null : i.roomType, rooms: v === 'room' ? 1 : (i.rooms || 2) }, true);
      if (k === 'room') return set({ roomType: v }, true);
      if (k === 'area') return set({ area: +v }, true);
      if (k === 'rooms') { if (+v === 5 && i.rooms < 5) return set({ rooms: 5 }); return set({ rooms: +v }, +v < 5); }
      if (k === 'stage') return set({ stage: v }, true);
      if (k === 'segment') return set({ segment: v }, true);
      if (k === 'style') return set({ style: i.style === v ? null : v });
      if (k === 'stylezoom') return styleGallery(v);
      if (k === 'opt') return set({ options: i.options.includes(v) ? i.options.filter((o) => o !== v) : [...i.options, v] });
      if (k === 'opts') return set({ options: v === 'all' ? E.options.map((o) => o.id) : [] });
      if (k === 'furn') return set({ furniture: v }, true);
      if (k === 'appl') return set({ appliance: v }, true);
      if (k === 'prev') {
        cancelAutoAdvance();
        if (state.calcStep > 1) {
          state.calcStep--;
          if (window.RCProjectCalcs) {
            window.RCProjectCalcs.autosaveEstimate(
              { ...state.estimateInput },
              { path: '#/calc', calcStep: state.calcStep },
            );
          }
          renderTop();
        }
        return;
      }
      if (k === 'skip') { const q = visible()[qIndex()]; if (q.id === 'style') i.style = null; if (q.id === 'options') i.options = []; if (q.id === 'furn') i.furniture = 'none'; if (q.id === 'appl') i.appliance = 'none'; if (q.key === 'yard') i.yard = []; return next(); }
      if (k === 'next') { const q = visible()[qIndex()]; if (!q.valid(inp())) return; return next(); }
    });
    const area = qs('#area');
    if (area) {
      if (recLocked) area.disabled = true;
      area.oninput = () => {
        if (recLocked) return;
        const raw = area.value;
        let parsed = '';
        if (raw.trim() !== '') {
          const v = parseFloat(raw.replace(',', '.'));
          parsed = Number.isFinite(v) ? v : '';
        }
        state.estimateInput.area = parsed;
        if (window.RCProjectCalcs) {
          state.calcViewFrozen = false;
          window.RCProjectCalcs.autosaveEstimate(
            { area: parsed },
            { path: '#/calc', calcStep: state.calcStep },
          );
        }
        const n = qs('[data-act="next"]');
        const areaNum = typeof parsed === 'number' ? parsed : NaN;
        if (n) n.disabled = !(areaNum >= 10);
        qsa('[data-act^="area:"]').forEach((c) => c.classList.toggle('is-on', Number.isFinite(areaNum) && +c.dataset.act.split(':')[1] === areaNum));
      };
      area.onkeydown = (e) => { if (recLocked) return; if (e.key === 'Enter' && state.estimateInput.area >= 10) next(); };
      setTimeout(() => area.focus({ preventScroll: true }), 50);
    }
    const plot = qs('#plot');
    if (plot) {
      if (recLocked) plot.disabled = true;
      plot.oninput = () => {
        if (recLocked) return;
        const raw = plot.value;
        let parsed = '';
        if (raw.trim() !== '') {
          const v = parseFloat(raw.replace(',', '.'));
          parsed = Number.isFinite(v) ? v : '';
        }
        state.estimateInput.plot = parsed;
        if (window.RCProjectCalcs) {
          state.calcViewFrozen = false;
          window.RCProjectCalcs.autosaveEstimate(
            { plot: parsed },
            { path: '#/calc', calcStep: state.calcStep },
          );
        }
        const n = qs('[data-act="next"]');
        const plotNum = typeof parsed === 'number' ? parsed : NaN;
        if (n) n.disabled = !(plotNum >= 1);
        qsa('[data-act^="plot:"]').forEach((c) => c.classList.toggle('is-on', Number.isFinite(plotNum) && +c.dataset.act.split(':')[1] === plotNum));
      };
      plot.onkeydown = (e) => { if (recLocked) return; if (e.key === 'Enter' && state.estimateInput.plot >= 1) next(); };
      setTimeout(() => plot.focus({ preventScroll: true }), 50);
    }
    const rooms = qs('#rooms');
    if (rooms) {
      if (recLocked) rooms.disabled = true;
      rooms.oninput = () => {
        if (recLocked) return;
      const v = parseInt(rooms.value, 10);
      state.estimateInput.rooms = v >= 1 ? v : 0;
      if (window.RCProjectCalcs) {
        state.calcViewFrozen = false;
        window.RCProjectCalcs.autosaveEstimate(
          { rooms: state.estimateInput.rooms },
          { path: '#/calc', calcStep: state.calcStep },
        );
      }
      const n = qs('[data-act="next"]');
      if (n) n.disabled = !(v >= 1);
      };
    }
    if (rooms && !qs('[data-act="next"]')) {
      const foot = qs('.q__foot-actions') || qs('.q__foot .row');
      if (foot) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn--primary';
        b.dataset.act = 'next';
        b.innerHTML = `Далее ${icon('arrow-right')}`;
        b.disabled = recLocked || !(state.estimateInput.rooms >= 1);
        b.onclick = () => { if (recLocked) return; if (state.estimateInput.rooms >= 1) next(); };
        foot.appendChild(b);
      }
    }
    const locName = qs('#loc-name');
    if (locName) {
      if (recLocked) {
        locName.readOnly = true;
        locName.setAttribute('aria-readonly', 'true');
      }
      const syncLocality = () => {
        if (recLocked) return;
        const regionEl = qs('#loc-region');
        const vn = L.validateName(locName.value);
        const vr = L.validateRegion(regionEl ? regionEl.value : '');
        state.estimateInput.localityName = locName.value;
        state.estimateInput.localityRegion = regionEl ? regionEl.value : '';
        if (window.RCProjectCalcs) {
          state.calcViewFrozen = false;
          window.RCProjectCalcs.autosaveEstimate(
            { localityName: state.estimateInput.localityName, localityRegion: state.estimateInput.localityRegion },
            { path: '#/calc', calcStep: state.calcStep },
          );
        }
        const ok = L.cityStepValid(state.estimateInput, E.cities);
        const n = qs('[data-act="next"]');
        if (n) n.disabled = !ok;
        const err = qs('#loc-err');
        if (err) {
          const msg = !vn.ok ? vn.msg : !vr.ok ? vr.msg : '';
          err.textContent = msg;
          err.classList.toggle('hide', !msg);
        }
      };
      locName.oninput = syncLocality;
      locName.onkeydown = (e) => {
        if (recLocked) return;
        if (e.key === 'Enter' && L.cityStepValid(state.estimateInput, E.cities)) next();
      };
      const locRegion = qs('#loc-region');
      if (locRegion) {
        if (recLocked) {
          locRegion.readOnly = true;
          locRegion.setAttribute('aria-readonly', 'true');
        }
        locRegion.oninput = syncLocality;
        locRegion.onkeydown = (e) => {
          if (recLocked) return;
          if (e.key === 'Enter' && L.cityStepValid(state.estimateInput, E.cities)) next();
        };
      }
      setTimeout(() => locName.focus({ preventScroll: true }), 50);
      syncLocality();
    }
  }

  // ---------- Страница результата ----------
  const ui = { breakdown: true, compare: false, fin: 24 };
  function estimateResultRouteStale(rec) {
    if (!rec || rec.dataTypedInvalid) return false;
    if (state._restoredEstimateRecord !== rec.id) return true;
    const wantsResult = !!(rec.resultSnapshot && rec.incomplete === false);
    if (wantsResult) return !state.estimate;
    return false;
  }

  function comparisonDelta(row, selected) {
    if (!selected || !Number.isFinite(selected.total) || selected.total <= 0 || !Number.isFinite(row.total)) {
      return '<small class="est-compare__delta">Нет базы сравнения</small>';
    }
    if (row.id === selected.id) return '<small class="est-compare__delta">База сравнения · 0 %</small>';
    const percent = (row.total - selected.total) / selected.total * 100;
    if (percent === 0) return '<small class="est-compare__delta">Та же стоимость · 0 %</small>';
    const value = Math.abs(percent) < 0.1 ? '&lt;0,1' : Math.abs(percent).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
    return `<small class="est-compare__delta ${percent < 0 ? 'est-compare__delta--saving' : 'est-compare__delta--extra'}">${percent < 0 ? 'Экономия' : 'Дороже на'} ${value} %</small>`;
  }
  function pageEstimate(params = {}) {
    let estRec = null;
    if (window.RCProjectCalcs) {
      const rid = window.RCProjectCalcs.resolveEstimateRecordId
        ? window.RCProjectCalcs.resolveEstimateRecordId(params)
        : (params.record || null);
      if (rid) {
        estRec = window.RCProjectCalcs.findRecord(rid);
      } else if (params.record) {
        const cand = window.RCProjectCalcs.findRecord(params.record);
        if (cand && cand.calcType === 'estimate-total') estRec = cand;
      }
      if (estRec && estRec.calcType === 'estimate-total' && estimateResultRouteStale(estRec)) {
        window.RCProjectCalcs.restoreEstimateRoute(estRec);
        state._restoredEstimateRecord = estRec.id;
      }
      if (estRec && estRec.calcType === 'estimate-total' && !estRec.incomplete && estRec.resultSnapshot
        && state.estimate && !window.RCProjectCalcs.readCalcHistoryRecordId?.()) {
        window.RCProjectCalcs.stampCurrentHistoryRecord?.(estRec.id);
      }
    }
    if (estRec?.dataTypedInvalid) {
      const wrongType = window.RCProjectCalcs?.wrongTypeRecordParam?.('estimate-total', params)
        ? `<div class="notice notice--amber" data-testid="calc-record-wrong-type" style="margin-bottom:1rem">${icon('info')}<span>Ссылка указывает на расчёт другого типа.</span></div>`
        : '';
      return `<section class="section"><div class="wrap calc">${wrongType}<div class="notice notice--amber" data-testid="calc-record-unusable" style="margin-bottom:1rem">${icon('info')}<span>Сохранённые данные этого расчёта повреждены — результат недоступен для просмотра и редактирования.</span></div><a class="btn btn--primary" href="#/calc">Вернуться в калькулятор</a></div></section>`;
    }
    const r = state.estimate;
    if (!r) return `<section class="section"><div class="wrap calc"><div class="empty"><h3>Расчёта пока нет</h3><p style="margin:.5rem 0 1rem">Ответьте на несколько коротких вопросов — и получите стоимость, срок и разбивку по этапам.</p><a class="btn btn--primary" href="#/calc">Открыть калькулятор</a></div></div></section>`;
    const i = r.input,
      type = by(E.objectTypes, i.objectType),
      seg = by(E.segments, i.segment),
      place = L.displayLabel(i, E.cities),
      yard = isYard(i),
      st = by(E.stages, i.stage);
    const room = i.scope === 'room' ? by(E.rooms, i.roomType) : null;
    const maxB = Math.max(...r.breakdown.map((b) => b.total));
    const unit = yard ? '₽/сотка' : '₽/м²';
    const comparisonBase = r.comparison.find((c) => c.id === i.segment);
    const placeHtml = L.isCustom(i) ? `<span class="locality-text">${esc(place)}</span>` : esc(place);
    const about = yard
      ? `${esc(type.full)} · ${fmt(r.plot)} ${plural(r.plot, 'сотка', 'сотки', 'соток')} · ${placeHtml} · уровень «${esc(seg.label)}»`
      : `${esc(type.full)}${room ? ` · ${esc(room.label)}` : ''} · ${fmt(i.area)} м² · ${i.rooms} ${plural(i.rooms, 'комната', 'комнаты', 'комнат')}${r.plot && r.yard ? ` · участок ${fmt(r.plot)} сот.` : ''} · ${placeHtml}${st ? ` · ${esc(st.label)}` : ''} · уровень «${esc(seg.label)}»`;
    const caveat = L.isCustom(i)
      ? `<div class="notice notice--amber locality-caveat" style="margin-top:.75rem" role="status">${esc(L.CAVEAT)}</div>`
      : '';
    const YARD2CALC = { fence: 'fence', paving: 'paving', lawn: 'landscaping', irrigation: 'irrigation', light: 'outlight', pool: 'pool', gazebo: 'gazebo', furniture: 'bbq' };
    const yardCard = r.yardRows && r.yardRows.length ? `<div class="card"><h4 style="margin-bottom:.75rem">Участок: что входит</h4><div class="rows">${r.yardRows.map((y) => `<div><span>${y.label}${y.kind ? ` <span class="xs muted">· ${y.kind}</span>` : ''}${YARD2CALC[y.id] ? ` <a class="xs muted" style="text-decoration:underline;text-underline-offset:3px" href="#/calc/materials/${YARD2CALC[y.id]}?seg=${(r.input && r.input.segment) || 'comfort'}">уточнить по параметрам</a>` : ''}<br><span class="xs muted">${y.unit === 'шт' || y.unit === 'компл.' ? money(y.price) : `${fmt(Math.round(y.qty))} ${y.unit === 'сотка' ? plural(Math.round(y.qty), 'сотка', 'сотки', 'соток') : y.unit} × ${fmt(y.price)} ₽`}</span></span><b>${money(y.total)}</b></div>`).join('')}</div></div>` : '';
    const frozenRec = estRec || (state.activeCalcRecordId && window.RCProjectCalcs ? window.RCProjectCalcs.findRecord(state.activeCalcRecordId) : null);
    const estParentOrphan = !!(estRec && window.RCProjectCalcs?.isOrphanProjectBinding?.(estRec));
    const estParentShared = !!(estRec && window.RCProjectCalcs?.isSharedProjectBinding?.(estRec));
    const estParentBanner = estParentOrphan
      ? `<div class="notice notice--amber" data-testid="calc-record-parent-unavailable" style="margin-bottom:1rem">${icon('info')}<span>Маршрут, к которому был привязан этот расчёт, сейчас недоступен — результат только для просмотра. Скопируйте или отвяжите расчёт в «Мои проекты».</span></div>`
      : (estParentShared
        ? `<div class="notice notice--amber" data-testid="calc-record-parent-readonly" style="margin-bottom:1rem">${icon('info')}<span>Расчёт привязан к общему маршруту — результат только для просмотра. Скопируйте расчёт, чтобы редактировать копию.</span></div>`
        : '');
    const frozenBanner = frozenRec && frozenRec.resultSnapshot
      ? `<div class="notice notice--grey" data-testid="calc-frozen-snapshot" style="margin-bottom:1rem">${icon('lock')}<span>Показан сохранённый снимок от ${new Date(frozenRec.savedAt).toLocaleString('ru-RU')} — суммы не пересчитываются автоматически.</span></div>`
      : '';
    return `<section class="section"><div class="wrap">
      ${estParentBanner}
      ${frozenBanner}
      ${window.RCProjectCalcs ? window.RCProjectCalcs.libraryLink('calc-library-link') : ''}
      <div class="steps"><div><span class="eyebrow eyebrow--red">Калькулятор</span><h2 style="margin-top:.35rem">Ваш расчёт готов</h2>
        <p class="estimate-about" style="margin-top:.4rem">${about}</p>${caveat}</div>
        <div class="row"><a class="btn btn--ghost btn--sm" href="${estParentOrphan ? '#/' : '#/calc?step=1'}" data-est-reedit${estParentOrphan ? ' aria-disabled="true" data-locked-parent="1"' : ''}>${icon('pencil')} Изменить</a><button class="btn btn--ghost btn--sm" id="share-est">${icon('share')} Поделиться</button></div></div>
      <div class="est-grid">
        <div class="stack" style="gap:1rem">
          <div class="kpis">
            <div class="kpi kpi--red"><span class="eyebrow">${yard ? 'Стоимость благоустройства' : r.shell ? 'Стройка и отделка' : 'Стоимость ремонта'}</span><b>${moneyShort(r.renovation)}</b><span>диапазон ${moneyShort(r.min)} – ${moneyShort(r.max)} · ${fmt(r.perM2)} ${unit}</span></div>
            <div class="kpi"><span class="eyebrow">Срок</span><b>${durationRange(r.dmin, r.dmax)}</b><span>${r.dmin}–${r.dmax} дней при непрерывной работе</span></div>
            ${yard ? `<div class="kpi"><span class="eyebrow">Работ на участке</span><b>${r.yardRows.length}</b><span>${fmt(r.plot * 100)} м² · забор, дорожки и газон — от площади</span></div>`
              : `<div class="kpi"><span class="eyebrow">Под ключ</span><b>${moneyShort(r.turnkey)}</b><span>ремонт + мебель + техника · ${fmt(r.turnkeyPerM2)} ₽/м²</span></div>`}
          </div>
          <div class="card"><div class="rows">
            <div><span>Работы</span><b>${money(r.works)}</b></div><div><span>Материалы</span><b>${money(r.materials)}</b></div>
            ${r.shell ? `<div><span>Коробка дома (входит в этапы фундамент, стены, кровля)</span><b>${money(r.shell)}</b></div>` : ''}
            ${r.yard && !yard ? `<div><span>Благоустройство участка (${r.yardRows.length})</span><b>${money(r.yard)}</b></div>` : ''}
            ${r.options ? `<div><span>Дополнительные работы (${i.options.length})</span><b>${money(r.options)}</b></div>` : ''}
            ${r.furniture ? `<div><span>Мебель — ${by(E.furniture, i.furniture).label}</span><b>${money(r.furniture)}</b></div>` : ''}
            ${r.appliance ? `<div><span>Техника — ${by(E.appliances, i.appliance).label}</span><b>${money(r.appliance)}</b></div>` : ''}
            <div><span>Рекомендуемый резерв ${E.reservePercent} %</span><b class="amber">+ ${money(r.reserve)}</b></div></div></div>
          <div class="card"><button class="toggle-head" id="tg-breakdown" aria-expanded="${ui.breakdown}">Разбивка по этапам маршрута (${r.breakdown.length}) ${icon('chevron-down')}</button>
            <div class="${ui.breakdown ? '' : 'hide'}" style="margin-top:1rem"><div class="bars">${r.breakdown.map((b) => `<div class="bar"><span class="bar__ico">${stageIcon(b.id)}</span><span>${b.title} <span class="xs muted">· ${b.days} дн.</span></span><span class="bar__track"><i style="width:${Math.max(3, b.total / maxB * 100)}%"></i></span><b>${moneyShort(b.total)} <span class="xs muted">${b.percent} %</span></b></div>`).join('')}</div>
            <p class="xs" style="margin-top:.75rem">${yard ? 'Работы 55 % / материалы 45 %.' : `Работы ${Math.round(seg.workShare * 100)} % / материалы ${Math.round((1 - seg.workShare) * 100)} % внутри каждого этапа.`} Этапы совпадают с навигатором — план по ним появится в разделе «Бюджет» маршрута.</p></div></div>
          ${yardCard}
          <div class="card"><button class="toggle-head" id="tg-compare" aria-expanded="${ui.compare}">${yard ? 'Сравнить уровни благоустройства' : 'Сравнить уровни ремонта'} ${icon('chevron-down')}</button>
            <div class="${ui.compare ? '' : 'hide'}" style="margin-top:1rem;overflow:auto"><p class="small est-compare__note">Разница относительно уровня «${esc(seg.label)}» при тех же параметрах. Сравниваем ${yard ? 'благоустройство' : 'ремонт, без отдельной стоимости мебели и техники'}.</p><table class="table" data-testid="estimate-level-comparison"><thead><tr><th>Уровень</th><th>${unit}</th><th>Срок</th><th>Стоимость</th></tr></thead><tbody>
            ${r.comparison.map((c) => `<tr class="${c.id === i.segment ? 'is-on' : ''}" data-testid="compare-level-${c.id}"><td><b>${esc(c.label)}</b> ${c.popular ? '<span class="pill pill--red">Популярный</span>' : ''}${c.id === i.segment ? '<span class="pill pill--dark">Выбран</span>' : ''}</td><td>${fmt(c.perM2)}</td><td>${duration(c.days)}</td><td><b>${moneyShort(c.total)}</b>${comparisonDelta(c, comparisonBase)}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="card"><h4 style="margin-bottom:.75rem">Рассрочка</h4><div class="row"><div class="seg">${r.finance.map((f) => `<button class="${ui.fin === f.m ? 'is-on' : ''}" data-fin="${f.m}">${f.m} мес</button>`).join('')}</div><b style="font-size:1.35rem;letter-spacing:-0.03em">${money(r.finance.find((f) => f.m === ui.fin).pay)} / мес</b></div>
            <p class="xs" style="margin-top:.6rem">Расчёт без учёта процентов. Точные условия — у банка-партнёра.</p><a class="link small" href="#/concierge" style="margin-top:.4rem">Получить консультацию по финансированию ${icon('arrow-right')}</a></div>
          <div class="grid2">
            <div class="card"><h4 style="margin-bottom:.75rem">Что повлияло на расчёт</h4><ul class="list">${r.factors.map((f) => `<li>${icon('trending-up')}<span>${esc(f)}</span></li>`).join('')}</ul></div>
            <div class="card"><h4 style="margin-bottom:.75rem">Не включено</h4><ul class="list list--x">${r.exclusions.map((f) => `<li>${icon('minus')}<span>${esc(f)}</span></li>`).join('')}</ul></div>
          </div>
        </div>
        <aside class="est-side">
          <div class="card card--red"><span class="eyebrow">Следующий шаг</span><h3 style="margin:.4rem 0 .5rem;color:#fff">${yard ? 'Проложить маршрут работ' : 'Проложить маршрут ремонта'}</h3><p class="small">Навигатор превратит расчёт в план: ${r.breakdown.length} ${plural(r.breakdown.length, 'этап', 'этапа', 'этапов')}, чек-листы, бюджет по этапам, поручения мастерам.</p>
            <button class="btn btn--light btn--block" id="to-nav" style="margin-top:1rem">${icon('route')} Открыть навигатор</button></div>
          <div class="path path--compact"><div class="path__head"><span class="eyebrow">${yard ? 'Путь работ' : 'Путь ремонта'}</span><h3>${r.breakdown.length} ${plural(r.breakdown.length, 'этап', 'этапа', 'этапов')} для вашего объекта</h3></div>
            <ol class="path__list">${r.breakdown.map((b, k) => `<li class="path__step"><a class="path__btn" href="#/navigator?stage=${b.id}"><span class="path__node">${stageIcon(b.id)}<b>${k + 1}</b></span><span class="path__text"><b>${b.title}</b><em>${moneyShort(b.total)} · ${b.days} дн.</em></span></a></li>`).join('')}</ol></div>
          <div class="card"><h4 style="margin-bottom:.5rem">Кто поможет</h4><p class="small">Подобрать мастеров и магазины под ваш маршрут — в каталоге.</p><a class="btn btn--ghost btn--block" href="#/catalog?kind=specialist" style="margin-top:.75rem">${icon('users')} Открыть каталог</a></div>
        </aside>
      </div></div></section>`;
  }
  function bindEstimate() {
    const reedit = qs('[data-est-reedit]');
    if (reedit) {
      reedit.onclick = (e) => {
        if (reedit.dataset.lockedParent) { e.preventDefault(); return; }
        state.calcViewFrozen = false;
      };
    }
    const t1 = qs('#tg-breakdown'); if (t1) t1.onclick = () => { ui.breakdown = !ui.breakdown; renderApp(); };
    const t2 = qs('#tg-compare'); if (t2) t2.onclick = () => { ui.compare = !ui.compare; renderApp(); };
    qsa('[data-fin]').forEach((b) => b.onclick = () => { ui.fin = +b.dataset.fin; renderApp(); });
    const s = qs('#share-est');
    if (s)
      s.onclick = () => {
        const r = state.estimate;
        const where = L.displayLabel(r.input, E.cities);
        const extra = L.isCustom(r.input) ? ` · ${L.CAVEAT}` : '';
        const txt = `RemCard (${where}): ${isYard(r.input) ? `участок ${fmt(r.plot)} сот.` : `ремонт ${fmt(r.input.area)} м²`} — ${moneyShort(r.min)} – ${moneyShort(r.max)}, срок ${duration(r.dmin)} – ${duration(r.dmax)}${extra}`;
        if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
        toast('Расчёт скопирован — можно отправить в мессенджер');
      };
    const n = qs('#to-nav'); if (n) n.onclick = () => window.RCNav.startFromEstimate(state.estimate);
  }

  route('/calc', pageCalc);
  route('/estimate', pageEstimate);
  document.addEventListener('rc:rendered', (e) => {
    if (e.detail.path !== '/calc') cancelAutoAdvance();
    if (e.detail.path === '/calc') bindCalc();
    if (e.detail.path === '/estimate') bindEstimate();
  });
  window.RCCalc = {
    calculateEstimate,
    forSegment,
    applicableL1,
    pricingLevel,
    durArea,
    by,
    yardCalc,
    shellCalc,
    freshEstimateInput,
    beginNewEstimateSession,
  };
  if (window.RC_TEST) {
    window.RCCalcInternals = {
      pageCalc, pageEstimate, bindCalc, visible, qIndex, inp, fn, finish, next, cancelAutoAdvance, calculateEstimate,
      freshEstimateInput, beginNewEstimateSession,
    };
  }
})();
