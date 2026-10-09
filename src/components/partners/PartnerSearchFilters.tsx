"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { PartnerTaxonomyItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import styles from "./PartnerSearchFilters.module.css";

type PartnerSearchFiltersProps = {
  productIds: string[];
  serviceIds: string[];
  stageIds: string[];
  onChangeProducts: (ids: string[]) => void;
  onChangeServices: (ids: string[]) => void;
  onChangeStages: (ids: string[]) => void;
};

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function matchesFilter(item: PartnerTaxonomyItem, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return item.label.toLowerCase().includes(needle) || item.id.toLowerCase().includes(needle);
}

export function PartnerSearchFilters({
  productIds,
  serviceIds,
  stageIds,
  onChangeProducts,
  onChangeServices,
  onChangeStages,
}: PartnerSearchFiltersProps) {
  const [fullTaxonomy, setFullTaxonomy] = useState<{
    products: PartnerTaxonomyItem[];
    services: PartnerTaxonomyItem[];
    stages: PartnerTaxonomyItem[];
  } | null>(null);
  const loadGen = useRef(0);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const gen = ++loadGen.current;
    try {
      const data = await fetchPartnerTaxonomy();
      if (gen !== loadGen.current) return;
      setFullTaxonomy({
        products: data.products ?? [],
        services: data.services ?? [],
        stages: data.stages ?? [],
      });
      setError("");
    } catch (caught) {
      if (gen !== loadGen.current) return;
      setFullTaxonomy(null);
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить фильтры",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = filter.trim();
    if (!fullTaxonomy) return null;
    return {
      products: fullTaxonomy.products.filter((item) => matchesFilter(item, q)),
      services: fullTaxonomy.services.filter((item) => matchesFilter(item, q)),
      stages: fullTaxonomy.stages.filter((item) => matchesFilter(item, q)),
    };
  }, [filter, fullTaxonomy]);

  return (
    <div className={styles.wrap}>
      <label className={styles.search}>
        <span>Фильтр по названию направления</span>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Например: двери, сантехника"
        />
      </label>
      {error ? (
        <div className={styles.errorRow}>
          <p role="alert">{error}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Повторить
          </Button>
        </div>
      ) : null}
      {visible ? (
        <div className={styles.grid}>
          <fieldset>
            <legend>Товары</legend>
            {visible.products.map((item) => (
              <label key={item.id} className={styles.row}>
                <input
                  type="checkbox"
                  checked={productIds.includes(item.id)}
                  onChange={() => onChangeProducts(toggle(productIds, item.id))}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Работы и услуги</legend>
            {visible.services.map((item) => (
              <label key={item.id} className={styles.row}>
                <input
                  type="checkbox"
                  checked={serviceIds.includes(item.id)}
                  onChange={() => onChangeServices(toggle(serviceIds, item.id))}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Этапы ремонта</legend>
            {visible.stages.map((item) => (
              <label key={item.id} className={styles.row}>
                <input
                  type="checkbox"
                  checked={stageIds.includes(item.id)}
                  onChange={() => onChangeStages(toggle(stageIds, item.id))}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
