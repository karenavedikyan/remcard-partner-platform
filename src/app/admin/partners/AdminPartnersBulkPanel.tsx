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
};

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
}: Props) {
  if (selectedCount === 0 && !applyResults) return null;

  return (
    <div className={styles.bulkPanel} role="region" aria-label="Групповые действия">
      <div className={styles.bulkPanelHead}>
        <p>
          Выбрано: <strong>{selectedCount}</strong> (не более {MAX_BULK_SELECTION})
          {otherPagesCount > 0 ? (
            <span className={styles.bulkHint}>
              {" "}
              · на других страницах: {otherPagesCount}
            </span>
          ) : null}
        </p>
        <Button variant="secondary" disabled={disabled || applying} onClick={onClearSelection}>
          Снять выбор
        </Button>
      </div>

      {applyResults ? (
        <div className={styles.bulkReport} aria-live="polite">
          <h3>Итог групповой операции</h3>
          <ul className={styles.bulkReportList}>
            {applyResults.map((row) => (
              <li key={row.userId} data-outcome={row.outcome}>
                {row.displayName ?? row.userId}:{" "}
                {row.outcome === "success"
                  ? "успешно"
                  : row.outcome === "error"
                    ? `ошибка${row.message ? ` — ${row.message}` : ""}`
                    : `исход неизвестен${row.message ? ` — ${row.message}` : ""}`}
              </li>
            ))}
          </ul>
          <p className={styles.bulkHint}>
            Для повторной попытки по ошибкам нужны свежий preview и подтверждение; успешные записи
            повторно не отправляются автоматически.
          </p>
        </div>
      ) : (
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
              disabled={disabled || applying || previewLoading || !!bulkPreview}
              onChange={(e) => onBulkReasonChange(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Действие
            <select
              aria-label="Групповое действие"
              value={bulkAction}
              disabled={disabled || applying || previewLoading || !!bulkPreview}
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

          {bulkPreview ? (
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
                <Button disabled={applying} onClick={() => void onConfirmBulk()}>
                  {applying
                    ? `Применение ${applyProgress.done}/${applyProgress.total}…`
                    : "Подтвердить группу"}
                </Button>
                {applying ? (
                  <Button variant="secondary" onClick={onStopApply}>
                    Остановить оставшиеся
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={onCancelBulkPreview}>
                    Отмена
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              disabled={disabled || previewLoading || !bulkReason.trim() || !bulkAction}
              onClick={() => void onRequestBulkPreview()}
            >
              {previewLoading ? "Проверка…" : "Получить preview группы"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
