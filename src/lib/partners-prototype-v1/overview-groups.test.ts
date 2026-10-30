import { describe, expect, it } from "vitest";
import {
  isPartnerOverviewEmpty,
  overviewZoneForPartnership,
  partitionPartnerOverview,
} from "./overview-groups";
import type { Partnership } from "@/lib/types";

function row(
  partial: Partial<Partnership> & Pick<Partnership, "id" | "status" | "initiatedBy">,
): Partnership {
  return {
    pendingProposedBy: null,
    note: "",
    createdAt: "",
    updatedAt: "",
    storeUserId: "me",
    proUserId: "other",
    terms: [],
    storeUser: {
      id: "me",
      displayName: "Me",
      city: null,
      specializations: [],
      storeCategories: [],
    },
    proUser: {
      id: "other",
      displayName: "Other",
      city: null,
      specializations: [],
      storeCategories: [],
    },
    ...partial,
  } as Partnership;
}

describe("partitionPartnerOverview", () => {
  it("splits 2 ACTIVE + 1 incoming + 1 outgoing into counts 2/1/1", () => {
    const groups = partitionPartnerOverview(
      [
        row({ id: "a1", status: "ACTIVE", initiatedBy: "me" }),
        row({ id: "a2", status: "ACTIVE", initiatedBy: "other" }),
        row({ id: "in1", status: "INVITED", initiatedBy: "other" }),
        row({ id: "out1", status: "INVITED", initiatedBy: "me" }),
      ],
      "me",
    );
    expect(groups.counts).toEqual({ active: 2, decisions: 1, outgoing: 1 });
    expect(groups.decisions.map((p) => p.id)).toEqual(["in1"]);
    expect(groups.outgoing.map((p) => p.id)).toEqual(["out1"]);
  });

  it("puts PENDING counterparty offer in decisions, author in outgoing", () => {
    const offered = row({
      id: "p-in",
      status: "PENDING",
      initiatedBy: "me",
      pendingProposedBy: "other",
    });
    const mine = row({
      id: "p-out",
      status: "PENDING",
      initiatedBy: "me",
      pendingProposedBy: "me",
    });
    const groups = partitionPartnerOverview([offered, mine], "me");
    expect(groups.decisions.map((p) => p.id)).toEqual(["p-in"]);
    expect(groups.outgoing.map((p) => p.id)).toEqual(["p-out"]);
  });

  it("excludes archived/hidden from counts and rejected from pending groups", () => {
    const groups = partitionPartnerOverview(
      [
        row({
          id: "arch",
          status: "ACTIVE",
          initiatedBy: "me",
          listPreference: { personalAlias: null, archivedAt: "2026-01-01", hiddenAt: null },
        }),
        row({ id: "rej", status: "REJECTED", initiatedBy: "other" }),
        row({ id: "ok", status: "ACTIVE", initiatedBy: "me" }),
      ],
      "me",
    );
    expect(groups.counts).toEqual({ active: 1, decisions: 0, outgoing: 0 });
    expect(isPartnerOverviewEmpty(groups)).toBe(false);
  });

  it("maps deep-link targets to zones", () => {
    expect(
      overviewZoneForPartnership(row({ id: "a", status: "ACTIVE", initiatedBy: "me" }), "me"),
    ).toBe("active");
    expect(
      overviewZoneForPartnership(row({ id: "i", status: "INVITED", initiatedBy: "other" }), "me"),
    ).toBe("decide");
    expect(
      overviewZoneForPartnership(row({ id: "o", status: "INVITED", initiatedBy: "me" }), "me"),
    ).toBe("waiting");
  });
});
