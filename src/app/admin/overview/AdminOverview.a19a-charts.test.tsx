import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), analytics: vi.fn() }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  fetchManagementOverview: mocks.fetch,
  recordProfSessionVisit: vi.fn(),
}));

vi.mock("@/lib/prof-admin-overview-analytics-api", () => ({
  fetchAdminAnalyticsOverview: mocks.analytics,
}));

vi.mock("@/lib/prof-admin-clients-api", () => ({
  getAdminClientTotal: vi.fn(async () => 12),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { AdminOverviewClient } from "./AdminOverviewClient";

function basePayload(period: string) {
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
      seriesDaily: [{ date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 7 }],
      selectedPeriod: { current: 7, comparisonNote: null },
      selectedPeriodLabel: period,
    },
    activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 2 }],
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
  mocks.fetch.mockImplementation(async (period: string) => basePayload(period));
  mocks.analytics.mockImplementation(async (period: string) => ({
    tab: "overview" as const,
    period,
    registrationsByDay: [{ date: "2026-10-27", clients: 2, pros: 1 }],
  }));
});

describe("A19a overview charts dynamics block", () => {
  it("renders community growth legend without technical copy", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("Новые регистрации за 7 дней");
    expect(screen.getByLabelText("Легенда: Рост сообщества")).toHaveTextContent("Клиенты");
    expect(screen.getByLabelText("Легенда: Рост сообщества")).toHaveTextContent("PRO");
    expect(screen.queryByText(/прототипе R1/i)).toBeNull();
    expect(screen.queryByText(/API-ряд/i)).toBeNull();
  });

  it("updates growth subtitle when analytics period changes", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("Новые регистрации за 7 дней");
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(mocks.analytics).toHaveBeenLastCalledWith("30d"));
    await waitFor(() => expect(screen.getByText("Новые регистрации за 30 дней")).toBeTruthy());
  });

  it("shows refetch status while keeping prior growth chart visible", async () => {
    let unlock: () => void = () => {};
    const gate = new Promise<void>((r) => {
      unlock = r;
    });
    mocks.analytics.mockImplementationOnce(async () => ({
      tab: "overview" as const,
      period: "7d",
      registrationsByDay: [{ date: "2026-10-27", clients: 2, pros: 1 }],
    }));
    mocks.analytics.mockImplementationOnce(async () => {
      await gate;
      return {
        tab: "overview" as const,
        period: "1d",
        registrationsByDay: [{ date: "10:00", clients: 9, pros: 0 }],
      };
    });
    render(<AdminOverviewClient />);
    await screen.findByRole("img", { name: /Рост сообщества/ });
    fireEvent.click(screen.getByRole("button", { name: "Сегодня" }));
    expect(await screen.findByText("Обновление…")).toBeTruthy();
    unlock();
    await waitFor(() => expect(screen.queryByText("Обновление…")).toBeNull());
  });

  it("recovers analytics via explicit retry in growth panel", async () => {
    mocks.analytics.mockRejectedValueOnce(new Error("Сбой графиков"));
    render(<AdminOverviewClient />);
    expect(await screen.findByText("Сбой графиков")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Повторить" })[0]!);
    await waitFor(() => expect(mocks.analytics).toHaveBeenCalledTimes(2));
  });

  it("scopes chart dynamics CSS: subtitles, legend, dashboard, retry", () => {
    const src = readFileSync(path.join(__dirname, "AdminOverview.module.css"), "utf8");
    expect(src).toMatch(/\.dashboardSection\s*\{/);
    expect(src).toMatch(/\.dashboardGrid\s*\{/);
    expect(src).toMatch(/\.chartSubtitle\s*\{/);
    expect(src).toMatch(/\.chartLegend\s*\{/);
    expect(src).toMatch(/\.legendDot\s*\{/);
    expect(src).toMatch(/\.retryButton\s*\{/);
    expect(src).not.toMatch(/\.chartContractNote\s*\{/);
  });
});
