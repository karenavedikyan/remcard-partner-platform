import { describe, expect, it } from "vitest";
import {
  clearPageSelection,
  pageSelectionState,
  selectAllPartnersOnPage,
  selectedOnOtherPagesCount,
  togglePartnerSelection,
} from "./adminPartnersSelection";

describe("adminPartnersSelection", () => {
  const a = { id: "a", displayName: "A" };
  const b = { id: "b", displayName: "B" };

  it("tracks page selection state including partial", () => {
    let map = togglePartnerSelection(new Map(), a).next;
    expect(pageSelectionState(map, ["a", "b"])).toBe("partial");
    map = selectAllPartnersOnPage(map, [a, b]).next;
    expect(pageSelectionState(map, ["a", "b"])).toBe("all");
    map = clearPageSelection(map, ["a", "b"]);
    expect(pageSelectionState(map, ["a", "b"])).toBe("none");
  });

  it("counts selection on other pages", () => {
    let map = togglePartnerSelection(new Map(), a).next;
    map = togglePartnerSelection(map, b).next;
    expect(selectedOnOtherPagesCount(map, ["a"])).toBe(1);
  });

  it("enforces max selection cap when selecting page", () => {
    const partners = Array.from({ length: 105 }, (_, i) => ({
      id: `p-${i}`,
      displayName: `P ${i}`,
    }));
    const { next, capped } = selectAllPartnersOnPage(new Map(), partners);
    expect(capped).toBe(true);
    expect(next.size).toBe(100);
  });
});
