import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  mapProOrdersToPurchases,
  mapStoreBonusListToPurchases,
  mapWalletTransactionsToAccruals,
} from "@/lib/history-mappers";
import { isStoreLikePartner, type HistorySourceAvailability } from "@/lib/history-sources";
import type {
  AccrualRow,
  ProOrdersResponse,
  PurchaseRow,
  StoreBonusListResponse,
  WalletBalanceResponse,
  WalletRole,
  WalletTransactionsResponse,
} from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

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

export async function fetchPurchaseRows(user: AuthUser): Promise<{
  purchases: PurchaseRow[];
  sources: HistorySourceAvailability;
}> {
  const purchaseRows: PurchaseRow[] = [];
  const sources: HistorySourceAvailability = {
    acceptedBonusList: false,
    issuedOrders: false,
  };

  if (isStoreLikePartner(user)) {
    try {
      const storeData = await remcardFetch<StoreBonusListResponse>("/api/store/bonus-list");
      sources.acceptedBonusList = true;
      purchaseRows.push(...mapStoreBonusListToPurchases(storeData));
    } catch (caught) {
      if (!(caught instanceof RemcardApiError && caught.status === 403)) {
        throw caught;
      }
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
  };
}

export async function fetchAccrualRows(): Promise<AccrualRow[]> {
  const [walletRole, txData] = await Promise.all([
    fetchWalletRole(),
    remcardFetch<WalletTransactionsResponse>("/api/pro/wallet/transactions"),
  ]);
  return mapWalletTransactionsToAccruals(txData, walletRole);
}

export async function fetchHistoryData(user: AuthUser): Promise<{
  purchases: PurchaseRow[];
  accruals: AccrualRow[];
  sources: HistorySourceAvailability;
}> {
  const [{ purchases, sources }, accruals] = await Promise.all([
    fetchPurchaseRows(user),
    fetchAccrualRows(),
  ]);
  return { purchases, accruals, sources };
}
