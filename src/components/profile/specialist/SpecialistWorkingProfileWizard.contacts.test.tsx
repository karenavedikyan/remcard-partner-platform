/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SpecialistWorkingProfileWizard } from "./SpecialistWorkingProfileWizard";
import contactStyles from "./SpecialistWorkingProfileWizard.module.css";

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="phoneFieldWrap" data-testid="agent-profile-input-phone-wrap">
      <label htmlFor="phone-mock">Телефон</label>
      <input
        id="phone-mock"
        data-testid="agent-profile-input-phone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
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

describe("SpecialistWorkingProfileWizard contacts step", () => {
  beforeEach(() => {
    fetchDraft.mockResolvedValue({
      contractVersion: "r06",
      featureEnabled: true,
      step: 3,
      version: 1,
      hasDraft: true,
      profileComplete: false,
      payload: {
        displayName: "Контакт Тест",
        city: "Krasnodar",
        partnershipContactPhone: "+79186360088",
        partnershipContactEmail: "a@b.ru",
      },
      savedProfile: {
        displayName: "Контакт Тест",
        city: "Krasnodar",
      },
    });
  });

  it("renders two-column contacts grid and omits destructive reset on contacts actions", async () => {
    render(<SpecialistWorkingProfileWizard />);
    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-contacts-panel")).toBeInTheDocument(),
    );
    const grid = screen.getByTestId("specialist-contacts-two-col");
    expect(grid.className).toContain(contactStyles.contactsTwoCol);
    expect(screen.getByTestId("agent-profile-input-phone")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Сбросить черновик" })).toBeNull();
    expect(screen.getByTestId("specialist-contacts-actions")).toBeInTheDocument();
  });
});
