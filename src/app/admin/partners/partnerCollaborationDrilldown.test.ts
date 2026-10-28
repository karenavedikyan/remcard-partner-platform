import { describe, expect, it } from "vitest";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import {
  adminPartnerPartnershipsDrilldownHref,
  COUNT_KEY_TO_STATUS,
  isPartnershipCountDrilldownAvailable,
  parseAdminPartnershipStatusFilter,
} from "./partnerCollaborationDrilldown";

function row(overrides: Partial<PartnerRegistryItem> = {}): PartnerRegistryItem {
  return {
    id: "partner-abc",
    publicId: null,
    displayName: "Acme",
    partnerType: "STORE",
    city: "Moscow",
    registrationLabel: "ACTIVE",
    lifecycle: null,
    ...overrides,
  };
}

describe("partnerCollaborationDrilldown", () => {
  it("maps count keys to API status filters", () => {
    expect(COUNT_KEY_TO_STATUS.active).toBe("ACTIVE");
    expect(COUNT_KEY_TO_STATUS.total).toBe("ALL");
    expect(COUNT_KEY_TO_STATUS.invited).toBe("INVITED");
  });

  it("builds admin drilldown href with encoded id, status and optional context name", () => {
    expect(adminPartnerPartnershipsDrilldownHref("id/with/slash", "PENDING")).toBe(
      "/admin/partners/id%2Fwith%2Fslash/partnerships?status=PENDING",
    );
    expect(adminPartnerPartnershipsDrilldownHref("p1", "ACTIVE", { contextName: "Acme" })).toContain(
      "status=ACTIVE",
    );
    expect(adminPartnerPartnershipsDrilldownHref("p1", "ACTIVE", { contextName: "Acme" })).toContain(
      "contextName=Acme",
    );
  });

  it("allows drilldown for numeric zero but not for absent counts", () => {
    const withZero = row({
      partnershipCounts: { active: 0, invited: 0, pending: 0, paused: 0, ended: 0, total: 0 },
    });
    expect(isPartnershipCountDrilldownAvailable(withZero, "active")).toBe(true);
    expect(isPartnershipCountDrilldownAvailable(row(), "active")).toBe(false);
    const partial = row({
      partnershipCounts: {
        active: 1,
        invited: 0,
        pending: 0,
        paused: 0,
        ended: 0,
        total: undefined as unknown as number,
      },
    });
    expect(isPartnershipCountDrilldownAvailable(partial, "total")).toBe(false);
  });

  it("normalizes unknown status query to ALL", () => {
    expect(parseAdminPartnershipStatusFilter(null)).toBe("ALL");
    expect(parseAdminPartnershipStatusFilter("invited")).toBe("INVITED");
    expect(parseAdminPartnershipStatusFilter("bogus")).toBe("ALL");
  });
});
