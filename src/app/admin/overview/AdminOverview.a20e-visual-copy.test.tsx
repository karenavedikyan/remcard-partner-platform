import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ overview: vi.fn(), analytics: vi.fn(), clientTotal: vi.fn() }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  fetchManagementOverview: mocks.overview,
  recordProfSessionVisit: vi.fn(),
}));

vi.mock("@/lib/prof-admin-overview-analytics-api", () => ({
  fetchAdminAnalyticsOverview: mocks.analytics,
}));

vi.mock("@/lib/prof-admin-clients-api", () => ({
  getAdminClientTotal: mocks.clientTotal,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { AdminOverviewClient } from "./AdminOverviewClient";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clientTotal.mockResolvedValue(12);
  mocks.analytics.mockResolvedValue({
    tab: "overview" as const,
    period: "7d",
    registrationsByDay: [
      { date: "2026-10-25", clients: 1, pros: 0 },
      { date: "2026-10-26", clients: 0, pros: 1 },
      { date: "2026-10-27", clients: 2, pros: 1 },
    ],
  });
  mocks.overview.mockResolvedValue({
    generatedAt: "2026-10-27T13:00:00.000Z",
    timezone: "Europe/Moscow",
    period: "7d",
    periodLabel: "7d",
    partners: { liveRegistered: 5, demoRegistered: 7, visibleInCatalog: 4, catalogCardSurfaces: 6 },
    registrationsCompleted: {
      today: { current: 1, comparisonNote: null },
      days7: { current: 7, comparisonNote: null },
      days30: { current: 30, comparisonNote: null },
      byKindInPeriod: { agent: 1 },
      seriesDaily: [],
      selectedPeriod: { current: 7, comparisonNote: null },
      selectedPeriodLabel: "7d",
    },
    clients: {
      accountedTotal: 99,
      createdInPeriod: { current: 2, comparisonNote: null },
      historicalDemoWarning: "В базе есть исторические демо-записи клиентов — не путать с live.",
    },
    moderation: { pendingPartners: 1, pendingReviews: 0, oldestPendingPartnerAt: null },
    leadsAndRequests: { leadsNew: 0, leadsOpen: 0, requestsToday: 0 },
    activity: {
      profPartnerProfilesUsed: { distinctInPeriod: null, coverageNote: "Нет данных", collectionStartedAt: null },
      publicPartnerCardViews: { viewsInPeriod: 0, coverageNote: "—" },
      publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "—" },
    },
    definitions: { partnerProfile: "Один профиль" },
    incompleteLiveRegistration: { available: false, count: null, note: "" },
    activitySeriesDaily: [],
  });
});

describe("A20e overview visual copy parity", () => {
  it("hides developer-facing words in visible copy", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Обзор проекта", level: 1 });
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/\bmanagement\b/i);
    expect(body).not.toMatch(/\ball-time\b/i);
    expect(body).not.toMatch(/\bAPI\b/);
    expect(screen.queryByText("7d")).toBeNull();
  });

  it("does not repeat raw 7d under Новые партнёры when API sends period label", async () => {
    render(<AdminOverviewClient />);
    const reg = await screen.findByRole("heading", { name: "Новые партнёры", level: 2 });
    const article = reg.closest("article")!;
    expect(within(article).getByText(/За 7 дней/)).toBeTruthy();
    expect(within(article).queryByText("7d")).toBeNull();
  });

  it("exposes demo client warning via expandable details", async () => {
    render(<AdminOverviewClient />);
    expect(await screen.findByText("Пояснение к числу клиентов")).toBeTruthy();
    expect(screen.getByText(/исторические демо-записи клиентов/)).toBeTruthy();
  });

  it("renders chart axis DD.MM labels with full-day accessibility", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Рост сообщества", level: 2 });
    const svg = document.querySelector("svg[role='img']")!;
    expect(svg.textContent).toMatch(/25\.10/);
    expect(svg.textContent).toMatch(/27\.10/);
    expect(svg.textContent).not.toMatch(/2026-/);
    const labeled = svg.querySelector("text[aria-label]");
    expect(labeled?.getAttribute("aria-label")).toMatch(/2026/);
  });
});
