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

const R1_KPI = ["Партнёры", "Клиенты", "В поиске сотрудничества", "Новые партнёры"] as const;

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
      seriesDaily: [{ date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 1 }],
      selectedPeriod: {
        current: period === "1d" ? 1 : period === "30d" ? 30 : 7,
        comparisonNote: null,
      },
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
  mocks.overview.mockImplementation(async (period: string) => managementPayload(period));
  mocks.analytics.mockImplementation(async (period: string) => ({
    tab: "overview" as const,
    period,
    registrationsByDay: [{ date: "2026-10-27", clients: 2, pros: 1 }],
  }));
});

describe("A20b R1 overview layout", () => {
  it("renders four primary KPI headings matching frozen R1 labels", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Обзор проекта", level: 1 });
    for (const name of R1_KPI) {
      expect(screen.getByRole("heading", { name, level: 2 })).toBeTruthy();
    }
    expect(document.querySelectorAll("article")).toHaveLength(4);
    expect(screen.queryByText("Завершённые регистрации")).toBeNull();
  });

  it("shows cooperation KPI as unavailable, not zero", async () => {
    render(<AdminOverviewClient />);
    const coop = (await screen.findByRole("heading", {
      name: "В поиске сотрудничества",
      level: 2,
    })).closest("article")!;
    expect(coop.textContent).toMatch(/—/);
    expect(coop.textContent).toMatch(/недоступен на обзоре/i);
  });

  it("uses one community growth panel and attention queue, not three charts", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Рост сообщества", level: 2 });
    expect(screen.getByRole("heading", { name: "Требует внимания", level: 2 })).toBeTruthy();
    expect(document.querySelectorAll('[data-source="admin-analytics-overview"]')).toHaveLength(1);
    expect(document.querySelectorAll("svg[role='img']")).toHaveLength(1);
    expect(screen.queryByText("Регистрации по дням")).toBeNull();
    expect(screen.queryByText("Активные профили PROF по дням")).toBeNull();
  });

  it("keeps analytics growth subtitle on loaded period while refetch pending", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    mocks.analytics.mockImplementationOnce(async () => ({
      tab: "overview" as const,
      period: "7d",
      registrationsByDay: [{ date: "2026-10-27", clients: 1, pros: 1 }],
    }));
    mocks.analytics.mockImplementationOnce(async (period: string) => {
      await gate;
      return {
        tab: "overview" as const,
        period,
        registrationsByDay: [{ date: "2026-10-27", clients: 99, pros: 88 }],
      };
    });
    render(<AdminOverviewClient />);
    await screen.findByText("Новые регистрации за 7 дней");
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    expect(await screen.findByText("Обновление…")).toBeTruthy();
    expect(screen.getByText("Новые регистрации за 7 дней")).toBeTruthy();
    release?.();
    await waitFor(() => expect(screen.getByText("Новые регистрации за 30 дней")).toBeTruthy());
  });
});
