/** Wire types aligned with remcard-navigator partner-products API (branch may evolve). */

export type NavigatorCabinetModelStatus = "live" | "hidden" | "nophoto" | "noprice";

export type NavigatorCabinetModelRow = {
  id: string;
  name: string;
  chapter: string | null;
  brand: string | null;
  unit: string | null;
  status: NavigatorCabinetModelStatus;
  sitePrice: number | null;
  thumbUrl: string | null;
  stockLabel: string;
  stockSub: string;
  branchCount: number;
  branchTotal: number;
  owner?: {
    purchasePrice: number | null;
    markup: { pct: number; rub?: number; room?: number } | null;
  };
};

export type NavigatorCabinetBranchOption = {
  id: string;
  name: string;
  city: string;
  address: string;
};

export type NavigatorCabinetListMeta = {
  counts: Record<NavigatorCabinetModelStatus, number>;
  branches: NavigatorCabinetBranchOption[];
  isOwner: boolean;
};

export type NavigatorCabinetListResponse = {
  models: NavigatorCabinetModelRow[];
  meta: NavigatorCabinetListMeta;
  settings?: { sitePriceType?: string; stockDisplayMode?: string } | null;
};

export type NavigatorCatalogAccessResponse = {
  enabled: boolean;
  canAccess: boolean;
  isOwner?: boolean;
  organizationId?: string;
  error?: string;
  code?: string;
};

export type NavigatorPublicListItem = {
  id: string;
  modelId: string;
  name: string;
  section: string;
  group: string;
  brand: string;
  price: number | null;
  imageUrl: string | null;
  marks: string[];
  variantCount: number;
  matchedVariantCount: number;
};

export type NavigatorPublicListResponse = {
  settings: { sitePriceType?: string; stockDisplayMode?: string };
  filter: unknown;
  options: unknown;
  summary: { text?: string; models?: number };
  items: NavigatorPublicListItem[];
};

export type NavigatorCabinetModelVariant = {
  id: string;
  name: string;
  article: string | null;
  stockKind: "KNOWN" | "ZERO" | "UNKNOWN" | string;
  stockQuantity: number | null;
  publicPrice: number | null;
  properties: Record<string, string>;
};

export type NavigatorCabinetBranchStockKind = "KNOWN" | "ZERO" | "UNKNOWN";

export type NavigatorCabinetModelBranch = {
  branchId: string;
  name: string;
  city: string;
  address: string;
  excluded: boolean;
  adjustPercent: number;
  rulePrice: number | null;
  customPrice: number | null;
  effectivePrice: number | null;
  stockKind?: NavigatorCabinetBranchStockKind | string;
  stockQuantity?: number | null;
};

export type NavigatorCabinetModelDetail = NavigatorCabinetModelRow & {
  variants: NavigatorCabinetModelVariant[];
  branches: NavigatorCabinetModelBranch[];
  sitePriceType: string;
};