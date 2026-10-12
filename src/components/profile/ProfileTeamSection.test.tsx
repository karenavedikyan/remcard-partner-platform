import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileTeamSection } from "./ProfileTeamSection";
import { ProfileCabinetAccessProvider } from "./ProfileCabinetAccessContext";
import {
  deriveProfileCabinetAccess,
  ownerProfileCabinetAccess,
} from "@/lib/profile-cabinet-access";
import { DEV_FIXTURE_EMPLOYEES_OVERVIEW } from "@/lib/dev-profile-fixture-overview";
import type { ProProfileResponse } from "@/lib/types";
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

vi.mock("./ProfileTeamInviteWizard", () => ({
  ProfileTeamInviteWizard: () => null,
}));

const storeProfile: ProProfileResponse = {
  organization: {
    id: "o1",
    name: "Shop",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 1,
  },
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Rep",
    city: "City",
    specializations: [],
    role: "CLIENT",
    partnerType: "STORE",
    description: null,
    catalogStatus: "DRAFT",
    isPublic: false,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: [],
    areas: [],
    website: null,
    telegram: null,
    whatsapp: null,
    instagram: null,
    vk: null,
    max: null,
    yandex: null,
    publicEmail: null,
    publicPhone: null,
    showFullName: false,
  },
};

describe("ProfileTeamSection access gates", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("shows access restriction without calling employees-overview", async () => {
    const access = deriveProfileCabinetAccess({
      profile: storeProfile,
      proContext: {
        role: "ORG_TEAM_MEMBER",
        organization: { id: "o1", name: "Shop" },
        branches: [{ id: "b1", name: "A", city: "C" }],
        teamCapabilities: {
          canOpenTeamSection: false,
          canFetchEmployeesOverview: false,
          canManageEmployeesByBranchId: {},
        },
      },
      contextReady: true,
    });
    render(
      <ProfileCabinetAccessProvider value={access}>
        <ProfileTeamSection />
      </ProfileCabinetAccessProvider>,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/Сотрудники/i);
    await waitFor(() => {
      expect(vi.mocked(remcardFetch)).not.toHaveBeenCalled();
    });
  });

  it("loads overview for org owner", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      organization: { id: "o1", name: "Shop" },
      myRole: "ORG_OWNER",
      myBranchIds: [],
      summary: {
        totalEmployees: 0,
        byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 },
        pendingInvites: 0,
      },
      branches: [],
      viewer: { userId: "u1", isOrgOwner: true, canManageEmployeesByBranchId: {} },
    });
    render(
      <ProfileCabinetAccessProvider value={ownerProfileCabinetAccess()}>
        <ProfileTeamSection />
      </ProfileCabinetAccessProvider>,
    );
    await waitFor(() => {
      expect(vi.mocked(remcardFetch)).toHaveBeenCalledWith(
        "/api/pro/organization/employees-overview",
      );
    });
  });

  it("keeps roster visible when invites GET fails with 500", async () => {
    const { RemcardApiError } = await import("@/lib/api-client");
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.startsWith("/api/pro/organization/employees-overview")) {
        return {
          organization: { id: "o1", name: "Shop" },
          myRole: "ORG_OWNER",
          myBranchIds: ["b1"],
          summary: {
            totalEmployees: 2,
            byRole: { MANAGER: 0, SELLER: 2, VIEWER: 0 },
            pendingInvites: 0,
          },
          branches: [
            {
              id: "b1",
              name: "A",
              city: "C",
              employees: [],
              pendingInvites: [],
            },
          ],
          viewer: {
            userId: "u1",
            isOrgOwner: true,
            canManageEmployeesByBranchId: { b1: true },
          },
        };
      }
      if (path.startsWith("/api/pro/invites")) {
        throw new RemcardApiError(500, "Invites unavailable");
      }
      return { invites: [] };
    });
    render(
      <ProfileCabinetAccessProvider value={ownerProfileCabinetAccess()}>
        <ProfileTeamSection />
      </ProfileCabinetAccessProvider>,
    );
    expect(await screen.findByTestId("team-section-root")).toBeInTheDocument();
    expect(await screen.findByText(/Invites unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Список сотрудников ниже доступен/i)).toBeInTheDocument();
  });
});

describe("ProfileTeamSection prototype layout (fixture)", () => {
  it("renders stats, views, search by position, and unified invites", async () => {
    const user = userEvent.setup();
    render(
      <ProfileCabinetAccessProvider value={ownerProfileCabinetAccess()}>
        <ProfileTeamSection fixtureOverview={DEV_FIXTURE_EMPLOYEES_OVERVIEW} />
      </ProfileCabinetAccessProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Команда и доступы" })).toBeInTheDocument();
    expect(screen.getByTestId("team-stats")).toHaveTextContent("5");
    expect(screen.getByTestId("team-stats")).toHaveTextContent("3");
    expect(screen.getByTestId("team-stats")).toHaveTextContent("2");

    await user.click(screen.getByTestId("team-view-locations"));
    expect(screen.getByRole("heading", { name: "Головной офис" })).toBeInTheDocument();

    await user.click(screen.getByTestId("team-view-people"));
    await user.type(screen.getByLabelText(/Поиск по имени или должности/i), "выплат");
    expect(screen.getByText("Ирина Морозова")).toBeInTheDocument();
    expect(screen.queryByText("Мария Иванова")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("team-view-invites"));
    expect(screen.getAllByText(/Ожидает принятия/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Алексей Кузнецов/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("team-permissions-help"));
    expect(screen.getByRole("dialog", { name: /Должности, права и выплаты/i })).toBeInTheDocument();
    expect(screen.getByTestId("team-bonus-illustration")).toBeInTheDocument();
    expect(screen.getByTestId("team-copy-invite-inv-org-1")).toBeInTheDocument();
  });
});
