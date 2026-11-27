import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { MasterNavItem } from "@/lib/master-nav/sections";
import { partner1cCatalogFeatureEnabled } from "./constants";

export const PARTNER_1C_CATALOG_HREF = "/catalog";

export function canManagePartner1cCatalog(proContext: ProContextSnapshot | null | undefined): boolean {
  if (!proContext) return false;
  if (proContext.role === "ORG_OWNER") return true;
  return Boolean(proContext.effectivePermissions?.canManageCatalog);
}

export function partner1cCatalogNavVisible(
  presentation: Pick<CabinetPresentationSnapshot, "navMode" | "proContext">,
): boolean {
  if (!partner1cCatalogFeatureEnabled()) return false;
  const mode = presentation.navMode;
  if (mode !== "business-store" && mode !== "business-company") return false;
  return canManagePartner1cCatalog(presentation.proContext);
}

export function filterBusinessNavForPartner1cCatalog(
  items: readonly MasterNavItem[],
  presentation: Pick<CabinetPresentationSnapshot, "navMode" | "proContext">,
): MasterNavItem[] {
  const visible = partner1cCatalogNavVisible(presentation);
  return items.filter((item) => {
    if (item.href === PARTNER_1C_CATALOG_HREF) return visible;
    return true;
  });
}

export function isPartnerCatalogOwner(proContext: ProContextSnapshot | null | undefined): boolean {
  return proContext?.role === "ORG_OWNER";
}