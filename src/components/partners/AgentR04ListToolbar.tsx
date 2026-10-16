"use client";

import { Button } from "@/components/ui/Button";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";
import { AgentPartnerDiscoveryFilters } from "./AgentPartnerDiscoveryFilters";
import styles from "./AgentR04ListToolbar.module.css";

export type AgentListSort = "updated_desc" | "name_asc";
export type AgentListViewMode = "list" | "cards";

type Chip = { key: string; label: string; onClear: () => void };

type Props = {
  count: number;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  viewMode: AgentListViewMode;
  onViewModeChange: (mode: AgentListViewMode) => void;
  archiveView: "active" | "archive";
  onArchiveViewChange: (v: "active" | "archive") => void;
  partnerType: AgentPartnerTypeFilter;
  specialization: string;
  stageId: string;
  city: string;
  sort: AgentListSort;
  onPartnerTypeChange: (v: AgentPartnerTypeFilter) => void;
  onSpecializationChange: (v: string) => void;
  onStageChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onSortChange: (v: AgentListSort) => void;
  onResetFilters: () => void;
  taxonomyResetKey: number;
  chips: Chip[];
};

export function AgentR04ListToolbar(props: Props) {
  const hasFilters =
    props.chips.length > 0 || props.archiveView === "archive" || props.sort !== "updated_desc";

  return (
    <div className={styles.root} data-testid="agent-r04-list-toolbar">
      <label className={styles.searchField}>
        <span>Поиск</span>
        <input
          value={props.searchQuery}
          onChange={(e) => props.onSearchQueryChange(e.target.value)}
          placeholder="Название, город или ID"
          data-testid="agent-r04-list-search"
        />
      </label>
      <div className={styles.collectionCount}>
        <span>Найдено: {props.count}</span>
        {hasFilters || props.searchQuery.trim() ? (
          <Button type="button" variant="secondary" onClick={props.onResetFilters}>
            Сбросить фильтры
          </Button>
        ) : null}
      </div>
      <div className={styles.controlRow}>
        <label className={styles.field}>
          Показывать
          <select
            value={props.archiveView}
            onChange={(e) => props.onArchiveViewChange(e.target.value as "active" | "archive")}
            data-testid="list-archive-view"
          >
            <option value="active">Активные</option>
            <option value="archive">Архив</option>
          </select>
        </label>
        <label className={styles.field}>
          Сортировка
          <select
            value={props.sort}
            onChange={(e) => props.onSortChange(e.target.value as AgentListSort)}
          >
            <option value="updated_desc">Сначала недавние</option>
            <option value="name_asc">По названию</option>
          </select>
        </label>
        <div className={styles.viewToggle} data-testid="agent-r04-view-toggle">
          <button
            type="button"
            data-active={props.viewMode === "list"}
            aria-pressed={props.viewMode === "list"}
            onClick={() => props.onViewModeChange("list")}
          >
            Список
          </button>
          <button
            type="button"
            data-active={props.viewMode === "cards"}
            aria-pressed={props.viewMode === "cards"}
            onClick={() => props.onViewModeChange("cards")}
          >
            Карточки
          </button>
        </div>
      </div>
      <AgentPartnerDiscoveryFilters
        specialization={props.specialization}
        stageId={props.stageId}
        city={props.city}
        partnerType={props.partnerType}
        onSpecializationChange={props.onSpecializationChange}
        onStageChange={props.onStageChange}
        onCityChange={props.onCityChange}
        onPartnerTypeChange={props.onPartnerTypeChange}
        resetKey={props.taxonomyResetKey}
      />
      {props.chips.length ? (
        <div className={styles.chips} data-testid="list-filter-chips">
          {props.chips.map((chip) => (
            <button key={chip.key} type="button" className={styles.chip} onClick={chip.onClear}>
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}
      {props.archiveView === "archive" ? (
        <p className={styles.hint}>Архив скрывает запись только у вас и не отменяет договор.</p>
      ) : null}
    </div>
  );
}
