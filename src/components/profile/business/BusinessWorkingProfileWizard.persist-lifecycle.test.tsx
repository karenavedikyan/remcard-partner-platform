/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => null,
}));

const persist = vi.fn();

vi.mock("@/lib/profile-working-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile-working-save")>();
  return {
    ...actual,
    persistWorkingProfileDraft: (...args: unknown[]) => persist(...args),
  };
});

function companyProfile(
  userId: string,
  repName: string,
  city: string,
): ProProfileResponse {
  return {
    organization: {
      id: `org-${userId}`,
      name: "Компания",
      catalogStatus: "DRAFT",
      partnerType: "COMPANY",
      branchCount: 0,
    },
    programs: [],
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      effectiveProductCategoryIds: [],
      effectiveServiceSpecializationIds: [],
      effectiveNavigatorStageIds: [],
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    user: {
      id: userId,
      publicId: "RC",
      displayName: repName,
      city,
      specializations: [],
      role: "PRO",
      partnerType: "COMPANY",
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
}

describe("BusinessWorkingProfileWizard persist lifecycle", () => {
  beforeEach(() => {
    persist.mockReset();
  });

  it("clears saving from stale user so second context can edit", async () => {
    const user = userEvent.setup();
    let resolveFirst: (value: ProProfileResponse) => void = () => undefined;
    const firstPromise = new Promise<ProProfileResponse>((resolve) => {
      resolveFirst = resolve;
    });
    persist.mockReturnValueOnce(firstPromise);

    const first = companyProfile("user-a", "Actor A", "Краснодар");
    const second = companyProfile("user-b", "Actor B", "Сочи");

    const { rerender } = render(
      <BusinessWorkingProfileWizard initialProfile={first} partnerType="COMPANY" basicsEditable />,
    );

    await user.click(screen.getByRole("button", { name: /Редактировать профиль/i }));
    await user.click(screen.getByRole("button", { name: /Сохранить/i }));

    rerender(
      <BusinessWorkingProfileWizard initialProfile={second} partnerType="COMPANY" basicsEditable />,
    );

    const editBtn = screen.getByTestId("business-profile-edit-button");
    await waitFor(() => expect(editBtn).not.toBeDisabled());

    resolveFirst(first);
    await waitFor(() => expect(persist).toHaveBeenCalled());
    expect(editBtn).not.toBeDisabled();
  });

  it("does not show stale error banner on new identity after rejected persist", async () => {
    const user = userEvent.setup();
    let rejectFirst: (reason: unknown) => void = () => undefined;
    const firstPromise = new Promise<ProProfileResponse>((_, reject) => {
      rejectFirst = reject;
    });
    persist.mockReturnValueOnce(firstPromise);

    const first = companyProfile("user-a", "Actor A", "Краснодар");
    const second = companyProfile("user-b", "Actor B", "");

    const { rerender } = render(
      <BusinessWorkingProfileWizard initialProfile={first} partnerType="COMPANY" basicsEditable />,
    );

    await user.click(screen.getByRole("button", { name: /Редактировать профиль/i }));
    await user.click(screen.getByRole("button", { name: /Сохранить/i }));

    rerender(
      <BusinessWorkingProfileWizard initialProfile={second} partnerType="COMPANY" basicsEditable />,
    );

    rejectFirst(new RemcardApiError(500, "Старый сбой", null));
    await waitFor(() => expect(persist).toHaveBeenCalled());

    expect(screen.queryByText(/Не удалось сохранить профиль/i)).toBeNull();
    expect(screen.queryByText(/Старый сбой/i)).toBeNull();
  });

  it("does not call onWorkingProfileSaved after unmount when persist completes", async () => {
    const user = userEvent.setup();
    let resolvePersist: (value: ProProfileResponse) => void = () => undefined;
    const pending = new Promise<ProProfileResponse>((resolve) => {
      resolvePersist = resolve;
    });
    persist.mockReturnValue(pending);

    const profile = companyProfile("user-a", "Actor A", "Краснодар");
    const onSaved = vi.fn();

    const { unmount } = render(
      <BusinessWorkingProfileWizard
        initialProfile={profile}
        partnerType="COMPANY"
        basicsEditable
        onWorkingProfileSaved={onSaved}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Редактировать профиль/i }));
    await user.click(screen.getByRole("button", { name: /Сохранить/i }));

    unmount();
    resolvePersist(profile);
    await waitFor(() => expect(persist).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("stale persist completion does not interrupt newer save after identity handoff", async () => {
    const user = userEvent.setup();
    let resolveSlow: (value: ProProfileResponse) => void = () => undefined;
    const slow = new Promise<ProProfileResponse>((resolve) => {
      resolveSlow = resolve;
    });
    const first = companyProfile("user-a", "Actor A", "Краснодар");
    const second = companyProfile("user-b", "Actor B", "Сочи");
    const onSaved = vi.fn();

    persist.mockReturnValueOnce(slow).mockResolvedValueOnce(second);

    const { rerender } = render(
      <BusinessWorkingProfileWizard
        initialProfile={first}
        partnerType="COMPANY"
        basicsEditable
        onWorkingProfileSaved={onSaved}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Редактировать профиль/i }));
    await user.click(screen.getByRole("button", { name: /Сохранить/i }));

    rerender(
      <BusinessWorkingProfileWizard
        initialProfile={second}
        partnerType="COMPANY"
        basicsEditable
        onWorkingProfileSaved={onSaved}
      />,
    );

    await user.click(screen.getByTestId("business-profile-edit-button"));
    await user.click(screen.getByRole("button", { name: /Сохранить/i }));

    await waitFor(() => expect(persist).toHaveBeenCalledTimes(2));

    resolveSlow(first);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: "user-b" }) }),
    );
    expect(screen.queryByText(/Не удалось сохранить профиль/i)).toBeNull();
  });
});
