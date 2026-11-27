import type { MiniAppActionId, MiniAppBootstrap } from "@/lib/mini-app/types";
import type { SettlementsResponse } from "@/lib/settlements-types";
import type { MiniWalletFilter } from "./calc";

export function miniWalletShowsGlobalEmptyState(filter: MiniWalletFilter, data: SettlementsResponse): boolean {
  return filter === "all" && !data.receivable.length && !data.payable.length && !data.completed.length;
}

export function miniWalletEmptyAction(
  bootstrap: MiniAppBootstrap,
  readScope: SettlementsResponse["walletReadScope"],
): MiniAppActionId | null {
  if (readScope === "solo-staff" || readScope === "org-staff-company" || readScope === "org-staff-branches") return null;
  const action = bootstrap.role === "company" || bootstrap.role === "store" ? "scan_qr" : "create_certificate";
  return bootstrap.actions.some((item) => item.id === action) ? action : null;
}
