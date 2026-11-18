import { describe, expect, it } from "vitest";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import {
  employeeRequiresWorkplaceContext,
  isKnownProContextRole,
  resolveCabinetPresentation,
  resolveWorkplacePartnerType,
  shouldPreferBusinessWorkplaceDispatch,
} from "./resolve";
import { companyOrgEmployeeContext, storeOrgEmployeeContext } from "./test-fixtures";

describe("shouldPreferBusinessWorkplaceDispatch", () => {
  it("is true for org-context staff (incl. PRO personal MASTER)", () => {
    expect(
      shouldPreferBusinessWorkplaceDispatch({
        proContextRole: "ORG_EMPLOYEE",
        workplacePartnerType: "STORE",
        workplacePartnerTypeSource: "org-context",
      }),
    ).toBe(true);
  });

  it("is false for PRO org owner even with org workplace", () => {
    expect(
      shouldPreferBusinessWorkplaceDispatch({
        proContextRole: "ORG_OWNER",
        workplacePartnerType: "STORE",
        workplacePartnerTypeSource: "org-context",
      }),
    ).toBe(false);
  });
});

describe("resolveWorkplacePartnerType", () => {
  it("uses owner profile for PRO store owner without org context", () => {
    expect(
      resolveWorkplacePartnerType({
        user: { role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] },
        proContext: null,
        contextReady: false,
      }),
    ).toBe("STORE");
  });

  it("prefers org COMPANY over personal PRO STORE for org employee", () => {
    expect(
      resolveWorkplacePartnerType({
        user: { role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] },
        proContext: {
          role: "ORG_EMPLOYEE",
          organization: { id: "o-co", name: "Co", partnerType: "COMPANY" },
        },
        contextReady: true,
      }),
    ).toBe("COMPANY");
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

describe("sessionRoleLabel under the account name", () => {
  const solo = { role: "SOLO_PARTNER", organization: null } as const;
  const labelFor = (
    user: { partnerType: "STORE" | "COMPANY" | "MASTER" | null; partnerActivities: string[]; role?: "PRO" | "CLIENT" },
    proContext: ProContextSnapshot | null,
  ) =>
    resolveCabinetPresentation({
      user: { id: "u", displayName: "Тест", role: "PRO", ...user },
      proContext,
      contextReady: true,
      contextHttpStatus: 200,
    }).sessionRoleLabel;

  it("solo specialist (S0, S1) is «Специалист», not «Партнёр»", () => {
    expect(labelFor({ partnerType: "MASTER", partnerActivities: ["SERVICE"] }, solo)).toBe("Специалист");
  });

  it("solo store is «Магазин», solo company is «Компания», solo agent is «Агент»", () => {
    expect(labelFor({ partnerType: "STORE", partnerActivities: ["STORE"] }, solo)).toBe("Магазин");
    expect(labelFor({ partnerType: "COMPANY", partnerActivities: ["SERVICE"] }, solo)).toBe("Компания");
    expect(labelFor({ partnerType: "COMPANY", partnerActivities: ["AGENT"] }, solo)).toBe("Агент");
  });

  it("keeps «Партнёр» when the partner type cannot be determined", () => {
    expect(labelFor({ partnerType: null, partnerActivities: [] }, solo)).toBe("Партнёр");
  });

  it("org owner (K1) keeps «Владелец организации»", () => {
    expect(
      labelFor(
        { partnerType: "COMPANY", partnerActivities: ["SERVICE"] },
        { role: "ORG_OWNER", organization: { id: "o1", name: "Компания", partnerType: "COMPANY" } },
      ),
    ).toBe("Владелец организации");
  });

  it("an employee with a position shows the position, without one the role label", () => {
    expect(
      labelFor({ partnerType: null, partnerActivities: [], role: "CLIENT" }, companyOrgEmployeeContext),
    ).toBe("Менеджер отдела");
    expect(
      labelFor({ partnerType: null, partnerActivities: [], role: "CLIENT" }, storeOrgEmployeeContext),
    ).toBe("Сотрудник организации");
  });
});
