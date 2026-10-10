"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchProfNotifications,
  fetchProfUnreadCount,
  markAllProfNotificationsRead,
  markProfNotificationRead,
  type ProfNotificationItem,
} from "@/lib/prof-notifications";

type State = {
  unreadCount: number | null;
  countStale: boolean;
  items: ProfNotificationItem[];
  snapshotAt: string | null;
  loading: boolean;
  error: string;
};

const POLL_MS = 60_000;

export function useProfNotifications(enabled: boolean) {
  const [state, setState] = useState<State>({
    unreadCount: null,
    countStale: false,
    items: [],
    snapshotAt: null,
    loading: false,
    error: "",
  });
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const count = await fetchProfUnreadCount();
      setState((s) => ({ ...s, unreadCount: count, countStale: false, error: "" }));
    } catch {
      setState((s) => ({
        ...s,
        countStale: true,
        error: s.error || "Не удалось загрузить уведомления",
      }));
    }
  }, [enabled]);

  const refreshList = useCallback(
    async (opts?: { unread?: boolean }) => {
      if (!enabled || inFlightRef.current) return;
      inFlightRef.current = true;
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setState((s) => ({ ...s, loading: true, error: "" }));
      try {
        const data = await fetchProfNotifications({ unread: opts?.unread, limit: 20 });
        setState((s) => ({
          ...s,
          items: data.items,
          snapshotAt: data.snapshotAt,
          loading: false,
          error: "",
        }));
        await refreshCount();
      } catch {
        setState((s) => ({
          ...s,
          loading: false,
          error: "Не удалось загрузить уведомления",
          countStale: true,
        }));
      } finally {
        inFlightRef.current = false;
      }
    },
    [enabled, refreshCount],
  );

  const markRead = useCallback(
    async (id: string) => {
      try {
        await markProfNotificationRead(id);
        setState((s) => ({
          ...s,
          items: s.items.map((it) =>
            it.id === id ? { ...it, isRead: true, readAt: new Date().toISOString() } : it,
          ),
          unreadCount:
            typeof s.unreadCount === "number" && s.unreadCount > 0
              ? s.unreadCount - 1
              : s.unreadCount,
        }));
      } catch {
        setState((s) => ({ ...s, error: "Не удалось отметить прочитанным" }));
      }
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    const snap = state.snapshotAt;
    if (!snap) return;
    try {
      await markAllProfNotificationsRead(snap);
      setState((s) => ({
        ...s,
        items: s.items.map((it) =>
          new Date(it.createdAt) <= new Date(snap)
            ? { ...it, isRead: true, readAt: it.readAt ?? new Date().toISOString() }
            : it,
        ),
      }));
      await refreshCount();
    } catch {
      setState((s) => ({ ...s, error: "Не удалось отметить все прочитанными" }));
    }
  }, [state.snapshotAt, refreshCount]);

  useEffect(() => {
    if (!enabled) return;
    void refreshCount();
    const onFocus = () => void refreshCount();
    window.addEventListener("focus", onFocus);
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(t);
    };
  }, [enabled, refreshCount]);

  return {
    ...state,
    refreshCount,
    refreshList,
    markRead,
    markAllRead,
  };
}
