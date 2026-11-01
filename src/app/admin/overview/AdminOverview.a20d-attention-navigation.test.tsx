import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

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
import {
  OVERVIEW_ATTENTION_MODERATION_PARTNERS_HREF,
  OVERVIEW_PARTNERS_ACTIVE_REGISTRY_HREF,
} from "./overviewAttentionNavigation";

function managementPayload(overrides: Record<string, unknown> = {}) {
  return {
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
      seriesDaily: [{ date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 1 }],
      selectedPeriod: { current: 7, comparisonNote: null },
      selectedPeriodLabel: "7d",
    },
    activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 2 }],
    clients: {
      accountedTotal: 999,
      createdInPeriod: { current: 2, comparisonNote: null },
      historicalDemoWarning: "Историческая демо-база",
    },
    moderation: { pendingPartners: 3, oldestPendingPartnerAt: null, pendingReviews: 0 },
    leadsAndRequests: { leadsNew: 4, leadsOpen: 9, requestsToday: 1 },
    activity: {
      profPartnerProfilesUsed: { distinctInPeriod: null, coverageNote: "Нет данных", collectionStartedAt: null },
      publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "Нет учёта" },
      publicPartnerCardViews: { viewsInPeriod: 0, coverageNote: "—" },
    },
    definitions: { partnerProfile: "Один профиль" },
    incompleteLiveRegistration: {
      available: true,
      count: 2,
      note: "Live-регистрации не завершены",
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.overview.mockResolvedValue(managementPayload());
  mocks.analytics.mockResolvedValue({
    tab: "overview" as const,
    period: "7d",
    registrationsByDay: [{ date: "2026-10-27", clients: 1, pros: 1 }],
  });
  mocks.clientTotal.mockResolvedValue(456);
});

describe("A20d overview attention navigation", () => {
  it("routes moderation attention CTA to pending partner queue filters", async () => {
    render(<AdminOverviewClient />);
    const link = await screen.findByRole("link", { name: /Модерация партнёров/i });
    expect(link).toHaveAttribute("href", OVERVIEW_ATTENTION_MODERATION_PARTNERS_HREF);
    expect(link).toHaveAttribute("data-attention-target", "moderation-partners-pending");
  });

  it("keeps partners registry KPI link on supported registration=active filter", async () => {
    render(<AdminOverviewClient />);
    const link = await screen.findByRole("link", { name: "Открыть реестр" });
    expect(link).toHaveAttribute("href", OVERVIEW_PARTNERS_ACTIVE_REGISTRY_HREF);
  });

  it("does not render stub analytics page link on community growth panel", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Рост сообщества", level: 2 });
    expect(screen.queryByRole("link", { name: "Аналитика" })).toBeNull();
  });

  it("shows leads and incomplete rows without fake navigation links", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("Новые лиды");
    expect(screen.queryByRole("link", { name: /Новые лиды/i })).toBeNull();
    expect(document.querySelector('[data-attention-static="leads-no-route"]')).toBeTruthy();
    expect(document.querySelector('[data-attention-static="incomplete-registration-no-route"]')).toBeTruthy();
    expect(screen.getByText(/Раздел для работы с лидами пока недоступен/)).toBeTruthy();
    expect(screen.getByText(/Открыть отдельный список по этому признаку пока нельзя/)).toBeTruthy();
  });

  it("uses Russian all-time clients subtitle without English technical label", async () => {
    render(<AdminOverviewClient />);
    const heading = await screen.findByRole("heading", { name: "Клиенты", level: 2 });
    const clients = heading.closest("article")!;
    expect(within(clients).getByText("Всего клиентов за всё время")).toBeTruthy();
    expect(clients.textContent).not.toMatch(/all-time/i);
  });

  it("exposes keyboard focus on moderation attention link", async () => {
    render(<AdminOverviewClient />);
    const link = await screen.findByRole("link", { name: /Модерация партнёров/i });
    link.focus();
    expect(document.activeElement).toBe(link);
    fireEvent.keyDown(link, { key: "Enter" });
  });
});
