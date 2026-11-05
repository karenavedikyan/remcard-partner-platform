import { describe, expect, it } from "vitest";
import { resolveOrgStaffWorkplaceProfile } from "./workplace-profile";

describe("resolveOrgStaffWorkplaceProfile", () => {
  it("enables staff profile for PRO COMPANY employee at STORE org", () => {
    expect(
      resolveOrgStaffWorkplaceProfile({
        workplacePartnerType: "STORE",
        workplacePartnerTypeSource: "org-context",
        proContext: {
          role: "ORG_EMPLOYEE",
          organization: { id: "o1", name: "Shop", partnerType: "STORE" },
        },
      }),
    ).toEqual({ partnerType: "STORE" });
  });

  it("skips org owner operating on personal profile", () => {
    expect(
      resolveOrgStaffWorkplaceProfile({
        workplacePartnerType: "STORE",
        workplacePartnerTypeSource: "org-context",
        proContext: {
          role: "ORG_OWNER",
          organization: { id: "o1", name: "Shop", partnerType: "STORE" },
        },
      }),
    ).toBeNull();
  });
});
