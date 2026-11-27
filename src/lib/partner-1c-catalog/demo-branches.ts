/**
 * Demo branch list for fixture / prototype mode only — not used as live catalog source.
 */
import type { NavigatorCabinetBranchOption } from "./navigator-types";
import type { CatalogBranch } from "./branches";
import { catalogBranchesFromNavigator } from "./branches";

const DEMO_LINES = [
  "Краснодар, Ростовское шоссе, 30/3",
  "Краснодар, ул. 40 лет Победы, 168",
  "Краснодар, ул. Красных Партизан, 235",
  "Краснодар, ул. Новороссийская, 216/5",
  "Краснодар, ул. Российская, 414",
  "Новороссийск, ул. Исаева, 19",
] as const;

function demoNavigatorOptions(): NavigatorCabinetBranchOption[] {
  return DEMO_LINES.map((line, i) => {
    const [city, ...rest] = line.split(", ");
    const address = rest.join(", ");
    return {
      id: `optovik-branch-${i}`,
      name: `${city} · ${address}`,
      city: city!,
      address,
    };
  });
}

/** Stable demo branches (optovik-branch-0 … 5) for /catalog/dev-fixture and optovik JSON. */
export function demoCatalogBranches(): CatalogBranch[] {
  return catalogBranchesFromNavigator(demoNavigatorOptions());
}

/** @deprecated fixture-only — use snapshot.branches in product code */
export const DEMO_BRANCH_LABELS = DEMO_LINES.map(String);