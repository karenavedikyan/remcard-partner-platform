import { describe, expect, it } from "vitest";
import {
  hasCustomPartnershipSearchFilters,
  mergeSearchResultPages,
} from "./partnership-search-ui";
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
});
