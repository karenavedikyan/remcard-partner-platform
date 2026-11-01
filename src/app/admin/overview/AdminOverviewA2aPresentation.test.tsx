import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

import { readFileSync } from "node:fs";
import path from "node:path";
import { AdminOverviewClient } from "./AdminOverviewClient";

const KPI_TITLES = [
  "Партнёры",
  "Клиенты",
  "В поиске сотрудничества",
  "Новые партнёры",
] as const;

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
    activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 2 }],
    clients: {
      accountedTotal: 12,
      createdInPeriod: { current: 2, comparisonNote: null },
      historicalDemoWarning: "Историческая демо-база",
    },
    moderation: {
      pendingPartners: 2,
      oldestPendingPartnerAt: "2026-10-20T09:00:00.000Z",
      pendingReviews: 0,
    },
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
  mocks.analytics.mockImplementation(async (period: string) => ({
    tab: "overview" as const,
    period,
    registrationsByDay: [{ date: "2026-10-27", clients: 1, pros: 1 }],
  }));
});

describe("A2a overview upper KPI presentation (behavior preserved)", () => {
  it("renders exactly four KPI articles with exact labels and numeric values", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Обзор проекта", level: 1 });
    for (const title of KPI_TITLES) {
      await screen.findByRole("heading", { name: title, level: 2 });
    }
    const articles = document.querySelectorAll("article");
    expect(articles).toHaveLength(4);

    const byTitle = (title: string) => screen.getByRole("heading", { name: title, level: 2 }).closest("article")!;
    expect(within(byTitle("Партнёры")).getByText("5")).toBeTruthy();
    expect(within(byTitle("Партнёры")).getByText(/Историческая демо-база: 7/)).toBeTruthy();
    expect(within(byTitle("Клиенты")).getByText("12")).toBeTruthy();
    expect(within(byTitle("Клиенты")).getByText(/\+2 новых за 7 дней/)).toBeTruthy();
    expect(within(byTitle("В поиске сотрудничества")).getByText("—")).toBeTruthy();
    expect(within(byTitle("Новые партнёры")).getByText("7")).toBeTruthy();
  });

  it("keeps drill links in KPI and attention areas", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Новые партнёры", level: 2 });
    expect(screen.getByRole("link", { name: "Открыть реестр" })).toHaveAttribute(
      "href",
      "/admin/partners?registration=active",
    );
    expect(screen.getByRole("link", { name: /Модерация партнёров/ })).toHaveAttribute(
      "href",
      "/admin/moderation?status=PENDING&entityKind=user",
    );
    expect(document.querySelectorAll("article button")).toHaveLength(0);
  });

  it("defaults to 7d, exposes aria-pressed, and refetches 1d/7d/30d only", async () => {
    render(<AdminOverviewClient />);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith("7d"));
    expect(screen.getByRole("button", { name: "7 дней" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Сегодня" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: /90/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Сегодня" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("1d"));
    const reg = screen.getByRole("heading", { name: "Новые партнёры", level: 2 }).closest("article")!;
    await waitFor(() => expect(reg.querySelector("p")?.textContent).toBe("1"));

    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("30d"));
    await waitFor(() => expect(reg.querySelector("p")?.textContent).toBe("30"));

    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("7d"));
    await waitFor(() => expect(reg.querySelector("p")?.textContent).toBe("7"));

    const periods = mocks.fetch.mock.calls.map((c) => c[0]);
    expect(periods.every((p) => p === "1d" || p === "7d" || p === "30d")).toBe(true);
  });

  it("shows loading status before data and keeps charts/definition after load", async () => {
    let resolve!: (v: unknown) => void;
    mocks.fetch.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(<AdminOverviewClient />);
    expect(screen.getByRole("status")).toHaveTextContent("Загрузка показателей…");
    resolve(payload("7d"));
    await screen.findByRole("heading", { name: "Новые партнёры", level: 2 });
    expect(screen.getByRole("heading", { name: "Рост сообщества", level: 2 })).toBeTruthy();
    fireEvent.click(screen.getByText("Дополнительные показатели"));
    expect(screen.getByText("Один профиль")).toBeTruthy();
  });

  it("surfaces fetch errors without masking as zeros or an empty page", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("Сбой обзора"));
    render(<AdminOverviewClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Сбой обзора");
    expect(screen.queryByText("Новые партнёры")).toBeNull();
    expect(document.querySelectorAll("article")).toHaveLength(0);
    // Period controls and H1 remain so the operator can retry by changing period
    expect(screen.getByRole("heading", { name: "Обзор проекта", level: 1 })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Сегодня" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("1d"));
    await screen.findByRole("heading", { name: "Новые партнёры", level: 2 });
  });

  it("isolates KPI presentation classes from chart block styles in module CSS source", () => {
    const cssPath = path.join(__dirname, "AdminOverview.module.css");
    const src = readFileSync(cssPath, "utf8");
    expect(src).toMatch(/\.kpis\s*\{/);
    expect(src).toMatch(/\.kpi\s*\{/);
    expect(src).toMatch(/\.kpiLabel\s*\{/);
    expect(src).toMatch(/\.kpiValue\s*\{/);
    expect(src).toMatch(/\.kpiBottom\s*\{/);
    expect(src).toMatch(/\.chartBlock\s*\{/);
    expect(src).toMatch(/\.chartBars\s*\{/);
    // Legacy shared card/grid/value presentation classes must not remain for charts to inherit
    expect(src).not.toMatch(/(^|\n)\.card\s*\{/);
    expect(src).not.toMatch(/(^|\n)\.grid\s*\{/);
    expect(src).not.toMatch(/(^|\n)\.value\s*\{/);
  });

  it("scopes h1 and KPI value type scale to prototype --text-xl clamp, not PROF globals", () => {
    const cssPath = path.join(__dirname, "AdminOverview.module.css");
    const src = readFileSync(cssPath, "utf8");
    // Prototype admin scale: clamp(1.5rem, 1.3rem + .45vw, 1.875rem)
    expect(src).toMatch(
      /--overview-proto-text-xl:\s*clamp\(\s*1\.5rem\s*,\s*1\.3rem\s*\+\s*0?\.45vw\s*,\s*1\.875rem\s*\)/,
    );
    const h1Block = src.match(/\.header h1\s*\{([^}]*)\}/)?.[1] ?? "";
    const valueBlock = src.match(/\.kpiValue\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(h1Block).toMatch(/font-size:\s*var\(--overview-proto-text-xl\)/);
    expect(h1Block).toMatch(/line-height:\s*1\.25/);
    expect(h1Block).not.toMatch(/font-size:\s*var\(--text-xl\)/);
    expect(valueBlock).toMatch(/font-size:\s*var\(--overview-proto-text-xl\)/);
    expect(valueBlock).toMatch(/line-height:\s*1\.5/);
    expect(valueBlock).not.toMatch(/font-size:\s*var\(--text-xl\)/);
    // Global PROF --text-xl must stay untouched by this module
    expect(src).not.toMatch(/--text-xl\s*:/);
  });
});
