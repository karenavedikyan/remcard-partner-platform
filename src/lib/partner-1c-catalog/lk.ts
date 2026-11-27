import { AVAIL, FACETS, MARKS, SORTS } from "./constants";
import { catalogItemsFromProducts, itemOf, sectionRank } from "./lk-items";
import { cmp, norm, num, plural } from "./text";
import type { CatalogAudience, CatalogItem, CatalogProductRaw, FilterState } from "./types";

export { catalogItemsFromProducts, itemOf, modelProps } from "./lk-items";
export type { FilterState };

export const blank = (): FilterState => ({
  q: "",
  section: "",
  group: "",
  brand: [],
  min: "",
  max: "",
  avail: [],
  marks: [],
  sort: "",
  facets: {},
});

export const copy = (st: FilterState): FilterState => ({
  ...blank(),
  ...st,
  brand: [...(st.brand || [])],
  avail: [...(st.avail || [])],
  marks: [...(st.marks || [])],
  facets: Object.fromEntries(
    Object.entries(st.facets || {})
      .filter(([k, v]) => FACETS.some((f) => f.key === k) && v.length)
      .map(([k, v]) => [k, [...v]]),
  ),
});

const words = (q: string) => norm(String(q || "").slice(0, 160)).split(" ").filter(Boolean).slice(0, 8);

