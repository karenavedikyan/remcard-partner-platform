import { resolveCabinetPresentation } from "./resolve";
import type { CabinetPresentationSnapshot } from "./types";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";

export function cabinetPresentationFixture(
  user: AuthUser,
  proContext: ProContextSnapshot | null = null,
  contextReady = true,
): CabinetPresentationSnapshot {
  return resolveCabinetPresentation({
    user,
    proContext,
    contextReady,
    contextHttpStatus: contextReady ? 200 : 403,
  });
}

export const storeOrgEmployeeContext: ProContextSnapshot = {
  role: "ORG_EMPLOYEE",
  organization: { id: "org-store-1", name: "Синтетический магазин", partnerType: "STORE" },
  branches: [],
  activeBranch: null,
  teamCapabilities: {
    canOpenTeamSection: false,
    canFetchEmployeesOverview: false,
    canManageEmployeesByBranchId: {},
  },
};

export const companyOrgEmployeeContext: ProContextSnapshot = {
  role: "ORG_TEAM_MEMBER",
  organization: { id: "org-co-1", name: "Синтетическая компания", partnerType: "COMPANY" },
  branches: [],
  activeBranch: null,
  membershipPosition: "Менеджер отдела",
  teamCapabilities: {
    canOpenTeamSection: true,
    canFetchEmployeesOverview: true,
    canManageEmployeesByBranchId: {},
  },
};

export const specialistEmployeeContext: ProContextSnapshot = {
  role: "PARTNER_EMPLOYEE",
  organization: null,
  branches: [],
  activeBranch: null,
  employer: {
    id: "spec-1",
    displayName: "S1 Специалист",
    companyKind: null,
    partnerType: "MASTER",
    partnerActivities: ["SERVICE"],
  },
  employeeRole: "SELLER",
};

export const agentEmployeeContext: ProContextSnapshot = {
  role: "PARTNER_EMPLOYEE",
  organization: null,
  branches: [],
  activeBranch: null,
  employer: {
    id: "agent-1",
    displayName: "A1 Агент",
    companyKind: null,
    partnerType: null,
    partnerActivities: ["AGENT"],
  },
  employeeRole: "SELLER",
};

export const storeBranchEmployeeContext: ProContextSnapshot = {
  role: "BRANCH_EMPLOYEE",
  organization: { id: "org-store-1", name: "Синтетический магазин", partnerType: "STORE" },
  branches: [{ id: "br-1", name: "Филиал Центр", city: "Москва" }],
  activeBranch: { id: "br-1", name: "Филиал Центр", city: "Москва" },
  teamCapabilities: {
    canOpenTeamSection: false,
    canFetchEmployeesOverview: false,
    canManageEmployeesByBranchId: {},
  },
};
