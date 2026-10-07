import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  mapProOrderDetailToPurchase,
  mapProOrdersToPurchases,
  mapStoreOrderDetailToPurchase,
  mapStoreOrdersToPurchases,
  mapWalletTransactionsToAccruals,
} from "@/lib/history-mappers";
import { fetchSettlements } from "@/lib/settlements-loader";
import {
  mapSettlementsToAccrualRows,
  mergeAccrualRowsById,
} from "@/lib/settlements-mappers";
import type { HistorySourceAvailability } from "@/lib/history-sources";
import type {
  AccrualRow,
  ProOrderDetailResponse,
  ProOrdersResponse,
  PurchaseRow,
  StoreOrderDetailResponse,
  StoreOrdersResponse,
  WalletBalanceResponse,
  WalletRole,
  WalletTransactionsResponse,
} from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

const DEFAULT_ACCEPTED_PAGE_SIZE = 20;

async function fetchWalletRole(): Promise<WalletRole | null> {
  try {
    const balance = await remcardFetch<WalletBalanceResponse>("/api/pro/wallet/balance");
    return balance.role ?? null;
  } catch (caught) {
    if (caught instanceof RemcardApiError && (caught.status === 403 || caught.status === 404)) {
      return null;
    }
    throw caught;
  }
}

export async function fetchAcceptedPurchasePage(
  cursor?: string | null,
  limit = DEFAULT_ACCEPTED_PAGE_SIZE,
): Promise<{
  purchases: PurchaseRow[];
  pagination: StoreOrdersResponse["pagination"];
}> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set("cursor", cursor);
  }
  const data = await remcardFetch<StoreOrdersResponse>(`/api/store/orders?${params.toString()}`);
  return {
    purchases: mapStoreOrdersToPurchases(data),
    pagination: data.pagination,
  };
}

/** Direct detail fetch — tries store accepted scope first, then issued pro scope. */
export async function fetchPurchaseByOrderId(
  orderId: string,
  _user?: AuthUser,
): Promise<PurchaseRow | null> {
  try {
    const data = await remcardFetch<StoreOrderDetailResponse>(
      `/api/store/orders/${encodeURIComponent(orderId)}`,
    );
    return mapStoreOrderDetailToPurchase(data);
  } catch (caught) {
    if (caught instanceof RemcardApiError && (caught.status === 404 || caught.status === 403)) {
      // Fall through to issued detail for dual-role users or issued-only access.
    } else {
      throw caught;
    }
  }

  try {
    const data = await remcardFetch<ProOrderDetailResponse>(
      `/api/pro/orders/${encodeURIComponent(orderId)}`,
    );
    return mapProOrderDetailToPurchase(data);
  } catch (caught) {
    if (caught instanceof RemcardApiError && (caught.status === 404 || caught.status === 403)) {
      return null;
    }
    throw caught;
  }
}

export async function fetchPurchaseRows(_user: AuthUser): Promise<{
  purchases: PurchaseRow[];
  sources: HistorySourceAvailability;
  acceptedPagination: StoreOrdersResponse["pagination"] | null;
  acceptedAccessDenied: boolean;
}> {
  const purchaseRows: PurchaseRow[] = [];
  const sources: HistorySourceAvailability = {
    acceptedOrders: false,
    issuedOrders: false,
  };
  let acceptedPagination: StoreOrdersResponse["pagination"] | null = null;
  let acceptedAccessDenied = false;

  try {
    const accepted = await fetchAcceptedPurchasePage(null);
    sources.acceptedOrders = true;
    acceptedPagination = accepted.pagination;
    purchaseRows.push(...accepted.purchases);
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 403) {
      acceptedAccessDenied = true;
    } else {
      throw caught;
    }
  }

  try {
    const proOrders = await remcardFetch<ProOrdersResponse>("/api/pro/orders");
    sources.issuedOrders = true;
    purchaseRows.push(...mapProOrdersToPurchases(proOrders));
  } catch (caught) {
    if (!(caught instanceof RemcardApiError && (caught.status === 403 || caught.status === 404))) {
      throw caught;
    }
  }

  return {
    purchases: purchaseRows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    sources,
    acceptedPagination,
    acceptedAccessDenied,
  };
}

export async function fetchAccrualRows(): Promise<AccrualRow[]> {
  const [walletRole, txData] = await Promise.all([
    fetchWalletRole(),
    remcardFetch<WalletTransactionsResponse>("/api/pro/wallet/transactions"),
  ]);
  const walletAccruals = mapWalletTransactionsToAccruals(txData, walletRole);
  try {
    const settlements = await fetchSettlements();
    return mergeAccrualRowsById(walletAccruals, mapSettlementsToAccrualRows(settlements));
  } catch {
    return walletAccruals;
  }
}

export async function fetchHistoryData(user: AuthUser): Promise<{
  purchases: PurchaseRow[];
  accruals: AccrualRow[];
  sources: HistorySourceAvailability;
  acceptedPagination: StoreOrdersResponse["pagination"] | null;
  acceptedAccessDenied: boolean;
}> {
  const [{ purchases, sources, acceptedPagination, acceptedAccessDenied }, accruals] =
    await Promise.all([fetchPurchaseRows(user), fetchAccrualRows()]);
  return { purchases, accruals, sources, acceptedPagination, acceptedAccessDenied };
}
