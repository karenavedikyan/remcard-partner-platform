import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";
import { AgentProfileWizard } from "./AgentProfileWizard";

const api = vi.hoisted(() => ({
  fetchAgentProfileDraft: vi.fn(),
  patchAgentProfileDraft: vi.fn(),
  finishAgentProfile: vi.fn(),
}));
vi.mock("@/lib/agent-profile/api", () => api);

const initial = {
  step: 3,
  version: 1,
  draftEpoch: 0,
  hasDraft: true,
  profileComplete: false,
  payload: { displayName: "Тестовый агент", city: "Краснодар", contactPhone: "" },
  savedProfile: {},
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
});
