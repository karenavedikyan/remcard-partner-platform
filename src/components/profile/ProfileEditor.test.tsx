import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import type { ProProfileResponse } from "@/lib/types";

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
  it("disables save while profile is pending moderation", () => {
    render(<ProfileEditor initial={initial} returnTo="/invite/abc" />);
    expect(screen.getByRole("button", { name: /Сохранить изменения/i })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Вернуться/i })).toHaveAttribute("href", "/invite/abc");
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
