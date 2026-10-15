"use client";

import type { AgentR03ListSort } from "@/lib/agent-r03/types";
import styles from "./agent-r03.module.css";

type Props = {
  searchPlaceholder: string;
  q: string;
  onQChange: (value: string) => void;
  archived: boolean;
  onShowChange: (archived: boolean) => void;
  activeCount: number;
  archivedCount: number;
  viewMode: "cards" | "list";
  onViewModeChange: (mode: "cards" | "list") => void;
  foundCount: number;
  selectableIds: string[];
  selectedIds: Set<string>;
  onSelectPage: (checked: boolean) => void;
  sort: AgentR03ListSort;
  onSortChange: (sort: AgentR03ListSort) => void;
  sortOptions: Array<{ value: AgentR03ListSort; label: string }>;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  onResetFilters?: () => void;
  filtersActive?: boolean;
};

export function AgentR03ListToolbar({
  searchPlaceholder,
  q,
  onQChange,
  archived,
  onShowChange,
  activeCount,
  archivedCount,
  viewMode,
  onViewModeChange,
  foundCount,
  selectableIds,
  selectedIds,
  onSelectPage,
  sort,
  onSortChange,
  sortOptions,
  statusFilter = "",
  onStatusFilterChange,
  statusOptions,
  onResetFilters,
  filtersActive = false,
}: Props) {
  const pageAllSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const archiveHint =
    archived
      ? "Архив не отключает ссылки и не расторгает сотрудничество."
      : "Выделите записи, чтобы работать с ними вместе.";

  return (
    <div className={styles.collectionToolbar} data-testid="agent-r03-collection-toolbar">
      <div className={styles.collectionTools}>
        <label className={styles.fieldSearch}>
          <span className="sr-only">Поиск</span>
          <input
            className={styles.searchInput}
            type="search"
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            data-testid="agent-r03-search"
          />
        </label>
        <label className={styles.fieldInlineCompact}>
          Показывать
          <select
            className={styles.showSelect}
            value={archived ? "archived" : "active"}
            onChange={(e) => onShowChange(e.target.value === "archived")}
            data-testid="agent-r03-show-filter"
          >
            <option value="active">Активные ({activeCount})</option>
            <option value="archived">Архив ({archivedCount})</option>
          </select>
        </label>
        <details
          className={styles.sortDetails}
          data-testid="agent-r03-filters-panel"
          open={Boolean(statusFilter || (sort !== "created_desc" && sort !== "updated_desc"))}
        >
          <summary>Фильтры и сортировка</summary>
          <div className={styles.filterGrid}>
            <label className={styles.fieldInlineCompact}>
              Сортировка
              <select
                className={styles.filterSelect}
                value={sort}
                onChange={(e) => onSortChange(e.target.value as AgentR03ListSort)}
                data-testid="agent-r03-sort"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {statusOptions && onStatusFilterChange ? (
              <label className={styles.fieldInlineCompact}>
                Статус
                <select
                  className={styles.filterSelect}
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value)}
                  data-testid="agent-r03-status-filter"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </details>
        <div className={styles.viewToggle} data-testid="agent-r03-view-toggle">
          <button
            type="button"
            data-active={viewMode === "list"}
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
          >
            Список
          </button>
          <button
            type="button"
            data-active={viewMode === "cards"}
            aria-pressed={viewMode === "cards"}
            onClick={() => onViewModeChange("cards")}
          >
            Карточки
          </button>
        </div>
      </div>

      <div className={styles.collectionCountRow}>
        <span data-testid="agent-r03-found-count">Найдено: {foundCount}</span>
        {filtersActive && onResetFilters ? (
          <button type="button" className={styles.resetFiltersBtn} onClick={onResetFilters}>
            Сбросить фильтры
          </button>
        ) : null}
        <small className={styles.collectionHint}>{archiveHint}</small>
      </div>

      {selectableIds.length > 0 ? (
        <div className={styles.selectPageRow}>
          <label className={styles.selectPageLabel}>
            <input
              type="checkbox"
              checked={pageAllSelected}
              onChange={(e) => onSelectPage(e.target.checked)}
            />
            Выбрать страницу ({selectableIds.length})
          </label>
        </div>
      ) : null}
    </div>
  );
}
