"use client";

import { useEffect, useId, useRef } from "react";
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

function confirmTitle(action: BulkLifecycleAction): string {
  if (action === "hide_catalog") return "Скрыть выбранных партнёров?";
  if (action === "publish_catalog") return "Показать выбранных партнёров?";
  if (action === "archive_project") return "Переместить в архив?";
  if (action === "restore_project") return "Восстановить партнёров?";
  return "Подтвердить групповое изменение?";
}

function confirmLead(action: BulkLifecycleAction, count: number): string {
  const who = count === 1 ? "1 партнёр" : `Количество: ${count}`;
  if (action === "hide_catalog") {
    return `${who}. Поиск сотрудничества не изменится.`;
  }
  if (action === "publish_catalog") {
    return `${who}. Поиск сотрудничества не изменится.`;
  }
  if (action === "archive_project") {
    return `${who}. Скроем из каталога и поиска сотрудничества. Данные и история останутся; восстановление доступно в архиве.`;
  }
  if (action === "restore_project") {
    return `${who}. Вернём в рабочий реестр и восстановим прежние настройки видимости.`;
  }
  return `${who}.`;
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
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previewBtnRef = useRef<HTMLButtonElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const needReturnFocusRef = useRef(false);

  const hasPreviewFailures = Boolean(previewFailures && previewFailures.length > 0);
  const showSelectionHead = selectedCount > 0 || applying;
  const showNewGroupForm =
    selectedCount > 0 && !applying && (!bulkPreview || hasPreviewFailures);
  const modalOpen = Boolean(bulkPreview) && !hasPreviewFailures;
  const reportTitle = applying ? "Ход групповой операции" : "Итог групповой операции";
  const hasApplyReport = Boolean(applyResults && applyResults.length > 0);
  const showCompactBarOnly =
    compactSelectionBar &&
    !selectionFormExpanded &&
    selectedCount > 0 &&
    !applying &&
    !bulkPreview &&
    !applyResults;
  const wasModalOpenRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (modalOpen) {
      wasModalOpenRef.current = true;
      if (!dialog) return;
      if (!dialog.open) {
        const active = document.activeElement;
        if (active instanceof HTMLElement) returnFocusRef.current = active;
        dialog.showModal();
      }
      queueMicrotask(() => {
        if (applying) {
          cancelBtnRef.current?.focus();
        } else {
          (confirmBtnRef.current ?? cancelBtnRef.current)?.focus();
        }
      });
      return;
    }
    if (wasModalOpenRef.current) {
      wasModalOpenRef.current = false;
      if (dialog?.open) dialog.close();
      // Restore after form remount (Cancel/Escape) or final apply report.
      needReturnFocusRef.current = true;
    }
  }, [modalOpen, applying]);

  useEffect(() => {
    if (modalOpen || !needReturnFocusRef.current) return;
    // Apply clears preview before applying=false — wait for the final report.
    if (applying) return;

    needReturnFocusRef.current = false;
    const saved = returnFocusRef.current;
    returnFocusRef.current = null;

    function isFocusableControl(el: HTMLElement): boolean {
      if (!el.isConnected) return false;
      if (el.closest('[aria-hidden="true"], [hidden], [inert]')) return false;
      if (
        el instanceof HTMLButtonElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLInputElement
      ) {
        if (el.disabled) return false;
      }
      return true;
    }

    function tryFocus(el: HTMLElement | null | undefined): boolean {
      if (!el || !isFocusableControl(el)) return false;
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
      return document.activeElement === el;
    }

    const focusTarget = () => {
      // Cancel/Escape: selection + preview form remount — return to opener.
      if (showNewGroupForm || selectedCount > 0) {
        if (tryFocus(previewBtnRef.current)) return true;
        if (tryFocus(saved)) return true;
        const reason = document.querySelector<HTMLTextAreaElement>(
          'textarea[aria-label="Причина группового изменения"]',
        );
        if (tryFocus(reason)) return true;
      }

      // Successful / partial / stop apply: selection cleared, report stays.
      if (hasApplyReport && tryFocus(reportRef.current)) return true;

      // Stable nearby control if report is not yet mountable.
      const registrySearch = document.querySelector<HTMLElement>(
        '[data-testid="partner-search"]',
      );
      if (tryFocus(registrySearch)) return true;
      return false;
    };

    queueMicrotask(() => {
      if (focusTarget()) return;
      requestAnimationFrame(() => {
        focusTarget();
      });
    });
  }, [modalOpen, showNewGroupForm, selectedCount, applying, hasApplyReport]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      // Escape — never mutate; cancel closes preview only.
      event.preventDefault();
      if (applying) return;
      onCancelBulkPreview();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [applying, onCancelBulkPreview]);

  if (selectedCount === 0 && !applyResults && !applying) return null;

  function pickQuickAction(action: BulkLifecycleAction) {
    onBulkActionChange(action);
    onOpenSelectionForm?.();
  }

  function requestCancelConfirm() {
    if (applying) return;
    onCancelBulkPreview();
  }

  const confirmDialog =
    bulkPreview && !hasPreviewFailures ? (
      <dialog
        ref={dialogRef}
        className={styles.bulkConfirmDialog}
        aria-modal="true"
        aria-labelledby={titleId}
        data-bulk-confirm-modal="true"
      >
        <div className={styles.bulkConfirmHead}>
          <h2 id={titleId}>{confirmTitle(bulkPreview.action)}</h2>
        </div>
        <div className={styles.bulkConfirmBody}>
          <p className={styles.bulkConfirmLead}>
            {confirmLead(bulkPreview.action, bulkPreview.members.length)}
          </p>
          <p className={styles.bulkHint}>
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
          {applying ? (
            <p className={styles.bulkHint} role="status">
              Применение {applyProgress.done}/{applyProgress.total}…
            </p>
          ) : null}
        </div>
        <div className={styles.bulkConfirmFooter}>
          {applying ? (
            <>
              <Button disabled>{`Применение ${applyProgress.done}/${applyProgress.total}…`}</Button>
              <Button ref={cancelBtnRef} variant="secondary" onClick={onStopApply}>
                Остановить оставшиеся
              </Button>
            </>
          ) : (
            <>
              <Button
                ref={cancelBtnRef}
                variant="secondary"
                disabled={disabled}
                onClick={requestCancelConfirm}
              >
                Отмена
              </Button>
              <Button
                ref={confirmBtnRef}
                disabled={disabled}
                onClick={() => void onConfirmBulk()}
              >
                Подтвердить
              </Button>
            </>
          )}
        </div>
      </dialog>
    ) : null;

  if (showCompactBarOnly) {
    return (
      <>
        <div className={styles.bulkBar} role="region" aria-label="Групповые действия">
          <strong>
            Выбрано: <span data-testid="selected-count">{selectedCount}</span>
            {otherPagesCount > 0 ? (
              <span className={styles.bulkHint}> · на других страницах: {otherPagesCount}</span>
            ) : null}
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
          <button
            type="button"
            className={styles.bulkBarBtn}
            disabled={disabled}
            onClick={() => pickQuickAction("archive_project")}
            title="Архив профилей в проекте (не удаление аккаунта). Нужны причина и preview."
          >
            Удалить из проекта
          </button>
          <button type="button" className={styles.bulkBarBtn} disabled={disabled} onClick={onClearSelection}>
            Отменить
          </button>
        </div>
        {confirmDialog}
      </>
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
            onClick={() => pickQuickAction("archive_project")}
            title="Архив профилей в проекте (не удаление аккаунта). Нужны причина и preview."
          >
            Удалить из проекта
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
        <div
          ref={reportRef}
          className={styles.bulkReport}
          role="region"
          aria-live="polite"
          aria-label={reportTitle}
          tabIndex={-1}
          data-bulk-apply-report="true"
        >
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
            ref={previewBtnRef}
            variant="secondary"
            disabled={disabled || previewLoading || !bulkReason.trim() || !bulkAction}
            onClick={() => void onRequestBulkPreview()}
          >
            {previewLoading ? "Проверка…" : "Получить preview группы"}
          </Button>
        </>
      ) : null}

      {confirmDialog}
    </div>
  );
}
