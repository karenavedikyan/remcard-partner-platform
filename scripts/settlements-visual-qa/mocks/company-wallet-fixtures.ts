import type { SettlementsResponse } from "@/lib/settlements-types";

/**
 * Six store branches with wallet grants (synthetic).
 * HO / head office is not a backend wallet branch scope — excluded from
 * branchAssignments used for ?branchId= (per navigator wallet auditor).
 */
export const QA_STAFF_WALLET_BRANCH_IDS = [
  "branch-b1",
  "branch-b2",
  "branch-b3",
  "branch-b4",
  "branch-b5",
  "branch-b6",
] as const;

export const QA_FAIL_BRANCH = "branch-b4";

export function qaOwnerAggregateSettlements(): SettlementsResponse {
  return {
    coverageNote: "QA owner aggregate (single GET)",
    receivable: [
      {
        id: "owner-recv-1",
        orderId: "ord-owner-1",
        accrualType: "bonus",
        counterpartyId: "agent-alpha",
        counterpartyName: "Агент Альфа",
        amount: 1200,
        basis: "RC-OWNER-1",
        status: "CONFIRMED",
        createdAt: "2026-10-01T10:00:00.000Z",
      },
      {
        id: "owner-recv-2",
        orderId: "ord-owner-2",
        accrualType: "bonus",
        counterpartyId: "agent-beta",
        counterpartyName: "Агент Бета",
        amount: 800,
        basis: "RC-OWNER-2",
        status: "CONFIRMED",
        createdAt: "2026-10-02T10:00:00.000Z",
      },
      {
        id: "owner-null-branch",
        orderId: "ord-owner-unassigned",
        accrualType: "bonus",
        counterpartyId: "agent-historical",
        counterpartyName: "Историческое (без филиала)",
        amount: 500,
        basis: "QA owner-only null-branch",
        status: "CONFIRMED",
        createdAt: "2026-09-15T10:00:00.000Z",
      },
    ],
    payable: [
      {
        id: "owner-pay-1",
        orderId: "ord-owner-p1",
        accrualType: "bonus",
        counterpartyId: "store-gamma",
        counterpartyName: "Магазин Гамма",
        amount: 450,
        basis: "RC-OWNER-P1",
        status: "CONFIRMED",
        createdAt: "2026-10-03T10:00:00.000Z",
        payoutActions: { canRecordCash: true, canRecordTransfer: false },
      },
    ],
    completed: [],
  };
}

function qaStaffSlicesEmpty(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("staffSlices") === "empty";
}

export function qaBranchScopedSettlements(branchId: string): SettlementsResponse {
  if (qaStaffSlicesEmpty()) {
    return { receivable: [], payable: [], completed: [], coverageNote: "" };
  }
  return {
    coverageNote: `QA branch ${branchId}`,
    receivable: [
      {
        id: `recv-${branchId}`,
        orderId: `ord-${branchId}`,
        accrualType: "bonus",
        counterpartyId: `cp-${branchId}`,
        counterpartyName: `Партнёр ${branchId}`,
        amount: 100 + branchId.length,
        basis: `RC-${branchId}`,
        status: "CONFIRMED",
        createdAt: "2026-10-01T10:00:00.000Z",
      },
    ],
    payable: [],
    completed: [],
  };
}
