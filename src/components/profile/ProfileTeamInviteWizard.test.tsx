import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileTeamInviteWizard } from "./ProfileTeamInviteWizard";
import type { EmployeesOverviewResponse } from "@/lib/employees-overview-types";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({ templates: [] }),
  RemcardApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const overview: EmployeesOverviewResponse = {
  organization: { id: "org1", name: "Сеть" },
  myRole: "ORG_OWNER",
  myBranchIds: ["b1"],
  summary: {
    totalEmployees: 0,
    byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 },
    pendingInvites: 0,
  },
  team: [],
  branches: [
    {
      id: "b1",
      name: "Ф1",
      city: "Москва",
      address: "ул. 1",
      employees: [],
      pendingInvites: [],
    },
  ],
  viewer: {
    userId: "u1",
    isOrgOwner: true,
    canManageEmployeesByBranchId: {},
  },
};

describe("ProfileTeamInviteWizard", () => {
  it("walks through steps to review", async () => {
    const user = userEvent.setup();
    render(
      <ProfileTeamInviteWizard
        overview={overview}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    expect(screen.getByText("Должность и права")).toBeInTheDocument();
    await user.click(screen.getByTestId("team-wizard-next"));
    expect(screen.getByText("Где действуют выбранные права?")).toBeInTheDocument();
    await user.click(screen.getByTestId("team-invite-branch-b1"));
    await user.click(screen.getByTestId("team-wizard-next"));
    expect(screen.getByTestId("team-invite-confirm")).toBeInTheDocument();
  });
});
