export type CatalogAvail = "in" | "soon" | "order";

export type CatalogProductRaw = {
  id: string;
  cat: string;
  name: string;
  variant?: string;
  price: number | null;
  oldPrice?: number | null;
  unit: string;
  imgs: string[];
  seller: string;
  sizes?: string[];
  colors?: string[];
  specs?: Record<string, string>;
  avail: CatalogAvail;
  tags?: string[];
  desc?: string;
  brand?: string;
  supplierOnly?: boolean;
};

export type SkuStockState = "in" | "zero" | "unknown";

export type CatalogSku = {
  key: string;
  name1c: string;
  size: string;
  color: string;
  price: number | null;
  stock: number | null;
  guid: string;
  art: string;
  state: SkuStockState;
  props: Record<string, string>;
  text: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  section: string;
  group: string;
  brand: string;
  price: number | null;
  flags: Set<string>;
  skus: CatalogSku[];
  raw: CatalogProductRaw;
};

export type FilterState = {
  q: string;
  section: string;
  group: string;
  brand: string[];
  min: string;
  max: string;
  avail: string[];
  marks: string[];
  sort: string;
  facets: Record<string, string[]>;
};

export type ModelStatusCode = "live" | "hidden" | "nophoto" | "noprice";

export type PartnerCatalogModel = {
  id: string;
  cat: string;
  name: string;
  variant: string;
  section: string;
  group: string;
  brand: string;
  price: number | null;
  oldPrice: number | null;
  cost: number | null;
  unit: string;
  imgs: string[];
  specs: Record<string, string>;
  desc: string;
  skus: CatalogSku[];
  item: CatalogItem;
  onSite: boolean;
  supplier: null;
};

export type CatalogAudience = "partner" | "client";

export type PublicCatalogProduct = Omit<PartnerCatalogModel, "cost"> & {
  sellerName: string;
};