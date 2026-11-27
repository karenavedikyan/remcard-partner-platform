/* Заявка на статус поставщика (прототип): общие справочники для кабинета партнёра и кабинета администратора RemCard.
   Партнёр, который ведёт каталог, подаёт заявку отдельно от публикации каталога на сайте. Администрация проверяет её по категориям;
   после одобрения поставщик виден партнёрам, которые продают товары или оказывают услуги в одобренных категориях.
   Все данные демонстрационные, расчёт с поставщиком идёт по его счёту вне RemCard: кошелёк и взаиморасчёты RemCard не затрагиваются. */
(() => {
  const ROLES = [
    { id: "maker", label: "Производитель", hint: "Собственное производство", proof: true, icon: "factory" },
    { id: "official", label: "Официальный дистрибьютор бренда", hint: "Есть договор дистрибуции с производителем", proof: true, icon: "badge-check" },
    { id: "regional", label: "Региональный дистрибьютор", hint: "Поставляете в регионе от нескольких производителей", proof: false, icon: "truck" },
    { id: "wholesale", label: "Оптовый поставщик или дилер", hint: "Закупаете партиями и продаёте партнёрам", proof: false, icon: "warehouse" },
    { id: "service", label: "Услуги для партнёров", hint: "Монтаж, доставка, замеры для клиентов партнёров", proof: false, icon: "hammer" },
  ];
  /* Категории партнёров в RemCard и число партнёров сети в каждой (демо; в кабинете администратора считается по реестру). */
  /* Справочник категорий как при регистрации партнёра: товары и услуги (демо-числа партнёров сети; «Погонаж» оставлен для каталога Тандора). */
  const CATS_GOODS = [
    ["doors", "Двери", 22],
    ["tiles", "Плитка", 22],
    ["plumbing", "Сантехника", 21],
    ["electrical", "Электротовары", 6],
    ["flooring", "Напольные покрытия", 23],
    ["paint", "Краска / ЛКМ", 12],
    ["wallpaper", "Обои", 21],
    ["lighting", "Освещение", 23],
    ["furniture", "Мебель", 19],
    ["kitchen", "Кухни", 22],
    ["tools", "Инструменты", 13],
    ["hardware", "Фурнитура и замки", 14],
    ["trim", "Погонаж", 9],
    ["windows", "Окна", 21],
    ["curtains", "Шторы", 5],
    ["construction", "Стройматериалы", 15],
    ["garden", "Сад и огород", 9],
    ["heating", "Водоснабжение и отопление", 4],
    ["bath_sauna", "Бани и сауны", 9],
    ["pools", "Бассейны", 8],
    ["textile", "Текстиль для дома", 8],
    ["ceilings", "Потолки", 3],
    ["decor", "Декор", 12],
    ["gates", "Ворота", 19],
    ["fireplaces", "Камины", 17],
    ["smart_home", "Умный дом", 7],
    ["climate", "Климат", 16],
  ];
  const CATS_SERVICES = [
    ["svc:tiles", "Плитка", 5],
    ["svc:flooring", "Напольные покрытия", 6],
    ["svc:doors", "Двери", 15],
    ["svc:plumbing", "Сантехника", 3],
    ["svc:electrical", "Электрика", 14],
    ["svc:painting", "Покраска и штукатурка", 13],
    ["svc:ceilings", "Потолки", 5],
    ["svc:demolition", "Демонтаж", 3],
    ["svc:design", "Дизайн интерьера", 9],
    ["svc:landscape", "Ландшафтный дизайн", 10],
    ["svc:appraisal", "Оценка недвижимости", 15],
    ["svc:planning", "Планирование", 4],
    ["svc:rough", "Черновые работы", 13],
    ["svc:engineering", "Инженерные работы", 10],
    ["svc:finishing", "Чистовая отделка", 9],
    ["svc:renovation", "Ремонт под ключ", 4],
    ["svc:safety", "Безопасность", 10],
    ["svc:kitchen", "Кухни и мебель", 5],
    ["svc:windows", "Окна и балконы", 10],
    ["svc:climate", "Кондиционирование", 15],
    ["svc:construction", "Строительство", 9],
    ["svc:furniture", "Сборка мебели", 5],
  ];
  const CATS = [...CATS_GOODS, ...CATS_SERVICES];
  const ALIAS = { tile: "tiles", light: "lighting", floor: "flooring", wall: "wallpaper" };
  const catsFor = (role) => (role === "service" ? CATS_SERVICES : CATS_GOODS);
  const FLAGS = [["stock", "Есть склад"], ["order", "Работаю под заказ"], ["delivery", "Доставка по региону"], ["install", "Монтаж и услуги"]];
  const GEO = [["city", "Только мой город"], ["region", "Край или область"], ["south", "Юг России"], ["ru", "Вся Россия"]];
  const DELIV = [["pickup", "Самовывоз со склада"], ["city", "Доставка по городу"], ["tk", "Транспортной компанией"]];
  const PAY = [["invoice", "Оплата по счёту"], ["prepay", "Предоплата"], ["defer", "Отсрочка по договору"]];
  const PRICES = [["on-approve", "После моего подтверждения партнёра"], ["open", "Сразу после запроса"]];
  const SOURCE = [["1c", "Каталог из 1С в RemCard"], ["manual", "Загружу прайс вручную"], ["none", "Каталога пока нет, работаю по запросу"]];
  const DOCS = [["req", "Реквизиты организации"], ["proof", "Договор дистрибуции или письмо производителя"], ["price", "Прайс-лист"]];
  const STATUS = {
    none: ["Не подавали", ""],
    draft: ["Черновик", ""],
    moderation: ["На модерации", "accent"],
    clarify: ["Нужны уточнения", "accent"],
    approved: ["Одобрен", "good"],
    partial: ["Одобрен частично", "good"],
    rejected: ["Отклонён", ""],
    paused: ["Показ приостановлен", ""],
    withdrawn: ["Снят вами", ""],
  };
  const REJECT = [["docs", "Нет подтверждающих документов"], ["cat", "Категория не подходит для поставки партнёрам"], ["empty", "Нет ассортимента или условий"], ["data", "Данные не совпадают с профилем"], ["other", "Другая причина"]];
  const find = (list, id) => list.find((x) => x[0] === id) || [id, id];
  const label = (list, id) => find(list, id)[1];
  const catRow = (id) => CATS.find((c) => c[0] === (ALIAS[id] || id));
  const catName = (id) => (catRow(id) || [id, id])[1];
  const roleOf = (id) => ROLES.find((r) => r.id === id) || null;
  const reach = (ids) => ids.reduce((a, id) => a + ((catRow(id) || [0, 0, 0])[2]), 0);
  const needProof = (role) => !!roleOf(role)?.proof;
  /* Что не заполнено в заявке. Пустой список — можно отправлять. */
  function problems(f) {
    const out = [];
    if (!f.role) out.push(["role", "Выберите, кем вы работаете"]);
    if (!f.cats.length) out.push(["cats", "Отметьте хотя бы одну категорию"]);
    if (!f.geo) out.push(["geo", "Укажите, куда поставляете"]);
    if (!f.source) out.push(["source", "Укажите, откуда берётся ассортимент"]);
    if (!f.docs.req) out.push(["docs", "Приложите реквизиты организации"]);
    if (needProof(f.role) && !f.docs.proof) out.push(["docs", "Для этого статуса нужен договор дистрибуции или письмо производителя"]);
    if (!f.consent) out.push(["consent", "Нужно согласие на показ условий партнёрам"]);
    return out;
  }
  const blank = () => ({ role: "", flags: [], cats: [], brands: "", geo: "", deliv: [], pay: ["invoice"], prices: "on-approve", min: "", days: "", source: "", docs: { req: false, proof: false, price: false }, consent: false });
  const example = () => ({ role: "regional", flags: ["stock", "delivery"], cats: ["doors", "hardware"], brands: "Tandoor, Профильдорс", geo: "south", deliv: ["pickup", "city", "tk"], pay: ["invoice", "defer"], prices: "on-approve", min: "от 5 000 ₽", days: "2–4 дня", source: "1c", docs: { req: true, proof: false, price: true }, consent: false });
  globalThis.RCSupplierApp = { ROLES, CATS, CATS_GOODS, CATS_SERVICES, catsFor, FLAGS, GEO, DELIV, PAY, PRICES, SOURCE, DOCS, STATUS, REJECT, label, catName, roleOf, reach, needProof, problems, blank, example };
})();
