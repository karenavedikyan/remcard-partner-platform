import { describe, expect, it } from "vitest";
import {
  filterTeamMembers,
  formatAccessScopeLabel,
  HEAD_OFFICE_LOCATION_ID,
  memberMatchesLocation,
  canManageBranch,
  inviteScopeLabel,
  mergePendingInvites,
  resolveDisplayTeam,
} from "./team-section-model";
import type { EmployeesOverviewResponse, TeamMemberRow } from "./employees-overview-types";

const sampleMember = (overrides: Partial<TeamMemberRow> = {}): TeamMemberRow => ({
  userId: "u1",
  displayName: "Анна",
  publicId: "RC-A",
  photoUrl: null,
  lastActiveAt: null,
  fullName: "Анна Петрова",
  position: "Старший продавец",
  membershipKind: "BRANCH_STAFF",
  orgMemberStatus: null,
  branchAccess: [
    {
      employeeId: "e1",
      branchId: "b1",
      branchName: "Центральный",
      city: "Краснодар",
      role: "SELLER",
      permissions: {},
    },
  ],
  ...overrides,
});

describe("team-section-model", () => {
  it("filters by name and position", () => {
    const members = [
      sampleMember(),
      sampleMember({ userId: "u2", fullName: "Борис", position: "Бухгалтер" }),
    ];
    expect(filterTeamMembers({ members, query: "бухгал", locationFilter: "all" })).toHaveLength(1);
    expect(filterTeamMembers({ members, query: "петров", locationFilter: "all" })).toHaveLength(1);
  });

  it("matches head office location separately from branches", () => {
    const office = sampleMember({
      membershipKind: "HEAD_OFFICE",
      branchAccess: [],
    });
    expect(memberMatchesLocation(office, HEAD_OFFICE_LOCATION_ID)).toBe(true);
    expect(memberMatchesLocation(office, "b1")).toBe(false);
  });

  it("formats scope with office and all branches", () => {
    const m = sampleMember({
      membershipKind: "HEAD_OFFICE",
      branchAccess: [
        { employeeId: "e1", branchId: "b1", branchName: "A", city: "C", role: "MANAGER", permissions: {} },
        { employeeId: "e2", branchId: "b2", branchName: "B", city: "C", role: "MANAGER", permissions: {} },
      ],
    });
    const { primary } = formatAccessScopeLabel(m, 2);
    expect(primary).toContain("Все 2");
    expect(primary).toContain("Головной офис");
  });

  it("merges staff url into overview row with same id", () => {
    const overview = {
      organization: { id: "o", name: "O" },
      branches: [{ id: "b1", name: "A", city: "C", address: "a", employees: [], pendingInvites: [] }],
      organizationPendingInvites: [
        {
          id: "same-id",
          role: "SELLER",
          position: "Менеджер",
          fullName: "Иван",
          membershipKind: "BRANCH_STAFF",
          branchIds: ["b1"],
          allCurrentBranchesSnapshot: false,
          createdAt: "",
          expiresAt: "2026-12-01",
          status: "PENDING",
        },
      ],
    } as EmployeesOverviewResponse;
    const merged = mergePendingInvites({
      overview,
      staffInvites: [
        {
          id: "same-id",
          url: "https://prof.test/invite/abc",
          role: "SELLER",
          position: "Менеджер",
          status: "PENDING",
          branchName: "A",
          expiresAt: "2026-12-01",
        },
      ],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0]?.url).toBe("https://prof.test/invite/abc");
    expect(merged[0]?.scopeLabel).toBe("A");
  });

  it("invite scope uses snapshot branchIds count not current branch list", () => {
    const label = inviteScopeLabel(
      {
        id: "x",
        role: "SELLER",
        position: null,
        fullName: null,
        membershipKind: "BRANCH_STAFF",
        branchIds: ["b1", "b2"],
        allCurrentBranchesSnapshot: true,
        createdAt: "",
        expiresAt: "",
        status: "PENDING",
      },
      [
        { id: "b1", name: "A", city: "C", address: "", employees: [], pendingInvites: [] },
        { id: "b2", name: "B", city: "C", address: "", employees: [], pendingInvites: [] },
        { id: "b3", name: "C", city: "C", address: "", employees: [], pendingInvites: [] },
      ],
    );
    expect(label).toBe("Все 2 филиалов на момент приглашения");
  });

  it("merges pending invites without duplicate ids", () => {
    const overview = {
      organization: { id: "o", name: "O" },
      branches: [
        {
          id: "b1",
          name: "Ф1",
          city: "C",
          address: "a",
          employees: [],
          pendingInvites: [
            {
              id: "inv-b",
              role: "SELLER",
              position: "Кассир",
              fullName: null,
              createdAt: "",
              expiresAt: "2026-12-01",
              status: "PENDING",
            },
          ],
        },
      ],
      organizationPendingInvites: [
        {
          id: "inv-o",
          role: "MANAGER",
          position: "Менеджер",
          fullName: "Иван",
          membershipKind: "BRANCH_STAFF",
          branchIds: ["b1"],
          allCurrentBranchesSnapshot: false,
          createdAt: "",
          expiresAt: "2026-12-01",
          status: "PENDING",
        },
      ],
    } as EmployeesOverviewResponse;
    const merged = mergePendingInvites({
      overview,
      staffInvites: [
        {
          id: "inv-s",
          url: "https://x/invite",
          role: "SELLER",
          position: "Продавец",
          status: "PENDING",
          branchName: "Ф1",
          expiresAt: "2026-12-01",
        },
      ],
    });
    expect(merged).toHaveLength(3);
    expect(merged.find((i) => i.url)?.url).toContain("invite");
  });

  it("branch manager invite gate is per branch", () => {
    const overview = {
      viewer: { isOrgOwner: false, canManageEmployeesByBranchId: { b1: true, b2: false } },
    } as EmployeesOverviewResponse;
    expect(canManageBranch(overview, "b1")).toBe(true);
    expect(canManageBranch(overview, "b2")).toBe(false);
  });

  it("synthesizes legacy team rows from branch employees", () => {
    const overview = {
      team: [],
      branches: [
        {
          id: "b1",
          name: "Ф1",
          city: "C",
          address: "a",
          employees: [
            {
              id: "e1",
              role: "SELLER",
              createdAt: "",
              fullName: null,
              user: {
                id: "uu",
                displayName: "Legacy",
                publicId: "RC-L",
                photoUrl: null,
                lastActiveAt: null,
              },
              permissions: {},
            },
          ],
          pendingInvites: [],
        },
      ],
    } as unknown as EmployeesOverviewResponse;
    expect(resolveDisplayTeam(overview)).toHaveLength(1);
  });
});
