import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  fetchManagementOverview: mocks.fetch,
  recordProfSessionVisit: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { AdminOverviewClient } from "./AdminOverviewClient";

function basePayload(period: string, overrides: Record<string, unknown> = {}) {
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
      seriesDaily: [
        { date: "2026-10-25", agent: 1, specialist: 0, store: 0, company: 0, total: 1 },
        { date: "2026-10-26", agent: 0, specialist: 2, store: 0, company: 0, total: 2 },
        { date: "2026-10-27", agent: 0, specialist: 0, store: 1, company: 0, total: 1 },
      ],
      selectedPeriod: {
        current: period === "1d" ? 1 : period === "30d" ? 30 : 7,
        comparisonNote: null,
      },
      selectedPeriodLabel: period,
    },
    activitySeriesDaily: [
      { date: "2026-10-25", profPartnerProfiles: 2 },
      { date: "2026-10-26", profPartnerProfiles: 4 },
      { date: "2026-10-27", profPartnerProfiles: 3 },
    ],
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
    ...overrides,
  };
}

function chartList(title: string) {
  return screen.getByRole("list", { name: title });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockImplementation(async (period: string) => basePayload(period));
});

describe("A2b overview charts (data + empty branches preserved)", () => {
  it("renders both chart titles, exact dates/values in source order, and SVG points", async () => {
    render(<AdminOverviewClient />);
    await screen.findByRole("heading", { name: "Регистрации по дням", level: 3 });
    expect(screen.getByRole("heading", { name: "Активные профили PROF по дням", level: 3 })).toBeTruthy();

    const reg = chartList("Регистрации по дням");
    const items = within(reg).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "2026-10-251",
      "2026-10-262",
      "2026-10-271",
    ]);

    const prof = chartList("Активные профили PROF по дням");
    expect(within(prof).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "2026-10-252",
      "2026-10-264",
      "2026-10-273",
    ]);

    expect(document.querySelectorAll("svg[role='img']")).toHaveLength(2);
    const regSvg = screen.getByRole("img", { name: /Регистрации по дням/ });
    expect(regSvg.querySelectorAll("circle")).toHaveLength(3);
  });

  it("shows registration empty copy and keeps PROF chart when reg series is empty", async () => {
    mocks.fetch.mockResolvedValueOnce(
      basePayload("7d", {
        registrationsCompleted: {
          ...basePayload("7d").registrationsCompleted,
          seriesDaily: [],
        },
      }),
    );
    render(<AdminOverviewClient />);
    expect(
      await screen.findByText("Нет завершённых регистраций в выбранном периоде"),
    ).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Регистрации по дням" })).toBeNull();
    expect(chartList("Активные профили PROF по дням")).toBeTruthy();
  });

  it("shows PROF empty copy when activitySeriesDaily is [] and when absent", async () => {
    mocks.fetch.mockResolvedValueOnce(
      basePayload("7d", { activitySeriesDaily: [] }),
    );
    const { unmount } = render(<AdminOverviewClient />);
    expect(
      await screen.findByText("Нет данных — учёт начнётся после первых визитов кабинета"),
    ).toBeTruthy();
    expect(chartList("Регистрации по дням")).toBeTruthy();
    unmount();

    mocks.fetch.mockResolvedValueOnce(
      (() => {
        const p = basePayload("7d") as Record<string, unknown>;
        delete p.activitySeriesDaily;
        return p;
      })(),
    );
    render(<AdminOverviewClient />);
    expect(
      await screen.findByText("Нет данных — учёт начнётся после первых визитов кабинета"),
    ).toBeTruthy();
  });

  it("keeps a zero series as a chart (not empty) and a single real point", async () => {
    mocks.fetch.mockResolvedValueOnce(
      basePayload("7d", {
        registrationsCompleted: {
          ...basePayload("7d").registrationsCompleted,
          seriesDaily: [
            { date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 0 },
          ],
        },
        activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 0 }],
      }),
    );
    render(<AdminOverviewClient />);
    await screen.findByRole("list", { name: "Регистрации по дням" });
    expect(screen.queryByText("Нет завершённых регистраций в выбранном периоде")).toBeNull();
    expect(within(chartList("Регистрации по дням")).getByText("0")).toBeTruthy();
    expect(screen.getByRole("img", { name: /Регистрации по дням/ }).querySelectorAll("circle")).toHaveLength(
      1,
    );
  });

  it("preserves all 30 source points and large values in the semantic list", async () => {
    const seriesDaily = Array.from({ length: 30 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return {
        date: `2026-09-${day}`,
        agent: 0,
        specialist: 0,
        store: 0,
        company: 0,
        total: i === 29 ? 123456 : i,
      };
    });
    const activitySeriesDaily = seriesDaily.map((r, i) => ({
      date: r.date,
      profPartnerProfiles: i === 29 ? 987654 : i,
    }));
    mocks.fetch.mockResolvedValueOnce(
      basePayload("30d", {
        registrationsCompleted: {
          ...basePayload("30d").registrationsCompleted,
          seriesDaily,
        },
        activitySeriesDaily,
      }),
    );
    render(<AdminOverviewClient />);
    const reg = await screen.findByRole("list", { name: "Регистрации по дням" });
    expect(within(reg).getAllByRole("listitem")).toHaveLength(30);
    expect(within(reg).getByText("2026-09-01")).toBeTruthy();
    expect(within(reg).getByText("2026-09-30")).toBeTruthy();
    expect(within(reg).getByText("123456")).toBeTruthy();
    expect(screen.getByRole("img", { name: /Регистрации по дням/ }).querySelectorAll("circle")).toHaveLength(
      30,
    );
    expect(within(chartList("Активные профили PROF по дням")).getByText("987654")).toBeTruthy();
  });

  it("refetches chart series on period change and recovers from error without masking as empty", async () => {
    mocks.fetch.mockImplementation(async (period: string) => {
      if (period === "1d") {
        return basePayload("1d", {
          registrationsCompleted: {
            ...basePayload("1d").registrationsCompleted,
            seriesDaily: [
              { date: "2026-10-27", agent: 1, specialist: 0, store: 0, company: 0, total: 9 },
            ],
          },
        });
      }
      return basePayload(period);
    });
    render(<AdminOverviewClient />);
    await screen.findByRole("list", { name: "Регистрации по дням" });
    fireEvent.click(screen.getByRole("button", { name: "Сегодня" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("1d"));
    await waitFor(() =>
      expect(within(chartList("Регистрации по дням")).getByText("9")).toBeTruthy(),
    );

    mocks.fetch.mockRejectedValueOnce(new Error("Сбой графиков"));
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Сбой графиков");
    // Stale data from prior successful load remains visible (not cleared to empty charts)
    expect(chartList("Регистрации по дням")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("7d"));
    await screen.findByText("Один профиль");
  });

  it("keeps chartBlock/chartBars selectors and does not alter A2a typography token", () => {
    const cssPath = path.join(__dirname, "AdminOverview.module.css");
    const src = readFileSync(cssPath, "utf8");
    expect(src).toMatch(/\.chartBlock\s*\{/);
    expect(src).toMatch(/\.chartBars\s*\{/);
    expect(src).toMatch(/\.chartHead\s*\{/);
    expect(src).toMatch(/\.lineChart\s*\{/);
    expect(src).toMatch(/--overview-proto-text-xl:\s*clamp\(\s*1\.5rem/);
    expect(src).toMatch(/--overview-chart-title:\s*1rem/);
    expect(src).toMatch(/height:\s*238px/);
  });
});
