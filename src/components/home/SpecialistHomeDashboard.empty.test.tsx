import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistHomeDashboard } from "./SpecialistHomeDashboard";

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

describe("SpecialistHomeDashboard empty onboarding", () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(remcardFetch).mockReset();
  });

  it("shows prototype empty state when wallet, certificates and partnerships are truly zero", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        return {
          role: "MASTER",
          totalRub: 0,
          paidRub: 0,
          pendingRub: 0,
          awaitingRub: 0,
          suspendedRub: 0,
          balanceRub: 0,
          count: 0,
        };
      }
      if (path === "/api/store/certificate") {
        return { certificates: [] };
      }
      if (path === "/api/partnership/list") {
        return { partnerships: [] };
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  it("does not show empty when pending accruals exist (audit reproduction)", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        return {
          role: "MASTER",
          totalRub: 0,
          paidRub: 0,
          pendingRub: 700,
          awaitingRub: 300,
          count: 2,
        };
      }
      if (path === "/api/store/certificate") {
        return { certificates: [] };
      }
      if (path === "/api/partnership/list") {
        return { partnerships: [] };
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: /Рекомендуйте проверенного партнёра/ }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("keeps dashboard when partnerships exist even if metrics are zero", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        return {
          role: "MASTER",
          totalRub: 0,
          paidRub: 0,
          pendingRub: 0,
          count: 0,
        };
      }
      if (path === "/api/store/certificate") {
        return { certificates: [] };
      }
      if (path === "/api/partnership/list") {
        return { partnerships: [{ id: "p1" }] };
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: /Рекомендуйте проверенного партнёра/ }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
