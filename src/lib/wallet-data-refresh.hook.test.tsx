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

  it("debounces focus/visible bursts into one in-flight refresh", async () => {
    let release!: () => void;
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
      window.dispatchEvent(new Event("focus"));
    });

    expect(onRefresh).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WALLET_VISIBLE_REFRESH_DEBOUNCE_MS);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(WALLET_VISIBLE_REFRESH_DEBOUNCE_MS);
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("does not run debounced refresh after tab becomes hidden", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useWalletVisibleRefresh({
        enabled: true,
        scopeKey: "hidden-during-debounce",
        onRefresh,
      }),
    );

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WALLET_VISIBLE_REFRESH_DEBOUNCE_MS);
    });

    expect(onRefresh).not.toHaveBeenCalled();
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

  it("releases in-flight lock after scope change so new scope can refresh", async () => {
    let release!: () => void;
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const { rerender } = renderHook(
      ({ scopeKey }: { scopeKey: string }) =>
        useWalletVisibleRefresh({
          enabled: true,
          scopeKey,
          onRefresh,
        }),
      { initialProps: { scopeKey: "scope-old" } },
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("remcard:reward-changed"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender({ scopeKey: "scope-new" });

    act(() => {
      window.dispatchEvent(new CustomEvent("remcard:reward-changed"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);

    await act(async () => {
      release();
      await Promise.resolve();
    });
  });

  it("fires reward-changed refresh immediately", async () => {
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
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledWith("reward-changed");
  });
});
