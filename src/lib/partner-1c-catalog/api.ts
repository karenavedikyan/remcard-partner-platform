import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { buildPartnerModels, defaultPublicationState, type PublicationState } from "./models";
import { optovikFixtureProducts } from "./fixtures";
import { isPartnerCatalogOwner } from "./gate";
import type { PartnerCatalogModel } from "./types";

export type PartnerCatalogSnapshot = {
  models: PartnerCatalogModel[];
  publication: PublicationState;
  manage: boolean;
  priceType: string;
};

const demoPublication = defaultPublicationState();

/** Mock typed client — real API behind flag when navigator ships contract. */
export function fetchPartnerCatalogSnapshot(
  proContext: ProContextSnapshot | null,
): PartnerCatalogSnapshot {
  const products = optovikFixtureProducts();
  const models = buildPartnerModels(products);
  const manage = isPartnerCatalogOwner(proContext);
  return {
    models,
    publication: demoPublication,
    manage,
    priceType: "РРЦ Тандор",
  };
}

/** Employee / public views must not receive cost fields. */
export function stripCostFromModels(models: PartnerCatalogModel[]): PartnerCatalogModel[] {
  return models.map((m) => ({ ...m, cost: null }));
}

export function snapshotForAudience(
  snap: PartnerCatalogSnapshot,
): PartnerCatalogSnapshot {
  if (snap.manage) return snap;
  return { ...snap, models: stripCostFromModels(snap.models) };
}