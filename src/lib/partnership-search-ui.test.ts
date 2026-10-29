import { describe, expect, it } from "vitest";
import {
  applySearchPageIfCurrent,
  createSearchRequestGate,
  hasCustomPartnershipSearchFilters,
  mergeSearchResultPages,
} from "./partnership-search-ui";
import { searchResultToPartnerSide } from "./partnership-rules";
import type { PartnerSearchResult } from "./types";

const partner = (id: string): PartnerSearchResult => ({
  id,
  displayName: `P ${id}`,
  organizationName: null,
  city: "Краснодар",
  photoUrl: null,
  description: null,
  specializations: [],
  badges: [],
  storeCategories: [],
  partnerType: "MASTER",
  partnerTypeLabel: null,
  branches: [],
  rating: null,
  ratingCount: 0,
  partnershipStatus: null,
  workingProductLabels: [],
  workingServiceLabels: [],
  workingStageLabels: [],
  partnershipContact: null,
});

describe("partnership-search-ui", () => {
  it("detects custom filters vs default role", () => {
    expect(
      hasCustomPartnershipSearchFilters(
        {
          query: "",
          city: "",
          filterProducts: [],
          filterServices: [],
          filterStages: [],
          searchRole: "pro",
        },
        "pro",
      ),
    ).toBe(false);
    expect(
      hasCustomPartnershipSearchFilters(
        {
          query: "магазин",
          city: "",
          filterProducts: [],
          filterServices: [],
          filterStages: [],
          searchRole: "pro",
        },
        "pro",
      ),
    ).toBe(true);
    expect(
      hasCustomPartnershipSearchFilters(
        {
          query: "",
          city: "",
          filterProducts: [],
          filterServices: [],
          filterStages: [],
          searchRole: "store",
        },
        "pro",
      ),
    ).toBe(true);
  });

  it("append keeps prior cards when next page is empty", () => {
    const prev = [partner("a"), partner("b")];
    expect(mergeSearchResultPages(prev, [], "append")).toEqual(prev);
  });

  it("append dedupes by id", () => {
    const prev = [partner("a")];
    const batch = [partner("a"), partner("b")];
    expect(mergeSearchResultPages(prev, batch, "append")).toEqual([partner("a"), partner("b")]);
  });

  it("sequence gates replace and append so older q cannot overwrite newer cards/cursor", () => {
    const gate = createSearchRequestGate();
    const oldSeq = gate.begin(); // q=old
    const newSeq = gate.begin(); // q=new

    const afterNew = applySearchPageIfCurrent({
      requestSeq: newSeq,
      latestSeq: gate.latest.current,
      mode: "reset",
      prev: { items: [], nextCursor: null },
      batch: [partner("new")],
      nextCursor: "cursor-new",
    });
    expect(afterNew).toEqual({
      items: [partner("new")],
      nextCursor: "cursor-new",
    });

    // Older q resolves later — must not replace cards or cursor.
    expect(
      applySearchPageIfCurrent({
        requestSeq: oldSeq,
        latestSeq: gate.latest.current,
        mode: "reset",
        prev: afterNew!,
        batch: [partner("old")],
        nextCursor: "cursor-old-stale",
      }),
    ).toBeNull();

    // Stale append from older generation also blocked (abort alone is insufficient).
    const staleAppendSeq = oldSeq;
    expect(
      applySearchPageIfCurrent({
        requestSeq: staleAppendSeq,
        latestSeq: gate.latest.current,
        mode: "append",
        prev: afterNew!,
        batch: [partner("old-page2")],
        nextCursor: "cursor-old-page2",
      }),
    ).toBeNull();

    // Fresh append for current generation still applies.
    const appendSeq = gate.begin();
    expect(
      applySearchPageIfCurrent({
        requestSeq: appendSeq,
        latestSeq: gate.latest.current,
        mode: "append",
        prev: afterNew!,
        batch: [partner("new-page2")],
        nextCursor: "cursor-new-page2",
      }),
    ).toEqual({
      items: [partner("new"), partner("new-page2")],
      nextCursor: "cursor-new-page2",
    });
  });
});

describe("partnership search canonical kind DTO", () => {
  it("passes partnerActivities from search API for invite/agent rules", () => {
    const side = searchResultToPartnerSide({
      ...partner("opt"),
      partnerType: "COMPANY",
      partnerActivities: ["STORE", "AGENT"],
      partnerKind: "company",
      partnerKindLabel: "Компания",
      partnerTypeLabel: "Компания",
    });
    expect(side.partnerActivities).toEqual(["STORE", "AGENT"]);
  });

  it("exposes Seda-like agent label on search rows", () => {
    const row: PartnerSearchResult = {
      ...partner("seda"),
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
      partnerKind: "agent",
      partnerKindLabel: "Агент",
      partnerTypeLabel: "Агент",
    };
    expect(row.partnerKindLabel).toBe("Агент");
  });
});
