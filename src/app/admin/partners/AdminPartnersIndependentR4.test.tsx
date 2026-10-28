import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import { AdminPartnersClient } from "./AdminPartnersClient";

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));
vi.mock("@/lib/prof-admin-partners-api", () => api);
const row = {
  id: "synthetic-r4",
  displayName: "Synthetic R4 partner",
  partnerType: "STORE",
  registrationLabel: "DEMO",
  lifecycle: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  api.fetchPartnerRegistry.mockResolvedValue({ items: [row], total: 1, nextCursor: null });
  api.previewPartnerLifecycle.mockResolvedValue({
    preview: {
      effects: ["Review archive consequences"],
      warnings: [],
      confirmToken: "synthetic-r4-token",
    },
  });
  api.applyPartnerLifecycle.mockResolvedValue({ ok: true });
});
async function openPreview() {
  render(<AdminPartnersClient />);
  await screen.findByText(row.displayName);
  fireEvent.click(screen.getByRole("button", { name: "Действия" }));
  fireEvent.change(screen.getByPlaceholderText("Причина"), { target: { value: "Synthetic R4 reason" } });
  fireEvent.click(screen.getByRole("button", { name: "В архив проекта" }));
  await screen.findByText("Review archive consequences");
}
describe("Independent round-four admin positive and concurrency controls", () => {
  it("sends the preview token only after an explicit confirmation", async () => {
    await openPreview();
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(api.applyPartnerLifecycle).toHaveBeenCalledTimes(1));
    expect(api.applyPartnerLifecycle).toHaveBeenCalledWith(
      row.id,
      "archive_project",
      "Synthetic R4 reason",
      "synthetic-r4-token",
    );
  });
  it("does not mutate after canceling the preview", async () => {
    await openPreview();
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Подтвердить" })).toBeNull();
  });
  it("sends nextCursor when advancing to the next registry page", async () => {
    api.fetchPartnerRegistry
      .mockResolvedValueOnce({ items: [row], total: 2, nextCursor: "cursor-r4" })
      .mockResolvedValueOnce({
        items: [{ ...row, id: "second", displayName: "Second R4 partner" }],
        total: 2,
        nextCursor: null,
      });
    render(<AdminPartnersClient />);
    await screen.findByText(row.displayName);
    fireEvent.click(screen.getByRole("button", { name: "Следующая страница" }));
    await screen.findByText("Second R4 partner");
    expect(api.fetchPartnerRegistry.mock.calls[1][0].get("cursor")).toBe("cursor-r4");
    expect(api.fetchPartnerRegistry.mock.calls[1][0].get("limit")).toBe("25");
    expect(screen.queryByText(row.displayName)).toBeNull();
    expect(screen.getByRole("button", { name: "Предыдущая страница" })).toBeEnabled();
  });
  it("does not send a second mutation while the first confirmation is pending", async () => {
    const finishes: Array<(value: unknown) => void> = [];
    api.applyPartnerLifecycle.mockImplementation(
      () => new Promise((resolve) => { finishes.push(resolve); }),
    );
    await openPreview();
    const button = screen.getByRole("button", { name: "Подтвердить" });
    fireEvent.click(button);
    fireEvent.click(button);
    const calls = api.applyPartnerLifecycle.mock.calls.length;
    finishes.forEach((finish) => finish({ ok: true }));
    expect(calls).toBe(1);
  });
});
