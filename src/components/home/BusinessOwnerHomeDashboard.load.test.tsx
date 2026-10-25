import { act, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("./BusinessHomeBranchPicker", () => ({
  BusinessHomeBranchPicker: ({
    onBranchSaved,
  }: {
    selectedBranchId: string | null;
    onBranchSaved: () => void;
  }) => (
    <button type="button" onClick={() => onBranchSaved()}>
      Simulate branch save
    </button>
  ),
}));

const { remcardFetch } = await import("@/lib/api-client");

describe("BusinessOwnerHomeDashboard load lifecycle", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("ignores stale response when context epoch changes before resolve", async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    const first = new Promise((r) => {
      resolveFirst = r;
    });
    vi.mocked(remcardFetch)
      .mockImplementationOnce(() => first as Promise<unknown>)
      .mockResolvedValueOnce({
        partnerType: "STORE",
        activeBranchLabel: "Branch B",
        selectedBranchId: "b2",
        metrics: {
          primary: { state: "ok", value: 9 },
          secondary: { state: "empty" },
          tertiary: { state: "empty" },
        },
      });

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await act(async () => {
      resolveFirst({
        partnerType: "STORE",
        activeBranchLabel: "Stale A",
        metrics: {
          primary: { state: "ok", value: 1 },
          secondary: { state: "empty" },
          tertiary: { state: "empty" },
        },
      });
    });
    await act(async () => {
      screen.getByRole("button", { name: /Simulate branch save/i }).click();
    });
    await waitFor(() => expect(screen.getByText("9")).toBeTruthy());
    expect(screen.queryByText("Stale A")).toBeNull();
    expect(screen.getByText("Branch B")).toBeTruthy();
  });

  it("clears branch label while reloading after context change", async () => {
    vi.mocked(remcardFetch)
      .mockResolvedValueOnce({
        partnerType: "STORE",
        activeBranchLabel: "First label",
        selectedBranchId: "b1",
        metrics: {
          primary: { state: "empty" },
          secondary: { state: "empty" },
          tertiary: { state: "empty" },
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
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
              30,
            );
          }),
      );

    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() => expect(screen.getByText("First label")).toBeTruthy());
    await act(async () => {
      screen.getByRole("button", { name: /Simulate branch save/i }).click();
    });
    expect(screen.queryByText("First label")).toBeNull();
    await waitFor(() => expect(screen.getByText("Second label")).toBeTruthy());
  });

  it("shows partial metric failure without treating needs_branch as numeric zero", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      partnerType: "STORE",
      activeBranchLabel: null,
      metrics: {
        primary: { state: "needs_branch", message: "Pick branch" },
        secondary: { state: "ok", value: 2 },
        tertiary: { state: "error", message: "Ops failed" },
      },
    });
    render(<BusinessOwnerHomeDashboard partnerType="STORE" />);
    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    expect(screen.getByText(/Pick branch/)).toBeTruthy();
    expect(screen.getAllByText(/Ops failed/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Обновить показатели/ })).toBeTruthy();
  });
});
