"use client";

import { useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchProfNotification,
  markProfNotificationRead,
  type ProfNotificationItem,
} from "@/lib/prof-notifications";
import { Button } from "@/components/ui/Button";
import { useProfNotifications } from "@/hooks/useProfNotifications";
import { ProfNotificationRowActions } from "./ProfNotificationRowActions";
import styles from "./ProfNotifications.module.css";

type FocusState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; item: ProfNotificationItem }
  | { status: "missing" }
  | { status: "error" };

export function ProfNotificationCenter({ focusId = null }: { focusId?: string | null }) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [focus, setFocus] = useState<FocusState>({ status: focusId ? "loading" : "idle" });
  const notifications = useProfNotifications(true);
  const { refreshCount } = notifications;

  useEffect(() => {
    if (!focusId) {
      setFocus({ status: "idle" });
      return;
    }
    let cancelled = false;
    setFocus({ status: "loading" });
    fetchProfNotification(focusId)
      .then(async (item) => {
        if (cancelled) return;
        setFocus({ status: "ready", item });
        if (!item.isRead) {
          try {
            await markProfNotificationRead(item.id);
            if (!cancelled) {
              setFocus({ status: "ready", item: { ...item, isRead: true, readAt: new Date().toISOString() } });
              void refreshCount();
            }
          } catch {
            /* reading stays possible; the card remains marked unread */
          }
        }
      })
      .catch((caught) => {
        if (cancelled) return;
        setFocus({
          status: caught instanceof RemcardApiError && (caught.status === 404 || caught.status === 403)
            ? "missing"
            : "error",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [focusId, refreshCount]);

  const focusedId = focus.status === "ready" ? focus.item.id : null;

  useEffect(() => {
    void notifications.refreshList({ unread: filter === "unread" });
  }, [filter, notifications.refreshList]);

  return (
    <div className={styles.centerLayout}>
      <div className={styles.filters}>
        <Button
          type="button"
          variant={filter === "all" ? "primary" : "secondary"}
          className={filter === "all" ? styles.filterBtnActive : undefined}
          onClick={() => setFilter("all")}
        >
          Все
        </Button>
        <Button
          type="button"
          variant={filter === "unread" ? "primary" : "secondary"}
          className={filter === "unread" ? styles.filterBtnActive : undefined}
          onClick={() => setFilter("unread")}
        >
          Непрочитанные
        </Button>
        <Button type="button" variant="secondary" onClick={() => void notifications.markAllRead()}>
          Отметить все прочитанными
        </Button>
      </div>
      {focusId ? (
        <section aria-label="Выбранное уведомление" data-testid="notification-focus">
          {focus.status === "loading" ? <p className={styles.empty}>Открываем уведомление…</p> : null}
          {focus.status === "missing" ? (
            <p className={styles.empty} role="status" data-testid="notification-focus-missing">
              Уведомление недоступно: оно не найдено или предназначено другому пользователю.
            </p>
          ) : null}
          {focus.status === "error" ? (
            <p className={styles.error} role="alert">
              Не удалось открыть уведомление. Обновите страницу.
            </p>
          ) : null}
          {focus.status === "ready" ? (
            <article className={`${styles.card} ${styles.cardFocused}`}>
              <div className={styles.cardTitle}>{focus.item.title}</div>
              <p className={styles.cardBody} data-testid="notification-focus-body">
                {focus.item.body}
              </p>
              <div className={styles.cardMeta}>
                {new Date(focus.item.createdAt).toLocaleString("ru-RU")}
              </div>
            </article>
          ) : null}
        </section>
      ) : null}
      {notifications.error ? (
        <p className={styles.error} role="alert">
          {notifications.error}{" "}
          <Button type="button" variant="secondary" onClick={() => void notifications.refreshList({ unread: filter === "unread" })}>
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
          {notifications.items
            .filter((item) => item.id !== focusedId)
            .map((item) => (
            <li key={item.id} className={`${styles.card} ${item.isRead ? "" : styles.cardUnread}`}>
              <div className={styles.cardTitle}>{item.title}</div>
              <p className={styles.cardBody}>{item.body}</p>
              <div className={styles.cardMeta}>
                {new Date(item.createdAt).toLocaleString("ru-RU")}
              </div>
              {item.action.requiresAction && item.action.actionLabel ? (
                <span className={styles.actionTag}>Требует действия · {item.action.actionLabel}</span>
              ) : null}
              <ProfNotificationRowActions
                item={item}
                onMarkRead={notifications.markRead}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
