import type { MiniAppBootstrap } from "@/lib/mini-app/types";

export type MiniWalletLedgerScope = "branch" | "all";

/** Mini-app wallet GET: branchId only when user chose «филиал», never from silent cookie inheritance. */
export function miniWalletSettlementsSearchParams(input: {
  bootstrap: MiniAppBootstrap;
  ledgerScope: MiniWalletLedgerScope;
  branchId: string | null;
}): Record<string, string> | undefined {
  if (input.ledgerScope === "all") {
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
