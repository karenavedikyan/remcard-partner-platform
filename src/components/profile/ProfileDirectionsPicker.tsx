"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { PartnerTaxonomyItem, WorkingPrimaryDirection } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileDirectionsPicker.module.css";

type ProfileDirectionsPickerProps = {
  productCategoryIds: string[];
  serviceSpecializationIds: string[];
  navigatorStageIds: string[];
  primaryDirection: WorkingPrimaryDirection;
  disabled?: boolean;
  /** Catalog publication: no working-profile stage/primary editors. */
  catalogMode?: boolean;
  onChangeProducts: (ids: string[]) => void;
  onChangeServices: (ids: string[]) => void;
  onChangeStages: (ids: string[]) => void;
  onChangePrimary: (value: WorkingPrimaryDirection) => void;
};

type LoadedTaxonomy = {
  products: PartnerTaxonomyItem[];
  services: PartnerTaxonomyItem[];
  stages: PartnerTaxonomyItem[];
};

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function matchesFilter(item: PartnerTaxonomyItem, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return item.label.toLowerCase().includes(needle) || item.id.toLowerCase().includes(needle);
}

export function ProfileDirectionsPicker({
  productCategoryIds,
  serviceSpecializationIds,
  navigatorStageIds,
  primaryDirection,
  disabled,
  catalogMode,
  onChangeProducts,
  onChangeServices,
  onChangeStages,
  onChangePrimary,
}: ProfileDirectionsPickerProps) {
  const [fullTaxonomy, setFullTaxonomy] = useState<LoadedTaxonomy | null>(null);
  const loadGenerationRef = useRef(0);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const gen = ++loadGenerationRef.current;
    setLoadState("loading");
    setLoadError("");
    try {
      const data = await fetchPartnerTaxonomy();
      if (gen !== loadGenerationRef.current) return;
      setFullTaxonomy({
        products: data.products ?? [],
        services: data.services ?? [],
        stages: data.stages ?? [],
      });
      setLoadState("ready");
    } catch (caught) {
      if (gen !== loadGenerationRef.current) return;
      setLoadState("error");
      setLoadError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить справочник",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of fullTaxonomy?.products ?? []) {
      map.set(`product:${item.id}`, `Товар: ${item.label}`);
    }
    for (const item of fullTaxonomy?.services ?? []) {
      map.set(`service:${item.id}`, `Услуга: ${item.label}`);
    }
    for (const item of fullTaxonomy?.stages ?? []) {
      map.set(`stage:${item.id}`, item.label);
    }
    return map;
  }, [fullTaxonomy]);

  const filtered = useMemo(() => {
    const q = filter.trim();
    if (!fullTaxonomy) return null;
    return {
      products: fullTaxonomy.products.filter((item) => matchesFilter(item, q)),
      services: fullTaxonomy.services.filter((item) => matchesFilter(item, q)),
      stages: fullTaxonomy.stages.filter((item) => matchesFilter(item, q)),
    };
  }, [filter, fullTaxonomy]);

  const removePrimaryIfNeeded = useCallback(
    (nextProducts: string[], nextServices: string[]) => {
      if (!primaryDirection) return;
      const ok =
        primaryDirection.kind === "product"
          ? nextProducts.includes(primaryDirection.id)
          : nextServices.includes(primaryDirection.id);
      if (!ok) onChangePrimary(null);
    },
    [onChangePrimary, primaryDirection],
  );

  const selectedChips = useMemo(() => {
    const chips: { key: string; label: string; remove: () => void }[] = [];
    for (const id of productCategoryIds) {
      chips.push({
        key: `p-${id}`,
        label: labelByKey.get(`product:${id}`) ?? `Товар: ${id}`,
        remove: () => {
          const next = productCategoryIds.filter((x) => x !== id);
          onChangeProducts(next);
          removePrimaryIfNeeded(next, serviceSpecializationIds);
        },
      });
    }
    for (const id of serviceSpecializationIds) {
      chips.push({
        key: `s-${id}`,
        label: labelByKey.get(`service:${id}`) ?? `Услуга: ${id}`,
        remove: () => {
          const next = serviceSpecializationIds.filter((x) => x !== id);
          onChangeServices(next);
          removePrimaryIfNeeded(productCategoryIds, next);
        },
      });
    }
    return chips;
  }, [
    labelByKey,
    onChangeProducts,
    onChangeServices,
    productCategoryIds,
    serviceSpecializationIds,
    removePrimaryIfNeeded,
  ]);

  const primaryOptions = useMemo(() => {
    const opts: { value: string; label: string; direction: WorkingPrimaryDirection }[] = [];
    for (const id of productCategoryIds) {
      opts.push({
        value: `product:${id}`,
        label: labelByKey.get(`product:${id}`) ?? id,
        direction: { kind: "product", id },
      });
    }
    for (const id of serviceSpecializationIds) {
      opts.push({
        value: `service:${id}`,
        label: labelByKey.get(`service:${id}`) ?? id,
        direction: { kind: "service", id },
      });
    }
    return opts;
  }, [labelByKey, productCategoryIds, serviceSpecializationIds]);

  const primaryValue = primaryDirection
    ? `${primaryDirection.kind}:${primaryDirection.id}`
    : "";

  function handlePrimaryChange(value: string) {
    if (!value) {
      onChangePrimary(null);
      return;
    }
    const found = primaryOptions.find((o) => o.value === value);
    onChangePrimary(found?.direction ?? null);
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.lead}>
        Выберите товары, которые продаёте, и работы или услуги, которые выполняете. Можно указать
        одно направление или оба.
      </p>

      {selectedChips.length === 0 ? (
        <p className={styles.empty}>Пока ничего не выбрано — отметьте направления ниже.</p>
      ) : (
        <ul className={styles.chips} aria-label="Выбранные направления">
          {selectedChips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                className={styles.chip}
                disabled={disabled}
                onClick={chip.remove}
                aria-label={`Убрать ${chip.label}`}
              >
                {chip.label} ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className={styles.search}>
        <span>Поиск по справочнику</span>
        <input
          type="search"
          value={filter}
          disabled={disabled}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Например: двери, плитка, электрика"
        />
      </label>

      {loadState === "loading" && !fullTaxonomy ? (
        <p className={styles.hint}>Загружаем справочник…</p>
      ) : null}
      {loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{loadError}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {filtered ? (
        <>
          <fieldset className={styles.group} disabled={disabled}>
            <legend>Товары</legend>
            <div className={styles.optionGrid}>
              {filtered.products.length === 0 ? (
                <p className={styles.hint}>Нет совпадений в группе «Товары».</p>
              ) : (
                filtered.products.map((item) => (
                  <label key={item.id} className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={productCategoryIds.includes(item.id)}
                      onChange={() => {
                        const next = toggleId(productCategoryIds, item.id);
                        onChangeProducts(next);
                        removePrimaryIfNeeded(next, serviceSpecializationIds);
                      }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))
              )}
            </div>
          </fieldset>

          <fieldset className={styles.group} disabled={disabled}>
            <legend>Работы и услуги</legend>
            <div className={styles.optionGrid}>
              {filtered.services.length === 0 ? (
                <p className={styles.hint}>Нет совпадений в группе «Работы и услуги».</p>
              ) : (
                filtered.services.map((item) => (
                  <label key={item.id} className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={serviceSpecializationIds.includes(item.id)}
                      onChange={() => {
                        const next = toggleId(serviceSpecializationIds, item.id);
                        onChangeServices(next);
                        removePrimaryIfNeeded(productCategoryIds, next);
                      }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))
              )}
            </div>
          </fieldset>
        </>
      ) : null}

      {!catalogMode && primaryOptions.length > 0 ? (
        <label className={styles.primary}>
          <span>Основное направление</span>
          <select
            disabled={disabled}
            value={primaryValue}
            onChange={(e) => handlePrimaryChange(e.target.value)}
          >
            <option value="">Без основного</option>
            {primaryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!catalogMode ? (
        <fieldset className={styles.group} disabled={disabled}>
          <legend>На каких этапах вы полезны</legend>
          <p className={styles.hint}>Необязательно — выберите этапы ремонта, где вы можете помочь.</p>
          <div className={styles.optionGrid}>
            {(fullTaxonomy?.stages ?? [])
              .filter((item) => matchesFilter(item, filter.trim()))
              .map((item) => (
                <label key={item.id} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={navigatorStageIds.includes(item.id)}
                    onChange={() => onChangeStages(toggleId(navigatorStageIds, item.id))}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
