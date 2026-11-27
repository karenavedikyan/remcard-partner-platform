import raw from "./fixtures/optovik-products.json";
import type { CatalogProductRaw } from "./types";

type FixtureFile = {
  sellerId: string;
  sellerName: string;
  products: CatalogProductRaw[];
};

const data = raw as unknown as FixtureFile;

export function optovikFixtureProducts(): CatalogProductRaw[] {
  return data.products;
}

export function optovikFixtureMeta() {
  return { sellerId: data.sellerId, sellerName: data.sellerName };
}