import { BRANCH_IDS, BRANCHES, LOW_MARKUP } from "./constants";
import { itemOf } from "./lk-items";
import { hash } from "./text";
import { num, rub } from "./text";
import type {
  BranchApiStock,
  CatalogProductRaw,
  ModelStatusCode,
  PartnerCatalogModel,
  PublicCatalogProduct,
} from "./types";
import type { NavigatorCabinetModelBranch } from "./navigator-types";

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

function parseCabinetBranchIndexFromId(branchId: string): number | null {
  const match = /(?:^|[-_])(\d+)$/.exec(branchId.trim());
  if (!match) return null;
  const idx = Number(match[1]);
  if (!Number.isInteger(idx) || idx < 0 || idx >= BRANCHES.length) return null;
  return idx;
}

function parseCabinetBranchIndexFromAddress(branch: NavigatorCabinetModelBranch): number | null {
  const addr = (branch.address ?? "").trim().toLowerCase();
  const city = (branch.city ?? "").trim().toLowerCase();
  if (!addr && !city) return null;
  const line = city && addr ? `${city}, ${addr}` : city || addr;
  for (let i = 0; i < BRANCHES.length; i++) {
    const cabinet = BRANCHES[i]!.toLowerCase();
    if (cabinet === line) return i;
    if (addr && cabinet.includes(addr)) return i;
  }
  return null;
}

export function cabinetBranchIndexFromNavigatorBranch(
  branch: NavigatorCabinetModelBranch,
): number | null {
  return (
    parseCabinetBranchIndexFromId(branch.branchId) ??
    parseCabinetBranchIndexFromAddress(branch)
  );
}

function emptyCabinetBranchStocks(): BranchApiStock[] {
  return Array.from({ length: BRANCHES.length }, () => ({
    stockKind: null,
    stockQuantity: null,
    excluded: false,
  }));
}

function stockKindFromWire(kind: string | undefined): BranchApiStock["stockKind"] {
  if (kind === "KNOWN" || kind === "ZERO" || kind === "UNKNOWN") return kind;
  return null;
}

/** Map navigator detail branches[] onto fixed cabinet branch order (by branchId, not response order). */
export function mapNavigatorBranchesToCabinetStock(
  branches: NavigatorCabinetModelBranch[] | undefined,
): BranchApiStock[] | null {
  if (branches === undefined) return null;
  const out = emptyCabinetBranchStocks();
  for (const branch of branches) {
    const idx = cabinetBranchIndexFromNavigatorBranch(branch);
    if (idx == null) continue;
    out[idx] = {
      stockKind: stockKindFromWire(branch.stockKind),
      stockQuantity: branch.stockQuantity ?? null,
      excluded: Boolean(branch.excluded),
    };
  }
  return out;
}

export function branchApiStockAt(
  m: PartnerCatalogModel,
  branchIndex: number,
): BranchApiStock | undefined {
  return m.branchStocksFromApi?.[branchIndex];
}

export function usesBranchStockFromApi(m: PartnerCatalogModel): boolean {
  return m.branchStocksFromApi != null;
}

/** Branch stock demo: split summed KNOWN variant stock across branches (prototype parity). */
export function branchStock(m: PartnerCatalogModel, branchIndex: number): number | null {
  if (usesBranchStockFromApi(m)) {
    const api = branchApiStockAt(m, branchIndex);
    if (!api || api.stockKind == null || api.stockKind === "UNKNOWN") return null;
    if (api.stockKind === "ZERO") return 0;
    if (api.stockKind === "KNOWN") return api.stockQuantity ?? 0;
    return null;
  }
  const known = m.skus.filter((k) => k.stock != null);
  if (!known.length) return null;
  const total = known.reduce((a, k) => a + (k.stock ?? 0), 0);
  const w = BRANCH_IDS.map((j) => 1 + (hash(`${m.id}:${j}`) % 5));
  const sum = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => Math.floor((total * x) / sum));
  parts[0] += total - parts.reduce((a, b) => a + b, 0);
  return parts[branchIndex] ?? null;
}

export function formatBranchStockLabel(
  m: PartnerCatalogModel,
  here: boolean,
  branchIndex: number,
): string {
  if (usesBranchStockFromApi(m)) {
    const api = branchApiStockAt(m, branchIndex);
    if (!here || api?.excluded) return "товар здесь не представлен";
    if (!api || api.stockKind == null || api.stockKind === "UNKNOWN") return "нет данных";
    if (api.stockKind === "ZERO") return "нет в наличии";
    if (api.stockKind === "KNOWN") {
      const qty = api.stockQuantity ?? 0;
      return qty > 0 ? `в наличии ${num(qty)} шт` : "нет в наличии";
    }
    return "нет данных";
  }
  if (!here) return "товар здесь не представлен";
  if (m.price == null) return "под заказ · остатка в 1С нет";
  const stock = branchStock(m, branchIndex);
  if (stock == null) return "под заказ · остатка в 1С нет";
  if (stock > 0) return `в наличии ${num(stock)} шт`;
  return "нет в наличии";
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