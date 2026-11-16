"use client";

/** Prototype client-appeals.js bucket naming (receiving CRM, not observer trash overlay). */
export type ReceivingAppealBucket = "active" | "archive" | "trash";

export type ReceivingBulkAction =
  | "edit-open"
  | "archive-ask"
  | "delete-ask"
  | "unarchive-ask"
  | "restore-ask"
  | "clear";

export type ReceivingBulkContractState = "blocked" | "ready" | "pending" | "refresh-required";

export type ReceivingBulkActionsProps = {
  bucket: ReceivingAppealBucket;
  selectedCount: number;
  contractState?: ReceivingBulkContractState;
  batchNotice?: string | null;
  partialError?: string | null;
  selectionOutsideView?: number;
  onAction: (action: ReceivingBulkAction) => void;
};

/**
 * Prototype `ca-bulk-bar`: shown only while rows are selected («Выбрано: N», edit/archive/delete or
 * unarchive/trash or restore, «Сбросить выбор»). Results of a finished batch (success note, partial
 * failure) stay visible after the selection is cleared. No wallet / purchase / payout actions.
 */
export function ReceivingBulkActions({
  bucket,
  selectedCount,
  contractState = "blocked",
  batchNotice,
  partialError,
  selectionOutsideView = 0,
  onAction,
}: ReceivingBulkActionsProps) {
  const actionsDisabled =
    contractState === "blocked" || contractState === "pending" || contractState === "refresh-required";
  const clearDisabled = contractState === "pending" || contractState === "refresh-required";

  const notices = (
    <>
      {batchNotice ? (
        <p className="notice" role="status" data-testid="ca-receiving-bulk-notice">
          {batchNotice}
        </p>
      ) : null}
      {partialError ? (
        <p className="notice" role="alert" data-testid="ca-receiving-bulk-error">
          {partialError}
        </p>
      ) : null}
    </>
  );

  if (selectedCount <= 0) return batchNotice || partialError ? notices : null;

  return (
    <>
      {notices}
      <div
        className="ca-bulk-bar panel"
        data-testid="ca-receiving-bulk-actions"
        role="toolbar"
        aria-label="Групповые действия"
        data-contract-state={contractState}
      >
        <span className="ca-bulk-count" role="status">
          Выбрано: <strong>{selectedCount}</strong>
          {selectionOutsideView > 0 ? ` · ещё ${selectionOutsideView} скрыто фильтром` : ""}
        </span>
        <div className="ca-bulk-actions">
          {actionsDisabled && contractState === "blocked" ? (
            <span className="small muted">Групповые действия сейчас недоступны.</span>
          ) : null}
          {bucket === "active" ? (
            <>
              <button
                type="button"
                className="btn ghost small-btn"
                data-ca-action="bulk:edit-open"
                disabled={actionsDisabled}
                onClick={() => onAction("edit-open")}
              >
                Редактировать
              </button>
              <button
                type="button"
                className="btn ghost small-btn"
                data-ca-action="bulk:archive-ask"
                disabled={actionsDisabled}
                onClick={() => onAction("archive-ask")}
              >
                В архив
              </button>
              <button
                type="button"
                className="btn ghost small-btn"
                data-ca-action="bulk:delete-ask"
                disabled={actionsDisabled}
                onClick={() => onAction("delete-ask")}
              >
                Удалить
              </button>
            </>
          ) : null}
          {bucket === "archive" ? (
            <>
              <button
                type="button"
                className="btn ghost small-btn"
                data-ca-action="bulk:unarchive-ask"
                disabled={actionsDisabled}
                onClick={() => onAction("unarchive-ask")}
              >
                Вернуть в активные
              </button>
              <button
                type="button"
                className="btn ghost small-btn"
                data-ca-action="bulk:delete-ask"
                disabled={actionsDisabled}
                onClick={() => onAction("delete-ask")}
              >
                В корзину
              </button>
            </>
          ) : null}
          {bucket === "trash" ? (
            <button
              type="button"
              className="btn primary small-btn"
              data-ca-action="bulk:restore-ask"
              disabled={actionsDisabled}
              onClick={() => onAction("restore-ask")}
            >
              Восстановить
            </button>
          ) : null}
          <button
            type="button"
            className="btn ghost small-btn"
            data-ca-action="bulk:clear"
            disabled={clearDisabled}
            onClick={() => onAction("clear")}
          >
            Сбросить выбор
          </button>
        </div>
      </div>
    </>
  );
}
