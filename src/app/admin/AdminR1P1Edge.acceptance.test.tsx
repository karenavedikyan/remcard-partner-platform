/** Local edge-case acceptance for remaining P1 defects. Synthetic mocks only. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminR1ReviewsClient } from "@/app/admin/moderation/reviews/AdminR1ReviewsClient";
import { AdminR1AnalyticsClient } from "@/app/admin/analytics/AdminR1AnalyticsClient";
import { AdminR1ResultsClient } from "@/app/admin/results/AdminR1ResultsClient";

const api = vi.hoisted(() => ({
  reviews: vi.fn(),
  analytics: vi.fn(),
  summary: vi.fn(),
  remscores: vi.fn(),
  deals: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
}));

vi.mock("@/lib/admin-r1/api", () => ({
  fetchAdminR1Reviews: (...args: unknown[]) => api.reviews(...args),
  fetchAdminR1Analytics: (...args: unknown[]) => api.analytics(...args),
  fetchAdminR1ResultsSummary: (...args: unknown[]) => api.summary(...args),
  fetchAdminR1RemScores: (...args: unknown[]) => api.remscores(...args),
  fetchAdminR1Deals: (...args: unknown[]) => api.deals(...args),
  fetchAdminR1Certificates: vi.fn(async () => ({
    certificates: [],
    total: 0,
    page: 1,
    totalPages: 0,
  })),
  approveAdminR1Review: (...args: unknown[]) => api.approve(...args),
  rejectAdminR1Review: (...args: unknown[]) => api.reject(...args),
  formatAdminR1Date: (value: string) => value,
  formatAdminR1Money: (value: number) => `${value} ₽`,
}));

describe("Admin R1 P1 edge acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.summary.mockResolvedValue({
      periodDays: 30,
      certificatesIssued: 1,
      certificatesUsedFully: 0,
      ordersCount: 0,
      ordersSum: 0,
      reviewsPublished: 0,
      reviewsPending: 0,
      averagePublishedRating: null,
      definitions: { note: "stub", certificate: "", order: "" },
    });
    api.remscores.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 40,
      averageScore: null,
      gradeBuckets: { A: 0, B: 0, C: 0 },
      items: [],
      definitions: { formula: "", note: "" },
    });
  });

  it("quality reads the existing catalog DTO, not a falsely unavailable overview DTO", async () => {
    const user = userEvent.setup();
    api.analytics.mockImplementation(async (_period: string, tab = "overview") => {
      if (tab === "catalog") {
        return {
          tab: "catalog",
          period: "30d",
          catalogViews: 77,
          profileViews: 12,
          approvedPartners: 4,
          activeServices: 9,
        };
      }
      return {
        tab: "overview",
        period: "30d",
        visitors: { current: 100, previous: 80, changePercent: 25 },
        registrations: { current: 25, previous: 20, changePercent: 25 },
        requests: { current: 12, previous: 10, changePercent: 20 },
        conversionPercent: 25,
      };
    });
    render(<AdminR1AnalyticsClient />);
    await waitFor(() => expect(api.analytics).toHaveBeenCalledWith("30d", "overview"));
    await user.click(screen.getByRole("tab", { name: "Качество базы" }));
    await waitFor(() => expect(api.analytics).toHaveBeenCalledWith("30d", "catalog"));
    expect(await screen.findByText("77")).toBeTruthy();
    expect(screen.queryByText(/availableKeys/)).not.toBeInTheDocument();
    expect(screen.queryByText(/нет отдельных показателей/i)).not.toBeInTheDocument();
  });

  it("moderation load failure does not show four verified zeroes", async () => {
    api.reviews.mockRejectedValue(new Error("Очередь временно недоступна"));
    render(<AdminR1ReviewsClient />);
    await screen.findByText("Очередь временно недоступна");
    const labels = ["Ожидают", "Опубликовано", "Отклонено", "В списке"];
    for (const label of labels) {
      const node = screen.getByText(label, { exact: true });
      expect(node.parentElement?.querySelector("strong")?.textContent).not.toBe("0");
    }
  });

  it("results deals failure does not show a verified zero sum", async () => {
    const user = userEvent.setup();
    api.deals.mockRejectedValue(new Error("Сделки недоступны"));
    render(<AdminR1ResultsClient />);
    await user.click(screen.getByRole("tab", { name: "Сделки" }));
    await screen.findByText("Сделки недоступны");
    expect(screen.queryByText(/сумма 0 ₽/)).not.toBeInTheDocument();
    expect(screen.getByText(/сумма недоступна/i)).toBeTruthy();
  });

  it("results review failure does not show verified zero status counts", async () => {
    const user = userEvent.setup();
    api.reviews.mockRejectedValue(new Error("Отзывы недоступны"));
    render(<AdminR1ResultsClient />);
    await user.click(screen.getByRole("tab", { name: "Отзывы" }));
    await screen.findByText("Отзывы недоступны");
    expect(screen.queryByText(/Ожидают 0/)).not.toBeInTheDocument();
    expect(screen.getByText(/Счётчики недоступны/i)).toBeTruthy();
  });

  it("does not overwrite published filter results with an older pending request", async () => {
    const user = userEvent.setup();
    let resolvePending: (value: unknown) => void = () => undefined;
    const pendingPromise = new Promise((resolve) => {
      resolvePending = resolve;
    });
    api.reviews.mockImplementation(async (params: URLSearchParams) => {
      const status = params.get("status");
      if (status === "PENDING") {
        return pendingPromise;
      }
      return {
        total: 1,
        page: 1,
        pageSize: 25,
        counts: { pending: 1, published: 1, rejected: 0 },
        reviews: [
          {
            id: "pub-1",
            rating: 5,
            text: "Опубликованный отзыв",
            status: "PUBLISHED",
            createdAt: "2026-10-29T10:00:00.000Z",
            author: { id: "c1", displayName: "Клиент" },
            partner: { id: "p1", displayName: "Партнёр" },
          },
        ],
      };
    });

    render(<AdminR1ReviewsClient />);
    await user.selectOptions(screen.getByLabelText("Статус отзывов"), "PUBLISHED");
    expect(await screen.findByText("Опубликованный отзыв")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /опубликовать/i })).toBeNull();

    await act(async () => {
      resolvePending({
        total: 1,
        page: 1,
        pageSize: 25,
        counts: { pending: 1, published: 1, rejected: 0 },
        reviews: [
          {
            id: "pend-1",
            rating: 4,
            text: "Устаревший pending",
            status: "PENDING",
            createdAt: "2026-10-29T09:00:00.000Z",
            author: { id: "c2", displayName: "Клиент 2" },
            partner: { id: "p2", displayName: "Партнёр 2" },
          },
        ],
      });
      await Promise.resolve();
    });

    expect(screen.queryByText("Устаревший pending")).not.toBeInTheDocument();
    expect(screen.getByText("Опубликованный отзыв")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /опубликовать/i })).toBeNull();
  });

  it("returns to the previous valid moderation page after moderating its last row", async () => {
    const user = userEvent.setup();
    api.approve.mockResolvedValue({ success: true });
    api.reviews.mockImplementation(async (params: URLSearchParams) => {
      const page = Number(params.get("page") || "1");
      if (page === 2) {
        return {
          total: 26,
          page: 2,
          pageSize: 25,
          counts: { pending: 26, published: 0, rejected: 0 },
          reviews: [
            {
              id: "last-pending",
              rating: 5,
              text: "Последний на странице 2",
              status: "PENDING",
              createdAt: "2026-10-29T10:00:00.000Z",
              author: { id: "c1", displayName: "Клиент" },
              partner: { id: "p1", displayName: "Партнёр" },
            },
          ],
        };
      }
      return {
        total: 26,
        page: 1,
        pageSize: 25,
        counts: { pending: 26, published: 0, rejected: 0 },
        reviews: [
          {
            id: "page1-item",
            rating: 4,
            text: "Остаётся на странице 1",
            status: "PENDING",
            createdAt: "2026-10-29T11:00:00.000Z",
            author: { id: "c3", displayName: "Клиент 3" },
            partner: { id: "p3", displayName: "Партнёр 3" },
          },
        ],
      };
    });

    render(<AdminR1ReviewsClient />);
    await screen.findByText(/Стр\. 1 из 2/);
    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(await screen.findByText("Последний на странице 2")).toBeTruthy();

    // After approve, simulate empty page 2 then valid page 1.
    let approveCalls = 0;
    api.reviews.mockImplementation(async (params: URLSearchParams) => {
      const page = Number(params.get("page") || "1");
      if (page === 2) {
        approveCalls += 1;
        return {
          total: 25,
          page: 2,
          pageSize: 25,
          counts: { pending: 25, published: 1, rejected: 0 },
          reviews: [],
        };
      }
      return {
        total: 25,
        page: 1,
        pageSize: 25,
        counts: { pending: 25, published: 1, rejected: 0 },
        reviews: [
          {
            id: "page1-item",
            rating: 4,
            text: "Остаётся на странице 1",
            status: "PENDING",
            createdAt: "2026-10-29T11:00:00.000Z",
            author: { id: "c3", displayName: "Клиент 3" },
            partner: { id: "p3", displayName: "Партнёр 3" },
          },
        ],
      };
    });

    await user.click(screen.getAllByRole("button", { name: /^Опубликовать$/ })[0]!);
    const dialog = await screen.findByRole("dialog");
    await user.click(
      dialog.querySelector("button.primary") ??
        screen.getAllByRole("button", { name: /^Опубликовать$/ }).at(-1)!,
    );
    expect(await screen.findByText("Остаётся на странице 1")).toBeTruthy();
    expect(screen.queryByText(/Стр\. 2 из 1/)).not.toBeInTheDocument();
    expect(screen.getByText(/Стр\. 1 из 1 · всего 25/)).toBeTruthy();
    expect(approveCalls).toBeGreaterThan(0);
  });
});
