import { FACET_KEYS, FACETS, SECTION_ORDER } from "./constants";
import { DEMO_PROPS, DEMO_SIDES } from "./lk-props";
import { cmp, hash, norm } from "./text";
import type { CatalogItem, CatalogProductRaw, CatalogSku } from "./types";

const GAMMA: [RegExp, string][] = [
  [/снежно|бел/, "Белая"],
  [/эльбрус|капучино|беж|песок/, "Светлая"],
  [/сер|графит|никель|хром/, "Серая"],
  [/ч[её]рн|т[её]мн/, "Тёмная"],
  [/бронз|дуб|орех/, "Коричневая"],
];

function gammaOf(color: string): string {
  const c = norm(color);
  const hit = GAMMA.find(([re]) => re.test(c));
  return hit ? hit[1] : "";
}

function isEntry(p: CatalogProductRaw) {
  return p.specs?.Тип === "Входная";
}

function sectionOf(p: CatalogProductRaw): string {
  if (p.cat === "doors") return isEntry(p) ? "Входные двери" : "Межкомнатные двери";
  if (/^(Плинтус|Наличник|Добор)/.test(p.name)) return "Погонаж и плинтус";
  return "Фурнитура";
}

function groupOf(p: CatalogProductRaw): string {
  if (p.cat === "doors") return "";
  const rules: [RegExp, string][] = [
    [/^Ручка/, "Ручки"],
    [/^Замок/, "Замки"],
    [/^Петля/, "Петли"],
    [/^Плинтус/, "Плинтус"],
    [/^Наличник/, "Наличники"],
    [/^Добор/, "Доборы"],
  ];
  const hit = rules.find(([re]) => re.test(p.name));
  return hit ? hit[1] : "";
}

function skuProps(
  p: CatalogProductRaw,
  color: string,
  size: string,
  index: number,
): Record<string, string> {
  const out: Record<string, string> = { ...(DEMO_PROPS[p.id] || {}) };
  if (p.cat === "doors") {
    const height = isEntry(p)
      ? String(size).split("×")[1] || "2050"
      : String(parseInt(p.specs?.Высота ?? "", 10) || 2000);
    out.Высота = height;
    if (size) out["Размер, мм"] = isEntry(p) ? String(size).replace("×", "х") : `${height}х${size}`;
    const leaf = parseInt(p.specs?.["Толщина полотна"] ?? "", 10);
    if (leaf) out["Толщина полотна, мм"] = String(leaf);
    if (p.specs?.Сталь) out["Толщина стали, мм"] = String(p.specs.Сталь).replace(/\s*мм$/, "");
    if (DEMO_SIDES[p.id]) {
      out["Сторона открывания"] = DEMO_SIDES[p.id]![index] || DEMO_SIDES[p.id]![0]!;
    }
  }
  if (color) {
    out.Цвет = color;
    const g = gammaOf(color);
    if (g) out["Цветовая гамма"] = g;
  }
  out["Тип товара"] = p.avail === "order" ? "Заказная" : "Складская";
  Object.keys(out).forEach((k) => {
    if (!FACET_KEYS.has(k) || !String(out[k]).trim()) delete out[k];
  });
  return out;
}

function buildSkus(p: CatalogProductRaw): CatalogSku[] {
  const colors = p.colors?.length ? p.colors : [p.variant || ""];
  const sizes = p.sizes?.length ? p.sizes : [""];
  const height = parseInt(p.specs?.Высота ?? "", 10) || 2000;
  const out: CatalogSku[] = [];
  colors.forEach((color) =>
    sizes.forEach((size, index) => {
      const tail = !size
        ? ""
        : isEntry(p)
          ? ` ${size.replace("×", "*")}`
          : ` ${height}*${size}`;
      const key = `${p.id}|${color}|${size}`;
      const h = hash(key);
      const stock =
        p.avail === "order" ? null : p.avail === "soon" ? 0 : 2 + (h % 23);
      const name1c = `${p.name} ${color}${tail}`.replace(/\s+/g, " ").trim();
      out.push({
        key,
        name1c,
        size,
        color,
        price: p.price,
        stock,
        guid: h.toString(16).padStart(8, "0"),
        art: `ТД-${String(100000 + (h % 900000))}`,
        state: stock == null ? "unknown" : stock > 0 ? "in" : "zero",
        props: skuProps(p, color, size, index),
        text: "",
      });
    }),
  );
  return out;
}

const itemCache = new WeakMap<CatalogProductRaw, CatalogItem>();

export function itemOf(p: CatalogProductRaw): CatalogItem {
  const cached = itemCache.get(p);
  if (cached) return cached;
  const section = sectionOf(p);
  const group = groupOf(p);
  const brand = p.brand || "";
  const skus = buildSkus(p);
  skus.forEach((k) => {
    k.text = norm(
      [p.name, k.name1c, k.art, brand, section, group, ...Object.entries(k.props).flat()].join(
        " ",
      ),
    );
  });
  const it: CatalogItem = {
    id: p.id,
    name: p.name,
    section,
    group,
    brand,
    price: p.price,
    flags: new Set(p.tags || []),
    skus,
    raw: p,
  };
  itemCache.set(p, it);
  return it;
}

export function catalogItemsFromProducts(products: CatalogProductRaw[]): CatalogItem[] {
  return products.map(itemOf);
}

export function modelProps(it: CatalogItem): [string, string[]][] {
  return FACETS.map((f) => [
    f.key,
    [...new Set(it.skus.map((k) => k.props[f.key]).filter(Boolean))].sort(cmp),
  ]).filter(([, v]) => v.length) as [string, string[]][];
}

export function sectionRank(section: string): number {
  const i = SECTION_ORDER.indexOf(section);
  return i < 0 ? 99 : i;
}