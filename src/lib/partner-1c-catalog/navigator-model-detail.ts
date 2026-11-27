import { buildPartnerModels, mapNavigatorBranchesToCabinetStock } from "./models";
import { optovikFixtureProducts } from "./fixtures";
import type {
  CatalogProductRaw,
  CatalogSku,
  PartnerCatalogModel,
  SkuStockState,
} from "./types";
import ownerBranchesFixture from "./fixtures/cabinet-model-detail-owner-branches.json";
import { BRANCHES } from "./constants";
import type {
  NavigatorCabinetModelBranch,
  NavigatorCabinetModelDetail,
  NavigatorCabinetModelVariant,
} from "./navigator-types";

function chapterToCat(chapter: string | null): CatalogProductRaw["cat"] {
  const c = (chapter ?? "").toLowerCase();
  if (c.includes("двер")) return "doors";
  return "hardware";
}

function stockFromVariant(v: NavigatorCabinetModelVariant): {
  state: SkuStockState;
  stock: number | null;
} {
  if (v.stockKind === "ZERO") return { state: "zero", stock: 0 };
  if (v.stockKind === "KNOWN") {
    const qty = v.stockQuantity ?? 0;
    return { state: qty > 0 ? "in" : "zero", stock: qty };
  }
  return { state: "unknown", stock: null };
}

function variantToSku(v: NavigatorCabinetModelVariant, index: number): CatalogSku {
  const props = v.properties ?? {};
  const color = props.Цвет ?? props["Цвет"] ?? "";
  const size =
    props["Размер, мм"] ?? props["Размер мм"] ?? props.Размер ?? props.Высота ?? "";
  const { state, stock } = stockFromVariant(v);
  return {
    key: v.id || `sku-${index}`,
    guid: v.id,
    name1c: v.name,
    size: String(size),
    color: String(color),
    price: v.publicPrice,
    stock,
    art: v.article ?? "",
    state,
    props,
    text: [v.name, v.article].filter(Boolean).join(" · "),
  };
}

export function catalogProductFromNavigatorDetail(
  dto: NavigatorCabinetModelDetail,
): CatalogProductRaw {
  const skus = (dto.variants ?? []).map(variantToSku);
  const colors = [...new Set(skus.map((s) => s.color).filter(Boolean))];
  const sizes = [...new Set(skus.map((s) => s.size).filter(Boolean))];
  const specs: Record<string, string> = {};
  const firstProps = dto.variants?.[0]?.properties ?? {};
  for (const [k, v] of Object.entries(firstProps)) {
    if (String(v).trim()) specs[k] = String(v);
  }

  return {
    id: dto.id,
    cat: chapterToCat(dto.chapter),
    name: dto.name,
    price: dto.sitePrice,
    unit: dto.unit ?? "шт",
    imgs: dto.thumbUrl ? [dto.thumbUrl] : [],
    seller: "optovik",
    avail: "in",
    brand: dto.brand ?? undefined,
    colors: colors.length ? colors : undefined,
    sizes: sizes.length ? sizes : undefined,
    specs,
    tags: [],
  };
}

export type AdaptModelDetailOpts = {
  manage: boolean;
};

/** Map GET .../models/{id} into a cabinet model (API variants, not fixture SKUs). */
export function adaptNavigatorCabinetModelDetail(
  dto: NavigatorCabinetModelDetail,
  opts: AdaptModelDetailOpts,
): PartnerCatalogModel {
  const raw = catalogProductFromNavigatorDetail(dto);
  let [model] = buildPartnerModels([raw]);
  const apiSkus = (dto.variants ?? []).map(variantToSku);
  if (apiSkus.length) {
    model = {
      ...model,
      skus: apiSkus,
      item: { ...model.item, skus: apiSkus },
    };
  }
  if (opts.manage && dto.owner?.purchasePrice != null) {
    model = { ...model, cost: dto.owner.purchasePrice };
  } else if (!opts.manage) {
    model = { ...model, cost: null };
  }
  if (dto.sitePrice != null) {
    model = { ...model, price: dto.sitePrice };
  }
  const brand = dto.brand?.trim() || model.brand;
  if (brand) {
    model = {
      ...model,
      brand,
      item: { ...model.item, brand },
    };
  }
  const branchStocksFromApi = mapNavigatorBranchesToCabinetStock(dto.branches);
  if (branchStocksFromApi) {
    model = { ...model, branchStocksFromApi };
  }
  return model;
}

/** Fixture fallback when navigator detail is unavailable. */
export function partnerCatalogModelFromFixture(modelId: string): PartnerCatalogModel | null {
  const product = optovikFixtureProducts().find((p) => p.id === modelId);
  if (!product) return null;
  return buildPartnerModels([product])[0] ?? null;
}

