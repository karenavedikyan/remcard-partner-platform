/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";
import { revealProfileWizardFromEmpty } from "@/components/profile/empty-state/profileEmptyTestHelpers";

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

describe("BusinessWorkingProfileWizard step scroll (M1)", () => {
  beforeEach(() => {
    persist.mockReset();
  });

  it("scrolls the card under the header and focuses the step title on Continue/Back, not on mount", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
    const filled = {
      ...baseProfile("COMPANY"),
      user: { ...baseProfile("COMPANY").user, displayName: "Иван", city: "Краснодар" },
    };
    persist.mockResolvedValue(filled);
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={baseProfile("COMPANY")}
        partnerType="COMPANY"
        basicsEditable
      />,
    );
    await revealProfileWizardFromEmpty(user);
    await screen.findByLabelText(/Название компании/i);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(scrollIntoView).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Название компании/i), "Юг");
    await user.type(screen.getByLabelText(/Имя представителя/i), "Иван");
    await user.type(screen.getByLabelText(/^Город/i), "Краснодар");
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    const card = screen.getByTestId("business-profile-step-card");
    expect(card).toHaveAttribute("data-step-scroll-root");
    expect(scrollIntoView.mock.contexts[0]).toBe(card);
    expect(scrollIntoView).toHaveBeenLastCalledWith(
      expect.objectContaining({ block: "start" }),
    );
    const heading = card.querySelector("[data-step-heading]") as HTMLElement;
    expect(heading).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(heading));

    await user.click(screen.getByRole("button", { name: /^Назад$/i }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
  });
});
