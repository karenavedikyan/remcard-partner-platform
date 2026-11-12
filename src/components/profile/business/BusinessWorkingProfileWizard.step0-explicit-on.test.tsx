/**
 * @vitest-environment jsdom
 *
 * Reproduces production bug: legacy explicit ON + empty directions blocked at step 1.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";
vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => <div data-testid="directions-panel-mock" />,
}));

const persist = vi.fn();

vi.mock("@/lib/profile-working-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile-working-save")>();
  return {
    ...actual,
    persistWorkingProfileDraft: (...args: unknown[]) => persist(...args),
  };
});

function legacyExplicitOnProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  return {
    organization: {
      id: "org-legacy",
      name: "Магазин Юг",
      catalogStatus: "DRAFT",
      partnerType,
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
      partnerSearchVisible: true,
      partnerSearchOptIn: true,
      partnerSearchOptInExplicit: true,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    user: {
      id: "u-legacy",
      publicId: "RC-LEGACY",
      displayName: "Алексей",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType,
      partnerActivities: [partnerType],
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

describe("BusinessWorkingProfileWizard step 0 explicit ON legacy", () => {
  beforeEach(() => {
    persist.mockReset();
    persist.mockImplementation(async (profile: ProProfileResponse) => profile);
  });

  it.each(["STORE", "COMPANY"] as const)(
    "%s step 1 continue does not block on search directions",
    async (partnerType) => {
      const user = userEvent.setup();
      const initial = legacyExplicitOnProfile(partnerType);
      render(
        <BusinessWorkingProfileWizard
          initialProfile={initial}
          partnerType={partnerType}
          basicsEditable
          forceEditing
          forceStep={0}
        />,
      );
      await user.click(screen.getByRole("button", { name: /Продолжить/i }));
      await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
      expect(persist.mock.calls[0]![2]).toMatchObject({
        validationIntent: "cabinet",
        validationScope: "basics",
      });
      expect(screen.queryByText(/Для видимости в поиске укажите/)).toBeNull();
      expect(await screen.findByTestId("business-profile-directions-panel")).toBeInTheDocument();
      expect(await screen.findByTestId("business-profile-directions-panel")).toBeInTheDocument();
    },
  );

  it("STORE step 3 final save succeeds for untouched legacy explicit ON without categories", async () => {
    const user = userEvent.setup();
    persist.mockResolvedValue(legacyExplicitOnProfile("STORE"));
    render(
      <BusinessWorkingProfileWizard
        initialProfile={legacyExplicitOnProfile("STORE")}
        partnerType="STORE"
        basicsEditable
        forceEditing
        forceStep={3}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Сохранить профиль/i }));
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    expect(persist.mock.calls[0]![2]).toMatchObject({
      partnerSearchTouched: false,
      validationIntent: "activation",
      validationScope: "full",
    });
    expect(screen.queryByText(/Для видимости в поиске укажите/)).toBeNull();
  });

  it("STORE step 3 blocks when user toggles search ON without directions", async () => {
    const user = userEvent.setup();
    const offProfile = {
      ...legacyExplicitOnProfile("STORE"),
      workingProfile: {
        ...legacyExplicitOnProfile("STORE").workingProfile!,
        partnerSearchOptIn: false,
        partnerSearchVisible: false,
        partnerSearchOptInExplicit: true,
      },
    };
    render(
      <BusinessWorkingProfileWizard
        initialProfile={offProfile}
        partnerType="STORE"
        basicsEditable
        forceEditing
        forceStep={3}
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Сохранить профиль/i }));
    expect(await screen.findByText(/Для видимости в поиске укажите/)).toBeTruthy();
    expect(persist).not.toHaveBeenCalled();
  });
});
