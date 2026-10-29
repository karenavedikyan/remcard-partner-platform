/** Independent local acceptance tests. No upstream or production calls. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminR1ReviewsClient } from "@/app/admin/moderation/reviews/AdminR1ReviewsClient";
import { AdminR1AnalyticsClient } from "@/app/admin/analytics/AdminR1AnalyticsClient";
import { AdminR1ResultsClient } from "@/app/admin/results/AdminR1ResultsClient";

const api = vi.hoisted(() => ({
  reviews: vi.fn(),
  analytics: vi.fn(),
  summary: vi.fn(),
  remscores: vi.fn(),
}));
vi.mock("@/lib/admin-r1/api", () => ({
  fetchAdminR1Reviews: (...args: unknown[]) => api.reviews(...args),
  fetchAdminR1Analytics: (...args: unknown[]) => api.analytics(...args),
  fetchAdminR1ResultsSummary: (...args: unknown[]) => api.summary(...args),
  fetchAdminR1RemScores: (...args: unknown[]) => api.remscores(...args),
  formatAdminR1Date: (value: string) => value,
  formatAdminR1Money: (value: number) => `${value} ₽`,
}));

describe("Independent reviewer: Admin R1 promised functionality", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers a confirmation entry point for moderating a pending review", async () => {
    api.reviews.mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 40,
      counts: { pending: 1, published: 0, rejected: 0 },
      reviews: [
        {
          id: "local-review",
          rating: 5,
          text: "Искусственный отзыв для QA",
          status: "PENDING",
          createdAt: "2026-10-29T10:00:00.000Z",
          author: { id: "local-client", displayName: "Тестовый клиент" },
          partner: { id: "local-partner", displayName: "Тестовый партнёр" },
        },
      ],
    });
    render(<AdminR1ReviewsClient />);
    await screen.findByText("Искусственный отзыв для QA");
    // Merely verify controls exist. Never click an approve/reject command.
    expect(screen.queryByRole("button", { name: /одобрить|опубликовать/i })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /отклонить/i })).not.toBeNull();
  });

  it("does not expose API field names as the quality analytics screen", async () => {
    const user = userEvent.setup();
    api.analytics.mockResolvedValue({
      tab: "overview",
      period: "30d",
      visitors: { current: 100, previous: 80, changePercent: 25 },
      registrations: { current: 25, previous: 20, changePercent: 25 },
      requests: { current: 12, previous: 10, changePercent: 20 },
      conversionPercent: 25,
      visitsBySection: [],
      registrationsByDay: [],
      requestsByDay: [],
    });
    render(<AdminR1AnalyticsClient />);
    await waitFor(() => expect(api.analytics).toHaveBeenCalled());
    await user.click(screen.getByRole("tab", { name: "Качество базы" }));
    expect(screen.queryByText(/availableKeys/)).not.toBeInTheDocument();
  });

  it("does not represent unavailable grade counts as three verified zeroes", async () => {
    api.summary.mockResolvedValue({
      periodDays: 30,
      certificatesIssued: 12,
      certificatesUsedFully: 2,
      ordersCount: 3,
      ordersSum: 400,
      reviewsPublished: 5,
      reviewsPending: 6,
      averagePublishedRating: 4.5,
      definitions: { note: "Локальные данные" },
    });
    api.remscores.mockRejectedValue(new Error("Рейтинг временно недоступен"));
    render(<AdminR1ResultsClient />);
    await screen.findByText("Рейтинг временно недоступен");
    const label = screen.getByText("A+ и A", { exact: true });
    expect(label.parentElement?.querySelector("strong")?.textContent).not.toBe("0");
  });
});
