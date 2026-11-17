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
  memberRoleSummary,
  computeTeamStats,
  countVisiblePeople,
} from "./team-section-model";
import { summarizeMemberAccess } from "./prof-i-member-permissions";
import type { EmployeesOverviewResponse, TeamMemberRow } from "./employees-overview-types";
import { shouldShowTeamNewPartnerEmptyState } from "./team-new-partner-empty-gate";

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

describe("shouldShowTeamNewPartnerEmptyState", () => {
  const baseOverview = {
    organization: { id: "o1", name: "Shop" },
    myRole: "ORG_OWNER" as const,
    myBranchIds: [],
    summary: {
      totalEmployees: 0,
      byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 },
      pendingInvites: 0,
    },
    branches: [],
    viewer: { userId: "u1", isOrgOwner: true, canManageEmployeesByBranchId: {} },
  };

  it("shows only when roster is empty without active filters", () => {
    expect(
      shouldShowTeamNewPartnerEmptyState({
        contentReady: true,
        overview: baseOverview,
        displayTeamCount: 0,
        pendingInviteCount: 0,
        soloEmployeeCount: 0,
        searchQuery: "",
        locationFilter: "all",
        invitesLoadError: false,
        canManage: true,
      }),
    ).toBe(true);
    expect(
      shouldShowTeamNewPartnerEmptyState({
        contentReady: true,
        overview: baseOverview,
        displayTeamCount: 0,
        pendingInviteCount: 0,
        soloEmployeeCount: 0,
        searchQuery: "анна",
        locationFilter: "all",
        invitesLoadError: false,
        canManage: true,
      }),
    ).toBe(false);
    expect(
      shouldShowTeamNewPartnerEmptyState({
        contentReady: false,
        overview: baseOverview,
        displayTeamCount: 0,
        pendingInviteCount: 0,
        soloEmployeeCount: 0,
        searchQuery: "",
        locationFilter: "all",
        invitesLoadError: false,
        canManage: true,
      }),
    ).toBe(false);
  });

  it("blocks empty onboarding when invite list failed to load for managers", () => {
    expect(
      shouldShowTeamNewPartnerEmptyState({
        contentReady: true,
        overview: baseOverview,
        displayTeamCount: 0,
        pendingInviteCount: 0,
        soloEmployeeCount: 0,
        searchQuery: "",
        locationFilter: "all",
        invitesLoadError: true,
        canManage: true,
      }),
    ).toBe(false);
  });
});

describe("AB-14 head-office saved-rights summary", () => {
  const office = (overrides: Partial<TeamMemberRow> = {}) =>
    sampleMember({ userId: "office-1", membershipKind: "HEAD_OFFICE", branchAccess: [], ...overrides });
  const rights = (permissions: Record<string, boolean> | null, role: string | null = "MANAGER") => ({
    "office-1": { role, permissions },
  });

  it("without Branch and without saved rights stays fail-closed: 0 permissions, no sales, no payouts", () => {
    for (const map of [undefined, {}, rights(null, null)]) {
      expect(summarizeMemberAccess(office(), map)).toMatchObject({ actionCount: 0, hasPayout: false, subtitle: "0 разрешений" });
      expect(memberRoleSummary(office(), map)).toEqual({ title: "0 разрешений", hint: "Без оформления продаж · без выплат" });
    }
  });

  it("shows exactly the saved flags: sale without payouts", () => {
    const m = memberRoleSummary(office(), rights({ canManageCertificates: true, canActivateCertificates: true, canViewOwnOperations: true }));
    expect(m.title).toBe("3 разрешений");
    expect(m.hint).toBe("Продажа и начисление бонуса · без выплат");
  });

  it("payout flags false stay «без выплат»; true flags are shown as payouts", () => {
    const base = { canActivateCertificates: true, canPayBonusCash: false, canPayBonusTransfer: false };
    expect(memberRoleSummary(office(), rights(base)).hint).toContain("без выплат");
    expect(memberRoleSummary(office(), rights({ ...base, canPayBonusTransfer: true })).hint).toBe("Выплаты партнёрам разрешены");
  });

  it("VIEWER keeps only read actions: no sale, no payout wording", () => {
    const m = memberRoleSummary(office(), rights({ canViewWallet: true, canViewOwnOperations: true }, "VIEWER"));
    expect(m.hint).toBe("Без оформления продаж · без выплат");
    expect(m.title).toBe("2 разрешений");
  });

  it("a position never produces rights, and saved office rights are not applied to branch members", () => {
    expect(summarizeMemberAccess(office({ position: "Директор" }), undefined).actionCount).toBe(0);
    const branchMember = sampleMember({ userId: "office-1" });
    const map = rights({ canActivateCertificates: true, canPayBonusCash: true });
    expect(summarizeMemberAccess(branchMember, map)).toEqual(summarizeMemberAccess(branchMember));
  });

  it("branch matrix is unchanged: mixed permissions per branch", () => {
    const m = sampleMember({
      branchAccess: [
        { employeeId: "e1", branchId: "b1", branchName: "A", city: "К", role: "SELLER", permissions: { canActivateCertificates: true } },
        { employeeId: "e2", branchId: "b2", branchName: "B", city: "К", role: "SELLER", permissions: { canViewWallet: true } },
      ],
    });
    expect(summarizeMemberAccess(m, rights({ canPayBonusCash: true }))).toMatchObject({ mixed: true, hasPayout: false });
    expect(memberRoleSummary(m).hint).toBe("Разные права по подразделениям");
  });
});

describe("AB-14 unique visible people counter", () => {
  const overview = (summary: Partial<EmployeesOverviewResponse["summary"]> = {}) =>
    ({
      organization: { id: "o", name: "N" },
      myRole: "ORG_OWNER",
      myBranchIds: [],
      summary: { totalEmployees: 1, byRole: { MANAGER: 1, SELLER: 0, VIEWER: 0 }, pendingInvites: 0, ...summary },
      branches: [],
      viewer: { userId: "x", isOrgOwner: true, canManageEmployeesByBranchId: {} },
    }) as unknown as EmployeesOverviewResponse;

  it("counts team members and direct employees once per userId (office / branches / direct)", () => {
    const a = sampleMember({ userId: "a" });
    const aOffice = sampleMember({ userId: "a", membershipKind: "HEAD_OFFICE" });
    const b = sampleMember({ userId: "b", membershipKind: "HEAD_OFFICE", branchAccess: [] });
    expect(countVisiblePeople([a, aOffice, b], ["b", "c", "c", ""])).toBe(3);
  });

  it("owner: head office + direct ORG_EMPLOYEE is 2, not the server's 1", () => {
    const office = sampleMember({ userId: "o1", membershipKind: "HEAD_OFFICE", branchAccess: [] });
    expect(computeTeamStats(overview({ uniqueEmployees: 1 }), [office], [], ["direct"]).employees).toBe(2);
  });

  it("SOLO list with five people and an empty team shows 5, not 0", () => {
    const ids = ["1", "2", "3", "4", "5"];
    expect(computeTeamStats(overview({ totalEmployees: 0, uniqueEmployees: 0 }), [], [], ids).employees).toBe(5);
  });

  it("without direct list and without members the server summary is the fallback", () => {
    expect(computeTeamStats(overview({ uniqueEmployees: 3 }), [], []).employees).toBe(3);
  });
});
