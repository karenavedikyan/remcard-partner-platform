import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { buildPartnerModels, defaultPublicationState } from "./models";
import { optovikFixtureProducts } from "./fixtures";
import { isPartnerCatalogOwner } from "./gate";
import type { PartnerCatalogSnapshot } from "./api";
import type {
  NavigatorCabinetListResponse,
  NavigatorCabinetModelRow,
  NavigatorPublicListResponse,
} from "./navigator-types";
import type { CatalogProductRaw } from "./types";
import type { CatalogListUiAccess } from "./catalog-access";
import { catalogUiAccessFromNavigator } from "./catalog-access";
import type { NavigatorCatalogAccessResponse } from "./navigator-types";

function overlayRowOnProduct(p: CatalogProductRaw, row: NavigatorCabinetModelRow): CatalogProductRaw {
  return {
    ...p,
    price: row.sitePrice ?? p.price,
    name: row.name || p.name,
    imgs: row.thumbUrl ? [row.thumbUrl, ...p.imgs.filter((x) => x !== row.thumbUrl)] : p.imgs,
  };
}

function publicationFromRows(rows: NavigatorCabinetModelRow[]) {
  const pub = defaultPublicationState();
  rows.forEach((row) => {
    if (row.status === "hidden") pub.hidden.add(row.id);
  });
  return pub;
}

function mergeFixtureProducts(rows: NavigatorCabinetModelRow[]): CatalogProductRaw[] {
  const fixtures = optovikFixtureProducts();
  const byId = new Map(fixtures.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const merged: CatalogProductRaw[] = [];

  for (const row of rows) {
    const base = byId.get(row.id);
    if (base) {
      merged.push(overlayRowOnProduct(base, row));
      seen.add(row.id);
    }
  }

  for (const p of fixtures) {
    if (!seen.has(p.id)) merged.push(p);
  }

  return merged;
}

export type AdaptCabinetOptions = {
  proContext: ProContextSnapshot | null;
  access: NavigatorCatalogAccessResponse | null;
  branchFilter?: string;
};

/** Single mapping Navigator cabinet list → UI snapshot (fixtures enrich SKU/detail). */
export function adaptNavigatorCabinetList(
  dto: NavigatorCabinetListResponse,
  opts: AdaptCabinetOptions,
): PartnerCatalogSnapshot {
  const products = mergeFixtureProducts(dto.models);
  let models = buildPartnerModels(products);

  const uiAccess = catalogUiAccessFromNavigator(opts.access, opts.proContext, opts.branchFilter ?? "");
  if (!uiAccess.canSeeOwnerEconomics) {
    models = models.map((m) => ({ ...m, cost: null }));
  } else {
    models = models.map((m) => {
      const row = dto.models.find((r) => r.id === m.id);
      const purchase = row?.owner?.purchasePrice;
      if (purchase == null) return m;
      return { ...m, cost: purchase };
    });
  }

  const manage = isPartnerCatalogOwner(opts.proContext);
  const publication = publicationFromRows(dto.models);
  const priceType = dto.settings?.sitePriceType?.trim() || "РРЦ Тандор";

  return {
    models,
    publication,
    manage,
    priceType,
    access: uiAccess,
    source: "navigator" as const,
  };
}

export function adaptNavigatorPublicList(dto: NavigatorPublicListResponse): {
  settings: { priceType: string };
  itemIds: string[];
} {
  return {
    settings: { priceType: dto.settings?.sitePriceType?.trim() || "РРЦ Тандор" },
    itemIds: dto.items.map((i) => i.modelId || i.id),
  };
}

export function fixtureNavigatorCabinetListSample(): NavigatorCabinetListResponse {
  return {
    models: [
      {
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
      },
      {
        id: "p010",
        name: "Гранд-4",
        chapter: "Межкомнатные двери",
        brand: "Тандор",
        unit: "полотно",
        status: "hidden",
        sitePrice: 9890,
        thumbUrl: null,
        stockLabel: "Под заказ",
        stockSub: "",
        branchCount: 6,
        branchTotal: 6,
      },
    ],
    meta: {
      counts: { live: 18, hidden: 2, nophoto: 0, noprice: 0 },
      branches: [],
      isOwner: true,
    },
    settings: { sitePriceType: "РРЦ Тандор", stockDisplayMode: "STATUS" },
  };
}

export { type CatalogListUiAccess };