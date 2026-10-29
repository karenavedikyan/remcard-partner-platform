"use client";

import { useEffect, useState } from "react";
import type { PartnerTaxonomyItem } from "@/lib/types";
import {
  buildDirectionCounters,
  buildRepairPathStages,
  DISCOVERY_FACETS_UNAVAILABLE,
  pluralRu,
  repairPathProgressPercent,
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
  // Desktop: keep open so UA stylesheet does not hide the vertical path.
  // Mobile: starts collapsed; selecting a stage collapses again.
  const [mobileOpen, setMobileOpen] = useState(true);
  const pathStages = buildRepairPathStages(stages, facets);
  const productCounters = buildDirectionCounters(products, facets?.byProduct)
    .filter((item) => item.count == null || item.count > 0)
    .map((item) => ({ ...item, group: "products" as const }));
  const serviceCounters = buildDirectionCounters(services, facets?.byService)
    .filter((item) => item.count == null || item.count > 0)
    .map((item) => ({ ...item, group: "services" as const }));

  const selected = pathStages.find((s) => s.id === selectedStageId) ?? null;
  const covered = pathStages.filter((s) => (s.matchCount ?? 0) > 0).length;
  const progress = repairPathProgressPercent({
    totalStages: pathStages.length,
    selectedIndex: selected?.index ?? null,
    coveredStages: covered,
  });
  const baseTotal = facets?.total;
  const stageScopedTotal =
    selected && selected.matchCount != null ? selected.matchCount : baseTotal;

  const summaryLabel = selected
    ? `Этап ${selected.index + 1} из ${pathStages.length} · ${selected.label}`
    : pathStages.length
      ? `${pathStages.length} этапов пути`
      : "Путь ремонта";

  useEffect(() => {
    // Mobile: collapse after choosing a stage (reference behaviour).
    if (typeof window === "undefined") return;
    if (window.innerWidth <= 760 && selectedStageId) {
      setMobileOpen(false);
    }
  }, [selectedStageId]);

  function pickStage(next: string) {
    onStageChange(next);
  }

  return (
    <details
      className={styles.navigator}
      open={mobileOpen}
      data-testid="partner-repair-path-nav"
      onToggle={(e) => setMobileOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className={styles.summary}>
        <span>
          <b>{summaryLabel}</b>
        </span>
        <span aria-hidden="true">⌄</span>
      </summary>

      <nav className={styles.body} aria-label="Навигатор партнёров">
        <div className={styles.questHead}>
          <span className={styles.questEyebrow}>Путь ремонта</span>
          <strong>
            {selected
              ? `Этап ${selected.index + 1} из ${pathStages.length}`
              : `${pathStages.length} этапов пути`}
          </strong>
          <div
            className={styles.questBar}
            role="img"
            aria-label={
              selected
                ? `Этап ${selected.index + 1} из ${pathStages.length}`
                : `Партнёры есть на ${covered} из ${pathStages.length} этапов`
            }
          >
            <i style={{ width: `${progress}%` }} />
          </div>
          <small>
            {countsUnavailableReason || (!facets && DISCOVERY_FACETS_UNAVAILABLE)
              ? countsUnavailableReason || DISCOVERY_FACETS_UNAVAILABLE
              : selected
                ? `${selected.label} · ${selected.matchCount ?? "—"} ${pluralRu(
                    selected.matchCount ?? 0,
                    "партнёр",
                    "партнёра",
                    "партнёров",
                  )}`
                : `Партнёры есть на ${covered} из ${pathStages.length} этапов`}
          </small>
        </div>

        <ol className={styles.path} aria-label="Этапы ремонта">
          <li
            className={styles.pathStep}
            data-current={!selectedStageId ? "true" : "false"}
          >
            <button
              type="button"
              className={styles.step}
              aria-pressed={!selectedStageId}
              onClick={() => pickStage("")}
              data-testid="repair-path-all"
            >
              <span className={styles.stepNode} aria-hidden="true">
                ◉
              </span>
              <span className={styles.stepText}>
                <b>Весь путь</b>
                <em>Все этапы ремонта</em>
              </span>
              <small>{baseTotal != null ? String(baseTotal) : "—"}</small>
            </button>
          </li>
          {pathStages.map((stage) => {
            const isCurrent = selectedStageId === stage.id;
            const isPassed = selected ? stage.index < selected.index : false;
            const inner = (
              <>
                <span className={styles.stepNode} aria-hidden="true">
                  <i>{stage.index + 1}</i>
                </span>
                <span className={styles.stepText}>
                  <b>{stage.label}</b>
                  <em>
                    {isCurrent
                      ? "Вы здесь"
                      : stage.unavailable
                        ? "Пока без партнёров"
                        : `Уровень ${stage.index + 1}`}
                  </em>
                </span>
                <small>
                  {stage.matchCount == null ? "—" : stage.unavailable ? "—" : String(stage.matchCount)}
                </small>
              </>
            );
            return (
              <li
                key={stage.id}
                className={styles.pathStep}
                data-current={isCurrent ? "true" : "false"}
                data-passed={isPassed ? "true" : "false"}
                data-empty={stage.unavailable ? "true" : "false"}
              >
                {stage.unavailable ? (
                  <span className={styles.step} aria-disabled="true">
                    {inner}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.step}
                    aria-pressed={isCurrent}
                    onClick={() => pickStage(stage.id)}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <div className={styles.skills}>
          <h3 className={styles.skillsTitle}>Направление</h3>
          <div className={styles.skillGrid}>
            <button
              type="button"
              className={styles.skillChip}
              aria-pressed={!selectedSpecialization}
              onClick={() => onSpecializationChange("")}
            >
              <span>Все направления</span>
              <small>{stageScopedTotal != null ? String(stageScopedTotal) : "—"}</small>
            </button>
            {[...serviceCounters, ...productCounters].map((item) => {
              const value = `${item.group}:${item.id}`;
              return (
                <button
                  key={value}
                  type="button"
                  className={styles.skillChip}
                  aria-pressed={selectedSpecialization === value}
                  disabled={item.unavailable}
                  onClick={() =>
                    onSpecializationChange(selectedSpecialization === value ? "" : value)
                  }
                >
                  <span>{item.label}</span>
                  <small>{item.count != null ? String(item.count) : "—"}</small>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </details>
  );
}
