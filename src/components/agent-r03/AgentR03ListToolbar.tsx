"use client";

import { Button } from "@/components/ui/Button";
import type { AgentR03ListSort } from "@/lib/agent-r03/types";
import styles from "./agent-r03.module.css";

type Props = {
  searchPlaceholder: string;
  q: string;
  onQChange: (value: string) => void;
  onSearch: () => void;
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
};

export function AgentR03ListToolbar({
  searchPlaceholder,
  q,
  onQChange,
  onSearch,
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
}: Props) {
  const pageAllSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  return (
    <div className={styles.collectionToolbar} data-testid="agent-r03-collection-toolbar">
      <div className={styles.toolbarRow}>
        <label className={styles.fieldInline}>
          Поиск
          <input
            className={styles.searchInput}
            type="search"
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
        </label>
        <Button type="button" variant="secondary" onClick={onSearch}>
          Найти
        </Button>
        <label className={styles.fieldInline}>
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
      <details className={styles.sortDetails} data-testid="agent-r03-filters-panel">
        <summary>Фильтры и сортировка</summary>
        <div className={styles.filterGrid}>
          <label className={styles.fieldInline}>
            Сортировка
            <select
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
            <label className={styles.fieldInline}>
              Статус
              <select
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
        <p className={styles.meta}>
          Поиск, вкладка и сортировка применяются на сервере ко всей выдаче.
        </p>
      </details>
      <div className={styles.listMetaRow}>
        <span data-testid="agent-r03-found-count">Найдено: {foundCount}</span>
        <span className={styles.meta}>Выделите записи, чтобы работать с ними вместе.</span>
        {selectableIds.length > 0 ? (
          <label className={styles.selectPageLabel}>
            <input
              type="checkbox"
              checked={pageAllSelected}
              onChange={(e) => onSelectPage(e.target.checked)}
            />
            Выбрать страницу ({selectableIds.length})
          </label>
        ) : null}
      </div>
    </div>
  );
}
