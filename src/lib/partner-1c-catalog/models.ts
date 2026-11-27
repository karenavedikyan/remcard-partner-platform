import { BRANCH_IDS, BRANCHES, LOW_MARKUP } from "./constants";
import { itemOf } from "./lk-items";
import { hash } from "./text";
import { rub } from "./text";
import type {
  CatalogProductRaw,
  ModelStatusCode,
  PartnerCatalogModel,
  PublicCatalogProduct,
} from "./types";

export type PublicationState = {
  hidden: Set<string>;
  branchOff: Map<string, Set<number>>;
  branchPrice: Map<string, Record<number, number>>;
  branchPct: number[];
};

export function defaultPublicationState(): PublicationState {
  return {
    hidden: new Set(),
    branchOff: new Map(),
    branchPrice: new Map(),
    branchPct: BRANCHES.map(() => 0),
  };
}

function demoCost(p: CatalogProductRaw): number | null {
  if (p.price == null || hash(`nocost:${p.id}`) % 31 === 0) return null;
  return Math.max(10, Math.round((p.price * (0.56 + (hash(`cost:${p.id}`) % 30) / 100)) / 10) * 10);
}

export function buildPartnerModels(products: CatalogProductRaw[]): PartnerCatalogModel[] {
  return products.map((p) => {
    const item = itemOf(p);
    const cost = demoCost(p);
    return {
      id: p.id,
      cat: p.cat,
      name: p.name,
      variant: p.variant || "",
      section: item.section,
      group: item.group,
      brand: item.brand,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      cost,
      unit: p.unit,
      imgs: p.imgs || [],
      specs: p.specs || {},
      desc: p.desc || "",
      skus: item.skus,
      item,
      onSite: !String(p.id).startsWith("x") && p.imgs.length > 0 && p.price != null,
      supplier: null,
    };
  });
}

export function modelIssues(m: PartnerCatalogModel): ModelStatusCode[] {
  return [
    m.price == null ? "noprice" : null,
    m.imgs.length ? null : "nophoto",
  ].filter(Boolean) as ModelStatusCode[];
}

export function modelStatus(
  pub: PublicationState,
  m: PartnerCatalogModel,
): ModelStatusCode {
  const issues = modelIssues(m);
  if (issues[0]) return issues[0];
  return pub.hidden.has(m.id) ? "hidden" : "live";
}

export function presentIn(pub: PublicationState, m: PartnerCatalogModel): number[] {
  return BRANCH_IDS.filter((i) => !pub.branchOff.get(m.id)?.has(i));
}

export function rulePrice(pub: PublicationState, m: PartnerCatalogModel, i: number): number | null {
  if (m.price == null) return null;
  const pct = pub.branchPct[i] ?? 0;
  return pct
    ? Math.max(10, Math.round((m.price * (1 + pct / 100)) / 10) * 10)
    : m.price;
}

export function branchPrice(
  pub: PublicationState,
  m: PartnerCatalogModel,
  i: number,
): number | null {
  return pub.branchPrice.get(m.id)?.[i] ?? rulePrice(pub, m, i);
}

export function priceIn(
  pub: PublicationState,
  m: PartnerCatalogModel,
  branchFilter: string,
): number | null {
  if (branchFilter === "") return m.price;
  return branchPrice(pub, m, Number(branchFilter));
}

export function branchRange(pub: PublicationState, m: PartnerCatalogModel) {
  if (m.price == null) return null;
  const ps = presentIn(pub, m)
    .map((i) => branchPrice(pub, m, i))
    .filter((v): v is number => v != null);
  if (!ps.length) return null;
  const lo = Math.min(...ps);
  const hi = Math.max(...ps);
  return lo !== m.price || hi !== m.price ? { lo, hi } : null;
}

export type Markup = { rub: number; pct: number; room: number };

export function markup(price: number | null, cost: number | null): Markup | null {
  if (price == null || !cost) return null;
  return {
    rub: price - cost,
    pct: Math.round(((price - cost) / cost) * 100),
    room: Math.max(0, Math.floor(((price - cost) / price) * 100)),
  };
}

export function mkTone(mk: Markup): "bad" | "low" | "ok" {
  if (mk.pct < 0) return "bad";
  if (mk.pct < LOW_MARKUP) return "low";
  return "ok";
}

export function mkPct(mk: Markup) {
  return `${mk.pct < 0 ? "−" : ""}${Math.abs(mk.pct)} %`;
}

export function isLowMarkup(pub: PublicationState, m: PartnerCatalogModel, branch: string): boolean {
  const mk = markup(priceIn(pub, m, branch), m.cost);
  return !!mk && mk.pct < LOW_MARKUP;
}

export function stockOf(m: PartnerCatalogModel) {
  const known = m.skus.filter((k) => k.stock != null);
  if (!known.length) return { text: "Под заказ", sub: "остатка в 1С нет" };
  const total = known.reduce((a, k) => a + (k.stock ?? 0), 0);
  return total
    ? {
        text: `${total.toLocaleString("ru-RU")} шт`,
        sub: known.length < m.skus.length ? "по части вариантов нет данных" : "в наличии",
      }
    : { text: "Нет в наличии", sub: "ожидается поступление" };
}

/** Branch stock demo: split summed KNOWN variant stock across branches (prototype parity). */
export function branchStock(m: PartnerCatalogModel, branchIndex: number): number | null {
  const known = m.skus.filter((k) => k.stock != null);
  if (!known.length) return null;
  const total = known.reduce((a, k) => a + (k.stock ?? 0), 0);
  const w = BRANCH_IDS.map((j) => 1 + (hash(`${m.id}:${j}`) % 5));
  const sum = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => Math.floor((total * x) / sum));
  parts[0] += total - parts.reduce((a, b) => a + b, 0);
  return parts[branchIndex] ?? null;
}

/** Client-facing list: published live models only, cost stripped. */
export function toPublicProducts(
  models: PartnerCatalogModel[],
  pub: PublicationState,
  sellerName: string,
): PublicCatalogProduct[] {
  return models
    .filter((m) => modelStatus(pub, m) === "live")
    .map(({ cost: _cost, ...rest }) => ({ ...rest, sellerName }));
}

export function formatPriceLine(price: number | null, unit: string): string {
  if (price == null) return "Цена по запросу";
  return `${rub(price)} / ${unit}`;
}