import { describe, expect, it } from "vitest";
import {
  mergeScannerEmptyProbeWithSession,
  scannerEmptyActivityFromStoreOrders,
  shouldShowScannerNewPartnerEmpty,
} from "./eligibility";

describe("scanner empty eligibility", () => {
  it("shows onboarding only on successful empty store orders list", () => {
    expect(
      shouldShowScannerNewPartnerEmpty(
        scannerEmptyActivityFromStoreOrders(200, { orders: [], pagination: { hasMore: false, nextCursor: null } }),
      ),
    ).toBe(true);
    expect(
      shouldShowScannerNewPartnerEmpty(
        scannerEmptyActivityFromStoreOrders(200, {
          orders: [{ orderId: "o1" } as never],
          pagination: { hasMore: false, nextCursor: null },
        }),
      ),
    ).toBe(false);
  });

  it("does not treat 403/401 or errors as empty", () => {
    expect(shouldShowScannerNewPartnerEmpty(scannerEmptyActivityFromStoreOrders(403, null))).toBe(
      false,
    );
    expect(shouldShowScannerNewPartnerEmpty(scannerEmptyActivityFromStoreOrders(401, null))).toBe(
      false,
    );
    expect(shouldShowScannerNewPartnerEmpty(scannerEmptyActivityFromStoreOrders(500, null))).toBe(
      false,
    );
    expect(shouldShowScannerNewPartnerEmpty({ status: "loading" })).toBe(false);
  });

  it("session order completion overrides empty probe (race guard)", () => {
    const emptyProbe = scannerEmptyActivityFromStoreOrders(200, {
      orders: [],
      pagination: { hasMore: false, nextCursor: null, limit: 1 },
    });
    expect(
      shouldShowScannerNewPartnerEmpty(mergeScannerEmptyProbeWithSession(emptyProbe, true)),
    ).toBe(false);
  });
});
