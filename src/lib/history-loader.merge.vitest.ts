import { describe, expect, it } from "vitest";
import {
  canPreserveHistoryAcceptedTail,
  historyAcceptedTailBeyondFreshHead,
  mergeHistoryPurchasesBackground,
} from "./history-loader";
import type { PurchaseRow } from "./history-types";

const accepted = (id: string, promo: string): PurchaseRow =>
  ({
    id,
    orderId: id,
    direction: "accepted",
    promoCode: promo,
    createdAt: "2026-10-01T10:00:00.000Z",
  }) as PurchaseRow;

describe("canPreserveHistoryAcceptedTail", () => {
  it("is false when accepted access denied even if issued remains", () => {
    expect(
      canPreserveHistoryAcceptedTail({ acceptedOrders: false, issuedOrders: true }, true),
    ).toBe(false);
    expect(canPreserveHistoryAcceptedTail({ acceptedOrders: true, issuedOrders: true }, true)).toBe(
      false,
    );
  });
});

describe("mergeHistoryPurchasesBackground", () => {
  it("keeps accepted tail not present in fresh first page", () => {
    const prev = [accepted("a1", "HEAD"), accepted("a2", "TAIL")];
    const fresh = [accepted("a1", "HEAD-NEW")];
    const merged = mergeHistoryPurchasesBackground(prev, fresh);
    expect(merged.map((r) => r.promoCode).sort()).toEqual(["HEAD-NEW", "TAIL"]);
    expect(historyAcceptedTailBeyondFreshHead(prev, fresh)).toBe(true);
  });
});
