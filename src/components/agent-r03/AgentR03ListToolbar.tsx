"use client";

import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

type Props = {
  searchPlaceholder: string;
  q: string;
  onQChange: (value: string) => void;
  onSearch: () => void;
  archived: boolean;
  onShowChange: (archived: boolean) => void;
  activeCount: number;
  archivedCount?: number | null;
  viewMode: "cards" | "list";
  onViewModeChange: (mode: "cards" | "list") => void;
  foundCount: number;
  selectableIds: string[];
  selectedIds: Set<string>;
  onSelectPage: (checked: boolean) => void;
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
}: Props) {
  const pageAllSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  return (
    <div className={styles.collectionToolbar} data-testid="agent-r03-collection-toolbar">
      <div className={styles.toolbarRow}>
        <label className={styles.fieldInline}>
          Поиск
          <input
            className={styles.search}
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
            <option value="archived">
              Архив{archivedCount != null ? ` (${archivedCount})` : ""}
            </option>
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
      <details className={styles.sortDetails}>
        <summary>Фильтры и сортировка</summary>
        <p className={styles.meta}>
          Поиск и «Показывать» работают через сервер. Сортировка ниже — только для записей на
          текущей странице.
        </p>
      </details>
      <div className={styles.listMetaRow}>
        <span data-testid="agent-r03-found-count">Найдено: {foundCount}</span>
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
