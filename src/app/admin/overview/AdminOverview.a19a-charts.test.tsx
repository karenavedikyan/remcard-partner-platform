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
      byKindInPeriod: { agent: 1 },
      seriesDaily: [
        { date: "2026-10-27", agent: 1, specialist: 0, store: 0, company: 0, total: 7 },
      ],
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockImplementation(async (period: string) => basePayload(period));
});

describe("A19a overview charts dynamics block", () => {
  it("renders panel subtitles, single-series legend, and R1 contract gap note", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("Завершённые регистрации · 7 дней");
    expect(screen.getByText("Активные профили PROF · 7 дней")).toBeTruthy();
    expect(screen.getByLabelText("Легенда: Регистрации по дням")).toHaveTextContent(
      "Завершённые регистрации (total)",
    );
    expect(screen.getByText(/два отдельных API-ряда без клиентской серии/)).toBeTruthy();
  });

  it("updates chart subtitles when period changes and refetches with same period id", async () => {
    render(<AdminOverviewClient />);
    await screen.findByText("Завершённые регистрации · 7 дней");
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("30d"));
    expect(screen.getByRole("button", { name: "30 дней" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(screen.getByText("Завершённые регистрации · 30 дней")).toBeTruthy(),
    );
  });

  it("shows charts refetch status while keeping prior series visible", async () => {
    let unlock: () => void = () => {};
    const gate = new Promise<void>((r) => {
      unlock = r;
    });
    mocks.fetch.mockImplementationOnce(async () => basePayload("7d"));
    mocks.fetch.mockImplementationOnce(async (period: string) => {
      await gate;
      return basePayload(period);
    });
    render(<AdminOverviewClient />);
    await screen.findByRole("list", { name: "Регистрации по дням" });
    fireEvent.click(screen.getByRole("button", { name: "Сегодня" }));
    expect(await screen.findByText("Обновление графиков…")).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Регистрации по дням" })).getByText("7")).toBeTruthy();
    unlock();
    await waitFor(() => expect(screen.queryByText("Обновление графиков…")).toBeNull());
  });

  it("recovers via explicit retry and keeps period selection", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("Сбой графиков"));
    render(<AdminOverviewClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Сбой графиков");
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    await screen.findByRole("list", { name: "Регистрации по дням" });
    expect(screen.getByRole("button", { name: "7 дней" })).toHaveAttribute("aria-pressed", "true");
  });

  it("does not apply stale response after a newer period request", async () => {
    type Resolver = (v: ReturnType<typeof basePayload>) => void;
    let resolve30: Resolver | undefined;
    mocks.fetch.mockImplementation(async (period: string) => {
      if (period === "30d") {
        return new Promise((resolve) => {
          resolve30 = resolve;
        });
      }
      return basePayload(period, {
        registrationsCompleted: {
          ...basePayload(period).registrationsCompleted,
          seriesDaily: [
            { date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 1 },
          ],
        },
      });
    });
    render(<AdminOverviewClient />);
    await screen.findByRole("list", { name: "Регистрации по дням" });
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("7d"));
    resolve30?.(
      basePayload("30d", {
        registrationsCompleted: {
          ...basePayload("30d").registrationsCompleted,
          seriesDaily: [
            { date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 999 },
          ],
        },
      }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole("list", { name: "Регистрации по дням" })).queryByText("999"),
      ).toBeNull(),
    );
    expect(within(screen.getByRole("list", { name: "Регистрации по дням" })).getByText("1")).toBeTruthy();
  });

  it("scopes chart dynamics CSS: subtitles, legend, section, retry", () => {
    const src = readFileSync(path.join(__dirname, "AdminOverview.module.css"), "utf8");
    expect(src).toMatch(/\.chartsSection\s*\{/);
    expect(src).toMatch(/\.chartSubtitle\s*\{/);
    expect(src).toMatch(/\.chartLegend\s*\{/);
    expect(src).toMatch(/\.legendDot\s*\{/);
    expect(src).toMatch(/\.chartContractNote\s*\{/);
    expect(src).toMatch(/\.retryButton\s*\{/);
    expect(src).toMatch(/\.chartsRow\s*\{/);
  });
});
