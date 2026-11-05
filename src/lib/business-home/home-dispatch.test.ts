import { describe, expect, it } from "vitest";
import { shouldDeferPersonalSpecialistHome } from "./home-dispatch";

describe("shouldDeferPersonalSpecialistHome", () => {
  it("defers specialist when org workplace business home applies (PRO STORE employee at COMPANY)", () => {
    expect(
      shouldDeferPersonalSpecialistHome(
        { role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] },
        {
          workplacePartnerType: "COMPANY",
          workplacePartnerTypeSource: "org-context",
          proContext: {
            role: "ORG_EMPLOYEE",
            organization: { id: "o1", name: "Co", partnerType: "COMPANY" },
          },
        },
      ),
    ).toBe(true);
  });

  it("defers specialist for PRO MASTER org staff even with personal MASTER profile", () => {
    expect(
      shouldDeferPersonalSpecialistHome(
        { role: "PRO", partnerType: "MASTER", partnerActivities: ["MASTER", "AGENT"] },
        {
          workplacePartnerType: "STORE",
          workplacePartnerTypeSource: "org-context",
          proContext: {
            role: "ORG_EMPLOYEE",
            organization: { id: "o2", name: "Shop", partnerType: "STORE" },
          },
        },
      ),
    ).toBe(true);
  });

  it("allows specialist for personal MASTER without org workplace", () => {
    expect(
      shouldDeferPersonalSpecialistHome(
        { role: "PRO", partnerType: "MASTER", partnerActivities: ["MASTER"] },
        {
          workplacePartnerType: null,
          workplacePartnerTypeSource: null,
          proContext: null,
        },
      ),
    ).toBe(false);
  });
});
