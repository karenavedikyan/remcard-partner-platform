import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  analytics: vi.fn(),
  management: vi.fn(),
  funnel: vi.fn(),
}));

vi.mock("@/lib/prof-admin-overview-analytics-api", () => ({
  fetchAdminAnalyticsOverview: mocks.analytics,
}));

vi.mock("@/lib/prof-admin-management-api", () => ({
  fetchManagementOverview: mocks.management,
}));

vi.mock("@/lib/prof-admin-clients-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-clients-api")>();
  return {
    ...actual,
    getAdminUserFunnel: mocks.funnel,
  };
});

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn((url: string) => {
    nav.params = new URLSearchParams(url.split("?")[1] ?? "");
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => nav.params,
}));

import { AdminAnalyticsClient } from "./AdminAnalyticsClient";

describe("AdminAnalytics A22d shared reader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.params = new URLSearchParams();
    mocks.analytics.mockResolvedValue({
      tab: "overview",
      period: "7d",
      registrationsByDay: [{ date: "2026-11-01", clients: 3, pros: 1 }],
    });
    mocks.funnel.mockResolvedValue({
      registered: 100,
      profileFilled: 70,
      firstAction: 40,
      activeRecently: 25,
      pctProfile: 70,
      pctFirst: 57,
      pctActive: 63,
    });
    mocks.management.mockResolvedValue({
      activity: {
        profPartnerProfilesUsed: { distinctInPeriod: null, coverageNote: "Нет сбора за период" },
        publicPartnerCardViews: { viewsInPeriod: 12, coverageNote: "Публичные просмотры" },
        publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "" },
      },
      moderation: { pendingPartners: 2, pendingReviews: 1 },
      incompleteLiveRegistration: { available: false, count: null, note: "Метрика недоступна" },
    });
  });

  it("loads funnel via getAdminUserFunnel(CLIENT) not local parser", async () => {
    render(<AdminAnalyticsClient />);
    expect(await screen.findByRole("heading", { name: "Рост сообщества" })).toBeTruthy();
    expect(mocks.funnel).toHaveBeenCalledWith("CLIENT");
  });

  it("moves tabs with keyboard arrows", async () => {
    render(<AdminAnalyticsClient />);
    const tablist = screen.getByRole("tablist", { name: "Разделы аналитики" });
    tablist.focus();
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => expect(nav.push).toHaveBeenCalled());
    expect(nav.params.get("tab")).toBe("activity");
  });

  it("activity tab shows frozen KPI titles with dash for missing consent", async () => {
    render(<AdminAnalyticsClient />);
    fireEvent.click(screen.getByRole("tab", { name: "Активность" }));
    await waitFor(() => expect(mocks.management).toHaveBeenCalled());
    expect(screen.getByText("С согласием на аналитику")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("surfaces funnel error with retry on growth", async () => {
    mocks.funnel.mockRejectedValueOnce(new Error("Forbidden"));
    render(<AdminAnalyticsClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Forbidden|доступ/i);
    expect(screen.getByRole("button", { name: "Повторить" })).toBeTruthy();
  });
});
