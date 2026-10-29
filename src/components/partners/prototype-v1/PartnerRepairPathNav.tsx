"use client";

import { useState } from "react";
import type { PartnerTaxonomyItem } from "@/lib/types";
import {
  buildDirectionCounters,
  buildRepairPathStages,
  type DiscoveryFacetCounts,
} from "@/lib/partners-prototype-v1/repair-path";
import styles from "./PartnerRepairPathNav.module.css";

type Props = {
  stages: PartnerTaxonomyItem[];
  products: PartnerTaxonomyItem[];
  services: PartnerTaxonomyItem[];
  facets: DiscoveryFacetCounts | null;
  selectedStageId: string;
  selectedSpecialization: string;
  onStageChange: (stageId: string) => void;
  onSpecializationChange: (value: string) => void;
  countsUnavailableReason?: string | null;
};

export function PartnerRepairPathNav({
  stages,
  products,
  services,
  facets,
  selectedStageId,
  selectedSpecialization,
  onStageChange,
  onSpecializationChange,
  countsUnavailableReason,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathStages = buildRepairPathStages(stages, facets);
  const productCounters = buildDirectionCounters(products, facets?.byProduct);
  const serviceCounters = buildDirectionCounters(services, facets?.byService);

  return (
    <section
      className={styles.root}
      data-testid="partner-repair-path-nav"
      data-collapsed={!mobileOpen ? "true" : "false"}
      aria-label="Путь ремонта"
    >
      <div className={styles.header}>
        <h3 className={styles.title}>Путь ремонта</h3>
        <button
          type="button"
          className={styles.toggle}
          data-testid="repair-path-mobile-toggle"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Свернуть" : "Показать этапы"}
        </button>
      </div>
      {countsUnavailableReason ? (
        <p className={styles.hint} data-testid="repair-path-counts-gap">
          {countsUnavailableReason}
        </p>
      ) : facets?.total != null ? (
        <p className={styles.hint}>Подходит партнёров: {facets.total}</p>
      ) : (
        <p className={styles.hint}>
          Счётчики по этапам появятся, когда API вернёт полный matching set. Числа с текущей
          страницы не показываем.
        </p>
      )}

      <div className={styles.stages} data-testid="repair-path-stages">
        <button
          type="button"
          className={styles.stage}
          data-active={!selectedStageId}
          onClick={() => onStageChange("")}
        >
          <span className={styles.stageLabel}>Все этапы</span>
          <span className={styles.stageCount}>
            {facets?.total != null ? String(facets.total) : "—"}
          </span>
        </button>
        {pathStages.map((stage) => (
          <button
            key={stage.id}
            type="button"
            className={styles.stage}
            data-active={selectedStageId === stage.id}
            data-unavailable={stage.unavailable}
            disabled={stage.unavailable}
            title={
              stage.unavailable
                ? "На этом этапе нет подходящих партнёров"
                : stage.label
            }
            onClick={() => {
              if (stage.unavailable) return;
              onStageChange(stage.id);
            }}
          >
            <span className={styles.stageLabel}>{stage.label}</span>
            <span className={styles.stageCount}>
              {stage.matchCount == null ? "—" : String(stage.matchCount)}
            </span>
          </button>
        ))}
      </div>

      <div className={styles.directions}>
        <div className={styles.dirGroup}>
          <p className={styles.dirTitle}>Работы и услуги</p>
          <div className={styles.dirChips}>
            {serviceCounters.map((item) => {
              const value = `services:${item.id}`;
              return (
                <button
                  key={value}
                  type="button"
                  className={styles.dirChip}
                  data-active={selectedSpecialization === value}
                  data-unavailable={item.unavailable}
                  disabled={item.unavailable}
                  onClick={() =>
                    onSpecializationChange(
                      selectedSpecialization === value ? "" : value,
                    )
                  }
                >
                  {item.label}
                  {item.count != null ? ` · ${item.count}` : ""}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.dirGroup}>
          <p className={styles.dirTitle}>Товары и материалы</p>
          <div className={styles.dirChips}>
            {productCounters.map((item) => {
              const value = `products:${item.id}`;
              return (
                <button
                  key={value}
                  type="button"
                  className={styles.dirChip}
                  data-active={selectedSpecialization === value}
                  data-unavailable={item.unavailable}
                  disabled={item.unavailable}
                  onClick={() =>
                    onSpecializationChange(
                      selectedSpecialization === value ? "" : value,
                    )
                  }
                >
                  {item.label}
                  {item.count != null ? ` · ${item.count}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
