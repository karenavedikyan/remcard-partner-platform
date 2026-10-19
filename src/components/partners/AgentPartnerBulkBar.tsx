"use client";

import { Button } from "@/components/ui/Button";
import styles from "./AgentPartnerBulkBar.module.css";

export type BulkOutcome = {
  message: string;
  failedIds: string[];
  archived: boolean;
};

type Props = {
  selectedCount: number;
  busy: boolean;
  outcome: BulkOutcome | null;
  onArchive: () => void;
  onRestore: () => void;
  onClearSelection: () => void;
  onRetryFailed: () => void;
  onDismissOutcome: () => void;
};

export function AgentPartnerBulkBar({
  selectedCount,
  busy,
  outcome,
  onArchive,
  onRestore,
  onClearSelection,
  onRetryFailed,
  onDismissOutcome,
}: Props) {
  const showOutcome = outcome != null;
  const showSelection = selectedCount > 0;
  if (!showOutcome && !showSelection) return null;

  return (
    <div className={styles.wrap} data-testid="agent-partner-bulk-bar">
      {showOutcome ? (
        <div className={styles.outcome} role="status" data-testid="agent-partner-bulk-outcome">
          <p className={styles.outcomeText}>{outcome.message}</p>
          <div className={styles.actions}>
            {outcome.failedIds.length > 0 ? (
              <Button type="button" variant="primary" disabled={busy} onClick={onRetryFailed}>
                Повторить для неуспешных ({outcome.failedIds.length})
              </Button>
            ) : null}
            <Button type="button" variant="secondary" disabled={busy} onClick={onDismissOutcome}>
              Закрыть итог
            </Button>
          </div>
        </div>
      ) : null}
      {showSelection ? (
        <div className={styles.bar}>
          <span>
            Выбрано: <strong>{selectedCount}</strong>
          </span>
          <div className={styles.actions}>
            <Button type="button" variant="secondary" disabled={busy} onClick={onArchive}>
              В архив
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={onRestore}>
              Вернуть из архива
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={onClearSelection}>
              Снять выбор
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
