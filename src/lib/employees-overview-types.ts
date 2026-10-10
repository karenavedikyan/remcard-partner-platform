/** Mirrors GET /api/pro/organization/employees-overview (navigator). */

export type EmployeesOverviewResponse = {
  organization: { id: string; name: string };
  myRole: "ORG_OWNER" | "MANAGER" | "SOLO_PARTNER" | "OTHER";
  myBranchIds: string[];
  summary: {
    totalEmployees: number;
    byRole: { MANAGER: number; SELLER: number; VIEWER: number };
    pendingInvites: number;
    uniqueEmployees?: number;
  };
  team?: TeamMemberRow[];
  organizationPendingInvites?: OrganizationPendingInviteRow[];
  branches: Array<{
    id: string;
    name: string;
    city: string;
    address: string;
    employees: Array<{
      id: string;
      role: string;
      createdAt: string;
      fullName: string | null;
      user: {
        id: string;
        displayName: string;
        publicId: string;
        photoUrl: string | null;
        lastActiveAt: string | null;
      };
      permissions: Record<string, boolean>;
    }>;
    pendingInvites: Array<{
      id: string;
      role: string;
      position: string | null;
      fullName: string | null;
      createdAt: string;
      expiresAt: string;
      status: string;
    }>;
  }>;
  viewer: {
    userId: string;
    isOrgOwner: boolean;
    canManageEmployeesByBranchId: Record<string, boolean>;
    canManageSoloPartnerEmployees?: boolean;
  };
};

export type TeamMemberRow = {
  userId: string;
  displayName: string;
  publicId: string;
  photoUrl: string | null;
  lastActiveAt: string | null;
  fullName: string | null;
  position: string | null;
  membershipKind: "BRANCH_STAFF" | "HEAD_OFFICE" | "LEGACY";
  orgMemberStatus: string | null;
  branchAccess: Array<{
    employeeId: string;
    branchId: string;
    branchName: string;
    city: string;
    role: string;
    permissions: Record<string, boolean>;
  }>;
};

export type OrganizationPendingInviteRow = {
  id: string;
  role: string;
  position: string | null;
  fullName: string | null;
  membershipKind: string | null;
  branchIds: string[];
  allCurrentBranchesSnapshot: boolean;
  createdAt: string;
  expiresAt: string;
  status: string;
};

/** Fixture shape from navigator route.test.ts (ORG_OWNER). */
export const EMPLOYEES_OVERVIEW_FIXTURE: EmployeesOverviewResponse = {
  organization: { id: "org1", name: "Сеть" },
  myRole: "ORG_OWNER",
  myBranchIds: ["b1"],
  summary: {
    totalEmployees: 1,
    byRole: { MANAGER: 1, SELLER: 0, VIEWER: 0 },
    pendingInvites: 0,
  },
  branches: [
    {
      id: "b1",
      name: "Ф1",
      city: "Москва",
      address: "ул. 1",
      employees: [
        {
          id: "e1",
          role: "MANAGER",
          createdAt: "2025-01-01T00:00:00.000Z",
          fullName: null,
          user: {
            id: "uu",
            displayName: "Иван",
            publicId: "RC-IV",
            photoUrl: null,
            lastActiveAt: "2025-01-02T00:00:00.000Z",
          },
          permissions: {
            canActivateCertificates: true,
            canManageCertificates: true,
            canManagePartnerships: true,
            canManageCatalog: true,
            canManageLeads: true,
            canViewWallet: true,
            canManageEmployees: false,
            canManageCrossRequests: true,
          },
        },
      ],
      pendingInvites: [],
    },
  ],
  viewer: {
    userId: "u1",
    isOrgOwner: true,
    canManageEmployeesByBranchId: {},
  },
};

export function collectPendingInvites(overview: EmployeesOverviewResponse) {
  return overview.branches.flatMap((b) =>
    b.pendingInvites.map((inv) => ({ ...inv, branchId: b.id, branchName: b.name })),
  );
}

export function canManageTeam(overview: EmployeesOverviewResponse): boolean {
  if (overview.myRole === "SOLO_PARTNER") {
    return overview.viewer.canManageSoloPartnerEmployees === true;
  }
  if (overview.myRole === "ORG_OWNER") return true;
  if (overview.myRole === "MANAGER") {
    return Object.values(overview.viewer.canManageEmployeesByBranchId).some(Boolean);
  }
  return false;
}
