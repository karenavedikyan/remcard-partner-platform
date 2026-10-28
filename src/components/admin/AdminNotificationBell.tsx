"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchAdminUnreadNotificationCount } from "@/lib/prof-admin-notifications-api";
import styles from "./AdminNotificationBell.module.css";

type Props = {
  enabled: boolean;
};

export function AdminNotificationBell({ enabled }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const n = await fetchAdminUnreadNotificationCount();
      setCount(n);
      setStale(false);
    } catch {
      setStale(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener("admin-notifications-changed", onChange);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("admin-notifications-changed", onChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, refresh]);

  if (!enabled) return null;

  const label =
    typeof count === "number" && count > 0
      ? `Уведомления администратора, непрочитано: ${count}`
      : "Уведомления администратора";

  return (
    <Link href="/admin/notifications" className={styles.bell} aria-label={label}>
      <span aria-hidden="true">🔔</span>
      {typeof count === "number" && count > 0 ? (
        <span className={styles.badge}>{count > 99 ? "99+" : count}</span>
      ) : stale ? (
        <span className={styles.stale} title="Не удалось обновить счётчик">
          ·
        </span>
      ) : null}
    </Link>
  );
}
