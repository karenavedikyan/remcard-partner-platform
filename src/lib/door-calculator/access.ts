import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { MasterNavItem } from "@/lib/master-nav/sections";

export const DOORS_CALCULATOR_HREF = "/doors-calculator";
export const DOORS_CATEGORY_KEY = "doors";

export function storeCategoriesFromProContext(
  proContext: ProContextSnapshot | null | undefined,
): string[] {
  const org = proContext?.organization?.storeCategories ?? [];
  if (org.length > 0) return [...org];
  return [...(proContext?.partnershipPrincipalSide?.storeCategories ?? [])];
}

export function organizationHasDoorsCategory(
  proContext: ProContextSnapshot | null | undefined,
): boolean {
  return storeCategoriesFromProContext(proContext).includes(DOORS_CATEGORY_KEY);
}

/** Store/company workplace with product category «Двери». */
export function doorCalculatorFeatureVisible(
  presentation: Pick<CabinetPresentationSnapshot, "navMode" | "proContext">,
): boolean {
  const mode = presentation.navMode;
  if (mode !== "business-store" && mode !== "business-company") return false;
  return organizationHasDoorsCategory(presentation.proContext);
}

export function filterBusinessDesktopNav(
  items: readonly MasterNavItem[],
  presentation: Pick<CabinetPresentationSnapshot, "navMode" | "proContext">,
): MasterNavItem[] {
  const visible = doorCalculatorFeatureVisible(presentation);
  return items.filter((item) => {
    if (item.href === DOORS_CALCULATOR_HREF) return visible;
    return true;
  });
}