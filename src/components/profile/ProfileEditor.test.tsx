import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import type { ProProfileResponse } from "@/lib/types";
import { persistWorkingProfileDraft } from "@/lib/profile-working-save";
import { submitProfileForModerationReview } from "@/lib/profile-save";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
}));

vi.mock("@/lib/profile-save", () => ({
  persistProfileDraft: vi.fn(),
  submitProfileForModerationReview: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({ notes: [] }),
  RemcardApiError: class RemcardApiError extends Error {},
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
    specializations: ["stage-1"],
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
    vi.mocked(persistWorkingProfileDraft).mockReset();
    vi.mocked(submitProfileForModerationReview).mockReset();
  });

  it("allows saving basics while catalog publication is pending review", () => {
    render(<ProfileEditor initial={initial} returnTo="/invite/abc" />);
    expect(screen.getByRole("button", { name: /Сохранить данные/i })).not.toBeDisabled();
    expect(screen.getByRole("link", { name: /Вернуться/i })).toHaveAttribute("href", "/invite/abc");
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
});
