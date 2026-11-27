import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { NavigatorCatalogAccessResponse } from "./navigator-types";

export type CatalogListUiAccess = {
  /** May render cabinet catalog workspace at all (nav / route). */
  canOpenWorkspace: boolean;
  /** Owner economics: закупка, наценка, филиалы и цены в карточке. */
  canSeeOwnerEconomics: boolean;
  /** Show branch-specific retail sums in the list. */
  showBranchRetailPrices: boolean;
  /** Publication/price snapshot from API rejected; do not infer from HTTP status alone. */
  publicationPricesBlocked: boolean;
  /** Soft hint only — not an access denial. */
  branchHint: "none" | "pick-active-branch" | "branch-scope-limited";
  scopeKey: string;
};

export function emptyCatalogListUiAccess(scopeKey = "fixture"): CatalogListUiAccess {
  return {
    canOpenWorkspace: true,
    canSeeOwnerEconomics: false,
    showBranchRetailPrices: true,
    publicationPricesBlocked: false,
    branchHint: "none",
    scopeKey,
  };
}

/** Interpret GET .../partner-products/access (not raw 403/404). */
export function catalogUiAccessFromNavigator(
  dto: NavigatorCatalogAccessResponse | null,
  proContext: ProContextSnapshot | null,
  branchFilter: string,
): CatalogListUiAccess {
  const activeBranchId = proContext?.activeBranch?.id?.trim() || "";
  const scopeKey = [dto?.organizationId ?? "", activeBranchId, branchFilter].join("|");

  if (!dto?.enabled) {
    return {
      canOpenWorkspace: false,
      canSeeOwnerEconomics: false,
      showBranchRetailPrices: false,
      publicationPricesBlocked: true,
      branchHint: "none",
      scopeKey,
    };
  }

  if (!dto.canAccess) {
    const code = dto.code?.toUpperCase() ?? "";
    const forbidden = code === "FORBIDDEN";
    if (forbidden) {
      return {
        canOpenWorkspace: false,
        canSeeOwnerEconomics: false,
        showBranchRetailPrices: false,
        publicationPricesBlocked: true,
        branchHint: "none",
        scopeKey,
      };
    }
    return {
      canOpenWorkspace: true,
      canSeeOwnerEconomics: false,
      showBranchRetailPrices: false,
      publicationPricesBlocked: true,
      branchHint: "none",
      scopeKey,
    };
  }

  const isOwner = Boolean(dto.isOwner ?? proContext?.role === "ORG_OWNER");
  const assignments = proContext?.branchAssignments?.length ?? 0;
  let branchHint: CatalogListUiAccess["branchHint"] = "none";
  if (!isOwner && assignments > 0 && !activeBranchId) {
    branchHint = "pick-active-branch";
  } else if (!isOwner && assignments > 0 && branchFilter === "") {
    branchHint = "branch-scope-limited";
  }

  return {
    canOpenWorkspace: true,
    canSeeOwnerEconomics: isOwner,
    showBranchRetailPrices: branchHint !== "pick-active-branch",
    publicationPricesBlocked: false,
    branchHint,
    scopeKey,
  };
}

export function catalogAccessDeniedMessage(dto: NavigatorCatalogAccessResponse | null): string | null {
  if (!dto) return null;
  if (dto.enabled && dto.canAccess) return null;
  if (dto.error?.trim()) return dto.error.trim();
  return "Раздел «Каталог» недоступен для этого кабинета.";
}