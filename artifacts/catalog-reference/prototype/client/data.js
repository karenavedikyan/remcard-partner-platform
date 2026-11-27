// Данные прототипа RemCard (клиентский сайт). Этапы/подэтапы/чек-листы — в nav-data.js (выгрузка из действующего приложения).
window.RC_DATA = (() => {
  const ALL = ['apartment-new', 'apartment-secondary', 'apartment-major', 'house-new', 'house-renovation', 'commercial'];

  // === Калькулятор ремонта — конфигурация перенесена 1:1 из src/lib/estimation/config.ts ===
  const est = {
    segments: [
      { id: 'economy', label: 'Эконом', basePerM2: 11500, min: 0.70, max: 1.30, daysPerM2: 0.75, workShare: 0.45, range: '8 000–15 000 ₽/м²', desc: 'Функциональный ремонт с базовыми материалами. Бюджетные, но надёжные решения.' },
      { id: 'comfort', label: 'Комфорт', basePerM2: 22500, min: 0.75, max: 1.25, daysPerM2: 1.0, workShare: 0.40, range: '15 000–30 000 ₽/м²', desc: 'Качественные материалы, продуманный дизайн. Оптимальное соотношение цены и качества.', popular: true },
      { id: 'business', label: 'Бизнес', basePerM2: 42500, min: 0.75, max: 1.30, daysPerM2: 1.5, workShare: 0.38, range: '30 000–55 000 ₽/м²', desc: 'Премиальные материалы, дизайн-проект, сложные технические решения.' },
      { id: 'premium', label: 'Премиум', basePerM2: 87500, min: 0.65, max: 1.35, daysPerM2: 2.0, workShare: 0.35, range: '55 000–120 000 ₽/м²', desc: 'Эксклюзивный ремонт. Авторский дизайн, индивидуальные решения, импортные материалы.' },
    ],
    cities: [
      { id: 'krasnodar', label: 'Краснодар', cost: 1.0, time: 1.0, desc: 'Базовые цены' },
      { id: 'novorossiysk', label: 'Новороссийск', cost: 0.95, time: 1.05, desc: '−5 % к стоимости' },
      { id: 'anapa', label: 'Анапа', cost: 0.93, time: 1.08, desc: '−7 % к стоимости' },
      { id: 'sochi', label: 'Сочи', cost: 1.15, time: 1.10, desc: '+15 % к стоимости' },
    ],
    objectTypes: [
      { id: 'apartment-new', label: 'Новостройка', full: 'Квартира в новостройке', cost: 1.0, time: 1.0, desc: 'Без отделки от застройщика: стяжка, разводка с нуля, усадка дома.', icon: 'building' },
      { id: 'apartment-secondary', label: 'Вторичка', full: 'Вторичная квартира', cost: 1.05, time: 1.10, desc: 'Демонтаж старого, замена коммуникаций, полное обновление.', icon: 'home' },
      { id: 'apartment-major', label: 'Капремонт', full: 'Капитальный ремонт с перепланировкой', cost: 1.15, time: 1.20, desc: 'Снос стен, согласование с ГЖИ, новая планировка и коммуникации.', icon: 'hammer' },
      { id: 'house-new', label: 'Дом', full: 'Частный дом', cost: 1.10, time: 1.15, desc: 'От фундамента и коммуникаций до финишной отделки.', icon: 'house' },
      { id: 'house-renovation', label: 'Реконструкция дома', full: 'Реконструкция дома', cost: 1.20, time: 1.10, desc: 'Обследование, замена конструктива, инженерии и отделки.', icon: 'wrench' },
      { id: 'commercial', label: 'Коммерческое', full: 'Коммерческое помещение', cost: 1.08, time: 0.90, desc: 'Офис, магазин, ресторан, клиника. Нормативы МЧС, СЭС.', icon: 'store' },
      { id: 'yard', label: 'Участок и двор', full: 'Благоустройство участка', cost: 1.0, time: 1.0, desc: 'Забор, дорожки, бассейн, газон, свет, беседка — без стройки дома.', icon: 'trees', yard: true },
    ],
    rooms: [
      { id: 'bathroom', label: 'Ванная', factor: 0.25 }, { id: 'kitchen', label: 'Кухня', factor: 0.22 }, { id: 'bedroom', label: 'Спальня', factor: 0.12 },
      { id: 'living', label: 'Гостиная', factor: 0.15 }, { id: 'hallway', label: 'Прихожая', factor: 0.08 }, { id: 'balcony', label: 'Балкон', factor: 0.06 }, { id: 'children', label: 'Детская', factor: 0.12 },
    ],
    stages: [
      { id: 'bare', label: 'Черновая (бетон/кирпич)', cost: 1.0, time: 1.0, desc: 'Голые стены, без стяжки и штукатурки' },
      { id: 'pre-finish', label: 'Предчистовая', cost: 0.85, time: 0.85, desc: 'Стяжка и штукатурка есть, нужна чистовая' },
      { id: 'developer', label: 'С отделкой от застройщика', cost: 0.70, time: 0.70, desc: 'Есть базовая отделка — обновляем' },
      { id: 'needs-overhaul', label: 'Требует капремонта', cost: 1.20, time: 1.15, desc: 'Старый ремонт, изношенные коммуникации' },
    ],
    styles: [
      { id: 'modern', label: 'Современный', cost: 1.0, desc: 'Чистые линии, нейтральная палитра' }, { id: 'minimalism', label: 'Минимализм', cost: 0.95, desc: 'Мало декора, максимум воздуха' }, { id: 'scandinavian', label: 'Скандинавский', cost: 1.0, desc: 'Свет, дерево, уют без перегруза' },
      { id: 'loft', label: 'Лофт', cost: 1.05, desc: 'Кирпич, металл, открытые коммуникации' }, { id: 'classic', label: 'Классика', cost: 1.15, desc: 'Симметрия, лепнина, благородные тона' }, { id: 'neoclassic', label: 'Неоклассика', cost: 1.20, desc: 'Классика в современной подаче' },
      { id: 'hightech', label: 'Хай-тек', cost: 1.10, desc: 'Стекло, металл, технологичность' }, { id: 'eco', label: 'Эко', cost: 1.05, desc: 'Натуральные материалы, природные оттенки' },
    ],
    options: [
      { id: 'warmFloor', label: 'Тёплый пол', perM2: 1500, days: 3 }, { id: 'electrical', label: 'Замена электрики', perM2: 1200, days: 5 },
      { id: 'plumbing', label: 'Замена сантехники', perM2: 800, days: 4 }, { id: 'soundproofing', label: 'Шумоизоляция', perM2: 1000, days: 3 },
      { id: 'airConditioning', label: 'Кондиционирование', perM2: 600, days: 2 }, { id: 'stretchCeiling', label: 'Натяжной потолок', perM2: 700, days: 2 },
      { id: 'builtInFurniture', label: 'Встроенная мебель', perM2: 2000, days: 7 }, { id: 'smartHome', label: 'Умный дом', perM2: 1500, days: 5 },
    ],
    furniture: [
      { id: 'none', label: 'Без мебели', perM2: 0 }, { id: 'basic', label: 'Базовая (IKEA-уровень)', perM2: 8000 },
      { id: 'medium', label: 'Средняя (российские бренды)', perM2: 15000 }, { id: 'premium', label: 'Премиальная (дизайнерская)', perM2: 35000 },
    ],
    appliances: [
      { id: 'none', label: 'Без техники', fixed: 0 }, { id: 'basic', label: 'Базовый комплект', fixed: 150000 },
      { id: 'full', label: 'Полный комплект', fixed: 350000 }, { id: 'premium', label: 'Премиум (встройка, бренды)', fixed: 700000 },
    ],
    // Коробка дома (фундамент, стены, кровля, фасад) — ₽/м² площади дома по уровню. Добавляется к отделке, если строим с нуля.
    shell: { economy: 28000, comfort: 38000, business: 52000, premium: 75000, daysPerM2: { economy: 0.9, comfort: 1.1, business: 1.4, premium: 1.8 }, workShare: 0.42, split: { 'L1-3': 0.3, 'L1-5': 0.4, 'L1-6': 0.3 } },
    // Участок: что считаем и как. qty — от площади участка в м² (сотка = 100 м²). Цены по уровню, с материалами.
    yardItems: [
      { id: 'design', label: 'Ландшафтный проект', icon: 'pencil-ruler', desc: 'зонирование, схемы сетей, смета', unit: 'сотка', qty: (m2) => m2 / 100, price: { economy: 0, comfort: 7000, business: 12000, premium: 20000 }, days: { economy: 0, comfort: 10, business: 14, premium: 21 }, note: { economy: 'в эконом-уровне — эскиз от бригады' } },
      { id: 'drainage', label: 'Планировка и дренаж', icon: 'droplets', desc: 'уклоны, ливнёвка, гильзы под сети', unit: 'сотка', qty: (m2) => m2 / 100, price: { economy: 12000, comfort: 18000, business: 28000, premium: 45000 }, days: { economy: 3, comfort: 5, business: 7, premium: 10 } },
      { id: 'fence', label: 'Забор и ворота', icon: 'fence', desc: 'по периметру участка', unit: 'м.п.', qty: (m2) => Math.round(4 * Math.sqrt(m2)), price: { economy: 2800, comfort: 4500, business: 9000, premium: 16000 }, daysPer: 12, kind: { economy: 'профлист', comfort: 'евроштакетник + откатные ворота', business: 'кирпичные столбы, автоматика', premium: 'камень, ковка, видеодомофон' } },
      { id: 'paving', label: 'Дорожки и парковка', icon: 'layers', desc: '≈ 12 % участка, но не меньше 30 м²', unit: 'м²', qty: (m2) => Math.max(30, Math.round(m2 * 0.12)), price: { economy: 2300, comfort: 3200, business: 4800, premium: 8000 }, daysPer: 15, kind: { economy: 'бетон и плитка 60 мм', comfort: 'брусчатка 60/80 мм на щебне', business: 'плита 600×600, бордюр, подсветка', premium: 'натуральный камень, керамогранит 20 мм' } },
      { id: 'lawn', label: 'Газон и озеленение', icon: 'sprout', desc: '≈ 45 % участка', unit: 'м²', qty: (m2) => Math.round(m2 * 0.45), price: { economy: 450, comfort: 900, business: 1600, premium: 3000 }, daysPer: 80, kind: { economy: 'посевной газон', comfort: 'рулонный газон + изгородь', business: 'рулонный, деревья с комом, цветники', premium: 'крупномеры, сад по проекту' } },
      { id: 'irrigation', label: 'Автополив', icon: 'droplets', desc: 'на площадь газона', unit: 'м²', qty: (m2) => Math.round(m2 * 0.45), price: { economy: 300, comfort: 400, business: 600, premium: 900 }, daysPer: 100 },
      { id: 'light', label: 'Уличное освещение', icon: 'lamp-post', desc: 'дорожки, въезд, терраса', unit: 'сотка', qty: (m2) => m2 / 100, price: { economy: 7000, comfort: 14000, business: 28000, premium: 55000 }, days: { economy: 1, comfort: 2, business: 3, premium: 5 } },
      { id: 'pool', label: 'Бассейн', icon: 'waves', desc: 'с площадкой и оборудованием', unit: 'шт', qty: () => 1, price: { economy: 180000, comfort: 1500000, business: 2600000, premium: 5000000 }, days: { economy: 3, comfort: 21, business: 30, premium: 60 }, kind: { economy: 'каркасный 4,9 м на площадке', comfort: 'композитный 6–7 м', business: 'композитный 8 м с подогревом и накрытием', premium: 'бетонный переливной по проекту' } },
      { id: 'gazebo', label: 'Беседка или навес', icon: 'tent-tree', desc: 'зона отдыха, навес для машины', unit: 'шт', qty: () => 1, price: { economy: 90000, comfort: 280000, business: 650000, premium: 1500000 }, days: { economy: 3, comfort: 7, business: 14, premium: 25 } },
      { id: 'furniture', label: 'Мебель и инвентарь', icon: 'armchair', desc: 'мебель, мангал, косилка, инструмент', unit: 'компл.', qty: () => 1, price: { economy: 50000, comfort: 160000, business: 420000, premium: 1000000 }, days: { economy: 1, comfort: 1, business: 2, premium: 3 } },
    ],
    yardExclusions: ['Дом и постройки (считаются отдельно)', 'Подключение электричества, воды и газа от сетей', 'Вывоз мусора и снос старых построек', 'Согласования с соседями и администрацией', 'Уход за садом после первого сезона'],
    reservePercent: 12,
    exclusions: ['Мебель (если не выбрана)', 'Бытовая техника (если не выбрана)', 'Дизайн-проект', 'Согласование перепланировки', 'Вывоз строительного мусора (сверх нормы)', 'Грузоподъёмные работы (выше 2 этажа без лифта)'],
  };

  // Пресеты расходов по этапам (AddExpenseButton.tsx)
  const expensePresets = {
    'L1-0': [['Инженер-приёмщик','work',5000],['Обмер помещений','work',3000],['Технический отчёт','work',2000]],
    'L1-1': [['Дизайн-проект','work',30000],['Перепланировка (согласование)','other',15000],['Замерщик','work',2000]],
    'L1-2': [['Проект перепланировки','work',20000],['Госпошлина','other',2000],['Разрешительная документация','other',5000]],
    'L1-3': [['Фундамент','work',50000],['Земляные работы','work',20000],['Щебень/песок','materials',10000]],
    'L1-4': [['Демонтаж стен','work',15000],['Вывоз мусора','delivery',5000],['Аренда инструмента','other',3000],['Подъём/спуск','delivery',2000]],
    'L1-5': [['Кладка стен','work',30000],['Кирпич/блоки','materials',20000],['Армирование','materials',5000],['Цементный раствор','materials',3000]],
    'L1-6': [['Кровля','work',50000],['Утеплитель','materials',15000],['Окна (материал)','materials',40000],['Окна (установка)','work',10000],['Входная дверь','materials',20000]],
    'L1-7': [['Электропроводка (материал)','materials',20000],['Электрик (работа)','work',30000],['Трубы водоснабжения','materials',10000],['Сантехник (работа)','work',20000],['Тёплый пол','materials',15000],['Вентиляция','materials',8000],['Радиаторы отопления','materials',25000]],
    'L1-8': [['Штукатурка стен','work',25000],['Штукатурная смесь','materials',10000],['Стяжка пола','work',20000],['Цемент/пескобетон','materials',8000],['Гипсокартон','materials',10000],['Грунтовка','materials',3000]],
    'L1-9': [['Укладка плитки','work',20000],['Плитка (материал)','materials',30000],['Укладка ламината','work',15000],['Ламинат/паркет','materials',25000],['Покраска стен','work',15000],['Краска','materials',8000],['Обои (материал)','materials',10000],['Оклейка обоев','work',12000]],
    'L1-10': [['Межкомнатные двери','materials',20000],['Установка дверей','work',8000],['Плинтуса','materials',5000],['Кухня (мебель)','materials',80000],['Сборка мебели','work',10000],['Сантехника (унитаз, ванна)','materials',30000],['Установка сантехники','work',15000],['Встроенная техника','materials',50000],['Светильники','materials',15000],['Розетки/выключатели','materials',8000]],
    'L1-11': [['Инженер-приёмщик','work',5000],['Клининг','work',8000],['Финальная уборка','work',5000]],
    'L1-12': [['Ландшафтный проект','work',45000],['Забор под ключ','work',180000],['Тротуарная плитка','material',90000],['Мощение','work',110000],['Рулонный газон','material',40000],['Автополив','work',120000],['Садовая мебель','material',80000]],
  };
  const expenseCats = [['work','Работы'],['materials','Материалы'],['delivery','Доставка'],['other','Прочее']];

  // Этапы при ремонте одной комнаты (src/lib/roomStageFilter.ts)
  const ROOM_BASE = ['L1-0','L1-1','L1-4','L1-7','L1-8','L1-9','L1-10','L1-11'];
  const roomStages = { bathroom: ROOM_BASE, kitchen: ROOM_BASE, bedroom: ROOM_BASE, living: ROOM_BASE, children: ROOM_BASE,
    hallway: ['L1-0','L1-1','L1-4','L1-8','L1-9','L1-10','L1-11'], balcony: ['L1-0','L1-1','L1-4','L1-5','L1-8','L1-9','L1-11'] };

  // Связь этапов с каталогом: специалисты и товары на этапе
  const stageLinks = {
    'L1-0': { specialists: ['appraisal'], buy: [] }, 'L1-1': { specialists: ['design', 'planning'], buy: [] }, 'L1-2': { specialists: ['planning', 'design'], buy: [] },
    'L1-3': { specialists: ['construction'], buy: ['building'] }, 'L1-4': { specialists: ['demolition'], buy: ['tools'] },
    'L1-5': { specialists: ['rough', 'construction', 'windows'], buy: ['building', 'windows'] }, 'L1-6': { specialists: ['construction'], buy: ['roofing', 'insulation'] },
    'L1-7': { specialists: ['electrical', 'plumbing', 'climate', 'engineering'], buy: ['electrical', 'plumbing'] }, 'L1-8': { specialists: ['rough', 'painting'], buy: ['building', 'tools'] },
    'L1-9': { specialists: ['tiles', 'painting', 'flooring', 'ceilings', 'finishing'], buy: ['tiles', 'paint', 'wallpaper', 'flooring'] },
    'L1-10': { specialists: ['doors', 'kitchen', 'furniture', 'plumbing', 'electrical'], buy: ['doors', 'handles', 'kitchen', 'furniture', 'lighting', 'plumbing'] },
    'L1-11': { specialists: ['appraisal', 'safety'], buy: [] },
    'L1-12': { specialists: ['landscape', 'paving', 'fence', 'pool'], buy: ['outdoor', 'garden', 'bulk'] },
  };

  // Уровни и достижения (LevelProgress.tsx, Achievements.tsx)
  const levels = [['Новосёл',0],['Начинающий',5],['Умелец',15],['Мастер',30],['Прораб',50],['Архитектор',70],['Легенда ремонта',90]];
  const achievements = [
    { id: 'first-task', title: 'Первый шаг', desc: 'Выполнена первая задача', test: s => s.percent > 0 },
    { id: 'ten-percent', title: 'Разгон', desc: '10 % задач выполнено', test: s => s.percent >= 10 },
    { id: 'quarter', title: 'Четверть пути', desc: '25 % задач', test: s => s.percent >= 25 },
    { id: 'half', title: 'Экватор', desc: '50 % задач', test: s => s.percent >= 50 },
    { id: 'three-quarter', title: 'Финишная прямая', desc: '75 % задач', test: s => s.percent >= 75 },
    { id: 'complete', title: 'Ремонт завершён!', desc: '100 % задач', test: s => s.percent === 100 },
    { id: 'first-stage', title: 'Этап закрыт', desc: 'Завершён первый этап', test: s => s.completedL1 >= 1 },
    { id: 'three-stages', title: 'На скорости', desc: 'Завершено 3 этапа', test: s => s.completedL1 >= 3 },
  ];

  // Знания (SavingTipsBlock, CommonMistakesBlock)
  const savingTips = ['Закупайте черновые материалы оптом на весь объект — скидка 10–15 %', 'Берите плитку с запасом 10 %, а не 20 % — остаток почти всегда можно вернуть', 'Заказывайте вывоз мусора контейнером на этап, а не разовыми машинами', 'Сравнивайте 3 сметы на один объём работ — разброс бывает до 40 %', 'Чистовые материалы покупайте в межсезонье — распродажи коллекций'];
  const commonMistakes = ['Чистовая отделка до окончания усадки стяжки (28 суток)', 'Окна после штукатурки — разбитые откосы и переделки', 'Нет фото скрытых работ — спор с мастером не доказать', 'Электрика без проекта розеток — удлинители навсегда', 'Оплата вперёд без акта — потеря рычага влияния на бригаду'];

  const specializations = {
    tiles: 'Плитка', flooring: 'Напольные покрытия', doors: 'Двери', plumbing: 'Сантехника', electrical: 'Электрика',
    painting: 'Покраска и штукатурка', ceilings: 'Потолки', demolition: 'Демонтаж', design: 'Дизайн интерьера',
    landscape: 'Ландшафтный дизайн', appraisal: 'Приёмка и оценка', planning: 'Планирование', rough: 'Черновые работы',
    engineering: 'Инженерные работы', finishing: 'Чистовая отделка', renovation: 'Ремонт под ключ', safety: 'Безопасность',
    kitchen: 'Кухни и мебель', windows: 'Окна и балконы', climate: 'Кондиционирование', construction: 'Строительство', furniture: 'Сборка мебели',
    foundation: 'Фундаменты и земляные работы', masonry: 'Кладка стен', roofing: 'Кровля', facade: 'Фасады и утепление', paving: 'Мощение и бетонирование',
    fence: 'Заборы и ворота', pool: 'Бассейны', gardening: 'Озеленение и газон', drilling: 'Скважины и септики', machinery: 'Спецтехника и доставка', welding: 'Сварка и металл',
  };

  const storeCategories = {
    doors: 'Двери', handles: 'Фурнитура и замки', flooring: 'Напольные покрытия', tiles: 'Плитка', plumbing: 'Сантехника',
    electrical: 'Электрика', paint: 'Краски и декор', wallpaper: 'Обои', lighting: 'Освещение', kitchen: 'Кухни',
    furniture: 'Мебель', windows: 'Окна', tools: 'Инструменты', building: 'Стройматериалы', insulation: 'Утепление', roofing: 'Кровля',
    brick: 'Кирпич и блоки', bulk: 'Сыпучие и бетон', metal: 'Металл и пиломатериалы', facade: 'Фасад', outdoor: 'Благоустройство', garden: 'Сад и отдых', pool: 'Бассейны', utilities: 'Септики, скважины, котлы', rental: 'Аренда техники',
  };

  // Каталог: кто (специалист / магазин / компания). Условные записи для прототипа.
  const partners = [
    { id: 'p1', kind: 'specialist', name: 'Дмитрий Орлов', city: 'Краснодар', tags: ['tiles', 'flooring'], rating: 4.9, reviews: 38, years: 12, price: 'от 1 800 ₽/м²', stages: ['L1-9'], about: 'Крупноформат, мозаика, укладка на тёплый пол. Работаю с раскладками дизайнеров, даю гарантию 3 года.' },
    { id: 'p2', kind: 'specialist', name: 'Анна Серова', city: 'Краснодар', tags: ['design', 'planning'], rating: 5.0, reviews: 21, years: 9, price: 'от 2 500 ₽/м²', stages: ['L1-1', 'L1-2'], about: 'Дизайн-проект с рабочей документацией и авторским надзором. Квартиры 40–120 м².' },
    { id: 'p3', kind: 'specialist', name: 'Сергей Ткачук', city: 'Краснодар', tags: ['electrical', 'engineering'], rating: 4.8, reviews: 54, years: 15, price: 'от 950 ₽/точка', stages: ['L1-7', 'L1-10'], about: 'Электромонтаж под ключ, щиты, слаботочка. Фотоотчёт трасс до закрытия стен — всегда.' },
    { id: 'p4', kind: 'specialist', name: 'Игорь Мельник', city: 'Анапа', tags: ['plumbing', 'climate'], rating: 4.7, reviews: 29, years: 11, price: 'от 1 200 ₽/точка', stages: ['L1-7'], about: 'Водоснабжение, отопление, тёплые полы, кондиционеры. Опрессовка и акт скрытых работ.' },
    { id: 'p5', kind: 'specialist', name: 'Елена Кравец', city: 'Краснодар', tags: ['painting', 'finishing'], rating: 4.9, reviews: 46, years: 8, price: 'от 650 ₽/м²', stages: ['L1-8', 'L1-9'], about: 'Штукатурка по маякам, шпаклёвка под покраску, декоративные покрытия.' },
    { id: 'p6', kind: 'specialist', name: 'Руслан Гасанов', city: 'Краснодар', tags: ['demolition', 'rough'], rating: 4.6, reviews: 17, years: 6, price: 'от 350 ₽/м²', stages: ['L1-4', 'L1-8'], about: 'Демонтаж с вывозом, стяжка, перегородки. Своя бригада и инструмент.' },
    { id: 'p7', kind: 'specialist', name: 'Марина Волкова', city: 'Новороссийск', tags: ['appraisal'], rating: 5.0, reviews: 63, years: 7, price: '5 000 ₽/выезд', stages: ['L1-0', 'L1-11'], about: 'Приёмка квартир у застройщика и после ремонта. Тепловизор, нивелир, акт с фото.' },
    { id: 'p8', kind: 'specialist', name: 'Павел Нечаев', city: 'Краснодар', tags: ['doors', 'furniture', 'kitchen'], rating: 4.8, reviews: 33, years: 10, price: 'от 3 500 ₽/дверь', stages: ['L1-10'], about: 'Установка дверей, сборка кухонь и мебели. Аккуратно, с защитой полов.' },
    { id: 's1', kind: 'store', name: 'Керамика Юг', city: 'Краснодар', tags: ['tiles', 'plumbing'], rating: 4.8, reviews: 112, price: 'Скидка партнёрам 7 %', stages: ['L1-9', 'L1-10'], about: 'Керамогранит, плитка, сантехника. Выставочный зал 900 м², доставка по краю.' },
    { id: 's2', kind: 'store', name: 'Паркет Холл', city: 'Краснодар', tags: ['flooring', 'doors'], rating: 4.7, reviews: 58, price: 'Скидка партнёрам 5 %', stages: ['L1-9', 'L1-10'], about: 'Инженерная доска, паркет, ламинат, межкомнатные двери под заказ.' },
    { id: 's3', kind: 'store', name: 'Электромир', city: 'Краснодар', tags: ['electrical', 'lighting'], rating: 4.6, reviews: 74, price: 'Скидка партнёрам 10 %', stages: ['L1-7', 'L1-10'], about: 'Кабель, щитовое оборудование, розетки, светильники. Подбор по проекту.' },
    { id: 's4', kind: 'store', name: 'Стройбаза Кубань', city: 'Краснодар', tags: ['building', 'tools', 'insulation'], rating: 4.5, reviews: 201, price: 'Скидка партнёрам 4 %', stages: ['L1-8', 'L1-5', 'L1-3'], about: 'Смеси, ГКЛ, профиль, утеплитель, инструмент. Отгрузка день в день.' },
    { id: 's5', kind: 'store', name: 'Дом красок', city: 'Краснодар', tags: ['paint', 'wallpaper'], rating: 4.9, reviews: 41, price: 'Скидка партнёрам 8 %', stages: ['L1-9'], about: 'Колеровка, обои, декоративная штукатурка. Выкрасы бесплатно.' },
    { id: 's6', kind: 'store', name: 'Оптовик', city: 'Краснодар', tags: ['doors', 'handles'], rating: 4.9, reviews: 164, price: 'Скидка клиентам RemCard 10 %', stages: ['L1-10'], about: 'Межкомнатные и входные двери Tandoor, фурнитура, погонаж. Шесть филиалов в Краснодаре и Новороссийске. Каталог обновляется из 1С каждый день.' },
    { id: 'c1', kind: 'company', name: 'РемСтройПроект', city: 'Краснодар', tags: ['renovation', 'engineering', 'finishing'], rating: 4.8, reviews: 27, years: 14, price: 'от 22 000 ₽/м²', stages: ['L1-4', 'L1-5', 'L1-7', 'L1-8', 'L1-9', 'L1-10'], about: 'Ремонт квартир под ключ с договором, сметой и графиком. Еженедельные отчёты.' },
    { id: 'c2', kind: 'company', name: 'Кубань Дом', city: 'Краснодар', tags: ['construction'], rating: 4.7, reviews: 19, years: 11, price: 'от 45 000 ₽/м²', stages: ['L1-3', 'L1-5', 'L1-6'], about: 'Строительство частных домов: газобетон, каркас. Проект, фундамент, коробка, кровля.' },
    { id: 'p9', kind: 'specialist', name: 'Армен Саркисян', city: 'Краснодар', tags: ['masonry', 'foundation', 'construction'], rating: 4.9, reviews: 41, years: 18, price: 'от 3 200 ₽/м³', stages: ['L1-3', 'L1-5'], about: 'Кладка газобетона и кирпича, армопояса, перекрытия. Своя бригада 4 человека, работаем по проекту с фотоотчётом.' },
    { id: 'p10', kind: 'specialist', name: 'Виктор Лях', city: 'Краснодар', tags: ['roofing', 'facade'], rating: 4.8, reviews: 36, years: 14, price: 'от 650 ₽/м²', stages: ['L1-6'], about: 'Стропильные системы, металлочерепица, гибкая черепица, водосток. Утепление и мокрый фасад.' },
    { id: 'p11', kind: 'specialist', name: 'Олег Дрозд', city: 'Краснодар', tags: ['paving', 'fence', 'welding'], rating: 4.9, reviews: 52, years: 11, price: 'от 2 600 ₽/м²', stages: ['L1-12'], about: 'Тротуарная плитка с правильным основанием, бетонные площадки, заборы и откатные ворота. Гарантия 3 года на просадки.' },
    { id: 'p12', kind: 'specialist', name: 'Наталья Гусева', city: 'Краснодар', tags: ['landscape', 'gardening'], rating: 5.0, reviews: 28, years: 9, price: 'от 7 000 ₽/сотка', stages: ['L1-12'], about: 'Ландшафтный проект, дендроплан, автополив, рулонный газон и посадки. Веду участок первый сезон.' },
    { id: 's7', kind: 'store', name: 'Кубань Кирпич', city: 'Краснодар', tags: ['brick', 'building', 'metal'], rating: 4.7, reviews: 96, price: 'Скидка клиентам RemCard 5 %', stages: ['L1-5', 'L1-3'], about: 'Кирпич, газобетон, керамоблок, арматура, пиломатериалы. Доставка манипулятором, разгрузка на участке.' },
    { id: 's8', kind: 'store', name: 'Нерудные материалы Юг', city: 'Краснодар', tags: ['bulk', 'building'], rating: 4.6, reviews: 143, price: 'Скидка клиентам RemCard 4 %', stages: ['L1-3', 'L1-12'], about: 'Песок, щебень, ПГС, отсев, чернозём, товарный бетон. Самосвалы 10–20 т, доставка день в день.' },
    { id: 's9', kind: 'store', name: 'Кровля и Фасад Центр', city: 'Краснодар', tags: ['roofing', 'facade', 'insulation'], rating: 4.8, reviews: 67, price: 'Скидка клиентам RemCard 6 %', stages: ['L1-6'], about: 'Металлочерепица, гибкая черепица, водосток, утеплитель, фасадные панели. Расчёт кровли по чертежу бесплатно.' },
    { id: 's10', kind: 'store', name: 'Ландшафт Маркет', city: 'Краснодар', tags: ['outdoor', 'garden', 'pool'], rating: 4.8, reviews: 89, price: 'Скидка клиентам RemCard 7 %', stages: ['L1-12'], about: 'Тротуарная плитка, бордюры, заборы, автополив, уличный свет, бассейны, садовая мебель и инвентарь. Шоурум с образцами мощения.' },
    { id: 's11', kind: 'store', name: 'Питомник «Южный сад»', city: 'Краснодар', tags: ['garden'], rating: 4.9, reviews: 54, price: 'Скидка клиентам RemCard 8 %', stages: ['L1-12'], about: 'Рулонный газон, саженцы, живая изгородь, плодородный грунт. Посадка и первый сезон ухода.' },
    { id: 'c4', kind: 'company', name: 'Ландшафт Бюро', city: 'Краснодар', tags: ['landscape', 'paving', 'fence', 'gardening'], rating: 4.9, reviews: 23, years: 8, price: 'от 120 000 ₽/сотка', stages: ['L1-12'], about: 'Благоустройство участков под ключ: проект, дренаж, забор, мощение, газон, свет. Договор, график, еженедельные отчёты.' },
    { id: 'c5', kind: 'company', name: 'СпецТехника 23', city: 'Краснодар', tags: ['machinery', 'foundation'], rating: 4.7, reviews: 71, years: 12, price: 'от 2 000 ₽/час', stages: ['L1-3', 'L1-12'], about: 'Экскаваторы, манипуляторы, самосвалы, бетононасос, виброплиты в аренду с оператором. Выезд в день заказа.' },
    { id: 'c6', kind: 'company', name: 'ЮгБурВод', city: 'Краснодар', tags: ['drilling', 'engineering'], rating: 4.8, reviews: 45, years: 10, price: 'от 3 000 ₽/м', stages: ['L1-3'], about: 'Бурение скважин на воду, обустройство кессона, септики и автономная канализация. Паспорт скважины и гарантия.' },
    { id: 'c7', kind: 'company', name: 'Бассейны Юга', city: 'Краснодар', tags: ['pool'], rating: 4.8, reviews: 31, years: 9, price: 'от 1,2 млн ₽/бассейн', stages: ['L1-12'], about: 'Композитные и бетонные бассейны под ключ: котлован, чаша, оборудование, подогрев, накрытия. Сервис после запуска.' },
    { id: 'c3', kind: 'company', name: 'Климат Сервис', city: 'Краснодар', tags: ['climate', 'engineering'], rating: 4.9, reviews: 88, years: 9, price: 'от 35 000 ₽/система', stages: ['L1-7'], about: 'Кондиционирование, вентиляция, рекуперация. Проектирование и монтаж.' },
  ];

  const kinds = { specialist: 'Специалист', store: 'Магазин', company: 'Компания' };

  if (!window.RC_R(2)) est.objectTypes = est.objectTypes.filter((t) => t.id !== 'yard'); // «Участок и двор» — релиз 2

  /** Населённый пункт: пресеты из cities + произвольный (расчёт всегда по базе Краснодара). */
  const locality = (() => {
    const CUSTOM = '__custom__';
    const strip = (s) => String(s || '').replace(/[\s\u00a0]+/g, ' ').trim();
    const isCustom = (inp) => !!(inp && inp.city === CUSTOM);
    const validateName = (raw) => {
      const value = strip(raw);
      if (value.length < 2) return { ok: false, msg: 'Введите название от 2 символов' };
      if (value.length > 100) return { ok: false, msg: 'Не больше 100 символов' };
      if (/[<>&]/.test(value)) return { ok: false, msg: 'Недопустимые символы' };
      return { ok: true, value };
    };
    const validateRegion = (raw) => {
      const value = strip(raw);
      if (!value) return { ok: true, value: '' };
      if (value.length > 100) return { ok: false, msg: 'Регион — не больше 100 символов' };
      if (/[<>&]/.test(value)) return { ok: false, msg: 'Недопустимые символы' };
      return { ok: true, value };
    };
    const pricingCity = (cities, inp) => {
      const id = isCustom(inp) ? 'krasnodar' : (inp && inp.city) || 'krasnodar';
      return cities.find((c) => c.id === id) || cities.find((c) => c.id === 'krasnodar') || cities[0];
    };
    const displayLabel = (inp, cities) => {
      if (isCustom(inp)) {
        const n = strip(inp.localityName);
        const r = strip(inp.localityRegion);
        if (!n) return 'Населённый пункт';
        return r ? `${n}, ${r}` : n;
      }
      const c = cities.find((x) => x.id === (inp && inp.city));
      return c ? c.label : 'Краснодар';
    };
    const cityStepValid = (inp, cities) => {
      if (!inp || !inp.city) return false;
      if (isCustom(inp)) return validateName(inp.localityName).ok && validateRegion(inp.localityRegion).ok;
      return cities.some((c) => c.id === inp.city);
    };
    const CAVEAT =
      'Для этого населённого пункта расчёт ориентировочный, по базовым ценам Краснодара. Местные цены могут отличаться.';
    const snapshot = (inp) => ({
      city: inp.city,
      localityName: isCustom(inp) ? strip(inp.localityName) : '',
      localityRegion: isCustom(inp) ? strip(inp.localityRegion) : '',
    });
    const toInputFields = (snap) => ({
      city: snap && snap.city ? snap.city : 'krasnodar',
      localityName: (snap && snap.localityName) || '',
      localityRegion: (snap && snap.localityRegion) || '',
    });
    return {
      CUSTOM,
      strip,
      isCustom,
      validateName,
      validateRegion,
      pricingCity,
      displayLabel,
      cityStepValid,
      CAVEAT,
      snapshot,
      toInputFields,
    };
  })();

  return { ALL, est, locality, expensePresets, expenseCats, roomStages, stageLinks, levels, achievements, savingTips, commonMistakes, specializations, storeCategories, partners, kinds };
})();
