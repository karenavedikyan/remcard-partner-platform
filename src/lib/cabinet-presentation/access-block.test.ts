import { describe, expect, it } from "vitest";
import { resolveCabinetPresentationBlock } from "./access-block";
import { resolveCabinetPresentation } from "./resolve";

describe("resolveCabinetPresentationBlock", () => {
  it("uses transient block for employee 503 (not SessionGate)", () => {
    const presentation = resolveCabinetPresentation({
      user: {
        id: "e1",
        displayName: "E",
        role: "CLIENT",
        partnerType: null,
        partnerActivities: [],
      },
      proContext: null,
      contextReady: false,
      contextHttpStatus: 503,
    });
    const block = resolveCabinetPresentationBlock({
      isEmployee: true,
      presentation,
      returnTo: "/",
    });
    expect(block).toMatchObject({ blocked: true, kind: "transient" });
  });

  it("fail-closes suspended validated context for employee", () => {
    const presentation = resolveCabinetPresentation({
      user: {
        id: "e1",
        displayName: "E",
        role: "CLIENT",
        partnerType: null,
        partnerActivities: [],
      },
      proContext: {
        role: "PARTNER_EMPLOYEE_SUSPENDED",
        employer: { id: "p1", displayName: "P" },
      },
      contextReady: false,
      contextHttpStatus: 200,
    });
    const block = resolveCabinetPresentationBlock({
      isEmployee: true,
      presentation,
      returnTo: "/",
    });
    expect(block).toMatchObject({ blocked: true, kind: "workplace" });
  });
});
