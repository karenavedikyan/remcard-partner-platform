/* RemCard — схема каталога: дерево разделов, фильтры по категориям, атрибуты товаров и услуг,
   справочник партнёров (адреса, районы, часы работы). Принцип — как панель «Фильтр» на tandoor.ru:
   у каждой категории свой набор фильтров + общие (цена, цвет, наличие, продавец, помещение, стиль).
   Эта же схема — основа формы «Добавить товар/услугу» в кабинете партнёра на prof.remcard.ru:
   партнёр выбирает категорию → подкатегорию → заполняет её атрибуты, и карточка появляется здесь. */
(() => {
  const C = window.RCCatalogData;
  const g = (n) => `assets/gen/${n}.webp`;

  // ---------- Районы (Краснодар) и города ----------
  C.districts = [
    { id: 'cmr', title: 'Центр', x: 48, y: 56 }, { id: 'fmr', title: 'ФМР', x: 32, y: 44 }, { id: 'umr', title: 'ЮМР', x: 24, y: 64 },
    { id: 'chmr', title: 'ЧМР', x: 64, y: 44 }, { id: 'gidro', title: 'Гидрострой', x: 70, y: 62 }, { id: 'pash', title: 'Пашковский', x: 88, y: 50 },
    { id: 'prikub', title: 'Прикубанский', x: 50, y: 26 }, { id: 'enka', title: 'Энка', x: 16, y: 28 }, { id: 'sev', title: 'Славянский', x: 34, y: 11 },
    { id: 'komsomol', title: 'Комсомольский', x: 78, y: 26 },
  ];
  C.cities = ['Краснодар', 'Анапа', 'Новороссийск'];

  // ---------- Помещения и стили (общие срезы для товаров и услуг) ----------
  C.rooms = [
    { id: 'bath', title: 'Ванная', img: g('room-bath') }, { id: 'kitchen', title: 'Кухня', img: g('room-kitchen') }, { id: 'hall', title: 'Прихожая', img: g('room-hall') },
    { id: 'bedroom', title: 'Спальня', img: g('room-bedroom') }, { id: 'kids', title: 'Детская', img: g('room-kids') }, { id: 'balcony', title: 'Балкон', img: g('room-balcony') },
  ];
  C.styles = [['scandinavian', 'Сканди'], ['minimalism', 'Минимализм'], ['modern', 'Современный'], ['loft', 'Лофт'], ['classic', 'Классика'], ['neoclassic', 'Неоклассика'], ['eco', 'Эко'], ['hightech', 'Хай-тек']].map(([id, title]) => ({ id, title, img: `assets/styles/${id}.webp` }));
  C.gammas = [['white', 'Белый', '#ffffff'], ['light', 'Светлый', '#e8dfd0'], ['grey', 'Серый', '#9a9a96'], ['dark', 'Тёмный', '#3b3a37'], ['black', 'Чёрный', '#111111'], ['wood', 'Дерево', '#b4834e'], ['color', 'Цветной', 'linear-gradient(135deg,#7fb3a1,#e2b04a,#c8707a)']].map(([id, title, hex]) => ({ id, title, hex }));

  // ---------- Дерево товаров: категория → подкатегории → фильтры ----------
  // facets: [ключ, [значения] | null (из данных) , тип 'list'|'bool' ]
  const T = {
    doors: { subs: ['Межкомнатные', 'Входные', 'Раздвижные и скрытые'], facets: [['Вид двери', ['Глухая', 'Со стеклом']], ['Покрытие', ['Эмаль', 'ПЭТ', 'Современные покрытия', 'Шпон', 'Массив']], ['Дизайн', ['Классика', 'Модерн']], ['Высота', ['2000 мм', '2100 мм']], ['Назначение', ['Для квартиры', 'Для дома']], ['Терморазрыв', ['Да', 'Нет']]], groups: [['по типу', [['Глухие', 'Вид двери', 'Глухая'], ['Со стеклом', 'Вид двери', 'Со стеклом'], ['Высокие 2100', 'Высота', '2100 мм']]], ['по покрытию', [['Эмаль', 'Покрытие', 'Эмаль'], ['ПЭТ', 'Покрытие', 'ПЭТ'], ['Современные', 'Покрытие', 'Современные покрытия']]]] },
    hardware: { subs: ['Ручки', 'Замки и защёлки', 'Петли', 'Плинтус и погонаж'], facets: [['Основание ручки', ['Квадратная розетка', 'Круглая розетка']], ['Материал', ['Алюминий', 'Сталь', 'МДФ', 'Латунь']], ['Тип установки', ['Врезная', 'Накладная']], ['Высота плинтуса', ['60 мм', '80 мм', '100 мм']]], groups: [] },
    tiles: { subs: ['Керамогранит', 'Настенная плитка', 'Мозаика'], facets: [['Формат', ['60×120', '60×60', '20×120', '7,5×15', 'Мозаика']], ['Поверхность', ['Полированная', 'Матовая', 'Глянцевая', 'Структурная']], ['Дизайн', ['Под мрамор', 'Под бетон', 'Под дерево', 'Однотонная']], ['Куда', ['Пол', 'Стены', 'Пол и стены']], ['Антискольжение', ['Да', 'Нет']]], groups: [['по дизайну', [['Под мрамор', 'Дизайн', 'Под мрамор'], ['Под бетон', 'Дизайн', 'Под бетон'], ['Под дерево', 'Дизайн', 'Под дерево'], ['Однотонная', 'Дизайн', 'Однотонная']]], ['куда', [['На пол', 'Куда', 'Пол'], ['На стены', 'Куда', 'Стены']]]] },
    flooring: { subs: ['Ламинат', 'Кварцвинил', 'Инженерная доска', 'Паркет'], facets: [['Класс износа', ['32', '33', '43']], ['Тёплый пол', ['Да', 'Нет']], ['Влагостойкий', ['Да', 'Нет']], ['Оттенок', ['Светлый дуб', 'Натуральный дуб', 'Серый дуб']], ['Укладка', ['Замок', 'На клей']]], groups: [['по условиям', [['Для кухни и влажных', 'Влагостойкий', 'Да'], ['На тёплый пол', 'Тёплый пол', 'Да']]]] },
    plumbing: { subs: ['Смесители', 'Унитазы и инсталляции', 'Душевые', 'Ванны', 'Раковины и тумбы'], facets: [['Монтаж', ['Подвесной', 'Напольный', 'Настенный', 'Отдельностоящая']], ['Покрытие', ['Хром', 'Чёрный матовый', 'Белый', 'Дерево']], ['Гарантия', ['2 года', '5 лет', '10 лет']]], groups: [] },
    lighting: { subs: ['Трековые системы', 'Подвесные', 'Встраиваемые', 'Бра'], facets: [['Цоколь', ['E27', 'GU10', 'LED-модуль']], ['Диммируемый', ['Да', 'Нет']], ['Свет', ['Тёплый 3000K', 'Нейтральный 4000K']]], groups: [] },
    electrical: { subs: ['Розетки и выключатели', 'Щиты и автоматы', 'Кабель'], facets: [['Серия', ['Pure', 'Classic']], ['Сечение', ['1,5 мм²', '2,5 мм²']], ['Степень защиты', ['IP20', 'IP44']]], groups: [] },
    paint: { subs: ['Краски', 'Декоративные покрытия', 'Обои'], facets: [['Моющаяся', ['Да', 'Нет']], ['Для влажных помещений', ['Да', 'Нет']], ['Основа', ['Акрил', 'Цемент', 'Флизелин']], ['Блеск', ['Матовая', 'Полуматовая']]], groups: [] },
    building: { subs: ['Сухие смеси', 'ГКЛ и профиль', 'Утеплитель'], facets: [['Назначение', ['Стены', 'Пол', 'Перегородки', 'Потолок']], ['Фасовка', ['25 кг', '30 кг', 'Комплект']]], groups: [] },
    kitchen: { subs: ['Кухни', 'Шкафы и гардеробные', 'Столы и стулья'], facets: [['Фасады', ['Матовая эмаль', 'Плёнка', 'Шпон']], ['Размер', ['до 2 м', '2–3 м', 'Угловая']], ['Срок', ['В наличии', 'От 3 недель']]], groups: [] },
    windows: { subs: ['Окна ПВХ', 'Балконные блоки', 'Остекление балконов'], facets: [['Камер в стеклопакете', ['1', '2']], ['Профиль', ['60 мм', '70 мм']]], groups: [] },
  };
  C.categories.forEach((c) => Object.assign(c, T[c.id] || { subs: [], facets: [], groups: [] }));
  // Общие фильтры для всех товаров (ключи совпадают с полями карточки)
  C.commonFacets = [['Наличие', ['В наличии', 'Скоро поступит', 'Под заказ']], ['Доставка', ['Сегодня-завтра', 'До 3 дней', 'Самовывоз']]];

  // ---------- Атрибуты товаров (sub, brand, gamma, rooms, styles, attrs, delivery) ----------
  const A = {
    p001: ['Межкомнатные', 'Tandoor', 'white', ['bedroom', 'kids', 'hall'], ['scandinavian', 'modern', 'neoclassic'], { 'Вид двери': 'Глухая', Покрытие: 'Современные покрытия', Дизайн: 'Классика', Высота: '2000 мм' }],
    p002: ['Межкомнатные', 'Tandoor', 'white', ['bedroom', 'kids', 'hall'], ['modern', 'minimalism'], { 'Вид двери': 'Глухая', Покрытие: 'ПЭТ', Дизайн: 'Модерн', Высота: '2000 мм' }],
    p003: ['Межкомнатные', 'Tandoor', 'white', ['bedroom', 'hall'], ['classic', 'neoclassic'], { 'Вид двери': 'Глухая', Покрытие: 'Эмаль', Дизайн: 'Классика', Высота: '2000 мм' }],
    p004: ['Межкомнатные', 'Tandoor', 'white', ['bedroom', 'hall', 'bath'], ['modern', 'minimalism', 'hightech'], { 'Вид двери': 'Глухая', Покрытие: 'Современные покрытия', Дизайн: 'Модерн', Высота: '2000 мм' }],
    p005: ['Межкомнатные', 'Tandoor', 'white', ['kitchen', 'hall'], ['modern', 'scandinavian'], { 'Вид двери': 'Со стеклом', Покрытие: 'Современные покрытия', Дизайн: 'Модерн', Высота: '2000 мм' }],
    p006: ['Межкомнатные', 'Tandoor', 'white', ['bedroom', 'hall'], ['classic', 'neoclassic', 'modern'], { 'Вид двери': 'Глухая', Покрытие: 'Эмаль', Дизайн: 'Модерн', Высота: '2100 мм' }],
    p007: ['Межкомнатные', 'Tandoor', 'white', ['bedroom', 'hall', 'kids'], ['classic', 'neoclassic', 'modern'], { 'Вид двери': 'Глухая', Покрытие: 'Эмаль', Дизайн: 'Классика', Высота: '2000 мм' }],
    p010: ['Межкомнатные', 'Tandoor', 'white', ['bedroom', 'hall', 'kids'], ['modern', 'loft', 'minimalism'], { 'Вид двери': 'Глухая', Покрытие: 'ПЭТ', Дизайн: 'Модерн', Высота: '2000 мм' }],
    p011: ['Межкомнатные', 'Tandoor', 'white', ['bedroom', 'hall'], ['modern', 'scandinavian'], { 'Вид двери': 'Глухая', Покрытие: 'Современные покрытия', Дизайн: 'Модерн', Высота: '2000 мм' }],
    /* Модели поставщика «Тандор», которых нет в 1С партнёра: на сайте появляются, когда партнёр добавил их из каталога поставщика. */
    t001: ['Межкомнатные', 'Tandoor', 'grey', ['bedroom', 'kids', 'hall'], ['scandinavian', 'modern', 'neoclassic'], { 'Вид двери': 'Глухая', Покрытие: 'Современные покрытия', Дизайн: 'Классика', Высота: '2000 мм' }],
    t002: ['Межкомнатные', 'Tandoor', 'dark', ['bedroom', 'hall'], ['modern', 'minimalism', 'loft'], { 'Вид двери': 'Глухая', Покрытие: 'ПЭТ', Дизайн: 'Модерн', Высота: '2000 мм' }],
    t003: ['Межкомнатные', 'Tandoor', 'light', ['bedroom', 'hall'], ['classic', 'neoclassic'], { 'Вид двери': 'Глухая', Покрытие: 'Эмаль', Дизайн: 'Классика', Высота: '2000 мм' }],
    t004: ['Межкомнатные', 'Tandoor', 'dark', ['bedroom', 'hall', 'bath'], ['modern', 'minimalism', 'hightech'], { 'Вид двери': 'Глухая', Покрытие: 'Современные покрытия', Дизайн: 'Модерн', Высота: '2000 мм' }],
    t010: ['Межкомнатные', 'Tandoor', 'grey', ['bedroom', 'hall', 'kids'], ['modern', 'loft', 'minimalism'], { 'Вид двери': 'Глухая', Покрытие: 'ПЭТ', Дизайн: 'Модерн', Высота: '2000 мм' }],
    t011: ['Межкомнатные', 'Tandoor', 'light', ['bedroom', 'hall'], ['modern', 'scandinavian'], { 'Вид двери': 'Глухая', Покрытие: 'Современные покрытия', Дизайн: 'Модерн', Высота: '2000 мм' }],
    p139: ['Входные', 'Tandoor', 'white', ['hall'], ['modern', 'minimalism'], { Назначение: 'Для квартиры', Терморазрыв: 'Нет', Высота: '2000 мм' }],
    p141: ['Входные', 'Tandoor', 'light', ['hall'], ['modern', 'scandinavian'], { Назначение: 'Для квартиры', Терморазрыв: 'Нет', Высота: '2000 мм' }],
    p144: ['Входные', 'Tandoor', 'dark', ['hall'], ['modern', 'loft'], { Назначение: 'Для дома', Терморазрыв: 'Да', Высота: '2000 мм' }],
    p037: ['Ручки', 'Tandoor', 'black', ['hall', 'bedroom'], ['modern', 'loft', 'minimalism'], { 'Основание ручки': 'Квадратная розетка', Материал: 'Алюминий', 'Тип установки': 'Врезная' }],
    p038: ['Ручки', 'Tandoor', 'grey', ['hall', 'bedroom'], ['modern', 'hightech'], { 'Основание ручки': 'Квадратная розетка', Материал: 'Алюминий', 'Тип установки': 'Врезная' }],
    p039: ['Ручки', 'Tandoor', 'light', ['hall', 'bedroom'], ['scandinavian', 'neoclassic'], { 'Основание ручки': 'Квадратная розетка', Материал: 'Алюминий', 'Тип установки': 'Врезная' }],
    p054: ['Замки и защёлки', 'Tandoor', 'black', ['bedroom', 'bath'], ['modern'], { Материал: 'Сталь', 'Тип установки': 'Врезная' }],
    p020: ['Петли', 'Tandoor', 'wood', ['hall'], ['classic'], { Материал: 'Сталь', 'Тип установки': 'Врезная' }],
    p130: ['Плинтус и погонаж', 'Tandoor', 'light', ['hall', 'bedroom', 'kids'], ['scandinavian', 'modern'], { Материал: 'МДФ', 'Высота плинтуса': '80 мм' }],
    p131: ['Плинтус и погонаж', 'Tandoor', 'grey', ['hall', 'bedroom'], ['modern', 'loft'], { Материал: 'МДФ', 'Высота плинтуса': '80 мм' }],
    'tile-marble': ['Керамогранит', 'Italon', 'white', ['bath', 'kitchen', 'hall'], ['neoclassic', 'classic', 'modern'], { Формат: '60×120', Поверхность: 'Полированная', Дизайн: 'Под мрамор', Куда: 'Пол и стены', Антискольжение: 'Нет' }],
    'tile-concrete': ['Керамогранит', 'Estima', 'grey', ['bath', 'hall', 'balcony'], ['loft', 'minimalism', 'modern'], { Формат: '60×60', Поверхность: 'Матовая', Дизайн: 'Под бетон', Куда: 'Пол и стены', Антискольжение: 'Да' }],
    'tile-metro': ['Настенная плитка', 'Kerama Marazzi', 'white', ['kitchen', 'bath'], ['scandinavian', 'loft', 'classic'], { Формат: '7,5×15', Поверхность: 'Глянцевая', Дизайн: 'Однотонная', Куда: 'Стены', Антискольжение: 'Нет' }],
    'tile-wood': ['Керамогранит', 'Estima', 'wood', ['balcony', 'kitchen', 'hall'], ['scandinavian', 'eco', 'modern'], { Формат: '20×120', Поверхность: 'Структурная', Дизайн: 'Под дерево', Куда: 'Пол', Антискольжение: 'Да' }],
    'tile-mosaic': ['Мозаика', 'Kerama Marazzi', 'white', ['bath'], ['scandinavian', 'classic', 'minimalism'], { Формат: 'Мозаика', Поверхность: 'Матовая', Дизайн: 'Однотонная', Куда: 'Стены', Антискольжение: 'Да' }],
    'floor-laminate': ['Ламинат', 'Kronospan', 'light', ['bedroom', 'kids', 'hall'], ['scandinavian', 'modern'], { 'Класс износа': '33', 'Тёплый пол': 'Да', Влагостойкий: 'Нет', Оттенок: 'Светлый дуб', Укладка: 'Замок' }],
    'floor-engineered': ['Инженерная доска', 'Coswick', 'wood', ['bedroom', 'kids'], ['eco', 'classic', 'scandinavian'], { 'Класс износа': '32', 'Тёплый пол': 'Да', Влагостойкий: 'Нет', Оттенок: 'Натуральный дуб', Укладка: 'На клей' }],
    'floor-spc': ['Кварцвинил', 'Alpine Floor', 'grey', ['kitchen', 'hall', 'balcony', 'kids'], ['modern', 'minimalism', 'loft'], { 'Класс износа': '43', 'Тёплый пол': 'Да', Влагостойкий: 'Да', Оттенок: 'Серый дуб', Укладка: 'Замок' }],
    'floor-herringbone': ['Паркет', 'Coswick', 'wood', ['bedroom', 'hall'], ['classic', 'neoclassic', 'eco'], { 'Класс износа': '32', 'Тёплый пол': 'Нет', Влагостойкий: 'Нет', Оттенок: 'Натуральный дуб', Укладка: 'На клей' }],
    'plumb-faucet': ['Смесители', 'Grohe', 'black', ['bath'], ['modern', 'loft', 'minimalism'], { Монтаж: 'Настенный', Покрытие: 'Чёрный матовый', Гарантия: '5 лет' }],
    'plumb-toilet': ['Унитазы и инсталляции', 'Geberit', 'white', ['bath'], ['modern', 'minimalism', 'scandinavian'], { Монтаж: 'Подвесной', Покрытие: 'Белый', Гарантия: '10 лет' }],
    'plumb-shower': ['Душевые', 'Hansgrohe', 'grey', ['bath'], ['modern', 'hightech'], { Монтаж: 'Настенный', Покрытие: 'Хром', Гарантия: '5 лет' }],
    'plumb-bath': ['Ванны', 'Cezares', 'white', ['bath'], ['scandinavian', 'minimalism', 'neoclassic'], { Монтаж: 'Отдельностоящая', Покрытие: 'Белый', Гарантия: '10 лет' }],
    'plumb-sink': ['Раковины и тумбы', 'Aqwella', 'wood', ['bath'], ['scandinavian', 'eco', 'modern'], { Монтаж: 'Подвесной', Покрытие: 'Дерево', Гарантия: '2 года' }],
    'light-track': ['Трековые системы', 'Maytoni', 'black', ['kitchen', 'hall', 'bedroom'], ['modern', 'loft', 'hightech'], { Цоколь: 'LED-модуль', Диммируемый: 'Да', Свет: 'Тёплый 3000K' }],
    'light-pendant': ['Подвесные', 'Lumion', 'white', ['kitchen', 'kids'], ['scandinavian', 'minimalism'], { Цоколь: 'E27', Диммируемый: 'Нет', Свет: 'Тёплый 3000K' }],
    'light-spots': ['Встраиваемые', 'Arte Lamp', 'white', ['bath', 'hall', 'kitchen'], ['modern', 'minimalism', 'hightech'], { Цоколь: 'GU10', Диммируемый: 'Да', Свет: 'Нейтральный 4000K' }],
    'elec-socket': ['Розетки и выключатели', 'Schneider', 'white', ['bedroom', 'kids', 'kitchen'], ['modern', 'scandinavian', 'minimalism'], { Серия: 'Pure', 'Степень защиты': 'IP20' }],
    'elec-panel': ['Щиты и автоматы', 'ABB', 'white', ['hall'], ['modern'], { 'Степень защиты': 'IP44' }],
    'elec-cable': ['Кабель', 'Конкорд', 'white', ['hall'], [], { Сечение: '2,5 мм²' }],
    'paint-can': ['Краски', 'Tikkurila', 'color', ['bedroom', 'kids', 'hall'], ['scandinavian', 'modern', 'classic'], { Моющаяся: 'Да', 'Для влажных помещений': 'Нет', Основа: 'Акрил', Блеск: 'Матовая' }],
    'paint-micro': ['Декоративные покрытия', 'Decorazza', 'grey', ['bath', 'kitchen'], ['loft', 'minimalism', 'modern'], { Моющаяся: 'Да', 'Для влажных помещений': 'Да', Основа: 'Цемент', Блеск: 'Матовая' }],
    wallpaper: ['Обои', 'Erismann', 'light', ['bedroom', 'kids'], ['scandinavian', 'classic', 'eco'], { Моющаяся: 'Да', 'Для влажных помещений': 'Нет', Основа: 'Флизелин' }],
    'build-plaster': ['Сухие смеси', 'Knauf', 'grey', [], [], { Назначение: 'Стены', Фасовка: '30 кг' }],
    'build-drywall': ['ГКЛ и профиль', 'Knauf', 'grey', [], [], { Назначение: 'Перегородки', Фасовка: 'Комплект' }],
    'kitchen-set': ['Кухни', 'Мария', 'white', ['kitchen'], ['scandinavian', 'modern', 'minimalism'], { Фасады: 'Матовая эмаль', Размер: '2–3 м', Срок: 'От 3 недель' }],
    'furn-wardrobe': ['Шкафы и гардеробные', 'Мария', 'wood', ['hall', 'bedroom'], ['scandinavian', 'modern'], { Фасады: 'Шпон', Размер: '2–3 м', Срок: 'От 3 недель' }],
    'win-pvc': ['Окна ПВХ', 'Rehau', 'white', ['balcony', 'bedroom', 'kids'], [], { 'Камер в стеклопакете': '2', Профиль: '70 мм' }],
  };
  const DELIV = { s1: 'До 3 дней', s2: 'До 3 дней', s3: 'Сегодня-завтра', s4: 'Сегодня-завтра', s5: 'Сегодня-завтра', s6: 'Самовывоз' };

  // Новые товары, чтобы фильтры были «живыми»
  C.products.push(
    { id: 'p007', cat: 'doors', name: 'Шторм-2', variant: 'Белый · эмаль · глухая', price: 19440, unit: 'полотно', imgs: ['assets/catalog/p007-0.webp'], seller: 's6', sizes: ['600', '700', '800', '900'], colors: ['Белый'], specs: { Покрытие: 'Эмаль', Дизайн: 'Модерн/Классика', 'Толщина полотна': '38 мм', Погонаж: 'Телескопический' }, avail: 'in', tags: [], desc: 'Массив и МДФ в эмали, телескопический погонаж — ставится без подрезки доборов.' },
    /* Ассортимент поставщика «Тандор» сверх 1С партнёра (другие цвета тех же моделей; фото — демонстрационные, перекрашены из белых).
       Признак supplierOnly: клиенту товар виден, только если партнёр добавил его из каталога поставщика (см. seller-preview.js). */
    { id: 't001', cat: 'doors', name: 'ДИ-212', variant: 'Серый · глухая', price: 7640, unit: 'полотно', imgs: ['assets/catalog/t001-0.webp'], seller: 's6', supplier: 'tandoor', supplierOnly: true, sizes: ['600', '700', '800', '900'], colors: ['Серый'], specs: { Покрытие: 'Современные покрытия', Дизайн: 'Классика', 'Толщина полотна': '36 мм', Высота: '2000 мм' }, avail: 'order', tags: [], desc: 'Полотно с горизонтальными филёнками в сером цвете. Поставляется под заказ со склада производителя.' },
    { id: 't002', cat: 'doors', name: '422', variant: 'Графит ЭВО ПЭТ · глухая', price: 8620, unit: 'полотно', imgs: ['assets/catalog/t002-0.webp'], seller: 's6', supplier: 'tandoor', supplierOnly: true, sizes: ['600', '700', '800', '900'], colors: ['Графит'], specs: { Покрытие: 'ПЭТ', Дизайн: 'Модерн', 'Толщина полотна': '36 мм' }, avail: 'order', tags: [], desc: 'Гладкое полотно с горизонтальным молдингом в цвете графит. Устойчивое к царапинам ПЭТ-покрытие.' },
    { id: 't003', cat: 'doors', name: 'М-36', variant: 'Эмаль капучино · глухая', price: 10570, unit: 'полотно', imgs: ['assets/catalog/t003-0.webp'], seller: 's6', supplier: 'tandoor', supplierOnly: true, sizes: ['600', '700', '800', '900'], colors: ['Капучино'], specs: { Покрытие: 'Эмаль', Дизайн: 'Классика', 'Толщина полотна': '38 мм' }, avail: 'order', tags: [], desc: 'Классическая трёхфилёнчатая дверь в тёплой эмали. Наличники и плинтус — в тон, под заказ.' },
    { id: 't004', cat: 'doors', name: 'Mona-58', variant: 'Графит · алюминиевая кромка', price: 11970, unit: 'полотно', imgs: ['assets/catalog/t004-0.webp'], seller: 's6', supplier: 'tandoor', supplierOnly: true, sizes: ['600', '700', '800', '900'], colors: ['Графит'], specs: { Кромка: 'Алюминий', Дизайн: 'Модерн', 'Толщина полотна': '38 мм' }, avail: 'order', tags: [], desc: 'Две вертикальные вставки и алюминиевая кромка, защищающая торцы. Цвет графит.' },
    { id: 't010', cat: 'doors', name: 'Эра', variant: 'Серый ЭВО ПЭТ · чёрный молдинг', price: 12600, unit: 'полотно', imgs: ['assets/catalog/t010-0.webp'], seller: 's6', supplier: 'tandoor', supplierOnly: true, sizes: ['600', '700', '800', '900'], colors: ['Серый'], specs: { Покрытие: 'ПЭТ', Молдинг: 'Чёрный', 'Толщина полотна': '36 мм' }, avail: 'order', tags: [], desc: 'Чёрный молдинг на сером полотне — под чёрные ручки и светильники.' },
    { id: 't011', cat: 'doors', name: 'Бланко 13', variant: 'Капучино · глухая', price: 11910, unit: 'полотно', imgs: ['assets/catalog/t011-0.webp'], seller: 's6', supplier: 'tandoor', supplierOnly: true, sizes: ['600', '700', '800', '900'], colors: ['Капучино'], specs: { Покрытие: 'Современные покрытия', Дизайн: 'Модерн', 'Толщина полотна': '38 мм' }, avail: 'order', tags: [], desc: 'Модель серии «Бланко» в тёплом оттенке капучино. Поставляется под заказ.' },
    { id: 'tile-wood', cat: 'tiles', name: 'Керамогранит Wood', variant: '20×120 · дуб тёплый', price: 2190, unit: 'м²', imgs: [g('tile-wood')], seller: 's1', sizes: ['20×120', '15×90'], colors: ['Дуб тёплый', 'Дуб серый'], specs: { Поверхность: 'Структурная', Антискольжение: 'R10', Толщина: '9 мм' }, avail: 'in', tags: ['new'], desc: 'Дерево, которое не боится воды: для балкона, кухни и прихожей с тёплым полом.' },
    { id: 'tile-mosaic', cat: 'tiles', name: 'Мозаика «соты»', variant: '30×30 · белая матовая', price: 1890, unit: 'лист', imgs: [g('tile-mosaic')], seller: 's1', colors: ['Белый', 'Чёрный', 'Серый'], specs: { Лист: '30×30 см', Элемент: '5 см', Основа: 'Сетка' }, avail: 'in', tags: [], desc: 'Для пола душевой и акцентной стены. Мелкий элемент не скользит.' },
    { id: 'floor-herringbone', cat: 'flooring', name: 'Паркет «ёлочка» Дуб', variant: '70×490 · масло', price: 6900, unit: 'м²', imgs: [g('floor-herringbone')], seller: 's2', colors: ['Натуральный', 'Дымчатый'], specs: { Формат: '70×490×15 мм', Покрытие: 'Масло', Укладка: 'На клей, ёлочка' }, avail: 'order', tags: [], desc: 'Классическая французская ёлочка. Срок поставки 3 недели, укладку лучше доверить паркетчику.' },
    { id: 'plumb-bath', cat: 'plumbing', name: 'Ванна отдельностоящая', variant: 'Акрил · 170×75 · белый матовый', price: 58900, unit: 'шт', imgs: [g('plumb-bath')], seller: 's1', colors: ['Белый матовый', 'Белый глянец'], specs: { Размер: '170×75×58 см', Материал: 'Литой акрил', Слив: 'В комплекте' }, avail: 'order', tags: ['new'], desc: 'Овальная ванна для просторной ванной. Нужен подвод воды в полу — обсудите с сантехником заранее.' },
    { id: 'plumb-sink', cat: 'plumbing', name: 'Тумба с раковиной 80 см', variant: 'Дуб · подвесная · 2 ящика', price: 32400, unit: 'комплект', imgs: [g('plumb-sink')], seller: 's1', colors: ['Дуб', 'Белый'], specs: { Ширина: '80 см', Раковина: 'Керамика, в комплекте', Ящики: '2, доводчики' }, avail: 'in', tags: ['hit'], desc: 'Подвесная тумба — пол под ней легко мыть. Раковина уже в комплекте.' },
    { id: 'light-spots', cat: 'lighting', name: 'Споты встраиваемые LED', variant: 'Белый · 7 Вт · комплект 3 шт', price: 2700, unit: 'комплект', imgs: [g('light-spots')], seller: 's3', colors: ['Белый', 'Чёрный'], specs: { Мощность: '7 Вт', Цоколь: 'GU10', Поворот: '30°' }, avail: 'in', tags: ['sale'], oldPrice: 3300, desc: 'Поворотные споты для коридора и ванной. Диммируются с совместимым выключателем.' },
    { id: 'wallpaper', cat: 'paint', name: 'Обои флизелиновые «Лён»', variant: '1,06×10 м · бежевый', price: 2450, unit: 'рулон', imgs: [g('wallpaper')], seller: 's5', colors: ['Бежевый', 'Серый', 'Шалфей'], specs: { Основа: 'Флизелин', Ширина: '1,06 м', Подгон: 'Без подгона' }, avail: 'in', tags: [], desc: 'Фактура льна без выраженного рисунка — клеятся без подгона, швы не видны.' },
    { id: 'elec-cable', cat: 'electrical', name: 'Кабель ВВГнг-LS 3×2,5', variant: 'Бухта 100 м', price: 8900, unit: 'бухта', imgs: [g('elec-cable')], seller: 's3', colors: [], specs: { Жилы: '3×2,5 мм²', Изоляция: 'нг-LS', Длина: '100 м' }, avail: 'in', tags: [], desc: 'На розеточные группы. На квартиру 60 м² обычно уходит 2–3 бухты — уточните у электрика.' },
  );
  C.products.forEach((p) => {
    const a = A[p.id] || ['', '', 'light', [], [], {}];
    p.sub = a[0]; p.brand = a[1]; p.gamma = a[2]; p.rooms = a[3]; p.styles = a[4]; p.attrs = a[5];
    p.attrs['Наличие'] = C.availLabel[p.avail]; p.attrs['Доставка'] = DELIV[p.seller] || 'До 3 дней'; p.attrs['Бренд'] = p.brand;
  });

  // ---------- Услуги: дерево видов работ и фильтры ----------
  C.serviceGroups = [
    { id: 'plan', title: 'Проект и приёмка', icon: 'ruler', items: ['design', 'inspect'] },
    { id: 'rough', title: 'Черновые работы', icon: 'hammer', items: ['demolition', 'screed', 'plaster'] },
    { id: 'eng', title: 'Инженерные', icon: 'plug', items: ['electric', 'plumber', 'climate'] },
    { id: 'finish', title: 'Отделочные', icon: 'paintbrush', items: ['tiler', 'painter', 'ceiling'] },
    { id: 'fit', title: 'Установка и сборка', icon: 'door-open', items: ['doors', 'kitchen'] },
    { id: 'clean', title: 'Уборка', icon: 'sparkles', items: ['cleaning'] },
  ];
  C.serviceFacets = [['Исполнитель', ['Мастер', 'Компания']], ['С материалами', ['Да', 'Нет']], ['Договор и чек', ['Да']], ['Гарантия', ['1 год', '2 года', '3 года', '5 лет']], ['Опыт', ['от 5 лет', 'от 10 лет']], ['Когда может начать', ['На этой неделе', 'В этом месяце']]];
  C.services.push({ id: 'climate', title: 'Кондиционеры и вентиляция', img: 'assets/places/c3.webp', price: 'от 35 000 ₽/система', priceNum: 35000, unit: 'система', seller: 'c3', stage: 'eng', l1: 'L1-7', desc: 'Закладка трасс до отделки, монтаж блоков после. Проект вентиляции для дома.', includes: ['Трассы в штробе', 'Дренаж', 'Пусконаладка'], cats: ['electrical'], tags: ['hit'] });
  const SA = {
    tiler: [['Нет', 'Да', '3 года', 'от 10 лет', 'В этом месяце'], ['cmr', 'fmr', 'chmr', 'prikub', 'umr'], ['bath', 'kitchen', 'hall', 'balcony']],
    electric: [['Да', 'Да', '5 лет', 'от 10 лет', 'На этой неделе'], ['cmr', 'fmr', 'chmr', 'gidro', 'pash', 'prikub', 'enka'], ['kitchen', 'bedroom', 'kids', 'hall', 'bath']],
    plumber: [['Да', 'Да', '3 года', 'от 10 лет', 'На этой неделе'], ['umr', 'cmr', 'fmr'], ['bath', 'kitchen']],
    painter: [['Нет', 'Да', '2 года', 'от 5 лет', 'На этой неделе'], ['cmr', 'chmr', 'komsomol', 'gidro', 'pash'], ['bedroom', 'kids', 'hall', 'kitchen']],
    plaster: [['Да', 'Да', '2 года', 'от 5 лет', 'В этом месяце'], ['cmr', 'chmr', 'komsomol', 'gidro'], ['bedroom', 'kids', 'hall']],
    screed: [['Да', 'Нет', '1 год', 'от 5 лет', 'На этой неделе'], ['prikub', 'enka', 'sev', 'fmr', 'cmr'], ['hall', 'kitchen', 'bedroom']],
    demolition: [['Нет', 'Нет', '1 год', 'от 5 лет', 'На этой неделе'], ['prikub', 'enka', 'sev', 'fmr', 'cmr', 'umr'], ['bath', 'kitchen', 'hall']],
    design: [['Нет', 'Да', '1 год', 'от 5 лет', 'В этом месяце'], ['cmr', 'fmr', 'umr', 'chmr', 'prikub', 'enka', 'sev', 'gidro', 'pash', 'komsomol'], ['kitchen', 'bath', 'bedroom', 'kids', 'hall', 'balcony']],
    doors: [['Нет', 'Да', '2 года', 'от 10 лет', 'На этой неделе'], ['cmr', 'fmr', 'chmr', 'gidro', 'pash', 'komsomol'], ['hall', 'bedroom', 'kids']],
    inspect: [['Нет', 'Да', '1 год', 'от 5 лет', 'На этой неделе'], ['cmr', 'fmr', 'umr', 'chmr', 'prikub', 'enka', 'sev', 'gidro', 'pash', 'komsomol'], []],
    kitchen: [['Нет', 'Да', '2 года', 'от 10 лет', 'В этом месяце'], ['cmr', 'fmr', 'chmr', 'gidro', 'pash', 'komsomol'], ['kitchen', 'hall', 'bedroom']],
    ceiling: [['Да', 'Да', '5 лет', 'от 10 лет', 'На этой неделе'], ['cmr', 'fmr', 'umr', 'chmr', 'prikub', 'gidro', 'pash'], ['bedroom', 'kids', 'hall', 'kitchen']],
    cleaning: [['Да', 'Да', '1 год', 'от 10 лет', 'На этой неделе'], ['cmr', 'fmr', 'umr', 'chmr', 'prikub', 'gidro', 'pash', 'enka'], []],
    climate: [['Да', 'Да', '3 года', 'от 5 лет', 'В этом месяце'], ['cmr', 'fmr', 'umr', 'chmr', 'prikub', 'gidro', 'pash', 'komsomol'], ['bedroom', 'kids', 'kitchen']],
  };
  C.services.forEach((s) => {
    const a = SA[s.id] || [['Нет', 'Да', '1 год', 'от 5 лет', 'В этом месяце'], ['cmr'], []];
    const [mat, contract, warranty, exp, when] = a[0];
    s.group = (C.serviceGroups.find((gr) => gr.items.includes(s.id)) || {}).id || 'finish';
    s.attrs = { Исполнитель: s.seller.startsWith('c') ? 'Компания' : 'Мастер', 'С материалами': mat, 'Договор и чек': contract, Гарантия: warranty, Опыт: exp, 'Когда может начать': when };
    s.districts = a[1]; s.rooms = a[2];
  });

  // ---------- Справочник партнёров: фото, адрес, район, часы, координаты на схеме ----------
  // Партнёры заполняют это при регистрации на prof.remcard.ru; здесь — демо-значения.
  C.partnerInfo = {
    p1: { photo: 'assets/people/p1.webp', district: 'fmr', addr: 'выезд по Краснодару', hours: 'пн–сб 8:00–19:00', x: 38, y: 46, verified: true, contract: true, portfolio: [g('svc-tiler'), g('room-bath'), g('tile-marble')], since: 2013 },
    p2: { photo: 'assets/people/p2.webp', district: 'cmr', addr: 'ул. Красная, 176, студия 4', hours: 'пн–пт 10:00–19:00', x: 52, y: 50, verified: true, contract: true, portfolio: [g('room-kitchen'), g('room-bedroom'), g('svc-designer'), g('room-hall')], since: 2016 },
    p3: { photo: 'assets/people/p3.webp', district: 'chmr', addr: 'выезд по Краснодару и пригороду', hours: 'ежедневно 8:00–20:00', x: 61, y: 40, verified: true, contract: true, portfolio: [g('svc-electric'), g('elec-panel'), g('light-track')], since: 2010 },
    p4: { photo: 'assets/people/p4.webp', district: 'umr', addr: 'выезд: ЮМР, Центр, ФМР', hours: 'пн–сб 9:00–19:00', x: 31, y: 64, verified: true, contract: true, portfolio: [g('svc-plumber'), g('plumb-shower')], since: 2014 },
    p5: { photo: 'assets/people/p5.webp', district: 'komsomol', addr: 'выезд по Краснодару', hours: 'пн–сб 9:00–18:00', x: 70, y: 32, verified: true, contract: true, portfolio: [g('svc-painter'), g('room-bedroom'), g('room-kids')], since: 2017 },
    p6: { photo: 'assets/people/p6.webp', district: 'prikub', addr: 'выезд по Краснодару', hours: 'ежедневно 8:00–20:00', x: 44, y: 28, verified: false, contract: false, portfolio: [g('svc-demolition'), g('svc-screed')], since: 2019 },
    p7: { photo: 'assets/people/p7.webp', district: 'cmr', addr: 'выезд по краю', hours: 'ежедневно 9:00–20:00', x: 49, y: 55, verified: true, contract: true, portfolio: [g('svc-inspect')], since: 2018 },
    p8: { photo: 'assets/people/p8.webp', district: 'gidro', addr: 'выезд по Краснодару', hours: 'пн–сб 9:00–19:00', x: 67, y: 60, verified: true, contract: true, portfolio: [g('svc-doors'), g('svc-kitchen'), g('room-hall')], since: 2015 },
    s1: { photo: 'assets/places/s1.webp', district: 'chmr', addr: 'ул. Уральская, 79/1, ТЦ «Красная Площадь», 2 этаж', hours: 'ежедневно 10:00–21:00', x: 63, y: 44, verified: true, showroom: true, delivery: 'По краю, от 1 500 ₽', pickup: true, portfolio: [], since: 2009 },
    s2: { photo: 'assets/places/s2.webp', district: 'fmr', addr: 'ул. Тургенева, 138/6', hours: 'пн–сб 10:00–20:00, вс 10:00–18:00', x: 34, y: 42, verified: true, showroom: true, delivery: 'По Краснодару бесплатно от 30 000 ₽', pickup: true, portfolio: [], since: 2012 },
    s3: { photo: 'assets/places/s3.webp', district: 'prikub', addr: 'ул. Российская, 297', hours: 'пн–сб 9:00–20:00', x: 48, y: 24, verified: true, showroom: true, delivery: 'Сегодня-завтра, от 500 ₽', pickup: true, portfolio: [], since: 2011 },
    s4: { photo: 'assets/places/s4.webp', district: 'sev', addr: 'Ростовское шоссе, 14/2', hours: 'ежедневно 8:00–20:00', x: 38, y: 12, verified: true, showroom: false, delivery: 'День в день, манипулятор', pickup: true, portfolio: [], since: 2007 },
    s5: { photo: 'assets/places/s5.webp', district: 'cmr', addr: 'ул. Северная, 326', hours: 'пн–сб 10:00–19:00', x: 54, y: 48, verified: true, showroom: true, delivery: 'По Краснодару, от 400 ₽', pickup: true, portfolio: [], since: 2015 },
    s6: { photo: 'assets/places/s6.webp', district: 'prikub', addr: 'Ростовское шоссе, 30/3 · ещё 5 филиалов', hours: 'пн–сб 9:00–19:00', x: 83, y: 56, verified: true, showroom: true, delivery: 'Доставка по согласованию с продавцом', pickup: true, portfolio: ['assets/catalog/p004-0.webp', 'assets/catalog/p144-0.webp', 'assets/catalog/p037-0.webp'], since: 2004 },
    c1: { photo: 'assets/places/c1.webp', district: 'cmr', addr: 'ул. Ставропольская, 107, офис 12', hours: 'пн–пт 9:00–18:00', x: 51, y: 58, verified: true, contract: true, portfolio: [g('room-hall'), g('room-kitchen'), g('svc-ceiling'), g('room-bath')], since: 2012 },
    c2: { photo: 'assets/places/c2.webp', district: 'prikub', addr: 'ул. Московская, 69', hours: 'пн–пт 9:00–18:00', x: 42, y: 22, verified: true, contract: true, portfolio: [g('svc-screed')], since: 2015 },
    c3: { photo: 'assets/places/c3.webp', district: 'gidro', addr: 'ул. Сормовская, 7', hours: 'пн–сб 9:00–19:00', x: 70, y: 64, verified: true, contract: true, portfolio: [g('room-bedroom')], since: 2017 },
  };
  C.partnerFacets = [['Кто', ['Мастер', 'Компания', 'Магазин']], ['Рейтинг', ['4.8 и выше', '4.5 и выше']], ['Проверен RemCard', ['Да']], ['Договор и чек', ['Да']], ['Шоурум', ['Да']], ['Самовывоз', ['Да']], ['Опыт', ['от 5 лет', 'от 10 лет']]];
})();
