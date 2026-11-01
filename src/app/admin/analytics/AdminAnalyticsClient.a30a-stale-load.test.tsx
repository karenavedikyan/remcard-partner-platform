/** @vitest-environment jsdom */
/**
 * A30a: deferred late responses must not overwrite the currently selected URL scope.
 * Red→green: write this failing test before the generation/abort guard.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  analytics: vi.fn(),
  management: vi.fn(),
  funnel: vi.fn(),
}));

vi.mock("@/lib/prof-admin-overview-analytics-api", () => ({
  fetchAdminAnalyticsOverview: mocks.analytics,
}));

vi.mock("@/lib/prof-admin-management-api", () => ({
  fetchManagementOverview: mocks.management,
}));

vi.mock("@/lib/prof-admin-clients-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-clients-api")>();
  return {
    ...actual,
    getAdminUserFunnel: mocks.funnel,
  };
});

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn((url: string) => {
    nav.params = new URLSearchParams(url.split("?")[1] ?? "");
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => nav.params,
}));

import { AdminAnalyticsClient } from "./AdminAnalyticsClient";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const funnelClient = {
  registered: 100,
  profileFilled: 70,
  firstAction: 40,
  activeRecently: 25,
  pctProfile: 70,
  pctFirst: 57,
  pctActive: 63,
};

const funnelPro = {
  registered: 50,
  profileFilled: 40,
  firstAction: 20,
  activeRecently: 10,
  pctProfile: 80,
  pctFirst: 50,
  pctActive: 50,
};

const series7 = [{ date: "2026-10-26", clients: 1, pros: 0 }];
const series30 = [{ date: "2026-10-01", clients: 9, pros: 4 }];

const mgmt7 = {
  activity: {
    profPartnerProfilesUsed: { distinctInPeriod: 1, coverageNote: "7d" },
    publicPartnerCardViews: { viewsInPeriod: 7, coverageNote: "7d" },
    publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "" },
  },
  moderation: { pendingPartners: 1, pendingReviews: 0 },
  incompleteLiveRegistration: { available: false, count: null, note: "Метрика недоступна" },
};

const mgmt30 = {
  activity: {
    profPartnerProfilesUsed: { distinctInPeriod: 3, coverageNote: "30d" },
    publicPartnerCardViews: { viewsInPeriod: 30, coverageNote: "30d" },
    publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "" },
  },
  moderation: { pendingPartners: 2, pendingReviews: 1 },
  incompleteLiveRegistration: { available: false, count: null, note: "Метрика недоступна" },
};

describe("AdminAnalyticsClient A30a stale load guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.params = new URLSearchParams();
    nav.push.mockImplementation((url: string) => {
      nav.params = new URLSearchParams(url.split("?")[1] ?? "");
    });
  });

  it("7d slow then 30d fast: late 7d success cannot overwrite analytics/management/loading", async () => {
    const slowAnalytics = deferred<{
      tab: "overview";
      period: string;
      registrationsByDay: typeof series7;
    }>();
    const slowMgmt = deferred<typeof mgmt7>();
    const fastAnalytics = deferred<{
      tab: "overview";
      period: string;
      registrationsByDay: typeof series30;
    }>();
    const fastMgmt = deferred<typeof mgmt30>();

    mocks.funnel.mockResolvedValue(funnelClient);
    mocks.analytics
      .mockImplementationOnce(() => slowAnalytics.promise)
      .mockImplementationOnce(() => fastAnalytics.promise);
    mocks.management
      .mockImplementationOnce(() => slowMgmt.promise)
      .mockImplementationOnce(() => fastMgmt.promise);

    const { rerender } = render(<AdminAnalyticsClient />);
    expect(mocks.analytics).toHaveBeenCalledWith("7d");

    // Switch to 30d via URL (same mechanism as setParams)
    nav.params = new URLSearchParams("period=30d");
    rerender(<AdminAnalyticsClient />);
    await waitFor(() => expect(mocks.analytics).toHaveBeenCalledWith("30d"));

    await act(async () => {
      fastAnalytics.resolve({
        tab: "overview",
        period: "30d",
        registrationsByDay: series30,
      });
      fastMgmt.resolve(mgmt30);
    });

    await screen.findByRole("heading", { name: "Рост сообщества" });
    expect(screen.getByText(/Новые регистрации за 30 дней/i)).toBeTruthy();
    const points = screen.getByTestId("analytics-registration-points");
    expect(points.querySelector("circle")?.getAttribute("cy")).toBeTruthy();

    // Late slow 7d must not win
    await act(async () => {
      slowAnalytics.resolve({
        tab: "overview",
        period: "7d",
        registrationsByDay: series7,
      });
      slowMgmt.resolve(mgmt7);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/Новые регистрации за 30 дней/i)).toBeTruthy();
    expect(screen.queryByText(/2026-10-26: клиенты 1/)).toBeNull();
    expect(screen.getByText(/2026-10-01: клиенты 9/)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("CLIENT slow then PRO fast: late CLIENT funnel/error cannot overwrite PRO scope", async () => {
    const slowFunnel = deferred<typeof funnelClient>();
    const fastFunnel = deferred<typeof funnelPro>();

    mocks.analytics.mockResolvedValue({
      tab: "overview",
      period: "7d",
      registrationsByDay: series7,
    });
    mocks.management.mockResolvedValue(mgmt7);
    mocks.funnel
      .mockImplementationOnce(() => slowFunnel.promise)
      .mockImplementationOnce(() => fastFunnel.promise);

    const { rerender } = render(<AdminAnalyticsClient />);
    await waitFor(() => expect(mocks.funnel).toHaveBeenCalledWith("CLIENT"));

    nav.params = new URLSearchParams("funnelRole=PRO");
    rerender(<AdminAnalyticsClient />);
    await waitFor(() => expect(mocks.funnel).toHaveBeenCalledWith("PRO"));

    await act(async () => {
      fastFunnel.resolve(funnelPro);
    });
    expect(await screen.findByRole("heading", { name: /Этапы воронки · PRO/i })).toBeTruthy();
    expect(screen.getByText("50")).toBeTruthy();

    await act(async () => {
      slowFunnel.resolve(funnelClient);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: /Этапы воронки · PRO/i })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Этапы воронки · клиенты/i })).toBeNull();
    // CLIENT registered=100 must not replace PRO 50
    const funnelPanel = screen.getByLabelText("Этапы воронки");
    expect(funnelPanel.textContent).toContain("50");
    expect(funnelPanel.textContent).not.toMatch(/100/);
  });

  it("late old error cannot overwrite current success; retry uses one fresh scope", async () => {
    const slowAnalytics = deferred<{
      tab: "overview";
      period: string;
      registrationsByDay: typeof series7;
    }>();
    const fastAnalytics = deferred<{
      tab: "overview";
      period: string;
      registrationsByDay: typeof series30;
    }>();

    mocks.funnel.mockResolvedValue(funnelClient);
    mocks.management.mockResolvedValue(mgmt30);
    mocks.analytics
      .mockImplementationOnce(() => slowAnalytics.promise)
      .mockImplementationOnce(() => fastAnalytics.promise);

    const { rerender } = render(<AdminAnalyticsClient />);
    nav.params = new URLSearchParams("period=30d");
    rerender(<AdminAnalyticsClient />);
    await waitFor(() => expect(mocks.analytics).toHaveBeenCalledWith("30d"));

    await act(async () => {
      fastAnalytics.resolve({
        tab: "overview",
        period: "30d",
        registrationsByDay: series30,
      });
    });
    await screen.findByRole("heading", { name: "Рост сообщества" });

    await act(async () => {
      slowAnalytics.reject(new Error("stale 7d boom"));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/Новые регистрации за 30 дней/i)).toBeTruthy();

    // Current-scope error then retry — one fresh load for the selected period
    mocks.analytics.mockReset();
    mocks.management.mockResolvedValue(mgmt30);
    mocks.funnel.mockResolvedValue(funnelClient);
    const failThenOk = deferred<{
      tab: "overview";
      period: string;
      registrationsByDay: typeof series30;
    }>();
    mocks.analytics
      .mockImplementationOnce(() => Promise.reject(new Error("current boom")))
      .mockImplementationOnce(() => failThenOk.promise);

    nav.params = new URLSearchParams("period=1d");
    rerender(<AdminAnalyticsClient />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText("current boom")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Повторить/i }));
    await waitFor(() => expect(mocks.analytics).toHaveBeenCalledTimes(2));
    expect(mocks.analytics.mock.calls.every((c) => c[0] === "1d")).toBe(true);
    await act(async () => {
      failThenOk.resolve({
        tab: "overview",
        period: "1d",
        registrationsByDay: [{ date: "2026-11-01", clients: 2, pros: 1 }],
      });
    });
    await screen.findByRole("heading", { name: "Рост сообщества" });
    expect(screen.queryByText("current boom")).toBeNull();
  });

  it("does not setState after unmount when a deferred load resolves", async () => {
    const pending = deferred<{
      tab: "overview";
      period: string;
      registrationsByDay: typeof series7;
    }>();
    mocks.analytics.mockImplementation(() => pending.promise);
    mocks.funnel.mockResolvedValue(funnelClient);
    mocks.management.mockResolvedValue(mgmt7);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<AdminAnalyticsClient />);
    unmount();
    await act(async () => {
      pending.resolve({
        tab: "overview",
        period: "7d",
        registrationsByDay: series7,
      });
      await Promise.resolve();
    });
    const reactNoise = spy.mock.calls
      .map((c) => String(c[0]))
      .filter((m) => /unmounted|Can't perform a React state update/i.test(m));
    spy.mockRestore();
    cleanup();
    expect(reactNoise).toEqual([]);
  });
});
