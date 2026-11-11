import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useWalletVisibleRefresh,
  WALLET_VISIBLE_REFRESH_DEBOUNCE_MS,
  WALLET_VISIBLE_REFRESH_POLL_MS,
} from "./wallet-data-refresh";

describe("wallet-data-refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("documents ~12s visible polling (not realtime)", () => {
    expect(WALLET_VISIBLE_REFRESH_POLL_MS).toBe(12_000);
    expect(WALLET_VISIBLE_REFRESH_DEBOUNCE_MS).toBe(750);
  });

  it("coalesces overlapping in-flight refresh calls", async () => {
    let release: () => void = () => undefined;
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    renderHook(() =>
      useWalletVisibleRefresh({
        enabled: true,
        scopeKey: "scope-a",
        onRefresh,
      }),
    );

    act(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("focus"));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await Promise.resolve();
    });
  });

  it("does not poll while the document is hidden", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    renderHook(() =>
      useWalletVisibleRefresh({
        enabled: true,
        scopeKey: "hidden-scope",
        onRefresh,
        pollIntervalMs: 1000,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("fires reward-changed refresh in the same window", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useWalletVisibleRefresh({
        enabled: true,
        scopeKey: "reward-scope",
        onRefresh,
      }),
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("remcard:reward-changed"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(onRefresh).toHaveBeenCalledWith("reward-changed");
  });
});
