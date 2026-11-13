"use client";

import styles from "../observer/observer.module.css";
import type {
  ReceivingAppealBucket,
  ReceivingBulkAction,
  ReceivingBulkContractState,
} from "@/lib/clients-parity/receiving-bulk-contract";

export type ReceivingBulkToolbarProps = {
  bucket: ReceivingAppealBucket;
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  contractState?: ReceivingBulkContractState;
  blockerId?: string;
  batchNotice?: string | null;
  partialError?: string | null;
  selectionOutsideView?: number;
  onSelectAll: (checked: boolean) => void;
  onAction: (action: ReceivingBulkAction) => void;
};

/** P6 list toolbar (prototype bulk bar); P5 UI reference SHA ca2855fb — not vendored. */
export function ReceivingBulkToolbar({
  bucket,
  selectedCount,
  visibleCount,
  allVisibleSelected,
  someVisibleSelected,
  contractState = "blocked",
  blockerId = "BLK-RECEIVING-APPEALS",
  batchNotice,
  partialError,
  selectionOutsideView = 0,
  onSelectAll,
  onAction,
}: ReceivingBulkToolbarProps) {
  const selectRef = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.indeterminate = someVisibleSelected && !allVisibleSelected;
    input.setAttribute(
      "aria-checked",
      someVisibleSelected && !allVisibleSelected ? "mixed" : allVisibleSelected ? "true" : "false",
    );
  };

  const batchActionsDisabled = contractState === "blocked" || contractState === "pending";

  return (
    <section
      className={styles.personalToolbar}
      data-testid="ca-receiving-bulk-actions"
      role="toolbar"
      aria-label="Групповые действия"
      data-contract-state={contractState}
    >
      <label className={styles.personalCheck}>
        <input
          ref={selectRef}
          type="checkbox"
          data-ca-bulk-select-all
          checked={allVisibleSelected && visibleCount > 0}
          disabled={visibleCount === 0 || contractState === "pending"}
          onChange={(e) => onSelectAll(e.target.checked)}
        />
        Все найденные ({visibleCount})
      </label>
      <strong className={styles.selectedCount} role="status">
        Выбрано: {selectedCount}
      </strong>
      {selectionOutsideView > 0 ? (
        <span className={styles.mutedSmall} role="status">
          Ещё {selectionOutsideView} скрыто фильтром
        </span>
      ) : null}
      {contractState === "blocked" ? (
        <p className={styles.mutedSmall}>
          Массовые действия принимающего требуют <strong>{blockerId}</strong> (
          <code>POST /api/pro/client-appeals/batch</code> и PATCH по каждому ID). Финансовые операции
          здесь не выполняются.
        </p>
      ) : null}
      {batchNotice ? (
        <p className={styles.persistenceNotice} role="status">
          {batchNotice}
        </p>
      ) : null}
      {partialError ? (
        <p className={styles.persistenceNotice} role="alert">
          {partialError}
        </p>
      ) : null}
      {selectedCount > 0 ? (
        <div className={styles.personalActions}>
          {bucket === "active" ? (
            <>
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="bulk:edit-open"
                onClick={() => onAction("edit-open")}
              >
                Редактировать
              </button>
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="bulk:archive-ask"
                disabled={batchActionsDisabled}
                onClick={() => onAction("archive-ask")}
              >
                В архив
              </button>
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="bulk:delete-ask"
                disabled={batchActionsDisabled}
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
                className={styles.ghostBtn}
                data-ca-action="bulk:unarchive-ask"
                disabled={batchActionsDisabled}
                onClick={() => onAction("unarchive-ask")}
              >
                Вернуть в активные
              </button>
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="bulk:delete-ask"
                disabled={batchActionsDisabled}
                onClick={() => onAction("delete-ask")}
              >
                В корзину
              </button>
            </>
          ) : null}
          {bucket === "trash" ? (
            <button
              type="button"
              className={styles.primaryBtn}
              data-ca-action="bulk:restore-ask"
              disabled={batchActionsDisabled}
              onClick={() => onAction("restore-ask")}
            >
              {batchActionsDisabled ? "Восстановить (недоступно)" : "Восстановить"}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.ghostBtn}
            data-ca-action="bulk:clear"
            onClick={() => onAction("clear")}
          >
            Сбросить выбор
          </button>
        </div>
      ) : (
        <span className={styles.mutedSmall}>Выберите строки для групповых действий.</span>
      )}
    </section>
  );
}
