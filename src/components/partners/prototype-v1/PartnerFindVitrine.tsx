"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import { mergeSearchResultPages } from "@/lib/partnership-search-ui";
import {
  adaptDiscoveryFacets,
  DISCOVERY_FACETS_GAP,
  stageSelectionResetsDirection,
} from "@/lib/partners-prototype-v1/repair-path";
import { buildVitrineCard } from "@/lib/partners-prototype-v1/vitrine-card";
import type { PartnerSearchResult, PartnerTaxonomyItem } from "@/lib/types";
import type { SearchRole } from "@/lib/partnership-rules";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { PartnerRepairPathNav } from "./PartnerRepairPathNav";
import styles from "./PartnerFindVitrine.module.css";

type Props = {
  searchRole: SearchRole;
  partnerType: AgentPartnerTypeFilter;
  onPartnerTypeChange: (v: AgentPartnerTypeFilter) => void;
  onInvite: (partner: PartnerSearchResult) => void;
  onOpenDetails?: (partner: PartnerSearchResult) => void;
};

export function PartnerFindVitrine({
  searchRole,
  partnerType,
  onPartnerTypeChange,
  onInvite,
  onOpenDetails,
}: Props) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [stageId, setStageId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [taxonomy, setTaxonomy] = useState<{
    products: PartnerTaxonomyItem[];
    services: PartnerTaxonomyItem[];
    stages: PartnerTaxonomyItem[];
  } | null>(null);
  const [results, setResults] = useState<PartnerSearchResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [facets, setFacets] = useState<ReturnType<typeof adaptDiscoveryFacets>>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [facetsGap, setFacetsGap] = useState<string | null>(DISCOVERY_FACETS_GAP);

  useEffect(() => {
    void fetchPartnerTaxonomy()
      .then((data) => {
        setTaxonomy({
          products: data.products ?? [],
          services: data.services ?? [],
          stages: data.stages ?? [],
        });
      })
      .catch(() => {
        setTaxonomy({ products: [], services: [], stages: [] });
      });
  }, []);

  const loadSearch = useCallback(
    async (mode: "reset" | "append", cursor: string | null = null) => {
      setLoading(true);
      if (mode === "reset") {
        setError("");
        setResults([]);
        setNextCursor(null);
      }
      try {
        const params = new URLSearchParams({ role: searchRole, limit: "20" });
        if (query.trim()) params.set("q", query.trim());
        if (city.trim()) params.set("city", city.trim());
        if (partnerType) params.set("partnerType", partnerType);
        if (stageId) params.set("stage", stageId);
        if (specialization.startsWith("products:")) {
          params.set("product", specialization.slice("products:".length));
        } else if (specialization.startsWith("services:")) {
          params.set("service", specialization.slice("services:".length));
        }
        if (mode === "append" && cursor) params.set("cursor", cursor);

        const data = await remcardFetch<{
          partners: PartnerSearchResult[];
          nextCursor?: string | null;
          hasMore?: boolean;
          facets?: {
            total?: number | null;
            stages?: Record<string, number> | null;
            products?: Record<string, number> | null;
            services?: Record<string, number> | null;
          };
        }>(`/api/partnership/search?${params.toString()}`);

        const batch = data.partners ?? [];
        setResults((prev) => mergeSearchResultPages(prev, batch, mode));
        setNextCursor(data.nextCursor ?? null);
        const adapted = adaptDiscoveryFacets(data.facets);
        setFacets(adapted);
        setFacetsGap(adapted ? null : DISCOVERY_FACETS_GAP);
      } catch (caught) {
        if (mode === "reset") setResults([]);
        setError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить поиск",
        );
      } finally {
        setLoading(false);
      }
    },
    [city, partnerType, query, searchRole, specialization, stageId],
  );

  useEffect(() => {
    void loadSearch("reset");
  }, [loadSearch]);

  const cards = results.map(buildVitrineCard);

  return (
    <div className={styles.root} data-testid="partner-find-vitrine">
      {taxonomy ? (
        <PartnerRepairPathNav
          stages={taxonomy.stages}
          products={taxonomy.products}
          services={taxonomy.services}
          facets={facets}
          selectedStageId={stageId}
          selectedSpecialization={specialization}
          countsUnavailableReason={facetsGap}
          onStageChange={(next) => {
            const nextState = stageSelectionResetsDirection(
              { specialization, stageId },
              next,
            );
            setStageId(nextState.stageId);
            setSpecialization(nextState.specialization);
          }}
          onSpecializationChange={setSpecialization}
        />
      ) : null}

      <TextField
        label="Поиск по словам"
        hint="необязательно"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Название, товар, услуга, этап или ID"
        data-testid="vitrine-query"
      />

      <details
        open={filtersOpen}
        onToggle={(e) => setFiltersOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary data-testid="vitrine-filters-summary">Уточнить: город и тип партнёра</summary>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
          <label>
            <span>Город</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Любой"
              data-testid="vitrine-city"
            />
          </label>
          <label>
            <span>Тип партнёра</span>
            <select
              value={partnerType}
              onChange={(e) =>
                onPartnerTypeChange(e.target.value as AgentPartnerTypeFilter)
              }
              data-testid="vitrine-partner-type"
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

      <div className={styles.meta}>
        {loading ? <span className={styles.loading}>Ищем…</span> : null}
        {!loading && facets?.total != null ? (
          <strong data-testid="vitrine-total">Найдено: {facets.total}</strong>
        ) : !loading ? (
          <span data-testid="vitrine-page-count">
            На экране: {results.length}
            {nextCursor ? " · есть ещё" : ""}
            {facetsGap ? " · полный счётчик недоступен" : ""}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <p className={styles.empty} data-testid="vitrine-empty">
          По этим условиям партнёров нет. Смените этап, направление или сбросьте уточнения.
        </p>
      ) : null}

      <div className={styles.grid}>
        {cards.map((card, index) => {
          const partner = results[index];
          return (
            <article key={card.id} className={styles.card} data-testid="vitrine-card">
              <div className={styles.cardHeader}>
                <div>
                  <h4 className={styles.title}>
                    <button
                      type="button"
                      onClick={() => onOpenDetails?.(partner)}
                      style={{
                        all: "unset",
                        cursor: onOpenDetails ? "pointer" : "default",
                        font: "inherit",
                        fontWeight: 750,
                      }}
                      data-testid="vitrine-card-name"
                    >
                      {card.title}
                    </button>
                  </h4>
                  <p className={styles.sub}>
                    {card.kindLabel} · {card.city}
                  </p>
                </div>
              </div>
              <p className={styles.sub}>{card.specializationLine}</p>
              {card.stagesLine ? <p className={styles.sub}>{card.stagesLine}</p> : null}
              {card.description ? <p className={styles.desc}>{card.description}</p> : null}
              <div className={styles.actions}>
                <Button type="button" onClick={() => onInvite(partner)}>
                  Пригласить
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {nextCursor ? (
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => void loadSearch("append", nextCursor)}
          data-testid="vitrine-load-more"
        >
          Показать ещё
        </Button>
      ) : null}
    </div>
  );
}
