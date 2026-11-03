import type { StoreOrdersResponse } from "@/lib/history-types";

export type ScannerEmptyActivityProbe =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "has_activity" }
  | { status: "empty_confirmed" };

export function initialScannerEmptyActivityProbe(): ScannerEmptyActivityProbe {
  return { status: "idle" };
}

/** Map store accepted-order list probe to onboarding visibility (pure). */
export function scannerEmptyActivityFromStoreOrders(
  httpStatus: number,
  body: StoreOrdersResponse | null,
): ScannerEmptyActivityProbe {
  if (httpStatus === 403 || httpStatus === 401) {
    return { status: "unavailable" };
  }
  if (httpStatus < 200 || httpStatus >= 300 || !body) {
    return { status: "unavailable" };
  }
  if (body.orders.length > 0) {
    return { status: "has_activity" };
  }
  return { status: "empty_confirmed" };
}

export function shouldShowScannerNewPartnerEmpty(probe: ScannerEmptyActivityProbe): boolean {
  return probe.status === "empty_confirmed";
}

export function mergeScannerEmptyProbeWithSession(
  probe: ScannerEmptyActivityProbe,
  sessionOrderCompleted: boolean,
): ScannerEmptyActivityProbe {
  if (sessionOrderCompleted) {
    return { status: "has_activity" };
  }
  return probe;
}

export function scannerEmptyProbeAfterSuccessfulOrder(
  probe: ScannerEmptyActivityProbe,
): ScannerEmptyActivityProbe {
  return mergeScannerEmptyProbeWithSession(probe, true);
}
