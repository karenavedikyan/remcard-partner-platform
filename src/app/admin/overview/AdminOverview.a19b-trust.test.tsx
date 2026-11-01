import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), analytics: vi.fn() }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  fetchManagementOverview: mocks.fetch,
  recordProfSessionVisit: vi.fn(),
}));

vi.mock("@/lib/prof-admin-overview-analytics-api", () => ({
  fetchAdminAnalyticsOverview: mocks.analytics,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { AdminOverviewClient } from "./AdminOverviewClient";

function payloadFor(period: "1d" | "7d" | "30d", total: number) {
  return {
    generatedAt: "2026-10-27T13:00:00.000Z",
    timezone: "Europe/Moscow",
    period,
    periodLabel: period,
    partners: { liveRegistered: 5, demoRegistered: 7, visibleInCatalog: 4, catalogCardSurfaces: 6 },
    registrationsCompleted: {
      today: { current: 1, comparisonNote: null },
      days7: { current: 7, comparisonNote: null },
      days30: { current: 30, comparisonNote: null },
      byKindInPeriod: { agent: 1 },
      seriesDaily: [{ date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total }],
      selectedPeriod: { current: total, comparisonNote: null },
      selectedPeriodLabel: period,
    },
    activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: total }],
    clients: {
      accountedTotal: 12,
      createdInPeriod: { current: 2, comparisonNote: null },
      historicalDemoWarning: "Историческая демо-база",
    },
    moderation: { pendingPartners: 2, oldestPendingPartnerAt: null, pendingReviews: 0 },
    leadsAndRequests: { leadsNew: 2, leadsOpen: 5, requestsToday: 1 },
    activity: {
      profPartnerProfilesUsed: { distinctInPeriod: null, coverageNote: "Нет данных", collectionStartedAt: null },
      publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "Нет учёта" },
      publicPartnerCardViews: { viewsInPeriod: 3, coverageNote: "Частичный учёт" },
    },
    definitions: { partnerProfile: "Один профиль" },
    incompleteLiveRegistration: { available: false, count: null, note: "" },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockImplementation(async (period: string) =>
    payloadFor(period === "30d" ? "30d" : period === "1d" ? "1d" : "7d", period === "30d" ? 30 : period === "1d" ? 1 : 7),
  );
  mocks.analytics.mockImplementation(async (period: string) => ({
    tab: "overview" as const,
    period,
    registrationsByDay: [{ date: "2026-10-27", clients: 1, pros: 1 }],
  }));
});

describe("A19b overview charts trust and period honesty", () => {
  it("keeps growth chart period labels on displayed data while a newer period is loading", async () => {
    let release30: (() => void) | undefined;
    const hold30 = new Promise<void>((resolve) => {
      release30 = resolve;
    });
    mocks.analytics.mockImplementation(async (period: string) => {
      if (period === "30d") {
        await hold30;
        return {
          tab: "overview" as const,
          period: "30d",
          registrationsByDay: [{ date: "2026-10-27", clients: 30, pros: 0 }],
        };
      }
      return {
        tab: "overview" as const,
        period,
        registrationsByDay: [{ date: "2026-10-27", clients: 1, pros: 1 }],
      };
    });
    render(<AdminOverviewClient />);
    await screen.findByText("Новые регистрации за 7 дней");
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    expect(await screen.findByText("Обновление…")).toBeTruthy();
    expect(screen.getByText("Новые регистрации за 7 дней")).toBeTruthy();
    expect(screen.queryByText("Новые регистрации за 30 дней")).toBeNull();
    release30?.();
    await waitFor(() => expect(screen.getByText("Новые регистрации за 30 дней")).toBeTruthy());
  });

  it("ignores out-of-order analytics 7d→30d→7d responses", async () => {
    type Done = (v: { tab: "overview"; period: string; registrationsByDay: { date: string; clients: number; pros: number }[] }) => void;
    let finish30: Done | undefined;
    mocks.analytics.mockImplementation(async (period: string) => {
      if (period === "30d") {
        return new Promise((resolve) => {
          finish30 = resolve;
        });
      }
      return {
        tab: "overview" as const,
        period,
        registrationsByDay: [{ date: "2026-10-27", clients: 1, pros: 1 }],
      };
    });
    render(<AdminOverviewClient />);
    await screen.findByRole("img", { name: /Рост сообщества/ });
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await waitFor(() => expect(mocks.analytics).toHaveBeenLastCalledWith("7d"));
    finish30?.({
      tab: "overview",
      period: "30d",
      registrationsByDay: [{ date: "2026-10-27", clients: 999, pros: 999 }],
    });
    await waitFor(() => expect(screen.queryByText("999")).toBeNull());
  });

  it("keeps stale growth chart visible on management error without retitling growth period", async () => {
    mocks.fetch.mockImplementationOnce(async () => payloadFor("7d", 7));
    mocks.fetch.mockRejectedValueOnce(new Error("Сбой сети"));
    mocks.analytics.mockImplementationOnce(async () => ({
      tab: "overview" as const,
      period: "7d",
      registrationsByDay: [{ date: "2026-10-27", clients: 1, pros: 1 }],
    }));
    mocks.analytics.mockRejectedValueOnce(new Error("Сбой аналитики"));
    render(<AdminOverviewClient />);
    await screen.findByRole("img", { name: /Рост сообщества/ });
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    expect(await screen.findByText("Сбой сети")).toBeTruthy();
    expect(screen.getByText("Новые регистрации за 7 дней")).toBeTruthy();
    expect(screen.getByRole("button", { name: "30 дней" })).toHaveAttribute("aria-pressed", "true");
  });
});
