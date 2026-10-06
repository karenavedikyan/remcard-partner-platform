import type {
  AccrualRow,
  AccrualScope,
  AccrualType,
  LinkedAccrualRef,
  ProOrderDetailResponse,
  ProOrdersResponse,
  PurchaseRow,
  StoreBonusListResponse,
  StoreOrderDetailResponse,
  StoreOrdersResponse,
  WalletRole,
  WalletTransactionsResponse,
} from "./history-types";

export function accrualScopeFromWalletRole(role: WalletRole | null): AccrualScope {
  if (role === "STORE") {
    return "payable-to-pros";
  }
  if (role === "AGENT" || role === "MASTER") {
    return "earned";
  }
  return "unknown";
}

function firstBonusId(links: LinkedAccrualRef[]): string | null {
  return links.find((link) => link.type === "bonus")?.id ?? null;
}

function mapLinkedAccruals(
  links: Array<{ id: string; type: AccrualType }>,
): { linkedAccruals: LinkedAccrualRef[]; linkedAccrualIds: string[] } {
  const linkedAccruals = links.map((link) => ({ id: link.id, type: link.type }));
  return { linkedAccruals, linkedAccrualIds: linkedAccruals.map((link) => link.id) };
}

function mapStoreOrderRow(
  order: StoreOrdersResponse["orders"][number] | StoreOrderDetailResponse["order"],
): PurchaseRow {
  const { linkedAccruals, linkedAccrualIds } = mapLinkedAccruals(order.linkedAccruals);
  return {
    id: order.orderId,
    source: "accepted-order",
    orderId: order.orderId,
    bonusId: firstBonusId(linkedAccruals),
    createdAt: order.createdAt,
    promoCode: order.promoCode,
    partnerName: order.proName?.trim() || "Партнёр",
    direction: "accepted",
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    payableAmount: order.payableAmount,
    orderStatus: order.status,
    bonusStatus: null,
    isSelfScan: order.isSelfScan,
    clientName: order.clientName,
    branchName: order.branchName,
    executorName: order.executorName,
    proBonus: order.proBonus,
    linkedAccruals,
    linkedAccrualIds,
    items:
      "items" in order
        ? order.items.map((item) => ({
            categoryLabel: item.categoryLabel,
            amount: item.amount,
            discountPercent: item.discountPercent,
            issuerPercent: item.issuerPercent,
            issuerAmount: item.issuerAmount,
          }))
        : [],
  };
}

export function mapStoreOrdersToPurchases(data: StoreOrdersResponse): PurchaseRow[] {
  return data.orders.map(mapStoreOrderRow);
}

export function mapStoreOrderDetailToPurchase(data: StoreOrderDetailResponse): PurchaseRow {
  return mapStoreOrderRow(data.order);
}

export function mapProOrderDetailToPurchase(data: ProOrderDetailResponse): PurchaseRow {
  const { linkedAccruals, linkedAccrualIds } = mapLinkedAccruals(data.order.linkedAccruals);
  return {
    id: data.order.orderId,
    source: "issued-order",
    orderId: data.order.orderId,
    bonusId: firstBonusId(linkedAccruals),
    createdAt: data.order.createdAt,
    promoCode: data.order.promoCode,
    partnerName: data.order.storeName,
    direction: "issued",
    totalAmount: data.order.totalAmount,
    discountAmount: data.order.discountAmount,
    payableAmount: data.order.payableAmount,
    orderStatus: data.order.status,
    bonusStatus: null,
    isSelfScan: data.order.isSelfScan,
    clientName: data.order.clientName,
    branchName: data.order.branchName,
    executorName: null,
    proBonus: data.order.proBonus,
    linkedAccruals,
    linkedAccrualIds,
    items: data.order.items.map((item) => ({
      categoryLabel: item.categoryLabel,
      amount: item.amount,
      discountPercent: item.discountPercent,
      issuerPercent: item.issuerPercent,
      issuerAmount: item.issuerAmount,
    })),
  };
}

export function mapStoreBonusListToPurchases(data: StoreBonusListResponse): PurchaseRow[] {
  return data.bonuses.map((bonus) => ({
    id: bonus.id,
    source: "accepted-bonus",
    orderId: bonus.orderId ?? null,
    bonusId: bonus.id,
    createdAt: new Date(bonus.createdAt).toISOString(),
    promoCode: bonus.promoCode,
    partnerName: bonus.proName,
    direction: "accepted",
    totalAmount: bonus.totalAmount,
    discountAmount: bonus.discountAmount,
    payableAmount: bonus.totalAmount - bonus.discountAmount,
    orderStatus: null,
    bonusStatus: bonus.status,
    isSelfScan: Boolean(bonus.certificatePartner?.isSelfScan),
    clientName: bonus.clientName,
    branchName: null,
    executorName: null,
    proBonus: bonus.amount,
    linkedAccruals: [{ id: bonus.id, type: "bonus" as const }],
    linkedAccrualIds: [bonus.id],
    items: bonus.orderItems.map((item) => ({
      categoryLabel: item.categoryLabel,
      amount: item.amount,
      issuerPercent: item.issuerPercent,
      issuerAmount: item.issuerAmount,
    })),
  }));
}

export function mapProOrdersToPurchases(data: ProOrdersResponse): PurchaseRow[] {
  return data.orders.map((order) => ({
    id: order.id,
    source: "issued-order",
    orderId: order.id,
    bonusId: null,
    createdAt: order.createdAt,
    promoCode: order.promoCode,
    partnerName: order.storeName,
    direction: "issued",
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    payableAmount: order.totalAmount - order.discountAmount,
    orderStatus: order.status,
    bonusStatus: null,
    isSelfScan: false,
    clientName: order.clientName,
    branchName: order.branchName,
    executorName: null,
    proBonus: order.proBonus,
    linkedAccruals: [],
    linkedAccrualIds: [],
    items: [],
  }));
}

export function mapWalletTransactionsToAccruals(
  data: WalletTransactionsResponse,
  walletRole: WalletRole | null,
): AccrualRow[] {
  const scope = accrualScopeFromWalletRole(walletRole);
  return data.transactions
    .filter((tx) => !tx.isSelfScan && tx.amount > 0)
    .map((tx) => ({
      id: tx.id,
      orderId: tx.orderId ?? null,
      accrualType: tx.accrualType ?? "bonus",
      createdAt: tx.createdAt,
      amount: tx.amount,
      status: tx.status,
      paidAt: tx.paidAt,
      counterpartyName: tx.counterpartyName,
      promoCode: tx.promoCode,
      isSelfScan: tx.isSelfScan,
      walletRole,
      scope,
      items: tx.items,
    }));
}
