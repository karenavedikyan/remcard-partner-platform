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

describe("BusinessOwnerHomeDashboard nonzero metrics gate", () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(remcardFetch).mockReset();
  });

  it("shows store dashboard immediately when primary sales metric is nonzero", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return {
          partnerType: "STORE",
          activeBranchLabel: "Точка",
          selectedBranchId: "b1",
          metrics: {
            primary: { state: "ok", value: 5 },
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
      expect(document.querySelector("#business-home-hero")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-supplemental-skeleton")).not.toBeInTheDocument();
  });

  it("shows company dashboard when partners metric is nonzero even if list probe is zero", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/pro/business-home/metrics")) {
        return {
          partnerType: "COMPANY",
          activeBranchLabel: null,
          selectedBranchId: null,
          metrics: {
            primary: { state: "empty" },
            secondary: { state: "empty" },
            tertiary: { state: "ok", value: 5 },
          },
        };
      }
      if (path === "/api/partnership/list") {
        return { partnerships: [] };
      }
      throw new Error(path);
    });

    render(<BusinessOwnerHomeDashboard partnerType="COMPANY" />);

    await waitFor(() => {
      expect(document.querySelector("#business-home-hero")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-supplemental-skeleton")).not.toBeInTheDocument();
  });
});
