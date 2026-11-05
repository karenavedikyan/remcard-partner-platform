import { describe, expect, it } from "vitest";
import {
  employeeRequiresWorkplaceContext,
  isKnownProContextRole,
  resolveCabinetPresentation,
  resolveWorkplacePartnerType,
} from "./resolve";
import { companyOrgEmployeeContext, storeOrgEmployeeContext } from "./test-fixtures";

describe("resolveWorkplacePartnerType", () => {
  it("uses owner profile for PRO store owner", () => {
    expect(
      resolveWorkplacePartnerType({
        user: { role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] },
        proContext: null,
        contextReady: false,
      }),
    ).toBe("STORE");
  });

  it("uses org partnerType for CLIENT org employee", () => {
    expect(
      resolveWorkplacePartnerType({
        user: { role: "CLIENT", partnerType: null, partnerActivities: [] },
        proContext: storeOrgEmployeeContext,
        contextReady: true,
      }),
    ).toBe("STORE");
  });

  it("does not invent partnerType for employer-only PARTNER_EMPLOYEE", () => {
    expect(
      resolveWorkplacePartnerType({
        user: { role: "CLIENT", partnerType: null, partnerActivities: [] },
        proContext: {
          role: "PARTNER_EMPLOYEE",
          employer: { id: "p1", displayName: "Партнёр", companyKind: "STORE" },
        },
        contextReady: true,
      }),
    ).toBeNull();
  });
});

describe("resolveCabinetPresentation", () => {
  it("keeps actor name separate from workspace org name for employees", () => {
    const snapshot = resolveCabinetPresentation({
      user: {
        id: "actor-1",
        displayName: "Сергей Ж.",
        role: "CLIENT",
        partnerType: null,
        partnerActivities: [],
      },
      proContext: storeOrgEmployeeContext,
      contextReady: true,
      contextHttpStatus: 200,
    });
    expect(snapshot.actorDisplayName).toBe("Сергей Ж.");
    expect(snapshot.workspaceOrganizationName).toBe("Синтетический магазин");
    expect(snapshot.sessionRoleLabel).toBe("Сотрудник организации");
    expect(snapshot.navMode).toBe("business-store");
  });

  it("uses membership position when provided", () => {
    const snapshot = resolveCabinetPresentation({
      user: {
        id: "actor-2",
        displayName: "Анна",
        role: "CLIENT",
        partnerType: null,
        partnerActivities: [],
      },
      proContext: companyOrgEmployeeContext,
      contextReady: true,
      contextHttpStatus: 200,
    });
    expect(snapshot.sessionRoleLabel).toBe("Менеджер отдела");
    expect(snapshot.navMode).toBe("business-company");
  });
});

describe("employeeRequiresWorkplaceContext", () => {
  const employeeUser = {
    id: "e1",
    displayName: "Сотрудник",
    role: "CLIENT" as const,
    partnerType: null,
    partnerActivities: [] as string[],
  };

  it("fail-closed when context is unavailable", () => {
    const presentation = resolveCabinetPresentation({
      user: employeeUser,
      proContext: null,
      contextReady: false,
      contextHttpStatus: 403,
    });
    expect(employeeRequiresWorkplaceContext({ isEmployee: true, presentation })).toBe(true);
  });

  it("fail-closed for org member without partnerType in context", () => {
    const presentation = resolveCabinetPresentation({
      user: employeeUser,
      proContext: {
        role: "ORG_EMPLOYEE",
        organization: { id: "o1", name: "Org" },
      },
      contextReady: true,
      contextHttpStatus: 200,
    });
    expect(employeeRequiresWorkplaceContext({ isEmployee: true, presentation })).toBe(true);
  });

  it("allows PARTNER_EMPLOYEE with legacy nav when context is ready", () => {
    const presentation = resolveCabinetPresentation({
      user: employeeUser,
      proContext: {
        role: "PARTNER_EMPLOYEE",
        employer: { id: "p1", displayName: "Employer" },
      },
      contextReady: true,
      contextHttpStatus: 200,
    });
    expect(presentation.navMode).toBe("legacy");
    expect(employeeRequiresWorkplaceContext({ isEmployee: true, presentation })).toBe(false);
  });

  it("fail-closed on unknown context role", () => {
    const presentation = resolveCabinetPresentation({
      user: employeeUser,
      proContext: { role: "MYSTERY_ROLE" },
      contextReady: true,
      contextHttpStatus: 200,
    });
    expect(isKnownProContextRole("MYSTERY_ROLE")).toBe(false);
    expect(employeeRequiresWorkplaceContext({ isEmployee: true, presentation })).toBe(true);
  });

  it("does not apply to non-employees", () => {
    const presentation = resolveCabinetPresentation({
      user: {
        id: "o1",
        displayName: "Owner",
        role: "PRO",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      },
      proContext: null,
      contextReady: false,
      contextHttpStatus: 403,
    });
    expect(employeeRequiresWorkplaceContext({ isEmployee: false, presentation })).toBe(false);
  });
});
