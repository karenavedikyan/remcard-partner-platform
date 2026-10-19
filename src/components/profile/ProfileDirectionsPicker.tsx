"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { PartnerTaxonomyItem, WorkingPrimaryDirection } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TaxonomyProposalSection } from "./TaxonomyProposalSection";
import styles from "./ProfileDirectionsPicker.module.css";

type ProfileDirectionsPickerProps = {
  productCategoryIds: string[];
  serviceSpecializationIds: string[];
  navigatorStageIds: string[];
  primaryDirection: WorkingPrimaryDirection;
  disabled?: boolean;
  /** Catalog publication: no working-profile stage/primary editors. */
  catalogMode?: boolean;
  /** R06 specialist: services + stages only, no products. */
  specialistMode?: boolean;
  /** Tighter scrollable grids (catalog). Profile wizard uses full-width grids. */
  compactSpecialistGrid?: boolean;
  /** Ref-like direction tiles (working profile specialization). */
  tileLayout?: boolean;
  /** Stages (+ primary when not catalog) in a collapsible block. */
  collapseAdvancedDirections?: boolean;
  /** Catalog specialist: «Уже выбрано» + collapsible «Работы и услуги» / «На каких этапах». */
  catalogGroupedDetails?: boolean;
  copyFromWorkingProfileAvailable?: boolean;
  onCopyFromWorkingProfile?: () => void;
  /** R06: shared taxonomy proposal checkboxes (specialist profile + catalog). */
  taxonomyProposalScope?: string;
  /** Specialist working profile only — prototype-aligned chips/tiles/details; default unchanged. */
  presentationVariant?: "default" | "specialistWorkingProfile";
  /** Hide lead paragraph (wizard renders intro above preset block). */
  omitLead?: boolean;
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

function orderedVisibleItems(
  all: PartnerTaxonomyItem[],
  selectedIds: string[],
  q: string,
): PartnerTaxonomyItem[] {
  const selected = selectedIds
    .map((id) => all.find((item) => item.id === id))
    .filter((item): item is PartnerTaxonomyItem => Boolean(item));
  const selectedSet = new Set(selectedIds);
  const rest = all.filter(
    (item) => !selectedSet.has(item.id) && matchesFilter(item, q),
  );
  return [...selected, ...rest];
}

export function ProfileDirectionsPicker({
  productCategoryIds,
  serviceSpecializationIds,
  navigatorStageIds,
  primaryDirection,
  disabled,
  catalogMode,
  specialistMode,
  compactSpecialistGrid = true,
  tileLayout = false,
  collapseAdvancedDirections = false,
  catalogGroupedDetails = false,
  copyFromWorkingProfileAvailable = false,
  onCopyFromWorkingProfile,
  taxonomyProposalScope,
  presentationVariant = "default",
  omitLead = false,
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      map.set(`stage:${item.id}`, `Этап: ${item.label}`);
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
    for (const id of navigatorStageIds) {
      chips.push({
        key: `st-${id}`,
        label: labelByKey.get(`stage:${id}`) ?? `Этап: ${id}`,
        remove: () => onChangeStages(navigatorStageIds.filter((x) => x !== id)),
      });
    }
    return chips;
  }, [
    labelByKey,
    navigatorStageIds,
    onChangeProducts,
    onChangeServices,
    onChangeStages,
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

  const wrapClassName = [
    styles.wrap,
    specialistMode && compactSpecialistGrid ? styles.specialistCompact : "",
    presentationVariant === "specialistWorkingProfile" ? styles.specialistWorkingProfile : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapClassName}
      data-direction-picker-layout={tileLayout ? "tiles" : "default"}
      data-direction-picker-variant={presentationVariant}
    >
      {!omitLead ? (
        <p className={styles.lead}>
          {catalogGroupedDetails
            ? "Выберите работы и услуги, которые выполняете. Можно отметить несколько специализаций."
            : specialistMode
              ? "Выберите работы, которые выполняете. Можно несколько."
              : "Выберите товары, которые продаёте, и работы или услуги, которые выполняете. Можно указать одно направление или оба."}
        </p>
      ) : null}

      {tileLayout || catalogGroupedDetails ? (
        <section className={styles.selectionSummary} aria-label="Выбранные направления">
          <div className={styles.selectionHeading}>
            <strong>Уже выбрано</strong>
            {!catalogGroupedDetails && presentationVariant !== "specialistWorkingProfile" ? (
              <small>Услуги и этапы сохраняются при смене вида</small>
            ) : null}
            {presentationVariant === "specialistWorkingProfile" ? (
              <button
                type="button"
                className={styles.focusSearchLink}
                disabled={disabled}
                onClick={() => searchInputRef.current?.focus()}
              >
                Добавить / изменить
              </button>
            ) : null}
          </div>
          {catalogGroupedDetails ? (
            <>
              <small className={styles.hint}>
                Отмеченные варианты показаны первыми в списке. Нажмите ×, чтобы убрать лишнее, или
                добавьте другие ниже.
              </small>
              <button
                type="button"
                className={`${styles.chip} ${styles.copyFromProfile}`}
                disabled={disabled || !copyFromWorkingProfileAvailable}
                data-catalog-action="copy-directions"
                onClick={() => onCopyFromWorkingProfile?.()}
              >
                Повторно взять из профиля
              </button>
            </>
          ) : null}
          {selectedChips.length === 0 ? (
            <p className={styles.empty}>Пока ничего не выбрано — отметьте направления ниже.</p>
          ) : (
            <ul className={styles.chips}>
              {selectedChips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    className={styles.chip}
                    data-testid={
                      presentationVariant === "specialistWorkingProfile"
                        ? "specialist-direction-selected-chip"
                        : undefined
                    }
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
          {presentationVariant === "specialistWorkingProfile" ? (
            <small className={styles.hint}>
              Отмеченные варианты показаны первыми в списке. Нажмите ×, чтобы убрать лишнее, или
              добавьте другие ниже.
            </small>
          ) : null}
        </section>
      ) : selectedChips.length === 0 ? (
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

      <label className={tileLayout ? styles.searchTile : styles.search}>
        <span className={tileLayout ? styles.searchLabel : undefined}>
          {tileLayout ? "Найти направление" : "Поиск по справочнику"}
        </span>
        <input
          ref={searchInputRef}
          type="search"
          data-testid={tileLayout ? "pw-search" : undefined}
          value={filter}
          disabled={disabled}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={
            tileLayout ? "Например, двери или плитка" : "Например: двери, плитка, электрика"
          }
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

      {fullTaxonomy && filtered ? (
        <>
          {!specialistMode ? (
          <fieldset className={styles.group} disabled={disabled}>
            <legend>Товары</legend>
            <div className={styles.optionGrid}>
              {filtered.products.length === 0 ? (
                <p className={styles.hint}>Нет совпадений в группе «Товары».</p>
              ) : (
                orderedVisibleItems(fullTaxonomy.products, productCategoryIds, filter.trim()).map((item) => (
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
          ) : null}

          {(() => {
            const servicesInner = (
              <fieldset
                className={tileLayout ? styles.tileFieldset : styles.group}
                disabled={disabled}
              >
                <legend>Работы и услуги</legend>
                <div className={tileLayout ? styles.tileGrid : styles.optionGrid}>
                  {orderedVisibleItems(fullTaxonomy.services, serviceSpecializationIds, filter.trim())
                    .length === 0 ? (
                    <p className={styles.hint}>Нет совпадений в группе «Работы и услуги».</p>
                  ) : (
                    orderedVisibleItems(
                      fullTaxonomy.services,
                      serviceSpecializationIds,
                      filter.trim(),
                    ).map((item) => {
                      const checked = serviceSpecializationIds.includes(item.id);
                      const rowClass = tileLayout
                        ? `${styles.tileOption}${checked ? ` ${styles.tileOptionSelected}` : ""}`
                        : styles.checkRow;
                      return (
                        <label key={item.id} className={rowClass}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = toggleId(serviceSpecializationIds, item.id);
                              onChangeServices(next);
                              removePrimaryIfNeeded(productCategoryIds, next);
                            }}
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </fieldset>
            );
            if (!catalogGroupedDetails) return servicesInner;
            return (
              <details
                className={styles.directionGroup}
                data-direction-group="services"
                open
              >
                <summary>
                  Работы и услуги{" "}
                  <span className={styles.directionCount}>
                    {serviceSpecializationIds.length} выбрано
                  </span>
                </summary>
                {servicesInner}
              </details>
            );
          })()}
        </>
      ) : null}

      {(() => {
        const stageBlock = !catalogMode || specialistMode ? (
          <fieldset
            className={tileLayout ? styles.tileFieldset : styles.group}
            disabled={disabled}
          >
            <legend>На каких этапах вы полезны</legend>
            <p className={styles.hint}>
              {catalogGroupedDetails
                ? "Клиент выбирает партнёров на каждом этапе в навигаторе ремонта. Отметьте, на каких этапах вы выполняете работы. Для публикации обязателен хотя бы один этап; можно выбрать несколько."
                : "Необязательно — выберите этапы ремонта, где вы можете помочь."}
            </p>
            <div className={tileLayout ? styles.tileGrid : styles.optionGrid}>
              {orderedVisibleItems(
                fullTaxonomy?.stages ?? [],
                navigatorStageIds,
                filter.trim(),
              ).map((item) => {
                const checked = navigatorStageIds.includes(item.id);
                const rowClass = tileLayout
                  ? `${styles.tileOption}${checked ? ` ${styles.tileOptionSelected}` : ""}`
                  : styles.checkRow;
                return (
                  <label key={item.id} className={rowClass}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onChangeStages(toggleId(navigatorStageIds, item.id))}
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null;

        const primaryBlock =
          !catalogMode && primaryOptions.length > 0 ? (
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
          ) : null;

        if (!stageBlock && !primaryBlock) return null;

        if (catalogGroupedDetails && stageBlock) {
          return (
            <details className={styles.directionGroup} data-direction-group="stages" open>
              <summary>
                На каких этапах вы полезны{" "}
                <span className={styles.directionCount}>{navigatorStageIds.length} выбрано</span>
              </summary>
              {stageBlock}
            </details>
          );
        }

        if (collapseAdvancedDirections) {
          return (
            <details
              className={styles.advancedCollapse}
              data-testid="direction-advanced-collapse"
            >
              <summary>
                Этапы ремонта и основное направление{" "}
                {presentationVariant === "specialistWorkingProfile" ? (
                  <span className={styles.optionalHint}>необязательно</span>
                ) : null}
              </summary>
              <div className={styles.advancedInner}>
                {stageBlock}
                {primaryBlock}
              </div>
            </details>
          );
        }

        return (
          <>
            {primaryBlock}
            {stageBlock}
          </>
        );
      })()}

      {specialistMode && taxonomyProposalScope ? (
        <>
          <TaxonomyProposalSection
            kind="SERVICE"
            scopeKey={`${taxonomyProposalScope}-category`}
            disabled={disabled}
          />
          <TaxonomyProposalSection
            kind="STAGE"
            scopeKey={`${taxonomyProposalScope}-stage`}
            disabled={disabled}
          />
        </>
      ) : null}
    </div>
  );
}
