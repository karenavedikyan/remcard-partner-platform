"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";
import {
  ACTIVE_PARTNER_TYPE_LABELS,
  cityIdentityKey,
  mergeCitySelectOptions,
  type ActiveListArchiveView,
  type ActiveListSort,
  type ActiveListStatusFilter,
  type ActiveListTaxonomyLabels,
} from "@/lib/partners-prototype-v1/active-list-filters";
import styles from "./ActivePartnerListFilters.module.css";

type Props = {
  partnerType: AgentPartnerTypeFilter;
  specialization: string;
  stageId: string;
  city: string;
  cityOptions: string[];
  archiveView: ActiveListArchiveView;
  status: ActiveListStatusFilter;
  sort: ActiveListSort;
  taxonomyResetKey: number;
  onPartnerTypeChange: (v: AgentPartnerTypeFilter) => void;
  onSpecializationChange: (v: string) => void;
  onStageChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onArchiveViewChange: (v: ActiveListArchiveView) => void;
  onStatusChange: (v: ActiveListStatusFilter) => void;
  onSortChange: (v: ActiveListSort) => void;
  onTaxonomyLabelsChange?: (labels: ActiveListTaxonomyLabels | null) => void;
};

type TaxonomyState = {
  products: { id: string; label: string }[];
  services: { id: string; label: string }[];
  stages: { id: string; label: string }[];
};

/**
 * Active-list filter body only (P2). Discovery modal layouts stay on AgentPartnerDiscoveryFilters.
 */
export function ActivePartnerListFilters(props: Props) {
  const [taxonomy, setTaxonomy] = useState<TaxonomyState | null>(null);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const labelsCbRef = useRef(props.onTaxonomyLabelsChange);
  labelsCbRef.current = props.onTaxonomyLabelsChange;
  /** Latest-request-wins: stale success/error must not overwrite current taxonomy/labels. */
  const taxonomyRequestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++taxonomyRequestIdRef.current;
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchPartnerTaxonomy();
        if (cancelled || requestId !== taxonomyRequestIdRef.current) return;
        const next: TaxonomyState = {
          products: data.products ?? [],
          services: data.services ?? [],
          stages: data.stages ?? [],
        };
        setTaxonomy(next);
        setError("");
        labelsCbRef.current?.({
          products: Object.fromEntries(next.products.map((i) => [i.id, i.label])),
          services: Object.fromEntries(next.services.map((i) => [i.id, i.label])),
          stages: Object.fromEntries(next.stages.map((i) => [i.id, i.label])),
        });
      } catch (caught) {
        if (cancelled || requestId !== taxonomyRequestIdRef.current) return;
        setTaxonomy(null);
        setError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить справочник",
        );
        labelsCbRef.current?.(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.taxonomyResetKey, retryToken]);

  const citySelectOptions = useMemo(
    () => mergeCitySelectOptions(props.cityOptions, props.city),
    [props.city, props.cityOptions],
  );

  return (
    <div className={styles.body} data-testid="active-partner-list-filters">
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Тип партнёра</span>
          <select
            value={props.partnerType}
            onChange={(e) => props.onPartnerTypeChange(e.target.value as AgentPartnerTypeFilter)}
            data-testid="active-partner-type"
          >
            <option value="">Все типы</option>
            {(Object.keys(ACTIVE_PARTNER_TYPE_LABELS) as Array<keyof typeof ACTIVE_PARTNER_TYPE_LABELS>).map(
              (key) => (
                <option key={key} value={key}>
                  {ACTIVE_PARTNER_TYPE_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className={styles.field}>
          <span>Специализация</span>
          <select
            value={props.specialization}
            onChange={(e) => props.onSpecializationChange(e.target.value)}
            data-testid="active-partner-specialization"
          >
            <option value="">Все специализации</option>
            <optgroup label="Работы и услуги">
              {(taxonomy?.services ?? []).map((item) => (
                <option key={`services:${item.id}`} value={`services:${item.id}`}>
                  {item.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Товары и материалы">
              {(taxonomy?.products ?? []).map((item) => (
                <option key={`products:${item.id}`} value={`products:${item.id}`}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className={styles.field}>
          <span>Город</span>
          <select
            value={props.city}
            onChange={(e) => props.onCityChange(e.target.value)}
            data-testid="active-partner-city"
          >
            <option value="">Все города</option>
            {citySelectOptions.map((city) => (
              <option key={cityIdentityKey(city)} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Этап ремонта</span>
          <select
            value={props.stageId}
            onChange={(e) => props.onStageChange(e.target.value)}
            data-testid="active-partner-stage"
          >
            <option value="">Все этапы</option>
            {(taxonomy?.stages ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Показывать</span>
          <select
            value={props.archiveView}
            onChange={(e) =>
              props.onArchiveViewChange(e.target.value as ActiveListArchiveView)
            }
            data-testid="list-archive-view"
            aria-label="Показывать"
          >
            <option value="active">Действующие</option>
            <option value="archive">Архив</option>
            <option value="hidden">Скрытые</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Статус</span>
          <select
            value={props.status}
            onChange={(e) => props.onStatusChange(e.target.value as ActiveListStatusFilter)}
            data-testid="active-partner-status"
          >
            <option value="">Все</option>
            <option value="ACTIVE">Активно</option>
            <option value="PAUSED">Приостановлено</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Порядок</span>
          <select
            value={props.sort}
            onChange={(e) => props.onSortChange(e.target.value as ActiveListSort)}
            data-testid="list-sort"
          >
            <option value="updated_desc">Сначала недавние</option>
            <option value="name_asc">По названию</option>
            <option value="status">По статусу</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => setRetryToken((n) => n + 1)}
          >
            Повторить
          </button>
        </p>
      ) : null}
    </div>
  );
}
