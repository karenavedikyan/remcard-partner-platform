import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import type { ProProfileResponse } from "@/lib/types";
import { persistWorkingProfileDraft } from "@/lib/profile-working-save";
import { submitProfileForModerationReview } from "@/lib/profile-save";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams("");

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

vi.mock("@/lib/profile-working-save", () => ({
  persistWorkingProfileDraft: vi.fn(),
  validateWorkingProfileDraft: vi.fn(() => null),
  workingProfileMissingFields: vi.fn(() => []),
  workingProfileCabinetReady: vi.fn(() => true),
  workingProfileComplete: vi.fn(() => true),
}));

vi.mock("@/lib/profile-save", () => ({
  persistProfileDraft: vi.fn(),
  submitProfileForModerationReview: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({
    notes: [],
    organization: { id: "o1", name: "Shop", branches: [] },
    summary: { totalEmployees: 0, byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 }, pendingInvites: 0 },
    branches: [],
    myRole: "ORG_OWNER",
    viewer: { userId: "u1", isOrgOwner: true, canManageEmployeesByBranchId: {} },
  }),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("./NotificationSettingsPanel", () => ({
  NotificationSettingsPanel: () => <div data-testid="notif-panel" />,
}));

vi.mock("./ProfileBranchesSection", () => ({
  ProfileBranchesSection: () => <div data-testid="branches-section" />,
}));

vi.mock("./ProfileTeamSection", () => ({
  ProfileTeamSection: () => <div data-testid="team-section" />,
}));

vi.mock("./ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: ({
    serviceSpecializationIds,
    productCategoryIds,
  }: {
    serviceSpecializationIds: string[];
    productCategoryIds: string[];
  }) => (
    <div
      data-testid="catalog-directions"
      data-services={serviceSpecializationIds.join(",")}
      data-products={productCategoryIds.join(",")}
    />
  ),
}));

const initial: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Иван",
    city: "Москва",
    specializations: ["L1-0"],
    role: "PRO",
    partnerType: "MASTER",
    description: null,
    catalogStatus: "PENDING",
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