export const parsePrice = (v: string): number | null => {
  const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const activeCount = (st: FilterState) =>
  (st.section ? 1 : 0) +
  st.brand.length +
  (parsePrice(st.min) != null || parsePrice(st.max) != null ? 1 : 0) +
  st.avail.length +
  st.marks.length +
  Object.values(st.facets).reduce((a, v) => a + v.length, 0);

export const skuLevel = (st: FilterState) =>
  words(st.q).length > 0 ||
  parsePrice(st.min) != null ||
  parsePrice(st.max) != null ||
  st.avail.length > 0 ||
  Object.keys(st.facets).length > 0;

function modelPass(it: CatalogItem, st: FilterState, skip?: string): boolean {
  if (st.section && it.section !== st.section) return false;
  if (st.group && it.group !== st.group) return false;
  if (skip !== "brand" && st.brand.length && !st.brand.includes(it.brand)) return false;
  return st.marks.every((m) => (skip === `mark:${m}` ? true : it.flags.has(m)));
}

function skuPass(sku: CatalogItem["skus"][0], st: FilterState, skip: string | undefined, w: string[]) {
  if (w.length && !w.every((x) => sku.text.includes(x))) return false;
  const lo = parsePrice(st.min);
  const hi = parsePrice(st.max);
  if (skip !== "price" && (lo != null || hi != null)) {
    if (sku.price == null) return false;
    if (lo != null && sku.price < lo) return false;
    if (hi != null && sku.price > hi) return false;
  }
  if (skip !== "avail" && st.avail.length && !st.avail.includes(sku.state)) return false;
  return Object.entries(st.facets).every(
    ([key, vals]) => skip === `f:${key}` || !vals.length || vals.includes(sku.props[key] ?? ""),
  );
}

export function matched(it: CatalogItem, st: FilterState, skip?: string) {
  if (!modelPass(it, st, skip)) return [];
  const w = words(st.q);
  return it.skus.filter((k) => skuPass(k, st, skip, w));
}

export type ApplyRow = { item: CatalogItem; index: number; matched: CatalogItem["skus"] };

export function apply(list: CatalogItem[], st: FilterState): ApplyRow[] {
  const rows = list
    .map((it, index) => ({ item: it, index, matched: matched(it, st) }))
    .filter((r) => r.matched.length);
  const inStock = (r: ApplyRow) =>
    r.matched.some((k) => k.state === "in")
      ? 0
      : r.matched.some((k) => k.state === "unknown")
        ? 1
        : 2;
  const p = (r: ApplyRow) => (r.item.price == null ? Infinity : r.item.price);
  const comparators: Record<
    string,
    ((a: ApplyRow, b: ApplyRow) => number) | undefined
  > = {
    name: (a, b) => cmp(a.item.name, b.item.name),
    price_asc: (a, b) => p(a) - p(b) || cmp(a.item.name, b.item.name),
    price_desc: (a, b) =>
      (b.item.price ?? -1) - (a.item.price ?? -1) || cmp(a.item.name, b.item.name),
    stock: (a, b) => inStock(a) - inStock(b) || a.index - b.index,
  };
  const by = comparators[st.sort];
  if (by) rows.sort(by);
  return rows;
}

export function options(list: CatalogItem[], st: FilterState) {
  const scope = list.filter(
    (it) => (!st.section || it.section === st.section) && (!st.group || it.group === st.group),
  );
  const count = (skip: string, test: (k: CatalogItem["skus"][0]) => boolean) =>
    list.filter((it) => matched(it, st, skip).some(test)).length;
  const sectionState = { ...st, section: "", group: "" };
  const inSection = list.filter((it) => matched(it, sectionState).length);
  const sections = [...new Set(list.map((it) => it.section))]
    .sort((a, b) => sectionRank(a) - sectionRank(b) || cmp(a, b))
    .map((name) => ({
      name,
      count: inSection.filter((it) => it.section === name).length,
      groups: [...new Set(list.filter((it) => it.section === name && it.group).map((it) => it.group))]
        .sort(cmp)
        .map((g) => ({
          name: g,
          count: inSection.filter((it) => it.section === name && it.group === g).length,
        })),
    }));
  const brands = [...new Set(scope.map((it) => it.brand).filter(Boolean))]
    .sort(cmp)
    .map((value) => ({
      value,
      count: list.filter((it) => it.brand === value && matched(it, st, "brand").length).length,
    }));
  const avail = AVAIL.filter(([code]) =>
    scope.some((it) => it.skus.some((k) => k.state === code)),
  ).map(([code]) => ({
    value: code,
    count: count("avail", (k) => k.state === code),
  }));
  const marks = MARKS.filter(([code]) => scope.some((it) => it.flags.has(code))).map(([code]) => ({
    value: code,
    count: list.filter((it) => it.flags.has(code) && matched(it, st, `mark:${code}`).length).length,
  }));
  const facets = FACETS.map((f) => ({
    key: f.key,
    buyer: f.buyer,
    values: [...new Set(scope.flatMap((it) => it.skus.map((k) => k.props[f.key]).filter(Boolean)))]
      .sort(cmp)
      .map((value) => ({
        value,
        count: count(`f:${f.key}`, (k) => k.props[f.key] === value),
      })),
  })).filter((f) => f.values.length);
  const prices = scope.flatMap((it) => it.skus.map((k) => k.price)).filter((v): v is number => v != null);
  return {
    sections,
    brands,
    avail,
    marks,
    facets,
    price: prices.length ? { lo: Math.min(...prices), hi: Math.max(...prices) } : null,
  };
}

export function summary(rows: ApplyRow[]) {
  const variants = rows.reduce((a, r) => a + r.matched.length, 0);
  const total = rows.reduce((a, r) => a + r.item.skus.length, 0);
  return {
    models: rows.length,
    variants,
    total,
    text: `${rows.length} ${plural(rows.length, "модель", "модели", "моделей")} · ${
      variants === total
        ? `${variants} ${plural(variants, "вариант", "варианта", "вариантов")}`
        : `подходит ${variants} из ${total} ${plural(total, "варианта", "вариантов", "вариантов")}`
    }`,
  };
}

const label = (key: string, audience: CatalogAudience) => {
  const f = FACETS.find((x) => x.key === key);
  return !f ? key : audience === "client" ? f.buyer : f.key;
};

const availLabel = (code: string, audience: CatalogAudience) => {
  const a = AVAIL.find((x) => x[0] === code);
  return a ? a[audience === "client" ? 2 : 1] : code;
};

const markLabel = (code: string) => (MARKS.find((x) => x[0] === code) || [])[2] || code;

export function chips(st: FilterState, audience: CatalogAudience) {
  const out: { id: string; text: string }[] = [];
  if (st.section)
    out.push({ id: "section", text: st.group ? `${st.section} · ${st.group}` : st.section });
  st.brand.forEach((v) => out.push({ id: `brand:${v}`, text: `Бренд: ${v}` }));
  const lo = parsePrice(st.min);
  const hi = parsePrice(st.max);
  if (lo != null || hi != null)
    out.push({
      id: "price",
      text: `Цена: ${lo != null ? `от ${num(lo)}` : ""}${lo != null && hi != null ? " " : ""}${hi != null ? `до ${num(hi)}` : ""} ₽`,
    });
  st.avail.forEach((v) => out.push({ id: `avail:${v}`, text: availLabel(v, audience) }));
  st.marks.forEach((v) => out.push({ id: `mark:${v}`, text: markLabel(v) }));
  Object.entries(st.facets).forEach(([key, vals]) =>
    vals.forEach((v) => out.push({ id: `f:${key}:${v}`, text: `${label(key, audience)}: ${v}` })),
  );
  return out;
}

export function removeChip(st: FilterState, id: string): FilterState {
  const next = copy(st);
  const [kind, ...rest] = id.split(":");
  const tail = rest.join(":");
  const drop = (arr: string[], v: string) => arr.filter((x) => x !== v);
  if (kind === "section") {
    next.section = "";
    next.group = "";
  }
  if (kind === "brand") next.brand = drop(next.brand, tail);
  if (kind === "price") {
    next.min = "";
    next.max = "";
  }
  if (kind === "avail") next.avail = drop(next.avail, tail);
  if (kind === "mark") next.marks = drop(next.marks, tail);
  if (kind === "f") {
    const key = [...FACETS.map((f) => f.key)].find((k) => tail.startsWith(`${k}:`));
    if (key) {
      const left = drop(next.facets[key] || [], tail.slice(key.length + 1));
      if (left.length) next.facets[key] = left;
      else delete next.facets[key];
    }
  }
  return next;
}

export function prune(list: CatalogItem[], st: FilterState): FilterState {
  const next = copy(st);
  const o = options(list, next);
  const sec = o.sections.find((x) => x.name === next.section);
  if (next.section && !sec) {
    next.section = "";
    next.group = "";
  }
  if (next.group && !(sec?.groups || []).some((g) => g.name === next.group)) next.group = "";
  next.brand = next.brand.filter((v) => o.brands.some((x) => x.value === v));
  next.avail = next.avail.filter((v) => o.avail.some((x) => x.value === v));
  next.marks = next.marks.filter((v) => o.marks.some((x) => x.value === v));
  Object.keys(next.facets).forEach((key) => {
    const f = o.facets.find((x) => x.key === key);
    const left = f ? next.facets[key]!.filter((v) => f.values.some((x) => x.value === v)) : [];
    if (left.length) next.facets[key] = left;
    else delete next.facets[key];
  });
  return next;
}

export function sectionValue(st: FilterState) {
  return st.group ? `${st.section}/${st.group}` : st.section;
}

export function parseSection(v: string) {
  const [section, group = ""] = String(v || "").split("/");
  return { section, group };
}

export function sectionOptions(
  o: ReturnType<typeof options>,
  st: FilterState,
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [{ value: "", label: "Все разделы" }];
  o.sections.forEach((s) => {
    out.push({
      value: s.name,
      label: `${s.name} · ${s.count}`,
    });
    s.groups.forEach((g) => {
      out.push({
        value: `${s.name}/${g.name}`,
        label: `— ${g.name} · ${g.count}`,
      });
    });
  });
  return out;
}

export function itemsFromProducts(products: CatalogProductRaw[]) {
  return catalogItemsFromProducts(products);
}

export { SORTS, MARKS, AVAIL, FACETS };