"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useProfNotifications } from "@/hooks/useProfNotifications";
import { ProfNotificationRowActions } from "./ProfNotificationRowActions";
import styles from "./ProfNotifications.module.css";

export function ProfNotificationCenter() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const notifications = useProfNotifications(true);

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
          {notifications.items.map((item) => (
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
