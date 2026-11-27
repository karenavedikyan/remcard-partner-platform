import type {
  NavigatorCabinetBranchOption,
  NavigatorCabinetModelBranch,
} from "./navigator-types";

export type CatalogBranch = {
  id: string;
  name: string;
  city: string;
  address: string;
  /** Full line for UI headers (city, address). */
  label: string;
  shortLabel: string;
};

export function branchDisplayLine(parts: {
  city?: string;
  address?: string;
  name?: string;
}): string {
  const city = (parts.city ?? "").trim();
  const address = (parts.address ?? "").trim();
  if (city && address) return `${city}, ${address}`;
  const name = (parts.name ?? "").trim();
  return name || city || address || "—";
}

export function branchShortLabel(parts: {
  city?: string;
  address?: string;
  name?: string;
}): string {
  const city = (parts.city ?? "").trim();
  const address = (parts.address ?? "").trim();
  if (city === "Краснодар" && address) return address;
  return branchDisplayLine(parts);
}

export function catalogBranchFromNavigator(opt: NavigatorCabinetBranchOption): CatalogBranch {
  return {
    id: opt.id,
    name: opt.name,
    city: opt.city,
    address: opt.address,
    label: branchDisplayLine(opt),
    shortLabel: branchShortLabel(opt),
  };
}

export function catalogBranchesFromNavigator(
  options: NavigatorCabinetBranchOption[],
): CatalogBranch[] {
  return options.map(catalogBranchFromNavigator);
}

function catalogBranchFromDetail(row: NavigatorCabinetModelBranch): CatalogBranch {
  return {
    id: row.branchId,
    name: row.name,
    city: row.city,
    address: row.address,
    label: branchDisplayLine(row),
    shortLabel: branchShortLabel(row),
  };
}

/**
 * Cabinet order from meta.branches; append detail-only branches in detail response order.
 */
export function branchesForModelPanel(
  catalogBranches: CatalogBranch[],
  detailBranches: NavigatorCabinetModelBranch[] | undefined,
): CatalogBranch[] {
  const byId = new Map(catalogBranches.map((b) => [b.id, b]));
  const order: string[] = catalogBranches.map((b) => b.id);
  for (const row of detailBranches ?? []) {
    if (!byId.has(row.branchId)) {
      byId.set(row.branchId, catalogBranchFromDetail(row));
      order.push(row.branchId);
    }
  }
  return order.map((id) => byId.get(id)!);
}

export function branchCountCaption(
  on: number,
  total: number,
  kind: "filter-all" | "detail-part" | "list-pill" | "list-stock" | "card",
) {
  if (total === 0) return "нет филиалов";
  if (on === total) {
    switch (kind) {
      case "filter-all":
        return `Все ${total}`;
      case "detail-part":
        return "представлен во всех филиалах";
      case "list-pill":
        return "Все";
      case "list-stock":
        return "все филиалы";
      case "card":
        return "во всех филиалах";
    }
  }
  switch (kind) {
    case "filter-all":
      return `${on} из ${total}`;
    case "detail-part":
      return `представлен в ${on} из ${total} филиалов`;
    case "list-pill":
      return `${on} из ${total}`;
    case "list-stock":
      return `филиалов: ${on} из ${total}`;
    case "card":
      return `в ${on} из ${total} филиалов`;
  }
}

export function testIdSuffix(branchId: string): string {
  return branchId;
}