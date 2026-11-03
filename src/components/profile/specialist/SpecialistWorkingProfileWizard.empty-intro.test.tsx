/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpecialistWorkingProfileWizard } from "./SpecialistWorkingProfileWizard";

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
const patchDraft = vi.fn();

vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistProfileDraft: (...args: unknown[]) => fetchDraft(...args),
  patchSpecialistProfileDraft: (...args: unknown[]) => patchDraft(...args),
  finishSpecialistProfile: vi.fn(),
  discardSpecialistProfileDraft: vi.fn(),
}));

describe("SpecialistWorkingProfileWizard empty intro", () => {
  beforeEach(() => {
    fetchDraft.mockReset();
    patchDraft.mockReset();
  });

  it("shows empty intro when hydrate succeeds without draft", async () => {
    fetchDraft.mockResolvedValue({
      contractVersion: "r06",
      featureEnabled: true,
      step: 1,
      version: 0,
      hasDraft: false,
      profileComplete: false,
      payload: {},
      savedProfile: {},
    });
    render(<SpecialistWorkingProfileWizard />);
    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("specialist-profile-wizard")).not.toBeInTheDocument();
  });

  it("skips empty intro when hasDraft", async () => {
    fetchDraft.mockResolvedValue({
      contractVersion: "r06",
      featureEnabled: true,
      step: 2,
      version: 3,
      hasDraft: true,
      profileComplete: false,
      payload: { displayName: "A", city: "B" },
      savedProfile: { displayName: "A", city: "B" },
    });
    render(<SpecialistWorkingProfileWizard />);
    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-wizard")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows load error instead of empty intro on failed hydrate", async () => {
    fetchDraft.mockRejectedValue(new Error("network"));
    render(<SpecialistWorkingProfileWizard />);
    await screen.findByText(/Не удалось загрузить черновик профиля/i);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("CTA reveals wizard without PATCH", async () => {
    fetchDraft.mockResolvedValue({
      contractVersion: "r06",
      featureEnabled: true,
      step: 1,
      version: 0,
      hasDraft: false,
      profileComplete: false,
      payload: {},
      savedProfile: {},
    });
    render(<SpecialistWorkingProfileWizard />);
    await screen.findByTestId("empty-state");
    fireEvent.click(screen.getByTestId("profile-empty-start"));
    await screen.findByTestId("specialist-profile-wizard");
    expect(patchDraft).not.toHaveBeenCalled();
  });
});
