import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(screen.getByRole("button", { name: /Сохранить данные/i })).not.toBeDisabled();
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
    await ui.click(screen.getByRole("button", { name: /отправить на публикацию/i }));

    await waitFor(() => {
      expect(submitProfileForModerationReview).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("На проверке")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /отправить на публикацию/i })).not.toBeInTheDocument();
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

  it("opens catalog for moderation deep link section", async () => {
    mockSearchParams = new URLSearchParams("section=moderation");
    render(<ProfileEditor initial={initial} section="catalog" moderationSection />);
    expect(screen.getByRole("tab", { name: /Каталог RemCard/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
