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

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { AdminOverviewClient } from "./AdminOverviewClient";

function payload(period: string) {
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
      seriesDaily: [{ date: "2026-10-27", agent: 1, specialist: 0, store: 0, company: 0, total: 1 }],
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
  mocks.fetch.mockImplementation(async (period: string) => payload(period));
  mocks.analytics.mockImplementation(async (period: string) => ({
    tab: "overview" as const,
    period,
    registrationsByDay: [{ date: "2026-10-27", clients: 1, pros: 0 }],
  }));
});

describe("A15b overview R1 page-head completion", () => {
  it("uses R1 overview H1 title with lead and retained API timestamp", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Обзор проекта", level: 1 });
    expect(screen.getByText("Главное о росте, людях и партнёрской сети")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText(/Обновлено .+ \(Europe\/Moscow\)/)).toBeTruthy(),
    );
  });

  it("keeps period switcher contract (7d default, 1d/30d refetch, aria-pressed)", async () => {
    render(<AdminOverviewClient />);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith("7d"));
    expect(screen.getByRole("button", { name: "7 дней" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Сегодня" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("1d"));
  });

  it("recovers from fetch error via period retry without clearing chrome", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("Сбой обзора"));
    render(<AdminOverviewClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Сбой обзора");
    expect(screen.getByRole("heading", { name: "Обзор проекта", level: 1 })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("30d"));
    await screen.findByRole("heading", { name: "Новые партнёры", level: 2 });
  });

  it("scopes page-head CSS: lead + headerCopy + proto title scale", () => {
    const src = readFileSync(path.join(__dirname, "AdminOverview.module.css"), "utf8");
    expect(src).toMatch(/\.headerCopy\s*\{/);
    expect(src).toMatch(/\.lead\s*\{/);
    expect(src).toMatch(/\.header h1\s*\{[^}]*font-size:\s*var\(--overview-proto-text-xl\)/);
    expect(src).toMatch(/margin-bottom:\s*calc\(var\(--space-6\) - var\(--space-5\)\)/);
  });
});
