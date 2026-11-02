"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { PartnerSearchFacets, PartnerTaxonomyResponse } from "@/lib/types";
import styles from "./PartnerDiscoveryNavigator.module.css";

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
  const [expanded, setExpanded] = useState(true);
  const load = useCallback(async () => {
    try { setTaxonomy(await fetchPartnerTaxonomy()); setError(false); }
    catch { setError(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const update = () => setExpanded(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const stages = taxonomy?.stages ?? [];
  const selectedIndex = stages.findIndex(stage => stage.id === stageId);
  const covered = facets ? stages.filter(stage => (facets.stages[stage.id] ?? 0) > 0).length : null;
  const count = (value: number | undefined) => loading || value === undefined ? "…" : String(value);
  const chooseStage = (id: string) => {
    onSpecializationChange("");
    onStageChange(id);
  };
  return (
    <details className={styles.navigator} open={expanded} onToggle={event => setExpanded(event.currentTarget.open)} data-testid="partner-discovery-navigator">
      <summary>{stages.find(stage => stage.id === stageId)?.label || "Этапы ремонта и направления"}</summary>
      <nav aria-label="Навигатор партнёров" className={styles.body}>
        <div className={styles.quest}>
          <span>Путь ремонта</span>
          <strong>{selectedIndex >= 0 ? `Этап ${selectedIndex + 1} из ${stages.length}` : `${stages.length || "…"} этапов пути`}</strong>
          <div className={styles.progress} aria-hidden="true"><i style={{ width: `${stages.length ? 100 * (selectedIndex >= 0 ? selectedIndex + 1 : covered ?? 0) / stages.length : 0}%` }} /></div>
          <small>{selectedIndex >= 0 ? stages[selectedIndex].label : covered === null ? "Загружаем направления" : `Партнёры есть на ${covered} из ${stages.length} этапов`}</small>
        </div>
        {error ? <p role="alert">Не удалось загрузить этапы. <button type="button" onClick={() => void load()}>Повторить</button></p> : null}
        <ol className={styles.path} aria-label="Этапы ремонта">
          <li><button type="button" aria-pressed={!stageId} className={styles.step} onClick={() => chooseStage("")}>
            <span className={styles.node}>Все</span><span><b>Весь путь</b><small>Все этапы ремонта</small></span><em>{count(facets?.baseTotal)}</em>
          </button></li>
          {stages.map((stage, index) => {
            const n = facets?.stages[stage.id];
            return <li key={stage.id}><button type="button" className={styles.step} aria-pressed={stageId === stage.id}
              disabled={!loading && facets !== null && !n && stageId !== stage.id} onClick={() => chooseStage(stage.id)}>
              <span className={styles.node}>{index + 1}</span><span><b>{stage.label}</b><small>{stageId === stage.id ? "Вы здесь" : facets && !n && !loading ? "Пока без партнёров" : `Уровень ${index + 1}`}</small></span><em>{count(facets ? n ?? 0 : undefined)}</em>
            </button></li>;
          })}
        </ol>
        <section className={styles.directions} aria-label="Направления">
          <h3>Направление</h3>
          <button type="button" aria-pressed={!specialization} onClick={() => onSpecializationChange("")}>Все направления <em>{count(facets?.stageTotal)}</em></button>
          {(["services", "products"] as const).map(group => <div key={group} className={styles.directionGroup}>
            <h4>{group === "services" ? "Работы и услуги" : "Товары и материалы"}</h4>
            {(taxonomy?.[group] ?? []).filter(item => !facets || (facets[group][item.id] ?? 0) > 0 || specialization === `${group}:${item.id}`).map(item =>
              <button key={item.id} type="button" aria-pressed={specialization === `${group}:${item.id}`} onClick={() => onSpecializationChange(`${group}:${item.id}`)}>
                <span>{item.label}</span><em>{count(facets ? facets[group][item.id] ?? 0 : undefined)}</em>
              </button>)}
          </div>)}
        </section>
      </nav>
    </details>
  );
}
