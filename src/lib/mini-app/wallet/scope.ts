import type { WalletReadScope } from "@/lib/settlements-types";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";

export type MiniWalletLedgerScope = "branch" | "all";

export function canUseAllBranchesWalletScope(
  walletReadScope: WalletReadScope | undefined,
  bootstrap: MiniAppBootstrap,
): boolean {
  if (walletReadScope === "org-staff-company" || walletReadScope === "owner" || walletReadScope === "solo-staff") {
    return true;
  }
  if (walletReadScope === "personal") return true;
  if (bootstrap.role === "agent" || bootstrap.role === "specialist") return true;
  return false;
}

/** Mini-app wallet GET: branchId only when user chose «филиал», never from silent cookie inheritance. */
export function miniWalletSettlementsSearchParams(input: {
  bootstrap: MiniAppBootstrap;
  ledgerScope: MiniWalletLedgerScope;
  branchId: string | null;
  walletReadScope?: WalletReadScope;
}): Record<string, string> | undefined {
  const allowAll = canUseAllBranchesWalletScope(input.walletReadScope, input.bootstrap);
  if (input.ledgerScope === "all" && allowAll) {
    return undefined;
  }
  if (input.bootstrap.role === "store" || input.bootstrap.role === "company") {
    if (input.branchId) {
      return { branchId: input.branchId };
    }
  }
  return undefined;
}

export function profWalletCabinetHref(bootstrap: MiniAppBootstrap): string {
  const base = bootstrap.fullCabinetUrl.replace(/\/+$/, "");
  const raw = bootstrap.presentation.historyHref?.trim() || "/settlements";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (/\/settlements\/?$/.test(path) || /wallet/i.test(path)) {
    return `${base}${path}`;
  }
  return `${base}/settlements`;
}