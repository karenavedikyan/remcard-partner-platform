/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function baseProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  return {
    organization: { id: "org1", name: "", catalogStatus: "DRAFT", partnerType, branchCount: 0 },
    programs: [],
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "",
      city: "",
      specializations: [],
      role: "PRO",
      partnerType,
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

describe("BusinessWorkingProfileWizard basics", () => {
  beforeEach(() => {
    persist.mockReset();
  });

  it("renders separate organization and representative fields for store", async () => {
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfile("STORE")}
        partnerType="STORE"
        basicsEditable
      />,
    );
    expect(await screen.findByTestId("business-profile-basics-panel")).toBeInTheDocument();
    expect(screen.getByLabelText(/Название магазина/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Имя представителя/i)).toBeInTheDocument();
    expect(screen.getAllByText("О магазине").length).toBeGreaterThan(0);
  });

  it("persists via working profile API on continue", async () => {
    persist.mockResolvedValue({
      ...baseProfile("COMPANY"),
      organization: {
        id: "org1",
        name: "Юг",
        catalogStatus: "DRAFT",
        partnerType: "COMPANY",
        branchCount: 0,
      },
      user: {
        ...baseProfile("COMPANY").user,
        displayName: "Иван",
        city: "Краснодар",
      },
    });
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfile("COMPANY")}
        partnerType="COMPANY"
        basicsEditable
      />,
    );
    await screen.findByLabelText(/Название компании/i);
    await user.type(screen.getByLabelText(/Название компании/i), "Юг");
    await user.type(screen.getByLabelText(/Имя представителя/i), "Иван");
    await user.type(screen.getByLabelText(/^Город/i), "Краснодар");
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    const draft = persist.mock.calls[0]![1] as { organizationName: string; displayName: string };
    expect(draft.organizationName).toBe("Юг");
    expect(draft.displayName).toBe("Иван");
  });
});
