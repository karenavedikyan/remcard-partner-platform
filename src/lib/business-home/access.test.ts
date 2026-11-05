import { describe, expect, it } from "vitest";
import { resolveBusinessHomeSurfaceMode } from "./access";
import { storeOrgEmployeeContext } from "@/lib/cabinet-presentation/test-fixtures";

describe("resolveBusinessHomeSurfaceMode", () => {
  it("uses staff template for org-context non-owner", () => {
    expect(
      resolveBusinessHomeSurfaceMode({
        proContext: storeOrgEmployeeContext,
        workplacePartnerType: "STORE",
        workplacePartnerTypeSource: "org-context",
      }),
    ).toBe("org-staff-template");
  });

  it("uses owner operating for personal profile owner", () => {
    expect(
      resolveBusinessHomeSurfaceMode({
        proContext: {
          role: "ORG_OWNER",
          organization: { id: "o1", name: "Shop", partnerType: "STORE" },
        },
        workplacePartnerType: "STORE",
        workplacePartnerTypeSource: "personal-profile",
      }),
    ).toBe("owner-operating");
  });
});
