import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import type { ProProfileResponse } from "@/lib/types";
import { submitProfileForModerationReview } from "@/lib/profile-save";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
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
    vi.mocked(submitProfileForModerationReview).mockReset();
  });

  it("disables save while profile is pending moderation", () => {
    render(<ProfileEditor initial={initial} returnTo="/invite/abc" />);
    expect(screen.getByRole("button", { name: /Сохранить изменения/i })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Вернуться/i })).toHaveAttribute("href", "/invite/abc");
  });

  it("shows PENDING org status after submit without resubmit button", async () => {
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

    vi.mocked(submitProfileForModerationReview).mockResolvedValue({
      ...draftProfile,
      organization: { ...draftProfile.organization!, catalogStatus: "PENDING" },
    });

    const ui = userEvent.setup();
    render(<ProfileEditor initial={draftProfile} />);
    await ui.click(screen.getByRole("button", { name: /отправить на проверку/i }));

    await waitFor(() => {
      expect(submitProfileForModerationReview).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("На проверке")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /отправить на проверку/i })).not.toBeInTheDocument();
  });

  it("shows branch address field for store without organization", () => {
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
      />,
    );
    expect(screen.getByLabelText(/Адрес первого филиала/i)).toBeInTheDocument();
  });
});
