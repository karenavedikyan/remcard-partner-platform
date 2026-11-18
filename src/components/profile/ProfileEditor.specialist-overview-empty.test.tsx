/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";
import {
  EMPLOYEES_OVERVIEW_FIXTURE,
  type EmployeesOverviewResponse,
} from "@/lib/employees-overview-types";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams("section=overview");

const remcardFetchMock = vi.hoisted(() => vi.fn());

const soloEmployeesOverview: EmployeesOverviewResponse = {
  ...EMPLOYEES_OVERVIEW_FIXTURE,
  organization: { id: "solo", name: "Solo" },
  myRole: "SOLO_PARTNER",
  myBranchIds: [],
  summary: {
    totalEmployees: 0,
    byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 },
    pendingInvites: 0,
  },
  branches: [],
  viewer: {
    userId: "u1",
    isOrgOwner: true,
    canManageEmployeesByBranchId: {},
    canManageSoloPartnerEmployees: true,
  },
};

async function installRemcardFetchMock() {
  remcardFetchMock.mockImplementation(async (path: string) => {
    if (path === "/api/pro/organization/employees-overview") {
      return soloEmployeesOverview;
    }
    if (path === "/api/pro/employees") {
      return { employees: [] };
    }
    if (path === "/api/pro/moderation-notes") {
      return { notes: [] };
    }
    throw new Error(`unexpected remcardFetch path in specialist overview test: ${path}`);
  });
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: pushMock, replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/profile",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/consent/ProfAnalyticsConsentUi", () => ({
  ProfAnalyticsConsentProfileSetting: () => null,
}));

vi.mock("@/lib/profile-working-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile-working-save")>();
  return {
    ...actual,
    workingProfileCabinetReady: vi.fn(() => false),
    workingProfileMissingFields: vi.fn(() => []),
  };
});

vi.mock("@/lib/profile-save", () => ({
  persistProfileDraft: vi.fn(),
  submitProfileForModerationReview: vi.fn(),
  refreshProfile: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (path: string, init?: RequestInit) => remcardFetchMock(path, init),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("./NotificationSettingsPanel", () => ({
  NotificationSettingsPanel: () => null,
}));

vi.mock("./ProfileBranchesSection", () => ({
  ProfileBranchesSection: () => null,
}));

vi.mock("./ProfileTeamSection", () => ({
  ProfileTeamSection: () => null,
}));

vi.mock("./ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => null,
}));

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("./specialist/SpecialistPresetSection", () => ({
  SpecialistPresetSection: () => null,
}));

vi.mock("./agent/AgentProfileSection", () => ({
  AgentProfileSection: () => null,
}));

vi.mock("./ProfileBranchContextSwitcher", () => ({
  ProfileBranchContextSwitcher: () => null,
}));

vi.mock("@/components/account-session/ProfileSessionActions", () => ({
  ProfileSessionActions: () => null,
}));

const fetchSpecialistDraft = vi.fn();
const patchSpecialistDraft = vi.fn();

vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistR06Status: () =>
    Promise.resolve({
      contractVersion: "r06",
      featureEnabled: true,
      eligible: true,
      hasSpecialistActivity: true,
      profileComplete: false,
      userId: "u1",
      ineligibleReason: null,
    }),
  fetchSpecialistProfileDraft: (...args: unknown[]) => fetchSpecialistDraft(...args),
  patchSpecialistProfileDraft: (...args: unknown[]) => patchSpecialistDraft(...args),
  finishSpecialistProfile: vi.fn(),
  discardSpecialistProfileDraft: vi.fn(),
}));

vi.mock("@/lib/agent-profile/api", () => ({
  fetchAgentProfileStatus: () =>
    Promise.resolve({ featureEnabled: false, eligible: false, hasAgentActivity: false }),
}));

const specialistR06Gate = { featureEnabled: true, eligible: true, profileComplete: false } as const;

const masterProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Пользователь",
    city: "",
    specializations: [],
    role: "PRO",
    partnerType: "MASTER",
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

async function expectCardOverviewSettled() {
  await waitFor(() => expect(fetchSpecialistDraft).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByTestId("specialist-profile-loading")).not.toBeInTheDocument());
  expect(screen.queryByText("Рабочий профиль")).not.toBeInTheDocument();
  expect(screen.queryByText("Пусть новые клиенты найдут вас")).not.toBeInTheDocument();
}

