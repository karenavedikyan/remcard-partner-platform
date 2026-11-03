import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { StoreOrdersResponse } from "@/lib/history-types";
import {
  scannerEmptyActivityFromStoreOrders,
  type ScannerEmptyActivityProbe,
} from "./eligibility";

/** Loads whether the partner has any accepted store purchases (scanner history proxy). */
export async function loadScannerEmptyActivityProbe(): Promise<ScannerEmptyActivityProbe> {
  try {
    const data = await remcardFetch<StoreOrdersResponse>("/api/store/orders?limit=1");
    return scannerEmptyActivityFromStoreOrders(200, data);
  } catch (caught) {
    if (caught instanceof RemcardApiError) {
      return scannerEmptyActivityFromStoreOrders(caught.status, null);
    }
    return { status: "unavailable" };
  }
}
