import type { SettlementsResponse } from "@/lib/settlements-types";

/** Rich MASTER wallet fixture for dev preview and visual checks (non-production). */
export function masterWalletFixtureData(): SettlementsResponse {
  const receivable = [
    {
      id: "recv-a1",
      orderId: "order-a1",
      accrualType: "bonus" as const,
      counterpartyId: "PARTNER_A",
      counterpartyName: "PARTNER_A",
      amount: 100,
      basis: "Сертификат RC-A1",
      status: "CONFIRMED",
      createdAt: "2026-10-05T10:00:00.000Z",
    },
    {
      id: "recv-b1",
      orderId: "order-b1",
      accrualType: "bonus" as const,
      counterpartyId: "PARTNER_B",
      counterpartyName: "PARTNER_B",
      amount: 200,
      basis: "=1+1",
      status: "CONFIRMED",
      createdAt: "2026-10-06T10:00:00.000Z",
    },
  ];

  const payable = Array.from({ length: 11 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    const day = 10 + i;
    return {
      id: `pay-${n}`,
      orderId: `order-p${n}`,
      accrualType: "bonus" as const,
      counterpartyId: `PARTNER_${n}`,
      counterpartyName: `PARTNER_${n}`,
      amount: i === 10 ? 1 : 100,
      basis: `Сертификат RC-P${n}`,
      status: "CONFIRMED",
      createdAt: `2026-10-${day}T12:00:00.000Z`,
    };
  });

  return {
    coverageNote: "Fixture: order-linked начисления для превью кошелька специалиста.",
    receivable,
    payable,
    completed: [
      {
        id: "done-1",
        orderId: "order-done-1",
        accrualType: "bonus",
        counterpartyId: "PARTNER_A",
        counterpartyName: "PARTNER_A",
        amount: 50,
        basis: "Сертификат RC-D1",
        status: "PAID",
        createdAt: "2026-09-01T10:00:00.000Z",
        paidAt: "2026-10-21T21:30:00.000Z",
        direction: "receivable",
      },
      {
        id: "done-closed-only",
        orderId: "order-closed",
        accrualType: "bonus",
        counterpartyId: "PARTNER_CLOSED_ONLY",
        counterpartyName: "PARTNER_CLOSED_ONLY",
        amount: 25,
        basis: "Закрытый партнёр",
        status: "PAID",
        createdAt: "2026-08-01T10:00:00.000Z",
        paidAt: "2026-10-10T10:00:00.000Z",
        direction: "receivable",
      },
      {
        id: "done-unknown",
        orderId: "order-done-u",
        accrualType: "bonus",
        counterpartyId: "PARTNER_B",
        counterpartyName: "PARTNER_B",
        amount: 30,
        basis: "Legacy PAID",
        status: "PAID",
        createdAt: "2026-09-15T10:00:00.000Z",
        paidAt: null,
        direction: "payable",
      },
    ],
  };
}
