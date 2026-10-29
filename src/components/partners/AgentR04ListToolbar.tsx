"use client";

import { Button } from "@/components/ui/Button";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";
import { AgentPartnerDiscoveryFilters } from "./AgentPartnerDiscoveryFilters";
import styles from "./AgentR04ListToolbar.module.css";

export type AgentListSort = "updated_desc" | "name_asc";
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
  archiveView: "active" | "archive" | "hidden";
  onArchiveViewChange: (v: "active" | "archive" | "hidden") => void;
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

/**
 * Compact single toolbar row (prototype-v1):
 * search own partners · «Фильтры» · subtle list/cards toggle.
 * Type / specialization / archive / sort expand inside Filters — same semantics for list and cards.
 */
export function AgentR04ListToolbar(props: Props) {
  const invitations = props.listMode === "invitations";
  const hasFilters =
    props.chips.length > 0 ||
    props.archiveView !== "active" ||
    props.sort !== "updated_desc" ||
    props.searchQuery.trim().length > 0 ||
    Boolean(props.partnerType) ||
    Boolean(props.specialization) ||
    Boolean(props.stageId) ||
    Boolean(props.city.trim());

  return (
    <div className={styles.root} data-testid="agent-r04-list-toolbar" data-partners-proto="v1">
      <div className={styles.toolsRow} data-testid="partners-compact-toolbar">
        <label className={styles.searchField}>
          <span className={styles.srOnly}>Поиск своих партнёров</span>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder={props.searchPlaceholder ?? "Поиск своих партнёров"}
            data-testid="agent-r04-list-search"
            aria-label="Поиск своих партнёров"
          />
        </label>

        {!invitations ? (
          <details className={styles.moreFilters} data-testid="partners-filters-details">
            <summary>Фильтры</summary>
            <div className={styles.moreGrid}>
              <AgentPartnerDiscoveryFilters
                layout="list-extra"
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
              <label className={styles.field}>
                Тип партнёра
                <select
                  value={props.partnerType}
                  onChange={(e) =>
                    props.onPartnerTypeChange(e.target.value as AgentPartnerTypeFilter)
                  }
                  data-testid="active-partner-type"
                >
                  <option value="">Все типы</option>
                  <option value="agent">Агент</option>
                  <option value="specialist">Специалист</option>
                  <option value="store">Магазин</option>
                  <option value="company">Компания</option>
                </select>
              </label>
              <label className={styles.field}>
                Архив
                <select
                  value={props.archiveView}
                  onChange={(e) =>
                    props.onArchiveViewChange(
                      e.target.value as "active" | "archive" | "hidden",
                    )
                  }
                  data-testid="list-archive-view"
                  aria-label="Архив"
                >
                  <option value="active">Действующие</option>
                  <option value="archive">Архив</option>
                  <option value="hidden">Скрытые</option>
                </select>
              </label>
              <label className={styles.field}>
                Сортировка
                <select
                  value={props.sort}
                  onChange={(e) => props.onSortChange(e.target.value as AgentListSort)}
                  data-testid="list-sort"
                >
                  <option value="updated_desc">Сначала недавние</option>
                  <option value="name_asc">По названию</option>
                </select>
              </label>
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
        {hasFilters ? (
          <Button type="button" variant="secondary" onClick={props.onResetFilters}>
            Сбросить фильтры
          </Button>
        ) : null}
      </div>

      {props.chips.length ? (
        <div className={styles.chips} data-testid="list-filter-chips">
          {props.chips.map((chip) => (
            <button key={chip.key} type="button" className={styles.chip} onClick={chip.onClear}>
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
