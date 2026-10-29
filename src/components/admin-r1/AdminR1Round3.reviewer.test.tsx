/** Round3 reviewer checks for Admin R1 leftovers. Synthetic mocks only. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminR1ReviewsClient } from "@/app/admin/moderation/reviews/AdminR1ReviewsClient";

const api = vi.hoisted(() => ({
  reviews: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
}));

vi.mock("@/lib/admin-r1/api", () => ({
  fetchAdminR1Reviews: (...args: unknown[]) => api.reviews(...args),
  approveAdminR1Review: (...args: unknown[]) => api.approve(...args),
  rejectAdminR1Review: (...args: unknown[]) => api.reject(...args),
  formatAdminR1Date: (value: string) => value,
  formatAdminR1Money: (value: number) => `${value} ₽`,
}));

const pendingReview = {
  id: "pend-1",
  rating: 3,
  text: "Round3 pending",
  status: "PENDING",
  createdAt: "2026-10-29T08:00:00.000Z",
  author: { id: "c1", displayName: "Клиент" },
  partner: { id: "p1", displayName: "Партнёр" },
};

describe("Admin R1 Round3 reviewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.reviews.mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 25,
      counts: { pending: 1, published: 0, rejected: 0 },
      reviews: [pendingReview],
    });
  });

  it("approve failure keeps its dialog, error and retry without losing selected context", async () => {
    const user = userEvent.setup();
    api.approve.mockRejectedValueOnce(new Error("Отказано локально"));
    render(<AdminR1ReviewsClient />);
    expect(await screen.findByText("Round3 pending")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /опубликовать/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^Опубликовать$/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Отказано локально/);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("reject failure keeps its dialog, error, input and retry without losing selected context", async () => {
    const user = userEvent.setup();
    api.reject.mockRejectedValueOnce(new Error("Отказано локально"));
    render(<AdminR1ReviewsClient />);
    expect(await screen.findByText("Round3 pending")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /отклонить/i }));
    let dialog = await screen.findByRole("dialog");
    await user.type(dialog.querySelector("textarea")!, "Сохранить причину");
    await user.click(within(dialog).getByRole("button", { name: /^Отклонить$/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Отказано локально/);
    dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("textarea")).toHaveValue("Сохранить причину");
  });

  it("does not infer successful persistence from a legacy response with no persistence flag", async () => {
    const user = userEvent.setup();
    api.reject.mockResolvedValue({ success: true });
    render(<AdminR1ReviewsClient />);
    expect(await screen.findByText("Round3 pending")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /отклонить/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(dialog.querySelector("textarea")!, "Причина");
    await user.click(within(dialog).getByRole("button", { name: /^Отклонить$/ }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/не подтвердил сохранение/i);
    expect(status).not.toHaveTextContent(/Причина сохранена/);
  });

  it("shows saved feedback only for explicit reasonPersisted:true", async () => {
    const user = userEvent.setup();
    api.reject.mockResolvedValue({
      success: true,
      reasonAccepted: true,
      reasonPersisted: true,
    });
    render(<AdminR1ReviewsClient />);
    expect(await screen.findByText("Round3 pending")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /отклонить/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(dialog.querySelector("textarea")!, "Причина");
    await user.click(within(dialog).getByRole("button", { name: /^Отклонить$/ }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Причина сохранена/);
  });

  it("warns on explicit reasonPersisted:false", async () => {
    const user = userEvent.setup();
    api.reject.mockResolvedValue({
      success: true,
      reasonAccepted: true,
      reasonPersisted: false,
    });
    render(<AdminR1ReviewsClient />);
    expect(await screen.findByText("Round3 pending")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /отклонить/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(dialog.querySelector("textarea")!, "Причина");
    await user.click(within(dialog).getByRole("button", { name: /^Отклонить$/ }));
    expect(await screen.findByRole("status")).toHaveTextContent(/не сохранен/i);
  });
});
