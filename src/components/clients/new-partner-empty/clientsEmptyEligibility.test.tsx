import { describe, expect, it } from "vitest";
import { isClientsNewPartnerEmptyEligible } from "./clientsEmptyEligibility";

describe("isClientsNewPartnerEmptyEligible", () => {
  const zeroCounts = { active: 0, archived: 0 };

  it("allows true zero on default list query when counts are known", () => {
    expect(
      isClientsNewPartnerEmptyEligible({
        loadState: "loaded",
        page: 1,
        appliedQ: "",
        archived: false,
        sort: "updated_desc",
        itemsLength: 0,
        knownListCounts: zeroCounts,
      }),
    ).toBe(true);
  });

  it("rejects unknown counts even with empty items", () => {
    expect(
      isClientsNewPartnerEmptyEligible({
        loadState: "loaded",
        page: 1,
        appliedQ: "",
        archived: false,
        sort: "updated_desc",
        itemsLength: 0,
        knownListCounts: null,
      }),
    ).toBe(false);
  });

  it("rejects loading, error, pagination, archive tab, search, and sort drift", () => {
    const loaded = {
      loadState: "loaded" as const,
      page: 1,
      appliedQ: "",
      archived: false,
      sort: "updated_desc" as const,
      itemsLength: 0,
      knownListCounts: zeroCounts,
    };
    expect(isClientsNewPartnerEmptyEligible({ ...loaded, loadState: "loading" })).toBe(false);
    expect(isClientsNewPartnerEmptyEligible({ ...loaded, loadState: "error" })).toBe(false);
    expect(isClientsNewPartnerEmptyEligible({ ...loaded, page: 2 })).toBe(false);
    expect(isClientsNewPartnerEmptyEligible({ ...loaded, archived: true })).toBe(false);
    expect(isClientsNewPartnerEmptyEligible({ ...loaded, appliedQ: "anna" })).toBe(false);
    expect(isClientsNewPartnerEmptyEligible({ ...loaded, sort: "name_asc" })).toBe(false);
  });

  it("rejects when archived or active clients exist in known counts", () => {
    expect(
      isClientsNewPartnerEmptyEligible({
        loadState: "loaded",
        page: 1,
        appliedQ: "",
        archived: false,
        sort: "updated_desc",
        itemsLength: 0,
        knownListCounts: { active: 2, archived: 0 },
      }),
    ).toBe(false);
    expect(
      isClientsNewPartnerEmptyEligible({
        loadState: "loaded",
        page: 1,
        appliedQ: "",
        archived: false,
        sort: "updated_desc",
        itemsLength: 0,
        knownListCounts: { active: 0, archived: 1 },
      }),
    ).toBe(false);
  });
});
