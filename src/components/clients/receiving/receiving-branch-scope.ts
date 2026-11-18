import type { ReceivingListFilters, ReceivingStaffBranch } from "@/lib/clients-parity/receiving-appeals-api";
import { formatStaffBranchLine } from "@/lib/profile-staff-cabinet";

export type { ReceivingStaffBranch };

export type ReceivingBranchSelection = { kind: "all" } | { kind: "branch"; branchId: string };

export const RECEIVING_ALL_BRANCHES_BUTTON_LABEL = "Все филиалы";
export const RECEIVING_ALL_BRANCHES_MENU_LABEL = "Все доступные филиалы";
export const RECEIVING_UNASSIGNED_BRANCH_LABEL = "Без филиала";

/** Explicit scope of the list: a concrete branch, the explicit "all", or the server default (none). */
export function receivingBranchScopeOf(
  filters: Pick<ReceivingListFilters, "branchId" | "branchScope">,
): "default" | "all" | "branch" {
  if (filters.branchId?.trim()) return "branch";
  return filters.branchScope === "all" ? "all" : "default";
}

/**
 * What the control shows. An untouched list follows the server: the branch the server actually applied
 * (working branch) or, when it applied none, the whole visible set.
 */
export function resolveReceivingBranchSelection(
  filters: Pick<ReceivingListFilters, "branchId" | "branchScope">,
  branches: readonly ReceivingStaffBranch[],
  serverBranchId: string | null,
): ReceivingBranchSelection {
  const scope = receivingBranchScopeOf(filters);
  if (scope === "all") return { kind: "all" };
  const pick = scope === "branch" ? filters.branchId!.trim() : serverBranchId?.trim() || "";
  if (pick && branches.some((b) => b.id === pick)) return { kind: "branch", branchId: pick };
  return { kind: "all" };
}

/** Short branch name; falls back to the long form only when two branches would read the same. */
export function receivingBranchLabel(
  branch: ReceivingStaffBranch,
  all: readonly ReceivingStaffBranch[],
): string {
  const name = branch.name.trim();
  const duplicated = all.some((b) => b.id !== branch.id && b.name.trim().toLowerCase() === name.toLowerCase());
  return duplicated || !name ? formatStaffBranchLine(branch) : name;
}

export function receivingBranchLabelById(
  branchId: string | null | undefined,
  branches: readonly ReceivingStaffBranch[],
): string | null {
  const id = branchId?.trim();
  if (!id) return RECEIVING_UNASSIGNED_BRANCH_LABEL;
  const branch = branches.find((b) => b.id === id);
  return branch ? receivingBranchLabel(branch, branches) : null;
}
