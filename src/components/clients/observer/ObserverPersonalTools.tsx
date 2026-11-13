"use client";

import type { ObserverPersonalBucket } from "@/lib/clients-parity/types";
import styles from "./observer.module.css";

const BUCKETS: Record<ObserverPersonalBucket, string> = {
  active: "Активные",
  archived: "Архив",
  trash: "Корзина",
};

type Props = {
  bucket: ObserverPersonalBucket;
  layout: "partners" | "list";
  counts: Record<ObserverPersonalBucket, number>;
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  showLayoutToggle: boolean;
  onBucket: (b: ObserverPersonalBucket) => void;
  onLayout: (l: "partners" | "list") => void;
  onSelectAll: (checked: boolean) => void;
  onClearSelection: () => void;
  onEditSelected?: () => void;
  onRequestArchive?: () => void;
  onRequestTrash?: () => void;
  onRequestRestore?: () => void;
  persistenceNotice?: string | null;
  /** When parent still holds ids filtered out of the current view (prototype prunes on refresh). */
  selectionOutsideView?: number;
};

export function ObserverPersonalTools({
  bucket,
  layout,
  counts,
  selectedCount,
  visibleCount,
  allVisibleSelected,
  someVisibleSelected,
  showLayoutToggle,
  onBucket,
  onLayout,
  onSelectAll,
  onClearSelection,
  onEditSelected,
  onRequestArchive,
  onRequestTrash,
  onRequestRestore,
  persistenceNotice,
  selectionOutsideView = 0,
}: Props) {
  const selectRef = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.indeterminate = someVisibleSelected && !allVisibleSelected;
    input.setAttribute(
      "aria-checked",
      someVisibleSelected && !allVisibleSelected ? "mixed" : allVisibleSelected ? "true" : "false",
    );
  };

  return (
    <section
      className={styles.personalTools}
      data-testid="ca-observer-personal-tools"
      aria-label="Управление своим списком"
    >
      <div className={styles.personalTop}>
        <div className={styles.personalBuckets} role="group" aria-label="Ваш список">
          {(Object.keys(BUCKETS) as ObserverPersonalBucket[]).map((key) => (
            <button
              key={key}
              type="button"
              className={styles.bucketBtn}
              data-observer-action={`bucket:${key}`}
              aria-pressed={bucket === key}
              onClick={() => onBucket(key)}
            >
              {BUCKETS[key]} <span>{counts[key]}</span>
            </button>
          ))}
        </div>
        {showLayoutToggle ? (
          <div className={styles.personalLayout} role="group" aria-label="Вид списка">
            <button
              type="button"
              className={styles.bucketBtn}
              data-observer-action="layout:partners"
              aria-pressed={layout === "partners"}
              onClick={() => onLayout("partners")}
            >
              По партнёрам
            </button>
            <button
              type="button"
              className={styles.bucketBtn}
              data-observer-action="layout:list"
              aria-pressed={layout === "list"}
              onClick={() => onLayout("list")}
            >
              Списком
            </button>
          </div>
        ) : null}
      </div>
      <p className={styles.personalScope}>
        Личные списки и заметки не меняют данные партнёров. Сохранение личных полей — только через
        подтверждённый серверный контракт.
      </p>
      {persistenceNotice ? (
        <p className={styles.persistenceNotice} role="status">
          {persistenceNotice}
        </p>
      ) : null}
      <div className={styles.personalToolbar}>
        <label className={styles.personalCheck}>
          <input
            ref={selectRef}
            type="checkbox"
            data-observer-select-all
            checked={allVisibleSelected && visibleCount > 0}
            disabled={visibleCount === 0}
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
        {selectedCount > 0 ? (
          <div className={styles.personalActions}>
            {bucket !== "trash" ? (
              <button
                type="button"
                className={styles.ghostBtn}
                data-observer-action="edit"
                onClick={() => onEditSelected?.()}
              >
                Редактировать
              </button>
            ) : null}
            {bucket === "active" ? (
              <button
                type="button"
                className={styles.ghostBtn}
                data-observer-action="move:archived"
                onClick={() => onRequestArchive?.()}
              >
                В архив
              </button>
            ) : (
              <button
                type="button"
                className={styles.ghostBtn}
                data-observer-action="restore"
                onClick={() => onRequestRestore?.()}
              >
                Восстановить
              </button>
            )}
            {bucket !== "trash" ? (
              <button
                type="button"
                className={styles.ghostBtn}
                data-observer-action="move:trash"
                onClick={() => onRequestTrash?.()}
              >
                Удалить у себя
              </button>
            ) : null}
            <button
              type="button"
              className={styles.ghostBtn}
              data-observer-action="clear"
              onClick={onClearSelection}
            >
              Снять выбор
            </button>
          </div>
        ) : (
          <span className={styles.mutedSmall}>
            Выберите клиента, группу партнёра или все найденные записи.
          </span>
        )}
      </div>
    </section>
  );
}
