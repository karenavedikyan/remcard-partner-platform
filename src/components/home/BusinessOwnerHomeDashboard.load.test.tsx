import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const contextTwoBranches = {
  role: "ORG_OWNER",
  branches: [
    { id: "b1", name: "A", city: "K", address: "1" },
    { id: "b2", name: "B", city: "K", address: "2" },
  ],
};

describe("BusinessOwnerHomeDashboard load lifecycle", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    sessionStorage.clear();
  });

  it("ignores stale metrics response when branch changes before slow request completes", async () => {
    let resolveInitialSlow: (v: unknown) => void = () => {};
    const initialSlow = new Promise((r) => {
      resolveInitialSlow = r;
    });

    vi.mocked(remcardFetch).mockImplementation((path: string) => {
      if (path.includes("/api/pro/context")) {
        return Promise.resolve(contextTwoBranches);
      }
      if (path.includes("branchId=b2")) {
        return Promise.resolve({
          partnerType: "STORE",
          activeBranchLabel: "Branch B",
          selectedBranchId: "b2",
          metrics: {
            primary: { state: "ok", value: 9 },
            secondary: { state: "empty" },
            tertiary: { state: "empty" },
          },
        });
      }
      if (path.includes("/api/pro/business-home/metrics")) {
        return initialSlow as Promise<unknown>;
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() => expect(screen.getByTestId("business-home-branch-select")).toBeTruthy());
    await userEvent.selectOptions(screen.getByTestId("business-home-branch-select"), "b2");
    await waitFor(() => expect(screen.getByText("9")).toBeTruthy());

    resolveInitialSlow({
      partnerType: "STORE",
      activeBranchLabel: "Stale A",
      selectedBranchId: "b1",
      metrics: {
        primary: { state: "ok", value: 1 },
        secondary: { state: "empty" },
        tertiary: { state: "empty" },
      },
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.queryByText("Stale A")).toBeNull();
  });

  it("clears branch label while reloading after branch select", async () => {
    vi.mocked(remcardFetch).mockImplementation((path: string) => {
      if (path.includes("/api/pro/context")) {
        return Promise.resolve(contextTwoBranches);
      }
      if (path.includes("branchId=b2")) {
        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                partnerType: "STORE",
                activeBranchLabel: "Second label",
                selectedBranchId: "b2",
                metrics: {
                  primary: { state: "empty" },
                  secondary: { state: "empty" },
                  tertiary: { state: "empty" },
                },
              }),
            40,
          );
        });
      }
      return Promise.resolve({
        partnerType: "STORE",
        activeBranchLabel: "First label",
        selectedBranchId: "b1",
        metrics: {
          primary: { state: "empty" },
          secondary: { state: "empty" },
          tertiary: { state: "empty" },
        },
      });
    });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() => expect(screen.getByText("First label")).toBeTruthy());
    await userEvent.selectOptions(screen.getByTestId("business-home-branch-select"), "b2");
    expect(screen.queryByText("First label")).toBeNull();
    await waitFor(() => expect(screen.getByText("Second label")).toBeTruthy());
  });

  it("retry button refetches metrics after failure", async () => {
    vi.mocked(remcardFetch).mockImplementation((path: string) => {
      if (path.includes("/api/pro/context")) {
        return Promise.resolve(contextTwoBranches);
      }
      if (path.includes("/api/pro/business-home/metrics")) {
        return Promise.reject(new Error("network"));
      }
      return Promise.reject(new Error("network"));
    });
    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Обновить показатели/ })).toBeTruthy(),
    );

    vi.mocked(remcardFetch).mockImplementation((path: string) => {
      if (path.includes("/api/pro/context")) {
        return Promise.resolve(contextTwoBranches);
      }
      return Promise.resolve({
        partnerType: "STORE",
        activeBranchLabel: "OK",
        metrics: {
          primary: { state: "ok", value: 3 },
          secondary: { state: "empty" },
          tertiary: { state: "empty" },
        },
      });
    });
    await userEvent.click(screen.getByRole("button", { name: /Обновить показатели/ }));
    await waitFor(() => expect(screen.getByText("3")).toBeTruthy());
  });

  it("shows partial metric failure without treating needs_branch as numeric zero", async () => {
    vi.mocked(remcardFetch).mockImplementation((path: string) => {
      if (path.includes("/api/pro/context")) {
        return Promise.resolve(contextTwoBranches);
      }
      return Promise.resolve({
        partnerType: "STORE",
        activeBranchLabel: null,
        metrics: {
          primary: { state: "needs_branch", message: "Pick branch" },
          secondary: { state: "ok", value: 2 },
          tertiary: { state: "error", message: "Ops failed" },
        },
      });
    });
    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    expect(screen.getByText(/Pick branch/)).toBeTruthy();
    expect(screen.getAllByText(/Ops failed/).length).toBeGreaterThan(0);
  });
});
