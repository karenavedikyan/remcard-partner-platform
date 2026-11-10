import type { SettlementsResponse } from "../../src/lib/settlements-types";
import { cert, meta, purchaseResponse } from "./purchase-fixtures";

const promo = cert.promoCode!;

function storeListOrder(index: number) {
  const order = cert.orders![index]!;
  const payable = order.totalAmount - order.discountAmount;
  return {
    orderId: order.id,
    createdAt: order.createdAt,
    status: order.status,
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    payableAmount: payable,
    isSelfScan: false,
    promoCode: promo,
    clientName: meta.agentClient!.displayName,
    proName: "QA Партнёр Артём",
    storeName: order.certificatePartner!.storeName,
    branchId: null,
    branchName: "ОПТОВИК",
    branchCity: null,
    executorUserId: "qa-executor",
    executorName: "QA Исполнитель",
    proBonus: order.proBonus,
    linkedAccruals:
      index === 0 ? [{ id: "qa-accrual-zero", type: "bonus" as const }] : ([] as const),
  };
}

export const QA_ACCRUAL_ZERO_ID = "qa-accrual-zero";
export const QA_ACCRUAL_AGENT_ID = "qa-accrual-agent";

export function settlementsForScene(scene: string): SettlementsResponse {
  const zeroRow = {
    id: QA_ACCRUAL_ZERO_ID,
    orderId: cert.orders![0]!.id,
    accrualType: "bonus" as const,
    counterpartyId: "qa-cp-store",
    counterpartyName: "QA Партнёр Артём",
    amount: 0,
    basis: `Сертификат ${promo}`,
    status: "CALCULATED",
    createdAt: "2026-11-10T12:00:00.000Z",
  };
  const agentRow = {
    id: QA_ACCRUAL_AGENT_ID,
    orderId: cert.orders![0]!.id,
    accrualType: "agentBonus" as const,
    counterpartyId: "qa-cp-agent",
    counterpartyName: "QA Агент",
    amount: 5400,
    basis: `Сертификат ${promo}`,
    status: "CONFIRMED",
    createdAt: "2026-11-10T11:00:00.000Z",
  };

  if (scene === "accrual-zero-only") {
    return {
      receivable: [],
      payable: [zeroRow],
      completed: [],
      coverageNote: "QA: только нулевое начисление",
    };
  }

  return {
    receivable: [agentRow],
    payable: [zeroRow],
    completed: [],
    coverageNote: "QA synthetic settlements",
  };
}

export function storeOrdersList(scene: string, cursor: string | null) {
  if (scene === "history-error") {
    return { error: "QA store orders failure", status: 500 };
  }
  if (scene === "store-403") {
    return { error: "Forbidden", status: 403 };
  }
  if (scene === "pagination" && !cursor) {
    return {
      body: {
        orders: [storeListOrder(0)],
        pagination: { limit: 20, hasMore: true, nextCursor: "qa-page-2" },
      },
    };
  }
  if (scene === "pagination" && cursor === "qa-page-2") {
    return {
      body: {
        orders: [storeListOrder(1)],
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
    };
  }
  return {
    body: {
      orders: [storeListOrder(0), storeListOrder(1)],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    },
  };
}

export function proOrdersList(scene: string) {
  if (scene === "history-error") {
    return { error: "QA pro orders failure", status: 500 };
  }
  if (scene === "default" || scene === "pagination" || scene === "accrual-zero-only") {
    return { body: { orders: [] } };
  }
  if (scene === "store-403") {
    return {
      body: {
        orders: [
          {
            id: "qa-issued-order-1",
            createdAt: "2026-11-09T16:00:00.000Z",
            status: "CONFIRMED",
            totalAmount: 103500,
            discountAmount: 10350,
            promoCode: "RC-ISSUED-QA",
            clientName: "QA Клиент",
            storeName: "QA Магазин",
            branchName: null,
            proBonus: 1500,
          },
        ],
      },
    };
  }
  return { body: { orders: [] } };
}

export function orderDetail(orderId: string) {
  const index = cert.orders!.findIndex((o) => o.id === orderId);
  if (index >= 0) {
    return { body: purchaseResponse(index) };
  }
  return { error: "Не найдено", status: 404 };
}

export const QA_SCENES = [
  { id: "default", label: "Покупки + начисления (0 ₽ и 5 400 ₽)" },
  { id: "store-403", label: "Store 403 + issued покупка" },
  { id: "history-error", label: "Ошибка загрузки истории" },
  { id: "pagination", label: "Постраничная подгрузка" },
  { id: "accrual-zero-only", label: "Начисления: нулевая сумма" },
] as const;
