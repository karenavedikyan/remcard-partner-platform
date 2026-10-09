import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileOverviewSection } from "./ProfileOverviewSection";
import type { ProProfileResponse } from "@/lib/types";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { EMPLOYEES_OVERVIEW_FIXTURE } from "@/lib/employees-overview-types";

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

const storeProfile: ProProfileResponse = {
  organization: {
    id: "o1",
    name: "Shop",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 99,
  },
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Rep",
    city: "City",
    specializations: [],
    role: "PRO",
    partnerType: "STORE",
    description: null,
    catalogStatus: "DRAFT",
    isPublic: false,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: ["doors"],
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

describe("ProfileOverviewSection counters", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("does not show org branchCount after overview 403", async () => {
    vi.mocked(remcardFetch).mockRejectedValue(new RemcardApiError(403, "Forbidden"));
    render(<ProfileOverviewSection profile={storeProfile} onNavigateSection={() => {}} />);
    await waitFor(() => {
      expect(screen.queryByText("99")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/недоступна для вашей роли/i)).toBeInTheDocument();
  });

  it("shows scoped branch count from overview for manager", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      ...EMPLOYEES_OVERVIEW_FIXTURE,
      myRole: "MANAGER",
      branches: [EMPLOYEES_OVERVIEW_FIXTURE.branches[0]],
    });
    render(<ProfileOverviewSection profile={storeProfile} onNavigateSection={() => {}} />);
    const branchBtn = await screen.findByRole("button", { name: /Филиалы/i });
    expect(within(branchBtn).getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("99")).not.toBeInTheDocument();
  });

  it("SOLO employees 500 shows retry, not zero", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("employees-overview")) {
        return {
          ...EMPLOYEES_OVERVIEW_FIXTURE,
          myRole: "SOLO_PARTNER",
          summary: {
            totalEmployees: 0,
            byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 },
            pendingInvites: 0,
          },
        };
      }
      throw new RemcardApiError(500, "Server error");
    });
    render(<ProfileOverviewSection profile={storeProfile} onNavigateSection={() => {}} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
    const ui = userEvent.setup();
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("employees-overview")) {
        return {
          ...EMPLOYEES_OVERVIEW_FIXTURE,
          myRole: "SOLO_PARTNER",
          summary: {
            totalEmployees: 0,
            byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 },
            pendingInvites: 0,
          },
        };
      }
      return { employees: [{ id: "e1" }] };
    });
    const retryButtons = screen.getAllByRole("button", { name: /Повторить/i });
    await ui.click(retryButtons[retryButtons.length - 1]!);
    const teamBtn = await screen.findByRole("button", { name: /Сотрудники/i });
    expect(within(teamBtn).getByText("1")).toBeInTheDocument();
  });
});
