"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { resolveProfNotificationTarget } from "@/lib/prof-notification-target";
import type { ProfNotificationItem } from "@/lib/prof-notifications";
import styles from "./ProfNotifications.module.css";

export function ProfNotificationRowActions({
  item,
  onMarkRead,
  onNavigate,
}: {
  item: ProfNotificationItem;
  onMarkRead: (id: string) => void;
  onNavigate?: () => void;
}) {
  const target = resolveProfNotificationTarget(item.url);

  return (
    <div className={styles.rowActions}>
      <Button type="button" variant="secondary" onClick={() => void onMarkRead(item.id)}>
        Отметить прочитанным
      </Button>
      {target ? (
        <Link href={target} onClick={onNavigate}>
          <Button type="button" onClick={() => void onMarkRead(item.id)}>
            Перейти
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
