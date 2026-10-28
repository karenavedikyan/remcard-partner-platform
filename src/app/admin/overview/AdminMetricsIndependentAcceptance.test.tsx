import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), registry: vi.fn() }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  fetchManagementOverview: mocks.fetch,
  recordProfSessionVisit: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => ({
  fetchPartnerRegistry: mocks.registry,
  applyPartnerLifecycle: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { AdminOverviewClient } from "./AdminOverviewClient";
import { AdminPartnersClient } from "../partners/AdminPartnersClient";

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
      byKindInPeriod: { agent: 1, specialist: 2, store: 3, company: 4 },
      seriesDaily: [{ date: "2026-10-27", agent: 1, specialist: 0, store: 0, company: 0, total: 1 }],
      selectedPeriod: {
        current: period === "1d" ? 1 : period === "30d" ? 30 : 7,
        comparisonNote: null,
      },
      selectedPeriodLabel: period,
    },
    activitySeriesDaily: [],
    clients: {
      accountedTotal: 12,
      createdInPeriod: { current: 2, comparisonNote: null },
      historicalDemoWarning: "Историческая демо-база",
    },
    moderation: { pendingPartners: 2, oldestPendingPartnerAt: null, pendingReviews: 0 },
    leadsAndRequests: { leadsNew: 2, leadsOpen: 5, requestsToday: 1 },
    activity: {
      profPartnerProfilesUsed: {
        distinctInPeriod: null,
        coverageNote: "Нет данных",
        collectionStartedAt: null,
      },
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
  mocks.registry.mockResolvedValue({ items: [], total: 0, facets: null, nextCursor: null });
});

describe("Independent management UI acceptance", () => {
  it("selected Today shows registrations today, not a hard-coded seven day total", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("Завершённые регистрации");
    fireEvent.click(screen.getByRole("button", { name: "Сегодня" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("1d"));
    const card = screen.getByText("Завершённые регистрации").closest("article")!;
    await waitFor(() => expect(card.querySelector("p")?.textContent).toBe("1"));
  });

  it("selected 30 days shows 30 day registrations", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("Завершённые регистрации");
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("30d"));
    const card = screen.getByText("Завершённые регистрации").closest("article")!;
    await waitFor(() => expect(card.querySelector("p")?.textContent).toBe("30"));
  });

  it("registry honors registration=active from the overview drill-down URL", async () => {
    window.history.replaceState(null, "", "/admin/partners?registration=active");
    render(<AdminPartnersClient />);
    await waitFor(() => expect(mocks.registry).toHaveBeenCalled());
    expect(mocks.registry.mock.calls[0][0].get("registration")).toBe("active");
    window.history.replaceState(null, "", "/");
  });
});
