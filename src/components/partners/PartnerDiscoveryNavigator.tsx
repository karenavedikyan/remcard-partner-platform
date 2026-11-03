"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { PartnerSearchFacets, PartnerTaxonomyResponse } from "@/lib/types";
import {
  PartnerDiscoveryStageIcon,
  PartnerDiscoveryUiIcon,
} from "@/components/partners/partnerDiscoveryStageIcons";
import styles from "./PartnerDiscoveryNavigator.module.css";

type Props = {
  stageId: string;
  specialization: string;
  facets: PartnerSearchFacets | null;
  loading: boolean;
  onStageChange: (id: string) => void;
  onSpecializationChange: (id: string) => void;
};

function readNavigatorExpandedDefault(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(min-width: 761px)").matches;
}

export function PartnerDiscoveryNavigator({
  stageId,
  specialization,
  facets,
  loading,
  onStageChange,
  onSpecializationChange,
}: Props) {
  const [taxonomy, setTaxonomy] = useState<PartnerTaxonomyResponse | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(readNavigatorExpandedDefault);

  const load = useCallback(async () => {
    try {
      setTaxonomy(await fetchPartnerTaxonomy());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 761px)");
    const update = () => setExpanded(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const stages = taxonomy?.stages ?? [];
  const selectedIndex = stages.findIndex((stage) => stage.id === stageId);
  const selectedStage = selectedIndex >= 0 ? stages[selectedIndex] : null;
  const covered =
    facets && stages.length
      ? stages.filter((stage) => (facets.stages[stage.id] ?? 0) > 0).length
      : null;

  const count = (value: number | undefined) =>
    loading || value === undefined ? "…" : String(value);

  const chooseStage = (id: string) => {
    onSpecializationChange("");
    onStageChange(id);
  };

  const totalSteps = stages.length;
  const progressPct =
    totalSteps === 0
      ? 0
      : selectedStage
        ? Math.round(((selectedIndex + 1) / totalSteps) * 100)
        : covered !== null
          ? Math.round((covered / totalSteps) * 100)
          : 0;

  const stageCount = facets?.stageTotal;

  const directionChips = useMemo(() => {
    const chips: { key: string; group: "services" | "products"; id: string; label: string; n: number | undefined }[] =
      [];
    for (const group of ["services", "products"] as const) {
      for (const item of taxonomy?.[group] ?? []) {
        const n = facets ? facets[group][item.id] ?? 0 : undefined;
        const selected = specialization === `${group}:${item.id}`;
        if (selected || !facets || (n ?? 0) > 0) {
          chips.push({ key: `${group}:${item.id}`, group, id: item.id, label: item.label, n });
        }
      }
    }
    return chips;
  }, [facets, specialization, taxonomy]);

  const summaryLabel = useMemo(() => {
    if (specialization) {
      const [group, id] = specialization.split(":");
      const list = group === "services" ? taxonomy?.services : group === "products" ? taxonomy?.products : [];
      const hit = list?.find((item) => item.id === id);
      if (hit?.label) return hit.label;
    }
    if (selectedStage) {
      return `Этап ${selectedIndex + 1} из ${totalSteps} · ${selectedStage.label}`;
    }
    return "Все этапы";
  }, [selectedIndex, selectedStage, specialization, taxonomy, totalSteps]);

  return (
    <details
      className={styles.navigator}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      data-testid="partner-discovery-navigator"
    >
      <summary className={styles.summary}>
        <span className={styles.summaryText}>
          <PartnerDiscoveryUiIcon name="route" />
          <b>{summaryLabel}</b>
        </span>
        <PartnerDiscoveryUiIcon name="chevron-down" />
      </summary>
      <nav aria-label="Навигатор партнёров" className={`${styles.body} ${styles.quest}`}>
        <div className={styles.questHead}>
          <span className={styles.questEyebrow}>
            <PartnerDiscoveryUiIcon name="route" />
            Путь ремонта
          </span>
          <strong>
            {selectedStage
              ? `Этап ${selectedIndex + 1} из ${totalSteps}`
              : `${totalSteps || "…"} этапов пути`}
          </strong>
          <div
            className={styles.questBar}
            role="img"
            aria-label={
              selectedStage
                ? `Этап ${selectedIndex + 1} из ${totalSteps}`
                : covered !== null
                  ? `Партнёры есть на ${covered} из ${totalSteps} этапов`
                  : "Прогресс пути ремонта"
            }
          >
            <i style={{ width: `${progressPct}%` }} />
          </div>
          <small>
            {selectedStage
              ? `${selectedStage.label} · ${count(facets?.stages[selectedStage.id])} партнёров`
              : covered === null
                ? "Загружаем направления"
                : `Партнёры есть на ${covered} из ${totalSteps} этапов`}
          </small>
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            Не удалось загрузить этапы.{" "}
            <button type="button" onClick={() => void load()}>
              Повторить
            </button>
          </p>
        ) : null}

        <ol className={styles.path} aria-label="Этапы ремонта">
          <li
            className={`${styles.pathStep} ${styles.pathAll} ${!stageId ? styles.isCurrent : ""} ${stageId ? styles.isPassed : ""}`}
          >
            <button
              type="button"
              className={`${styles.navItem} ${styles.step}`}
              aria-pressed={!stageId}
              onClick={() => chooseStage("")}
            >
              <span className={styles.stepNode}>
                <PartnerDiscoveryUiIcon name="map" />
              </span>
              <span className={styles.stepText}>
                <b>Весь путь</b>
                <em>Все этапы ремонта</em>
              </span>
              <small>{count(facets?.baseTotal)}</small>
            </button>
          </li>
          {stages.map((stage, index) => {
            const n = facets?.stages[stage.id];
            const selected = stageId === stage.id;
            const passed = selectedIndex >= 0 && index < selectedIndex;
            const empty = !loading && facets !== null && !n && !selected;
            const stepClasses = [
              styles.pathStep,
              selected ? styles.isCurrent : "",
              passed ? styles.isPassed : "",
              empty ? styles.isEmpty : "",
            ]
              .filter(Boolean)
              .join(" ");

            const inner = (
              <>
                <span className={styles.stepNode}>
                  <PartnerDiscoveryStageIcon stageId={stage.id} />
                  <i>{index + 1}</i>
                </span>
                <span className={styles.stepText}>
                  <b>{stage.label}</b>
                  <em>
                    {selected
                      ? "Вы здесь"
                      : empty
                        ? "Пока без партнёров"
                        : `Уровень ${index + 1}`}
                  </em>
                </span>
                <small>{empty ? "—" : count(facets ? n ?? 0 : undefined)}</small>
              </>
            );

            return (
              <li key={stage.id} className={stepClasses}>
                <button
                  type="button"
                  className={`${styles.navItem} ${styles.step}`}
                  aria-pressed={selected}
                  disabled={empty && !selected}
                  onClick={() => !empty && chooseStage(stage.id)}
                >
                  {inner}
                </button>
              </li>
            );
          })}
        </ol>

        <section className={`${styles.navSection} ${styles.skills}`} aria-label="Направления">
          <h3>
            <PartnerDiscoveryUiIcon name="sparkles" />
            Направление
          </h3>
          <div className={styles.skillGrid}>
            <button
              type="button"
              className={styles.navItem}
              aria-pressed={!specialization}
              onClick={() => onSpecializationChange("")}
            >
              <span>Все направления</span>
              <small>{count(stageCount)}</small>
            </button>
            {directionChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={styles.navItem}
                aria-pressed={specialization === chip.key}
                onClick={() => onSpecializationChange(chip.key)}
              >
                <span>{chip.label}</span>
                <small>{count(chip.n)}</small>
              </button>
            ))}
          </div>
        </section>
      </nav>
    </details>
  );
}
