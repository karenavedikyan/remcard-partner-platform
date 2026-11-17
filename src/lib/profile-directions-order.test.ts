import { describe, expect, it } from "vitest";
import type { PartnerTaxonomyItem } from "@/lib/types";
import { directionMatchesFilter, orderedVisibleItems } from "./profile-directions-order";

const item = (id: string, label: string): PartnerTaxonomyItem => ({ kind: "service", id, label });
const all = [item("a", "Alpha"), item("b", "Beta"), item("c", "Gamma"), item("d", "Мебель")];

describe("orderedVisibleItems", () => {
  it("keeps the source order when nothing is pinned", () => {
    expect(orderedVisibleItems(all, [], "").map((i) => i.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("puts the pinned snapshot first, in snapshot order", () => {
    expect(orderedVisibleItems(all, ["d", "b"], "").map((i) => i.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("depends only on the snapshot: a later selection that is not pinned does not move", () => {
    const pinned = ["b"];
    const before = orderedVisibleItems(all, pinned, "").map((i) => i.id);
    const after = orderedVisibleItems(all, pinned, "").map((i) => i.id);
    expect(after).toEqual(before);
    expect(after).toEqual(["b", "a", "c", "d"]);
  });

  it("non-empty query returns matches only, including for pinned items that do not match", () => {
    expect(orderedVisibleItems(all, ["c"], "alp").map((i) => i.id)).toEqual(["a"]);
    expect(orderedVisibleItems(all, ["a"], "мебел").map((i) => i.id)).toEqual(["d"]);
  });

  it("matches by label or id, case-insensitively", () => {
    expect(directionMatchesFilter(all[0]!, "ALP")).toBe(true);
    expect(directionMatchesFilter(all[0]!, "a")).toBe(true);
    expect(directionMatchesFilter(all[0]!, "zzz")).toBe(false);
    expect(directionMatchesFilter(all[0]!, "")).toBe(true);
  });

  it("ignores pinned ids that are not in the list", () => {
    expect(orderedVisibleItems(all, ["zzz", "c"], "").map((i) => i.id)).toEqual(["c", "a", "b", "d"]);
  });
});
