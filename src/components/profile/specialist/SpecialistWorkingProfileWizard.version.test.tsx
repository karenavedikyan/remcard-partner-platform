/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpecialistWorkingProfileWizard } from "./SpecialistWorkingProfileWizard";

const fetchDraft = vi.fn();
const patchDraft = vi.fn();
const finishProfile = vi.fn();
const refreshProfile = vi.fn();

vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistProfileDraft: (...args: unknown[]) => fetchDraft(...args),
  patchSpecialistProfileDraft: (...args: unknown[]) => patchDraft(...args),
  finishSpecialistProfile: (...args: unknown[]) => finishProfile(...args),
  discardSpecialistProfileDraft: vi.fn(),
}));

vi.mock("@/lib/profile-save", () => ({
  refreshProfile: (...args: unknown[]) => refreshProfile(...args),
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => <div data-testid="directions-picker" />,
}));

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="agent-profile-input-phone"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe("SpecialistWorkingProfileWizard version sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshProfile.mockResolvedValue({});
  });

  it("resyncs version 0 after finish before edit/save", async () => {
    const user = userEvent.setup();
    let version = 3;
    let draftLoads = 0;
    fetchDraft.mockImplementation(async () => {
      draftLoads += 1;
      if (draftLoads >= 2) version = 0;
      return {
        version,
        step: 4,
        profileComplete: draftLoads >= 2,
        hasDraft: draftLoads < 2,
        payload: {
          displayName: "Spec",
          city: "Krasnodar",
          specialistKind: "designer",
          serviceSpecializationIds: ["design"],
          navigatorStageIds: ["L1-1"],
        },
        savedProfile: { displayName: "Spec", city: "Krasnodar" },
      };
    });
    patchDraft.mockImplementation(async (body: { expectedVersion: number; payload: unknown; step?: number }) => {
      if (body.expectedVersion !== version) {
        const { RemcardApiError } = await import("@/lib/api-client");
        throw new RemcardApiError(409, "conflict", { error: "version" });
      }
      version += 1;
      return { version, payload: body.payload, step: body.step ?? 1 };
    });
    finishProfile.mockImplementation(async () => {
      version = 0;
      return { ok: true };
    });

    render(<SpecialistWorkingProfileWizard />);

    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-wizard")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Завершить профиль" }));

    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-completed-summary")).toBeInTheDocument(),
    );
    expect(finishProfile).toHaveBeenCalledWith({ expectedVersion: 3 });
    expect(fetchDraft).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Редактировать профиль" }));
    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-wizard")).toBeInTheDocument(),
    );
    expect(fetchDraft).toHaveBeenCalledTimes(3);

    await user.click(screen.getByRole("button", { name: "Сохранить черновик" }));

    await waitFor(() => {
      expect(patchDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({ expectedVersion: 0 }),
      );
    });
  });

  it("preserves local input on 409 until user chooses resolution", async () => {
    const user = userEvent.setup();
    const { RemcardApiError } = await import("@/lib/api-client");
    let draftCalls = 0;
    fetchDraft.mockImplementation(async () => {
      draftCalls += 1;
      return {
        version: draftCalls >= 2 ? 5 : 2,
        step: 1,
        profileComplete: false,
        hasDraft: true,
        payload: { displayName: "Имя с сервера", city: "Krasnodar" },
        savedProfile: {},
      };
    });
    patchDraft
      .mockRejectedValueOnce(new RemcardApiError(409, "conflict", {}))
      .mockResolvedValueOnce({
        version: 6,
        payload: { displayName: "Моя несохранённая правка", city: "Krasnodar" },
      });

    render(<SpecialistWorkingProfileWizard />);
    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-wizard")).toBeInTheDocument(),
    );

    const nameInput = screen.getByLabelText(/Ваше имя/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Моя несохранённая правка");
    const callsBeforeConflict = patchDraft.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Сохранить черновик" }));

    await waitFor(() =>
      expect(screen.getByTestId("specialist-profile-version-conflict")).toBeInTheDocument(),
    );
    expect(nameInput).toHaveValue("Моя несохранённая правка");
    expect(patchDraft.mock.calls.length).toBe(callsBeforeConflict + 1);

    await user.click(screen.getByRole("button", { name: "Сохранить черновик" }));
    expect(patchDraft.mock.calls.length).toBe(callsBeforeConflict + 1);

    await user.click(screen.getByRole("button", { name: "Оставить мои правки" }));
    expect(nameInput).toHaveValue("Моя несохранённая правка");

    patchDraft.mockResolvedValueOnce({ version: 6, payload: { displayName: "Моя несохранённая правка" } });
    await user.click(screen.getByRole("button", { name: "Сохранить черновик" }));
    await waitFor(() =>
      expect(patchDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          expectedVersion: 5,
          payload: expect.objectContaining({ displayName: "Моя несохранённая правка" }),
        }),
      ),
    );
  });
});
