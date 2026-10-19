"use client";

import { Button } from "@/components/ui/Button";
import styles from "./AgentPartnerBulkBar.module.css";

type Props = {
  count: number;
  busy: boolean;
  message?: string;
  onArchive: () => void;
  onRestore: () => void;
  onClear: () => void;
};

export function AgentPartnerBulkBar({ count, busy, message, onArchive, onRestore, onClear }: Props) {
  if (count <= 0) return null;
  return (
    <div className={styles.bar} data-testid="agent-partner-bulk-bar" role="status">
      <span>
        Выбрано: <strong>{count}</strong>
      </span>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" disabled={busy} onClick={onArchive}>
          В архив
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onRestore}>
          Вернуть из архива
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onClear}>
          Снять выбор
        </Button>
      </div>
      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  );
}
