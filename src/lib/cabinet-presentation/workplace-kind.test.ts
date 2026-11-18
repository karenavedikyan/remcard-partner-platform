import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/types";
import { resolveCabinetPresentation } from "./resolve";
import {
  agentEmployeeContext,
  companyOrgEmployeeContext,
  specialistEmployeeContext,
  storeBranchEmployeeContext,
  storeOrgEmployeeContext,
} from "./test-fixtures";
import {
  classifyEmployerWorkplaceKind,
  workspaceTypeCaption,
} from "./workplace-kind";

const employeeUser: AuthUser = {
  id: "emp-1",
  displayName: "Сотрудник",
  role: "CLIENT",
  partnerType: null,
  partnerActivities: [],
};

function presentationFor(user: AuthUser, proContext: Parameters<typeof resolveCabinetPresentation>[0]["proContext"]) {
  return resolveCabinetPresentation({ user, proContext, contextReady: true, contextHttpStatus: 200 });
}

describe("classifyEmployerWorkplaceKind", () => {
  it("separates specialists from agents", () => {
    expect(
      classifyEmployerWorkplaceKind({ id: "1", displayName: "x", partnerType: "MASTER", partnerActivities: ["SERVICE"] }),
    ).toBe("MASTER");
    expect(
      classifyEmployerWorkplaceKind({ id: "1", displayName: "x", partnerActivities: ["AGENT"] }),
    ).toBe("AGENT");
    expect(
      classifyEmployerWorkplaceKind({ id: "1", displayName: "x", companyKind: "REALTY_AGENCY" }),
    ).toBe("AGENT");
    expect(
      classifyEmployerWorkplaceKind({
        id: "1",
        displayName: "x",
        partnerType: "MASTER",
        partnerActivities: ["SERVICE", "AGENT"],
      }),
    ).toBe("MASTER");
  });

  it("does not guess when the employer brief carries no trade data", () => {
    expect(classifyEmployerWorkplaceKind({ id: "1", displayName: "x" })).toBeNull();
    expect(classifyEmployerWorkplaceKind(null)).toBeNull();
  });
});

describe("cabinet presentation: owner and employee of every partner type", () => {
  const owners: Array<{ name: string; user: AuthUser; navMode: string; kind: string; caption: string }> = [
    {
      name: "STORE owner",
      user: { id: "o1", role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] },
      navMode: "business-store",
      kind: "STORE",
      caption: "Магазин",
    },
    {
      name: "COMPANY owner",
      user: { id: "o2", role: "PRO", partnerType: "COMPANY", partnerActivities: ["STORE", "SERVICE"] },
      navMode: "business-company",
      kind: "COMPANY",
      caption: "Компания",
    },
    {
      name: "MASTER owner",
      user: { id: "o3", role: "PRO", partnerType: "MASTER", partnerActivities: ["SERVICE"] },
      navMode: "master",
      kind: "MASTER",
      caption: "Специалист",
    },
    {
      name: "AGENT owner",
      user: { id: "o4", role: "PRO", partnerType: "COMPANY", partnerActivities: ["AGENT"] },
      navMode: "agent",
      kind: "AGENT",
      caption: "Агент",
    },
  ];

  it.each(owners)("$name", ({ user, navMode, kind, caption }) => {
    const presentation = presentationFor(user, null);
    expect(presentation.navMode).toBe(navMode);
    expect(presentation.workplaceKind).toBe(kind);
    expect(
      workspaceTypeCaption({ workplaceKind: presentation.workplaceKind, proContext: presentation.proContext }),
    ).toBe(caption);
  });

  const employees = [
    { name: "STORE employee", ctx: storeOrgEmployeeContext, navMode: "business-store", kind: "STORE", caption: "Магазин" },
    { name: "COMPANY employee", ctx: companyOrgEmployeeContext, navMode: "business-company", kind: "COMPANY", caption: "Компания" },
    { name: "MASTER employee", ctx: specialistEmployeeContext, navMode: "master", kind: "MASTER", caption: "Специалист" },
    { name: "AGENT employee", ctx: agentEmployeeContext, navMode: "agent", kind: "AGENT", caption: "Агент" },
    {
      name: "STORE employee attached to a branch",
      ctx: storeBranchEmployeeContext,
      navMode: "business-store",
      kind: "STORE",
      caption: "Магазин · Филиал Центр",
    },
  ] as const;

  it.each(employees)("$name", ({ ctx, navMode, kind, caption }) => {
    const presentation = presentationFor(employeeUser, ctx);
    expect(presentation.navMode).toBe(navMode);
    expect(presentation.workplaceKind).toBe(kind);
    expect(
      workspaceTypeCaption({ workplaceKind: presentation.workplaceKind, proContext: presentation.proContext }),
    ).toBe(caption);
  });

  it("an employee without a branch gets no « · » suffix", () => {
    const presentation = presentationFor(employeeUser, storeOrgEmployeeContext);
    expect(
      workspaceTypeCaption({ workplaceKind: presentation.workplaceKind, proContext: presentation.proContext }),
    ).not.toContain("·");
  });

  it("single ACTIVE branch assignment names the branch when no active branch is set", () => {
    const caption = workspaceTypeCaption({
      workplaceKind: "COMPANY",
      proContext: {
        ...companyOrgEmployeeContext,
        activeBranch: null,
        branches: [{ id: "b9", name: "Филиал Север", city: "Омск" }],
        branchAssignments: [{ branchId: "b9", status: "ACTIVE" }],
      },
    });
    expect(caption).toBe("Компания · Филиал Север");
  });

  it("an employee of an unclassified employer stays unclassified", () => {
    const presentation = presentationFor(employeeUser, {
      role: "PARTNER_EMPLOYEE",
      employer: { id: "e1", displayName: "Employer" },
    });
    expect(presentation.navMode).toBe("legacy");
    expect(presentation.workplaceKind).toBeNull();
    expect(workspaceTypeCaption({ workplaceKind: null, proContext: presentation.proContext })).toBe(
      "Рабочее пространство",
    );
  });

  it("a suspended employee is never classified", () => {
    const presentation = presentationFor(employeeUser, {
      ...specialistEmployeeContext,
      role: "PARTNER_EMPLOYEE_SUSPENDED",
    });
    expect(presentation.workplaceKind).toBeNull();
  });
});
