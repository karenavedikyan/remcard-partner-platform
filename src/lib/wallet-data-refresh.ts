"use client";

import { useCallback, useEffect, useRef } from "react";
import { RemcardApiError } from "@/lib/api-client";

/**
 * Visible-tab polling interval for wallet/history surfaces.
 * Not realtime: purchases recorded in another session may appear within ~12s while this tab stays open.
 */
export const WALLET_VISIBLE_REFRESH_POLL_MS = 12_000;

export const WALLET_VISIBLE_REFRESH_DEBOUNCE_MS = 750;

export const WALLET_STALE_DATA_NOTICE =
  "Не удалось обновить данные. Показаны последние загруженные значения.";

export const WALLET_PAYOUT_STALE_NOTICE =
  "Выплата записана, не удалось обновить данные, обновите страницу";

export type WalletRefreshReason =
  | "reward-changed"
  | "visible"
  | "focus"
  | "online"
  | "poll"
  | "manual";

export function isWalletRefreshUnauthorized(error: unknown): boolean {
  return error instanceof RemcardApiError && (error.status === 401 || error.status === 403);
}

type UseWalletVisibleRefreshOptions = {
  enabled: boolean;
  scopeKey: string;
  onRefresh: (reason: WalletRefreshReason) => void | Promise<void>;
  pollIntervalMs?: number;
};

export function useWalletVisibleRefresh({
  enabled,
  scopeKey,
  onRefresh,
  pollIntervalMs = WALLET_VISIBLE_REFRESH_POLL_MS,
}: UseWalletVisibleRefreshOptions) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const scopeKeyRef = useRef(scopeKey);
  scopeKeyRef.current = scopeKey;

  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scheduleRefresh = useCallback((reason: WalletRefreshReason, immediate = false) => {
    if (!enabledRef.current) return;

    const run = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const scopeAtStart = scopeKeyRef.current;
      void Promise.resolve(onRefreshRef.current(reason)).finally(() => {
        if (scopeKeyRef.current === scopeAtStart) {
          inFlightRef.current = false;
        }
      });
    };

    if (immediate) {
      run();
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(run, WALLET_VISIBLE_REFRESH_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh("visible", true);
      }
    };
    const onFocus = () => scheduleRefresh("focus", true);
    const onOnline = () => scheduleRefresh("online", true);
    const onReward = () => scheduleRefresh("reward-changed", true);

    const syncPoll = () => {
      if (document.visibilityState !== "visible") {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        return;
      }
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        scheduleRefresh("poll");
      }, pollIntervalMs);
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("visibilitychange", syncPoll);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("remcard:reward-changed", onReward);
    syncPoll();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("visibilitychange", syncPoll);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("remcard:reward-changed", onReward);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [enabled, pollIntervalMs, scheduleRefresh]);

  const requestRefresh = useCallback(
    (reason: WalletRefreshReason = "manual") => scheduleRefresh(reason, true),
    [scheduleRefresh],
  );

  return { requestRefresh };
}
