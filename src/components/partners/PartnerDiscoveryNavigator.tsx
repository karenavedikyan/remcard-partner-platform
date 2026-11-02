"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { PartnerSearchFacets, PartnerTaxonomyResponse } from "@/lib/types";
import styles from "./PartnerDiscoveryNavigator.module.css";

const NAV_WIDE_QUERY = "(min-width: 761px)";

type Props = {
  stageId: string;
  specialization: string;
  facets: PartnerSearchFacets | null;
  loading: boolean;
  onStageChange: (id: string) => void;
  onSpecializationChange: (id: string) => void;
};

export function PartnerDiscoveryNavigator({ stageId, specialization, facets, loading, onStageChange, onSpecializationChange }: Props) {
  const [taxonomy, setTaxonomy] = useState<PartnerTaxonomyResponse | null>(null);
  const [error, setError] = useState(false);
  const [navWide, setNavWide] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wasWideRef = useRef(true);

  const load = useCallback(async () => {
    try { setTaxonomy(await fetchPartnerTaxonomy()); setError(false); }
    catch { setError(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useLayoutEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(NAV_WIDE_QUERY);
    const sync = () => {
      const wide = media.matches;
      setNavWide(wide);
      if (wide) {
        setMobileOpen(false);
        wasWideRef.current = true;
        return;
      }
      if (wasWideRef.current) {
        setMobileOpen(false);
      }
      wasWideRef.current = false;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const detailsOpen = navWide || mobileOpen;

  const stages = taxonomy?.stages ?? [];
  const selectedIndex = stages.findIndex(stage => stage.id === stageId);
  const covered = facets ? stages.filter(stage => (facets.stages[stage.id] ?? 0) > 0).length : null;
  const count = (value: number | undefined) => (loading || value === undefined ? "…" : String(value));
  const chooseStage = (id: string) => {
    onSpecializationChange("");
    onStageChange(id);
  };
  const summaryLabel =
    stages.find((stage) => stage.id === stageId)?.label || "Этапы ремонта и направления";

  return (
    <details
      className={styles.navigator}
      open={detailsOpen}
      onToggle={(event) => {
        if (navWide) return;
        setMobileOpen(event.currentTarget.open);
      }}
      data-testid="partner-discovery-navigator"
    >
      <summary>
        <span className={styles.summaryLabel}>
          <span>{summaryLabel}</span>
          <svg className={styles.summaryChevron} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </summary>
      <nav aria-label="Навигатор партнёров" className={styles.body}>
        <div className={styles.quest}>
          <span>Путь ремонта</span>
          <strong>{selectedIndex >= 0 ? `Этап ${selectedIndex + 1} из ${stages.length}` : `${stages.length || "…"} этапов пути`}</strong>
          <div className={styles.progress} aria-hidden="true"><i style={{ width: `${stages.length ? 100 * (selectedIndex >= 0 ? selectedIndex + 1 : covered ?? 0) / stages.length : 0}%` }} /></div>
          <small>{selectedIndex >= 0 ? stages[selectedIndex].label : covered === null ? "Загружаем направления" : `Партнёры есть на ${covered} из ${stages.length} этапов`}</small>
        </div>
        {error ? <p role="alert">Не удалось загрузить этапы. <button type="button" onClick={() => void load()}>Повторить</button></p> : null}
        <ol className={styles.path} aria-label="Этапы ремонта">
          <li className={styles.pathStep}>
            <button type="button" aria-pressed={!stageId} className={styles.step} onClick={() => chooseStage("")}>
              <span className={styles.node}>•</span>
              <span className={styles.stepText}>
                <b>Весь путь</b>
                <em>{stageId ? "Все этапы" : "Вы здесь"}</em>
              </span>
              <span className={styles.stepCount} aria-hidden="true">
                {count(facets?.baseTotal)}
              </span>
            </button>
          </li>
          {stages.map((stage, index) => {
            const n = facets?.stages[stage.id];
            return (
              <li key={stage.id} className={styles.pathStep}>
                <button
                  type="button"
                  className={styles.step}
                  aria-pressed={stageId === stage.id}
                  disabled={!loading && facets !== null && !n && stageId !== stage.id}
                  onClick={() => chooseStage(stage.id)}
                >
                  <span className={styles.node}>{index + 1}</span>
                  <span className={styles.stepText}>
                    <b>{stage.label}</b>
                    <em>
                      {stageId === stage.id
                        ? "Вы здесь"
                        : facets && !n && !loading
                          ? "Пока без партнёров"
                          : `Уровень ${index + 1}`}
                    </em>
                  </span>
                  <span className={styles.stepCount} aria-hidden="true">
                    {count(facets ? n ?? 0 : undefined)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <section className={styles.directions} aria-label="Направления">
          <h3>Направление</h3>
          <div className={styles.directionGroup}>
            <button type="button" aria-pressed={!specialization} onClick={() => onSpecializationChange("")}>
              <span>Все направления</span>
              <span className={styles.directionCount}>{count(facets?.stageTotal)}</span>
            </button>
            {(["services", "products"] as const).flatMap((group) =>
              (taxonomy?.[group] ?? [])
                .filter(
                  (item) =>
                    !facets ||
                    (facets[group][item.id] ?? 0) > 0 ||
                    specialization === `${group}:${item.id}`,
                )
                .map((item) => (
                  <button
                    key={`${group}:${item.id}`}
                    type="button"
                    aria-pressed={specialization === `${group}:${item.id}`}
                    onClick={() => onSpecializationChange(`${group}:${item.id}`)}
                  >
                    <span>{item.label}</span>
                    <span className={styles.directionCount}>
                      {count(facets ? facets[group][item.id] ?? 0 : undefined)}
                    </span>
                  </button>
                )),
            )}
          </div>
        </section>
      </nav>
    </details>
  );
}
