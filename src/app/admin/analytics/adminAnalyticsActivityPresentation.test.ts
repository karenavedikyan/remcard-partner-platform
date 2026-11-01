import { describe, expect, it } from "vitest";
import { buildFrozenActivityKpis } from "./adminAnalyticsActivityPresentation";

describe("adminAnalyticsActivityPresentation", () => {
  it("never maps registrations to consent KPIs", () => {
    const kpis = buildFrozenActivityKpis(
      {
        activity: {
          profPartnerProfilesUsed: { distinctInPeriod: 5, coverageNote: "x", collectionStartedAt: null },
          publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "" },
          publicPartnerCardViews: { viewsInPeriod: 99, coverageNote: "" },
        },
      } as never,
      "7d",
    );
    expect(kpis.find((k) => k.id === "consent-yes")?.value).toBe("—");
    expect(kpis.find((k) => k.id === "cabinet-period")?.value).toBe("5");
    expect(kpis.find((k) => k.id === "inactive-14d")?.value).toBe("—");
  });

  it("uses em dash when cabinet visits null", () => {
    const kpis = buildFrozenActivityKpis(
      {
        activity: {
          profPartnerProfilesUsed: { distinctInPeriod: null, coverageNote: "нет", collectionStartedAt: null },
          publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "" },
          publicPartnerCardViews: { viewsInPeriod: 0, coverageNote: "" },
        },
      } as never,
      "30d",
    );
    expect(kpis.find((k) => k.id === "cabinet-period")?.value).toBe("—");
  });
});
