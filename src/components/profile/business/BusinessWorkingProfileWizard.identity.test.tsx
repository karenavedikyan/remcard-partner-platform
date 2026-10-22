/**
 * @vitest-environment jsdom
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

function companyProfile(userId: string, orgId: string, repName: string): ProProfileResponse {
  return {
    organization: {
      id: orgId,
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

describe("BusinessWorkingProfileWizard identity", () => {
  beforeEach(() => {
    persist.mockReset();
  });

  it("resets unsaved draft when signed-in user changes while editing", async () => {
    const user = userEvent.setup();
    const first = companyProfile("user-first", "org1", "First actor");
    const second = companyProfile("user-second", "org1", "Second actor");

    const { rerender } = render(
      <BusinessWorkingProfileWizard initialProfile={first} partnerType="COMPANY" basicsEditable />,
    );

    await user.click(screen.getByRole("button", { name: /Редактировать профиль/i }));
    const rep = screen.getByLabelText(/Имя представителя/i);
    await user.clear(rep);
    await user.type(rep, "Unsaved first actor");
    expect(rep).toHaveValue("Unsaved first actor");

    rerender(
      <BusinessWorkingProfileWizard initialProfile={second} partnerType="COMPANY" basicsEditable />,
    );

    expect(await screen.findByText(/Second actor/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Unsaved first actor")).toBeNull();
  });

  it("keeps unsaved edits on same-user profile object refresh", async () => {
    const user = userEvent.setup();
    const base = companyProfile("user-first", "org1", "First actor");
    const { rerender } = render(
      <BusinessWorkingProfileWizard initialProfile={base} partnerType="COMPANY" basicsEditable />,
    );
    await user.click(screen.getByRole("button", { name: /Редактировать профиль/i }));
    const rep = screen.getByLabelText(/Имя представителя/i);
    await user.clear(rep);
    await user.type(rep, "Draft name");
    rerender(
      <BusinessWorkingProfileWizard
        initialProfile={{ ...base, user: { ...base.user, displayName: "Server name" } }}
        partnerType="COMPANY"
        basicsEditable
      />,
    );
    expect(screen.getByLabelText(/Имя представителя/i)).toHaveValue("Draft name");
  });

  it("ignores stale persist response after identity change", async () => {
    const user = userEvent.setup();
    let resolvePersist: (value: ProProfileResponse) => void = () => undefined;
    const persistPromise = new Promise<ProProfileResponse>((resolve) => {
      resolvePersist = resolve;
    });
    persist.mockReturnValue(persistPromise);

    const first = companyProfile("user-first", "org1", "First");
    const second = companyProfile("user-second", "org2", "Second");
    const onSaved = vi.fn();

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

    resolvePersist(first);
    await waitFor(() => expect(persist).toHaveBeenCalled());
    await waitFor(() => expect(onSaved).not.toHaveBeenCalled());
    expect(screen.getByText(/Second/)).toBeInTheDocument();
  });
});
