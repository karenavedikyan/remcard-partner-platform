import { describe, expect, it } from "vitest";
import { buildRemoveFromTeamConfirmCopy, branchesLosingSoleManager } from "./team-member-remove-copy";
import type { EmployeesOverviewResponse, TeamMemberRow } from "./employees-overview-types";

const overview = {
  organization: { id: "o1", name: "ОПТОВИК" },
  branches: [
    {
      id: "b1",
      name: "Ф1",
      city: "C",
      address: "a",
      employees: [
        { id: "e1", role: "MANAGER", user: { id: "u1" }, permissions: {}, fullName: null },
      ],
      pendingInvites: [],
    },
  ],
} as unknown as EmployeesOverviewResponse;

const member = {
  userId: "u1",
  displayName: "Mgr",
  branchAccess: [{ branchId: "b1", branchName: "Ф1", role: "MANAGER" }],
} as unknown as TeamMemberRow;

describe("team-member-remove-copy", () => {
  it("lists sole-manager branches for warning", () => {
    expect(branchesLosingSoleManager(overview, member)).toEqual([{ branchId: "b1", branchName: "Ф1" }]);
  });

  it("includes sole manager warning in confirm copy", () => {
    const copy = buildRemoveFromTeamConfirmCopy({
      member,
      organizationName: "ОПТОВИК",
      soleManagerBranches: [{ branchName: "Ф1" }],
    });
    expect(copy.body).toContain("без управляющего");
    expect(copy.body).toContain("ОПТОВИК");
  });
});
