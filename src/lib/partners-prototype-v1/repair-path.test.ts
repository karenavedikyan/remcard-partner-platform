import { describe, expect, it } from "vitest";
import {
  adaptDiscoveryFacets,
  buildDirectionCounters,
  buildRepairPathStages,
  stageSelectionResetsDirection,
} from "./repair-path";

const stages = [
  { kind: "stage" as const, id: "L1-1", label: "Демонтаж" },
  { kind: "stage" as const, id: "L1-2", label: "Черновые" },
];

describe("repair-path", () => {
  it("does not invent counts when facets absent", () => {
    const rows = buildRepairPathStages(stages, null);
    expect(rows.every((r) => r.matchCount === null && !r.unavailable)).toBe(true);
    expect(adaptDiscoveryFacets(undefined)).toBeNull();
    expect(adaptDiscoveryFacets({})).toBeNull();
  });

  it("marks known-zero stages unavailable from full matching set", () => {
    const facets = adaptDiscoveryFacets({
      total: 3,
      stages: { "L1-1": 3, "L1-2": 0 },
    });
    const rows = buildRepairPathStages(stages, facets);
    expect(rows[0]).toMatchObject({ matchCount: 3, unavailable: false });
    expect(rows[1]).toMatchObject({ matchCount: 0, unavailable: true });
  });

  it("does not treat missing stage key as zero", () => {
    const facets = adaptDiscoveryFacets({ total: 1, stages: { "L1-1": 1 } });
    const rows = buildRepairPathStages(stages, facets);
    expect(rows[1].matchCount).toBeNull();
    expect(rows[1].unavailable).toBe(false);
  });

  it("resets specialization when stage changes", () => {
    const next = stageSelectionResetsDirection(
      { specialization: "services:paint", stageId: "L1-1" },
      "L1-2",
    );
    expect(next).toEqual({ specialization: "", stageId: "L1-2" });
  });

  it("builds direction counters without page-local fabrication", () => {
    const products = [{ kind: "product" as const, id: "doors", label: "Двери" }];
    expect(buildDirectionCounters(products, undefined)[0].count).toBeNull();
    expect(buildDirectionCounters(products, { doors: 0 })[0]).toMatchObject({
      count: 0,
      unavailable: true,
    });
  });
});
