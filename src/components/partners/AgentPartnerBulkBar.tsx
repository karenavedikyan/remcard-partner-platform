"use client";

import { Button } from "@/components/ui/Button";
import styles from "./AgentPartnerBulkBar.module.css";

export type BulkListOperation = "archive" | "hidden";

export type BulkOutcome = {
  message: string;
  failedIds: string[];
  operation: BulkListOperation;
  /** false = apply (archive/hide), true = undo (restore/unhide) */
  undo: boolean;
};

export type AgentListVisibility = "active" | "archive" | "hidden";

type Props = {
  selectedCount: number;
  busy: boolean;
  listVisibility: AgentListVisibility;
  outcome: BulkOutcome | null;
  onArchive: () => void;
  onRestoreArchive: () => void;
  onHide: () => void;
  onRestoreHidden: () => void;
  onClearSelection: () => void;
  onRetryFailed: () => void;
  onDismissOutcome: () => void;
};

export function AgentPartnerBulkBar({
  selectedCount,
  busy,
  listVisibility,
  outcome,
  onArchive,
  onRestoreArchive,
  onHide,
  onRestoreHidden,
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
            {listVisibility === "active" ? (
              <>
                <Button type="button" variant="secondary" disabled={busy} onClick={onArchive}>
                  В архив
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={onHide}>
                  Убрать из списка
                </Button>
              </>
            ) : null}
            {listVisibility === "archive" ? (
              <Button type="button" variant="secondary" disabled={busy} onClick={onRestoreArchive}>
                Вернуть из архива
              </Button>
            ) : null}
            {listVisibility === "hidden" ? (
              <Button type="button" variant="secondary" disabled={busy} onClick={onRestoreHidden}>
                Вернуть в список
              </Button>
            ) : null}
            <Button type="button" variant="secondary" disabled={busy} onClick={onClearSelection}>
              Снять выбор
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
