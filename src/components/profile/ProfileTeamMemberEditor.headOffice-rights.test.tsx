import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileTeamMemberEditor } from "./ProfileTeamMemberEditor";
import type { EmployeesOverviewResponse, TeamMemberRow } from "@/lib/employees-overview-types";
import { remcardFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class extends Error {},
}));

const member: TeamMemberRow = {
  userId: "u-h",
  displayName: "Менеджер офиса",
  publicId: "RC-H",
  photoUrl: null,
  lastActiveAt: null,
  fullName: "Менеджер офиса",
  position: null,
  membershipKind: "HEAD_OFFICE",
  orgMemberStatus: "ACTIVE",
  branchAccess: [],
};

function overview(rights: EmployeesOverviewResponse["headOfficeRights"]): EmployeesOverviewResponse {
  return {
    organization: { id: "org-1", name: "Org" },
    myRole: "ORG_OWNER",
    branches: [],
    organizationPendingInvites: [],
    teamMembers: [member],
    headOfficeRights: rights,
    viewer: { userId: "owner-1", isOrgOwner: true, canManageEmployeesByBranchId: {} },
  };
}

beforeEach(() => {
  vi.mocked(remcardFetch).mockReset().mockResolvedValue({});
});

describe("ProfileTeamMemberEditor: member without a Branch shows the PERSISTED rights", () => {
  it("opens with the saved flags (wallet on, certificates off) — not a default grant", () => {
    render(
      <ProfileTeamMemberEditor
        member={member}
        overview={overview({ "u-h": { role: "SELLER", permissions: { canViewWallet: true, canManageCertificates: false } } })}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByTestId("team-perm-ledger")).toBeChecked();
    expect(screen.getByTestId("team-perm-scan")).not.toBeChecked();
  });

  it("never-saved member (permissions null) shows no certificate or wallet grant", () => {
    render(
      <ProfileTeamMemberEditor
        member={member}
        overview={overview({ "u-h": { role: null, permissions: null } })}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByTestId("team-perm-ledger")).not.toBeChecked();
    expect(screen.getByTestId("team-perm-scan")).not.toBeChecked();
  });
});
