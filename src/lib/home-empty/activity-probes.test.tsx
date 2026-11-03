import { describe, expect, it } from "vitest";
import {
  parsePartnershipCollectionProbe,
  parseStoreOrdersLifetimeProbe,
} from "./activity-probes";

describe("parseStoreOrdersLifetimeProbe", () => {
  it("detects lifetime orders from limit=1 response", () => {
    expect(parseStoreOrdersLifetimeProbe({ orders: [{ orderId: "o1" }] }).hasOrders).toBe(true);
    expect(parseStoreOrdersLifetimeProbe({ orders: [] }).hasOrders).toBe(false);
  });

  it("returns unknown for malformed body", () => {
    expect(parseStoreOrdersLifetimeProbe(null).ok).toBe(false);
    expect(parseStoreOrdersLifetimeProbe({ orders: "bad" }).ok).toBe(false);
  });
});

describe("parsePartnershipCollectionProbe", () => {
  it("counts full authorized collection", () => {
    expect(parsePartnershipCollectionProbe({ partnerships: [] }).count).toBe(0);
    expect(parsePartnershipCollectionProbe({ partnerships: [{ id: "p1" }] }).count).toBe(1);
  });

  it("returns unknown for malformed body", () => {
    expect(parsePartnershipCollectionProbe({}).ok).toBe(false);
  });
});
