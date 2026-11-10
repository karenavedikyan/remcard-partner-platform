import type { SettlementsResponse } from "@/lib/settlements-types";

/** Six branches + HO — mirrors full-coverage manager grant shape (synthetic only). */
export const QA_STAFF_WALLET_BRANCH_IDS = [
  "branch-ho",
  "branch-b1",
  "branch-b2",
  "branch-b3",
  "branch-b4",
  "branch-b5",
  "branch-b6",
] as const;

const FAIL_403_BRANCH = "branch-b4";

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

export function qaBranchScopedSettlements(branchId: string): SettlementsResponse {
  if (branchId === FAIL_403_BRANCH) {
    throw new QaSettlementsForbiddenError();
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

export class QaSettlementsForbiddenError extends Error {
  status = 403;
  constructor() {
    super("QA synthetic 403");
  }
}
