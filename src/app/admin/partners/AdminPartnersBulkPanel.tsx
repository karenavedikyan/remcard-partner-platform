"use client";

import { Button } from "@/components/ui/Button";
import {
  BULK_LIFECYCLE_ACTIONS,
  MAX_BULK_SELECTION,
  type BulkLifecycleAction,
} from "@/app/admin/partners/adminPartnersRegistryConstants";
import type { BulkApplyRowResult, BulkPreviewSnapshot } from "@/app/admin/partners/adminPartnersBulkLifecycle";
import styles from "./AdminPartners.module.css";

type Props = {
  selectedCount: number;
  otherPagesCount: number;
  onClearSelection: () => void;
  bulkReason: string;
  onBulkReasonChange: (v: string) => void;
  bulkAction: BulkLifecycleAction | "";
  onBulkActionChange: (action: BulkLifecycleAction | "") => void;
  onRequestBulkPreview: () => void;
  bulkPreview: BulkPreviewSnapshot | null;
  onConfirmBulk: () => void;
  onCancelBulkPreview: () => void;
  previewLoading: boolean;
  applying: boolean;
  applyProgress: { done: number; total: number };
  applyResults: BulkApplyRowResult[] | null;
  onStopApply: () => void;
  onExcludeFailedAndRetryPreview: (userIds: string[]) => void;
  previewFailures: { userId: string; displayName: string | null; message: string }[] | null;
  disabled: boolean;
  /** Mobile: short bar until user opens the full bulk form. */
  compactSelectionBar?: boolean;
  selectionFormExpanded?: boolean;
  onOpenSelectionForm?: () => void;
};

function outcomeLabel(row: BulkApplyRowResult): string {
  if (row.outcome === "success") return "успешно";
  if (row.outcome === "error") return `ошибка${row.message ? ` — ${row.message}` : ""}`;
  if (row.outcome === "stopped") return `не отправлено${row.message ? ` — ${row.message}` : ""}`;
  return `исход неизвестен${row.message ? ` — ${row.message}` : ""}`;
}

