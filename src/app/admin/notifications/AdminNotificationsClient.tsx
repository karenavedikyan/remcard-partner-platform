"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { adminNotificationActionHref } from "@/lib/admin-notification-url";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotificationItem,
} from "@/lib/prof-admin-notifications-api";
import { Button } from "@/components/ui/Button";
import { AdminNotificationSettingsSection } from "./AdminNotificationSettingsSection";
import styles from "./AdminNotifications.module.css";

const PAGE_LIMIT = 25;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function categoryLabel(type: string): string {
  const map: Record<string, string> = {
    NEW_CLIENT: "Новый клиент",
    NEW_PARTNER: "Новый партнёр",
    PARTNER_ACTIVITY: "Активность партнёра",
    new_client: "Новый клиент",
    new_partner: "Новый партнёр",
    partner_activity: "Активность партнёра",
  };
  return map[type] ?? type;
}

export function AdminNotificationsClient() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [stackIndex, setStackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inboxMessage, setInboxMessage] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setCursorStack([null]);
    setStackIndex(0);
  }, [unreadOnly]);

  const currentCursor = cursorStack[stackIndex] ?? null;

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError("");
    setInboxMessage("");
    try {
      const data = await fetchAdminNotifications({
        unread: unreadOnly,
        limit: PAGE_LIMIT,
        cursor: currentCursor,
      });
      if (!mountedRef.current) return;
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (caught) {
      if (!mountedRef.current) return;
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить уведомления");
      setItems([]);
      setNextCursor(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentCursor, unreadOnly]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  async function onMarkRead(id: string) {
    setInboxMessage("");
    const previous = items;
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, readAt: it.readAt ?? new Date().toISOString() } : it)),
    );
    try {
      await markAdminNotificationRead(id);
      if (unreadOnly) {
        setItems((list) => list.filter((it) => it.id !== id));
      }
      window.dispatchEvent(new CustomEvent("admin-notifications-changed"));
    } catch {
      setItems(previous);
      setError("Не удалось отметить прочитанным — непрочитанные сохранены");
    }
  }

  async function onMarkAllRead() {
    setInboxMessage("");
    const previous = items;
    try {
      await markAllAdminNotificationsRead();
      setItems((list) => list.map((it) => ({ ...it, readAt: it.readAt ?? new Date().toISOString() })));
      if (unreadOnly) setItems([]);
      setInboxMessage("Все уведомления отмечены прочитанными");
      window.dispatchEvent(new CustomEvent("admin-notifications-changed"));
    } catch {
      setItems(previous);
      setError("Не удалось отметить все прочитанными");
    }
  }

  function goNextPage() {
    if (!nextCursor) return;
    setCursorStack((prev) => {
      const trimmed = prev.slice(0, stackIndex + 1);
      return [...trimmed, nextCursor];
    });
    setStackIndex((i) => i + 1);
  }

  function goPrevPage() {
    if (stackIndex <= 0) return;
    setStackIndex((i) => i - 1);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Уведомления платформы</h1>
        <p className={styles.pageLead}>Inbox администратора RemCard PROF и настройки категорий/каналов.</p>
      </header>

      <section className={styles.inboxSection} aria-labelledby="admin-notify-inbox-title">
        <div className={styles.inboxToolbar}>
          <h2 id="admin-notify-inbox-title">Входящие</h2>
          <label className={styles.unreadToggle}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            <span>Только непрочитанные</span>
          </label>
          <Button type="button" variant="secondary" disabled={loading || items.length === 0} onClick={() => void onMarkAllRead()}>
            Прочитать все
          </Button>
        </div>

        {error ? (
          <div className={styles.stateBox} role="alert">
            <p>{error}</p>
            <button type="button" className={styles.retryButton} onClick={() => void loadInbox()}>
              Повторить
            </button>
          </div>
        ) : null}

        {inboxMessage ? (
          <p className={styles.success} role="status">
            {inboxMessage}
          </p>
        ) : null}

        {loading ? <p className={styles.stateBox}>Загрузка…</p> : null}

        {!loading && !error && items.length === 0 ? (
          <p className={styles.stateBox} role="status">
            {unreadOnly ? "Непрочитанных уведомлений нет." : "Уведомлений пока нет."}
          </p>
        ) : null}

        {!loading && items.length > 0 ? (
          <ul className={styles.inboxList}>
            {items.map((item) => {
              const actionHref = adminNotificationActionHref(item.actionUrl);
              const unread = !item.readAt;
              return (
                <li key={item.id} className={styles.inboxItem} data-unread={unread || undefined}>
                  <div className={styles.inboxMeta}>
                    <span className={styles.categoryBadge}>{categoryLabel(item.type)}</span>
                    <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                  </div>
                  <h3 className={styles.inboxTitle}>{item.title}</h3>
                  <p className={styles.inboxBody}>{item.body}</p>
                  <div className={styles.inboxActions}>
                    {actionHref ? (
                      actionHref.startsWith("http") ? (
                        <a href={actionHref} target="_blank" rel="noopener noreferrer">
                          Открыть карточку
                        </a>
                      ) : (
                        <Link href={actionHref}>Открыть карточку</Link>
                      )
                    ) : item.actionUrl ? (
                      <span className={styles.untrustedLink}>Ссылка недоступна (не доверенный маршрут)</span>
                    ) : null}
                    {unread ? (
                      <button type="button" className={styles.markRead} onClick={() => void onMarkRead(item.id)}>
                        Прочитано
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className={styles.pagination}>
            <button type="button" disabled={stackIndex <= 0} onClick={goPrevPage}>
              Назад
            </button>
            <span>Страница {stackIndex + 1}</span>
            <button type="button" disabled={!nextCursor} onClick={goNextPage}>
              Дальше
            </button>
          </div>
        ) : null}
      </section>

      <AdminNotificationSettingsSection />
    </div>
  );
}
