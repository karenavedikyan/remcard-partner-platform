import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { buildPartnerModels, defaultPublicationState, type PublicationState } from "./models";
import { optovikFixtureProducts } from "./fixtures";
import { isPartnerCatalogOwner } from "./gate";
import { partner1cCatalogFeatureEnabled } from "./constants";
import type { PartnerCatalogModel } from "./types";
import { adaptNavigatorCabinetList } from "./navigator-adapter";
import {
  adaptNavigatorCabinetModelDetail,
  partnerCatalogModelFromFixture,
} from "./navigator-model-detail";
import type {
  NavigatorCabinetListResponse,
  NavigatorCabinetModelDetail,
  NavigatorCatalogAccessResponse,
} from "./navigator-types";
import {
  catalogUiAccessFromNavigator,
  emptyCatalogListUiAccess,
  type CatalogListUiAccess,
} from "./catalog-access";

export type PartnerCatalogSnapshot = {
  models: PartnerCatalogModel[];
  publication: PublicationState;
  manage: boolean;
  priceType: string;
  access?: CatalogListUiAccess;
  source?: "fixture" | "navigator";
};

const demoPublication = defaultPublicationState();

/** Fixture snapshot — used when flag off or navigator unavailable. */
export function fetchPartnerCatalogSnapshot(
  proContext: ProContextSnapshot | null,
): PartnerCatalogSnapshot {
  const products = optovikFixtureProducts();
  const models = buildPartnerModels(products);
  const manage = isPartnerCatalogOwner(proContext);
  const access = emptyCatalogListUiAccess("fixture");
  access.canSeeOwnerEconomics = manage;
  return {
    models,
    publication: demoPublication,
    manage,
    priceType: "РРЦ Тандор",
    access,
    source: "fixture",
  };
}

/** Server: navigator API with fixture fallback (PARTNER_1C_CATALOG_ENABLED=1). */
export async function fetchPartnerCatalogSnapshotLive(
  proContext: ProContextSnapshot | null,
  cookieHeader?: string | null,
): Promise<PartnerCatalogSnapshot> {
  if (!partner1cCatalogFeatureEnabled()) {
    return fetchPartnerCatalogSnapshot(proContext);
  }

  try {
    const access = await remcardFetch<NavigatorCatalogAccessResponse>(
      "/api/pro/organization/partner-products/access",
      { cookieHeader: cookieHeader ?? undefined },
    );
    const uiAccess = catalogUiAccessFromNavigator(access, proContext, "");
    if (!uiAccess.canOpenWorkspace) {
      return { ...fetchPartnerCatalogSnapshot(proContext), access: uiAccess, source: "fixture" };
    }

    const list = await remcardFetch<NavigatorCabinetListResponse>(
      "/api/pro/organization/partner-products",
      { cookieHeader: cookieHeader ?? undefined },
    );
    if (!list.models?.length) {
      return fetchPartnerCatalogSnapshot(proContext);
    }

    const snap = adaptNavigatorCabinetList(list, { proContext, access });
    return snapshotForAudience(snap);
  } catch (err) {
    if (err instanceof RemcardApiError && (err.status === 404 || err.status === 503)) {
      return fetchPartnerCatalogSnapshot(proContext);
    }
    return fetchPartnerCatalogSnapshot(proContext);
  }
}

/** Employee / public views must not receive cost fields. */
export function stripCostFromModels(models: PartnerCatalogModel[]): PartnerCatalogModel[] {
  return models.map((m) => ({ ...m, cost: null }));
}

export function snapshotForAudience(
  snap: PartnerCatalogSnapshot,
): PartnerCatalogSnapshot {
  if (snap.manage) return snap;
  return {
    ...snap,
    models: stripCostFromModels(snap.models),
    access: snap.access
      ? { ...snap.access, canSeeOwnerEconomics: false }
      : emptyCatalogListUiAccess("fixture"),
  };
}

/** Client/server: model detail from navigator; fixture only when flag off or request fails. */
export async function fetchPartnerCatalogModelDetail(
  modelId: string,
  manage: boolean,
): Promise<PartnerCatalogModel | null> {
  if (!partner1cCatalogFeatureEnabled()) {
    return partnerCatalogModelFromFixture(modelId);
  }
  try {
    const dto = await remcardFetch<NavigatorCabinetModelDetail>(
      `/api/pro/organization/partner-products/models/${encodeURIComponent(modelId)}`,
    );
    return adaptNavigatorCabinetModelDetail(dto, { manage });
  } catch {
    return partnerCatalogModelFromFixture(modelId);
  }
}

const OWNER_ONLY_JSON_KEYS = new Set([
  "purchasePrice",
  "markup",
  "internalPrices",
  "cost",
  "owner",
]);

/** Guard: employee snapshots/responses must not contain owner economics fields. */
export function assertNoOwnerEconomicsInValue(value: unknown, path = ""): void {
  if (value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((child, i) => assertNoOwnerEconomicsInValue(child, `${path}[${i}]`));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (
      OWNER_ONLY_JSON_KEYS.has(key) &&
      child !== null &&
      child !== undefined &&
      child !== false
    ) {
      throw new Error(`Forbidden field "${key}" at ${path || "root"}`);
    }
    assertNoOwnerEconomicsInValue(child, path ? `${path}.${key}` : key);
  }
}