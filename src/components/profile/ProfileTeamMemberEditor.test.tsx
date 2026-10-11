import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileTeamMemberEditor } from "./ProfileTeamMemberEditor";
import type { EmployeesOverviewResponse, TeamMemberRow } from "@/lib/employees-overview-types";
import { remcardFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const employeeA: TeamMemberRow = {
  userId: "u-a",
  displayName: "Сотрудник A",
  publicId: "RC-A",
  photoUrl: null,
  lastActiveAt: null,
  fullName: "Сотрудник A",
  position: "Менеджер",
  membershipKind: "BRANCH_STAFF",
  orgMemberStatus: null,
  branchAccess: [
    {
      employeeId: "emp-a-b1",
      branchId: "b1",
      branchName: "Филиал 1",
      city: "Город",
      role: "MANAGER",
      permissions: { canManageLeads: true },
    },
    {
      employeeId: "emp-a-b2",
      branchId: "b2",
      branchName: "Филиал 2",
      city: "Город",
      role: "SELLER",
      permissions: { canManageLeads: true },
    },
  ],
};

const employeeB: TeamMemberRow = {
  userId: "u-b",
  displayName: "Сотрудник B",
  publicId: "RC-B",
  photoUrl: null,
  lastActiveAt: null,
  fullName: "Сотрудник B",
  position: "Кассир",
  membershipKind: "BRANCH_STAFF",
  orgMemberStatus: null,
  branchAccess: [
    {
      employeeId: "emp-b-b2",
      branchId: "b2",
      branchName: "Филиал 2",
      city: "Город",
      role: "SELLER",
      permissions: {},
    },
  ],
};

function managerOverview(): EmployeesOverviewResponse {
  return {
    organization: { id: "org-1", name: "Org" },
    myRole: "MANAGER",
    branches: [
      {
        id: "b1",
        name: "Филиал 1",
        city: "Город",
        address: "ул. 1",
        employees: [],
        pendingInvites: [],
      },
      {
        id: "b2",
        name: "Филиал 2",
        city: "Город",
        address: "ул. 2",
        employees: [],
        pendingInvites: [],
      },
    ],
    organizationPendingInvites: [],
    teamMembers: [employeeA, employeeB],
    viewer: {
      userId: "mgr-1",
      isOrgOwner: false,
      canManageEmployeesByBranchId: { b1: true, b2: false },
    },
  };
}

function Harness() {
  const [overview, setOverview] = useState(managerOverview);
  return (
    <>
      <button
        type="button"
        data-testid="refresh-overview"
        onClick={() =>
          setOverview({
            ...managerOverview(),
            organization: { id: "org-1", name: "Org (new reference)" },
          })
        }
      >
        Обновить overview
      </button>
      <ProfileTeamMemberEditor
        member={employeeA}
        overview={overview}
        onClose={() => {}}
        onSaved={() => {}}
      />
    </>
  );
}

describe("ProfileTeamMemberEditor branch manager", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(remcardFetch).mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("mounts without update loop and keeps edits across overview rerender", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await screen.findByRole("heading", { name: "Настроить доступ" });

    const scanPerm = screen.getByTestId("team-perm-scan");
    expect(scanPerm).not.toBeChecked();
    await user.click(scanPerm);
    expect(scanPerm).toBeChecked();

    const saveBtn = screen.getByRole("button", { name: "Сохранить" });
    expect(saveBtn).toBeEnabled();

    await user.click(screen.getByTestId("refresh-overview"));
    expect(screen.getByTestId("team-perm-scan")).toBeChecked();

    await user.click(saveBtn);

    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalled();
    });

    const paths = vi.mocked(remcardFetch).mock.calls.map(([path]) => String(path));
    expect(paths.some((p) => p.includes("/team-members/"))).toBe(false);
    expect(paths).toEqual([
      "/api/pro/organization/branches/b1/employees/emp-a-b1",
    ]);
    expect(paths.some((p) => p.includes("emp-a-b2"))).toBe(false);
    expect(paths.some((p) => p.includes("emp-b-b2"))).toBe(false);
  });
});
