import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  analytics: vi.fn(),
  clientTotal: vi.fn(),
}));

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

function managementPayload(period: string, createdInPeriod = 2) {
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
      seriesDaily: [{ date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 1 }],
      selectedPeriod: {
        current: period === "1d" ? 1 : period === "30d" ? 30 : 7,
        comparisonNote: null,
      },
      selectedPeriodLabel: period,
    },
    activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 2 }],
    clients: {
      accountedTotal: 999,
      createdInPeriod: { current: createdInPeriod, comparisonNote: null },
      historicalDemoWarning: "Историческая демо-база",
    },
    moderation: { pendingPartners: 0, oldestPendingPartnerAt: null, pendingReviews: 0 },
    leadsAndRequests: { leadsNew: 0, leadsOpen: 0, requestsToday: 0 },
    activity: {
      profPartnerProfilesUsed: { distinctInPeriod: null, coverageNote: "Нет данных", collectionStartedAt: null },
      publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "Нет учёта" },
      publicPartnerCardViews: { viewsInPeriod: 0, coverageNote: "—" },
    },
    definitions: { partnerProfile: "Один профиль" },
    incompleteLiveRegistration: { available: false, count: null, note: "" },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.overview.mockImplementation(async (period: string) => managementPayload(period));
  mocks.analytics.mockImplementation(async (period: string) => ({
    tab: "overview" as const,
    period,
    registrationsByDay:
      period === "30d"
        ? [{ date: "2026-10-27", clients: 30, pros: 3 }]
        : [{ date: "2026-10-27", clients: 7, pros: 1 }],
  }));
  mocks.clientTotal.mockResolvedValue(456);
});

describe("A20c overview CLIENT all-time KPI", () => {
  it("uses getAdminClientTotal for KPI value, not management accountedTotal", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("456");
    expect(screen.queryByText("999")).toBeNull();
    expect(mocks.clientTotal).toHaveBeenCalledTimes(1);
    const kpi = document.querySelector('[data-source="admin-users-client-total"]')!;
    expect(kpi.textContent).toMatch(/Вся клиентская база \(all-time\)/);
    expect(kpi.textContent).toMatch(/\+2 новых за 7 дней/);
  });

  it("does not refetch all-time total when overview period changes", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("456");
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(mocks.overview).toHaveBeenCalledWith("30d"));
    await waitFor(() => expect(screen.getByText(/\+2 новых за 30 дней/)).toBeTruthy());
    expect(mocks.clientTotal).toHaveBeenCalledTimes(1);
    expect(screen.getByText("456")).toBeTruthy();
  });

  it("survives fast period 7→30→7 without stale total overwrite", async () => {
    let release30: (() => void) | undefined;
    const gate30 = new Promise<void>((r) => {
      release30 = r;
    });
    mocks.overview.mockImplementation(async (period: string) => {
      if (period === "30d") await gate30;
      return managementPayload(period, period === "30d" ? 5 : 2);
    });
    render(<AdminOverviewClient />);
    await screen.findByText("456");
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    release30?.();
    await waitFor(() => expect(screen.getByText(/\+2 новых за 7 дней/)).toBeTruthy());
    expect(screen.getByText("456")).toBeTruthy();
    expect(mocks.clientTotal).toHaveBeenCalledTimes(1);
  });

  it("shows error and retry without coercing total to zero on failure", async () => {
    mocks.clientTotal.mockRejectedValueOnce(new Error("Доступ запрещён"));
    render(<AdminOverviewClient />);
    await screen.findByRole("alert");
    expect(screen.getByText("Доступ запрещён")).toBeTruthy();
    const kpi = document.querySelector('[data-source="admin-users-client-total"]')!;
    expect(kpi.textContent).not.toMatch(/\b0\b/);
    mocks.clientTotal.mockResolvedValueOnce(12);
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await screen.findByText("12");
  });

  it("allows numeric zero from API as honest total", async () => {
    mocks.clientTotal.mockResolvedValueOnce(0);
    render(<AdminOverviewClient />);
    const kpi = await screen.findByRole("heading", { name: "Клиенты", level: 2 });
    const article = kpi.closest("article")!;
    await waitFor(() => {
      expect(within(article).getByText("0", { selector: "p" })).toBeTruthy();
    });
  });

  it("keeps R1 layout: four KPIs and single community growth chart", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Рост сообщества", level: 2 });
    expect(document.querySelectorAll("article")).toHaveLength(4);
    expect(document.querySelectorAll('[data-source="admin-analytics-overview"]')).toHaveLength(1);
  });

  it("renders dual clients/pros series and empty-day chart state independently", async () => {
    mocks.analytics.mockResolvedValueOnce({
      tab: "overview" as const,
      period: "7d",
      registrationsByDay: [
        { date: "2026-10-25", clients: 0, pros: 0 },
        { date: "2026-10-26", clients: 1, pros: 2 },
      ],
    });
    render(<AdminOverviewClient />);
    await screen.findByLabelText(/Рост сообщества: 2 точек/);
    expect(screen.getByLabelText("Легенда: Рост сообщества")).toHaveTextContent("PRO");
  });
});
