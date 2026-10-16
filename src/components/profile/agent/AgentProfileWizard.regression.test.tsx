import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";
import { AgentProfileWizard } from "./AgentProfileWizard";

const api = vi.hoisted(() => ({
  fetchAgentProfileDraft: vi.fn(),
  patchAgentProfileDraft: vi.fn(),
  finishAgentProfile: vi.fn(),
  discardAgentProfileDraft: vi.fn(),
}));
vi.mock("@/lib/agent-profile/api", () => api);

const initial = {
  step: 3,
  version: 1,
  draftEpoch: 0,
  hasDraft: true,
  profileComplete: false,
  profileSaved: false,
  payload: { displayName: "Тестовый агент", city: "Краснодар", contactPhone: "" },
  savedProfile: {},
};

const savedComplete = {
  ...initial,
  step: 1,
  version: 3,
  hasDraft: false,
  profileComplete: true,
  profileSaved: true,
  payload: { displayName: "Сохранённый", city: "Краснодар" },
  savedProfile: { displayName: "Сохранённый", city: "Краснодар" },
};

describe("Independent R02.1 wizard review", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.fetchAgentProfileDraft.mockResolvedValue(initial);
    api.patchAgentProfileDraft.mockResolvedValue({
      ...initial,
      step: 4,
      version: 2,
    });
  });
  afterEach(cleanup);

  it("keeps submit disabled while finish POST is still pending", async () => {
    api.fetchAgentProfileDraft.mockResolvedValue({ ...initial, step: 4 });
    api.finishAgentProfile.mockImplementation(() => new Promise(() => {}));
    render(<AgentProfileWizard userId="synthetic-review-agent" />);
    await screen.findByText("Шаг 4 из 4");
    const submit = screen.getByTestId("agent-profile-next");
    fireEvent.click(submit);
    await waitFor(() => expect(api.finishAgentProfile).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
  });

  it("skips optional contacts and saves the review step", async () => {
    render(<AgentProfileWizard userId="synthetic-review-agent" />);
    await screen.findByText("Шаг 3 из 4");
    fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));
    await waitFor(() => expect(api.patchAgentProfileDraft).toHaveBeenCalled());
    expect(api.patchAgentProfileDraft.mock.calls[0][0].step).toBe(4);
    await screen.findByText("Шаг 4 из 4");
  });

  it("keeps local changes and rebases onto the actual server version after 409", async () => {
    api.patchAgentProfileDraft.mockRejectedValueOnce(
      new RemcardApiError(409, "Конфликт", { code: "VERSION_CONFLICT" }),
    );
    api.fetchAgentProfileDraft.mockResolvedValueOnce(initial).mockResolvedValue({
      ...initial,
      version: 7,
      payload: { ...initial.payload, city: "Серверный город" },
    });
    render(<AgentProfileWizard userId="synthetic-review-agent" />);
    await screen.findByText("Шаг 3 из 4");
    fireEvent.click(screen.getByRole("button", { name: "Сохранить черновик" }));
    await screen.findByRole("button", { name: "Оставить мои правки" });
    fireEvent.click(screen.getByRole("button", { name: "Оставить мои правки" }));
    await waitFor(() =>
      expect(screen.queryByText(/Конфликт версии/)).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Сохранить черновик" }));
    await waitFor(() => expect(api.patchAgentProfileDraft).toHaveBeenCalledTimes(2));
    const second = api.patchAgentProfileDraft.mock.calls[1][0];
    expect(second.expectedVersion).toBe(7);
    expect(second.payload.city).toBe("Краснодар");
  });

  it("ignores a second finish click while finish is pending", async () => {
    api.fetchAgentProfileDraft.mockResolvedValue({ ...initial, step: 4 });
    api.finishAgentProfile.mockImplementation(() => new Promise(() => {}));
    render(<AgentProfileWizard userId="synthetic-review-agent" />);
    await screen.findByText("Шаг 4 из 4");
    const submit = screen.getByTestId("agent-profile-next");
    fireEvent.click(submit);
    await waitFor(() => expect(api.finishAgentProfile).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(api.finishAgentProfile).toHaveBeenCalledTimes(1);
  });

  it("shows summary status badge on saved profile overview", async () => {
    api.fetchAgentProfileDraft.mockResolvedValue(savedComplete);
    render(<AgentProfileWizard userId="demo-agent-id" />);
    await screen.findByTestId("agent-profile-summary-status");
    expect(screen.getByTestId("agent-profile-summary-status")).toHaveTextContent("Заполнено");
  });

  it("cancel on saved profile discards draft and returns to summary", async () => {
    api.fetchAgentProfileDraft
      .mockResolvedValueOnce({
        ...savedComplete,
        hasDraft: true,
        profileComplete: false,
        version: 4,
        draftEpoch: 2,
      })
      .mockResolvedValue(savedComplete);
    api.discardAgentProfileDraft.mockResolvedValue({ discarded: true });
    render(<AgentProfileWizard userId="synthetic-review-agent" startInEditMode />);
    await screen.findByTestId("agent-profile-cancel-edit");
    fireEvent.click(screen.getByTestId("agent-profile-cancel-edit"));
    await waitFor(() => expect(api.discardAgentProfileDraft).toHaveBeenCalledWith({
      expectedEpoch: 2,
      expectedVersion: 4,
    }));
    await screen.findByTestId("agent-profile-completed-summary");
  });

  it("cancel with local-only edits resets without DELETE", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.fetchAgentProfileDraft.mockResolvedValue({
      ...savedComplete,
      hasDraft: false,
      profileComplete: true,
    });
    render(<AgentProfileWizard userId="synthetic-review-agent" startInEditMode />);
    await screen.findByTestId("agent-profile-input-displayName");
    fireEvent.change(screen.getByTestId("agent-profile-input-displayName"), {
      target: { value: "Локальная правка" },
    });
    fireEvent.click(screen.getByTestId("agent-profile-cancel-edit"));
    await waitFor(() => expect(api.discardAgentProfileDraft).not.toHaveBeenCalled());
    await screen.findByTestId("agent-profile-completed-summary");
  });

  it("shows a network error and re-enables submit after finish rejection", async () => {
    api.fetchAgentProfileDraft.mockResolvedValue({ ...initial, step: 4 });
    api.finishAgentProfile.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<AgentProfileWizard userId="synthetic-review-agent" />);
    await screen.findByText("Шаг 4 из 4");
    const submit = screen.getByTestId("agent-profile-next");
    fireEvent.click(submit);
    await screen.findByText(/проверьте подключение/i);
    await waitFor(() => expect(submit).not.toBeDisabled());
  });
});
