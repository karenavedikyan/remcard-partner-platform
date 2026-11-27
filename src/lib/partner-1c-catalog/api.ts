import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { buildPartnerModels, defaultPublicationState, type PublicationState } from "./models";
import { optovikFixtureProducts } from "./fixtures";
import { isPartnerCatalogOwner } from "./gate";
import { partner1cCatalogFeatureEnabled } from "./constants";
import type { PartnerCatalogModel } from "./types";
import {
  adaptNavigatorCabinetList,
} from "./navigator-adapter";
import type { NavigatorCabinetListResponse, NavigatorCatalogAccessResponse } from "./navigator-types";
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