import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

function payloadFor(period: "1d" | "7d" | "30d", total: number) {
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
        { date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total },
      ],
      selectedPeriod: { current: total, comparisonNote: null },
      selectedPeriodLabel: period,
    },
    activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: total }],
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
  mocks.fetch.mockImplementation(async (period: string) =>
    payloadFor(period === "30d" ? "30d" : period === "1d" ? "1d" : "7d", period === "30d" ? 30 : period === "1d" ? 1 : 7),
  );
});

describe("A19b overview charts trust and period honesty", () => {
  it("keeps chart period labels on displayed data while a newer period is loading", async () => {
    let release30: (() => void) | undefined;
    const hold30 = new Promise<void>((resolve) => {
      release30 = resolve;
    });
    mocks.fetch.mockImplementation(async (period: string) => {
      if (period === "30d") {
        await hold30;
        return payloadFor("30d", 30);
      }
      return payloadFor("7d", 7);
    });
    render(<AdminOverviewClient />);
    await waitFor(() => expect(screen.getAllByText("За 7 дней")).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    expect(await screen.findByText("Обновление графиков…")).toBeTruthy();
    expect(screen.getAllByText("За 7 дней")).toHaveLength(2);
    expect(screen.queryByText("За 30 дней")).toBeNull();
    expect(within(screen.getByRole("list", { name: "Регистрации по дням" })).getByText("7")).toBeTruthy();
    release30?.();
    await waitFor(() => expect(screen.getAllByText("За 30 дней")).toHaveLength(2));
    expect(within(screen.getByRole("list", { name: "Регистрации по дням" })).getByText("30")).toBeTruthy();
  });

  it("ignores out-of-order 7d→30d→7d responses", async () => {
    type Done = (v: ReturnType<typeof payloadFor>) => void;
    let finish30: Done | undefined;
    mocks.fetch.mockImplementation(async (period: string) => {
      if (period === "30d") {
        return new Promise((resolve) => {
          finish30 = resolve;
        });
      }
      return payloadFor(period as "1d" | "7d" | "30d", period === "1d" ? 1 : 7);
    });
    render(<AdminOverviewClient />);
    await screen.findByRole("list", { name: "Регистрации по дням" });
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    fireEvent.click(screen.getByRole("button", { name: "7 дней" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith("7d"));
    finish30?.(payloadFor("30d", 999));
    await waitFor(() =>
      expect(
        within(screen.getByRole("list", { name: "Регистрации по дням" })).queryByText("999"),
      ).toBeNull(),
    );
  });

  it("does not commit stale success after unmount", async () => {
    let finish: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    mocks.fetch.mockImplementationOnce(async () => payloadFor("7d", 7));
    mocks.fetch.mockImplementationOnce(async () => {
      await gate;
      return payloadFor("30d", 30);
    });
    const { unmount } = render(<AdminOverviewClient />);
    await screen.findByRole("list", { name: "Регистрации по дням" });
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    unmount();
    finish?.();
    await new Promise((r) => setTimeout(r, 20));
    expect(mocks.fetch).toHaveBeenCalled();
  });

  it("keeps stale charts visible on error without retitling to the selected period", async () => {
    mocks.fetch.mockImplementationOnce(async () => payloadFor("7d", 7));
    mocks.fetch.mockRejectedValueOnce(new Error("Сбой сети"));
    render(<AdminOverviewClient />);
    await screen.findByRole("list", { name: "Регистрации по дням" });
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Сбой сети");
    expect(screen.getAllByText("За 7 дней")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "30 дней" })).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("list", { name: "Регистрации по дням" })).getByText("7")).toBeTruthy();
  });
});