export function fixtureNavigatorCabinetModelDetailSample(): NavigatorCabinetModelDetail {
  return {
    id: "p004",
    name: "Mona-58",
    chapter: "Межкомнатные двери",
    brand: "Тандор",
    unit: "полотно",
    status: "live",
    sitePrice: 11670,
    thumbUrl: "/catalog-fixture/p004-0.webp",
    stockLabel: "В наличии",
    stockSub: "",
    branchCount: 6,
    branchTotal: 6,
    owner: { purchasePrice: 6520, markup: { pct: 79, rub: 5150, room: 44 } },
    sitePriceType: "РРЦ Тандор",
    variants: [
      {
        id: "var-p004-0",
        name: "Mona-58 Белый снежный 2000×800",
        article: "TN-MONA58-200080",
        stockKind: "KNOWN",
        stockQuantity: 12,
        publicPrice: 11670,
        properties: {
          Цвет: "Белый снежный",
          "Размер, мм": "2000х800",
          Высота: "2000",
        },
      },
      {
        id: "var-p004-1",
        name: "Mona-58 Капучино 2000×700",
        article: "TN-MONA58-200070",
        stockKind: "KNOWN",
        stockQuantity: 4,
        publicPrice: 11670,
        properties: {
          Цвет: "Капучино",
          "Размер, мм": "2000х700",
          Высота: "2000",
        },
      },
    ],
    branches: [],
  };
}

function branchFixtureIndex(branchId: string): number | null {
  const match = /(?:^|[-_])(\d+)$/.exec(branchId.trim());
  if (!match) return null;
  const idx = Number(match[1]);
  return Number.isInteger(idx) ? idx : null;
}

function reorderBranches(
  branches: NavigatorCabinetModelBranch[],
  order: number[],
): NavigatorCabinetModelBranch[] {
  const byIndex = new Map<number, NavigatorCabinetModelBranch>();
  for (const branch of branches) {
    const idx = branchFixtureIndex(branch.branchId);
    if (idx != null) byIndex.set(idx, branch);
  }
  return order.map((i) => {
    const hit = byIndex.get(i);
    if (!hit) throw new Error(`missing branch fixture for index ${i}`);
    return hit;
  });
}

/** Demo detail with per-branch stock from cabinet API contract (for tests and capture). */
export function fixtureNavigatorCabinetModelDetailWithApiBranches(
  mode: "known" | "unknown",
): NavigatorCabinetModelDetail {
  const base = fixtureNavigatorCabinetModelDetailSample();
  const fromFile = ownerBranchesFixture as NavigatorCabinetModelBranch[];
  let branches: NavigatorCabinetModelBranch[];
  if (mode === "known") {
    branches = fromFile;
  } else {
    branches = fromFile.map((b) => ({
      ...b,
      stockKind: "UNKNOWN" as const,
      stockQuantity: null,
      excluded: false,
    }));
  }
  return { ...base, branches };
}

/** Branches in reverse cabinet order — mapping must use branchId, not array index. */
export function fixtureNavigatorCabinetModelDetailShuffledBranches(): NavigatorCabinetModelDetail {
  const base = fixtureNavigatorCabinetModelDetailSample();
  const branches = reorderBranches(
    ownerBranchesFixture as NavigatorCabinetModelBranch[],
    [5, 4, 3, 2, 1, 0],
  );
  return { ...base, branches };
}

export function navigatorBranchStubsForCapture(mode: "known" | "unknown"): NavigatorCabinetModelBranch[] {
  const price = 11670;
  return BRANCHES.map((_, i) => {
    const [city, ...rest] = BRANCHES[i]!.split(", ");
    const address = rest.join(", ");
    if (mode === "unknown") {
      return {
        branchId: `optovik-branch-${i}`,
        name: `${city} · ${address}`,
        city: city!,
        address,
        excluded: false,
        adjustPercent: 0,
        rulePrice: price,
        customPrice: null,
        effectivePrice: price,
        stockKind: "UNKNOWN",
        stockQuantity: null,
      };
    }
    const row = (ownerBranchesFixture as NavigatorCabinetModelBranch[]).find((b) =>
      b.branchId.endsWith(`-${i}`),
    );
    return (
      row ?? {
        branchId: `optovik-branch-${i}`,
        name: `${city} · ${address}`,
        city: city!,
        address,
        excluded: false,
        adjustPercent: 0,
        rulePrice: price,
        customPrice: null,
        effectivePrice: price,
        stockKind: "KNOWN",
        stockQuantity: 7,
      }
    );
  });
}