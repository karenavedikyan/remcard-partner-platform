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
import { buildLineGeometry } from "./overviewLineChartGeometry";

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
      seriesDaily: [
        { date: "2026-10-25", agent: 1, specialist: 0, store: 0, company: 0, total: 1 },
        { date: "2026-10-26", agent: 0, specialist: 2, store: 0, company: 0, total: 2 },
        { date: "2026-10-27", agent: 0, specialist: 0, store: 1, company: 0, total: 1 },
      ],
      selectedPeriod: { current: 7, comparisonNote: null },
      selectedPeriodLabel: period,
    },
    activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 3 }],
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
    registrationsByDay: [
      { date: "2026-10-25", clients: 1, pros: 0 },
      { date: "2026-10-26", clients: 0, pros: 2 },
      { date: "2026-10-27", clients: 1, pros: 1 },
    ],
  }));
});

describe("A2b overview community growth chart", () => {
  it("renders single growth SVG with three points from analytics series", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Рост сообщества", level: 2 });
    expect(document.querySelectorAll("svg[role='img']")).toHaveLength(1);
    const svg = screen.getByRole("img", { name: /Рост сообщества: 3 точек/ });
    expect(svg.querySelectorAll("circle")).toHaveLength(3);
  });

  it("shows empty growth copy when analytics series is empty without faking zeros", async () => {
    mocks.analytics.mockResolvedValueOnce({
      tab: "overview",
      period: "7d",
      registrationsByDay: [],
    });
    render(<AdminOverviewClient />);
    expect(await screen.findByText("Нет новых аккаунтов за выбранный период")).toBeTruthy();
    expect(document.querySelectorAll("svg[role='img']")).toHaveLength(0);
  });

  it("refetches analytics on period change and recovers from analytics error", async () => {
    mocks.analytics.mockRejectedValueOnce(new Error("Сбой ряда"));
    render(<AdminOverviewClient />);
    expect(await screen.findByText("Сбой ряда")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Повторить" })[0]!);
    await waitFor(() => expect(mocks.analytics).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(mocks.analytics).toHaveBeenLastCalledWith("30d"));
  });

  it("keeps chartBlock/chartLegend selectors in module CSS", () => {
    const src = readFileSync(path.join(__dirname, "AdminOverview.module.css"), "utf8");
    expect(src).toMatch(/\.chartBlock\s*\{/);
    expect(src).toMatch(/\.dashboardGrid\s*\{/);
    expect(src).toMatch(/\.lineChart\s*\{/);
  });

  it("compacts Y-axis ticks for huge values in geometry helper", () => {
    const geo = buildLineGeometry([0, 5000, 1200000], 400, 204);
    expect(geo.guides.some((g) => g.label.endsWith("K") || g.label.endsWith("M"))).toBe(true);
  });
});
