/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SpecialistWorkingProfileWizard } from "./SpecialistWorkingProfileWizard";
import stepStyles from "./SpecialistWorkingProfileWizard.module.css";

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => null,
}));

vi.mock("./SpecialistPresetSection", () => ({
  SpecialistPresetSection: () => null,
}));

const fetchDraft = vi.fn();

vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistProfileDraft: (...args: unknown[]) => fetchDraft(...args),
  patchSpecialistProfileDraft: vi.fn(),
  finishSpecialistProfile: vi.fn(),
  discardSpecialistProfileDraft: vi.fn(),
}));

describe("SpecialistWorkingProfileWizard pattern steps", () => {
  beforeEach(() => {
    fetchDraft.mockResolvedValue({
      contractVersion: "r06",
      featureEnabled: true,
      step: 1,
      version: 1,
      hasDraft: true,
      profileComplete: false,
      payload: { displayName: "A", city: "B" },
      savedProfile: { displayName: "A", city: "B" },
    });
  });

  it("renders scoped card top and step actions on basics step", async () => {
    render(<SpecialistWorkingProfileWizard />);
    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-basics-panel")).toBeInTheDocument(),
    );
    expect(screen.getByText("Обязательные данные")).toBeInTheDocument();
    expect(screen.getByTestId("specialist-profile-progress")).toBeInTheDocument();
    const actions = screen.getByTestId("specialist-step-actions");
    expect(actions.className).toContain(stepStyles.stepActions);
    expect(actions.querySelector(`.${stepStyles.stepActionsLeft}`)).toBeTruthy();
    expect(actions.querySelector(`.${stepStyles.stepActionsRight}`)).toBeTruthy();
  });
});
