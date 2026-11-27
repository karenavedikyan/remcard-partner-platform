import type { MiniAppBootstrap } from "@/lib/mini-app/types";

export type MiniWalletLedgerScope = "branch" | "all";
/** null uses the working point, while "all" uses the existing company-wide ledger. */
export type MiniWalletBranchSelection = "all" | readonly string[] | null;

export function miniWalletBranchSelectionLabel(
  selection: MiniWalletBranchSelection,
  bootstrap: MiniAppBootstrap,
): string | null {
  if (selection === "all") return `Все филиалы (${bootstrap.branches.length})`;
  if (!selection?.length) return null;
  if (selection.length === 1) {
    return bootstrap.branches.find(({ id }) => id === selection[0])?.label ?? "Выбранный филиал";
  }
  return `Выбрано филиалов: ${selection.length}`;
}

/** Mini-app wallet GET: branchId only when user chose «филиал», never from silent cookie inheritance. */
export function miniWalletSettlementsSearchParams(input: {
  bootstrap: MiniAppBootstrap;
  ledgerScope: MiniWalletLedgerScope;
  branchId: string | null;
  branchSelection?: MiniWalletBranchSelection;
}): Record<string, string> | undefined {
  if (input.ledgerScope === "all" || input.branchSelection === "all") {
    return undefined;
  }
  if (input.bootstrap.role === "store" || input.bootstrap.role === "company") {
    if (input.branchSelection?.length) return { branchIds: input.branchSelection.join(",") };
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
