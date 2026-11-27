import type { SettlementsResponse } from "@/lib/settlements-types";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";

const baseRow = {
  accrualType: "bonus" as const,
  payoutActions: undefined,
};

export const MINI_WALLET_FIXTURES: Record<MiniAppBootstrap["role"], SettlementsResponse> = {
  agent: {
    coverageNote: "Синтетические данные приёмки.",
    receivable: [
      {
        ...baseRow,
        id: "mw-agent-1",
        orderId: "ord-agent-1001",
        counterpartyId: "store-demo-1",
        counterpartyName: "Магазин «Маяк»",
        amount: 12_480,
        basis: "Сертификат RC-DEMO-A1",
        status: "CONFIRMED",
        createdAt: "2026-10-10T10:00:00.000Z",
        pendingAmount: 3_200,
      },
      {
        ...baseRow,
        id: "mw-agent-2",
        orderId: "ord-agent-1002",
        counterpartyId: "store-demo-2",
        counterpartyName: "СтройДвор",
        amount: 4_500,
        basis: "Отделка",
        status: "CONFIRMED",
        createdAt: "2026-10-12T10:00:00.000Z",
        confirmationAt: "2026-11-25T12:00:00.000Z",
      },
    ],
    payable: [],
    completed: [
      {
        ...baseRow,
        id: "mw-agent-c1",
        orderId: "ord-agent-0999",
        counterpartyId: "store-demo-1",
        counterpartyName: "Магазин «Маяк»",
        amount: 8_000,
        basis: "Сертификат RC-OLD",
        status: "PAID",
        createdAt: "2026-09-01T10:00:00.000Z",
        paidAt: "2026-09-15T10:00:00.000Z",
        direction: "receivable",
      },
    ],
  },
  specialist: {
    coverageNote: "Синтетические данные приёмки.",
    receivable: [
      {
        ...baseRow,
        id: "mw-spec-in-1",
        orderId: "ord-spec-in-1",
        counterpartyId: "store-demo-1",
        counterpartyName: "Магазин «Маяк»",
        amount: 6_200,
        basis: "Двери",
        status: "CONFIRMED",
        createdAt: "2026-10-05T10:00:00.000Z",
        pendingAmount: 1_100,
      },
    ],
    payable: [
      {
        ...baseRow,
        id: "mw-spec-out-1",
        orderId: "ord-spec-out-1",
        counterpartyId: "agent-demo-1",
        counterpartyName: "Алексей Романов",
        amount: 2_400,
        basis: "Вознаграждение агента",
        status: "CONFIRMED",
        createdAt: "2026-10-08T10:00:00.000Z",
      },
    ],
    completed: [],
  },
  store: {
    coverageNote: "Синтетические данные приёмки.",
    receivable: [
      {
        ...baseRow,
        id: "mw-store-in-1",
        orderId: "ord-store-in-1",
        counterpartyId: "company-demo-1",
        counterpartyName: "Компания «Формат»",
        amount: 15_000,
        basis: "Сертификат",
        status: "CONFIRMED",
        createdAt: "2026-10-01T10:00:00.000Z",
      },
    ],
    payable: [
      {
        ...baseRow,
        id: "mw-store-out-1",
        orderId: "ord-store-out-1",
        counterpartyId: "spec-demo-1",
        counterpartyName: "Мария Орлова",
        amount: 3_800,
        basis: "Специалист",
        status: "CONFIRMED",
        createdAt: "2026-10-03T10:00:00.000Z",
        suspendedAmount: 800,
        confirmationLabel: "На сверке",
      },
    ],
    completed: [],
  },
  company: {
    coverageNote: "Синтетические данные приёмки.",
    receivable: [
      {
        ...baseRow,
        id: "mw-co-in-1",
        orderId: "ord-co-in-1",
        counterpartyId: "store-demo-2",
        counterpartyName: "СтройДвор",
        amount: 12_480,
        pendingAmount: 3_200,
        basis: "Вознаграждение компании",
        status: "CONFIRMED",
        createdAt: "2026-10-06T10:00:00.000Z",
      },
    ],
    payable: [
      {
        ...baseRow,
        id: "mw-co-out-1",
        orderId: "ord-co-out-1",
        counterpartyId: "store-demo-1",
        counterpartyName: "Магазин «Маяк»",
        amount: 11_200,
        pendingAmount: 5_500,
        basis: "Вознаграждение магазина",
        status: "CONFIRMED",
        createdAt: "2026-10-07T10:00:00.000Z",
      },
    ],
    completed: [],
    canSwitchBranchLedgerScope: true,
  },
};

export const MINI_WALLET_EMPTY_FIXTURE: SettlementsResponse = {
  receivable: [],
  payable: [],
  completed: [],
  coverageNote: "",
};

export function miniWalletFixtureForRole(role: MiniAppBootstrap["role"]): SettlementsResponse {
  return structuredClone(MINI_WALLET_FIXTURES[role]);
}