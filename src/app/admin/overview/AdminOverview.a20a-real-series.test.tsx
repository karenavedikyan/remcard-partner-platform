import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ overview: vi.fn(), analytics: vi.fn() }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  fetchManagementOverview: mocks.overview,
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

function managementPayload(period: string) {
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
      seriesDaily: [{ date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 3 }],
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

function analyticsPayload(period: string, clients = 4, pros = 2) {
  return {
    tab: "overview" as const,
    period,
    registrationsByDay: [{ date: "2026-10-27", clients, pros }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.overview.mockImplementation(async (period: string) => managementPayload(period));
  mocks.analytics.mockImplementation(async (period: string) => analyticsPayload(period));
});

describe("A20a overview real analytics account series", () => {
  it("loads analytics registrationsByDay in community growth panel with PRO legend", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Рост сообщества", level: 2 });
    expect(screen.getByLabelText("Легенда: Рост сообщества")).toHaveTextContent("Клиенты");
    expect(screen.getByLabelText("Легенда: Рост сообщества")).toHaveTextContent("PRO");
    await waitFor(() => expect(mocks.analytics.mock.calls[0]?.[0]).toBe("7d"));
    expect(document.querySelector('[data-source="admin-analytics-overview"]')).toBeTruthy();
  });

  it("does not fabricate zeros when analytics returns 403", async () => {
    mocks.analytics.mockRejectedValueOnce(new Error("Forbidden"));
    render(<AdminOverviewClient />);
    expect(await screen.findByText("Forbidden")).toBeTruthy();
    expect(document.querySelectorAll("svg[role='img']")).toHaveLength(0);
  });

  it("ignores stale analytics response after newer period selection", async () => {
    type Done = (v: ReturnType<typeof analyticsPayload>) => void;
    let finish30: Done | undefined;
    mocks.analytics.mockImplementation(async (period: string) => {
      if (period === "30d") {
        return new Promise((resolve) => {
          finish30 = resolve;
        });
      }
      return analyticsPayload(period, 1, 1);
    });
    render(<AdminOverviewClient />);
    await screen.findByRole("img", { name: /Рост сообщества/ });
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    finish30?.(analyticsPayload("30d", 999, 999));
    await waitFor(() => expect(screen.queryByText("999")).toBeNull());
  });
});
