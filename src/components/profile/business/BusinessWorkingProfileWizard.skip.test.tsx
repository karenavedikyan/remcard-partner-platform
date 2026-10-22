/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";
import { RemcardApiError } from "@/lib/api-client";

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

function profileAtDirectionsStep(): ProProfileResponse {
  return {
    organization: {
      id: "org1",
      name: "Юг",
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
      id: "u1",
      publicId: "RC1",
      displayName: "Иван",
      city: "Краснодар",
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

describe("BusinessWorkingProfileWizard skipStep", () => {
  beforeEach(() => {
    persist.mockReset();
  });

  it("stays on directions step when persistence fails", async () => {
    persist
      .mockResolvedValueOnce(profileAtDirectionsStep())
      .mockRejectedValueOnce(new RemcardApiError(500, "Не удалось сохранить профиль.", null));
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={{
          ...profileAtDirectionsStep(),
          user: { ...profileAtDirectionsStep().user, city: "" },
        }}
        partnerType="COMPANY"
        basicsEditable
      />,
    );
    await user.type(await screen.findByLabelText(/Название компании/i), "Юг");
    await user.type(screen.getByLabelText(/Имя представителя/i), "Иван");
    await user.type(screen.getByLabelText(/^Город/i), "Краснодар");
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));
    await waitFor(() =>
      expect(screen.getByTestId("business-profile-directions-panel")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Пропустить/i }));
    await waitFor(() => expect(persist).toHaveBeenCalled());
    expect(screen.getByTestId("business-profile-directions-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("business-profile-contacts-panel")).toBeNull();
    expect(await screen.findByText(/Не удалось сохранить профиль/i)).toBeInTheDocument();
  });
});
