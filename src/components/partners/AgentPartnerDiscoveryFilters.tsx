"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { PartnerTaxonomyItem } from "@/lib/types";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";
import styles from "./AgentPartnerDiscoveryFilters.module.css";

type Props = {
  layout?: "list-main" | "list-extra" | "modal-full" | "modal-primary" | "modal-more";
  specialization: string;
  stageId: string;
  city: string;
  partnerType: AgentPartnerTypeFilter;
  onSpecializationChange: (value: string) => void;
  onStageChange: (stageId: string) => void;
  onCityChange: (city: string) => void;
  onPartnerTypeChange: (type: AgentPartnerTypeFilter) => void;
  resetKey?: number;
};

export function AgentPartnerDiscoveryFilters({
  layout = "modal-full",
  specialization,
  stageId,
  city,
  partnerType,
  onSpecializationChange,
  onStageChange,
  onCityChange,
  onPartnerTypeChange,
  resetKey = 0,
}: Props) {
  const [taxonomy, setTaxonomy] = useState<{
    products: PartnerTaxonomyItem[];
    services: PartnerTaxonomyItem[];
    stages: PartnerTaxonomyItem[];
  } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchPartnerTaxonomy();
      setTaxonomy({
        products: data.products ?? [],
        services: data.services ?? [],
        stages: data.stages ?? [],
      });
      setError("");
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить справочник");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, resetKey]);

  const stageOptions = useMemo(() => taxonomy?.stages ?? [], [taxonomy]);

  if (layout === "list-main") {
    return (
      <div className={styles.mainRow} data-testid="agent-partner-discovery-filters">
        <label className={styles.field}>
          <span>Тип партнёра</span>
          <select
            value={partnerType}
            onChange={(e) => onPartnerTypeChange(e.target.value as AgentPartnerTypeFilter)}
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
          <span>Специализация</span>
          <select
            value={specialization}
            onChange={(e) => onSpecializationChange(e.target.value)}
            data-testid="discovery-specialization"
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
        {error ? (
          <p className={styles.error} role="alert">
            {error}{" "}
            <button type="button" className={styles.linkBtn} onClick={() => void load()}>
              Повторить
            </button>
          </p>
        ) : null}
      </div>
    );
  }

  if (layout === "list-extra") {
    return (
      <>
        <label className={styles.field}>
          <span>Город</span>
          <input value={city} onChange={(e) => onCityChange(e.target.value)} placeholder="Любой" />
        </label>
        <label className={styles.field}>
          <span>Этап ремонта</span>
          <select value={stageId} onChange={(e) => onStageChange(e.target.value)} data-testid="discovery-stage">
            <option value="">Все этапы</option>
            {stageOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </>
    );
  }

  const specializationField = (
    <label className={styles.field}>
      <span>Специализация</span>
      <select
        value={specialization}
        onChange={(e) => onSpecializationChange(e.target.value)}
        data-testid="discovery-specialization"
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
      {layout === "modal-primary" || layout === "modal-full" ? (
        <span className={styles.fieldHint}>Область работ, услуг или товаров партнёра</span>
      ) : null}
    </label>
  );

  const stageField = (
    <label className={styles.field}>
      <span>Этап ремонта</span>
      <select value={stageId} onChange={(e) => onStageChange(e.target.value)} data-testid="discovery-stage">
        <option value="">Все этапы</option>
        {stageOptions.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      {layout === "modal-primary" || layout === "modal-full" ? (
        <span className={styles.fieldHint}>На каком этапе ремонта партнёр полезен</span>
      ) : null}
    </label>
  );

  const cityTypeFold = (
    <details className={styles.moreFilters}>
      <summary>Уточнить: город и тип партнёра</summary>
      <div className={styles.moreGrid}>
        <label className={styles.field}>
          <span>Город</span>
          <input value={city} onChange={(e) => onCityChange(e.target.value)} placeholder="Любой" />
        </label>
        <label className={styles.field}>
          <span>Тип партнёра</span>
          <select
            value={partnerType}
            onChange={(e) => onPartnerTypeChange(e.target.value as AgentPartnerTypeFilter)}
          >
            <option value="">Все типы</option>
            <option value="agent">Агент</option>
            <option value="specialist">Специалист</option>
            <option value="store">Магазин</option>
            <option value="company">Компания</option>
          </select>
        </label>
      </div>
    </details>
  );

  const taxonomyError = error ? (
    <p className={styles.error} role="alert">
      {error}{" "}
      <button type="button" className={styles.linkBtn} onClick={() => void load()}>
        Повторить
      </button>
    </p>
  ) : null;

  if (layout === "modal-primary") {
    return (
      <div className={styles.modalPrimary} data-testid="agent-partner-discovery-filters">
        <div className={styles.primaryRow}>
          {specializationField}
          {stageField}
        </div>
        {taxonomyError}
      </div>
    );
  }

  if (layout === "modal-more") {
    return (
      <div className={styles.modalMore} data-testid="agent-partner-discovery-more">
        {cityTypeFold}
      </div>
    );
  }

  return (
    <div className={styles.root} data-testid="agent-partner-discovery-filters">
      <div className={styles.primaryRow}>
        {specializationField}
        {stageField}
      </div>
      {cityTypeFold}
      {taxonomyError}
    </div>
  );
}