export function AdminPartnersBulkPanel({
  selectedCount,
  otherPagesCount,
  onClearSelection,
  bulkReason,
  onBulkReasonChange,
  bulkAction,
  onBulkActionChange,
  onRequestBulkPreview,
  bulkPreview,
  onConfirmBulk,
  onCancelBulkPreview,
  previewLoading,
  applying,
  applyProgress,
  applyResults,
  onStopApply,
  onExcludeFailedAndRetryPreview,
  previewFailures,
  disabled,
  compactSelectionBar = false,
  selectionFormExpanded = true,
  onOpenSelectionForm,
}: Props) {
  if (selectedCount === 0 && !applyResults && !applying) return null;

  const hasPreviewFailures = Boolean(previewFailures && previewFailures.length > 0);
  const showSelectionHead = selectedCount > 0 || applying;
  const showNewGroupForm =
    selectedCount > 0 && !applying && (!bulkPreview || hasPreviewFailures);
  const showConfirmDialog = !applying && bulkPreview && !hasPreviewFailures;
  const reportTitle = applying ? "Ход групповой операции" : "Итог групповой операции";
  const showCompactBarOnly =
    compactSelectionBar &&
    !selectionFormExpanded &&
    selectedCount > 0 &&
    !applying &&
    !bulkPreview &&
    !applyResults;

  function pickQuickAction(action: BulkLifecycleAction) {
    onBulkActionChange(action);
    onOpenSelectionForm?.();
  }

  if (showCompactBarOnly) {
    return (
      <div className={styles.bulkBar} role="region" aria-label="Групповые действия">
        <strong>
          Выбрано: <span data-testid="selected-count">{selectedCount}</span>
        </strong>
        <button type="button" className={styles.bulkBarBtn} disabled={disabled} onClick={() => pickQuickAction("hide_catalog")}>
          Каталог
        </button>
        <button
          type="button"
          className={styles.bulkBarBtn}
          disabled
          title="Массовое изменение поиска сотрудничества в API нет — используйте карточку партнёра"
        >
          Сотрудничество
        </button>
        <button type="button" className={styles.bulkBarBtn} disabled={disabled} onClick={() => pickQuickAction("archive_project")}>
          В архив
        </button>
        <button type="button" className={styles.bulkBarBtn} disabled={disabled} onClick={() => pickQuickAction("hide_catalog")}>
          Удалить
        </button>
        <button type="button" className={styles.bulkBarBtn} disabled={disabled} onClick={onClearSelection}>
          Отменить
        </button>
      </div>
    );
  }

  return (
    <div className={styles.bulkPanel} role="region" aria-label="Групповые действия">
      {showSelectionHead ? (
        <div className={styles.bulkBar} data-embedded="true">
          <strong>
            Выбрано: <span data-testid="selected-count">{selectedCount}</span>
            <span className={styles.bulkHint}> (не более {MAX_BULK_SELECTION})</span>
            {otherPagesCount > 0 ? (
              <span className={styles.bulkHint}> · на других страницах: {otherPagesCount}</span>
            ) : null}
          </strong>
          <button
            type="button"
            className={styles.bulkBarBtn}
            disabled={disabled || applying}
            onClick={() => pickQuickAction("hide_catalog")}
          >
            Каталог
          </button>
          <button
            type="button"
            className={styles.bulkBarBtn}
            disabled
            title="Массовое изменение поиска сотрудничества в API нет — используйте карточку партнёра"
          >
            Сотрудничество
          </button>
          <button
            type="button"
            className={styles.bulkBarBtn}
            disabled={disabled || applying}
            onClick={() => pickQuickAction("archive_project")}
          >
            В архив
          </button>
          <button
            type="button"
            className={styles.bulkBarBtn}
            disabled={disabled || applying}
            onClick={() => pickQuickAction("hide_catalog")}
            title="Удаление = скрытие из каталога / архив через preview; аккаунт не удаляется"
          >
            Удалить
          </button>
          <button
            type="button"
            className={styles.bulkBarBtn}
            disabled={disabled || applying}
            onClick={onClearSelection}
          >
            Отменить
          </button>
        </div>
      ) : null}

      {applyResults && applyResults.length > 0 ? (
        <div className={styles.bulkReport} aria-live="polite">
          <h3>{reportTitle}</h3>
          {applying ? (
            <p className={styles.bulkHint} role="status">
              Применено {applyProgress.done} из {applyProgress.total}…
            </p>
          ) : null}
          <ul className={styles.bulkReportList}>
            {applyResults.map((row) => (
              <li key={row.userId} data-outcome={row.outcome}>
                {row.displayName ?? row.userId}: {outcomeLabel(row)}
              </li>
            ))}
          </ul>
          {!applying ? (
            <p className={styles.bulkHint}>
              Для повторной попытки по ошибкам нужны свежий preview и подтверждение; успешные записи
              повторно не отправляются автоматически. Выберите участников ниже для новой операции.
            </p>
          ) : null}
        </div>
      ) : null}

      {applying && bulkPreview ? (
        <div role="dialog" aria-label="Подтверждение группового изменения" className={styles.confirmation}>
          <p>
            Действие: <strong>{BULK_LIFECYCLE_ACTIONS[bulkPreview.action]}</strong> · участников:{" "}
            {bulkPreview.members.length}
          </p>
          <p className={styles.bulkHint} role="status">
            Применение {applyProgress.done}/{applyProgress.total}…
          </p>
          <div className={styles.actions}>
            <Button disabled>{`Применение ${applyProgress.done}/${applyProgress.total}…`}</Button>
            <Button variant="secondary" onClick={onStopApply}>
              Остановить оставшиеся
            </Button>
          </div>
        </div>
      ) : null}

      {showNewGroupForm ? (
        <>
          <p className={styles.bulkHint}>
            Групповое «удаление» — обратимое скрытие из каталога или архивирование профилей, без
            физического удаления пользователей.
          </p>
          <label className={styles.field}>
            Общая причина
            <textarea
              aria-label="Причина группового изменения"
              rows={2}
              value={bulkReason}
              disabled={disabled || previewLoading}
              onChange={(e) => onBulkReasonChange(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Действие
            <select
              aria-label="Групповое действие"
              value={bulkAction}
              disabled={disabled || previewLoading}
              onChange={(e) => onBulkActionChange(e.target.value as BulkLifecycleAction | "")}
            >
              <option value="">Выберите действие</option>
              {(Object.entries(BULK_LIFECYCLE_ACTIONS) as [BulkLifecycleAction, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          {previewFailures && previewFailures.length > 0 ? (
            <div role="alert" className={styles.error}>
              <p>Preview недоступен для части выбранных профилей:</p>
              <ul>
                {previewFailures.map((f) => (
                  <li key={f.userId}>
                    {f.displayName ?? f.userId}: {f.message}
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                disabled={disabled}
                onClick={() =>
                  onExcludeFailedAndRetryPreview(previewFailures.map((f) => f.userId))
                }
              >
                Исключить проблемные и обновить preview
              </Button>
            </div>
          ) : null}

          <Button
            variant="secondary"
            disabled={disabled || previewLoading || !bulkReason.trim() || !bulkAction}
            onClick={() => void onRequestBulkPreview()}
          >
            {previewLoading ? "Проверка…" : "Получить preview группы"}
          </Button>
        </>
      ) : null}

      {showConfirmDialog ? (
        <div role="dialog" aria-label="Подтверждение группового изменения" className={styles.confirmation}>
          <p>
            Действие: <strong>{BULK_LIFECYCLE_ACTIONS[bulkPreview.action]}</strong> · участников:{" "}
            {bulkPreview.members.length}
          </p>
          <ul className={styles.bulkPreviewList}>
            {bulkPreview.members.map((m) => (
              <li key={m.userId}>
                <strong>{m.displayName ?? m.userId}</strong>
                <span>{[...m.effects, ...m.warnings].join(" ")}</span>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <Button onClick={() => void onConfirmBulk()}>Подтвердить группу</Button>
            <Button variant="secondary" onClick={onCancelBulkPreview}>
              Отмена
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
