import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import {
  activeBranchPermissionGrants,
  branchIdsWithPermission,
} from "@/lib/employee-workspace-data/branch-assignment-auth";
import { formatStaffBranchLine } from "@/lib/profile-staff-cabinet";

const BRANCH_SCOPED_ROLES = new Set(["BRANCH_MANAGER", "BRANCH_EMPLOYEE", "ORG_TEAM_MEMBER"]);

const OWNER_LIKE_ROLES = new Set([
  "ORG_OWNER",
  "SOLO_PARTNER",
  "PARTNER_MANAGER",
  "PARTNER_EMPLOYEE",
]);

export type ScannerBranchOption = {
  id: string;
  label: string;
};

export type ScannerBranchResolution =
  | { kind: "not_required" }
  | { kind: "blocked"; message: string }
  | {
      kind: "ready";
      branchId: string;
      options: ScannerBranchOption[];
      /** True when user picked a branch different from implicit default (telemetry only). */
      explicitChoice: boolean;
    };

export function isStorePurchaseBranchScoped(proContext: ProContextSnapshot | null): boolean {
  if (!proContext?.role) return false;
  return BRANCH_SCOPED_ROLES.has(proContext.role);
}

export function isStorePurchaseBranchOptional(proContext: ProContextSnapshot | null): boolean {
  if (!proContext?.role) return false;
  return OWNER_LIKE_ROLES.has(proContext.role);
}

/** ACTIVE branches where trusted context grants certificate activation. */
export function scannerAccessibleOperationBranches(
  proContext: ProContextSnapshot | null,
): ScannerBranchOption[] {
  if (!proContext) return [];
  const allowedIds = new Set(
    branchIdsWithPermission(activeBranchPermissionGrants(proContext), "canActivateCertificates"),
  );
  if (!allowedIds.size) return [];
  const branches = proContext.branches ?? [];
  return branches
    .filter((b) => allowedIds.has(b.id))
    .map((b) => ({ id: b.id, label: formatStaffBranchLine(b) }));
}

export function resolveScannerBranchContext(input: {
  contextReady: boolean;
  proContext: ProContextSnapshot | null;
}): ScannerBranchResolution {
  const { contextReady, proContext } = input;
  if (!contextReady || !proContext) {
    return {
      kind: "blocked",
      message: "Контекст рабочего места недоступен. Обновите страницу или обратитесь к администратору.",
    };
  }

  if (isStorePurchaseBranchOptional(proContext)) {
    return { kind: "not_required" };
  }

  if (!isStorePurchaseBranchScoped(proContext)) {
    return { kind: "blocked", message: "Недостаточно прав для оформления покупки в магазине." };
  }

  const options = scannerAccessibleOperationBranches(proContext);
  if (options.length === 0) {
    return {
      kind: "blocked",
      message: "Нет филиалов, где разрешено оформление по сертификату. Обратитесь к руководителю.",
    };
  }

  const activeId = proContext.activeBranch?.id;
  const defaultBranchId =
    activeId && options.some((option) => option.id === activeId)
      ? activeId
      : options[0]!.id;

  return {
    kind: "ready",
    branchId: defaultBranchId,
    options,
    explicitChoice: false,
  };
}

export function scannerShowsOperationBranchControl(resolution: ScannerBranchResolution): boolean {
  return resolution.kind === "ready" && resolution.options.length > 1;
}

export function appendStoreOrderBranchQuery(path: string, branchId: string | null | undefined): string {
  const id = branchId?.trim();
  if (!id) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}branchId=${encodeURIComponent(id)}`;
}

export const SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE =
  "Сохранённая попытка создана до выбора филиала. Откройте историю операций или начните новую покупку после выбора филиала.";
