import type { SettlementsResponse } from "@/lib/settlements-types";

const data: SettlementsResponse = {
  coverageNote: "Visual QA fixture",
  receivable: [
    {
      id: "r1",
      orderId: "o-r1",
      accrualType: "bonus",
      counterpartyId: "p1",
      counterpartyName: "ООО «Ромашка и партнёры»",
      amount: 1500,
      basis: "Сертификат RC-QA",
      status: "CONFIRMED",
      createdAt: "2026-10-01T10:00:00.000Z",
      pendingAmount: 200,
    },
  ],
  payable: [
    {
      id: "p1",
      orderId: "o-p1",
      accrualType: "bonus",
      counterpartyId: "p2",
      counterpartyName: "Master QA",
      amount: 800,
      basis: "Сертификат RC-P1",
      status: "CONFIRMED",
      createdAt: "2026-10-02T10:00:00.000Z",
      payoutActions: { canRecordCash: true, canRecordTransfer: true },
    },
  ],
  completed: [],
};

export async function fetchSettlements() {
  return data;
}

export function isSettlementsAccessDenied() {
  return false;
}
