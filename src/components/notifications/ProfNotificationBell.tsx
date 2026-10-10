"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useProfNotifications } from "@/hooks/useProfNotifications";
import type { ProfNotificationItem } from "@/lib/prof-notifications";
import styles from "./ProfNotifications.module.css";

function BellIcon() {
  return (
    <svg className={styles.bellIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a5 5 0 0 0-5 5v2.1c0 .5-.2 1-.5 1.4L5.1 14.2A1.8 1.8 0 0 0 6.6 17h10.8a1.8 1.8 0 0 0 1.5-2.8l-1.4-2.7c-.3-.4-.5-.9-.5-1.4V8a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function hrefForItem(url: string | null): string {
  if (!url) return "/notifications";
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return "/notifications";
  }
}

function NotificationRow({
  item,
  onMarkRead,
  onNavigate,
}: {
  item: ProfNotificationItem;
  onMarkRead: (id: string) => void;
  onNavigate: () => void;
}) {
  const target = hrefForItem(item.url);
  return (
    <li className={`${styles.card} ${item.isRead ? "" : styles.cardUnread}`}>
      <div className={styles.cardTitle}>{item.title}</div>
      <p className={styles.cardBody}>{item.body}</p>
      <div className={styles.cardMeta}>{formatWhen(item.createdAt)}</div>
      {item.action.requiresAction && item.action.actionLabel ? (
        <span className={styles.actionTag}>Требует действия · {item.action.actionLabel}</span>
      ) : null}
      <div className={styles.rowActions}>
        <Button type="button" variant="secondary" onClick={() => void onMarkRead(item.id)}>
          Отметить прочитанным
        </Button>
        <Link href={target} onClick={onNavigate}>
          <Button type="button" onClick={() => void onMarkRead(item.id)}>
            Перейти
          </Button>
        </Link>
      </div>
    </li>
  );
}

export function ProfNotificationBell() {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const notifications = useProfNotifications(true);

  const badge =
    typeof notifications.unreadCount === "number" && notifications.unreadCount > 0
      ? notifications.unreadCount > 99
        ? "99+"
        : String(notifications.unreadCount)
      : null;

  const ariaCount =
    typeof notifications.unreadCount === "number" && notifications.unreadCount > 0
      ? `, непрочитано: ${notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}`
      : "";

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (next) void notifications.refreshList();
      return next;
    });
  }, [notifications]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className={styles.bellWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.bellButton}
        aria-label={`Уведомления${ariaCount}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggle}
      >
        <BellIcon />
        {badge ? <span className={styles.badge}>{badge}</span> : null}
        {notifications.countStale ? <span className={styles.staleDot} aria-hidden /> : null}
      </button>
      {open ? (
        <div
          id={listId}
          className={styles.panel}
          role="dialog"
          aria-label="Последние уведомления"
        >
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Уведомления</span>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </div>
          {notifications.error ? (
            <p className={styles.error} role="alert">
              {notifications.error}{" "}
              <Button type="button" variant="secondary" onClick={() => void notifications.refreshList()}>
                Повторить
              </Button>
            </p>
          ) : null}
          {notifications.loading ? <p className={styles.empty}>Загружаем…</p> : null}
          {!notifications.loading && notifications.items.length === 0 ? (
            <p className={styles.empty}>
              Пока нет уведомлений. Здесь появятся важные события по профилю, партнёрам и начислениям.
            </p>
          ) : (
            <ul className={styles.list}>
              {notifications.items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onMarkRead={notifications.markRead}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          )}
          <div className={styles.rowActions}>
            <Button
              type="button"
              variant="secondary"
              disabled={!notifications.snapshotAt}
              onClick={() => void notifications.markAllRead()}
            >
              Отметить все прочитанными
            </Button>
            <Link href="/notifications" onClick={() => setOpen(false)}>
              <Button type="button">Все уведомления</Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
