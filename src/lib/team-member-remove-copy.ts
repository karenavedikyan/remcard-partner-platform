import type { EmployeesOverviewResponse, TeamMemberRow } from "./employees-overview-types";
import { memberDisplayName } from "./team-section-model";

export function branchesLosingSoleManager(
  overview: EmployeesOverviewResponse,
  member: TeamMemberRow,
): Array<{ branchId: string; branchName: string }> {
  const out: Array<{ branchId: string; branchName: string }> = [];
  for (const access of member.branchAccess) {
    if (access.role !== "MANAGER") continue;
    const branch = overview.branches.find((b) => b.id === access.branchId);
    if (!branch) continue;
    const managerCount = branch.employees.filter((e) => e.role === "MANAGER").length;
    if (managerCount <= 1) {
      out.push({ branchId: branch.id, branchName: branch.name });
    }
  }
  return out;
}

export function branchesLosingSoleManagerOnUncheck(
  overview: EmployeesOverviewResponse,
  member: TeamMemberRow,
  selectedBranchIds: Set<string>,
): Array<{ branchId: string; branchName: string }> {
  const out: Array<{ branchId: string; branchName: string }> = [];
  for (const access of member.branchAccess) {
    if (selectedBranchIds.has(access.branchId)) continue;
    if (access.role !== "MANAGER") continue;
    const branch = overview.branches.find((b) => b.id === access.branchId);
    if (!branch) continue;
    const managerCount = branch.employees.filter((e) => e.role === "MANAGER").length;
    const selfIsManager = branch.employees.some(
      (e) => e.user.id === member.userId && e.role === "MANAGER",
    );
    if (managerCount <= 1 && selfIsManager) {
      out.push({ branchId: branch.id, branchName: branch.name });
    }
  }
  return out;
}

export function buildRemoveFromTeamConfirmCopy(input: {
  member: TeamMemberRow;
  organizationName: string;
  soleManagerBranches: Array<{ branchName: string }>;
}): { title: string; body: string } {
  const name = memberDisplayName(input.member);
  const org = input.organizationName.trim() || "организации";
  let body = `Удалить ${name} из команды «${org}»? Доступ ко всем её филиалам будет закрыт. Личный аккаунт и история операций сохранятся.`;
  if (input.soleManagerBranches.length > 0) {
    const names = input.soleManagerBranches.map((b) => b.branchName).join(", ");
    body += ` Филиал${input.soleManagerBranches.length > 1 ? "ы" : ""} ${names} останется без управляющего. Вы как владелец сохраните доступ.`;
  }
  return { title: "Удалить из команды", body };
}
