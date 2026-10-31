import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  previewPartnerAccountDelete: vi.fn(),
  applyPartnerAccountDelete: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/prof-admin-partners-api", () => api);
import { AdminPartnersClient } from "./AdminPartnersClient";
const row = {
  id: "computer-synthetic-partner", publicId: "RC-QA-DELETE",
  displayName: "Computer synthetic partner", partnerType: "STORE",
  registrationLabel: "DEMO", lifecycle: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  api.fetchPartnerRegistry.mockResolvedValue({ items: [row], total: 1, nextCursor: null });
  api.previewPartnerAccountDelete.mockResolvedValue({ preview: {
    publicId: row.publicId, displayName: row.displayName, partnerType: "STORE",
    effects: ["Synthetic delete warning"], warnings: [], loginServices: ["MAX"],
    counts: { partnerships: 0, orders: 0, certificates: 0 },
    hasClientCabinet: true, confirmToken: "synthetic-confirm",
  } });
  api.previewPartnerLifecycle.mockRejectedValue(new Error("Wrong lifecycle endpoint invoked"));
  api.applyPartnerAccountDelete.mockResolvedValue({ ok: true, message: "Synthetic success" });
});
async function open() {
  render(<AdminPartnersClient />);
  await screen.findByText(row.displayName);
  fireEvent.click(screen.getByRole("button", { name: /Открыть карточку/ }));
  fireEvent.change(screen.getByPlaceholderText("Причина"), { target: { value: "Synthetic reason" } });
}
describe("Computer A12 retry and explicit confirmation", () => {
  it("Cancel never deletes and wrong publicId leaves confirm disabled", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Удалить аккаунт партнёра" }));
    await screen.findByText("Synthetic delete warning");
    const danger = screen.getByRole("button", { name: "Удалить аккаунт без возможности восстановления" });
    expect(danger).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Публичный ID для подтверждения удаления"), {
      target: { value: "RC-WRONG" },
    });
    expect(danger).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(api.applyPartnerAccountDelete).not.toHaveBeenCalled();
  });
  it("retry after delete preview network error retries account-delete preview, never lifecycle", async () => {
    api.previewPartnerAccountDelete.mockRejectedValueOnce(new Error("Synthetic preview network error"));
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Удалить аккаунт партнёра" }));
    await screen.findByText("Synthetic preview network error");
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(api.previewPartnerAccountDelete).toHaveBeenCalledTimes(2));
    expect(api.previewPartnerLifecycle).not.toHaveBeenCalled();
  });
  it("retry after delete apply network error stays in the account-delete workflow", async () => {
    api.applyPartnerAccountDelete.mockRejectedValueOnce(new Error("Synthetic apply network error"));
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Удалить аккаунт партнёра" }));
    await screen.findByText("Synthetic delete warning");
    fireEvent.change(screen.getByLabelText("Публичный ID для подтверждения удаления"), {
      target: { value: row.publicId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Удалить аккаунт без возможности восстановления" }));
    await screen.findByText("Synthetic apply network error");
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(api.previewPartnerLifecycle).not.toHaveBeenCalled());
    await waitFor(() => expect(
      api.applyPartnerAccountDelete.mock.calls.length > 1
      || api.previewPartnerAccountDelete.mock.calls.length > 1,
    ).toBe(true));
  });
});