describe("ProfileEditor", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("");
    vi.mocked(persistWorkingProfileDraft).mockReset();
    vi.mocked(submitProfileForModerationReview).mockReset();
    pushMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not show false unsaved basics banner for legacy org owner on load", () => {
    const legacyOrg: ProProfileResponse = {
      organization: {
        id: "org-opt",
        name: "ОПТОВИК",
        catalogStatus: "APPROVED",
        partnerType: "STORE",
        branchCount: 6,
        storeCategories: ["doors", "flooring", "handles"],
        specializations: [],
      },
      programs: [],
      catalogPublication: {
        catalogEntity: "organization",
        isLivePublic: true,
        draftPending: false,
        published: {
          description: null,
          specializations: [],
          storeCategories: ["doors", "flooring", "handles"],
          website: null,
          telegram: null,
          publicEmail: null,
          publicPhone: null,
        },
      },
      workingProfile: {
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        effectiveProductCategoryIds: ["doors", "flooring", "handles"],
        effectiveServiceSpecializationIds: [],
        effectiveNavigatorStageIds: ["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9"],
        partnerSearchVisible: true,
        partnerSearchOptIn: false,
        partnerSearchOptInExplicit: false,
        workingProductDirectionsTouched: false,
        workingServiceDirectionsTouched: false,
        workingNavigatorStagesTouched: false,
        partnerWorkMode: null,
        areas: ["Краснодар, Анапа, Новороссийск"],
        partnershipContactName: null,
        partnershipContactPhone: null,
        partnershipContactEmail: null,
      },
      user: {
        ...initial.user,
        partnerType: "STORE",
        catalogStatus: "APPROVED",
        isPublic: true,
        specializations: ["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9"],
        storeCategories: ["doors", "flooring", "handles"],
        description: null,
      },
    };
    const { rerender } = render(<ProfileEditor initial={legacyOrg} />);
    expect(
      screen.queryByText(/Есть несохранённые изменения в основных данных/i),
    ).not.toBeInTheDocument();
    rerender(<ProfileEditor initial={{ ...legacyOrg, programs: [...legacyOrg.programs] }} />);
    expect(
      screen.queryByText(/Есть несохранённые изменения в основных данных/i),
    ).not.toBeInTheDocument();
  });

  it("legacy production areas: equivalent separators stay clean; edit and revert dirty cycle", async () => {
    const ui = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const legacyOrg: ProProfileResponse = {
      organization: {
        id: "org-opt",
        name: "ОПТОВИК",
        catalogStatus: "APPROVED",
        partnerType: "STORE",
        branchCount: 6,
        storeCategories: ["doors"],
        specializations: [],
      },
      programs: [],
      workingProfile: {
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        effectiveProductCategoryIds: ["doors"],
        effectiveServiceSpecializationIds: [],
        effectiveNavigatorStageIds: [],
        partnerSearchVisible: false,
        partnerSearchOptIn: false,
        partnerSearchOptInExplicit: false,
        workingProductDirectionsTouched: false,
        workingServiceDirectionsTouched: false,
        workingNavigatorStagesTouched: false,
        partnerWorkMode: null,
        areas: ["Краснодар, Анапа, Новороссийск"],
        partnershipContactName: null,
        partnershipContactPhone: null,
        partnershipContactEmail: null,
      },
      user: { ...initial.user, partnerType: "STORE" },
    };
    render(<ProfileEditor initial={legacyOrg} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    const areas = screen.getByLabelText(/Территории обслуживания/i);
    await ui.clear(areas);
    await ui.type(areas, "Краснодар; Анапа\nНовороссийск");
    confirmSpy.mockClear();
    await ui.click(screen.getByRole("tab", { name: /Каталог RemCard/i }));
    expect(confirmSpy).not.toHaveBeenCalled();

    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    const areasAgain = screen.getByLabelText(/Территории обслуживания/i);
    await ui.clear(areasAgain);
    await ui.type(areasAgain, "Краснодар, Анапа, Новороссийск, Сочи");
    confirmSpy.mockClear();
    await ui.click(screen.getByRole("tab", { name: /Каталог RemCard/i }));
    expect(confirmSpy).toHaveBeenCalled();

    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    const areasRevert = screen.getByLabelText(/Территории обслуживания/i);
    await ui.clear(areasRevert);
    await ui.type(areasRevert, "Краснодар\nАнапа\nНовороссийск");
    confirmSpy.mockClear();
    await ui.click(screen.getByRole("tab", { name: /Каталог RemCard/i }));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("after save with legacy areas GET stays clean", async () => {
    const ui = userEvent.setup();
    const legacyOrg: ProProfileResponse = {
      organization: null,
      programs: [],
      workingProfile: {
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        effectiveProductCategoryIds: ["doors"],
        effectiveServiceSpecializationIds: [],
        effectiveNavigatorStageIds: [],
        partnerSearchVisible: false,
        partnerSearchOptIn: false,
        partnerSearchOptInExplicit: false,
        workingProductDirectionsTouched: false,
        workingServiceDirectionsTouched: false,
        workingNavigatorStagesTouched: false,
        partnerWorkMode: null,
        areas: ["Краснодар, Анапа, Новороссийск"],
        partnershipContactName: null,
        partnershipContactPhone: null,
        partnershipContactEmail: null,
      },
      user: { ...initial.user, partnerType: "MASTER" },
    };
    vi.mocked(persistWorkingProfileDraft).mockResolvedValue({
      ...legacyOrg,
      workingProfile: {
        ...legacyOrg.workingProfile!,
        areas: ["Краснодар, Анапа, Новороссийск"],
      },
    });
    render(<ProfileEditor initial={legacyOrg} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    await ui.click(screen.getByRole("button", { name: /Сохранить основные данные/i }));
    await waitFor(() => expect(persistWorkingProfileDraft).toHaveBeenCalled());
    expect(
      screen.queryByText(/Есть несохранённые изменения в основных данных/i),
    ).not.toBeInTheDocument();
  });

  it("basics to catalog without edits does not confirm leave", async () => {
    const ui = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    const legacyOrg: ProProfileResponse = {
      organization: null,
      programs: [],
      workingProfile: {
        productCategoryIds: [],
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        primaryDirection: null,
        effectiveProductCategoryIds: ["doors"],
        effectiveServiceSpecializationIds: [],
        effectiveNavigatorStageIds: [],
        partnerSearchVisible: false,
        partnerSearchOptIn: false,
        partnerSearchOptInExplicit: false,
        workingProductDirectionsTouched: false,
        workingServiceDirectionsTouched: false,
        workingNavigatorStagesTouched: false,
        partnerWorkMode: null,
        areas: ["Краснодар, Анапа, Новороссийск"],
        partnershipContactName: null,
        partnershipContactPhone: null,
        partnershipContactEmail: null,
      },
      user: { ...initial.user },
    };
    render(<ProfileEditor initial={legacyOrg} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    confirmSpy.mockClear();
    await ui.click(screen.getByRole("tab", { name: /Каталог RemCard/i }));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("opens overview by default with working profile block", () => {
    render(<ProfileEditor initial={initial} returnTo="/invite/abc" />);
    expect(screen.getByRole("heading", { name: /Рабочий профиль/i })).toBeInTheDocument();
    expect(screen.getByText(/Пусть новые клиенты найдут вас/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Обзор/i })).toHaveAttribute("aria-selected", "true");
  });

  it("allows saving basics while catalog publication is pending review", async () => {
    const ui = userEvent.setup();
    render(<ProfileEditor initial={initial} returnTo="/invite/abc" />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    expect(screen.getByRole("button", { name: /Сохранить основные данные/i })).not.toBeDisabled();
    expect(screen.getByRole("link", { name: /Вернуться/i })).toHaveAttribute("href", "/invite/abc");
  });

  it("preserves unsaved basics input when switching sections", async () => {
    const ui = userEvent.setup();
    render(<ProfileEditor initial={initial} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    const nameInput = screen.getByLabelText(/Имя представителя/i);
    await ui.clear(nameInput);
    await ui.type(nameInput, "Новое имя");
    await ui.click(screen.getByRole("tab", { name: /Обзор/i }));
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    expect(screen.getByLabelText(/Имя представителя/i)).toHaveValue("Новое имя");
  });

  it("uses router.push when changing tabs", async () => {
    const ui = userEvent.setup();
    render(<ProfileEditor initial={initial} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    expect(pushMock).toHaveBeenCalledWith("/profile?section=basics", { scroll: false });
  });

  it("warns before leaving basics with unsaved changes and keeps input when cancelled", async () => {
    const ui = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    render(<ProfileEditor initial={initial} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    await ui.clear(screen.getByLabelText(/Имя представителя/i));
    await ui.type(screen.getByLabelText(/Имя представителя/i), "Черновик H2");
    pushMock.mockClear();
    await ui.click(screen.getByRole("tab", { name: /Обзор/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Имя представителя/i)).toHaveValue("Черновик H2");
  });

  it("does not warn when leaving basics after save", async () => {
    const ui = userEvent.setup();
    vi.mocked(persistWorkingProfileDraft).mockResolvedValue(initial);
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<ProfileEditor initial={initial} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    await ui.clear(screen.getByLabelText(/Имя представителя/i));
    await ui.type(screen.getByLabelText(/Имя представителя/i), "Сохранённое имя");
    await ui.click(screen.getByRole("button", { name: /Сохранить основные данные/i }));
    await waitFor(() => {
      expect(persistWorkingProfileDraft).toHaveBeenCalled();
    });
    confirmSpy.mockClear();
    await ui.click(screen.getByRole("tab", { name: /Обзор/i }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/profile", { scroll: false });
  });

  it("keeps unsaved name when initial prop is rerendered with new object", async () => {
    const ui = userEvent.setup();
    const { rerender } = render(<ProfileEditor initial={initial} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    const nameInput = screen.getByLabelText(/Имя представителя/i);
    await ui.clear(nameInput);
    await ui.type(nameInput, "Несохраненное имя");
    await waitFor(() => {
      expect(screen.getByLabelText(/Имя представителя/i)).toHaveValue("Несохраненное имя");
    });
    rerender(
      <ProfileEditor
        initial={{
          ...initial,
          user: { ...initial.user, displayName: "Иван" },
        }}
      />,
    );
    expect(screen.getByLabelText(/Имя представителя/i)).toHaveValue("Несохраненное имя");
  });

  it("resets form when signed-in user changes", async () => {
    const ui = userEvent.setup();
    const { rerender } = render(<ProfileEditor initial={initial} />);
    await ui.click(screen.getByRole("tab", { name: /Основные данные/i }));
    await ui.clear(screen.getByLabelText(/Имя представителя/i));
    await ui.type(screen.getByLabelText(/Имя представителя/i), "Несохраненное имя");
    rerender(
      <ProfileEditor
        initial={{
          ...initial,
          user: { ...initial.user, id: "u2", displayName: "Пётр" },
        }}
      />,
    );
    expect(screen.getByLabelText(/Имя представителя/i)).toHaveValue("Пётр");
  });

  it("follows searchParams when simulating browser history", () => {
    mockSearchParams = new URLSearchParams("section=basics");
    const { rerender } = render(<ProfileEditor initial={initial} section="basics" />);
    expect(screen.getByRole("tab", { name: /Основные данные/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    mockSearchParams = new URLSearchParams("");
    rerender(<ProfileEditor initial={initial} section="overview" />);
    expect(screen.getByRole("tab", { name: /Обзор/i })).toHaveAttribute("aria-selected", "true");
  });

  it("shows PENDING org status after catalog submit without resubmit button", async () => {
    const draftProfile: ProProfileResponse = {
      ...initial,
      user: {
        ...initial.user,
        catalogStatus: "DRAFT",
        partnerType: "STORE",
        storeCategories: ["doors"],
        specializations: [],
      },
      organization: {
        id: "o1",
        name: "Shop",
        catalogStatus: "DRAFT",
        partnerType: "STORE",
        branchCount: 1,
      },
    };
    vi.mocked(submitProfileForModerationReview).mockResolvedValue({
      ...draftProfile,
      organization: { ...draftProfile.organization!, catalogStatus: "PENDING" },
    });

    mockSearchParams = new URLSearchParams("section=catalog");
    const ui = userEvent.setup();
    render(<ProfileEditor initial={draftProfile} section="catalog" />);
    await ui.click(screen.getByRole("button", { name: /Подготовить профиль к публикации/i }));
    await ui.click(screen.getByRole("button", { name: /Отправить на проверку/i }));

    await waitFor(() => {
      expect(submitProfileForModerationReview).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("button", { name: /Отправить на проверку/i })).not.toBeInTheDocument();
  });

  it("shows branch address field for store without organization in catalog section", async () => {
    mockSearchParams = new URLSearchParams("section=catalog");
    const ui = userEvent.setup();
    render(
      <ProfileEditor
        initial={{
          ...initial,
          user: {
            ...initial.user,
            catalogStatus: "DRAFT",
            partnerType: "STORE",
            storeCategories: ["doors"],
          },
        }}
        section="catalog"
      />,
    );
    await ui.click(screen.getByRole("button", { name: /Подготовить профиль к публикации/i }));
    expect(screen.getByLabelText(/Адрес первого филиала/i)).toBeInTheDocument();
  });

  it("catalog section shows organization specializations, not owner user list", async () => {
    mockSearchParams = new URLSearchParams("section=catalog");
    const ui = userEvent.setup();
    render(
      <ProfileEditor
        initial={{
          ...initial,
          catalogPublication: {
            catalogEntity: "organization",
            isLivePublic: false,
            draftPending: false,
            published: {
              description: null,
              specializations: [],
              storeCategories: [],
              website: null,
              telegram: null,
              publicEmail: null,
              publicPhone: null,
            },
          },
          user: {
            ...initial.user,
            partnerType: "STORE",
            specializations: ["electrician"],
            storeCategories: ["plumbing"],
          },
          organization: {
            id: "o1",
            name: "Shop",
            catalogStatus: "DRAFT",
            partnerType: "STORE",
            branchCount: 1,
            specializations: ["tiles"],
            storeCategories: ["doors"],
          },
        }}
        section="catalog"
      />,
    );
    await ui.click(screen.getByRole("button", { name: /Подготовить профиль к публикации/i }));
    const picker = screen.getByTestId("catalog-directions");
    expect(picker.getAttribute("data-services")).toBe("tiles");
    expect(picker.getAttribute("data-products")).toBe("doors");
    expect(picker.getAttribute("data-services")).not.toContain("electrician");
  });

  it("opens catalog for moderation deep link section", async () => {
    mockSearchParams = new URLSearchParams("section=moderation");
    render(<ProfileEditor initial={initial} section="catalog" moderationSection />);
    expect(screen.getByRole("tab", { name: /Каталог RemCard/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
