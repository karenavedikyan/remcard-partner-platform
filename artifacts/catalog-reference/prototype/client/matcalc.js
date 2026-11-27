/* Калькуляторы по отдельным материалам и работам: /calc/materials и /calc/materials/:id.
   Концепция с remcard.ru/calculators, расширенная: 20 калькуляторов, цены из каталога партнёров, сопутствующие материалы,
   запас, стоимость работ, выходы в список покупок, к мастеру и в бюджет маршрута. Нормы расхода — ориентировочные. */
(function () {
  const { esc, fmt, qs, qsa, go, icon, state, toast, route, renderApp, activeProject, uid, modal, modalHead, closeModal, plural } = window.RC;
  const pluralRu = plural || ((n, one, few, many) => { const a = Math.abs(n) % 100; const b = a % 10; if (a > 10 && a < 20) return many; if (b > 1 && b < 5) return few; if (b === 1) return one; return many; });
  const calcCountPhrase = (n) => `${n} ${pluralRu(n, 'расчёт', 'расчёта', 'расчётов')}`;
  const calcMatchesFilter = (c, q, forCat) => (!q || (c.title + ' ' + c.lead).toLowerCase().includes(q)) && (!forCat || c.cat === forCat);
  const rub = (n) => `${fmt(Math.round(n))} ₽`;
  const C = () => window.RCCatalogData;
  const r1 = (n) => Math.round(n * 10) / 10;
  const up = Math.ceil;

  const GROUPS = [['object', 'Объекты под ключ: двор и дом'], ['finish', 'Отделка'], ['rough', 'Черновые работы'], ['eng', 'Инженерия и свет'], ['build', 'Стройка и участок']];
  // Ценовые сегменты — те же, что в калькуляторе всего объекта. m — множитель к материалам, w — к работе (для калькуляторов без своих тарифов).
  const SEGS = [{ id: 'economy', label: 'Эконом', m: 0.72, w: 0.85 }, { id: 'comfort', label: 'Комфорт', m: 1, w: 1, popular: true }, { id: 'business', label: 'Бизнес', m: 1.65, w: 1.3 }, { id: 'premium', label: 'Премиум', m: 2.7, w: 1.75 }];
  const KIND_DEFAULT = { economy: 'базовые материалы, бригада без договора', comfort: 'материалы среднего класса, мастера с рейтингом', business: 'премиальные бренды, опытные бригады', premium: 'импортные и дизайнерские решения' };
  // f: [key, label, default, {type:'num'|'sel', min, step, unit, opts:[[v,label]]}]
  // compute(v) → { lines:[{k,n,qty,unit,price}], work:{n,qty,unit,price} | null, note }
  const CALCS = [
    { id: 'tile', title: 'Плитка и керамогранит', icon: 'grid-3x3', group: 'finish', cat: 'tiles', svc: 'tiler', stage: 'L1-9', lead: 'Плитка, клей, затирка и крестики — по площади и формату',
      fields: [['area', 'Площадь укладки', 12, { unit: 'м²', min: 1 }], ['size', 'Формат плитки', '60', { type: 'sel', opts: [['30', '30 × 30 см'], ['60', '60 × 60 см'], ['80', '80 × 80 см'], ['120', '20 × 120 см (под дерево)']] }], ['lay', 'Раскладка', 'straight', { type: 'sel', opts: [['straight', 'Прямая (+10 % запас)'], ['diag', 'По диагонали (+15 % запас)']] }]],
      compute: (v) => { const k = v.lay === 'diag' ? 1.15 : 1.1; const glue = { 30: 4, 60: 5, 80: 6, 120: 6 }[v.size]; return { lines: [{ k: 'main', n: 'Плитка', qty: r1(v.area * k), unit: 'м²', price: 1890 }, { k: 'glue', n: 'Клей плиточный, 25 кг', qty: up(v.area * glue / 25), unit: 'мешок', price: 690 }, { k: 'grout', n: 'Затирка, 2 кг', qty: up(v.area * 0.4 / 2), unit: 'уп', price: 520 }, { k: 'cross', n: 'Система выравнивания (СВП), 100 шт', qty: up(v.area / 6), unit: 'уп', price: 240 }], work: { n: 'Укладка плитки', qty: v.area, unit: 'м²', price: 1200 } }; } },
    { id: 'laminate', title: 'Ламинат и кварцвинил', icon: 'layers', group: 'finish', cat: 'flooring', svc: 'painter', stage: 'L1-9', lead: 'Упаковки с учётом раскладки, подложка и плинтус',
      fields: [['area', 'Площадь пола', 18, { unit: 'м²', min: 1 }], ['pack', 'В упаковке', '2.2', { type: 'sel', opts: [['1.8', '1,8 м²'], ['2.2', '2,2 м²'], ['2.6', '2,6 м²']] }], ['lay', 'Раскладка', 'straight', { type: 'sel', opts: [['straight', 'Прямая (+5 %)'], ['diag', 'Диагональ (+10 %)']] }], ['perim', 'Периметр комнаты', 17, { unit: 'м', min: 0 }]],
      compute: (v) => { const k = v.lay === 'diag' ? 1.1 : 1.05; return { lines: [{ k: 'main', n: 'Ламинат', qty: up(v.area * k / +v.pack), unit: 'уп', price: 2490, per: `${v.pack} м²` }, { k: 'under', n: 'Подложка, рулон 10 м²', qty: up(v.area / 10), unit: 'рулон', price: 650 }, { k: 'plinth', n: 'Плинтус, 2,5 м', qty: up((v.perim - 0.9) / 2.5), unit: 'шт', price: 390 }, { k: 'film', n: 'Плёнка пароизоляции', qty: up(v.area * 1.1), unit: 'м²', price: 25 }], work: { n: 'Укладка ламината', qty: v.area, unit: 'м²', price: 400 } }; } },
    { id: 'wallpaper', title: 'Обои', icon: 'images', group: 'finish', cat: 'paint', svc: 'painter', stage: 'L1-9', lead: 'Рулоны с учётом раппорта и проёмов, клей',
      fields: [['perim', 'Периметр стен', 17, { unit: 'м', min: 1 }], ['h', 'Высота потолка', 2.7, { unit: 'м', min: 2, step: 0.05 }], ['open', 'Окна и двери', 4, { unit: 'м²', min: 0 }], ['roll', 'Рулон', '1.06x10', { type: 'sel', opts: [['0.53x10', '0,53 × 10,05 м'], ['1.06x10', '1,06 × 10,05 м'], ['1.06x25', '1,06 × 25 м']] }], ['rap', 'Раппорт рисунка', '0', { type: 'sel', opts: [['0', 'Без подгонки'], ['32', '32 см'], ['64', '64 см']] }]],
      compute: (v) => { const [w, l] = v.roll.split('x').map(Number); const strip = v.h + 0.1 + (+v.rap / 100); const perRoll = Math.floor(l / strip); const strips = up((v.perim - v.open / v.h) / w); const rolls = up(strips / perRoll); return { lines: [{ k: 'main', n: 'Обои', qty: rolls, unit: 'рулон', price: 2900 }, { k: 'glue', n: 'Клей обойный, на 5 рулонов', qty: up(rolls / 5), unit: 'уп', price: 420 }, { k: 'primer', n: 'Грунтовка, 10 л', qty: up((v.perim * v.h - v.open) * 0.15 / 10), unit: 'канистра', price: 890 }], work: { n: 'Поклейка обоев', qty: r1(v.perim * v.h - v.open), unit: 'м²', price: 350 }, note: `${strips} полос по ${r1(strip)} м, ${perRoll} полос из рулона` }; } },
    { id: 'paint', title: 'Краска', icon: 'paint-roller', group: 'finish', cat: 'paint', svc: 'painter', stage: 'L1-9', lead: 'Литры и вёдра по площади, слоям и укрывистости',
      fields: [['area', 'Площадь под покраску', 45, { unit: 'м²', min: 1 }], ['layers', 'Слоёв', '2', { type: 'sel', opts: [['2', '2 слоя'], ['3', '3 слоя (яркий цвет)']] }], ['cons', 'Расход краски', '0.12', { type: 'sel', opts: [['0.1', '0,10 л/м² — гладкие стены'], ['0.12', '0,12 л/м² — обычно'], ['0.16', '0,16 л/м² — фактура']] }], ['bucket', 'Ведро', '9', { type: 'sel', opts: [['2.5', '2,5 л'], ['5', '5 л'], ['9', '9 л']] }]],
      compute: (v) => { const liters = v.area * +v.layers * +v.cons * 1.1; return { lines: [{ k: 'main', n: 'Краска', qty: up(liters / +v.bucket), unit: `ведро ${v.bucket} л`, price: { 2.5: 1690, 5: 3100, 9: 5200 }[v.bucket] }, { k: 'primer', n: 'Грунтовка, 10 л', qty: up(v.area * 0.15 / 10), unit: 'канистра', price: 890 }, { k: 'tape', n: 'Малярный скотч и укрывная плёнка', qty: up(v.area / 30), unit: 'набор', price: 450 }, { k: 'roller', n: 'Валик, кювета, кисть', qty: 1, unit: 'набор', price: 780 }], work: { n: 'Покраска стен', qty: v.area, unit: 'м²', price: 250 }, note: `Нужно ≈ ${r1(liters)} л с запасом 10 %` }; } },
    { id: 'plaster', title: 'Штукатурка стен', icon: 'brick-wall', group: 'rough', cat: 'building', svc: 'plaster', stage: 'L1-8', lead: 'Мешки по площади и толщине слоя, маяки, грунт',
      fields: [['area', 'Площадь стен', 45, { unit: 'м²', min: 1 }], ['th', 'Средняя толщина', 15, { unit: 'мм', min: 5, step: 5 }], ['type', 'Смесь', 'gyps', { type: 'sel', opts: [['gyps', 'Гипсовая, 30 кг (8,5 кг/м² на 10 мм)'], ['cem', 'Цементная, 25 кг (17 кг/м² на 10 мм)']] }]],
      compute: (v) => { const g = v.type === 'gyps'; const kg = v.area * (g ? 8.5 : 17) * v.th / 10 * 1.1; return { lines: [{ k: 'main', n: g ? 'Штукатурка гипсовая, 30 кг' : 'Штукатурка цементная, 25 кг', qty: up(kg / (g ? 30 : 25)), unit: 'мешок', price: g ? 520 : 310 }, { k: 'beacon', n: 'Маяк 6 мм, 3 м', qty: up(v.area / 2.7 / 1.3), unit: 'шт', price: 65 }, { k: 'primer', n: 'Грунтовка, 10 л', qty: up(v.area * 0.15 / 10), unit: 'канистра', price: 890 }, { k: 'corner', n: 'Уголок перфорированный, 3 м', qty: up(v.area / 15), unit: 'шт', price: 90 }], work: { n: 'Штукатурка по маякам', qty: v.area, unit: 'м²', price: 600 }, note: `≈ ${fmt(Math.round(kg))} кг смеси` }; } },
    { id: 'screed', title: 'Стяжка пола', icon: 'square-dashed', group: 'rough', cat: 'building', svc: 'screed', stage: 'L1-8', lead: 'Пескобетон по площади и толщине, лента, плёнка',
      fields: [['area', 'Площадь пола', 40, { unit: 'м²', min: 1 }], ['th', 'Толщина стяжки', 50, { unit: 'мм', min: 30, step: 5 }], ['type', 'Способ', 'cps', { type: 'sel', opts: [['cps', 'Пескобетон М300, 40 кг'], ['semi', 'Полусухая (машинная подача)']] }]],
      compute: (v) => { const kg = v.area * 20 * v.th / 10 * 1.05; const semi = v.type === 'semi'; return { lines: semi ? [{ k: 'main', n: 'Полусухая стяжка под ключ (материал + работа)', qty: v.area, unit: 'м²', price: 350 + v.th * 9 }] : [{ k: 'main', n: 'Пескобетон М300, 40 кг', qty: up(kg / 40), unit: 'мешок', price: 290 }, { k: 'tape', n: 'Демпферная лента, 25 м', qty: up(Math.sqrt(v.area) * 4 / 25), unit: 'рулон', price: 380 }, { k: 'film', n: 'Плёнка 200 мкм', qty: up(v.area * 1.15), unit: 'м²', price: 30 }, { k: 'fiber', n: 'Фибра полипропиленовая, 0,9 кг/м³', qty: up(v.area * v.th / 1000 * 0.9), unit: 'кг', price: 320 }], work: semi ? null : { n: 'Стяжка пола', qty: v.area, unit: 'м²', price: 600 }, note: semi ? 'Цена за м² растёт с толщиной' : `≈ ${fmt(Math.round(kg))} кг, ${r1(v.area * v.th / 1000)} м³` }; } },
    { id: 'drywall', title: 'Гипсокартон', icon: 'layout-grid', group: 'rough', cat: 'building', svc: 'plaster', stage: 'L1-5', lead: 'Листы, профили, подвесы и крепёж на стену или потолок',
      fields: [['area', 'Площадь обшивки', 20, { unit: 'м²', min: 1 }], ['where', 'Где', 'wall', { type: 'sel', opts: [['wall', 'Стена или перегородка'], ['ceil', 'Потолок']] }], ['layers', 'Слоёв ГКЛ', '1', { type: 'sel', opts: [['1', '1 слой'], ['2', '2 слоя (звукоизоляция)']] }]],
      compute: (v) => { const c = v.where === 'ceil'; return { lines: [{ k: 'main', n: c ? 'ГКЛ 9,5 мм, 1200 × 2500' : 'ГКЛ 12,5 мм, 1200 × 2500', qty: up(v.area * +v.layers / 3 * 1.1), unit: 'лист', price: c ? 430 : 480 }, { k: 'pp', n: c ? 'Профиль ПП 60 × 27, 3 м' : 'Профиль ПС 50 × 50, 3 м', qty: up(v.area * (c ? 3 : 2) / 3), unit: 'шт', price: 240 }, { k: 'pn', n: c ? 'Профиль ПН 28 × 27, 3 м' : 'Профиль ПН 50 × 40, 3 м', qty: up(v.area * 0.8 / 3), unit: 'шт', price: 180 }, { k: 'hang', n: c ? 'Подвес прямой' : 'Подвес прямой', qty: up(v.area * (c ? 1.5 : 1)), unit: 'шт', price: 9 }, { k: 'screw', n: 'Саморезы ГКЛ 25 мм, 1000 шт', qty: up(v.area * +v.layers * 25 / 1000), unit: 'уп', price: 520 }, { k: 'putty', n: 'Шпаклёвка для швов и серпянка', qty: up(v.area / 20), unit: 'набор', price: 760 }], work: { n: c ? 'Потолок из ГКЛ' : 'Монтаж ГКЛ перегородки', qty: v.area, unit: 'м²', price: c ? 800 : 650 } }; } },
    { id: 'doors', title: 'Межкомнатные двери', icon: 'door-open', group: 'finish', cat: 'doors', svc: 'doors', stage: 'L1-10', lead: 'Полотна, коробки, наличники, доборы и фурнитура на все проёмы',
      fields: [['n', 'Проёмов', 4, { unit: 'шт', min: 1 }], ['thick', 'Толщина стены', '100', { type: 'sel', opts: [['75', 'до 75 мм — без добора'], ['100', '100 мм — добор 100'], ['150', '150 мм — добор 150'], ['200', 'от 200 мм — добор 200']] }], ['sides', 'Наличники', '2', { type: 'sel', opts: [['2', 'С двух сторон'], ['1', 'С одной стороны']] }]],
      compute: (v) => { const dob = v.thick !== '75'; return { lines: [{ k: 'main', n: 'Полотно', qty: v.n, unit: 'шт', price: 7440 }, { k: 'frame', n: 'Коробка, 2,5 шт на проём', qty: v.n * 2.5, unit: 'шт', price: 1190 }, { k: 'trim', n: 'Наличник, 2,2 м', qty: v.n * 2.5 * +v.sides, unit: 'шт', price: 690 }, ...(dob ? [{ k: 'dob', n: `Добор ${v.thick} мм`, qty: v.n * 2.5, unit: 'шт', price: { 100: 890, 150: 1090, 200: 1290 }[v.thick] }] : []), { k: 'hinge', n: 'Петли, 2 шт на дверь', qty: v.n * 2, unit: 'шт', price: 350 }, { k: 'lock', n: 'Ручка с защёлкой', qty: v.n, unit: 'компл', price: 1900 }, { k: 'foam', n: 'Пена монтажная', qty: up(v.n / 2), unit: 'балл', price: 520 }], work: { n: 'Установка двери', qty: v.n, unit: 'шт', price: 3000 } }; } },
    { id: 'baseboard', title: 'Плинтус', icon: 'ruler', group: 'finish', cat: 'flooring', svc: 'painter', stage: 'L1-9', lead: 'Штуки по периметру минус проёмы, углы и крепёж',
      fields: [['perim', 'Периметр помещений', 34, { unit: 'м', min: 1 }], ['doors', 'Дверных проёмов', 3, { unit: 'шт', min: 0 }], ['len', 'Длина планки', '2.5', { type: 'sel', opts: [['2', '2 м'], ['2.5', '2,5 м'], ['3', '3 м']] }]],
      compute: (v) => { const m = Math.max(0, v.perim - v.doors * 0.9) * 1.05; return { lines: [{ k: 'main', n: 'Плинтус', qty: up(m / +v.len), unit: 'шт', price: 390 }, { k: 'corner', n: 'Углы и соединители', qty: up(m / 3), unit: 'шт', price: 45 }, { k: 'fix', n: 'Клипсы или дюбели, 25 шт', qty: up(m / 0.5 / 25), unit: 'уп', price: 160 }], work: { n: 'Монтаж плинтуса', qty: r1(m), unit: 'м', price: 150 }, note: `≈ ${r1(m)} м с запасом 5 %` }; } },
    { id: 'lighting', title: 'Освещение', icon: 'lightbulb', group: 'eng', cat: 'lighting', svc: 'electric', stage: 'L1-10', lead: 'Сколько светильников и какой мощности для комнаты',
      fields: [['area', 'Площадь комнаты', 18, { unit: 'м²', min: 1 }], ['room', 'Назначение', '150', { type: 'sel', opts: [['150', 'Спальня, гостиная — 150 лк'], ['200', 'Детская, кабинет — 200 лк'], ['300', 'Кухня, ванная — 300 лк']] }], ['type', 'Светильники', 'spot', { type: 'sel', opts: [['spot', 'Точечные LED 7 Вт (600 лм)'], ['panel', 'Трековые 12 Вт (1100 лм)'], ['lustre', 'Люстра + бра']] }]],
      compute: (v) => { const lm = v.area * +v.room * 1.3; const per = { spot: 600, panel: 1100, lustre: 3600 }[v.type]; const n = Math.max(1, up(lm / per)); return { lines: [{ k: 'main', n: { spot: 'Светильник точечный LED', panel: 'Трековый светильник', lustre: 'Люстра' }[v.type], qty: n, unit: 'шт', price: { spot: 890, panel: 2400, lustre: 14900 }[v.type] }, ...(v.type === 'panel' ? [{ k: 'track', n: 'Шинопровод, 2 м', qty: up(n / 3), unit: 'шт', price: 1900 }] : []), ...(v.type === 'lustre' ? [{ k: 'bra', n: 'Бра', qty: 2, unit: 'шт', price: 3400 }] : []), { k: 'sw', n: 'Выключатель', qty: v.type === 'lustre' ? 2 : up(n / 6), unit: 'шт', price: 540 }], work: { n: 'Установка светильника', qty: n + (v.type === 'lustre' ? 2 : 0), unit: 'шт', price: 500 }, note: `Нужно ≈ ${fmt(Math.round(lm))} лм` }; } },
    { id: 'electrical', title: 'Электрика', icon: 'zap', group: 'eng', cat: 'electrical', svc: 'electric', stage: 'L1-7', lead: 'Кабель, точки, подрозетники и автоматы по площади квартиры',
      fields: [['area', 'Площадь квартиры', 60, { unit: 'м²', min: 10 }], ['rooms', 'Комнат (с кухней)', 3, { unit: 'шт', min: 1 }], ['level', 'Насыщенность', 'std', { type: 'sel', opts: [['min', 'Минимум — 1 точка на 2,5 м²'], ['std', 'Стандарт — 1 точка на 1,8 м²'], ['max', 'Умный дом — 1 точка на 1,2 м²']] }]],
      compute: (v) => { const pts = up(v.area / { min: 2.5, std: 1.8, max: 1.2 }[v.level]); return { lines: [{ k: 'cab25', n: 'Кабель ВВГнг-LS 3 × 2,5, бухта 100 м', qty: up(v.area * 5 / 100), unit: 'бухта', price: 9800 }, { k: 'cab15', n: 'Кабель ВВГнг-LS 3 × 1,5, бухта 100 м', qty: up(v.area * 3 / 100), unit: 'бухта', price: 6900 }, { k: 'box', n: 'Подрозетник', qty: pts, unit: 'шт', price: 25 }, { k: 'main', n: 'Розетки и выключатели (серия)', qty: pts, unit: 'шт', price: 540 }, { k: 'gofra', n: 'Гофра 20 мм, 100 м', qty: up(v.area * 7 / 100), unit: 'бухта', price: 1900 }, { k: 'panel', n: 'Щит на 24 модуля с автоматами и УЗО', qty: 1, unit: 'компл', price: 18500 + v.rooms * 1500 }], work: { n: 'Электромонтаж, точка', qty: pts, unit: 'точка', price: 500 }, note: `${pts} ${pts % 10 === 1 && pts % 100 !== 11 ? 'точка' : 'точек'}` }; } },
    { id: 'warmfloor', title: 'Тёплый пол', icon: 'thermometer', group: 'eng', cat: 'electrical', svc: 'electric', stage: 'L1-7', lead: 'Площадь обогрева без мебели, маты или кабель, терморегулятор',
      fields: [['area', 'Площадь комнаты', 8, { unit: 'м²', min: 1 }], ['free', 'Свободно от мебели', 70, { unit: '%', min: 30, max: 100, step: 5 }], ['type', 'Тип', 'mat', { type: 'sel', opts: [['mat', 'Нагревательный мат под плитку'], ['cable', 'Кабель в стяжку'], ['film', 'Плёночный под ламинат']] }]],
      compute: (v) => { const a = r1(v.area * v.free / 100); const price = { mat: 2200, cable: 1500, film: 1100 }[v.type]; return { lines: [{ k: 'main', n: { mat: 'Мат нагревательный 150 Вт/м²', cable: 'Кабель нагревательный 18 Вт/м', film: 'Плёнка инфракрасная' }[v.type], qty: a, unit: 'м²', price }, { k: 'therm', n: 'Терморегулятор с датчиком', qty: 1, unit: 'шт', price: 3900 }, ...(v.type === 'film' ? [{ k: 'sub', n: 'Подложка отражающая', qty: up(a * 1.1), unit: 'м²', price: 120 }] : [{ k: 'glue', n: v.type === 'mat' ? 'Клей для тёплого пола, 25 кг' : 'Пескобетон, 40 кг', qty: up(a / (v.type === 'mat' ? 4 : 1.2)), unit: 'мешок', price: v.type === 'mat' ? 790 : 290 }]), { k: 'tube', n: 'Гофра для датчика, 2 м', qty: 1, unit: 'шт', price: 150 }], work: { n: 'Монтаж тёплого пола', qty: a, unit: 'м²', price: 500 }, note: `Обогрев ${a} м², мощность ≈ ${Math.round(a * 150)} Вт` }; } },
    { id: 'debris', title: 'Вывоз мусора', icon: 'trash-2', group: 'rough', cat: 'building', svc: 'demolition', stage: 'L1-4', lead: 'Объём мусора после демонтажа, мешки и контейнеры',
      fields: [['area', 'Площадь объекта', 60, { unit: 'м²', min: 5 }], ['kind', 'Что демонтируем', 'cosm', { type: 'sel', opts: [['cosm', 'Косметика: обои, линолеум — 0,05 м³/м²'], ['full', 'Капитально: стяжка, плитка, штукатурка — 0,25 м³/м²'], ['walls', 'С перегородками — 0,4 м³/м²']] }]],
      compute: (v) => { const m3 = r1(v.area * { cosm: 0.05, full: 0.25, walls: 0.4 }[v.kind]); const cont = up(m3 / 8); return { lines: [{ k: 'bags', n: 'Мешки строительные 120 л', qty: up(m3 * 1000 / 120 / 0.7), unit: 'шт', price: 18 }, { k: 'main', n: 'Контейнер 8 м³ с вывозом', qty: cont, unit: 'шт', price: 8000 }, { k: 'film', n: 'Плёнка защитная', qty: up(v.area * 0.5), unit: 'м²', price: 25 }], work: { n: 'Спуск и погрузка мусора', qty: m3, unit: 'м³', price: 900 }, note: `≈ ${m3} м³ мусора` }; } },
    { id: 'brick', title: 'Кирпич и газоблок', icon: 'brick-wall', group: 'build', cat: 'brick', svc: 'plaster', stage: 'L1-5', lead: 'Штуки и поддоны по площади стены, раствор или клей',
      fields: [['area', 'Площадь стен без проёмов', 60, { unit: 'м²', min: 1 }], ['type', 'Материал', 'gas300', { type: 'sel', opts: [['brick05', 'Кирпич, кладка в полкирпича (51 шт/м²)'], ['brick1', 'Кирпич, кладка в кирпич (102 шт/м²)'], ['gas200', 'Газоблок 600 × 200 × 250 — перегородка'], ['gas300', 'Газоблок 600 × 300 × 250 — несущая'], ['gas400', 'Газоблок 600 × 400 × 250']] }]],
      compute: (v) => { const br = v.type.startsWith('brick'); const perM2 = { brick05: 51, brick1: 102, gas200: 6.67, gas300: 6.67, gas400: 6.67 }[v.type]; const n = up(v.area * perM2 * 1.05); const th = { gas200: 0.2, gas300: 0.3, gas400: 0.4 }[v.type]; return { lines: [{ k: 'main', n: br ? 'Кирпич керамический' : `Газоблок D500 ${v.type.slice(3)} мм`, qty: n, unit: 'шт', price: br ? 18 : { gas200: 165, gas300: 240, gas400: 320 }[v.type], per: br ? `${up(n / 400)} поддонов` : `${r1(n * 0.6 * 0.25 * th)} м³, ${up(n * 0.6 * 0.25 * th / 1.8)} поддонов` }, br ? { k: 'mortar', n: 'Смесь кладочная, 25 кг', qty: up(v.area * (v.type === 'brick1' ? 28 : 14) / 25 * 1.1), unit: 'мешок', price: 240 } : { k: 'glue', n: 'Клей для газоблока, 25 кг', qty: up(n * 0.15 * th), unit: 'мешок', price: 340 }, { k: 'mesh', n: 'Сетка кладочная или арматура ряда', qty: up(v.area / 4), unit: 'м', price: 60 }], work: { n: br ? 'Кладка кирпича' : 'Кладка газоблока', qty: v.area, unit: 'м²', price: br ? 1200 : 800 } }; } },
    { id: 'roofing', title: 'Кровля', icon: 'house', group: 'build', cat: 'roofing', svc: 'plaster', stage: 'L1-6', lead: 'Покрытие по площади скатов, плёнки, саморезы, конёк',
      fields: [['len', 'Длина ската', 10, { unit: 'м', min: 1 }], ['wid', 'Ширина ската', 6, { unit: 'м', min: 1 }], ['slopes', 'Скатов', '2', { type: 'sel', opts: [['1', '1'], ['2', '2'], ['4', '4 (вальма)']] }], ['mat', 'Материал', 'metal', { type: 'sel', opts: [['metal', 'Металлочерепица'], ['prof', 'Профнастил'], ['soft', 'Гибкая черепица']] }]],
      compute: (v) => { const area = v.len * v.wid * +v.slopes; const k = v.mat === 'soft' ? 1.08 : 1.15; return { lines: [{ k: 'main', n: { metal: 'Металлочерепица 0,5 мм', prof: 'Профнастил С-21', soft: 'Гибкая черепица' }[v.mat], qty: r1(area * k), unit: 'м²', price: { metal: 690, prof: 540, soft: 820 }[v.mat] }, ...(v.mat === 'soft' ? [{ k: 'osb', n: 'ОСП-3 12 мм, лист 1,25 × 2,5', qty: up(area / 3.1 * 1.1), unit: 'лист', price: 1450 }, { k: 'under', n: 'Подкладочный ковёр', qty: up(area * 1.1), unit: 'м²', price: 110 }] : [{ k: 'hydro', n: 'Гидроизоляционная мембрана, 75 м²', qty: up(area * 1.15 / 75), unit: 'рулон', price: 3900 }, { k: 'screw', n: 'Саморезы кровельные, 250 шт', qty: up(area * 8 / 250), unit: 'уп', price: 950 }]), { k: 'ridge', n: 'Конёк, 2 м', qty: up(v.len / 2 * (v.slopes === '4' ? 1.6 : 1)), unit: 'шт', price: 890 }, { k: 'lath', n: 'Обрешётка 25 × 100, доска', qty: up(area * 0.012), unit: 'м³', price: 14500 }], work: { n: 'Монтаж кровли', qty: r1(area), unit: 'м²', price: v.mat === 'soft' ? 900 : 650 }, note: `Площадь кровли ${r1(area)} м²` }; } },
    { id: 'paving', title: 'Тротуарная плитка', icon: 'footprints', group: 'build', cat: 'paving', svc: 'tiler', stage: 'L1-6', lead: 'Плитка, бордюр, песок и щебень под дорожку или площадку',
      fields: [['area', 'Площадь', 30, { unit: 'м²', min: 1 }], ['perim', 'Длина бордюра', 24, { unit: 'м', min: 0 }], ['base', 'Основание', 'walk', { type: 'sel', opts: [['walk', 'Пешеходная: щебень 10 см + песок 5 см'], ['car', 'Под авто: щебень 20 см + ЦПС 5 см']] }]],
      compute: (v) => { const car = v.base === 'car'; return { lines: [{ k: 'main', n: car ? 'Плитка тротуарная 60 мм' : 'Плитка тротуарная 40 мм', qty: r1(v.area * 1.07), unit: 'м²', price: car ? 1150 : 890 }, { k: 'curb', n: 'Бордюр садовый, 1 м', qty: up(v.perim * 1.03), unit: 'шт', price: 320 }, { k: 'gravel', n: 'Щебень фракция 20–40', qty: r1(v.area * (car ? 0.2 : 0.1) * 1.2), unit: 'м³', price: 2100 }, { k: 'sand', n: car ? 'ЦПС, 40 кг' : 'Песок', qty: car ? up(v.area * 0.05 * 1600 / 40) : r1(v.area * 0.05 * 1.2), unit: car ? 'мешок' : 'м³', price: car ? 260 : 1200 }, { k: 'geo', n: 'Геотекстиль', qty: up(v.area * 1.1), unit: 'м²', price: 45 }], work: { n: 'Укладка тротуарной плитки с основанием', qty: v.area, unit: 'м²', price: car ? 1500 : 1100 } }; } },
    { id: 'fence', title: 'Забор', icon: 'fence', group: 'build', cat: 'fence', svc: 'plaster', stage: 'L1-6', lead: 'Столбы, лаги, листы или штакетник по длине и высоте',
      fields: [['len', 'Длина забора', 40, { unit: 'м', min: 1 }], ['h', 'Высота', '2', { type: 'sel', opts: [['1.5', '1,5 м'], ['1.8', '1,8 м'], ['2', '2 м']] }], ['type', 'Тип', 'prof', { type: 'sel', opts: [['prof', 'Профнастил'], ['picket', 'Евроштакетник'], ['mesh', 'Сетка 3D']] }]],
      compute: (v) => { const posts = up(v.len / 2.5) + 1; const h = +v.h; return { lines: [{ k: 'post', n: 'Столб 60 × 60, ' + (h + 1.2) + ' м', qty: posts, unit: 'шт', price: 1350 }, { k: 'lag', n: 'Лага 40 × 20, 3 м', qty: up(v.len * (h >= 2 ? 3 : 2) / 3), unit: 'шт', price: 390 }, v.type === 'prof' ? { k: 'main', n: `Профлист С-8, ${h} м`, qty: up(v.len / 1.15 * 1.03), unit: 'лист', price: 1050 * h / 2 } : v.type === 'picket' ? { k: 'main', n: `Штакетник металлический, ${h} м`, qty: up(v.len / 0.17), unit: 'шт', price: 180 * h / 2 } : { k: 'main', n: `Секция 3D 2,5 × ${h} м`, qty: up(v.len / 2.5), unit: 'шт', price: 2900 }, { k: 'screw', n: 'Саморезы кровельные, 250 шт', qty: up(v.len * 10 / 250), unit: 'уп', price: 950 }, { k: 'concrete', n: 'Бетон для столбов (мешок 40 кг)', qty: posts * 2, unit: 'мешок', price: 290 }], work: { n: 'Монтаж забора', qty: v.len, unit: 'м', price: v.type === 'mesh' ? 900 : 1200 } }; } },
    { id: 'lawn', title: 'Газон', icon: 'sprout', group: 'build', cat: 'garden', svc: 'cleaning', stage: 'L1-6', lead: 'Рулоны или семена, грунт и удобрение по площади',
      fields: [['area', 'Площадь', 100, { unit: 'м²', min: 1 }], ['type', 'Тип', 'roll', { type: 'sel', opts: [['roll', 'Рулонный (0,8 м² рулон)'], ['seed', 'Посевной (40 г/м²)']] }], ['soil', 'Подсыпка грунта', 10, { unit: 'см', min: 0, step: 5 }]],
      compute: (v) => ({ lines: [v.type === 'roll' ? { k: 'main', n: 'Газон рулонный', qty: up(v.area / 0.8 * 1.05), unit: 'рулон', price: 190 } : { k: 'main', n: 'Семена газонные, 10 кг', qty: up(v.area * 0.04 / 10), unit: 'мешок', price: 3200 }, { k: 'soil', n: 'Грунт плодородный', qty: r1(v.area * v.soil / 100 * 1.2), unit: 'м³', price: 1500 }, { k: 'fert', n: 'Удобрение стартовое, 5 кг', qty: up(v.area / 200), unit: 'уп', price: 890 }, { k: 'drip', n: 'Автополив (ориентир)', qty: up(v.area / 100), unit: 'компл', price: 24000 }], work: { n: v.type === 'roll' ? 'Укладка рулонного газона' : 'Посев газона с подготовкой', qty: v.area, unit: 'м²', price: v.type === 'roll' ? 250 : 180 } }) },
    { id: 'insulation', title: 'Утепление', icon: 'layers', group: 'build', cat: 'facade', svc: 'plaster', stage: 'L1-6', lead: 'Упаковки утеплителя, мембрана и дюбели по площади и толщине',
      fields: [['area', 'Площадь', 80, { unit: 'м²', min: 1 }], ['th', 'Толщина', '100', { type: 'sel', opts: [['50', '50 мм'], ['100', '100 мм'], ['150', '150 мм']] }], ['mat', 'Материал', 'wool', { type: 'sel', opts: [['wool', 'Минвата фасадная'], ['eps', 'Пенополистирол ПСБ-С 25'], ['xps', 'XPS (цоколь, пол)']] }]],
      compute: (v) => { const th = +v.th / 1000; const m3 = v.area * th * 1.05; const perPack = { wool: 0.288, eps: 0.5, xps: 0.277 }[v.mat]; return { lines: [{ k: 'main', n: { wool: 'Минвата фасадная, уп', eps: 'Пенополистирол ПСБ-С 25, уп', xps: 'XPS, уп' }[v.mat], qty: up(m3 / perPack), unit: 'уп', price: { wool: 2100, eps: 1700, xps: 1950 }[v.mat] * (+v.th / 100 || 1), per: `${r1(m3)} м³` }, { k: 'dowel', n: 'Дюбель-гриб', qty: up(v.area * 6), unit: 'шт', price: 9 }, v.mat === 'wool' ? { k: 'membr', n: 'Ветрозащитная мембрана, 75 м²', qty: up(v.area * 1.15 / 75), unit: 'рулон', price: 4200 } : { k: 'glue', n: 'Клей для утеплителя, 25 кг', qty: up(v.area * 5 / 25), unit: 'мешок', price: 520 }, { k: 'mesh', n: 'Сетка фасадная 160 г, 50 м²', qty: up(v.area * 1.1 / 50), unit: 'рулон', price: 2300 }], work: { n: 'Утепление с армированием', qty: v.area, unit: 'м²', price: 900 } }; } },
    { id: 'concrete', title: 'Бетон и фундамент', icon: 'mountain', group: 'build', cat: 'bulk', svc: 'plaster', stage: 'L1-3', lead: 'Кубы бетона, миксеры, арматура и опалубка',
      fields: [['type', 'Конструкция', 'strip', { type: 'sel', opts: [['strip', 'Лента'], ['slab', 'Плита']] }], ['len', 'Длина ленты / плиты', 40, { unit: 'м', min: 1 }], ['wid', 'Ширина', 0.4, { unit: 'м', min: 0.1, step: 0.1 }], ['h', 'Высота / толщина', 0.8, { unit: 'м', min: 0.1, step: 0.1 }]],
      compute: (v) => { const m3 = r1(v.type === 'strip' ? v.len * v.wid * v.h * 1.05 : v.len * v.wid * v.h * 1.05); return { lines: [{ k: 'main', n: 'Бетон М300 (В22,5) с доставкой', qty: m3, unit: 'м³', price: 5900, per: `${up(m3 / 7)} миксеров по 7 м³` }, { k: 'rebar', n: 'Арматура А500 ⌀12', qty: up(m3 * (v.type === 'strip' ? 80 : 60)), unit: 'кг', price: 68 }, { k: 'form', n: 'Доска для опалубки 40 × 150', qty: r1((v.type === 'strip' ? v.len * 2 * v.h : (v.len + v.wid) * 2 * v.h) * 0.04 * 1.1), unit: 'м³', price: 14500 }, { k: 'sand', n: 'Песчаная подушка 20 см', qty: r1(v.len * v.wid * 0.2 * 1.3), unit: 'м³', price: 1200 }, { k: 'hydro', n: 'Гидроизоляция рулонная', qty: up((v.type === 'strip' ? v.len * (v.wid + 2 * v.h) : v.len * v.wid) * 1.1), unit: 'м²', price: 180 }], work: { n: 'Фундамент под ключ (работа)', qty: m3, unit: 'м³', price: 4500 }, note: `${m3} м³ бетона` }; } },
  ];
  CALCS.push(...(window.RCObjCalcs || []));
  const calc = (id) => CALCS.find((c) => c.id === id);
  const stageTitle = (id) => { const st = window.NAV && window.NAV.stagesL1.find((x) => x.id === id); return st ? st.title : ''; };
  const STAGES = () => { const order = window.NAV ? window.NAV.stagesL1.map((x) => x.id) : []; return [...new Set(CALCS.map((c) => c.stage))].sort((a, b) => order.indexOf(a) - order.indexOf(b)); };

  // Цена главной позиции — из каталога партнёров (если есть подходящие товары)
  function catalogOptions(c) { const d = C(); if (!d) return []; return d.products.filter((p) => p.cat === c.cat).slice(0, 8); }
  const ui = { v: {}, prices: {}, product: {}, work: {}, seg: 'comfort' };
  function values(c) { if (!ui.v[c.id]) ui.v[c.id] = Object.fromEntries(c.fields.map((f) => [f[0], f[2]])); return ui.v[c.id]; }
  function result(c, segId = ui.seg) {
    const seg = SEGS.find((x) => x.id === segId) || SEGS[1];
    const v = values(c); const res = c.compute(v, seg.id); const pr = ui.prices[c.id] || {};
    const prodId = ui.product[c.id]; const d = C(); const prod = prodId && d ? d.products.find((p) => p.id === prodId) : null;
    res.lines.forEach((l) => { if (!c.tiered) l.price = Math.round(l.price * seg.m); if (pr[l.k] != null) l.price = pr[l.k]; else if (l.k === 'main' && prod) l.price = prod.price; l.sum = l.qty * l.price; });
    if (res.work) { if (!c.tiered) res.work.price = Math.round(res.work.price * seg.w); if (pr.__work != null) res.work.price = pr.__work; res.work.sum = res.work.qty * res.work.price; }
    res.seg = seg; res.kind = (c.kinds || KIND_DEFAULT)[seg.id];
    res.mat = res.lines.reduce((s, l) => s + l.sum, 0); res.workOn = ui.work[c.id] !== false; res.total = res.mat + (res.work && res.workOn ? res.work.sum : 0);
    return res;
  }

  function card(c) { return `<a class="mc-card" href="#/calc/materials/${c.id}"><span class="mc-card__ico">${icon(c.icon)}</span><div><b>${esc(c.title)}</b><small>${esc(c.lead)}</small></div>${icon('chevron-right')}</a>`; }
  // Прототип: плитка «Двери» открывает новый калькулятор дверей и проёмов (door-calc/wizard.html); прежний расчёт остаётся по адресу #/calc/materials/doors.
  function tile(c) { const door = c.id === 'doors'; return `<a class="mc-tile" href="${door ? '../door-calc/wizard.html?ctx=site' : `#/calc/materials/${c.id}`}" title="${esc(c.lead)}"${door ? ' data-testid="calc-doors"' : ''}><span class="mc-card__ico">${icon(c.icon)}</span><b>${esc(door ? 'Двери и проёмы' : c.title)}</b></a>`; }
  function modeSwitch(mode) { return `<div class="seg mc-mode"><a class="${mode === 'all' ? 'is-on' : ''}" href="#/calc">${icon('home')} Весь ремонт</a><a class="${mode === 'one' ? 'is-on' : ''}" href="#/calc/materials">${icon('calculator')} Отдельный расчёт <span class="mc-mode__n">${CALCS.length}</span></a></div>${mode === 'all' ? `<p class="xs muted mc-mode__hint">Отдельный расчёт — ${window.RC_R(2) ? 'плитка, стяжка, бассейн, навес, обои' : 'плитка, стяжка, ламинат, обои, краска'} и ещё ${CALCS.length - 5} калькуляторов по товарам и услугам</p>` : ''}`; }
  function materialsIndexHref(params, { stage, q: qRaw } = {}) {
    const parts = [];
    const qVal = qRaw !== undefined ? String(qRaw).trim() : String(params.q || '').trim();
    if (qVal) parts.push(`q=${encodeURIComponent(qVal)}`);
    if (params.for) parts.push(`for=${encodeURIComponent(params.for)}`);
    const st = stage !== undefined ? stage : (params.stage || '');
    if (st) parts.push(`stage=${encodeURIComponent(st)}`);
    return `#/calc/materials${parts.length ? `?${parts.join('&')}` : ''}`;
  }
  function beginNewMaterialSession() {
    ui.v = {};
    ui.prices = {};
    ui.product = {};
    ui.work = {};
    ui.seg = 'comfort';
    state.calcViewFrozen = false;
  }

  function materialRecordFor(c, params) {
    if (!window.RCProjectCalcs) return null;
    const want = `material-${c.id}`;
    const routeParams = params || (window.RC?.parseHash?.().params) || {};
    if (window.RCProjectCalcs.resolveMaterialRecordId) {
      const rid = window.RCProjectCalcs.resolveMaterialRecordId(c.id, routeParams);
      if (rid) {
        const rec = window.RCProjectCalcs.findRecord(rid);
        if (rec && rec.calcType === want) {
          window.RCProjectCalcs.reconcileAbandonedNewSession?.(routeParams, want);
          return rec;
        }
      }
    }
    if (window.RCProjectCalcs.isForceNewCalcType && window.RCProjectCalcs.isForceNewCalcType(want)) return null;
    const id = window.RCProjectCalcs.activeIdForType(want);
    if (!id) return null;
    const rec = window.RCProjectCalcs.findRecord(id);
    if (!rec || rec.calcType !== want) return null;
    return rec;
  }

  function snapshotResult(c, rec) {
    const matRec = rec && rec.calcType === `material-${c.id}` ? rec : materialRecordFor(c);
    const snap = matRec && matRec.resultSnapshot;
    if (state.calcViewFrozen && matRec && matRec.calcType === `material-${c.id}` && snap && Array.isArray(snap.lines)) return snap;
    return result(c);
  }

  function escMcInputValue(v) {
    if (v === '' || v == null) return '';
    if (typeof v === 'object') return '';
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return '';
    const s = String(v).trim();
    const n = parseFloat(s.replace(',', '.'));
    if (Number.isFinite(n)) return String(n);
    return '';
  }

  function parseMcField(i) {
    if (i.tagName === 'SELECT') return i.value;
    const raw = i.value;
    if (raw === '' || (typeof raw === 'string' && raw.trim() === '')) return '';
    const v = parseFloat(String(raw).replace(',', '.'));
    return Number.isFinite(v) ? v : '';
  }

  function materialComputeReady(calcId, vals) {
    const c = calc(calcId);
    if (!c) return false;
    return c.fields.every((f) => {
      const val = vals[f[0]];
      const o = f[3] || {};
      if (val === '' || val === null || val === undefined) return false;
      if (o.type === 'sel') {
        return (o.opts || []).some(([optVal]) => String(optVal) === String(val));
      }
      const n = +val;
      const min = o.min ?? 0;
      return Number.isFinite(n) && n >= min;
    });
  }

  function sanitizeMaterialInputs(calcId, inputs) {
    const c = calc(calcId);
    if (!c) return {};
    const defaults = Object.fromEntries(c.fields.map((f) => [f[0], f[2]]));
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return { ...defaults };
    const out = { ...defaults };
    for (const f of c.fields) {
      const key = f[0];
      if (!(key in inputs)) continue;
      const raw = inputs[key];
      const o = f[3] || {};
      if (raw === '' || raw === null) {
        out[key] = '';
        continue;
      }
      if (o.type === 'sel') {
        const s = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
        out[key] = (o.opts || []).some(([opt]) => String(opt) === s) ? s : defaults[key];
      } else if (typeof raw === 'number' && Number.isFinite(raw)) {
        out[key] = raw;
      } else if (typeof raw === 'string' && raw.trim() !== '') {
        const n = parseFloat(raw.replace(',', '.'));
        out[key] = Number.isFinite(n) ? n : defaults[key];
      }
    }
    return out;
  }

  function isPrimNum(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function safeFiniteNumber(v, fallback) {
    if (isPrimNum(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v.replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }

  function validateMaterialInputsTyped(calcId, inputs) {
    const c = calc(calcId);
    if (!c) return { valid: false, reason: 'calcType' };
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return { valid: false, reason: 'inputs' };
    for (const f of c.fields) {
      const key = f[0];
      if (!(key in inputs)) continue;
      const raw = inputs[key];
      if (raw === '' || raw === null) continue;
      const o = f[3] || {};
      if (o.type === 'sel') {
        if (typeof raw !== 'string' && typeof raw !== 'number') return { valid: false, reason: `inputs.${key}` };
        const s = String(raw);
        if (!(o.opts || []).some(([opt]) => String(opt) === s)) return { valid: false, reason: `inputs.${key}` };
      } else if (isPrimNum(raw)) {
        continue;
      } else if (typeof raw === 'string') {
        if (raw.trim() === '') continue;
        const n = parseFloat(raw.replace(',', '.'));
        if (!isPrimNum(n)) return { valid: false, reason: `inputs.${key}` };
      } else {
        return { valid: false, reason: `inputs.${key}` };
      }
    }
    return { valid: true };
  }

  function validateMaterialSnapshotTyped(snap) {
    if (snap == null) return true;
    if (typeof snap !== 'object' || Array.isArray(snap)) return false;
    if (!Array.isArray(snap.lines)) return false;
    if (snap.total != null && !isPrimNum(snap.total)) return false;
    if (snap.mat != null && !isPrimNum(snap.mat)) return false;
    if (snap.work != null) {
      if (typeof snap.work !== 'object') return false;
      if (snap.work.price != null && !isPrimNum(snap.work.price)) return false;
      if (snap.work.qty != null && !isPrimNum(snap.work.qty)) return false;
      if (snap.work.sum != null && !isPrimNum(snap.work.sum)) return false;
    }
    for (const l of snap.lines) {
      if (!l || typeof l !== 'object') return false;
      if (l.k != null && typeof l.k !== 'string') return false;
      if (l.price != null && !isPrimNum(l.price)) return false;
      if (l.qty != null && !isPrimNum(l.qty)) return false;
      if (l.sum != null && !isPrimNum(l.sum)) return false;
    }
    return true;
  }

  function validateStoredRecord(rec) {
    if (!rec || typeof rec.calcType !== 'string') return { valid: false, reason: 'calcType' };
    if (rec.calcType.startsWith('material-')) {
      const id = rec.calcType.replace(/^material-/, '');
      const vi = validateMaterialInputsTyped(id, rec.inputs);
      if (!vi.valid) return vi;
      if (rec.resultSnapshot && !validateMaterialSnapshotTyped(rec.resultSnapshot)) {
        return { valid: false, reason: 'resultSnapshot' };
      }
      return { valid: true };
    }
    return { valid: true };
  }

  function safeMcLineKey(k) {
    if (k === '__work') return '__work';
    if (typeof k === 'string' && /^[a-zA-Z0-9_]+$/.test(k)) return k;
    return 'line';
  }

  function normalizeSnapshotView(snap, live) {
    if (!validateMaterialSnapshotTyped(snap)) return null;
    if (!snap || typeof snap !== 'object' || Array.isArray(snap) || !Array.isArray(snap.lines)) return null;
    const lines = snap.lines.filter((l) => l && typeof l === 'object').map((l) => ({
      k: safeMcLineKey(l.k),
      n: typeof l.n === 'string' || typeof l.n === 'number' ? String(l.n) : '',
      qty: isPrimNum(l.qty) ? l.qty : 0,
      unit: typeof l.unit === 'string' ? l.unit : '',
      price: isPrimNum(l.price) ? l.price : 0,
      sum: isPrimNum(l.sum) ? l.sum : 0,
      per: l.per != null && (typeof l.per === 'string' || typeof l.per === 'number') ? String(l.per) : undefined,
    }));
    const segLabel = snap.seg && typeof snap.seg === 'object'
      ? (typeof snap.seg.label === 'string' || typeof snap.seg.label === 'number' ? String(snap.seg.label) : String(live.seg?.label || ''))
      : String(live.seg?.label || '');
    const seg = { ...(live.seg || {}), label: segLabel };
    const work = snap.work && typeof snap.work === 'object'
      ? {
        n: typeof snap.work.n === 'string' ? snap.work.n : (live.work?.n || ''),
        qty: isPrimNum(snap.work.qty) ? snap.work.qty : 0,
        unit: typeof snap.work.unit === 'string' ? snap.work.unit : '',
        price: isPrimNum(snap.work.price) ? snap.work.price : 0,
        sum: isPrimNum(snap.work.sum) ? snap.work.sum : 0,
      }
      : live.work;
    return {
      ...live,
      seg,
      lines,
      note: snap.note != null && (typeof snap.note === 'string' || typeof snap.note === 'number') ? String(snap.note) : live.note,
      mat: isPrimNum(snap.mat) ? snap.mat : 0,
      total: isPrimNum(snap.total) ? snap.total : 0,
      work,
      workOn: snap.workOn != null ? !!snap.workOn : live.workOn,
    };
  }

  function restoreRecord(rec) {
    const id = rec.calcType.replace(/^material-/, '');
    const c = calc(id);
    if (!c) return;
    if (rec.dataTypedInvalid) {
      state.calcViewFrozen = false;
      return;
    }
    ui.v[c.id] = sanitizeMaterialInputs(id, rec.inputs);
    if (rec.meta) {
      ui.prices[c.id] = { ...(rec.meta.prices || {}) };
      ui.work[c.id] = rec.meta.work !== undefined ? rec.meta.work : true;
      ui.product[c.id] = rec.meta.product || '';
      if (rec.meta.seg) ui.seg = rec.meta.seg;
    }
    if (window.RCProjectCalcs && window.RCProjectCalcs.setActiveForType) {
      window.RCProjectCalcs.setActiveForType(rec, { skipHistoryTouch: true });
    }
    else state.activeCalcRecordId = rec.id;
    state.calcViewFrozen = !rec.incomplete && validateMaterialSnapshotTyped(rec.resultSnapshot);
  }

  function pageIndex(params) {
    const q = (params.q || '').toLowerCase().trim(); const forCat = params.for || ''; const st = params.stage || '';
    const list = CALCS.filter((c) => calcMatchesFilter(c, q, forCat) && (!st || c.stage === st));
    const link = (stageId) => materialsIndexHref(params, { stage: stageId === '' ? '' : stageId });
    const cnt = (id) => CALCS.filter((c) => c.stage === id && calcMatchesFilter(c, q, forCat)).length;
    const allCnt = () => CALCS.filter((c) => calcMatchesFilter(c, q, forCat)).length;
    const countBit = (n) => `<span class="mc-stage__count"> · ${esc(calcCountPhrase(n))}</span>`;
    const strip = `<div class="mc-stages mc-stages--route" aria-label="Этапы ремонта"><a class="mc-stage ${!st ? 'is-on' : ''}" href="${link('')}">${icon('layers')}<span class="mc-stage__label">Все этапы</span>${countBit(allCnt())}</a>${STAGES().map((id) => `<a class="mc-stage ${st === id ? 'is-on' : ''}" href="${link(id)}"><span class="mc-stage__label">${esc(stageTitle(id))}</span>${countBit(cnt(id))}</a>`).join('')}</div>`;
    return `<section class="section--tight"><div class="wrap mc-wrap">
      ${modeSwitch('one')}
      ${window.RCProjectCalcs ? window.RCProjectCalcs.libraryLink('calc-library-link') : ''}
      <h1 class="mc-h1" style="margin-top:1rem">Что считаем?</h1>
      <p class="lead" style="margin:.3rem 0 1rem">Размеры ваши, цены партнёров RemCard.</p>
      <div class="search mc-search">${icon('search')}<input id="mc-q" placeholder="${window.RC_R(2) ? 'Бассейн, навес, плитка, обои…' : 'Плитка, ламинат, обои, краска…'}" value="${esc(params.q || '')}"></div>
      ${strip}
      ${forCat && !list.length ? `<div class="empty"><h3>Для этой категории калькулятора пока нет</h3><a class="link" href="#/calc/materials">Показать все</a></div>` : ''}
      ${GROUPS.map(([g, t]) => { const items = list.filter((c) => c.group === g); return items.length ? `<div class="mc-group"><h3>${t}${g === 'object' ? ' ' + window.RC.rel2() : ''}</h3><div class="mc-grid mc-grid--tiles">${items.map(tile).join('')}</div></div>` : ''; }).join('') || `<div class="empty"><h3>Ничего не нашли</h3><p>Попробуйте другое слово или <a class="link" href="#/concierge">спросите консьержа</a>.</p></div>`}
      <p class="xs muted" style="margin-top:1.5rem">Цены ориентировочные. Точный расчёт подтвердит мастер или магазин-партнёр.</p>
    </div></section>`;
  }
  function pageOne(params) {
    const c = calc(params.id); if (!c) return pageIndex({});
    let rec = null;
    let recordId = null;
    if (window.RCProjectCalcs?.resolveMaterialRecordId) {
      recordId = window.RCProjectCalcs.resolveMaterialRecordId(c.id, params);
    } else if (params.record) {
      recordId = params.record;
    }
    if (recordId && window.RCProjectCalcs) {
      window.RCProjectCalcs.reconcileAbandonedNewSession?.(params, `material-${c.id}`);
      const candidate = window.RCProjectCalcs.findRecord(recordId);
      if (candidate && candidate.calcType === `material-${c.id}`) {
        restoreRecord(candidate);
        rec = candidate;
      }
    }
    if (params.seg && SEGS.some((x) => x.id === params.seg)) ui.seg = params.seg;
    const v = values(c);
    const wrongTypeRoute = !!(window.RCProjectCalcs?.wrongTypeRecordParam?.(`material-${c.id}`, params));
    const parentUnavailable = !!(rec && window.RCProjectCalcs?.isOrphanProjectBinding?.(rec));
    const parentShared = !!(rec && window.RCProjectCalcs?.isSharedProjectBinding?.(rec));
    const snapOk = rec && rec.resultSnapshot && validateMaterialSnapshotTyped(rec.resultSnapshot) && !rec.dataTypedInvalid;
    const lockRecordUi = !!(rec && rec.dataTypedInvalid) || wrongTypeRoute || parentUnavailable || parentShared;
    state.calcViewFrozen = !!(rec && !rec.incomplete && snapOk);
    const rLive = result(c);
    const snapView = snapOk ? normalizeSnapshotView(rec.resultSnapshot, rLive) : null;
    const r = snapView || snapshotResult(c, rec);
    const segDis = lockRecordUi ? ' disabled' : '';
    const segStrip = !window.RC_R(2) ? '' : `<div class="mc-segs">${SEGS.map((sg) => { const t = result(c, sg.id); return `<button type="button" class="mc-seg ${sg.id === ui.seg ? 'is-on' : ''}" data-mc-seg="${sg.id}"${segDis}><span class="mc-seg__l">${sg.label}${sg.popular ? '<em>популярный</em>' : ''}</span><b>${rub(t.total)}</b><small>${esc(t.kind)}</small></button>`; }).join('')}</div>`; const opts = c.tiered ? [] : catalogOptions(c); const main = r.lines.find((l) => l.k === 'main');
    const d = C(); const svcObj = d && d.services.find((s) => s.id === c.svc); const catObj = d && d.categories.find((x) => x.id === c.cat);
    const field = (f) => {
      const [k, label, , o = {}] = f;
      const dis = lockRecordUi ? ' disabled' : '';
      return o.type === 'sel'
        ? `<label class="mc-f"><span>${label}</span><select data-mc="${k}"${dis}>${o.opts.map(([val, t]) => `<option value="${esc(val)}" ${String(v[k]) === String(val) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`
        : `<label class="mc-f"><span>${label}</span><div class="mc-num"><input type="number" data-mc="${k}" value="${escMcInputValue(v[k])}" min="${o.min ?? 0}" ${o.max ? `max="${o.max}"` : ''} step="${o.step || 1}"${dis}><em>${esc(o.unit || '')}</em></div></label>`;
    };
    const line = (l) => {
      const lk = safeMcLineKey(l.k);
      const pdis = lockRecordUi ? ' disabled' : '';
      return `<div class="mc-line ${lk === 'main' ? 'is-main' : ''}"><div><b>${esc(l.n)}</b><small>${esc(fmt(l.qty))} ${esc(l.unit)}${l.per ? ` · ${esc(l.per)}` : ''}</small></div><div class="mc-price"><input type="number" value="${Math.round(safeFiniteNumber(l.price, 0))}" data-mc-price="${esc(lk)}" aria-label="Цена за ${esc(l.unit)}"${pdis}><em>₽</em></div><b class="mc-sum">${rub(l.sum)}</b></div>`;
    };
    const frozenBanner = state.calcViewFrozen && rec && rec.resultSnapshot
      ? `<div class="notice notice--grey" data-testid="calc-frozen-snapshot" style="margin-bottom:1rem">${icon('lock')}<span>Сохранённый снимок расчёта — итог не пересчитывается при смене цен.</span></div>`
      : '';
    const unusableBanner = rec && rec.dataTypedInvalid
      ? `<div class="notice notice--amber" data-testid="calc-record-unusable" style="margin-bottom:1rem">${icon('info')}<span>Сохранённые данные этого расчёта повреждены — редактирование и пересохранение отключены. Исходная запись сохранена как есть.</span></div>`
      : '';
    const parentUnavailableBanner = parentUnavailable
      ? `<div class="notice notice--amber" data-testid="calc-record-parent-unavailable" style="margin-bottom:1rem">${icon('info')}<span>Маршрут, к которому был привязан этот расчёт, сейчас недоступен в навигаторе — автосохранение отключено, исходные данные сохранены. Откройте «Мои проекты», чтобы скопировать или отвязать расчёт.</span></div>`
      : '';
    const parentSharedBanner = parentShared
      ? `<div class="notice notice--amber" data-testid="calc-record-parent-readonly" style="margin-bottom:1rem">${icon('info')}<span>Расчёт привязан к общему маршруту — редактирование отключено. Скопируйте расчёт в «Мои проекты» для редактируемой копии.</span></div>`
      : '';
    const wrongTypeBanner = window.RCProjectCalcs?.wrongTypeRecordParam?.(`material-${c.id}`, params)
      ? `<div class="notice notice--amber" data-testid="calc-record-wrong-type" style="margin-bottom:1rem">${icon('info')}<span>Ссылка указывает на расчёт другого типа — показан актуальный расчёт для «${esc(c.title)}».</span></div>`
      : '';
    return `<section class="section--tight"><div class="wrap mc-wrap">
      ${unusableBanner}
      ${parentUnavailableBanner}
      ${parentSharedBanner}
      ${wrongTypeBanner}
      ${frozenBanner}
      ${window.RCProjectCalcs ? window.RCProjectCalcs.libraryLink('calc-library-link') : ''}
      <div class="crumbs"><a href="#/calc">Калькулятор</a>${icon('chevron-right')}<a href="#/calc/materials">Отдельный расчёт</a>${icon('chevron-right')}<span>${esc(c.title)}</span></div>
      <div class="mc-head"><span class="mc-card__ico">${icon(c.icon)}</span><div><h1 class="mc-h1">${esc(c.title)}</h1><p class="muted">${esc(c.lead)}${c.stage ? ` · этап «${esc(stageTitle(c.stage))}»` : ''}</p></div></div>
      ${segStrip}
      <div class="mc-lay">
        <div class="card mc-form"><h4>Параметры</h4><div class="mc-fields">${c.fields.map(field).join('')}</div>
          ${opts.length ? `<label class="mc-f mc-f--wide"><span>Цена «${esc(main.n)}» — из каталога</span><select data-mc-prod${lockRecordUi ? ' disabled' : ''}><option value="">Своя цена</option>${opts.map((p) => `<option value="${p.id}" ${ui.product[c.id] === p.id ? 'selected' : ''}>${esc(p.name)}${p.variant ? ' · ' + esc(p.variant) : ''} — ${rub(p.price)} / ${p.unit}</option>`).join('')}</select></label>` : ''}
        </div>
        <div class="card mc-res"><div class="mc-res__h"><h4>Понадобится · ${esc(r.seg?.label ?? '')}</h4>${r.note ? `<span class="pill">${esc(r.note)}</span>` : ''}</div>
          <div class="mc-lines">${r.lines.map(line).join('')}</div>
          <div class="mc-tot"><span>Материалы</span><b>${rub(r.mat)}</b></div>
          ${r.work ? `<label class="mc-work ${r.workOn ? 'is-on' : ''}"><input type="checkbox" data-mc-work ${r.workOn ? 'checked' : ''}${lockRecordUi ? ' disabled' : ''}><div><b>${esc(r.work.n)}</b><small>${esc(fmt(r.work.qty))} ${esc(r.work.unit)} · уровень «${esc(r.seg.label)}», Краснодар</small></div><div class="mc-price"><input type="number" value="${Math.round(r.work.price)}" data-mc-price="__work" aria-label="Цена работы"${lockRecordUi ? ' disabled' : ''}><em>₽</em></div><b class="mc-sum">${rub(r.work.sum)}</b></label>` : ''}
          <div class="mc-total"><span>Итого${r.work && r.workOn ? ' с работой' : ''}</span><b>${rub(r.total)}</b></div>
          ${window.RCExtras ? window.RCExtras.finLine(r.total, c.title, 'fin-line--wide') : ''}
          <div class="mc-acts">
            <button type="button" class="btn btn--primary" id="mc-cart"${lockRecordUi ? ' disabled' : ''}>${icon('shopping-bag')} В список покупок</button>
            ${catObj ? `<a class="btn btn--ghost" href="#/catalog?sec=goods&cat=${c.cat}">${icon('store')} Где купить</a>` : ''}
            ${svcObj ? `<a class="btn btn--ghost" href="#/catalog/s/${c.svc}">${icon('hard-hat')} Нужен мастер</a>` : ''}
            <button type="button" class="btn btn--ghost" id="mc-budget"${lockRecordUi ? ' disabled' : ''}>${icon('wallet')} В бюджет маршрута</button>
            <button type="button" class="btn btn--ghost btn--icon" id="mc-share" aria-label="Скопировать расчёт"${lockRecordUi ? ' disabled' : ''}>${icon('copy')}</button>
          </div>
        </div>
      </div>
      <div class="mc-more"><span class="xs muted">Ещё посчитать:</span>${CALCS.filter((x) => x.group === c.group && x.id !== c.id).slice(0, 4).map((x) => `<a class="chip" href="#/calc/materials/${x.id}">${icon(x.icon)} ${x.title}</a>`).join('')}</div>
    </div></section>`;
  }
  function bind(path, params) {
    if (path === '/calc/materials') { const q = qs('#mc-q'); if (q) { let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => go(materialsIndexHref(params, { q: q.value })), 200); }; if (params.q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } } return; }
    const c = calc(params.id); if (!c) return; const v = values(c);
    const rid = window.RCProjectCalcs?.resolveMaterialRecordId?.(c.id, params) || null;
    const curRec = rid && window.RCProjectCalcs ? window.RCProjectCalcs.findRecord(rid) : null;
    const wrongTypeRoute = !!(window.RCProjectCalcs?.wrongTypeRecordParam?.(`material-${c.id}`, params));
    if (curRec && window.RCProjectCalcs?.recordEditBlocked?.(curRec)) return;
    if (wrongTypeRoute) return;
    let rT;
    const rerender = () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        const active = document.activeElement;
        const focusKey = active && active.dataset ? (active.dataset.mc || active.dataset.mcPrice || null) : null;
        const selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
        const selEnd = active && typeof active.selectionEnd === 'number' ? active.selectionEnd : null;
        const y = window.scrollY;
        renderApp();
        window.scrollTo(0, y);
        if (focusKey) {
          const el = qs(`[data-mc="${focusKey}"]`) || qs(`[data-mc-price="${focusKey}"]`);
          if (el) {
            el.focus();
            if (selStart != null && selEnd != null && el.setSelectionRange) el.setSelectionRange(selStart, selEnd);
          }
        }
      }, 0);
    };
    const materialMeta = () => ({
      prices: { ...(ui.prices[c.id] || {}) },
      work: ui.work[c.id],
      seg: ui.seg,
      product: ui.product[c.id] || '',
    });
    const persistMaterialDraft = () => {
      if (!window.RCProjectCalcs) return;
      const cur = materialRecordFor(c, params);
      if (cur && window.RCProjectCalcs.recordEditBlocked?.(cur)) return;
      const meta = materialMeta();
      const vals = { ...v };
      const ready = materialComputeReady(c.id, vals);
      state.calcViewFrozen = false;
      if (!ready) {
        window.RCProjectCalcs.autosaveMaterial(c.id, vals, meta, { path: `#/calc/materials/${c.id}` });
        return;
      }
      const snap = result(c);
      window.RCProjectCalcs.saveMaterialSnapshot(c.id, vals, snap, meta);
    };
    const onMcField = (i) => {
      v[i.dataset.mc] = parseMcField(i);
      persistMaterialDraft();
      rerender();
    };
    qsa('[data-mc]').forEach((i) => {
      if (i.tagName === 'SELECT') i.onchange = () => onMcField(i);
      else {
        i.oninput = () => onMcField(i);
        i.onchange = () => onMcField(i);
      }
    });
    const onMcPrice = (i) => {
      ui.prices[c.id] = ui.prices[c.id] || {};
      ui.prices[c.id][i.dataset.mcPrice] = Math.max(0, +i.value || 0);
      if (i.dataset.mcPrice === 'main') ui.product[c.id] = '';
      persistMaterialDraft();
      rerender();
    };
    qsa('[data-mc-price]').forEach((i) => {
      i.oninput = () => onMcPrice(i);
      i.onchange = () => onMcPrice(i);
    });
    const ps = qs('[data-mc-prod]'); if (ps) ps.onchange = () => { ui.product[c.id] = ps.value; if (ui.prices[c.id]) delete ui.prices[c.id].main; persistMaterialDraft(); rerender(); };
    const w = qs('[data-mc-work]'); if (w) w.onchange = () => { ui.work[c.id] = w.checked; persistMaterialDraft(); rerender(); };
    qsa('[data-mc-seg]').forEach((b) => b.onclick = () => {
      const liveRec = rid && window.RCProjectCalcs ? window.RCProjectCalcs.findRecord(rid) : null;
      if (liveRec && window.RCProjectCalcs?.recordEditBlocked?.(liveRec)) return;
      ui.seg = b.dataset.mcSeg;
      ui.prices[c.id] = {};
      persistMaterialDraft();
      rerender();
    });
    qs('#mc-cart').onclick = () => {
      if (!window.RCCat || !window.RCCat.ensureCartWritable()) return;
      const r = result(c); const d = C(); const prodId = ui.product[c.id] || (catalogOptions(c)[0] || {}).id; const main = r.lines.find((l) => l.k === 'main');
      const qty = Math.max(1, Math.round(main.qty));
      const addSvc = !!(c.svc && r.work && r.workOn);
      if (!window.RCCat.addLinesFromMatcalc(prodId, qty, c.svc, addSvc)) return;
      const p = d && prodId ? d.products.find((x) => x.id === prodId) : null;
      toast(p ? `${p.name}: ${fmt(qty)} ${p.unit} — в списке покупок` : 'Товаров этой категории в каталоге пока нет — добавили работу');
      renderApp();
    };
    qs('#mc-budget').onclick = () => {
      const r = result(c); const p = activeProject();
      if (!p) { toast('Сначала создайте маршрут в навигаторе'); go('#/navigator'); return; }
      const stage = (window.NAV.stagesL1.find((s) => s.id === c.stage) || window.NAV.stagesL1[0]).id;
      p.expenses.push({ id: uid(), stageL1Id: stage, category: 'materials', amount: Math.round(r.mat), comment: `${c.title}: материалы по калькулятору`, date: new Date().toISOString().slice(0, 10) });
      if (r.work && r.workOn) p.expenses.push({ id: uid(), stageL1Id: stage, category: 'work', amount: Math.round(r.work.sum), comment: `${c.title}: ${r.work.n}`, date: new Date().toISOString().slice(0, 10) });
      toast(`${rub(r.total)} добавлено в бюджет этапа «${window.NAV.stagesL1.find((s) => s.id === stage).title}»`);
    };
    qs('#mc-share').onclick = async () => {
      const r = result(c); const txt = [`${c.title} — расчёт RemCard, уровень «${r.seg.label}»`, ...c.fields.map((f) => `${f[1]}: ${f[3] && f[3].type === 'sel' ? f[3].opts.find((o) => String(o[0]) === String(v[f[0]]))[1] : v[f[0]] + ' ' + (f[3]?.unit || '')}`), '', ...r.lines.map((l) => `${l.n}: ${fmt(l.qty)} ${l.unit} × ${fmt(l.price)} ₽ = ${rub(l.sum)}`), r.work && r.workOn ? `${r.work.n}: ${fmt(r.work.qty)} ${r.work.unit} × ${fmt(r.work.price)} ₽ = ${rub(r.work.sum)}` : '', `Итого: ${rub(r.total)}`].filter(Boolean).join('\n');
      try { await navigator.clipboard.writeText(txt); toast('Расчёт скопирован — можно отправить мастеру'); } catch { toast('Не удалось скопировать'); }
    };
  }
  /* Прототип: вход в раздел «Калькулятор» — сначала выбор, что считаем: весь ремонт или отдельную категорию товаров и услуг. */
  const START_POPULAR = ['doors', 'tile', 'laminate', 'wallpaper', 'paint', 'screed'];
  function pageStart() {
    const pop = START_POPULAR.map((id) => CALCS.find((c) => c.id === id)).filter(Boolean);
    return `<section class="section--tight"><div class="wrap mc-wrap" data-testid="calc-start">
      <h1 class="mc-h1" style="margin-top:1rem">Что хотите посчитать?</h1>
      <p class="lead" style="margin:.3rem 0 1.2rem">Выберите: весь ремонт целиком или отдельный товар либо услугу.</p>
      <div class="cs-grid">
        <a class="cs-card" href="#/calc" data-testid="calc-start-all"><span class="mc-card__ico">${icon('home')}</span><div><b>Весь ремонт</b><small>Квартира, дом или участок: стоимость, срок и разбивка по этапам. Около 11 вопросов.</small></div>${icon('arrow-right')}</a>
        <a class="cs-card" href="#/calc/materials" data-testid="calc-start-one"><span class="mc-card__ico">${icon('calculator')}</span><div><b>Отдельный товар или услуга</b><small>Только двери, плитка, ламинат, обои, краска и ещё ${CALCS.length - 5} расчётов. Размеры ваши, цены партнёров.</small></div>${icon('arrow-right')}</a>
      </div>
      <h2 class="cs-h2">Часто считают отдельно</h2>
      <div class="mc-tiles cs-tiles">${pop.map(tile).join('')}</div>
      <p class="xs muted" style="margin-top:1rem"><a class="link" href="#/calc/materials">Все ${CALCS.length} расчётов по этапам ремонта</a></p>
    </div></section>`;
  }
  route('/calc/start', pageStart);
  route('/calc/materials', pageIndex);
  route('/calc/materials/:id', pageOne);
  document.addEventListener('rc:rendered', (e) => { const p = e.detail.path; if (p.startsWith('/calc/materials')) bind(p, e.detail.params); });
  window.RCMatCalc = {
    CALCS, SEGS, modeSwitch, card, calc, values, result, restoreRecord, materialComputeReady, parseMcField,
    materialRecordFor, escMcInputValue, sanitizeMaterialInputs, normalizeSnapshotView, beginNewMaterialSession,
    safeMcLineKey, validateStoredRecord, validateMaterialSnapshotTyped, setSeg: (id) => { ui.seg = id; },
  };
  if (window.RCProjectCalcs?.revalidateRecordTyping) {
    window.RCProjectCalcs.revalidateRecordTyping();
  }
  if (window.RC_TEST) {
    const filterParams = (params) => { const q = (params.q || '').toLowerCase().trim(); const forCat = params.for || ''; return { q, forCat }; };
    window.RCMatCalcTest = {
      pageIndex, pageOne, bind, restoreRecord, materialsIndexHref, calcCountPhrase, calcMatchesFilter, result, calc,
      stageCount: (params, id) => { const { q, forCat } = filterParams(params); return CALCS.filter((c) => c.stage === id && calcMatchesFilter(c, q, forCat)).length; },
      allStageCount: (params) => { const { q, forCat } = filterParams(params); return CALCS.filter((c) => calcMatchesFilter(c, q, forCat)).length; },
      visibleTileCount: (params) => { const { q, forCat } = filterParams(params); const st = params.stage || ''; return CALCS.filter((c) => calcMatchesFilter(c, q, forCat) && (!st || c.stage === st)).length; },
    };
  }
})();
