import { describe, expect, it } from "vitest";
import { branchStock, buildPartnerModels } from "./models";
import { optovikFixtureProducts } from "./fixtures";
import { BRANCH_IDS } from "./constants";

describe("branchStock", () => {
  it("returns null when no sku has known stock", () => {
    const m = buildPartnerModels(
      optovikFixtureProducts().map((p) =>
        p.id === "p004" ? { ...p, avail: "order" as const } : p,
      ),
    ).find((x) => x.id === "p004")!;
    expect(branchStock(m, 0)).toBeNull();
  });

  it("allocates positive stock per branch from known sku totals", () => {
    const m = buildPartnerModels(optovikFixtureProducts()).find((x) => x.id === "p004")!;
    const parts = BRANCH_IDS.map((i) => branchStock(m, i));
    expect(parts.every((p) => p != null && p >= 0)).toBe(true);
    expect(parts.reduce((a, b) => a + (b ?? 0), 0)).toBeGreaterThan(0);
  });
});