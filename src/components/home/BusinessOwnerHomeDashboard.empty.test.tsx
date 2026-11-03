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

describe("BusinessOwnerHomeDashboard empty onboarding", () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(remcardFetch).mockReset();
  });

  it("shows store empty when lifetime orders and full partnership list are zero", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return {
          partnerType: "STORE",
          activeBranchLabel: "Точка",
          selectedBranchId: "b1",
          metrics: {
            primary: { state: "empty" },
            secondary: { state: "empty" },
            tertiary: { state: "empty" },
          },
        };
      }
      if (path === "/api/store/orders?limit=1") {
        return { orders: [], pagination: { limit: 1, hasMore: false, nextCursor: null } };
      }
      if (path === "/api/partnership/list") {
        return { partnerships: [] };
      }
      throw new Error(path);
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  it("keeps dashboard when today metrics are empty but lifetime orders exist", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return {
          partnerType: "STORE",
          activeBranchLabel: "A",
          selectedBranchId: "b1",
          metrics: {
            primary: { state: "empty" },
            secondary: { state: "empty" },
            tertiary: { state: "empty" },
          },
        };
      }
      if (path === "/api/store/orders?limit=1") {
        return {
          orders: [{ orderId: "historical-1" }],
          pagination: { limit: 1, hasMore: true, nextCursor: "x" },
        };
      }
      if (path === "/api/partnership/list") {
        return { partnerships: [] };
      }
      throw new Error(path);
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /Начните с продажи по рекомендации/ })).toBeInTheDocument();
    });
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("keeps branch picker and dashboard when sales exist today", async () => {
    vi.mocked(remcardFetch).mockImplementation((path: string) => {
      if (path.includes("/api/pro/context")) {
        return Promise.resolve({
          role: "ORG_OWNER",
          branches: [{ id: "b1", name: "A", city: "K", address: "1" }],
        });
      }
      if (path.includes("/api/pro/business-home/metrics")) {
        return Promise.resolve({
          partnerType: "STORE",
          activeBranchLabel: "A",
          selectedBranchId: "b1",
          metrics: {
            primary: { state: "ok", value: 1 },
            secondary: { state: "empty" },
            tertiary: { state: "empty" },
          },
        });
      }
      if (path === "/api/store/orders?limit=1") {
        return Promise.resolve({
          orders: [{ orderId: "o1" }],
          pagination: { limit: 1, hasMore: false, nextCursor: null },
        });
      }
      if (path === "/api/partnership/list") {
        return Promise.resolve({ partnerships: [] });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