describe("ProfileEditor specialist overview empty intro", () => {
  beforeEach(async () => {
    pushMock.mockReset();
    patchSpecialistDraft.mockReset();
    remcardFetchMock.mockReset();
    await installRemcardFetchMock();
    mockSearchParams = new URLSearchParams("section=overview");
    fetchSpecialistDraft.mockResolvedValue({
      contractVersion: "r06",
      featureEnabled: true,
      step: 1,
      version: 0,
      hasDraft: false,
      profileComplete: false,
      payload: {},
      savedProfile: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows shared empty intro on default overview for true-zero specialist", async () => {
    render(
      <ProfileEditor
        initial={masterProfile}
        cabinetAccess={ownerProfileCabinetAccess()}
        initialSpecialistR06Gate={specialistR06Gate}
        section="overview"
      />,
    );
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeInTheDocument());
    expect(screen.queryByText("Рабочий профиль")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Раздел заполнится сам/i),
    ).not.toBeInTheDocument();
  });

  it("CTA navigates to basics and opens wizard without second intro or PATCH", async () => {
    const user = userEvent.setup();
    pushMock.mockImplementation((href: string) => {
      const q = href.includes("?") ? href.split("?")[1] : "section=basics";
      mockSearchParams = new URLSearchParams(q);
    });
    const view = render(
      <ProfileEditor
        initial={masterProfile}
        cabinetAccess={ownerProfileCabinetAccess()}
        initialSpecialistR06Gate={specialistR06Gate}
        section="overview"
      />,
    );
    await screen.findByTestId("profile-empty-start");
    await user.click(screen.getByTestId("profile-empty-start"));
    view.rerender(
      <ProfileEditor
        initial={masterProfile}
        cabinetAccess={ownerProfileCabinetAccess()}
        initialSpecialistR06Gate={specialistR06Gate}
        section="overview"
      />,
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-wizard")).toBeInTheDocument(),
    );
    expect(screen.queryAllByTestId("empty-state")).toHaveLength(0);
    expect(patchSpecialistDraft).not.toHaveBeenCalled();
  });

  it("shows the card-based overview (no legacy two-column overview) when draft has partial saved progress", async () => {
    fetchSpecialistDraft.mockResolvedValue({
      contractVersion: "r06",
      featureEnabled: true,
      step: 1,
      version: 2,
      hasDraft: false,
      profileComplete: false,
      payload: {},
      savedProfile: { displayName: "Anna", city: "Krasnodar" },
    });
    render(
      <ProfileEditor
        initial={masterProfile}
        cabinetAccess={ownerProfileCabinetAccess()}
        initialSpecialistR06Gate={specialistR06Gate}
        section="overview"
      />,
    );
    await expectCardOverviewSettled();
  });

  it("shows the card-based overview (no legacy two-column overview) when GET fails", async () => {
    fetchSpecialistDraft.mockRejectedValue(new Error("network"));
    render(
      <ProfileEditor
        initial={masterProfile}
        cabinetAccess={ownerProfileCabinetAccess()}
        initialSpecialistR06Gate={specialistR06Gate}
        section="overview"
      />,
    );
    await expectCardOverviewSettled();
  });

  it("shows the card-based overview (no legacy two-column overview) when proof flags are malformed", async () => {
    fetchSpecialistDraft.mockResolvedValue({
      contractVersion: "r06",
      featureEnabled: true,
      hasDraft: false,
      payload: {},
      savedProfile: {},
    });
    render(
      <ProfileEditor
        initial={masterProfile}
        cabinetAccess={ownerProfileCabinetAccess()}
        initialSpecialistR06Gate={specialistR06Gate}
        section="overview"
      />,
    );
    await expectCardOverviewSettled();
  });

  describe("completed specialist profile: one summary card as the overview", () => {
    const completedDraft = {
      contractVersion: "r06",
      featureEnabled: true,
      step: 4,
      version: 3,
      hasDraft: false,
      profileComplete: true,
      payload: {},
      savedProfile: {
        displayName: "Анна Мастер",
        city: "Краснодар",
        partnershipContactPhone: "+79001234567",
        partnershipContactEmail: "anna@example.test",
        serviceSpecializationIds: [],
        navigatorStageIds: [],
      },
    };

    const renderOverview = (profile: ProProfileResponse = masterProfile, section = "overview") => {
      mockSearchParams = new URLSearchParams(section === "overview" ? "" : `section=${section}`);
      return render(
        <ProfileEditor
          initial={profile}
          cabinetAccess={ownerProfileCabinetAccess()}
          initialSpecialistR06Gate={specialistR06Gate}
          section={section as "overview"}
        />,
      );
    };

    beforeEach(() => {
      fetchSpecialistDraft.mockResolvedValue(completedDraft);
    });

    it("shows the summary card with the specialist type, chip, fields, ID and the catalog line", async () => {
      renderOverview();
      const card = await screen.findByTestId("specialist-profile-completed-summary");
      expect(within(card).getByText("Специалист")).toBeInTheDocument();
      expect(within(card).getByRole("heading", { name: "Анна Мастер" })).toBeInTheDocument();
      expect(within(card).getByText("Заполнено")).toBeInTheDocument();
      expect(within(card).getByText("Имя")).toBeInTheDocument();
      expect(within(card).getByText("Город", { selector: "dt" })).toBeInTheDocument();
      expect(within(card).getByText("Телефон")).toBeInTheDocument();
      expect(within(card).getByText("Email")).toBeInTheDocument();
      expect(within(card).getByRole("button", { name: "Редактировать профиль" })).toBeInTheDocument();
      expect(within(card).getByText("ID RC1")).toBeInTheDocument();
      expect(within(card).getByTestId("specialist-overview-catalog-line")).toHaveTextContent(
        "Каталог RemCard: Не опубликовано",
      );
    });

    it("has no catalog teaser, no two-column «Рабочий профиль» and no separate catalog promo", async () => {
      renderOverview();
      await screen.findByTestId("specialist-profile-completed-summary");
      expect(screen.queryByText("Рабочий профиль")).not.toBeInTheDocument();
      expect(screen.queryByText("Пусть новые клиенты найдут вас")).not.toBeInTheDocument();
      expect(screen.queryByTestId("specialist-catalog-cta")).not.toBeInTheDocument();
    });

    it("the catalog line opens the «Каталог RemCard» tab", async () => {
      const user = userEvent.setup();
      renderOverview();
      await user.click(await screen.findByTestId("specialist-overview-catalog-line"));
      expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("section=catalog"), expect.anything());
    });

    it("reports the published and the needs-revision catalog status", async () => {
      const published: ProProfileResponse = {
        ...masterProfile,
        user: { ...masterProfile.user, catalogStatus: "APPROVED", isPublic: true },
        catalogPublication: { isLivePublic: true } as ProProfileResponse["catalogPublication"],
      };
      const view = renderOverview(published);
      expect(await screen.findByTestId("specialist-overview-catalog-line")).toHaveTextContent(
        "Каталог RemCard: Проверен · опубликовано",
      );
      view.unmount();

      const revision: ProProfileResponse = {
        ...masterProfile,
        user: { ...masterProfile.user, catalogStatus: "NEEDS_REVISION" },
      };
      renderOverview(revision);
      expect(await screen.findByTestId("specialist-overview-catalog-line")).toHaveTextContent(
        "Каталог RemCard: Нужно исправить",
      );
      expect(screen.getByText("Нужно исправить публикацию в каталоге")).toBeInTheDocument();
    });

    it("the basics tab keeps the original summary with the catalog promo and no catalog line", async () => {
      renderOverview(masterProfile, "basics");
      await screen.findByTestId("specialist-profile-completed-summary");
      expect(screen.getByTestId("specialist-catalog-cta")).toBeInTheDocument();
      expect(screen.queryByTestId("specialist-overview-catalog-line")).not.toBeInTheDocument();
    });
  });

  describe("specialist tabs", () => {
    it("has no «Точки» tab but keeps «Сотрудники»", async () => {
      mockSearchParams = new URLSearchParams("");
      render(
        <ProfileEditor
          initial={masterProfile}
          cabinetAccess={ownerProfileCabinetAccess()}
          initialSpecialistR06Gate={specialistR06Gate}
          section="overview"
        />,
      );
      const tablist = screen.getByRole("tablist");
      expect(within(tablist).queryByRole("tab", { name: "Точки" })).toBeNull();
      expect(within(tablist).getByRole("tab", { name: "Сотрудники" })).toBeInTheDocument();
      expect(within(tablist).getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "Обзор",
        "Основные данные",
        "Каталог RemCard",
        "Сотрудники",
        "Уведомления",
      ]);
    });

    it("?section=branches opens the overview for a specialist", async () => {
      mockSearchParams = new URLSearchParams("section=branches");
      render(
        <ProfileEditor
          initial={masterProfile}
          cabinetAccess={ownerProfileCabinetAccess()}
          initialSpecialistR06Gate={specialistR06Gate}
          section="branches"
        />,
      );
      expect(screen.getByRole("tab", { name: "Обзор" })).toHaveAttribute("aria-selected", "true");
      expect(screen.queryByTestId("branches-section")).toBeNull();
    });
  });
});
