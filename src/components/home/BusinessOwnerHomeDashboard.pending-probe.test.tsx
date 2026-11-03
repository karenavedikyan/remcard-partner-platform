import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessOwnerHomeDashboard } from "./BusinessOwnerHomeDashboard";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

const { remcardFetch } = await import("@/lib/api-client");

const emptyStoreMetrics = {
  partnerType: "STORE",
  activeBranchLabel: "Точка",
  selectedBranchId: "b1",
  metrics: {
    primary: { state: "empty" },
    secondary: { state: "empty" },
    tertiary: { state: "empty" },
  },
};

function expectStorePendingSupplementalShell() {
  expect(screen.getByTestId("home-supplemental-skeleton")).toHaveAttribute("aria-busy", "true");
  expect(document.querySelector("#business-home-hero")).toBeNull();
  expect(screen.queryByRole("link", { name: /Проверить сертификат/ })).not.toBeInTheDocument();
  expect(screen.queryByTestId("business-home-branch-select")).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
}

describe("BusinessOwnerHomeDashboard pending supplemental probe", () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(remcardFetch).mockReset();
  });

  it("shows supplemental skeleton (no hero, branch picker, or CTAs) until store probes settle", async () => {
    let resolveOrders!: (value: unknown) => void;
    const ordersGate = new Promise((resolve) => {
      resolveOrders = resolve;
    });

    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return emptyStoreMetrics;
      }
      if (path === "/api/store/orders?limit=1") return ordersGate;
      if (path === "/api/partnership/list") {
        return { partnerships: [] };
      }
      throw new Error(path);
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);

    await waitFor(() => {
      expectStorePendingSupplementalShell();
    });

    resolveOrders({
      orders: [],
      pagination: { limit: 1, hasMore: false, nextCursor: null },
    });

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
    expect(document.querySelector("#business-home-hero")).toBeNull();
  });

  it("restores dashboard when lifetime orders exist", async () => {
    let resolveOrders!: (value: unknown) => void;
    const ordersGate = new Promise((resolve) => {
      resolveOrders = resolve;
    });

    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return emptyStoreMetrics;
      }
      if (path === "/api/store/orders?limit=1") return ordersGate;
      if (path === "/api/partnership/list") {
        return { partnerships: [] };
      }
      throw new Error(path);
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);

    await waitFor(() => {
      expectStorePendingSupplementalShell();
    });

    resolveOrders({
      orders: [{ orderId: "historical-1" }],
      pagination: { limit: 1, hasMore: true, nextCursor: "x" },
    });

    await waitFor(() => {
      expect(document.querySelector("#business-home-hero")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("home-supplemental-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("restores dashboard when supplemental probe errors", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return emptyStoreMetrics;
      }
      if (path === "/api/store/orders?limit=1") {
        throw new Error("network");
      }
      throw new Error(path);
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);

    await waitFor(() => {
      expect(screen.queryByTestId("home-supplemental-skeleton")).not.toBeInTheDocument();
      expect(document.querySelector("#business-home-hero")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
