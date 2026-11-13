import { describe, expect, it } from "vitest";

/**
 * Static contract for P3 imports — no shell navigation; not page acceptance.
 */
describe("P4 observer detail export contract", () => {
  it("re-exports P3 integration surface from owned modules", async () => {
    const client = await import("./ObserverClientDetailView");
    const partner = await import("./ObserverPartnerDetailView");

    expect(typeof client.ObserverClientDetailView).toBe("function");
    expect(typeof client.ObserverClientDetailMissing).toBe("function");
    expect(typeof client.resolveObserverClientBackLabel).toBe("function");
    expect(typeof client.resolveObserverClientBackFrom).toBe("function");

    expect(typeof partner.ObserverPartnerDetailView).toBe("function");
    expect(typeof partner.ObserverPartnerDetailMissing).toBe("function");
  });
});
