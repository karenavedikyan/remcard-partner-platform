import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileTeamInviteWizard } from "./ProfileTeamInviteWizard";
import type { EmployeesOverviewResponse } from "@/lib/employees-overview-types";

const remcardFetchMock = vi.fn().mockResolvedValue({ templates: [] });

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetchMock(...args),
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

  it("shows visible error on step 3 when invite POST fails with empty 500", async () => {
    const { RemcardApiError } = await import("@/lib/api-client");
    remcardFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("permission-templates")) return { templates: [] };
      throw new RemcardApiError(500, "Ошибка сервера (500)");
    });

    const user = userEvent.setup();
    render(
      <ProfileTeamInviteWizard overview={overview} onClose={() => {}} onCreated={() => {}} />,
    );
    await user.click(screen.getByTestId("team-wizard-next"));
    await user.click(screen.getByTestId("team-invite-all-branches"));
    await user.click(screen.getByTestId("team-invite-head-office"));
    await user.click(screen.getByTestId("team-wizard-next"));
    await user.click(screen.getByTestId("team-invite-confirm"));
    await user.click(screen.getByTestId("team-wizard-submit"));

    const alert = await screen.findByTestId("team-invite-submit-error");
    expect(alert).toHaveTextContent("Ошибка сервера (500)");
    expect(screen.getByTestId("team-invite-confirm")).toBeChecked();
    expect(screen.getByTestId("team-wizard-submit")).not.toBeDisabled();
  });
});
