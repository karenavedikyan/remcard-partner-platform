import { describe, expect, it } from "vitest";
import {
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
