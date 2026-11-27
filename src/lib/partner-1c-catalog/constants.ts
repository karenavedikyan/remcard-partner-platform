export const SELLER_ID = "s6";
export const SELLER_NAME = "Оптовик";

export const FULL_SNAPSHOT = { positions: 4762, photos: 3835, snapshot: "19c7701c" };

export const PRICE_TYPES: [string, string][] = [
  ["РРЦ Тандор", "розничная цена для сайта"],
  ["АкционнаяЦена_Тандор_Розница", "акционная розничная"],
  ["АкционнаяЦена_Тандор_ОПТ", "внутренняя, на сайте не показывается"],
  ["Минимальная", "внутренняя, на сайте не показывается"],
  ["Минимальная Осауленко", "внутренняя, на сайте не показывается"],
  ["Минимальная Ростов", "внутренняя, на сайте не показывается"],
  ["Эксклюзив Тандор", "внутренняя, на сайте не показывается"],
];

export const PUBLIC_PRICE_TYPES = new Set(["РРЦ Тандор", "АкционнаяЦена_Тандор_Розница"]);

export const STOCK_MODES: [string, string][] = [
  ["status", "Статус: «В наличии» или «Под заказ»"],
  ["exact", "Точное количество"],
  ["none", "Не показывать"],
];

export const LOW_MARKUP = 25;
export const DISCOUNTS = [5, 10, 15, 20];

export const MODEL_STATUS: Record<
  string,
  [label: string, tone: string, icon: string]
> = {
  live: ["На сайте", "good", "eye"],
  hidden: ["Скрыт вами", "", "eye-off"],
  nophoto: ["Нет фото", "accent", "image-off"],
  noprice: ["Нет цены", "accent", "circle-alert"],
};

export const FACETS = [
  ["Цвет"],
  ["Цветовая гамма"],
  ["Покрытие"],
  ["Покрытие двери"],
  ["Материал"],
  ["Дизайн"],
  ["Вид двери"],
  ["Размер, мм"],
  ["Высота", "Высота, мм"],
  ["Длина", "Длина, мм"],
  ["Толщина", "Толщина, мм"],
  ["Сторона открывания"],
  ["Тип товара"],
  ["Тип погонажа"],
  ["Тип фурнитуры"],
  ["Толщина полотна, мм"],
  ["Толщина стали, мм"],
  ["ВХ. Терморазрыв", "Терморазрыв (входные двери)"],
  ["ВХ. По назначению", "Назначение входной двери"],
  ["ФР. Вид ручки", "Вид ручки"],
  ["ФР. Основание ручки", "Основание ручки"],
  ["ФР. Тип установки", "Тип установки фурнитуры"],
  ["ФР. Тип замка", "Тип замка"],
  ["ФР.Стиль", "Стиль фурнитуры"],
].map(([key, buyer]) => ({ key, buyer: buyer || key }));

export const FACET_KEYS = new Set(FACETS.map((f) => f.key));

export const AVAIL: [string, string, string][] = [
  ["in", "Есть остаток", "В наличии"],
  ["zero", "Нулевой остаток", "Скоро поступит"],
  ["unknown", "Остаток не определён", "Под заказ"],
];

export const MARKS: [string, string, string][] = [
  ["hit", "Хит продаж", "Хит"],
  ["new", "Новинка", "Новинки"],
  ["sale", "Акция", "Акции"],
];

export const SORTS: [string, string, string][] = [
  ["", "По умолчанию", "По умолчанию"],
  ["name", "По названию", "По названию"],
  ["price_asc", "По возрастанию цены", "Сначала дешевле"],
  ["price_desc", "По убыванию цены", "Сначала дороже"],
  ["stock", "Сначала в наличии", "Сначала в наличии"],
];

export const SECTION_ORDER = [
  "Межкомнатные двери",
  "Входные двери",
  "Фурнитура",
  "Погонаж и плинтус",
];

/** Feature flag: partner 1C catalog (default off — prod unchanged). */
export function partner1cCatalogFeatureEnabled(): boolean {
  return process.env.PARTNER_1C_CATALOG_ENABLED === "1";
}