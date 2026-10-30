"use client";

import { Button } from "@/components/ui/Button";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";
import {
  countActiveListRestrictions,
  hasActiveListResettableRestrictions,
  type ActiveListArchiveView,
  type ActiveListSort,
  type ActiveListStatusFilter,
  type ActiveListTaxonomyLabels,
} from "@/lib/partners-prototype-v1/active-list-filters";
import { ActivePartnerListFilters } from "./ActivePartnerListFilters";
import styles from "./AgentR04ListToolbar.module.css";

export type AgentListSort = ActiveListSort;
export type AgentListViewMode = "list" | "cards";

type Chip = { key: string; label: string; onClear: () => void };

type Props = {
  listMode?: "active" | "invitations";
  count: number;
  searchQuery: string;
  searchPlaceholder?: string;
  onSearchQueryChange: (q: string) => void;
  viewMode: AgentListViewMode;
  onViewModeChange: (mode: AgentListViewMode) => void;
  archiveView: ActiveListArchiveView;
  onArchiveViewChange: (v: ActiveListArchiveView) => void;
  partnerType: AgentPartnerTypeFilter;
  specialization: string;
  stageId: string;
  city: string;
  /** Cities from full available collection (pre type/spec/search). */
  cityOptions?: string[];
  status?: ActiveListStatusFilter;
  onStatusChange?: (v: ActiveListStatusFilter) => void;
  sort: AgentListSort;
  onPartnerTypeChange: (v: AgentPartnerTypeFilter) => void;
  onSpecializationChange: (v: string) => void;
  onStageChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onSortChange: (v: AgentListSort) => void;
  onResetFilters: () => void;
  taxonomyResetKey: number;
  chips: Chip[];
  onTaxonomyLabelsChange?: (labels: ActiveListTaxonomyLabels | null) => void;
};

const SEARCH_PLACEHOLDER = "Найти среди своих партнёров";
const SEARCH_ARIA = "Поиск среди своих партнёров";

/**
 * Compact single toolbar row (prototype-v1 / P2):
 * search own partners · «Фильтры N» · subtle list/cards toggle.
 * Expanded filters take a full row; discovery modal layouts are untouched.
 */
export function AgentR04ListToolbar(props: Props) {
  const invitations = props.listMode === "invitations";
  const status = props.status ?? "";
  const restrictionCount = countActiveListRestrictions({
    partnerType: props.partnerType,
    specialization: props.specialization,
    city: props.city,
    stageId: props.stageId,
    status,
    archiveView: props.archiveView,
  });
  const showReset = hasActiveListResettableRestrictions({
    partnerType: props.partnerType,
    specialization: props.specialization,
    city: props.city,
    stageId: props.stageId,
    status,
    archiveView: props.archiveView,
    searchQuery: props.searchQuery,
  });

  return (
    <div className={styles.root} data-testid="agent-r04-list-toolbar" data-partners-proto="v1">
      <div className={styles.toolsRow} data-testid="partners-compact-toolbar">
        <label className={styles.searchField}>
          <span className={styles.srOnly}>{SEARCH_ARIA}</span>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder={props.searchPlaceholder ?? SEARCH_PLACEHOLDER}
            data-testid="agent-r04-list-search"
            aria-label={SEARCH_ARIA}
          />
        </label>

        {!invitations ? (
          <details className={styles.moreFilters} data-testid="partners-filters-details">
            <summary>
              Фильтры
              {restrictionCount > 0 ? (
                <span className={styles.filterCount} data-testid="partners-filters-count">
                  {restrictionCount}
                </span>
              ) : null}
              <span className={styles.filterChevron} aria-hidden="true">
                ⌄
              </span>
            </summary>
            <div className={styles.moreBody}>
              <ActivePartnerListFilters
                partnerType={props.partnerType}
                specialization={props.specialization}
                stageId={props.stageId}
                city={props.city}
                cityOptions={props.cityOptions ?? []}
                archiveView={props.archiveView}
                status={status}
                sort={props.sort}
                taxonomyResetKey={props.taxonomyResetKey}
                onPartnerTypeChange={props.onPartnerTypeChange}
                onSpecializationChange={props.onSpecializationChange}
                onStageChange={props.onStageChange}
                onCityChange={props.onCityChange}
                onArchiveViewChange={props.onArchiveViewChange}
                onStatusChange={(v) => props.onStatusChange?.(v)}
                onSortChange={props.onSortChange}
                onTaxonomyLabelsChange={props.onTaxonomyLabelsChange}
              />
            </div>
          </details>
        ) : null}

        {!invitations ? (
          <div className={styles.viewToggle} data-testid="agent-r04-view-toggle" aria-label="Вид">
            <button
              type="button"
              data-active={props.viewMode === "list"}
              aria-pressed={props.viewMode === "list"}
              aria-label="Список"
              title="Список"
              onClick={() => props.onViewModeChange("list")}
            >
              ≡
            </button>
            <button
              type="button"
              data-active={props.viewMode === "cards"}
              aria-pressed={props.viewMode === "cards"}
              aria-label="Карточки"
              title="Карточки"
              onClick={() => props.onViewModeChange("cards")}
            >
              ⊞
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.collectionCount}>
        <span>Найдено: {props.count}</span>
        {!invitations && props.count > 0 ? (
          <span className={styles.selectionHint}>Выделите записи, чтобы работать с ними вместе</span>
        ) : null}
        {showReset ? (
          <Button type="button" variant="secondary" onClick={props.onResetFilters}>
            Сбросить фильтры
          </Button>
        ) : null}
      </div>

      {props.chips.length ? (
        <div className={styles.chips} data-testid="list-filter-chips" aria-label="Применённые фильтры партнёров">
          {props.chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={styles.chip}
              onClick={chip.onClear}
              aria-label={`Снять фильтр ${chip.label}`}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
