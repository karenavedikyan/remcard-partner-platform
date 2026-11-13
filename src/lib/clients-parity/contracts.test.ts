import { describe, expect, it } from "vitest";
import { blockerForRequirement, CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import { fetchObserverReferredAppeals } from "./fetch-observer-appeals";

describe("clients parity contracts", () => {
  it("maps C07 to receiving blocker", () => {
    expect(blockerForRequirement("C07")?.id).toBe("BLK-RECEIVING-APPEALS");
  });

  it("fetch observer returns blocked", async () => {
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.blockerId).toBe("BLK-OBSERVER-REFERRED");
      expect(res.missingRoutes.length).toBeGreaterThan(0);
    }
  });

  it("has three contract blockers", () => {
    expect(CLIENTS_CONTRACT_BLOCKERS).toHaveLength(3);
  });
});
