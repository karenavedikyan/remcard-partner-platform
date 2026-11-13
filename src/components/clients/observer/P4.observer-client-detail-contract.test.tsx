import { describe, expect, it } from "vitest";
import {
  formatObserverPublicPurchaseKopecks,
  k2ReferredAppealDetailToReadySlice,
} from "./observer-client-detail-contract";
import { OBSERVER_FIXTURE_APPEALS, OBSERVER_FIXTURE_PARTNERS } from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

describe("P4.observer-client-detail-contract", () => {
  it("formats K2 purchase kopecks for display only", () => {
    expect(formatObserverPublicPurchaseKopecks(12_500)).toBe("125 ₽");
    expect(formatObserverPublicPurchaseKopecks(-1)).toBe("—");
  });

  it("maps K2 wire to ready slice with empty timeline", () => {
    const slice = k2ReferredAppealDetailToReadySlice({
      appeal: OBSERVER_FIXTURE_APPEALS[0],
      receivingPartner: OBSERVER_FIXTURE_PARTNERS[0],
      timeline: [],
      purchase: { amountKopecks: 50_000, note: "Кухня" },
    });
    expect(slice.publicTimeline).toEqual([]);
    expect(slice.purchase?.amountKopecks).toBe(50_000);
    expect(slice.partner?.name).toBe(OBSERVER_FIXTURE_PARTNERS[0].name);
  });
});
