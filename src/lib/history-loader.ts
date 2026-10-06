import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  mapProOrdersToPurchases,
  mapStoreBonusListToPurchases,
  mapWalletTransactionsToAccruals,
} from "@/lib/history-mappers";
import type {
  AccrualRow,
  ProOrdersResponse,
  PurchaseRow,
  StoreBonusListResponse,
  WalletTransactionsResponse,
} from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

export async function fetchPurchaseRows(user: AuthUser): Promise<PurchaseRow[]> {
  const purchaseRows: PurchaseRow[] = [];
  const isStoreLike =
    user.partnerType === "STORE" ||
    user.partnerType === "COMPANY" ||
    user.partnerType === "MASTER";

  if (isStoreLike) {
    try {
      const storeData = await remcardFetch<StoreBonusListResponse>("/api/store/bonus-list");
      purchaseRows.push(...mapStoreBonusListToPurchases(storeData));
    } catch (caught) {
      if (!(caught instanceof RemcardApiError && caught.status === 403)) {
        throw caught;
      }
    }
  }

  try {
    const proOrders = await remcardFetch<ProOrdersResponse>("/api/pro/orders");
    purchaseRows.push(...mapProOrdersToPurchases(proOrders));
  } catch (caught) {
    if (!(caught instanceof RemcardApiError && (caught.status === 403 || caught.status === 404))) {
      throw caught;
    }
  }

  return purchaseRows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function fetchAccrualRows(): Promise<AccrualRow[]> {
  const txData = await remcardFetch<WalletTransactionsResponse>("/api/pro/wallet/transactions");
  return mapWalletTransactionsToAccruals(txData);
}

export async function fetchHistoryData(user: AuthUser): Promise<{
  purchases: PurchaseRow[];
  accruals: AccrualRow[];
}> {
  const [purchases, accruals] = await Promise.all([
    fetchPurchaseRows(user),
    fetchAccrualRows(),
  ]);
  return { purchases, accruals };
}
